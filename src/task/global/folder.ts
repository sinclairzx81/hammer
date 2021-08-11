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

import { SystemError } from './error'
import { File } from './file'
import * as fs from './fs'
import * as path from 'path'

export class FolderError extends SystemError {
    constructor(public readonly operation: string, public readonly reason: string) {
        super(`Folder.${operation}(...): ${reason}`)
    }
}

export class Folder {
    constructor(private readonly folderPath: string) { }

    /** Returns an interface to interact with a folders contents. */
    public contents(): Contents {
        return new Contents(this.folderPath)
    }

    /** 
     * Copies a file or folder into this folder. If this folder does not exist, it will be created. 
     * Any existing files copied into this folder will be overwritten.
     */
    public async add(systemPath: string) {
        await this.createFolder(this.folderPath)
        if (!await this.checkExists(systemPath)) return
        const stat = await fs.stat(systemPath)
        if (stat.isDirectory()) return await new Folder(systemPath).copy(this.folderPath)
        if (stat.isFile()) return await new File(systemPath).copy(this.folderPath)
    }

    /** Copies this folder to a target folder. */
    public async copy(folderPath: string) {
        await this.assertExists('copy', this.folderPath)
        await this.createFolder(folderPath)
        for (const partialPath of await fs.readdir(this.folderPath)) {
            const absolutePath = path.resolve(this.folderPath)
            const sourcePath = path.resolve(path.join(this.folderPath, partialPath))
            const deltaPath = sourcePath.replace(absolutePath, '')
            const targetPath = path.resolve(path.join(folderPath, path.basename(absolutePath), deltaPath))
            const stat = await fs.stat(sourcePath)
            if (stat.isDirectory()) {
                await fs.mkdir(targetPath, { recursive: true })
                const folder = new Folder(sourcePath)
                await folder.copy(path.dirname(targetPath))
            }
            if (stat.isFile()) {
                await this.createFolder(path.dirname(targetPath))
                await fs.copyFile(sourcePath, targetPath)
            }
        }
    }

    /** Creates this folder. If the folder exists, no action. */
    public async create(): Promise<void> {
        if (await this.checkExists(this.folderPath)) return
        await fs.mkdir(this.folderPath, { recursive: true })
    }

    /** Deletes this folder. If the folder does not exist, no action. */
    public async delete(): Promise<void> {
        if (!await this.checkExists(this.folderPath)) return
        await fs.rm(this.folderPath, { recursive: true, force: true })
    }

    /** Returns true if this folder exists. */
    public async exists(): Promise<boolean> {
        if (!await this.checkExists(this.folderPath)) return false
        const stat = await fs.stat(this.folderPath)
        return stat.isDirectory()
    }

    /** Moves this folder to a target folder. */
    public async move(folderPath: string): Promise<void> {
        await this.assertExists('move', this.folderPath)
        await new Folder(this.folderPath).copy(folderPath)
        await new Folder(this.folderPath).delete()
    }

    /** Renames this folder. */
    public async rename(newName: string): Promise<void> {
        await this.assertExists('rename', this.folderPath)
        const folderPath = path.dirname(this.folderPath)
        await fs.rename(this.folderPath, path.join(folderPath, newName))
    }

    /** Returns the size of this folder in bytes. */
    public async size(): Promise<number> {
        await this.assertExists('size', this.folderPath)
        let size = 0
        for await (const file of this.enumerateFiles()) {
            size = size + await file.size()
        }
        return size
    }

    /** Returns a stats object for this folder. */
    public async stat() {
        await this.assertExists('stat', this.folderPath)
        await fs.stat(this.folderPath)
    }

    /** Asserts the given system path exists. */
    private async assertExists(operation: string, systemPath: string) {
        if (await this.checkExists(systemPath)) return
        throw new FolderError(operation, `The folder path '${systemPath}' does not exist.`)
    }

    private async checkExists(systemPath: string): Promise<boolean> {
        return await fs.access(systemPath).then(() => true).catch(() => false)
    }

    private async createFolder(folderPath: string): Promise<void> {
        if (await this.checkExists(folderPath)) return
        await fs.mkdir(folderPath, { recursive: true })
    }

    /** Recursively enumerates all files within this directory. */
    private async *enumerateFiles(): AsyncGenerator<File> {
        await this.assertExists('enumerate', this.folderPath)
        for (const partialPath of await fs.readdir(this.folderPath)) {
            const sourcePath = path.join(this.folderPath, partialPath)
            const stat = await fs.stat(sourcePath)
            if (stat.isDirectory()) yield* new Folder(sourcePath).enumerateFiles()
            if (stat.isFile()) yield new File(sourcePath)
        }
    }
}

export class ContentsError extends SystemError {
    constructor(public readonly operation: string, public readonly reason: string) {
        super(`Contents.${operation}(...): ${reason}`)
    }
}

export class Contents {
    constructor(private folderPath: string) { }

    /** Copies the contents for this folder into a target folder. */
    public async copy(folderPath: string): Promise<void> {
        await this.assertExists('copy', this.folderPath)
        await this.createFolder(folderPath)
        for (const partialPath of await fs.readdir(this.folderPath)) {
            const absolutePath = path.resolve(this.folderPath)
            const sourcePath = path.resolve(path.join(this.folderPath, partialPath))
            const deltaPath = sourcePath.replace(absolutePath, '')
            const targetPath = path.resolve(path.join(folderPath, deltaPath))
            const stat = await fs.stat(sourcePath)
            if (stat.isDirectory()) await new Folder(sourcePath).copy(path.dirname(targetPath))
            if (stat.isFile()) await new File(sourcePath).copy(targetPath)
        }
    }

    /** Copies the contents for this folder into a target folder. */
    public async move(folderPath: string): Promise<void> {
        await this.assertExists('move', this.folderPath)
        await this.createFolder(folderPath)
        for (const partialPath of await fs.readdir(this.folderPath)) {
            const absolutePath = path.resolve(this.folderPath)
            const sourcePath = path.resolve(path.join(this.folderPath, partialPath))
            const deltaPath = sourcePath.replace(absolutePath, '')
            const targetPath = path.join(folderPath, deltaPath)
            const stat = await fs.stat(sourcePath)
            if (stat.isDirectory()) await new Folder(sourcePath).copy(path.dirname(targetPath))
            if (stat.isFile()) await new File(sourcePath).copy(targetPath)
        }
        for (const partialPath of await fs.readdir(this.folderPath)) {
            const targetPath = path.join(this.folderPath, partialPath)
            await fs.rm(targetPath, { recursive: true, force: true })
        }
    }

    private async createFolder(folderPath: string): Promise<void> {
        if (await this.checkExists(folderPath)) return
        await fs.mkdir(folderPath, { recursive: true })
    }

    private async assertExists(operation: string, systemPath: string) {
        if (await this.checkExists(systemPath)) return
        throw new ContentsError(operation, `The folder path '${systemPath}' does not exist.`)
    }

    private async checkExists(systemPath: string): Promise<boolean> {
        return await fs.access(systemPath).then(() => true).catch(() => false)
    }
}

/** Returns an interface to interact with a folder. */
export function folder(folderPath: string): Folder {
    return new Folder(path.resolve(folderPath))
}

