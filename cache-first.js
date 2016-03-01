/* eslint-env serviceworker, browser */

importScripts("http-proxy.js");

var VERSION = "NETWORK-ONLY.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {

  console.log("FETCH EVENT", event.request.url);

  // Function to transform responses
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

  // Configure the proxy
  var proxy = new HttpProxy(CACHE, null, resFn);

  event.respondWith(proxy.fetch(event.request));
});
