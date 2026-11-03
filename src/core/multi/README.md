# Motor de dos jugadores (`src/core/multi/`)

TypeScript puro, sin DOM, determinista. Lo ejecutan el servidor (sin presentadores) y los dos
clientes (con ellos). Diseño y contrato: `docs/multijugador.md`.

## Piezas

| Fichero | Qué hay |
|---|---|
| `index.ts` | El contrato: lo único que importan servidor y clientes. |
| `tipos.ts` | `Hueco`, `Entrada`, `EntradaSellada`, `Pregunta`, `PresentadoresMulti`, `GuardadoMulti`. |
| `partida.ts` | Crear, guardar y rehidratar; `pendiente`, `esValida`, `aplicar`, `hashPartida`, `decisionBot`. |
| `salas.ts` | Las salas del mapa para dos (combate, élite, jefe, cofre, descanso, evento, taberna, Dungeon Master). |
| `combate-duo.ts` | `CombateDuo`: un `Combate` por héroe sobre los mismos enemigos. |
| `estado.ts`, `base.ts`, `hash.ts` | Estado interno, puntos de guardado/moneda/presentadores, hash. |

## Cómo se usa (servidor y cliente igual)

```ts
const p = crearPartidaMulti({ semilla, clases: { cara: 'barbaro', cruz: 'paladin' } });
pendiente(p, 'cara');              // qué tiene que decidir cara ahora (null = esperar)
esValida(p, entrada);              // la sala la llama antes de numerar la entrada
await aplicar(p, entrada, { cara: presentadorA, cruz: presentadorB, moneda, … }); // una a una, esperando
hashPartida(p);                    // se compara tras cada entrada
decisionBot(p, 'cruz', rngDelBot); // la entrada que jugaría el bot
```

## Puntos de guardado

`esPuntoDeGuardado(p)` es verdadero al crear la partida y cada vez que se cierra una sala (se
vuelve al mapa) o termina la partida. Solo ahí se puede llamar a `serializarPartidaMulti`
(dentro de una sala lanza). Estado = último guardado + entradas desde entonces.

El rng compartido arranca en cada punto de una semilla derivada de `(semilla, nº de punto)`, y los
ids de carta se renumeran por posición del mazo, así que una partida reconstruida desde el guardado
sigue idéntica a la que nunca paró (los smoke tests lo comprueban en cada sala).

## Ampliaciones sobre el contrato del documento

- `esPuntoDeGuardado(p)` (arriba) y `moneda(rng)` se exportan.
- Una carta que pregunta algo a mitad de jugarse (descartar, recuperar del descarte…) **suspende**
  la entrada `jugar`: `pendiente` devuelve una `Pregunta` `eleccion` con `contexto: 'enCarta'`
  (opciones = ids de carta, `null` si se puede cancelar) y lo siguiente que se aplica es su
  `eleccion`. Mientras tanto no se admite ninguna otra entrada. El `elegirCarta` del presentador
  nunca se usa.
- `PresentadoresMulti` añade `moneda`, `votoMapa`, `esperandoAlCompanero` y `aviso` (narración de
  eventos, reliquias, misiones…).
- Ids de `eleccion.clave`: `bendicion`, `carta`, `reliquia`, `descanso`, `evento`, `taberna`,
  `enCarta:N`. Valores: id de carta/reliquia, índice de opción de evento, o cadenas
  `descansar` · `afilar:<uid>` · `purificar:<uid>` · `rumor:<nodo>` · `olvido:<uid>`.

## Auditoría del rng (presentación → motor)

En multijugador el azar solo ocurre dentro de `aplicar`. Lo que se encontró:

1. `Combate.objetivoReal` (la tirada de señuelos de Vexis que la UI hace *antes* de lanzar la
   carta) gastaba rng en la presentación. En dos héroes está desactivado
   (`sinTiradasDePresentacion`): devuelve el objetivo tal cual y la tirada ocurre dentro de
   `jugarCarta`. En solitario no cambia (golden de 258 combates idéntico).
2. `valoresDeCarta`, `danoIntencion`, `previsionAtaques`, `danoGolpe`: puras (smoke: no consumen rng).
3. `ContextoEfecto.rng` solo se usa dentro de `jugar` de cartas y reliquias.
4. `Math.random` en `src/core`: solo los valores por defecto de `nuevaRun` (fecha) y
   `otorgarReliquia`; el motor siempre pasa semilla y rng. En la UI (`Math.random` en partículas y
   `prodigiousSpell`) es solo cosmético y no toca el rng del motor.
5. No es rng pero también rompe la sincronía: `instanciar` usaba un contador global de ids de
   carta. Ahora cada partida lleva el suyo y se lo presta a `cartas.ts` mientras corre `aplicar`.

## Reglas de diseño aplicadas

D1 PV ×1,6 (los enemigos del inicio y también los que se unen durante el combate; el DM no) · D2 cada
movimiento enemigo alcanza a cada héroe vivo con su propio bloqueo y reliquias, un ataque de varios golpes da todos
los golpes a los dos, y no hay tirada de objetivo (`Combate.ejecutarMovimiento` reparte a `heroesVivos()`; primero
las raíces que aplastan, luego los golpes) · D3 caído = sin turno, se
levanta con el 25 % (redondeado) al ganar el compañero; caen los dos = derrota · D4 vale que lo
consiga cualquiera · D5 ningún evento actual cambia nada compartido, así que no hay moneda de
eventos (cada uno aplica su opción). Si se añade uno, hará falta una marca en `OpcionEvento`.

Reliquias: `ofertasPorHeroe` (en `salas.ts`) da a cada héroe su versión de las dos sorteadas; la casilla con una
reliquia de la otra clase se sustituye por una de la suya (rng compartido, que no tenga ya).
