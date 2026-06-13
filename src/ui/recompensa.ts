import type { CartaDef, EstadoRun, ReliquiaDef } from '../core/types.ts';
import { instanciar, recompensaCartas } from '../core/cartas.ts';
import { POOL_RELIQUIAS } from '../core/reliquias.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { renderCarta } from './carta.ts';

/** Overlay de elección de carta tras un combate. */
export function elegirCarta(run: EstadoRun, rng: () => number, pesoRaro = 4): Promise<void> {
  return new Promise((resolver) => {
    const opciones = recompensaCartas(run.clase, rng, pesoRaro);
    if (opciones.length === 0) return resolver();

    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';

    const panel = el('div', 'panel-recompensa');
    panel.innerHTML = `
      <h2>🏆 Botín de guerra</h2>
      <p>Añade una carta a tu mazo</p>
      <div class="recompensa-cartas"></div>
      <button class="btn-saltar">Seguir sin carta <span class="atajo">[S]</span></button>
    `;
    overlay.appendChild(panel);

    const cont = panel.querySelector('.recompensa-cartas') as HTMLElement;
    const cartas: HTMLElement[] = opciones.map((def, i) => {
      const c = renderCarta(def);
      c.classList.add('carta-recompensa');
      c.style.setProperty('--retraso', `${i * 0.12}s`);
      c.addEventListener('click', () => tomar(def));
      cont.appendChild(c);
      return c;
    });

    let idx = 0;
    const marcar = () => cartas.forEach((c, i) => c.classList.toggle('seleccionada', i === idx));
    marcar();

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
        ev.preventDefault();
        idx = (idx + (ev.code === 'ArrowRight' ? 1 : -1) + cartas.length) % cartas.length;
        marcar();
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        tomar(opciones[idx]);
      } else if (ev.code === 'KeyS' || ev.code === 'Escape') {
        cerrar();
      }
    };
    window.addEventListener('keydown', teclado);
    panel.querySelector('.btn-saltar')!.addEventListener('click', cerrar);

    function tomar(def: CartaDef) {
      run.mazo.push(instanciar(def));
      anuncio(`+ ${def.nombre}`, 'anuncio-botin');
      cerrar();
    }
    function cerrar() {
      window.removeEventListener('keydown', teclado);
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    }
  });
}

/** Overlay de obtención de reliquia (cofres y élites). */
export function obtenerReliquia(run: EstadoRun, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    const propias = new Set(run.reliquias.map((r) => r.id));
    const candidatas = POOL_RELIQUIAS.filter(
      (r) => !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase),
    );
    if (candidatas.length === 0) {
      run.pv = Math.min(run.pvMax, run.pv + 10);
      anuncio('El cofre contiene vendas: +10 PV', 'anuncio-botin');
      return resolver();
    }
    const reliquia: ReliquiaDef = candidatas[Math.floor(rng() * candidatas.length)];

    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';
    const panel = el('div', 'panel-recompensa panel-reliquia');
    panel.innerHTML = `
      <h2>🧰 ¡Has encontrado una reliquia!</h2>
      <div class="reliquia-grande">${reliquia.icono}</div>
      <h3>${reliquia.nombre}</h3>
      <p>${reliquia.texto}</p>
      <button class="btn-tomar">Tomar <span class="atajo">[Enter]</span></button>
    `;
    overlay.appendChild(panel);
    fx.estallido('divino');

    const cerrar = () => {
      run.reliquias.push(reliquia);
      reliquia.alObtener?.(run);
      window.removeEventListener('keydown', teclado);
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        cerrar();
      }
    };
    window.addEventListener('keydown', teclado);
    panel.querySelector('.btn-tomar')!.addEventListener('click', cerrar);
  });
}

/** Pantalla de campamento: descansar (curar) o afilar (mejorar 1 carta). */
export function pantallaDescanso(run: EstadoRun): Promise<void> {
  return new Promise((resolver) => {
    const overlay = document.getElementById('overlay')!;
    const cura = Math.floor(run.pvMax * 0.3);

    function cerrar(fnTeclado: (ev: KeyboardEvent) => void) {
      window.removeEventListener('keydown', fnTeclado);
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    }

    function vistaPrincipal() {
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const mejorables = run.mazo.filter((c) => !c.mejorada && c.def.mejora);
      const panel = el('div', 'panel-recompensa panel-descanso');
      panel.innerHTML = `
        <h2>🏕️ Campamento</h2>
        <div class="hoguera">🔥</div>
        <p>El fuego crepita. Hay tiempo para una sola cosa antes de seguir.</p>
        <div class="descanso-opciones">
          <button class="btn-tomar btn-descansar">😴 Descansar<small>Cura ${cura} PV</small></button>
          <button class="btn-tomar btn-afilar" ${mejorables.length === 0 ? 'disabled' : ''}>
            ⚒️ Afilar<small>Mejora 1 carta del mazo</small></button>
        </div>
        <p class="titulo-ayuda">←→ y Enter, o haz clic</p>
      `;
      overlay.appendChild(panel);

      const botones = [...panel.querySelectorAll<HTMLButtonElement>('.btn-tomar')];
      let idx = 0;
      const marcar = () => botones.forEach((b, i) => b.classList.toggle('op-foco', i === idx));
      marcar();

      const teclado = (ev: KeyboardEvent) => {
        if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
          ev.preventDefault();
          idx = (idx + 1) % botones.length;
          marcar();
        } else if (ev.code === 'Enter' || ev.code === 'Space') {
          ev.preventDefault();
          botones[idx].click();
        }
      };
      window.addEventListener('keydown', teclado);

      panel.querySelector('.btn-descansar')!.addEventListener('click', () => {
        run.pv = Math.min(run.pvMax, run.pv + cura);
        anuncio(`+${cura} PV`, 'anuncio-botin');
        cerrar(teclado);
      });
      panel.querySelector('.btn-afilar')!.addEventListener('click', () => {
        if (mejorables.length === 0) return;
        window.removeEventListener('keydown', teclado);
        vistaMejora();
      });
    }

    function vistaMejora() {
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const mejorables = run.mazo.filter((c) => !c.mejorada && c.def.mejora);
      const panel = el('div', 'panel-recompensa panel-mejora');
      panel.innerHTML = `
        <h2>⚒️ Afilar</h2>
        <p>Elige la carta que quieres mejorar</p>
        <div class="mejora-rejilla"></div>
        <button class="btn-saltar">Volver <span class="atajo">[Esc]</span></button>
      `;
      overlay.appendChild(panel);

      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;
      const cartas: HTMLElement[] = mejorables.map((inst, i) => {
        const c = renderCarta(inst.def);
        const m = inst.def.mejora!;
        c.dataset.tip = `<strong>⚒️ ${inst.def.nombre}+</strong><br>${m.texto.replaceAll('\n', '<br>')}${
          m.coste !== undefined ? `<br><em>Coste: ${m.coste}</em>` : ''
        }`;
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.04, 0.5)}s`);
        c.addEventListener('click', () => mejorar(i));
        rejilla.appendChild(c);
        return c;
      });

      let idx = 0;
      const marcar = () => cartas.forEach((c, i) => {
        c.classList.toggle('seleccionada', i === idx);
        if (i === idx) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      marcar();

      function mejorar(i: number) {
        const inst = mejorables[i];
        inst.mejorada = true;
        anuncio(`⚒️ ${inst.def.nombre} → ${inst.def.nombre}+`, 'anuncio-botin');
        cerrar(teclado);
      }

      const teclado = (ev: KeyboardEvent) => {
        if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
          ev.preventDefault();
          const dir = ev.code === 'ArrowRight' ? 1 : -1;
          idx = (idx + dir + cartas.length) % cartas.length;
          marcar();
        } else if (ev.code === 'Enter' || ev.code === 'Space') {
          ev.preventDefault();
          mejorar(idx);
        } else if (ev.code === 'Escape') {
          salir();
        }
      };
      const salir = () => {
        window.removeEventListener('keydown', teclado);
        vistaPrincipal();
      };
      window.addEventListener('keydown', teclado);
      panel.querySelector('.btn-saltar')!.addEventListener('click', salir);
    }

    vistaPrincipal();
  });
}
