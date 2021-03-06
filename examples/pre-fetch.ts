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

import {newResponse, Proxy, skipWaitingAndClaim} from "../proxy";

const CACHE = "MYCACHE";

skipWaitingAndClaim(self);

function getProxy() {

    // Function to transform responses
    function resFn(req: Request, res: Response): Promise<Response> {
      // Only transform JPGs
      if (req.url.match("jpg$")) {
        return newResponse(res, (headers) => {
          // Cache responses for a week
          headers.set("cache-control", "max-age=86000");
          headers.set("date", new Date().toUTCString());
          return headers;
        });
      } else {
        return Promise.resolve(res);
      }
    }

    // Configure the proxy
    return new Proxy(CACHE, null, resFn);

}

// Load (and cache) the images when the service worker is installed.
self.addEventListener("install", (event: InstallEvent) => {

  // We're not handling the "fetch" event yet, so we need to pass requests
  // through the proxy "manually" (rather than just doing a `fetch()`), and
  // having that fire the `fetch` event.
  const proxy = getProxy();

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

self.addEventListener("fetch", (event: FetchEvent) => {

  console.log("FETCH EVENT", event.request.url);

  const proxy = getProxy();

  event.respondWith(proxy.fetch(event.request));

});
