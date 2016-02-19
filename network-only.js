/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "NETWORK-ONLY.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event) {
  var proxy = new Proxy(CACHE, function (req) {
    return newRequest(req, function (headers) {
      headers.set("cache-control", "no-cache");
      headers.set("x-strategy", "network-only");
      return headers;
    });
  });

  event.respondWith(proxy.fetch(event.request));
});
