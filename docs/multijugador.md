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
  como si fuera un jugador, con una pausa al azar (0,9–2,6 s) entre acciones. Cómo juega (`src/core/multi/bot.ts`):
  en combate, una carta cada vez, la que más vale por energía: el bloqueo que cubre el ataque que viene (×3) va antes
  que el daño, el daño cuenta hasta lo que aguanta el objetivo (rematar suma lo que evita), Débil cuenta lo que
  ahorra y Vulnerable lo que suben los ataques que le quedan; Fuerza/Destreza valen el doble de lo que añaden al resto
  de la mano este turno; robar va primero si el resto son golpes y defensas; el mago siempre juega lo que da espacios
  de conjuro y el brujo siempre la Explosión Sobrenatural. En el mapa vota hacia su misión de la taberna; el resto
  de elecciones, al azar. Piensa sin tocar el estado (lo que prueba lo deshace).

### Huecos

- `cara`: quien invita (siempre cara en las monedas). `cruz`: quien acepta (siempre cruz).
- La partida es de esa pareja de perfiles: solo ellos dos pueden retomarla.
- **Dos clases distintas por partida.** El anfitrión elige clase al invitar; en el diálogo de aceptar esa clase sale desactivada
  («La ha elegido <nombre>») y el servidor rechaza aceptar con la misma (`409 class_taken`). El bot juega una clase al azar distinta de la del anfitrión.

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
  movimiento enemigo alcanza a **cada héroe vivo** (D2), cada uno con su propio bloqueo, Vulnerable y reliquias
  defensivas, y se ejecuta contra el `Combate` de cada uno. Después, inicio de turno de ambos.
- Hay que separar en `Combate` el «fin de turno del héroe» de la «fase enemiga», y hacer que el estado ligado a los
  enemigos (intenciones ocultas, alternancia de grupos) exista una sola vez.
- **Auditar el rng**: ningún código de presentación puede consumir el rng del motor ni cambiar el orden de las
  llamadas (por ejemplo, la tirada de desvío «prevista» de la UI). En multijugador todo lo aleatorio ocurre dentro
  de `aplicar`.

### Fuera del combate

- **Mapa**: cada uno vota un nodo. Si coinciden, se va; si no, **moneda** (cara gana el voto de cara, cruz el de cruz).
- **Recompensas de cartas**: cada uno ve y elige las suyas, sin esperar al otro.
- **Reliquias** (élite, jefe, cofre, misión): se ofrecen **dos** a la vez, cada uno elige una. Si entre las ofrecidas
  hay una que solo encaja con la clase de uno de los dos, el otro ve en esa casilla **una reliquia de su propia clase**
  (sorteada con el rng compartido entre las de su clase que aún no tiene), así que los dos siempre tienen dos
  reliquias válidas y nadie se queda con las vendas. Si eligen la misma (una compartida), moneda: el ganador se la
  queda y el otro se lleva la otra casilla **tal y como la ve él**. Solo si a un héroe no le queda ninguna reliquia
  válida, vendas (+10 PV).
- **Eventos**: cada uno elige su opción y le afecta solo a él. Si un evento cambia algo compartido (el mapa, la sala
  siguiente), moneda para decidir qué elección vale (D5).
- **Descanso, tienda, bendiciones**: cada uno decide lo suyo.
- **Taberna (en común)**: los dos ven los mismos rumores (y la opción de olvidar una carta); cada uno vota y, si no
  coinciden, decide la moneda (cara = quien invita). Un rumor marca **la misma misión para los dos**; olvidar hace
  que cada uno escoja después una carta de su propio mazo (quien no tiene ninguna, no hace nada).
- **Sin estado global compartido con el resto del juego**: los ids de carta salen de un contador del módulo que la
  partida a dos toma prestado mientras aplica cada entrada (y la animación puede durar segundos). Nada fuera de la
  partida debe crear cartas mientras tanto: la sincronización con la nube del título comprueba el guardado en
  solitario sin reconstruirlo (`esCargable`). El cliente nunca deja de pedir `resync` si el hash no cuadra.
- La sala termina cuando los dos han cerrado lo suyo; entonces se guarda y se pasa al mapa.

### Decisiones aplicadas (revertibles)

- **D1.** Enemigos a dos: PV ×1,6 (el daño no cambia). Vale también para los que se unen durante el combate
  (invocados, escindidos, refuerzos, el que sale de la filacteria…); el Dungeon Master no se escala.
- **D2.** (Sustituida.) El daño enemigo alcanza **a los dos héroes a la vez**: cada ataque, y cada efecto enemigo
  dirigido a «el héroe» (debilitadores, estados, cartas que se añaden al mazo), se aplica a **cada héroe vivo**, cada
  uno con su bloqueo, Vulnerable y reliquias defensivas. Un ataque de varios golpes da todos los golpes a los dos.
  Ya no hay tirada de objetivo (no gasta rng). Excepción: cada Rayo del Dungeon Master mata a **un solo** héroe,
  elegido con el rng compartido entre los vivos (en solitario no se tira nada). Con el daño
  efectivamente doblado, ×1,6 PV se mantiene salvo que bot contra bot muestre la partida imposible.
- **D3.** Un héroe a 0 PV queda caído el resto del combate (sin turno). Si su compañero gana, se levanta con el 25 %
  de sus PV máximos. Si caen los dos, la run termina para ambos.
- **D8.** Raíces y Oscuridad solo protegen a quien las lanzó (nerf a dos). Cada instancia de Raíces y cada aplicación de
  Oscuridad recuerda el hueco que la lanzó (`raicesDe(e, hueco)`, `oscuridadDe(e, hueco)`); cuando un ataque enemigo
  resuelve contra un héroe, solo le resta **sus** raíces y **su** oscuridad, y el compañero recibe el daño normal. Si
  las raíces de quien las lanzó dejan el golpe dirigido a él en cero o menos, el enemigo se hiere con la diferencia
  (como en solitario). Orden de resolución y de animación: primero el enemigo se hiere (rebote de las raíces) y luego
  golpea al otro héroe, si sigue vivo. Cada pantalla muestra en la intención el daño que **le** hará a quien la mira,
  así que las cifras pueden diferir entre las dos. En solitario no cambia nada (un solo hueco: los totales de siempre).
- **D4.** El final secreto del DM vale si cualquiera de los dos lo consigue.
- **D5.** Eventos que afectan a lo compartido: moneda.
- **D6.** (Sustituida.) Las partidas multijugador **sí** cuentan en la clasificación: cuando una termina (victoria, derrota o final
  verdadero del DM), **el servidor** la registra desde la Sala (autoritativo, sin POST del cliente) en `duo_runs`; las partidas contra el bot
  no se registran. `GET /leaderboard?mode=duo` da la mejor partida de cada **pareja de perfiles** con el mismo orden que en solitario, y el
  panel tiene una pestaña «👥 Dúo» con los dos jugadores y su clase en la misma fila.
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
- **C. Integración** (hecha): la Sala ejecuta el motor (valida entradas, calcula el hash y el guardado, juega el bot). El cliente
  (`src/ui/partida-multi.ts`) reconstruye desde el guardado + log, aplica en orden lo que difunde la sala (sin predicción), pide
  `{t:'resync'}` si el hash no coincide y reconecta con espera creciente. Combate: la pantalla de solitario con los dos héroes
  (`pantallaCombate(…, multi)`); mapa con los dos votos; moneda (`src/ui/moneda.ts`); el resto de salas, un panel de elección genérico.
  Las intenciones enemigas de ataque llevan la marca 👥 («os ataca a los dos») y el daño se anima sobre los dos héroes.
