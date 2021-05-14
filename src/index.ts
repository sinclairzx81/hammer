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

import { Cache } from './cache/index'
import { Build } from './build/index'
import { Asset, resolve } from './resolve/index'
import { watch } from './watch/index'
import { serve } from './serve/index'
import { run } from './run/index'
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
    RunOptions,
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
            bundle: true,
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
            bundle: true,
            watch: true
        })
        const assets = resolve(options.sourcePaths, options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        const watcher = watch(options.sourcePaths, assets)
        this.disposables.push(watcher)
        this.disposables.push(builder)

        for await (const _ of watcher) {
            const assets = resolve(options.sourcePaths, options.dist)
            watcher.update(assets)
            const actions = cache.update(assets)
            await builder.update(actions)
        }
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
        for await (const _ of watcher) {
            const assets = resolve(options.sourcePaths, options.dist)
            watcher.update(assets)
            const actions = cache.update(assets)
            await builder.update(actions)
        }
    }

    /** Starts a node process. */
    private async run(options: RunOptions): Promise<void> {
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
        const process = run(options.entryPath, options.args)

        this.disposables.push(watcher)
        this.disposables.push(builder)
        this.disposables.push(process)

        for await (const _ of watcher) {
            const assets = resolve([options.sourcePath], options.dist)
            watcher.update(assets)
            const actions = cache.update(assets)
            await builder.update(actions)
        }
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
        const green = '\x1b[90m'
        const blue = '\x1b[36m'
        const esc = `\x1b[0m`
        console.log([
            `${blue}Version${esc}: ${this.getVersion()}`,
            ``,
            `${blue}Commands${esc}:`,
            ``,
            `   $ hammer ${green}build${esc}  <file or folder> ${blue}<...options>${esc}`,
            `   $ hammer ${green}watch${esc}  <file or folder> ${blue}<...options>${esc}`,
            `   $ hammer ${green}serve${esc}  <file or folder> ${blue}<...options>${esc}`,
            `   $ hammer ${green}run${esc}    <script>         ${blue}<...options>${esc}`,
            `   $ hammer ${green}task${esc}   <task>           ${blue}<...arguments>${esc}`,
            `   $ hammer ${green}version${esc}`,
            `   $ hammer ${green}help${esc}`,
            ``,
            `${blue}Options${esc}:`,
            ``,
            `   ${blue}--target${esc}      targets     The es build targets.`,
            `   ${blue}--platform${esc}    platform    The target plaform.`,
            `   ${blue}--dist${esc}        directory   The target directory.`,
            `   ${blue}--port${esc}        port        The port to listen on.`,
            `   ${blue}--minify${esc}                  Minifies the output.`,
            `   ${blue}--sourcemap${esc}               Generate sourcemaps.`,
            ``,
        ].join(`\n`))
        if (options.message) {
            console.log([options.message, ''].join('\n'))
        }
    }

    public async execute() {
        const start = Date.now()
        const blue = '\x1b[36m'
        const esc = `\x1b[0m`
        switch (this.options.type) {
            case 'build': console.log(`${blue}Build${esc}: ${this.options.sourcePaths.join(' ')}`); break
            case 'watch': console.log(`${blue}Watch${esc}: ${this.options.sourcePaths.join(' ')}`); break
            case 'serve': console.log(`${blue}Serve${esc}: http://localhost:${this.options.port}`); break
            case 'start': console.log(`${blue}Start${esc}: ${this.options.entryPath} ${this.options.args.join(' ')}`); break
            case 'task': console.log(`${blue}Task${esc}: ${this.options.name} ${this.options.arguments.join(' ')}`); break
        }
        switch (this.options.type) {
            case 'build': await this.build(this.options); break;
            case 'watch': await this.watch(this.options); break;
            case 'serve': await this.serve(this.options); break;
            case 'start': await this.run(this.options); break;
            case 'task': await this.task(this.options); break;
            case 'help': await this.help(this.options); break;
            case 'version': await this.version(this.options); break;
        }
        console.log(`${blue}Done${esc}: ${Date.now() - start}ms`)
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}

export function hammer(options: Options) {
    return new Hammer(options)
}
