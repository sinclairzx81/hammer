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

import * as path from 'path'
import * as fs from 'fs'

export type AssetType = 'html' | 'typescript' | 'javascript' | 'css' | 'file'
export type Asset = Html | JavaScript | TypeScript | Css | File
export type Html = { type: 'html'; timestamp: number; sourcePath: string; targetPath: string; content: string }
export type JavaScript = { type: 'javascript'; timestamp: number; sourcePath: string; targetPath: string; esm: boolean }
export type TypeScript = { type: 'typescript'; timestamp: number; sourcePath: string; targetPath: string; esm: boolean }
export type Css = { type: 'css'; timestamp: number; sourcePath: string; targetPath: string }
export type File = { type: 'file'; timestamp: number; sourcePath: string; targetPath: string }

export class Resolver {
  private readonly sourcePaths: Set<string>
  constructor() {
    this.sourcePaths = new Set<string>()
  }

  // -------------------------------------------------------------------------------------
  // Attributes
  // -------------------------------------------------------------------------------------

  private getTimestamp(sourcePath: string): number {
    return fs.statSync(sourcePath).mtimeMs
  }

  private getSourcePathType(sourcePath: string) {
    const stat = fs.statSync(sourcePath)
    if (stat.isDirectory()) return 'directory'
    if (stat.isFile()) {
      const extension = path.extname(sourcePath)
      if (extension === '.ts' || extension === '.tsx' || extension === '.mts') return 'typescript'
      if (extension === '.js' || extension === '.jsx' || extension === '.mjs') return 'javascript'
      if (extension === '.css') return 'css'
      if (extension === '.html') return 'html'
      return 'file'
    }
    return 'unknown'
  }

  // -------------------------------------------------------------------------------------
  // Pathing
  // -------------------------------------------------------------------------------------

  private esmExtension(sourcePath: string, esm: boolean): boolean {
    const extname = path.extname(sourcePath)
    switch (extname) {
      case '.mts':
        return true
      case '.mjs':
        return true
      case '.cts':
        return esm
      case '.tsx':
        return esm
      case '.ts':
        return esm
      case '.js':
        return esm
      default:
        throw Error(`Resolve: Unable to resolve esm extension type for '${extname}'`)
    }
  }

  private mappedExtension(sourcePath: string): string {
    const extname = path.extname(sourcePath)
    switch (extname) {
      case '.mts':
        return '.mjs'
      case '.mjs':
        return '.mjs'
      case '.cts':
        return '.js'
      case '.tsx':
        return '.js'
      case '.ts':
        return '.js'
      case '.js':
        return '.js'
      default:
        throw Error(`Resolve: Unable to resolve mapped extension for '${extname}'`)
    }
  }
  private changeExtension(sourcePath: string, ext: string): string {
    const extension = path.extname(sourcePath)
    const filename = path.basename(sourcePath, extension)
    const directory = path.dirname(sourcePath)
    return path.join(directory, `${filename}${ext}`)
  }

  private getSourceDirectory(sourcePath: string): string {
    return path.dirname(sourcePath)
  }

  private getSourcePathFromAbsolute(sourcePath: string): string {
    return sourcePath
  }

  private getSourcePathFromRelative(partialPath: string, basePath: string): string {
    return path.join(basePath, partialPath)
  }

  private getTargetPathFromAbsolute(absolutePath: string, basePath: string, targetDirectory: string): string {
    return path.join(targetDirectory, path.relative(basePath, absolutePath))
  }

  private getTargetPathFromRelative(relativePath: string, targetDirectory: string): string {
    return path.join(targetDirectory, relativePath)
  }

  // -------------------------------------------------------------------------------------
  // Directory
  // -------------------------------------------------------------------------------------

  private *resolveDirectory(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
    for (const partialPath of fs.readdirSync(sourcePath)) {
      yield* this.resolveAny(path.join(sourcePath, partialPath), basePath, targetDirectory)
    }
  }

  // -------------------------------------------------------------------------------------
  // Html
  // -------------------------------------------------------------------------------------

  private *getHtmlTags(content: string, basePath: string, targetDirectory: string): Generator<{ sourceContent: string; sourcePath: string; targetPath: string }> {
    const regex = /<.*(src|href)\s*=\s*['"]([a-zA-Z0-9\._-]*)['"].*>/gi
    while (true) {
      const match = regex.exec(content)
      if (match === null) break
      const sourceContent = match[0]
      const sourcePath = this.getSourcePathFromRelative(match[2], basePath)
      const targetPath = this.getTargetPathFromRelative(match[2], targetDirectory)
      yield { sourceContent, sourcePath, targetPath }
    }
  }

  private getHtmlContentTargetName(filename: string, extension: string) {
    switch (extension) {
      case '.ts':
        return `${filename}.js`
      case '.mts':
        return `${filename}.js`
      case '.cts':
        return `${filename}.js`
      case '.tsx':
        return `${filename}.js`
      case '.js':
        return `${filename}.js`
      case '.mjs':
        return `${filename}.js`
      case '.cjs':
        return `${filename}.js`
      case '.jsx':
        return `${filename}.js`
      default:
        return `${filename}${extension}`
    }
  }

  private getHtmlContent(content: string, tags: Array<{ sourceContent: string; sourcePath: string; targetPath: string }>): string {
    return tags.reduce((html, tag) => {
      const extension = path.extname(tag.sourcePath)
      const filename = path.basename(tag.sourcePath, extension)
      const sourceName = `${filename}${extension}`
      const targetName = this.getHtmlContentTargetName(filename, extension)
      const targetTag = tag.sourceContent.replace(sourceName, targetName)
      return html.replace(tag.sourceContent, targetTag)
    }, content)
  }

  private *resolveHtml(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
    const content = fs.readFileSync(sourcePath, 'utf-8')
    const sourceDirectory = this.getSourceDirectory(sourcePath)
    const htmlTags = [...this.getHtmlTags(content, sourceDirectory, targetDirectory)]
    for (const htmlTag of htmlTags) {
      // -----------------------------------------------------------------------------------------
      // Note: Hammer will ignore any path it can't resolve that are referenced from the html
      // file. Users will observe that their output bundle will not contain the reference file
      // asset. Can consider emitting a warning to the user in later revisions.
      // -----------------------------------------------------------------------------------------

      if (!fs.existsSync(htmlTag.sourcePath)) continue

      // -----------------------------------------------------------------------------------------
      // Note: ESM modules can be inferred from HTML files. However because the getHtmlTags(...)
      // function resolves agnostically for any tag that contains a 'src' or 'href' attribute,
      // we need to explicitly check that the tag is both a <script> and contains a 'module'
      // type specifier. In these cases, we call to the functions resolveTypeScript(...) and
      // resolveJavaScript(...) respectively passing the 'esm' flag as 'true'.
      // -----------------------------------------------------------------------------------------

      const match = /<script.*type\s*=\s*['"]module['"].*>/gi.exec(htmlTag.sourceContent)
      const type = this.getSourcePathType(htmlTag.sourcePath)
      if (match && type === 'typescript') yield* this.resolveTypeScript(htmlTag.sourcePath, sourceDirectory, targetDirectory, true)
      else if (match && type === 'javascript') yield* this.resolveJavaScript(htmlTag.sourcePath, sourceDirectory, targetDirectory, true)
      else yield* this.resolveAny(htmlTag.sourcePath, basePath, targetDirectory)
    }
    yield {
      type: 'html',
      timestamp: this.getTimestamp(sourcePath),
      sourcePath: this.getSourcePathFromAbsolute(sourcePath),
      targetPath: this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory),
      content: this.getHtmlContent(content, htmlTags),
    }
  }

  // -------------------------------------------------------------------------------------
  // File
  // -------------------------------------------------------------------------------------

  private *resolveFile(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
    const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
    const timestamp = this.getTimestamp(sourcePath)
    yield { type: 'file', timestamp, sourcePath, targetPath }
  }

  // -------------------------------------------------------------------------------------
  // TypeScript
  // -------------------------------------------------------------------------------------

  private *resolveTypeScript(sourcePath: string, basePath: string, targetDirectory: string, esm: boolean): Generator<Asset> {
    const outputPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
    const timestamp = this.getTimestamp(sourcePath)
    const extension = this.mappedExtension(sourcePath)
    const targetPath = this.changeExtension(outputPath, extension)
    yield { type: 'typescript', timestamp, sourcePath, targetPath, esm: this.esmExtension(sourcePath, esm) }
  }

  // -------------------------------------------------------------------------------------
  // JavaScript
  // -------------------------------------------------------------------------------------

  private *resolveJavaScript(sourcePath: string, basePath: string, targetDirectory: string, esm: boolean): Generator<Asset> {
    const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
    const timestamp = this.getTimestamp(sourcePath)
    yield { type: 'javascript', timestamp, sourcePath, targetPath, esm: this.esmExtension(sourcePath, esm) }
  }

  // -------------------------------------------------------------------------------------
  // Css
  // -------------------------------------------------------------------------------------

  private *resolveCss(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
    const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
    const timestamp = this.getTimestamp(sourcePath)
    yield { type: 'css', timestamp, sourcePath, targetPath }
  }

  // -------------------------------------------------------------------------------------
  // Unknown
  // -------------------------------------------------------------------------------------

  private *resolveUnknown(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {}

  private *resolveAny(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
    if (this.sourcePaths.has(sourcePath)) return
    this.sourcePaths.add(sourcePath)

    if (!fs.existsSync(sourcePath)) return

    const type = this.getSourcePathType(sourcePath)
    switch (type) {
      case 'directory':
        yield* this.resolveDirectory(sourcePath, basePath, targetDirectory)
        break
      case 'typescript':
        yield* this.resolveTypeScript(sourcePath, basePath, targetDirectory, false)
        break
      case 'javascript':
        yield* this.resolveJavaScript(sourcePath, basePath, targetDirectory, false)
        break
      case 'html':
        yield* this.resolveHtml(sourcePath, basePath, targetDirectory)
        break
      case 'file':
        yield* this.resolveFile(sourcePath, basePath, targetDirectory)
        break
      case 'css':
        yield* this.resolveCss(sourcePath, basePath, targetDirectory)
        break
      case 'unknown':
        yield* this.resolveUnknown(sourcePath, basePath, targetDirectory)
        break
    }
  }

  public *resolve(sourcePaths: string[], targetDirectory: string): Generator<Asset> {
    for (const sourcePath of sourcePaths) {
      const basePath = path.dirname(sourcePath)
      yield* this.resolveAny(sourcePath, basePath, targetDirectory)
    }
  }
}

export function resolve(sourcePaths: string[], targetDirectory: string): Generator<Asset> {
  return new Resolver().resolve(sourcePaths, targetDirectory)
}
