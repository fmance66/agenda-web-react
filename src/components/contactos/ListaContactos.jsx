import React from 'react'
import FilaContacto from './FilaContacto'
import './Contactos.css'

// novedades: favoritos que cambiaron de área, teléfono o función
const ListaContactos = ({ contactos, cuilSeleccionado, cuilUsuario, resaltar, onElegir, atenuada, novedades }) => (
  <ul className="lista-contactos" data-atenuada={atenuada || undefined}>
    {contactos.map((contacto) => (
      <li key={contacto.cuil}>
        <FilaContacto contacto={contacto}
                      seleccionado={contacto.cuil === cuilSeleccionado}
                      esUsuario={contacto.cuil === cuilUsuario}
                      resaltar={resaltar}
                      novedad={Boolean(novedades?.[contacto.cuil])}
                      onElegir={onElegir} />
      </li>
    ))}
  </ul>
)

export default ListaContactos
