// acceso a consulta.asp (agenda-api) con caché en memoria
//   c=<cuil>  -> Titular y Agentes del área del cuil
//   s=<texto> -> Agentes cuyo nombre coincide (la api corta las búsquedas amplias en ~40-50)
//   i=<ip>    -> Agentes[0].cuil del usuario de esa ip

import { completarArea, getArea as getAreaIndexada, registrarContacto } from './areas.js'
import { API_URL, CACHE_MS } from './config.js'
import { compararContactos, normalizarAgente, quitarAcentos } from './normalizar.js'

/** @import { AgenteApi, Contacto, Nivel } from './normalizar.js' */
/** @import { AreaHija } from './areas.js' */

/**
 * Respuesta de consulta.asp. Sin resultados trae { Error: 'No hay datos' }
 * @typedef {{ Titular?: { cuil?: string | number }, Agentes?: AgenteApi[], Error?: string }} RespuestaApi
 */

/** @typedef {{ contactos: Contacto[], muchos: boolean }} ResultadoBusqueda */

/**
 * @typedef {object} DatosContacto
 * @property {Contacto} contacto
 * @property {Contacto | null} jefe
 * @property {Contacto[]} companeros
 * @property {AreaHija[]} hijas áreas dependientes conocidas del área del contacto
 */

/**
 * @typedef {object} DatosArea
 * @property {Nivel & { codigo: string }} area
 * @property {Nivel[]} ruta
 * @property {AreaHija[]} hijas
 * @property {Contacto | null} titular
 * @property {Contacto[]} agentes
 */

const CACHE_MAX = 500
const MUCHOS_RESULTADOS = 40

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} codigo
   * @param {string} mensaje
   */
  constructor(status, codigo, mensaje) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
  }
}

const noDisponible = () =>
  new ApiError(502, 'api_no_disponible', 'El servicio de agenda no responde. Probá de nuevo en unos minutos.')

/**
 * @param {'c' | 's' | 'i'} tipo
 * @param {string} valor
 * @returns {Promise<RespuestaApi>}
 */
const pedir = async (tipo, valor) => {
  const url = new URL(API_URL)
  url.searchParams.set(tipo, valor)

  let response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    const error = /** @type {Error & { cause?: { code?: string } }} */ (err)
    console.error(`Error al consultar ${tipo}=${valor}:`, error.cause?.code ?? error.message)
    throw noDisponible()
  }

  // ante algunas búsquedas la api responde 500 con una página html
  const texto = await response.text()
  /** @type {RespuestaApi} */
  let data
  try {
    data = JSON.parse(texto)
  } catch {
    console.error(`Respuesta inválida para ${tipo}=${valor}: ${response.status}`)
    throw noDisponible()
  }

  if (data.Error === 'No hay datos') return { Agentes: [] }
  if (data.Error !== undefined) {
    console.error(`Error de la api para ${tipo}=${valor}:`, data.Error)
    throw noDisponible()
  }
  return data
}

/** @type {Map<string, { expira: number, promesa: Promise<RespuestaApi> }>} */
const cache = new Map()

/**
 * @param {'c' | 's' | 'i'} tipo
 * @param {string} valor
 */
const consultar = (tipo, valor) => {
  const clave = `${tipo}=${valor}`
  const guardado = cache.get(clave)
  if (guardado && guardado.expira > Date.now()) return guardado.promesa

  const promesa = pedir(tipo, valor)
  cache.delete(clave)
  cache.set(clave, { expira: Date.now() + CACHE_MS, promesa })
  const masVieja = cache.keys().next().value
  if (cache.size > CACHE_MAX && masVieja) cache.delete(masVieja)

  // los errores no se guardan
  promesa.catch(() => cache.delete(clave))
  return promesa
}

/** @param {string} texto */
const esCuil = (texto) => /^\d{2}-?\d{8}-?\d$/.test(texto)

// agentes del área a la que pertenece el cuil, con el titular primero
/**
 * @param {string} cuil
 * @returns {Promise<Contacto[]>}
 */
const getAgentesDelArea = async (cuil) => {
  const data = await consultar('c', cuil)
  const titular = String(data.Titular?.cuil ?? '')
  const agentes = (data.Agentes ?? [])
    .map((agente) => ({ ...normalizarAgente(agente), esTitular: String(agente.cuil) === titular }))
    .sort((a, b) => Number(b.esTitular) - Number(a.esTitular) || compararContactos(a, b))

  // dos pasadas: primero todos alimentan el índice, después cada uno toma de ahí su
  // cadena completa, que puede depender de lo que aportaron los demás del lote
  agentes.forEach(registrarContacto)
  agentes.forEach(completarArea)
  return agentes
}

/**
 * @param {unknown} cuilBuscado con o sin guiones
 * @returns {Promise<DatosContacto>}
 */
export const getContacto = async (cuilBuscado) => {
  const cuil = String(cuilBuscado ?? '').replace(/-/g, '')
  if (!/^\d{11}$/.test(cuil)) throw new ApiError(400, 'cuil_invalido', 'El CUIL debe tener 11 dígitos.')

  const agentes = await getAgentesDelArea(cuil)
  const contacto = agentes.find((a) => a.cuil === cuil)
  if (!contacto) throw new ApiError(404, 'no_encontrado', 'No se encontró el contacto.')

  return {
    contacto,
    jefe: contacto.esTitular ? null : (agentes.find((a) => a.esTitular) ?? null),
    companeros: agentes.filter((a) => a.cuil !== cuil),
    // las áreas que dependen de la del contacto; sólo las que el índice ya conoce
    hijas: getAreaIndexada(contacto.area.codigo)?.hijas ?? [],
  }
}

/**
 * @param {unknown} consulta apellido, nombre o CUIL
 * @returns {Promise<ResultadoBusqueda>}
 */
export const buscarContactos = async (consulta) => {
  const texto = quitarAcentos(String(consulta ?? '')).trim()

  if (esCuil(texto)) {
    try {
      const { contacto } = await getContacto(texto)
      return { contactos: [contacto], muchos: false }
    } catch (err) {
      if (err instanceof ApiError && err.codigo === 'no_encontrado') return { contactos: [], muchos: false }
      throw err
    }
  }

  // la api falla con números y no encuentra letras con tilde
  if (/\d/.test(texto)) {
    throw new ApiError(400, 'busqueda_no_soportada',
      'Buscá por apellido o nombre, o por CUIL completo (11 dígitos). No se puede buscar por número de teléfono.')
  }

  const palabras = texto.replace(/[^a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (palabras.length < 2) {
    throw new ApiError(400, 'busqueda_corta', 'Escribí al menos 2 letras.')
  }

  const data = await consultar('s', palabras)
  const contactos = (data.Agentes ?? []).map(normalizarAgente).sort(compararContactos)
  contactos.forEach(registrarContacto)
  contactos.forEach(completarArea)
  return { contactos, muchos: contactos.length >= MUCHOS_RESULTADOS }
}

// un área del índice, con sus agentes si se conoce el cuil de alguno.
// las áreas intermedias no tienen agentes propios: de ésas sólo se listan las hijas.
/**
 * @param {unknown} clave código de estructura
 * @returns {Promise<DatosArea>}
 */
export const getArea = async (clave) => {
  // la clave es el código de estructura, que identifica al área sin ambigüedad
  const indexada = getAreaIndexada(String(clave ?? '').toUpperCase())
  if (!indexada) {
    throw new ApiError(404, 'area_desconocida',
      'Todavía no se conoce esta área. Buscá un contacto que pertenezca a ella y volvé a intentar.')
  }

  const { area, ruta, hijas, cuiles } = indexada

  /** @type {Contacto[]} */
  let agentes = []
  for (const cuil of cuiles) {
    try {
      // el testigo puede haber cambiado de área desde que se lo indexó
      const traidos = await getAgentesDelArea(cuil)
      agentes = traidos.filter((a) => a.area.clave === area.clave)
      if (agentes.length > 0) break
    } catch {
      // se prueba con el siguiente testigo
    }
  }

  return {
    area,
    ruta,
    hijas,
    titular: agentes.find((a) => a.esTitular) ?? null,
    agentes: agentes.filter((a) => !a.esTitular),
  }
}

/**
 * @param {string} ip
 * @returns {Promise<string | null>}
 */
export const getCuilPorIp = async (ip) => {
  const data = await consultar('i', ip)
  return data.Agentes?.[0]?.cuil ? String(data.Agentes[0].cuil) : null
}
