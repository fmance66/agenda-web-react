// server de la agenda para producción:
//  - /api/* -> ver server/api.js
//  - el resto sirve el build de Vite (build/), con fallback a index.html
//
// variables de entorno: PORT (default 8080) y las de server/config.js

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './api.js'
import { API_URL } from './config.js'

/** @import { IncomingMessage, ServerResponse } from 'node:http' */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BUILD_DIR = join(ROOT, 'build')

const PORT = Number(process.env.PORT ?? 8080)

/** @type {Record<string, string>} */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
const serveStatic = async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  let file = normalize(join(BUILD_DIR, decodeURIComponent(pathname)))

  // no se permite salir de build/
  if (file !== BUILD_DIR && !file.startsWith(BUILD_DIR + sep)) {
    res.writeHead(403).end()
    return
  }

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    // un archivo que no existe (robots.txt, un asset viejo) es un 404; las rutas de la app
    // (/contacto/..., /area/...), que no tienen extensión, van al index porque es una SPA
    if (extname(file)) {
      res.writeHead(404).end()
      return
    }
    file = join(BUILD_DIR, 'index.html')
  }

  try {
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404).end('No se encontró el build, correr "npm run build"')
  }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  if (req.url?.startsWith('/api/')) return handleApi(req, res)
  return serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`Agenda escuchando en http://localhost:${PORT} (api: ${API_URL.origin})`)
})
