import { beforeEach, describe, expect, it } from 'vitest'
import { AgendaError } from './agenda'
import { conRespaldo, guardadoEl, respaldoEnUso } from './respaldo'

// IndexedDB es fake-indexeddb (src/test/setup.js): vive en memoria mientras corren los tests.
// guardar no se espera (la app no tiene por qué esperar a que se escriba la copia): se da
// un momento para que termine
const unMomento = () => new Promise((r) => setTimeout(r, 20))
const sinConexion = () => Promise.reject(new AgendaError('No se pudo conectar con el servidor de la agenda.', 'sin_conexion'))

beforeEach(() => {
  respaldoEnUso.set(null)
})

describe('conRespaldo', () => {
  it('devuelve la respuesta y la guarda', async () => {
    expect(await conRespaldo('prueba:1', async () => ({ valor: 1 }))).toEqual({ valor: 1 })
    await unMomento()
    expect(await guardadoEl('prueba:1')).toBeTypeOf('number')
    expect(respaldoEnUso.get()).toBeNull()
  })

  it('sin conexión devuelve la última copia y avisa de cuándo es', async () => {
    await conRespaldo('prueba:2', async () => ({ valor: 'guardado' }))
    await unMomento()
    const guardado = await guardadoEl('prueba:2')

    expect(await conRespaldo('prueba:2', sinConexion)).toEqual({ valor: 'guardado' })
    expect(respaldoEnUso.get()).toBe(guardado)
  })

  it('sin conexión y sin copia, deja pasar el error', async () => {
    await expect(conRespaldo('prueba:nunca', sinConexion)).rejects.toThrow('No se pudo conectar')
    expect(respaldoEnUso.get()).toBeNull()
  })

  it('los errores 4xx son respuestas válidas: no se reemplazan por la copia', async () => {
    await conRespaldo('prueba:3', async () => 'guardado')
    await unMomento()
    const invalido = () => Promise.reject(new AgendaError('El CUIL debe tener 11 dígitos.', 'cuil_invalido', 400))
    await expect(conRespaldo('prueba:3', invalido)).rejects.toThrow('11 dígitos')
  })

  it('una respuesta nueva quita el aviso de datos guardados', async () => {
    await conRespaldo('prueba:4', async () => 'viejo')
    await unMomento()
    await conRespaldo('prueba:4', sinConexion)
    expect(respaldoEnUso.get()).not.toBeNull()

    await conRespaldo('prueba:5', async () => 'nuevo')
    expect(respaldoEnUso.get()).toBeNull()
  })
})
