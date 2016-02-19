/* eslint-env serviceworker, browser */

var VERSION = "v" + new Date().toISOString().substr(11, 8);

console.log("HTTP-PROXY.JS", VERSION);

"use strict";

var now = function () {
  return new Date().getTime();
}

// ## Request/Response Utils

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

// Returns number of milliseconds until the resource expires. This number will
// be negative if the expiration time is in the past.
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

  // Server must whitelist cached response via `s-maxage` or `max-age`.
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

  // Client can blacklist cached response via `max-age` or `min-fresh`.
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

  // Server must whitelist via [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861#section-3).
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

  // Client can blacklist via [`max-stale`](https://tools.ietf.org/html/rfc7234#section-5.2.1.2).
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

  // Server can whitelist via `stale-if-error`.
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

  // Client can't override.
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
/* exported newResponse */
function newResponse(res, headerFn) {

  // This function is necessary because sadly [res.headers is
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
/* exported newRequest */
function newRequest(req, headerFn) {

  // This function is necessary because sadly [res.headers is
  // read-only](https://developer.mozilla.org/en-US/docs/Web/API/Response/headers)…
  function cloneHeaders() {
    var headers = new Headers();
    for (var kv of req.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  var headers = headerFn ? headerFn(cloneHeaders()) : req.headers;

  // Returns (otherwise unnecessary) Promise to parallel `newResponse()`.
  return Promise.resolve(new Request(req.url, {
    method: req.method,
    url: req.url,
    context: req.context,
    referrer: req.referrer,
    mode: 'same-origin', // http://stackoverflow.com/a/35421858/11543
    credentials: req.credentials,
    redirect: req.redirect, // Should be 'manual'? http://stackoverflow.com/a/35421858/11543
    integrity: req.integrity,
    cache: req.cache,
    headers: headers
  }));

}

// ## Proxy
//
// Implements a [RFC 7234](https://tools.ietf.org/html/rfc7234) HTTP cache.
// (Well, that's the idea anyway. There's probably a large number of bugs.)

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

// ### Proxy.add()
//
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
  // `resFn` transforms the `Response`, if provided.
  var resFn = this.resFn ? this.resFn.bind(null, req) : function (obj) {
    return obj;
  }

  // Fetch `req` and transform `Response`.
  return fetch(req).then(resFn).then(function (res) {

    function canCache() {
      return (res.status === 200) &&
        res.headers.has("cache-control") &&
        !("no-store" in parseHeader(res.headers.get("cache-control")));
    }

    // If the `Response` allows caching, save it.
    if (canCache()) {
      if (!res.headers.has("date")) {
        console.warn(req.url, "MISSING DATE HEADER");
      }
      caches.open(cache).then(function (cache) {
        console.log(req.url, "ADDING TO CACHE");
        cache.put(req, res.clone()); /* [1] */
      });
    }

    return res.clone(); /* [2] */

    /* We clone() at both [1] and [2] because otherwise (at least I think this
    /* is what happens), the returned res can be drained by the time we attempt
    /* the clone() in the caches.open() block, and which point it's too late. */

  });

}

// ### Proxy.fetch()

/**
 * @param  {Request} req [description]
 * @return {[type]}     [description]
 */
Proxy.prototype.fetch = function (req) {

  function sameOrigin() {
    var origin = self.location.protocol + "//" + self.location.host;
    return req.url.startsWith(origin);
  }

  // Abort if req is not on the same origin--we can't inspect headers in that
  // case, and so can't effectively proxy.
  if (!sameOrigin()) {
    return fetch(req);
  }

  var add = this.add.bind(this);
  var cache = this.cache;

  // `reqFn` transforms the `Request`, if provided.
  var reqFn = this.reqFn ? this.reqFn : function (obj) {
    return obj;
  }

  return Promise.resolve(req).then(reqFn).then(function (req) {

    // If a cached response is not acceptable, try the network.
    if (!cacheSufficient(req)) {
      return add(req);
    }

    // Look for responses matching `Request` `req` in the cache.
    return caches.open(cache).then(function (cache) {
      return cache.match(req).then(function (res) {
        // `Response` received …
        if (res) {
          // … if it's fresh, ship it.
          if (freshMatch(res, req)) {
            return res;
          }
          // … if it's stale, ship it (and revalidate).
          else if (staleMatch(res, req)) {
            add(req);
            return res;
          }
          // … otherwise, try the network (and delete from the cache).
          else {
            cache.delete(req);
            return add(req)
              .then(function (r) {
                if (r.status < 500) {
                  return r;
                } else {
                  return errorMatch(res, req) ? res : r;
                }
              })
              .catch(function (r) {
                /* TODO Handle authentication errors */
                return errorMatch(res, req) ? res : Promise.reject(r);
              });
          }
        }
        // No `Response` received …
        else {
          // … if a cached response is required, return a 504.
          if (cacheNecessary(req)) {
            return new Response("NOT CACHED", {
              status: 504,
              statusText: "Resource not cached"
            });
          }
          // … otherwise, try the network.
          else {
            return add(req);
          }
        }
      });
    });

  });

}

// ## Service Worker Utils

// **skipWaitingAndClaim(scope)**
//
// Configures the passed service worker to "skip waiting"--that is, to activate
// as soon as possible, instead of waiting for the page to be reloaded.

/**
 * @param  {ServiceWorkerGlobalScope} scope Probably `self`
 */
 /* exported skipWaitingAndClaim */
function skipWaitingAndClaim(scope) {
  /* http://stackoverflow.com/a/34681584/11543 */
  scope.addEventListener('install', function (event) {
    event.waitUntil(scope.skipWaiting());
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(scope.clients.claim());
  });
}
