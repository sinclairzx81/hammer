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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---------------------------------------------------------------------------*/

import { readHtml, watchHtml, Compiler } from './build/index'
import { watchFolder } from './watch/index'
import { createReloadServer } from './server/index'
import { resolve } from 'path'

// -------------------------------------------------------------------------
// Options
// -------------------------------------------------------------------------

export interface Options {
  htmlPath: string
  outDir: string
  port: number
  minify: boolean
  sourcemap: boolean
  target: string
  watch: boolean
}

// -------------------------------------------------------------------------
// Watch
// -------------------------------------------------------------------------

function into(func: Function) {
  return func()
}

async function watch(options: Options) {
  const compiler = new Compiler({
    minify: options.minify,
    sourcemap: options.sourcemap,
    target: options.target,
    bundle: true,
    watch: true,
  })
  const reload = createReloadServer({
    target: options.outDir,
    port: options.port,
  })
  await Promise.all([
    into(async () => {
      for await (const _ of watchFolder(options.outDir)) {
        reload()
      }
    }),
    into(async () => {
      for await (const html of watchHtml(options.htmlPath, options.outDir)) {
        compiler.run(html)
      }
    })
  ])
}

// -------------------------------------------------------------------------
// Build
// -------------------------------------------------------------------------

async function build(options: Options) {
  const compiler = new Compiler({
    minify: options.minify,
    sourcemap: options.sourcemap,
    target: options.target,
    bundle: true,
    watch: false,
  })
  const html = readHtml(options.htmlPath, options.outDir)
  await compiler.run(html)
}

// -------------------------------------------------------------------------
// Start
// -------------------------------------------------------------------------

export async function start(options: Options) {
  return options.watch ? await watch(options) : await build(options)
}
