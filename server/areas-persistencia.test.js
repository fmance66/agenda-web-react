// en un archivo aparte porque persistirIndice deja el índice guardándose por el resto del proceso
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as esperar } from 'node:timers/promises'
import { getArea, persistirIndice, registrarContacto, vaciarIndice } from './areas.js'
import { normalizarAgente } from './normalizar.js'

// espera a que se cumpla la condición sin depender de cuánto tarde el disco: con una espera fija
// el test fallaba de vez en cuando con la máquina cargada
/** @param {() => boolean} condicion */
const hastaQue = async (condicion, maximoMs = 2000) => {
  for (let pasado = 0; !condicion() && pasado < maximoMs; pasado += 20) await esperar(20)
}

// un área que el test sabe que está en el índice (getArea devuelve null si no)
/** @param {string} codigo */
const conocida = (codigo) => {
  const area = getArea(codigo)
  assert.ok(area, `no está el área ${codigo}`)
  return area
}

const DEPTO = 'DEPTO. ADMIN. D/SOFT. Y HARDW. D/SIST. CENTR. (GE DESS)'
const primero = () => normalizarAgente({
  cuil: '20000000019',
  nombre: 'PEREZ, JUAN',
  funcion: 'ANALISTA',
  area: { codigo: 'A0MLAA0200', descripcion: `SEC. IMPLE. Y MANT. D/BASE D/DATOS (DV PRUE) --> ${DEPTO}` },
})

test('el índice se guarda en archivo y se vuelve a cargar', async (t) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agenda-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const archivo = join(carpeta, 'data', 'areas.json')

  persistirIndice(archivo, 10)
  registrarContacto(primero())
  const antes = conocida('A0MLAA0200')
  await hastaQue(() => existsSync(archivo))

  const guardado = JSON.parse(readFileSync(archivo, 'utf8'))
  assert.equal(guardado.areas.length, 6)

  // al "reiniciar", las hijas y la ruta se reconstruyen desde los códigos
  vaciarIndice()
  assert.equal(getArea('A0MLAA0200'), null)
  persistirIndice(archivo, 10)
  assert.deepEqual(conocida('A0MLAA0200'), antes)
  assert.deepEqual(conocida('A0ML000000').hijas.map((h) => h.clave), ['A0MLA00000'])
})

test('del archivo se ignora lo que no es válido', async (t) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agenda-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const archivo = join(carpeta, 'areas.json')
  writeFileSync(archivo, JSON.stringify({
    version: 1,
    areas: [null, { codigo: '../../x' }, { codigo: 'A0MLAA0300', nombre: 42, sigla: 'X', cuiles: ['1', 2] }],
  }))

  vaciarIndice()
  persistirIndice(archivo, 10)
  const { area, cuiles } = conocida('A0MLAA0300')
  assert.deepEqual(area, { clave: 'A0MLAA0300', codigo: 'A0MLAA0300', sigla: 'X', nombre: '' })
  assert.deepEqual(cuiles, ['1'])
  await esperar(50)
})

test('un archivo roto no impide arrancar', (t) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agenda-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const archivo = join(carpeta, 'areas.json')
  writeFileSync(archivo, '{roto')

  vaciarIndice()
  t.mock.method(console, 'error', () => {})
  persistirIndice(archivo, 10)
  assert.equal(getArea('A0MLAA0200'), null)
})
