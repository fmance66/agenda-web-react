import { useLocation } from 'react-router'

// links que conservan la búsqueda actual (?q=) y la vista del panel (?vista=) al navegar
// entre contactos y áreas
export const useRutas = () => {
  const { search } = useLocation()
  const conOrganigrama = new URLSearchParams(search)
  conOrganigrama.set('vista', 'estructura')
  return {
    inicio: `/${search}`,
    contacto: (cuil) => `/contacto/${cuil}${search}`,
    area: (clave) => `/area/${encodeURIComponent(clave)}${search}`,
    // la misma área, con el organigrama abierto en el panel
    areaEnOrganigrama: (clave) => `/area/${encodeURIComponent(clave)}?${conOrganigrama}`,
  }
}
