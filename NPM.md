Testing the package locally:

```sh
$ npm pack # generates sw-proxy-*.tgz
$ cd ~/scratch/foo
$ npm install /path/to/sw-proxy-*.tgz
```

Publishing to `npm`:

```sh
$ npm version major|minor|patch # updates package.json
$ npm publish # publishes package to https://www.npmjs.com/package/sw-proxy, pushes to GitHub
```

Note that in both cases, various hook scripts from `package.json` are run. See
`npm help version` and `npm help publish` for more details.