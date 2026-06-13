// Utilidades de DOM, números flotantes y sacudidas de pantalla.

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
  espejismo: '🪞', invulnerable: '🌟', raizProlongada: '🌳', quemadura: '🔥',
};

export const NOMBRE_ESTADO: Record<string, string> = {
  fuerza: 'Fuerza', raices: 'Raíces', destreza: 'Destreza',
  vulnerable: 'Vulnerable', debil: 'Débil', fragil: 'Frágil', espinas: 'Espinas',
  regeneracion: 'Regeneración', corazonSalvaje: 'Corazón Salvaje', frenesi: 'Frenesí',
  espejismo: 'Espejismo', invulnerable: 'Invulnerable', raizProlongada: 'Raíces Profundas',
  quemadura: 'Quemadura',
};

export const DESCRIPCION_ESTADO: Record<string, string> = {
  fuerza: '+1 de daño por ataque por cada punto (negativo: lo reduce).',
  raices: 'Reduce la Fuerza esa cantidad SOLO durante el próximo turno del enemigo.',
  destreza: '+1 de bloqueo por carta por cada punto.',
  vulnerable: 'Recibe un 50 % más de daño. Baja 1 por turno.',
  debil: 'Inflige un 25 % menos de daño. Baja 1 por turno.',
  fragil: 'Gana un 25 % menos de bloqueo. Baja 1 por turno.',
  espinas: 'Devuelve esa cantidad de daño a quien le ataca cuerpo a cuerpo.',
  regeneracion: 'Cura esa cantidad de PV al inicio de cada turno.',
  corazonSalvaje: 'Cuando pierdas tu Furia, ganas esa cantidad de Fuerza y Destreza para el resto del combate.',
  frenesi: 'Tu Furia se romperá al final de este turno aunque recibas daño.',
  espejismo:
    'Copias ilusorias: 20 % de esquivar cada ataque por carga. Esquivar gasta 1 carga; recibir un golpe las disipa todas. Dura 1 turno.',
  invulnerable: 'No recibe ningún daño mientras dure.',
  raizProlongada: 'Las Raíces que apliques reducen la Fuerza del enemigo esa cantidad de turnos adicionales.',
  quemadura: 'Cada carta que juegues te hace perder 3 PV. Baja 1 por turno.',
};

/** Contenido de tooltip para una ficha de estado. */
export function tipEstado(estado: string, valor: number): string {
  return `<strong>${ICONO_ESTADO[estado]} ${NOMBRE_ESTADO[estado]} ${valor}</strong><br>${
    DESCRIPCION_ESTADO[estado] ?? ''
  }`;
}
