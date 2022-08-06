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

import { ChildProcess, spawn, spawnSync, execSync } from 'child_process'

// -------------------------------------------------------------------------------
// Shell
// -------------------------------------------------------------------------------

export interface IShell {
  wait(): Promise<number | null>
  dispose(): void
}

// -------------------------------------------------------------------------------
// WindowsShell
// -------------------------------------------------------------------------------

export class WindowsShell implements IShell {
  private readonly cp: ChildProcess
  private promise!: Promise<number | null>
  private resolve!: (value: number | null) => void
  private disposed: boolean
  private exited: boolean

  constructor(private readonly command: string, stdio: 'inherit' | 'ignore') {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })
    const [cmd, params] = this.parseArguments(this.command)
    this.cp = spawn(cmd, params, { stdio })
    this.cp.on('close', (code) => this.onClose(code))
    this.cp.on('exit', (code) => this.onExit(code))
    this.disposed = false
    this.exited = false
  }

  // -------------------------------------------------
  // Methods
  // -------------------------------------------------

  public wait(): Promise<number | null> {
    return this.promise
  }

  public dispose() {
    if (!this.exited && !this.disposed) {
      this.disposed = true
      this.terminate()
    }
  }

  // -------------------------------------------------
  // Events
  // -------------------------------------------------

  private onExit(code: number | null) {
    this.resolve(code)
    this.exited = true
  }

  private onClose(code: number | null) {
    this.resolve(code)
    if (!this.exited) this.terminate()
  }

  // -------------------------------------------------
  // Terminate
  // -------------------------------------------------

  private terminate() {
    try {
      execSync(`taskkill /pid ${this.cp.pid} /T /F`)
    } catch (error) {
      if (error instanceof Error) {
        console.warn(error.message)
        return
      }
      console.warn(error)
    }
  }

  // -------------------------------------------------
  // Parser
  // -------------------------------------------------

  private parseArguments(command: string): [string, string[]] {
    const chars = command.split('')
    const args: string[] = []
    const temp: string[] = []
    while (chars.length > 0) {
      const char = chars.shift()!
      switch (char) {
        case '"': {
          const result = this.consumeCharsAsString(chars, char)
          args.push(result)
          break
        }
        case "'": {
          const result = this.consumeCharsAsString(chars, char)
          args.push(result)
          break
        }
        case ' ': {
          const result = this.consumeChars(temp)
          if (result.length > 0) args.push(result)
          break
        }
        default: {
          temp.push(char)
          break
        }
      }
    }
    const result = this.consumeChars(temp)
    if (result.length > 0) args.push(result)
    return ['cmd', ['/c', ...args]]
  }

  private consumeChars(chars: string[]): string {
    const result = chars.join('')
    while (chars.length > 0) chars.shift()
    return result
  }

  private consumeCharsAsString(buffer: string[], close: string): string {
    const result: string[] = []
    while (buffer.length > 0) {
      const char = buffer.shift()!
      if (char === close) return result.join('')
      else result.push(char)
    }
    return result.join('')
  }
}

// -------------------------------------------------------------------------------
// LinuxShell
// -------------------------------------------------------------------------------

export class LinuxShell implements IShell {
  private readonly cp: ChildProcess
  private promise!: Promise<number | null>
  private resolve!: (value: number | null) => void
  private disposed: boolean
  private exited: boolean

  constructor(private readonly command: string, stdio: 'inherit' | 'ignore') {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })
    const [cmd, params] = this.parseArguments(this.command)
    this.cp = spawn(cmd, params, { stdio })
    this.cp.on('close', (code) => this.onClose(code))
    this.cp.on('exit', (code) => this.onExit(code))
    this.disposed = false
    this.exited = false
  }

  // -------------------------------------------------
  // Methods
  // -------------------------------------------------

  public wait(): Promise<number | null> {
    return this.promise
  }

  public dispose() {
    if (!this.exited && !this.disposed) {
      this.disposed = true
      this.terminate()
    }
  }

  // -------------------------------------------------
  // Events
  // -------------------------------------------------

  private onExit(code: number | null) {
    this.resolve(code)
    this.exited = true
  }

  private onClose(code: number | null) {
    this.resolve(code)
    if (!this.exited) this.terminate()
  }

  // -------------------------------------------------
  // Terminate
  // -------------------------------------------------

  private terminate() {
    try {
      const params = ['-o', 'pid', '--no-headers', '--ppid', this.cp.pid!.toString()]
      const result = spawnSync('ps', params, { encoding: 'utf8' })
      const pid = parseInt(result.output[1]!)
      process.kill(pid, 'SIGTERM')
      this.cp.kill()
    } catch (error) {
      if (error instanceof Error) {
        console.warn(error.message)
        return
      }
      console.warn(error)
    }
  }

  // -------------------------------------------------
  // Parser
  // -------------------------------------------------

  private parseArguments(command: string): [string, string[]] {
    return ['sh', ['-c', command]]
  }
}

// -------------------------------------------------------------------------------
// Shell
// -------------------------------------------------------------------------------

export class Shell implements IShell {
  private readonly shell: IShell
  constructor(command: string, stdio: 'inherit' | 'ignore') {
    this.shell = /^win/.test(process.platform) ? new WindowsShell(command, stdio) : new LinuxShell(command, stdio)
  }
  public wait(): Promise<number | null> {
    return this.shell.wait()
  }

  public dispose(): void {
    return this.shell.dispose()
  }
}

export interface ShellOptions {
  /** Expected Exit Code */
  expect?: number
  /** Suppress stdio */
  stdio?: boolean
}

/**
 * Executes the given shell command and returns its exitcode. This function will inherit the
 * stdio interfaces of the the host process. This function will throw if the processes exitcode
 * does not equal the expected value. If left undefined, this function will resolve successfully
 * irrespective of if the process crashed.
 */
export async function shell(command: string, options: ShellOptions = {}): Promise<number | null> {
  const stdio = options.stdio !== undefined && options.stdio === false ? 'ignore' : 'inherit'
  const expect = options.expect !== undefined ? options.expect : 0
  const shell = new Shell(command, stdio)
  const exitcode = await shell.wait()
  if (expect === undefined) return exitcode
  if (expect !== exitcode) throw new Error(`The shell command '${command}' exited with code ${exitcode} but expected code ${expect}.`)
  return exitcode
}
