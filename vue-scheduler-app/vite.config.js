import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { createDataHandler } from './server/dataApi.js'

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/data/appData.json')
export const BASE = '/multi-tenant-appointment-management-vue/'

// Exposes src/data/appData.json to the app: GET <base>api/data reads it, PUT replaces it.
// The Grid and the Scheduler both go through this one file, so they always see the same data.
// (In production, server.js serves the same API.)
const appDataApi = () => {
  // accept the path with or without the base, whichever form reaches the middleware
  const handler = createDataHandler(DATA_FILE, (p) => p === '/api/data' || p === BASE + 'api/data')
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
  base: BASE,
  plugins: [vue(), appDataApi()],
})
