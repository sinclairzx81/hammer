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

import { channel, Sender, Receiver, Debounce } from '../async/index'
import { Asset } from '../resolve/index'
import * as fs from 'fs'

export class Watcher {
    private readonly watchers: Map<string, fs.FSWatcher>
    private readonly debounce: Debounce
    private readonly sender:   Sender<string>
    private readonly receiver: Receiver<string>

    constructor(sourcePaths: string[], assets: Asset[]) {
        const [sender, receiver] = channel<string>()
        this.debounce = new Debounce(100)
        this.watchers = new Map<string, fs.FSWatcher>()
        this.sender   = sender
        this.receiver = receiver
        for(const sourcePath of sourcePaths) {
            if(this.watchers.has(sourcePath)) continue
            if(!fs.existsSync(sourcePath)) continue
            const watcher = fs.watch(sourcePath, event => this.onChange(sourcePath))
            this.watchers.set(sourcePath, watcher)
        }
        this.update(assets)
    }

    public async * [Symbol.asyncIterator]() {
        for await(const path of this.receiver) {
            yield path
        }
    }

    public update(assets: Asset[]) {
        for(const sourcePath of assets.map(asset => asset.sourcePath)) {
            if(this.watchers.has(sourcePath)) continue
            if(!fs.existsSync(sourcePath)) continue
            const watcher = fs.watch(sourcePath, event => this.onChange(sourcePath))
            this.watchers.set(sourcePath, watcher)
        }
    }

    private onChange(sourcePath: string) {
        this.debounce.run(() => this.sender.send(sourcePath))
    }

    public dispose(): void {
        this.sender.end()
        for(const [sourcePath, watcher] of this.watchers) {
            this.watchers.delete(sourcePath)
            watcher.close()
        }
    }
}


export function watch(sourcePaths: string[], assets: Asset[]): Watcher {
    return new Watcher(sourcePaths, assets)
}