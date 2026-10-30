import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Kbd, Modal, Text, useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import {
  IconCornerDownLeft, IconMoon, IconSearch, IconSitemap, IconStar, IconSun, IconUser, IconUserSearch,
} from '@tabler/icons-react'
import { useBuscarContactos, useEstructura } from '../../api/queries'
import { buscarAreas, etiquetaArea, normalizar, ubicacionArea } from '../../utils/areas'
import { useFavoritos } from '../favoritos/useFavoritos'
import { useRutas } from './rutas'
import './PaletaComandos.css'

// paleta de comandos (Ctrl+K): un solo buscador para personas, áreas, favoritos y acciones,
// que se maneja entero con el teclado. Sigue el patrón combobox + listbox de ARIA

const MAX_AREAS = 5
const MAX_PERSONAS = 8
const MAX_FAVORITOS = 5

// la agenda sólo busca por nombre (2 letras o más) o por CUIL completo: lo demás ni se pide
const buscable = (valor) => {
  const limpio = valor.trim()
  if (/^\d{2}-?\d{8}-?\d$/.test(limpio)) return true
  return !/\d/.test(limpio) && limpio.replace(/[^a-zA-ZÀ-ÿ]/g, '').length >= 2
}

const idOpcion = (i) => `paleta-opcion-${i}`

// el contenido va aparte para que el texto y la opción activa arranquen de cero cada vez
// que se abre (el Modal lo desmonta al cerrarse)
const Contenido = ({ onCerrar }) => {
  const navigate = useNavigate()
  const rutas = useRutas()
  const { favoritos } = useFavoritos()
  const { setColorScheme } = useMantineColorScheme()
  const esOscuro = useComputedColorScheme('light') === 'dark'

  const [texto, setTexto] = useState('')
  const [textoDemorado] = useDebouncedValue(texto, 250)
  const [activa, setActiva] = useState(0)
  const lista = useRef(null)

  // la estructura se pide recién cuando se abre la paleta
  const estructura = useEstructura()
  const porClave = useMemo(() => new Map((estructura.data?.areas ?? []).map((area) => [area.clave, area])), [estructura.data])
  const personas = useBuscarContactos(buscable(textoDemorado) ? textoDemorado.trim() : '')
  const buscandoPersonas = buscable(texto) && (texto !== textoDemorado || personas.isFetching)

  const ir = (destino) => {
    onCerrar()
    navigate(destino)
  }

  const acciones = [
    { id: 'accion-organigrama', grupo: 'Acciones', Icono: IconSitemap, titulo: 'Abrir el organigrama',
      detalle: 'Toda la estructura de la empresa', ejecutar: () => ir('/?vista=estructura') },
    { id: 'accion-buscador', grupo: 'Acciones', Icono: IconUserSearch, titulo: 'Ir al buscador de personas',
      ejecutar: () => ir('/') },
    { id: 'accion-tema', grupo: 'Acciones', Icono: esOscuro ? IconSun : IconMoon,
      titulo: esOscuro ? 'Usar modo claro' : 'Usar modo oscuro',
      ejecutar: () => { setColorScheme(esOscuro ? 'light' : 'dark'); onCerrar() } },
  ]

  const buscado = normalizar(texto.trim())
  const deFavoritos = favoritos
    .filter((f) => !buscado || normalizar(`${f.apellido} ${f.nombre}`).includes(buscado))
    .slice(0, MAX_FAVORITOS)
    .map((f) => ({ id: `favorito-${f.cuil}`, grupo: 'Favoritos', Icono: IconStar, titulo: `${f.apellido}, ${f.nombre}`,
      detalle: f.funcion, ejecutar: () => ir(rutas.contacto(f.cuil)) }))

  let opciones
  if (!buscado) {
    opciones = [...deFavoritos, ...acciones]
  } else {
    const vistos = new Set(favoritos.map((f) => f.cuil))
    const dePersonas = (personas.data?.contactos ?? [])
      .filter((c) => !vistos.has(c.cuil))
      .slice(0, MAX_PERSONAS)
      .map((c) => ({ id: `persona-${c.cuil}`, grupo: 'Personas', Icono: IconUser, titulo: `${c.apellido}, ${c.nombre}`,
        detalle: [c.funcion, c.area.sigla || c.area.siglaPadre].filter(Boolean).join(' · '),
        ejecutar: () => ir(rutas.contacto(c.cuil)) }))
    const deAreas = buscarAreas(estructura.data?.areas ?? [], texto)
      .slice(0, MAX_AREAS)
      .map((area) => ({ id: `area-${area.clave}`, grupo: 'Áreas', Icono: IconSitemap,
        titulo: etiquetaArea(area) + (area.nombre && area.sigla ? ` · ${area.sigla}` : ''),
        detalle: ubicacionArea(porClave, area.clave), ejecutar: () => ir(rutas.area(area.clave)) }))
    const deAcciones = acciones.filter((a) => normalizar(a.titulo).includes(buscado))
    opciones = [...deFavoritos, ...dePersonas, ...deAreas, ...deAcciones]
  }
  const activaValida = activa < opciones.length ? activa : 0

  // las opciones agrupadas para pintarlas, cada una con su posición en la lista completa
  const grupos = []
  opciones.forEach((opcion, indice) => {
    const ultimo = grupos.at(-1)
    if (ultimo?.nombre === opcion.grupo) ultimo.opciones.push({ opcion, indice })
    else grupos.push({ nombre: opcion.grupo, opciones: [{ opcion, indice }] })
  })

  const mover = (paso) => {
    if (opciones.length === 0) return
    const nueva = (activaValida + paso + opciones.length) % opciones.length
    setActiva(nueva)
    // la opción ya existe: sólo cambia cuál está marcada
    lista.current?.querySelector(`#${idOpcion(nueva)}`)?.scrollIntoView({ block: 'nearest' })
  }

  const alPresionar = (evento) => {
    if (evento.key === 'ArrowDown') mover(1)
    else if (evento.key === 'ArrowUp') mover(-1)
    else if (evento.key === 'Enter') opciones[activaValida]?.ejecutar()
    else return
    evento.preventDefault()
  }

  return (
    <div className="paleta-caja">
      <div className="paleta-buscador">
        <IconSearch size={18} className="paleta-lupa" />
        <input value={texto} onChange={(e) => { setTexto(e.currentTarget.value); setActiva(0) }}
               onKeyDown={alPresionar} data-autofocus
               type="text" role="combobox" aria-label="Buscar personas, áreas o acciones"
               aria-autocomplete="list" aria-expanded="true" aria-controls="paleta-opciones"
               aria-activedescendant={opciones.length > 0 ? idOpcion(activaValida) : undefined}
               placeholder="Buscá una persona, un área o una acción" autoComplete="off" spellCheck="false"
               className="paleta-campo" />
        <Kbd size="xs">Esc</Kbd>
      </div>

      <ul ref={lista} id="paleta-opciones" role="listbox" aria-label="Resultados" className="paleta-opciones">
        {grupos.map((grupo) => (
          <li key={grupo.nombre} role="presentation">
            <p className="paleta-grupo" aria-hidden="true">{grupo.nombre}</p>
            <ul role="presentation" className="paleta-lista">
              {grupo.opciones.map(({ opcion, indice }) => (
                <li key={opcion.id} id={idOpcion(indice)} role="option" aria-selected={indice === activaValida}
                    className="paleta-opcion" onClick={() => opcion.ejecutar()} onMouseMove={() => setActiva(indice)}>
                  <opcion.Icono size={18} className="paleta-icono" />
                  <span className="paleta-texto">
                    <span className="paleta-titulo">{opcion.titulo}</span>
                    {opcion.detalle && <span className="paleta-detalle">{opcion.detalle}</span>}
                  </span>
                  {indice === activaValida && <IconCornerDownLeft size={16} className="paleta-enter" />}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {buscandoPersonas && <Text size="sm" c="dimmed" px="md" py="xs" aria-live="polite">Buscando personas…</Text>}
      {!buscandoPersonas && texto.trim() && opciones.length === 0 && (
        <Text size="sm" c="dimmed" px="md" py="xs" aria-live="polite">No hay resultados para “{texto.trim()}”.</Text>
      )}

      <div className="paleta-ayuda">
        <span><Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> para moverse</span>
        <span><Kbd size="xs">Enter</Kbd> para abrir</span>
        <span><Kbd size="xs">Ctrl</Kbd> <Kbd size="xs">K</Kbd> para abrir y cerrar</span>
      </div>
    </div>
  )
}

const PaletaComandos = ({ abierta, onCerrar }) => (
  <Modal opened={abierta} onClose={onCerrar} withCloseButton={false} padding={0} radius="md" size="lg"
         yOffset="12vh" title="Buscar en la agenda" classNames={{ title: 'visually-hidden', header: 'paleta-encabezado' }}
         overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}>
    <Contenido onCerrar={onCerrar} />
  </Modal>
)

export default PaletaComandos
