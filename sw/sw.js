// service worker de la agenda: guarda la aplicación (html, js, css, íconos) para
// que abra sin red y se pueda instalar. Los datos no pasan por acá: los respalda la app en
// IndexedDB (src/api/respaldo.js), que funciona también en http.
//
// Es una plantilla: el plugin serviceWorker de vite.config.js reemplaza __VERSION__ y
// __ARCHIVOS__ al compilar. Las rutas son relativas a este archivo.

const VERSION = '__VERSION__'
const ARCHIVOS = __ARCHIVOS__
const CACHE = `agenda-${VERSION}`
const PREFIJO = 'agenda-'

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS))
      // la versión nueva toma el control sin esperar a que se cierren todas las pestañas: la
      // app avisa que hay una versión nueva y ofrece recargar
      .then(() => self.skipWaiting()),
  )
})

// se borran los archivos de las versiones anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves
        .filter((clave) => clave.startsWith(PREFIJO) && clave !== CACHE)
        .map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // /api no se guarda acá: lo respalda la app
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith(new URL('api/', self.registration.scope).pathname)) return

  // las páginas van primero a la red, así cada versión nueva se toma enseguida; sin red se
  // usa el index.html guardado, que sirve para cualquier ruta de la app
  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match(new URL('index.html', self.registration.scope))))
    return
  }

  // js, css e íconos: primero lo guardado. Los js y css llevan un hash en el
  // nombre, así que lo guardado nunca queda viejo
  evento.respondWith(caches.match(request).then((guardada) => guardada ?? fetch(request)))
})
