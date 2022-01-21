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

import { Dispose }        from '../dispose'
import { watch, Watcher } from '../watch/index'
import { staticHandler }  from './static'
import * as http          from 'http'

// --------------------------------------------------------------------------
// Server
// --------------------------------------------------------------------------

export interface ReloadServerOptions {
  targetDirectory: string
  port: number
  cors: boolean
  sabs: boolean
}

export class Server implements Dispose {
  private readonly clients:  Map<number, http.ServerResponse>
  private readonly server:   http.Server
  private readonly watcher:  Watcher
  private readonly interval: NodeJS.Timeout
  private readonly script = Buffer.from(`(function () {
    function connect(endpoint, func) {
      var request = new XMLHttpRequest();
      request.open('GET', endpoint, true); 
      request.send();
      var offset = 0; 
      request.addEventListener('readystatechange', function () {
        if (request.readyState === 3) {
          var next = request.response.slice(offset);
          offset += next.length; 
          func(next);
        }
        if (request.readyState === 4) {
          setTimeout(function () { 
            connect(endpoint, func); 
          }, 4000);
          func('connecting');
        }
      });
    }
    var established = false;
    connect('/hammer/signal', function (next) {
      if (next === 'established') { 
        established = true;
      } else if (next === 'reload' && established) { 
        window.location.reload(); 
      }
    });
  })();`)

  constructor(private readonly options: ReloadServerOptions) {
    this.clients = new Map<number, http.ServerResponse>()
    this.watcher = watch([this.options.targetDirectory])
    this.server  = http.createServer((req, res) => this.onRequest(req, res))
    this.interval = setInterval(() => this.keepAlive(), 16000)
    this.server.listen(this.options.port)
    this.keepAlive()
    this.setupWatch()
  }

  private cors(request: http.IncomingMessage, response: http.ServerResponse): void {
    const origin = request.headers['origin'] || '*'
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Methods', 'GET')
  }

  private sharedArrayBuffer(request: http.IncomingMessage, response: http.ServerResponse): void {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  }

  private onReload(request: http.IncomingMessage, response: http.ServerResponse) {
    response.setHeader('Content-Type', 'text/javascript')
    response.setHeader('Content-Length', this.script.length)
    response.write(this.script)
    response.end()
  }

  private onSignal(request: http.IncomingMessage, response: http.ServerResponse) {
    response.setHeader('Connection', 'Transfer-Encoding')
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Transfer-Encoding', 'chunked')
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.setHeader('Pragma', 'no-cache')
    response.setHeader('Expires', '0')
    response.statusCode = 200
    response.write('established')
    const key = Date.now()
    this.clients.set(key, response)
    response.on('close', () => this.clients.delete(key))
  }

  private async onStatic(request: http.IncomingMessage, response: http.ServerResponse) {
    return staticHandler(request, response, this.options.targetDirectory)
  }

  private async onRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    if(this.options.cors) { this.cors(request, response) }
    if(this.options.sabs) { this.sharedArrayBuffer(request, response) }
    switch (request.url) {
      case '/hammer/reload': return await this.onReload(request, response)
      case '/hammer/signal': return await this.onSignal(request, response)
      default: return await this.onStatic(request, response)
    }
  }

  public dispose(): void {
    clearInterval(this.interval)
    this.watcher.dispose()
    this.server.close()
  }

  private async setupWatch() {
      for await (const _ of this.watcher) {
        for(const client of this.clients.values()) {
          client.write('reload')
        }
      }
  }

  private keepAlive() {
      for (const key of this.clients.keys()) {
        this.clients.get(key)!.write('ping')
      }
  }
}

export function serve(options: ReloadServerOptions): Server {
  return new Server(options)
}
