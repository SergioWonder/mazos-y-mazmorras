import type { CartaDef } from '../core/types.ts';
import { el, ICONO_ESTADO, NOMBRE_ESTADO, DESCRIPCION_ESTADO } from './util.ts';

const NOMBRE_TIPO: Record<string, string> = {
  ataque: 'Ataque', habilidad: 'Habilidad', poder: 'Poder',
};

// ── Glosario de palabras clave (cuadro de la vista en grande) ────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface Clave { icono: string; nombre: string; desc: string; }

const DESC_TIPO: Record<string, string> = {
  ataque: 'Inflige daño. Algunos efectos enemigos reaccionan a recibir ataques.',
  habilidad: 'Efecto sin daño directo: bloqueo, estados o utilidad.',
  poder: 'Efecto que dura todo el combate; la carta se retira de tu mazo al jugarse.',
};

/** Estados (de util) que se reconocen buscando su nombre en el texto. */
const ESTADOS_CLAVE: string[] = [
  'fuerza', 'destreza', 'vulnerable', 'debil', 'fragil', 'espinas',
  'regeneracion', 'raices', 'espejismo', 'quemadura', 'hemorragia',
  'veneno', 'acrobacias', 'condena', 'oscuridad',
];

/** Palabras clave que no son estados (mecánicas y propiedades de carta). */
const CLAVES_EXTRA: Array<Clave & { test: (def: CartaDef, txt: string) => boolean }> = [
  { test: (_d, t) => t.includes('bloqueo'), icono: '🛡️', nombre: 'Bloqueo',
    desc: 'Absorbe el daño recibido hasta agotarse. Se pierde al inicio de tu turno.' },
  { test: (d, t) => !!d.requiereConjuro || (t.includes('conjuro') && !t.includes('prodigioso')), icono: '◈', nombre: 'Espacio de conjuro',
    desc: 'Recurso del mago en pirámide (máx. nivel 3). Las cartas de conjuro gastan el de mayor nivel; se recuperan al acabar el combate.' },
  { test: (_d, t) => t.includes('escribir') || t.includes('conjuro prodigioso'), icono: '📜', nombre: 'Conjuro Prodigioso',
    desc: 'Carta generada (coste 2, daño base 10) que crece durante el combate. «Escribir X» le suma X de daño y, algunas cartas, le añaden un efecto permanente (área, Vulnerable, bloqueo o ignorar bloqueo). Aparece en tu mano si no está ya en tu mazo, mano o descarte.' },
  { test: (_d, t) => t.includes('furia'), icono: '🔥', nombre: 'Furia',
    desc: 'Fuerza/Destreza acumulada del bárbaro; se rompe si acabas la ronda sin recibir daño real.' },
  { test: (_d, t) => t.includes('transformacion') || t.includes('transformad'), icono: '🐾', nombre: 'Transformación',
    desc: 'Forma salvaje del druida: bonus temporal de Fuerza o Destreza durante varios turnos.' },
  { test: (_d, t) => t.includes('ignora') && t.includes('bloqueo'), icono: '💥', nombre: 'Ignora el bloqueo',
    desc: 'El daño atraviesa el bloqueo del enemigo y, además, lo destruye.' },
  { test: (d) => d.innato === true, icono: '🌟', nombre: 'Innata',
    desc: 'Empiezas cada combate con esta carta en la mano.' },
  { test: (d, t) => d.exhumar === true || t.includes('se agota'), icono: '♻️', nombre: 'Se agota',
    desc: 'Al jugarse va a la pila de agotadas: no vuelve este combate (sí en el siguiente).' },
  { test: (d, t) => d.retener === true || t.includes('retener'), icono: '✋', nombre: 'Retener',
    desc: 'No se descarta al final del turno: se queda en tu mano.' },
  { test: (d) => d.unUso === true, icono: '🔚', nombre: '1 uso',
    desc: 'Se consume para siempre: desaparece de tu mazo el resto de la partida.' },
  { test: (d, t) => d.clase !== 'brujo' && (t.includes('invoca') || t.includes('invocación')), icono: '🐾', nombre: 'Invocación',
    desc: 'Aliado del druida con vida propia. «Invoca X» le suma X de vida (actual y máxima) o crea uno nuevo. Ataca al inicio de tu turno por el 30 % de su vida actual, y absorbe el daño enemigo después de tu bloqueo y antes que tú. La forma la fija la primera carta; las pasivas de todas se combinan.' },
  { test: (d, t) => t.includes('daga') && d.id !== 'daga', icono: '🗡️', nombre: 'Dagas',
    desc: 'Ataques del pícaro de 0 de coste que se agotan al jugarse (infligen 4 de daño, más lo que sumen tus poderes). Se generan en la mano; no ocupan tu mazo.' },
  { test: (_d, t) => t.includes('descarta'), icono: '🗑️', nombre: 'Descartar',
    desc: 'Manda cartas de tu mano a la pila de descarte. Algunas cartas y poderes del pícaro se benefician de cada descarte.' },
  { test: (d, t) => d.clase === 'brujo' && (t.includes('invoca') || t.includes('invocación')), icono: '👁️', nombre: 'Invocación efímera',
    desc: 'Criatura del brujo que solo dura el turno en que la invocas. Absorbe el daño enemigo después de tu bloqueo y antes que tú; si sobrevive al turno del enemigo, golpea por su daño y se desvanece. Pega y aguanta más que la del druida justo porque no se queda.' },
  { test: (d, t) => d.alTopeDelMazo === true || t.includes('lo alto de tu mazo'), icono: '🔁', nombre: 'Vuelve a lo alto del mazo',
    desc: 'Al jugarse no va al descarte: vuelve a lo alto de tu pila de robo, así que la robarás en tu próximo turno. Aguanta incluso el Rayo Áureo del Contemplador.' },
  { test: (_d, t) => t.includes('agathys') || t.includes('daño que bloquees'), icono: '🩸', nombre: 'Armadura de Agathys',
    desc: 'Este turno, cada punto de daño que absorba tu bloqueo se devuelve a TODOS los enemigos. Cuanto más bloqueo acumules y más te peguen, más devuelves.' },
  { test: (_d, t) => t.includes('no pretende atacar') || t.includes('intención'), icono: '🎭', nombre: 'Intención',
    desc: 'Lo que el enemigo hará en su turno (el icono sobre su cabeza). Varios ataques del pícaro golpean más fuerte si el enemigo no pretende atacar (defenderse, potenciarse, quedarse desconcertado o perder el turno). Cambiazo le fuerza una intención sin ataque.' },
];

/** Lista de palabras clave presentes en una carta, sin repetir. */
export function palabrasClaveDe(def: CartaDef): Clave[] {
  const txt = norm(def.texto);
  const claves: Clave[] = [{ icono: '🃏', nombre: NOMBRE_TIPO[def.tipo], desc: DESC_TIPO[def.tipo] }];
  for (const id of ESTADOS_CLAVE) {
    if (txt.includes(norm(NOMBRE_ESTADO[id] ?? id))) {
      claves.push({ icono: ICONO_ESTADO[id], nombre: NOMBRE_ESTADO[id], desc: DESCRIPCION_ESTADO[id] });
    }
  }
  for (const k of CLAVES_EXTRA) {
    if (k.test(def, txt)) claves.push({ icono: k.icono, nombre: k.nombre, desc: k.desc });
  }
  // dedup por nombre conservando el orden
  const vistos = new Set<string>();
  return claves.filter((c) => (vistos.has(c.nombre) ? false : (vistos.add(c.nombre), true)));
}

/** Cuadro con la descripción de las palabras clave de la carta (vista grande). */
export function cuadroPalabrasClave(def: CartaDef): HTMLElement {
  const caja = el('div', 'claves-caja');
  caja.innerHTML = `<h4 class="claves-titulo">Palabras clave</h4>` +
    palabrasClaveDe(def)
      .map((c) => `<div class="clave"><span class="clave-nombre">${c.icono} ${c.nombre}</span>` +
        `<span class="clave-desc">${c.desc}</span></div>`)
      .join('');
  return caja;
}

const ICONO_CLASE: Record<string, string> = {
  druida: '🌿', barbaro: '🪓', mago: '🔮', picaro: '🗡️', brujo: '🕳️', neutral: '⚔️',
};

/** Descripción corta de cada efecto acumulable en el Conjuro Prodigioso. */
export const EFECTO_CONJURO: Record<string, string> = {
  area: 'Golpea a TODOS los enemigos',
  vulnerable: 'Aplica 2 de Vulnerable',
  bloqueo: 'Te da 6 de bloqueo al lanzarlo',
  perforante: 'Ignora y destruye el bloqueo',
};

/** Modificadores en vivo para los valores del texto (los aporta el combate). */
export interface ModsCarta {
  /** daño final de un ataque con base `b` (Fuerza, Débil, Vulnerable del objetivo…) */
  dano?: (base: number) => number;
  /** bloqueo final de una carta con base `b` (Destreza, Frágil…) */
  bloqueo?: (base: number) => number;
  /** coste real este turno (Sobrecarga del Contemplador lo encarece) */
  coste?: (base: number) => number;
}

/**
 * Reescribe los valores del texto con los modificadores actuales.
 * Patrones reconocidos: «Inflige N …» (daño) y «Gana N de bloqueo».
 * Verde si el valor mejora el base, rojo si empeora.
 */
function formatearTexto(texto: string, mods?: ModsCarta): string {
  let html = texto.replaceAll('\n', '<br>');
  if (mods?.dano) {
    html = html.replace(/([Ii]nflige )(\d+)/g, (_, pre: string, n: string) =>
      pre + valorMod(Number(n), mods.dano!(Number(n))),
    );
  }
  if (mods?.bloqueo) {
    html = html.replace(/([Gg]ana )(\d+)( de bloqueo)/g, (_, pre: string, n: string, post: string) =>
      pre + valorMod(Number(n), mods.bloqueo!(Number(n))) + post,
    );
  }
  return html;
}

function valorMod(base: number, real: number): string {
  if (real === base) return String(base);
  return `<span class="${real > base ? 'val-arriba' : 'val-abajo'}">${real}</span>`;
}

/**
 * Reduce la fuente del texto hasta que quepa en su recuadro.
 * Se autoprograma para cuando la carta ya esté en el DOM con tamaño real.
 */
function ajustarTexto(carta: HTMLElement) {
  requestAnimationFrame(() => {
    const texto = carta.querySelector('.carta-texto') as HTMLElement | null;
    if (!texto || !texto.clientHeight) return; // aún sin layout: nada que medir
    let tam = parseFloat(getComputedStyle(texto).fontSize);
    let intentos = 14;
    while (texto.scrollHeight > texto.clientHeight + 1 && tam > 6 && intentos-- > 0) {
      tam -= 0.5;
      texto.style.fontSize = `${tam}px`;
      texto.style.lineHeight = '1.12';
    }
  });
}

/** Crea el elemento DOM de una carta. */
export function renderCarta(def: CartaDef, mods?: ModsCarta): HTMLElement {
  const carta = el('div', `carta carta-${def.clase} rareza-${def.rareza} tipo-${def.tipo}`);
  const coste = mods?.coste ? mods.coste(def.coste) : def.coste;
  if (def.rareza === 'rara' || def.rareza === 'especial') carta.classList.add('carta-rara-brillo');

  // Textos largos (frecuentes en el mago): reduce la fuente para que quepan
  const caracteres = def.texto.replaceAll('\n', ' ').length;
  const lineas = def.texto.split('\n').length;
  if (caracteres > 120 || lineas > 4) carta.classList.add('texto-xl');
  else if (caracteres > 88 || lineas > 3) carta.classList.add('texto-largo');

  const conjuro = def.requiereConjuro
    ? `<div class="carta-conjuro" data-tip="<strong>◈ Carta de conjuro</strong><br>Gasta un espacio de conjuro de nivel ${def.requiereConjuro}+ al jugarse.">◈${
        def.requiereConjuro > 1 ? def.requiereConjuro : ''
      }</div>`
    : '';
  const unUso = def.unUso ? ' · <strong>1 uso</strong>' : '';
  const innata = def.innato ? ' · <strong>Innata</strong>' : '';
  const retencion = def.retener ? ' · <strong>Retener</strong>' : '';

  carta.innerHTML = `
    <div class="carta-coste${coste > def.coste ? ' coste-recargado' : ''}">${coste}</div>
    ${conjuro}
    <div class="carta-cabecera">
      <span class="carta-nombre">${def.nombre}</span>
    </div>
    <div class="carta-arte">${arteDeCarta(def)}</div>
    <div class="carta-tipo">${ICONO_CLASE[def.clase]} ${NOMBRE_TIPO[def.tipo]}${
      def.subclase ? ` · <em>${def.subclase}</em>` : ''
    }${unUso}${innata}${retencion}</div>
    <div class="carta-texto">${formatearTexto(def.texto, mods)}</div>
  `;
  ajustarTexto(carta);
  return carta;
}

/** Reescribe solo el texto de una carta ya renderizada (drag sobre un objetivo). */
export function actualizarTextoCarta(carta: HTMLElement, def: CartaDef, mods?: ModsCarta) {
  const texto = carta.querySelector('.carta-texto') as HTMLElement | null;
  if (texto) texto.innerHTML = formatearTexto(def.texto, mods);
}

/** Glifo grande de cada carta. Exportado para que el smoke-test compruebe que
 *  no falta ninguna y que no se repite ningún emoji dentro de un mismo mazo. */
export const ARTE_CARTA: Record<string, string> = {
  golpe: '🗡️', defender: '🛡️',
  // ── Druida ──
  zarpazo: '🐾', mordisco: '🦷', 'piel-corteza': '🌳', enredadera: '🌿',
  'zarpa-doble': '🐈‍⬛', aullido: '🌬️', 'forma-lobo': '🐺', 'forma-oso': '🐻',
  'forma-aguila': '🦅', 'raices-estranguladoras': '🪾', espinas: '🌵',
  'luna-creciente': '🌙', 'circulo-tierra': '⛰️', 'circulo-luna': '🌕',
  'circulo-mar': '🌊', 'circulo-estrellas': '✨', 'pacto-bosque': '🍃',
  'comunion-salvaje': '🕊️', 'oso-espiritual': '🧸', 'elemental-agua': '💧',
  'elemental-fuego': '🔥', 'elemental-aire': '🌪️', 'vinculo-feroz': '🫂',
  'guardian-roble': '🌲', 'elemental-tierra': '🪨', 'tormenta-venganza': '⛈️',
  // ── Bárbaro ──
  'furia-primaria': '🔥', 'golpe-imprudente': '💢', 'tajo-brutal': '⚔️',
  'postura-firme': '🪨', 'grito-intimidante': '📢', 'golpe-pomo': '🔨',
  'furia-creciente': '📈', 'furia-agil': '💨', 'golpe-demoledor': '🧱',
  'reflejos-acero': '⚙️', 'sangre-caliente': '🌡️', torbellino: '🌪️',
  'senda-berserker': '😡', 'senda-corazon-salvaje': '🫀',
  'senda-arbol-mundo': '🌳', 'senda-fanatico': '⚡', 'voto-sangre': '🩸',
  'corte-sangrante': '🔪', 'doble-tajo': '🪒', desgarro: '🪓',
  'hacha-carnicera': '🪚', 'furia-sanguinaria': '👺', 'sed-de-sangre': '🧛',
  'reabrir-heridas': '🩹', 'festin-carmesi': '🍷', 'furia-indomita': '🐗',
  // ── Mago ──
  'manos-ardientes': '🔥', 'proyectil-magico': '✨', 'rayo-escarcha': '❄️',
  'toque-electrizante': '⚡', 'armadura-mago': '🧥', 'truco-magia': '🎩',
  'escudo-arcano': '💠', 'bola-fuego': '☄️', 'rayo-abrasador': '🔆',
  'toque-vampirico': '🦇', 'estudio-arcano': '📖', 'recuperacion-arcana': '🌀',
  'canalizar-mana': '🕯️', 'meditacion-arcana': '🧘', 'sacrificio-arcano': '🩸',
  'marea-arcana': '🌊', acelerar: '💨', 'escuela-evocacion': '💥',
  'escuela-abjuracion': '🔵', 'escuela-ilusion': '🎭',
  'conjuro-prodigioso': '📜', 'inscripcion-arcana': '✒️', 'glifo-mordiente': '🔣',
  'dictado-veloz': '✍️', 'runa-flamigera': '🌋', 'runa-de-ruina': '☠️',
  'runa-egida': '🔱', 'tratado-prohibido': '📕', 'palabra-de-poder': '💬',
  'maestria-conjuros': '🎓',
  // ── Pícaro ──
  daga: '📌', 'filo-rapido': '⚡', pirueta: '🤸', 'daga-veloz': '🔪',
  'lanzamiento-daga': '🎯', finta: '🌀', 'golpe-bajo': '👊', rodar: '🛞',
  distraccion: '💫', 'punalada-trapera': '🩸', 'ataque-sutil': '🤫',
  'trabajo-de-pies': '👣', esfumarse: '💨', 'mano-rapida': '🤹',
  cuchilladas: '✂️', preparacion: '🎒', cambiazo: '🎭', emboscada: '🥷',
  'filo-toxico': '🧪', 'giro-veloz': '🌬️', atraco: '💰',
  'lluvia-de-dagas': '🌧️', 'guardia-de-cuchillas': '🔰',
  'golpe-septico': '🦠', 'toxina-paralizante': '💉',
  asesino: '☠️', psionico: '🔮', 'embaucador-arcano': '🎩',
  'maestria-cuchillas': '⚔️', 'tempestad-acero': '🌪️',
  'nube-nauseabunda': '☁️', oportunista: '🕵️', 'danza-mortal': '💃',
  // ── Brujo ──
  'explosion-sobrenatural': '💥', 'armadura-agathys': '🩸',
  'sacudida-abisal': '🌌', 'manto-sombras': '🧥', 'marca-condena': '⚖️',
  'susurro-maldito': '🗣️', 'sabueso-sombra': '🐕‍🦺', oscuridad: '🌑',
  'canalizar-pacto': '🔯', 'diezmo-sangre': '🧿', 'brazos-hadar': '🫱',
  'invocacion-sobrenatural': '👹', 'blindaje-infernal': '🧱',
  'cosecha-almas': '🌾', 'palabra-ruina': '📢', 'velo-tinieblas': '🕸️',
  'sacrificio-familiar': '🕯️', 'pacto-sangriento': '📜',
  'verbo-agonizante': '😖', 'repulsion-sobrenatural': '💫',
  'cadenas-carceri': '⛓️', marchitar: '🥀', archifata: '🧚',
  celestial: '😇', infernal: '😈', 'gran-antiguo': '👁️',
  'explosion-trifurcada': '🔱', 'haz-desdoblado': '🔀',
  'verbo-aniquilacion': '☠️', 'pacto-final': '🕳️',
  // ── Incoloras ──
  seducir: '💗', deseo: '🪄',
};

/** Arte procedimental sencillo: glifo grande por carta. */
function arteDeCarta(def: CartaDef): string {
  return ARTE_CARTA[def.id] ?? '✦';
}
