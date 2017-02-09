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

import "../service-worker";

// Returns a `Promise<ServiceWorkerRegistration>` like
/* tslint:disable-next-line:max-line-length */
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
// tslint:disable-next-line:no-string-literal
(window as any)["registerReady"] = (script: string, options: any) => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  return navigator.serviceWorker.register(script, options).then((r) => {

    let incoming = r.installing || r.waiting;
    if (r.active && !incoming) {
      return r;
    }

    return new Promise((resolve) => {
      incoming!.onstatechange = (e) => {
        if ((e.target as ServiceWorker).state === "activated") {
          incoming!.onstatechange = null;
          resolve(r);
        }
      };
    });

  });

};
