import { useCallback } from 'react'
import { useLocalStorage } from '@mantine/hooks'
import { resumenTelefono } from '../contactos/telefonos'

const CLAVE = 'agenda.favoritos'
const CLAVE_NOVEDADES = 'agenda.novedades'
const SIN_FAVORITOS = []
const SIN_NOVEDADES = {}

// de cada favorito se guarda lo que muestra su fila, para listarlos sin pedir cada uno al
// server; la ficha lo vuelve a copiar cuando se abre, así que se mantiene al día con el uso
const resumir = (contacto) => ({
  cuil: contacto.cuil,
  apellido: contacto.apellido,
  nombre: contacto.nombre,
  funcion: contacto.funcion,
  esTitular: contacto.esTitular,
  area: { siglaPadre: contacto.area.siglaPadre, nombre: contacto.area.nombre },
  telefonos: contacto.telefonos.slice(0, 1),
})

const esValido = (f) =>
  typeof f?.cuil === 'string' && typeof f.apellido === 'string'
  && typeof f.area === 'object' && f.area !== null && Array.isArray(f.telefonos)

// lo guardado puede venir de otra versión de la app o editado a mano
const leer = (valor) => {
  try {
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista.filter(esValido) : SIN_FAVORITOS
  } catch {
    return SIN_FAVORITOS
  }
}

const porNombre = (a, b) =>
  a.apellido.localeCompare(b.apellido, 'es') || (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')

const telefono = (contacto) => (contacto.telefonos[0] ? resumenTelefono(contacto.telefonos[0]) : 'sin teléfono')

// qué cambió entre lo guardado de un favorito y lo que trae la agenda ahora
const cambiosEntre = (antes, ahora) => {
  const cambios = []
  if (antes.area.nombre && ahora.area.nombre && antes.area.nombre !== ahora.area.nombre) {
    cambios.push(`Cambió de área: antes estaba en ${antes.area.nombre}, ahora en ${ahora.area.nombre}.`)
  }
  if (telefono(antes) !== telefono(ahora)) {
    cambios.push(`Cambió su teléfono: antes ${telefono(antes)}, ahora ${telefono(ahora)}.`)
  }
  if (antes.funcion && ahora.funcion && antes.funcion !== ahora.funcion) {
    cambios.push(`Cambió su función: antes ${antes.funcion}, ahora ${ahora.funcion}.`)
  }
  return cambios
}

const leerNovedades = (valor) => {
  try {
    const novedades = JSON.parse(valor)
    return novedades && typeof novedades === 'object' && !Array.isArray(novedades) ? novedades : SIN_NOVEDADES
  } catch {
    return SIN_NOVEDADES
  }
}

// useLocalStorage sincroniza el valor entre los componentes que lo usan y entre pestañas
export const useFavoritos = () => {
  const [favoritos, setFavoritos] = useLocalStorage({
    key: CLAVE,
    defaultValue: SIN_FAVORITOS,
    getInitialValueInEffect: false,
    deserialize: leer,
  })

  // cambios de los favoritos desde la última vez que se los vio, por cuil
  const [novedades, setNovedades] = useLocalStorage({
    key: CLAVE_NOVEDADES,
    defaultValue: SIN_NOVEDADES,
    getInitialValueInEffect: false,
    deserialize: leerNovedades,
  })

  const esFavorito = useCallback((cuil) => favoritos.some((f) => f.cuil === cuil), [favoritos])

  const agregar = useCallback((contacto) => setFavoritos((anteriores) => [
    ...anteriores.filter((f) => f.cuil !== contacto.cuil),
    resumir(contacto),
  ].sort(porNombre)), [setFavoritos])

  const descartarNovedad = useCallback((cuil) => setNovedades((anteriores) => {
    if (!anteriores[cuil]) return anteriores
    const resto = { ...anteriores }
    delete resto[cuil]
    return resto
  }), [setNovedades])

  const quitar = useCallback((cuil) => {
    setFavoritos((anteriores) => anteriores.filter((f) => f.cuil !== cuil))
    descartarNovedad(cuil)
  }, [setFavoritos, descartarNovedad])

  // solo reescribe si el contacto es favorito y cambió algo de lo guardado. Si cambió el
  // área, el teléfono o la función, lo anota como novedad hasta que el usuario la descarte
  const refrescar = useCallback((contacto) => {
    const anterior = favoritos.find((f) => f.cuil === contacto.cuil)
    if (!anterior) return
    const nuevo = resumir(contacto)
    if (JSON.stringify(nuevo) === JSON.stringify(anterior)) return

    const cambios = cambiosEntre(anterior, nuevo)
    if (cambios.length > 0) {
      const fecha = Date.now()
      setNovedades((anteriores) => ({
        ...anteriores,
        [contacto.cuil]: { cambios: [...(anteriores[contacto.cuil]?.cambios ?? []), ...cambios], fecha },
      }))
    }
    setFavoritos((anteriores) => anteriores.map((f) => (f.cuil === contacto.cuil ? nuevo : f)).sort(porNombre))
  }, [favoritos, setFavoritos, setNovedades])

  return { favoritos, novedades, esFavorito, agregar, quitar, refrescar, descartarNovedad }
}
