import React from 'react'
import { Alert, Anchor, Badge, Loader, Stack, Text } from '@mantine/core'
import { IconInfoCircle, IconSearch } from '@tabler/icons-react'
import { Link } from 'react-router'
import { IconSitemap } from '@tabler/icons-react'
import { useBuscarContactos, useEstructura } from '../../api/queries'
import { buscarAreas, etiquetaArea } from '../../utils/areas'
import { useRutas } from '../agenda/rutas'
import EstadoError from '../comunes/EstadoError'
import ListaCargando from '../contactos/ListaCargando'
import ListaContactos from '../contactos/ListaContactos'

const MAX_AREAS = 3

// la búsqueda también encuentra áreas por nombre o sigla ("sistemas", "ge dess"); salen del
// índice de áreas, así que aparecen al instante aunque la agenda no encuentre a nadie
const AreasEncontradas = ({ q }) => {
  const rutas = useRutas()
  const { data } = useEstructura()
  const areas = buscarAreas(data?.areas ?? [], q)
  if (areas.length === 0) return null

  return (
    <div className="resultados-areas">
      <div className="panel-titulo">
        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
          {areas.length} {areas.length === 1 ? 'área' : 'áreas'}
        </Text>
      </div>
      <ul className="lista-areas">
        {areas.slice(0, MAX_AREAS).map((area) => (
          <li key={area.clave}>
            <Link to={rutas.area(area.clave)} className="fila-area-resultado">
              <IconSitemap size={16} className="icono-atenuado" />
              <Text span size="sm" truncate>{etiquetaArea(area)}</Text>
              {area.nombre && area.sigla && <Badge size="xs" variant="default" radius="sm">{area.sigla}</Badge>}
            </Link>
          </li>
        ))}
      </ul>
      {areas.length > MAX_AREAS && (
        <Anchor component={Link} to="/?vista=estructura" size="xs" px="md" pb="xs" display="block">
          Ver el organigrama completo
        </Anchor>
      )}
    </div>
  )
}

const ResultadosBusqueda = (props) => (
  <>
    <AreasEncontradas q={props.q} />
    <ResultadosPersonas {...props} />
  </>
)

const ResultadosPersonas = ({ q, cuilSeleccionado, cuilUsuario, onElegir }) => {
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } = useBuscarContactos(q)

  if (isPending) return <ListaCargando />
  if (isError) return <EstadoError error={error} onReintentar={refetch} />

  const { contactos, muchos } = data
  const palabras = q.split(/\s+/).filter(Boolean)

  if (contactos.length === 0) {
    return (
      <Stack align="center" gap={4} p="xl" ta="center">
        <IconSearch size={28} opacity={0.5} />
        <Text fw={500}>No encontramos contactos para “{q}”</Text>
        <Text size="sm" c="dimmed">Probá con el apellido solo o revisá cómo está escrito.</Text>
      </Stack>
    )
  }

  return (
    <>
      <div className="panel-titulo">
        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
          {contactos.length} {contactos.length === 1 ? 'resultado' : 'resultados'}
        </Text>
        {isFetching && <Loader size={14} />}
      </div>
      {muchos && (
        <Alert variant="light" color="yellow" icon={<IconInfoCircle />} mx="md" mb="xs" p="xs">
          Hay muchas coincidencias y la agenda muestra solo una parte.
          Sumá el nombre o escribí el apellido completo para acotar.
        </Alert>
      )}
      <ListaContactos contactos={contactos} resaltar={palabras} atenuada={isPlaceholderData}
                      cuilSeleccionado={cuilSeleccionado} cuilUsuario={cuilUsuario} onElegir={onElegir} />
    </>
  )
}

export default ResultadosBusqueda
