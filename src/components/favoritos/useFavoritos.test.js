import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { contacto, telefono } from '../../test/datos'
import { useFavoritos } from './useFavoritos'

beforeEach(() => {
  localStorage.clear()
})

// cada llamada va en su propio act: refrescar compara contra los favoritos del render anterior
const montar = () => renderHook(() => useFavoritos())

describe('useFavoritos', () => {
  it('agrega ordenado por apellido y guarda en localStorage sólo lo que muestra la fila', () => {
    const { result } = montar()
    act(() => result.current.agregar(contacto({ cuil: '2', apellido: 'Zapata' })))
    act(() => result.current.agregar(contacto({ cuil: '1', apellido: 'Álvarez' })))

    expect(result.current.favoritos.map((f) => f.apellido)).toEqual(['Álvarez', 'Zapata'])
    const guardado = JSON.parse(localStorage.getItem('agenda.favoritos'))
    expect(Object.keys(guardado[0]).sort()).toEqual(['apellido', 'area', 'cuil', 'esTitular', 'funcion', 'nombre', 'telefonos'])
  })

  it('quitar también descarta su novedad', () => {
    const { result } = montar()
    act(() => result.current.agregar(contacto()))
    act(() => result.current.refrescar(contacto({ area: { ...contacto().area, nombre: 'Otra área' } })))
    expect(result.current.novedades['20000000011']).toBeDefined()

    act(() => result.current.quitar('20000000011'))
    expect(result.current.favoritos).toEqual([])
    expect(result.current.novedades).toEqual({})
  })

  describe('novedades', () => {
    it('anota el cambio de área, de teléfono y de función', () => {
      const { result } = montar()
      act(() => result.current.agregar(contacto()))
      act(() => result.current.refrescar(contacto({
        funcion: 'Jefa de división',
        area: { ...contacto().area, nombre: 'Div. Nueva' },
        telefonos: [telefono('1140000009')],
      })))

      expect(result.current.novedades['20000000011'].cambios).toEqual([
        'Cambió de área: antes estaba en Depto. Pruebas, ahora en Div. Nueva.',
        'Cambió su teléfono: antes (011) 4000-0001 · RPV 20001, ahora (011) 4000-0009.',
        'Cambió su función: antes Analista, ahora Jefa de división.',
      ])
      // y lo guardado del favorito queda al día
      expect(result.current.favoritos[0].area.nombre).toBe('Div. Nueva')
    })

    it('no anota nada si no cambió lo que se muestra', () => {
      const { result } = montar()
      act(() => result.current.agregar(contacto()))
      act(() => result.current.refrescar(contacto({ email: 'otro@ejemplo.gob.ar' })))
      expect(result.current.novedades).toEqual({})
    })

    it('ignora a quien no es favorito', () => {
      const { result } = montar()
      act(() => result.current.refrescar(contacto({ area: { ...contacto().area, nombre: 'Otra' } })))
      expect(result.current.favoritos).toEqual([])
      expect(result.current.novedades).toEqual({})
    })

    it('se descartan de a una', () => {
      const { result } = montar()
      act(() => result.current.agregar(contacto()))
      act(() => result.current.refrescar(contacto({ funcion: 'Otra' })))
      act(() => result.current.descartarNovedad('20000000011'))
      expect(result.current.novedades).toEqual({})
    })
  })
})
