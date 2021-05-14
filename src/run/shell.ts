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

import { ChildProcess, spawn, spawnSync, execSync } from 'child_process'
import { Dispose } from '../dispose'

// --------------------------------------------------------------------------
//
// Shell
//
// Spawns OS processes and returns to the caller a 'disposable' handle.
// Runs the inner processes via 'sh' or 'cmd' for linux and windows
// respectively.
//
// --------------------------------------------------------------------------

// Specialized termination of the linux `sh` process, Looks up the
// sub process via the 'sh' pid and terminates it before terminating
// the 'sh' process itself.

function linuxKill(sh: ChildProcess) {
    const params = ['-o', 'pid', '--no-headers', '--ppid', sh.pid.toString()]
    const result = spawnSync('ps', params, { encoding: 'utf8' })
    const pid = parseInt(result.output[1])
    process.kill(pid, 'SIGTERM')
    sh.kill()
}

export class ShellHandle implements Dispose {
    private disposed: boolean
    private exited: boolean

    constructor(private readonly process: ChildProcess) {
        this.onStart()
        this.process.on('close', code => this.onClose(code!))
        this.process.on('exit', () => this.onExit())
        this.disposed = false
        this.exited = false
    }

    private printSignal(message: string) {
        const gray = '\x1b[90m'
        const esc = '\x1b[0m'
        const out = `${gray}[${message}]${esc}\n`
        process.stdout.write(out)
    }

    private onStart(): void {
        this.printSignal('run')
    }

    private onData(data: Buffer) {
        process.stdout.write(data)
    }

    private onExit() {
        this.exited = true
        this.printSignal('end')
    }

    private onClose(exitcode: number) {
        this.exited = true
    }

    private waitForExit() {
        return new Promise((resolve, reject) => {
            const wait = () => {
                if (this.exited) {
                    return resolve(void 0)
                }
                setTimeout(() => wait(), 10)
            }
            wait()
        })
    }

    public async dispose() {
        if (!this.exited && !this.disposed) {
            this.disposed = true
            // Attempt to dispose child process. Windows 
            // sometimes reports that the process does
            // not exist, potentially indicating that
            // the process has been terminated out
            // of band. Run an warn on error.
            try {
                if (/^win/.test(process.platform)) {
                    execSync(`taskkill /pid ${this.process.pid} /T /F`)
                } else {
                    linuxKill(this.process)
                }
            } catch (error) {
                console.warn(error.message)
            }

            // wait for either a 'close' or 'exit' event to 
            // set 'exited' to true. Used to help prevent 
            // processoverlap at the caller.
            await this.waitForExit()
        }
    }
}

/** Resolves the operating system start command, 'cmd' for windows, 'sh' for linux. */
export function resolveOsCommand(command: string): [string, [string, string]] {
    return (/^win/.test(process.platform))
        ? ['cmd', ['/c', command]]
        : ['sh', ['-c', command]]
}

/** Executes this shell command and returns a disposable handle. */
export function shell(command: string): ShellHandle {
    const [processName, params] = resolveOsCommand(command)
    return new ShellHandle(spawn(processName, params, { stdio: 'inherit' }))
}
