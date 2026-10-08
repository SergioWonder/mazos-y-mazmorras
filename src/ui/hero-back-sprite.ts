// A hero seen from behind, backlit, for the chapter openings: idle with
// breathing, swaying cloth and the particles of its magic. Always SVG.

import type { ClaseId } from '../core/types.ts';
import { HERO_BACK_RIGS } from '../fx/hero-back.ts';
import { PuppetSprite } from './puppet-sprite.ts';

export class HeroBackSprite extends PuppetSprite {
  constructor(clase: ClaseId) {
    super(HERO_BACK_RIGS[clase], { style: 'backlit', stage: null });
  }
}
