# Backend de Dracs & Rogues

API gratuita en **Cloudflare Workers + D1** para cuentas, progreso en la nube y
clasificación. El juego sigue funcionando sin cuenta: el guardado es primero local y la
nube es una copia que permite continuar en otro dispositivo.

- **Producción:** <https://dracs-rogues-api.sergiowonder.workers.dev> (D1 `dracs-rogues`, región WEUR).
- Runtime: Cloudflare Workers (plan Free: 100.000 peticiones/día, sin tarjeta, no se duerme).
- Base de datos: D1 (SQLite, 5 GB gratis). Esquema: [`docs/database-schema.dbml`](../docs/database-schema.dbml),
  migraciones en `migrations/`.
- Acceso: enlace mágico por email (sin contraseña), vía [Resend](https://resend.com) (gratis:
  3.000 correos/mes, 100/día).
- Multijugador cooperativo: ver [`docs/multijugador.md`](../docs/multijugador.md) (diseño) y [`docs/cooperativo.md`](../docs/cooperativo.md).
  Durable Objects (SQLite) `Buzon` y `Sala` con WebSockets; migración `new_sqlite_classes` en `wrangler.jsonc`.

## Desarrollo

```bash
cd server
npm install
npm test                    # Vitest dentro del runtime de Workers (miniflare), sin cuenta
npm run typecheck
npm run db:migrate:local    # crea la D1 local en .wrangler/
npm run dev                 # http://localhost:8787 (usa --port si está ocupado)
```

Sin `RESEND_API_KEY` el enlace mágico no se envía: aparece en la consola de `wrangler dev`
(`[magic-link] email -> enlace`).

## API

Autenticación con `Authorization: Bearer <session>`. Cuerpos JSON.

| Método | Ruta | Sesión | Qué hace |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true }` |
| POST | `/auth/magic-link` | — | `{ email }` → 202 y envía el enlace `APP_URL?login=<token>` (15 min, un uso). 400 email inválido, 429 más de 3 enlaces en 15 min |
| POST | `/auth/verify` | — | `{ token }` → `{ session, user }` (sesión de 90 días). 401 si caducó o ya se usó |
| GET | `/me` | ✔ | `{ id, email, displayName }` |
| PATCH | `/me` | ✔ | `{ displayName }` (2-24 caracteres). 409 `{ error: 'name_taken' }` si otro jugador ya usa ese nombre (sin distinguir mayúsculas ni espacios sobrantes) |
| GET | `/users/by-name/:name` | ✔ | `{ id, displayName }` del jugador con ese nombre, o 404 (caja de invitar) |
| POST | `/auth/logout` | ✔ | 204, invalida la sesión |
| GET | `/saves/:slot` | ✔ | `slot` = `run` \| `profile` → `{ data, revision, updatedAt }`; 404 `{ revision }` si está vacía |
| PUT | `/saves/:slot` | ✔ | `{ data, baseRevision }` → `{ revision }`. 409 con la copia del servidor si otro dispositivo guardó antes. Máx. 256 KB |
| DELETE | `/saves/:slot` | ✔ | 204; deja una marca para que un dispositivo atrasado no resucite la partida |
| POST | `/runs` | ✔ | Partida terminada `{ runId (UUID), heroClass, result: victory\|defeat, dmDefeated?, chapter, floor, turns, seed, gameVersion, stats? }` → 201 (200 si ya estaba). `dmDefeated` (final verdadero) solo con `victory`; `killer` (derrota) y `finalBoss` (victoria), nombres de hasta 60 caracteres, opcionales |
| GET | `/runs/mine` | ✔ | Últimas 50 partidas del jugador |
| GET | `/leaderboard?class=&limit=` | — | Mejor partida de cada jugador: primero quien derrotó al DM, luego victorias, luego capítulo y piso más altos, luego menos turnos |
| GET | `/leaderboard?mode=duo&limit=` | — | Clasificación multijugador: la mejor partida de cada **pareja de perfiles** (da igual quién invitó), con el mismo orden. `{ entries: [{ players: [{ userId, displayName, heroClass }, …] (primero el anfitrión), result, dmDefeated, chapter, floor, turns, createdAt }] }`. `mode` desconocido → 400 `unknown_mode` |
| POST | `/multi/games` | ✔ | `{ guest: <displayName> \| 'bot', heroClass }` → 201 `{ id, status, bot }`. Exige nombre de jugador (400 `name_required`). 404 `user_not_found`, 409 `already_invited` (ya hay una invitación pendiente al mismo jugador). Con `'bot'` la partida nace `active` y el bot recibe una clase al azar **distinta de la del anfitrión** |
| GET | `/multi/games` | ✔ | `{ games: [{ id, status: invited\|active, hueco: cara\|cruz, direction: sent\|received\|null, other: { id, displayName, bot }, hostClass, guestClass, createdAt, updatedAt }] }`: invitaciones recibidas y enviadas y partidas activas |
| POST | `/multi/games/:id/accept` | ✔ | `{ heroClass }`, solo el invitado → la partida pasa a `active` y avisa al anfitrión. 409 `not_pending`; 409 `class_taken` si elige la misma clase que el anfitrión (los dos héroes de una partida nunca comparten clase) |
| POST | `/multi/games/:id/decline` | ✔ | Solo el invitado → `declined`. 409 `not_pending` |
| POST | `/multi/games/:id/resume` | ✔ | Avisa al otro jugador (`retomar-pedido`). 409 `not_active`. `{ id, bot }` |
| GET | `/friends` | ✔ | Jugadores con los que ya has jugado (partida aceptada, sin el bot), amigos primero: `{ companions: [{ userId, displayName, friend }] }` |
| PUT | `/friends/:userId` | ✔ | Guarda como amigo (lista propia, unidireccional). 403 `not_played_together` si no habéis jugado juntos |
| DELETE | `/friends/:userId` | ✔ | Lo quita de tus amigos |
| GET | `/multi/games/:id/ws` | ✔ ¹ | WebSocket de la **Sala** (ver abajo). Solo los dos perfiles de una partida `active` (403 al resto, 409 si no está activa) |
| GET | `/inbox/ws` | ✔ ¹ | WebSocket del **Buzón** del jugador (ver abajo) |
| GET | `/push/key` | — | `{ key }`: clave pública VAPID, `null` si el servidor no tiene Web Push configurado |
| POST | `/push/subscribe` | ✔ | `{ endpoint, keys: { p256dh, auth } }` (un `PushSubscription.toJSON()`) → 204 |
| DELETE | `/push/subscribe` | ✔ | `{ endpoint }` → 204 |

¹ Los navegadores no pueden poner `Authorization` en un WebSocket: la sesión va como único valor de la cabecera
`Sec-WebSocket-Protocol` (el servidor lo devuelve tal cual) o en `?token=`.

### Buzón (`/inbox/ws`)

Un Durable Object por jugador (SQLite, API de hibernación). Mientras el juego está abierto el cliente mantiene
un WebSocket y recibe JSON: `{ t: 'invitacion', partida, de, clase }`, `{ t: 'invitacion-respondida', partida, por, aceptada }`,
`{ t: 'retomar-pedido', partida, de }` y `{ t: 'sala-lista', partida, de }` (el compañero espera en la sala). El cliente puede
mandar el texto `ping` y recibe `pong`. Sin ningún socket abierto, el aviso se envía como **Web Push** a las
suscripciones del jugador (título, texto y `url` = `APP_URL?sala=<id>`); las suscripciones que el servicio de push da por muertas (404/410)
se borran solas.

### Sala (`/multi/games/:id/ws`)

Un Durable Object por partida que ejecuta el **motor real** (`src/core/multi`, a través del adaptador `src/motor.ts`): valida cada
entrada (`esValida`; si no, `{ t: 'error', motivo: 'invalida' }` solo al emisor y no se guarda), la numera (`seq`, `de` = hueco del socket),
la aplica de una en una (cola de promesas) y la difunde con el hash resultante. Guarda en SQLite el último guardado de sala (lo calcula el
servidor al llegar a un punto de guardado: inicio de cada sala o fin de partida) y el log desde entonces. Contra el bot (`cruz`) la sala
decide por él con `decisionBot` (alarma del DO, `BOT_RETARDO_MS`, por defecto 700 ms entre jugadas; rng sembrado con la semilla de la
partida y el nº de entrada) y marca la partida `finished` en D1 al terminar. Al terminar (victoria, derrota o final verdadero del DM) la propia sala
**registra la partida en `duo_runs`** (`src/duo-runs.ts`; sin POST del cliente; las partidas contra el bot no se registran) con el resultado, `dmDefeated`,
capítulo, piso y turnos que calcula el motor; alimenta `GET /leaderboard?mode=duo`. Mensajes del servidor: `{ t: 'hueco', hueco, nombres, clases, bot }` al conectar,
`{ t: 'estado', huecos: { cara: { conectado, listo }, cruz: {…} }, empezada }`, `{ t: 'empieza', semilla, clases, nombres, bot, guardado, log: [{ entrada, hash }] }`
cuando los dos están conectados y listos (primera vez: semilla nueva; al retomar: último guardado + entradas posteriores; el cliente
reconstruye desde el guardado, o desde la semilla si es `null`, y reproduce el log en silencio),
`{ t: 'entrada', entrada: EntradaSellada, hash }` por cada entrada aceptada y
`{ t: 'error', motivo }` (`no_empezada`, `entrada_invalida`, `invalida`, …). Del cliente: `{ t: 'listo' }`, `{ t: 'entrada', entrada }` y
`{ t: 'resync' }` (la sala vuelve a mandar `empieza` a ese socket). Contra el bot, el hueco `cruz` siempre está conectado y listo.

### Sincronización (cliente)

1. Al guardar en local, si hay sesión, `PUT /saves/run` con la última `revision` conocida.
2. Si responde **409**, el servidor tiene una partida más nueva: el cliente decide (normalmente
   ofrecer «continuar la de la nube» o «sobrescribir con esta»).
3. Al terminar una run: `POST /runs` (reintenta sin miedo, el `runId` evita duplicados) y
   `DELETE /saves/run`.

## Web Push (claves VAPID)

El Worker firma los avisos con VAPID (WebCrypto, sin dependencias). Sin claves el Web Push queda desactivado y el
resto funciona igual (`GET /push/key` devuelve `{ key: null }` y el cliente oculta el interruptor).

```bash
# 1. Generar el par (imprime VAPID_PUBLIC_KEY=... y VAPID_PRIVATE_KEY=...). La pública va en `vars` de wrangler.jsonc
node scripts/vapid-keys.mjs
# 2. La privada solo como secreto, nunca en git
npx wrangler secret put VAPID_PRIVATE_KEY
```

En local: guarda las dos líneas en `server/.dev.vars` (ignorado por git). Los tests generan un par desechable en cada ejecución.
`VAPID_SUBJECT` (`mailto:no-reply@morghur.es`) ya está en `wrangler.jsonc`.

## Desplegar a mano

El token vive en Infisical (proyecto *SergioAlvarez*, `CLOUDFLARE_API_TOKEN`, entorno `prod`):

```bash
export CLOUDFLARE_API_TOKEN=$(infisical secrets get CLOUDFLARE_API_TOKEN --projectId=5fc9a102-3eaf-46f4-b1cc-383b9e1baffa --env=prod --path=/ --plain --silent)
export CLOUDFLARE_ACCOUNT_ID=bf5525adf381fc90c6455878aa38a77a
npm run db:migrate:remote && npm run deploy
```

## Despliegue inicial (ya hecho, como referencia)

1. Crear cuenta gratuita en <https://dash.cloudflare.com/sign-up> (no pide tarjeta).
2. Iniciar sesión con Wrangler. Sin navegador en WSL: crear un API token (plantilla
   *Edit Cloudflare Workers* + permiso *D1: Edit*) y exportarlo como `CLOUDFLARE_API_TOKEN`.
3. Crear la base de datos y copiar el `database_id` en `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create dracs-rogues
   npm run db:migrate:remote
   ```
4. Correo: en Resend verificar un dominio propio (sin dominio, Resend solo envía a tu propio
   email) y guardar la clave como secreto. Ajustar `EMAIL_FROM` en `wrangler.jsonc`.
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
5. `npm run deploy` → `https://dracs-rogues-api.<subdominio>.workers.dev`.
6. CI: en GitHub, secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` y variable
   `CLOUDFLARE_DEPLOY=true`; desde entonces cada push a `main` que toque `server/` migra y despliega.
