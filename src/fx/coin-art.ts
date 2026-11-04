// Relief art of the coin, drawn once on a 2D canvas: heads (cara) on the left half of
// a 2048×1024 atlas, tails (cruz) on the right. Each texel stores the height of the
// relief in 16 bits (R = high byte, G = low byte, so bilinear filtering and mipmaps
// stay linear) and in B how "struck" it is (1 on the raised design, 0 on the field),
// which the shader uses for polish against satin. Heads: a crowned, bearded king in
// profile. Tails: a cross pattée with a d20 at its heart and a castle, a crown, two
// crossed swords and a skull in the quarters. Both carry a legend, beads and a rim.

export const COIN_ATLAS_W = 2048;
export const COIN_ATLAS_H = 1024;
const S = 1024;
const C = S / 2;

const FONT = 'Georgia, "Times New Roman", serif';

type Ctx = CanvasRenderingContext2D;

/** Grey level for a relief height (0 = field, 1 = top of the rim). */
const level = (h: number) => {
  const g = Math.round(Math.max(0, Math.min(1, h)) * 255);
  return `rgb(${g},${g},${g})`;
};

function arcText(c: Ctx, text: string, radius: number, size: number, top: boolean, h: number): void {
  c.save();
  c.font = `700 ${size}px ${FONT}`;
  c.fillStyle = level(h);
  const spacing = size * 0.16;
  const widths = [...text].map((ch) => c.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  // top legend: baseline on the inner radius, read clockwise; bottom: baseline outside, letters towards the centre
  let ang = top ? -Math.PI / 2 - total / radius / 2 : Math.PI / 2 + total / radius / 2;
  [...text].forEach((ch, i) => {
    const w = widths[i] - spacing;
    const mid = ang + (top ? 1 : -1) * (w / 2) / radius;
    c.save();
    c.translate(C + radius * Math.cos(mid), C + radius * Math.sin(mid));
    c.rotate(top ? mid + Math.PI / 2 : mid - Math.PI / 2);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText(ch, 0, 0);
    c.restore();
    ang += (top ? 1 : -1) * widths[i] / radius;
  });
  c.restore();
}

/** Raised rim, a thin inner line and a ring of beads: the frame of both sides. */
function frame(c: Ctx): void {
  c.fillStyle = level(1);
  c.beginPath();
  c.arc(C, C, C, 0, Math.PI * 2);
  c.arc(C, C, 452, 0, Math.PI * 2, true);
  c.fill();
  c.fillStyle = level(0.7);
  for (let i = 0; i < 84; i++) {
    const a = (i / 84) * Math.PI * 2;
    c.beginPath();
    c.arc(C + 430 * Math.cos(a), C + 430 * Math.sin(a), 7.5, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = level(0.55);
  c.lineWidth = 4;
  c.beginPath();
  c.arc(C, C, 318, 0, Math.PI * 2);
  c.stroke();
}

/** Small four-pointed star used as a legend separator. */
function star(c: Ctx, x: number, y: number, r: number, h: number): void {
  c.fillStyle = level(h);
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.32 : r;
    c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  c.closePath();
  c.fill();
}

// ── Heads: a crowned, bearded king in profile, facing left ───────────────────
function drawHeads(c: Ctx): void {
  frame(c);
  arcText(c, 'DRACS & ROGUES', 352, 58, true, 0.78);
  arcText(c, 'CARA', 410, 54, false, 0.78);
  star(c, C - 150, C + 368, 16, 0.78);
  star(c, C + 150, C + 368, 16, 0.78);

  c.save();
  c.translate(C + 6, C + 18);
  // bust: forehead, nose, beard, neck truncation, nape and back of the head
  const bust = new Path2D();
  bust.moveTo(-108, -158);
  bust.bezierCurveTo(-122, -128, -132, -96, -136, -66); // forehead
  bust.bezierCurveTo(-146, -58, -150, -50, -142, -40); // brow
  bust.bezierCurveTo(-152, -16, -170, 2, -184, 14); // nose ridge
  bust.bezierCurveTo(-178, 24, -164, 26, -152, 24); // nose tip and underside
  bust.bezierCurveTo(-156, 32, -158, 40, -156, 48); // upper lip
  bust.bezierCurveTo(-176, 70, -184, 104, -176, 136); // beard front
  bust.bezierCurveTo(-170, 160, -152, 184, -128, 200); // beard point
  bust.bezierCurveTo(-104, 196, -80, 178, -62, 164); // under the beard
  bust.bezierCurveTo(-58, 190, -54, 214, -50, 236); // throat
  bust.bezierCurveTo(-6, 246, 64, 246, 118, 234); // truncation
  bust.bezierCurveTo(110, 200, 104, 168, 108, 140); // back of the neck
  bust.bezierCurveTo(150, 120, 176, 70, 178, 10); // hair at the nape
  bust.bezierCurveTo(178, -60, 160, -120, 128, -158); // back of the head
  bust.closePath();
  c.fillStyle = level(0.58);
  c.fill(bust);

  // crown: band and five points with pearls
  const crown = new Path2D();
  crown.moveTo(-116, -150);
  crown.lineTo(136, -150);
  crown.lineTo(142, -196);
  const tips = [-120, -58, 6, 70, 132];
  for (let i = tips.length - 1; i >= 0; i--) {
    const x = tips[i];
    crown.lineTo(x + 22, -204);
    crown.lineTo(x, i === 2 ? -292 : -268);
    crown.lineTo(x - 22, -204);
  }
  crown.lineTo(-122, -196);
  crown.closePath();
  c.fillStyle = level(0.74);
  c.fill(crown);
  c.fillStyle = level(0.9);
  tips.forEach((x, i) => { c.beginPath(); c.arc(x, i === 2 ? -300 : -276, 13, 0, Math.PI * 2); c.fill(); });
  // jewels on the band
  c.fillStyle = level(0.92);
  [-80, 6, 92].forEach((x) => { c.beginPath(); c.ellipse(x, -173, 15, 12, 0, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = level(0.55);
  [-38, 50].forEach((x) => { c.beginPath(); c.arc(x, -173, 6, 0, Math.PI * 2); c.fill(); });

  // engraved details: lower than the bust around them
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = level(0.36);
  // eye and brow
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(-128, -40); c.quadraticCurveTo(-112, -50, -96, -40); c.quadraticCurveTo(-112, -32, -128, -40); c.stroke();
  c.lineWidth = 7;
  c.beginPath(); c.moveTo(-136, -64); c.quadraticCurveTo(-112, -74, -84, -60); c.stroke();
  // nostril and cheekbone
  c.lineWidth = 5;
  c.beginPath(); c.moveTo(-160, 14); c.quadraticCurveTo(-150, 6, -144, 16); c.stroke();
  c.beginPath(); c.moveTo(-100, -10); c.quadraticCurveTo(-84, 20, -96, 44); c.stroke();
  // moustache
  c.lineWidth = 8;
  c.beginPath(); c.moveTo(-154, 42); c.bezierCurveTo(-136, 36, -110, 46, -86, 72); c.stroke();
  // ear
  c.lineWidth = 7;
  c.beginPath(); c.moveTo(28, -40); c.bezierCurveTo(70, -56, 78, 10, 52, 30); c.bezierCurveTo(40, 40, 30, 30, 34, 18); c.stroke();
  c.lineWidth = 5;
  c.beginPath(); c.moveTo(42, -20); c.quadraticCurveTo(60, -10, 46, 12); c.stroke();
  // hair: locks flowing from under the crown to the nape
  c.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    const y0 = -136 + i * 6;
    c.beginPath();
    c.moveTo(-20 + i * 26, y0);
    c.bezierCurveTo(30 + i * 22, -110 + i * 10, 120 + i * 6, -60 + i * 24, 116 + i * 10, 20 + i * 22);
    c.stroke();
  }
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(120 + i * 12, 30 + i * 22);
    c.quadraticCurveTo(150 + i * 4, 70 + i * 16, 126 + i * 2, 110 + i * 10);
    c.stroke();
  }
  // beard: wavy strands
  for (let i = 0; i < 7; i++) {
    const x0 = -150 + i * 16;
    c.beginPath();
    c.moveTo(x0 + 10, 62 + i * 4);
    c.bezierCurveTo(x0 - 10, 100, x0 + 14, 130, x0 + 4 + i * 2, 170 - i * 6);
    c.stroke();
  }
  // jaw line under the ear down to the beard
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(38, 44); c.bezierCurveTo(10, 90, -30, 120, -70, 150); c.stroke();
  // fold of the robe on the truncation
  c.lineWidth = 7;
  c.beginPath(); c.moveTo(-44, 212); c.quadraticCurveTo(30, 196, 112, 206); c.stroke();
  c.restore();
}

// ── Tails: cross pattée, d20 heart, four emblems in the quarters ─────────────
function drawTails(c: Ctx): void {
  frame(c);
  arcText(c, 'AUDACES FORTUNA IUVAT', 352, 50, true, 0.78);
  arcText(c, 'CRUZ', 410, 54, false, 0.78);
  star(c, C - 150, C + 368, 16, 0.78);
  star(c, C + 150, C + 368, 16, 0.78);

  c.save();
  c.translate(C, C);
  const arm = (inset: number) => {
    const p = new Path2D();
    p.moveTo(-26 + inset * 0.4, -60);
    p.bezierCurveTo(-34, -160, -70 + inset, -240, -96 + inset, -292 + inset);
    p.quadraticCurveTo(0, -268 + inset, 96 - inset, -292 + inset);
    p.bezierCurveTo(70 - inset, -240, 34, -160, 26 - inset * 0.4, -60);
    p.closePath();
    return p;
  };
  for (let k = 0; k < 4; k++) {
    c.save();
    c.rotate((k * Math.PI) / 2);
    c.fillStyle = level(0.6);
    c.fill(arm(0));
    // engraved inner border of each arm
    c.strokeStyle = level(0.44);
    c.lineWidth = 6;
    c.stroke(arm(20));
    c.restore();
  }
  // the heart: a d20 seen face on (hexagon with its triangles)
  c.fillStyle = level(0.72);
  c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.fill();
  c.strokeStyle = level(0.5);
  c.lineWidth = 6;
  c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.stroke();
  const hex: [number, number][] = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [62 * Math.cos(a), 62 * Math.sin(a)];
  });
  const tri: [number, number][] = [[0, -36], [-31, 18], [31, 18]];
  c.fillStyle = level(0.86);
  c.beginPath(); tri.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.fill();
  c.strokeStyle = level(0.52);
  c.lineWidth = 5;
  c.beginPath(); hex.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.stroke();
  c.beginPath(); tri.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.stroke();
  // edges from each corner of the front face to the three nearest corners of the outline
  c.beginPath();
  ([[0, [5, 0, 1]], [2, [1, 2, 3]], [1, [3, 4, 5]]] as [number, number[]][]).forEach(([t, hs]) => {
    hs.forEach((h) => { c.moveTo(tri[t][0], tri[t][1]); c.lineTo(hex[h][0], hex[h][1]); });
  });
  c.stroke();
  c.fillStyle = level(0.5);
  c.font = `800 30px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('20', 0, 2);

  // quarters (at 45°): castle, crown, crossed swords, skull
  const quarter = (ang: number, draw: () => void) => {
    c.save();
    c.translate(206 * Math.cos(ang), 206 * Math.sin(ang));
    draw();
    c.restore();
  };
  quarter(-Math.PI * 0.75, () => castle(c));
  quarter(-Math.PI * 0.25, () => smallCrown(c));
  quarter(Math.PI * 0.75, () => swords(c));
  quarter(Math.PI * 0.25, () => skull(c));
  c.restore();
}

function castle(c: Ctx): void {
  c.fillStyle = level(0.64);
  // three towers with battlements on a wall
  const tower = (x: number, w: number, top: number) => {
    c.fillRect(x - w / 2, top, w, 64 - top);
    for (let i = 0; i < 3; i++) c.fillRect(x - w / 2 + (i * w) / 2.5, top - 12, w / 5, 12);
  };
  c.fillRect(-58, -6, 116, 70);
  tower(-44, 34, -46);
  tower(0, 40, -66);
  tower(44, 34, -46);
  c.fillStyle = level(0.36);
  c.beginPath(); c.moveTo(-14, 64); c.lineTo(-14, 34); c.quadraticCurveTo(0, 18, 14, 34); c.lineTo(14, 64); c.fill();
  [-44, 0, 44].forEach((x, i) => c.fillRect(x - 4, i === 1 ? -44 : -30, 8, 16));
}

function smallCrown(c: Ctx): void {
  c.fillStyle = level(0.66);
  c.beginPath();
  c.moveTo(-56, 40); c.lineTo(56, 40); c.lineTo(62, -30); c.lineTo(30, 4); c.lineTo(0, -48); c.lineTo(-30, 4); c.lineTo(-62, -30);
  c.closePath();
  c.fill();
  c.fillStyle = level(0.86);
  [[-62, -36], [0, -56], [62, -36]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = level(0.42);
  c.fillRect(-56, 18, 112, 6);
  c.fillStyle = level(0.9);
  [-30, 0, 30].forEach((x) => { c.beginPath(); c.arc(x, 30, 6, 0, Math.PI * 2); c.fill(); });
}

function swords(c: Ctx): void {
  const sword = (rot: number) => {
    c.save();
    c.rotate(rot);
    c.fillStyle = level(0.68);
    c.beginPath(); c.moveTo(-7, 30); c.lineTo(-7, -60); c.lineTo(0, -76); c.lineTo(7, -60); c.lineTo(7, 30); c.fill();
    c.fillStyle = level(0.8);
    c.fillRect(-26, 30, 52, 9);
    c.fillStyle = level(0.6);
    c.fillRect(-5, 39, 10, 26);
    c.fillStyle = level(0.82);
    c.beginPath(); c.arc(0, 70, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = level(0.48);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 26); c.lineTo(0, -60); c.stroke();
    c.restore();
  };
  sword(-Math.PI / 4);
  sword(Math.PI / 4);
}

function skull(c: Ctx): void {
  c.fillStyle = level(0.66);
  c.beginPath(); c.ellipse(0, -14, 50, 46, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.roundRect(-30, 14, 60, 36, 10); c.fill();
  c.fillStyle = level(0.3);
  c.beginPath(); c.ellipse(-20, -10, 14, 16, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(20, -10, 14, 16, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(0, 10); c.lineTo(-7, 22); c.lineTo(7, 22); c.closePath(); c.fill();
  c.strokeStyle = level(0.4);
  c.lineWidth = 4;
  [-16, -5, 6, 17].forEach((x) => { c.beginPath(); c.moveTo(x, 34); c.lineTo(x, 50); c.stroke(); });
}

// ── Height processing ────────────────────────────────────────────────────────
/** Separable box blur, in place (radius in texels). */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / n;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
const blur = (f: Float32Array, w: number, h: number, r: number) => boxBlur(boxBlur(f, w, h, r), w, h, r);

let atlasCache: HTMLCanvasElement | null = null;

/** The two sides as a relief atlas (built once per session, ~0.1 s). */
export function coinAtlas(): HTMLCanvasElement {
  if (atlasCache) return atlasCache;
  const atlas = document.createElement('canvas');
  atlas.width = COIN_ATLAS_W;
  atlas.height = COIN_ATLAS_H;
  const out = atlas.getContext('2d')!;
  const img = out.createImageData(COIN_ATLAS_W, COIN_ATLAS_H);
  [drawHeads, drawTails].forEach((draw, side) => {
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d', { willReadFrequently: true })!;
    c.fillStyle = '#000';
    c.fillRect(0, 0, S, S);
    draw(c);
    const px = c.getImageData(0, 0, S, S).data;
    const m = new Float32Array(S * S);
    const struck = new Float32Array(S * S);
    for (let i = 0; i < m.length; i++) { m[i] = px[i * 4] / 255; struck[i] = m[i] > 0.03 ? 1 : 0; }
    // crisp edges plus a broad dome: the design swells away from its outline
    const sharp = blur(m, S, S, 2);
    const broad = blur(m, S, S, 11);
    const mask = blur(struck, S, S, 2);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const hgt = Math.max(0, Math.min(1, sharp[i] * 0.72 + Math.min(sharp[i], broad[i]) * 0.28));
        const h16 = Math.round(hgt * 65535);
        const o = (y * COIN_ATLAS_W + x + side * S) * 4;
        img.data[o] = h16 >> 8;
        img.data[o + 1] = h16 & 255;
        img.data[o + 2] = Math.round(mask[i] * 255);
        img.data[o + 3] = 255;
      }
    }
  });
  out.putImageData(img, 0, 0);
  atlasCache = atlas;
  return atlas;
}

/** Debug view of the design levels (before blurring), for previews. */
export function coinDesignPreview(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = COIN_ATLAS_W; cv.height = COIN_ATLAS_H;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, COIN_ATLAS_W, COIN_ATLAS_H);
  drawHeads(c);
  c.save(); c.translate(S, 0); drawTails(c); c.restore();
  return cv;
}
