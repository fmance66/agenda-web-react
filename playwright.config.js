import { defineConfig } from '@playwright/test'

// e2e (npm run test:e2e): el server de producción (server/index.js) con el build, consultando
// a una API falsa (e2e/api-falsa.mjs), así no necesitan la base. Usan el Edge instalado
// (channel msedge): no hace falta bajar navegadores
const API_FALSA = 4011
const APP = 4174

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP}/`,
    channel: 'msedge',
    locale: 'es-AR',
    // el service worker guarda la app: se bloquea para que cada prueba arranque limpia
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: 'node e2e/api-falsa.mjs',
      url: `http://localhost:${API_FALSA}/api/agenda/consulta.asp?i=1`,
      env: { PUERTO: String(API_FALSA) },
    },
    {
      // INDICE_AREAS vacío: el índice que aprenden las pruebas no se guarda en data/. La semilla es
      // la de los e2e: la API falsa no tiene las áreas de agenda-api
      command: 'npm run build && node server/index.js',
      url: `http://localhost:${APP}/`,
      env: { PORT: String(APP), API_SITE: `http://localhost:${API_FALSA}/`, INDICE_AREAS: '', SEMILLA_AREAS: 'e2e/areas.semilla.json' },
      timeout: 180_000,
    },
  ],
})
