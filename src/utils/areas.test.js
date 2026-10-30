import { describe, expect, it } from 'vitest'
import { estructura } from '../test/datos'
import { buscarAreas, normalizar, ubicacionArea } from './areas'

const claves = (texto) => buscarAreas(estructura, texto).map((a) => a.clave)

describe('buscarAreas', () => {
  it('no devuelve nada sin texto', () => {
    expect(buscarAreas(estructura, '   ')).toEqual([])
  })

  it('busca en nombre, sigla y código, sin importar tildes ni mayúsculas', () => {
    expect(claves('ADUANEROS')).toEqual(['A0MA000000'])
    expect(claves('sadu')).toEqual(['A0MA000000'])
    expect(claves('a0mfa')).toEqual(['A0MFA00000'])
    expect(claves('émpresa')).toEqual(['A000000000'])
  })

  it('exige todas las palabras', () => {
    expect(claves('sistemas pruebas')).toEqual(['A0MF000000'])
  })

  it('pone primero la sigla exacta', () => {
    expect(claves('de prue')[0]).toBe('A0MFA00000')
  })

  it('a igualdad, las áreas más altas en la estructura van antes', () => {
    // "sistemas" está en la SGG y en las dos gerencias: la SGG primero
    expect(claves('sistemas')).toEqual(['A0M0000000', 'A0MA000000', 'A0MF000000'])
  })
})

describe('ubicacionArea', () => {
  const porClave = new Map(estructura.map((a) => [a.clave, a]))

  it('muestra las siglas de los ancestros sin la raíz', () => {
    expect(ubicacionArea(porClave, 'A0MFA00000')).toBe('SGG SIS › GE SPRU')
  })

  it('queda vacía para la raíz y sus hijas directas', () => {
    expect(ubicacionArea(porClave, 'A000000000')).toBe('')
    expect(ubicacionArea(porClave, 'A0M0000000')).toBe('')
  })
})

it('normalizar quita tildes y pasa a minúsculas', () => {
  expect(normalizar('Sección ÑANDÚ')).toBe('seccion nandu')
})
