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

import { watchFile } from '../watch/index'
import { join, dirname, basename } from 'path'
import { existsSync, readFileSync } from 'fs'

function mapExtension(path: string) {
  if (path.indexOf('.ts') === path.length - 3) return path.slice(0, path.length - 3) + '.js'
  if (path.indexOf('.tsx') === path.length - 4) return path.slice(0, path.length - 4) + '.js'
  return path
}

function* parseStyles(sourceDirectory: string, targetDirectory: string, html: string): Generator<Style> {
  const regex = /<link (.*)\/>|<link (.*)>\s*<\/link>/gm
  while (true) {
    const result_tag = regex.exec(html)
    if (result_tag === null) return

    const result_href = /href\s*=\s*['"]([^\s]*)['"]/.exec(result_tag[0])
    const result_rel = /rel\s*=\s*['"]([^\s]*)['"]/.exec(result_tag[0])
    if (result_href === null || result_rel === null || result_rel[1] !== 'stylesheet') continue
    const sourcePath = join(sourceDirectory, result_href[1])
    const targetPath = join(targetDirectory, result_href[1])
    const kind = 'style'
    const sourceContent = result_tag[0]
    const targetContent = `<link href="${result_href[1]}" rel="${result_rel[1]}" />`
    yield { kind, sourcePath, targetPath, sourceContent, targetContent }
  }
}

function* parseScripts(sourceDirectory: string, targetDirectory: string, html: string): Generator<Script> {
  const regex = /<script (.*)>\s*<\/script>/gm
  while (true) {
    const result_tag = regex.exec(html)
    if (result_tag === null) return
    const result_async = /async/.exec(result_tag[0])
    const result_src = /src\s*=\s*['"]([^\s]*)['"]/.exec(result_tag[0])
    const result_type = /type\s*=\s*['"]([^\s]*)['"]/.exec(result_tag[0])
    const sourcePath = join(sourceDirectory, result_src[1])
    const targetPath = mapExtension(join(targetDirectory, result_src[1]))
    const kind = 'script'
    const src = result_src !== null ? result_src[1] : ''
    const type = result_type !== null ? result_type[1] : ''
    const sourceContent = result_tag[0]
    const targetContent =
      result_async !== null
        ? `<script async type="${type}" src="${mapExtension(src)}"></script>`
        : `<script type="${type}" src="${mapExtension(src)}"></script>`
    yield { kind, sourcePath, targetPath, sourceContent, targetContent }
  }
}

export interface Style {
  kind: 'style'
  sourcePath: string
  sourceContent: string
  targetPath: string
  targetContent: string
}

export interface Script {
  kind: 'script'
  sourcePath: string
  sourceContent: string
  targetPath: string
  targetContent: string
}

export type Asset = Script | Style

export interface Html {
  sourcePath: string
  targetPath: string
  sourceContent: string
  targetContent: string
  assets: Asset[]
}

function parseHtml(sourcePath: string, sourceContent: string, targetDirectory: string): Html {
  const sourceDirectory = dirname(sourcePath)
  const targetPath = join(targetDirectory, basename(sourcePath))
  const styles = parseStyles(sourceDirectory, targetDirectory, sourceContent)
  const scripts = parseScripts(sourceDirectory, targetDirectory, sourceContent)
  const assets = [...styles, ...scripts].filter((asset) => existsSync(asset.sourcePath))
  const targetContent = assets.reduce((sourceContent, asset) => {
    return sourceContent.replace(asset.sourceContent, asset.targetContent)
  }, sourceContent)
  return { sourcePath, targetPath, sourceContent, targetContent, assets }
}

export async function* watchHtml(sourcePath: string, targetDirectory: string): AsyncGenerator<Html> {
  for await (const _ of watchFile(sourcePath)) {
    const sourceContent = readFileSync(sourcePath, 'utf-8')
    yield parseHtml(sourcePath, sourceContent, targetDirectory)
  }
}

export function readHtml(sourcePath: string, targetDirectory: string): Html {
  const sourceContent = readFileSync(sourcePath, 'utf-8')
  return parseHtml(sourcePath, sourceContent, targetDirectory)
}
