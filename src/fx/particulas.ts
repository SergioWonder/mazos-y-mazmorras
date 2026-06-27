// Sistema de partículas sobre <canvas> a pantalla completa.
// La UI emite efectos por nombre en coordenadas de pantalla.

type Forma = 'circulo' | 'chispa' | 'hoja' | 'estrella' | 'corazon';

interface Particula {
  x: number; y: number; vx: number; vy: number;
  vida: number; vidaMax: number;
  tam: number; color: string; forma: Forma;
  gravedad: number; giro: number; angulo: number;
  brillo?: boolean;
}

interface ConfigEfecto {
  cantidad: number;
  colores: string[];
  velocidad: [number, number];
  vida: [number, number];
  tam: [number, number];
  forma: Forma;
  gravedad: number;
  direccion?: [number, number]; // rango de ángulo en radianes (def: todo el círculo)
  brillo?: boolean;
}

const EFECTOS: Record<string, ConfigEfecto> = {
  tajo:       { cantidad: 18, colores: ['#ffd9a0', '#ff9d4d', '#fff3d6'], velocidad: [2, 7], vida: [0.25, 0.5], tam: [1.5, 3.5], forma: 'chispa', gravedad: 0.12 },
  impacto:    { cantidad: 30, colores: ['#ffe9b0', '#ff8c3b', '#ffffff'], velocidad: [3, 10], vida: [0.3, 0.6], tam: [2, 5], forma: 'chispa', gravedad: 0.18, brillo: true },
  zarpa:      { cantidad: 16, colores: ['#c9f29b', '#7dba4e', '#fff7e0'], velocidad: [2, 6], vida: [0.25, 0.5], tam: [1.5, 3], forma: 'chispa', gravedad: 0.1 },
  golpeEnemigo: { cantidad: 16, colores: ['#ff6b5e', '#b3261e', '#ffd0c0'], velocidad: [2, 6], vida: [0.3, 0.55], tam: [2, 4], forma: 'circulo', gravedad: 0.15 },
  bloqueo:    { cantidad: 14, colores: ['#9fd8ff', '#5aa7d6', '#e8f6ff'], velocidad: [1, 3], vida: [0.4, 0.8], tam: [2, 4], forma: 'circulo', gravedad: -0.04 },
  cura:       { cantidad: 14, colores: ['#a7f3a0', '#54c95e', '#eaffe8'], velocidad: [0.5, 2], vida: [0.6, 1.1], tam: [2, 4], forma: 'circulo', gravedad: -0.08, direccion: [-2.4, -0.7] },
  hojas:      { cantidad: 16, colores: ['#7dba4e', '#4e8a33', '#b8e08a'], velocidad: [1, 3], vida: [0.7, 1.3], tam: [3, 5], forma: 'hoja', gravedad: 0.05 },
  raices:     { cantidad: 20, colores: ['#7a5a36', '#4e8a33', '#a8804f'], velocidad: [2, 5], vida: [0.4, 0.8], tam: [2, 4], forma: 'chispa', gravedad: 0.2 },
  transformacion: { cantidad: 36, colores: ['#b8e08a', '#7dba4e', '#fff7c2'], velocidad: [1, 5], vida: [0.5, 1.1], tam: [2, 5], forma: 'hoja', gravedad: -0.03, brillo: true },
  furia:      { cantidad: 28, colores: ['#ff6b35', '#d62828', '#ffd166'], velocidad: [1.5, 6], vida: [0.4, 0.9], tam: [2, 5], forma: 'chispa', gravedad: -0.12, brillo: true },
  aullido:    { cantidad: 12, colores: ['#cfcfe8', '#8d8db5'], velocidad: [1, 4], vida: [0.4, 0.8], tam: [2, 4], forma: 'circulo', gravedad: -0.05 },
  luna:       { cantidad: 32, colores: ['#dfe8ff', '#9bb4ff', '#ffffff'], velocidad: [1, 5], vida: [0.6, 1.2], tam: [2, 5], forma: 'estrella', gravedad: -0.05, brillo: true },
  ola:        { cantidad: 40, colores: ['#5aa7d6', '#2e6f9e', '#bfe7ff'], velocidad: [2, 8], vida: [0.4, 0.9], tam: [2, 5], forma: 'circulo', gravedad: 0.25, brillo: true },
  estrellas:  { cantidad: 36, colores: ['#fff3b8', '#ffd166', '#ffffff'], velocidad: [0.5, 4], vida: [0.7, 1.4], tam: [2, 5], forma: 'estrella', gravedad: -0.02, brillo: true },
  tierra:     { cantidad: 26, colores: ['#a8804f', '#7a5a36', '#c9f29b'], velocidad: [1, 4], vida: [0.5, 1], tam: [2, 5], forma: 'circulo', gravedad: 0.1 },
  divino:     { cantidad: 36, colores: ['#ffd166', '#fff3b8', '#ffffff'], velocidad: [1, 6], vida: [0.5, 1.1], tam: [2, 5], forma: 'estrella', gravedad: -0.08, brillo: true },
  muerte:     { cantidad: 40, colores: ['#8d8db5', '#3a3a52', '#cfcfe8'], velocidad: [1, 6], vida: [0.5, 1.2], tam: [2, 6], forma: 'circulo', gravedad: -0.02 },
  aliento:    { cantidad: 72, colores: ['#ff3b00', '#ff7a18', '#ffb347', '#fff3b8'], velocidad: [3, 11], vida: [0.4, 1.0], tam: [3, 7], forma: 'chispa', gravedad: -0.05, brillo: true },
  corazones:  { cantidad: 30, colores: ['#ff5d8f', '#ff8fb3', '#ffd0e0', '#ffffff'], velocidad: [1, 4], vida: [0.7, 1.4], tam: [4, 8], forma: 'corazon', gravedad: -0.06, brillo: true },
  sangre:     { cantidad: 22, colores: ['#a01616', '#7a0d0d', '#d63b3b'], velocidad: [1, 4], vida: [0.4, 0.9], tam: [2, 5], forma: 'circulo', gravedad: 0.32 },
  veneno:     { cantidad: 22, colores: ['#7cff5a', '#39a824', '#caffb8'], velocidad: [1, 4], vida: [0.4, 0.9], tam: [2, 5], forma: 'circulo', gravedad: -0.06, brillo: true },
};

/** Atmósferas ambientales: partículas que ascienden de fondo en cada escenario. */
export type EstiloAmbiente = 'brasas' | 'almas' | 'sombras' | 'abismo' | 'arcano';
interface ConfigAmbiente {
  intervalo: number; vxAmp: number; vyBase: number; vyVar: number;
  tamBase: number; tamVar: number; colores: string[];
}
const AMBIENTES: Record<EstiloAmbiente, ConfigAmbiente> = {
  // brasas anaranjadas (asentamiento ogro / guarida del dragón)
  brasas:  { intervalo: 0.4, vxAmp: 0.6, vyBase: 0.4, vyVar: 0.8, tamBase: 1, tamVar: 2.2, colores: ['#ff8c3b', '#ff8c3b', '#ffd166'] },
  // almas frías azuladas (la cripta)
  almas:   { intervalo: 0.7, vxAmp: 0.3, vyBase: 0.25, vyVar: 0.45, tamBase: 1.6, tamVar: 2.6, colores: ['#9bb4ff', '#9bb4ff', '#b8ffd9'] },
  // polvo y penumbra (guarida de contrabandistas)
  sombras: { intervalo: 0.55, vxAmp: 0.4, vyBase: 0.16, vyVar: 0.4, tamBase: 1.4, tamVar: 2.2, colores: ['#6b7280', '#8a7fa0', '#4b5563'] },
  // pavesas infernales rojas y violetas (templo oscuro)
  abismo:  { intervalo: 0.45, vxAmp: 0.5, vyBase: 0.35, vyVar: 0.7, tamBase: 1.4, tamVar: 2.6, colores: ['#ff3b3b', '#b026ff', '#ff6b3b'] },
  // motas arcanas iridiscentes (laberinto del contemplador)
  arcano:  { intervalo: 0.5, vxAmp: 0.5, vyBase: 0.2, vyVar: 0.5, tamBase: 1.6, tamVar: 2.8, colores: ['#b06bff', '#6bd8ff', '#ff6bd8'] },
};

class MotorParticulas {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particulas: Particula[] = [];
  private ultimoT = 0;
  private brasasActivas = false;
  private acumuladorBrasas = 0;

  iniciar(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const ajustar = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    requestAnimationFrame((t) => this.bucle(t));
  }

  /** Estilo de la atmósfera de cada escenario. */
  estiloAmbiente: EstiloAmbiente = 'brasas';

  /** Partículas ambientales flotando. */
  ambiente(activo: boolean) {
    this.brasasActivas = activo;
  }

  emitir(nombre: string, x: number, y: number, escala = 1) {
    const cfg = EFECTOS[nombre] ?? EFECTOS.tajo;
    for (let i = 0; i < cfg.cantidad * escala; i++) {
      const ang = cfg.direccion
        ? cfg.direccion[0] + Math.random() * (cfg.direccion[1] - cfg.direccion[0])
        : Math.random() * Math.PI * 2;
      const vel = cfg.velocidad[0] + Math.random() * (cfg.velocidad[1] - cfg.velocidad[0]);
      const vida = cfg.vida[0] + Math.random() * (cfg.vida[1] - cfg.vida[0]);
      this.particulas.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 24,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida, vidaMax: vida,
        tam: cfg.tam[0] + Math.random() * (cfg.tam[1] - cfg.tam[0]),
        color: cfg.colores[Math.floor(Math.random() * cfg.colores.length)],
        forma: cfg.forma,
        gravedad: cfg.gravedad,
        giro: (Math.random() - 0.5) * 0.3,
        angulo: Math.random() * Math.PI * 2,
        brillo: cfg.brillo,
      });
    }
  }

  /** Estallido a pantalla completa para cartas raras. */
  estallido(nombre: string) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < 5; i++) {
      this.emitir(nombre, Math.random() * w, h * 0.3 + Math.random() * h * 0.4, 0.8);
    }
  }

  private bucle(t: number) {
    const dt = Math.min((t - this.ultimoT) / 1000, 0.05);
    this.ultimoT = t;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (this.brasasActivas) {
      this.acumuladorBrasas += dt;
      const amb = AMBIENTES[this.estiloAmbiente] ?? AMBIENTES.brasas;
      if (this.acumuladorBrasas > amb.intervalo) {
        this.acumuladorBrasas = 0;
        this.particulas.push({
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          vx: (Math.random() - 0.5) * amb.vxAmp,
          vy: -(amb.vyBase + Math.random() * amb.vyVar),
          vida: 6 + Math.random() * 4, vidaMax: 10,
          tam: amb.tamBase + Math.random() * amb.tamVar,
          color: amb.colores[Math.floor(Math.random() * amb.colores.length)],
          forma: 'circulo', gravedad: -0.001,
          giro: 0, angulo: 0, brillo: true,
        });
      }
    }

    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.vida -= dt;
      if (p.vida <= 0) {
        this.particulas.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravedad;
      p.angulo += p.giro;
      const alfa = Math.min(1, p.vida / (p.vidaMax * 0.5));
      ctx.globalAlpha = alfa;
      ctx.fillStyle = p.color;
      if (p.brillo) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }
      this.dibujar(p);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    requestAnimationFrame((tt) => this.bucle(tt));
  }

  private dibujar(p: Particula) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angulo);
    switch (p.forma) {
      case 'circulo':
        ctx.beginPath();
        ctx.arc(0, 0, p.tam, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'chispa':
        ctx.fillRect(-p.tam * 1.8, -p.tam * 0.35, p.tam * 3.6, p.tam * 0.7);
        break;
      case 'hoja':
        ctx.beginPath();
        ctx.ellipse(0, 0, p.tam * 1.4, p.tam * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'estrella': {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * p.tam * 2, Math.sin(a) * p.tam * 2);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.tam * 0.5;
        ctx.stroke();
        break;
      }
      case 'corazon': {
        const s = p.tam * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 1.6, -s * 0.6, s * 0.8, -s * 1.8, 0, -s * 0.6);
        ctx.bezierCurveTo(-s * 0.8, -s * 1.8, -s * 1.6, -s * 0.6, 0, s);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

export const fx = new MotorParticulas();
