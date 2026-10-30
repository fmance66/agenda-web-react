import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { MantineProvider } from '@mantine/core'
import { describe, expect, it, vi } from 'vitest'
import { estructura } from '../../test/datos'
import Organigrama from './Organigrama'

// la estructura llega de useEstructura: se reemplaza por la de prueba
vi.mock('../../api/queries', () => ({
  useEstructura: () => ({ data: { areas: estructura }, error: null, isPending: false, isError: false, refetch: vi.fn() }),
}))

const montar = (claveSeleccionada) =>
  render(
    <MantineProvider>
      <MemoryRouter>
        <Organigrama claveSeleccionada={claveSeleccionada} />
      </MemoryRouter>
    </MantineProvider>,
  )

const filas = () => screen.getAllByRole('treeitem').map((f) => f.dataset.clave)
const fila = (clave) => document.querySelector(`[data-clave="${clave}"]`)

describe('Organigrama', () => {
  it('arranca con la raíz desplegada y su hija visible', () => {
    montar()
    expect(filas()).toEqual(['A000000000', 'A0M0000000'])
    expect(fila('A000000000').getAttribute('aria-expanded')).toBe('true')
    expect(fila('A000000000').getAttribute('aria-level')).toBe('1')
  })

  it('al elegir un área despliega sus ancestros y la marca', () => {
    montar('A0MFA00000')
    expect(filas()).toContain('A0MFA00000')
    expect(document.querySelector('[aria-current="page"]').dataset.clave).toBe('A0MFA00000')
    // la única fila tabulable es la elegida (patrón treeview)
    expect([...document.querySelectorAll('[role="treeitem"][tabindex="0"]')].map((f) => f.dataset.clave)).toEqual(['A0MFA00000'])
  })

  it('se maneja con el teclado: → despliega, ↓ baja, ← vuelve al padre', () => {
    montar()
    act(() => { fireEvent.keyDown(fila('A0M0000000'), { key: 'ArrowRight' }) })
    expect(filas()).toEqual(['A000000000', 'A0M0000000', 'A0MA000000', 'A0MF000000'])

    act(() => { fireEvent.keyDown(fila('A0M0000000'), { key: 'ArrowDown' }) })
    expect(document.activeElement.dataset.clave).toBe('A0MA000000')

    act(() => { fireEvent.keyDown(fila('A0MA000000'), { key: 'ArrowLeft' }) })
    expect(document.activeElement.dataset.clave).toBe('A0M0000000')

    act(() => { fireEvent.keyDown(fila('A0M0000000'), { key: 'ArrowLeft' }) })
    expect(filas()).toEqual(['A000000000', 'A0M0000000'])
  })

  it('las filas del árbol no tienen rol propio: los treeitem cuelgan del tree', () => {
    montar()
    expect([...document.querySelectorAll('.arbol-fila')].every((li) => li.getAttribute('role') === 'none')).toBe(true)
  })
})
