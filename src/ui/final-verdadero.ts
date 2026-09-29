// True ending (secret): the hero seduced the Dungeon Master with a natural 20.
// The DM and the five heroes gather round the table and face the hardest quest
// in D&D: agreeing on a date for the next session.

import '../estilos/final-verdadero.css';
import type { ClaseId } from '../core/types.ts';
import {
  DIAS_AGENDA, GUION_AGENDA, TITULO_FINAL_VERDADERO, marcarFinalVerdadero, type LineaAgenda,
} from '../core/escena-final.ts';
import { ENEMY_RIGS } from '../fx/enemy-rigs.ts';
import { rigOf } from '../fx/hero-rig.ts';
import { fx } from '../fx/particulas.ts';
import { audio } from '../fx/audio.ts';
import { el, espera } from './util.ts';
import { HeroSprite } from './hero-sprite.ts';
import { PuppetSprite } from './puppet-sprite.ts';
import { PuppetStage } from './puppet-stage.ts';

const NOMBRE_CLASE: Record<ClaseId, string> = {
  druida: 'Druida 🌿', barbaro: 'Bárbaro 🪓', mago: 'Mago 🔮', picaro: 'Pícaro 🗡️', brujo: 'Brujo 🕳️', paladin: 'Paladín 🔨',
};
/** Seats around the table: three heroes on each side, the DM behind it. */
const IZQUIERDA: ClaseId[] = ['druida', 'barbaro', 'paladin'];
const DERECHA: ClaseId[] = ['mago', 'picaro', 'brujo'];

export function pantallaFinalVerdadero(clase: ClaseId): Promise<void> {
  // remembered right away, so it counts even if the scene is skipped
  marcarFinalVerdadero();
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-final-verdadero';
    fx.ambiente(true);
    audio.menu(); // the friendly main theme: the campaign is over

    const raiz = el('div', 'fv');
    raiz.innerHTML = `
      <h1 class="fv-titulo">${TITULO_FINAL_VERDADERO}</h1>
      <div class="fv-mesa-escena">
        <div class="fv-asientos fv-izquierda"></div>
        <div class="fv-centro">
          <div class="fv-agenda" aria-label="Agenda del DM">
            <div class="fv-agenda-titulo">📅 Próxima sesión</div>
            <div class="fv-dias">${DIAS_AGENDA.map((d) => `<span class="fv-dia" data-dia="${d}">${d}</span>`).join('')}</div>
          </div>
          <div class="fv-dm"></div>
          <div class="fv-mesa"><span class="fv-mesa-dado">🎲</span><span class="fv-mesa-vela">🕯️</span><span class="fv-mesa-mapa">🗺️</span></div>
        </div>
        <div class="fv-asientos fv-derecha"></div>
      </div>
      <div class="fv-final">
        <p class="fv-texto">Sedujiste al Dungeon Master con un 20 natural, y la mesa entera
        logró lo imposible: <strong>cuadrar agendas</strong>. La próxima sesión es el sábado
        a las 17:00. Trae dados.</p>
        <p class="fin-sub">Campaña completada con el ${NOMBRE_CLASE[clase]} · ¡Final verdadero!</p>
        <button class="btn-tomar fv-volver">Volver al título <span class="atajo">[Enter]</span></button>
      </div>
      <button class="fv-saltar">Saltar ⏭</button>
    `;
    app.appendChild(raiz);

    const stage = PuppetStage.create(raiz, { fixed: true, style: 'z-index:6;' });
    const sprites = new Map<LineaAgenda['quien'], PuppetSprite>();
    const sentar = (id: ClaseId, cont: Element, mirrored: boolean) => {
      const asiento = el('div', 'fv-heroe');
      asiento.dataset.quien = id;
      // the right-hand heroes turn to face the table
      const s = mirrored ? new PuppetSprite(rigOf(id), { style: 'silhouette', mirrored: true, stage }) : new HeroSprite(id, stage);
      asiento.appendChild(s.element);
      cont.appendChild(asiento);
      sprites.set(id, s);
    };
    IZQUIERDA.forEach((id) => sentar(id, raiz.querySelector('.fv-izquierda')!, false));
    DERECHA.forEach((id) => sentar(id, raiz.querySelector('.fv-derecha')!, true));
    // the DM, out from behind his screen at last (well, peeking over it)
    const dm = new PuppetSprite(ENEMY_RIGS['dungeon-master'], { style: 'illustrated', mirrored: false, stage });
    raiz.querySelector('.fv-dm')!.appendChild(dm.element);
    sprites.set('dm', dm);

    const hablante = (quien: LineaAgenda['quien']): Element | null =>
      quien === 'dm' ? raiz.querySelector('.fv-dm') : raiz.querySelector(`.fv-heroe[data-quien="${quien}"]`);

    let bocadilloActual: HTMLElement | null = null;
    const decir = (linea: LineaAgenda) => {
      bocadilloActual?.remove();
      const quien = hablante(linea.quien);
      const r = (quien?.querySelector('.sprite-marioneta') ?? quien)?.getBoundingClientRect();
      const b = el('div', `bocadillo-dm fv-bocadillo ${linea.quien === 'dm' ? 'fv-bocadillo-dm' : ''}`, linea.texto);
      b.setAttribute('role', 'status');
      document.body.appendChild(b);
      const w = Math.min(240, window.innerWidth - 24);
      b.style.maxWidth = `${w}px`;
      if (r) {
        // the DM speaks from beside his hood (his diary sits above it); heroes, from overhead
        const centro = linea.quien === 'dm' ? r.left + r.width * 0.95 : r.left + r.width / 2;
        b.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, centro - w / 2))}px`;
        b.style.top = `${Math.max(b.offsetHeight + 8, r.top + r.height * (linea.quien === 'dm' ? 0.3 : 0.1))}px`;
      }
      bocadilloActual = b;
      sprites.get(linea.quien)?.play('spell');
      for (const d of linea.tacha ?? []) raiz.querySelector(`.fv-dia[data-dia="${d}"]`)?.classList.add('fv-tachado');
      if (linea.marca) raiz.querySelector(`.fv-dia[data-dia="${linea.marca}"]`)?.classList.add('fv-elegido');
    };

    let saltado = false;
    let terminado = false;
    const celebrar = () => {
      if (terminado) return;
      terminado = true;
      bocadilloActual?.remove();
      for (const linea of GUION_AGENDA) {
        for (const d of linea.tacha ?? []) raiz.querySelector(`.fv-dia[data-dia="${d}"]`)?.classList.add('fv-tachado');
        if (linea.marca) raiz.querySelector(`.fv-dia[data-dia="${linea.marca}"]`)?.classList.add('fv-elegido');
      }
      raiz.classList.add('fv-hay-fecha');
      raiz.querySelector('.fv-saltar')?.remove();
      audio.sfx('divino');
      fx.estallido('estrellas');
      setTimeout(() => fx.estallido('corazones'), 350);
      setTimeout(() => fx.estallido('divino'), 750);
      setTimeout(() => fx.estallido('estrellas'), 1200);
      for (const s of sprites.values()) s.play('spell');
      (raiz.querySelector('.fv-volver') as HTMLElement).focus();
    };

    const cerrar = () => {
      if (!terminado) return;
      window.removeEventListener('keydown', teclado);
      bocadilloActual?.remove();
      for (const s of sprites.values()) s.destroy();
      stage?.destroy();
      resolver();
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code !== 'Enter' && ev.code !== 'Space' && ev.code !== 'Escape') return;
      ev.preventDefault();
      if (terminado) cerrar();
      else { saltado = true; celebrar(); }
    };
    window.addEventListener('keydown', teclado);
    raiz.querySelector('.fv-volver')!.addEventListener('click', cerrar);
    raiz.querySelector('.fv-saltar')!.addEventListener('click', () => { saltado = true; celebrar(); });

    // the scheduling scene, line by line
    void (async () => {
      await espera(900);
      for (const linea of GUION_AGENDA) {
        if (saltado) return;
        decir(linea);
        await espera(Math.max(1700, linea.texto.length * 55));
      }
      if (!saltado) celebrar();
    })();
  });
}
