import axios from 'axios'
import { conRespaldo } from './respaldo'

// el server de la agenda (server/api.js) es el único que habla con agenda-api
const http = axios.create({ baseURL: '/api', timeout: 15000 })

export class AgendaError extends Error {
  constructor(mensaje, codigo, status) {
    super(mensaje)
    this.codigo = codigo
    this.status = status
  }
}

const get = async (url, config) => {
  try {
    const { data } = await http.get(url, config)
    return data
  } catch (err) {
    if (axios.isCancel(err)) throw err
    const data = err.response?.data
    throw new AgendaError(
      data?.mensaje ?? 'No se pudo conectar con el servidor de la agenda.',
      data?.error ?? 'sin_conexion',
      err.response?.status,
    )
  }
}

// cada respuesta queda respaldada en el navegador: si la agenda no responde se muestra la
// última copia (ver respaldo.js)

// { ip, cuil, porDefecto }
export const getUsuario = () => conRespaldo('usuario', () => get('/me'))

// { contactos, muchos }
export const buscarContactos = (q, signal) =>
  conRespaldo(`busqueda:${q.trim().toLowerCase()}`, () => get('/contactos', { params: { q }, signal }))

// { contacto, jefe, companeros }
export const getContacto = (cuil, signal) =>
  conRespaldo(`contacto:${cuil.replace(/-/g, '')}`, () => get(`/contactos/${encodeURIComponent(cuil)}`, { signal }))

// { area, ruta, hijas, titular, agentes }
export const getArea = (clave, signal) =>
  conRespaldo(`area:${clave.toUpperCase()}`, () => get(`/areas/${encodeURIComponent(clave)}`, { signal }))

// { areas: [{ clave, padre, nombre, sigla, conAgentes }] }
export const getEstructura = (signal) => conRespaldo('estructura', () => get('/estructura', { signal }))
