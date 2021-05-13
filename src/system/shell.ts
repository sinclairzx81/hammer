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
    constructor(public readonly command: string, public readonly exitcode: number) {
        super(`The command '${command}' exited with unexpected exitcode ${exitcode}`)
    }
}

export interface ShellOptions {
    exitcode?: number
}

export class Shell {
    constructor(private readonly command: string, private readonly options: ShellOptions) { }

    private parse(): [command: string, options: string[]] {
        const components = this.command.split(' ')
            .map(component => component.trim())
            .filter(component => component.length > 0)
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

    private onClose(exitcode: number, resolve: Function, reject: Function) {
        if (this.options.exitcode !== undefined && exitcode !== this.options.exitcode) {
            reject(new ShellExitCodeError(this.command, exitcode))
        } else {
            resolve(exitcode)
        }
    }

    public execute(): Promise<number> {
        return new Promise((resolve, reject) => {            
            const [command, options] = this.parse()
            const process = spawn(command, options, { stdio: 'inherit' })
            process.on('error', error => this.onError(error, reject))
            process.on('close', exitcode => this.onClose(exitcode, resolve, reject))
        })
    }
}

/** Runs multiple shell commands in parallel. Returns an array of exitcodes. */
export function shell(commands: string[], options?: ShellOptions): Promise<number[]>

/** Runs a shell command and returns its exitcode. */
export function shell(command: string, options?: ShellOptions): Promise<number>

export async function shell(commands: string | string[], options: ShellOptions = {}): Promise<number | number[]> {
    const isParallel = Array.isArray(commands)
    commands = isParallel ? commands as string[] : [commands as string]
    const shells = commands.map(command => new Shell(command, options))
    const results = await Promise.all(shells.map(shell => shell.execute()))
    return isParallel ? results : results[0]
}





