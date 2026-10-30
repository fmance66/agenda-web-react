// API falsa para los e2e: responde /api/agenda/consulta.asp con el mismo formato
// que agenda-api (ver "agenda-api" en el README), así las pruebas no necesitan la base. Las
// personas y las áreas son inventadas; las áreas están en e2e/areas.semilla.json.
//
//   ?c=<cuil>  -> Titular y Agentes del área de ese cuil
//   ?s=<texto> -> Agentes cuyo "APELLIDO, NOMBRE" contiene el texto
//   ?i=<ip>    -> el primer agente
//
// Uso: node e2e/api-falsa.mjs (PUERTO, default 4010)

import { createServer } from 'node:http'

const GER_SPRU = { codigo: 'A0MF000000', descripcion: 'GERENCIA DE SISTEMAS DE PRUEBAS (SGG SIS)' }
const GER_SCON = { codigo: 'A0ME000000', descripcion: 'GERENCIA DE SISTEMAS DE CONSULTA (SGG SIS)' }

const agente = (cuil, nombre, funcion, area, linea, rpv) => ({
  cuil,
  nombre,
  funcion,
  cod_sexo: 'X',
  email: `${nombre.split(',')[0].toLowerCase()}@ejemplo.gob.ar`,
  area,
  // la api puede repetir los teléfonos: se imita para probar que se agrupan
  Telefonos: [{ 'Línea': linea, RPV: rpv }, { 'Línea': linea, RPV: rpv }],
})

export const AGENTES = [
  agente('20111111112', 'PRUEBA, ANA MARIA', 'GERENTE/A DE INFORMATICA', GER_SPRU, '1143470001', '20001'),
  agente('20222222223', 'EJEMPLO, JUAN CARLOS', 'ANALISTA PROGRAMADOR', GER_SPRU, '1143470002', '20002'),
  agente('27333333334', 'MUESTRA, LAURA', 'LIDER DE PROYECTO', GER_SPRU, '1143470003', '20003'),
  agente('20444444445', 'EJEMPLAR, PEDRO', 'ANALISTA FUNCIONAL', GER_SCON, '1143470004', '20004'),
]
const TITULARES = { A0MF000000: '20111111112', A0ME000000: '20444444445' }

const responder = (url) => {
  const cuil = url.searchParams.get('c')
  if (cuil) {
    const propio = AGENTES.find((a) => a.cuil === cuil)
    if (!propio) return { Error: 'No hay datos' }
    const codigo = propio.area.codigo
    return { Titular: { cuil: TITULARES[codigo] }, Agentes: AGENTES.filter((a) => a.area.codigo === codigo) }
  }
  const texto = url.searchParams.get('s')
  if (texto) {
    const encontrados = AGENTES.filter((a) => a.nombre.includes(texto.toUpperCase()))
    return encontrados.length ? { Agentes: encontrados } : { Error: 'No hay datos' }
  }
  if (url.searchParams.get('i')) return { Agentes: AGENTES.slice(0, 1) }
  return { Error: 'Consulta inválida' }
}

const puerto = Number(process.env.PUERTO ?? 4010)
createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/agenda/consulta.asp') {
    res.writeHead(404).end()
    return
  }
  // como agenda-api: cualquier origen puede leer las respuestas (lo necesita el modo directo)
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(responder(url)))
}).listen(puerto, () => console.log(`API falsa en http://localhost:${puerto}/`))
