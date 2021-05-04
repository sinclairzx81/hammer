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

Create an `index.html` file.

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

Hammer is a build tool for HTML applications. It works by scanning an HTML file for asset references and processes each discovered asset along with the HTML file into a `dist` directory. Hammer uses `esbuild` for performance and provides a simple development server that supports automatic save and refresh workflows.

This project was created to be an ultra lightweight alternative to Parcel. It trades flexiblity in configuration; favoring instead simple automatic bundling with significantly reduced dependency overhead.

License MIT

## Cli

The following command line parameters are supported. The `[...paths]` can be any file or directory. If a directory Hammer will copy the directory into the `dist` location.

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



## Api

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

dispose() // optionally stop
```