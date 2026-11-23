import fs from 'node:fs'

const REQUIRED_LISTS = ['patients', 'clinicAppointments', 'doctors', 'customers', 'bookings', 'stylists', 'services']
const MAX_BODY = 5 * 1024 * 1024

// GET returns the data file, PUT replaces it. Shared by the Vite dev/preview server and server.js.
// `isApiPath(pathname)` decides whether a request belongs to the API (so the base path is handled by the caller).
export const createDataHandler = (dataFile, isApiPath) => (req, res, next) => {
  if (!isApiPath(req.url.split('?')[0])) return next()
  const send = (code, body) => {
    res.statusCode = code
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    return res.end(fs.readFileSync(dataFile))
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
        const tmp = dataFile + '.tmp'
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
        fs.renameSync(tmp, dataFile)
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
