// Combat backdrop per act, drawn by a WebGL shader behind the sprites (see
// ui/puppet-stage.ts): sky, moon with a pulsing halo, horizon glow, the act's
// silhouettes (palisade, crypt columns, dragon-lair stalactites), distant fires,
// ground, paper grain and vignette. Pure data here.

export type BackdropShape = 'stakes' | 'columns' | 'stalactites';

export interface BackdropTheme {
  skyTop: string; skyBottom: string; horizon: string;
  moon: string; moonLight: string; moonShadow: string; halo: string;
  silhouette: string; ground: string; fire: string;
  shape: BackdropShape;
}

const THEMES: BackdropTheme[] = [
  // Act I: the settlement burns under a warm moon
  {
    skyTop: '#0a0e09', skyBottom: '#1a130a', horizon: '#ff8c3b', moon: '#f1e2bd', moonLight: '#fff8e6', moonShadow: '#c9b184',
    halo: '#ffd6a0', silhouette: '#0c100a', ground: '#1c160c', fire: '#ff8c3b', shape: 'stakes',
  },
  // Act II: the crypt, cold light and columns
  {
    skyTop: '#07080d', skyBottom: '#0c1413', horizon: '#7896ff', moon: '#dfe7fb', moonLight: '#ffffff', moonShadow: '#9aa8c8',
    halo: '#afc3ff', silhouette: '#080a10', ground: '#0e101a', fire: '#9bb4ff', shape: 'columns',
  },
  // Act III: the dragon's lair, blood moon and lava
  {
    skyTop: '#0e0705', skyBottom: '#200d05', horizon: '#ff5a1e', moon: '#f29a72', moonLight: '#ffd2b0', moonShadow: '#a9412a',
    halo: '#ff6e3c', silhouette: '#0e0705', ground: '#220e08', fire: '#ff6e1e', shape: 'stalactites',
  },
];

export const backgroundTheme = (capitulo: number): BackdropTheme => THEMES[capitulo] ?? THEMES[0];
