// Backlit silhouette renderer for the hero puppet (style C): black shapes with a
// rim light in the class colour; only eyes and magic keep their glow. The SVG
// node is persistent so combat re-renders can re-attach it without restarting
// the animation.

import type { ClaseId } from '../core/types.ts';
import {
  HERO_RIGS, EMISSIVE, EYES, heroPose, heroBones, heroEffects, activeAction, ACTION_DURATION, impactFraction,
  type Action, type ActionType, type BoneId, type EffectGeometry, type Shape,
} from '../fx/hero-rig.ts';

const NS = 'http://www.w3.org/2000/svg';
const BLACK = '#0b0910';
let nextId = 0;

function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

function lighten(hex: string, k: number): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + c.map((v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
}

/** Stadium path for a thick segment, so limbs are regular filled shapes. */
function capsule(s: Extract<Shape, { t: 'l' }>): string {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, r = s.w / 2;
  const nx = (-dy / len) * r, ny = (dx / len) * r;
  const f = (v: number) => v.toFixed(2);
  return `M${f(s.x1 + nx)} ${f(s.y1 + ny)}L${f(s.x2 + nx)} ${f(s.y2 + ny)}A${r} ${r} 0 0 0 ${f(s.x2 - nx)} ${f(s.y2 - ny)}`
    + `L${f(s.x1 - nx)} ${f(s.y1 - ny)}A${r} ${r} 0 0 0 ${f(s.x1 + nx)} ${f(s.y1 + ny)}Z`;
}

function shapeElement(s: Shape): SVGElement {
  if (s.t === 'c') return svgEl('circle', { cx: s.x, cy: s.y, r: s.r });
  if (s.t === 'e') return svgEl('ellipse', { cx: s.x, cy: s.y, rx: s.rx, ry: s.ry });
  if (s.t === 'p') return svgEl('polygon', { points: s.pts.map((q) => q.join(',')).join(' ') });
  return svgEl('path', { d: capsule(s) });
}

function arcSector(g: NonNullable<EffectGeometry['slash']>): string {
  const pt = (r: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(g.cx + r * Math.cos(rad)).toFixed(2)} ${(g.cy + r * Math.sin(rad)).toFixed(2)}`;
  };
  const large = g.a1 - g.a0 > 180 ? 1 : 0;
  return `M${pt(g.r1, g.a0)}A${g.r1} ${g.r1} 0 ${large} 1 ${pt(g.r1, g.a1)}L${pt(g.r0, g.a1)}A${g.r0} ${g.r0} 0 ${large} 0 ${pt(g.r0, g.a0)}Z`;
}

const active = new Set<HeroSprite>();
let clock = 0;
let last = 0;
let running = false;

function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  clock += dt;
  for (const s of active) if (s.element.isConnected) s.tick(clock);
  if (active.size) requestAnimationFrame(loop);
  else { running = false; last = 0; }
}

export class HeroSprite {
  readonly element: SVGSVGElement;
  readonly accent: string;
  private readonly cls: ClaseId;
  private readonly groups: { g: SVGElement; bone: BoneId }[] = [];
  private readonly eyes: SVGElement[] = [];
  private readonly shadow: SVGElement;
  private readonly slash: SVGElement;
  private readonly ring: SVGElement;
  private readonly core: SVGElement;
  private readonly orb: SVGElement;
  private action: Action | null = null;
  private rim = 1.8;
  private frames = 0;

  constructor(cls: ClaseId) {
    this.cls = cls;
    const rig = HERO_RIGS[cls];
    this.accent = rig.accent;
    const glowId = `brillo-heroe-${nextId++}`;
    const svg = svgEl('svg', { viewBox: '0 0 140 135', class: 'sprite-heroe', 'aria-hidden': 'true' }) as SVGSVGElement;
    const defs = svgEl('defs');
    const filter = svgEl('filter', { id: glowId, x: '-80%', y: '-80%', width: '260%', height: '260%' });
    filter.append(svgEl('feGaussianBlur', { stdDeviation: 1.8, result: 'b' }));
    const merge = svgEl('feMerge');
    for (const src of ['b', 'b', 'SourceGraphic']) merge.append(svgEl('feMergeNode', { in: src }));
    filter.append(merge);
    defs.append(filter);
    svg.append(defs);

    this.shadow = svgEl('ellipse', { cx: 58, cy: 129.5, rx: 22, ry: 4.2, fill: 'rgba(0,0,0,0.55)' });
    svg.append(this.shadow);

    const glow = `url(#${glowId})`;
    const eyeColour = lighten(rig.accent, 0.55);
    let group: SVGElement | null = null;
    let bone: BoneId | null = null;
    for (const s of rig.shapes) {
      if (s.b !== bone) {
        group = svgEl('g');
        svg.append(group);
        this.groups.push({ g: group, bone: s.b });
        bone = s.b;
      }
      const e = shapeElement(s);
      const emissive = EMISSIVE.has(s.k);
      const shines = emissive || s.k === 'eye';
      const colour = emissive ? rig.palette[s.k] : s.k === 'eye' ? eyeColour : BLACK;
      e.setAttribute('fill', colour);
      e.setAttribute('stroke', shines ? colour : BLACK);
      e.setAttribute('stroke-width', '1.2');
      e.setAttribute('stroke-linejoin', 'round');
      if (shines) e.setAttribute('filter', glow);
      if (EYES.has(s.k)) this.eyes.push(e);
      group!.append(e);
    }

    const light = lighten(rig.accent, 0.6);
    this.slash = svgEl('path', { fill: light, stroke: rig.accent, 'stroke-width': 1, filter: glow, visibility: 'hidden' });
    this.ring = svgEl('circle', { fill: 'none', stroke: lighten(rig.accent, 0.5), 'stroke-width': 2.2, visibility: 'hidden' });
    this.core = svgEl('circle', { fill: '#ffffff', filter: glow, visibility: 'hidden' });
    this.orb = svgEl('circle', { fill: lighten(rig.accent, 0.5), stroke: rig.accent, 'stroke-width': 1, filter: glow, visibility: 'hidden' });
    svg.append(this.slash, this.ring, this.core, this.orb);
    this.element = svg;

    active.add(this);
    if (!running) { running = true; requestAnimationFrame(loop); }
    this.tick(clock);
  }

  /** Starts an action; returns the ms until the blow lands (0 when not an attack). */
  play(type: ActionType): number {
    this.action = { type, t0: clock };
    return type === 'attack' ? ACTION_DURATION.attack * impactFraction(this.cls) * 1000 : 0;
  }

  destroy() {
    active.delete(this);
    this.element.remove();
  }

  tick(t: number) {
    const act = activeAction(this.action, t);
    if (!act) this.action = null;
    const { p, fx } = heroPose(this.cls, t, act);
    const bones = heroBones(this.cls, p);
    for (const { g, bone } of this.groups) g.setAttribute('transform', `matrix(${bones[bone].map((v) => v.toFixed(3)).join(',')})`);
    this.shadow.setAttribute('transform', `translate(${p.rootX.toFixed(2)} 0)`);
    for (const e of this.eyes) e.setAttribute('visibility', fx.blink ? 'hidden' : 'visible');

    const geo = heroEffects(this.cls, bones, fx);
    this.show(this.slash, geo.slash, (g) => { this.slash.setAttribute('d', arcSector(g)); this.slash.setAttribute('opacity', g.alpha.toFixed(2)); });
    this.show(this.ring, geo.ring, (g) => this.circle(this.ring, g.cx, g.cy, g.r, g.alpha));
    this.show(this.core, geo.ring && geo.ring.core > 0.3 ? geo.ring : undefined, (g) => this.circle(this.core, g.cx, g.cy, g.core, 1));
    this.show(this.orb, geo.orb, (g) => this.circle(this.orb, g.cx, g.cy, g.r, g.alpha));

    // the rim is a CSS drop-shadow in screen px, so it follows the rendered size
    if (this.frames++ % 30 === 0) this.rim = Math.max(1.1, (this.element.getBoundingClientRect().width || 136) / 75);
    const r = this.rim.toFixed(2), a = this.accent;
    const hit = fx.flash
      ? 'brightness(0) invert(1) '
      : fx.tint ? `drop-shadow(0 0 4px rgba(255,50,40,${fx.tint.toFixed(2)})) ` : '';
    this.element.style.filter = `${hit}drop-shadow(${r}px -${r}px 0 ${a}) drop-shadow(0 0 ${(this.rim * 4).toFixed(1)}px ${a}aa)`;
  }

  private show<T>(el: SVGElement, g: T | undefined, apply: (g: T) => void) {
    if (g) { el.setAttribute('visibility', 'visible'); apply(g); } else el.setAttribute('visibility', 'hidden');
  }

  private circle(el: SVGElement, cx: number, cy: number, r: number, alpha: number) {
    el.setAttribute('cx', cx.toFixed(2));
    el.setAttribute('cy', cy.toFixed(2));
    el.setAttribute('r', Math.max(0, r).toFixed(2));
    el.setAttribute('opacity', alpha.toFixed(2));
  }
}
