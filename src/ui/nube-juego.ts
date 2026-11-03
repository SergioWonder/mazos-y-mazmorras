// Glue between the game loop and the cloud client: background uploads, the login landing,
// reconciling the local run with the cloud copy and the «which run do you keep?» dialog.
// Everything here is best effort: a failure never reaches the player beyond a discreet notice.

import type { EstadoRun } from '../core/types.ts';
import { borrarGuardado, escribirGuardado, esCargable, guardarRun, leerGuardado, serializarRun, type Guardado } from '../core/guardado.ts';
import { finalVerdaderoDesbloqueado } from '../core/escena-final.ts';
import { nube } from '../core/nube.ts';
import { VERSION } from '../version.ts';
import { anuncio, el } from './util.ts';
import '../estilos/nube.css';

export const NOMBRE_CLASE: Record<string, string> = {
  druida: 'Druida', barbaro: 'Bárbaro', mago: 'Mago', picaro: 'Pícaro', brujo: 'Brujo', paladin: 'Paladín',
};

/** Saves locally, then uploads in the background when there is an account (never awaited by the loop). */
export function guardarYSubir(run: EstadoRun) {
  guardarRun(run);
  if (nube.haySesion()) void nube.subirPartida(serializarRun(run));
}

/** The run is over: wipe the local save and the cloud copy. */
export function borrarGuardadoFinal() {
  borrarGuardado();
  if (nube.haySesion()) void nube.borrarPartida();
}

/** Queues the finished run for the leaderboard and tries to send it (it stays queued if that fails). */
export function registrarFinDePartida(run: EstadoRun, victoria: boolean, dmDerrotado = false) {
  nube.registrarPartidaTerminada({
    heroClass: run.clase,
    result: victoria ? 'victory' : 'defeat',
    dmDefeated: victoria && dmDerrotado, // true ending: the DM fell to a natural 20 on Seduce
    chapter: run.capitulo,
    floor: run.piso,
    turns: run.estadisticas?.turnos ?? 0,
    seed: run.semilla,
    gameVersion: VERSION,
    stats: run.estadisticas,
  });
  void nube.vaciarCola();
}

/** After the true ending was seen: the profile slot keeps it forever. */
export function sincronizarFinalVerdadero() {
  if (nube.haySesion()) void nube.sincronizarPerfil();
}

let aterrizaje: Promise<void> = Promise.resolve();

/** `?login=<token>`: redeems it, cleans the address bar (other params and the hash stay) and welcomes the player. */
export function aterrizajeLogin(): Promise<void> {
  try {
    const url = new URL(location.href);
    const token = url.searchParams.get('login');
    if (!token) return aterrizaje;
    url.searchParams.delete('login');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    aterrizaje = nube.canjearEnlace(token).then((usuario) => {
      anuncio(usuario ? '☁️ Sesión iniciada: tu progreso viaja contigo' : 'El enlace ha caducado o ya se usó', 'anuncio-botin');
    });
  } catch { /* the cloud never blocks the game */ }
  return aterrizaje;
}

function resumen(g: Guardado) {
  return `${NOMBRE_CLASE[g.clase] ?? g.clase} · Capítulo ${g.capitulo + 1} · piso ${g.piso}`;
}

/** Small dialog with both runs. Resolves with the player's choice. */
function elegirPartida(local: Guardado, remota: { data: Guardado; updatedAt: number }): Promise<'nube' | 'local'> {
  return new Promise((resolver) => {
    const fecha = new Date(remota.updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    const capa = el('div', 'confirmar-fondo');
    capa.setAttribute('role', 'alertdialog');
    capa.setAttribute('aria-modal', 'true');
    const caja = el('div', 'confirmar nube-conflicto');
    caja.appendChild(el('h3', '', '☁️ Dos partidas distintas'));
    caja.appendChild(el('p', '', 'Tienes una partida guardada en la nube y otra en este dispositivo. ¿Con cuál sigues?'));
    const opciones = el('div', 'nube-conflicto-opciones');
    const tarjeta = (titulo: string, detalle: string, detalle2: string, boton: string, eleccion: 'nube' | 'local') => {
      const t = el('div', 'nube-conflicto-partida');
      t.appendChild(el('strong', '', titulo));
      t.appendChild(el('span', '', detalle));
      t.appendChild(el('small', '', detalle2));
      const b = el('button', 'btn-tomar', boton);
      b.addEventListener('click', () => { window.removeEventListener('keydown', bloquear, true); capa.remove(); resolver(eleccion); });
      t.appendChild(b);
      opciones.appendChild(t);
      return b;
    };
    const botonNube = tarjeta('☁️ En la nube', resumen(remota.data), `Guardada el ${fecha}`, 'Seguir con la de la nube', 'nube');
    tarjeta('📱 En este dispositivo', resumen(local), 'Se sobrescribirá la de la nube', 'Quedarme con la de este dispositivo', 'local');
    caja.appendChild(opciones);
    capa.appendChild(caja);
    // modal: no key reaches the title underneath (there is no «cancel»: the player must choose)
    const bloquear = (ev: KeyboardEvent) => { if (ev.target instanceof HTMLButtonElement && (ev.code === 'Enter' || ev.code === 'Space')) return; ev.stopImmediatePropagation(); };
    window.addEventListener('keydown', bloquear, true);
    document.body.appendChild(capa);
    botonNube.focus();
  });
}

/**
 * Brings the local run and the cloud copy together. Returns true when it changed the local save
 * (the title then reloads so «Continuar» shows up). `vigente` turns false once the player left the title.
 */
async function reconciliar(vigente: () => boolean): Promise<boolean> {
  const remota = await nube.partidaRemota();
  if (!vigente() || remota.estado === 'sin-sesion' || remota.estado === 'error') return false;
  const local = leerGuardado();
  if (remota.estado === 'vacia') {
    nube.aceptarRemota(remota.revision);
    if (local) await nube.subirPartida(local);
    return false;
  }
  const { data, revision, updatedAt } = remota.partida;
  const g = data as Guardado;
  if (!esCargable(g)) { // from another game version: this build cannot load it, so it is never offered
    if (local) await nube.imponerLocal(local, revision);
    return false;
  }
  if (!local) {
    escribirGuardado(g);
    nube.aceptarRemota(revision);
    return true;
  }
  // the cloud has what this device last synced (or the same content): this device is the newer one
  if (nube.revisionRun() === revision || JSON.stringify(local) === JSON.stringify(g)) {
    nube.aceptarRemota(revision);
    if (JSON.stringify(local) !== JSON.stringify(g)) await nube.subirPartida(local);
    return false;
  }
  const eleccion = await elegirPartida(local, { data: g, updatedAt });
  if (eleccion === 'nube') {
    escribirGuardado(g);
    nube.aceptarRemota(revision);
    return true;
  }
  await nube.imponerLocal(local, revision);
  return false;
}

/** Everything the title screen syncs when there is an account. Returns true if the local run changed. */
export async function sincronizarAlTitulo(vigente: () => boolean): Promise<boolean> {
  try {
    await aterrizaje;
    if (!nube.haySesion()) return false;
    const finalAntes = finalVerdaderoDesbloqueado();
    void nube.vaciarCola();
    const cambio = await reconciliar(vigente);
    await nube.sincronizarPerfil();
    return vigente() && (cambio || finalVerdaderoDesbloqueado() !== finalAntes);
  } catch {
    return false;
  }
}
