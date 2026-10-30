import React from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'

const BotonFavorito = ({ activo, onClick }) => {
  const etiqueta = activo ? 'Quitar de favoritos' : 'Agregar a favoritos'
  return (
    <Tooltip label={etiqueta}>
      <ActionIcon variant="subtle" color={activo ? 'yellow' : 'gray'} size="lg"
                  aria-label={etiqueta} aria-pressed={activo} onClick={onClick}>
        {activo ? <IconStarFilled size={20} /> : <IconStar size={20} />}
      </ActionIcon>
    </Tooltip>
  )
}

export default BotonFavorito
