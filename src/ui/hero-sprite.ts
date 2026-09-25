// Backlit silhouette sprite for a hero or druid form (style C). Thin wrapper
// over the shared puppet renderer.

import { rigOf, type RigId } from '../fx/hero-rig.ts';
import { PuppetSprite } from './puppet-sprite.ts';

export class HeroSprite extends PuppetSprite {
  constructor(id: RigId) {
    super(rigOf(id), { style: 'silhouette' });
  }
}
