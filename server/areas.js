// índice de áreas armado con lo que se ve pasar.
//
// consulta.asp no tiene forma de listar áreas ni de pedir los agentes de un área
// (sólo acepta c=cuil, s=texto e i=ip), así que el árbol no se puede bajar desde
// la raíz. Lo que sí trae cada agente es el código de estructura de su área, que es
// posicional y anidado, y con eso se reconstruye la cadena completa hasta la raíz
// aunque nadie haya pasado por los niveles intermedios.
//
// De descripcion se sacan sólo dos nombres (el área propia y el ancestro del prefijo
// [1-5]) y dos siglas, que son las de los PADRES de esos dos nodos. Por eso la sigla
// de un área se aprende de rebote: es la que declaran sus hijas. Un nodo recién creado
// puede no tener nombre ni sigla todavía.
//
// Consecuencias: el índice arranca vacío y sólo conoce las ramas por las que alguien
// pasó. De un área sólo se conocen agentes si se vio a alguien cuya área propia es esa;
// de las áreas intermedias se conocen las hijas, pero no su gente.
//
// Para no perderlo al reiniciar, persistirIndice lo guarda en un archivo JSON unos
// segundos después de cada cambio y lo vuelve a cargar al arrancar.

import { mkdirSync, readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { codigoPadre, esCodigoArea } from './normalizar.js'

/** @import { Contacto, Nivel } from './normalizar.js' */

/**
 * Un área del índice
 * @typedef {object} Item
 * @property {string} codigo
 * @property {string} nombre
 * @property {string} sigla
 * @property {string | null} padre código del padre; null en la raíz
 * @property {Set<string>} hijas códigos de las hijas conocidas
 * @property {string[]} cuiles testigos: gente vista en el área, la más reciente primero
 */

/**
 * Un área en una lista (hijas de otra, organigrama)
 * @typedef {object} AreaHija
 * @property {string} clave
 * @property {string} nombre
 * @property {string} sigla
 * @property {boolean} conAgentes si se conoce a alguien del área
 */

/** @typedef {AreaHija & { padre: string | null }} AreaEstructura */

/**
 * Lo que se guarda del índice (exportarIndice / importarIndice)
 * @typedef {{ version: number, areas: { codigo: string, nombre: string, sigla: string, cuiles: string[] }[] }} IndiceAreas
 */

// tope de memoria del índice. La estructura real ronda las 3300 áreas, así que el margen
// es amplio
const MAX_AREAS = 10000
const MAX_TESTIGOS = 5
const MAX_PROFUNDIDAD = 20

/** @type {Map<string, Item>} */
const areas = new Map()

// cada cambio al índice lo marca para guardar (ver persistirIndice)
/** @type {() => void} */
let alCambiar = () => {}

/**
 * @param {string} codigo
 * @returns {Item}
 */
const nodo = (codigo) => {
  let item = areas.get(codigo)
  if (!item) {
    item = { codigo, nombre: '', sigla: '', padre: codigoPadre(codigo), hijas: new Set(), cuiles: [] }
    if (areas.size < MAX_AREAS) {
      areas.set(codigo, item)
      alCambiar()
    }
  }
  return item
}

// nombre y sigla se anotan la primera vez que se ven y no se pisan
/**
 * @param {Item} item
 * @param {'nombre' | 'sigla'} campo
 * @param {string | undefined} valor
 */
const anotar = (item, campo, valor) => {
  if (item[campo] || !valor) return
  item[campo] = valor
  alCambiar()
}

// crea el área y todos los ancestros que su código implica, enlazando padre -> hija
/** @param {string} codigo */
const enlazar = (codigo) => {
  const item = nodo(codigo)
  let hija = item
  for (let i = 0; i < MAX_PROFUNDIDAD && hija.padre; i++) {
    const padre = nodo(hija.padre)
    padre.hijas.add(hija.codigo)
    hija = padre
  }
  return item
}

// la única fuente de la sigla de un área son sus hijas, que declaran la de su padre
/**
 * @param {Item} item
 * @param {string | undefined} sigla
 */
const anotarSiglaDelPadre = (item, sigla) => {
  if (item.padre) anotar(nodo(item.padre), 'sigla', sigla)
}

/** @param {Pick<Contacto, 'cuil' | 'area'>} contacto */
export const registrarContacto = (contacto) => {
  const { codigo, nombre, siglaPadre, ancestro } = contacto.area
  if (!esCodigoArea(codigo)) return

  const item = enlazar(codigo)
  anotar(item, 'nombre', nombre)
  anotarSiglaDelPadre(item, siglaPadre)

  if (ancestro) {
    const arriba = enlazar(ancestro.codigo)
    anotar(arriba, 'nombre', ancestro.nombre)
    anotarSiglaDelPadre(arriba, ancestro.siglaPadre)
  }

  // el testigo visto más recientemente va primero y, con la lista llena, se descarta el más
  // viejo: si los testigos dejan el área (traslados, bajas), el área vuelve a tener a quién
  // pedirle su gente en cuanto se consulta a alguien que sí está
  if (item.cuiles[0] !== contacto.cuil) {
    item.cuiles = [contacto.cuil, ...item.cuiles.filter((cuil) => cuil !== contacto.cuil)].slice(0, MAX_TESTIGOS)
    alCambiar()
  }
}

/**
 * @param {Item} item
 * @returns {AreaHija & { codigo: string }}
 */
const resumir = (item) => ({
  clave: item.codigo,
  codigo: item.codigo,
  sigla: item.sigla,
  nombre: item.nombre,
  conAgentes: item.cuiles.length > 0,
})

// cadena desde la raíz hasta el área, incluyéndola
/**
 * @param {string} codigo
 * @returns {Nivel[]}
 */
const cadena = (codigo) => {
  /** @type {Nivel[]} */
  const ruta = []
  let item = areas.get(codigo)
  for (let i = 0; i < MAX_PROFUNDIDAD && item; i++) {
    ruta.unshift({ clave: item.codigo, nombre: item.nombre, sigla: item.sigla })
    item = item.padre ? areas.get(item.padre) : undefined
  }
  return ruta
}

// completa lo que el contacto no puede saber por sí solo: su sigla propia y la cadena
// entera. Se corre después de registrar a todo el lote, para que cada uno aproveche lo
// que aportaron los demás
/** @param {Contacto} contacto */
export const completarArea = (contacto) => {
  const item = areas.get(contacto.area.codigo)
  if (!item) return
  contacto.area.sigla = item.sigla
  contacto.area.niveles = cadena(item.codigo)
}

/**
 * @param {AreaHija} a
 * @param {AreaHija} b
 */
const porNombre = (a, b) => (a.nombre || a.sigla).localeCompare(b.nombre || b.sigla, 'es')

/** @param {string} codigo */
export const getArea = (codigo) => {
  const item = areas.get(codigo)
  if (!item) return null

  const hijas = [...item.hijas]
    .map((hija) => areas.get(hija))
    .filter((hija) => hija !== undefined)
    .map(resumir)
    .sort(porNombre)

  const ruta = cadena(item.codigo)

  return {
    area: { clave: item.codigo, codigo: item.codigo, sigla: item.sigla, nombre: item.nombre },
    ruta: ruta.slice(0, -1),
    hijas,
    cuiles: [...item.cuiles],
  }
}

// todas las áreas conocidas en una lista plana, para el organigrama del front: cada una con
// la clave de su padre, que el front usa para armar el árbol. El orden no importa
/** @returns {{ areas: AreaEstructura[] }} */
export const getEstructura = () => ({
  areas: [...areas.values()].map((item) => ({
    clave: item.codigo,
    padre: item.padre && areas.has(item.padre) ? item.padre : null,
    nombre: item.nombre,
    sigla: item.sigla,
    conAgentes: item.cuiles.length > 0,
  })),
})

// padre e hijas no se guardan: salen del código al volver a enlazar cada área
/** @returns {IndiceAreas} */
const exportar = () => ({
  version: 1,
  areas: [...areas.values()].map(({ codigo, nombre, sigla, cuiles }) => ({ codigo, nombre, sigla, cuiles })),
})

// el archivo puede venir de otra versión o estar editado a mano: se toma lo que sea válido
/** @param {unknown} datos cualquier cosa: se toma lo que tenga la forma de IndiceAreas */
const importar = (datos) => {
  const indice = /** @type {Partial<IndiceAreas> | null | undefined} */ (datos)
  if (indice?.version !== 1 || !Array.isArray(indice.areas)) return
  for (const guardada of /** @type {Partial<IndiceAreas['areas'][number]>[]} */ (indice.areas)) {
    if (!esCodigoArea(guardada?.codigo)) continue
    const item = enlazar(guardada.codigo)
    if (typeof guardada.nombre === 'string') anotar(item, 'nombre', guardada.nombre)
    if (typeof guardada.sigla === 'string') anotar(item, 'sigla', guardada.sigla)
    if (Array.isArray(guardada.cuiles)) {
      for (const cuil of guardada.cuiles) {
        if (typeof cuil === 'string' && item.cuiles.length < MAX_TESTIGOS && !item.cuiles.includes(cuil)) {
          item.cuiles.push(cuil)
        }
      }
    }
  }
}

// carga el índice guardado en archivo y a partir de ahí lo guarda, como mucho una vez
// cada `demora` ms. Se escribe a un temporal y se renombra, para que un corte a mitad de
// la escritura no deje el archivo roto. Lo que cambie en los últimos segundos antes de
// cerrar el server se pierde, pero se vuelve a aprender con el uso
/**
 * @param {string} archivo
 * @param {number} [demora] ms entre guardados
 */
export const persistirIndice = (archivo, demora = 5000) => {
  try {
    importar(JSON.parse(readFileSync(archivo, 'utf8')))
    console.log(`Índice de áreas: ${areas.size} áreas cargadas de ${archivo}`)
  } catch (err) {
    const error = /** @type {NodeJS.ErrnoException} */ (err)
    if (error.code !== 'ENOENT') console.error(`No se pudo leer el índice de áreas (${archivo}):`, error.message)
  }
  mkdirSync(dirname(archivo), { recursive: true })

  // las escrituras van en fila, así dos guardados seguidos no pisan el mismo temporal
  let programado = false
  let escritura = Promise.resolve()
  const guardar = () => {
    programado = false
    // con sangría, para poder leer y editar el archivo a mano
    const contenido = JSON.stringify(exportar(), null, 2)
    const temporal = `${archivo}.tmp`
    escritura = escritura
      .then(() => writeFile(temporal, contenido))
      .then(() => rename(temporal, archivo))
      .catch((err) => console.error(`No se pudo guardar el índice de áreas (${archivo}):`, err.message))
  }

  alCambiar = () => {
    if (programado) return
    programado = true
    // unref: el timer pendiente no impide que el proceso termine
    setTimeout(guardar, demora).unref()
  }
}

// carga la semilla de áreas que genera agenda-api (db/areas.semilla.json), para que una
// instalación nueva no arranque con el índice vacío. Va después de persistirIndice a
// propósito: importar no pisa lo que ya está, así que lo que el server aprendió y guardó
// gana, y la semilla sólo rellena lo que falta
/** @param {string} archivo */
export const cargarSemilla = (archivo) => {
  const antes = areas.size
  try {
    importar(JSON.parse(readFileSync(archivo, 'utf8')))
    console.log(`Índice de áreas: ${areas.size - antes} áreas nuevas de la semilla ${archivo}`)
  } catch (err) {
    const error = /** @type {NodeJS.ErrnoException} */ (err)
    if (error.code !== 'ENOENT') console.error(`No se pudo leer la semilla de áreas (${archivo}):`, error.message)
  }
}

// sólo para los tests
export const vaciarIndice = () => areas.clear()
