import { IconDeviceMobile, IconHash, IconPhone, IconPhoneCall } from '@tabler/icons-react'

// tipos de teléfono que devuelve el server (server/normalizar.js)
export const ETIQUETAS = { fijo: 'Teléfono', movil: 'Celular', interno: 'Interno', rpv: 'RPV' }
export const ICONOS = { fijo: IconPhone, movil: IconDeviceMobile, interno: IconPhoneCall, rpv: IconHash }

// "RPV 12345" / "Int. 12345"
export const textoCorto = ({ tipo, numero }) => `${tipo === 'rpv' ? 'RPV' : 'Int.'} ${numero}`

// resumen en una línea para la lista
export const resumenTelefono = (telefono) => {
  if (!telefono.href) return textoCorto(telefono)
  return telefono.extra ? `${telefono.texto} · ${textoCorto(telefono.extra)}` : telefono.texto
}
