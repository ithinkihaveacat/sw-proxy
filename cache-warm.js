/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "v" + new Date().toISOString().substr(11, 8);

console.log("CACHE-WARM.JS", VERSION);

// Injects a `/quote.txt` into the cache.
function warm(c) {
  var body = [
    "The great roe is a mythological beast with the head",
    "of a lion and the body of a lion, though not the same",
    "lion. – Woody Allen"
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
  return c.put(new Request("/quote.txt"), res).then(function () {
    return c;
  });
}

function lookup(c) {
  return c.match(new Request("/quote.txt")).then(function (r) {
    console.log(r ? "CACHE HIT" : "CACHE MISS");
  });
}

// ## Event Handlers

// ### "install"

self.addEventListener('install', function (event) {
  console.log("INSTALLING", VERSION);
  event.waitUntil(
    Promise.resolve()
    .then(warm)
    .then(lookup)
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

  var proxy = new Proxy('MYCACHE');
  event.respondWith(proxy.fetch(event.request));

});
