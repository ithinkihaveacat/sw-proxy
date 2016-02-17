/* eslint-env serviceworker, browser */
/* global newRequest, newResponse */

self.importScripts("http-proxy.js");

var VERSION = "v" + new Date().toISOString().substr(11, 8);

console.log("WORKER", VERSION);

function warm(c) {
  var res = new Response("cached", {
    status: 200,
    statusText: "OK",
    headers: {
      "cache-control": "max-age=0, stale-while-revalidate=86400",
      "content-type": "text/plain",
      "date": new Date().toUTCString()
    }
  });
  return c.put(new Request("/foo.txt"), res).then(function () {
    return c;
  });
}

function lookup(c) {
  return c.match(new Request("/foo.txt")).then(function (r) {
    return r ? "CACHE HIT" : "CACHE MISS";
  });
}

function deleteAllCaches() {
  return caches.keys().then(function (cacheNames) {
    return Promise.all(
      cacheNames.map(function (cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

// ## Event Handlers

// ### "install"

self.addEventListener('install', function (event) {
  console.log("INSTALLING", VERSION);
  event.waitUntil(
    Promise.resolve()
    .then(deleteAllCaches)
    .then(caches.open.bind(caches, 'MYCACHE'))
    .then(warm)
    .then(lookup)
    .then(console.log.bind(console))
    .then(function () {
      return true;
    })
  );
});

// ### "activate"

self.addEventListener('activate', function (event) {
  console.log("ACTIVATING", VERSION);
  event.waitUntil(self.clients.claim());
});

// ### "fetch"

self.addEventListener('fetch', function (event) {

  console.log(event.request.url, 'FETCH');

  function reqFn(req) {
    return newRequest(req, function (headers) {
      // headers.set("cache-control", "only-if-cached");
      return headers;
    });
  }

  function resFn(req, res) {
    if (req.url.match("jpg$")) {
      console.log(req.url, "JPG, TRANSFORMING");
      return newResponse(res, function (headers) {
        console.log("TRANSFORM URL", req.url);
        headers.set("cache-control", "max-age=86000");
        headers.set("qqqqqq", 6);
        headers.set("date", new Date().toUTCString());
        return headers;
      });
    } else {
      console.log(req.url, "NOT JPG, LEAVING");
      return res;
    }
  }

  var proxy = new Proxy('MYCACHE', reqFn, resFn);
  event.respondWith(proxy.fetch(event.request));

});
