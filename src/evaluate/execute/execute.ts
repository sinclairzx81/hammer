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

import { CompileResult } from '../compile/index'
import * as path from 'path'
import * as vm   from 'vm'

export type AdditionalGlobals = { [name: string]: any }

/** 
 * Evaluates a compilation result. The script is evaluated inside a Node 
 * context as a module. Any exports from the module are returned as a 
 * result.
 */
export function execute(result: CompileResult, additional: AdditionalGlobals): {[key: string]: any } {
    const exports = {}
    const context = vm.createContext({
        ...global,
        ...additional,
        require: (module: string) => {
            try { return require(module) } catch { /** ignore */ }
            return require(path.join(process.cwd(), module))
        },
        __dirname: result.dirname,
        __filename: path.resolve(result.filename),
        Buffer,
        process,
        console,
        exports,
    })
    vm.runInNewContext(result.code, context)  
    return exports
}