// Utilidades de DOM, números flotantes y sacudidas de pantalla.

import { ajustes } from '../core/ajustes.ts';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  clase?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function espera(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function centroDe(elem: Element | null): { x: number; y: number } {
  if (!elem) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = elem.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Número flotante de daño/cura/bloqueo sobre un elemento. */
export function numeroFlotante(
  sobre: Element | null,
  texto: string,
  tipo: 'dano' | 'cura' | 'bloqueo' | 'estado' = 'dano',
) {
  const { x, y } = centroDe(sobre);
  const n = el('div', `num-flotante nf-${tipo}`, texto);
  n.style.left = `${x + (Math.random() - 0.5) * 40}px`;
  n.style.top = `${y - 20}px`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1100);
}

/** Sacudida de pantalla (intensidad 1 = leve, 3 = brutal). */
export function sacudir(intensidad = 1) {
  if (!ajustes().sacudidas) return; // switched off in the settings menu
  const app = document.getElementById('app')!;
  app.classList.remove('sacudida-1', 'sacudida-2', 'sacudida-3');
  void app.offsetWidth; // reinicia la animación
  app.classList.add(`sacudida-${Math.min(3, Math.max(1, Math.round(intensidad)))}`);
}

/** Mensaje grande centrado (anuncios de efectos). */
export function anuncio(texto: string, clase = '') {
  const a = el('div', `anuncio ${clase}`, texto);
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 1400);
}

/**
 * Tooltips propios: cualquier elemento con `data-tip` muestra un tooltip al
 * instante. Usa delegación en document, así sobrevive a los re-renders
 * (el `title` nativo tardaba y se cancelaba al refrescar la UI).
 */
export function iniciarTooltips() {
  const tip = el('div', 'tooltip-global');
  document.body.appendChild(tip);
  let visible = false;

  const posicionar = (ev: PointerEvent) => {
    const margen = 14;
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + margen;
    let y = ev.clientY + margen;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - margen;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - margen;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  };

  document.addEventListener('pointerover', (ev) => {
    const objetivo = (ev.target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
    if (objetivo?.dataset.tip) {
      tip.innerHTML = objetivo.dataset.tip;
      tip.classList.add('tooltip-visible');
      visible = true;
      posicionar(ev as PointerEvent);
    } else if (visible) {
      tip.classList.remove('tooltip-visible');
      visible = false;
    }
  });
  document.addEventListener('pointermove', (ev) => {
    if (visible) posicionar(ev);
  });
}

export const ICONO_ESTADO: Record<string, string> = {
  fuerza: '💪', raices: '🪾', destreza: '🌀', vulnerable: '🎯', debil: '💧',
  fragil: '🥚', espinas: '🌵', regeneracion: '🌿', corazonSalvaje: '🐾', frenesi: '🔥',
  espejismo: '🪞', invulnerable: '🌟', raizProlongada: '🌳', formaProlongada: '🦎', formaPotenciada: '🐾', formaBloqueo: '🛡️', invocacionFuerza: '🐺',
  fuerzaPorTurno: '🌕', destrezaPorTurno: '🌘',
  quemadura: '🔥',
  furiaIndomita: '🛡️', maestria: '✨', proyectilCarga: '💫', roboAcelerado: '💨',
  hemorragia: '🩸', sedSangre: '🧛', escribania: '📜',
  veneno: '🧪', cartasAgotan: '🔥', cartasSobrecoste: '⚡', cartasEtereas: '👻',
  acrobacias: '🤸', filoVenenoso: '🗡️', preparacion: '🎒',
  dagasPorTurno: '🔪', dagasFuerza: '⚔️', dagasDestreza: '💃', dagasBloqueo: '🔰',
  ventajaFurtiva: '🎭',
  condena: '🕳️', oscuridad: '🌑', agathys: '🩸', explosionFuerza: '💥',
  explosionTurno: '✨', explosionVeces: '🔀', explosionArea: '🌌', explosionGratis: '🆓',
  condenaPorAtaque: '👁️', oscuridadPorTurno: '🌘', bloqueoPorTurno: '😇',
  bendicionOscura: '😈', condenaPorBloqueo: '⚖️',
  explosionCondena: '😖', explosionCrece: '🔱', explosionCarga: '📈', explosionBloqueo: '🤝',
  explosionMaldita: '🩸', bloqueoPorMaldicion: '🛡️',
  fervor: '🔆', castigo: '🌟', golpesMas: '⚒️', defensasMas: '🪽', bastion: '🏰', fervorPorTurno: '🕯️',
  armaSagrada: '😇', gloria: '🏆', antiguos: '🌳', venganza: '🎯', angelVengador: '👼',
  coraza: '🐚', robaMenos: '🧠',
};

export const NOMBRE_ESTADO: Record<string, string> = {
  fuerza: 'Fuerza', raices: 'Raíces', destreza: 'Destreza',
  vulnerable: 'Vulnerable', debil: 'Débil', fragil: 'Frágil', espinas: 'Espinas',
  regeneracion: 'Regeneración', corazonSalvaje: 'Corazón Salvaje', frenesi: 'Frenesí',
  espejismo: 'Espejismo', invulnerable: 'Invulnerable', raizProlongada: 'Raíces Profundas',
  formaProlongada: 'Corazón del Cambiante', formaPotenciada: 'Furor del Cambiante',
  formaBloqueo: 'Corazón del Cambiante (bloqueo)', invocacionFuerza: 'Alma de la Manada',
  fuerzaPorTurno: 'Forma Lunar (Fuerza)', destrezaPorTurno: 'Forma Lunar (Destreza)',
  quemadura: 'Quemadura', furiaIndomita: 'Furia Indómita', maestria: 'Maestría de Conjuros',
  proyectilCarga: 'Proyectiles Cargados',
  roboAcelerado: 'Acelerar', hemorragia: 'Hemorragia', sedSangre: 'Sed de Sangre',
  escribania: 'Escribanía',
  veneno: 'Veneno', cartasAgotan: 'Cartas que se Agotan', cartasSobrecoste: 'Sobrecarga',
  cartasEtereas: 'Cartas Etéreas',
  acrobacias: 'Acrobacias',
  filoVenenoso: 'Filo Venenoso', preparacion: 'Preparación',
  dagasPorTurno: 'Alma de Cuchillas', dagasFuerza: 'Maestría con Cuchillas', dagasDestreza: 'Danza Mortal',
  dagasBloqueo: 'Guardia de Cuchillas',
  ventajaFurtiva: 'Oportunista',
  condena: 'Condena', oscuridad: 'Oscuridad', agathys: 'Armadura de Agathys',
  explosionFuerza: 'Verbo Agonizante', explosionTurno: 'Pacto Canalizado',
  explosionVeces: 'Haz Desdoblado', explosionArea: 'Explosión Trifurcada',
  explosionGratis: 'Don del Patrón',
  condenaPorAtaque: 'Mente del Gran Antiguo', oscuridadPorTurno: 'Presencia Feérica',
  bloqueoPorTurno: 'Bendición Celestial', bendicionOscura: 'Pacto Infernal',
  condenaPorBloqueo: 'Pacto Final',
  explosionCondena: 'Verbo Agonizante (Condena)', explosionCrece: 'Lanza Sobrenatural',
  explosionCarga: 'Explosión Cargada', explosionBloqueo: 'Don del Patrón',
  explosionMaldita: 'Hambre del Patrón', bloqueoPorMaldicion: 'Égida de la Aflicción',
  fervor: 'Fervor', castigo: 'Castigo preparado', golpesMas: 'Arma Consagrada', defensasMas: 'Égida Divina',
  bastion: 'Bastión de Fe', fervorPorTurno: 'Celo Inquebrantable', armaSagrada: 'Juramento de Devoción',
  gloria: 'Juramento de Gloria', antiguos: 'Juramento de los Antiguos', venganza: 'Juramento de Venganza',
  angelVengador: 'Ángel Vengador',
  coraza: 'Coraza', robaMenos: 'Mente Fracturada',
};

export const DESCRIPCION_ESTADO: Record<string, string> = {
  fuerza: '+1 de daño por ataque por cada punto (negativo: lo reduce).',
  raices: 'Reduce el ataque del enemigo esa cantidad. Si su ataque queda en 0 o menos, al intentar atacar pierde PV igual a la diferencia (lo que las raíces superan a su ataque), ignorando el bloqueo.',
  destreza: '+1 de bloqueo por carta por cada punto.',
  vulnerable: 'Recibe un 50 % más de daño. Baja 1 por turno.',
  debil: 'Inflige un 25 % menos de daño. Baja 1 por turno.',
  fragil: 'Gana un 25 % menos de bloqueo. Baja 1 por turno.',
  espinas: 'Devuelve esa cantidad de daño a quien le ataca cuerpo a cuerpo.',
  regeneracion: 'Cura esa cantidad de PV al inicio de cada turno.',
  corazonSalvaje: 'Cuando pierdas tu Furia, ganas esa cantidad de Fuerza y Destreza para el resto del combate.',
  frenesi: 'Tu Furia se romperá al final de este turno aunque recibas daño.',
  espejismo:
    'Copias ilusorias: cada carga previene por completo el próximo golpe de un ataque. Duran hasta gastarse.',
  invulnerable: 'No recibe ningún daño mientras dure.',
  raizProlongada: 'Las Raíces que apliques reducen la Fuerza del enemigo esa cantidad de turnos adicionales.',
  formaProlongada: 'Tus Transformaciones duran esa cantidad de turnos adicionales.',
  formaPotenciada: 'Tus Transformaciones otorgan esa cantidad adicional de Fuerza (o de Destreza, según la forma).',
  formaBloqueo: 'Cada vez que te transformas ganas esa cantidad de bloqueo.',
  invocacionFuerza: 'Cada ataque de tu invocación inflige esa cantidad de daño adicional.',
  fuerzaPorTurno: 'Ganas esa cantidad de Fuerza al inicio de cada turno, y se acumula.',
  destrezaPorTurno: 'Ganas esa cantidad de Destreza al inicio de cada turno, y se acumula.',
  quemadura: 'Cada carta que juegues te hace perder 3 PV. Baja 1 por turno.',
  furiaIndomita:
    'Mientras estés en Furia, al inicio de tu turno ganas bloqueo igual a tu Fuerza. La Furia no se rompe si bloqueaste daño y te queda menos de 10 de bloqueo.',
  maestria: 'Al inicio de cada turno añades un Proyectil Mágico a tu mano. Tus Proyectiles Mágicos lanzan 1 proyectil más.',
  proyectilCarga: 'Cada proyectil de tus Proyectiles Mágicos inflige esa cantidad de daño adicional. Sube 1 cada vez que lanzas uno.',
  roboAcelerado: 'Robas 1 carta adicional al inicio de tus turnos. Desaparece si te quedas sin cartas en la mano.',
  hemorragia:
    'Al inicio de su turno pierde esa cantidad de PV, ignorando el bloqueo. No decae con el tiempo, pero se cierra (deja de repetirse) si pasas un turno sin infligirle daño no bloqueado.',
  sedSangre: 'Cada vez que un enemigo pierde PV por Hemorragia, ganas esa cantidad de bloqueo.',
  escribania: 'Al inicio de cada turno escribes esa cantidad en el Conjuro Prodigioso.',
  veneno: 'Al inicio de su turno pierde esa cantidad de PV, ignorando el bloqueo. Baja 1 cada turno.',
  cartasAgotan: 'Este turno, cada carta que juegues se agota (sale del mazo el resto del combate).',
  cartasSobrecoste: 'Este turno, cada carta cuesta 1 de energía más.',
  cartasEtereas: 'Al final de este turno, las cartas que no hayas jugado se agotan en vez de descartarse.',
  acrobacias: 'Bloqueo aplazado: al inicio de tu próximo turno recuperas esa cantidad de bloqueo (el que aplicaron tus cartas de Acrobacias).',
  filoVenenoso: 'Cada uno de tus ataques aplica esa cantidad de Veneno al objetivo.',
  preparacion: 'Cada vez que descartas una carta, ganas esa cantidad de bloqueo.',
  dagasPorTurno: 'Al inicio de cada turno añades esa cantidad de Dagas a tu mano.',
  dagasFuerza: 'Tus Dagas infligen esa cantidad de daño adicional.',
  dagasDestreza: 'Tus Dagas infligen daño adicional igual a tu Destreza.',
  dagasBloqueo: 'Cada vez que juegas una Daga, ganas esa cantidad de bloqueo.',
  ventajaFurtiva: 'Tus ataques infligen esa cantidad de daño adicional por golpe a los enemigos que no pretenden atacar.',
  condena:
    'Al final de su turno, si su Condena iguala o supera sus PV actuales, muere. No decae con el tiempo: solo hay que acumularla más rápido de lo que se cura.',
  oscuridad: 'Reduce su ataque esa cantidad (se suma a las Raíces). Baja 1 por turno.',
  agathys: 'Este turno, cada punto de daño que absorba tu bloqueo se devuelve a TODOS los enemigos.',
  explosionFuerza: 'Tu Explosión Sobrenatural inflige esa cantidad de daño adicional durante todo el combate.',
  explosionTurno: 'Solo este turno, tu Explosión Sobrenatural inflige esa cantidad de daño adicional.',
  explosionVeces: 'Tu Explosión Sobrenatural golpea esa cantidad de veces más.',
  explosionArea: 'Tu Explosión Sobrenatural golpea a todos los enemigos.',
  explosionGratis: 'Tu Explosión Sobrenatural cuesta 0 de energía.',
  condenaPorAtaque: 'Cada uno de tus ataques aplica esa cantidad de Condena al objetivo.',
  oscuridadPorTurno: 'Al inicio de cada turno aplicas esa cantidad de Oscuridad a todos los enemigos.',
  bloqueoPorTurno: 'Ganas esa cantidad de bloqueo al inicio de cada turno.',
  bendicionOscura: 'Cada vez que un enemigo muere, ganas esa cantidad de bloqueo.',
  condenaPorBloqueo: 'Al final de cada turno aplicas Condena igual a tu bloqueo restante a todos los enemigos.',
  explosionCondena: 'Tu Explosión Sobrenatural aplica esa cantidad de Condena a cada enemigo que golpea.',
  explosionCrece: 'Cada vez que lanzas tu Explosión Sobrenatural, su daño crece esa cantidad para el resto del combate.',
  explosionCarga: 'Daño que tu Explosión Sobrenatural ha ganado ya en este combate al lanzarse.',
  explosionBloqueo: 'Cada vez que lanzas tu Explosión Sobrenatural, ganas esa cantidad de bloqueo.',
  explosionMaldita: 'Tu Explosión Sobrenatural inflige esa cantidad de daño adicional por cada maldición en tu mazo, tu mano y tu descarte.',
  bloqueoPorMaldicion: 'Al final de tu turno ganas esa cantidad de bloqueo por cada maldición en tu mano.',
  fervor: 'Ganas 1 cada vez que juegas un Golpe o una Defensa. Los Castigos lo consumen entero para potenciarse.',
  castigo: 'Castigo preparado: se descarga en el primer golpe de tu próxima carta de ataque sobre cada enemigo que alcance. Solo puede haber uno a la vez.',
  golpesMas: 'Tus Golpes (y Golpes Sagrados) infligen esa cantidad de daño más.',
  defensasMas: 'Tus Defensas (Defender y Defensa Sagrada) dan esa cantidad de bloqueo más.',
  bastion: 'Al inicio de tu turno conservas hasta esa cantidad de tu bloqueo.',
  fervorPorTurno: 'Ganas esa cantidad de Fervor al inicio de cada turno.',
  armaSagrada: 'Tus ataques infligen daño adicional igual a tu Fervor, sin consumirlo.',
  gloria: 'Cada Castigo que descargas te da 1 de Fuerza (con 2, también 1 de Fervor).',
  antiguos: 'Al final de tu turno ganas esa cantidad de bloqueo por cada punto de Fervor.',
  venganza: 'Tus Castigos cuestan 0.',
  angelVengador: 'Al inicio de cada turno preparas un Castigo de esa cantidad de daño; si ya tienes uno, le suma esa cantidad.',
  coraza: 'Cada golpe de ataque que recibe se reduce en esa cantidad: los golpes pequeños y repetidos apenas le hacen mella.',
  robaMenos: 'Al inicio de tu próximo turno robas esa cantidad de cartas menos. Después desaparece.',
};

/** Contenido de tooltip para una ficha de estado. */
export function tipEstado(estado: string, valor: number): string {
  return `<strong>${ICONO_ESTADO[estado]} ${NOMBRE_ESTADO[estado]} ${valor}</strong><br>${
    DESCRIPCION_ESTADO[estado] ?? ''
  }`;
}
