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
      assert.equal(r.match('/quux/foo').length, 1);
    });
    it('should match on regexp /foo/(.*)', () => {
      const r = new Router({ '/foo/(.*)': 'bar' });
      const m = r.match('/foo/43');
      assert.equal(m.length, 1);
      assert.equal(m[0][0], 'bar');
      assert.equal(m[0][1][0], '/foo/43');
      assert.equal(m[0][1][1], '43');
    });
    it('should match on regexp /foo/quux-(.*)/(\\d+)', () => {
      const r = new Router({ '/foo/quux-(.*)/(\\d+)': 'bar' });
      const m = r.match('/foo/quux-clem/54');
      assert.equal(m.length, 1);
      assert.equal(m[0][0], 'bar');
      assert.equal(m[0][1][1], 'clem'); // first capture
      assert.equal(m[0][1][2], '54'); // second capture
    });
    it('should return a single match', () => {
      const r = new Router({ 'foo1': 'bar1', 'foo2': 'bar2' });
      const m1 = r.match('foo1');
      assert.equal(m1.length, 1);
      assert.equal(m1[0][0], 'bar1');
      const m2 = r.match('foo2');
      assert.equal(m2.length, 1);
      assert.equal(m2[0][0], 'bar2');
    });
    it('should return two matches', () => {
      const r = new Router({ 'foo': 'bar', '.*': 'baz' });
      const m = r.match('foo');
      assert.equal(m.length, 2);
      assert.equal(m[0][0], 'bar');
      assert.equal(m[1][0], 'baz');
    });

  });

  describe('#loop()', () => {

    it('should return a single match', () => {
      const r = new Router({ 'foo': 'bar' });
      r.loop('foo', (v) => {
        assert.equal(v, 'bar');
      });
    });
    it('should return two matches', () => {
      const r = new Router({ 'foo': 'bar1', '.*': 'bar2' });
      let count = 0;
      r.loop('foo', (v, m, n) => {
        switch (count) {
          // First time through the value should be 'bar1' ...
          case 0:
            assert.equal(v, 'bar1');
            break;
          // ... and the second time (after n()) the value should be 'bar2'
          case 1:
            assert.equal(v, 'bar2');
            break;
        }
        count++;
        n();
      });
    });
    it('should match on regexp /foo-(\\d+)', () => {
      const r = new Router({ '/foo-(\\d+)': 'bar' });
      r.loop('/foo-333', (v, m) => {
        assert.equal(v, 'bar');
        assert.equal(m[1], '333');
      });
    });

  });
});
