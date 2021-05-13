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

import * as fs from 'fs'

// -------------------------------------------------------------------------
// Specialized Debounce
// -------------------------------------------------------------------------

class Debounce {
    private timeout: NodeJS.Timeout | undefined
    constructor(private readonly delay: number) { }
    public run<T>(func: () => T) {
        if (this.timeout !== undefined) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => func(), this.delay)
    }
}

export type WatchCallback = () => Promise<any> | any

export interface WatchOptions {
    /** Sets if the watch callback should fire immediately. The default is `true` */
    immediate: boolean
}

export class Watch {
    private readonly watchers = new Map<string, fs.FSWatcher>()
    private readonly debounce = new Debounce(100)
    private executing: boolean = false
    constructor(
        private readonly sourcePaths: string[],
        private readonly callback: WatchCallback,
        private readonly options: WatchOptions
    ) { }

    public async start(): Promise<void> {
        if (this.options.immediate) await this.callback()
        return new Promise((resolve, reject) => {
            for (const sourcePath of this.sourcePaths) {
                if (this.watchers.has(sourcePath)) continue
                if (!fs.existsSync(sourcePath)) continue
                const watcher = fs.watch(sourcePath, { recursive: true }, event => this.onChange(resolve, reject))
                this.watchers.set(sourcePath, watcher)
            }
        })
    }

    private onChange(resolve: Function, reject: Function) {
        this.debounce.run(() => {
            if(this.executing) return
            this.executing = true
            Promise.resolve(this.callback()).then(() => {
                this.executing = false
            }).catch(error => {
                for(const watcher of this.watchers.values()) {
                    watcher.close()
                    reject(error)
                }
            })
        })
    }
}

/** Watches multiple file and directory paths and will callback on change. Returns a promise that will never resolve. */
export function watch(sourcePaths: string[], callback: WatchCallback, options?: WatchOptions): Promise<void>

/** Watches a file or directory path and will callback on change. Returns a promise that will never resolve. */
export function watch(sourcePath: string, callback: WatchCallback, options?: WatchOptions): Promise<void>

export async function watch(paths: string | string[], callback: WatchCallback, options: WatchOptions = { immediate: true }): Promise<void> {
    const sourcePaths = Array.isArray(paths) ? paths : [paths]
    return new Watch(sourcePaths, callback, options).start()
}

