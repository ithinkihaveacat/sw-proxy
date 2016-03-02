# HTTP Proxy Proof-of-Concept

## Motivation

Perhaps surprisingly, the service worker cache [does not behave like a standard
HTTP cache](http://stackoverflow.com/a/35152817/11543);
[`http-proxy.js`](/docs/http-proxy.html) attempts to implement an [RFC
7234](https://tools.ietf.org/html/rfc7234) and [RFC
5861](https://tools.ietf.org/html/rfc5861) compliant HTTP proxy suitable for use
within a service worker.

Some reasons for investigating this:

* **Is it possible to polyfill HTTP features browsers don't support?** Browsers support some, but not all, of the standard cache control headers. For example, no browser implements [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861#section-3) or [`stale-if-error`](https://tools.ietf.org/html/rfc5861#section-4) (though `stale-while-revalidate` may arrive in [Chrome M49](https://www.chromestatus.com/feature/5050913014153216)). Is it possible to provide a useful polyfill for these cache control headers? (This may be particularly useful in the future if [foreign fetch](https://www.chromestatus.com/feature/5684130679357440) is implemented.)
* **Is it possible to implement different caching strategies on top of HTTP?** HTTP has sophisticated, well-defined, and well-understood caching features, and so it might make sense to implement different caching strategies via simple header-manipulating wrappers on top of a generic HTTP proxy, instead of writing strategy-specific cache manipulation code. Is this a viable approach?

(Plus another big reason--to learn service workers in some detail!)

## Examples

To view the examples:

````sh
$ npm install
$ npm start
# open http://127.0.0.1:8000/
````

Recommendations:

* Keep the "server" terminal window open to see when requests are really made.
* Open DevTools.
* Turn on network throttling to the slowest speed.

Notes:

* The cache and service workers are reset every time `index.html` is loaded.
* The examples are initiated via an interstitial page that installs and activates the service worker. This is slightly ugly, but it makes the examples a lot easier to follow.

## Author

Michael Stillwell (stillers@)
