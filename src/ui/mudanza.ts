// Runs before anything else touches localStorage (first import in main.ts).
//  - Old site (github.io build with VITE_MIGRAR_A): hand the local data to the new domain and leave.
//  - New domain: import the data a `#migrar=` link carries, then clean the fragment from the address bar.
import { importarTraspaso, urlTraspaso } from '../core/migracion.ts';

function almacen(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

const destino = import.meta.env.VITE_MIGRAR_A as string | undefined;
const local = almacen();

if (destino && new URL(destino).origin !== location.origin) {
  location.replace(local ? urlTraspaso(destino, local) : destino);
} else if (local && location.hash.includes('migrar=')) {
  importarTraspaso(location.hash, local);
  history.replaceState(null, '', location.pathname + location.search);
}
