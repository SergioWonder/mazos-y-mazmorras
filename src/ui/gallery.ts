// Sprite gallery (main menu): every hero, druid form, invocation and illustrated
// enemy, animated, with a mode selector to loop attacks, hits and deaths.

import { rigOf, type RigId } from '../fx/hero-rig.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from '../fx/enemy-rigs.ts';
import type { ActionType } from '../fx/puppet.ts';
import { PuppetSprite, LUZ_LUNA } from './puppet-sprite.ts';
import { PuppetStage } from './puppet-stage.ts';
import { galleryCatalogue, type GalleryCard } from './gallery-catalogue.ts';
import { el } from './util.ts';

type Mode = 'cycle' | 'idle' | 'attack' | 'hit' | 'death';
const MODES: [Mode, string][] = [['cycle', 'Ciclo'], ['idle', 'Reposo'], ['attack', 'Ataque'], ['hit', 'Golpe'], ['death', 'Muerte']];
/** Loop length (s) and the actions played inside it, per mode. */
const SCRIPTS: Record<Exclude<Mode, 'idle'>, { period: number; steps: [number, ActionType][] }> = {
  cycle: { period: 4.8, steps: [[0.4, 'attack'], [2.0, 'hit'], [3.3, 'death']] },
  attack: { period: 2.0, steps: [[0.3, 'attack']] },
  hit: { period: 1.6, steps: [[0.3, 'hit']] },
  death: { period: 2.4, steps: [[0.3, 'death']] },
};

interface Entry { card: GalleryCard; sprite: PuppetSprite; offset: number; last: number }

function spriteFor(card: GalleryCard, act: number, stage: PuppetStage | null): PuppetSprite {
  const rim = LUZ_LUNA[act] ?? LUZ_LUNA[0];
  if (card.kind === 'enemy') return new PuppetSprite(ENEMY_RIGS[card.id], { style: 'illustrated', mirrored: true, rim, stage });
  if (card.kind === 'invocation') return new PuppetSprite(INVOCATION_RIGS[card.id], { style: 'illustrated', rim, stage });
  return new PuppetSprite(rigOf(card.id as RigId), { style: 'silhouette', stage });
}

export function showGallery(): Promise<void> {
  return new Promise((resolve) => {
    const backdrop = el('div', 'gallery-backdrop');
    backdrop.innerHTML = `
      <div class="gallery">
        <header class="gallery-head">
          <h2 class="gallery-title">🎭 Galería de sprites</h2>
          <div class="gallery-modes" role="group" aria-label="Animación">
            ${MODES.map(([m, label]) => `<button type="button" data-mode="${m}" aria-pressed="${m === 'cycle'}">${label}</button>`).join('')}
          </div>
          <button class="btn-cerrar-comp" aria-label="Cerrar">✕</button>
        </header>
        <p class="gallery-help">Pulsa cualquier figura para verla atacar.</p>
        <div class="gallery-body"></div>
      </div>`;
    document.body.appendChild(backdrop);
    // boss particles must show above the gallery while it is open
    const particleCanvas = document.getElementById('fx-canvas');
    const previousZ = particleCanvas?.style.zIndex ?? '';
    if (particleCanvas) particleCanvas.style.zIndex = '90';
    const body = backdrop.querySelector('.gallery-body') as HTMLElement;
    // fixed WebGL canvas over the stages and under the sticky header
    const stage = PuppetStage.create(backdrop, { fixed: true });

    const entries: Entry[] = [];
    const byFigure = new Map<Element, Entry>();
    const observer = new IntersectionObserver((items) => {
      for (const it of items) {
        const entry = byFigure.get(it.target);
        if (entry) entry.sprite.visible = it.isIntersecting;
      }
    }, { root: backdrop, rootMargin: '120px' });

    for (const section of galleryCatalogue()) {
      const sec = el('section', 'gallery-section');
      sec.innerHTML = `<h3 class="gallery-section-title">${section.title}${section.subtitle ? ` <small>${section.subtitle}</small>` : ''}</h3>`;
      const strip = el('div', 'gallery-stage');
      if (section.act !== undefined) strip.dataset.act = String(section.act);
      else strip.dataset.act = section.cards[0]?.kind === 'invocation' ? '0' : 'heroes';
      for (const card of section.cards) {
        const sprite = spriteFor(card, section.act ?? 0, stage);
        const fig = el('figure', 'gallery-card');
        fig.tabIndex = 0;
        fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', `${card.name}: ver ataque`);
        fig.style.setProperty('--esc', String(card.scale));
        const box = el('div', 'gallery-sprite');
        box.appendChild(sprite.element);
        const caption = el('figcaption', '', card.name);
        if (card.elite) caption.appendChild(el('span', 'gallery-elite', 'Élite'));
        if (card.boss) caption.appendChild(el('span', 'gallery-elite gallery-boss', 'Jefe'));
        fig.append(box, caption);
        const attack = () => sprite.play('attack');
        fig.addEventListener('click', attack);
        fig.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); attack(); } });
        strip.appendChild(fig);
        const entry = { card, sprite, offset: entries.length * 0.23, last: -1 };
        entries.push(entry);
        byFigure.set(fig, entry);
        observer.observe(fig);
      }
      sec.appendChild(strip);
      body.appendChild(sec);
    }

    // Mode scheduler: fires each step once per loop, staggered per figure
    let mode: Mode = 'cycle';
    const t0 = performance.now();
    let prevT = 0;
    const timer = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      if (mode !== 'idle') {
        const script = SCRIPTS[mode];
        for (const e of entries) {
          if (!e.sprite.visible) continue;
          const a = (prevT + e.offset) % script.period, b = (t + e.offset) % script.period;
          for (const [at, action] of script.steps) {
            const crossed = a <= b ? at > a && at <= b : at > a || at <= b;
            if (!crossed) continue;
            // heroes and forms never die: they cast instead
            const heroic = e.card.kind === 'hero' || e.card.kind === 'form';
            e.sprite.play(action === 'death' && heroic ? 'spell' : action);
          }
        }
      }
      prevT = t;
    }, 60);

    backdrop.querySelector('.gallery-modes')!.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button');
      if (!btn) return;
      mode = btn.dataset.mode as Mode;
      backdrop.querySelectorAll('.gallery-modes button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      // leave everybody standing when the loop stops
      if (mode === 'idle') for (const e of entries) e.sprite.reset();
    });

    const close = () => {
      window.clearInterval(timer);
      observer.disconnect();
      for (const e of entries) e.sprite.destroy();
      stage?.destroy();
      if (particleCanvas) particleCanvas.style.zIndex = previousZ;
      backdrop.remove();
      window.removeEventListener('keydown', onKey);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') close(); };
    backdrop.querySelector('.btn-cerrar-comp')!.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
  });
}
