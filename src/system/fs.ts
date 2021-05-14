import * as fs from 'fs'
import * as util from 'util'

export const appendFile = util.promisify(fs.appendFile)
export const access = util.promisify(fs.access)
export const close = util.promisify(fs.close)
export const copyFile = util.promisify(fs.copyFile)
export const exists = util.promisify(fs.exists)
export const mkdir = util.promisify(fs.mkdir)
export const open = util.promisify(fs.open)
export const readdir = util.promisify(fs.readdir)
export const read = util.promisify(fs.read)
export const readFile = util.promisify(fs.readFile)
export const stat = util.promisify(fs.stat)
export const truncate = util.promisify(fs.truncate)
export const rename = util.promisify(fs.rename)
export const rm = util.promisify(fs.rm)
export const unlink = util.promisify(fs.unlink)
export const write = util.promisify(fs.write)
export const writeFile = util.promisify(fs.writeFile)


