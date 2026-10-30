import React from 'react'
import { Alert, Button } from '@mantine/core'
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react'

// los errores 4xx son avisos (búsqueda inválida, contacto inexistente); el resto se puede reintentar
const EstadoError = ({ error, onReintentar }) => {
  const esAviso = error?.status >= 400 && error?.status < 500

  return (
    <Alert variant="light" m="md"
           color={esAviso ? 'yellow' : 'red'}
           icon={esAviso ? <IconInfoCircle /> : <IconAlertTriangle />}>
      {error?.message ?? 'Ocurrió un error inesperado.'}
      {!esAviso && onReintentar && (
        <div>
          <Button size="xs" variant="light" color="red" mt="sm" onClick={() => onReintentar()}>
            Reintentar
          </Button>
        </div>
      )}
    </Alert>
  )
}

export default EstadoError
