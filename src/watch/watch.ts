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
import * as path from 'path'
import * as fs from 'fs'

// --------------------------------------------------------------------------
//
// Watcher
//
// A multiple file watcher. This class sets up fs watchers for the given
// sourcePaths. If the sourcePath happens to be a directory and this watcher 
// is running on linux, then this may result in be multiple watchers per 
// sourcePath. This class will yield the sourcePath on change NOT the 
// internal file or directory that changed.
//
//              +---- fs.Watcher
//              |
// sourcePath --+---- fs.Watcher
//              |
//              +---- fs.Watcher
//
//              +---- fs.Watcher
//              |
// sourcePath --+---- fs.Watcher
//              |
//              +---- fs.Watcher
//
// --------------------------------------------------------------------------

type SourcePath = string

export class Watcher {
    private readonly watchers: Map<SourcePath, fs.FSWatcher[]>
    private readonly receiver: Receiver<string>
    private readonly sender:   Sender<string>
    private readonly debounce: Debounce

    constructor(sourcePaths: string[]) {
        const [sender, receiver] = channel<string>()
        this.debounce = new Debounce(100)
        this.watchers = new Map<SourcePath, fs.FSWatcher[]>()
        this.sender   = sender
        this.receiver = receiver
        this.add(sourcePaths)
    }

    // --------------------------------------------------------------
    // Iterator
    // --------------------------------------------------------------

    public async * [Symbol.asyncIterator]() {
        for await(const path of this.receiver) {
            yield path
        }
    }

    // --------------------------------------------------------------
    // Methods
    // --------------------------------------------------------------

    /** Adds additional sourcePaths to watch. If the sourcePath already  exists in this watchers set, then no action will be taken. */
    public add(sourcePaths: string[]) {
        for(const sourcePath of sourcePaths) {
            if(this.watchers.has(sourcePath)) continue
            if(!fs.existsSync(sourcePath)) continue
            this.watchers.set(sourcePath, [...this.createWatchers(sourcePath)])
        }
    }

    /** Disposes of this watcher and terminates all internal watchers. */
    public dispose(): void {
        this.sender.end()
        for(const [sourcePath, watchers] of this.watchers) {
            this.watchers.delete(sourcePath)
            for(const watcher of watchers) {
                watcher.close()
            }
        }
    }

    // --------------------------------------------------------------
    // Events
    // --------------------------------------------------------------

    private onChange(sourcePath: string) {
        this.debounce.run(() => this.sender.send(sourcePath))
    }

    // --------------------------------------------------------------
    // Watchers
    // --------------------------------------------------------------

    private * createLinuxDirectoryWatchers(directory: string, sourcePath: string): Generator<fs.FSWatcher> {
        const stat = fs.statSync(directory)
        yield fs.watch(directory, event => this.onChange(sourcePath))
        for(const filepath of fs.readdirSync(directory)) {
            const next = path.join(directory, filepath)
            const stat = fs.statSync(next)
            if(stat.isDirectory()) yield * this.createLinuxDirectoryWatchers(next, sourcePath)
        }
    }
    
    private * createLinuxWatchers(sourcePath: string): Generator<fs.FSWatcher> {
        const stat = fs.statSync(sourcePath)
        if(stat.isDirectory()) {
            yield * this.createLinuxDirectoryWatchers(sourcePath, sourcePath)
        } else if(stat.isFile()) {
            yield fs.watch(sourcePath, event => this.onChange(sourcePath))
        }
    }

    private * createWindowsWatchers(sourcePath: string): Generator<fs.FSWatcher> {
        const stat = fs.statSync(sourcePath)
        yield stat.isDirectory()
            ? fs.watch(sourcePath, { recursive: true }, event => this.onChange(sourcePath))
            : fs.watch(sourcePath, event => this.onChange(sourcePath))
    }

    private * createWatchers(sourcePath: string): Generator<fs.FSWatcher> {
        yield * /^win/.test(process.platform) ? 
            this.createWindowsWatchers(sourcePath) : 
            this.createLinuxWatchers(sourcePath)
    }
}


export function watch(sourcePaths: string[]): Watcher {
    return new Watcher(sourcePaths)
}