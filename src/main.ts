import './estilos/base.css';
import './estilos/cartas.css';
import './estilos/combate.css';
import './estilos/pantallas.css';
import './estilos/movil.css';

import { crearRng, elegir } from './core/rng.ts';
import { nuevaRun, avanzarCapitulo } from './core/run.ts';
import { ACTOS } from './core/enemigos.ts';
import { guardarRun, cargarRun, hayGuardado, borrarGuardado } from './core/guardado.ts';
import { fx } from './fx/particulas.ts';
import { audio } from './fx/audio.ts';
import { pantallaTitulo } from './ui/titulo.ts';
import { pantallaMapa } from './ui/mapa.ts';
import { pantallaCombate } from './ui/combate.ts';
import { pantallaCapitulo } from './ui/capitulo.ts';
import { pantallaBendicion } from './ui/bendicion.ts';
import { pantallaMision } from './ui/mision.ts';
import { avisoInstalacion } from './ui/instalar.ts';
import { iniciarActualizaciones } from './ui/actualizacion.ts';
import { elegirCarta, obtenerReliquia, pantallaDescanso } from './ui/recompensa.ts';
import { pantallaEvento } from './ui/evento.ts';
import { pantallaFin } from './ui/fin.ts';
import { iniciarTooltips } from './ui/util.ts';

fx.iniciar(document.getElementById('fx-canvas') as HTMLCanvasElement);
iniciarTooltips();
avisoInstalacion();
iniciarActualizaciones();

// Audio: el botón de silencio y, al primer gesto, contexto + música lo-fi
audio.crearBoton();
const arrancarAudio = () => {
  audio.desbloquear();
  audio.menu(); // tema del menú principal
};
window.addEventListener('pointerdown', arrancarAudio, { once: true });
window.addEventListener('keydown', arrancarAudio, { once: true });

async function juego() {
  for (;;) {
    document.body.dataset.capitulo = '0';
    fx.estiloAmbiente = 'brasas';
    audio.menu(); // música del menú principal
    const eleccion = await pantallaTitulo(hayGuardado());

    let run;
    if (eleccion.tipo === 'continuar') {
      run = cargarRun();
      if (!run) continue; // guardado corrupto o de otra versión: vuelve al título
    } else {
      run = nuevaRun(eleccion.clase);
    }

    // la semilla deriva del guardado: el rng continúa distinto pero determinista
    const rng = crearRng((run.semilla ^ 0x9e3779b9) + run.piso * 7919);

    if (eleccion.tipo === 'nueva') {
      document.body.dataset.escenario = String(run.escenario);
      fx.estiloAmbiente = ACTOS[0][run.escenario].ambiente;
      await pantallaCapitulo(ACTOS[0][run.escenario]);
      await pantallaMision(run, rng); // el Senescal encomienda la misión
      guardarRun(run);
    }
    let vivo = true;
    let campanaCompleta = false;

    while (vivo && !campanaCompleta) {
      const cap = ACTOS[run.capitulo][run.escenario];
      document.body.dataset.capitulo = String(run.capitulo);
      document.body.dataset.escenario = String(run.escenario);
      fx.estiloAmbiente = cap.ambiente;
      audio.musica(run.capitulo); // música de exploración del capítulo

      const nodo = await pantallaMapa(run, `${cap.subtitulo} · ${cap.nombre}`);
      nodo.visitado = true;
      run.nodoActual = nodo.id;
      run.piso++;

      switch (nodo.tipo) {
        case 'combate': {
          const grupo = elegir(rng, cap.normales.filter((g) => g.length <= (run.piso < 3 ? 2 : 3)));
          const resultado = await pantallaCombate(run, grupo, rng, false, cap.nombre);
          if (resultado === 'derrota') vivo = false;
          else await elegirCarta(run, rng);
          break;
        }
        case 'elite': {
          const grupo = elegir(rng, cap.elites);
          const resultado = await pantallaCombate(run, grupo, rng, false, cap.nombre, true);
          if (resultado === 'derrota') vivo = false;
          else {
            await obtenerReliquia(run, rng);
            await elegirCarta(run, rng, 25); // élite: bastante más probable que salga rara
          }
          break;
        }
        case 'cofre':
          await obtenerReliquia(run, rng);
          break;
        case 'descanso':
          await pantallaDescanso(run);
          break;
        case 'evento':
          await pantallaEvento(run, rng);
          break;
        case 'jefe': {
          const resultado = await pantallaCombate(run, cap.jefe, rng, true, cap.nombre);
          if (resultado === 'derrota') {
            vivo = false;
          } else if (run.capitulo + 1 < ACTOS.length) {
            // botín de jefe, bendición de la Vidente y siguiente capítulo
            await obtenerReliquia(run, rng);
            await elegirCarta(run, rng, 100); // garantiza elección de rara
            await pantallaBendicion(run, rng);
            avanzarCapitulo(run, rng);
            await pantallaCapitulo(ACTOS[run.capitulo][run.escenario]);
          } else {
            campanaCompleta = true;
          }
          break;
        }
      }

      // guardado automático tras resolver cada sala
      if (vivo && !campanaCompleta) guardarRun(run);
    }

    borrarGuardado(); // la run terminó: muerte o victoria
    // el epílogo depende del jefe del escenario final que te haya tocado
    const actoFinal = ACTOS[ACTOS.length - 1][run.escenario];
    await pantallaFin(campanaCompleta, run.clase, actoFinal.jefe[0].id);
  }
}

void juego();
