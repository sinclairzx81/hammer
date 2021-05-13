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

import * as fs from 'fs'
import * as path from 'path'

// ------------------------------------------------------------------------
// Error
// ------------------------------------------------------------------------

export class OptionError extends Error {
    constructor(public readonly option: string, public readonly reason: string) {
        super(`${option}: ${reason}`)
    }
}

// ------------------------------------------------------------------------
// Options
// ------------------------------------------------------------------------

export interface HelpOptions {
    type: 'help'
    message?: string
}

export interface VersionOptions {
    type: 'version'
    version: string
}

export interface BuildOptions {
    type: 'build'
    sourcePaths: string[]
    dist: string
    platform: 'browser' | 'node'
    bundle: boolean
    target: string[]
    minify: boolean
    sourcemap: boolean
}

export interface StartOptions {
    type: 'start'
    sourcePaths: string[]
    startPath: string
    dist: string
    target: string[]
    minify: boolean
    sourcemap: boolean
}

export interface ServeOptions {
    type: 'serve'
    sourcePaths: string[]
    port: number
    dist: string
    target: string[]
    minify: boolean
    sourcemap: boolean
}

export interface TaskOptions {
    type: 'task'
    sourcePath: string
    name: string
    arguments: string[]
}

export type Options =
    | HelpOptions
    | VersionOptions
    | BuildOptions
    | StartOptions
    | ServeOptions
    | TaskOptions

// ------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------


function defaultHelpOptions(message?: string): HelpOptions {
    return { type: 'help', message }
}

function defaultVersionOptions(): VersionOptions {
    return { type: 'version', version: 'resolve from package.json' }
}

function defaultBuildOptions(): BuildOptions {
    return {
        type: 'build',
        bundle: true,
        dist: path.join(process.cwd(), 'dist'),
        minify: false,
        platform: 'browser',
        sourcePaths: [],
        sourcemap: false,
        target: ['esnext'],
    }
}

function defaultServeOptions(): ServeOptions {
    return {
        type: 'serve',
        sourcePaths: [],
        dist: path.join(process.cwd(), 'dist'),
        target: ['esnext'],
        port: 5000,
        sourcemap: false,
        minify: false,
    }
}

function defaultStartOptions(): StartOptions {
    return {
        type: 'start',
        sourcePaths: ['index.ts'],
        startPath: path.join(process.cwd(), 'dist', 'index.js'),
        dist: path.join(process.cwd(), 'dist'),
        target: ['esnext'],
        sourcemap: false,
        minify: false,
    }
}

function defaultTaskOptions(): TaskOptions {
    return {
        type: 'task',
        sourcePath: path.join(process.cwd(), 'hammer.ts'),
        name: '',
        arguments: []
    }
}

// ------------------------------------------------------------------------
// Field Parsers
// ------------------------------------------------------------------------

function* parseSourcePaths(params: string[]): Generator<string> {
    while (params.length > 0) {
        const next = params.shift()!
        const sourcePath = path.resolve(process.cwd(), next)
        if (!fs.existsSync(sourcePath)) return params.unshift(next)
        yield sourcePath
    }
}
function parseDist(params: string[]): string {
    if (params.length === 0) throw new OptionError('--dist', "Expected directory path.")
    return path.join(process.cwd(), params.shift()!)
}

function parsePlatform(params: string[]): 'browser' | 'node' {
    if (params.length === 0) throw new OptionError('--profile', "Expected profile option.")
    const next = params.shift()!
    if (next === 'browser' || next === 'node') return next
    throw new OptionError('--profile', `Expected 'node' or 'browser'. Got '${next}'`)
}

function parsePort(params: string[]): number {
    if (params.length === 0) throw new OptionError('--port', "Expected port number")
    const next = params.shift()!
    const port = parseInt(next)
    if(Number.isNaN(port)) throw new OptionError('--port', `Expected port number. Received '${port}'`)
    if(port < 0 || port > 65535) throw new OptionError('--port', `Invalid port number. Received '${port}'`)
    return port
}

function* parseTarget(params: string[]): Generator<string> {
    if (params.length === 0) throw new OptionError('--target', "Expected target option")
    while (params.length > 0) {
        const next = params.shift()!
        if (next.includes('--')) {
            params.unshift(next)
            return
        }
        yield next
    }
}

// ------------------------------------------------------------------------
// Parsers
// ------------------------------------------------------------------------

export function parseBuildOptions(params: string[]): BuildOptions {
    const options = defaultBuildOptions()
    options.sourcePaths = [...parseSourcePaths(params)]
    if (options.sourcePaths.length === 0) throw new OptionError('build', `Expected at least one source path.`)
    while (params.length > 0) {
        const next = params.shift()!
        switch (next) {
            case '--platform': options.platform = parsePlatform(params); break;
            case '--target': options.target = [...parseTarget(params)]; break;
            case '--dist': options.dist = parseDist(params); break;
            case '--bundle': options.bundle = true; break;
            case '--sourcemap': options.sourcemap = true; break;
            case '--minify': options.minify = true; break;

            default: throw new OptionError('build', `Unexpected option '${next}'`)
        }
    }
    return options
}

export function parseStartOptions(params: string[]): StartOptions {
    const options = defaultStartOptions()
    options.sourcePaths = [...parseSourcePaths(params)]
    while (params.length > 0) {
        const next = params.shift()
        switch (next) {
            case '--dist': options.dist = parseDist(params); break;
            case '--target': options.target = [...parseTarget(params)]; break;
            case '--sourcemap': options.sourcemap = true; break;
            case '--minify': options.minify = true; break;
            default: throw new OptionError('build', `Unexpected option '${next}'`)
        }
    }
    return options
}

export function parseServeOptions(params: string[]): ServeOptions {
    const options = defaultServeOptions()
    options.sourcePaths = [...parseSourcePaths(params)]
    while (params.length > 0) {
        const next = params.shift()
        switch (next) {
            case '--dist': options.dist = parseDist(params); break;
            case '--minify': options.minify = true; break;
            case '--sourcemap': options.sourcemap = true; break;
            case '--target': options.target = [...parseTarget(params)]; break;
            default: throw new OptionError('build', `Unexpected option '${next}'`)
        }
    }
    return options
}

export function parseTaskOptions(params: string[]): TaskOptions {
    const options = defaultTaskOptions()
    if (params.length === 0) throw new OptionError('task', 'Expected task name')
    options.name = params.shift()!
    options.arguments = params
    return options
}

export function parse(args: string[]) {
    try {
        const params = args.slice(2)
        const next = params.shift()
        switch (next) {
            case 'build': return parseBuildOptions(params)
            case 'start': return parseStartOptions(params)
            case 'serve': return parseServeOptions(params)
            case 'task': return parseTaskOptions(params)
            case 'help': return defaultHelpOptions()
            case 'version': return defaultVersionOptions()
            default: return defaultHelpOptions()
        }
    } catch (error) {
        return defaultHelpOptions(error.message)
    }
}

