import React, { useMemo } from 'react'
import { Anchor, Text } from '@mantine/core'
import { renderSVG } from 'uqr'
import { textoVCard } from '../../utils/vcard'

// la vCard del contacto como código QR, para agendarlo escaneándolo con el celular
const CodigoQr = ({ contacto, onCerrar }) => {
  // negro sobre blanco también en modo oscuro: es lo que leen todas las cámaras.
  // El svg lo arma uqr en el navegador a partir de la vCard: no hay contenido de afuera
  const svg = useMemo(() => renderSVG(textoVCard(contacto), { ecc: 'M', border: 2 }), [contacto])

  return (
    <div className="codigo-qr">
      <div className="codigo-qr-imagen" role="img"
           aria-label={`Código QR con los datos de ${contacto.nombre} ${contacto.apellido}`}
           dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="codigo-qr-texto">
        <Text fw={500} mb={4}>Escanealo con la cámara del celular</Text>
        <Text size="sm" c="dimmed" mb="xs">
          Se abre el contacto de {contacto.nombre} {contacto.apellido} listo para guardar, con sus
          teléfonos, su correo y su área.
        </Text>
        <Anchor component="button" type="button" size="sm" onClick={onCerrar}>Cerrar</Anchor>
      </div>
    </div>
  )
}

export default CodigoQr
