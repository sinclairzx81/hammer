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

export { folder, file, shell, watch, delay } from './task/global/index'

// --------------------------------------------------------------------------
// Hammer
// --------------------------------------------------------------------------

import { Cache } from './cache/index'
import { Build } from './build/index'
import { Asset, resolve } from './resolve/index'
import { watch } from './watch/index'
import { serve } from './serve/index'
import { run } from './run/index'
import { monitor } from './monitor/index'
import { task } from './task/index'
import { Dispose } from './dispose'
import * as path from 'path'
import * as fs from 'fs'
import * as options from './options/index'

class Hammer implements Dispose {
  private readonly disposables: Dispose[] = []
  constructor(private readonly options: options.Options) {}
  // -------------------------------------------------------------
  // Build
  // -------------------------------------------------------------
  private async build(options: options.BuildOptions): Promise<void> {
    const cache = new Cache<Asset>({
      key: 'sourcePath',
      timestamp: 'timestamp',
    })
    const builder = new Build({
      platform: options.platform,
      minify: options.minify,
      sourcemap: options.sourcemap,
      target: options.target,
      external: options.external,
      esm: options.esm,
      node: options.platform === 'node',
      bundle: true,
      watch: false,
    })
    const assets = [...resolve(options.sourcePaths, options.dist)]
    const actions = cache.update(assets)
    await builder.update(actions)
    this.disposables.push(builder)
  }
  // -------------------------------------------------------------
  // Serve
  // -------------------------------------------------------------
  private async serve(options: options.ServeOptions): Promise<void> {
    const cache = new Cache<Asset>({
      key: 'sourcePath',
      timestamp: 'timestamp',
    })
    const builder = new Build({
      platform: 'browser',
      minify: options.minify,
      sourcemap: options.sourcemap,
      target: options.target,
      external: options.external,
      esm: options.esm,
      node: false,
      bundle: true,
      watch: true,
    })
    const assets = [...resolve(options.sourcePaths, options.dist)]
    const actions = cache.update(assets)
    await builder.update(actions)
    const watcher = watch([...options.sourcePaths, ...assets.map((asset) => asset.sourcePath)])
    const server = serve({
      targetDirectory: options.dist,
      port: options.port,
      cors: options.cors,
      sabs: options.sabs,
    })
    this.disposables.push(watcher)
    this.disposables.push(builder)
    this.disposables.push(server)
    for await (const _ of watcher) {
      const assets = [...resolve(options.sourcePaths, options.dist)]
      watcher.add(assets.map((asset) => asset.sourcePath))
      const actions = cache.update(assets)
      await builder.update(actions)
    }
  }
  // -------------------------------------------------------------
  // Run
  // -------------------------------------------------------------
  private async run(options: options.RunOptions): Promise<void> {
    const cache = new Cache<Asset>({
      key: 'sourcePath',
      timestamp: 'timestamp',
    })
    const builder = new Build({
      platform: 'node',
      minify: options.minify,
      sourcemap: options.sourcemap,
      target: options.target,
      external: options.external,
      esm: options.esm,
      node: true,
      bundle: true,
      watch: true,
    })
    const assets = [...resolve([options.sourcePath], options.dist)]
    const actions = cache.update(assets)
    await builder.update(actions)
    const watcher = watch([options.sourcePath, ...assets.map((asset) => asset.sourcePath)])
    const process = run(options.entryPath, options.args)
    this.disposables.push(watcher)
    this.disposables.push(builder)
    this.disposables.push(process)
    for await (const _ of watcher) {
      const assets = [...resolve([options.sourcePath], options.dist)]
      watcher.add(assets.map((asset) => asset.sourcePath))
      const actions = cache.update(assets)
      await builder.update(actions)
    }
  }
  // -------------------------------------------------------------
  // Watch
  // -------------------------------------------------------------
  private async watch(options: options.WatchOptions): Promise<void> {
    const cache = new Cache<Asset>({
      key: 'sourcePath',
      timestamp: 'timestamp',
    })
    const builder = new Build({
      platform: options.platform,
      minify: options.minify,
      sourcemap: options.sourcemap,
      target: options.target,
      external: options.external,
      esm: options.esm,
      node: options.platform === 'node',
      bundle: true,
      watch: true,
    })
    const assets = [...resolve(options.sourcePaths, options.dist)]
    const actions = cache.update(assets)
    await builder.update(actions)
    const watcher = watch([...options.sourcePaths, ...assets.map((asset) => asset.sourcePath)])
    this.disposables.push(watcher)
    this.disposables.push(builder)
    for await (const _ of watcher) {
      const assets = [...resolve(options.sourcePaths, options.dist)]
      watcher.add(assets.map((asset) => asset.sourcePath))
      const actions = cache.update(assets)
      await builder.update(actions)
    }
  }
  // -------------------------------------------------------------
  // Monitor
  // -------------------------------------------------------------
  private async monitor(options: options.MonitorOptions): Promise<void> {
    await monitor(options.sourcePaths, options.arguments)
  }
  // -------------------------------------------------------------
  // Task
  // -------------------------------------------------------------
  private async task(options: options.TaskOptions): Promise<void> {
    await task(options.sourcePath, options.name, options.arguments)
  }
  private getVersion(): string {
    try {
      const packagePath = path.join(__dirname, 'package.json')
      if (!fs.existsSync(packagePath)) throw Error(`Cannot find package.json at ${packagePath}`)
      const contents = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(contents)
      return packageJson.version
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message)
      } else {
        console.log(error)
      }
      return 'Unknown'
    }
  }
  private async version(options: options.VersionOptions): Promise<void> {
    console.log(`Hammer: ${this.getVersion()}`)
  }
  private async help(options: options.HelpOptions): Promise<void> {
    const green = '\x1b[90m'
    const blue = '\x1b[36m'
    const esc = `\x1b[0m`
    console.log(
      [
        `${blue}Version${esc}: ${this.getVersion()}`,
        ``,
        `${blue}Commands${esc}:`,
        ``,
        `   $ hammer ${green}run${esc}     <script path>     ${blue}<...options>${esc}`,
        `   $ hammer ${green}build${esc}   <file or folder>  ${blue}<...options>${esc}`,
        `   $ hammer ${green}watch${esc}   <file or folder>  ${blue}<...options>${esc}`,
        `   $ hammer ${green}serve${esc}   <file or folder>  ${blue}<...options>${esc}`,
        `   $ hammer ${green}monitor${esc} <file or folder>  ${blue}<shell command>${esc}`,
        `   $ hammer ${green}task${esc}    <name>            ${blue}<...arguments>${esc}`,
        `   $ hammer ${green}version${esc}`,
        `   $ hammer ${green}help${esc}`,
        ``,
        `${blue}Options${esc}:`,
        ``,
        `   ${blue}--target${esc}      targets     The es build targets.`,
        `   ${blue}--platform${esc}    platform    The target platform.`,
        `   ${blue}--dist${esc}        directory   The target directory.`,
        `   ${blue}--port${esc}        port        The port to listen on.`,
        `   ${blue}--external${esc}    packages    Omits external packages.`,
        `   ${blue}--esm${esc}                     Use esm module target.`,
        `   ${blue}--minify${esc}                  Minifies the output.`,
        `   ${blue}--sourcemap${esc}               Generate sourcemaps.`,
        `   ${blue}--sabs${esc}                    (serve) Enable shared array buffer.`,
        `   ${blue}--cors${esc}                    (serve) Enable cors.`,

        ``,
      ].join(`\n`),
    )
    if (options.message) {
      console.log([options.message, ''].join('\n'))
    }
  }
  public async execute() {
    const start = Date.now()
    const blue = '\x1b[36m'
    const yellow = '\x1b[33m'
    const esc = `\x1b[0m`
    switch (this.options.type) {
      case 'build':
        console.log(`${blue}[build]${esc}: ${this.options.sourcePaths.join(' ')}`)
        break
      case 'watch':
        console.log(`${blue}[watch]${esc}: ${this.options.sourcePaths.join(' ')}`)
        break
      case 'serve':
        console.log(`${blue}[serve]${esc}: ${this.options.dist} on ${blue}${this.options.port}${esc}`)
        break
      case 'start':
        console.log(`${blue}[start]${esc}: ${this.options.entryPath} ${this.options.args.join(' ')}`)
        break
      case 'monitor':
        console.log(`${blue}[monitor]${esc}: ${this.options.sourcePaths.join(' ')}`)
        break
      case 'task':
        console.log(`${blue}[task]${esc}: ${this.options.name} ${this.options.arguments.join(' ')}`)
        break
    }
    switch (this.options.type) {
      case 'build':
        await this.build(this.options)
        break
      case 'watch':
        await this.watch(this.options)
        break
      case 'serve':
        await this.serve(this.options)
        break
      case 'start':
        await this.run(this.options)
        break
      case 'monitor':
        await this.monitor(this.options)
        break
      case 'task':
        await this.task(this.options)
        break
      case 'help':
        await this.help(this.options)
        break
      case 'version':
        await this.version(this.options)
        break
    }
    console.log(`${blue}Done${esc}: ${Date.now() - start}ms`)
  }
  public dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose()
    }
  }
}
export function hammer(options: options.Options) {
  return new Hammer(options)
}
