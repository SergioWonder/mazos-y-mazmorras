// Dev tool: renders the heroes seen from behind (fx/heroes/espalda) over a layered
// chapter scenario, as the game paints them ('backlit' style), to a PNG with
// Chrome headless. Static frames sampled from the idle animation (physics on).
//
//   node --experimental-strip-types scripts/escenas/preview_espalda.ts <out.png> [clase|all] [scene-id]
//
// For each hero it draws the scene with the puppet in place and a large close-up
// on a dark background (to judge the lines). Particles are not drawn.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { EMISSIVE, LIT_EDGES, type Matrix, type PuppetRig, type Shape } from '../../src/fx/puppet.ts';
import { PuppetAnimator } from '../../src/fx/animator.ts';
import { lighten } from '../../src/fx/puppet-gpu.ts';
import { HERO_BACK_RIGS } from '../../src/fx/hero-back.ts';
import { CHAPTER_LAYERS, heroBox } from '../../src/ui/chapter-layers.ts';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , outArg = 'espalda.png', which = 'all', scene = 'capitulo-guarida-contrabandistas'] = process.argv;
const ids = which === 'all' ? Object.keys(HERO_BACK_RIGS) : which.split(',');

function capsule(s: Extract<Shape, { t: 'l' }>): string {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, r = s.w / 2;
  const nx = (-dy / len) * r, ny = (dx / len) * r;
  return `M${s.x1 + nx} ${s.y1 + ny}L${s.x2 + nx} ${s.y2 + ny}A${r} ${r} 0 0 0 ${s.x2 - nx} ${s.y2 - ny}L${s.x1 - nx} ${s.y1 - ny}A${r} ${r} 0 0 0 ${s.x1 + nx} ${s.y1 + ny}Z`;
}

function shapeSvg(s: Shape, attrs: string): string {
  if (s.t === 'c') return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" ${attrs}/>`;
  if (s.t === 'e') return `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" ${attrs}/>`;
  if (s.t === 'p') return `<polygon points="${s.pts.map((q) => q.join(',')).join(' ')}" ${attrs}/>`;
  return `<path d="${capsule(s)}" ${attrs}/>`;
}

/** The figure as the game's SVG 'backlit' view paints it, at one frame. */
function figure(rig: PuppetRig, bones: Record<string, Matrix>, uid: string, view = '0 0 140 135'): string {
  const edge = lighten(rig.accent, 0.5);
  const body = rig.shapes.map((s) => {
    const m = bones[s.b];
    const tr = `transform="matrix(${m.join(',')})"`;
    if (LIT_EDGES.has(s.k)) return shapeSvg(s, `${tr} fill="${edge}" opacity="${s.k === 'edge' ? 0.9 : 0.45}"`);
    if (EMISSIVE.has(s.k)) {
      const c = rig.palette[s.k] ?? '#ff00ff';
      return shapeSvg(s, `${tr} fill="${c}" stroke="${c}" stroke-width="1.2" filter="url(#g${uid})"`);
    }
    return shapeSvg(s, `${tr} fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"`);
  }).join('');
  return `<svg viewBox="${view}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="g${uid}" x="-80%" y="-80%" width="260%" height="260%">`
    + `<feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `${body}</svg>`;
}

function rimFilter(rig: PuppetRig, px: number): string {
  const rim = lighten(rig.accent, 0.25);
  return `drop-shadow(${px}px 0 0 ${rim}) drop-shadow(-${px}px 0 0 ${rim}) drop-shadow(0 -${px}px 0 ${rim}) drop-shadow(0 0 ${px * 6}px ${rig.accent}88)`;
}

const layer = CHAPTER_LAYERS[scene];
const img = resolve(`src/arte/escenas/capas/${scene}.webp`);
const box = heroBox(layer);
const SCENE_W = 900, SCENE_H = SCENE_W / 1.5, CLOSE = 420;
let html = `<html><body style="margin:0;background:#1b1512;display:flex;flex-wrap:wrap;gap:10px;padding:10px;width:${SCENE_W + CLOSE + 30}px">`;
let n = 0;
for (const id of ids) {
  const rig = (HERO_BACK_RIGS as Record<string, PuppetRig>)[id];
  const anim = new PuppetAnimator(rig);
  let frame = anim.frame(0, null);
  for (let i = 1; i <= 90; i++) frame = anim.frame(i / 30, null); // let the cloth settle (3 s)
  const heroW = (box.width / 100) * SCENE_W;
  html += `<div style="position:relative;width:${SCENE_W}px;height:${SCENE_H}px;overflow:hidden">`
    + `<img src="file://${img}" style="width:100%;height:100%;display:block">`
    + `<span style="position:absolute;left:${layer.foot[0] * 100 - box.width * 0.18}%;top:${layer.foot[1] * 100 - box.width * 0.36 * 1.5 * 0.09}%;width:${box.width * 0.36}%;aspect-ratio:5/1;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,0.55),rgba(0,0,0,0))"></span>`
    + `<div style="position:absolute;left:${box.left}%;top:${box.top}%;width:${box.width}%;height:${box.height}%;filter:${rimFilter(rig, Math.max(0.8, heroW / 260))}">${figure(rig, frame.bones, `s${n}`)}</div></div>`;
  html += `<div style="position:relative;width:${CLOSE}px;height:${SCENE_H}px;background:#2a2230;display:flex;align-items:flex-end;justify-content:center">`
    + `<div style="width:${CLOSE}px;height:${SCENE_H - 20}px;filter:${rimFilter(rig, 1.6)}">${figure(rig, frame.bones, `c${n}`, '14 26 88 106')}</div>`
    + `<span style="position:absolute;top:8px;left:10px;color:#eee;font:16px sans-serif">${id}</span></div>`;
  n++;
}
html += '</body></html>';
const dir = mkdtempSync(join(tmpdir(), 'espalda-'));
const page = join(dir, 'p.html');
writeFileSync(page, html);
const height = ids.length * (SCENE_H + 10) + 20;
const out = resolve(outArg);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${SCENE_W + CLOSE + 30},${height}`,
  `--screenshot=${out}`, '--allow-file-access-from-files', `file://${page}`], { stdio: 'ignore' });
readFileSync(out);
console.log(out);
