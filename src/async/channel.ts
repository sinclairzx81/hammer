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

// --------------------------------------------------------------------------
// Defer
// --------------------------------------------------------------------------

export type Resolve<T> = (value: T) => void
export type Reject = (error: Error) => void

export function defer<T>(): [Promise<T>, Resolve<T>, Reject] {
  let resolver: Resolve<T>
  let rejector: Reject
  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejector = reject
  })
  return [promise, resolver!, rejector!]
}

// --------------------------------------------------------------------------
// Queue
// --------------------------------------------------------------------------

export class Queue<T> {
  private readonly promises: Promise<T>[] = []
  private readonly resolvers: Resolve<T>[] = []

  public dequeue(): Promise<T> {
    if (this.promises.length > 0) {
      const promise = this.promises.shift()!
      return promise
    } else {
      const [promise, resolver] = defer<T>()
      this.resolvers.push(resolver)
      return promise
    }
  }
  public enqueue(value: T) {
    if (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift()!
      resolver(value)
    } else {
      const [promise, awaiter] = defer<T>()
      awaiter(value)
      this.promises.push(promise)
    }
  }
}

// --------------------------------------------------------------------------
// Protocol
// --------------------------------------------------------------------------

export type Protocol<T> = Data<T> | End
export type Data<T> = { type: 'data'; value: T }
export type End = { type: 'end' }

// --------------------------------------------------------------------------
// Sender
// --------------------------------------------------------------------------

export class Sender<T> {
  constructor(private readonly queue: Queue<Protocol<T>>) {}

  public send(value: T) {
    this.queue.enqueue({ type: 'data', value })
  }
  public end() {
    this.queue.enqueue({ type: 'end' })
  }
}

// --------------------------------------------------------------------------
// Receiver
// --------------------------------------------------------------------------

export class Receiver<T> {
  constructor(private readonly queue: Queue<Protocol<T>>) {}
  public async *[Symbol.asyncIterator]() {
    while (true) {
      const next = await this.queue.dequeue()
      switch (next.type) {
        case 'data':
          yield next.value
          break
        case 'end':
          return
      }
    }
  }
}

export function channel<T>(): [Sender<T>, Receiver<T>] {
  const queue = new Queue<Protocol<T>>()
  const sender = new Sender(queue)
  const receiver = new Receiver(queue)
  return [sender, receiver]
}

type SelectInner<T extends Receiver<any>[]> = {
  [K in keyof T]: T[K] extends Receiver<infer U> ? U : never
}[number]

export function select<R extends Receiver<any>[]>(receivers: [...R]): Receiver<SelectInner<R>> {
  async function receive(sender: Sender<any>, receiver: Receiver<any>) {
    for await (const value of receiver) {
      await sender.send(value)
    }
    await sender.end()
  }
  const [sender, receiver] = channel<any>()
  const promises = receivers.map((source) => receive(sender, source))
  Promise.all(promises).then(() => sender.end())
  return receiver
}
