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


import { into } from './async/index'
import { Cache } from './cache/index'
import { Build } from './build/index'
import { resolve, Asset } from './resolve/index'
import { watch } from './watch/index'
import { serve } from './serve/index'
import { start } from './start/index'
import { task } from './task/index'
import { Dispose } from './dispose'

import {
    Options,
    HelpOptions,
    BuildOptions,
    ServeOptions,
    StartOptions,
    VersionOptions,
    TaskOptions
} from './options/index'

export class Hammer implements Dispose {

    private readonly disposables: Dispose[] = [

    ]
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
            watch: false
        })
        const assets = resolve(options.sourcePaths, options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        this.disposables.push(builder)
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
            watch: true
        })
        const assets = resolve([options.sourcePath], options.dist)
        const actions = cache.update(assets)
        await builder.update(actions)
        const watcher = watch([options.sourcePath], assets)
        const process = start(options.startPath)

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

    private async version(options: VersionOptions): Promise<void> {

    }

    private async help(options: HelpOptions): Promise<void> {
        if(options.message) return console.log(options.message)
        const green = `\x1b[32m`
        const yellow = '\x1b[33m'
        const esc = `\x1b[0m`
        console.log([
            `Examples: `,
            ``,
            `  $ ${green}hammer${esc} [...paths] ${yellow}<...options>${esc}`,
            `  $ ${green}hammer${esc} index.html about.html`,
            `  $ ${green}hammer${esc} index.html images ${yellow}--dist${esc} target/website`,
            `  $ ${green}hammer${esc} index.html ${yellow}--serve${esc} 5000`,
            `  $ ${green}hammer${esc} index.ts ${yellow}--start${esc} index.js`,
            `  $ ${green}hammer${esc} index.ts ${yellow}--minify${esc}`,
            ``,
            `Options:`,
            ``,
            `  ${yellow}--target${esc}    <target>  Sets the ES target. (default: esnext)`,
            `  ${yellow}--platform${esc}  <target>  Sets the platform. Options are browser or node. (default: browser)`,
            `  ${yellow}--dist${esc}                Sets the output directory. (default: dist)`,
            `  ${yellow}--serve${esc}     <port>    Watch and serves on the given port.`,
            `  ${yellow}--start${esc}     <script>  Watch and starts a script.`,
            `  ${yellow}--watch${esc}               Watch and compile on save only.`,
            `  ${yellow}--minify${esc}              Minifies the bundle.`,
            `  ${yellow}--sourcemap${esc}           Generate sourcemaps.`,
        ].join(`\n`))
    }

    public run() {
        switch (this.options.type) {
            case 'build': return this.build(this.options)
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



// async function buildAndWatch(options: Options): Promise<DisposeFunction> {
//     const disposables = [] as Dispose[]
//     const cache   = new Cache<Asset>({ key: 'sourcePath', timestamp: 'timestamp'})
//     const builder = new Build({
//         platform:  options.platform,
//         minify:    options.minify,
//         sourcemap: options.sourcemap,
//         target:    options.target,
//         watch:     options.watch
//     })
//     const assets  = resolve(options.sourcePaths, options.dist)
//     const actions = cache.update(assets)
//     await builder.update(actions)
//     const watcher = watch(options.sourcePaths, assets)
//     disposables.push(watcher)
//     disposables.push(builder)
//     if(options.serve) disposables.push(serve(options.dist, 5000))
//     if(options.start) disposables.push(start(options.start))
//     into(async () => {
//         for await(const _ of watcher) {
//             const assets = resolve(options.sourcePaths, options.dist)
//             watcher.update(assets)
//             const actions = cache.update(assets)
//             await builder.update(actions)
//         }
//     })
//     return () => {
//         for(const disposable of disposables) {
//             disposable.dispose()
//         }
//     }
// }

// async function build(options: Options): Promise<DisposeFunction> {
//     const cache   = new Cache<Asset>({ key: 'sourcePath', timestamp: 'timestamp'})
//     const builder = new Build({
//         platform:  options.platform,
//         minify:    options.minify,
//         sourcemap: options.sourcemap,
//         target:    options.target,
//         watch:     options.watch,
//     })
//     const assets  = resolve(options.sourcePaths, options.dist)
//     const actions = cache.update(assets)
//     await builder.update(actions)
//     return () => builder.dispose()
// }

// export async function hammer(options: Options): Promise<DisposeFunction> {
//     if(options.watch) {
//         return await buildAndWatch(options)
//     } else {
//         return await build(options)
//     }
// }
