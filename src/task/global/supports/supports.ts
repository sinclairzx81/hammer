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

import { existsSync, readdir, rmdir, stat, unlink, Stats } from 'fs'
import { join, basename, resolve, relative } from 'path'
import { promisify } from 'util'

const readdirAsync = promisify(readdir)
const rmdirAsync = promisify(rmdir)
const unlinkAsync = promisify(unlink)
const statAsync = promisify(stat)

export interface Item {
  /** The folder used to produce this item. */
  folder: string
  /** The path down level from this folder. */
  path: string
  /** The stat object for this file or folder. */
  stat: Stats
}

function compare(left: string, right: string): number {
  if (left > right) {
    return 1
  }
  if (left < right) {
    return -1
  }
  return 0
}

/** Returns true if this path is a folder that exists. */
export async function folder_exists(folder: string): Promise<boolean> {
  if (!existsSync(folder)) return false
  const stat = await statAsync(folder)
  return stat.isDirectory()
}

/**
 * A specialized readdir that returns the {folder, path, stat} for the
 * given folder. The 'folder' component returns the absolute path for
 * the given folder passed to this function, and the path is the path
 * down level from the folder. Thus join(folder, path) yields the full
 * path of the item. The stat is a node stat object for the item
 * indicating either file or folder.
 */
export async function common_readdir(folder: string): Promise<Item[]> {
  const items = await Promise.all(
    (
      await readdirAsync(folder)
    ).map(async (path) => ({
      path: basename(path),
      folder: resolve(folder),
      stat: await statAsync(join(folder, basename(path))),
    })),
  )
  const folders = items.filter((item) => item.stat.isDirectory()).sort((a, b) => compare(a.path, b.path))
  const files = items.filter((item) => item.stat.isFile()).sort((a, b) => compare(a.path, b.path))
  return [...folders, ...files]
}

async function read_folder(folder: string): Promise<Item[]> {
  const items: Item[] = []
  for (const item of await common_readdir(folder)) {
    if (item.stat.isDirectory()) {
      items.push(item)
      items.push(...(await read_folder(join(item.folder, item.path))))
    }
    if (item.stat.isFile()) {
      items.push(item)
    }
  }
  return items
}
/** Returns a recursive list of a folders contents. */
export async function common_readdir_flatmap(folder: string): Promise<Item[]> {
  return (await read_folder(folder)).map((item) => ({
    folder: resolve(folder),
    path: relative(folder, join(item.folder, item.path)),
    stat: item.stat,
  }))
}

/** Deletes this folder. If not exists, then no action. */
export async function folder_delete(folder: string): Promise<void> {
  if (await folder_exists(folder)) {
    const items = await common_readdir_flatmap(folder)
    const folders = items.filter((item) => item.stat.isDirectory())
    const files = items.filter((item) => item.stat.isFile())
    for (const item of files) {
      const target = join(item.folder, item.path)
      await unlinkAsync(target)
    }
    for (const item of folders.reverse()) {
      const target = join(item.folder, item.path)
      await rmdirAsync(target)
    }
    await rmdirAsync(folder)
  }
}
