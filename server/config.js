// configuración del server; se lee del entorno y de los archivos .env y .env.local de la raíz
//  API_SITE      url base de agenda-api (default http://localhost:7300/)
//  TRUST_PROXY   "true" si corre detrás de un proxy reverso que agrega X-Forwarded-For
//  USER_IP       fuerza la ip del usuario (solo para probar en desarrollo)
//  CUIL_DEFECTO  cuil a usar cuando no se encuentra el del usuario (solo para desarrollo)
//  CACHE_MINUTOS tiempo que se guardan las respuestas de la api (default 5)
//  INDICE_AREAS  archivo donde se guarda el índice de áreas (default data/areas.json; vacío para no guardarlo)
//  SEMILLA_AREAS archivo con la semilla de áreas (default ../agenda-api/db/areas.semilla.json; vacío para no cargarla)

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

for (const archivo of ['../.env.local', '../.env']) {
  try {
    process.loadEnvFile(new URL(archivo, import.meta.url))
  } catch {
    // si el archivo no existe se usan las variables del entorno
  }
}

const env = process.env

export const API_URL = new URL('api/agenda/consulta.asp', env.API_SITE ?? 'http://localhost:7300/')
export const TRUST_PROXY = env.TRUST_PROXY === 'true'
export const USER_IP = env.USER_IP || undefined
export const CUIL_DEFECTO = env.CUIL_DEFECTO || undefined
export const CACHE_MS = Number(env.CACHE_MINUTOS ?? 5) * 60 * 1000
// las rutas relativas son desde la raíz del proyecto
export const INDICE_AREAS = env.INDICE_AREAS === ''
  ? null
  : resolve(fileURLToPath(new URL('..', import.meta.url)), env.INDICE_AREAS ?? 'data/areas.json')
export const SEMILLA_AREAS = env.SEMILLA_AREAS === ''
  ? null
  : resolve(fileURLToPath(new URL('..', import.meta.url)), env.SEMILLA_AREAS ?? '../agenda-api/db/areas.semilla.json')
