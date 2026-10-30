import { useSyncExternalStore } from 'react'

// un valor compartido por toda la app, fuera de React, que los componentes leen con
// useEstado y se vuelven a pintar cuando cambia
export const crearEstado = (inicial) => {
  let valor = inicial
  const oyentes = new Set()
  return {
    get: () => valor,
    set: (nuevo) => {
      if (nuevo === valor) return
      valor = nuevo
      oyentes.forEach((oyente) => oyente())
    },
    suscribir: (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
  }
}

export const useEstado = (estado) => useSyncExternalStore(estado.suscribir, estado.get)
