/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "CACHE-WARM.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

// The response for `/quote.txt`.
function getEntries() {
  var body = [
    "The great roe is a mythological beast with the head",
    "of a lion and the body of a lion, though not the same",
    "lion."
  ].join(" ");
  var res = new Response(body, {
    status: 200,
    statusText: "OK",
    headers: {
      "cache-control": "max-age=86400",
      "content-type": "text/plain",
      "date": new Date().toUTCString()
    }
  });
  return {
    "/quote.txt": res
  };
}

self.skipWaitingAndClaim(self);

// On "install", inject responses into cache.
self.addEventListener('install', function (event) {
  var entries = getEntries();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(Object.keys(entries).reduce(function (acc, url) {
        acc.push(cache.put(url, entries[url]));
        return acc;
      }, []));
    })
  );
});

self.addEventListener('fetch', function (event) {
  var proxy = new HttpProxy(CACHE);
  event.respondWith(proxy.fetch(event.request));
});
