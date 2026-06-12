import type { CartaDef } from '../core/types.ts';
import { el } from './util.ts';

const NOMBRE_TIPO: Record<string, string> = {
  ataque: 'Ataque', habilidad: 'Habilidad', poder: 'Poder',
};

const ICONO_CLASE: Record<string, string> = {
  druida: '🌿', barbaro: '🪓', mago: '🔮', neutral: '⚔️',
};

/** Crea el elemento DOM de una carta. */
export function renderCarta(def: CartaDef): HTMLElement {
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

  carta.innerHTML = `
    <div class="carta-coste">${def.coste}</div>
    ${conjuro}
    <div class="carta-cabecera">
      <span class="carta-nombre">${def.nombre}</span>
    </div>
    <div class="carta-arte">${arteDeCarta(def)}</div>
    <div class="carta-tipo">${ICONO_CLASE[def.clase]} ${NOMBRE_TIPO[def.tipo]}${
      def.subclase ? ` · <em>${def.subclase}</em>` : ''
    }${unUso}</div>
    <div class="carta-texto">${def.texto.replaceAll('\n', '<br>')}</div>
  `;
  return carta;
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
    acelerar: '💨', 'escuela-evocacion': '☄️', 'escuela-abjuracion': '🔵',
    'escuela-ilusion': '🎭',
  };
  return ARTE[def.id] ?? '✦';
}
