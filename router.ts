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
};

export class Router<T> {

  private routes: Array<[RegExp, T]>;

  constructor(routes: Routes<T> = {}, prefix = "") {
    this.routes = Object.keys(routes).map<[RegExp, T]>(r => {
      return [new RegExp(prefix + r), routes[r]];
    }, []);
  }

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
