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

import * as fs from 'fs'
import * as path from 'path'

// ------------------------------------------------------------------------
// Error
// ------------------------------------------------------------------------

export class OptionsError extends Error {
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
  target: string[]
  dist: string
  esm: boolean
  platform: 'browser' | 'node'
  minify: boolean
  sourcemap: boolean
  external: string[]
}

export interface WatchOptions {
  type: 'watch'
  sourcePaths: string[]
  target: string[]
  dist: string
  esm: boolean
  platform: 'browser' | 'node'
  minify: boolean
  sourcemap: boolean
  external: string[]
}

export interface RunOptions {
  type: 'start'
  sourcePath: string
  entryPath: string
  args: string[]
  dist: string
  esm: boolean
  target: string[]
  minify: boolean
  sourcemap: boolean
  external: string[]
}

export interface ServeOptions {
  type: 'serve'
  sourcePaths: string[]
  port: number
  dist: string
  esm: boolean
  target: string[]
  minify: boolean
  sourcemap: boolean
  external: string[]
  cors: boolean
  sabs: boolean
}
export interface MonitorOptions {
  type: 'monitor'
  sourcePaths: string[]
  arguments: string[]
}

export interface TaskOptions {
  type: 'task'
  sourcePath: string
  name: string
  arguments: string[]
}

export type Options = HelpOptions | VersionOptions | BuildOptions | WatchOptions | RunOptions | ServeOptions | MonitorOptions | TaskOptions

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
    dist: path.join(process.cwd(), 'dist'),
    esm: false,
    minify: false,
    platform: 'browser',
    sourcePaths: [],
    sourcemap: false,
    target: ['esnext'],
    external: [],
  }
}

function defaultWatchOptions(): WatchOptions {
  return {
    type: 'watch',
    dist: path.join(process.cwd(), 'dist'),
    esm: false,
    minify: false,
    platform: 'browser',
    sourcePaths: [],
    sourcemap: false,
    target: ['esnext'],
    external: [],
  }
}

function defaultServeOptions(): ServeOptions {
  return {
    type: 'serve',
    sourcePaths: [],
    dist: path.join(process.cwd(), 'dist'),
    esm: false,
    target: ['esnext'],
    port: 5000,
    sourcemap: false,
    minify: false,
    external: [],
    cors: false,
    sabs: false,
  }
}

function defaultRunOptions(): RunOptions {
  return {
    type: 'start',
    sourcePath: 'index.ts',
    entryPath: path.join(process.cwd(), 'dist', 'index.js'),
    args: [],
    dist: path.join(process.cwd(), 'dist'),
    esm: false,
    target: ['esnext'],
    sourcemap: false,
    minify: false,
    external: [],
  }
}

function defaultMonitorOptions(): MonitorOptions {
  return {
    type: 'monitor',
    sourcePaths: [],
    arguments: [],
  }
}

function defaultTaskOptions(): TaskOptions {
  return {
    type: 'task',
    sourcePath: path.join(process.cwd(), 'hammer.mjs'),
    name: '',
    arguments: [],
  }
}

// ------------------------------------------------------------------------
// Preparation
// ------------------------------------------------------------------------

function prepareArguments(args: string[]): string[] {
  let open = false
  const result = []
  const temp = []
  while (args.length > 0) {
    const next = args.shift()!
    if (!open && next.indexOf('"') === 0 && next.lastIndexOf('"') !== next.length - 1) {
      temp.push(next.slice(1))
      open = true
    } else if (open && next.indexOf('"') === next.length - 1) {
      temp.push(next.slice(0, next.length - 1))
      result.push(temp.join(' '))
      while (temp.length > 0) temp.shift()
      open = false
    } else if (open) {
      temp.push(next)
    } else {
      result.push(next)
    }
  }
  return result
}

// ------------------------------------------------------------------------
// Field Parsers
// ------------------------------------------------------------------------

function* parseSourcePaths(params: string[]): Generator<string> {
  if (params.length === 0) throw new OptionsError('paths', 'Expected one or more paths.')
  const next = params.shift()!
  for (const partialPath of next.split(' ')) {
    const sourcePath = path.resolve(process.cwd(), partialPath)
    if (!fs.existsSync(sourcePath)) throw new OptionsError('paths', `Cannot find source path '${sourcePath} does not exists.'`)
    yield sourcePath
  }
}

function parseSourcePathAndArguments(params: string[]): [sourcePath: string, args: string[]] {
  if (params.length === 0) throw new OptionsError('run', 'Expected entry path.')
  const next = params.shift()!
  const split = next.split(' ')
  const partialPath = split.shift()!
  const entryPath = path.join(process.cwd(), partialPath)
  const extname = path.extname(entryPath)
  const allowed = ['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx']
  if (!allowed.includes(extname)) throw new OptionsError('run', `Entry path not a TypeScript or JavaScript file. Got '${entryPath}'`)
  if (!fs.existsSync(entryPath)) throw new OptionsError('run', `Entry path '${entryPath}' does not exist.`)
  return [entryPath, split]
}

function parseDist(params: string[]): string {
  if (params.length === 0) throw new OptionsError('dist', 'Expected directory path.')
  return path.join(process.cwd(), params.shift()!)
}

function parsePlatform(params: string[]): 'browser' | 'node' {
  if (params.length === 0) throw new OptionsError('platform', 'Expected profile option.')
  const next = params.shift()!
  if (next === 'browser' || next === 'node') return next
  throw new OptionsError('platform', `Expected 'node' or 'browser'. Got '${next}'`)
}
function parseExternal(params: string[]): string[] {
  if (params.length === 0) throw new OptionsError('external', 'Expected external option.')
  let next = params.shift()!
  if (next.indexOf('"') === 0) next = next.slice(1, next.length - 1)
  if (next.lastIndexOf('"') === next.length - 1) next = next.slice(0, next.length - 1)
  const external = next.split(' ').map((x) => x.trim())
  return external
}
function parsePort(params: string[]): number {
  if (params.length === 0) throw new OptionsError('port', 'Expected port number')
  const next = params.shift()!
  const port = parseInt(next)
  if (Number.isNaN(port)) throw new OptionsError('port', `Expected port number. Received '${port}'`)
  if (port < 0 || port > 65535) throw new OptionsError('port', `Invalid port number. Received '${port}'`)
  return port
}

function* parseTarget(params: string[]): Generator<string> {
  if (params.length === 0) throw new OptionsError('target', 'Expected target option')
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
  if (options.sourcePaths.length === 0) throw new OptionsError('build', `Expected at least one source path.`)
  while (params.length > 0) {
    const next = params.shift()!
    switch (next) {
      case '--platform':
        options.platform = parsePlatform(params)
        break
      case '--target':
        options.target = [...parseTarget(params)]
        break
      case '--dist':
        options.dist = parseDist(params)
        break
      case '--esm':
        options.esm = true
        break
      case '--external':
        options.external = parseExternal(params)
        break
      case '--sourcemap':
        options.sourcemap = true
        break
      case '--minify':
        options.minify = true
        break
    }
  }
  return options
}

export function parseWatchOptions(params: string[]): WatchOptions {
  const options = defaultWatchOptions()
  options.sourcePaths = [...parseSourcePaths(params)]
  if (options.sourcePaths.length === 0) throw new OptionsError('build', `Expected at least one source path.`)
  while (params.length > 0) {
    const next = params.shift()!
    switch (next) {
      case '--platform':
        options.platform = parsePlatform(params)
        break
      case '--target':
        options.target = [...parseTarget(params)]
        break
      case '--dist':
        options.dist = parseDist(params)
        break
      case '--esm':
        options.esm = true
        break
      case '--external':
        options.external = parseExternal(params)
        break
      case '--sourcemap':
        options.sourcemap = true
        break
      case '--minify':
        options.minify = true
        break
    }
  }
  return options
}

export function resolveEntryPath(distPath: string, sourcePath: string) {
  const extension = path.extname(sourcePath)
  switch (extension) {
    case '.mts':
      return path.join(distPath, [path.basename(sourcePath, extension), '.mjs'].join(''))
    case '.mjs':
      return path.join(distPath, [path.basename(sourcePath, extension), '.mjs'].join(''))
    case '.cts':
      return path.join(distPath, [path.basename(sourcePath, extension), '.js'].join(''))
    case '.tsx':
      return path.join(distPath, [path.basename(sourcePath, extension), '.js'].join(''))
    case '.ts':
      return path.join(distPath, [path.basename(sourcePath, extension), '.js'].join(''))
    case '.js':
      return path.join(distPath, [path.basename(sourcePath, extension), '.js'].join(''))
    default:
      throw Error(`Options: Unable to resolve entry path. Unknown extension '${extension}'`)
  }
}

export function parseRunOptions(params: string[]): RunOptions {
  const options = defaultRunOptions()
  const [sourcePath, args] = parseSourcePathAndArguments(params)
  options.sourcePath = sourcePath
  options.args = args
  while (params.length > 0) {
    const next = params.shift()
    switch (next) {
      case '--dist':
        options.dist = parseDist(params)
        break
      case '--esm':
        options.esm = true
        break
      case '--external':
        options.external = parseExternal(params)
        break
      case '--target':
        options.target = [...parseTarget(params)]
        break
      case '--sourcemap':
        options.sourcemap = true
        break
      case '--minify':
        options.minify = true
        break
    }
  }
  options.entryPath = resolveEntryPath(options.dist, options.sourcePath)
  return options
}

export function parseServeOptions(params: string[]): ServeOptions {
  const options = defaultServeOptions()
  options.sourcePaths = [...parseSourcePaths(params)]
  while (params.length > 0) {
    const next = params.shift()
    switch (next) {
      case '--dist':
        options.dist = parseDist(params)
        break
      case '--esm':
        options.esm = true
        break
      case '--external':
        options.external = parseExternal(params)
        break
      case '--minify':
        options.minify = true
        break
      case '--sourcemap':
        options.sourcemap = true
        break
      case '--target':
        options.target = [...parseTarget(params)]
        break
      case '--port':
        options.port = parsePort(params)
        break
      case '--cors':
        options.cors = true
      case '--sabs':
        options.sabs = true
    }
  }
  return options
}

export function parseMonitorOptions(params: string[]): MonitorOptions {
  const options = defaultMonitorOptions()
  options.sourcePaths = [...parseSourcePaths(params)]
  options.arguments = params
  return options
}

function resolveHammerTaskFile(): string {
  if (fs.existsSync(path.join(process.cwd(), 'hammer.mjs'))) {
    return path.join(process.cwd(), 'hammer.mjs')
  } else {
    throw Error(`No task file found. Expected 'hammer.mjs' in current directory.`)
  }
}

export function parseTaskOptions(params: string[]): TaskOptions {
  const options = defaultTaskOptions()
  options.sourcePath = resolveHammerTaskFile()
  if (params.length === 0) return options
  options.name = params.shift()!
  options.arguments = params
  return options
}

export function parse(args: string[]) {
  try {
    const params = prepareArguments(args).slice(2)
    if (params.length === 0) return defaultHelpOptions()
    const command = params.shift()
    switch (command) {
      case 'build':
        return parseBuildOptions(params)
      case 'watch':
        return parseWatchOptions(params)
      case 'serve':
        return parseServeOptions(params)
      case 'run':
        return parseRunOptions(params)
      case 'monitor':
        return parseMonitorOptions(params)
      case 'task':
        return parseTaskOptions(params)
      case 'help':
        return defaultHelpOptions()
      case 'version':
        return defaultVersionOptions()
      default:
        return defaultHelpOptions(`Unknown command '${command}'`)
    }
  } catch (error) {
    if (error instanceof Error) return defaultHelpOptions(error.message)
    else {
      return defaultHelpOptions(error as string)
    }
  }
}
