// datos ficticios para los tests: nombres, cuiles y teléfonos inventados

export const telefono = (numero, extra = null) => ({
  tipo: 'fijo',
  numero,
  texto: `(011) ${numero.slice(2, 6)}-${numero.slice(6)}`,
  href: `tel:+54${numero}`,
  extra,
})

export const contacto = (datos = {}) => ({
  cuil: '20000000011',
  apellido: 'Pérez',
  nombre: 'Juana',
  funcion: 'Analista',
  sexo: 'F',
  email: 'jperez@ejemplo.gob.ar',
  esTitular: false,
  area: {
    codigo: 'A0MFA00000',
    clave: 'A0MFA00000',
    nombre: 'Depto. Pruebas',
    sigla: 'DE PRUE',
    siglaPadre: 'GE SPRU',
    niveles: [{ clave: 'A000000000', nombre: 'Empresa de Prueba', sigla: 'EMPR' }],
  },
  telefonos: [telefono('1140000001', { tipo: 'rpv', numero: '20001' })],
  ...datos,
})

const area = (clave, padre, nombre, sigla, conAgentes = false) => ({ clave, padre, nombre, sigla, conAgentes })

// empresa > SGG de prueba > dos gerencias > un departamento
export const estructura = [
  area('A000000000', null, 'Empresa de Prueba', 'EMPR'),
  area('A0M0000000', 'A000000000', 'Subgerencia General de Sistemas', 'SGG SIS'),
  area('A0MF000000', 'A0M0000000', 'Gerencia de Sistemas de Pruebas', 'GE SPRU', true),
  area('A0MFA00000', 'A0MF000000', 'Depto. Pruebas', 'DE PRUE', true),
  area('A0MA000000', 'A0M0000000', 'Gerencia de Sistemas de Logística', 'GE SLOG', true),
]
