const parseHeader = require('../dist/commonjs/proxy.js')._parseHeader;

const assert = require('assert');

describe('Proxy', () => {

  describe('#parseHeader', () => {

    it('parses an empty header', () => {
      const h = parseHeader('');
      assert.deepEqual(h, {});
    });

    it('parses foo=bar', () => {
      const h = parseHeader('foo=bar');
      assert.deepEqual(h, { 'foo': 'bar' });
    });

    it('parses foo=bar,baz', () => {
      const h = parseHeader('foo=bar,baz');
      assert.deepEqual(h, { 'foo': 'bar', 'baz': undefined });
    });

    it('parses foo=bar,    BAZ,  quuz=43', () => {
      const h = parseHeader('foo=bar,    BAZ,  quux=43');
      assert.deepEqual(h, { 'foo': 'bar', 'baz': undefined, 'quux': '43' });
    });

  });

});
