import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Anchor, Badge, CloseButton, Group, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconChevronRight, IconFilter } from '@tabler/icons-react'
import { useEstructura } from '../../api/queries'
import { useRutas } from '../agenda/rutas'
import EstadoError from '../comunes/EstadoError'
import ListaCargando from '../contactos/ListaCargando'
import { buscarAreas, etiquetaArea as etiqueta, porEtiqueta, ubicacionArea } from '../../utils/areas'
import './Organigrama.css'

// organigrama: el árbol de todas las áreas conocidas, desde la raíz hacia abajo. Se arma en el
// front con la clave del padre de cada área (ver getEstructura en server/areas.js)

const MAX_COINCIDENCIAS = 100

const formato = new Intl.NumberFormat('es-AR')

const armarArbol = (areas) => {
  const porClave = new Map(areas.map((area) => [area.clave, area]))
  const hijas = new Map()
  const raices = []
  for (const area of porClave.values()) {
    if (area.padre && porClave.has(area.padre)) {
      const lista = hijas.get(area.padre)
      if (lista) lista.push(area)
      else hijas.set(area.padre, [area])
    } else {
      raices.push(area)
    }
  }
  raices.sort(porEtiqueta)
  hijas.forEach((lista) => lista.sort(porEtiqueta))
  return { porClave, hijas, raices }
}

const ancestros = (arbol, clave) => {
  const lista = []
  let area = arbol.porClave.get(clave)
  while (area?.padre) {
    area = arbol.porClave.get(area.padre)
    if (area) lista.unshift(area)
  }
  return lista
}

// filas visibles del árbol, en orden: cada área seguida de sus hijas si está desplegada
const armarFilas = (arbol, expandidas) => {
  const resultado = []
  const recorrer = (lista, nivel) => {
    lista.forEach((area, i) => {
      resultado.push({ area, nivel, posicion: i + 1, hermanas: lista.length })
      const hijas = arbol.hijas.get(area.clave)
      if (hijas && expandidas.has(area.clave)) recorrer(hijas, nivel + 1)
    })
  }
  recorrer(arbol.raices, 1)
  return resultado
}

const Coincidencias = ({ arbol, areas, filtro, claveSeleccionada }) => {
  const rutas = useRutas()
  const coincidencias = buscarAreas(areas, filtro)
  const ubicacion = (clave) => ubicacionArea(arbol.porClave, clave)

  return (
    <>
      <Text size="xs" fw={500} tt="uppercase" c="dimmed" px="md" pt="md" pb={4} aria-live="polite">
        {formato.format(coincidencias.length)} {coincidencias.length === 1 ? 'área' : 'áreas'}
        {coincidencias.length > MAX_COINCIDENCIAS && ` · se muestran ${MAX_COINCIDENCIAS}`}
      </Text>
      {coincidencias.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" p="lg">
          Ningún área coincide con “{filtro}”. Probá con la sigla (GE DESS) o una palabra del nombre.
        </Text>
      )}
      <ul className="organigrama-lista">
        {coincidencias.slice(0, MAX_COINCIDENCIAS).map((area) => (
          <li key={area.clave}>
            <Link to={rutas.area(area.clave)} className="coincidencia"
                  aria-current={area.clave === claveSeleccionada ? 'page' : undefined}>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" fw={500} truncate>{etiqueta(area)}</Text>
                {area.nombre && area.sigla && <Badge size="xs" variant="light" radius="sm">{area.sigla}</Badge>}
              </Group>
              {ubicacion(area.clave) && <Text size="xs" c="dimmed" truncate>{ubicacion(area.clave)}</Text>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

const Arbol = ({ arbol, total, claveSeleccionada }) => {
  const rutas = useRutas()
  const lista = useRef(null)
  const raices = useMemo(() => new Set(arbol.raices.map((raiz) => raiz.clave)), [arbol])
  // al abrir se ve la raíz desplegada, con las gerencias generales y subgerencias debajo
  const [expandidas, setExpandidas] = useState(() => new Set(raices))
  const [enfocada, setEnfocada] = useState('')
  const enfocarDespues = useRef('')

  // el área seleccionada queda a la vista: se despliegan sus ancestros. Se ajusta durante
  // el render, cuando cambia la selección, para no pintar primero el árbol contraído
  const [seleccionAnterior, setSeleccionAnterior] = useState(null)
  if (seleccionAnterior !== claveSeleccionada) {
    setSeleccionAnterior(claveSeleccionada)
    const faltan = ancestros(arbol, claveSeleccionada).filter((area) => !expandidas.has(area.clave))
    if (faltan.length > 0) setExpandidas(new Set([...expandidas, ...faltan.map((area) => area.clave)]))
  }

  useEffect(() => {
    if (!claveSeleccionada) return
    lista.current?.querySelector(`[data-clave="${claveSeleccionada}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [claveSeleccionada])

  const filas = armarFilas(arbol, expandidas)
  const cantidadHijas = (clave) => arbol.hijas.get(clave)?.length ?? 0

  // foco: una sola fila es tabulable a la vez (patrón treeview de ARIA)
  const visible = (clave) => filas.some((fila) => fila.area.clave === clave)
  const claveTabulable = visible(enfocada) ? enfocada
    : visible(claveSeleccionada) ? claveSeleccionada
      : filas[0]?.area.clave

  // el foco se mueve después del render, cuando la fila ya existe
  useEffect(() => {
    if (!enfocarDespues.current) return
    lista.current?.querySelector(`[data-clave="${enfocarDespues.current}"]`)?.focus()
    enfocarDespues.current = ''
  })

  const enfocar = (clave) => {
    enfocarDespues.current = clave
    setEnfocada(clave)
  }

  const alternar = (clave) => {
    const nuevas = new Set(expandidas)
    if (nuevas.has(clave)) nuevas.delete(clave)
    else nuevas.add(clave)
    setExpandidas(nuevas)
  }

  const alPresionar = (evento, i) => {
    const fila = filas[i]
    const clave = fila.area.clave
    const tieneHijas = cantidadHijas(clave) > 0
    const desplegada = expandidas.has(clave)

    const acciones = {
      ArrowDown: () => filas[i + 1] && enfocar(filas[i + 1].area.clave),
      ArrowUp: () => i > 0 && enfocar(filas[i - 1].area.clave),
      Home: () => enfocar(filas[0].area.clave),
      End: () => enfocar(filas.at(-1).area.clave),
      ArrowRight: () => {
        if (tieneHijas && !desplegada) alternar(clave)
        else if (tieneHijas) enfocar(filas[i + 1].area.clave)
      },
      ArrowLeft: () => {
        if (tieneHijas && desplegada) alternar(clave)
        else if (fila.area.padre) enfocar(fila.area.padre)
      },
    }
    const accion = acciones[evento.key]
    if (!accion) return
    evento.preventDefault()
    accion()
  }

  return (
    <>
      <Group gap="xs" px="md" pt="md" pb={4}>
        <Text size="xs" fw={500} tt="uppercase" c="dimmed" style={{ flex: 1 }}>
          {formato.format(total)} áreas conocidas
        </Text>
        <Anchor component="button" type="button" size="xs" onClick={() => setExpandidas(new Set(raices))}>
          Contraer todo
        </Anchor>
      </Group>

      <ul ref={lista} role="tree" aria-label="Organigrama" className="organigrama-lista">
        {filas.map((fila, i) => {
          const { area } = fila
          const cantidad = cantidadHijas(area.clave)
          const desplegada = expandidas.has(area.clave)
          return (
            <li key={area.clave} role="none" className="arbol-fila" style={{ '--nivel': fila.nivel - 1 }}>
              {/* el mouse despliega con la flecha; el teclado, con ← y → sobre la fila */}
              {cantidad > 0
                ? (
                    <button type="button" tabIndex={-1} aria-hidden="true" className="arbol-alternar"
                            data-abierta={desplegada || undefined} onClick={() => alternar(area.clave)}>
                      <IconChevronRight size={16} />
                    </button>
                  )
                : <span className="arbol-alternar" />}

              <Link to={rutas.area(area.clave)} role="treeitem" data-clave={area.clave}
                    tabIndex={area.clave === claveTabulable ? 0 : -1}
                    aria-level={fila.nivel} aria-setsize={fila.hermanas} aria-posinset={fila.posicion}
                    aria-expanded={cantidad > 0 ? desplegada : undefined}
                    aria-current={area.clave === claveSeleccionada ? 'page' : undefined}
                    className="arbol-area"
                    onFocus={() => setEnfocada(area.clave)}
                    onKeyDown={(evento) => alPresionar(evento, i)}>
                <Text span size="sm" truncate>{etiqueta(area)}</Text>
                {area.nombre && area.sigla && <Badge size="xs" variant="default" radius="sm">{area.sigla}</Badge>}
                {cantidad > 0 && (
                  <span className="arbol-cantidad" title={`${cantidad} áreas dependientes`}>{cantidad}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <Text size="xs" c="dimmed" px="md" mt="md">
        El organigrama se arma con los contactos que se van consultando: puede faltar alguna área.
      </Text>
    </>
  )
}

const Organigrama = ({ claveSeleccionada }) => {
  const { data, error, isPending, isError, refetch } = useEstructura()
  const [filtro, setFiltro] = useState('')
  const [filtroDemorado] = useDebouncedValue(filtro.trim(), 200)
  const arbol = useMemo(() => armarArbol(data?.areas ?? []), [data])

  return (
    <div className="organigrama">
      <div className="organigrama-filtro">
        <TextInput value={filtro} onChange={(e) => setFiltro(e.currentTarget.value)}
                   aria-label="Filtrar áreas" placeholder="Nombre, sigla o código de un área"
                   leftSection={<IconFilter size={16} />}
                   rightSection={filtro && (
                     <CloseButton size="sm" aria-label="Borrar filtro" onClick={() => setFiltro('')} />
                   )} />
      </div>

      {isPending && <ListaCargando />}
      {isError && <EstadoError error={error} onReintentar={refetch} />}
      {data && (
        <div className="organigrama-contenido">
          {filtroDemorado
            ? <Coincidencias arbol={arbol} areas={data.areas} filtro={filtroDemorado}
                             claveSeleccionada={claveSeleccionada} />
            // la key reinicia lo desplegado si el árbol arranca de otra raíz
            : <Arbol key={arbol.raices.map((raiz) => raiz.clave).join()} arbol={arbol}
                     total={data.areas.length} claveSeleccionada={claveSeleccionada} />}
        </div>
      )}
    </div>
  )
}

export default Organigrama
