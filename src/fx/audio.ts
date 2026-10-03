import { MUSIC_TRACKS, loopPosition, loopWindow, retryDelayMs, sameSong, tracksToKeep } from './music-tracks.ts';

/** Crossfade between the map and combat versions of a song (seconds). */
const CRUCE_VERSIONES = 1.6;
import { SFX_RECIPE_ALIAS, groupSfxFiles, pickVariant, playbackJitter, resolveSfx } from './sfx-bank.ts';
import { ajustes, alCambiarAjustes, gananciaMusica, gananciaSfx, type Ajustes } from '../core/ajustes.ts';

// Audio engine: recorded-style sound effects from `src/audio/sfx/` (synthesised offline
// by `scripts/sfx/make_sfx.py`, see `fx/sfx-bank.ts`) and the game's original
// soundtrack from `src/audio/` (see `fx/music-tracks.ts`), looped sample-exactly with
// Web Audio. If an effect file has not loaded yet, a Web Audio recipe plays instead; if
// a track fails to load, the music stays silent and the track is retried a few times
// (nothing else ever plays in its place). Only the playing track and its other versions
// stay decoded. Everything starts after the player's first gesture, as browsers
// require, and the mute state is remembered.

// Music and effects each follow their own switch and volume in the settings menu
// (core/ajustes.ts); switching the music off never silences the effects.

// Hashed URLs of the soundtrack files: a new version of a track gets a new URL, so
// the service worker's cache-first copy of the old one is never served again.
const TRACK_URLS = import.meta.glob('../audio/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

// Sound-effect files grouped by name (`tajo-1.mp3`, `tajo-2.mp3`… are variations).
const SFX_FILES = groupSfxFiles(
  import.meta.glob('../audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
// The files are mastered close to full scale; this brings them to the effects bus level.
const SFX_FILE_GAIN = 0.5;

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
  get musicaApagada() { return !ajustes().musica; }

  private fuente: AudioBufferSourceNode | null = null; // current soundtrack track
  private volPista: GainNode | null = null;
  /** When and where the current source started, to know where its loop is now. */
  private reloj: { t0: number; begin: number; start: number; end: number } | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private generacion = 0; // discards loads for a theme that is no longer playing
  private temporizadorMusica: number | null = null;
  private temaActual: string | null = null;
  private sonando = false;
  private pausada = false; // pausada por estar en segundo plano
  private visibilidadEnganchada = false;
  private oyendoAjustes = false;
  private sfxBuffers = new Map<string, AudioBuffer[]>(); // decoded effect variations
  private sfxCargando = false;
  private ultimaVariante = new Map<string, number>();

  /** Crea el contexto en el primer gesto y lo reanuda (lo exige el navegador). */
  desbloquear() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.maestro = this.ctx.createGain();
      this.maestro.gain.value = 1;
      this.maestro.connect(this.ctx.destination);
      this.busSfx = this.ctx.createGain();
      this.busSfx.gain.value = gananciaSfx(ajustes());
      this.busSfx.connect(this.maestro);
      this.busMusica = this.ctx.createGain();
      this.busMusica.gain.value = gananciaMusica(ajustes());
      this.busMusica.connect(this.maestro);
      this.cargarSfx();
      this.escucharAjustes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Downloads and decodes every effect file once; each sound becomes playable as soon as it is ready. */
  private cargarSfx() {
    if (this.sfxCargando || !this.ctx) return;
    this.sfxCargando = true;
    for (const [nombre, urls] of SFX_FILES) {
      Promise.all(urls.map((url) => fetch(url)
        .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); })
        .then((datos) => new Promise<AudioBuffer>((ok, ko) => this.ctx!.decodeAudioData(datos, ok, ko)))
        .catch(() => null)))
        .then((bufs) => {
          const listos = bufs.filter((b): b is AudioBuffer => b !== null);
          if (listos.length) this.sfxBuffers.set(nombre, listos);
        });
    }
  }

  /** Plays one variation of a decoded effect with a slight random change of pitch and volume. */
  private reproducirArchivo(nombre: string, volume = 1): boolean {
    const bufs = this.sfxBuffers.get(nombre);
    if (!bufs?.length || !this.ctx) return false;
    const i = pickVariant(bufs.length, this.ultimaVariante.get(nombre) ?? -1, Math.random);
    this.ultimaVariante.set(nombre, i);
    const { rate, gain } = playbackJitter(Math.random);
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = bufs[i];
    fuente.playbackRate.value = rate;
    const vol = this.ctx.createGain();
    vol.gain.value = gain * SFX_FILE_GAIN * volume;
    fuente.connect(vol).connect(this.busSfx);
    fuente.start();
    return true;
  }

  /** Dispara un efecto de sonido por nombre (admite los mismos nombres que las partículas).
   *  `volume` scales it (1 = normal), e.g. for the soft knocks of a rolling die. */
  sfx(nombre: string, volume = 1) {
    this.desbloquear();
    if (!this.ctx) return;
    if (this.reproducirArchivo(resolveSfx(nombre), volume)) return;
    // fallback while the files load (or if they fail): the synthesised recipe
    const receta = RECETAS[nombre] ?? RECETAS[SFX_RECIPE_ALIAS[nombre]] ?? RECETAS.carta;
    const t0 = this.ctx.currentTime;
    for (const capa of receta) this.reproducirCapa(capa, t0 + (capa.retardo ?? 0), volume);
  }

  private reproducirCapa(c: Capa, inicio: number, volume = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const ataque = c.ataque ?? 0.005;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, c.vol * volume), inicio + ataque);
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

  /** Tema del menú principal. */
  menu() {
    this.reproducirTema('menu');
  }

  /** Conmuta al tema indicado (idempotente: no reinicia si ya suena). */
  reproducirTema(id: string) {
    this.engancharVisibilidad();
    if (this.temaActual === id && this.sonando) return;
    // the other version of the same song (map ↔ combat): carry on from the same point
    if (this.temaActual && this.sonando && this.fuente && this.ctx?.state === 'running' && sameSong(this.temaActual, id)) {
      this.cruzarVersion(id);
      return;
    }
    this.temaActual = id;
    this.desbloquear();
    if (!this.ctx) return;
    // si el contexto aún no está activo (sin gesto), se arrancará al reanudarlo
    if (this.ctx.state === 'running') this.refrescarMusica();
    else void this.ctx.resume().then(() => this.refrescarMusica());
  }

  /** (Re)arranca el tema actual según el estado (silencio, pausa, contexto). */
  private refrescarMusica() {
    if (!this.ctx) return;
    this.detenerMusica();
    if (this.musicaApagada || this.pausada || !this.temaActual) return;
    if (this.ctx.state !== 'running') return;
    this.arrancarTema(this.temaActual);
  }

  private detenerMusica() {
    if (this.temporizadorMusica !== null) {
      clearTimeout(this.temporizadorMusica); // a pending retry of a track that failed to load
      this.temporizadorMusica = null;
    }
    this.generacion++;
    if (this.fuente && this.volPista && this.ctx) {
      // short fade so the wave is not cut abruptly
      const t = this.ctx.currentTime;
      this.volPista.gain.setTargetAtTime(0, t, 0.08);
      this.fuente.stop(t + 0.4);
    }
    this.fuente = null;
    this.volPista = null;
    this.reloj = null;
    this.sonando = false;
  }

  /** Crossfades into another version of the playing song at the same point of its loop. */
  private cruzarVersion(id: string) {
    const ctx = this.ctx!;
    const pista = MUSIC_TRACKS[id];
    this.temaActual = id;
    const gen = ++this.generacion;
    this.cargarPista(pista.file).then((buf) => {
      if (gen !== this.generacion || !this.ctx || !this.fuente || !this.volPista || !this.reloj) return;
      const ahora = ctx.currentTime;
      const viejo = this.reloj;
      const pos = loopPosition(ahora - viejo.t0, viejo.begin, viejo.start, viejo.end);
      const { start, end } = loopWindow(buf.duration, pista.loopSamples, pista.introSamples);
      const offset = pos < viejo.start ? pos : start + (pos - viejo.start);
      // the old version fades out while the new one fades in from the same bar
      this.volPista.gain.cancelScheduledValues(ahora);
      this.volPista.gain.setValueAtTime(this.volPista.gain.value, ahora);
      this.volPista.gain.linearRampToValueAtTime(0, ahora + CRUCE_VERSIONES);
      this.fuente.stop(ahora + CRUCE_VERSIONES + 0.05);
      const fuente = ctx.createBufferSource();
      fuente.buffer = buf;
      fuente.loop = true;
      fuente.loopStart = start;
      fuente.loopEnd = end;
      const vol = ctx.createGain();
      vol.gain.setValueAtTime(0, ahora);
      vol.gain.linearRampToValueAtTime(1.2, ahora + CRUCE_VERSIONES);
      fuente.connect(vol).connect(this.busMusica);
      fuente.start(ahora, offset);
      this.fuente = fuente;
      this.volPista = vol;
      this.reloj = { t0: ahora, begin: offset, start, end };
    }).catch(() => { /* the version failed to load: the current one keeps playing */ });
  }

  /** Decodes the other versions of a song in advance, so switching is instant. */
  private precargarVersiones(id: string) {
    for (const otra of Object.keys(MUSIC_TRACKS)) {
      if (sameSong(id, otra)) void this.cargarPista(MUSIC_TRACKS[otra].file).catch(() => {});
    }
  }

  private arrancarTema(id: string, intento = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.sonando = true;
    // a new theme undoes a previous fade (the hero's death)
    this.busMusica.gain.cancelScheduledValues(ctx.currentTime);
    this.busMusica.gain.setValueAtTime(gananciaMusica(ajustes()), ctx.currentTime);
    const pista = MUSIC_TRACKS[id];
    if (!pista) { this.sonando = false; return; } // an unknown theme: silence, never a stand-in
    this.liberarPistas(id);
    const gen = this.generacion;
    this.cargarPista(pista.file).then((buf) => {
      if (gen !== this.generacion || !this.ctx) return;
      const { start, end, begin } = loopWindow(buf.duration, pista.loopSamples, pista.introSamples);
      const fuente = this.ctx.createBufferSource();
      fuente.buffer = buf;
      fuente.loop = true;
      fuente.loopStart = start;
      fuente.loopEnd = end;
      const vol = this.ctx.createGain();
      const t = this.ctx.currentTime;
      vol.gain.setValueAtTime(0, t);
      vol.gain.linearRampToValueAtTime(1.2, t + 0.6);
      fuente.connect(vol).connect(this.busMusica);
      fuente.start(t, begin); // the intro (if any) plays once, then the loop repeats
      this.fuente = fuente;
      this.volPista = vol;
      this.reloj = { t0: t, begin, start, end };
      this.precargarVersiones(id);
    }).catch(() => {
      if (gen !== this.generacion) return;
      // it failed (network, or a phone short of memory to decode it): stay quiet and retry
      const espera = retryDelayMs(intento);
      if (espera === null) { this.sonando = false; return; } // a later call to this theme tries again
      this.temporizadorMusica = window.setTimeout(() => {
        this.temporizadorMusica = null;
        if (gen === this.generacion && this.temaActual === id && this.ctx) this.arrancarTema(id, intento + 1);
      }, espera);
    });
  }

  /** Lets go of every decoded track except `id` and its other versions (each weighs tens of MB:
   *  piling them up can leave a phone without memory to decode the next one). */
  private liberarPistas(id: string) {
    const conservar = new Set(tracksToKeep(id));
    for (const archivo of [...this.buffers.keys()]) if (!conservar.has(archivo)) this.buffers.delete(archivo);
  }

  /** Downloads and decodes a track once (the service worker caches the file). */
  private cargarPista(archivo: string): Promise<AudioBuffer> {
    let buf = this.buffers.get(archivo);
    if (!buf) {
      const url = TRACK_URLS[`../audio/${archivo}`];
      buf = (url ? fetch(url) : Promise.reject(new Error(`missing track ${archivo}`)))
        .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); })
        .then((datos) => new Promise<AudioBuffer>((ok, ko) => this.ctx!.decodeAudioData(datos, ok, ko)));
      buf.catch(() => this.buffers.delete(archivo));
      this.buffers.set(archivo, buf);
    }
    return buf;
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
    if (!this.ctx) return;
    void this.ctx.resume().then(() => this.refrescarMusica());
  }

  /** Fades the music down to `nivel` (0..1 of its normal level) over `segundos`;
   *  the next theme that starts brings it back. */
  fundirMusica(nivel: number, segundos: number) {
    if (!this.ctx) return;
    const g = this.busMusica.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(gananciaMusica(ajustes()) * Math.max(0, Math.min(1, nivel)), t + Math.max(0.05, segundos));
  }

  /** Funeral toll for the fallen hero: a deep inharmonic gong and a low minor choir. */
  gongFunebre() {
    this.desbloquear();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    // gong: detuned partials that ring and decay slowly, plus a soft mallet thump
    for (const [freq, vol, dur] of [[55, 0.32, 3.2], [82.6, 0.16, 2.6], [151.8, 0.1, 2.0], [233, 0.05, 1.4]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.02, t0);
      osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.busSfx);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
    // choir: a D minor chord that swells in and dies away
    for (const [i, nota] of [50, 53, 57, 62].entries()) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (nota - 69) / 12);
      osc.detune.value = (i % 2 ? 1 : -1) * 6;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      const t = t0 + 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
      osc.connect(f).connect(g).connect(this.busSfx);
      osc.start(t);
      osc.stop(t + 3.05);
    }
  }

  // ── SFX elaborados para cartas raras ─────────────────────────────────────────

  /** Floritura sonora al jugar una carta rara: capa base + arpegio temático. */
  sfxRara(fx: string) {
    this.desbloquear();
    if (!this.ctx) return;
    this.sfx(fx); // golpe base existente
    if (this.reproducirArchivo('rara')) return; // recorded flourish on top of the card sound
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

  /** The settings menu changed: switch the music on/off and apply both volumes. */
  private escucharAjustes() {
    if (this.oyendoAjustes) return;
    this.oyendoAjustes = true;
    let musica = ajustes().musica;
    alCambiarAjustes((a: Ajustes) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.busSfx.gain.setTargetAtTime(gananciaSfx(a), t, 0.05);
      this.busMusica.gain.cancelScheduledValues(t);
      this.busMusica.gain.setTargetAtTime(gananciaMusica(a), t, 0.05);
      if (a.musica !== musica) {
        musica = a.musica;
        if (a.musica) this.refrescarMusica();
        else this.detenerMusica();
      }
    });
  }
}

export const audio = new MotorAudio();
