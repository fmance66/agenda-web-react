import React from 'react'
import { Link } from 'react-router'
import { Avatar, Badge, Highlight, Text, UnstyledButton } from '@mantine/core'
import { useRutas } from '../agenda/rutas'
import { ICONOS, resumenTelefono } from './telefonos'

const FilaContacto = ({ contacto, seleccionado, resaltar = [], esUsuario, novedad, onElegir }) => {
  const rutas = useRutas()
  const telefono = contacto.telefonos[0]
  const IconoTelefono = telefono ? ICONOS[telefono.tipo] : null

  return (
    <UnstyledButton component={Link} to={rutas.contacto(contacto.cuil)} onClick={onElegir}
                    className="fila-contacto" aria-current={seleccionado ? 'true' : undefined}>
      <Avatar name={`${contacto.nombre} ${contacto.apellido}`} color="initials" radius="xl" />

      <div className="fila-texto">
        <div className="fila-nombre">
          <Highlight component="span" highlight={resaltar} size="sm" fw={500} truncate>
            {contacto.nombre ? `${contacto.apellido}, ${contacto.nombre}` : contacto.apellido}
          </Highlight>
          {contacto.esTitular && <Badge size="xs" variant="light">Titular</Badge>}
          {esUsuario && <Badge size="xs" variant="outline">Vos</Badge>}
          {novedad && (
            <Badge size="xs" color="yellow" variant="light"
                   title="Cambió de área, teléfono o función desde la última vez">Novedad</Badge>
          )}
        </div>

        <Text size="xs" c="dimmed" truncate>{contacto.funcion}</Text>

        <div className="fila-datos">
          {contacto.area.siglaPadre && (
            <Badge size="xs" variant="default" radius="sm" title={contacto.area.nombre}>
              {contacto.area.siglaPadre}
            </Badge>
          )}
          {telefono
            ? <Text size="xs" truncate><IconoTelefono size={12} /> {resumenTelefono(telefono)}</Text>
            : <Text size="xs" c="dimmed">Sin teléfono</Text>}
        </div>
      </div>
    </UnstyledButton>
  )
}

export default FilaContacto
