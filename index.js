/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "INDEX.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

function deleteAllCaches() {
  return caches.keys().then(function (cacheNames) {
    return Promise.all(
      cacheNames.map(function (cacheName) {
        return caches.delete(cacheName).then(function () {
          console.log("DELETED CACHE", cacheName);
          return true;
        });
      })
    );
  });
}

// ## Event Handlers

// ### "install"

self.addEventListener('install', function (event) {
  console.log("INSTALLING", VERSION);
  event.waitUntil(deleteAllCaches());
});

self.skipWaitingAndClaim(self);
