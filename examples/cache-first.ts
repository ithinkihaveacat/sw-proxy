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

import {newResponse, Proxy, skipWaitingAndClaim} from "../proxy";

let CACHE = "MYCACHE";

skipWaitingAndClaim(self);

self.addEventListener("fetch", function (event: FetchEvent) {

  console.log("FETCH EVENT", event.request.url);

  // Function to transform responses
  function resFn(req: Request, res: Response): Promise<Response> {
    // Only transform JPGs
    if (req.url.match("jpg$")) {
      return newResponse(res, function (headers) {
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
  let proxy = new Proxy(CACHE, null, resFn);

  event.respondWith(proxy.fetch(event.request));

});
