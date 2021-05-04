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

export type Action<T> = Insert<T> | Update<T> | Delete<T>
export type Insert<T> = { type: 'insert', value: T }
export type Update<T> = { type: 'update', value: T }
export type Delete<T> = { type: 'delete', value: T }

type CacheOptions<T> = { key: keyof T, timestamp: keyof T }

export class Cache<T> {
    private readonly data = new Map<string, T>()
    constructor(private readonly options: CacheOptions<T>) { }

    private keyOf(values: T): string {
        return values[this.options.key] as any as string
    }
    
    private timestampOf(values: T): number {
        return values[this.options.timestamp] as any as number
    }
    
    private inserts(values: T[]): Insert<T>[] {
        const actions: Insert<T>[] = []
        for (const value of values) {
            const key = this.keyOf(value)
            if (!this.data.has(key)) {
                this.data.set(key, value)
                actions.push({ type: 'insert', value })
            }
        }
        return actions
    }

    private updates(values: T[]): Update<T>[] {
        const actions: Update<T>[] = []
        for (const value of values) {
            const key = this.keyOf(value)
            if (this.data.has(key)) {
                const stored = this.data.get(key)!
                const hash0 = this.timestampOf(stored)
                const hash1 = this.timestampOf(value)
                if (hash0 !== hash1) {
                    this.data.set(key, value)
                    actions.push({ type: 'update', value })
                }
            }
        }
        return actions
    }

    private deletes(values: T[]): Delete<T>[] {
        const actions: Delete<T>[] = []
        for (const [key, value] of this.data) {
            const existing = values.find(value => this.keyOf(value) === key)
            if (!existing) {
                this.data.delete(key)
                actions.push({ type: 'delete', value })
            }
        }
        return actions
    }
    
    public update(values: T[]): Action<T>[] {
        return [
            ...this.deletes(values),
            ...this.inserts(values),
            ...this.updates(values),
        ]
    }
}
