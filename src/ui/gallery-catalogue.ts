// What the sprite gallery shows, section by section. Pure data (no DOM) so the
// smoke test can check that every illustrated enemy is listed exactly once.

import type { ClaseId, EnemigoDef } from '../core/types.ts';
import { ACTOS, DUNGEON_MASTER, FILACTERIA_VOLGUTH, GOBLIN_FAMELICO, IMAGEN_ILUSORIA, OBSERVADOR, enemigosRelacionados } from '../core/enemigos.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from '../fx/enemy-rigs.ts';
import type { FormId } from '../fx/hero-rig.ts';

export interface GalleryCard {
  kind: 'hero' | 'form' | 'invocation' | 'enemy';
  id: string;
  name: string;
  elite?: boolean;
  boss?: boolean;
  /** Relative size, as the enemy's `escala` in combat. */
  scale: number;
}
export interface GallerySection {
  title: string;
  subtitle?: string;
  /** Act index (0-2) for enemy sections: picks the sky and the moon. */
  act?: number;
  cards: GalleryCard[];
}

const HEROES: [ClaseId, string][] = [
  ['druida', 'Druida'], ['barbaro', 'Bárbaro'], ['mago', 'Mago'], ['picaro', 'Pícaro'], ['brujo', 'Brujo'], ['paladin', 'Paladín'],
];
const FORMS: [FormId, string][] = [
  ['lobo', 'Forma de Lobo'], ['oso', 'Forma de Oso'], ['aguila', 'Forma de Águila'],
  ['enjambre', 'Forma de Enjambre'], ['lunar', 'Forma Lunar'], ['estelar', 'Forma Estelar'],
];
const INVOCATIONS: [string, string][] = [
  ['lobo', 'Lobo'], ['oso', 'Oso'], ['fuego', 'Espíritu de Fuego'], ['agua', 'Espíritu de Agua'],
  ['aire', 'Espíritu de Aire'], ['arbol', 'Espíritu del Bosque'], ['tierra', 'Espíritu de la Tierra'],
  ['sabueso', 'Sabueso del Vacío'], ['demonio', 'Demonio Pactado'],
];
/** Creatures a boss brings along, shown with that scenario's enemies. */
const BOSS_SUMMONS: Record<string, EnemigoDef[]> = {
  '0-0': [GOBLIN_FAMELICO], '0-1': [IMAGEN_ILUSORIA], '2-1': [OBSERVADOR],
};

export function galleryCatalogue(): GallerySection[] {
  const sections: GallerySection[] = [
    { title: 'Héroes', subtitle: 'Siluetas a contraluz', cards: HEROES.map(([id, name]) => ({ kind: 'hero', id, name, scale: 1 })) },
    { title: 'Transformaciones del druida', cards: FORMS.map(([id, name]) => ({ kind: 'form', id, name, scale: 1 })) },
    {
      title: 'Invocaciones', subtitle: 'Espíritus del druida y pactos del brujo',
      cards: INVOCATIONS.filter(([id]) => INVOCATION_RIGS[id]).map(([id, name]) => ({ kind: 'invocation', id, name, scale: 0.85 })),
    },
  ];
  ACTOS.forEach((escenarios, act) => escenarios.forEach((cap, esc) => {
    const seen = new Set<string>();
    const cards: GalleryCard[] = [];
    const add = (d: EnemigoDef, elite: boolean) => {
      if (seen.has(d.id) || !ENEMY_RIGS[d.id]) return;
      seen.add(d.id);
      // bosses are huge in combat; the gallery shows them a notch smaller
      cards.push({ kind: 'enemy', id: d.id, name: d.nombre, elite, boss: !!d.esJefe, scale: d.esJefe ? Math.min(1.6, d.escala ?? 1) : d.escala ?? 1 });
    };
    cap.normales.flat().forEach((d) => add(d, false));
    (BOSS_SUMMONS[`${act}-${esc}`] ?? []).forEach((d) => add(d, false));
    // an elite brings its variants, what it frees on death and what wakes with it
    cap.elites.flat().forEach((d) => enemigosRelacionados(d).forEach((x) => add(x, true)));
    // the boss, and whatever it unleashes on death (Malachar → Abaddon)
    // the boss, and whatever takes its place on death (Malachar → Abaddon, Vol'guth → his phylactery)
    cap.jefe.forEach((d) => { add(d, false); if (d.invocaAlMorir) add(d.invocaAlMorir, false); if (d.filacteria) add(d.filacteria, false); });
    sections.push({ title: cap.nombre, subtitle: cap.subtitulo, act, cards });
  }));
  // the final joke: the Dungeon Master waits behind his screen after Act III
  sections.push({
    title: DUNGEON_MASTER.nombre, subtitle: 'Escena final',
    cards: [{ kind: 'enemy', id: DUNGEON_MASTER.id, name: DUNGEON_MASTER.nombre, scale: 1.6 }],
  });
  return sections;
}
