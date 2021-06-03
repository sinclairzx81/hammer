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

import { SystemError } from './error'
import { spawn } from 'child_process'

export class ShellRuntimeError extends SystemError {
    constructor(public readonly command: string, public readonly inner: Error) {
        super(`The command '${command}' encountered an error. ${inner.message}`)
    }
}

export class ShellExitCodeError extends SystemError {
    constructor(public readonly command: string, public readonly expect: number, actual: number | null) {
        super(`The command '${command}' ended with exitcode '${actual}'. Expected '${expect}'.`)
    }
}

export interface ShellOptions {
    exitcode: number
}

// Parses a full string command and returns components
// which are passed to spawn. Handles "quoted" strings
// in the command.
function prepareCommand(command: string): string[] {
    const components = command.split(' ')
    .map(component => component.trim())
    .filter(component => component.length > 0)
    let open = false
    const result = []
    const temp = []
    while (components.length > 0) {
        const next = components.shift()!
        if(!open && next.indexOf('"') === 0 && next.lastIndexOf('"') !== next.length - 1) {
            temp.push(next.slice(1))
            open = true
        } else if (open && next.indexOf('"') === next.length - 1) {
            temp.push(next.slice(0, next.length - 1))
            result.push(temp.join(' '))
            while(temp.length > 0) temp.shift()
            open = false
        } else if(open) {
            temp.push(next)
        } else {
            result.push(next)
        }
    }
    return result
}

export class Shell {
    constructor(private readonly command: string, private readonly options: ShellOptions) { }

    private parse(): [command: string, options: string[]] {
         const components = prepareCommand(this.command)
        if (/^win/.test(process.platform)) {
            const command = 'cmd'
            const options = ['/c', ...components]
            return [command, options]
        } else {
            const command = 'sh'
            const options = ['-c', components.join(' ')]
            return [command, options]
        }
    }

    private onError(error: Error, reject: Function) {
        reject(new ShellRuntimeError(this.command, error))
    }

    private onClose(exitcode: number | null, resolve: Function, reject: Function) {
        if (exitcode !== this.options.exitcode) {
            reject(new ShellExitCodeError(this.command, this.options.exitcode, exitcode))
        } else {
            resolve(exitcode)
        }
    }

    public execute(): Promise<number> {
        return new Promise((resolve, reject) => {            
            const [command, options] = this.parse()
            const process = spawn(command, options, { stdio: 'inherit' })
            process.on('close', exitcode => this.onClose(exitcode, resolve, reject))
            process.on('error', error => this.onError(error, reject))
        })
    }
}

/** Runs multiple shell commands in parallel. Returns an array of exitcodes. */
export function shell(commands: string[], options?: ShellOptions): Promise<number[]>

/** Runs a shell command and returns its exitcode. */
export function shell(command: string, options?: ShellOptions): Promise<number>

export async function shell(commands: string | string[], options: ShellOptions = { exitcode: 0 }): Promise<number | number[]> {
    const isParallel = Array.isArray(commands)
    commands = isParallel ? commands as string[] : [commands as string]
    const shells = commands.map(command => new Shell(command, options))
    const results = await Promise.all(shells.map(shell => shell.execute()))
    return isParallel ? results : results[0]
}
