const Router = require('../dist/commonjs/router.js').Router;

const assert = require('assert');

describe('Router', () => {
  describe('#constructor()', () => {
    it('should return a Router object (empty constructor)', () => {
      assert.ok(new Router() instanceof Router);
    });
    it('should return a Router object (no routes)', () => {
      assert.ok(new Router({}) instanceof Router);
    });
    it('should return a Router object (one route)', () => {
      assert.ok(new Router({ "foo": "bar" }) instanceof Router);
    });
  });
  describe('#match()', () => {
    it('should return no matches (empty constructor, no URL)', () => {
      const r = new Router();
      assert.deepEqual(r.match(), []);
    });
    it('should return no matches (no routes, no URL)', () => {
      const r = new Router({});
      assert.deepEqual(r.match(), []);
    });
    it('should return no matches (one route, no URL)', () => {
      const r = new Router({ "foo": "bar" });
      assert.deepEqual(r.match(), []);
    });
    it('should return no matches (no routes, URL)', () => {
      const r = new Router();
      assert.deepEqual(r.match("qqq"), []);
    });
    it('should return no matches (one route, URL)', () => {
      const r = new Router({ "foo": "bar" });
      assert.deepEqual(r.match("qqq"), []);
    });
    it('should return one match (one route, URL)', () => {
      const r = new Router({ "foo": "bar" });
      assert.deepEqual(
        r.match("foo"),
        [["bar", "foo".match(new RegExp("foo"))]]
      );
    });
  });
});
