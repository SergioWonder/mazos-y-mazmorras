// Painted combat backgrounds (src/arte/fondos/), one per scenario: each act has two
// alternative scenarios. `wide` is 1920×1080 for landscape screens, `tall` 1080×1440
// for phones in portrait. The light source sits behind the hero (top left).

export interface SceneBackground {
  id: string;
  wide: string; // file name in src/arte/fondos/
  tall: string;
}

const SCENES = [
  ['asentamiento-ogro', 'guarida-contrabandistas'],
  ['cripta', 'templo-oscuro'],
  ['guarida-dragon', 'laberinto-contemplador'],
];

export function sceneBackground(capitulo: number, escenario: number): SceneBackground {
  const id = SCENES[capitulo]?.[escenario] ?? SCENES[0][0];
  return { id, wide: `${id}.webp`, tall: `${id}-movil.webp` };
}
