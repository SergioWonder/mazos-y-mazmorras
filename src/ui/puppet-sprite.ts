// Puppet sprites: animation state (actions, pose, effects) plus a view that
// paints it. With a WebGL stage the view is a transparent placeholder whose
// screen rect the stage draws into (see puppet-stage.ts); without WebGL2 it
// falls back to an SVG view, in two styles:
// - 'silhouette' (heroes, druid forms): black shapes with a rim light in the
//   accent colour; only eyes and magic keep their glow.
// - 'illustrated' (enemies, invocations): thick outer contour, thin inner ink
//   lines and a cut shadow on every piece, lit by the act's moon.
// The element is persistent so combat re-renders can re-attach it without
// restarting the animation. All sprites share one requestAnimationFrame loop.

import {
  EMISSIVE, EYES, activeAction, puppetImpact, emitterWorld, applyMatrix, ACTION_DURATION,
  type Action, type ActionType, type BoneId, type Burst, type EffectGeometry, type Effects, type Matrix, type Pose, type PuppetRig, type Shape,
} from '../fx/puppet.ts';
import { PuppetAnimator, SMEAR_GHOSTS, rigSmears, smearBonesOf, type Ghost } from '../fx/animator.ts';
import { lighten, shadowOf, spriteMatrix } from '../fx/puppet-gpu.ts';
import { fx as particles } from '../fx/particulas.ts';
import { FlameFade, flameAnchors, flameLayerFor, flameScreenPoints, holyFlameFrame, type FlameAnchor, type FlameKind, type FlameSprite } from '../fx/holy-flames.ts';
import { stages, type GpuView, type PuppetStage } from './puppet-stage.ts';

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
  /** WebGL stage to draw on; without one the sprite renders as SVG. */
  stage?: PuppetStage | null;
}

function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
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

/** Fallback renderer: one SVG per sprite (used when WebGL2 is unavailable). */
class SvgView {
  readonly element: SVGSVGElement;
  private readonly rig: PuppetRig;
  private readonly style: PuppetOptions['style'];
  private readonly rim: string;
  private readonly accent: string;
  private readonly groups: { g: SVGElement; bone: BoneId }[] = [];
  /** Smear ghost layers (one per ghost), each grouped by bone. */
  private readonly ghostLayers: { layer: SVGElement; groups: { g: SVGElement; bone: BoneId }[] }[] = [];
  private readonly eyes: SVGElement[] = [];
  private readonly shadow: SVGElement;
  private readonly slash: SVGElement;
  private readonly ring: SVGElement;
  private readonly core: SVGElement;
  private readonly orb: SVGElement;
  private rimPx = 1.8;
  private frames = 0;

  constructor(rig: PuppetRig, opts: PuppetOptions) {
    this.rig = rig;
    this.style = opts.style;
    this.rim = opts.rim ?? LUZ_LUNA[0];
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

    const k = rig.art ?? 1;
    const grow = k !== 1 ? ` translate(58 129) scale(${k}) translate(-58 -129)` : '';
    const world = svgEl('g', { transform: (opts.mirrored ? 'translate(140 0) scale(-1 1)' : '') + grow });
    svg.append(world);
    this.shadow = svgEl('ellipse', { cx: 58, cy: 129.5, rx: 22, ry: 4.2, fill: 'rgba(0,0,0,0.5)' });
    world.append(this.shadow);
    if (rigSmears(rig)) {
      // smear ghosts: flat copies of the weapon bones, behind the figure
      const bones = new Set(smearBonesOf(rig)), tone = lighten(rig.accent, 0.35);
      for (let i = 0; i < SMEAR_GHOSTS; i++) {
        const layer = svgEl('g', { visibility: 'hidden' });
        const groups = runs(rig.shapes.filter((s) => bones.has(s.b) && s.k !== 'ink'), (s, g) => {
          const e = shapeElement(s);
          e.setAttribute('fill', tone); e.setAttribute('stroke', tone); e.setAttribute('stroke-width', '1.4');
          g.append(e);
        });
        for (const r of groups) layer.append(r.g);
        world.append(layer);
        this.ghostLayers.push({ layer, groups });
      }
    }

    if (opts.style === 'illustrated') {
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
  }

  render(p: Pose, fx: Effects, bones: Record<BoneId, Matrix>, geo: EffectGeometry, gone: boolean, ghosts: Ghost[]) {
    const mat = (m: Matrix) => `matrix(${m.map((v) => v.toFixed(3)).join(',')})`;
    for (const { g, bone } of this.groups) g.setAttribute('transform', mat(bones[bone]));
    this.ghostLayers.forEach(({ layer, groups }, i) => {
      const gh = ghosts[i];
      if (!gh) { layer.setAttribute('visibility', 'hidden'); return; }
      layer.setAttribute('visibility', 'visible');
      layer.setAttribute('opacity', gh.alpha.toFixed(2));
      for (const { g, bone } of groups) g.setAttribute('transform', mat(gh.bones[bone]));
    });
    this.shadow.setAttribute('transform', `translate(${p.rootX.toFixed(2)} 0)`);
    for (const e of this.eyes) e.setAttribute('visibility', fx.blink ? 'hidden' : 'visible');
    this.show(this.slash, geo.slash, (g) => { this.slash.setAttribute('d', arcSector(g)); this.slash.setAttribute('opacity', g.alpha.toFixed(2)); });
    this.show(this.ring, geo.ring, (g) => this.circle(this.ring, g.cx, g.cy, g.r, g.alpha));
    this.show(this.core, geo.ring && geo.ring.core > 0.3 ? geo.ring : undefined, (g) => this.circle(this.core, g.cx, g.cy, g.core, 1));
    this.show(this.orb, geo.orb, (g) => {
      if (this.rig.projectile === 'arrow') {
        this.orb.setAttribute('transform', `translate(${g.cx.toFixed(2)} ${g.cy.toFixed(2)}) rotate(${g.angle.toFixed(1)})`);
        this.orb.setAttribute('opacity', g.alpha.toFixed(2));
      } else this.circle(this.orb, g.cx, g.cy, g.r, g.alpha);
    });
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
    this.element.style.opacity = gone ? '0' : fx.opacity.toFixed(2);
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

const active = new Set<PuppetSprite>();
let clock = 0;
let last = 0;
let running = false;
/** Global time factor of every sprite (1 normal, < 1 slow motion). */
let timeScale = 1;

/** Slows down (or restores) the shared sprite clock: the hero's death in slow motion. */
export function setSpriteTimeScale(k: number) {
  timeScale = Math.max(0, Math.min(1, k));
}

/** Current time of the shared sprite clock (s); dev tools drive `tick` from it. */
export const spriteClock = () => clock;

function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  clock += dt * timeScale;
  for (const s of active) if (s.element.isConnected && s.visible) s.tick(clock);
  for (const st of stages) st.draw();
  if (active.size) requestAnimationFrame(loop);
  else { running = false; last = 0; }
}

export class PuppetSprite {
  /** Node to place in the layout: the SVG, or a sized placeholder the stage paints over. */
  readonly element: HTMLElement | SVGSVGElement;
  readonly accent: string;
  /** Off-screen sprites (e.g. in the gallery) can be paused by the caller. */
  visible = true;
  private readonly rig: PuppetRig;
  /** Pose, spring chains and ghosts: the same pipeline for both renderers. */
  private readonly animator: PuppetAnimator;
  private readonly svg: SvgView | null = null;
  private readonly gpu: GpuView | null = null;
  private readonly stage: PuppetStage | null;
  private action: Action | null = null;
  private gone = false;
  private readonly mirrored: boolean;
  // particle emission (bosses)
  private lastT = -1;
  private intensity = 1;
  private readonly emitAcc: number[];
  private pending: { at: number; burst: Burst }[] = [];
  // persistent flames around the body (the paladin's prepared Smite)
  private flames: FlameKind | null = null;
  /** Colour the flames burn in (kept while they fade out). */
  private flameKind: FlameKind = 'holy';
  private readonly flameFade = new FlameFade();
  private flamePoints: FlameAnchor[] | null = null;
  private flameSprites: FlameSprite[] = [];
  private flameLayer: (() => void) | null = null;
  private flameReduced = false;
  /** Flames lit or still fading out. */
  private burning = false;

  constructor(rig: PuppetRig, opts: PuppetOptions) {
    this.rig = rig;
    this.accent = rig.accent;
    this.animator = new PuppetAnimator(rig);
    this.stage = opts.stage ?? null;
    this.mirrored = !!opts.mirrored;
    this.emitAcc = (rig.emitters ?? []).map(() => Math.random());
    if (this.stage) {
      const el = document.createElement('div');
      el.className = 'sprite-marioneta';
      el.setAttribute('aria-hidden', 'true');
      this.gpu = {
        element: el, rig, style: opts.style, mirrored: !!opts.mirrored, rim: opts.rim ?? LUZ_LUNA[0],
        aura: null, echoes: false, flames: null, frame: null, visible: true,
      };
      this.stage.add(this.gpu);
      this.element = el;
      this.gpu.aura = rig.aura ?? null;
    } else {
      this.svg = new SvgView(rig, opts);
      this.element = this.svg.element;
    }
    active.add(this);
    if (!running) { running = true; requestAnimationFrame(loop); }
    this.tick(clock);
  }

  /** Starts an action; returns the ms until the blow lands (0 when not an attack). */
  play(type: ActionType): number {
    this.gone = false;
    this.action = { type, t0: clock };
    const impact = type === 'attack' ? ACTION_DURATION.attack * puppetImpact(this.rig) : 0;
    // attack bursts go off with the blow, the rest right away
    for (const burst of this.rig.bursts?.[type] ?? []) this.pending.push({ at: clock + impact, burst });
    return impact * 1000;
  }

  /** Multiplies the particle emitters (boss phases: enraged, revived…). */
  setIntensity(k: number) {
    this.intensity = k;
  }

  /** Back to idle and visible (e.g. after a death in the gallery). */
  reset() {
    this.gone = false;
    this.action = null;
  }

  /** Coloured glow around the whole figure (Fury, a druid form, ephemeral pacts). */
  setAura(colour: string | null) {
    if (this.gpu) this.gpu.aura = colour ?? this.rig.aura ?? null;
  }

  /** Mirror Image: ghostly copies either side of the figure. */
  setEchoes(on: boolean) {
    if (this.gpu) this.gpu.echoes = on;
  }

  /** Holy flames rising behind the figure (a prepared Smite): they fade in when
   *  lit, fade out when put out and follow every move of the figure. On a WebGL
   *  stage the stage paints them before the silhouette; without one they go on
   *  the fx canvas. */
  setFlames(kind: FlameKind | null) {
    if (kind === this.flames) return;
    this.flames = kind;
    // a new colour while lit just recolours the flames: no fade
    if (kind) this.flameKind = kind;
    this.flameFade.set(!!kind, clock);
    if (!kind || this.burning) return;
    this.burning = true;
    this.flamePoints ??= flameAnchors(this.rig);
    this.flameReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (flameLayerFor(!!this.gpu) === 'fx') {
      // off-screen or detached sprites draw nothing (their last frame would stay stuck)
      this.flameLayer = particles.capa(() => (this.element.isConnected && this.visible ? this.flameSprites : []));
    }
  }

  private setFlameSprites(list: FlameSprite[]) {
    this.flameSprites = list;
    if (this.gpu) this.gpu.flames = list.length ? list : null;
  }

  destroy() {
    this.flameLayer?.();
    this.flameLayer = null;
    active.delete(this);
    if (this.gpu) this.stage?.remove(this.gpu);
    this.element.remove();
  }

  tick(t: number) {
    const act = activeAction(this.action, t);
    if (!act) {
      // a finished death leaves the puppet gone until the next action
      if (this.action?.type === 'death') this.gone = true;
      this.action = null;
    }
    const { p, fx, bones, geo, ghosts, smearBones } = this.animator.frame(t, act);
    if (this.gpu) {
      this.gpu.visible = this.visible;
      this.gpu.frame = { pose: p, fx, bones, geo, gone: this.gone, ghosts, smearBones };
    } else this.svg!.render(p, fx, bones, geo, this.gone, ghosts);
    this.emit(t, bones);
    if (this.burning) this.burn(t, bones, fx.opacity);
  }

  /** Rebuilds this frame's flames on the current pose; drops the layer once faded out. */
  private burn(t: number, bones: Record<BoneId, Matrix>, opacity: number) {
    if (!this.flameFade.active(t)) {
      this.flameLayer?.();
      this.flameLayer = null;
      this.burning = false;
      this.setFlameSprites([]);
      return;
    }
    const level = this.gone ? 0 : this.flameFade.level(t) * opacity;
    const r = this.element.getBoundingClientRect();
    if (level <= 0 || r.width < 2) { this.setFlameSprites([]); return; }
    const art = this.rig.art ?? 1;
    const M = spriteMatrix({ x: r.left, y: r.top, w: r.width }, this.mirrored, art);
    const points = flameScreenPoints(this.flamePoints!, bones, M);
    this.setFlameSprites(holyFlameFrame(t, points, { level, unit: (r.width / 140) * art, reduced: this.flameReduced, kind: this.flameKind }));
  }

  /** Continuous emitters and pending bursts, converted to screen coordinates. */
  private emit(t: number, bones: Record<BoneId, Matrix>) {
    const dt = this.lastT < 0 ? 0 : Math.min(0.1, t - this.lastT);
    this.lastT = t;
    const emitters = this.rig.emitters ?? [];
    if (!emitters.length && !this.pending.length) return;
    const r = this.element.getBoundingClientRect();
    if (r.width < 2) return;
    const M = spriteMatrix({ x: r.left, y: r.top, w: r.width }, this.mirrored, this.rig.art ?? 1);
    const toScreen = (e: { bone: BoneId; at: [number, number] }, spread = 0) => {
      const [x, y] = emitterWorld(this.rig, bones, e);
      return applyMatrix(M, x + (Math.random() - 0.5) * spread * 2, y + (Math.random() - 0.5) * spread * 2);
    };
    if (!this.gone && this.action?.type !== 'death') {
      emitters.forEach((e, i) => {
        this.emitAcc[i] += e.rate * this.intensity * dt;
        while (this.emitAcc[i] >= 1) {
          this.emitAcc[i] -= 1;
          const [sx, sy] = toScreen(e, e.spread);
          particles.emitir(e.effect, sx, sy);
        }
      });
    }
    this.pending = this.pending.filter(({ at, burst }) => {
      if (t < at) return true;
      const [sx, sy] = toScreen(burst);
      particles.emitir(burst.effect, sx, sy, burst.scale ?? 1);
      return false;
    });
  }
}
