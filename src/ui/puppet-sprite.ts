// SVG renderer for puppet rigs, in two styles:
// - 'silhouette' (heroes, druid forms): black shapes with a rim light in the
//   accent colour; only eyes and magic keep their glow.
// - 'illustrated' (enemies, invocations): thick outer contour, thin inner ink
//   lines and a cut shadow on every piece, lit by the act's moon.
// The SVG node is persistent so combat re-renders can re-attach it without
// restarting the animation. All sprites share one requestAnimationFrame loop.

import {
  EMISSIVE, EYES, puppetPose, puppetBones, puppetEffects, activeAction, puppetImpact, ACTION_DURATION,
  type Action, type ActionType, type BoneId, type EffectGeometry, type PuppetRig, type Shape,
} from '../fx/puppet.ts';

const NS = 'http://www.w3.org/2000/svg';
const BLACK = '#0b0910';
const INK = '#140d0a';
let nextId = 0;

/** Moon rim light per act (I, II, III) for the illustrated style. */
export const LUZ_LUNA = ['rgba(255,214,160,0.5)', 'rgba(190,210,255,0.5)', 'rgba(255,150,110,0.5)'];

export interface PuppetOptions {
  style: 'silhouette' | 'illustrated';
  /** Face left (enemies look at the hero). */
  mirrored?: boolean;
  /** Moon rim colour for the illustrated style. */
  rim?: string;
}

function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const lighten = (hex: string, k: number) => rgbHex(hexRgb(hex).map((v) => v + (255 - v) * k));

/** Darker, slightly bluer tone for the shadow side of an illustrated piece. */
function shadowOf(hex: string): string {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  const diff = ((250 - h + 540) % 360) - 180;
  h += Math.sign(diff) * Math.min(Math.abs(diff), 16);
  s *= 0.9;
  const l2 = l * 0.6;
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s, p = 2 * l2 - q, hh = (((h % 360) + 360) % 360) / 360;
  const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return s === 0 ? rgbHex([l2 * 255, l2 * 255, l2 * 255]) : rgbHex([f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]);
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

/** Groups consecutive shapes of the same bone so each bone updates once per frame. */
function runs(shapes: Shape[], add: (s: Shape, g: SVGElement) => void): { g: SVGElement; bone: BoneId }[] {
  const out: { g: SVGElement; bone: BoneId }[] = [];
  let group: SVGElement | null = null;
  let bone: BoneId | null = null;
  for (const s of shapes) {
    if (s.b !== bone) { group = svgEl('g'); out.push({ g: group, bone: s.b }); bone = s.b; }
    add(s, group!);
  }
  return out;
}

const active = new Set<PuppetSprite>();
let clock = 0;
let last = 0;
let running = false;

function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  clock += dt;
  for (const s of active) if (s.element.isConnected && s.visible) s.tick(clock);
  if (active.size) requestAnimationFrame(loop);
  else { running = false; last = 0; }
}

export class PuppetSprite {
  readonly element: SVGSVGElement;
  readonly accent: string;
  /** Off-screen sprites (e.g. in the gallery) can be paused by the caller. */
  visible = true;
  private readonly rig: PuppetRig;
  private readonly style: PuppetOptions['style'];
  private readonly rim: string;
  private readonly groups: { g: SVGElement; bone: BoneId }[] = [];
  private readonly eyes: SVGElement[] = [];
  private readonly shadow: SVGElement;
  private readonly slash: SVGElement;
  private readonly ring: SVGElement;
  private readonly core: SVGElement;
  private readonly orb: SVGElement;
  private action: Action | null = null;
  private rimPx = 1.8;
  private frames = 0;
  private gone = false;

  constructor(rig: PuppetRig, opts: PuppetOptions) {
    this.rig = rig;
    this.style = opts.style;
    this.rim = opts.rim ?? 'rgba(255,214,160,0.5)';
    this.accent = rig.accent;
    const uid = nextId++;
    const glowId = `brillo-marioneta-${uid}`;
    const svg = svgEl('svg', { viewBox: '0 0 140 135', class: 'sprite-marioneta', 'aria-hidden': 'true' }) as SVGSVGElement;
    const defs = svgEl('defs');
    const filter = svgEl('filter', { id: glowId, x: '-80%', y: '-80%', width: '260%', height: '260%' });
    filter.append(svgEl('feGaussianBlur', { stdDeviation: 1.8, result: 'b' }));
    const merge = svgEl('feMerge');
    for (const src of ['b', 'b', 'SourceGraphic']) merge.append(svgEl('feMergeNode', { in: src }));
    filter.append(merge);
    defs.append(filter);
    svg.append(defs);
    const glow = `url(#${glowId})`;

    // designs drawn at their true size are enlarged around the feet
    const k = rig.art ?? 1;
    const grow = k !== 1 ? ` translate(58 129) scale(${k}) translate(-58 -129)` : '';
    const world = svgEl('g', { transform: (opts.mirrored ? 'translate(140 0) scale(-1 1)' : '') + grow });
    svg.append(world);
    this.shadow = svgEl('ellipse', { cx: 58, cy: 129.5, rx: 22, ry: 4.2, fill: 'rgba(0,0,0,0.5)' });
    world.append(this.shadow);

    if (opts.style === 'illustrated') {
      // light comes from the moon (upper-left of the screen): the local offset flips with the mirror
      const lx = opts.mirrored ? 1 : -1, ly = -1, depth = 2.8;
      const outline = svgEl('g');
      for (const r of runs(rig.shapes, (s, g) => {
        if (s.k === 'ink' || EMISSIVE.has(s.k)) return;
        const e = shapeElement(s);
        e.setAttribute('fill', INK); e.setAttribute('stroke', INK);
        e.setAttribute('stroke-width', '2.6'); e.setAttribute('stroke-linejoin', 'round');
        g.append(e);
      })) { outline.append(r.g); this.groups.push(r); }
      const fill = svgEl('g');
      let n = 0;
      for (const r of runs(rig.shapes, (s, g) => {
        const colour = rig.palette[s.k] ?? '#ff00ff';
        const e = shapeElement(s);
        if (s.k === 'ink') { e.setAttribute('fill', INK); g.append(e); return; }
        if (EMISSIVE.has(s.k)) {
          e.setAttribute('fill', colour); e.setAttribute('filter', glow);
          if (EYES.has(s.k)) this.eyes.push(e);
          g.append(e);
          return;
        }
        const maskId = `sombra-${uid}-${n++}`;
        const mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: -80, y: -80, width: 300, height: 300 });
        const lit = shapeElement(s); lit.setAttribute('fill', '#fff');
        const cut = shapeElement(s); cut.setAttribute('fill', '#000'); cut.setAttribute('transform', `translate(${lx * depth} ${ly * depth})`);
        mask.append(lit, cut);
        defs.append(mask);
        e.setAttribute('fill', colour); e.setAttribute('stroke', INK);
        e.setAttribute('stroke-width', '0.7'); e.setAttribute('stroke-linejoin', 'round');
        const sh = shapeElement(s); sh.setAttribute('fill', shadowOf(colour)); sh.setAttribute('mask', `url(#${maskId})`);
        g.append(e, sh);
      })) { fill.append(r.g); this.groups.push(r); }
      world.append(outline, fill);
    } else {
      const eyeColour = lighten(rig.accent, 0.55);
      for (const r of runs(rig.shapes, (s, g) => {
        const e = shapeElement(s);
        const emissive = EMISSIVE.has(s.k), shines = emissive || s.k === 'eye';
        const colour = emissive ? rig.palette[s.k] : s.k === 'eye' ? eyeColour : BLACK;
        e.setAttribute('fill', colour); e.setAttribute('stroke', shines ? colour : BLACK);
        e.setAttribute('stroke-width', '1.2'); e.setAttribute('stroke-linejoin', 'round');
        if (shines) e.setAttribute('filter', glow);
        if (EYES.has(s.k)) this.eyes.push(e);
        g.append(e);
      })) { world.append(r.g); this.groups.push(r); }
    }

    const light = lighten(rig.accent, 0.6);
    this.slash = svgEl('path', { fill: light, stroke: rig.accent, 'stroke-width': 1, filter: glow, visibility: 'hidden' });
    this.ring = svgEl('circle', { fill: 'none', stroke: lighten(rig.accent, 0.5), 'stroke-width': 2.2, visibility: 'hidden' });
    this.core = svgEl('circle', { fill: '#ffffff', filter: glow, visibility: 'hidden' });
    if (rig.projectile === 'arrow') {
      this.orb = svgEl('g', { visibility: 'hidden' });
      this.orb.append(
        svgEl('path', { d: 'M-9 0L5 0', stroke: '#2a1d14', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
        svgEl('polygon', { points: '5,-2.4 10,0 5,2.4', fill: '#b9c0c6', stroke: INK, 'stroke-width': 0.6 }),
        svgEl('polygon', { points: '-9,0 -12,-2.6 -10,0 -12,2.6', fill: lighten(rig.accent, 0.3) }),
      );
    } else {
      this.orb = svgEl('circle', { fill: lighten(rig.accent, 0.5), stroke: rig.accent, 'stroke-width': 1, filter: glow, visibility: 'hidden' });
    }
    world.append(this.slash, this.ring, this.core, this.orb);
    this.element = svg;

    active.add(this);
    if (!running) { running = true; requestAnimationFrame(loop); }
    this.tick(clock);
  }

  /** Starts an action; returns the ms until the blow lands (0 when not an attack). */
  play(type: ActionType): number {
    this.gone = false;
    this.action = { type, t0: clock };
    return type === 'attack' ? ACTION_DURATION.attack * puppetImpact(this.rig) * 1000 : 0;
  }

  /** Back to idle and visible (e.g. after a death in the gallery). */
  reset() {
    this.gone = false;
    this.action = null;
  }

  destroy() {
    active.delete(this);
    this.element.remove();
  }

  tick(t: number) {
    const act = activeAction(this.action, t);
    if (!act) {
      // a finished death leaves the puppet gone until the next action
      if (this.action?.type === 'death') this.gone = true;
      this.action = null;
    }
    const { p, fx } = puppetPose(this.rig, t, act);
    const bones = puppetBones(this.rig, p);
    for (const { g, bone } of this.groups) g.setAttribute('transform', `matrix(${bones[bone].map((v) => v.toFixed(3)).join(',')})`);
    this.shadow.setAttribute('transform', `translate(${p.rootX.toFixed(2)} 0)`);
    for (const e of this.eyes) e.setAttribute('visibility', fx.blink ? 'hidden' : 'visible');

    const geo = puppetEffects(this.rig, bones, fx);
    this.show(this.slash, geo.slash, (g) => { this.slash.setAttribute('d', arcSector(g)); this.slash.setAttribute('opacity', g.alpha.toFixed(2)); });
    this.show(this.ring, geo.ring, (g) => this.circle(this.ring, g.cx, g.cy, g.r, g.alpha));
    this.show(this.core, geo.ring && geo.ring.core > 0.3 ? geo.ring : undefined, (g) => this.circle(this.core, g.cx, g.cy, g.core, 1));
    this.show(this.orb, geo.orb, (g) => {
      if (this.rig.projectile === 'arrow') {
        this.orb.setAttribute('transform', `translate(${g.cx.toFixed(2)} ${g.cy.toFixed(2)}) rotate(${g.angle.toFixed(1)})`);
        this.orb.setAttribute('opacity', g.alpha.toFixed(2));
      } else this.circle(this.orb, g.cx, g.cy, g.r, g.alpha);
    });

    // rim and glow are CSS drop-shadows in screen px, so they follow the rendered size
    if (this.frames++ % 30 === 0) {
      const w = this.element.getBoundingClientRect().width || 136;
      this.rimPx = Math.max(this.style === 'silhouette' ? 1.1 : 0.8, w / (this.style === 'silhouette' ? 75 : 130));
    }
    const r = this.rimPx.toFixed(2), f: string[] = [];
    if (fx.flash) f.push('brightness(0) invert(1)');
    else if (fx.tint) f.push(`drop-shadow(0 0 4px rgba(255,50,40,${fx.tint.toFixed(2)}))`);
    if (fx.dying) f.push(`grayscale(${fx.dying.toFixed(2)})`);
    if (this.style === 'silhouette') {
      f.push(`drop-shadow(${r}px -${r}px 0 ${this.accent}) drop-shadow(0 0 ${(this.rimPx * 4).toFixed(1)}px ${this.accent}aa)`);
    } else {
      f.push(`drop-shadow(-${r}px -${r}px 0 ${this.rim}) drop-shadow(0 4px 3px rgba(0,0,0,0.5))`);
    }
    this.element.style.filter = f.join(' ');
    this.element.style.opacity = this.gone ? '0' : fx.opacity.toFixed(2);
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
