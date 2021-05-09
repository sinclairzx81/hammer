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

import * as fs   from 'fs'
import * as path from 'path'

export interface Options {
    sourcePaths:  string[]
    dist:         string
    target:       string
    minify:       boolean
    sourcemap:    boolean
    watch:        boolean
    platform:     string
    serve?:       number
    start?:       string
}

export class OptionError extends Error {
    constructor(public readonly option: string, message: string) {
        super(message)
    }
}

export class OptionsReader {
    private readonly parameters: string[]

    constructor(private readonly args: string[]) {
        this.parameters = this.args.slice(2)
    }

    private help() {
        if(this.parameters.length === 0) return true
        const index = this.parameters.indexOf('--help')
        return (index === -1) ? false : true
    }

    private *sourcePaths(): Generator<string> {
        for(const parameter of this.parameters) {
            if(parameter.includes('--')) return
            const sourcePath = path.isAbsolute(parameter) ? parameter : path.join(process.cwd(), parameter) 
            if(!fs.existsSync(sourcePath)) throw new OptionError('path', `${sourcePath} not found.`)
            yield sourcePath
        }
    }

    private watch() {
        const index = this.parameters.indexOf('--watch')
        return (index === -1) ? false : true
    }

    private serve() {
        const index = this.parameters.indexOf('--serve')
        if(!(index === -1 || (index + 1) > this.parameters.length)) {
            const port = parseInt(this.parameters[index + 1])
            if(Number.isNaN(port)) throw new OptionError('--serve', `'${this.parameters[index + 1]}' is not a valid port.`)
            return port
        } else {
            return undefined
        }
    }
    
    private start() {
        const dist  = this.dist()
        const index = this.parameters.indexOf('--start')
        if(!(index === -1 || (index + 1) > this.parameters.length)) {
            const parameter = this.parameters[index + 1]
            const split     = parameter.split(' ')
            const entry     = path.join(dist, split[0])
            const rest      = split.slice(1)
            if(path.extname(entry) !== '.js') throw new OptionError('--start', 'Script must be a .js file.')
            return [entry, ...rest].join(' ')
        } else {
            return undefined
        }
    }

    private platform() {
        const index = this.parameters.indexOf('--platform')
        if(!(index === -1 || (index + 1) > this.parameters.length)) {
           const platform = this.parameters[index + 1]
           if(!['node', 'browser'].includes(platform)) throw new OptionError('--platform', `Expected either 'node' or 'browser'. Got ${platform}`)
           return platform
        }
        if(this.serve()) return 'browser'
        if(this.start()) return 'node'
        return 'browser'
    }

    private minify() {
        const index = this.parameters.indexOf('--minify')
        return (index === -1) ? false : true
    }

    private sourcemap() {
        const index = this.parameters.indexOf('--sourcemap')
        return (index === -1) ? false : true
    }

    private dist() {
        const index = this.parameters.indexOf('--dist')
        return (!(index === -1 || (index + 1) > this.parameters.length))
            ? path.join(process.cwd(), this.parameters[index + 1])    
            : path.join(process.cwd(), 'dist')   
    }

    private target() {
        const index = this.parameters.indexOf('--esnext')
        return (!(index === -1 || (index + 1) > this.parameters.length))
            ? path.join(process.cwd(), this.parameters[index + 1])    
            : 'esnext' 
    }

    public get(): Options | undefined {
        if(this.help()) return undefined
        try {
            const options = {
                sourcePaths: [...this.sourcePaths()],
                platform:  this.platform(),
                dist:      this.dist(),
                minify:    this.minify(),
                sourcemap: this.sourcemap(),
                target:    this.target(),
                watch:     this.watch(),
                serve:     this.serve(),
                start:     this.start(),
            }
            if(options.serve || options.start) options.watch = true
            if(options.serve && options.start) {
                throw new OptionError('--start', 'Cannot start and serve in the same command.')
            }
            return options
        } catch(error) {
            if(error instanceof OptionError) {
                const yellow = '\x1b[33m'
                const esc    = `\x1b[0m`
                console.log('Errors: ')
                console.log()
                console.log(`  ${yellow}${error.option}${esc} ${error.message}`)
                console.log()
            } else {
                console.log(error.message)
            }
            return undefined
        }
    }
}

export function options(argv: string[]): Options | undefined {
    return new OptionsReader(argv).get()
}