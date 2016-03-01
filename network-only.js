/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "NETWORK-ONLY.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

self.skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {

  // Function to transform requests
  function reqFn(req) {
    return newRequest(req, function (headers) {
      // Don't use the cache, ever
      headers.set("cache-control", "no-cache");
      headers.set("x-strategy", "network-only");
      return headers;
    });
  }

  var proxy = new HttpProxy(CACHE, reqFn);

  event.respondWith(proxy.fetch(event.request));

});
