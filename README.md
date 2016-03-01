# HTTP Proxy Proof-of-Concept

## Introduction

Perhaps surprisingly, the service worker cache [does not behave like a standard
HTTP cache](http://stackoverflow.com/a/35152817/11543);
[`http-proxy.js`](/docs/http-proxy.html) attempts to implement an [RFC
7234](https://tools.ietf.org/html/rfc7234) and [RFC
5861](https://tools.ietf.org/html/rfc5861) compliant HTTP proxy suitable for use
within a service worker.

The hope behind this was that since HTTP has very sophisticated cache management
features, it might be possible to implement different caching strategies via
simple wrappers that merely manipulate the well-defined and well-understood HTTP
cache control headers.

## Examples

To view the examples:

````sh
$ npm install
$ npm start
# open http://127.0.0.1:8000/
````

The examples only touch the images--everything else is passed through.

Recommendations:

* Keep the "server" terminal window open to see when requests are really made.
* Open DevTools.
* Turn on network throttling and use the slowest speed.

Notes:

* The cache and service workers are reset every time `index.html` is loaded.
* The examples are initiated via an interstitial page that installs and activates the service worker. There are ways around this, but they make the examples more difficult to follow.

## Status

It's a proof-of-concept. I did this to learn more about service workers, because
I like HTTP, and because I wanted to see what can be accomplished with an
RFC-compliant HTTP Proxy.  

## Author

Michael Stillwell (stillers@)
