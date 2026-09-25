// Sistema de partículas a pantalla completa. La UI emite efectos por nombre en
// coordenadas de pantalla. Simulation lives in particle-sim.ts; drawing uses
// WebGL2 (particle-gl.ts) and falls back to canvas 2D without it.

import {
  spawnAmbient, spawnEffect, stepParticles, particleAlpha, AMBIENTS, type AmbientStyle, type Particle,
} from './particle-sim.ts';
import { ParticleRendererGL } from './particle-gl.ts';

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
  render(list: Particle[], width: number, height: number, dpr: number) {
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
        default: ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

class MotorParticulas {
  private renderer: ParticleRendererGL | ParticleRenderer2D | null = null;
  private particulas: Particle[] = [];
  private ultimoT = 0;
  private ambienteActivo = false;
  private acumulador = 0;

  iniciar(canvas: HTMLCanvasElement) {
    const svg = new URLSearchParams(location.search).get('render') === 'svg';
    this.renderer = (svg ? null : ParticleRendererGL.create(canvas)) ?? new ParticleRenderer2D(canvas);
    if (new URLSearchParams(location.search).has('fps')) this.contadorFps();
    requestAnimationFrame((t) => this.bucle(t));
  }

  /** Estilo de la atmósfera de cada escenario. */
  estiloAmbiente: EstiloAmbiente = 'brasas';

  /** Partículas ambientales flotando. */
  ambiente(activo: boolean) {
    this.ambienteActivo = activo;
  }

  emitir(nombre: string, x: number, y: number, escala = 1) {
    spawnEffect(this.particulas, nombre, x, y, escala);
  }

  /** Estallido a pantalla completa para cartas raras. */
  estallido(nombre: string) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < 5; i++) this.emitir(nombre, Math.random() * w, h * 0.3 + Math.random() * h * 0.4, 0.8);
  }

  /** `?fps` in the URL: small frames-per-second counter to check a device. */
  private contadorFps() {
    const caja = document.createElement('div');
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
      requestAnimationFrame(medir);
    };
    requestAnimationFrame(medir);
  }

  private bucle(t: number) {
    const dt = Math.min((t - this.ultimoT) / 1000, 0.05);
    this.ultimoT = t;
    const w = window.innerWidth, h = window.innerHeight;
    if (this.ambienteActivo) {
      this.acumulador += dt;
      const amb = AMBIENTS[this.estiloAmbiente] ?? AMBIENTS.brasas;
      if (this.acumulador > amb.interval) {
        this.acumulador = 0;
        spawnAmbient(this.particulas, this.estiloAmbiente, w, h);
      }
    }
    stepParticles(this.particulas, dt);
    // mobile: the pixel ratio is capped, particles are small and soft anyway
    this.renderer?.render(this.particulas, w, h, Math.min(window.devicePixelRatio || 1, 2));
    requestAnimationFrame((tt) => this.bucle(tt));
  }
}

export const fx = new MotorParticulas();
