// convierte las respuestas de consulta.asp al modelo que usa el front. Los tipos de acá son
// la fuente de verdad del modelo que devuelve /api

/**
 * Un agente tal como lo devuelve consulta.asp. Todo puede faltar o venir con otro tipo
 * @typedef {object} AgenteApi
 * @property {string | number} [cuil]
 * @property {string} [nombre] "APELLIDO, NOMBRE"
 * @property {string} [funcion]
 * @property {string} [cod_sexo]
 * @property {string} [email]
 * @property {{ codigo?: string, descripcion?: string }} [area] descripcion: "SEC. X (DV PRUE) --> DEPTO. Y (GE DESS)"
 * @property {Record<string, unknown>[]} [Telefonos] campos con nombre: "Línea", "RPV", "Interno"...
 */

/** @typedef {'fijo' | 'movil' | 'interno' | 'rpv'} TipoTelefono */
/** @typedef {{ tipo: TipoTelefono, numero: string }} NumeroCorto */

/**
 * @typedef {object} Telefono
 * @property {TipoTelefono} tipo
 * @property {string} numero
 * @property {string} texto
 * @property {string | null} href null en internos y RPV, que no se pueden marcar desde afuera
 * @property {NumeroCorto | null} extra interno o RPV asociado al número principal
 */

/** @typedef {{ clave: string, nombre: string, sigla: string }} Nivel */

/**
 * @typedef {object} AreaContacto
 * @property {string} codigo código de estructura (A0MLAA0200)
 * @property {string} clave el mismo código, o vacío si no es válido
 * @property {string} nombre
 * @property {string} sigla la completa el índice (areas.js)
 * @property {string} siglaPadre la de su padre: es la que trae descripcion
 * @property {{ codigo: string, nombre: string, siglaPadre: string } | null} ancestro el del prefijo [1-5], si descripcion lo nombra
 * @property {Nivel[]} niveles cadena desde la raíz hasta el área; la completa el índice
 */

/**
 * @typedef {object} Contacto
 * @property {string} cuil
 * @property {string} apellido
 * @property {string} nombre
 * @property {string} funcion
 * @property {string} sexo
 * @property {string} email
 * @property {boolean} esTitular
 * @property {AreaContacto} area
 * @property {Telefono[]} telefonos
 */

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'a', 'al'])
const ROMANOS = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i

// la api devuelve "?" en lugar de "Ñ" (se pierde en el origen); en los nombres nunca hay un "?" real
/** @param {string} texto */
const repararEnie = (texto) => texto.replace(/\?/g, 'Ñ')

/** @param {unknown} valor */
const limpiar = (valor) => String(valor ?? '').replace(/\s+/g, ' ').trim()

/** @param {string} palabra */
const capitalizarPalabra = (palabra) =>
  palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1).toLocaleLowerCase('es')

// "SEC. CONT. D/PERFORMANCE DE BASE DE DATOS" -> "Sec. Cont. D/Performance de Base de Datos"
/** @param {unknown} texto */
export const tituloPropio = (texto) =>
  limpiar(texto)
    .split(' ')
    .map((palabra, i) => {
      if (ROMANOS.test(palabra)) return palabra.toUpperCase()
      if (i > 0 && PARTICULAS.has(palabra.toLowerCase())) return palabra.toLowerCase()
      return palabra.split(/([/\-'])/).map(capitalizarPalabra).join('')
    })
    .join(' ')

// "LIDER DE PROYECTO" -> "Lider de proyecto"
/** @param {unknown} texto */
export const oracion = (texto) => {
  const s = limpiar(texto).toLocaleLowerCase('es')
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1)
}

// "APELLIDO, NOMBRE" -> { apellido, nombre }
/** @param {unknown} nombreCompleto */
export const separarNombre = (nombreCompleto) => {
  const texto = repararEnie(limpiar(nombreCompleto))
  const i = texto.indexOf(',')
  if (i < 0) return { apellido: tituloPropio(texto), nombre: '' }
  return {
    apellido: tituloPropio(texto.slice(0, i)),
    nombre: tituloPropio(texto.slice(i + 1)),
  }
}

/** @param {string} texto */
export const quitarAcentos = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

// el código de estructura es posicional y anidado: cada segmento agrega un nivel.
// A000000000 (raíz) > A0M0000000 (subgerencia general) > A0ML000000 (gerencia) >
// A0MLA00000 (depto) > A0MLAA0000 (división) > A0MLAA0200 (sección).
// Los tres primeros niveles de debajo de la raíz son de un carácter cada uno: gerencia
// general (AA00: GG ADMI), subgerencia general (AAB0) y gerencia (AABB). Cualquiera
// puede faltar: A0A0 es una subgerencia que depende directo de la raíz, y AA0E una gerencia
// que depende directo de la GG ADMI
const SEGMENTOS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 8], [8, 10]]
const LARGO_CODIGO = 10

/**
 * @param {unknown} codigo
 * @returns {codigo is string}
 */
export const esCodigoArea = (codigo) => typeof codigo === 'string' && codigo.length === LARGO_CODIGO

// el padre sale de poner en cero el último segmento con contenido; la raíz no tiene padre
/**
 * @param {unknown} codigo
 * @returns {string | null}
 */
export const codigoPadre = (codigo) => {
  if (!esCodigoArea(codigo)) return null
  for (let i = SEGMENTOS.length - 1; i >= 1; i--) {
    const [desde, hasta] = SEGMENTOS[i]
    if (/[^0]/.test(codigo.slice(desde, hasta))) {
      return codigo.slice(0, desde) + '0'.repeat(hasta - desde) + codigo.slice(hasta)
    }
  }
  return null
}

// el ancestro que describe descripcion además del área propia: el del prefijo [1-5]
/**
 * @param {unknown} codigo
 * @returns {string | null}
 */
export const codigoAncestro = (codigo) =>
  esCodigoArea(codigo) ? codigo.slice(0, 5) + '0'.repeat(LARGO_CODIGO - 5) : null

// cada parte de descripcion es "NOMBRE (SIGLA)", pero la sigla NO es la del área: es la de
// su padre. "Sec. Imple. y Mant. D/Base D/Datos (DV PRUE)" es una sección que cuelga de la
// división DV PRUE, que a su vez se llama "Div. Administracion de Base de Datos". Por eso
// varias secciones hermanas repiten la misma sigla.
/** @param {string} parte */
const parsearNivel = (parte) => {
  const m = parte.match(/^(.*?)\s*\(([^()]+)\)$/)
  return m
    ? { nombre: tituloPropio(repararEnie(m[1])), siglaPadre: limpiar(m[2]).toUpperCase() }
    : { nombre: tituloPropio(repararEnie(parte)), siglaPadre: '' }
}

// descripcion sólo nombra dos nodos de la cadena: el área propia del contacto (primera
// parte) y el ancestro del prefijo [1-5] (última). Los niveles intermedios -la división a
// la que pertenece la sección- no vienen nunca, y los reconstruye areas.js desde el código.
// sigla y niveles quedan vacíos acá: los completa el índice, que es quien conoce la cadena.
/**
 * @param {AgenteApi['area']} area
 * @returns {AreaContacto}
 */
export const parsearArea = (area) => {
  const codigo = limpiar(area?.codigo)
  const partes = limpiar(area?.descripcion).split('-->').map((parte) => parte.trim()).filter(Boolean)

  const propia = partes.length > 0 ? parsearNivel(partes[0]) : { nombre: '', siglaPadre: '' }
  const codAncestro = codigoAncestro(codigo)
  const ancestro = partes.length > 1 && codAncestro && codAncestro !== codigo
    ? { codigo: codAncestro, ...parsearNivel(partes[partes.length - 1]) }
    : null

  return {
    codigo,
    clave: esCodigoArea(codigo) ? codigo : '',
    nombre: propia.nombre,
    sigla: '',
    siglaPadre: propia.siglaPadre,
    ancestro,
    niveles: [],
  }
}

/** @param {unknown} valor */
const soloDigitos = (valor) => limpiar(valor).replace(/\D/g, '')

// números de 10 dígitos de CABA/GBA: 1143475555 -> (011) 4347-5555
/** @param {string} numero */
const formatearFijo = (numero) =>
  /^11\d{8}$/.test(numero) ? `(011) ${numero.slice(2, 6)}-${numero.slice(6)}` : numero

/** @param {string} numero */
const formatearMovil = (numero) =>
  /^11\d{8}$/.test(numero) ? `11 ${numero.slice(2, 6)}-${numero.slice(6)}` : numero

// campos que trae cada teléfono: número principal y número corto asociado
/** @type {Record<string, TipoTelefono | undefined>} */
const PRINCIPALES = { 'Línea': 'fijo', 'Línea (I)': 'fijo', 'Disp. WIN': 'movil' }
/** @type {Record<string, TipoTelefono | undefined>} */
const CORTOS = { 'RPV': 'rpv', 'Interno': 'interno', 'WIN': 'interno' }

// valores sin datos: vacíos, "#" o de 3 dígitos o menos
/** @param {string} numero */
const valido = (numero) => numero.length > 3

/**
 * @param {Record<string, unknown>[]} [telefonos]
 * @returns {Telefono[]}
 */
export const parsearTelefonos = (telefonos = []) => {
  /** @type {Map<string, Telefono>} */
  const resultado = new Map()

  for (const telefono of telefonos) {
    /** @type {NumeroCorto | undefined} */
    let principal
    /** @type {NumeroCorto | undefined} */
    let corto

    for (const [campo, valor] of Object.entries(telefono)) {
      if (campo.startsWith('$')) continue
      const numero = soloDigitos(valor)
      if (!valido(numero)) continue

      const principalDelCampo = PRINCIPALES[campo]
      const cortoDelCampo = CORTOS[campo]
      if (principalDelCampo) principal = { tipo: principalDelCampo, numero }
      else if (cortoDelCampo) corto = { tipo: cortoDelCampo, numero }
    }

    /** @type {Telefono | undefined} */
    let item
    if (principal) {
      const movil = principal.tipo === 'movil'
      item = {
        tipo: principal.tipo,
        numero: principal.numero,
        texto: movil ? formatearMovil(principal.numero) : formatearFijo(principal.numero),
        href: `tel:+54${movil ? '9' : ''}${principal.numero}`,
        extra: corto ?? null,
      }
    } else if (corto) {
      item = { tipo: corto.tipo, numero: corto.numero, texto: corto.numero, href: null, extra: null }
    }

    // la api repite el mismo teléfono varias veces
    if (item) resultado.set(`${item.tipo}:${item.numero}:${item.extra?.numero ?? ''}`, item)
  }

  // primero los fijos, después móviles y números cortos
  /** @type {Record<TipoTelefono, number>} */
  const orden = { fijo: 0, movil: 1, interno: 2, rpv: 3 }
  return [...resultado.values()].sort((a, b) => orden[a.tipo] - orden[b.tipo])
}

/**
 * esTitular lo decide quien consulta: sólo la consulta por cuil sabe quién es el titular
 * @param {AgenteApi} agente
 * @returns {Contacto}
 */
export const normalizarAgente = (agente) => ({
  cuil: limpiar(agente.cuil),
  ...separarNombre(agente.nombre),
  funcion: oracion(agente.funcion),
  sexo: limpiar(agente.cod_sexo),
  email: limpiar(agente.email).toLowerCase(),
  area: parsearArea(agente.area),
  esTitular: false,
  telefonos: parsearTelefonos(agente.Telefonos),
})

// ordena por apellido y nombre
/**
 * @param {{ apellido: string, nombre: string }} a
 * @param {{ apellido: string, nombre: string }} b
 */
export const compararContactos = (a, b) =>
  a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es')
