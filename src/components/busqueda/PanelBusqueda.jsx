import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CloseButton, Tabs, TextInput } from '@mantine/core'
import { useDebouncedCallback, useHotkeys } from '@mantine/hooks'
import { IconSearch, IconSitemap, IconUser } from '@tabler/icons-react'
import { useUsuario } from '../../api/queries'
import ListaCargando from '../contactos/ListaCargando'
import Organigrama from '../estructura/Organigrama'
import Favoritos from '../favoritos/Favoritos'
import { useFavoritos } from '../favoritos/useFavoritos'
import BusquedasRecientes from './BusquedasRecientes'
import MiArea from './MiArea'
import ResultadosBusqueda from './ResultadosBusqueda'
import { useBusquedasRecientes } from './useBusquedasRecientes'
import './Busqueda.css'

// el texto buscado vive en la url (?q=) para que funcionen atrás/adelante y los links
const PanelBusqueda = ({ cuilSeleccionado, claveSeleccionada }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  // el panel muestra personas (buscador, favoritos, mi área) o el organigrama; también va en la
  // url (?vista=estructura), así lo conservan los links y se puede compartir
  const enEstructura = searchParams.get('vista') === 'estructura'

  const [texto, setTexto] = useState(q)
  const [qAnterior, setQAnterior] = useState(q)
  const input = useRef(null)
  const { recientes, agregar, quitar } = useBusquedasRecientes()
  const { favoritos, novedades } = useFavoritos()
  const usuario = useUsuario()

  // si la url cambia desde afuera (atrás/adelante) se actualiza el input
  if (q !== qAnterior) {
    setQAnterior(q)
    if (q !== texto.trim()) setTexto(q)
  }

  const actualizarUrl = useDebouncedCallback((valor) => {
    setSearchParams((anteriores) => {
      const params = new URLSearchParams(anteriores)
      if (valor) params.set('q', valor)
      else params.delete('q')
      return params
    }, { replace: true })
  }, 350)

  const buscar = (valor, inmediato = false) => {
    setTexto(valor)
    actualizarUrl(valor.trim())
    if (inmediato) actualizarUrl.flush()
  }

  const mostrarVista = (vista) => {
    setSearchParams((anteriores) => {
      const params = new URLSearchParams(anteriores)
      if (vista === 'estructura') params.set('vista', vista)
      else params.delete('vista')
      return params
    }, { replace: true })
  }

  // "/" lleva al buscador; desde el organigrama vuelve primero a la vista de personas, y el
  // foco se pone recién cuando el buscador ya está en pantalla
  const enfocarAlVolver = useRef(false)
  useEffect(() => {
    if (!enfocarAlVolver.current || enEstructura) return
    enfocarAlVolver.current = false
    input.current?.focus()
  })

  // en teclados en español la / es shift+7, y mantine exige que coincidan los modificadores
  const irAlBuscador = () => {
    if (!enEstructura) {
      input.current?.focus()
      return
    }
    enfocarAlVolver.current = true
    mostrarVista('personas')
  }
  useHotkeys([['/', irAlBuscador], ['shift+/', irAlBuscador]])

  return (
    <aside className="agenda-panel">
      <Tabs value={enEstructura ? 'estructura' : 'personas'} onChange={mostrarVista} className="panel-vistas">
        <Tabs.List>
          <Tabs.Tab value="personas" leftSection={<IconUser size={16} />}>Personas</Tabs.Tab>
          <Tabs.Tab value="estructura" leftSection={<IconSitemap size={16} />}>Estructura</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {enEstructura
        ? <Organigrama claveSeleccionada={claveSeleccionada} />
        : <>
      <form role="search" className="panel-buscador"
            onSubmit={(e) => { e.preventDefault(); actualizarUrl.flush() }}>
        <TextInput ref={input} value={texto} onChange={(e) => buscar(e.currentTarget.value)}
                   aria-label="Buscar contacto" placeholder="Apellido, nombre o CUIL"
                   leftSection={<IconSearch size={16} />}
                   rightSection={texto && (
                     <CloseButton size="sm" aria-label="Borrar búsqueda" onClick={() => buscar('', true)} />
                   )} />
      </form>

      <div className="panel-contenido">
        {q
          ? <ResultadosBusqueda q={q} cuilSeleccionado={cuilSeleccionado}
                                cuilUsuario={usuario.data?.cuil} onElegir={() => agregar(q)} />
          : <>
              <Favoritos favoritos={favoritos} novedades={novedades} cuilSeleccionado={cuilSeleccionado}
                         cuilUsuario={usuario.data?.cuil} />
              <BusquedasRecientes recientes={recientes} onQuitar={quitar}
                                  onElegir={(busqueda) => buscar(busqueda, true)} />
              {usuario.isPending
                ? <ListaCargando />
                : <MiArea usuario={usuario.data} cuilSeleccionado={cuilSeleccionado} />}
            </>}
      </div>
          </>}
    </aside>
  )
}

export default PanelBusqueda
