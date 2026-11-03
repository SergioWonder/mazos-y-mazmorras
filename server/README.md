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
- Multijugador cooperativo (fase 3): Durable Objects con WebSockets, ver [`docs/cooperativo.md`](../docs/cooperativo.md).

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
| PATCH | `/me` | ✔ | `{ displayName }` (2-24 caracteres) |
| POST | `/auth/logout` | ✔ | 204, invalida la sesión |
| GET | `/saves/:slot` | ✔ | `slot` = `run` \| `profile` → `{ data, revision, updatedAt }`; 404 `{ revision }` si está vacía |
| PUT | `/saves/:slot` | ✔ | `{ data, baseRevision }` → `{ revision }`. 409 con la copia del servidor si otro dispositivo guardó antes. Máx. 256 KB |
| DELETE | `/saves/:slot` | ✔ | 204; deja una marca para que un dispositivo atrasado no resucite la partida |
| POST | `/runs` | ✔ | Partida terminada `{ runId (UUID), heroClass, result: victory\|defeat, chapter, floor, turns, seed, gameVersion, stats? }` → 201 (200 si ya estaba) |
| GET | `/runs/mine` | ✔ | Últimas 50 partidas del jugador |
| GET | `/leaderboard?class=&limit=` | — | Mejor partida de cada jugador: victorias, luego capítulo y piso más altos, luego menos turnos |

### Sincronización (cliente)

1. Al guardar en local, si hay sesión, `PUT /saves/run` con la última `revision` conocida.
2. Si responde **409**, el servidor tiene una partida más nueva: el cliente decide (normalmente
   ofrecer «continuar la de la nube» o «sobrescribir con esta»).
3. Al terminar una run: `POST /runs` (reintenta sin miedo, el `runId` evita duplicados) y
   `DELETE /saves/run`.

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
