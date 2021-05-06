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
Examples: $ hammer [..paths] <...options>
          $ hammer index.html about.html
          $ hammer index.html images --dist dist
          $ hammer index.html --dist dist
          $ hammer index.html --dist dist --watch --port 5000
          $ hammer index.html --dist dist --watch --target safari11

Options:
  --dist      The output directory (default: dist)
  --target    Sets the ES target (default: esnext)
  --minify    Minifies the bundle (default: false)
  --sourcemap Generate sourcemap (default: false)
  --watch     Starts the compiler in watch mode (default: false)
  --port      Sets the dev server port (default: 5000)
```

## Application Programming Interface

Hammer provides the following API which analogs the Cli interface. All parameters are required. The `start` function returns a `dispose` function that can be used to stop watch and server processes.

```typescript
import { start } from '@sinclair/hammer'

const dispose = await start({
  sourcePaths: ['index.html'], 
  outDir: './dist', 
  target: 'esnext',
  minify: false,
  sourcemap: false,
  watch: false,
  port: 5000
})

// ...

dispose() 
```

## Mono Repository

Hammer provides support for keeping shared library code outside an application source tree by leveraging TypeScript's `tsconfig.json` module aliasing. This feature is wonderfully supported by `esbuild` and leveraged by Hammer to offer mono repository support without the need for additional development dependencies (such as `lerna`, `nx` etc)

Consider the the following source tree where we have two applications `app1` and `app2`. Both of these applications may take dependencies on the shared library `common`. The following demonstrates the minimum `tsconfig.json` setup required to make this possible.

```shell
/apps
  /app1
    index.html
    index.ts
    index.css
    tsconfig.json
  /app2
    index.html
    index.ts
    index.css
    tsconfig.json
/libs
  /common
    index.ts
tsconfig.json
```
The following are the configurations.

```javascript
// apps/app1/tsconfig.json
{ 
  extends: '../../tsconfig.json', 
  files: ["index.ts"] 
}

// apps/app2/tsconfig.json
{ 
  extends: '../../tsconfig.json', 
  files: ["index.ts"] 
}

// tsconfig.json
{
   "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@libs/common": ["libs/common/index.ts"]
      }
   }
}
```

Now `app1` and `app2` can take a dependency on the aliased module. 

```typescript
import { Foo } from '@libs/common'
```
