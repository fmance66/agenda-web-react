import React from 'react'
import { Anchor, Group, Text } from '@mantine/core'
import { IconCloudOff, IconRefresh } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEstado } from '../../api/estado'
import { respaldoEnUso } from '../../api/respaldo'
import { hayVersionNueva } from '../../serviceWorker'
import './AvisosApp.css'

const formato = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

// avisos que valen para toda la app: datos guardados en lugar de actuales, y versión nueva
const AvisosApp = () => {
  const cliente = useQueryClient()
  const desde = useEstado(respaldoEnUso)
  const versionNueva = useEstado(hayVersionNueva)

  if (desde === null && !versionNueva) return null

  return (
    <div role="status">
      {desde !== null && (
        <Group gap="xs" wrap="nowrap" className="aviso-app aviso-sin-conexion">
          <IconCloudOff size={18} />
          <Text size="sm" style={{ flex: 1 }}>
            No hay conexión con el servidor de la agenda. Se muestran los datos guardados en este
            navegador <span style={{ whiteSpace: 'nowrap' }}>(el {formato.format(desde)})</span>.
          </Text>
          <Anchor component="button" type="button" size="sm"
                  onClick={() => cliente.refetchQueries({ type: 'active' })}>
            Reintentar
          </Anchor>
        </Group>
      )}
      {versionNueva && (
        <Group gap="xs" wrap="nowrap" className="aviso-app">
          <IconRefresh size={18} />
          <Text size="sm" style={{ flex: 1 }}>Hay una versión nueva de la agenda.</Text>
          <Anchor component="button" type="button" size="sm" onClick={() => window.location.reload()}>
            Recargar
          </Anchor>
        </Group>
      )}
    </div>
  )
}

export default AvisosApp
