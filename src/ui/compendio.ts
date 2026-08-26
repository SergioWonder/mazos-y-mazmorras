import type { CartaDef } from '../core/types.ts';
import { BASICAS, DRUIDA, BARBARO, MAGO, PICARO, BRUJO, NEUTRALES_ESPECIALES, defDe } from '../core/cartas.ts';
import { renderCarta, cuadroPalabrasClave } from './carta.ts';
import { el } from './util.ts';

/** Vista en grande de una carta con su cuadro de palabras clave. */
function ampliarEnGrande(def: CartaDef, mejorada: boolean) {
  const zoom = el('div', 'zoom-carta');
  const fila = el('div', 'zoom-fila');
  const grande = renderCarta(def);
  if (mejorada) grande.classList.add('carta-mejorada');
  fila.appendChild(grande);
  fila.appendChild(cuadroPalabrasClave(def));
  zoom.appendChild(fila);
  zoom.appendChild(el('p', 'zoom-ayuda', 'Toca para cerrar'));
  zoom.addEventListener('pointerdown', () => zoom.remove());
  document.body.appendChild(zoom);
}

const CLAVE_COMENTARIOS = 'mazmorra-comentarios';

type Comentarios = Record<string, string>;

function cargar(): Comentarios {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_COMENTARIOS) ?? '{}') as Comentarios;
  } catch {
    return {};
  }
}
function guardar(c: Comentarios) {
  try {
    localStorage.setItem(CLAVE_COMENTARIOS, JSON.stringify(c));
  } catch { /* sin almacenamiento */ }
}

const GRUPOS: { titulo: string; cartas: CartaDef[] }[] = [
  { titulo: '⚔️ Básicas', cartas: BASICAS },
  { titulo: '🌿 Druida', cartas: DRUIDA },
  { titulo: '🪓 Bárbaro', cartas: BARBARO },
  { titulo: '🔮 Mago', cartas: MAGO },
  { titulo: '🗡️ Pícaro', cartas: PICARO },
  { titulo: '🕳️ Brujo', cartas: BRUJO },
  { titulo: '✨ Únicas (incoloras)', cartas: NEUTRALES_ESPECIALES },
];

/** Compendio: todas las cartas por clase, con comentarios exportables a JSON. */
export function pantallaCompendio(): Promise<void> {
  return new Promise((resolver) => {
    const comentarios = cargar();
    let mejoradas = false;

    const fondo = el('div', 'compendio-fondo');
    fondo.innerHTML = `
      <div class="compendio">
        <header class="compendio-cab">
          <h2 class="compendio-titulo">📖 Compendio de cartas</h2>
          <label class="compendio-toggle"><input type="checkbox" class="chk-mejoradas"> Ver mejoradas</label>
          <button class="btn-tomar btn-exportar">Exportar comentarios</button>
          <button class="btn-tomar btn-borrar">Borrar comentarios</button>
          <button class="btn-cerrar-comp" aria-label="Cerrar">✕</button>
        </header>
        <div class="compendio-cuerpo"></div>
      </div>`;
    document.body.appendChild(fondo);
    const cuerpo = fondo.querySelector('.compendio-cuerpo') as HTMLElement;

    function pintar() {
      cuerpo.innerHTML = '';
      for (const g of GRUPOS) {
        const sec = el('div', 'compendio-seccion');
        sec.innerHTML = `<h3 class="compendio-grupo">${g.titulo}</h3>`;
        const grid = el('div', 'compendio-grid');
        for (const def of g.cartas) {
          const visible = mejoradas ? defDe({ uid: 0, def, mejorada: true }) : def;
          const celda = el('div', 'compendio-celda');
          const carta = renderCarta(visible);
          if (mejoradas && def.mejora) carta.classList.add('carta-mejorada');
          carta.style.cursor = 'zoom-in';
          carta.title = 'Ver en grande';
          carta.addEventListener('click', () => ampliarEnGrande(visible, mejoradas && !!def.mejora));
          celda.appendChild(carta);

          const ta = document.createElement('textarea');
          ta.className = 'compendio-comentario';
          ta.placeholder = 'Comentario…';
          ta.rows = 2;
          ta.value = comentarios[def.id] ?? '';
          if (ta.value) celda.classList.add('marcada');
          ta.addEventListener('input', () => {
            const v = ta.value.trim();
            if (v) comentarios[def.id] = v;
            else delete comentarios[def.id];
            guardar(comentarios);
            celda.classList.toggle('marcada', v.length > 0);
          });
          celda.appendChild(ta);
          grid.appendChild(celda);
        }
        sec.appendChild(grid);
        cuerpo.appendChild(sec);
      }
    }
    pintar();

    (fondo.querySelector('.chk-mejoradas') as HTMLInputElement).addEventListener('change', (e) => {
      mejoradas = (e.target as HTMLInputElement).checked;
      pintar();
    });
    fondo.querySelector('.btn-exportar')!.addEventListener('click', () => mostrarExportacion(comentarios));
    fondo.querySelector('.btn-borrar')!.addEventListener('click', () => {
      if (Object.keys(comentarios).length === 0) return;
      for (const k of Object.keys(comentarios)) delete comentarios[k];
      guardar(comentarios);
      pintar();
    });

    const cerrar = () => {
      fondo.remove();
      window.removeEventListener('keydown', alPulsar);
      resolver();
    };
    const alPulsar = (e: KeyboardEvent) => {
      // Esc cierra solo si no se está escribiendo un comentario
      if (e.code === 'Escape' && !(document.activeElement instanceof HTMLTextAreaElement)) cerrar();
    };
    fondo.querySelector('.btn-cerrar-comp')!.addEventListener('click', cerrar);
    window.addEventListener('keydown', alPulsar);
  });
}

/** Ventana con el JSON [{id, comentario}] listo para copiar. */
function mostrarExportacion(comentarios: Comentarios) {
  const arr = Object.entries(comentarios)
    .map(([id, comentario]) => ({ id, comentario }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const json = JSON.stringify(arr, null, 2);

  const modal = el('div', 'exportar-fondo');
  modal.innerHTML = `
    <div class="exportar">
      <h3>Comentarios (${arr.length}) — JSON</h3>
      <textarea class="exportar-json" readonly rows="14"></textarea>
      <div class="exportar-acciones">
        <button class="btn-tomar btn-copiar">Copiar</button>
        <button class="btn-tomar btn-cerrar-exportar">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const ta = modal.querySelector('.exportar-json') as HTMLTextAreaElement;
  ta.value = json;
  const copiar = modal.querySelector('.btn-copiar') as HTMLButtonElement;
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(json);
      copiar.textContent = '¡Copiado!';
    } catch {
      ta.select(); // fallback: queda seleccionado para Ctrl+C
      copiar.textContent = 'Selecciona y copia';
    }
    setTimeout(() => (copiar.textContent = 'Copiar'), 1500);
  });
  const cerrar = () => modal.remove();
  modal.querySelector('.btn-cerrar-exportar')!.addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrar();
  });
}
