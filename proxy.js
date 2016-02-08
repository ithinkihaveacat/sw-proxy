/*
https://rawgit.com/ithinkihaveacat/4b82a8aa0a48097a0664/raw/index.html
http://localhost:8000/
chrome://serviceworker-internals/
chrome://inspect/#service-workers
*/

// importScripts('serviceworker-cache-polyfill.js');
importScripts('emitter.js');

var VERSION = new Date().toISOString().substr(0, 19);

console.log('PROXY', VERSION);

function Server(log) {
  this.data = [];
  this.not_found = [];
  this.slow = [];
  this.totalContentLength = 0;
  var self = this;
  log.on('fetch', function (entry) {
    self.data.push(entry);
  });
  log.on('fetch', function (entry) {
    if (entry.status === '404') {
      self.not_found.push(entry);
    }
  });
  log.on('fetch', function (entry) {
    if (entry.loadtime > 200) {
      self.slow.push(entry);
    }
  });
  log.on('fetch', function (entry) {
    self.totalContentLength += entry.contentLength;
  });
}

Server.prototype.handle = function (request, body) {

  switch (request.url) {
  case "totalContentLength":
    body = this.totalContentLength;
    break;
  default:
    body = this;
    break;
  }

  return new Promise(function (resolve, reject) {
    resolve({
      headers: {},
      body: body
    });
  });
};

var log = new Emitter();

log.on('fetch', console.log.bind(console));

var server = new Server(log);

self.addEventListener('fetch', function (event) {

  var t0 = Date.now();
  var request = event.request;
  var response = fetch(request); // response is a promise resolving to a response

  response.then(function (obj) { // ... obj is a "real" response object

    var response = obj.clone();  // ... though it has to be cloned

    response.blob().then(function (blob) {
      var t1 = Date.now();
      log.emit('fetch', {
        url: request.url,
        referrer: request.referrer,
        method: request.method,
        status: response.status,
        type: response.type,
        contentType: blob.type,
        contentLength: blob.size,
        loadtime: t1 - t0
      });
    });

  });

  event.respondWith(response); // this call must come after the response.then(...) above

});

self.addEventListener('install', function (event) {
  console.log('INSTALL', VERSION);
});

self.addEventListener('activate', function (event) {
  console.log('ACTIVATE', VERSION);
});

self.addEventListener('message', function (event) {
  console.log('MESSAGE', VERSION);
  var request = event.data;
  var messageChannel = event.ports[0];
  server.handle(request).then(function (response) {
    messageChannel.postMessage(response);
  });
});
