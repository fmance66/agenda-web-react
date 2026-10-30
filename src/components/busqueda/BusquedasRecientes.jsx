import React from 'react'
import { CloseButton, Group, Pill, Text } from '@mantine/core'
import { IconHistory } from '@tabler/icons-react'

const BusquedasRecientes = ({ recientes, onElegir, onQuitar }) => {
  if (recientes.length === 0) return null

  return (
    <div className="panel-seccion">
      <Group gap={6} mb={6}>
        <IconHistory size={14} />
        <Text size="xs" c="dimmed" fw={500} tt="uppercase">Búsquedas recientes</Text>
      </Group>
      <Group gap={6}>
        {recientes.map((busqueda) => (
          <Pill key={busqueda} className="reciente">
            <button type="button" className="reciente-texto" onClick={() => onElegir(busqueda)}>
              {busqueda}
            </button>
            <CloseButton size="xs" aria-label={`Quitar ${busqueda}`} onClick={() => onQuitar(busqueda)} />
          </Pill>
        ))}
      </Group>
    </div>
  )
}

export default BusquedasRecientes
