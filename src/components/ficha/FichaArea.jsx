import React from 'react'
import { Link, useSearchParams } from 'react-router'
import { Anchor, Avatar, Badge, Button, Group, Skeleton, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { IconAddressBook, IconArrowLeft, IconChevronRight, IconSitemap, IconTable } from '@tabler/icons-react'
import { useArea } from '../../api/queries'
import { descargarCsv, descargarVCards } from '../../utils/vcard'
import { useRutas } from '../agenda/rutas'
import EstadoError from '../comunes/EstadoError'
import FilaContacto from '../contactos/FilaContacto'
import ListaContactos from '../contactos/ListaContactos'
import NivelesArea from './NivelesArea'
import Seccion from './Seccion'
import './Ficha.css'

const AreaCargando = () => (
  <Stack p="xl" gap="md" aria-busy="true" aria-label="Cargando área">
    <Group>
      <Skeleton height={72} circle />
      <Stack gap="xs" style={{ flex: 1 }}>
        <Skeleton height={20} width="50%" />
        <Skeleton height={12} width="35%" />
      </Stack>
    </Group>
    <Skeleton height={60} />
    <Skeleton height={60} />
  </Stack>
)

const FilaArea = ({ hija }) => {
  const rutas = useRutas()
  return (
    <UnstyledButton component={Link} to={rutas.area(hija.clave)} className="fila-area">
      <div className="fila-texto">
        <Text size="sm" fw={500} truncate>{hija.nombre || hija.sigla}</Text>
        {hija.nombre && hija.sigla && <Text size="xs" c="dimmed">{hija.sigla}</Text>}
      </div>
      {hija.conAgentes && <Badge size="xs" variant="default" radius="sm">Con agentes</Badge>}
      <IconChevronRight size={16} />
    </UnstyledButton>
  )
}

const FichaArea = ({ clave, mostrarVolver }) => {
  const rutas = useRutas()
  const [searchParams] = useSearchParams()
  const enEstructura = searchParams.get('vista') === 'estructura'
  const { data, error, isPending, isError, refetch } = useArea(clave)

  const volver = mostrarVolver && (
    <Button component={Link} to={rutas.inicio} variant="subtle" size="compact-sm"
            leftSection={<IconArrowLeft size={16} />} m="md" mb={0}>
      Volver
    </Button>
  )

  if (isPending) return <>{volver}<AreaCargando /></>
  if (isError) return <>{volver}<EstadoError error={error} onReintentar={refetch} /></>

  const { area, ruta, hijas, titular, agentes } = data
  const niveles = [...ruta, { nombre: area.nombre, sigla: area.sigla, clave: area.clave }]
  const sinGente = !titular && agentes.length === 0
  // el titular primero, como en la ficha
  const gente = [...(titular ? [titular] : []), ...agentes]
  const nombreArchivo = area.sigla || area.nombre || area.clave

  return (
    <article className="ficha">
      {volver}

      <header className="ficha-encabezado">
        <Avatar radius="xl" size={72} color="gray"><IconSitemap size={34} /></Avatar>
        <div className="ficha-titulo">
          <Title order={2} fw={400}>{area.nombre || area.sigla}</Title>
          <Group gap="xs" mt="xs">
            {area.nombre && area.sigla && <Badge variant="light">{area.sigla}</Badge>}
            {area.codigo && <Text size="xs" c="dimmed">Código de estructura {area.codigo}</Text>}
          </Group>
          {!enEstructura && (
            <Anchor component={Link} to={rutas.areaEnOrganigrama(area.clave)} size="sm" mt="xs"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconSitemap size={16} /> Ver en el organigrama
            </Anchor>
          )}
        </div>
        {/* toda la gente del área de una vez: al celular (vCard) o a Excel (CSV) */}
        {gente.length > 0 && (
          <Group gap="xs" className="ficha-descargas">
            <Button variant="default" size="xs" leftSection={<IconAddressBook size={14} />}
                    onClick={() => descargarVCards(gente, nombreArchivo)}>
              Descargar contactos ({gente.length})
            </Button>
            <Button variant="default" size="xs" leftSection={<IconTable size={14} />}
                    onClick={() => descargarCsv(gente, nombreArchivo)}>
              Descargar para Excel
            </Button>
          </Group>
        )}
      </header>

      <div className="ficha-cuerpo">
        <Seccion titulo="Ubicación en la estructura">
          <NivelesArea niveles={niveles} actual={area.clave} />
        </Seccion>

        {titular && (
          <Seccion titulo="Titular del área">
            <div className="ficha-jefe">
              <FilaContacto contacto={titular} />
            </div>
          </Seccion>
        )}

        {agentes.length > 0 && (
          <Seccion titulo={`Agentes del área (${agentes.length})`}>
            <div className="ficha-companeros">
              <ListaContactos contactos={agentes} />
            </div>
          </Seccion>
        )}

        {hijas.length > 0 && (
          <Seccion titulo={`Áreas dependientes conocidas (${hijas.length})`}>
            <div className="ficha-hijas">
              {hijas.map((hija) => <FilaArea key={hija.clave} hija={hija} />)}
            </div>
            <Text size="xs" c="dimmed" mt="xs">
              La estructura se arma con los contactos que se van consultando, así que puede haber
              áreas dependientes que todavía no aparezcan.
            </Text>
          </Seccion>
        )}

        {sinGente && (
          <Seccion titulo="Agentes">
            <Text size="sm" c="dimmed">
              De esta área no se conocen agentes: la agenda sólo devuelve la gente del área propia
              de cada contacto. {hijas.length > 0
                ? 'Entrá a una de las áreas dependientes para ver sus integrantes.'
                : 'Buscá un contacto que pertenezca a ella para que aparezcan acá.'}
            </Text>
          </Seccion>
        )}
      </div>
    </article>
  )
}

export default FichaArea
