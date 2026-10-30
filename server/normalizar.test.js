import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codigoAncestro, codigoPadre, normalizarAgente, oracion, parsearArea, parsearTelefonos, separarNombre, tituloPropio } from './normalizar.js'

test('separa apellido y nombre y repara la Ñ', () => {
  assert.deepEqual(separarNombre('NU?EZ DE LA TORRE, MARIA  JOSE'), { apellido: 'Nuñez de la Torre', nombre: 'Maria Jose' })
  assert.deepEqual(separarNombre('SIN COMA'), { apellido: 'Sin Coma', nombre: '' })
})

test('capitaliza nombres propios respetando partículas, barras y números romanos', () => {
  assert.equal(tituloPropio('SEC. CONT. D/PERFORMANCE DE BASE DE DATOS'), 'Sec. Cont. D/Performance de Base de Datos')
  assert.equal(tituloPropio('DIVISION II DE LA REGION'), 'Division II de la Region')
  assert.equal(tituloPropio("D'ERRICO"), "D'Errico")
})

test('la función queda como oración', () => {
  assert.equal(oracion('  LIDER DE  PROYECTO '), 'Lider de proyecto')
})

test('la sigla de cada parte es la del padre, no la del área', () => {
  const area = parsearArea({
    codigo: ' A0MLAA0300 ',
    descripcion: 'SEC. CONT. D/PERFORMANCE (DV PRUE) --> DEPTO. ADMIN. (GE DESS)',
  })
  assert.equal(area.codigo, 'A0MLAA0300')
  assert.equal(area.clave, 'A0MLAA0300')
  assert.equal(area.nombre, 'Sec. Cont. D/Performance')
  // DV PRUE es la división de la que cuelga la sección, no la sección
  assert.equal(area.siglaPadre, 'DV PRUE')
  // la sigla propia y la cadena las completa el índice
  assert.equal(area.sigla, '')
  assert.deepEqual(area.niveles, [])
  // el segundo nivel describe al ancestro del prefijo [1-5]
  assert.deepEqual(area.ancestro,
    { codigo: 'A0MLA00000', nombre: 'Depto. Admin.', siglaPadre: 'GE DESS' })
})

test('el padre sale de poner en cero el último segmento del código', () => {
  assert.equal(codigoPadre('A0MLAA0200'), 'A0MLAA0000')  // sección -> división
  assert.equal(codigoPadre('A0MLAA0000'), 'A0MLA00000')  // división -> departamento
  assert.equal(codigoPadre('A0MLA00000'), 'A0ML000000')  // departamento -> gerencia
  assert.equal(codigoPadre('A0ML000000'), 'A0M0000000')  // gerencia -> subgerencia general
  assert.equal(codigoPadre('A0M0000000'), 'A000000000')  // subgerencia general -> raíz
  assert.equal(codigoPadre('AABB000000'), 'AAB0000000')  // gerencia -> subgerencia general
  assert.equal(codigoPadre('AAB0000000'), 'AA00000000')  // subgerencia general -> gerencia general
  assert.equal(codigoPadre('AA0E000000'), 'AA00000000')  // gerencia que depende directo de la DG
  assert.equal(codigoPadre('A000000000'), null)          // raíz
  assert.equal(codigoPadre('corto'), null)

  assert.equal(codigoAncestro('A0MLAA0200'), 'A0MLA00000')
  assert.equal(codigoAncestro(''), null)
})

test('área sin sigla ni código', () => {
  const suelta = parsearArea({ descripcion: 'OFICINA SUELTA' })
  assert.equal(suelta.nombre, 'Oficina Suelta')
  assert.equal(suelta.siglaPadre, '')
  assert.equal(suelta.clave, '')
  assert.equal(suelta.ancestro, null)

  assert.deepEqual(parsearArea(undefined),
    { codigo: '', clave: '', nombre: '', sigla: '', siglaPadre: '', ancestro: null, niveles: [] })
})

test('agrupa el teléfono con su interno o RPV y descarta repetidos y vacíos', () => {
  const telefonos = parsearTelefonos([
    { 'Línea (I)': '1160770303', 'Interno': '76338' },
    { 'Línea (I)': '1160770303', 'Interno': '76338' },
    { 'Línea': '1143471478', 'RPV': '' },
    { 'Disp. WIN': '1126062559', 'WIN': '#' },
    { 'RPV': '21483' },
    { '$id': '1', 'Línea': '12' },
  ])
  assert.deepEqual(telefonos, [
    { tipo: 'fijo', numero: '1160770303', texto: '(011) 6077-0303', href: 'tel:+541160770303', extra: { tipo: 'interno', numero: '76338' } },
    { tipo: 'fijo', numero: '1143471478', texto: '(011) 4347-1478', href: 'tel:+541143471478', extra: null },
    { tipo: 'movil', numero: '1126062559', texto: '11 2606-2559', href: 'tel:+5491126062559', extra: null },
    { tipo: 'rpv', numero: '21483', texto: '21483', href: null, extra: null },
  ])
})

test('los números fuera de CABA se dejan como vienen', () => {
  assert.equal(parsearTelefonos([{ 'Línea': '3514212848' }])[0].texto, '3514212848')
})

test('normaliza un agente completo', () => {
  const contacto = normalizarAgente({
    cuil: 20111111112, nombre: 'PEREZ, JUAN', funcion: 'ANALISTA', cod_sexo: 'M',
    email: ' JPEREZ@AGENDA.EXAMPLE ', area: { codigo: 'X', descripcion: 'DIV. X (DV X)' },
  })
  assert.equal(contacto.cuil, '20111111112')
  assert.equal(contacto.email, 'jperez@agenda.example')
  assert.deepEqual(contacto.telefonos, [])
})
