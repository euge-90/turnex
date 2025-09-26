// Minimal static server used for local Playwright runs
const http = require('http')
const fs = require('fs')
const path = require('path')
const root = process.cwd()
const port = process.env.PORT || 8080
const host = process.env.HOST || '127.0.0.1'

const server = http.createServer((req, res) => {
  try {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]))
    if (!p.startsWith(root)) p = path.join(root, 'index.html')
    fs.stat(p, (err) => {
      if (err) p = path.join(root, 'index.html')
      fs.readFile(p, (e, data) => {
        if (e) { res.writeHead(404); res.end('Not found'); return }
        const ext = path.extname(p).toLowerCase()
        const map = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' }
        res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain' })
        res.end(data)
      })
    })
  } catch (e) { res.writeHead(500); res.end('Server error') }
})
server.listen(port, host, () => console.log(`static server up on http://${host}:${port}`))
