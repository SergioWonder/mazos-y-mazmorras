// Sistema de partículas a pantalla completa. La UI emite efectos por nombre en
// coordenadas de pantalla. Simulation lives in particle-sim.ts; drawing uses
// WebGL2 (particle-gl.ts) and falls back to canvas 2D without it.

import {
  spawnAmbient, spawnEffect, stepParticles, particleAlpha, AMBIENTS, type AmbientStyle, type Particle, type Sprite,
} from './particle-sim.ts';
import { ParticleRendererGL } from './particle-gl.ts';
import { SpellSystem, SPELLS, MAX_LIVE_SPRITES, type Box, type Point } from './spell-fx.ts';
// registers the rare and unique cards' own sequences in SPELLS
import { cardShake, volleyTiming } from './card-spells.ts';

import { ajustes, alCambiarAjustes } from '../core/ajustes.ts';

/** prefers-reduced-motion: fewer particles and no screen shake. */
const movimientoReducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Fewer particles: reduced motion, or the «reduce particles» setting. */
export const menosParticulas = () => movimientoReducido() || ajustes().reducirParticulas;
/** Screen shake allowed: not with reduced motion nor with shakes switched off in the settings. */
export const sacudidasActivas = () => !movimientoReducido() && ajustes().sacudidas;
/** Device pixels per CSS pixel for the WebGL canvases (1 with «low resolution»). */
export const pixelRatio = () => (ajustes().resolucionBaja ? 1 : Math.min(window.devicePixelRatio || 1, 2));

/** Atmósferas ambientales: partículas que ascienden de fondo en cada escenario. */
export type EstiloAmbiente = AmbientStyle;

/** Canvas 2D fallback (only used when WebGL2 is unavailable). */
class ParticleRenderer2D {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }
  render(list: Sprite[], width: number, height: number, dpr: number) {
    const ctx = this.ctx;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const p of list) {
      ctx.globalAlpha = particleAlpha(p);
      ctx.fillStyle = p.colour;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      switch (p.shape) {
        case 'chispa': ctx.fillRect(-p.size * 1.8, -p.size * 0.35, p.size * 3.6, p.size * 0.7); break;
        case 'hoja': ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); break;
        case 'estrella':
          ctx.fillRect(-p.size * 2, -p.size * 0.25, p.size * 4, p.size * 0.5);
          ctx.fillRect(-p.size * 0.25, -p.size * 2, p.size * 0.5, p.size * 4);
          break;
        case 'colmillo': {
          // wide round base at -x, sharp tip at +x (fangs, flame tongues)
          const L = p.size * Math.max((p.stretch ?? 1) - 1, 0);
          ctx.beginPath(); ctx.arc(-L, 0, p.size, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(L, 0); ctx.closePath(); ctx.fill();
          break;
        }
        case 'capsula': case 'haz': {
          const L = p.size * (p.stretch ?? 1);
          ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0);
          ctx.strokeStyle = p.colour; ctx.lineCap = 'round'; ctx.lineWidth = p.size * (p.shape === 'haz' ? 1.4 : 2); ctx.stroke();
          break;
        }
        case 'anillo': case 'escudo':
          ctx.beginPath(); ctx.ellipse(0, 0, p.size * (p.stretch ?? 1), p.size, 0, 0, Math.PI * 2);
          ctx.strokeStyle = p.colour; ctx.lineWidth = Math.max(1, p.size * 2 * (p.shape === 'anillo' ? p.param ?? 0.1 : 0.06)); ctx.stroke();
          if (p.shape === 'escudo') { ctx.globalAlpha *= 0.3; ctx.fill(); }
          break;
        case 'arco': case 'runa': case 'media-luna':
          ctx.beginPath();
          if (p.shape === 'arco') ctx.arc(0, 0, p.size, -(p.param ?? 1), p.param ?? 1);
          else ctx.arc(0, 0, p.size * 0.9, 0, Math.PI * 2);
          ctx.strokeStyle = p.colour; ctx.lineWidth = Math.max(1.5, p.size * 0.12); ctx.stroke();
          break;
        default: ctx.beginPath(); ctx.arc(0, 0, p.size * (p.shape === 'gota' ? 0.7 : 1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

class MotorParticulas {
  private renderer: ParticleRendererGL | ParticleRenderer2D | null = null;
  private particulas: Particle[] = [];
  /** Hand-authored spell compositions (spell-fx.ts), drawn with the particles. */
  private readonly hechizos = new SpellSystem();
  private ultimoT = 0;
  /** Virtual clock (s) of particles and spells: it runs slower under slow motion. */
  private reloj = 0;
  /** Global time factor (1 normal, < 1 slow motion: the hero's death). */
  escalaTiempo = 1;
  private ambienteActivo = false;
  private acumulador = 0;
  /** Full-art cards emitting motes (drawn in this same WebGL pass). */
  private fuentes = new Set<{ el: Element; colour: string; acc: number; seen: boolean; born: number }>();
  /** Persistent layers (a sprite's holy flames): rebuilt by their owner, drawn every frame. */
  private capas = new Set<() => Sprite[]>();

  iniciar(canvas: HTMLCanvasElement) {
    const svg = new URLSearchParams(location.search).get('render') === 'svg';
    this.renderer = (svg ? null : ParticleRendererGL.create(canvas)) ?? new ParticleRenderer2D(canvas);
    this.contadorFps(new URLSearchParams(location.search).has('fps') || ajustes().mostrarFps);
    alCambiarAjustes((a) => this.contadorFps(a.mostrarFps));
    requestAnimationFrame((t) => this.bucle(t));
  }

  /** Estilo de la atmósfera de cada escenario. */
  estiloAmbiente: EstiloAmbiente = 'brasas';

  /** Partículas ambientales flotando. */
  ambiente(activo: boolean) {
    this.ambienteActivo = activo;
  }

  emitir(nombre: string, x: number, y: number, escala = 1) {
    const antes = this.particulas.length;
    spawnEffect(this.particulas, nombre, x, y, escala);
    // fewer particles: keep every other one of this burst
    if (menosParticulas()) {
      const nuevas = this.particulas.splice(antes);
      for (let i = 0; i < nuevas.length; i += 2) this.particulas.push(nuevas[i]);
    }
  }

  /** ¿Hay un efecto de hechizo propio para esta clave? */
  tieneHechizo(nombre: string): boolean {
    return nombre in SPELLS;
  }

  /** Receptor por defecto del hechizo: 'self' (el héroe) o 'target' (su objetivo). */
  anclaHechizo(nombre: string): 'self' | 'target' | undefined {
    return SPELLS[nombre]?.anchor;
  }

  /** Who shows a card's sequence when it has no natural receiver ('enemies' for curses on every foe). */
  receptorHechizo(nombre: string): 'hero' | 'enemies' | undefined {
    return SPELLS[nombre]?.receiver;
  }

  /** Brief screen shake the spell asks for (null with reduced motion or when it has none). */
  sacudidaHechizo(nombre: string): { delayMs: number; level: 1 | 2 | 3 } | null {
    return cardShake(nombre, !sacudidasActivas());
  }

  /** Volley rhythm of the spell (Magic Missile's darts): ms between casts and until each impact. */
  rafagaHechizo(nombre: string): { impactMs: number; gapMs: number } | null {
    return volleyTiming(nombre, movimientoReducido());
  }

  /** Lanza el efecto de hechizo `nombre` sobre la caja de pantalla `caja`
   *  (origen opcional para alientos, rayos, aullidos…). */
  hechizo(nombre: string, caja: Box, opciones: { desde?: Point; mirando?: 1 | -1; tinte?: string } = {}): boolean {
    return this.hechizos.add(nombre, {
      box: caja, from: opciones.desde, facing: opciones.mirando, tint: opciones.tinte, reduced: menosParticulas(),
      view: { w: window.innerWidth, h: window.innerHeight },
    }, this.reloj);
  }

  /** A full-art card sheds motes and twinkles in its colour while it is on screen. */
  fuenteCarta(el: Element, colour: string) {
    this.fuentes.add({ el, colour, acc: Math.random(), seen: false, born: performance.now() });
  }

  private emitirFuentes(dt: number, t: number) {
    for (const f of this.fuentes) {
      if (!f.el.isConnected) { if (f.seen || t - f.born > 3000) this.fuentes.delete(f); continue; }
      f.seen = true;
      const r = f.el.getBoundingClientRect();
      if (r.width < 2 || r.bottom < 0 || r.top > window.innerHeight) continue;
      f.acc += dt * 12;
      while (f.acc >= 1) {
        f.acc -= 1;
        const twinkle = Math.random() < 0.25;
        spawnEffect(this.particulas, twinkle ? 'destelloCarta' : 'mota',
          r.left + Math.random() * r.width, twinkle ? r.top + Math.random() * r.height : r.top + r.height * (0.55 + Math.random() * 0.45),
          1, Math.random, twinkle ? undefined : f.colour);
      }
    }
  }

  /** Registers a persistent layer of sprites drawn every frame (an aura that follows a
   *  puppet); returns the function that removes it. */
  capa(proveedor: () => Sprite[]): () => void {
    this.capas.add(proveedor);
    return () => { this.capas.delete(proveedor); };
  }

  /** Estallido a pantalla completa para cartas raras. */
  estallido(nombre: string) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < 5; i++) this.emitir(nombre, Math.random() * w, h * 0.3 + Math.random() * h * 0.4, 0.8);
  }

  private cajaFps: HTMLElement | null = null;

  /** Small frames-per-second counter (`?fps` in the URL or the settings menu). */
  private contadorFps(activo: boolean) {
    if (!activo) { this.cajaFps?.remove(); this.cajaFps = null; return; }
    if (this.cajaFps) return;
    const caja = document.createElement('div');
    this.cajaFps = caja;
    caja.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:999;font:12px monospace;color:#e8d9b0;background:rgba(0,0,0,.6);padding:2px 6px;border-radius:4px;pointer-events:none';
    document.body.appendChild(caja);
    let marcos = 0, desde = performance.now(), peor = 0, previo = desde;
    const medir = (t: number) => {
      marcos++;
      peor = Math.max(peor, t - previo);
      previo = t;
      if (t - desde >= 1000) {
        const modo = this.renderer instanceof ParticleRendererGL ? 'WebGL' : 'SVG/2D';
        caja.textContent = `${modo} · ${Math.round((marcos * 1000) / (t - desde))} fps · peor ${Math.round(peor)} ms`;
        marcos = 0; desde = t; peor = 0;
      }
      if (this.cajaFps === caja) requestAnimationFrame(medir);
    };
    requestAnimationFrame(medir);
  }

  private bucle(t: number) {
    const dt = Math.min((t - this.ultimoT) / 1000, 0.05) * this.escalaTiempo;
    this.ultimoT = t;
    this.reloj += dt;
    const w = window.innerWidth, h = window.innerHeight;
    if (this.ambienteActivo) {
      this.acumulador += dt;
      const amb = AMBIENTS[this.estiloAmbiente] ?? AMBIENTS.brasas;
      // fewer particles: the atmosphere spawns half as often
      if (this.acumulador > amb.interval * (menosParticulas() ? 2 : 1)) {
        this.acumulador = 0;
        spawnAmbient(this.particulas, this.estiloAmbiente, w, h);
      }
    }
    if (this.fuentes.size) this.emitirFuentes(dt, t);
    stepParticles(this.particulas, dt);
    let capas: Sprite[] = [];
    for (const c of this.capas) capas = capas.concat(c());
    capas = capas.slice(0, Math.max(0, MAX_LIVE_SPRITES - this.particulas.length));
    const libres = Math.max(0, MAX_LIVE_SPRITES - this.particulas.length - capas.length);
    const spells = this.hechizos.active ? this.hechizos.frame(this.reloj, libres) : [];
    const extra = capas.length ? (spells.length ? [...capas, ...spells] : capas) : spells;
    const lista: Sprite[] = extra.length ? [...this.particulas, ...extra] : this.particulas;
    // mobile: the pixel ratio is capped, particles are small and soft anyway
    this.renderer?.render(lista, w, h, pixelRatio());
    requestAnimationFrame((tt) => this.bucle(tt));
  }
}

export const fx = new MotorParticulas();
