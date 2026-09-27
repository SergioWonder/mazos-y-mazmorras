// 3D d20 in WebGL (WebGL2 when available, WebGL1 otherwise; plain number without
// GL). The roll itself is a seeded rigid-body simulation (`d20-physics.ts`): it
// bounces, rolls, rocks on an edge and settles, and a constant compensation
// rotation of the numbering makes the face that lands on top show the result
// the engine already decided, so nothing turns after the die stops.
// Look: bevelled resin with a colour gradient, swirls, glitter and bubbles,
// engraved inked numbers, specular, fresnel, fake translucency and a procedural
// environment. The canvas only exists during the roll and no loop outlives it.

import {
  d20Geometry, d20Numbering, simulateRoll, poseAt, rotateVec, advantageLanes,
  type RollBox, type RollTrack, type Vec3, type Quat,
} from './d20-physics.ts';
import { audio } from './audio.ts';
import type { DiceTheme } from '../core/types.ts';

// ── 4×4 matrices (column-major) ──────────────────────────────────────────────
type Mat4 = Float32Array;

function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(eye: Vec3, target: Vec3): Mat4 {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
  // x = up × z with up = (0,1,0)
  let xx = zz, xz = -zx;
  const xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  return new Float32Array([
    xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
    -(xx * eye[0] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1,
  ]);
}
function modelMatrix(q: Quat, x: Vec3): Mat4 {
  const [a, b, c, w] = q;
  return new Float32Array([
    1 - 2 * (b * b + c * c), 2 * (a * b + w * c), 2 * (a * c - w * b), 0,
    2 * (a * b - w * c), 1 - 2 * (a * a + c * c), 2 * (b * c + w * a), 0,
    2 * (a * c + w * b), 2 * (b * c - w * a), 1 - 2 * (a * a + b * b), 0,
    x[0], x[1], x[2], 1,
  ]);
}
const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

// ── Themes: resin colours per card ───────────────────────────────────────────
type RGB = [number, number, number];
interface Resin { deep: RGB; bright: RGB; swirl: RGB; glitter: RGB; ink: RGB }
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const RESINS: Record<DiceTheme, Resin> = {
  // Seduce: violet into pink, gold ink
  seducir: { deep: hex('#3a0f63'), bright: hex('#ff6fb8'), swirl: hex('#ffc2ea'), glitter: hex('#ffd9f2'), ink: hex('#f6c75a') },
  // Wish: amber into gold, ivory ink
  deseo: { deep: hex('#6a3204'), bright: hex('#ffc23d'), swirl: hex('#fff1b8'), glitter: hex('#fff6d8'), ink: hex('#fff8ea') },
  // anything else (relics): teal jade, silver ink
  neutral: { deep: hex('#07343f'), bright: hex('#5fd6c4'), swirl: hex('#d6fff6'), glitter: hex('#e8fffb'), ink: hex('#f1f4f6') },
};

// ── Bevelled mesh: flat inset faces + rounded edge strips + vertex caps ──────
const COLS = 5, ROWS = 4, TEX = 1024;
const CELL_W = TEX / COLS, CELL_H = TEX / ROWS;
/** Triangle of each atlas cell (fractions of the cell): top vertex = top of the number. */
const CELL_TRI: [number, number][] = [[0.5, 0.1], [0.06, 0.94], [0.94, 0.94]];

function buildMesh(): Float32Array {
  const { faces, normals, corners, vertices } = d20Geometry();
  const data: number[] = [];
  const put = (p: Vec3, n: Vec3, u: number, v: number, mark: number) => data.push(p[0], p[1], p[2], n[0], n[1], n[2], u, v, mark);
  const uvOf = (face: number, k: number): [number, number] => {
    const col = face % COLS, row = Math.floor(face / COLS);
    return [(col + CELL_TRI[k][0]) / COLS, 1 - (row + CELL_TRI[k][1]) / ROWS];
  };
  const corner = (face: number, vert: number): Vec3 => corners[face * 3 + faces[face].indexOf(vert)];
  // flat faces (the only part with numbers)
  faces.forEach((_, f) => {
    for (let k = 0; k < 3; k++) { const [u, v] = uvOf(f, k); put(corners[f * 3 + k], normals[f], u, v, 1); }
  });
  // edge strips between neighbouring faces; normals blend from one face to the other
  for (let f1 = 0; f1 < 20; f1++) {
    for (let f2 = f1 + 1; f2 < 20; f2++) {
      const shared = faces[f1].filter((v) => faces[f2].includes(v));
      if (shared.length !== 2) continue;
      const [a, b] = shared;
      const p1a = corner(f1, a), p1b = corner(f1, b), p2a = corner(f2, a), p2b = corner(f2, b);
      const n1 = normals[f1], n2 = normals[f2];
      put(p1a, n1, 0, 0, 0); put(p1b, n1, 0, 0, 0); put(p2b, n2, 0, 0, 0);
      put(p1a, n1, 0, 0, 0); put(p2b, n2, 0, 0, 0); put(p2a, n2, 0, 0, 0);
    }
  }
  // rounded caps at the 12 vertices
  vertices.forEach((vtx, vi) => {
    const around = faces.map((f, i) => (f.includes(vi) ? i : -1)).filter((i) => i >= 0);
    // order the 5 faces around the vertex axis
    const ref = corner(around[0], vi);
    const t1 = norm3(sub3(ref, scale3(vtx, dot3(ref, vtx))));
    const t2 = cross3(vtx, t1);
    around.sort((i, j) => {
      const pi = corner(i, vi), pj = corner(j, vi);
      return Math.atan2(dot3(pi, t2), dot3(pi, t1)) - Math.atan2(dot3(pj, t2), dot3(pj, t1));
    });
    const ring = around.map((i) => corner(i, vi));
    const avg = ring.reduce<Vec3>((s, p) => [s[0] + p[0] / 5, s[1] + p[1] / 5, s[2] + p[2] / 5], [0, 0, 0]);
    const tip: Vec3 = [avg[0] + vtx[0] * 0.018, avg[1] + vtx[1] * 0.018, avg[2] + vtx[2] * 0.018];
    for (let k = 0; k < 5; k++) {
      const i = around[k], j = around[(k + 1) % 5];
      put(tip, vtx, 0, 0, 0); put(ring[k], normals[i], 0, 0, 0); put(ring[(k + 1) % 5], normals[j], 0, 0, 0);
    }
  });
  return new Float32Array(data);
}
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

let meshCache: Float32Array | null = null;
let atlasCache: HTMLCanvasElement | null = null;

/** Number atlas, drawn once: white glyphs on black (6 and 9 underlined). */
function numberAtlas(): HTMLCanvasElement {
  if (atlasCache) return atlasCache;
  const cv = document.createElement('canvas');
  cv.width = TEX; cv.height = TEX;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, TEX, TEX);
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const nums = d20Numbering();
  for (let f = 0; f < 20; f++) {
    const col = f % COLS, row = Math.floor(f / COLS);
    const cx = (col + (CELL_TRI[0][0] + CELL_TRI[1][0] + CELL_TRI[2][0]) / 3) * CELL_W;
    const cy = (row + (CELL_TRI[0][1] + CELL_TRI[1][1] + CELL_TRI[2][1]) / 3) * CELL_H + CELL_H * 0.04;
    const txt = String(nums[f]);
    const size = Math.round(CELL_H * (txt.length > 1 ? 0.3 : 0.36));
    c.font = `800 ${size}px Georgia, "Times New Roman", serif`;
    c.fillText(txt, cx, cy);
    if (txt === '6' || txt === '9') c.fillRect(cx - size * 0.2, cy + size * 0.45, size * 0.4, size * 0.07);
  }
  atlasCache = cv;
  return cv;
}

const DIE_VS = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aUV;
attribute float aMark;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vObj;
varying vec3 vNObj;
varying vec3 vW;
varying vec3 vNW;
varying vec2 vUV;
varying float vMark;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  gl_Position = uProj * uView * w;
  vObj = aPos;
  vNObj = aNor;
  vW = w.xyz;
  vNW = (uModel * vec4(aNor, 0.0)).xyz;
  vUV = aUV;
  vMark = aMark;
}`;

const DIE_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vObj;
varying vec3 vNObj;
varying vec3 vW;
varying vec3 vNW;
varying vec2 vUV;
varying float vMark;
uniform vec3 uCamObj;
uniform vec3 uCamW;
uniform vec3 uLight;
uniform vec3 uLightObj;
uniform vec3 uDeep;
uniform vec3 uBright;
uniform vec3 uSwirl;
uniform vec3 uGlitter;
uniform vec3 uInk;
uniform float uSeed;
uniform float uDim;
uniform float uGlow;
uniform vec3 uGlowCol;
uniform sampler2D uTex;

float h31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 h33(vec3 p) { return vec3(h31(p), h31(p + 19.19), h31(p + 47.7)); }
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
  float b = mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
  return mix(a, b, f.z);
}

void main() {
  vec3 N = normalize(vNObj);
  vec3 V = normalize(vObj - uCamObj);
  vec3 Hobj = normalize(uLightObj - V);

  // ── resin interior: short march along the refracted ray ──
  vec3 Rr = refract(V, N, 0.67);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < 6; i++) {
    float s = 0.06 + float(i) * 0.13;
    vec3 q = vObj + Rr * s;
    vec3 p = q + vec3(uSeed);
    float n1 = vnoise(p * 2.1);
    float grad = clamp(0.5 + 0.6 * q.y + 0.35 * q.x + 0.5 * (n1 - 0.5), 0.0, 1.0);
    vec3 c = mix(uDeep, uBright, grad);
    // swirls of colour
    float sw = vnoise(p * 3.2 + vec3(n1 * 2.7));
    c = mix(c, uSwirl, smoothstep(0.075, 0.0, abs(sw - 0.5)) * 0.75);
    // glitter flakes that flash when they face the light
    vec3 cell = floor(p * 12.0);
    vec3 hh = h33(cell);
    vec3 fp = fract(p * 12.0) - 0.5 - (hh - 0.5) * 0.5;
    float flake = step(0.72, hh.x) * smoothstep(0.17, 0.03, length(fp));
    float glint = pow(abs(dot(normalize(hh * 2.0 - 1.0), Hobj)), 20.0);
    c += uGlitter * flake * (0.25 + 3.2 * glint);
    // tiny bubbles: bright rims
    vec3 bc = floor(p * 5.0);
    vec3 hb = h33(bc + 3.1);
    float bd = length(fract(p * 5.0) - 0.5 - (hb - 0.5) * 0.5);
    float bub = step(0.82, hb.y) * smoothstep(0.1, 0.075, bd) * smoothstep(0.035, 0.07, bd);
    c += vec3(0.9) * bub;
    // denser towards the core
    float core = 1.0 - smoothstep(0.2, 0.9, length(q));
    acc += T * c * (0.2 + 0.1 * core);
    T *= 0.74;
  }

  // ── surface lighting in world space ──
  vec3 Nw = normalize(vNW);
  vec3 Vw = normalize(uCamW - vW);
  vec3 L = uLight;
  float ndv = max(dot(Nw, Vw), 0.0);
  float dif = max(dot(Nw, L), 0.0);
  vec3 H = normalize(L + Vw);
  float nh = max(dot(Nw, H), 0.0);
  float spec = pow(nh, 140.0) * 1.8 + pow(nh, 16.0) * 0.1;
  float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  vec3 Rw = reflect(-Vw, Nw);
  vec3 env = mix(vec3(0.05, 0.04, 0.07), vec3(0.75, 0.72, 0.7), smoothstep(-0.15, 0.9, Rw.y));
  env += vec3(1.5) * smoothstep(0.9, 0.97, dot(Rw, normalize(vec3(-0.5, 0.78, 0.35))));
  env += vec3(1.0, 0.72, 0.45) * smoothstep(0.93, 0.99, dot(Rw, normalize(vec3(0.75, 0.45, -0.3))));

  vec3 body = acc * (0.4 + 0.85 * dif);
  // fake translucency: light leaks through the thin rims
  body += uBright * pow(1.0 - ndv, 2.2) * 0.55;
  body += uBright * 0.18 * dif;

  // ── engraved, inked numbers ──
  vec2 o = vec2(-0.0035, 0.0035);
  float m = texture2D(uTex, vUV).r * vMark;
  float e = (texture2D(uTex, vUV + o).r - texture2D(uTex, vUV - o).r) * vMark;
  vec3 ink = uInk * (0.55 + 0.55 * dif) + vec3(pow(nh, 30.0) * 0.8);
  vec3 col = mix(body, ink, m);
  // inside the groove: the wall facing away from the light is in shadow, the other one catches it
  col *= 1.0 - 0.6 * clamp(-e, 0.0, 1.0) * m;
  col += uInk * 0.35 * clamp(e, 0.0, 1.0) * m;
  // bevelled edges glow a little brighter (light travelling through the resin)
  col += uBright * 0.22 * (1.0 - vMark) * (0.5 + 0.5 * dif);
  col += env * F * (1.0 - 0.5 * m) + vec3(spec) * (1.0 - 0.4 * m);

  col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))) * 0.5, uDim);
  col += uGlowCol * uGlow * (0.18 + 0.9 * pow(1.0 - ndv, 2.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const SHADOW_VS = `
attribute vec2 aCorner;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uCenter;
uniform float uSize;
varying vec2 vC;
void main() {
  vC = aCorner;
  gl_Position = uProj * uView * vec4(uCenter + vec3(aCorner.x * uSize, 0.0, aCorner.y * uSize), 1.0);
}`;
const SHADOW_FS = `
precision mediump float;
varying vec2 vC;
uniform float uAlpha;
void main() {
  float r = length(vC);
  float a = uAlpha * pow(clamp(1.0 - r, 0.0, 1.0), 1.7);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('d20 shader:', gl.getShaderInfoLog(s)); return null; }
  return s;
}
function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const v = compile(gl, gl.VERTEX_SHADER, vs), f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

// ── Timing and debugging ─────────────────────────────────────────────────────
const HOLD_MS = 1250;       // result on show after the die stops
const HOLD_CRIT_MS = 1650;  // a little longer for a natural 20 or a 1
const FADE_MS = 320;
const LIGHT: Vec3 = norm3([-0.35, 1, 0.45]);
const PITCH = (74 * Math.PI) / 180;
const FOV = (36 * Math.PI) / 180;

interface DebugOptions { preserve?: boolean; timeScale?: number; seed?: number }
const debugOptions = (): DebugOptions | null =>
  (typeof window !== 'undefined' && (window as unknown as { __dadoDebug?: DebugOptions }).__dadoDebug) || null;

/** Rolls a single die (shortcut for `rodarDados`). */
export function rodarDado(n: number, caras: number, theme: DiceTheme = 'neutral'): Promise<void> {
  return rodarDados([n], caras, theme);
}

/** Rolls 1 or 2 d20s at once; each one lands on its value. With several dice the
 *  highest is highlighted and the others are dimmed. */
export function rodarDados(valores: number[], caras: number, theme: DiceTheme = 'neutral'): Promise<void> {
  return new Promise((resolve) => {
    const dbg = debugOptions();
    const overlay = document.createElement('div');
    overlay.className = 'dado3d-overlay';
    const canvas = document.createElement('canvas');
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    let closed = false;
    const close = (gl?: WebGLRenderingContext | null) => {
      if (closed) return;
      closed = true;
      overlay.classList.add('dado3d-fuera');
      setTimeout(() => {
        // free the GPU context right away (mobile browsers cap how many exist)
        if (!dbg) gl?.getExtension('WEBGL_lose_context')?.loseContext();
        overlay.remove();
        resolve();
      }, FADE_MS);
    };

    const attrs: WebGLContextAttributes = { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: !!dbg?.preserve };
    const gl = (canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
    const dieProg = gl && program(gl, DIE_VS, DIE_FS);
    const shadowProg = gl && program(gl, SHADOW_VS, SHADOW_FS);
    if (!gl || !dieProg || !shadowProg) {
      // fallback without WebGL: just the number(s)
      const num = document.createElement('span');
      num.className = 'dado3d-num sin-gl revelado';
      num.textContent = valores.join('  ·  ');
      overlay.appendChild(num);
      setTimeout(() => close(gl), 1800);
      return;
    }

    const resin = RESINS[theme] ?? RESINS.neutral;
    const multiple = valores.length > 1;
    const best = Math.max(...valores);
    const bestIndex = valores.indexOf(best);

    // play area follows the screen shape (the simulation is deterministic per box)
    const aspect0 = window.innerWidth / Math.max(1, window.innerHeight);
    const hz = multiple ? 2.6 : 2.2;
    const box: RollBox = aspect0 >= 1
      ? { minX: -Math.min(4.4, Math.max(2.6, hz * aspect0 * 0.95)), maxX: Math.min(4.4, Math.max(2.6, hz * aspect0 * 0.95)), minZ: -hz, maxZ: hz }
      : { minX: -2.2, maxX: 2.2, minZ: -Math.min(4, 2.2 / aspect0 * 0.8), maxZ: Math.min(4, 2.2 / aspect0 * 0.8) };
    const lanes = multiple ? advantageLanes(box) : [box];
    const baseSeed = dbg?.seed ?? Math.floor(Math.random() * 1e9);
    const tracks: RollTrack[] = valores.map((v, i) =>
      simulateRoll({ result: Math.min(20, Math.max(1, Math.round((v / Math.max(1, caras)) * 20))), seed: baseSeed + i * 7717, box: lanes[i % lanes.length] }));
    const restAt = Math.max(...tracks.map((t) => t.duration));
    if (dbg) (window as unknown as { __dadoUltimo?: unknown }).__dadoUltimo = { tracks, canvas, restAt };

    // ── GPU resources ──
    const mesh = meshCache ?? (meshCache = buildMesh());
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, numberAtlas());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const du = {
      proj: U(dieProg, 'uProj'), view: U(dieProg, 'uView'), model: U(dieProg, 'uModel'),
      camObj: U(dieProg, 'uCamObj'), camW: U(dieProg, 'uCamW'), light: U(dieProg, 'uLight'), lightObj: U(dieProg, 'uLightObj'),
      deep: U(dieProg, 'uDeep'), bright: U(dieProg, 'uBright'), swirl: U(dieProg, 'uSwirl'), glitter: U(dieProg, 'uGlitter'), ink: U(dieProg, 'uInk'),
      seed: U(dieProg, 'uSeed'), dim: U(dieProg, 'uDim'), glow: U(dieProg, 'uGlow'), glowCol: U(dieProg, 'uGlowCol'), tex: U(dieProg, 'uTex'),
    };
    const su = {
      proj: U(shadowProg, 'uProj'), view: U(shadowProg, 'uView'), center: U(shadowProg, 'uCenter'), size: U(shadowProg, 'uSize'), alpha: U(shadowProg, 'uAlpha'),
    };
    const aPos = gl.getAttribLocation(dieProg, 'aPos'), aNor = gl.getAttribLocation(dieProg, 'aNor');
    const aUV = gl.getAttribLocation(dieProg, 'aUV'), aMark = gl.getAttribLocation(dieProg, 'aMark');
    const aCorner = gl.getAttribLocation(shadowProg, 'aCorner');

    // ── camera fitted to the play area ──
    let proj = perspective(FOV, 1, 0.1, 100), view = lookAt([0, 10, 6], [0, 0, 0]);
    let eye: Vec3 = [0, 10, 6];
    let cssW = 0, cssH = 0;
    const project = (p: Vec3): [number, number, number] => {
      const m = mul(proj, view);
      const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
      const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
      const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return [(x / w * 0.5 + 0.5) * cssW, (1 - (y / w * 0.5 + 0.5)) * cssH, w];
    };
    const fitCamera = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = window.innerWidth; cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const aspect = cssW / Math.max(1, cssH);
      proj = perspective(FOV, aspect, 0.1, 100);
      const target: Vec3 = [0, 0, 0.3];
      const pts: Vec3[] = [];
      for (const x of [box.minX - 1.2, box.maxX + 1.2]) for (const z of [box.minZ - 1.2, box.maxZ + 1.2]) pts.push([x, 0, z]);
      for (let d = 5; d < 60; d += 0.25) {
        eye = [0, target[1] + d * Math.sin(PITCH), target[2] + d * Math.cos(PITCH)];
        view = lookAt(eye, target);
        const m = mul(proj, view);
        const fits = pts.every((p) => {
          const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
          const x = (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w;
          const y = (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w;
          return Math.abs(x) < 0.94 && Math.abs(y) < 0.9;
        });
        if (fits) break;
      }
    };
    fitCamera();
    if (dbg) Object.assign((window as unknown as { __dadoUltimo: object }).__dadoUltimo, { eye: () => eye, view: () => view, proj: () => proj, box });

    const drawShadow = (x: Vec3) => {
      const h = Math.max(0, x[1] - 0.8);
      gl.useProgram(shadowProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aCorner);
      gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(su.proj, false, proj);
      gl.uniformMatrix4fv(su.view, false, view);
      // the light comes from above and slightly behind: the shadow slides away as it rises
      gl.uniform3f(su.center, x[0] - LIGHT[0] * h * 0.35 + 0.08, 0.002, x[2] - LIGHT[2] * h * 0.35 + 0.1);
      gl.uniform1f(su.size, 1.25 + h * 0.32);
      gl.uniform1f(su.alpha, 0.62 / (1 + h * 0.55));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(aCorner);
    };
    const drawDie = (q: Quat, x: Vec3, dim: number, glow: number, glowCol: RGB, seed: number) => {
      gl.useProgram(dieProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      const stride = 9 * 4;
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(aMark); gl.vertexAttribPointer(aMark, 1, gl.FLOAT, false, stride, 32);
      gl.uniformMatrix4fv(du.proj, false, proj);
      gl.uniformMatrix4fv(du.view, false, view);
      gl.uniformMatrix4fv(du.model, false, modelMatrix(q, x));
      const inv = conj(q);
      gl.uniform3fv(du.camObj, rotateVec(inv, [eye[0] - x[0], eye[1] - x[1], eye[2] - x[2]]));
      gl.uniform3fv(du.camW, eye);
      gl.uniform3fv(du.light, LIGHT);
      gl.uniform3fv(du.lightObj, rotateVec(inv, LIGHT));
      gl.uniform3fv(du.deep, resin.deep); gl.uniform3fv(du.bright, resin.bright); gl.uniform3fv(du.swirl, resin.swirl);
      gl.uniform3fv(du.glitter, resin.glitter); gl.uniform3fv(du.ink, resin.ink);
      gl.uniform1f(du.seed, seed); gl.uniform1f(du.dim, dim); gl.uniform1f(du.glow, glow); gl.uniform3fv(du.glowCol, glowCol);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(du.tex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 9);
      gl.disableVertexAttribArray(aPos); gl.disableVertexAttribArray(aNor);
      gl.disableVertexAttribArray(aUV); gl.disableVertexAttribArray(aMark);
    };

    // ── effects: knocks, shake, dust ──
    const pendingImpacts = tracks.map((t) => t.impacts.slice());
    let knocks = 0, lastKnock = -1, shake = 0;
    const dust = (p: Vec3, strength: number, flash: boolean) => {
      const [sx, sy] = project(p);
      const puffs = Math.round(4 + Math.min(6, strength * 0.4));
      for (let i = 0; i < puffs; i++) {
        const d = document.createElement('span');
        d.className = 'dado3d-polvo';
        const ang = (i / puffs) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 18 + strength * 2.2 + Math.random() * 14;
        d.style.left = `${sx}px`; d.style.top = `${sy}px`;
        d.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
        d.style.setProperty('--dy', `${Math.sin(ang) * dist * 0.45}px`);
        overlay.appendChild(d);
        setTimeout(() => d.remove(), 700);
      }
      if (flash) {
        const f = document.createElement('span');
        f.className = 'dado3d-destello';
        f.style.left = `${sx}px`; f.style.top = `${sy}px`;
        overlay.appendChild(f);
        setTimeout(() => f.remove(), 600);
      }
    };
    const lastImpacts = tracks.map((t) => t.impacts[t.impacts.length - 1]);

    const colourOf = (v: number): { glow: number; col: RGB; cls: string } =>
      v === caras ? { glow: 0.55, col: [1, 0.78, 0.25], cls: 'critico' } : v === 1 ? { glow: 0.5, col: [0.95, 0.12, 0.08], cls: 'pifia' } : { glow: 0, col: [0, 0, 0], cls: '' };

    const showResult = () => {
      tracks.forEach((tr, i) => {
        const v = valores[i];
        const winner = !multiple || i === bestIndex;
        const x = poseAt(tr, tr.duration).x;
        const [sx, sy, w] = project(x);
        const [, sy2] = project([x[0], x[1], x[2] + 1]);
        const px = Math.abs(sy2 - sy) || 60 / w;
        const { cls } = colourOf(v);
        if (winner && cls) {
          const halo = document.createElement('span');
          halo.className = `dado3d-halo ${cls}`;
          halo.style.left = `${sx}px`; halo.style.top = `${sy}px`;
          halo.style.setProperty('--r', `${Math.round(px * 3.4)}px`);
          overlay.insertBefore(halo, canvas);
        }
        const label = document.createElement('span');
        label.className = `dado3d-num dado3d-etiqueta revelado ${winner ? cls : 'perdedor'}`;
        label.textContent = String(v);
        label.style.left = `${sx}px`;
        label.style.top = `${sy + px * 1.55}px`;
        overlay.appendChild(label);
      });
    };

    const timeScale = dbg?.timeScale ?? 1;
    let t0 = 0, rested = false;
    const frame = (ts: number) => {
      if (closed) return;
      if (!t0) t0 = ts;
      const t = ((ts - t0) / 1000) * timeScale;
      if (window.innerWidth !== cssW || window.innerHeight !== cssH) fitCamera();

      // knocks on the table: soft sound, tiny shake, dust on the last one
      tracks.forEach((tr, i) => {
        const list = pendingImpacts[i];
        while (list.length && list[0].t <= t) {
          const imp = list.shift()!;
          if (knocks < 6 && imp.t - lastKnock > 0.06) {
            audio.sfx('bloqueo', Math.min(0.5, 0.1 + imp.strength / 30));
            knocks++; lastKnock = imp.t;
          }
          shake = Math.max(shake, Math.min(7, imp.strength * 0.45));
          if (imp === lastImpacts[i] || imp.strength > 9) dust(imp.x, imp.strength, imp === lastImpacts[i]);
        }
      });
      if (shake > 0.2) {
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
        shake *= 0.82;
      } else if (canvas.style.transform) {
        canvas.style.transform = '';
        shake = 0;
      }

      const done = t >= restAt;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const poses = tracks.map((tr) => poseAt(tr, t));
      // shadows first (no depth), then the dice
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      poses.forEach((p) => drawShadow(p.x));
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      poses.forEach((p, i) => {
        const v = valores[i];
        const settled = t >= tracks[i].duration;
        const winner = !multiple || i === bestIndex;
        const { glow, col } = colourOf(v);
        drawDie(p.q, p.x, done && !winner ? 0.65 : 0, settled && winner ? glow : 0, col, i * 3.7 + (baseSeed % 97) * 0.13);
      });

      if (done && !rested) {
        rested = true;
        canvas.style.transform = '';
        showResult();
        const crit = best === caras || best === 1;
        // nothing keeps drawing while the result is on show
        setTimeout(() => close(gl), (crit ? HOLD_CRIT_MS : HOLD_MS) / timeScale);
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
