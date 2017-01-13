const Router = require('../dist/commonjs/router.js').Router;

const assert = require('assert');

describe('Router', () => {
  describe('#constructor()', () => {
    it('should return a Router object (no routes)', () => {
      assert.ok(new Router() instanceof Router);
    });
    it('should return a Router object (one route)', () => {
      assert.ok(new Router({ "foo": "bar" }) instanceof Router);
    })
  });
  describe('#match()', () => {
    it('should return no matches (no routes)', () => {
      const r = new Router();
      assert.deepEqual(r.match(), []);
    });
    it('should return no matches (one route)', () => {
      const r = new Router({ "foo": "bar" });
      assert.deepEqual(r.match(), []);
    });
  });
});
