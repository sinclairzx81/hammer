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

import { Asset }                        from '../resolve/index'
import { Action }                       from '../cache/index'
import { Dispose }                      from '../dispose'
import { build, BuildResult, Platform } from 'esbuild'
import * as path                        from 'path'
import * as fs                          from 'fs'

export interface BuilderOptions {
    platform:  string
    target:    string[]
    bundle:    boolean
    minify:    boolean
    sourcemap: boolean
    watch:     boolean
}

export class Build implements Dispose {
    private readonly handles: Map<string, BuildResult>

    constructor(private readonly options: BuilderOptions) {
        this.handles = new Map<string, BuildResult>()
    }

    public async update(actions: Action<Asset>[]) {
        for(const action of actions) {
            switch(action.type) {
                case 'insert': await this.onInsert(action.value); break;
                case 'update': await this.onUpdate(action.value); break;
                case 'delete': await this.onDelete(action.value); break;
            }
        }
    }

    public dispose(): void {
        for(const [key, handle] of this.handles) {
            this.handles.delete(key)
            if(handle.stop) handle.stop()
        }
    }
    
    private async onInsert(asset: Asset) {
        if(['typescript', 'javascript', 'css'].includes(asset.type)) {
            return this.startEsbuild(asset)
        }
        return this.copyAsset(asset)
    }

    private async onUpdate(asset: Asset) {
        if(['typescript', 'javascript', 'css'].includes(asset.type)) {
            return
        }
        return this.copyAsset(asset)
    }

    private onDelete(asset: Asset) {
        if(['typescript', 'javascript', 'css'].includes(asset.type)) {
            return this.stopEsBuild(asset)
        }
    }

    private copyAsset(asset: Asset) {
        if(!fs.existsSync(asset.sourcePath)) return
        const directory = path.dirname(asset.targetPath)
        if(!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true })
        if(asset.type === 'html') {
            fs.writeFileSync(asset.targetPath, asset.content, 'utf-8')
        } else {
            fs.copyFileSync(asset.sourcePath, asset.targetPath)
        }
    }

    private async startEsbuild(asset: Asset) {
        try {
            if(this.handles.has(asset.sourcePath)) return
            const handle = await build({  
              entryPoints: [asset.sourcePath],
              platform:    this.options.platform as Platform,
              outfile:     asset.targetPath,
              minify:      this.options.minify,
              target:      this.options.target,
              sourcemap:   this.options.sourcemap,
              watch:       this.options.watch,
              bundle:      true
            })
            this.handles.set(asset.sourcePath, handle)
          } catch {}
    }

    private async stopEsBuild(asset: Asset) {
        if(!this.handles.has(asset.sourcePath)) return
        const handle = this.handles.get(asset.sourcePath)!
        this.handles.delete(asset.sourcePath)
        if(handle.stop) handle.stop()
    }
}
