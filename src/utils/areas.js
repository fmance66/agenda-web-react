// "Sección" y "seccion" valen lo mismo: la agenda guarda los nombres sin tilde
export const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const etiquetaArea = (area) => area.nombre || area.sigla || area.clave

export const porEtiqueta = (a, b) => etiquetaArea(a).localeCompare(etiquetaArea(b), 'es')

// nivel en la estructura: cuantos más ceros al final del código, más arriba está el área
const nivel = (area) => area.clave.length - (area.clave.match(/0*$/)?.[0].length ?? 0)

// áreas cuyo nombre, sigla o código contienen todas las palabras buscadas. Primero la que
// tiene exactamente esa sigla ("ge dess"), después las que empiezan con lo buscado y
// después el resto; a igualdad, las de más arriba en la estructura (una gerencia antes que
// sus departamentos) y después por nombre
export const buscarAreas = (areas, texto) => {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return []
  const buscado = palabras.join(' ')
  const puntaje = (area) => {
    if (normalizar(area.sigla) === buscado) return 2
    return normalizar(etiquetaArea(area)).startsWith(buscado) ? 1 : 0
  }
  return areas
    .filter((area) => {
      const contenido = normalizar(`${area.nombre} ${area.sigla} ${area.clave}`)
      return palabras.every((palabra) => contenido.includes(palabra))
    })
    .sort((a, b) => puntaje(b) - puntaje(a) || nivel(a) - nivel(b) || porEtiqueta(a, b))
}

// "SGG SIST › GE DESS": dónde queda un área, sin la raíz, que está en todas
export const ubicacionArea = (porClave, clave) => {
  const siglas = []
  let area = porClave.get(clave)
  while (area?.padre) {
    area = porClave.get(area.padre)
    if (area?.padre) siglas.unshift(area.sigla || area.nombre)
  }
  return siglas.join(' › ')
}
