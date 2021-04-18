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

import { channel, Receiver, Debounce } from '../async/index'
import { mkdirSync, readdirSync, statSync, existsSync, watch } from 'fs'
import { join } from 'path'

function* findFolders(sourceDirectory: string): Generator<string> {
  const stat = statSync(sourceDirectory)
  if (!stat.isDirectory()) return
  yield sourceDirectory
  for (const entry of readdirSync(sourceDirectory)) {
    const next = join(sourceDirectory, entry)
    yield* findFolders(next)
  }
}

export function watchFolder(sourceDirectory: string): Receiver<string> {
  if (!existsSync(sourceDirectory)) mkdirSync(sourceDirectory, { recursive: true })
  const [sender, receiver] = channel<string>()
  const debounce = new Debounce(100)
  for (const folder of findFolders(sourceDirectory)) {
    watch(folder, () => debounce.run(() => sender.send(folder)))
  }
  return receiver
}

export function watchFile(sourcePath: string): Receiver<string> {
  const [sender, receiver] = channel<string>()
  const debounce = new Debounce(100)
  const emit = () => debounce.run(() => sender.send(sourcePath))
  watch(sourcePath, () => emit())
  emit()
  return receiver
}


