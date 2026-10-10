import './estilos/base.css';
import './estilos/cartas.css';
import './estilos/combate.css';
import './estilos/pantallas.css';
import './estilos/movil.css';

import { crearRng, elegir } from './core/rng.ts';
import { nuevaRun, avanzarCapitulo, sortearEscenario, entrarEnSala, cartaExtraEnSala, elegirElite } from './core/run.ts';
import { ACTOS, DUNGEON_MASTER } from './core/enemigos.ts';
import { desenlaceCampana } from './core/escena-final.ts';
import { guardarRun, cargarRun, hayGuardado, borrarGuardado } from './core/guardado.ts';
import { fx } from './fx/particulas.ts';
import { audio } from './fx/audio.ts';
import { exploreTheme } from './fx/music-tracks.ts';
import { pantallaTitulo, type EleccionTitulo } from './ui/titulo.ts';
import { pantallaMapa } from './ui/mapa.ts';
import { pantallaCombate, caidaDelHeroe } from './ui/combate.ts';
import { pantallaCapitulo } from './ui/capitulo.ts';
import { pantallaBendicion } from './ui/bendicion.ts';
import { avisoInstalacion } from './ui/instalar.ts';
import { iniciarActualizaciones } from './ui/actualizacion.ts';
import { elegirCarta, obtenerReliquia, pantallaDescanso } from './ui/recompensa.ts';
import { pantallaEvento } from './ui/evento.ts';
import { pantallaTaberna, panelMisionCumplida } from './ui/taberna.ts';
import { revisarMision, completarMision } from './core/taberna.ts';
import { pantallaFin } from './ui/fin.ts';
import { pantallaFinalVerdadero } from './ui/final-verdadero.ts';
import { iniciarTooltips, anuncio } from './ui/util.ts';
import { crearMenuAjustes } from './ui/menu-ajustes.ts';
import { activarSonidoInterfaz } from './ui/sonido-interfaz.ts';

fx.iniciar(document.getElementById('fx-canvas') as HTMLCanvasElement);
iniciarTooltips();
avisoInstalacion();
iniciarActualizaciones();

// Settings menu (sound, volume, performance) at the top right of every screen
crearMenuAjustes();
// Soft click on every button and toggle
activarSonidoInterfaz();
// Audio: al primer gesto, contexto + música del menú
const arrancarAudio = () => {
  audio.desbloquear();
  audio.menu(); // tema del menú principal
};
window.addEventListener('pointerdown', arrancarAudio, { once: true });
window.addEventListener('keydown', arrancarAudio, { once: true });

async function juego() {
  // «Try again» on the defeat screen starts a new run with the same class, skipping the title
  let reintento: EleccionTitulo | null = null;
  for (;;) {
    document.body.dataset.capitulo = '0';
    fx.estiloAmbiente = 'brasas';
    audio.menu(); // música del menú principal
    const eleccion = reintento ?? await pantallaTitulo(hayGuardado());
    reintento = null;

    let run;
    if (eleccion.tipo === 'continuar') {
      run = cargarRun();
      if (!run) continue; // guardado corrupto o de otra versión: vuelve al título
    } else {
      borrarGuardado(); // the player confirmed on the title that the old save goes
      run = nuevaRun(eleccion.clase);
    }

    // la semilla deriva del guardado: el rng continúa distinto pero determinista
    const rng = crearRng((run.semilla ^ 0x9e3779b9) + run.piso * 7919);

    if (eleccion.tipo === 'nueva') {
      document.body.dataset.escenario = String(run.escenario);
      fx.estiloAmbiente = ACTOS[0][run.escenario].ambiente;
      await pantallaCapitulo(ACTOS[0][run.escenario], run.clase);
      await pantallaBendicion(run, rng, 'inicial'); // the Senescal's task: pick a blessing relic
      guardarRun(run);
    }
    let vivo = true;
    let campanaCompleta = false;
    let escenaDM: 'victoria' | 'derrota' | null = null; // result of the Dungeon Master scene

    while (vivo && !campanaCompleta) {
      const cap = ACTOS[run.capitulo][run.escenario];
      document.body.dataset.capitulo = String(run.capitulo);
      document.body.dataset.escenario = String(run.escenario);
      fx.estiloAmbiente = cap.ambiente;
      audio.reproducirTema(exploreTheme(run.capitulo, run.escenario)); // the scenario's map version

      const nodo = await pantallaMapa(run, `${cap.subtitulo} · ${cap.nombre}`);
      nodo.visitado = true;
      run.nodoActual = nodo.id;
      run.piso++;
      // A tavern quest whose node is now out of reach is quietly lost
      if (revisarMision(run)) anuncio('📜 Has dejado atrás el lugar del rumor: misión perdida', 'anuncio-botin');
      // Relics that react to the room you step into (Adventurer's Journal…)
      for (const nota of entrarEnSala(run, nodo.tipo, rng)) anuncio(nota, 'anuncio-botin');

      switch (nodo.tipo) {
        case 'combate': {
          const grupo = elegir(rng, cap.normales.filter((g) => g.length <= (run.piso < 3 ? 2 : 3)));
          // its place among this act's normal fights (the node is already marked visited)
          const orden = run.mapa.filter((n) => n.tipo === 'combate' && n.visitado).length - 1;
          const resultado = await pantallaCombate(run, grupo, rng, false, cap.nombre, false, orden);
          if (resultado === 'derrota') vivo = false;
          else await elegirCarta(run, rng);
          break;
        }
        case 'elite': {
          const grupo = elegirElite(run, rng); // none repeats until the others have come out
          const resultado = await pantallaCombate(run, grupo, rng, false, cap.nombre, true);
          if (resultado === 'derrota') vivo = false;
          else {
            await obtenerReliquia(run, rng, 'elite');
            await elegirCarta(run, rng, 25); // élite: bastante más probable que salga rara
          }
          break;
        }
        case 'cofre':
          await obtenerReliquia(run, rng);
          break;
        case 'descanso':
          await pantallaDescanso(run, rng);
          break;
        case 'evento':
          await pantallaEvento(run, rng);
          break;
        case 'taberna':
          await pantallaTaberna(run, nodo, rng);
          break;
        case 'jefe': {
          const resultado = await pantallaCombate(run, cap.jefe, rng, true, cap.nombre);
          if (resultado === 'derrota') {
            vivo = false;
          } else if (run.capitulo + 1 < ACTOS.length) {
            // botín de jefe, bendición de la Vidente y siguiente capítulo
            await obtenerReliquia(run, rng, 'jefe');
            await elegirCarta(run, rng, 100); // garantiza elección de rara
            // the next act's map is drawn first, so Síbila can foretell it
            const siguiente = sortearEscenario(rng);
            await pantallaBendicion(run, rng, 'entreActos', siguiente);
            avanzarCapitulo(run, rng, siguiente);
            await pantallaCapitulo(ACTOS[run.capitulo][run.escenario], run.clase);
          } else {
            // Final joke: the Dungeon Master has the last word. The run is already
            // won, so the save goes now and his ray can only end in victory.
            campanaCompleta = true;
            borrarGuardado();
            escenaDM = await pantallaCombate(run, [DUNGEON_MASTER], rng, true, 'Detrás de la pantalla');
            audio.menu(); // the DM's metal gives way to the main theme for the closing screens
          }
          break;
        }
      }

      // Tavern quest completed: a relic on top of the room's normal reward
      if (vivo && !campanaCompleta) {
        const reliquia = completarMision(run, nodo, rng);
        if (reliquia) await panelMisionCumplida(reliquia);
      }

      // Relics that add a card reward to some rooms (Treasure Map on chests)
      if (vivo && !campanaCompleta && cartaExtraEnSala(run, nodo.tipo)) await elegirCarta(run, rng);

      // guardado automático tras resolver cada sala
      if (vivo && !campanaCompleta) guardarRun(run);
    }

    const desenlace = desenlaceCampana(campanaCompleta, escenaDM);
    if (desenlace.borrarGuardado) borrarGuardado(); // la run terminó: muerte o victoria
    // el epílogo depende del jefe del escenario final que te haya tocado
    const actoFinal = ACTOS[ACTOS.length - 1][run.escenario];
    // the secret: the DM fell to a natural 20 on Seduce, and the table finds a date
    if (desenlace.finalVerdadero) await pantallaFinalVerdadero(run.clase);
    else {
      // the tombstone: where, against whom and how far the hero got
      const caida = desenlace.victoria ? null : {
        clase: run.clase, capitulo: run.capitulo, subtitulo: ACTOS[run.capitulo][run.escenario].subtitulo,
        escenario: ACTOS[run.capitulo][run.escenario].nombre, asesino: caidaDelHeroe()?.asesino ?? null,
        salas: run.piso, turnos: caidaDelHeroe()?.turnos ?? null, semilla: run.semilla + run.piso,
        // for the roast: who did it, in which boss fight, and how the hero played the run
        asesinoId: caidaDelHeroe()?.asesinoId ?? null, jefeId: caidaDelHeroe()?.jefeId ?? null,
        estadisticas: run.estadisticas ?? null, mazo: run.mazo.length, maldiciones: caidaDelHeroe()?.maldiciones ?? 0,
      };
      const eleccionFin = await pantallaFin(desenlace.victoria, run.clase, actoFinal.jefe[0].id, desenlace.epilogoDM, caida);
      if (eleccionFin === 'reintentar' && !desenlace.victoria) reintento = { tipo: 'nueva', clase: run.clase };
    }
  }
}

void juego();
