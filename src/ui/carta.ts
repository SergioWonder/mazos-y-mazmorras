import type { CartaDef } from '../core/types.ts';
import { el } from './util.ts';

const NOMBRE_TIPO: Record<string, string> = {
  ataque: 'Ataque', habilidad: 'Habilidad', poder: 'Poder',
};

const ICONO_CLASE: Record<string, string> = {
  druida: '🌿', barbaro: '🪓', mago: '🔮', neutral: '⚔️',
};

/** Modificadores en vivo para los valores del texto (los aporta el combate). */
export interface ModsCarta {
  /** daño final de un ataque con base `b` (Fuerza, Débil, Vulnerable del objetivo…) */
  dano?: (base: number) => number;
  /** bloqueo final de una carta con base `b` (Destreza, Frágil…) */
  bloqueo?: (base: number) => number;
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
  if (def.rareza === 'rara') carta.classList.add('carta-rara-brillo');

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

  carta.innerHTML = `
    <div class="carta-coste">${def.coste}</div>
    ${conjuro}
    <div class="carta-cabecera">
      <span class="carta-nombre">${def.nombre}</span>
    </div>
    <div class="carta-arte">${arteDeCarta(def)}</div>
    <div class="carta-tipo">${ICONO_CLASE[def.clase]} ${NOMBRE_TIPO[def.tipo]}${
      def.subclase ? ` · <em>${def.subclase}</em>` : ''
    }${unUso}${innata}</div>
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

/** Arte procedimental sencillo: glifo grande por carta. */
function arteDeCarta(def: CartaDef): string {
  const ARTE: Record<string, string> = {
    golpe: '🗡️', defender: '🛡️', zarpazo: '🐾', mordisco: '🦷',
    'piel-corteza': '🌳', enredadera: '🌿', 'zarpa-doble': '🐾', aullido: '🌬️',
    'forma-lobo': '🐺', 'forma-oso': '🐻', 'forma-aguila': '🦅',
    'raices-estranguladoras': '🪾', espinas: '🌵', 'luna-creciente': '🌙',
    'circulo-tierra': '⛰️', 'circulo-luna': '🌕', 'circulo-mar': '🌊', 'circulo-estrellas': '✨',
    'furia-primaria': '🔥', 'golpe-imprudente': '💢', 'tajo-brutal': '⚔️',
    'postura-firme': '🛡️', 'grito-intimidante': '📢', 'golpe-pomo': '🔨',
    'furia-creciente': '🔥', 'furia-agil': '💨', 'golpe-demoledor': '🔨',
    'reflejos-acero': '⚙️', 'sangre-caliente': '🩸', torbellino: '🌪️',
    'senda-berserker': '😡', 'senda-corazon-salvaje': '🫀',
    'senda-arbol-mundo': '🌲', 'senda-fanatico': '⚡',
    'pacto-bosque': '🍃', 'voto-sangre': '🩸',
    'manos-ardientes': '🔥', 'proyectil-magico': '✨', 'rayo-escarcha': '❄️',
    'toque-electrizante': '⚡', 'armadura-mago': '🧥', 'truco-magia': '🎩',
    'escudo-arcano': '🛡️', 'bola-fuego': '☄️', 'rayo-abrasador': '🔆',
    'toque-vampirico': '🦇', 'estudio-arcano': '📖', 'recuperacion-arcana': '🌀',
    'canalizar-mana': '🕯️', 'meditacion-arcana': '🧘', 'sacrificio-arcano': '🗡️',
    'marea-arcana': '🌊',
    acelerar: '💨', 'escuela-evocacion': '☄️', 'escuela-abjuracion': '🔵',
    'escuela-ilusion': '🎭',
  };
  return ARTE[def.id] ?? '✦';
}
