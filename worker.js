/*eslint-env browser */

/**
 * TODO Switch cache on login/logout/account switch events.
 */

var VERSION = "v" + new Date().toISOString().substr(11, 8);

console.log("INIT " + VERSION);

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:false, strict:true, undef:true, unused:true, curly:true, node:true, indent:4, maxerr:50, globalstrict:true */

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

function expiresAt(res) {

  function date() {
    if (res.headers.has("date")) {
      return Date.parse(res.headers.get("date"));
    } else {
      return new Date().getTime();
    }
  }

  if (res.headers.has("cache-control")) {
    var h = parseHeader(res.headers.get("cache-control"));
    if ("s-maxage" in h) {
      return date() + (h["s-maxage"] * 1000);
    } else if ("max-age" in h) {
      return date() + (h["max-age"] * 1000);
    }
  }

  if (res.headers.has("expires")) {
    return Date.parse(res.headers.get("expires"));
  }

  return date();
}

// https://tools.ietf.org/html/rfc5861#section-3
function staleWhileRevalidateAt(res) {

  if (!res.headers.has("cache-control")) {
    return expiresAt(res);
  } else {
    var h = parseHeader(res.headers.get("cache-control"));
    if (!("stale-while-revalidate" in h)) {
      return expiresAt(res);
    } else {
      return expiresAt(res) + (h["stale-while-revalidate"] * 1000);
    }
  }

}

// https://tools.ietf.org/html/rfc5861#section-4
function staleIfErrorAt(res) {

  if (!res.headers.has("cache-control")) {
    return expiresAt(res);
  } else {
    var h = parseHeader(res.headers.get("cache-control"));
    if (!("stale-if-error" in h)) {
      return expiresAt(res);
    } else {
      return expiresAt(res) + (h["stale-if-error"] * 1000);
    }
  }

}

function canCache(res) {
  if (res.headers.status !== 200) {
    return false;
  }

  if (!res.headers.has("cache-control")) {
    return false;
  }

  var h = parseHeader(res.headers.get("cache-control"));

  return !("private" in h) && !("no-store" in h) && !("must-revalidate" in h) &&
    (("public" in h) || ("max-age" in h) || ("s-maxage" in h));
}

// http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9.3

// true if the response is fresh at time t, otherwise false
function isFresh(res, t) {

  if (!res.headers.has("cache-control")) {
    return new Date().getTime() <= t;
  }

  var h = parseHeader(res.headers.get("cache-control"));

  if ("must-revalidate" in h) {
    return false;
  } else if ("max-stale" in h) {
    // return no limit || max-stale > "staleness"
    return !h["max-stale"] || (h["max-stale"] * 1000) >= (new Date().getTime() - t);
  } else if ("max-age" in h) {
    // return max-age > "age"
    return (h["max-age"] * 1000) >= (new Date().getTime() - Date.parse(res.headers.get("date")));
  } else if ("min-fresh" in h) {
    // return min-fresh < "time until expiry"
    return (h["min-fresh"] * 1000) <= (t - new Date().getTime());
  } else {
    return new Date().getTime() <= t;
  }

}

function wantsCache(req) {
  return !req.headers.has("cache-control") ||
    (req.headers.get("cache-control").indexOf("no-cache") === -1) ||
    !("no-cache" in parseHeader(req.headers.get("cache-control")));
}

// https://tools.ietf.org/html/rfc7234#section-5.2.1.7
function onlyIfCached(req) {
  return (req.headers.has("cache-control")) &&
    ("only-if-cached" in parseHeader(req.headers.get("cache-control")));
}

function varyMatch(res, req) {
  if (!res.headers.has("vary")) {
    return true;
  }

  if (res.headers.get("vary") === "*") {
    return false;
  }

  return res.headers.get("vary").split(/\s*,\s/).every(function (h) {
    return req.headers.get(h) === res.headers.get(h);
  });
}

function warm(c) {
  var req = new Request("/foo.txt");
  var res = new Response("hello", {
    status: 200,
    statusText: "OK",
    headers: {
      "cache-control": "max-age=86400",
      "content-type": "text/plain",
      "date": "Fri, 05 Feb 2016 12:32:21 GMT"
    }
  });
  return c.put(req, res).then(function () {
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

function Proxy(cache, reqFn, resFn) {
  this.cache = cache;
  this.reqFn = reqFn;
  this.resFn = resFn;
}

Proxy.prototype.add = function (req) {
  var cache = this.cache;
  var resFn = this.resFn;
  return fetch(req).then(function (res) {
    if (resFn) {
      res = resFn(res);
    }
    if (canCache(res)) {
      caches.open(cache).then(function (c) {
        c.put(req, res.clone());
      });
    }
    return res;
  });
}

Proxy.prototype.fetch = function (req) {

  if (this.reqFn) {
    req = this.reqFn(req);
  }

  if (!wantsCache(req)) {
    return fetch(req);
  }

  var add = this.add.bind(this);
  return caches.open(this.cache).then(function (c) {
    return c.match(req).then(function (res) {
      if (res) {
        if (isFresh(res, expiresAt(res))) {
          console.log(req.url, "A1");
          return res;
        }
        if (isFresh(res, staleWhileRevalidateAt(res))) {
          console.log(req.url, "A2");
          add(req);
          return res;
        } else {
          return add(req)
            .then(function (r) {
              if (r.status < 500) {
                console.log(req.url, "B1");
                return r;
              } else {
                console.log(req.url, "B2");
                return isFresh(res, staleIfErrorAt(res)) ? res : r;
              }
            })
            .catch(function (r) {
              // TODO Handle authentication errors
              console.log(req.url, "B3");
              return isFresh(res, staleIfErrorAt(res)) ? res : Promise.reject(r);
            });
        }
      } else {
        if (onlyIfCached(req)) {
          console.log(req.url, "C");
          return new Response("NOT CACHED", {
            status: 504,
            statusText: "Resource not cached"
          });
        } else {
          console.log(req.url, "D");
          return add(req);
        }
      }
    });
  });

}

self.addEventListener('fetch', function (event) {
  console.log('FETCH', event.request.url);
  var proxy = new Proxy('MYCACHE');
  event.respondWith(proxy.fetch(event.request));
});
