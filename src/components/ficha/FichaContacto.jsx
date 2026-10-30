import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ActionIcon, Alert, Anchor, Avatar, Badge, Button, Group, Skeleton, Stack, Text, Title, Tooltip } from '@mantine/core'
import { IconArrowLeft, IconDownload, IconInfoCircle, IconMail, IconQrcode, IconStarOff } from '@tabler/icons-react'
import { useContacto } from '../../api/queries'
import { respaldoEnUso } from '../../api/respaldo'
import { descargarVCard } from '../../utils/vcard'
import { useRutas } from '../agenda/rutas'
import EstadoError from '../comunes/EstadoError'
import FilaContacto from '../contactos/FilaContacto'
import ListaContactos from '../contactos/ListaContactos'
import BotonFavorito from '../favoritos/BotonFavorito'
import { useFavoritos } from '../favoritos/useFavoritos'
import { ETIQUETAS, ICONOS } from '../contactos/telefonos'
import { BotonCopiarEnlace } from './BotonCopiar'
import CodigoQr from './CodigoQr'
import DatoCopiable from './DatoCopiable'
import NivelesArea from './NivelesArea'
import Seccion from './Seccion'
import './Ficha.css'

// un teléfono puede traer asociado un interno o RPV, que se muestra como otro dato
const Telefono = ({ telefono }) => {
  const datos = telefono.href ? [telefono, telefono.extra].filter(Boolean) : [telefono]
  return datos.map((dato) => (
    <DatoCopiable key={`${dato.tipo}-${dato.numero}`}
                  icono={ICONOS[dato.tipo]}
                  etiqueta={ETIQUETAS[dato.tipo]}
                  texto={dato.texto ?? dato.numero}
                  valor={dato.numero}
                  href={dato.href} />
  ))
}

const FichaCargando = () => (
  <Stack p="xl" gap="md" aria-busy="true" aria-label="Cargando contacto">
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

const FichaContacto = ({ cuil, mostrarVolver }) => {
  const rutas = useRutas()
  const { data, error, isPending, isError, refetch } = useContacto(cuil)
  const { novedades, esFavorito, agregar, quitar, refrescar, descartarNovedad } = useFavoritos()
  const favorito = esFavorito(cuil)
  const novedad = novedades[cuil]
  const [verQr, setVerQr] = useState(false)

  // cada vez que se abre la ficha de un favorito se actualiza lo guardado de él, salvo que
  // lo que se ve sea una copia guardada (sin conexión), que puede ser más vieja
  useEffect(() => {
    if (data && respaldoEnUso.get() === null) refrescar(data.contacto)
  }, [data, refrescar])

  const volver = mostrarVolver && (
    <Button component={Link} to={rutas.inicio} variant="subtle" size="compact-sm"
            leftSection={<IconArrowLeft size={16} />} m="md" mb={0}>
      Volver
    </Button>
  )

  if (isPending) return <>{volver}<FichaCargando /></>
  if (isError) {
    // un favorito que ya no está en la agenda (baja, traslado) solo se puede quitar desde acá
    const sinContacto = error?.status === 404 && favorito
    return (
      <>
        {volver}
        <EstadoError error={error} onReintentar={refetch} />
        {sinContacto && (
          <Button variant="light" color="gray" size="xs" mx="md"
                  leftSection={<IconStarOff size={14} />} onClick={() => quitar(cuil)}>
            Quitar de favoritos
          </Button>
        )}
      </>
    )
  }

  const { contacto, jefe } = data
  const { area } = contacto
  // el titular ya se muestra en su propia sección
  const companeros = data.companeros.filter((c) => c.cuil !== jefe?.cuil)
  const enlace = `${window.location.origin}/contacto/${contacto.cuil}`

  return (
    <article className="ficha">
      {volver}

      <header className="ficha-encabezado">
        <Avatar name={`${contacto.nombre} ${contacto.apellido}`} color="initials" radius="xl" size={72} />
        <div className="ficha-titulo">
          <div className="ficha-nombre">
            <Title order={2} fw={400}>
              {contacto.nombre} <strong>{contacto.apellido}</strong>
            </Title>
            <BotonFavorito activo={favorito}
                           onClick={() => (favorito ? quitar(contacto.cuil) : agregar(contacto))} />
            <Tooltip label={verQr ? 'Ocultar código QR' : 'Código QR para el celular'}>
              <ActionIcon variant={verQr ? 'light' : 'subtle'} color={verQr ? undefined : 'gray'} size="lg"
                          aria-label={verQr ? 'Ocultar código QR' : 'Código QR para el celular'}
                          aria-expanded={verQr} onClick={() => setVerQr(!verQr)}>
                <IconQrcode size={20} />
              </ActionIcon>
            </Tooltip>
          </div>
          <Text c="dimmed">{contacto.funcion}</Text>
          <Group gap="xs" mt="xs">
            {area.siglaPadre && <Badge variant="light">{area.siglaPadre}</Badge>}
            {contacto.esTitular && <Badge>Titular del área</Badge>}
            <Text size="xs" c="dimmed">CUIL {contacto.cuil}</Text>
          </Group>
        </div>
        <div className="ficha-acciones">
          <Button variant="light" size="xs" leftSection={<IconDownload size={14} />}
                  onClick={() => descargarVCard(contacto)}>
            Agregar a contactos
          </Button>
          <BotonCopiarEnlace enlace={enlace} />
        </div>
      </header>

      <div className="ficha-cuerpo">
        {/* el favorito cambió desde la última vez: se avisa hasta que el usuario lo descarte */}
        {novedad && (
          <Alert variant="light" color="blue" icon={<IconInfoCircle />}>
            {novedad.cambios.map((cambio) => <Text key={cambio} size="sm" mb={4}>{cambio}</Text>)}
            <Anchor component="button" type="button" size="sm" onClick={() => descartarNovedad(cuil)}>
              Entendido
            </Anchor>
          </Alert>
        )}

        {verQr && <CodigoQr contacto={contacto} onCerrar={() => setVerQr(false)} />}

        <Seccion titulo="Contacto">
          <div className="ficha-datos">
            {contacto.telefonos.map((telefono) => (
              <Telefono key={`${telefono.tipo}-${telefono.numero}`} telefono={telefono} />
            ))}
            {contacto.email && (
              <DatoCopiable icono={IconMail} etiqueta="Correo" texto={contacto.email}
                            valor={contacto.email} href={`mailto:${contacto.email}`} />
            )}
          </div>
          {contacto.telefonos.length === 0 && (
            <Text size="sm" c="dimmed" mt="xs">Sin teléfono registrado</Text>
          )}
        </Seccion>

        <Seccion titulo="Área">
          <NivelesArea niveles={area.niveles} hijas={data.hijas} />
          {area.codigo && <Text size="xs" c="dimmed" mt="xs">Código de estructura {area.codigo}</Text>}
        </Seccion>

        {jefe && (
          <Seccion titulo="Titular del área">
            <div className="ficha-jefe">
              <FilaContacto contacto={jefe} />
            </div>
          </Seccion>
        )}

        {companeros.length > 0 && (
          <Seccion titulo={`Compañeros de área (${companeros.length})`}>
            <div className="ficha-companeros">
              <ListaContactos contactos={companeros} />
            </div>
          </Seccion>
        )}
      </div>
    </article>
  )
}

export default FichaContacto
