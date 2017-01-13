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
      assert.ok(new Router({ 'foo': 'bar' }) instanceof Router);
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
      const r = new Router({ 'foo': 'bar' });
      assert.deepEqual(r.match(), []);
    });
    it('should return no matches (no routes, URL)', () => {
      const r = new Router();
      assert.deepEqual(r.match('qqq'), []);
    });
    it('should return no matches (one route, URL)', () => {
      const r = new Router({ 'foo': 'bar' });
      assert.deepEqual(r.match('qqq'), []);
    });
    it('should return one match (one route, URL)', () => {
      const r = new Router({ 'foo': 'bar' });
      assert.deepEqual(
        r.match('foo'),
        [['bar', 'foo'.match(new RegExp('foo'))]]
      );
    });
    it('should support prefix', () => {
      const r = new Router({ '/foo': 'bar' }, '/quux');
      assert.ok(r.match('/quux/foo').length === 1);
    });
    it('should match on regexp /foo/(.*)', () => {
      const r = new Router({ '/foo/(.*)': 'bar' });
      const m = r.match('/foo/43');
      assert.ok(m.length === 1);
      assert.equal(m[0][0], 'bar');
      assert.equal(m[0][1][0], '/foo/43');
      assert.equal(m[0][1][1], '43');
    });
    it('should match on regexp /foo/quux-(.*)/(\\d+)', () => {
      const r = new Router({ '/foo/quux-(.*)/(\\d+)': 'bar' });
      const m = r.match('/foo/quux-clem/54');
      assert.ok(m.length === 1);
      assert.equal(m[0][0], 'bar');
      assert.equal(m[0][1][1], 'clem'); // first capture
      assert.equal(m[0][1][2], '54'); // second capture
    });
  });
});
