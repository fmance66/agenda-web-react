import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleApi } from './server/api.js'

// atiende /api dentro del server de Vite (dev y preview), igual que server/index.js
const api = {
  name: 'agenda-api',
  configureServer(server) {
    server.middlewares.use('/api', handleApi)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api', handleApi)
  },
}

// archivos de public/, con rutas relativas y "/" como separador
const listarPublicos = (carpeta) =>
  readdirSync(carpeta, { recursive: true, encoding: 'utf8' })
    .map((archivo) => archivo.replaceAll('\\', '/'))
    .filter((archivo) => statSync(join(carpeta, archivo)).isFile())

// genera sw.js desde la plantilla sw/sw.js con la lista de archivos del build, que el
// service worker guarda al instalarse. La versión es un hash de esa lista, del contenido
// de public/ y de index.html: cambia sólo si cambió algo, y ahí el navegador instala el
// service worker nuevo
const serviceWorker = () => {
  let publico = ''
  return {
    name: 'agenda-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publico = config.publicDir
    },
    generateBundle(_opciones, bundle) {
      const publicos = listarPublicos(publico)
      const archivos = [...new Set([...Object.keys(bundle), ...publicos])]
        .filter((archivo) => archivo !== 'sw.js')
        .sort()

      const hash = createHash('sha256')
      archivos.forEach((archivo) => hash.update(archivo))
      publicos.forEach((archivo) => hash.update(readFileSync(join(publico, archivo))))
      const html = bundle['index.html']
      if (html?.type === 'asset') hash.update(String(html.source))

      const plantilla = readFileSync(fileURLToPath(new URL('./sw/sw.js', import.meta.url)), 'utf8')
      const source = plantilla
        .replace("const VERSION = '__VERSION__'", `const VERSION = ${JSON.stringify(hash.digest('hex').slice(0, 12))}`)
        .replace('const ARCHIVOS = __ARCHIVOS__', `const ARCHIVOS = ${JSON.stringify(archivos, null, 2)}`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), api, serviceWorker()],
  server: {
    port: 5001,
    open: true,
    // el índice de áreas que guarda el server no es parte de la app
    watch: { ignored: ['**/data/**'] },
  },
  build: {
    outDir: 'build',
  },
})
