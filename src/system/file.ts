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
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

export class FileError extends SystemError {
    constructor(public readonly operation: string, public readonly reason: string) {
        super(`File.${operation}(...): ${reason}`)
    }
}

export class File {
    constructor(private readonly filePath: string) { }

    /** Appends this file with the given data. If the file does not exist it will be created. */
    public async append(data: Buffer | string): Promise<void> {
        if (!await this.checkExists(this.filePath)) {
            await this.createFolder(path.dirname(this.filePath))
            await fs.writeFile(this.filePath, Buffer.alloc(0))
        }
        await fs.appendFile(this.filePath, data)
    }

    /** Copies this file into the target folder. If the target folder does not exist it will be created. */
    public async copy(folderPath: string): Promise<void> {
        await this.assertExists('copyTo', this.filePath)
        await this.createFolder(folderPath)
        const targetPath = path.join(folderPath, path.basename(this.filePath))
        await fs.copyFile(this.filePath, targetPath)
    }

    /** Creates an empty file if not exists. */
    public async create(): Promise<void> {
        if (await this.checkExists(this.filePath)) return
        await this.createFolder(path.dirname(this.filePath))
        await fs.writeFile(this.filePath, Buffer.alloc(0))
    }

    /** Deletes this file if it exists. Otherwise no action. */
    public async delete(): Promise<void> {
        if (!await this.checkExists(this.filePath)) return
        await fs.unlink(this.filePath)
    }

    /** Replaces text content in this file that matches the given string or regular expression. */
    public async edit(pattern: RegExp | string, replacement: string): Promise<void> {
        await this.assertExists('edit', this.filePath)
        const content = await fs.readFile(this.filePath, 'utf-8')
        const search = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern
        const updated = content.replace(search, replacement)
        await fs.writeFile(this.filePath, updated)
    }

    /** Returns true if this file exists. */
    public async exists(): Promise<boolean> {
        if (!await this.checkExists(this.filePath)) return false
        const stat = await fs.stat(this.filePath)
        return stat.isFile()
    }

    /** Returns a hash for this file with the given algorithm (default is sha1, digest is hex) */
    public async hash(algorithm: string = 'sha1', digest: crypto.BinaryToTextEncoding = 'hex') {
        await this.assertExists('hash', this.filePath)
        let offset = 0
        const file = await fs.open(this.filePath, 'r')
        const hash = crypto.createHash(algorithm)
        const buffer = Buffer.alloc(16384)
        while (true) {
            const { bytesRead } = await file.read(buffer, 0, buffer.length, offset)
            if (bytesRead === 0) break
            offset = offset + bytesRead
            hash.update(buffer)
        }
        await file.close()
        return hash.digest(digest)
    }

    /** Moves this file into the target folder. If the target folder does not exist it will be created. */
    public async move(folderPath: string): Promise<void> {
        await this.assertExists('moveTo', this.filePath)
        await this.createFolder(folderPath)
        const targetPath = path.join(folderPath, path.basename(this.filePath))
        await fs.copyFile(this.filePath, targetPath)
        await fs.unlink(this.filePath)
    }

    /** Prepends this file with the given data. If the file does not exist it will be created. */
    public async prepend(data: Buffer | string): Promise<void> {
        if (!await this.checkExists(this.filePath)) {
            return await fs.writeFile(this.filePath, Buffer.from(data))
        }
        const sources = [Buffer.from(data), await fs.readFile(this.filePath)]
        const buffer = Buffer.concat(sources)
        await fs.writeFile(this.filePath, buffer)
    }

    /** Reads this file as a JSON object. Will throw if the content cannot be parsed. */
    public async json<T = any>(): Promise<T> {
        await this.assertExists('json', this.filePath)
        const content = await fs.readFile(this.filePath, 'utf-8')
        try { return JSON.parse(content) } catch {  }
        throw new FileError('json', `The file path '${this.filePath}' failed to parse as json.`)
    }

    /** Returns the absolute path of this file. */
    public path(): string {
        return path.resolve(this.filePath)
    }

    /** Reads this file as a buffer. */
    public async read(): Promise<Buffer>

    /** Reads this file with the given encoding. */
    public async read(encoding: BufferEncoding): Promise<string>

    /** Reads the contents of this file. */
    public async read(...args: any[]): Promise<Buffer | string> {
        await this.assertExists('read', this.filePath)
        const encoding = args.length === 0 ? 'binary' : args[0] as BufferEncoding
        return await fs.readFile(this.filePath, encoding)
    }

    /** Renames this file to the given newname. */
    public async rename(newName: string): Promise<void> {
        await this.assertExists('rename', this.filePath)
        const targetPath = path.join(path.dirname(this.filePath), newName)
        await fs.rename(this.filePath, targetPath)
    }

    /** Returns the size of this file in bytes. */
    public async size(): Promise<number> {
        await this.assertExists('size', this.filePath)
        const stat = await fs.stat(this.filePath)
        return stat.size
    }

    /** Returns the stats object for this file. */
    public async stat() {
        await this.assertExists('stat', this.filePath)
        return await fs.stat(this.filePath)
    }

    /** Truncates the contents of this file. If the file does not exist, it is created. */
    public async truncate(length: number = 0): Promise<void> {
        if(!await this.checkExists(this.filePath)) {
            await this.createFolder(path.dirname(this.filePath))
            return await fs.writeFile(this.filePath, Buffer.alloc(length))
        }
        return await fs.truncate(this.filePath, length)
    }

    /** Writes to this file. If the file does not exist, it is created. */
    public async write(data: string | Buffer): Promise<void> {
        await this.createFolder(path.dirname(this.filePath))
        return await fs.writeFile(this.filePath, data)
    }

    /** Asserts the given path exists. */
    private async assertExists(operation: string, systemPath: string) {
        if (await this.checkExists(systemPath)) return
        throw new FileError(operation, `The file path '${systemPath}' does not exist.`)
    }

    /** Checks the given path exists. */
    private async checkExists(systemPath: string): Promise<boolean> {
        return await fs.access(systemPath).then(() => true).catch(() => false)
    }

    /** Creates a directory if not exists. */
    private async createFolder(folderPath: string): Promise<void> {
        if (await this.checkExists(folderPath)) return
        await fs.mkdir(folderPath, { recursive: true })
    }
}

/** Returns an interface to interact with a file. */
export function file(file: string): File {
    return new File(path.resolve(file))
}