import React from 'react'
import { Text } from '@mantine/core'

const Seccion = ({ titulo, children }) => (
  <section className="ficha-seccion">
    <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb="xs">{titulo}</Text>
    {children}
  </section>
)

export default Seccion
