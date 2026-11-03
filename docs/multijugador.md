# Multijugador cooperativo (diseño)

Dos perfiles juegan la misma run. Este documento fija la arquitectura y el contrato entre fases;
las decisiones marcadas (D#) son revertibles.

## Arquitectura: lockstep con servidor autoritativo

- **Un motor, tres sitios.** Toda la lógica vive en `src/core/multi/` (TypeScript puro, sin DOM, determinista).
  La ejecutan el servidor (Durable Object de la sala, sin presentación) y los dos clientes (con la
  presentación de siempre, para que las animaciones sean las mismas).
- **Solo viajan las entradas.** Cada jugador envía acciones (`Entrada`). La sala las numera (`seq`), las guarda en
  su log, las aplica a su motor y las difunde con el hash del estado resultante. Cada cliente aplica las entradas
  **en orden de `seq`, una a una y esperando a que termine la anterior** (animaciones incluidas), y compara su hash.
  Si no coincide, se resincroniza rehaciendo en silencio el log desde el último punto de guardado.
- **Puntos de guardado = inicio de cada sala**, como en solitario: el estado de la partida (dos `Guardado` de
  héroe + lo compartido) es serializable. Dentro de una sala, el estado es «guardado al empezar la sala + entradas
  desde entonces». Retomar una partida, reconectar o resincronizar es reconstruir y reproducir ese log.
- **El bot vive en el servidor**: la sala ejecuta el motor, así que decide por el hueco del bot y emite sus entradas
  como si fuera un jugador.

### Huecos

- `cara`: quien invita (siempre cara en las monedas). `cruz`: quien acepta (siempre cruz).
- La partida es de esa pareja de perfiles: solo ellos dos pueden retomarla.

### Contrato del motor (`src/core/multi/`)

```ts
type Hueco = 'cara' | 'cruz';
type Entrada =
  | { tipo: 'mapa'; nodo: number }                                  // voto del siguiente nodo
  | { tipo: 'jugar'; carta: string; objetivo?: number }             // id de instancia de carta, índice de enemigo
  | { tipo: 'finTurno' }
  | { tipo: 'eleccion'; clave: string; valor: number | string | null }; // recompensa, reliquia, evento, descanso,
                                                                    // tienda, taberna, bendición, elección dentro de
                                                                    // una carta… `clave` identifica la pregunta
interface EntradaSellada extends Entrada { seq: number; de: Hueco }

crearPartidaMulti(opts: { semilla: number; clases: Record<Hueco, ClaseId> }): PartidaMulti
rehidratarPartidaMulti(g: GuardadoMulti): PartidaMulti     // guardado al empezar sala
serializarPartidaMulti(p: PartidaMulti): GuardadoMulti      // JSON
pendiente(p: PartidaMulti, h: Hueco): Pregunta | null       // qué tiene que decidir ahora ese hueco (con opciones válidas)
esValida(p: PartidaMulti, e: EntradaSellada): boolean
aplicar(p: PartidaMulti, e: EntradaSellada, ui?: PresentadoresMulti): Promise<void>  // determinista
hashPartida(p: PartidaMulti): string                        // estable, barato
decisionBot(p: PartidaMulti, h: Hueco, rng: () => number): Entrada | null
```

`PresentadoresMulti` = un `Presentador` por héroe (el de siempre) + ganchos para lo nuevo (moneda, votos del mapa,
«esperando al compañero»). Sin presentadores, `aplicar` corre en silencio (servidor, resincronización, tests).

### Combate a dos

- Cada héroe tiene su propio `Combate` (mazo, mano, energía, estados, reliquias) y **los dos comparten los mismos
  objetos enemigo**. Lo que uno aplica a un enemigo (Vulnerable, veneno, daño) se ve en el momento en el otro.
- Turno de los héroes simultáneo: cada uno juega cartas cuando quiere; cada `jugar` se resuelve entero al llegar.
  Cuando **los dos** han enviado `finTurno`: final de turno de cada héroe y **un único turno enemigo**. Cada
  movimiento de ataque elige objetivo entre los héroes vivos con el rng compartido (D2) y se ejecuta contra el
  `Combate` de ese héroe. Después, inicio de turno de ambos.
- Hay que separar en `Combate` el «fin de turno del héroe» de la «fase enemiga», y hacer que el estado ligado a los
  enemigos (intenciones ocultas, alternancia de grupos) exista una sola vez.
- **Auditar el rng**: ningún código de presentación puede consumir el rng del motor ni cambiar el orden de las
  llamadas (por ejemplo, la tirada de desvío «prevista» de la UI). En multijugador todo lo aleatorio ocurre dentro
  de `aplicar`.

### Fuera del combate

- **Mapa**: cada uno vota un nodo. Si coinciden, se va; si no, **moneda** (cara gana el voto de cara, cruz el de cruz).
- **Recompensas de cartas**: cada uno ve y elige las suyas, sin esperar al otro.
- **Reliquias** (élite, jefe, cofre, misión): se ofrecen **dos** a la vez, cada uno elige una. Si eligen la misma,
  moneda: el ganador se la queda y el otro se lleva la restante.
- **Eventos**: cada uno elige su opción y le afecta solo a él. Si un evento cambia algo compartido (el mapa, la sala
  siguiente), moneda para decidir qué elección vale (D5).
- **Descanso, tienda, taberna, bendiciones**: cada uno decide lo suyo.
- La sala termina cuando los dos han cerrado lo suyo; entonces se guarda y se pasa al mapa.

### Decisiones aplicadas (revertibles)

- **D1.** Enemigos a dos: PV ×1,6 (el daño no cambia).
- **D2.** Cada movimiento de ataque elige un héroe vivo al azar (rng compartido); un ataque de varios golpes va
  entero al mismo.
- **D3.** Un héroe a 0 PV queda caído el resto del combate (sin turno). Si su compañero gana, se levanta con el 25 %
  de sus PV máximos. Si caen los dos, la run termina para ambos.
- **D4.** El final secreto del DM vale si cualquiera de los dos lo consigue.
- **D5.** Eventos que afectan a lo compartido: moneda.
- **D6.** Las partidas multijugador no cuentan todavía para la clasificación.
- **D7.** Notificación con la partida cerrada: Web Push (pide permiso; en iPhone solo con la app instalada). Con el
  juego abierto: aviso dentro del juego por WebSocket.

## Backend

- `users.display_name` único sin distinguir mayúsculas (`409 name_taken`).
- **Buzón** (Durable Object por usuario): WebSocket abierto mientras el juego está abierto (presencia + avisos en
  vivo) y envío de Web Push cuando no hay ninguna conexión.
- **Sala** (Durable Object por partida): WebSocket de juego, numerado de entradas, log persistente, guardado de
  inicio de sala, hash, bot. Tabla `multi_games` en D1 para listar las partidas de cada perfil.
- Invitar (a un perfil por nombre, o al bot) → aceptar o rechazar → empezar. Retomar: uno la pide, el otro recibe aviso
  y confirma; cuando están los dos, se reconstruye y se sigue.

## Fases

- **A. Lobby** (en paralelo con B): nombres únicos, botones «Un jugador» / «Multijugador», invitaciones,
  Buzón con aviso en vivo y Web Push, Sala como relé genérico de entradas (numera, guarda el log, difunde y
  reconecta), lista de partidas, retomar. El guardado de solitario no cambia; el de multijugador vive en la Sala.
- **B. Motor** (en paralelo con A): `src/core/multi/` según el contrato, combate a dos, moneda, votos, bot, y smoke
  tests de determinismo (dos instancias independientes con el mismo log terminan con el mismo hash, y repetir desde
  un guardado de sala reproduce el mismo estado).
- **C. Integración**: la Sala ejecuta el motor (valida entradas, calcula el hash, juega el bot). El cliente tiene un
  bucle multijugador con dos héroes en pantalla (uno arriba a la izquierda y otro abajo a la derecha, algo
  solapados), la animación de la moneda, avisos de «esperando al compañero» y el estado del compañero.
