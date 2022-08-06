/*--------------------------------------------------------------------------

MIT License

Copyright (c) Hammer 2022 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

import { file, folder, shell, watch, delay } from './global/index'
import { evaluate } from '../evaluate/index'
import * as fs from 'fs'

function print(exports: any) {
  console.log()
  console.log('The following tasks are available')
  console.log()
  const keys = Object.keys(exports).filter((key) => typeof exports[key] === 'function')
  for (const key of keys) {
    console.log(`  $ hammer task ${key}`)
  }
  console.log()
}

async function call(exports: any, name: string, params: any[]) {
  const task = exports[name]
  if (task === undefined) return print(exports)
  await task.apply(null, params)
}

/** Executes a task in the given scriptPath. */
export async function task(scriptPath: string, name: string, params: any[]) {
  if (!fs.existsSync(scriptPath)) {
    console.log(`Task: Task file 'hammer.mjs' not found.`)
    process.exit(1)
  }
  try {
    const exports = evaluate(scriptPath, { delay, file, folder, shell, watch })
    await call(exports, name, params)
  } catch (error: any) {
    const message = error.message || error
    console.log(`Error: [${name}] ${message}`)
    process.exit(1)
  }
}
