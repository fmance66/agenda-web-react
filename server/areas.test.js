import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { completarArea, getArea, getEstructura, registrarContacto, vaciarIndice } from './areas.js'
import { normalizarAgente } from './normalizar.js'

// un área que el test sabe que está en el índice (getArea devuelve null si no)
/** @param {string} codigo */
const conocida = (codigo) => {
  const area = getArea(codigo)
  assert.ok(area, `no está el área ${codigo}`)
  return area
}

/**
 * @param {string} cuil
 * @param {string} codigo
 * @param {string} descripcion
 */
const agente = (cuil, codigo, descripcion) =>
  normalizarAgente({ cuil, nombre: 'PEREZ, JUAN', funcion: 'ANALISTA', area: { codigo, descripcion } })

// una rama de GE DESS: dos secciones hermanas bajo la división de la que descripcion
// nunca habla. El nombre del departamento viene en las tres, la división sólo en la de su jefe
const DEPTO = 'DEPTO. ADMIN. D/SOFT. Y HARDW. D/SIST. CENTR. (GE DESS)'
const primero = () => agente('20000000019', 'A0MLAA0200', `SEC. IMPLE. Y MANT. D/BASE D/DATOS (DV PRUE) --> ${DEPTO}`)
const segundo = () => agente('27000000028', 'A0MLAA0300', `SEC. CONT. D/PERFORMANCE DE BASE DE DATOS (DV PRUE) --> ${DEPTO}`)
const roselli = () => agente('20000000001', 'A0MLAA0000', `DIV. ADMINISTRACION DE BASE DE DATOS (DE ASYH) --> ${DEPTO}`)

/** @param {...import('./normalizar.js').Contacto} contactos */
const registrar = (...contactos) => {
  contactos.forEach(registrarContacto)
  contactos.forEach(completarArea)
  return contactos
}

beforeEach(vaciarIndice)

test('el área desconocida no está en el índice', () => {
  assert.equal(getArea('A0MLAA0200'), null)
})

test('un solo contacto reconstruye la cadena entera desde el código', () => {
  const [contacto] = registrar(primero())

  // descripcion sólo nombra dos nodos, pero el código implica seis, hasta la raíz
  assert.deepEqual(contacto.area.niveles.map((n) => n.clave),
    ['A000000000', 'A0M0000000', 'A0ML000000', 'A0MLA00000', 'A0MLAA0000', 'A0MLAA0200'])

  // de los intermedios se conoce lo que haya: de la raíz y la subgerencia general nada, de la
  // gerencia sólo su sigla, del departamento sólo su nombre, y de la división sólo la
  // sigla que declara la sección
  assert.deepEqual(contacto.area.niveles, [
    { clave: 'A000000000', nombre: '', sigla: '' },
    { clave: 'A0M0000000', nombre: '', sigla: '' },
    { clave: 'A0ML000000', nombre: '', sigla: 'GE DESS' },
    { clave: 'A0MLA00000', nombre: 'Depto. Admin. D/Soft. y Hardw. D/Sist. Centr.', sigla: '' },
    { clave: 'A0MLAA0000', nombre: '', sigla: 'DV PRUE' },
    { clave: 'A0MLAA0200', nombre: 'Sec. Imple. y Mant. D/Base D/Datos', sigla: '' },
  ])
})

test('las secciones hermanas cuelgan de su división, no del departamento', () => {
  registrar(primero(), segundo())

  // el departamento tiene una sola hija: la división
  const depto = conocida('A0MLA00000')
  assert.deepEqual(depto.hijas.map((h) => h.clave), ['A0MLAA0000'])

  const division = conocida('A0MLAA0000')
  assert.deepEqual(division.hijas.map((h) => h.nombre),
    ['Sec. Cont. D/Performance de Base de Datos', 'Sec. Imple. y Mant. D/Base D/Datos'])
  assert.deepEqual(division.hijas.map((h) => h.conAgentes), [true, true])

  // y cada sección conserva su propio código y su testigo
  assert.deepEqual(conocida('A0MLAA0200').cuiles, ['20000000019'])
  assert.deepEqual(conocida('A0MLAA0300').cuiles, ['27000000028'])
})

test('la sigla de un área se aprende de lo que declaran sus hijas', () => {
  registrar(primero())
  // nadie de la división pasó todavía: se la conoce por la sigla, sin nombre ni gente
  const antes = conocida('A0MLAA0000')
  assert.deepEqual(antes.area, { clave: 'A0MLAA0000', codigo: 'A0MLAA0000', sigla: 'DV PRUE', nombre: '' })
  assert.deepEqual(antes.cuiles, [])

  registrar(roselli())
  const despues = conocida('A0MLAA0000')
  assert.equal(despues.area.nombre, 'Div. Administracion de Base de Datos')
  assert.equal(despues.area.sigla, 'DV PRUE')
  assert.deepEqual(despues.cuiles, ['20000000001'])

  // y el jefe de la división aporta la sigla que faltaba del departamento
  assert.equal(conocida('A0MLA00000').area.sigla, 'DE ASYH')
})

test('la ruta de un área no se incluye a sí misma', () => {
  registrar(primero())
  const seccion = conocida('A0MLAA0200')
  assert.deepEqual(seccion.ruta.map((n) => n.clave),
    ['A000000000', 'A0M0000000', 'A0ML000000', 'A0MLA00000', 'A0MLAA0000'])
  assert.equal(seccion.area.clave, 'A0MLAA0200')
})

test('no se repiten los cuiles testigo de un área y el más reciente va primero', () => {
  registrar(primero(), primero(), agente('20222222223', 'A0MLAA0200', `SEC. IMPLE. (DV PRUE) --> ${DEPTO}`))

  assert.deepEqual(conocida('A0MLAA0200').cuiles, ['20222222223', '20000000019'])
})

test('con los testigos completos, uno nuevo reemplaza al más viejo', () => {
  const cuiles = ['20000000011', '20000000022', '20000000033', '20000000044', '20000000055', '20000000066']
  registrar(...cuiles.map((cuil) => agente(cuil, 'A0MLAA0200', `SEC. IMPLE. (DV PRUE) --> ${DEPTO}`)))

  // el primero en verse, 20000000011, quedó afuera: si se fue del área ya no estorba
  assert.deepEqual(conocida('A0MLAA0200').cuiles, [...cuiles].reverse().slice(0, 5))
})

test('un contacto sin código de estructura no entra al índice', () => {
  const [contacto] = registrar(agente('20111111112', '', 'OFICINA SUELTA'))

  assert.equal(contacto.area.clave, '')
  assert.deepEqual(contacto.area.niveles, [])
})

test('la estructura lista cada área con la clave de su padre', () => {
  registrar(primero(), segundo())

  const porClave = new Map(getEstructura().areas.map((area) => [area.clave, area]))
  assert.equal(porClave.size, 7)
  assert.equal(porClave.get('A000000000')?.padre, null)
  assert.equal(porClave.get('A0ML000000')?.padre, 'A0M0000000')
  assert.equal(porClave.get('A0MLAA0000')?.padre, 'A0MLA00000')
  assert.deepEqual(porClave.get('A0MLAA0200'),
    { clave: 'A0MLAA0200', padre: 'A0MLAA0000', nombre: 'Sec. Imple. y Mant. D/Base D/Datos', sigla: '', conAgentes: true })
  assert.equal(porClave.get('A0MLAA0000')?.conAgentes, false)
})
