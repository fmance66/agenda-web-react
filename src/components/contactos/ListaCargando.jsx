import React from 'react'
import { Group, Skeleton, Stack } from '@mantine/core'

// filas vacías mientras llegan los contactos
const ListaCargando = ({ filas = 6 }) => (
  <Stack gap="md" p="md" aria-busy="true" aria-label="Cargando contactos">
    {Array.from({ length: filas }, (_, i) => (
      <Group key={i} wrap="nowrap" align="flex-start">
        <Skeleton height={38} circle />
        <Stack gap={6} style={{ flex: 1 }}>
          <Skeleton height={10} width="60%" />
          <Skeleton height={8} width="80%" />
          <Skeleton height={8} width="40%" />
        </Stack>
      </Group>
    ))}
  </Stack>
)

export default ListaCargando
