// Particle simulation (no DOM): effect presets, spawning and stepping. The
// renderers (WebGL, or canvas 2D as fallback) only draw the resulting list.

export type ParticleShape = 'circulo' | 'chispa' | 'hoja' | 'estrella' | 'corazon'
  // spell shapes (spell-fx.ts): stretched along x by `stretch`, tuned by `param`
  | 'capsula' | 'colmillo' | 'anillo' | 'arco' | 'media-luna' | 'runa' | 'escudo' | 'gota' | 'burbuja' | 'haz' | 'calavera' | 'disco';

/** Anything the fx canvas draws: simulated particles and spell sprites. */
export interface Sprite {
  x: number; y: number;
  size: number; colour: string; shape: ParticleShape;
  angle: number;
  glow?: boolean;
  /** Explicit opacity (spell sprites); particles fade with their life instead. */
  alpha?: number;
  /** Half-length / half-thickness ratio for the stretched spell shapes. */
  stretch?: number;
  /** Shape parameter (taper, ring thickness, arc span, crescent bite…). */
  param?: number;
  life?: number; maxLife?: number;
}

export interface Particle extends Sprite {
  vx: number; vy: number;
  life: number; maxLife: number;
  gravity: number; spin: number;
}

interface EffectPreset {
  count: number;
  colours: string[];
  speed: [number, number];
  life: [number, number];
  size: [number, number];
  shape: ParticleShape;
  gravity: number;
  /** Angle range in radians (default: the full circle). */
  direction?: [number, number];
  glow?: boolean;
}

/** Effect presets by the name the UI emits (names are part of the game API). */
export const EFFECTS: Record<string, EffectPreset> = {
  tajo: { count: 18, colours: ['#ffd9a0', '#ff9d4d', '#fff3d6'], speed: [2, 7], life: [0.25, 0.5], size: [1.5, 3.5], shape: 'chispa', gravity: 0.12 },
  impacto: { count: 30, colours: ['#ffe9b0', '#ff8c3b', '#ffffff'], speed: [3, 10], life: [0.3, 0.6], size: [2, 5], shape: 'chispa', gravity: 0.18, glow: true },
  zarpa: { count: 16, colours: ['#c9f29b', '#7dba4e', '#fff7e0'], speed: [2, 6], life: [0.25, 0.5], size: [1.5, 3], shape: 'chispa', gravity: 0.1 },
  golpeEnemigo: { count: 16, colours: ['#ff6b5e', '#b3261e', '#ffd0c0'], speed: [2, 6], life: [0.3, 0.55], size: [2, 4], shape: 'circulo', gravity: 0.15 },
  bloqueo: { count: 14, colours: ['#9fd8ff', '#5aa7d6', '#e8f6ff'], speed: [1, 3], life: [0.4, 0.8], size: [2, 4], shape: 'circulo', gravity: -0.04 },
  cura: { count: 14, colours: ['#a7f3a0', '#54c95e', '#eaffe8'], speed: [0.5, 2], life: [0.6, 1.1], size: [2, 4], shape: 'circulo', gravity: -0.08, direction: [-2.4, -0.7] },
  hojas: { count: 16, colours: ['#7dba4e', '#4e8a33', '#b8e08a'], speed: [1, 3], life: [0.7, 1.3], size: [3, 5], shape: 'hoja', gravity: 0.05 },
  raices: { count: 20, colours: ['#7a5a36', '#4e8a33', '#a8804f'], speed: [2, 5], life: [0.4, 0.8], size: [2, 4], shape: 'chispa', gravity: 0.2 },
  transformacion: { count: 36, colours: ['#b8e08a', '#7dba4e', '#fff7c2'], speed: [1, 5], life: [0.5, 1.1], size: [2, 5], shape: 'hoja', gravity: -0.03, glow: true },
  furia: { count: 28, colours: ['#ff6b35', '#d62828', '#ffd166'], speed: [1.5, 6], life: [0.4, 0.9], size: [2, 5], shape: 'chispa', gravity: -0.12, glow: true },
  aullido: { count: 12, colours: ['#cfcfe8', '#8d8db5'], speed: [1, 4], life: [0.4, 0.8], size: [2, 4], shape: 'circulo', gravity: -0.05 },
  luna: { count: 32, colours: ['#dfe8ff', '#9bb4ff', '#ffffff'], speed: [1, 5], life: [0.6, 1.2], size: [2, 5], shape: 'estrella', gravity: -0.05, glow: true },
  ola: { count: 40, colours: ['#5aa7d6', '#2e6f9e', '#bfe7ff'], speed: [2, 8], life: [0.4, 0.9], size: [2, 5], shape: 'circulo', gravity: 0.25, glow: true },
  estrellas: { count: 36, colours: ['#fff3b8', '#ffd166', '#ffffff'], speed: [0.5, 4], life: [0.7, 1.4], size: [2, 5], shape: 'estrella', gravity: -0.02, glow: true },
  tierra: { count: 26, colours: ['#a8804f', '#7a5a36', '#c9f29b'], speed: [1, 4], life: [0.5, 1], size: [2, 5], shape: 'circulo', gravity: 0.1 },
  divino: { count: 36, colours: ['#ffd166', '#fff3b8', '#ffffff'], speed: [1, 6], life: [0.5, 1.1], size: [2, 5], shape: 'estrella', gravity: -0.08, glow: true },
  muerte: { count: 40, colours: ['#8d8db5', '#3a3a52', '#cfcfe8'], speed: [1, 6], life: [0.5, 1.2], size: [2, 6], shape: 'circulo', gravity: -0.02 },
  aliento: { count: 72, colours: ['#ff3b00', '#ff7a18', '#ffb347', '#fff3b8'], speed: [3, 11], life: [0.4, 1.0], size: [3, 7], shape: 'chispa', gravity: -0.05, glow: true },
  corazones: { count: 30, colours: ['#ff5d8f', '#ff8fb3', '#ffd0e0', '#ffffff'], speed: [1, 4], life: [0.7, 1.4], size: [4, 8], shape: 'corazon', gravity: -0.06, glow: true },
  sangre: { count: 22, colours: ['#a01616', '#7a0d0d', '#d63b3b'], speed: [1, 4], life: [0.4, 0.9], size: [2, 5], shape: 'circulo', gravity: 0.32 },
  veneno: { count: 22, colours: ['#7cff5a', '#39a824', '#caffb8'], speed: [1, 4], life: [0.4, 0.9], size: [2, 5], shape: 'circulo', gravity: -0.06, glow: true },
  abisal: { count: 34, colours: ['#b46bff', '#6c2fb5', '#e8d0ff', '#ffffff'], speed: [2, 9], life: [0.35, 0.8], size: [2, 5], shape: 'chispa', gravity: -0.04, glow: true },
  condena: { count: 26, colours: ['#7a3fc7', '#2a1040', '#cfa8ff'], speed: [1, 4], life: [0.5, 1.1], size: [2, 6], shape: 'circulo', gravity: -0.03, glow: true },
  oscuridad: { count: 30, colours: ['#2a1040', '#4a2a6a', '#8d8db5'], speed: [0.5, 3], life: [0.6, 1.3], size: [3, 7], shape: 'circulo', gravity: -0.02 },
  agathys: { count: 24, colours: ['#9fd8ff', '#b46bff', '#e8f6ff'], speed: [2, 7], life: [0.35, 0.8], size: [2, 5], shape: 'chispa', gravity: 0.04, glow: true },
  // boss emitters: one particle per spawn, fired continuously from a bone
  ascua: { count: 1, colours: ['#ff8c3b', '#ffb347', '#ffd166', '#ff5a1a'], speed: [0.3, 1.3], life: [0.9, 1.8], size: [1, 2.4], shape: 'circulo', gravity: -0.02, direction: [-2.3, -0.8], glow: true },
  humo: { count: 1, colours: ['rgba(38,32,30,0.55)', 'rgba(58,50,46,0.5)', 'rgba(74,66,60,0.45)'], speed: [0.2, 0.6], life: [1.3, 2.4], size: [3, 7], shape: 'circulo', gravity: -0.012, direction: [-2.1, -1.0] },
  alma: { count: 1, colours: ['#9fe8ff', '#7affc8', '#d8fff0'], speed: [0.2, 0.8], life: [1.1, 2.1], size: [1.4, 3], shape: 'circulo', gravity: -0.03, direction: [-2.1, -1.0], glow: true },
  arcana: { count: 1, colours: ['#c98bff', '#6bd8ff', '#ff6bd8', '#ffffff'], speed: [0.3, 1.5], life: [0.6, 1.3], size: [1, 2.4], shape: 'estrella', gravity: -0.006, glow: true },
  llama: { count: 1, colours: ['#ff6a1a', '#ffb347', '#fff0a0'], speed: [0.4, 1.5], life: [0.3, 0.7], size: [1.6, 3.6], shape: 'circulo', gravity: -0.09, direction: [-2.1, -1.0], glow: true },
  gota: { count: 1, colours: ['#ff7a1a', '#ffb347'], speed: [0, 0.3], life: [0.8, 1.3], size: [1.2, 2.2], shape: 'circulo', gravity: 0.12, glow: true },
  polvo: { count: 1, colours: ['rgba(138,122,100,0.45)', 'rgba(110,96,80,0.45)'], speed: [0.3, 1.2], life: [0.8, 1.5], size: [2, 4.5], shape: 'circulo', gravity: -0.005, direction: [-2.9, -0.2] },
  escarcha: { count: 1, colours: ['#dff4ff', '#9fd8ff', '#7affc8'], speed: [0.2, 0.8], life: [0.6, 1.2], size: [1, 2], shape: 'estrella', gravity: 0.01, glow: true },
  ojo: { count: 1, colours: ['#ff5ad8', '#ffd75a', '#ffffff'], speed: [0.2, 0.9], life: [0.4, 0.9], size: [1, 2], shape: 'estrella', gravity: -0.01, glow: true },
  vacio: { count: 1, colours: ['rgba(42,16,64,0.7)', '#6c2fb5', '#b46bff'], speed: [0.3, 1], life: [0.8, 1.6], size: [1.5, 3.5], shape: 'circulo', gravity: -0.015, direction: [-2.4, -0.7], glow: true },
  // dragon breath: a directed stream towards the hero (enemies face left)
  alientoChorro: { count: 90, colours: ['#ff3b00', '#ff7a18', '#ffb347', '#fff3b8'], speed: [5, 13], life: [0.4, 0.9], size: [3, 7], shape: 'chispa', gravity: -0.03, direction: [Math.PI - 0.3, Math.PI + 0.3], glow: true },
  // full-art cards: motes drifting up and twinkles (colour given by the card)
  mota: { count: 1, colours: ['#ffffff'], speed: [0.15, 0.5], life: [1.4, 2.4], size: [0.8, 1.8], shape: 'circulo', gravity: -0.004, direction: [-2.0, -1.1], glow: true },
  destelloCarta: { count: 1, colours: ['#fff8e0'], speed: [0, 0.05], life: [0.5, 0.9], size: [1.2, 2.2], shape: 'estrella', gravity: 0, glow: true },
  rayo: { count: 14, colours: ['#ff5ad8', '#ffd75a', '#6bd8ff', '#ffffff'], speed: [3, 9], life: [0.25, 0.5], size: [1.5, 3], shape: 'chispa', gravity: 0, direction: [Math.PI - 0.5, Math.PI + 0.5], glow: true },
};

/** Ambient atmospheres: particles drifting up behind each scenario. */
export type AmbientStyle = 'brasas' | 'almas' | 'sombras' | 'abismo' | 'arcano';
interface AmbientPreset { interval: number; vxAmp: number; vyBase: number; vyVar: number; sizeBase: number; sizeVar: number; colours: string[] }
export const AMBIENTS: Record<AmbientStyle, AmbientPreset> = {
  brasas: { interval: 0.4, vxAmp: 0.6, vyBase: 0.4, vyVar: 0.8, sizeBase: 1, sizeVar: 2.2, colours: ['#ff8c3b', '#ff8c3b', '#ffd166'] },
  almas: { interval: 0.7, vxAmp: 0.3, vyBase: 0.25, vyVar: 0.45, sizeBase: 1.6, sizeVar: 2.6, colours: ['#9bb4ff', '#9bb4ff', '#b8ffd9'] },
  sombras: { interval: 0.55, vxAmp: 0.4, vyBase: 0.16, vyVar: 0.4, sizeBase: 1.4, sizeVar: 2.2, colours: ['#6b7280', '#8a7fa0', '#4b5563'] },
  abismo: { interval: 0.45, vxAmp: 0.5, vyBase: 0.35, vyVar: 0.7, sizeBase: 1.4, sizeVar: 2.6, colours: ['#ff3b3b', '#b026ff', '#ff6b3b'] },
  arcano: { interval: 0.5, vxAmp: 0.5, vyBase: 0.2, vyVar: 0.5, sizeBase: 1.6, sizeVar: 2.8, colours: ['#b06bff', '#6bd8ff', '#ff6bd8'] },
};

const pick = <T,>(xs: T[], rnd: () => number) => xs[Math.floor(rnd() * xs.length)];
const between = ([a, b]: [number, number], rnd: () => number) => a + rnd() * (b - a);

export function spawnEffect(list: Particle[], name: string, x: number, y: number, scale = 1, rnd = Math.random, colour?: string) {
  const cfg = EFFECTS[name] ?? EFFECTS.tajo;
  for (let i = 0; i < cfg.count * scale; i++) {
    const ang = cfg.direction ? between(cfg.direction, rnd) : rnd() * Math.PI * 2;
    const speed = between(cfg.speed, rnd);
    const life = between(cfg.life, rnd);
    list.push({
      x: x + (rnd() - 0.5) * 24, y: y + (rnd() - 0.5) * 24,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      life, maxLife: life,
      size: between(cfg.size, rnd), colour: colour ?? pick(cfg.colours, rnd), shape: cfg.shape,
      gravity: cfg.gravity, spin: (rnd() - 0.5) * 0.3, angle: rnd() * Math.PI * 2, glow: cfg.glow,
    });
  }
}

export function spawnAmbient(list: Particle[], style: AmbientStyle, width: number, height: number, rnd = Math.random) {
  const amb = AMBIENTS[style] ?? AMBIENTS.brasas;
  list.push({
    x: rnd() * width, y: height + 10,
    vx: (rnd() - 0.5) * amb.vxAmp, vy: -(amb.vyBase + rnd() * amb.vyVar),
    life: 6 + rnd() * 4, maxLife: 10,
    size: amb.sizeBase + rnd() * amb.sizeVar, colour: pick(amb.colours, rnd),
    shape: 'circulo', gravity: -0.001, spin: 0, angle: 0, glow: true,
  });
}

/** Advances every particle by dt seconds (velocities are tuned per 60 fps frame)
 *  and drops the dead ones. */
export function stepParticles(list: Particle[], dt: number) {
  const f = dt * 60;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.x += p.vx * f;
    p.y += p.vy * f;
    p.vy += p.gravity * f;
    p.angle += p.spin * f;
  }
}

/** Fade-out alpha of a particle over the second half of its life. */
export const particleAlpha = (p: Sprite) =>
  p.alpha ?? (p.life !== undefined && p.maxLife ? Math.min(1, p.life / (p.maxLife * 0.5)) : 1);
