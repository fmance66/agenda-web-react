import React from 'react'
import { Link } from 'react-router'
import { Anchor, Text } from '@mantine/core'
import { useRutas } from '../agenda/rutas'

// las demás quedan en la ficha del área, que las lista todas
const MAX_HIJAS = 8

// estructura del área, del nivel más general al propio; cada nivel lleva a su
// página salvo el que ya se está viendo. Si se pasan hijas, van un nivel más
// adentro del propio (para un gerente, los departamentos que dependen de él)
const NivelesArea = ({ niveles, actual, hijas = [] }) => {
  const rutas = useRutas()
  const propio = niveles.at(-1)
  const hijasVisibles = hijas.slice(0, MAX_HIJAS)
  const hijasOcultas = hijas.length - hijasVisibles.length

  return (
    <ol className="ficha-niveles">
      {niveles.map((nivel, i) => {
        const propio = i === niveles.length - 1
        const texto = (
          <>
            <Text span size="sm">{nivel.nombre || nivel.sigla}</Text>
            {nivel.nombre && nivel.sigla && <Text span size="xs" c="dimmed"> · {nivel.sigla}</Text>}
          </>
        )

        return (
          <li key={`${nivel.clave}-${i}`} style={{ '--nivel': i }} data-propio={propio || undefined}>
            {nivel.clave && nivel.clave !== actual
              ? <Anchor component={Link} to={rutas.area(nivel.clave)} underline="never" c="inherit">{texto}</Anchor>
              : texto}
          </li>
        )
      })}
      {hijasVisibles.map((hija) => (
        <li key={hija.clave} style={{ '--nivel': niveles.length }} data-hija>
          <Anchor component={Link} to={rutas.area(hija.clave)} underline="never" c="inherit">
            {/* hay áreas que el índice conoce solo por su código */}
            <Text span size="sm">{hija.nombre || hija.sigla || hija.clave}</Text>
            {hija.nombre && hija.sigla && <Text span size="xs" c="dimmed"> · {hija.sigla}</Text>}
          </Anchor>
        </li>
      ))}
      {hijasOcultas > 0 && propio?.clave && (
        <li style={{ '--nivel': niveles.length }} data-mas>
          <Anchor component={Link} to={rutas.area(propio.clave)} underline="never" c="dimmed" size="sm">
            y {hijasOcultas} {hijasOcultas === 1 ? 'área más' : 'áreas más'}
          </Anchor>
        </li>
      )}
    </ol>
  )
}

export default NivelesArea
