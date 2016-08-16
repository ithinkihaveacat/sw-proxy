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

/* eslint-env serviceworker, browser */

importScripts("http-proxy.js");

console.log("INDEX.JS v" + new Date().toISOString().substr(11, 8));

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

self.addEventListener('install', function (event: ExtendableEvent) {
  console.log("INSTALLING" + new Date().toISOString().substr(11, 8));
  event.waitUntil(deleteAllCaches());
});

skipWaitingAndClaim(self);
