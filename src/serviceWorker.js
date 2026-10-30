import { crearEstado } from './api/estado'

// true cuando un service worker nuevo tomó el control: la página sigue con los archivos de
// la versión anterior hasta que se recargue
export const hayVersionNueva = crearEstado(false)

// registra el service worker (sw/sw.js), que guarda la aplicación para que abra sin red y
// se pueda instalar. Sólo en producción, y sólo en páginas seguras (https o localhost): en
// http el navegador no lo permite, y la app funciona igual pero sin abrir sin red
export const registrarServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return

  // la primera instalación también dispara controllerchange: sólo es una versión nueva si
  // ya había un service worker controlando la página
  const habiaUno = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaUno) hayVersionNueva.set(true)
  })

  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
    console.warn('No se pudo registrar el service worker:', err)
  })
}
