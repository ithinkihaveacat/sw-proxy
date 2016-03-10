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

// Returns a `Promise<ServiceWorkerRegistration>` like
// [ServiceWorkerContainer.register()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register),
// except that when it resolves, `script`'s service worker is active and
// controlling the page.
//
// (When the promise returned by `ServiceWorkerContainer.register()`
// resolves, the page might be controlled by a previously-installed service
// worker, or no service worker.)
//
// There's [a proposal](https://github.com/slightlyoff/ServiceWorker/issues/770)
// to make something similar part of the service worker spec.
/* exported registerReady */
function registerReady(script, options) {

  if (!('serviceWorker' in navigator)) {
    return new Promise();
  }

  return navigator.serviceWorker.register(script, options).then(function (r) {

    var incoming = r.installing || r.waiting;
    if (r.active && !incoming) {
      return r;
    }

    return new Promise(function (resolve) {
      incoming.onstatechange = function (e) {
        if (e.target.state === "activated") {
          incoming.onstatechange = null;
          resolve(r);
        }
      }
    });

  });

}
