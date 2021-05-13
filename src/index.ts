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

// --------------------------------------------------------------------------
// System Utilities
// --------------------------------------------------------------------------

export { shell, folder, file, watch, delay } from './system/index'

// --------------------------------------------------------------------------
// Hammer
// --------------------------------------------------------------------------

import { into } from './async/index'
import { Cache } from './cache/index'
import { Build } from './build/index'
import { Asset, resolve } from './resolve/index'
import { watch } from './watch/index'
import { serve } from './serve/index'
import { start } from './start/index'
import { task } from './task/index'
import { Dispose } from './dispose'

import * as path from 'path'
import * as fs from 'fs'

import {
    Options,
    HelpOptions,
    BuildOptions,
    WatchOptions,
    ServeOptions,
    StartOptions,
    VersionOptions,
    TaskOptions,
} from './options/index'

class Hammer implements Dispose {
    private readonly disposables: Dispose[] = []

    constructor(private readonly options: Options) { }

    /** Starts a build process. */
    private async build(options: BuildOptions): Promise<void> {
        const cache = new Cache<Asset>({
            key: 'sourcePath',
            timestamp: 'timestamp'
        })
        const builder = new Build({
            platform: options.platform,
            minify: options.minify,
            sourcemap: options.sourcemap,
            target: options.target,
            bundle: options.bundle,
            watch: false
        })
        const assets = resolve(options.sourcePaths, options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        this.disposables.push(builder)
    }

    /** Starts a watch process. */
    private async watch(options: WatchOptions): Promise<void> {
        const cache = new Cache<Asset>({
            key: 'sourcePath',
            timestamp: 'timestamp'
        })
        const builder = new Build({
            platform: 'browser',
            minify: options.minify,
            sourcemap: options.sourcemap,
            target: options.target,
            bundle: options.bundle,
            watch: true
        })
        const assets = resolve(options.sourcePaths, options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        const watcher = watch(options.sourcePaths, assets)
        this.disposables.push(watcher)
        this.disposables.push(builder)
        into(async () => {
            for await (const _ of watcher) {
                const assets = resolve(options.sourcePaths, options.dist)
                watcher.update(assets)
                const actions = cache.update(assets)
                await builder.update(actions)
            }
        })
    }
    /** Starts a http serve process. */
    private async serve(options: ServeOptions): Promise<void> {
        const cache = new Cache<Asset>({
            key: 'sourcePath',
            timestamp: 'timestamp'
        })
        const builder = new Build({
            platform: 'browser',
            minify: options.minify,
            sourcemap: options.sourcemap,
            target: options.target,
            bundle: true,
            watch: true
        })
        const assets = resolve(options.sourcePaths, options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        const watcher = watch(options.sourcePaths, assets)
        const server = serve(options.dist, options.port)

        this.disposables.push(watcher)
        this.disposables.push(builder)
        this.disposables.push(server)

        into(async () => {
            for await (const _ of watcher) {
                const assets = resolve(options.sourcePaths, options.dist)
                watcher.update(assets)
                const actions = cache.update(assets)
                await builder.update(actions)
            }
        })
    }

    /** Starts a node process. */
    private async start(options: StartOptions): Promise<void> {
        const cache = new Cache<Asset>({
            key: 'sourcePath',
            timestamp: 'timestamp'
        })
        const builder = new Build({
            platform: 'node',
            minify: options.minify,
            sourcemap: options.sourcemap,
            target: options.target,
            bundle: true,
            watch: true
        })
        const assets = resolve([options.sourcePath], options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        const watcher = watch([options.sourcePath], assets)
        const process = start(options.nodeString)

        this.disposables.push(watcher)
        this.disposables.push(builder)
        this.disposables.push(process)

        into(async () => {
            for await (const _ of watcher) {
                const assets = resolve([options.sourcePath], options.dist)
                watcher.update(assets)
                const actions = cache.update(assets)
                await builder.update(actions)
            }
        })
    }

    private async task(options: TaskOptions): Promise<void> {
        await task(options.sourcePath, options.name, options.arguments)
    }

    private getVersion(): string {
        try {
            const packagePath = path.join(__dirname, 'package.json')
            if (!fs.existsSync(packagePath)) throw Error(`Cannot find package.json at ${packagePath}`)
            const contents = fs.readFileSync(packagePath, 'utf-8')
            const package_json = JSON.parse(contents)
            return package_json.version
        } catch (error) {
            console.log(error.message)
            return 'Unknown'
        }
    }

    private async version(options: VersionOptions): Promise<void> {
        console.log(`Hammer: ${this.getVersion()}`)
    }

    private async help(options: HelpOptions): Promise<void> {
        const green = '\x1b[32m'
        const yellow = '\x1b[33m'
        const esc = `\x1b[0m`
        console.log([
            `Hammer: ${this.getVersion()}`,
            ``,
            `Commands:`,
            ``,
            `   $ hammer ${green}start${esc} script.ts | "script.ts arg1 arg2" ${yellow}{...options}${esc}`,
            `   $ hammer ${green}serve${esc} index.html images ${yellow}{...options}${esc}`,
            `   $ hammer ${green}watch${esc} worker.ts ${yellow}{...options}${esc}`,
            `   $ hammer ${green}build${esc} index.html ${yellow}{...options}${esc}`,
            `   $ hammer ${green}task${esc} start arg1 arg2`,
            ``,
            `Options:`,
            ``,
            `   ${yellow}--target${esc}    [...targets] Sets the ES targets. (default: esnext)`,
            `   ${yellow}--platform${esc}  target       Sets the platform. Options are browser or node. (default: browser)`,
            `   ${yellow}--dist${esc}      path         Sets the output directory. (default: dist)`,
            `   ${yellow}--bundle${esc}                 Bundles the output. (default: false)`,
            `   ${yellow}--minify${esc}                 Minifies the bundle. (default: false)`,
            `   ${yellow}--sourcemap${esc}              Generate sourcemaps. (default: false)`,
            `   ${yellow}--port${esc}      port         The port to listen on.`,
            ``,
        ].join(`\n`))
        if (options.message) {
            console.log(options.message)
        }
    }

    public run() {
        const yellow = '\x1b[33m'
        const esc = `\x1b[0m`
        switch (this.options.type) {
            case 'build': console.log(`${yellow}Build${esc}: ${this.options.dist}`); break
            case 'watch': console.log(`${yellow}Watch${esc}: ${this.options.dist}`); break
            case 'serve': console.log(`${yellow}Serve${esc}: http://localhost:${this.options.port}`); break
            case 'start': console.log(`${yellow}Start${esc}: ${this.options.nodeString}`); break
            case 'task': console.log(`${yellow}Task${esc}: ${this.options.name} ${this.options.arguments.join(' ')}`); break
        }
        switch (this.options.type) {
            case 'build': return this.build(this.options)
            case 'watch': return this.watch(this.options)
            case 'serve': return this.serve(this.options)
            case 'start': return this.start(this.options)
            case 'task': return this.task(this.options)
            case 'help': return this.help(this.options)
            case 'version': return this.version(this.options)
        }
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}

export function hammer(options: Options) {
    const hammer = new Hammer(options)
    return hammer.run()
}
