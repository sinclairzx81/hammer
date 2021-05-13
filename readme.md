<div align='center'>

<h1>Hammer</h1>

<p>Build Tool for Browser and Node Applications</p>

[![npm version](https://badge.fury.io/js/%40sinclair%2Fhammer.svg)](https://badge.fury.io/js/%40sinclair%2Fhammer)

<img src="doc/hammer.png" />

</div>

## Install

```shell
$ npm install @sinclair/hammer -g
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
$ hammer build index.html
```
Done

## Overview

Hammer is a build tool for browser and node applications. It provides a unified command line interface for developing both browser and node applications and includes appropriate `watch` and `reload` workflows for each. Hammer also provides support for linking local library dependencies taken by browser and node applications as well as the ability to create project automation tasks.

Hammer was written to consolidate several disparate tools related to monitoring node processes (nodemon), building from HTML (parcel), mono repository support (lerna, nx) and project automation (gulp, grunt). It takes `esbuild` as its only dependency and is as much concerned with build performance as it is with dramatically reducing the number of development dependencies required for modern web application development.

License MIT

## Serve

Hammer provides a built in development server. To use run `hammer serve [...paths]`. This will start a watch and reload server on port `5000` by default. See the command line interface section for additional options.

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
$ hammer serve index.html
```

## Start

Hammer provides support running monitored NodeJS processes that restart on save. To use run `hammer start <path> [...args]`. See the command line interface section for additional options.

```typescript
import * as http from 'http'

http.createServer((req, res) => res.end('hello world')).listen(5001)
```
```bash
$ hammer start index.ts
```

## Task

Hammer provides support for running project automation tasks that can be used to orchestrate build and watch workflows. This is handled with a file named `hammer.ts` in the current working directory. Hammer can call into this file to run any exported function, as follows.

```typescript
// file: hammer.ts

export function hello(name: string) {
  console.log(`hello, ${name}`)
}
```
```bash
$ hammer task hello dave
```
Additionally, Hammer provides built in libraries to run common `file`, `folder`, `shell` and `watch` operations. The following sets up two tasks, one to clean the project, the other to run a Hammer `serve` and `start` process in parallel. 

```typescript
// file: hammer.ts

import { shell, folder } from '@sinclair/hammer'

export async function clean (dist = 'target') {
  await folder(dist).delete()
}

export async function start (dist = 'target') {
  await shell([
    `hammer serve apps/website/index.html --dist ${dist}/website`,
    `hammer start apps/website/index.ts --dist ${dist}/server`
  ])
}

```
Which can be run with the following
```bash
$ hammer task clean
$ hammer task start
```
The `file`, `folder`, `shell` and `watch` utilities are well documented and should be fairly intuitive. Additional functionality for building and processing assets can be written or installed via `npm`.

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
To enable the applications to import these libraries, configure the `baseUrl` and `paths` options of the `tsconfig.json` file as follows.

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
Commands:

   $ hammer start script.ts | "script.ts arg1 arg2" {...options}
   $ hammer serve index.html images {...options}
   $ hammer watch worker.ts {...options}
   $ hammer build index.html {...options}
   $ hammer task start arg1 arg2

Options:

   --target    [...targets] Sets the ES targets. (default: esnext)
   --platform  target       Sets the platform. Options are browser or node. (default: browser)
   --dist      path         Sets the output directory. (default: dist)
   --bundle                 Bundles the output. (default: false)
   --minify                 Minifies the bundle. (default: false)
   --sourcemap              Generate sourcemaps. (default: false)
   --port      port         The port to listen on.
```