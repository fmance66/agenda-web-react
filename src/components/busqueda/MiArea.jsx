import React from 'react'
import { Badge, Stack, Text } from '@mantine/core'
import { useContacto } from '../../api/queries'
import EstadoError from '../comunes/EstadoError'
import ListaCargando from '../contactos/ListaCargando'
import ListaContactos from '../contactos/ListaContactos'

// con el buscador vacío se muestran los integrantes del área del usuario
const MiArea = ({ usuario, cuilSeleccionado }) => {
  const cuil = usuario?.cuil
  const { data, error, isPending, isError, refetch } = useContacto(cuil)

  if (!cuil) {
    return (
      <Stack gap={4} p="xl" ta="center">
        <Text fw={500}>Buscá un contacto</Text>
        <Text size="sm" c="dimmed">Podés buscar por apellido, nombre o CUIL.</Text>
      </Stack>
    )
  }
  if (isPending) return <ListaCargando />
  if (isError) return <EstadoError error={error} onReintentar={refetch} />

  const { contacto, companeros } = data
  // el titular primero y el resto por apellido, como los devuelve el server
  const integrantes = [contacto, ...companeros].sort((a, b) =>
    b.esTitular - a.esTitular
    || a.apellido.localeCompare(b.apellido, 'es')
    || a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <>
      <div className="panel-titulo">
        <Text size="xs" c="dimmed" fw={500} tt="uppercase">Mi área</Text>
        {contacto.area.siglaPadre && <Badge size="xs" variant="light">{contacto.area.siglaPadre}</Badge>}
      </div>
      <Text size="xs" c="dimmed" px="md" mb={4}>{contacto.area.nombre}</Text>
      {usuario.porDefecto && (
        <Text size="xs" c="orange" px="md" mb={4}>
          No se pudo identificar tu usuario por la red; se muestra el área configurada en CUIL_DEFECTO.
        </Text>
      )}
      <ListaContactos contactos={integrantes} cuilSeleccionado={cuilSeleccionado} cuilUsuario={cuil} />
    </>
  )
}

export default MiArea
