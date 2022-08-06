import * as http from 'http'

http.createServer((req, res) => res.end('Node Server Started')).listen(5001)

console.log('Node Server Started', process.argv)
