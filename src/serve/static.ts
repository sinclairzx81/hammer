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

import { IncomingMessage, ServerResponse } from 'http'
import { resolve, join, basename } from 'path'
import { readFileSync, existsSync, statSync, createReadStream } from 'fs'
import { mime } from './mime'

// -------------------------------------------------------------------------
// File Info
// -------------------------------------------------------------------------

export type FileInfo = { type: 'file'; sourcePath: string; mimeType: string; disposition: string; fileSize: number }
export type HtmlInfo = { type: 'html'; sourcePath: string; mimeType: string; disposition: string; fileSize: number }
export type NotFound = { type: 'not-found' }

function fileInfo(sourcePath: string): FileInfo | HtmlInfo | NotFound {
  if (!existsSync(sourcePath)) return { type: 'not-found' }
  const stat = statSync(sourcePath)
  const indexFile = join(sourcePath, 'index.html')
  if (stat.isDirectory() && existsSync(indexFile)) {
    const stat = statSync(indexFile)
    const type = 'html'
    const fileSize = stat.size
    const mimeType = 'text/html'
    const sourcePath = indexFile
    const disposition = basename(indexFile).replace(/[^0-9a-zA-Z-\.]/gi, '-')
    return { type, fileSize, mimeType, disposition, sourcePath }
  }
  if (stat.isFile()) {
    const fileSize = stat.size
    const mimeType = mime(sourcePath)
    const type = mimeType === 'text/html' ? 'html' : 'file'
    const disposition = basename(sourcePath).replace(/[^0-9a-zA-Z-\.]/gi, '-')
    return { type, fileSize, mimeType, disposition, sourcePath }
  }
  return { type: 'not-found' }
}

// -------------------------------------------------------------------------
// Not Found
// -------------------------------------------------------------------------

function notFoundHandler(request: IncomingMessage, response: ServerResponse) {
  const buffer = Buffer.from('not found')
  const header = { 'Content-Type': 'text/plain', 'Content-Length': buffer.length }
  response.writeHead(404, header)
  response.write(buffer)
  response.end()
}

// -------------------------------------------------------------------------
// File Handler
// -------------------------------------------------------------------------

function readRangeOffset(range: string): number {
  const result = range.match(/bytes=([\d]+)-([\d]*)?/)
  return result ? parseInt(result[1]) : 0
}

function fileHandler(request: IncomingMessage, response: ServerResponse, info: FileInfo) {
  const range = request.headers['range'] as string
  if (range) {
    const offset = readRangeOffset(range)
    if (offset < info.fileSize) {
      const total = info.fileSize
      const start = offset
      const end = info.fileSize - 1
      const length = end - start + 1
      const range_out = `bytes ${start}-${end}/${total}`
      const readable = createReadStream(info.sourcePath, { start, end })
      response.statusCode = 206
      response.setHeader('Content-Type', `${info.mimeType}`)
      response.setHeader('Content-Length', `${length}`)
      response.setHeader('Content-Range', `${range_out}`)
      response.setHeader('Content-Disposition', `inline; filename=${info.disposition}`)
      response.setHeader('Cache-Control', 'public')
      readable.pipe(response)
      return
    }
  }
  const readable = createReadStream(info.sourcePath)
  response.statusCode = 200
  response.setHeader('Content-Type', info.mimeType)
  response.setHeader('Content-Length', info.fileSize)
  response.setHeader('Content-Disposition', `inline; filename=${info.disposition}`)
  response.setHeader('Cache-Control', 'public')
  readable.pipe(response)
}

// -------------------------------------------------------------------------
// Html Handler
// -------------------------------------------------------------------------

function insertHammerScript(content: string): string {
  const element = '<script src="/hammer/reload"></script>'
  const lines = content.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const current = lines[i]
    if (current.includes('<html') || current.includes('<head')) {
      const length = current.length - current.trimLeft().length + 3
      const padding = Array.from({ length: length }).join(' ')
      const footer = lines.slice(i + 1).join('\n')
      const header = lines.slice(0, i + 1).join('\n')
      const script = [padding, element].join('')
      return [header, script, footer].join('\n')
    }
  }
  return [content, element].join('\n')
}

export function htmlHandler(request: IncomingMessage, response: ServerResponse, info: HtmlInfo) {
  const content = readFileSync(info.sourcePath, 'utf8')
  const written = insertHammerScript(content)
  const buffer = Buffer.from(written)
  const header = { 'Content-Type': 'text/html', 'Content-Length': buffer.length }
  response.writeHead(200, header)
  response.write(buffer)
  response.end()
}

// -------------------------------------------------------------------------
// Static Handler
// -------------------------------------------------------------------------

function isInsideTargetDirectory(targetDirectory: string, filePath: string) {
  return filePath.indexOf(targetDirectory) === 0
}

export async function staticHandler(request: IncomingMessage, response: ServerResponse, targetDirectory: string) {
  if (!request.method || request.method.toLowerCase() !== 'get') return notFoundHandler(request, response)
  const url = new URL(request.url!, 'http://domain.com')
  const filePath = resolve(join(targetDirectory, url.pathname))
  if (!isInsideTargetDirectory(targetDirectory, filePath)) {
    return notFoundHandler(request, response)
  }
  const info = fileInfo(filePath)
  switch (info.type) {
    case 'file': return fileHandler(request, response, info)
    case 'html': return htmlHandler(request, response, info)
    default: return notFoundHandler(request, response)
  }
}
