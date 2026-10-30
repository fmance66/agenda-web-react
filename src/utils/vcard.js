import VCard from 'vcard-creator'
import { textoCorto } from '../components/contactos/telefonos'

// internos y RPV: no se pueden marcar desde afuera
const numerosCortos = (contacto) =>
  contacto.telefonos
    .flatMap((telefono) => (telefono.href ? [telefono.extra] : [telefono]))
    .filter(Boolean)

// la vCard del contacto como texto; la usan la descarga y el código QR
export const textoVCard = (contacto) => {
  const card = new VCard()

  card.addName({ familyName: contacto.apellido, givenName: contacto.nombre })
  card.addCompany({ name: contacto.area.niveles[0]?.nombre ?? '', department: contacto.area.nombre })
  if (contacto.funcion) card.addJobtitle(contacto.funcion)
  if (contacto.email) card.addEmail({ address: contacto.email, type: ['work'] })

  for (const telefono of contacto.telefonos) {
    if (telefono.href) {
      card.addPhoneNumber({
        number: telefono.href.replace('tel:', ''),
        type: telefono.tipo === 'movil' ? ['cell'] : ['work'],
      })
    }
  }

  // los números cortos van como nota
  const cortos = numerosCortos(contacto).map(textoCorto)
  if (cortos.length > 0) card.addNote(cortos.join(' · '))

  return card.toString()
}

const descargar = (contenido, tipo, archivo) => {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = archivo
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// los nombres de archivo no admiten algunos caracteres en Windows
const nombreArchivo = (texto) => texto.replace(/[\\/:*?"<>|]/g, '-').trim() || 'contactos'

// genera la vCard del contacto y la descarga
export const descargarVCard = (contacto) =>
  descargar(textoVCard(contacto), 'text/vcard;charset=utf-8', `${nombreArchivo(`${contacto.apellido} ${contacto.nombre}`)}.vcf`)

// varios contactos en un solo .vcf: los celulares y Outlook los importan todos juntos
export const descargarVCards = (contactos, nombre) =>
  descargar(contactos.map(textoVCard).join('\r\n'), 'text/vcard;charset=utf-8', `${nombreArchivo(nombre)}.vcf`)

// celda de CSV: entre comillas si tiene separador, comillas o saltos de línea
const celda = (valor) => (/[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor)

// CSV para abrir con Excel: separado por ";" (el separador de listas en español) y con BOM,
// para que Excel lo lea como UTF-8 y respete tildes y eñes
export const textoCsv = (contactos) => {
  const numero = (contacto, tipo) =>
    contacto.telefonos.filter((t) => t.tipo === tipo).map((t) => t.texto).join(' / ')
  const corto = (contacto, tipo) =>
    numerosCortos(contacto).filter((t) => t.tipo === tipo).map((t) => t.numero).join(' / ')

  const filas = [
    ['Apellido', 'Nombre', 'Función', 'Área', 'Sigla', 'Titular', 'Correo', 'Teléfono', 'Celular', 'Interno', 'RPV', 'CUIL'],
    ...contactos.map((c) => [
      c.apellido, c.nombre, c.funcion, c.area.nombre, c.area.sigla, c.esTitular ? 'Sí' : '',
      c.email, numero(c, 'fijo'), numero(c, 'movil'), corto(c, 'interno'), corto(c, 'rpv'), c.cuil,
    ]),
  ]
  return `\uFEFF${filas.map((fila) => fila.map(celda).join(';')).join('\r\n')}\r\n`
}

export const descargarCsv = (contactos, nombre) =>
  descargar(textoCsv(contactos), 'text/csv;charset=utf-8', `${nombreArchivo(nombre)}.csv`)
