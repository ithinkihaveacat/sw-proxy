/*eslint-env browser */

/**
 * TODO Switch cache on login/logout/account switch events.
 */

var VERSION = "v" + new Date().toISOString().substr(11, 8);

console.log("INIT " + VERSION);

"use strict";

var now = function () {
  return new Date().getTime();
}

// Returns a closure that, when called, returns the number of seconds
// since the timer() function was itself called.
function timer(digits) {
  var t0 = new Date().getTime();

  return function () {
    var t1 = new Date().getTime();
    // linter doesn't like new Number(...)
    return Number.prototype.toFixed.call((t1 - t0) / 1000, digits || 3);
  };
}

function parseHeader(header) {
  return !header.trim() ? {} : header.trim().split(/\s*,\s*/).sort().reduce(function (p, c) {
    var t = c.split(/\s*=\s*/, 2);
    p[t[0].toLowerCase()] = t[1];
    return p;
  }, {});
}

// returns number of milliseconds since the resource was cached
function age(res) {
  if (!res.headers.has("date")) {
    console.warn("NO DATE");
    return 0;
  }
  return now() - Date.parse(res.headers.get("date"));
}

// returns number of milliseconds (possibly negative) until resource expires
function expires(res) {

  if (res.headers.has("cache-control")) {
    var h = parseHeader(res.headers.get("cache-control"));
    if ("s-maxage" in h) {
      return (h["s-maxage"] * 1000) - age(res);
    } else if ("max-age" in h) {
      return (h["max-age"] * 1000) - age(res);
    }
  }

  return 0;
}

// true if the response satisfies freshness requirements, otherwise false
function freshMatch(res, req) {

  // server must whitelist cached response via s-maxage or max-age
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    var h = parseHeader(res.headers.get("cache-control"));

    if ("s-maxage" in h) {
      return (h["s-maxage"] * 1000) > age(res);
    } else if ("max-age" in h) {
      return (h["max-age"] * 1000) > age(res);
    } else {
      return false;
    }
  }

  // client can blacklist cached response via max-age or min-fresh
  function clientMatch() {
    if (!req.headers.has("cache-control")) {
      return true;
    }

    var h = parseHeader(req.headers.get("cache-control"));

    if ("no-cache" in h) {
      return false;
    } else if ("max-age" in h) {
      return (h["max-age"] * 1000) <= age(res);
    } else if ("min-fresh" in h) {
      return (h["min-fresh"] * 1000) <= expires(res);
    } else {
      return true;
    }
  }

  return serverMatch() && clientMatch();

}

// true if the response satisfies "staleness" requirements, otherwise false
function staleMatch(res, req) {

  // server must whitelist via stale-while-revalidate
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    var h = parseHeader(res.headers.get("cache-control"));

    if ("must-revalidate" in h) {
      return false;
    } else if ("stale-while-revalidate" in h) {
      var maxAge = ("max-age" in h) ? (h["max-age"] * 1000) : 0;
      return (maxAge + (h["stale-while-revalidate"] * 1000)) >= age(res);
    } else {
      return false;
    }
  }

  // client can blacklist via max-stale
  function clientMatch() {
    if (!req.headers.has("cache-control")) {
      return true;
    }

    var h = parseHeader(req.headers.get("cache-control"));

    if ("max-stale" in h) {
      return (expires(res) + (h["max-stale"] * 1000)) >= 0;
    } else {
      return true;
    }
  }

  return serverMatch() && clientMatch();

}

// true if the response satisfies "stale-while-error" requirements, otherwise false
function errorMatch(res) {

  // server can whitelist via stale-while-error
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    var h = parseHeader(res.headers.get("cache-control"));

    if ("stale-while-error" in h) {
      return (h["stale-while-error"] * 1000) >= age(res);
    } else {
      return false;
    }
  }

  // client can't override
  function clientMatch() {
    return true;
  }

  return serverMatch() && clientMatch();

}

// true if the client will accept a cached response, otherwise false
function cacheSufficient(req) {
  return !req.headers.has("cache-control") ||
    (req.headers.get("cache-control").indexOf("no-cache") === -1) ||
    !("no-cache" in parseHeader(req.headers.get("cache-control")));
}

// true if the client requires a cached response, otherwise false
// https://tools.ietf.org/html/rfc7234#section-5.2.1.7
function cacheNecessary(req) {
  return (req.headers.has("cache-control")) &&
    ("only-if-cached" in parseHeader(req.headers.get("cache-control")));
}

/**
 * @param {string} cache name
 * @param {function} reqFn transforms request headers
 * @param {function} resFn transforms response headers
 */
function Proxy(cache, reqFn, resFn) {
  this.cache = cache;
  this.reqFn = reqFn;
  this.resFn = resFn;
}

Proxy.prototype.add = function (req) {

  var cache = this.cache;
  var resFn = this.resFn ? newResponse.bind(null, this.resFn) : function (obj) { return obj; }

  return fetch(req).then(resFn).then(function (res) {

    function canCache() {
      return (res.status === 200) &&
        res.headers.has("cache-control") &&
        !("no-store" in parseHeader(res.headers.get("cache-control")));
    }

    if (canCache()) {
      if (!res.headers.has("date")) {
        console.warn(req.url, "MISSING DATE HEADER");
      }
      caches.open(cache).then(function (c) {
        console.log(req.url, "ADDING TO CACHE");
        c.put(req, res.clone());
      });
    }

    return res;

  });

}

Proxy.prototype.fetch = function (req) {

  var add = this.add.bind(this);

  if (this.reqFn) { // TODO convert to promise
    req = this.reqFn(req);
  }

  if (!cacheSufficient(req)) {
    return add(req);
  }

  return caches.open(this.cache).then(function (c) {
    return c.match(req).then(function (res) {
      if (res) {
        if (freshMatch(res, req)) {
          console.log(req.url, "CACHE (FRESH)");
          return res;
        } else if (staleMatch(res, req)) {
          console.log(req.url, "CACHE (STALE)");
          add(req);
          return res;
        } else {
          return add(req)
            .then(function (r) {
              if (r.status < 500) {
                console.log(req.url, "NETWORK (CACHED, BUT INVALID)");
                return r;
              } else {
                if (errorMatch(res, req)) {
                  console.log(req.url, "CACHE (INVALID, BUT ALLOWED ON NETWORK ERROR)");
                  return res;
                } else {
                  console.log(req.url, "PROXY ERROR (CACHE NOT ALLOWED)");
                  return r;
                }
              }
            })
            .catch(function (r) {
              // TODO Handle authentication errors
              if (errorMatch(res, req)) {
                console.log(req.url, "CACHE (INVALID, BUT NETWORK ERROR)");
                return res;
              } else {
                console.log(req.url, "REJECTING (INVALID, AND NETWORK ERROR)");
                return Promise.reject(r);
              }
            });
        }
      } else {
        if (cacheNecessary(req)) {
          console.log(req.url, "504 (NOT CACHED, AND CACHE NECESSARY)");
          return new Response("NOT CACHED", {
            status: 504,
            statusText: "Resource not cached"
          });
        } else {
          console.log(req.url, "NETWORK (NOT CACHED)");
          return add(req);
        }
      }
    });
  });

}

function warm(c) {
  var res = new Response("cached", {
    status: 200,
    statusText: "OK",
    headers: {
      "cache-control": "max-age=0, stale-while-revalidate=86400",
      "content-type": "text/plain",
      "date": new Date().toUTCString()
    }
  });
  return c.put(new Request("/foo.txt"), res).then(function () {
    return c;
  });
}

function lookup(c) {
  return c.match(new Request("/foo.txt")).then(function (r) {
    return r ? "CACHE HIT" : "CACHE MISS";
  });
}

function deleteAllCaches() {
  return caches.keys().then(function (cacheNames) {
    return Promise.all(
      cacheNames.map(function (cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

function newResponse(resFn, res) {

  function cloneHeaders() {
    var headers = new Headers();
    for (var kv of res.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  var headers = resFn ? resFn(cloneHeaders()) : res.headers;

  return new Promise(function (resolve) {
    return res.blob().then(function (blob) {
      resolve(new Response(blob, {
        status: res.status,
        statusText: res.statusText,
        headers: headers
      }));
    });
  });

}

function newRequest(reqFn, req) {
  var headers = reqFn ? reqFn(req.headers) : req.headers;
  return Promise.resolve(new Request(req, {
    headers: headers
  }));
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    Promise.resolve()
    .then(deleteAllCaches)
    .then(caches.open.bind(caches, 'MYCACHE'))
    .then(warm)
    .then(lookup)
    .then(console.log.bind(console))
    .then(function () {
      return true;
    })
  );
});

self.addEventListener('activate', function (event) {
  console.log("ACTIVATING " + VERSION);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  console.log(event.request.url, 'FETCH');
  var proxy = new Proxy('MYCACHE', null, function (headers) {
    headers.set("cache-control", "max-age=86000");
    headers.set("qqqqqq", 6);
    headers.set("date", new Date().toUTCString());
    return headers;
  });
  event.respondWith(proxy.fetch(event.request));
});
