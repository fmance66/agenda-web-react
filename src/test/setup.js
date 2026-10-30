// IndexedDB en memoria para el respaldo sin conexión (src/api/respaldo.js)
import 'fake-indexeddb/auto'
import { Storage } from 'happy-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 22.4+ trae un localStorage global propio (experimental, sin archivo no guarda nada) que
// tapa el de happy-dom, también en window: se reemplaza por un Storage de happy-dom, que se
// comporta como el del navegador
for (const nombre of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, nombre, { value: new Storage(), configurable: true, writable: true })
}

// MantineProvider consulta matchMedia para el modo oscuro, y happy-dom no lo trae
window.matchMedia ??= (consulta) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})

// Testing Library limpia el DOM entre tests sólo si vitest corre con globales: acá no
afterEach(cleanup)
