/*--------------------------------------------------------------------------

MIT License

Copyright (c) Hammer 2021 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A P
ARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---------------------------------------------------------------------------*/

import { start, Options } from './index'
import { join } from 'path'

// -------------------------------------------------------------------------
// Info
// -------------------------------------------------------------------------

function info() {
  const green = `\x1b[32m`
  const yellow = '\x1b[33m'
  const esc = `\x1b[0m`
  console.log([
    `Examples: ${green}hammer${esc} index.html`,
    `          ${green}hammer${esc} index.html ${yellow}--outDir${esc} target/app`,
    `          ${green}hammer${esc} index.html ${yellow}--outDir${esc} target/app ${yellow}--watch${esc} 5000`,
    `          ${green}hammer${esc} index.html ${yellow}--outDir${esc} target/app ${yellow}--watch${esc} 5000 ${yellow}--target${esc} safari11`,
    ``,
    `Options:`,
    `  ${yellow}--outDir${esc}    The output directory (default: dist)`,
    `  ${yellow}--target${esc}    Sets the ES target (default: esnext)`,
    `  ${yellow}--minify${esc}    Minifies the bundle (default: false)`,
    `  ${yellow}--sourcemap${esc} Generate sourcemap (default: false)`,
    `  ${yellow}--watch${esc}     Starts the compiler in watch mode (default: false)`,
    `  ${yellow}--port${esc}      Sets the dev server port (default: 5000)`,
  ].join(`\n`))
}

// -------------------------------------------------------------------------
// Cli 
// -------------------------------------------------------------------------

export function readEntry(argv: string[]): string | undefined {
  if (argv.length < 3) return undefined
  return argv[2]
}

export function readBoolean(argv: string[], param: string): boolean | undefined {
  if (argv.indexOf(param) === -1) return undefined
  return true
}

export function readValue(argv: string[], param: string): string | undefined {
  const index = argv.indexOf(param)
  if (index === -1) return undefined
  return argv[index + 1]
}

export function readOptions(argv: string[]): Options | undefined {
  const htmlPath = readEntry(argv)
  if (!htmlPath) return undefined
  const outDir = readValue(argv, '--outDir') || 'dist'
  const target = readValue(argv, '--target') || 'esnext'
  const port = readValue(argv, '--port') || '5000'
  const minify = readBoolean(argv, '--minify') || false
  const sourcemap = readBoolean(argv, '--sourcemap') || false
  const watch = readBoolean(argv, '--watch') || false
  return {
    htmlPath: join(process.cwd(), htmlPath),
    outDir: join(process.cwd(), outDir),
    port: parseInt(port),
    target,
    minify,
    sourcemap,
    watch,
  }
}

const options = readOptions(process.argv)
if (options) {
  const hammer = String.fromCodePoint(0x1F528)
  console.log(`${hammer} Building ${options.htmlPath}`)
  if(options.watch) console.log(`${hammer} Watching ${`http://localhost:${options.port}`}`)
  start(options).then(() => console.log(hammer, 'Done'))
} else {
  info()
}
