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

import {skipWaitingAndClaim,newRequest,Proxy} from "../proxy";

var CACHE = "MYCACHE";

skipWaitingAndClaim(self);

self.addEventListener('fetch', function (event: FetchEvent) {

  // Function to transform requests
  function reqFn(req: Request) {
    return newRequest(req, function (headers) {
      // Don't use the cache, ever
      headers.set("cache-control", "no-cache");
      headers.set("x-strategy", "network-only");
      return headers;
    });
  }

  var proxy = new Proxy(CACHE, reqFn);

  event.respondWith(proxy.fetch(event.request));

});
