import React from 'react'
import { Group, Text } from '@mantine/core'
import { IconStarFilled } from '@tabler/icons-react'
import ListaContactos from '../contactos/ListaContactos'

const Favoritos = ({ favoritos, novedades, cuilSeleccionado, cuilUsuario }) => {
  if (favoritos.length === 0) return null

  return (
    <div className="panel-favoritos">
      <Group gap={6} className="panel-titulo">
        <IconStarFilled size={14} className="icono-favorito" />
        <Text size="xs" c="dimmed" fw={500} tt="uppercase">Favoritos</Text>
      </Group>
      <ListaContactos contactos={favoritos} novedades={novedades} cuilSeleccionado={cuilSeleccionado}
                      cuilUsuario={cuilUsuario} />
    </div>
  )
}

export default Favoritos
