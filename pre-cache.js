/* eslint-env serviceworker, browser */

importScripts("http-proxy.js");

var VERSION = "NETWORK-ONLY.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

self.skipWaitingAndClaim(self);

function getProxy() {

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
    return new HttpProxy(CACHE, null, resFn);

}

// Load (and cache) the images when the service worker is installed.
self.addEventListener('install', function (event) {

  // We're not handling the "fetch" event yet, so we need to pass requests
  // through the proxy "manually" (rather than just doing a `fetch()`), and
  // having that fire the `fetch` event.
  var proxy = getProxy();

  event.waitUntil(
    // Resolve when all images are loaded.
    Promise.all([
      proxy.fetch("/jpg/00.jpg"),
      proxy.fetch("/jpg/01.jpg"),
      proxy.fetch("/jpg/02.jpg"),
      proxy.fetch("/jpg/03.jpg")
    ])
  );

});

self.addEventListener('fetch', function (event) {

  console.log("FETCH EVENT", event.request.url);

  var proxy = getProxy();

  event.respondWith(proxy.fetch(event.request));

});
