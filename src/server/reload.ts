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

// --------------------------------------------------------------------------
// Script
// --------------------------------------------------------------------------

const SCRIPT = `(function () {
  function connect(endpoint, func) {
    var offset = 0;
    var request = new XMLHttpRequest();
    request.open('GET', endpoint, true); request.send();
    request.addEventListener('readystatechange', function () {
      if (request.readyState === 3) {
        var signal = request.response.slice(offset);
        offset += signal.length;
        func(signal);
      }
      if (request.readyState === 4) {
        setTimeout(function () { return connect(endpoint, func); }, 4000);
        func('connecting');
      }
    });
  }
  var established = 0;
  connect('/hammer/signal', function (signal) {
    if (signal === 'established') {
      established += 1;
    }
    if (signal === 'reload' || established > 1) {
      window.location.reload();
    }
    if (signal !== 'ping') {
      var style = 'color: #BBB'
      var hammer = String.fromCodePoint(0x1F528)
      console.log("%c" + hammer + " Build Started", style);
    }
  });
})();`

// --------------------------------------------------------------------------
// Protocol | KeepAlive | Reload
// --------------------------------------------------------------------------

const clients = new Map<string, ServerResponse>()
const started = [false]

function keepAlive() {
  if (started[0]) return
  started[0] = true
  setTimeout(() => keepAlive(), 16000)
  for (const key of clients.keys()) {
    clients.get(key)!.write('ping')
  }
}

/** Signals a reload to all listening clients. */
export function signalReload() {
  for (const key of clients.keys()) {
    const client = clients.get(key)!
    client.write('reload')
  }
}

// --------------------------------------------------------------------------
// Reload
// --------------------------------------------------------------------------

export function reloadHandler(request: IncomingMessage, response: ServerResponse) {
  const buffer = Buffer.from(SCRIPT)
  response.setHeader('Content-Type', 'text/javascript')
  response.setHeader('Content-Length', buffer.length)
  response.write(buffer)
  response.end()
}

// --------------------------------------------------------------------------
// Signal
// --------------------------------------------------------------------------

export function signalHandler(request: IncomingMessage, response: ServerResponse) {
  keepAlive()
  response.setHeader('Connection', 'Transfer-Encoding')
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Transfer-Encoding', 'chunked')
  response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')
  response.statusCode = 200
  response.write('established')
  const key = Date.now().toString()
  clients.set(key, response)
  response.on('close', () => clients.delete(key))
}
