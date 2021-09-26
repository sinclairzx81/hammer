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

import { buildSync } from 'esbuild'
import * as fs       from 'fs'
import * as path     from 'path'

export interface CompileResult {
    filename: string
    dirname:  string
    code:     string    
}

/** Compiles the given code into single executable script. */
export function compile(scriptPath: string): CompileResult {
    const filename = path.resolve(scriptPath)
    if(!fs.existsSync(filename)) throw Error(`Cannot locate scriptPath ${scriptPath}`)
    const dirname = path.dirname(filename)
    const result = buildSync({
        entryPoints: [scriptPath],
        platform: 'node',
        target:   'esnext',
        bundle:   true,
        write:    false,
        outdir:   'out',
    })
    const uint8 = result.outputFiles[0].contents
    const code  = Buffer.from(uint8).toString()
    return { filename, dirname, code }
}