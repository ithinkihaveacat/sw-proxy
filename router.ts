/* Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

export interface Routes<T> {
  [k: string]: T;
}

/**
 * Described as a "Router", and is designed to match URLs, but at its core, all
 * this really does is: (1) takes a list of of regular expressions (and an
 * associated paired values); and (2) when passed a string, match it against the
 * regular expressions, and return a list of the matching values.
 *
 * @export
 * @class Router
 * @template T type of the value returned when regexp matched
 */
export class Router<T> {

  private routes: Array<[RegExp, T]>;

  /**
   * Creates an instance of Router:
   *
   * const r = new Router<String>({ 'foo': 'bar' });
   *
   * @param {Routes<T>} [routes={}]
   * @param {string} [prefix=""]
   *
   * @memberOf Router
   */
  constructor(routes: Routes<T> = {}, prefix = "") {
    this.routes = Object.keys(routes).map<[RegExp, T]>(r => {
      return [new RegExp(prefix + r), routes[r]];
    });
  }

  /**
   * Matches `s` against the stored regexps. For each match, returns the
   * corresponding value together with the regexp match array (which includes
   * the capturing groups).
   *
   * @param {string} s string to match against regexps
   * @returns {Array<[T, RegExpMatchArray]>}
   *
   * @memberOf Router
   */
  public match(s: string): Array<[T, RegExpMatchArray]> {
    if (!s || !s.match) {
      return [];
    }
    return this.routes.reduce((acc: Array<[T, RegExpMatchArray]>, r) => {
      const m = s.match(r[0]);
      if (m) {
        acc.push([r[1], m]);
      }
      return acc;
    }, []);
  }

  /**
   * Use `match()` if possible; `loop()` is needed if you have a more
   * complicated matching problem, such as the need to replicate [Express's
   * `next()`](https://expressjs.com/en/guide/routing.html) method or similar.
   *
   * Instead of returning a list of matches, this passes the first match to the
   * passed `handler` function, as well as a `next` function that can be called
   * to continue the loop.
   *
   * @param {string} s string to match against regexps
   * @param {(v: T, m: RegExpMatchArray, next: (() => void)) => void} handler
   * @returns void
   *
   * @memberOf Router
   */
  public loop(
    s: string,
    handler: (v: T, m: RegExpMatchArray, next: (() => void)) => void) {
    function _loop(l: Array<[T, RegExpMatchArray]>) {
      return () => {
        if (l.length !== 0) {
          const next = _loop(l.slice(1));
          const [v, matches] = l[0];
          handler(v, matches, next);
        }
      };
    }
    return _loop(this.match(s))();
  }

}
