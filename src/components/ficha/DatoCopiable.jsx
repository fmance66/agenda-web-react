import React from 'react'
import { Anchor, Text, ThemeIcon } from '@mantine/core'
import BotonCopiar from './BotonCopiar'

// un dato de contacto (teléfono, mail) con su link y botón de copiar
const DatoCopiable = ({ icono: Icono, etiqueta, texto, valor, href }) => (
  <div className="dato">
    <ThemeIcon variant="light" size="lg" radius="md">
      <Icono size={18} />
    </ThemeIcon>
    <div className="dato-texto">
      <Text size="xs" c="dimmed">{etiqueta}</Text>
      {href
        ? <Anchor href={href} size="sm" truncate title={texto} display="block">{texto}</Anchor>
        : <Text size="sm" truncate title={texto}>{texto}</Text>}
    </div>
    <BotonCopiar valor={valor} etiqueta={etiqueta} />
  </div>
)

export default DatoCopiable
