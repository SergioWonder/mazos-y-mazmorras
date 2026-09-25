// WebGL2 renderer for puppet sprites. One canvas per "stage" (the combat scene,
// the gallery) draws every sprite at the screen rect of its DOM placeholder.
// Each piece is an instanced quad; the fragment shader evaluates the piece's
// signed distance field (circle, ellipse, capsule or polygon) read from a data
// texture, so outline, cut shadow, inner stroke, rim light and glow all come
// from the same few draw calls per sprite.

import type { BoneId, EffectGeometry, Effects, Matrix, Pose, PuppetRig } from '../fx/puppet.ts';
import {
  BONE_COUNT, BONE_INDEX, FLAG, PIECE_TEXELS, lighten, multiply, packRig, parseColour, spriteMatrix,
} from '../fx/puppet-gpu.ts';

const PIECE_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) in vec2 aCorner;
uniform sampler2D uData;
uniform vec4 uBones[${BONE_COUNT * 2}];
uniform vec2 uCanvas;
uniform vec2 uOffset;
uniform float uMargin;
out vec2 vLocal;
flat out int vPiece;
void main() {
  int i = gl_InstanceID;
  vec4 t0 = texelFetch(uData, ivec2(0, i), 0);
  vec4 bb = texelFetch(uData, ivec2(2, i), 0);
  int bone = int(t0.y);
  vec2 local = mix(bb.xy - uMargin, bb.zw + uMargin, aCorner);
  vec4 r0 = uBones[bone * 2], r1 = uBones[bone * 2 + 1];
  vec2 px = vec2(dot(r0.xyz, vec3(local, 1.0)), dot(r1.xyz, vec3(local, 1.0))) + uOffset;
  gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0);
  vLocal = local;
  vPiece = i;
}`;

const SDF_LIB = `
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdPiece(vec2 p, int i) {
  vec4 t0 = texelFetch(uData, ivec2(0, i), 0);
  vec4 sp = texelFetch(uData, ivec2(1, i), 0);
  int type = int(t0.x);
  if (type == 0) return length(p - sp.xy) - sp.z;
  if (type == 1) { vec2 q = (p - sp.xy) / sp.zw; return (length(q) - 1.0) * min(sp.z, sp.w); }
  if (type == 2) return sdSegment(p, sp.xy, sp.zw) - texelFetch(uData, ivec2(5, i), 0).x;
  int n = int(t0.w);
  vec4 v0 = texelFetch(uData, ivec2(6, i), 0);
  float d = dot(p - v0.xy, p - v0.xy);
  float s = 1.0;
  vec2 vj;
  { int j = n - 1; vec4 tj = texelFetch(uData, ivec2(6 + j / 2, i), 0); vj = (j % 2 == 0) ? tj.xy : tj.zw; }
  for (int k = 0; k < 16; k++) {
    if (k >= n) break;
    vec4 tk = texelFetch(uData, ivec2(6 + k / 2, i), 0);
    vec2 vk = (k % 2 == 0) ? tk.xy : tk.zw;
    vec2 e = vj - vk, w = p - vk;
    vec2 b = w - e * clamp(dot(w, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= vk.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
    vj = vk;
  }
  return s * sqrt(d);
}`;

const PIECE_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uData;
uniform int uMode;        // 0 illustrated fill · 1 flat fill · 2 solid (expanded) · 3 glow
uniform vec4 uColour;     // pass colour for modes 2 and 3 (alpha < 0: use the piece colour)
uniform float uExpand;
uniform float uGlow;
uniform vec2 uShift;
uniform int uSkip;
uniform int uOnly;
uniform float uAlpha, uFlash, uTint, uGray, uBlink, uAdditive;
in vec2 vLocal;
flat in int vPiece;
out vec4 outColour;
${SDF_LIB}
void main() {
  vec4 t0 = texelFetch(uData, ivec2(0, vPiece), 0);
  int flags = int(t0.z);
  if ((flags & uSkip) != 0) discard;
  if (uOnly != 0 && (flags & uOnly) == 0) discard;
  if ((flags & ${FLAG.eye}) != 0 && uBlink > 0.5) discard;
  float d = sdPiece(vLocal, vPiece);
  float aa = max(fwidth(d), 1e-4);
  vec4 fill = texelFetch(uData, ivec2(3, vPiece), 0);
  vec3 col;
  float a;
  if (uMode == 3) {
    // fade out completely before the quad edge so no box shows around the glow
    float g = exp(-max(d, 0.0) / uGlow) * (1.0 - smoothstep(uGlow * 2.4, uGlow * 3.4, d));
    a = (uColour.a < 0.0 ? -uColour.a : uColour.a) * g;
    col = uColour.a < 0.0 ? fill.rgb : uColour.rgb;
  } else if (uMode == 2) {
    float de = d - uExpand;
    a = clamp(0.5 - de / aa, 0.0, 1.0) * uColour.a;
    col = uColour.rgb;
  } else {
    a = clamp(0.5 - d / aa, 0.0, 1.0);
    col = fill.rgb;
    if (uMode == 0 && (flags & ${FLAG.ink | FLAG.emissive}) == 0) {
      vec4 shade = texelFetch(uData, ivec2(4, vPiece), 0);
      float ds = sdPiece(vLocal - uShift, vPiece);
      col = mix(col, shade.rgb, smoothstep(-aa, aa, ds));
      col = mix(col, vec3(0.078, 0.051, 0.039), smoothstep(-0.7 - aa, -0.7 + aa, d) * 0.95);
    }
  }
  if (a <= 0.002) discard;
  col = mix(col, vec3(1.0), uFlash);
  col = mix(col, vec3(1.0, 0.25, 0.2), uTint * 0.35);
  col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), uGray);
  a *= uAlpha;
  outColour = vec4(col * a, a * (1.0 - uAdditive));
}`;

const FX_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
uniform vec4 uM0, uM1;
uniform vec4 uBox;
uniform vec2 uCanvas;
out vec2 vLocal;
void main() {
  vec2 local = mix(uBox.xy, uBox.zw, aCorner);
  vec2 px = vec2(dot(uM0.xyz, vec3(local, 1.0)), dot(uM1.xyz, vec3(local, 1.0)));
  gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0);
  vLocal = local;
}`;

const FX_FS = `#version 300 es
precision highp float;
uniform int uType;      // 0 ground shadow · 1 slash · 2 ring · 3 glowing disc · 4 arrow
uniform vec4 uP;        // centre / radii / angles, per type
uniform vec4 uQ;
uniform vec4 uColour, uColour2;
uniform float uAlpha;
in vec2 vLocal;
out vec4 outColour;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main() {
  vec2 p = vLocal;
  vec3 col = uColour.rgb;
  float a = 0.0;
  if (uType == 0) {
    vec2 q = (p - uP.xy) / uP.zw;
    a = (1.0 - smoothstep(0.55, 1.0, length(q))) * uColour.a;
  } else if (uType == 1) {
    vec2 v = p - uP.xy;
    float r = length(v);
    float ang = degrees(atan(v.y, v.x));
    float rel = mod(ang - uQ.x + 720.0, 360.0);
    float span = max(uQ.y - uQ.x, 1.0);
    if (rel > span) discard;
    float t = rel / span;
    float thick = (uP.w - uP.z) * (0.25 + 0.75 * t);
    float d = max(r - uP.w, (uP.w - thick) - r);
    float aa = max(fwidth(d), 1e-4);
    a = clamp(0.5 - d / aa, 0.0, 1.0);
    col = mix(uColour2.rgb, uColour.rgb, clamp(-d / 2.0, 0.0, 1.0));
    a += (1.0 - a) * exp(-max(d, 0.0) / 2.0) * 0.5;
  } else if (uType == 2) {
    float d = abs(length(p - uP.xy) - uP.z) - 1.1;
    float aa = max(fwidth(d), 1e-4);
    a = clamp(0.5 - d / aa, 0.0, 1.0) + exp(-max(d, 0.0) / 2.0) * 0.4;
  } else if (uType == 3) {
    float d = length(p - uP.xy) - uP.z;
    float aa = max(fwidth(d), 1e-4);
    float core = clamp(0.5 - d / aa, 0.0, 1.0);
    a = core + (1.0 - core) * exp(-max(d, 0.0) / 2.5) * 0.7;
    col = mix(uColour2.rgb, uColour.rgb, core);
  } else {
    vec2 v = p - uP.xy;
    float c = cos(radians(uP.z)), s = sin(radians(uP.z));
    vec2 q = vec2(c * v.x + s * v.y, -s * v.x + c * v.y);
    float shaft = sdBox(q - vec2(-2.0, 0.0), vec2(7.0, 0.7));
    float head = max(max(-(q.x - 5.0), abs(q.y) * 2.1 + (q.x - 10.0)), -1.0);
    float fl = sdBox(q - vec2(-10.5, 0.0), vec2(1.6, 2.2));
    float d = min(min(shaft, head), fl);
    float aa = max(fwidth(d), 1e-4);
    a = clamp(0.5 - d / aa, 0.0, 1.0);
    col = head <= min(shaft, fl) ? vec3(0.73, 0.75, 0.78) : fl < shaft ? uColour.rgb : vec3(0.16, 0.11, 0.08);
  }
  a *= uAlpha;
  if (a <= 0.002) discard;
  outColour = vec4(col * a, a);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

/** Everything a sprite hands the stage for one frame. */
export interface GpuFrame {
  pose: Pose;
  fx: Effects;
  bones: Record<BoneId, Matrix>;
  geo: EffectGeometry;
  gone: boolean;
}

/** Per-sprite drawing state registered with a stage. */
export interface GpuView {
  element: HTMLElement;
  rig: PuppetRig;
  style: 'silhouette' | 'illustrated';
  mirrored: boolean;
  rim: string;
  aura: string | null;
  echoes: boolean;
  frame: GpuFrame | null;
  visible: boolean;
}

const BONES: BoneId[] = Object.keys(BONE_INDEX) as BoneId[];

export class PuppetStage {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly piece: WebGLProgram;
  private readonly effect: WebGLProgram;
  private readonly quad: WebGLVertexArrayObject;
  private readonly u: Record<string, WebGLUniformLocation | null> = {};
  private readonly fu: Record<string, WebGLUniformLocation | null> = {};
  private readonly textures = new Map<PuppetRig, Partial<Record<GpuView['style'], { tex: WebGLTexture; count: number }>>>();
  private readonly views = new Set<GpuView>();
  private readonly bonesBuf = new Float32Array(BONE_COUNT * 8);
  private dpr = 1;
  private readonly t0 = performance.now();

  /** Creates a stage on `host`, or returns null when WebGL2 is unavailable. */
  static create(host: HTMLElement, opts: { fixed?: boolean; before?: Node | null } = {}): PuppetStage | null {
    if (forceSvg()) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'puppet-canvas';
    canvas.style.cssText = `position:${opts.fixed ? 'fixed' : 'absolute'};inset:0;width:100%;height:100%;pointer-events:none;`;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return null;
    try {
      const stage = new PuppetStage(canvas, gl);
      host.insertBefore(canvas, opts.before ?? null);
      stages.add(stage);
      return stage;
    } catch (e) {
      console.warn('WebGL puppet renderer unavailable, using SVG', e);
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.piece = compile(gl, PIECE_VS, PIECE_FS);
    this.effect = compile(gl, FX_VS, FX_FS);
    for (const n of ['uData', 'uBones', 'uCanvas', 'uOffset', 'uMargin', 'uMode', 'uColour', 'uExpand', 'uGlow', 'uShift', 'uSkip', 'uOnly', 'uAlpha', 'uFlash', 'uTint', 'uGray', 'uBlink', 'uAdditive']) {
      this.u[n] = gl.getUniformLocation(this.piece, n);
    }
    for (const n of ['uM0', 'uM1', 'uBox', 'uCanvas', 'uType', 'uP', 'uQ', 'uColour', 'uColour2', 'uAlpha']) {
      this.fu[n] = gl.getUniformLocation(this.effect, n);
    }
    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  add(view: GpuView) { this.views.add(view); }
  remove(view: GpuView) { this.views.delete(view); }

  destroy() {
    stages.delete(this);
    for (const t of this.textures.values()) for (const v of Object.values(t)) if (v) this.gl.deleteTexture(v.tex);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.remove();
  }

  private textureFor(rig: PuppetRig, style: GpuView['style']) {
    let entry = this.textures.get(rig);
    if (!entry) { entry = {}; this.textures.set(rig, entry); }
    if (!entry[style]) {
      const gl = this.gl;
      const { data, count } = packRig(rig, style);
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, PIECE_TEXELS, count, 0, gl.RGBA, gl.FLOAT, data);
      entry[style] = { tex, count };
    }
    return entry[style]!;
  }

  /** Draws every connected, visible sprite at its placeholder's rect. */
  draw() {
    const gl = this.gl;
    // mobile: cap the pixel ratio, the SDF edges stay crisp anyway
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    const w = Math.max(1, Math.round(cw * this.dpr)), h = Math.max(1, Math.round(ch * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const origin = this.canvas.getBoundingClientRect();
    gl.bindVertexArray(this.quad);
    for (const v of this.views) {
      if (!v.frame || !v.visible || !v.element.isConnected || v.frame.gone || v.frame.fx.opacity <= 0) continue;
      const r = v.element.getBoundingClientRect();
      if (r.width < 2 || r.right < origin.left || r.left > origin.right || r.bottom < origin.top || r.top > origin.bottom) continue;
      this.drawSprite(v, { x: (r.left - origin.left) * this.dpr, y: (r.top - origin.top) * this.dpr, w: r.width * this.dpr }, w, h);
    }
  }

  private drawSprite(v: GpuView, rect: { x: number; y: number; w: number }, cw: number, ch: number) {
    const gl = this.gl, u = this.u, f = v.frame!, fx = f.fx;
    const S = spriteMatrix(rect, v.mirrored, v.rig.art ?? 1);
    for (const b of BONES) {
      const m = multiply(S, f.bones[b]), i = BONE_INDEX[b] * 8;
      this.bonesBuf.set([m[0], m[2], m[4], 0, m[1], m[3], m[5], 0], i);
    }
    const { tex, count } = this.textureFor(v.rig, v.style);
    const accent = parseColour(v.rig.accent);

    // ground shadow and effects go through the effect program
    this.drawEffect(S, cw, ch, 0, [58 + f.pose.rootX, 129.5, 22, 4.2], [0, 0, 0, 0], [0, 0, 0, 0.5], [0, 0, 0, 0], fx.opacity, [34 + f.pose.rootX, 124, 82 + f.pose.rootX, 135]);

    gl.useProgram(this.piece);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u.uData, 0);
    gl.uniform4fv(u.uBones, this.bonesBuf);
    gl.uniform2f(u.uCanvas, cw, ch);
    gl.uniform1f(u.uAlpha, fx.opacity);
    gl.uniform1f(u.uFlash, fx.flash ? 1 : 0);
    gl.uniform1f(u.uTint, fx.tint ?? 0);
    gl.uniform1f(u.uGray, fx.dying ?? 0);
    gl.uniform1f(u.uBlink, fx.blink ? 1 : 0);
    const lx = v.mirrored ? 1 : -1;
    gl.uniform2f(u.uShift, lx * 2.8, -2.8);

    const pass = (mode: number, colour: number[], opts: { expand?: number; glow?: number; offset?: [number, number]; skip?: number; only?: number; additive?: boolean; margin?: number } = {}) => {
      gl.uniform1i(u.uMode, mode);
      gl.uniform4fv(u.uColour, colour);
      gl.uniform1f(u.uExpand, opts.expand ?? 0);
      gl.uniform1f(u.uGlow, opts.glow ?? 1);
      gl.uniform2f(u.uOffset, ...(opts.offset ?? [0, 0]));
      gl.uniform1i(u.uSkip, opts.skip ?? 0);
      gl.uniform1i(u.uOnly, opts.only ?? 0);
      gl.uniform1f(u.uAdditive, opts.additive ? 1 : 0);
      gl.uniform1f(u.uMargin, opts.margin ?? 2);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    };

    if (v.aura) {
      const c = parseColour(v.aura);
      pass(3, [c[0], c[1], c[2], 0.75], { glow: 3.5, margin: 13, skip: FLAG.ink });
    }
    if (v.echoes) {
      const e = [0.61, 0.7, 1, 0.42];
      // Mirror Image: ghostly copies either side, offsets in CSS px like the old drop-shadows
      for (const [dx, dy] of [[-26, 0], [26, 0], [-13, -4], [13, -4]] as const) pass(2, e, { offset: [dx * this.dpr, dy * this.dpr], skip: FLAG.ink });
    }
    if (v.style === 'silhouette') {
      const rimPx = Math.max(1.1, rect.w / this.dpr / 75) * this.dpr;
      pass(3, [accent[0], accent[1], accent[2], 0.55], { glow: 3.2, margin: 12 });
      pass(2, [accent[0], accent[1], accent[2], 1], { offset: [rimPx, -rimPx] });
      pass(1, [0, 0, 0, 0]);
      pass(3, [0, 0, 0, -0.6], { only: FLAG.emissive | FLAG.eye, glow: 1.1, margin: 5, additive: true });
    } else {
      const rimPx = Math.max(0.8, rect.w / this.dpr / 130) * this.dpr;
      const rim = parseColour(v.rim);
      const skip = FLAG.ink | FLAG.emissive;
      pass(2, rim, { expand: 1.3, offset: [-rimPx, -rimPx], skip });
      pass(2, [0.078, 0.051, 0.039, 1], { expand: 1.3, skip });
      pass(0, [0, 0, 0, 0]);
      pass(3, [0, 0, 0, -0.5], { only: FLAG.emissive, glow: 0.9, margin: 5, additive: true });
    }

    // attack effects
    const g = f.geo;
    const light = parseColour(lighten(v.rig.accent, 0.6)), soft = parseColour(lighten(v.rig.accent, 0.5));
    if (g.slash) {
      const s = g.slash;
      this.drawEffect(S, cw, ch, 1, [s.cx, s.cy, s.r0, s.r1], [s.a0, s.a1, 0, 0], light, accent, s.alpha * fx.opacity,
        [s.cx - s.r1 - 4, s.cy - s.r1 - 4, s.cx + s.r1 + 4, s.cy + s.r1 + 4]);
    }
    if (g.ring) {
      const r = g.ring;
      this.drawEffect(S, cw, ch, 2, [r.cx, r.cy, r.r, 0], [0, 0, 0, 0], soft, soft, r.alpha * fx.opacity, [r.cx - r.r - 6, r.cy - r.r - 6, r.cx + r.r + 6, r.cy + r.r + 6]);
      if (r.core > 0.3) this.drawEffect(S, cw, ch, 3, [r.cx, r.cy, r.core, 0], [0, 0, 0, 0], [1, 1, 1, 1], soft, fx.opacity, [r.cx - r.core - 8, r.cy - r.core - 8, r.cx + r.core + 8, r.cy + r.core + 8]);
    }
    if (g.orb) {
      const o = g.orb;
      if (v.rig.projectile === 'arrow') {
        this.drawEffect(S, cw, ch, 4, [o.cx, o.cy, o.angle, 0], [0, 0, 0, 0], parseColour(lighten(v.rig.accent, 0.3)), accent, o.alpha * fx.opacity, [o.cx - 14, o.cy - 14, o.cx + 14, o.cy + 14]);
      } else {
        this.drawEffect(S, cw, ch, 3, [o.cx, o.cy, o.r, 0], [0, 0, 0, 0], soft, accent, o.alpha * fx.opacity, [o.cx - o.r - 9, o.cy - o.r - 9, o.cx + o.r + 9, o.cy + o.r + 9]);
      }
    }
  }

  private drawEffect(S: Matrix, cw: number, ch: number, type: number, p: number[], q: number[], c1: number[], c2: number[], alpha: number, box: number[]) {
    const gl = this.gl, u = this.fu;
    gl.useProgram(this.effect);
    gl.uniform4f(u.uM0, S[0], S[2], S[4], 0);
    gl.uniform4f(u.uM1, S[1], S[3], S[5], 0);
    gl.uniform4fv(u.uBox, box);
    gl.uniform2f(u.uCanvas, cw, ch);
    gl.uniform1i(u.uType, type);
    gl.uniform4fv(u.uP, p);
    gl.uniform4fv(u.uQ, q);
    gl.uniform4fv(u.uColour, c1);
    gl.uniform4fv(u.uColour2, c2);
    gl.uniform1f(u.uAlpha, alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.useProgram(this.piece);
  }
}

/** `?render=svg` in the URL forces the old renderers, to compare on a device. */
export const forceSvg = () => new URLSearchParams(location.search).get('render') === 'svg';

/** Live stages, drawn once per frame after the sprites tick. */
export const stages = new Set<PuppetStage>();
