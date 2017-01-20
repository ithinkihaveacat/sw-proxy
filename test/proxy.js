const parseHeader = require('../dist/commonjs/proxy.js')._parseHeader;
// const freshMatch = require('../dist/commonjs/proxy.js')._freshMatch;
const canCache = require('../dist/commonjs/proxy.js')._canCache;
const Headers = require('node-fetch').Headers;

const assert = require('assert');

class Response {
  constructor(h) {
    this.status = 200;
    this.headers = new Headers(h);
  }
}

describe('Proxy', () => {

  describe('#parseHeader', () => {

    it('parses an empty header', () => {
      const h = parseHeader('');
      assert.deepEqual(h, {});
    });

    it('parses foo=bar', () => {
      const h = parseHeader('foo=bar');
      assert.deepEqual(h, {'foo': 'bar'});
    });

    it('parses foo=bar,baz', () => {
      const h = parseHeader('foo=bar,baz');
      assert.deepEqual(h, {'foo': 'bar', 'baz': undefined});
    });

    it('parses foo=bar,    BAZ,  quuz=43', () => {
      const h = parseHeader('foo=bar,    BAZ,  quux=43');
      assert.deepEqual(h, {'foo': 'bar', 'baz': undefined, 'quux': '43'});
    });

  });

  describe('#canCache', () => {

    [
      [{ }, false],
      [{'cache-control': 'public'}, false],
      [{'cache-control': 'max-age=7'}, true],
      [{'cache-control': 's-maxage=7773, public, foo=bar'}, true],
      [{'cache-control': 'no-store, foo=bar'}, false],
      [{'cache-control': 's-maxage=7773, private, foo=bar'}, true],
      [{'cache-control': 's-maxage=7773, qqq=public, foo=bar'}, true],
      [{'cache-control': 'qqq=public, foo=bar'}, false],
      [{
        'expires': 'Tue, 17 Jan 2012 00:49:02 GMT',
        'cache-control': 'public, max-age=31536000',
      }, true],
    ].forEach((d) => {
      it(`returns ${JSON.stringify(d[1])} for ${JSON.stringify(d[0])}`, () => {
        const res = new Response(d[0]);
        const expected = d[1];
        assert.equal(canCache(res), expected, JSON.stringify(d[0]));
      });
    });

  });

});
