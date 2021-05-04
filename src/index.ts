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

import { into }           from './async/index'
import { Cache }          from './cache/index'
import { Build }          from './build/index'
import { resolve, Asset } from './resolve/index'
import { watch }          from './watch/index'
import { serve }          from './serve/index'
import { Options }        from './options/index'

export type DisposeFunction = () => void

async function buildAndWatch(options: Options): Promise<DisposeFunction> {
    const cache   = new Cache<Asset>({ key: 'sourcePath', timestamp: 'timestamp'})
    const builder = new Build({
        bundle:    options.bundle,
        minify:    options.minify,
        sourcemap: options.sourcemap,
        target:    options.target,
        watch:     options.watch,
    })
    const assets  = resolve(options.sourcePaths, options.dist)
    const actions = cache.update(assets)
    await builder.update(actions)
    
    const server = serve(options.dist, 5000)
    const watcher = watch(options.sourcePaths, assets)
    into(async () => {
        for await(const _ of watcher) {
            const assets = resolve(options.sourcePaths, options.dist)
            const actions = cache.update(assets)
            await builder.update(actions)
        }
    })
    return () => {
        builder.dispose()
        watcher.dispose()
        server.dispose()
    }
}

async function build(options: Options): Promise<DisposeFunction> {
    const cache   = new Cache<Asset>({ key: 'sourcePath', timestamp: 'timestamp'})
    const builder = new Build({
        bundle:    options.bundle,
        minify:    options.minify,
        sourcemap: options.sourcemap,
        target:    options.target,
        watch:     options.watch,
    })
    const assets  = resolve(options.sourcePaths, options.dist)
    const actions = cache.update(assets)
    await builder.update(actions)
    return () => builder.dispose()
}

export async function start(options: Options): Promise<DisposeFunction> {
    if(options.watch) {
        return await buildAndWatch(options)
    } else {
        return await build(options)
    }
}
