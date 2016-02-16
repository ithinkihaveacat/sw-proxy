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

// Takes a HTTP header (`MAX-AGE=600, stale-while-revalidate=30, public`) and
// returns the equivalent object
// (`{"max-age":"600","public":undefined,"stale-while-revalidate":"30"}`).

/**
 * @param  {string} header HTTP header
 * @return {object}
 */
function parseHeader(header) {
  return !header.trim() ? {} : header.trim().split(/\s*,\s*/).sort().reduce(function (p, c) {
    var t = c.split(/\s*=\s*/, 2);
    p[t[0].toLowerCase()] = t[1];
    return p;
  }, {});
}

// Returns the number of milliseconds since the Resource was cached.
function age(res) {
  if (!res.headers.has("date")) {
    console.warn("NO DATE");
    return 0;
  }
  return now() - Date.parse(res.headers.get("date"));
}

// Returns number of milliseconds until the resource expires. If the expiration
// time is in the past, this number is negative.
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

// Returns **true** if the freshness requirements of the `Request` and
// `Response` are satisfied, otherwise **false**.
function freshMatch(res, req) {

  // Server must whitelist cached response via `s-maxage` or `max-age` …
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

  // … client can blacklist cached response via `max-age` or `min-fresh`.
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

// Returns **true** if the "staleness" requirements of the `Request` and
// `Response` are satisfied, otherwise **false**.
function staleMatch(res, req) {

  // Server must whitelist via [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861#section-3) …
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

  // … client can blacklist via [`max-stale`](https://tools.ietf.org/html/rfc7234#section-5.2.1.2).
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

// Returns **true** if the response satisfies `stale-if-error` requirements,
// otherwise **false**.
function errorMatch(res) {

  // Server can whitelist via stale-if-error …
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    var h = parseHeader(res.headers.get("cache-control"));

    if ("stale-if-error" in h) {
      return (h["stale-if-error"] * 1000) >= age(res);
    } else {
      return false;
    }
  }

  // … client can't override this one.
  function clientMatch() {
    return true;
  }

  return serverMatch() && clientMatch();

}

// Returns **true** if the client will accept a cached response, otherwise
// **false**.
function cacheSufficient(req) {
  return !req.headers.has("cache-control") ||
    (req.headers.get("cache-control").indexOf("no-cache") === -1) ||
    !("no-cache" in parseHeader(req.headers.get("cache-control")));
}

// Returns **true** if the client requires a cached response, otherwise
// **false**. (See
// [RFC7234](https://tools.ietf.org/html/rfc7234#section-5.2.1.7).)
function cacheNecessary(req) {
  return (req.headers.has("cache-control")) &&
    ("only-if-cached" in parseHeader(req.headers.get("cache-control")));
}

// Takes a `Response` and (optionally) a function for transforming headers
// (`Headers` → `Headers`). Returns a new `Response`.

/**
 * @param  {Response} res
 * @param  {function} headerFn passed mutatable `Headers`
 * @return {Promise<Response>}
 */
function newResponse(res, headerFn) {

  // Need this function because sadly [res.headers is
  // read-only](https://developer.mozilla.org/en-US/docs/Web/API/Response/headers)…
  function cloneHeaders() {
    var headers = new Headers();
    for (var kv of res.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  var headers = headerFn ? headerFn(cloneHeaders()) : res.headers;

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

// Takes a `Request` and (optionally) a function for transforming headers
// (`Headers` → `Headers`). Returns a new `Request`.

/**
 * @param  {Request} req
 * @param  {function} headerFn passed mutable `Headers`
 * @return {Promise<Request>}
 */
function newRequest(req, headerFn) {

  // Need this function because sadly [res.headers is
  // read-only](https://developer.mozilla.org/en-US/docs/Web/API/Response/headers)…
  function cloneHeaders() {
    var headers = new Headers();
    for (var kv of req.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  var headers = headerFn ? headerFn(cloneHeaders()) : req.headers;

  // Returns (unnecessary) Promise to parallel `newResponse()`.
  return Promise.resolve(new Request(req, {
    headers: headers
  }));

}

/**
 * @param {string} cache name
 * @param {function} [reqFn] transforms request (Request → Request)
 * @param {function} [resFn] transforms response ((Request, Response) → Response)
 */
function Proxy(cache, reqFn, resFn) {
  this.cache = cache;
  this.reqFn = reqFn;
  this.resFn = resFn;
}

// Parallels
// [`Cache.add()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/add);
// takes a `Request` and returns a Promise resolving to a `Response`. The
// `Response` can optionally be transformed by the instance variable `resFn`.

/**
 * @param {Request} req
 * @return {Promise<Response>}
 */
Proxy.prototype.add = function (req) {

  var cache = this.cache;
  // `resFn` transforms the Response, if provided.
  var resFn = this.resFn ? this.resFn.bind(null, req) : function (obj) { return obj; }

  return fetch(req).then(resFn).then(function (res) {

    // Can the Response be cached?
    function canCache() {
      return (res.status === 200) &&
        res.headers.has("cache-control") &&
        !("no-store" in parseHeader(res.headers.get("cache-control")));
    }

    if (canCache()) {
      if (!res.headers.has("date")) {
        console.warn(req.url, "MISSING DATE HEADER");
      }
      caches.open(cache).then(function (cache) {
        console.log(req.url, "ADDING TO CACHE");
        cache.put(req, res.clone());
      });
    }

    return res;

  });

}

Proxy.prototype.fetch = function (req) {

  var add = this.add.bind(this);
  var cache = this.cache;

  // `reqFn` transforms the Request, if provided.
  var reqFn = this.reqFn ? this.reqFn : function (obj) { return obj; }

  return Promise.resolve(req).then(reqFn).then(function (req) {

    // Is a cached response acceptable?
    if (!cacheSufficient(req)) {
      return add(req);
    }

    return caches.open(cache).then(function (cache) {
      return cache.match(req).then(function (res) {
        if (res) {
          // We received a Response from the cache …
          if (freshMatch(res, req)) {
            // … and it satisfied all freshness requirements, ship it.
            console.log(req.url, "CACHE (FRESH)");
            return res;
          } else if (staleMatch(res, req)) {
            // … and it was stale, but this is okay provided we revalidate.
            console.log(req.url, "CACHE (STALE, REVALIDATING)");
            add(req);
            return res;
          } else {
            // … but it wasn't any good, so go to the network …
            /* TODO Delete from cache */
            return add(req)
              .then(function (r) {
                if (r.status < 500) {
                  // …… Response from network is good, ship it.
                  console.log(req.url, "NETWORK (CACHED, BUT INVALID)");
                  return r;
                } else {
                  if (errorMatch(res, req)) {
                    // …… Got network error, but in this case we're allowed to
                    // ship the previous response, so do that.
                    console.log(req.url, "CACHE (INVALID, BUT ALLOWED ON NETWORK ERROR)");
                    return res;
                  } else {
                    // …… Network error, and can't ship the previous Response,
                    // so return the error.
                    console.log(req.url, "PROXY ERROR (CACHE NOT ALLOWED)");
                    return r;
                  }
                }
              })
              .catch(function (r) {
                /* TODO Handle authentication errors */
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

  // [Doesn't seem possible to modify the request](http://stackoverflow.com/q/35420980/11543).
  function reqFn(req) {
    return newRequest(req, function (headers) {
      headers.set("pppppp", "qqq");
      return headers;
    });
  }

  function resFn(req, res) {
    if (req.url.match("jpg$")) {
      console.log(req.url, "JPG, TRANSFORMING");
      return newResponse(res, function (headers) {
        console.log("TRANSFORM URL", req.url);
        headers.set("cache-control", "max-age=86000");
        headers.set("qqqqqq", 6);
        headers.set("date", new Date().toUTCString());
        return headers;
      });
    } else {
      console.log(req.url, "NOT JPG, LEAVING");
      return res;
    }
  }

  var proxy = new Proxy('MYCACHE', null, resFn);
  event.respondWith(proxy.fetch(event.request));

});
