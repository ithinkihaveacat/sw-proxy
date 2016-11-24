- Make `tsc` work in this directory.
- Main problem is that importScripts('http-proxy.js') effectively brings symbols
  in as globals.
- However, we can't use the word "import" because then TypeScript things we're
  importing an actual module, and adds module loading code. (e.g. AMD.)
- But we also can't use /// <reference> (see cache-first.ts) because that
  marks the exported symbols with "export". (A version of http-proxy.d.ts that
  does *not* include the "export" commands works just fine … but I don't know whether
  there's an easy way to generate this.)