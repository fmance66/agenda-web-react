import React from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useMediaQuery } from '@mantine/hooks'
import PanelBusqueda from '../busqueda/PanelBusqueda'
import FichaArea from '../ficha/FichaArea'
import FichaContacto from '../ficha/FichaContacto'
import SinSeleccion from './SinSeleccion'
import './Agenda.css'

// pantalla principal: búsqueda a la izquierda y ficha a la derecha;
// en pantallas chicas se muestra una sola de las dos según la url
const Agenda = () => {
  const { cuil, clave } = useParams()
  const [searchParams] = useSearchParams()
  const enEstructura = searchParams.get('vista') === 'estructura'
  const esAncho = useMediaQuery('(min-width: 62em)', true, { getInitialValueInEffect: false })
  const hayDetalle = Boolean(cuil || clave)

  return (
    <div className="agenda">
      {(esAncho || !hayDetalle) && <PanelBusqueda cuilSeleccionado={cuil} claveSeleccionada={clave} />}
      {(esAncho || hayDetalle) && (
        <section className="agenda-ficha" aria-live="polite">
          {cuil && <FichaContacto key={cuil} cuil={cuil} mostrarVolver={!esAncho} />}
          {clave && <FichaArea key={clave} clave={clave} mostrarVolver={!esAncho} />}
          {!hayDetalle && <SinSeleccion estructura={enEstructura} />}
        </section>
      )}
    </div>
  )
}

export default Agenda
