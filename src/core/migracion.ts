// Moving the game to a new domain: localStorage is per origin, so the old site packs the
// player's data into the URL fragment (never sent to any server) and the new one imports it.
// Pure functions over a minimal storage interface, no DOM, so the smoke test can drive them.

export interface AlmacenTraspaso {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

/** Every localStorage key the game uses. */
export const CLAVES_MIGRABLES = [
  'mazo-y-mazmorra/guardado',
  'mazmorra-ajustes',
  'mazmorra-musica-apagada',
  'mym-final-verdadero',
  'mazmorra-comentarios',
  'mazmorra-avisos-mayores',
  'mazmorra-version-vista',
  'mazo-y-mazmorra/aviso-instalar',
  'mym-nube-sesion',
  'mym-nube-revision-run',
  'mym-nube-revision-perfil',
  'mym-nube-cola',
  'mym-ultima-clase',
];

/** Set on the new domain after the first import: later visits through the old link change nothing. */
export const MARCA_IMPORTADO = 'mym-mudanza-importada';
const PARAMETRO = 'migrar';

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): string {
  const binario = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

/** URL of the new domain carrying the game's local data in the fragment. */
export function urlTraspaso(destino: string, almacen: AlmacenTraspaso): string {
  const datos: Record<string, string> = {};
  for (const clave of CLAVES_MIGRABLES) {
    const valor = almacen.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  }
  const url = new URL(destino);
  url.hash = `${PARAMETRO}=${aBase64Url(JSON.stringify({ v: 1, datos }))}`;
  return url.toString();
}

export type ResultadoTraspaso = 'importado' | 'ya-importado' | 'nada' | 'invalido';

/** Imports the data a `#migrar=` fragment carries, once, without overwriting what is already here. */
export function importarTraspaso(hash: string, almacen: AlmacenTraspaso): ResultadoTraspaso {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const paquete = params.get(PARAMETRO);
  if (paquete === null) return 'nada';
  let datos: Record<string, unknown>;
  try {
    const parsed = JSON.parse(deBase64Url(paquete)) as { v?: unknown; datos?: unknown };
    if (parsed.v !== 1 || typeof parsed.datos !== 'object' || parsed.datos === null) return 'invalido';
    datos = parsed.datos as Record<string, unknown>;
  } catch {
    return 'invalido';
  }
  if (almacen.getItem(MARCA_IMPORTADO) !== null) return 'ya-importado';
  for (const clave of CLAVES_MIGRABLES) {
    const valor = datos[clave];
    if (typeof valor === 'string' && almacen.getItem(clave) === null) almacen.setItem(clave, valor);
  }
  almacen.setItem(MARCA_IMPORTADO, new Date().toISOString());
  return 'importado';
}
