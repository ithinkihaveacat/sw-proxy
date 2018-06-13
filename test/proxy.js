// @ts-check

const parseHeader = require('../dist/commonjs/proxy.js')._parseHeader;
const canCache = require('../dist/commonjs/proxy.js')._canCache;

const {deepEqual, equal} = require('assert');

function newResponse(h) {
  return {
    headers: {
      get: (k) => h[k],
    },
    status: 200,
  };
}

describe('Proxy', () => {

  describe('#parseHeader', () => {

    it('parses an empty header', () => {
      const h = parseHeader('');
      deepEqual(h, {});
    });

    it('parses foo=bar', () => {
      const h = parseHeader('foo=bar');
      deepEqual(h, {foo: 'bar'});
    });

    it('parses foo=bar,baz', () => {
      const h = parseHeader('foo=bar,baz');
      deepEqual(h, {foo: 'bar', baz: undefined});
    });

    it('parses foo=bar,    BAZ,  quuz=43', () => {
      const h = parseHeader('foo=bar,    BAZ,  quux=43');
      deepEqual(h, {foo: 'bar', baz: undefined, quux: '43'});
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
        'cache-control': 'public, max-age=31536000',
        'expires': 'Tue, 17 Jan 2012 00:49:02 GMT',
      }, true],
    ].forEach((d) => {
      it(`returns ${JSON.stringify(d[1])} for ${JSON.stringify(d[0])}`, () => {
        const res = newResponse(d[0]);
        const expected = d[1];
        equal(
          canCache(/** @type {Response} */ (res)),
          expected,
          JSON.stringify(d[0])
        );
      });
    });

  });

});
