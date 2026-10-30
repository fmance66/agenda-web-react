// ip del usuario a partir del request (el navegador no puede conocer su propia ip)

import { createSocket } from 'node:dgram'
import { lookup } from 'node:dns/promises'
import { API_URL, TRUST_PROXY, USER_IP } from './config.js'

/** @import { IncomingMessage } from 'node:http' */

/** @param {string} ip */
const isLoopback = (ip) => ip === '127.0.0.1' || ip === '::1'

/** @param {string} ip */
const sinPrefijoV4 = (ip) => ip.replace(/^::ffff:/, '')

// ip de esta máquina en la interfaz por la que se llega a la api (ethernet, wi-fi, etc.);
// un socket udp "conectado" solo consulta la tabla de ruteo, no envía nada
const getLocalIp = async () => {
  try {
    const { address } = await lookup(API_URL.hostname, { family: 4 })
    const socket = createSocket('udp4')
    try {
      await /** @type {Promise<void>} */ (new Promise((resolve, reject) => {
        socket.once('error', reject)
        socket.connect(Number(API_URL.port) || 443, address, () => resolve())
      }))
      return socket.address().address
    } finally {
      socket.close()
    }
  } catch {
    return undefined
  }
}

// true si el request viene de esta misma máquina o de un proxy confiable.
// limita tanto a X-Forwarded-For como a la consulta por una ip cualquiera
/** @param {IncomingMessage} req */
export const esConfiable = (req) =>
  TRUST_PROXY || isLoopback(sinPrefijoV4(req.socket.remoteAddress ?? ''))

// X-Forwarded-For solo se acepta si viene de un proxy confiable o de esta misma máquina
/** @param {IncomingMessage} req */
export const getClientIp = async (req) => {
  if (USER_IP) return USER_IP

  const remote = sinPrefijoV4(req.socket.remoteAddress ?? '')
  // con varios proxies puede llegar más de una cabecera: vale la primera
  const forwarded = [req.headers['x-forwarded-for'] ?? []].flat()[0]

  let ip = remote
  if (forwarded && (TRUST_PROXY || isLoopback(remote))) {
    ip = sinPrefijoV4(forwarded.split(',')[0].trim())
  }

  // si el navegador corre en esta misma máquina se usa su ip de red
  return isLoopback(ip) ? ((await getLocalIp()) ?? ip) : ip
}
