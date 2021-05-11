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
import { hammer }     from './index'

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

async function cli(argv: string[]) {
  const green  = `\x1b[32m`
  const esc    = `\x1b[0m`

  const result = options(process.argv)
  if(result === undefined) return help()
  
  // ----------------------------------------------------
  // Info
  // ----------------------------------------------------

  result.sourcePaths.forEach(sourcePath => console.log(`${green}Build${esc} ${sourcePath}`))
  if(result.serve) console.log(`${green}Serve${esc} http://localhost:${result.serve}`)
  if(result.start) console.log(`${green}Start${esc} ${result.start}`)
  if(!result.start && !result.serve && result.watch) console.log(`${green}Watch${esc}`)

  // ----------------------------------------------------
  // Start
  // ----------------------------------------------------

  await hammer(result)

  // ----------------------------------------------------
  // Info
  // ----------------------------------------------------
  
  if(!result.watch) console.log(`${green}Done${esc}`)
}

cli(process.argv)