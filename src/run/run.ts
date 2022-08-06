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

import { into } from '../async/index'
import { watch } from '../watch/index'
import { Shell } from '../shell'
import * as path from 'path'

// ----------------------------------------------------------------------
// Note: Starts the process with terminal logging to indicate when
// the process is run as well as when it exits. This function returns
// a 'dispose' function which the watcher can use to terminate a
// in-flight process.
// ----------------------------------------------------------------------

function start(command: string): () => Promise<void> {
  const [blue, esc] = ['\x1b[36m', '\x1b[0m']
  console.log(`${blue}[run]${esc}`)
  const s = new Shell(command, 'inherit')
  const p = s.wait().then(() => console.log(`${blue}[end]${esc}`))
  return async () => {
    s.dispose()
    await p
  }
}

export function run(entryFile: string, args: string[]) {
  const command = `node ${entryFile} ${args.join(' ')}`
  const directory = path.dirname(entryFile)
  const watcher = watch([directory])
  let dispose = start(command)
  into(async () => {
    for await (const _ of watcher) {
      await dispose()
      dispose = start(command)
    }
  })
  return {
    dispose: async () => {
      watcher.dispose()
      await dispose()
    },
  }
}
