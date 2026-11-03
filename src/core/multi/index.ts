// Contract of the two-player engine (docs/multijugador.md). The server (Durable Object), both
// clients and the smoke tests import from here.
export type {
  Hueco, Entrada, EntradaSellada, Pregunta, PresentadoresMulti, ResultadoMoneda, GuardadoMulti, FaseGuardada,
} from './tipos.ts';
export { HUECOS, otroHueco } from './tipos.ts';
export {
  crearPartidaMulti, serializarPartidaMulti, rehidratarPartidaMulti, esPuntoDeGuardado,
  pendiente, esValida, aplicar, hashPartida, decisionBot, moneda,
  type PartidaMulti,
} from './partida.ts';
export { CombateDuo } from './combate-duo.ts';
export type { Fase, Sala } from './estado.ts';
