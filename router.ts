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

/// <reference path="service-worker.d.ts"/>

export interface Route {
  [k: string]: any;
};

export class Router {

  private routes: [RegExp, any][];

  constructor(routes: Route = {}, prefix = "") {
    this.routes = Object.keys(routes).map<[RegExp, any]>(r => {
      return [new RegExp(prefix + r), routes[r]];
    }, []);
  }

  public match(url: string): [any, RegExpMatchArray][] {
    if (!url || !url.match) {
      return [];
    }
    return this.routes.reduce((acc: [any, RegExpMatchArray][], r) => {
      const m = url.match(r[0]);
      if (m) {
        acc.push([r[1], m]);
      }
      return acc;
    }, []);
  }

}
