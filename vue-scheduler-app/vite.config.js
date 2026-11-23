import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/data/appData.json')
const REQUIRED_LISTS = ['patients', 'clinicAppointments', 'doctors', 'customers', 'bookings', 'stylists', 'services']
const MAX_BODY = 5 * 1024 * 1024

// Exposes src/data/appData.json to the app: GET /api/data reads it, PUT /api/data replaces it.
// The Grid and the Scheduler both go through this one file, so they always see the same data.
const appDataApi = () => {
  const handler = (req, res, next) => {
    if (req.url.split('?')[0] !== '/api/data') return next()
    const send = (code, body) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Content-Type', 'application/json')
      return res.end(fs.readFileSync(DATA_FILE))
    }
    if (req.method === 'PUT') {
      // a JSON content type forces a CORS preflight for cross-site pages, which this server never allows
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: 'JSON only' })
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > MAX_BODY) {
          send(413, { error: 'Payload too large' })
          req.destroy()
        } else chunks.push(c)
      })
      req.on('end', () => {
        if (res.writableEnded) return
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if (!data || typeof data !== 'object' || REQUIRED_LISTS.some((k) => !Array.isArray(data[k]))) {
            return send(400, { error: 'Invalid data shape' })
          }
          const tmp = DATA_FILE + '.tmp'
          fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
          fs.renameSync(tmp, DATA_FILE)
          send(200, { ok: true })
        } catch {
          send(400, { error: 'Invalid JSON' })
        }
      })
      return
    }
    res.setHeader('Allow', 'GET, PUT')
    send(405, { error: 'Method not allowed' })
  }
  return {
    name: 'app-data-api',
    // braces on purpose: Vite treats a returned function as a post-hook
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), appDataApi()],
})
