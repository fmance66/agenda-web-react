# Mi Agenda

Agenda de contactos hecha con React 19, Vite, Mantine, TanStack Query y React Router.

Los datos vienen de [agenda-api](../agenda-api), un proyecto aparte que los sirve desde PostgreSQL y
que también usa la versión en Vue; el server de esta app la consulta y normaliza. Los datos de ejemplo
son inventados. Ver [agenda-api](#agenda-api).

Requiere Node `^20.19.0` o `>=22.12.0`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias |
| `npm run dev` (o `npm start`) | Levanta el servidor de desarrollo en [http://localhost:5001](http://localhost:5001), con `/api` incluida |
| `npm run build` | Genera la versión de producción en `build/` |
| `npm run preview` | Sirve localmente el contenido de `build/`, con `/api` incluida |
| `npm run server` | Server de producción en [http://localhost:8080](http://localhost:8080): sirve `build/` y `/api` |
| `npm run dev:server` | Igual que `server`, pero se reinicia al modificar el código |
| `npm test` | Tests del server y del front (ver [Tests](#tests)) |
| `npm run test:e2e` | Pruebas de punta a punta con Playwright y Edge, contra una API falsa |
| `npm run lint` | Corre ESLint |
| `npm run type-check` | Chequea en modo estricto los tipos de `server/`, que van en JSDoc (`tsconfig.server.json`) |

## Estructura

- `index.html`: página de entrada (en Vite va en la raíz, no en `public/`).
- `public/`: archivos estáticos que se sirven tal cual (`images`, `favicon.ico`, `manifest.json`).
  - `iconos/`: íconos de la app instalada. Los `.png` salen de los `.svg`: si se cambia un `.svg`,
    hay que volver a exportar sus `.png` al mismo tamaño (192 y 512 px).
- `server/`: server Node sin dependencias. Es el único que consulta `agenda-api`.
  - `api.js`: rutas de `/api`; lo usan `server/index.js` y el plugin de `vite.config.js`.
  - `agenda.js`: consultas a `consulta.asp` de `agenda-api` con caché en memoria.
  - `areas.js`: índice de áreas que se arma con los contactos consultados.
  - `normalizar.js`: convierte las respuestas de la api al modelo que usa el front.
  - `ip.js`: obtiene la ip del usuario a partir del request.
- `src/api/`: cliente de `/api` (`agenda.js`), hooks de TanStack Query (`queries.js`) y respaldo de las
  respuestas en IndexedDB (`respaldo.js`, ver [Sin conexión](#sin-conexión)).
- `src/serviceWorker.js`: registro del service worker. `sw/sw.js` es su plantilla: `vite.config.js` le
  agrega la lista de archivos al compilar.
- `src/components/`:
  - `agenda/`: pantalla principal (búsqueda y ficha) y rutas.
  - `busqueda/`: buscador, resultados, "Mi área" y búsquedas recientes.
  - `contactos/`: lista y fila de contactos.
  - `ficha/`: detalle del contacto (con su vCard como código QR, para escanearla con el celular) y del
    área (con la descarga de toda su gente en un solo `.vcf` o en CSV para Excel).
  - `favoritos/`: lista, botón y respaldo de favoritos. Si un favorito cambió de área, teléfono o función
    desde la última vez, lleva la etiqueta **Novedad** y su ficha explica qué cambió (`agenda.novedades` en `localStorage`).
  - `estructura/`: organigrama (pestaña "Estructura" del panel).

## Atajos de teclado

| Atajo | Qué hace |
|---|---|
| **Ctrl+K** (Cmd+K en Mac) | Abre la paleta de comandos: un solo buscador para favoritos, personas, áreas y acciones (abrir el organigrama, cambiar el tema). Se maneja con ↑ ↓, Enter y Esc. También se abre con el botón **Buscar** del header |
| **/** | Lleva al buscador de personas |
| **↑ ↓ ← →**, Inicio, Fin | Recorren el organigrama (pestaña Estructura) |

La búsqueda de personas también muestra las áreas cuyo nombre o sigla coinciden
("sistemas", "ge dess"). Salen del índice de áreas, así que aparecen al instante aunque la
agenda no encuentre a nadie, ordenadas de la más alta en la estructura a la más baja.

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Buscador; sin búsqueda muestra "Mi área" |
| `/contactos?q=garcia` | Resultados de la búsqueda |
| `/contactos/:cuil` | Ficha del contacto (la búsqueda se conserva en `?q=`) |
| `/area/:clave` | Área: ubicación en la estructura, agentes y áreas dependientes |
| `/?vista=estructura` | El panel izquierdo muestra el organigrama en lugar del buscador (se combina con las rutas de arriba) |

## API propia

| Endpoint | Devuelve |
|---|---|
| `GET /api/me` | `{ ip, cuil, porDefecto }` del usuario |
| `GET /api/me/data` | Lo mismo que `/api/contactos/:cuil`, pero del usuario: atajo para no pedir antes `/api/me` |
| `GET /api/contactos?q=` | `{ contactos, muchos }`; `q` puede ser apellido, nombre o CUIL |
| `GET /api/contactos/:cuil` | `{ contacto, jefe, companeros, hijas }` (`hijas`: áreas dependientes conocidas) |
| `GET /api/areas/:clave` | `{ area, ruta, hijas, titular, agentes }` |
| `GET /api/estructura` | `{ areas: [{ clave, padre, nombre, sigla, conAgentes }] }`: todas las áreas conocidas, para el organigrama |
| `GET /api/ip/:ip` | `{ ip, cuil }` de esa ip; `cuil` es `null` si no hay agente. Solo local (ver abajo) |

Los errores responden `{ error, mensaje }`. Cada contacto tiene la forma:

```js
{ cuil, apellido, nombre, funcion, sexo, email, esTitular,
  area: { codigo, clave, nombre, sigla, niveles: [{ nombre, sigla, clave }] },
  telefonos: [{ tipo, numero, texto, href, extra }] }
```

## agenda-api

La única fuente de datos es [agenda-api](../agenda-api), que tiene que estar levantada:

```
http://localhost:7300/api/agenda/consulta.asp
```

El host se configura con `API_SITE` (`server/config.js` le agrega la ruta
`api/agenda/consulta.asp`). El navegador nunca la consulta: el único que habla con ella es
`server/agenda.js`, que además guarda las respuestas en caché (`CACHE_MINUTOS`).

Acepta un parámetro por consulta, y no hay otros:

| Consulta | Devuelve | Se usa para |
|---|---|---|
| `?c=<cuil>` | `Titular` y `Agentes` del área a la que pertenece ese cuil | ficha del contacto, compañeros, jefe y agentes de un área |
| `?s=<texto>` | `Agentes` cuyo nombre coincide | búsqueda por apellido o nombre |
| `?i=<ip>` | un único agente: el usuario de esa ip | identificar al usuario (`/api/me`) |

Responde json. Cada agente trae el área como texto (`descripcion`, la cadena de ancestros) y
los teléfonos en campos con nombre (`Línea`, `Línea (I)`, `Disp. WIN`, `Interno`, `RPV`, `WIN`):

```js
{ Titular: { cuil, nombre, ... },
  Agentes: [{ cuil, nombre: 'APELLIDO, NOMBRE', funcion, cod_sexo, email,
              area: { codigo, descripcion: 'SEC. X (DV PRUE) --> DEPTO. Y (GE DESS)' },
              Telefonos: [{ 'Línea': '1143475555', 'Interno': '5555' }] }] }
```

Sin resultados devuelve `{ Error: 'No hay datos' }`; cualquier otro `Error` se traduce a
`api_no_disponible`.

Particularidades que resuelve el server (`server/normalizar.js`):

- Buscar números devuelve un error 500 en html: se responde un mensaje claro.
- Los nombres se guardan sin tilde: se quitan los acentos antes de buscar.
- La `Ñ` llega como `?`: se repara al normalizar.
- Las búsquedas amplias vuelven cortadas en 40 a 50 agentes, sin aviso: con 40 o más se marca `muchos`.
- Los teléfonos vienen repetidos y en pares (`Línea (I)` + `Interno`, `Línea` + `RPV`): se agrupan.
- Los nombres y las funciones vienen en mayúsculas: se pasan a capitalización normal.

## Estructura de áreas

`consulta.asp` sólo acepta `c=cuil`, `s=texto` e `i=ip`: no hay forma de listar áreas ni de
pedir los agentes de un área, así que el árbol no se puede bajar desde la raíz. Lo que sí
trae cada agente es el código de estructura de su área, que es posicional: la cadena de
ancestros sale de ir poniendo en cero los segmentos, del último al primero. Con eso
`server/areas.js` va reconstruyendo el árbol: cada contacto que pasa agrega sus niveles y las
aristas padre → hija que faltaban. De `descripcion` (`SEC. X (DV PRUE) --> DEPTO. Y (GE DESS)`)
salen sólo los nombres y las siglas.

| Segmento | Nivel | Ejemplo |
|---|---|---|
| 1.er carácter | Empresa | `A000000000` |
| 2.º | Gerencia general | `AA00000000` GG ADMI |
| 3.º | Subgerencia general | `AAA0000000` SGG RECH, `A0A0000000` SGG SIST |
| 4.º | Gerencia | `AAAA000000` GE PERS, `A0AA000000` GE DESS |
| 5.º | Departamento | `A0AAA00000` |
| 6.º | División | `A0AAAA0000` DV PRUE |
| 7.º y 8.º | Sección | `A0AAAA0200` |
| 9.º y 10.º | Oficina u otras dependencias | `A000000005` |

Cualquier nivel puede faltar: la SGG SIST (`A0A0`) depende directo de la raíz, sin gerencia
general, y una gerencia como `AA0E` depende directo de la GG ADMI, sin subgerencia general.

El organigrama (pestaña **Estructura** del panel) muestra ese árbol entero, desde la raíz hacia
abajo. Se navega con el mouse o con el teclado (↑ ↓ para moverse, → para desplegar, ← para
contraer o subir al área de la que depende) y se filtra por nombre, sigla o código.

Las áreas se identifican por su `clave`, que es el código de estructura (`A0AAAA0200`): a
diferencia de la sigla, no se repite y se conoce desde el primer contacto que pasa por el área.

Límites que se desprenden de esto:

- El índice arranca con la semilla que genera `agenda-api` (`db/areas.semilla.json`,
  `SEMILLA_AREAS`) y de ahí en más sólo aprende de las ramas por las que alguien pasó. Se carga
  después del índice guardado: lo aprendido le gana y la semilla rellena lo que falta.
- Se guarda en `data/areas.json` (`INDICE_AREAS`) unos segundos después de cada cambio y se
  vuelve a cargar al arrancar, así que sobrevive a los reinicios del server.
- De un área se conocen agentes sólo si se vio a alguien cuya área propia es ésa. De las
  áreas intermedias se conocen las hijas, pero no su gente ni su titular.
- Por eso la ficha del área avisa que la lista de áreas dependientes puede estar incompleta.

## Usuario

El navegador no puede conocer la ip de la máquina, así que la resuelve el server:
`/api/me` toma la ip del request y consulta `consulta.asp?i=<ip>`. Si el navegador corre
en la misma máquina se usa la ip con la que se llega a la api (por ejemplo la de la red local).

`/api/me` sólo identifica al usuario; `/api/me/data` va un paso más y devuelve su ficha
completa (`contacto`, `jefe`, `companeros`, `hijas`). Si no se lo puede identificar y no hay
`CUIL_DEFECTO`, responde `404 usuario_desconocido`.

Para consultar una ip distinta de la propia hay tres formas, todas restringidas a requests
que llegan de la misma máquina o de un proxy confiable (`TRUST_PROXY`). Sin esa restricción
la app serviría para mapear ip → persona desde cualquier cliente:

| Forma | Cómo |
|---|---|
| `GET /api/ip/:ip` | `curl http://localhost:5001/api/ip/192.0.2.10` |
| Header en `/api/me` | `curl -H "X-Forwarded-For: 192.0.2.10" http://localhost:5001/api/me` |
| `USER_IP` | Fija la ip para todo el server; útil para ver la app como otro usuario |

Desde una máquina remota, `/api/ip/:ip` responde `403 no_permitido`, y una ip mal formada
`400 ip_invalida`.

## Sin conexión

La agenda sigue funcionando cuando no llega al server o el server no llega a `agenda-api`, en
dos capas:

| Capa | Qué hace | Dónde | Requisito |
|---|---|---|---|
| Respaldo de datos | Cada ficha, búsqueda y área consultada se guarda; si la agenda no responde, se muestra la copia con un aviso y su fecha | `src/api/respaldo.js`, IndexedDB del navegador (`agenda` → `respaldo`, hasta 300 consultas) | Ninguno: funciona en http |
| Favoritos al día | Al abrir la app se vuelven a pedir, de a una y en segundo plano, las fichas de los favoritos respaldadas hace más de 12 horas | `src/components/favoritos/useRespaldoFavoritos.js` | Ninguno |
| Aplicación sin red e instalable | Un service worker guarda el html, el js, el css y los íconos: la app abre aunque el server no responda, y el navegador ofrece instalarla | `sw/sw.js` (plantilla) → `sw.js` del build | **https** o `localhost` |

Sin conexión se ven las fichas, búsquedas y áreas que ya se habían consultado en ese
navegador, y las de los favoritos. Lo que nunca se consultó muestra el error de siempre.

El service worker sólo se registra en páginas seguras (https o `localhost`), porque los
navegadores no lo permiten en http. En http la app funciona igual, con el respaldo de datos
pero sin abrir sin red ni instalarse. Cada build genera un service worker con una versión
nueva sólo si cambió algo, y la app avisa **Hay una versión nueva de la agenda** con un botón
para recargar.

## Variables de entorno

Se leen del entorno, de `.env` y de `.env.local` (este último no se versiona).

| Variable | Uso |
|---|---|
| `PORT` | Puerto de `npm run server` (default `8080`) |
| `API_SITE` | Dirección de `agenda-api` (default `http://localhost:7300/`) |
| `TRUST_PROXY` | `true` si el server está detrás de un proxy reverso que agrega `X-Forwarded-For` |
| `USER_IP` | Fuerza la ip del usuario, para probar en desarrollo |
| `CUIL_DEFECTO` | Cuil a usar si no se identifica al usuario (solo desarrollo, en `.env.local`) |
| `CACHE_MINUTOS` | Tiempo que se guardan las respuestas de la api (default `5`) |
| `INDICE_AREAS` | Archivo del índice de áreas, relativo a la raíz (default `data/areas.json`; vacío para no guardarlo) |
| `SEMILLA_AREAS` | Semilla de áreas (default `../agenda-api/db/areas.semilla.json`; vacío para no cargarla) |

## Tests

| Comando | Qué prueba | Con qué |
|---|---|---|
| `npm run test:server` | Normalización de la api, índice de áreas, persistencia | `node --test` (`server/*.test.js`) |
| `npm run test:front` | Búsqueda de áreas, vCard y CSV, favoritos y novedades, respaldo sin conexión, teclado del organigrama | Vitest con happy-dom y Testing Library (`src/**/*.test.{js,jsx}`) |
| `npm run test:e2e` | El server de producción con el build: búsqueda y ficha, descarga del área, organigrama, Ctrl+K, sin conexión, y **axe (WCAG 2.1 AA)** en inicio, ficha, organigrama y paleta | Playwright con el Edge instalado (`e2e/`) |

`npm test` corre los dos primeros. Los e2e no necesitan la base: el server consulta a
`e2e/api-falsa.mjs` (`API_SITE`), que responde como `consulta.asp` con personas inventadas, y las
áreas salen de `e2e/areas.semilla.json`. Usan el Edge del sistema (`channel: 'msedge'`), sin `npx playwright install`.

`src/test/setup.js` reemplaza el `localStorage` global que trae Node 22.4+ (experimental, no guarda
nada) por el de happy-dom, agrega `matchMedia` para Mantine y una IndexedDB en memoria.

## Mediciones

[docs/mediciones.md](docs/mediciones.md): Lighthouse y axe con el server de producción. **100 en
accesibilidad, buenas prácticas y SEO** en inicio, ficha y organigrama; 89 a 93 en rendimiento.

## Nota sobre el proxy

Si `npm install` falla con `407 Proxy Authorization Required`, bajar la cantidad
de conexiones simultáneas:

```
npm install --maxsockets=2 --fetch-retries=5
```
