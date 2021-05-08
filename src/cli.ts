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

import { options } from './options/index'
import { start } from './index'

// -------------------------------------------------------------------------
// Help
// -------------------------------------------------------------------------

function help() {
  const green = `\x1b[32m`
  const yellow = '\x1b[33m'
  const esc = `\x1b[0m`
  console.log([
    `Examples: `,
    ``,
    `  $ ${green}hammer${esc} ${green}[..paths]${esc} ${yellow}<...options>${esc}`,
    `  $ ${green}hammer${esc} index.html about.html`,
    `  $ ${green}hammer${esc} index.html images --dist target/website`,
    `  $ ${green}hammer${esc} index.html ${yellow}--watch${esc}`,
    `  $ ${green}hammer${esc} index.html ${yellow}--serve${esc} 5000`,
    `  $ ${green}hammer${esc} index.ts   ${yellow}--start${esc} index.js ${yellow}--platform${esc} node`,
    ``,
    `Options:`,
    ``,
    `  ${yellow}--platform${esc}  <target>  Sets the target platform (default: browser)`,
    `  ${yellow}--target${esc}    <target>  Sets the ES target (default: esnext)`,
    `  ${yellow}--dist${esc}                Sets the output directory (default: dist)`,
    `  ${yellow}--watch${esc}               Watch and compile on file changes`,
    `  ${yellow}--serve${esc}     <port>    Watch and serves the ${yellow}--dist${esc} directory on the given port`,
    `  ${yellow}--start${esc}     <file>    Watch and starts a node script the ${yellow}--dist${esc} directory`,
    `  ${yellow}--minify${esc}              Minifies the bundle`,
    `  ${yellow}--sourcemap${esc}           Generate sourcemaps`,
  ].join(`\n`))
}

async function cli(argv: string[]) {
  const green = `\x1b[32m`
  const yellow = '\x1b[33m'
  const esc = `\x1b[0m`
  const hammer = String.fromCodePoint(0x1F528)
  const result = options(process.argv)
  if(result === undefined) return help()
  for(const sourcePath of result.sourcePaths) {
    console.log(`${green}Building${esc} ${sourcePath}`)
  }
  if(result.serve) console.log(`${yellow}Serving${esc} on http://localhost:${result.serve}`)
  if(result.start) console.log(`${yellow}Starting${esc} ${result.start}`)
  if(result.watch) console.log(`${yellow}Watching${esc} for file changes`)
  await start(result)

  if(!result.watch) console.log(`${green}Done${esc}`)
}

cli(process.argv)