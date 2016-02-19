/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "NETWORK-ONLY.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {

  function reqFn(req) {
    return newRequest(req, function (headers) {
      headers.set("cache-control", "qqqq");
      return headers;
    });
  }

  function resFn(req, res) {
    // Only transform JPGs
    if (req.url.match("jpg$")) {
      return newResponse(res, function (headers) {
        // Cache responses for a week
        headers.set("cache-control", "max-age=86000");
        headers.set("date", new Date().toUTCString());
        return headers;
      });
    } else {
      return res;
    }
  }

  var proxy = new Proxy(CACHE, null, resFn);

  event.respondWith(proxy.fetch(event.request));
});
