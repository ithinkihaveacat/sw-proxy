/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "STALE-WHILE-REVALIDATE.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

self.skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {

  // Function to transform responses
  function resFn(req, res) {
    // Only transform JPGs
    if (req.url.match("jpg$")) {
      return newResponse(res, function (headers) {
        // Set cache-control header
        headers.set("cache-control", "max-age=10, stale-while-revalidate=50");
        headers.set("date", new Date().toUTCString());
        return headers;
      });
    } else {
      return res;
    }
  }

  var proxy = new HttpProxy(CACHE, null, resFn);

  event.respondWith(proxy.fetch(event.request));

});
