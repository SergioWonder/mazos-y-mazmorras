// Dev tool (browser only, not bundled): captures frame sequences of a gallery
// sprite playing an action, for both renderers, and posts them as PNGs to
// scripts/frame-sink.mjs. With the gallery open, in the page console / JS tool:
//
//   const cap = await import('/mazos-y-mazmorras/scripts/sprite-capture.ts');
//   await cap.captureAction({ sprite: 'hero:barbaro', action: 'attack', dir: 'barbaro' });
//
// It writes <dir>/<action>-NN.png (one per sampled frame) and a contact sheet
// <dir>/<action>-sheet.png. Works with ?render=svg too (the SVG is rasterised).
// The sprite is stepped at a fixed 60 fps (deterministic, and it also works
// while the browser pane is hidden and requestAnimationFrame is paused).

import { ACTION_DURATION, type ActionType } from '../src/fx/puppet.ts';
import { gallerySprites } from '../src/ui/gallery.ts';
import { spriteClock } from '../src/ui/puppet-sprite.ts';
import { stages } from '../src/ui/puppet-stage.ts';

export interface CaptureOptions {
  /** Gallery key: 'hero:barbaro', 'form:lobo', 'enemy:goblin-cortador'… */
  sprite: string;
  action: ActionType;
  /** Folder under the sink's output directory. */
  dir: string;
  /** Frames kept, evenly spaced over the action (default 12). */
  frames?: number;
  /** Extra time recorded after the action, to see the settle (s, default 0.25). */
  tail?: number;
  /** Output size of each frame in px (default 220). */
  size?: number;
  sink?: string;
}

const FPS = 60;

async function post(sink: string, rel: string, dataUrl: string) {
  await fetch(`${sink}/frame?path=${encodeURIComponent(rel)}`, { method: 'POST', body: dataUrl });
}

function rasterSvg(markup: string, w: number, h: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(w, h);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
}

/** Records the sprite playing `action` and posts the frames; resolves with the number of files written. */
export async function captureAction(o: CaptureOptions): Promise<number> {
  const sprite = gallerySprites.get(o.sprite);
  if (!sprite) throw new Error(`no gallery sprite ${o.sprite}; open the gallery first (keys: ${[...gallerySprites.keys()].slice(0, 12).join(', ')}…)`);
  const sink = o.sink ?? 'http://localhost:5199';
  const size = o.size ?? 220, keep = o.frames ?? 12;
  // stop the gallery's own loop so nothing else plays on this sprite
  (document.querySelector('.gallery-modes [data-mode="idle"]') as HTMLElement | null)?.click();
  const el = sprite.element as HTMLElement;
  el.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 50));
  const glCanvas = document.querySelector('.gallery-backdrop canvas.puppet-canvas') as HTMLCanvasElement | null;
  const isSvg = el instanceof SVGSVGElement;
  const total = ACTION_DURATION[o.action] + (o.tail ?? 0.25);
  const shots: { t: number; img: CanvasImageSource | string }[] = [];
  sprite.visible = true;
  const start = spriteClock();
  sprite.play(o.action);
  for (let i = 0; ; i++) {
    const t = i / FPS;
    sprite.tick(start + t);
    if (!isSvg) for (const st of stages) st.draw();
    const r = el.getBoundingClientRect();
    const pad = r.width * 0.35;
    if (isSvg) {
      const clone = el.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(r.width)); clone.setAttribute('height', String(r.height));
      clone.setAttribute('style', `filter:${el.style.filter};opacity:${el.style.opacity || 1}`);
      shots.push({ t, img: new XMLSerializer().serializeToString(clone) });
    } else if (glCanvas) {
      const cr = glCanvas.getBoundingClientRect(), k = glCanvas.width / cr.width;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const g = c.getContext('2d')!;
      const side = r.width + pad * 2;
      g.drawImage(glCanvas, (r.left - cr.left - pad) * k, (r.top - cr.top - pad * 1.2) * k, side * k, side * k, 0, 0, size, size);
      shots.push({ t, img: c });
    }
    if (t > total) break;
  }
  // evenly spaced frames over the recording
  const picked = Array.from({ length: keep }, (_, i) => shots[Math.round((i / (keep - 1)) * (shots.length - 1))]);
  const sheet = document.createElement('canvas');
  sheet.width = size * keep; sheet.height = size + 18;
  const sg = sheet.getContext('2d')!;
  sg.fillStyle = '#2b2838'; sg.fillRect(0, 0, sheet.width, sheet.height);
  let n = 0;
  for (const [i, s] of picked.entries()) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2b2838'; g.fillRect(0, 0, size, size);
    if (typeof s.img === 'string') {
      const img = await rasterSvg(s.img, size / 1.7, size / 1.7);
      g.drawImage(img, size * 0.2, size * 0.2, size / 1.7, size / 1.7);
    } else g.drawImage(s.img, 0, 0);
    g.fillStyle = '#d8d0ff'; g.font = '12px sans-serif';
    g.fillText(`${o.action} ${(s.t / ACTION_DURATION[o.action]).toFixed(2)}`, 6, size - 6);
    sg.drawImage(c, i * size, 0);
    await post(sink, `${o.dir}/${o.action}-${String(i).padStart(2, '0')}.png`, c.toDataURL('image/png'));
    n++;
  }
  sg.fillStyle = '#d8d0ff'; sg.font = '13px sans-serif';
  sg.fillText(`${o.sprite} · ${o.action} · ${isSvg ? 'SVG' : 'WebGL'} · ${shots.length} frames recorded`, 6, size + 14);
  await post(sink, `${o.dir}/${o.action}-sheet.png`, sheet.toDataURL('image/png'));
  return n + 1;
}
