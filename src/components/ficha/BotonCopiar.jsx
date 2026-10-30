import React from 'react'
import { ActionIcon, Button, CopyButton, Tooltip } from '@mantine/core'
import { IconCheck, IconCopy, IconLink } from '@tabler/icons-react'

// el portapapeles solo está disponible en https o localhost
const BotonCopiar = ({ valor, etiqueta }) => (
  <CopyButton value={valor} timeout={1500}>
    {({ copied, copy }) => (
      <Tooltip label={copied ? 'Copiado' : `Copiar ${etiqueta.toLowerCase()}`} withArrow>
        <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}
                    aria-label={`Copiar ${etiqueta.toLowerCase()}`}>
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </ActionIcon>
      </Tooltip>
    )}
  </CopyButton>
)

// botón con texto para copiar el enlace a la ficha
export const BotonCopiarEnlace = ({ enlace }) => (
  <CopyButton value={enlace} timeout={1500}>
    {({ copied, copy }) => (
      <Button variant="default" size="xs" onClick={copy}
              leftSection={copied ? <IconCheck size={14} /> : <IconLink size={14} />}>
        {copied ? 'Enlace copiado' : 'Copiar enlace'}
      </Button>
    )}
  </CopyButton>
)

export default BotonCopiar
