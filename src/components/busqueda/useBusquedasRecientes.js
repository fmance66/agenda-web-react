import { useCallback, useState } from 'react'

const CLAVE = 'agenda.busquedasRecientes'
const MAXIMO = 6

// el almacenamiento del navegador puede no estar disponible (modo privado, bloqueado)
const leer = () => {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE))
    return Array.isArray(valor) ? valor.filter((b) => typeof b === 'string') : []
  } catch {
    return []
  }
}

const guardar = (lista) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista))
  } catch {
    // sin almacenamiento las búsquedas recientes duran lo que la pestaña
  }
}

export const useBusquedasRecientes = () => {
  const [recientes, setRecientes] = useState(leer)

  const actualizar = useCallback((cambio) => {
    setRecientes((anteriores) => {
      const lista = cambio(anteriores)
      guardar(lista)
      return lista
    })
  }, [])

  const agregar = useCallback((busqueda) => actualizar((anteriores) => [
    busqueda,
    ...anteriores.filter((b) => b.toLowerCase() !== busqueda.toLowerCase()),
  ].slice(0, MAXIMO)), [actualizar])

  const quitar = useCallback((busqueda) =>
    actualizar((anteriores) => anteriores.filter((b) => b !== busqueda)), [actualizar])

  return { recientes, agregar, quitar }
}
