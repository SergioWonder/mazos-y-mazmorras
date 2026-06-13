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

/** Tema musical procedural (pad de acordes + opcional bombo/percusión). */
interface TemaMusica {
  acordes: number[][]; // progresión en notas MIDI
  compas: number;      // segundos por acorde (más bajo = más movido)
  onda: OscillatorType;
  filtro: number;      // corte del paso-bajo del pad (Hz)
  ganancia: number;    // volumen del pad
  bombo?: number;      // golpes de bombo por compás (temas de combate)
  archivo?: string;    // fichero CC0 opcional en public/audio/ que sustituye al loop
}

// Tres capítulos × (exploración / combate). El combate es más rápido y con bombo.
const TEMAS: Record<string, TemaMusica> = {
  // Cap. I — El Asentamiento Ogro: cálido, melancólico
  'cap1':         { acordes: [[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]], compas: 3.4, onda: 'triangle', filtro: 900, ganancia: 0.05 },
  'cap1-combate': { acordes: [[57,60,64],[50,53,57],[52,56,59],[57,60,64]],            compas: 1.8, onda: 'triangle', filtro: 1400, ganancia: 0.05, bombo: 2 },
  // Cap. II — La Cripta: oscuro, etéreo
  'cap2':         { acordes: [[50,53,57,60],[46,50,53,58],[43,46,50,53],[45,48,52,57]], compas: 3.8, onda: 'sine', filtro: 680, ganancia: 0.05 },
  'cap2-combate': { acordes: [[50,53,57],[45,48,52],[50,53,57],[43,46,50]],            compas: 1.9, onda: 'triangle', filtro: 1100, ganancia: 0.05, bombo: 2 },
  // Cap. III — La Guarida del Dragón: tenso, amenazante
  'cap3':         { acordes: [[52,55,59,62],[48,52,55,60],[45,48,52,57],[47,51,54,59]], compas: 3.1, onda: 'triangle', filtro: 1000, ganancia: 0.05 },
  'cap3-combate': { acordes: [[52,55,59],[47,50,54],[52,55,59],[48,51,55]],            compas: 1.6, onda: 'sawtooth', filtro: 1600, ganancia: 0.045, bombo: 3 },
};

class MotorAudio {
  private ctx: AudioContext | null = null;
  private maestro!: GainNode;   // ganancia global (silencio)
  private busSfx!: GainNode;    // bus de efectos
  private busMusica!: GainNode; // bus de música
  silenciado = localStorage.getItem(CLAVE_SILENCIO) === '1';

  private pista: HTMLAudioElement | null = null; // pista CC0 real, si existe
  private temporizadorMusica: number | null = null;
  private crackleActual: AudioBufferSourceNode | null = null;
  private temaActual: string | null = null;
  private sonando = false;
  private pausada = false; // pausada por estar en segundo plano
  private visibilidadEnganchada = false;
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

  /** Pone la música del capítulo (0-based); `combate` usa la variante intensa. */
  musica(capitulo: number, combate = false) {
    this.reproducirTema(`cap${capitulo + 1}${combate ? '-combate' : ''}`);
  }

  /** Conmuta al tema indicado (idempotente: no reinicia si ya suena). */
  reproducirTema(id: string) {
    this.engancharVisibilidad();
    this.desbloquear();
    if (!this.ctx) return;
    if (this.temaActual === id && this.sonando) return;
    this.temaActual = id;
    this.detenerMusica();
    if (this.silenciado || this.pausada) return; // se arrancará al reanudar
    this.arrancarTema(TEMAS[id] ?? TEMAS.cap1);
  }

  private detenerMusica() {
    if (this.temporizadorMusica !== null) {
      clearInterval(this.temporizadorMusica);
      this.temporizadorMusica = null;
    }
    if (this.crackleActual) {
      try { this.crackleActual.stop(); } catch { /* ya parado */ }
      this.crackleActual = null;
    }
    if (this.pista) { this.pista.pause(); this.pista = null; }
    this.sonando = false;
  }

  private arrancarTema(tema: TemaMusica) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.sonando = true;

    // Pista CC0 real opcional (public/audio/<archivo>); si falla, sigue el loop
    if (tema.archivo) {
      const pista = new Audio(`${import.meta.env.BASE_URL}audio/${tema.archivo}`);
      pista.loop = true;
      pista.volume = 0.6;
      pista.addEventListener('error', () => this.lofiProcedural(tema), { once: true });
      this.pista = pista;
      void pista.play().catch(() => this.lofiProcedural(tema));
      return;
    }
    this.lofiProcedural(tema);
  }

  /** Loop lo-fi: pad de acordes + crepitar de vinilo (+ bombo en combate). */
  private lofiProcedural(tema: TemaMusica) {
    const ctx = this.ctx;
    if (!ctx) return;

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
    this.crackleActual = crackle;

    let i = 0;
    const tocarAcorde = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const notas = tema.acordes[i % tema.acordes.length];
      i++;
      for (const nota of notas) {
        const freq = 440 * Math.pow(2, (nota - 69) / 12);
        const osc = this.ctx.createOscillator();
        osc.type = tema.onda;
        osc.frequency.value = freq;
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = tema.filtro;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(tema.ganancia, t + 0.6);   // ataque lento
        g.gain.exponentialRampToValueAtTime(0.0001, t + tema.compas);  // caída suave
        osc.connect(filtro).connect(g).connect(this.busMusica);
        osc.start(t);
        osc.stop(t + tema.compas + 0.1);
      }
      // Bombo: golpes graves repartidos por el compás (temas de combate)
      for (let k = 0; k < (tema.bombo ?? 0); k++) {
        this.bombo(t + (k * tema.compas) / (tema.bombo ?? 1));
      }
    };
    tocarAcorde();
    this.temporizadorMusica = window.setInterval(tocarAcorde, tema.compas * 1000);
  }

  /** Golpe de bombo grave para la percusión de combate. */
  private bombo(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(this.busMusica);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // ── Pausa en segundo plano ──────────────────────────────────────────────────

  private engancharVisibilidad() {
    if (this.visibilidadEnganchada) return;
    this.visibilidadEnganchada = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pausarPorFondo();
      else this.reanudarDeFondo();
    });
  }

  private pausarPorFondo() {
    this.pausada = true;
    if (!this.ctx) return;
    this.detenerMusica();
    void this.ctx.suspend(); // congela también los SFX en curso
  }

  private reanudarDeFondo() {
    this.pausada = false;
    if (!this.ctx || this.silenciado) return;
    void this.ctx.resume();
    if (this.temaActual) this.arrancarTema(TEMAS[this.temaActual] ?? TEMAS.cap1);
  }

  // ── SFX elaborados para cartas raras ─────────────────────────────────────────

  /** Floritura sonora al jugar una carta rara: capa base + arpegio temático. */
  sfxRara(fx: string) {
    this.desbloquear();
    if (!this.ctx || this.silenciado) return;
    this.sfx(fx); // golpe base existente
    const ARPEGIOS: Record<string, { notas: number[]; onda: OscillatorType; filtro: number }> = {
      luna:      { notas: [69, 72, 76, 81, 84], onda: 'sine',     filtro: 5000 },
      divino:    { notas: [72, 76, 79, 84, 88], onda: 'triangle', filtro: 6000 },
      furia:     { notas: [45, 48, 52, 55, 59], onda: 'sawtooth', filtro: 2200 },
      tierra:    { notas: [40, 47, 52, 55, 59], onda: 'triangle', filtro: 1400 },
      ola:       { notas: [62, 66, 69, 74, 78], onda: 'sine',     filtro: 3800 },
      estrellas: { notas: [71, 74, 78, 83, 86], onda: 'triangle', filtro: 6500 },
    };
    const a = ARPEGIOS[fx] ?? ARPEGIOS.divino;
    this.arpegio(a.notas, { onda: a.onda, filtro: a.filtro, paso: 0.07, dur: 0.6, vol: 0.1 });
    // brillo descendente de cierre
    this.arpegio([...a.notas].reverse(), { onda: 'sine', filtro: a.filtro, paso: 0.05, dur: 0.4, vol: 0.05, retardo: 0.36 });
  }

  private arpegio(
    notas: number[],
    o: { onda?: OscillatorType; paso?: number; dur?: number; vol?: number; filtro?: number; retardo?: number },
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const onda = o.onda ?? 'triangle';
    const paso = o.paso ?? 0.06;
    const dur = o.dur ?? 0.5;
    const vol = o.vol ?? 0.12;
    const filtro = o.filtro ?? 4000;
    const t0 = ctx.currentTime + (o.retardo ?? 0);
    notas.forEach((nota, i) => {
      const t = t0 + i * paso;
      const freq = 440 * Math.pow(2, (nota - 69) / 12);
      const osc = ctx.createOscillator();
      osc.type = onda;
      osc.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filtro;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(f).connect(g).connect(this.busSfx);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  // ── Silencio / interfaz ─────────────────────────────────────────────────────

  toggleSilencio() {
    this.silenciado = !this.silenciado;
    localStorage.setItem(CLAVE_SILENCIO, this.silenciado ? '1' : '0');
    if (this.ctx) this.maestro.gain.value = this.silenciado ? 0 : 1;
    if (this.silenciado) {
      this.detenerMusica();
    } else if (this.temaActual && !this.pausada) {
      this.arrancarTema(TEMAS[this.temaActual] ?? TEMAS.cap1);
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
