<div align='center'>

<h1>Hammer</h1>

<p>Build Tool for HTML and Node Applications</p>

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

Hammer is a build and bundling tool for HTML applications. It works by parsing HTML files for asset references and will process each discovered asset into a target `dist` directory along with the HTML file. Hammer uses `esbuild` for performance and reduced dependency overhead. Additionally, Hammer provides watch, save and reload workflows for the browser as well as node applications.

Hammer was created to be an ultra lightweight alternative to Parcel. It is intended to be TypeScript centric and was written with mono repository support in mind leveraging TypeScript path aliasing. Hammer preferences automatic bundling over configuration where possible. It takes `esbuild` as it's only dependency to keep development dependencies to an absolute minimum.

License MIT

## Serve

Hammer provides a built in development server. To enable use the `--serve` option with a port number. This option will serve the `--dist` directory and reload on save.

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="index.tsx"></script>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>
```

```bash
$ hammer index.html --serve 5000
```

## Start

Hammer provides support running monitored NodeJS processes that restart on save. Use the `--start` option with a path to a javascript script to enable. The script path is relative to the `--dist` directory. The following will build and watch a small nodejs server.

```typescript
import * as http from 'http'

http.createServer((req, res) => res.end('hello world')).listen(5001)
```
```bash
$ hammer index.ts --start index.js

# use quotes to pass arguments.
$ hammer index.ts --start "index.js --port 5001"
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
To enable the applications to import the libraries, configure the `baseUrl` and `paths` options of the `tsconfig.json` file as follows.

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

Once configured, the `server` and `website` applications can import with the following.

```typescript
import { Foo } from '@libs/foo'
import { Bar } from '@libs/bar'
import { Baz } from '@libs/baz'

const foo = new Foo()
const bar = new Bar()
const baz = new Baz()

console.log(foo, bar, baz)
```

## Command Line Interface

Hammer provides the following CLI interface. The `[...paths]` can be any file or directory. If a directory is passed for a `path`, Hammer will copy the directory into the `dist` location as well as process assets within. The `--watch` option will only watch for changes. To serve or start a node process use `--serve` or `--start` respectively which implicitly enables `--watch`.

```
Examples:

  $ hammer [...paths] <...options>
  $ hammer index.html about.html
  $ hammer index.html images --dist target/website
  $ hammer index.html --serve 5000
  $ hammer index.ts --start index.js
  $ hammer index.ts --minify

Options:

  --target    <target>  Sets the ES target (default: esnext)
  --dist                Sets the output directory (default: dist)
  --serve     <port>    Watch and serves on the given port.
  --start     <script>  Watch and starts a script.
  --watch               Watch and compile on save only
  --minify              Minifies the bundle
  --sourcemap           Generate sourcemaps
```

## Application Programming Interface

Hammer provides the following API which analogs the CLI interface. The `run` function starts Hammer with the given options and returns a `dispose` handle to terminate any processes.

```typescript
import { run } from '@sinclair/hammer'

const dispose = await run({
  sourcePaths: ['index.html'], 
  outDir:      './dist', 
  target:      'esnext',
  minify:      false,
  sourcemap:   false,
  watch:       true,
  serve:       5000
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
    serve?:       number
    start?:       string
}
```
