import type { EnemigoDef, EstadoRun } from './types.ts';
import { ACTOS } from './enemigos.ts';
import { elegir } from './rng.ts';

/** The enemies of a normal fight room (the node is already marked visited and `piso` already
 *  counted): early rooms only send up to two enemies. `orden` is the fight's place among the
 *  act's normal fights, which eases the first ones in (see dificultad.ts). */
export function grupoNormal(run: EstadoRun, rng: () => number): { grupo: EnemigoDef[]; orden: number } {
  const cap = ACTOS[run.capitulo][run.escenario];
  const grupo = elegir(rng, cap.normales.filter((g) => g.length <= (run.piso < 3 ? 2 : 3)));
  const orden = run.mapa.filter((n) => n.tipo === 'combate' && n.visitado).length - 1;
  return { grupo, orden };
}
