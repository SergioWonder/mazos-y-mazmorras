// Player settings: sound (music and effects, each with its volume) and performance
// (fewer particles, lower resolution, screen shake, FPS counter). Pure model plus
// a tiny live store: the audio engine, the fx engine and the menu read it and
// listen for changes. Stored in localStorage; no DOM here.

export interface Ajustes {
  musica: boolean;
  sonidos: boolean;
  /** 0..1, on top of each bus's normal level. */
  volumenMusica: number;
  volumenSonidos: number;
  reducirParticulas: boolean;
  /** Canvases drawn at 1 device pixel per CSS pixel (instead of up to 2). */
  resolucionBaja: boolean;
  sacudidas: boolean;
  mostrarFps: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  musica: true, sonidos: true, volumenMusica: 1, volumenSonidos: 1,
  reducirParticulas: false, resolucionBaja: false, sacudidas: true, mostrarFps: false,
};

export const CLAVE_AJUSTES = 'mazmorra-ajustes';
/** Key of the old floating music button (still honoured on first load). */
const CLAVE_MUSICA_ANTIGUA = 'mazmorra-musica-apagada';

/** Normal levels of the music and effects buses (volume 1). */
export const NIVEL_MUSICA = 0.5;
export const NIVEL_SFX = 0.9;

interface Almacen { getItem(k: string): string | null; setItem(k: string, v: string): void }

const volumen = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : def);
const booleano = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);

export function leerAjustes(almacen: Almacen | null): Ajustes {
  const base = { ...AJUSTES_POR_DEFECTO };
  if (!almacen) return base;
  let guardado: Partial<Record<keyof Ajustes, unknown>> = {};
  try {
    const crudo = almacen.getItem(CLAVE_AJUSTES);
    if (crudo) guardado = JSON.parse(crudo) ?? {};
    else if (almacen.getItem(CLAVE_MUSICA_ANTIGUA) === '1') guardado = { musica: false };
  } catch { /* corrupt settings: defaults */ }
  if (typeof guardado !== 'object' || guardado === null) guardado = {};
  return {
    musica: booleano(guardado.musica, base.musica),
    sonidos: booleano(guardado.sonidos, base.sonidos),
    volumenMusica: volumen(guardado.volumenMusica, base.volumenMusica),
    volumenSonidos: volumen(guardado.volumenSonidos, base.volumenSonidos),
    reducirParticulas: booleano(guardado.reducirParticulas, base.reducirParticulas),
    resolucionBaja: booleano(guardado.resolucionBaja, base.resolucionBaja),
    sacudidas: booleano(guardado.sacudidas, base.sacudidas),
    mostrarFps: booleano(guardado.mostrarFps, base.mostrarFps),
  };
}

export function guardarAjustes(almacen: Almacen | null, a: Ajustes) {
  try {
    almacen?.setItem(CLAVE_AJUSTES, JSON.stringify(a));
    // keep the old key in step (older builds and tests read it)
    almacen?.setItem(CLAVE_MUSICA_ANTIGUA, a.musica ? '0' : '1');
  } catch { /* private mode */ }
}

/** Gain of the music bus for these settings. */
export const gananciaMusica = (a: Ajustes) => (a.musica ? NIVEL_MUSICA * a.volumenMusica : 0);
/** Gain of the effects bus (the music switch never touches it). */
export const gananciaSfx = (a: Ajustes) => (a.sonidos ? NIVEL_SFX * a.volumenSonidos : 0);

// ── live store ──────────────────────────────────────────────────────────────
const almacenLocal = (): Almacen | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};
let actuales: Ajustes = leerAjustes(almacenLocal());
const oyentes = new Set<(a: Ajustes) => void>();

/** Current settings (read them each time: they can change from the menu). */
export const ajustes = (): Ajustes => actuales;

/** Changes one setting, saves it and tells every listener. */
export function cambiarAjuste<K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) {
  actuales = { ...actuales, [clave]: valor };
  guardarAjustes(almacenLocal(), actuales);
  for (const f of oyentes) f(actuales);
}

/** Calls `f` on every change; returns the function that stops listening. */
export function alCambiarAjustes(f: (a: Ajustes) => void): () => void {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}
