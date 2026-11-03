# Multijugador cooperativo (fase 3, diseño)

Dos jugadores en la misma run, contra los mismos combates. Borrador para decidir antes de
programar; nada de esto está implementado todavía.

## Arquitectura

- Una **sala** = un Durable Object (`RoomDO`, almacenamiento SQLite, disponible en el plan
  Free) identificado por un código corto que comparte el anfitrión.
- Los clientes se conectan por **WebSocket** (`GET /rooms/:code/ws`, con la sesión de la cuenta).
  Se usa la *WebSocket Hibernation API*: mientras nadie juega, la sala no consume CPU.
- **Servidor autoritativo**: el DO ejecuta el mismo motor que el juego (`src/core` no toca el
  DOM y usa semilla). Los clientes envían intenciones (`jugarCarta`, `finTurno`, `elegirNodo`);
  el DO las valida, avanza el estado y difunde el resultado. Así no hay trampas ni
  desincronizaciones, y la run cooperativa termina registrándose en `/runs` como cualquier otra.
- Reconexión: el estado vive en el almacenamiento del DO; quien se cae vuelve con el mismo código
  y recibe una instantánea completa.

## Coste en el plan gratuito

100.000 peticiones/día a Durable Objects; los mensajes WebSocket entrantes cuentan 20 a 1 y
los salientes no cuentan. Un combate con ~200 acciones por jugador apenas suma unas decenas
de «peticiones»: sobra para jugar entre amigos.

## Cambios que necesita el motor (lo caro)

1. `EstadoCombate` con **dos héroes**: PV, bloqueo, mano, mazo, energía y estados por héroe.
2. **Turno de los héroes simultáneo**: ambos juegan cartas y el turno enemigo llega cuando
   los dos pulsan «fin de turno». Los enemigos eligen objetivo (aleatorio con la semilla,
   o «el que más amenaza»).
3. Cartas que dicen «tú» frente a «un aliado»: decidir qué cartas pueden apuntar al
   compañero (curas, bloqueo, Fuerza).
4. Mapa: los dos votan el siguiente nodo; si no coinciden, decide el anfitrión o el azar.
5. Recompensas, tienda y taberna por jugador; las reliquias de grupo, a decidir.
6. Escalado de enemigos para dos (por ejemplo ×1,6 de PV).

## Orden propuesto

1. Motor con N héroes y tests de combate cooperativo en `scripts/smoke-test.ts` (sin red).
2. `RoomDO` con salas, WebSocket y el motor en el servidor (tests con `@cloudflare/vitest-plugin`).
3. Interfaz: crear/unirse a sala, ver el tablero del compañero y sus intenciones.
