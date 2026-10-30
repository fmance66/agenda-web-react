import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getContacto } from '../../api/agenda'
import { guardadoEl, respaldoEnUso } from '../../api/respaldo'
import { useFavoritos } from './useFavoritos'

// se espera a que la app termine de cargar lo que el usuario pidió
const DEMORA_MS = 5000
// una ficha respaldada hace menos de esto no se vuelve a pedir
const VIGENCIA_MS = 12 * 60 * 60 * 1000

// mantiene respaldadas las fichas de los favoritos, para que estén disponibles sin
// conexión aunque no se hayan abierto hace mucho, y de paso detecta si alguno cambió de
// área o de teléfono. Se piden de a una, en segundo plano, y sólo las que no se
// respaldaron en las últimas horas. Corre una vez, al abrir la app
export const useRespaldoFavoritos = () => {
  const { favoritos, refrescar } = useFavoritos()
  const cliente = useQueryClient()

  useEffect(() => {
    let cancelado = false
    const respaldar = async () => {
      for (const { cuil } of favoritos) {
        // sin conexión no tiene sentido seguir intentando
        if (cancelado || respaldoEnUso.get() !== null) return
        const guardado = await guardadoEl(`contacto:${cuil}`)
        if (guardado !== null && Date.now() - guardado < VIGENCIA_MS) continue
        // prefetchQuery además deja la ficha en el caché de la sesión; nunca falla
        await cliente.prefetchQuery({ queryKey: ['contacto', cuil], queryFn: () => getContacto(cuil) })
        // si la ficha llegó de la agenda (no de una copia), se comparan sus datos con lo
        // guardado del favorito: así se avisa que alguien cambió de área aunque no se abra su ficha
        const datos = cliente.getQueryData(['contacto', cuil])
        if (datos && respaldoEnUso.get() === null) refrescar(datos.contacto)
      }
    }
    const espera = setTimeout(respaldar, DEMORA_MS)
    return () => {
      cancelado = true
      clearTimeout(espera)
    }
    // sólo al abrir: los favoritos que se agregan después ya tienen su ficha respaldada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente])
}
