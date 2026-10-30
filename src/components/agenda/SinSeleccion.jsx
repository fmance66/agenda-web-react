import React from 'react'
import { Kbd, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconAddressBook, IconSitemap } from '@tabler/icons-react'

// con el organigrama abierto lo que se elige es un área
const SinSeleccion = ({ estructura }) => (
  <Stack align="center" justify="center" gap="xs" h="100%" p="xl" ta="center">
    <ThemeIcon size={64} radius="xl" variant="light">
      {estructura ? <IconSitemap size={36} /> : <IconAddressBook size={36} />}
    </ThemeIcon>
    {estructura
      ? <>
          <Text fw={500}>Elegí un área para ver su gente</Text>
          <Text size="sm" c="dimmed">Recorré el organigrama o filtralo por nombre o sigla</Text>
        </>
      : <>
          <Text fw={500}>Elegí un contacto para ver sus datos</Text>
          <Text size="sm" c="dimmed">
            Presioná <Kbd>/</Kbd> para ir al buscador
          </Text>
        </>}
  </Stack>
)

export default SinSeleccion
