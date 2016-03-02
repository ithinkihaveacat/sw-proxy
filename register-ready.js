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
