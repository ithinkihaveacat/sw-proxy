/* Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

// There doesn't seem to be an authoritative source of service worker
// definitions; reference these hand-written definitions for now.

function now() {
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
function parseHeader(header: string): { [k: string]: string } {
  return !header.trim() ? {} : header.trim().split(/\s*,\s*/).sort().reduce(
    (acc: { [k: string]: string }, s: string) => {
      let t = s.split(/\s*=\s*/, 2);
      acc[t[0].toLowerCase()] = t[1];
      return acc;
    },
    {}
  );
}

// Returns the number of milliseconds since the Resource was cached.
function age(res: Response) {
  if (!res.headers.has("date")) {
    console.warn("NO DATE");
    return 0;
  }
  return now() - Date.parse(res.headers.get("date")!);
}

// Returns number of milliseconds until the resource expires. This number will
// be negative if the expiration time is in the past.
function expires(res: Response) {

  if (res.headers.has("cache-control")) {
    const h = parseHeader(res.headers.get("cache-control")!);
    if ("s-maxage" in h) {
      return (parseInt(h["s-maxage"], 10) * 1000) - age(res);
    } else if ("max-age" in h) {
      return (parseInt(h["max-age"], 10) * 1000) - age(res);
    }
  }

  return 0;
}

// Returns **true** if the freshness requirements of the `Request` and
// `Response` are satisfied, otherwise **false**.
function freshMatch(res: Response, req: Request) {

  // Server must whitelist cached response via `s-maxage` or `max-age`.
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    const h = parseHeader(res.headers.get("cache-control")!);

    if ("s-maxage" in h) {
      return (parseInt(h["s-maxage"], 10) * 1000) > age(res);
    } else if ("max-age" in h) {
      return (parseInt(h["max-age"], 10) * 1000) > age(res);
    } else {
      return false;
    }
  }

  // Client can blacklist cached response via `max-age` or `min-fresh`.
  function clientMatch() {
    if (!req.headers.has("cache-control")) {
      return true;
    }

    const h = parseHeader(req.headers.get("cache-control")!);

    if ("no-cache" in h) {
      return false;
    } else if ("no-store" in h) {
      return false;
    } else if ("max-age" in h) {
      return (parseInt(h["max-age"], 10) * 1000) <= age(res);
    } else if ("min-fresh" in h) {
      return (parseInt(h["min-fresh"], 10) * 1000) <= expires(res);
    } else {
      return true;
    }
  }

  return serverMatch() && clientMatch();

}

// Returns **true** if the "staleness" requirements of the `Request` and
// `Response` are satisfied, otherwise **false**.
function staleMatch(res: Response, req: Request) {

  // Server must whitelist via [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861#section-3).
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    const h = parseHeader(res.headers.get("cache-control")!);

    if ("must-revalidate" in h) {
      return false;
    } else if ("stale-while-revalidate" in h) {
      const maxAge = ("max-age" in h) ? (parseInt(h["max-age"], 10) * 1000) : 0;
      return (maxAge + (parseInt(h["stale-while-revalidate"], 10) * 1000)) >= age(res);
    } else {
      return false;
    }
  }

  // Client can blacklist via [`max-stale`](https://tools.ietf.org/html/rfc7234#section-5.2.1.2).
  function clientMatch() {
    if (!req.headers.has("cache-control")) {
      return true;
    }

    const h = parseHeader(req.headers.get("cache-control")!);

    if ("max-stale" in h) {
      return (expires(res) + (parseInt(h["max-stale"], 10) * 1000)) >= 0;
    } else {
      return true;
    }
  }

  return serverMatch() && clientMatch();

}

// Returns **true** if the response satisfies `stale-if-error` requirements,
// otherwise **false**.
function errorMatch(res: Response) {

  // Server can whitelist via `stale-if-error`.
  function serverMatch() {
    if (!res.headers.has("cache-control")) {
      return false;
    }

    const h = parseHeader(res.headers.get("cache-control")!);

    if ("stale-if-error" in h) {
      return (parseInt(h["stale-if-error"], 10) * 1000) >= age(res);
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

/**
 * Returns `true` if the client will accept a cached response, otherwise
 * `false`.
 *
 * @param {Request} req
 * @returns boolean
 */
function cacheSufficient(req: Request) {
  return !req.headers.has("cache-control") ||
    (req.headers.get("cache-control")!.indexOf("no-store") === -1) ||
    !("no-store" in parseHeader(req.headers.get("cache-control")!));
}

/**
 * Returns `true` if the client requires a cached response, otherwise `false`.
 * (See [RFC7234](https://tools.ietf.org/html/rfc7234#section-5.2.1.7).)
 *
 * @param {Request} req
 * @returns boolean
 */
function cacheNecessary(req: Request) {
  return (req.headers.has("cache-control")) &&
    ("only-if-cached" in parseHeader(req.headers.get("cache-control")!));
}

/**
 * Returns `true` if the response can be cached, otherwise `false`.
 *
 * @param {Response} res
 * @returns boolean
 */
function canCache(res: Response) {
  const h = parseHeader(res.headers.get("cache-control") || "");
  // no-cache does not mean the response cannot be cached; it means that the
  // cached response cannot be used without a conditional request to the origin.
  // https://jakearchibald.com/2016/caching-best-practices/#pattern-2-mutable-content-always-server-revalidated
  return res.status === 200
    && !("no-store" in h)
    && (("max-age" in h) || ("s-maxage" in h));
}

// Takes a `Response` and (optionally) a function for transforming headers
// (`Headers` → `Headers`). Returns a new `Response`.

/**
 * @param  {Response} res
 * @param  {(h: Headers) => void} headerFn passed mutatable `Headers`
 * @return {Promise<Response>}
 */
export function newResponse(res: Response, headerFn?: (h: Headers) => void) {

  // This function is necessary because sadly [res.headers is
  // read-only](https://developer.mozilla.org/en-US/docs/Web/API/Response/headers)…
  function cloneHeaders() {
    const headers = new Headers();
    for (const kv of res.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  const headers = headerFn ? headerFn(cloneHeaders()) : res.headers;

  return new Promise(resolve => {
    return res.blob().then(blob => {
      resolve(new Response(blob, {
        headers: headers!,
        status: res.status,
        statusText: res.statusText
      }));
    });
  });

}

// Takes a `Request` and (optionally) a function for transforming headers
// (`Headers` → `Headers`). Returns a new `Request`.

/**
 * @param  {Request} req
 * @param  {(h: Headers) => void} headerFn passed mutable `Headers`
 * @return {Promise<Request>}
 */
export function newRequest(req: Request, headerFn?: (h: Headers) => void) {

  // This function is necessary because sadly [res.headers is
  // read-only](https://developer.mozilla.org/en-US/docs/Web/API/Response/headers)…
  function cloneHeaders() {
    const headers = new Headers();
    for (const kv of req.headers.entries()) {
      headers.append(kv[0], kv[1]);
    }
    return headers;
  }

  const headers = headerFn ? headerFn(cloneHeaders()) : req.headers;

  // Returns (otherwise unnecessary) Promise to parallel `newResponse()`.
  return Promise.resolve(new Request(req.url, {
    cache: req.cache,
    credentials: req.credentials,
    headers: headers!,
    integrity: req.integrity,
    method: req.method,
    mode: "same-origin", // http://stackoverflow.com/a/35421858/11543
    redirect: req.redirect, // Should be 'manual'? http://stackoverflow.com/a/35421858/11543
    referrer: req.referrer
  }));

}

// ## HttpProxy
//
// Implements a [RFC 7234](https://tools.ietf.org/html/rfc7234)/[RFC
// 5861](https://tools.ietf.org/html/rfc5861) compliant HTTP
// cache. (Well, that's the idea anyway. There's probably quite a few bugs.)

// ### HttpProxy.add(cache, reqFn, resFn)
//
// Constructor. `cache` is the cache name (a string); `reqFn` and `resFn` are
// (optional) functions that transform the request and response.
/**
 * @param {string} cache name
 * @param {function} [reqFn] transforms request (Request → Request)
 * @param {function} [resFn] transforms response ((Request, Response) → Response)
 */

export class Proxy {

  private cache: string;
  private reqFn: null|((r: Request) => (Request|Promise<Request>));
  private resFn: null|((req: Request, res: Response) => (Response|Promise<Response>));

  constructor(
    cache: string,
    reqFn?: null|((r: Request) => (Request|Promise<Request>)),
    resFn?: null|((req: Request, res: Response) => (Response|Promise<Response>))) {
    this.cache = cache;
    this.reqFn = reqFn || null;
    this.resFn = resFn || null;
  }

  // ### HttpProxy.add()
  //
  // Parallels
  // [`Cache.add()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/add);
  // takes a `Request` and returns a Promise resolving to a `Response`. The
  // `Response` can optionally be transformed by the instance variable `resFn`.

  /**
   * @param {Request} req
   * @return {Promise<Response>}
   */
  public add(req: Request): Promise<Response> {

    const cache = this.cache;
    // `resFn` transforms the `Response`, if provided.
    // tslint:disable-next-line:no-shadowed-variable
    const resFn = this.resFn ? this.resFn.bind(null, req) : ((req: Request, res: Response) => res);

    // Fetch `req` and transform `Response`.
    return fetch(req).then(resFn).then((res: Response) => {

      // If the `Response` allows caching, save it.
      if (canCache(res)) {
        if (!res.headers.has("date")) {
          console.warn(req.url, "MISSING DATE HEADER");
        }
        // tslint:disable-next-line:no-shadowed-variable
        self.caches.open(cache).then(cache => {
          console.warn(req.url, "ADDING TO CACHE");
          cache.put(req, res.clone()); /* [1] */
        });
      }

      return res.clone(); /* [2] */

      /* We clone() at both [1] and [2] because otherwise (at least I think this
      /* is what happens), the res returned at [2] can get drained by the caller
      /* before we attempt the clone() at [1], at which point it's too late.
      /* (Always Be Cloning, basically.) */

    });

  }

  // ### HttpProxy.fetch()
  //
  // Parallels the global `fetch()` function; takes a `Request` and returns a
  // Promise resolving to a `Response`.
  /**
   * @param  {Request} req
   * @return {Promise<Response>}
   */
  public fetch(req: string|Request): Promise<Response> {

    if (typeof req === "string") {
      req = new Request(req);
    }

    function sameOrigin() {
      const origin = self.location.protocol + "//" + self.location.host;
      return (req as Request).url.startsWith(origin); // https://github.com/Microsoft/TypeScript/issues/10339
    }

    // Abort if req is not on the same origin--we can't inspect headers in that
    // case, and so can't effectively proxy.
    if (!sameOrigin()) {
      return fetch(req);
    }

    const add = this.add.bind(this);
    const cache = this.cache;

    // `reqFn` transforms the `Request`, if provided.
    const reqFn = this.reqFn ? this.reqFn : (r: Request) => r;

    // tslint:disable-next-line:no-shadowed-variable
    return Promise.resolve(req).then(reqFn).then((req: Request) => {

      // If a cached response is not acceptable, try the network.
      if (!cacheSufficient(req)) {
        return add(req);
      }

      // Look for responses matching `Request` `req` in the cache.
      // tslint:disable-next-line:no-shadowed-variable
      return self.caches.open(cache).then(cache => {
        return cache.match(req).then(res => {
          if (res) { // `Response` received …
            if (freshMatch(res, req)) {
              // … if it's fresh, ship it.
              return res;
            } else if (staleMatch(res, req)) {
              // … if it's stale, ship it (and revalidate).
              add(req);
              return res;
            } else {
              // … otherwise, try the network (and delete from the cache).
              cache.delete(req);
              return add(req)
                .then((r: Response) => {
                  if (r.status < 500) {
                    return r;
                  } else {
                    return errorMatch(res) ? res : r;
                  }
                })
                .catch((e: any) => {
                  /* TODO Handle authentication errors */
                  return errorMatch(res) ? res : Promise.reject(e);
                });
            }
          } else { // No `Response` received …
            if (cacheNecessary(req)) { // … if a cached response is required, return a 504.
              return new Response("NOT CACHED", {
                status: 504,
                statusText: "Resource not cached"
              });
            } else { // … otherwise, try the network.
              return add(req);
            }
          }
        });
      });

    });

  }

}

// ## Service Worker Utils

// **skipWaitingAndClaim(scope)**
//
// Configures the passed service worker to "skip waiting"--that is, to activate
// as soon as possible, instead of waiting for the page to be reloaded.

/**
 * @param  {ServiceWorkerGlobalScope} scope Probably `self`
 */
export function skipWaitingAndClaim(scope: any) {
  /* http://stackoverflow.com/a/34681584/11543 */
  scope.addEventListener("install", () => {
    scope.skipWaiting();
  });

  scope.addEventListener("activate", (event: any) => {
    event.waitUntil(scope.clients.claim());
  });
}

import {Router} from "./router";
export {Router};

// Export private functions for tests
export {
  canCache as _canCache,
  parseHeader as _parseHeader
};
