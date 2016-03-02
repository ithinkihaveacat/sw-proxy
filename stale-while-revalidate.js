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
