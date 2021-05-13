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

import * as path from 'path'
import * as vm from 'vm'
import * as fs from 'fs'

export class TaskError extends Error {
    constructor(public readonly task: string, public readonly reason: string) {
        super(`${task}: ${reason}`)
    }
}

export type TaskExports = { [key: string]: Function }

function build(scriptPath: string): string {
    try {
        const result = buildSync({
            entryPoints: [scriptPath],
            platform: 'node',
            target: 'esnext',
            bundle: true,
            write: false,
            outdir: 'out',
        })
        const uint8 = result.outputFiles[0].contents
        return Buffer.from(uint8).toString()
    } catch (error) {
        console.error(error.message)
        return ''
    }
}

function instance(scriptPath: string, code: string): TaskExports {
    const context = vm.createContext({
        /** @ts-ignore */
        require: (module: string) => {
            try { return require(module) } catch { /** ignore */ }
            return require(path.join(process.cwd(), module))
        },
        /** @ts-ignore */
        __dirname: process.cwd(),
        /** @ts-ignore */
        __filename: path.resolve(scriptPath),
        ...global,
        Buffer,
        process,
        console,
        exports: {}
    })
    vm.runInNewContext(code, context)
    return context.exports
}

async function execute(exports: TaskExports, name: string, params: any[]) {
    const task = exports[name]
    if(task === undefined) throw new TaskError(name, `No such method '${name}'`)
    task.apply(null, params)
}

export async function task(scriptPath: string, name: string, params: any[]) {
    if(!fs.existsSync(scriptPath)) {
        console.log(`Unable to find task file ${scriptPath}`)
        process.exit(1)
    }
    try {
        const code = build(scriptPath)
        const exports = instance(scriptPath, code)
        await execute(exports, name, params)
    } catch(error) {
        console.log(error.message)
        process.exit(1)
    }

}

