// Motor de audio: efectos de sonido sintetizados con la Web Audio API
// (cero ficheros, cero licencias) + música lo-fi de mazmorreo.
//
// La música prefiere una pista CC0 real en `public/audio/lofi-mazmorra.{mp3,ogg}`
// (ver README); si no existe, cae en un loop lo-fi generado al vuelo, así que
// nunca queda en silencio. Todo arranca tras el primer gesto del jugador,
// como exigen los navegadores, y el estado de silencio se recuerda.

const CLAVE_SILENCIO = 'mazmorra-audio-silencio';

/** Receta de un efecto: capas de tono y/o ruido. */
interface Capa {
  tipo: OscillatorType | 'ruido';
  freq?: number;       // frecuencia inicial (Hz) para osciladores
  freqFin?: number;    // barrido hasta esta frecuencia
  dur: number;         // duración en segundos
  vol: number;         // ganancia pico
  ataque?: number;     // tiempo de subida (def. 0.005)
  filtro?: number;     // corte del paso-bajo (Hz) para el ruido/tono
  retardo?: number;    // empieza esta capa N segundos después
}

const RECETAS: Record<string, Capa[]> = {
  // Ataques del jugador: filo metálico + chispa de ruido
  tajo: [
    { tipo: 'sawtooth', freq: 520, freqFin: 120, dur: 0.18, vol: 0.18 },
    { tipo: 'ruido', dur: 0.12, vol: 0.14, filtro: 3500 },
  ],
  impacto: [
    { tipo: 'square', freq: 320, freqFin: 90, dur: 0.22, vol: 0.2 },
    { tipo: 'ruido', dur: 0.16, vol: 0.2, filtro: 2600 },
  ],
  // Golpe que recibe el jugador: golpe sordo y grave
  golpeEnemigo: [
    { tipo: 'sine', freq: 160, freqFin: 55, dur: 0.26, vol: 0.26 },
    { tipo: 'ruido', dur: 0.14, vol: 0.16, filtro: 1400 },
  ],
  // Bloqueo: tañido metálico (dos parciales)
  bloqueo: [
    { tipo: 'triangle', freq: 880, dur: 0.18, vol: 0.14 },
    { tipo: 'triangle', freq: 1320, dur: 0.14, vol: 0.08, retardo: 0.01 },
  ],
  // Curación: arpegio ascendente suave
  cura: [
    { tipo: 'sine', freq: 523, dur: 0.16, vol: 0.12, ataque: 0.02 },
    { tipo: 'sine', freq: 659, dur: 0.16, vol: 0.12, ataque: 0.02, retardo: 0.07 },
    { tipo: 'sine', freq: 784, dur: 0.22, vol: 0.12, ataque: 0.02, retardo: 0.14 },
  ],
  // Muerte: barrido descendente + ruido
  muerte: [
    { tipo: 'sawtooth', freq: 300, freqFin: 40, dur: 0.5, vol: 0.18 },
    { tipo: 'ruido', dur: 0.4, vol: 0.14, filtro: 1200 },
  ],
  // Furia: acorde agresivo ascendente
  furia: [
    { tipo: 'sawtooth', freq: 150, freqFin: 260, dur: 0.4, vol: 0.18 },
    { tipo: 'square', freq: 226, freqFin: 392, dur: 0.4, vol: 0.1 },
  ],
  // Furia Divina: campana brillante
  divino: [
    { tipo: 'sine', freq: 784, dur: 0.6, vol: 0.16, ataque: 0.005 },
    { tipo: 'sine', freq: 1175, dur: 0.5, vol: 0.1, retardo: 0.02 },
    { tipo: 'triangle', freq: 1568, dur: 0.4, vol: 0.06, retardo: 0.04 },
  ],
  // Naturaleza / tierra: retumbo grave
  tierra: [
    { tipo: 'sine', freq: 90, freqFin: 60, dur: 0.45, vol: 0.22 },
    { tipo: 'ruido', dur: 0.3, vol: 0.1, filtro: 700 },
  ],
  raices: [
    { tipo: 'sine', freq: 110, freqFin: 70, dur: 0.35, vol: 0.2 },
    { tipo: 'ruido', dur: 0.25, vol: 0.1, filtro: 900 },
  ],
  // Lanzar una carta: leve siseo
  carta: [{ tipo: 'ruido', dur: 0.16, vol: 0.08, filtro: 5000 }],
  // Aplicar un estado: blip corto
  estado: [{ tipo: 'triangle', freq: 660, freqFin: 990, dur: 0.12, vol: 0.08 }],
  // Se desvanece la Furia: caída de tono
  furiaPerdida: [{ tipo: 'sawtooth', freq: 330, freqFin: 80, dur: 0.5, vol: 0.16 }],
  // Botón de la interfaz
  ui: [{ tipo: 'triangle', freq: 520, dur: 0.07, vol: 0.07 }],
};

class MotorAudio {
  private ctx: AudioContext | null = null;
  private maestro!: GainNode;   // ganancia global (silencio)
  private busSfx!: GainNode;    // bus de efectos
  private busMusica!: GainNode; // bus de música
  silenciado = localStorage.getItem(CLAVE_SILENCIO) === '1';

  private musicaArrancada = false;
  private pista: HTMLAudioElement | null = null; // pista CC0 real, si existe
  private temporizadorLofi: number | null = null;
  private boton: HTMLButtonElement | null = null;

  /** Crea el contexto en el primer gesto y lo reanuda (lo exige el navegador). */
  desbloquear() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.maestro = this.ctx.createGain();
      this.maestro.gain.value = this.silenciado ? 0 : 1;
      this.maestro.connect(this.ctx.destination);
      this.busSfx = this.ctx.createGain();
      this.busSfx.gain.value = 0.9;
      this.busSfx.connect(this.maestro);
      this.busMusica = this.ctx.createGain();
      this.busMusica.gain.value = 0.5;
      this.busMusica.connect(this.maestro);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Dispara un efecto de sonido por nombre (admite los mismos nombres que las partículas). */
  sfx(nombre: string) {
    this.desbloquear();
    if (!this.ctx || this.silenciado) return;
    const receta = RECETAS[nombre] ?? RECETAS.carta;
    const t0 = this.ctx.currentTime;
    for (const capa of receta) this.reproducirCapa(capa, t0 + (capa.retardo ?? 0));
  }

  private reproducirCapa(c: Capa, inicio: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const ataque = c.ataque ?? 0.005;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(c.vol, inicio + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + c.dur);
    g.connect(this.busSfx);

    if (c.tipo === 'ruido') {
      const fuente = ctx.createBufferSource();
      fuente.buffer = this.bufferRuido(c.dur);
      if (c.filtro) {
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = c.filtro;
        fuente.connect(filtro).connect(g);
      } else {
        fuente.connect(g);
      }
      fuente.start(inicio);
      fuente.stop(inicio + c.dur);
    } else {
      const osc = ctx.createOscillator();
      osc.type = c.tipo;
      osc.frequency.setValueAtTime(c.freq ?? 440, inicio);
      if (c.freqFin) osc.frequency.exponentialRampToValueAtTime(c.freqFin, inicio + c.dur);
      osc.connect(g);
      osc.start(inicio);
      osc.stop(inicio + c.dur + 0.02);
    }
  }

  private cacheRuido: AudioBuffer | null = null;
  private bufferRuido(dur: number): AudioBuffer {
    // Un buffer de 1 s reutilizable basta para cualquier ráfaga corta
    if (!this.cacheRuido || this.cacheRuido.duration < dur) {
      const n = Math.ceil(this.ctx!.sampleRate * Math.max(1, dur));
      const buf = this.ctx!.createBuffer(1, n, this.ctx!.sampleRate);
      const datos = buf.getChannelData(0);
      let semilla = 1;
      for (let i = 0; i < n; i++) {
        // ruido determinista (sin Math.random): LCG simple
        semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
        datos[i] = (semilla / 0x3fffffff) - 1;
      }
      this.cacheRuido = buf;
    }
    return this.cacheRuido;
  }

  // ── Música ────────────────────────────────────────────────────────────────

  /** Arranca la música de fondo (una sola vez). Prefiere una pista real CC0. */
  iniciarMusica() {
    this.desbloquear();
    if (this.musicaArrancada || !this.ctx) return;
    this.musicaArrancada = true;

    const base = import.meta.env.BASE_URL;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.6;
    // Si hay una pista CC0 real la usamos; si falla, loop lo-fi sintetizado.
    audio.src = `${base}audio/lofi-mazmorra.mp3`;
    audio.addEventListener('canplaythrough', () => {
      this.pista = audio;
      if (!this.silenciado) void audio.play().catch(() => this.lofiProcedural());
    }, { once: true });
    audio.addEventListener('error', () => this.lofiProcedural(), { once: true });
    audio.load();
  }

  /** Loop lo-fi de respaldo: pad de acordes + crepitar de vinilo. */
  private lofiProcedural() {
    const ctx = this.ctx;
    if (!ctx || this.temporizadorLofi !== null) return;

    // Crepitar de vinilo continuo, muy bajo
    const crackle = ctx.createBufferSource();
    crackle.buffer = this.bufferRuido(2);
    crackle.loop = true;
    const filtroCrackle = ctx.createBiquadFilter();
    filtroCrackle.type = 'highpass';
    filtroCrackle.frequency.value = 6000;
    const gCrackle = ctx.createGain();
    gCrackle.gain.value = 0.015;
    crackle.connect(filtroCrackle).connect(gCrackle).connect(this.busMusica);
    crackle.start();

    // Progresión menor melancólica (MIDI): Am9 – Fmaj7 – Cmaj7 – G
    const acordes = [
      [57, 60, 64, 69], // Am
      [53, 57, 60, 65], // Fmaj7
      [48, 55, 60, 64], // Cmaj7
      [55, 59, 62, 67], // G
    ];
    const compas = 3.4; // segundos por acorde (lento, lo-fi)
    let i = 0;
    const tocarAcorde = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const notas = acordes[i % acordes.length];
      i++;
      for (const nota of notas) {
        const freq = 440 * Math.pow(2, (nota - 69) / 12);
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = 900;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.6);   // ataque lento
        g.gain.exponentialRampToValueAtTime(0.0001, t + compas); // caída suave
        osc.connect(filtro).connect(g).connect(this.busMusica);
        osc.start(t);
        osc.stop(t + compas + 0.1);
      }
    };
    tocarAcorde();
    this.temporizadorLofi = window.setInterval(tocarAcorde, compas * 1000);
  }

  // ── Silencio / interfaz ─────────────────────────────────────────────────────

  toggleSilencio() {
    this.silenciado = !this.silenciado;
    localStorage.setItem(CLAVE_SILENCIO, this.silenciado ? '1' : '0');
    if (this.ctx) this.maestro.gain.value = this.silenciado ? 0 : 1;
    if (this.pista) {
      if (this.silenciado) this.pista.pause();
      else void this.pista.play().catch(() => {});
    }
    this.actualizarBoton();
    if (!this.silenciado) this.sfx('ui');
  }

  /** Inserta un botón flotante de silencio (widget autónomo). */
  crearBoton() {
    if (this.boton) return;
    const b = document.createElement('button');
    b.className = 'boton-audio';
    b.setAttribute('aria-label', 'Silenciar / activar sonido');
    b.addEventListener('click', () => {
      this.desbloquear();
      this.toggleSilencio();
    });
    document.body.appendChild(b);
    this.boton = b;
    this.actualizarBoton();
  }

  private actualizarBoton() {
    if (this.boton) {
      this.boton.textContent = this.silenciado ? '🔇' : '🔊';
      this.boton.classList.toggle('silenciado', this.silenciado);
    }
  }
}

export const audio = new MotorAudio();
