// import { buildSync } from 'esbuild'

// import * as path from 'path'
// import * as vm from 'vm'

// export type TaskExports = { [key: string]: Function }

// function mapParam(param: unknown): unknown {
//     if (typeof param !== 'string') return param
//     if (param === 'true') {
//         return true
//     } else if (param === 'false') {
//         return false
//     } else if (!isNaN(param as any)) {
//         return parseFloat(param)
//     } else {
//         return param
//     }
// }

// function build(scriptPath: string): string {
//     try {
//         const result = buildSync({
//             entryPoints: [scriptPath],
//             platform: 'node',
//             format: 'cjs',
//             target: 'esnext',
//             bundle: true,
//             write: false,
//             outdir: 'out',
//         })
//         const uint8 = result.outputFiles[0].contents
//         return Buffer.from(uint8).toString()
//     } catch (error) {
//         console.error(error.message)
//         return ''
//     }
// }

// function instance(scriptPath: string, code: string): TaskExports {
//     const context = vm.createContext({
//         require: (module: string) => {
//             try { return require(module) } catch { /** ignore */ }
//             return require(path.join(process.cwd(), module))
//         },
//         __dirname: process.cwd(),
//         __filename: path.resolve(scriptPath),
//         ...global,
//         Buffer,
//         process,
//         console,
//         exports: {}
//     })
//     vm.runInNewContext(code, context)
//     return context.exports
// }

// function execute(exports: TaskExports, name: string, params: any[]) {
//     const task = exports[name]
//     task.apply(null, params)
// }

// export function task(scriptPath: string, name: string, params: any[]) {
//     const code = build(scriptPath)
//     const exports = instance(scriptPath, code)
//     execute(exports, name, params.map(param => mapParam(param)))
// }

export function task() {

}
