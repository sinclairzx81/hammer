<div align='center'>

<h1>Hammer</h1>

<p>Build Tool for HTML Applications</p>

[![npm version](https://badge.fury.io/js/%40sinclair%2Fhammer.svg)](https://badge.fury.io/js/%40sinclair%2Fhammer)

<img src="doc/hammer.png" />

</div>

## Install

```shell
$ npm install -g @sinclair/hammer 
```

## Usage

Create an `index.html` file
```html
<!DOCTYPE html>
<html>
  <head>
    <link href="index.css" rel="stylesheet" />
    <script src="index.tsx"></script>
  </head>
  <body>
    <img src="banner.png" />
  </body>
</html>
```
Run Hammer
```shell
$ hammer index.html
```
Done

## Overview

Hammer is a build and bundling tool for HTML applications. It works by parsing HTML files for asset references and will process each discovered asset into a target `dist` directory along with the HTML file. Hammer uses `esbuild` for performance and reduced dependency overhead. It also provides a simple development server for automatic save and refresh workflows.

Hammer was created to be an ultra lightweight alternative to Parcel. It is intended to be TypeScript centric and was written with mono repository support in mind leveraging TypeScript path aliasing. Hammer preferences automatic bundling over configuration where possible. It takes `esbuild` as it's only dependency to keep development dependencies to an absolute minimum.

License MIT

## Command Line Interface

The following command line parameters are supported. The `[...paths]` can be any file or directory. If a directory is passed for a `path`, Hammer will copy the directory into the `dist` location as well as process assets within.

```
Examples:

  $ hammer [..paths] <...options>
  $ hammer index.html about.html
  $ hammer index.html images --dist target/website
  $ hammer index.html --watch
  $ hammer index.html --serve 5000
  $ hammer index.ts   --start index.js --platform node

Options:

  --platform  <target>  Sets the target platform (default: browser)
  --target    <target>  Sets the ES target (default: esnext)
  --dist                Sets the output directory (default: dist)
  --watch               Watch and compile on file changes
  --serve     <port>    Watch and serves the --dist directory on the given port
  --start     <file>    Watch and starts a node script the --dist directory
  --minify              Minifies the bundle
  --sourcemap           Generate sourcemaps
```

## Libraries

It is common to want to move shared library code outside the main application tree into a `libs` directory. This is typical in scenarios where shared library code may need to be published or reused for a number of applications local to the project. Hammer provides support for this by way of `tsconfig.json` configuration. 

Consider the following directory structure.

```shell
/apps
  /server
    index.ts    ───────────┐
  /website                 │
    index.html             │
    index.ts    ───────────┤ 
/libs                      │
  /foo                     │
    index.ts    <──────────┤
  /bar                     │
    index.ts    <──────────┤ depends on
  /baz                     │
    index.ts    <──────────┘
tsconfig.json
```
The following is the contents of the `tsconfig.json` file to allow the `server` and `website` applications to link / alias each library.

```javascript
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@libs/foo": ["libs/foo/index.ts"],
            "@libs/bar": ["libs/bar/index.ts"],
            "@libs/baz": ["libs/baz/index.ts"],
        }
    }
}
```
Now the `website` application can reference these libraries with the following.
```typescript
import { Foo } from '@libs/foo'
import { Bar } from '@libs/bar'
import { Baz } from '@libs/baz'

const foo = new Foo()
const bar = new Bar()
const baz = new Baz()

console.log(foo, bar, baz)
```
And started with.

```bash
# build the server to target/server and start.
$ hammer apps/server/index.ts --dist target/server --start index.js

# build the website to target/website and serve.
$ hammer apps/website/index.html --dist target/website --serve 5000
```
## Application Programming Interface

Hammer provides the following API which mirrors the Cli interface. The `run` function starts Hammer with the given options and returns a `dispose` handle to terminate any processes.

```typescript
import { run } from '@sinclair/hammer'

const dispose = await run({
  sourcePaths: ['index.html'], 
  outDir: './dist', 
  target: 'esnext',
  minify: false,
  sourcemap: false,
  watch: true,
  serve: 5000
})
// ...
dispose() 
```
The following is a full list of options.
```typescript
export interface Options {
    sourcePaths:  string[]
    dist:         string
    target:       string
    minify:       boolean
    bundle:       boolean
    sourcemap:    boolean
    watch:        boolean
    platform:     string
    serve?:       number
    start?:       string
}
```
