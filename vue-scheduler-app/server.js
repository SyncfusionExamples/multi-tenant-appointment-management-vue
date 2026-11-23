// Production server for Azure Linux App Service (or any Node host).
// Serves the built app from ./dist under BASE_PATH plus the /api/data endpoint.
// Requests are accepted both with the base path (App Service default) and without it
// (a load balancer that strips the path prefix before forwarding).
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDataHandler } from './server/dataApi.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const BASE = '/multi-tenant-appointment-management-vue'
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 8080

// App Service only persists /home across deployments and restarts, so keep the editable data there.
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/home') ? '/home/data' : path.join(ROOT, 'data'))
const DATA_FILE = path.join(DATA_DIR, 'appData.json')
fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(path.join(ROOT, 'src/data/appData.json'), DATA_FILE)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
}

// strip the base path if present
const stripBase = (p) => (p === BASE ? '/' : p.startsWith(BASE + '/') ? p.slice(BASE.length) : p)

const api = createDataHandler(DATA_FILE, (p) => stripBase(p) === '/api/data')

const serveFile = (req, res, file, immutable) => {
  res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream')
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
  if (req.method === 'HEAD') return res.end()
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')

  api(req, res, () => {
    let pathname
    try {
      pathname = decodeURIComponent(req.url.split('?')[0])
    } catch {
      res.statusCode = 400
      return res.end('Bad request')
    }

    // health probe for App Service / the load balancer
    if (pathname === '/healthz' || pathname === BASE + '/healthz') {
      res.setHeader('Content-Type', 'text/plain')
      return res.end('ok')
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      return res.end('Method not allowed')
    }

    // "/" and the bare base path go to the app (with a trailing slash so relative assets resolve)
    if (pathname === '/' || pathname === BASE) {
      res.statusCode = 301
      res.setHeader('Location', BASE + '/')
      return res.end()
    }

    const rel = stripBase(pathname)
    const file = path.normalize(path.join(DIST, rel))
    if (file !== DIST && !file.startsWith(DIST + path.sep)) {
      res.statusCode = 403
      return res.end('Forbidden')
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isFile()) return serveFile(req, res, file, rel.startsWith('/assets/'))
      // a missing file with an extension is a real 404; anything else falls back to the SPA shell
      if (path.extname(rel)) {
        res.statusCode = 404
        return res.end('Not found')
      }
      serveFile(req, res, path.join(DIST, 'index.html'), false)
    })
  })
})

server.listen(PORT, () => console.log(`Serving ${BASE}/ on port ${PORT} (data: ${DATA_FILE})`))
