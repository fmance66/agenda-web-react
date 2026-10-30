# Mediciones de calidad

Fecha: 23/09/2026 · Lighthouse 13.5.0 (incluye axe-core para accesibilidad) · Edge headless ·
perfil de escritorio (40 ms de latencia, 10 Mbit/s)

## Resultados

Build servido por el server de producción (`npm run server`), sin compresión.

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | Primer pintado | Mayor pintado |
|---|---|---|---|---|---|---|
| Inicio (`/`) | 92 | **100** | **100** | **100** | 1,1 s | 1,5 s |
| Ficha de contacto | 93 | **100** | **100** | **100** | 1,0 s | 1,6 s |
| Organigrama (área elegida) | 89 | **100** | **100** | **100** | 1,1 s | 1,9 s |

Lo que se corrigió para llegar ahí:

| Problema | Antes | Corrección |
|---|---|---|
| Texto atenuado de Mantine (`#868e96`) contra blanco: 3,3:1 | Accesibilidad 96 | `--mantine-color-dimmed: #575f67` en modo claro (`src/index.css`): 6,5:1 sobre blanco, 4,9:1 sobre la fila seleccionada |
| Avatares de iniciales en verde, lima, amarillo, naranja o turquesa: 3,3 a 3,8:1 | Accesibilidad 96 | El tema limita sus colores a los que llegan a 4,5:1 (`src/theme.js`) |
| Árbol del organigrama: `<li>` sin `role="none"` dentro del `tree` | Accesibilidad 87 | `role="none"` en las filas |
| `/robots.txt` devolvía `index.html` | SEO 91 | El server responde 404 a los archivos que no existen; sólo las rutas de la app van al index |

El rendimiento varía de una corrida a otra (±5 puntos) y depende de Google Fonts, que la página
carga desde internet: una corrida del organigrama dio 55 porque la fuente tardó en llegar.

## Cómo repetirlas

```sh
npm run build && npm run server
# en otra consola, con Node:
npm install --prefix <carpeta-temporal> lighthouse
CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  npx --prefix <carpeta-temporal> lighthouse http://localhost:8080/ --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo --view
```
