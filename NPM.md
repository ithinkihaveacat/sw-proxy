Publishing to `npm`:

```sh
$ npm version major|minor|patch # updates package.json
$ npm publish # publishes package to https://www.npmjs.com/package/sw-proxy
```

Note that in both cases, various hook scripts from `package.json` are run. See
`npm help version` and `npm help publish` for more details.