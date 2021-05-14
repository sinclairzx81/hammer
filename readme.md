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

Use the `serve` command to start a development server that reloads on file save.

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

## Run

Use the `run` command to run node scripts that reload on file save.

```typescript
import * as http from 'http'

http.createServer((req, res) => res.end('Hello World')).listen(5001)
```
```bash
$ hammer run index.ts

$ hammer run "index.ts arg1 arg2" # use quotes to pass arguments
```
## Tasks

Hammer has a built in task runner you can use to automate build workflow. To use, create a `hammer.ts` file in the current working directory. Exporting functions in this file allow Hammer to call into it via the `task` command.

```typescript
export function print(message: string) {
  console.log(message)
}
```
```bash
$ hammer task print "Hello World"
```
You can use tasks to orchestrate build workflows. Hammer provides a `shell` function for this purpose. The following creates a task that runs a browser and node application in parallel.

```typescript
import { shell } from '@sinclair/hammer'

export async function start (dist = 'target') {
  await shell([
    `hammer serve apps/website/index.html --dist ${dist}/website`,
    `hammer run apps/server/index.ts --dist ${dist}/server`
])
}
```
```bash
$ hammer task start
```

## Libraries

Hammer uses `tsconfig.json` path aliasing to link local library packages that may be shared between multiple applications. Consider the following directory structure.

```shell
/apps
  /server
    index.ts    ───────────┐
  /website                 │
    index.html             │
    index.ts    ───────────┤ depends on
/libs                      │
  /shared                  │
    index.ts    <──────────┘
tsconfig.json
```
To allow `website` and `server` to import `shared`. Configure `tsconfig.json` as follows.

```javascript
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@libs/shared": ["libs/shared/index.ts"],
        }
    }
}
```

Once configured, both `server` and `website` applications can import with the following.

```typescript
import { X } from '@libs/shared'

const x = new X()
```

## Command Line Interface

Hammer provides the following CLI interface.

```
Commands:

   $ hammer build <file or folder> <...options>
   $ hammer watch <file or folder> <...options>
   $ hammer serve <file or folder> <...options>
   $ hammer run <script> <...options>
   $ hammer task <task> <...arguments>
   $ hammer version
   $ hammer help

Options:

   --target    <...targets> Sets the ES targets.
   --platform  platform     Sets the platform.
   --dist      path         Sets the output directory.
   --port      port         The port to listen on when serving.
   --bundle                 Bundles the output for build and watch only.
   --minify                 Minifies the bundle.
   --sourcemap              Generate sourcemaps.
```