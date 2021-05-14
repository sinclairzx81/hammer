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

import { Dispose } from '../dispose'
import { into }    from '../async/index'
import { watch }   from '../watch/index'
import { shell }   from './shell'
import * as path   from 'path'

export function run(entryFile: string, args: string[]) {
    const directory = path.dirname(entryFile)
    const watcher   = watch([directory], [])
    const handles   = [shell(`node ${entryFile} ${args.join(' ')}`)]
    into(async () => {
        for await(const _ of watcher) {
            const handle = handles.shift()!
            await handle.dispose()
            handles.unshift(shell(`node ${entryFile}`))
        }
    })
    return {
        dispose: () => {
            watcher.dispose()
            if(handles.length > 0) {
                const handle = handles.shift()!
                handle.dispose()
            }
        }
    }
}