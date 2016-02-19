/* eslint-env serviceworker, browser */

self.importScripts("http-proxy.js");

var VERSION = "CACHE-WARM.JS v" + new Date().toISOString().substr(11, 8);

console.log(VERSION);

var CACHE = "MYCACHE";

// Injects a `/quote.txt` into the cache.
function getEntries() {
  var body = [
    "The great roe is a mythological beast with the head",
    "of a lion and the body of a lion, though not the same",
    "lion. &#8211; Woody Allen"
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
  return {
    "/quote.txt": res
  };
}

skipWaitingAndClaim(self);

strategyPreCacheStatic(self, CACHE, getEntries());
