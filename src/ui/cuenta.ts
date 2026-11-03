// Account section of the settings menu: magic-link login, display name and logout.
// Everything degrades quietly: offline or with the API down the player just reads a plain message.

import { nube, type ResultadoEnlace } from '../core/nube.ts';
import { el } from './util.ts';
import '../estilos/nube.css';

const ERRORES_ENLACE: Record<Exclude<ResultadoEnlace, 'enviado'>, string> = {
  'email-invalido': 'Ese correo no parece válido. Revísalo e inténtalo de nuevo.',
  demasiados: 'Has pedido demasiados enlaces seguidos. Espera unos minutos y vuelve a probar.',
  'correo-no-disponible': 'Ahora mismo no podemos enviar correos. Inténtalo más tarde.',
  'sin-conexion': 'Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo.',
  error: 'Algo ha fallado. Inténtalo de nuevo en un rato.',
};

/** Builds the «Cuenta» section. `destruir` drops its listeners when the settings panel closes. */
export function seccionCuenta(): { seccion: HTMLElement; destruir: () => void } {
  const seccion = el('section', 'menu-ajustes-seccion cuenta');
  let enviando = false;
  let enviadoA: string | null = null;
  let error = '';
  let email = '';
  let nota = ''; // feedback of the name form
  let borrador: string | null = null; // name the player typed and the server rejected
  let cerrado = false;

  const pintar = () => {
    if (cerrado) return;
    seccion.replaceChildren(el('h3', '', '☁️ Cuenta'));
    const usuario = nube.usuario();
    if (usuario) pintarSesion(usuario);
    else pintarEntrada();
  };

  function pintarEntrada() {
    seccion.appendChild(el('p', 'cuenta-texto', 'Guarda tu progreso en la nube y entra en la clasificación'));
    if (enviadoA) {
      const ok = el('div', 'cuenta-aviso cuenta-ok');
      ok.appendChild(el('strong', '', 'Revisa tu correo'));
      const donde = el('span');
      donde.textContent = `Te hemos enviado el enlace a ${enviadoA}.`;
      ok.appendChild(donde);
      ok.appendChild(el('small', '', 'El enlace caduca en 15 minutos.'));
      seccion.appendChild(ok);
      const otro = el('button', 'btn-tomar cuenta-secundario', 'Usar otro correo') as HTMLButtonElement;
      otro.type = 'button';
      otro.addEventListener('click', () => { enviadoA = null; pintar(); });
      seccion.appendChild(otro);
      return;
    }
    const form = el('form', 'cuenta-form');
    const input = el('input', 'cuenta-input') as HTMLInputElement;
    input.type = 'email';
    input.required = true;
    input.autocomplete = 'email';
    input.placeholder = 'tu@correo.es';
    input.setAttribute('aria-label', 'Correo electrónico');
    input.value = email;
    input.disabled = enviando;
    input.addEventListener('input', () => { email = input.value; });
    const boton = el('button', 'btn-tomar', enviando ? 'Enviando…' : 'Enviarme el enlace') as HTMLButtonElement;
    boton.type = 'submit';
    boton.disabled = enviando;
    form.append(input, boton);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      email = input.value.trim();
      if (!email || enviando) return;
      enviando = true; error = ''; pintar();
      const res = await nube.pedirEnlace(email);
      enviando = false;
      if (res === 'enviado') enviadoA = email;
      else error = ERRORES_ENLACE[res];
      pintar();
    });
    seccion.appendChild(form);
    if (error) seccion.appendChild(el('p', 'cuenta-aviso cuenta-error', error));
  }

  function pintarSesion(usuario: { email: string; displayName: string | null }) {
    const fila = el('p', 'cuenta-texto');
    fila.append('Sesión iniciada como ');
    fila.appendChild(el('strong', 'cuenta-correo')).textContent = usuario.email;
    seccion.appendChild(fila);

    const form = el('form', 'cuenta-form');
    const input = el('input', 'cuenta-input') as HTMLInputElement;
    input.type = 'text';
    input.minLength = 2;
    input.maxLength = 24;
    input.placeholder = 'Nombre en la clasificación';
    input.setAttribute('aria-label', 'Nombre en la clasificación');
    // after a rejected name the player keeps what they typed, with the form still open
    input.value = borrador ?? usuario.displayName ?? '';
    const boton = el('button', 'btn-tomar', 'Guardar nombre') as HTMLButtonElement;
    boton.type = 'submit';
    form.append(input, boton);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nombre = input.value.trim();
      if (nombre.length < 2 || nombre.length > 24) {
        nota = 'El nombre debe tener entre 2 y 24 caracteres.';
        borrador = nombre;
        return pintar();
      }
      boton.disabled = true;
      const res = await nube.cambiarNombre(nombre);
      nota = res === 'ok' ? 'Nombre guardado.'
        : res === 'invalido' ? 'El nombre debe tener entre 2 y 24 caracteres.'
        : res === 'ocupado' ? 'Ese nombre ya lo usa otro aventurero. Elige otro.'
        : res === 'sin-sesion' ? 'Tu sesión ha caducado: vuelve a entrar.'
        : 'Sin conexión: no se pudo guardar el nombre.';
      borrador = res === 'ok' ? null : nombre;
      pintar();
      if (res === 'ocupado') seccion.querySelector<HTMLInputElement>('.cuenta-input')?.focus();
    });
    seccion.appendChild(form);
    seccion.appendChild(el('small', 'cuenta-ayuda', 'Sin nombre apareces como «Aventurero anónimo» en la clasificación. Para jugar en multijugador necesitas uno.'));
    if (nota) seccion.appendChild(el('p', nota === 'Nombre guardado.' ? 'cuenta-aviso' : 'cuenta-aviso cuenta-error', nota));
    nota = '';

    const salir = el('button', 'btn-tomar cuenta-secundario', 'Cerrar sesión') as HTMLButtonElement;
    salir.type = 'button';
    salir.addEventListener('click', async () => { salir.disabled = true; await nube.cerrarSesion(); });
    seccion.appendChild(salir);
  }

  pintar();
  const dejarDeOir = nube.alCambiar(pintar);
  // refresh the name quietly in case it changed on another device
  if (nube.haySesion()) void nube.yo().then(() => pintar());
  return { seccion, destruir: () => { cerrado = true; dejarDeOir(); } };
}
