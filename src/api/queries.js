import { useEffect } from 'react'
import { QueryClient, keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { buscarContactos, getArea, getContacto, getEstructura, getUsuario } from './agenda'

const CINCO_MINUTOS = 5 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CINCO_MINUTOS,
      refetchOnWindowFocus: false,
      // los errores 4xx (búsqueda inválida, cuil inexistente) no se reintentan
      retry: (intentos, error) => !(error?.status >= 400 && error?.status < 500) && intentos < 1,
    },
  },
})

// el índice de áreas del server se arma con los contactos que se van consultando, así que cada búsqueda o ficha de
// contacto puede sumar áreas y agentes que una ficha de área ya pedida todavía no conoce. Importa sobre todo al
// abrir /area/:clave con ?q=: la ficha y la búsqueda salen en paralelo, y si el área no estaba indexada responde
// 404 area_desconocida justo antes de que la búsqueda la registre. Invalidar acá la vuelve a pedir.
const useRevalidarAreas = (dataUpdatedAt) => {
  const cliente = useQueryClient()
  useEffect(() => {
    if (!dataUpdatedAt) return
    cliente.invalidateQueries({ queryKey: ['area'] })
    // la estructura pesa: se marca vieja pero no se vuelve a pedir en el momento, sino la
    // próxima vez que se la muestre
    cliente.invalidateQueries({ queryKey: ['estructura'], refetchType: 'none' })
  }, [cliente, dataUpdatedAt])
}

export const useUsuario = () =>
  useQuery({
    queryKey: ['usuario'],
    queryFn: getUsuario,
    staleTime: Infinity,
  })

export const useBuscarContactos = (q) => {
  const query = useQuery({
    queryKey: ['busqueda', q],
    queryFn: ({ signal }) => buscarContactos(q, signal),
    enabled: q !== '',
    // mientras llega la nueva búsqueda se sigue mostrando la anterior
    placeholderData: keepPreviousData,
  })
  useRevalidarAreas(query.dataUpdatedAt)
  return query
}

export const useContacto = (cuil) => {
  const query = useQuery({
    queryKey: ['contacto', cuil],
    queryFn: ({ signal }) => getContacto(cuil, signal),
    enabled: Boolean(cuil),
  })
  useRevalidarAreas(query.dataUpdatedAt)
  return query
}

export const useArea = (clave) =>
  useQuery({
    queryKey: ['area', clave],
    queryFn: ({ signal }) => getArea(clave, signal),
    enabled: Boolean(clave),
  })

// todas las áreas conocidas, para el organigrama. Crece con cada búsqueda o ficha
// (useRevalidarAreas la invalida), pero mientras se vuelve a pedir se sigue mostrando la anterior
export const useEstructura = () =>
  useQuery({
    queryKey: ['estructura'],
    queryFn: ({ signal }) => getEstructura(signal),
    placeholderData: keepPreviousData,
  })
