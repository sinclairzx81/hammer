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

Hammer is a build tool for browser and node applications. It provides a unified command line interface for developing browser and node applications and includes appropriate `watch` and `reload` workflows for each. It is designed with rapid application development in mind and requires little to no configuration to use. Hammer can scale from single web projects to multi library mono repositories using a its command line paired with its built in task runner.

Hammer was written to consolidate several disparate tools related to monitoring node processes (nodemon), building from HTML (parcel), mono repository support (lerna, nx) and project automation (gulp, grunt). It takes `esbuild` as its only dependency and is as much concerned with build performance as it is with dramatically reducing the number of development dependencies required for modern web application development.

This project is offered as is to anyone who may find it of use.

License MIT

## Serve

Use the `serve` command to start a development server that reloads on save.

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

Use the `run` command to start node scripts that reload on save.

```bash
$ hammer run index.ts

$ hammer run "index.ts arg1 arg2" # use quotes to pass arguments
```
## Tasks

Hammer provides support for running tasks to automate build workflow. To use tasks, create a `hammer.ts` file in the current working directory. You can call any exported function from the `task` command.

```typescript
export function print(message: string) {
  console.log(message)
}
```
```bash
$ hammer task print "Hello World"
```
You can use tasks to orchestrate builds in parallel. The following starts `serve` and `run` processes in parallel.
```typescript
import { shell } from '@sinclair/hammer'

export async function start(dist = 'target') {
    await shell([
        `hammer serve apps/website/index.html --dist ${dist}/website`,
        `hammer run apps/server/index.ts --dist ${dist}/server`
    ])
}
```
```bash
$ hammer task start
```

## Libs

Use `tsconfig.json` path aliasing to link local library packages that are shared between multiple applications. Consider the following directory structure.

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

The `server` and `website` applications can import with the following.

```typescript
import { X } from '@libs/shared'

const x = new X()
```

## Cli

Hammer provides the following command line interface.

```
Commands:

   $ hammer build  <file or folder> <...options>
   $ hammer watch  <file or folder> <...options>
   $ hammer serve  <file or folder> <...options>
   $ hammer run    <script>         <...options>
   $ hammer task   <task>           <...arguments>
   $ hammer version
   $ hammer help

Options:

   --target      targets     The es build targets.
   --platform    platform    The target plaform.
   --dist        directory   The target directory.
   --port        port        The port to listen on.
   --minify                  Minifies the output.
   --sourcemap               Generate sourcemaps.
```
