// rutas de /api; lo usan server/index.js (producción) y vite.config.js (desarrollo)
//   GET /api/me                -> { ip, cuil, porDefecto }
//   GET /api/me/data           -> { contacto, jefe, companeros, hijas } del usuario
//   GET /api/contactos?q=texto -> { contactos, muchos }
//   GET /api/contactos/:cuil   -> { contacto, jefe, companeros, hijas }
//   GET /api/areas/:clave      -> { area, ruta, hijas, titular, agentes }
//   GET /api/estructura        -> { areas: [{ clave, padre, nombre, sigla, conAgentes }] }
//   GET /api/ip/:ip            -> { ip, cuil } de esa ip (solo desde esta máquina o proxy confiable)
// los errores responden { error, mensaje }

import { ApiError, buscarContactos, getArea, getContacto, getCuilPorIp } from './agenda.js'
import { cargarSemilla, getEstructura, persistirIndice } from './areas.js'
import { CUIL_DEFECTO, INDICE_AREAS, SEMILLA_AREAS } from './config.js'
import { esConfiable, getClientIp } from './ip.js'

/** @import { IncomingMessage, ServerResponse } from 'node:http' */

if (INDICE_AREAS) persistirIndice(INDICE_AREAS)
if (SEMILLA_AREAS) cargarSemilla(SEMILLA_AREAS)

/**
 * @param {ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

const ES_IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

/** @param {IncomingMessage} req */
const getUsuario = async (req) => {
  const ip = await getClientIp(req)
  let cuil = null
  try {
    cuil = await getCuilPorIp(ip)
  } catch {
    // sin la api no se puede identificar al usuario, pero la app sigue funcionando
  }
  if (cuil) return { ip, cuil, porDefecto: false }
  return { ip, cuil: CUIL_DEFECTO ?? null, porDefecto: Boolean(CUIL_DEFECTO) }
}

/**
 * @param {IncomingMessage & { originalUrl?: string }} req originalUrl: montado con connect (Vite)
 * @param {ServerResponse} res
 */
export const handleApi = async (req, res) => {
  // montado con connect (Vite), req.url llega sin el prefijo /api
  const url = new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost')

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'metodo_no_permitido', mensaje: 'Método no permitido.' })
    return
  }

  try {
    if (url.pathname === '/api/me') {
      sendJson(res, 200, await getUsuario(req))
      return
    }
    // atajo de /api/contactos/<cuil del usuario>, para no tener que pedir antes /api/me
    if (url.pathname === '/api/me/data') {
      const { cuil } = await getUsuario(req)
      if (!cuil) {
        sendJson(res, 404, { error: 'usuario_desconocido', mensaje: 'No se pudo identificar al usuario.' })
        return
      }
      sendJson(res, 200, await getContacto(cuil))
      return
    }
    if (url.pathname === '/api/contactos') {
      sendJson(res, 200, await buscarContactos(url.searchParams.get('q')))
      return
    }
    const contacto = url.pathname.match(/^\/api\/contactos\/([^/]+)$/)
    if (contacto) {
      sendJson(res, 200, await getContacto(decodeURIComponent(contacto[1])))
      return
    }
    // cuil de una ip cualquiera. se restringe igual que X-Forwarded-For: si estuviera
    // abierta a cualquier cliente la app serviría para mapear ip -> persona
    const porIp = url.pathname.match(/^\/api\/ip\/([^/]+)$/)
    if (porIp) {
      if (!esConfiable(req)) {
        sendJson(res, 403, { error: 'no_permitido', mensaje: 'La consulta por ip solo se permite en forma local.' })
        return
      }
      const ip = decodeURIComponent(porIp[1])
      if (!ES_IPV4.test(ip)) {
        sendJson(res, 400, { error: 'ip_invalida', mensaje: 'Indicá una dirección ip v4.' })
        return
      }
      sendJson(res, 200, { ip, cuil: await getCuilPorIp(ip) })
      return
    }
    // todas las áreas conocidas, para el organigrama
    if (url.pathname === '/api/estructura') {
      sendJson(res, 200, getEstructura())
      return
    }
    const area = url.pathname.match(/^\/api\/areas\/([^/]+)$/)
    if (area) {
      sendJson(res, 200, await getArea(decodeURIComponent(area[1])))
      return
    }
    sendJson(res, 404, { error: 'ruta_inexistente', mensaje: 'Ruta inexistente.' })
  } catch (err) {
    if (err instanceof ApiError) {
      sendJson(res, err.status, { error: err.codigo, mensaje: err.message })
    } else {
      console.error('Error inesperado en', url.pathname, err)
      sendJson(res, 500, { error: 'error_interno', mensaje: 'Ocurrió un error inesperado.' })
    }
  }
}
