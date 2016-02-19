/* eslint-env serviceworker, browser */

self.addEventListener('install', function (event) {
  console.log('INSTALL A');
  event.waitUntil(new Promise(function (resolve) {
    setTimeout(function () {
      console.log("RESOLVING A");
      resolve(true);
    }, 5000);
  }));
});

self.addEventListener('install', function (event) {
  console.log("INSTALL B");
  event.waitUntil(new Promise(function (resolve) {
    setTimeout(function () {
      console.log("RESOLVING B");
      resolve(true);
    }, 3000);
  }));
  // self.skipWaiting();
});

self.addEventListener('activate', function () {
  console.log('ACTIVATE'); // never reached
});
