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
    bundle:       boolean
    sourcemap:    boolean
    watch:        boolean
    serve?:       number
    start?:       string
}

export class OptionsReader {
    private readonly parameters: string[]

    constructor(private readonly args: string[]) {
        this.parameters = this.args.slice(2).join(' ').split(' ').filter(x => x.length !== 0)
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
            if(!fs.existsSync(sourcePath)) continue
            yield sourcePath
        }
    }

    private bundle() {
        return true
    }

    private watch() {
        const index = this.parameters.indexOf('--watch')
        return (index === -1) ? false : true
    }

    public serve() {
        const index = this.parameters.indexOf('--serve')
        if(!(index === -1 || (index + 1) > this.parameters.length)) {
            return parseInt(this.parameters[index + 1])
        } else if(!(index === -1)) {
            return 5000
        } else {
            return undefined
        }
    }
    
    public start() {
        const index = this.parameters.indexOf('--start')
        if(!(index === -1 || (index + 1) > this.parameters.length)) {
            return this.parameters[index + 1]
        } else if(!(index === -1)) {
            return 'index.js'
        } else {
            return undefined
        }
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
                bundle: this.bundle(),
                dist: this.dist(),
                minify: this.minify(),
                sourcemap: this.sourcemap(),
                target: this.target(),
                watch: this.watch(),
                serve: this.serve(),
                start: this.start()
            }
            if(options.serve || options.start) {
                options.watch = true
            }
            return options
        } catch(error) {
            console.log(error.message)
            return undefined
        }
    }
}

export function options(argv: string[]): Options | undefined {
    return new OptionsReader(argv).get()
}