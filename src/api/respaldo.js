// respaldo de las respuestas de la agenda en el navegador (IndexedDB), para seguir
// mostrando fichas, búsquedas y áreas cuando agenda-api no responde (sin
// red, API caída). Se usa IndexedDB y no localStorage porque cada ficha trae a todos
// los compañeros del área y localStorage se llena enseguida; y no la Cache Storage porque
// ésa sólo existe en páginas https.
import { crearEstado } from './estado'

const BASE = 'agenda'
const ALMACEN = 'respaldo'
// alcanza para las fichas de un uso normal; al pasarse se borran las más viejas
const MAX_ENTRADAS = 300

// fecha de la copia más vieja que se está mostrando; null si todo lo que se ve es actual
export const respaldoEnUso = crearEstado(null)

let base = null

// sin IndexedDB (navegador viejo, modo privado de algunos navegadores) no hay respaldo,
// pero la app funciona igual
const abrir = () => {
  base ??= new Promise((resolver) => {
    try {
      const pedido = indexedDB.open(BASE, 1)
      pedido.onupgradeneeded = () => {
        pedido.result.createObjectStore(ALMACEN, { keyPath: 'clave' }).createIndex('guardado', 'guardado')
      }
      pedido.onsuccess = () => resolver(pedido.result)
      pedido.onerror = () => resolver(null)
    } catch {
      resolver(null)
    }
  })
  return base
}

const esperar = (pedido) =>
  new Promise((resolver, rechazar) => {
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rechazar(pedido.error)
  })

const guardar = async (clave, datos) => {
  const db = await abrir()
  if (!db) return
  try {
    const almacen = db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN)
    await esperar(almacen.put({ clave, guardado: Date.now(), datos }))
    // se borran las más viejas, recorriendo el índice por fecha
    const sobran = (await esperar(almacen.count())) - MAX_ENTRADAS
    if (sobran <= 0) return
    const viejas = await esperar(almacen.index('guardado').getAllKeys(null, sobran))
    viejas.forEach((vieja) => almacen.delete(vieja))
  } catch {
    // sin lugar o con la base bloqueada, simplemente no se respalda
  }
}

const leer = async (clave) => {
  const db = await abrir()
  if (!db) return undefined
  try {
    return await esperar(db.transaction(ALMACEN).objectStore(ALMACEN).get(clave))
  } catch {
    return undefined
  }
}

// cuándo se guardó la copia de una consulta, o null si no hay
export const guardadoEl = async (clave) => (await leer(clave))?.guardado ?? null

// errores en los que la agenda no respondió; los 4xx (cuil inválido, búsqueda corta) son
// respuestas válidas y no se reemplazan por una copia
const sinConexion = (err) =>
  err?.codigo === 'sin_conexion' || err?.codigo === 'api_no_disponible' || err?.status >= 500

// hace la consulta y guarda la respuesta; si la agenda no responde, devuelve la última
// copia guardada y avisa (respaldoEnUso) que lo que se ve puede estar desactualizado
export const conRespaldo = async (clave, consulta) => {
  try {
    const datos = await consulta()
    respaldoEnUso.set(null)
    guardar(clave, datos)
    return datos
  } catch (err) {
    if (!sinConexion(err)) throw err
    const copia = await leer(clave)
    if (!copia) throw err
    respaldoEnUso.set(Math.min(respaldoEnUso.get() ?? copia.guardado, copia.guardado))
    return copia.datos
  }
}
