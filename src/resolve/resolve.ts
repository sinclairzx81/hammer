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

import * as path from 'path'
import * as fs   from 'fs'

export type AssetType  = 'html' | 'typescript' | 'javascript' | 'css' | 'file'
export type Asset      = Html | JavaScript | TypeScript | Css | File
export type Html       = { type: 'html',       timestamp: number, sourcePath: string, targetPath: string, content: string }
export type JavaScript = { type: 'javascript', timestamp: number, sourcePath: string, targetPath: string }
export type TypeScript = { type: 'typescript', timestamp: number, sourcePath: string, targetPath: string }
export type Css        = { type: 'css',        timestamp: number, sourcePath: string, targetPath: string }
export type File       = { type: 'file',       timestamp: number, sourcePath: string, targetPath: string }

export class Resolver {

    private readonly sourcePaths = new Set<string>()

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
            if (extension === '.ts' || extension === '.tsx') return 'typescript'
            if (extension === '.js' || extension === '.jsx') return 'javascript'
            if (extension === '.css') return 'css'
            if (extension === '.html') return 'html'
            return 'file'
        }
        return 'unknown'
    }

    // -------------------------------------------------------------------------------------
    // Pathing
    // -------------------------------------------------------------------------------------

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

    private * resolveDirectory(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        for (const partialPath of fs.readdirSync(sourcePath)) {
            yield * this.resolveAny(path.join(sourcePath, partialPath), basePath, targetDirectory)
        }
    }

    // -------------------------------------------------------------------------------------
    // Html
    // -------------------------------------------------------------------------------------
    
    private * getHtmlTags(content: string, basePath: string, targetDirectory: string): Generator<{sourceContent: string, sourcePath: string, targetPath: string}> {
        const regex = /<.*[src|href]\s*=['"]([a-zA-Z0-9\.-_]*)['"].*?>/gi
        while (true) {
            const match = regex.exec(content)
            if (match === null) break
            const sourceContent = match[0]
            const sourcePath = this.getSourcePathFromRelative(match[1], basePath)
            const targetPath = this.getTargetPathFromRelative(match[1], targetDirectory)
            yield { sourceContent, sourcePath, targetPath }
        }
    }

    private getHtmlContent(content: string, tags: Array<{sourceContent: string, sourcePath: string, targetPath: string}>): string {
        return tags.reduce((html, tag) => {
            const extension = path.extname(tag.sourcePath)
            const filename = path.basename(tag.sourcePath, extension)
            const sourceName = `${filename}${extension}`
            const targetName = (extension === '.tsx' || extension === '.ts') ? `${filename}.js` : `${filename}${extension}`
            const targetTag = tag.sourceContent.replace(sourceName, targetName)
            return html.replace(tag.sourceContent, targetTag)
        }, content)
    }

    private * resolveHtml(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        const content = fs.readFileSync(sourcePath, 'utf-8')
        const sourceDirectory = this.getSourceDirectory(sourcePath)
        const htmlTags = [...this.getHtmlTags(content, sourceDirectory, targetDirectory)]
        for(const htmlTag of htmlTags) {
            yield * this.resolveAny(htmlTag.sourcePath, basePath, targetDirectory)
        }
        yield {
            type: 'html',
            timestamp:  this.getTimestamp(sourcePath),
            sourcePath: this.getSourcePathFromAbsolute(sourcePath),
            targetPath: this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory),
            content: this.getHtmlContent(content, htmlTags)
        }
    }

    // -------------------------------------------------------------------------------------
    // File
    // -------------------------------------------------------------------------------------

    private * resolveFile(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
        const timestamp = this.getTimestamp(sourcePath)
        yield { type: 'file', timestamp, sourcePath, targetPath }
    }

    // -------------------------------------------------------------------------------------
    // TypeScript
    // -------------------------------------------------------------------------------------

    private * resolveTypeScript(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        const outputPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
        const timestamp = this.getTimestamp(sourcePath)
        const targetPath = this.changeExtension(outputPath, '.js')
        yield { type: 'typescript', timestamp, sourcePath, targetPath }
    }

    // -------------------------------------------------------------------------------------
    // JavaScript
    // -------------------------------------------------------------------------------------

    private * resolveJavaScript(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
        const timestamp = this.getTimestamp(sourcePath)
        yield { type: 'javascript', timestamp, sourcePath, targetPath }
    }

    // -------------------------------------------------------------------------------------
    // Css
    // -------------------------------------------------------------------------------------

    private * resolveCss(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        const targetPath = this.getTargetPathFromAbsolute(sourcePath, basePath, targetDirectory)
        const timestamp = this.getTimestamp(sourcePath)
        yield { type: 'css', timestamp, sourcePath, targetPath }
    }

    // -------------------------------------------------------------------------------------
    // Unknown
    // -------------------------------------------------------------------------------------

    private * resolveUnknown(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {

    }


    private * resolveAny(sourcePath: string, basePath: string, targetDirectory: string): Generator<Asset> {
        if(this.sourcePaths.has(sourcePath)) return
        this.sourcePaths.add(sourcePath)

        if (!fs.existsSync(sourcePath)) return

        const type = this.getSourcePathType(sourcePath)
        switch (type) {
            case 'directory': yield* this.resolveDirectory(sourcePath, basePath, targetDirectory); break;
            case 'typescript': yield* this.resolveTypeScript(sourcePath, basePath, targetDirectory); break;
            case 'javascript': yield* this.resolveJavaScript(sourcePath, basePath, targetDirectory); break;
            case 'html': yield* this.resolveHtml(sourcePath, basePath, targetDirectory); break;
            case 'file': yield* this.resolveFile(sourcePath, basePath, targetDirectory); break;
            case 'css': yield* this.resolveCss(sourcePath, basePath, targetDirectory); break;
            case 'unknown': yield* this.resolveUnknown(sourcePath, basePath, targetDirectory); break;
        }
    }

    public resolve(sourcePaths: string[], targetDirectory: string): Asset[] {
        const assets = [] as Asset[]
        for (const sourcePath of sourcePaths) {
            const basePath = path.dirname(sourcePath)
            assets.push(...this.resolveAny(sourcePath, basePath, targetDirectory))
        }
        return assets
    }
}

export function resolve(sourcePaths: string[], targetDirectory: string) {
    return new Resolver().resolve(sourcePaths, targetDirectory)
}