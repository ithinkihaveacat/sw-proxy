/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "STALE-IF-ERROR.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

self.skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {

  // Function to transform responses
  function resFn(req, res) {
    return newResponse(res, function (headers) {
      // Set cache-control header
      headers.set("cache-control", "max-age=30, stale-if-error=30");
      headers.set("date", new Date().toUTCString());
      return headers;
    });
  }

  var proxy = new HttpProxy(CACHE, null, resFn);

  event.respondWith(proxy.fetch(event.request));

});
