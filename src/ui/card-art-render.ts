// Paints card illustrations once and caches them as image URLs. A 2D canvas lays
// down the painted background (class colours, a frame per card type, paper
// texture and a halo), the WebGL puppet renderer draws the scene on top, and a
// few sparkles finish it. Returns null without WebGL2 (cards keep their emoji).

import type { CartaDef } from '../core/types.ts';
import { cardScene, SCENE_W, SCENE_H, FULL_H, hasFullArt, type CardScene } from '../fx/card-art.ts';
import { PuppetStage } from './puppet-stage.ts';

const cache = new Map<string, string | null>();
let stage: PuppetStage | null | undefined;

/** Deterministic noise per card so every image is stable between sessions. */
function seeded(id: string): () => number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number, sc: CardScene, rnd: () => number) {
  const { look } = sc;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, look.top);
  bg.addColorStop(1, look.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = sc.full ? h * 0.46 : h / 2, r = Math.max(w, h);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = look.glow;
  ctx.fillStyle = look.glow;
  if (sc.frame === 'ataque') {
    // diagonal strike streaks
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = (0.02 + rnd() * 0.04) * w;
      const y = h * (0.1 + i * 0.28) + rnd() * 10;
      ctx.beginPath(); ctx.moveTo(-10, y + h * 0.3); ctx.lineTo(w + 10, y - h * 0.3); ctx.stroke();
    }
  } else if (sc.frame === 'habilidad') {
    // soft concentric wards
    ctx.lineWidth = w * 0.012;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, r * 0.11 * i, 0, Math.PI * 2); ctx.stroke(); }
  } else {
    // powers radiate
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, da = 0.07;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - da) * r, cy + Math.sin(a - da) * r);
      ctx.lineTo(cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r);
      ctx.fill();
    }
  }
  ctx.restore();
  // paper grain: short ink hatches
  ctx.save();
  ctx.strokeStyle = 'rgba(10,6,4,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rnd() * w, y = rnd() * h, len = 3 + rnd() * 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.6); ctx.stroke();
  }
  ctx.restore();
  // halo behind the scene
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * (sc.full ? 0.7 : 0.6));
  halo.addColorStop(0, `${look.glow}66`);
  halo.addColorStop(1, `${look.glow}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
}

function paintFinish(ctx: CanvasRenderingContext2D, w: number, h: number, sc: CardScene, rnd: () => number) {
  // a few static glints
  ctx.save();
  ctx.fillStyle = '#fff8e0';
  ctx.shadowColor = sc.look.glow;
  ctx.shadowBlur = 6;
  for (let i = 0; i < (sc.full ? 22 : 7); i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Image URL of a card's illustration (full-art portrait when asked and the
 *  card has one), or null when it cannot be drawn here. Cached per card. */
export function cardArtUrl(def: CartaDef, full = false): string | null {
  const wantFull = full && hasFullArt(def);
  const key = `${def.id}${wantFull ? ':full' : ''}`;
  if (cache.has(key)) return cache.get(key)!;
  if (stage === undefined) stage = PuppetStage.offscreen();
  let url: string | null = null;
  if (stage) {
    try {
      const sc = cardScene(def, wantFull);
      const w = wantFull ? 296 : 280, h = wantFull ? Math.round((296 * FULL_H) / SCENE_W) : Math.round((280 * SCENE_H) / SCENE_W);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d')!;
      const rnd = seeded(def.id);
      paintBackground(ctx, w, h, sc, rnd);
      ctx.drawImage(stage.renderStill(sc.rig, 'illustrated', sc.look.rim, w, h), 0, 0);
      paintFinish(ctx, w, h, sc, rnd);
      url = out.toDataURL('image/png');
    } catch (e) {
      console.warn('card art unavailable', def.id, e);
    }
  }
  cache.set(key, url);
  return url;
}
