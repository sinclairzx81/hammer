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

// --------------------------------------------------------------------------
// Cache
// --------------------------------------------------------------------------

export type Insert<T> = { type: 'insert', value: T }
export type Update<T> = { type: 'update', value: T }
export type Delete<T> = { type: 'delete', value: T }

export interface CacheOptions<T> {
    key: keyof T
    hash: keyof T
}

export class Cache<T> {
    private readonly cache = new Map<string, T>()
    constructor(private readonly options: CacheOptions<T>) { }

    private keyOf(value: T): string {
        return value[this.options.key] as any as string
    }
    
    private hashOf(value: T): string {
        return value[this.options.hash] as any as string
    }
    
    private *inserts(values: T[]): Generator<Insert<T>> {
        for (const value of values) {
            const key = this.keyOf(value)
            if (!this.cache.has(key)) {
                this.cache.set(key, value)
                yield { type: 'insert', value }
            }
        }
    }
    private *updates(values: T[]): Generator<Update<T>> {
        for (const value of values) {
            const key = this.keyOf(value)
            if (this.cache.has(key)) {
                const stored = this.cache.get(key)!
                const hash0 = this.hashOf(stored)
                const hash1 = this.hashOf(value)
                if (hash0 !== hash1) {
                    this.cache.set(key, value)
                    yield { type: 'update', value }
                }
            }
        }
    }

    private *deletes(values: T[]): Generator<Delete<T>> {
        for (const [key, value] of this.cache) {
            const existing = values.find(value => this.keyOf(value) === key)
            if (!existing) {
                this.cache.delete(key)
                yield { type: 'delete', value }
            }
        }
    }

    public *next(values: T[]) {
        yield* this.inserts(values)
        yield* this.updates(values)
        yield* this.deletes(values)
    }
}
