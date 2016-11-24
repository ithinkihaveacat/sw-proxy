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

console.log("MOCK-RESPONSE.JS v" + new Date().toISOString().substr(11, 8));

var CACHE = "MYCACHE";

// The response for `/quote.txt`.
function getEntries(): { [k: string]: Response } {
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

skipWaitingAndClaim(self);

// On "install", inject responses into cache.
self.addEventListener('install', function (event: ExtendableEvent) {
  var entries = getEntries();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(Object.keys(entries).reduce(function (acc: Promise<void>[], url: string) {
        acc.push(cache.put(url, entries[url]));
        return acc;
      }, []));
    })
  );
});

self.addEventListener('fetch', function (event: FetchEvent) {
  var proxy = new HttpProxy(CACHE);
  event.respondWith(proxy.fetch(event.request));
});
