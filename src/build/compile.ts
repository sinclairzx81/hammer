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
import { Cache } from '../cache/index'
import { Html, Asset } from './html'
import { dirname } from 'path'

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
  private readonly cache = new Cache<Asset>({
    key: 'sourcePath',
    hash: 'sourcePath'
  })
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
    for (const action of this.cache.next(html.assets)) {
      switch (action.type) {
        case 'insert':
          await this.start(action.value)
          break
        case 'delete':
          await this.stop(action.value)
          break
      }
    }
  }
}
