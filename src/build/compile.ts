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

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { build, BuildResult } from 'esbuild'
import { Html, Asset } from './html'
import { dirname } from 'path'

// ---------------------------------------------------------------
// Cache
// ---------------------------------------------------------------

class Cache {
  private readonly cache = new Map<string, Asset>()
  private *added(html: Html) {
    for (const asset of html.assets) {
      if (!this.cache.has(asset.sourcePath)) {
        this.cache.set(asset.sourcePath, asset)
        yield { type: 'added', asset }
      }
    }
  }
  private *removed(next: Html) {
    for (const key of this.cache.keys()) {
      const exists = next.assets.find((asset) => asset.sourcePath === key)
      if (exists === undefined) {
        const asset = this.cache.get(key)!
        this.cache.delete(key)
        yield { type: 'removed', asset }
      }
    }
  }
  public *next(next: Html) {
    yield* this.removed(next)
    yield* this.added(next)
  }
}

// ---------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------

export interface CompilerOptions {
  minify: boolean
  bundle: boolean
  target: string
  sourcemap: boolean
  watch: boolean
}

export class Compiler {
  private readonly handles = new Map<string, BuildResult>()
  private readonly cache = new Cache()
  constructor(private readonly options: CompilerOptions) {}
  private async start(asset: Asset) {
    try {
      const handle = await build({
        entryPoints: [asset.sourcePath],
        outfile: asset.targetPath,
        minify: this.options.minify,
        bundle: this.options.bundle,
        target: this.options.target,
        sourcemap: this.options.sourcemap,
        watch: this.options.watch
      })
      this.handles.set(asset.sourcePath, handle)
    } catch {}
  }

  private stop(asset: Asset) {
    if (!this.handles.has(asset.sourcePath)) return
    const handle = this.handles.get(asset.sourcePath)!
    this.handles.delete(asset.sourcePath)
    handle.stop()
  }

  private writeHtml(html: Html) {
    const targetDirectory = dirname(html.targetPath)
    if (!existsSync(targetDirectory)) mkdirSync(targetDirectory, { recursive: true })
    writeFileSync(html.targetPath, html.targetContent, 'utf-8')
  }

  public async run(html: Html) {
    this.writeHtml(html)
    for (const action of this.cache.next(html)) {
      switch (action.type) {
        case 'added':
          await this.start(action.asset)
          break
        case 'removed':
          await this.stop(action.asset)
          break
      }
    }
  }
}
