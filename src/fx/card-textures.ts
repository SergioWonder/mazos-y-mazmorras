// Card material textures: parchment for regular cards, cracked rock for curses.
//
// Painted ONCE by a procedural fragment shader on a throwaway offscreen WebGL
// canvas, encoded to PNG blobs, and exposed as CSS variables on :root. The
// context is released right after, so cards are plain DOM with a static
// background-image: no canvas per card, nothing redrawn per frame. Without
// WebGL (or outside the browser) nothing is published and the CSS falls back
// to its plain gradients.

/** Number of parchment variants (cards pick one by id so they are not all identical). */
export const PARCHMENT_VARIANTS = 3;

/** CSS variables published on :root: the parchment variants, then the rock. */
export const TEXTURE_VARS = ['--tex-pergamino', '--tex-pergamino-1', '--tex-pergamino-2', '--tex-roca'] as const;

/** Card box in CSS px (desktop size; mobile cards are smaller and just downscale). */
const CARD_W = 148;
const CARD_H = 208;
const MAX_DPR = 2;

// ── Pure part ────────────────────────────────────────────────────────────────

/** Stable 32-bit FNV-1a hash of a string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Parchment variant of a card, stable for its id. */
export function parchmentVariant(id: string): number {
  return hash(id) % PARCHMENT_VARIANTS;
}

/** Class that selects the card's material in cartas.css. */
export function textureClassFor(def: { id: string; tipo: string }): string {
  return def.tipo === 'maldicion' ? 'tex-roca' : `tex-perg-${parchmentVariant(def.id)}`;
}

/** Texture size in device pixels: the card box at the (capped) pixel ratio. */
export function textureSize(dpr: number): { w: number; h: number } {
  const k = Math.min(Math.max(dpr || 1, 1), MAX_DPR);
  return { w: Math.round(CARD_W * k), h: Math.round(CARD_H * k) };
}

/** Shader parameters of each texture (mode 0 = parchment, 1 = rock). */
export function textureParams(): Array<{ name: string; mode: number; seed: number }> {
  const out: Array<{ name: string; mode: number; seed: number }> = [];
  for (let i = 0; i < PARCHMENT_VARIANTS; i++) out.push({ name: TEXTURE_VARS[i], mode: 0, seed: 11.3 + i * 37.7 });
  out.push({ name: TEXTURE_VARS[PARCHMENT_VARIANTS], mode: 1, seed: 5.1 });
  return out;
}

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// GLSL ES 1.0 so it runs on every WebGL1 mobile GPU.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_seed;
uniform float u_mode;

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + u_seed * 0.0137);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 h22(vec2 p) {
  float n = h21(p);
  return vec2(n, h21(p + n + 17.7));
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03 + 3.1; a *= 0.5; }
  return v;
}

// distance to the card edge in card-width units (0 at the border)
float edgeDist(vec2 uv, float aspect) {
  vec2 q = vec2(uv.x, uv.y * aspect);
  return min(min(q.x, 1.0 - q.x), min(q.y, aspect - q.y));
}

// ── parchment: a multiply map (white = untouched base colour) ──
vec3 parchment(vec2 uv, float aspect) {
  vec2 p = vec2(uv.x, uv.y * aspect) * 6.0;
  // large warm tonal drift and blotchy stains
  float tone = fbm(p * 0.45 + u_seed);
  float stain = smoothstep(0.52, 0.78, fbm(p * 0.9 + 9.0 + u_seed));
  // fibres: stretched noise along a slightly slanted grain
  vec2 g = mat2(0.97, 0.24, -0.24, 0.97) * p;
  float fib = fbm(vec2(g.x * 0.7, g.y * 9.0) + u_seed * 2.0);
  float fibFine = noise(vec2(g.x * 2.5, g.y * 38.0));
  // specks (motes of dirt) on a jittered grid
  vec2 cell = floor(p * 5.0);
  vec2 off = h22(cell) * 0.8 + 0.1;
  float sd = length(fract(p * 5.0) - off);
  float speck = step(0.93, h21(cell + 3.3)) * smoothstep(0.09, 0.02, sd);

  vec3 m = vec3(1.0);
  m *= mix(vec3(1.0), vec3(0.93, 0.88, 0.80), tone);
  m *= mix(vec3(1.0), vec3(0.88, 0.80, 0.68), stain * 0.55);
  m *= 1.0 - 0.07 * smoothstep(0.35, 0.75, fib);
  m *= 1.0 - 0.045 * fibFine;
  m *= mix(vec3(1.0), vec3(0.55, 0.45, 0.32), speck * 0.8);

  // scorched edge: noisy, darkening inwards from the frame
  float d = edgeDist(uv, aspect) + (fbm(p * 1.6 + 40.0) - 0.5) * 0.05;
  float burn = 1.0 - smoothstep(0.0, 0.10, d);
  float scorch = 1.0 - smoothstep(0.0, 0.025, d);
  m *= mix(vec3(1.0), vec3(0.72, 0.58, 0.40), burn * 0.7);
  m *= mix(vec3(1.0), vec3(0.40, 0.28, 0.17), scorch * 0.85);
  return m;
}

// ── rock: Voronoi slabs with lit relief (full colour) ──
vec3 voro(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 c = o + h22(i + o) * 0.85 + 0.075;
    float d = length(c - f);
    if (d < d1) { d2 = d1; d1 = d; id = h21(i + o + 7.0); }
    else if (d < d2) { d2 = d; }
  }
  return vec3(d1, d2, id);
}
float rockHeight(vec2 p) {
  vec3 v = voro(p * 1.1);
  float crack = smoothstep(0.0, 0.07, v.y - v.x);
  vec3 w = voro(p * 3.3 + 11.0);
  float fine = smoothstep(0.0, 0.05, w.y - w.x);
  return 0.55 * crack + 0.12 * fine + 0.35 * fbm(p * 2.2) + 0.08 * v.z;
}
vec3 rock(vec2 uv, float aspect) {
  vec2 p = vec2(uv.x, uv.y * aspect) * 3.2 + u_seed;
  float e = 1.5 / u_res.x * 3.2;
  float h = rockHeight(p);
  float hx = rockHeight(p + vec2(e, 0.0)) - h;
  float hy = rockHeight(p + vec2(0.0, e)) - h;
  vec3 n = normalize(vec3(-hx, -hy, e * 2.2));
  // light from the top-left (gl y points up)
  vec3 L = normalize(vec3(-0.6, 0.6, 0.55));
  float lit = clamp(dot(n, L), 0.0, 1.0);

  vec3 v = voro(p * 1.1);
  float crackLine = 1.0 - smoothstep(0.0, 0.035, v.y - v.x);
  // base: the curse's violet-black gradient, darker to the bottom-right
  float t = clamp((uv.x * 0.35 + (1.0 - uv.y) * 0.65), 0.0, 1.0);
  vec3 base = mix(vec3(0.137, 0.102, 0.161), vec3(0.067, 0.043, 0.082), t);
  base *= 0.85 + 0.3 * v.z;
  base *= 0.9 + 0.2 * fbm(p * 5.0);
  vec3 col = base * (0.55 + 0.75 * lit);
  // cracks: black core with a faint violet rim on the lit side (like the frame cracks)
  float rim = (1.0 - smoothstep(0.035, 0.07, v.y - v.x)) * (1.0 - crackLine);
  col += vec3(0.71, 0.54, 0.77) * rim * 0.10 * lit;
  col = mix(col, vec3(0.02, 0.008, 0.028), crackLine * 0.9);
  // soft vignette towards the frame
  float d = edgeDist(uv, aspect);
  col *= 0.7 + 0.3 * smoothstep(0.0, 0.14, d);
  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.y / u_res.x;
  vec3 c = u_mode < 0.5 ? parchment(uv, aspect) : rock(uv, aspect);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

// ── Generator ────────────────────────────────────────────────────────────────

export interface TextureEnv {
  dpr: number;
  createCanvas: () => HTMLCanvasElement | null;
  setVar: (name: string, value: string) => void;
  toURL: (blob: Blob) => string;
}

export interface TextureResult {
  ok: boolean;
  /** Main-thread time spent rendering (context, compile, draws), ms. */
  renderMs: number;
  /** Time until every blob URL was published, ms. */
  totalMs: number;
  width: number;
  height: number;
  /** Breakdown of renderMs: context, compile+link, draw+snapshot. */
  phases?: { context: number; compile: number; draw: number };
}

const FAILED: TextureResult = { ok: false, renderMs: 0, totalMs: 0, width: 0, height: 0 };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

async function generate(env: TextureEnv): Promise<TextureResult> {
  const t0 = now();
  const canvas = env.createCanvas();
  if (!canvas) return FAILED;
  const { w, h } = textureSize(env.dpr);
  canvas.width = w;
  canvas.height = h;
  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true, antialias: false, alpha: false, depth: false, stencil: false,
  }) as WebGLRenderingContext | null;
  if (!gl) return FAILED;
  const tCtx = now();
  const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext();

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) { release(); return FAILED; }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { release(); return FAILED; }
  gl.useProgram(prog);
  const tProg = now();

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, w, h);
  gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), w, h);
  const uSeed = gl.getUniformLocation(prog, 'u_seed');
  const uMode = gl.getUniformLocation(prog, 'u_mode');

  // each variant is drawn and snapshotted (toBlob copies the bitmap synchronously)
  const blobs: Array<Promise<Blob | null>> = [];
  const names: string[] = [];
  for (const p of textureParams()) {
    gl.uniform1f(uSeed, p.seed);
    gl.uniform1f(uMode, p.mode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    names.push(p.name);
    blobs.push(new Promise((ok) => canvas.toBlob(ok, 'image/png')));
  }
  const renderMs = now() - t0;
  const got = await Promise.all(blobs);
  release();
  canvas.width = canvas.height = 1; // drop the backing store as well
  if (got.some((b) => !b)) return { ...FAILED, renderMs };
  got.forEach((b, i) => env.setVar(names[i], `url("${env.toURL(b!)}")`));
  return {
    ok: true, renderMs, totalMs: now() - t0, width: w, height: h,
    phases: { context: tCtx - t0, compile: tProg - tCtx, draw: t0 + renderMs - tProg },
  };
}

/** Generator whose textures are rendered at most once, whatever the calls. */
export function createCardTextureGenerator(env: TextureEnv | null) {
  let done: Promise<TextureResult> | null = null;
  return {
    ensure(): Promise<TextureResult> {
      if (!done) {
        done = env
          ? generate(env).catch(() => FAILED)
          : Promise.resolve(FAILED);
      }
      return done;
    },
  };
}

function browserEnv(): TextureEnv | null {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
  return {
    dpr: typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,
    createCanvas: () => document.createElement('canvas'),
    setVar: (n, v) => document.documentElement.style.setProperty(n, v),
    toURL: (b) => URL.createObjectURL(b),
  };
}

let shared: ReturnType<typeof createCardTextureGenerator> | null = null;

let started: Promise<TextureResult> | null = null;

/** Renders the shared card textures once per page. The work waits for an idle
 *  slot (a cold shader compile can take ~100 ms) so it never lands on a busy frame. */
export function ensureCardTextures(): Promise<TextureResult> {
  if (started) return started;
  if (!shared) shared = createCardTextureGenerator(browserEnv());
  const gen = shared;
  const idle = typeof requestIdleCallback === 'function'
    ? (cb: () => void) => requestIdleCallback(cb, { timeout: 300 })
    : (cb: () => void) => setTimeout(cb, 0);
  started = typeof document === 'undefined'
    ? gen.ensure()
    : new Promise<void>((ok) => idle(ok)).then(() => gen.ensure());
  return started;
}
