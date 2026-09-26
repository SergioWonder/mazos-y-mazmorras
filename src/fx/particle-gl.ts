// WebGL2 particle renderer: one instanced draw per frame. Each particle is a
// quad whose fragment shader draws its shape as a distance field, with the glow
// computed in the shader instead of canvas 2D shadowBlur (very slow on mobile).

import { particleAlpha, type Sprite, type ParticleShape } from './particle-sim.ts';
import { parseColour } from './puppet-gpu.ts';

const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aPos;     // x, y, size, angle (px, radians)
layout(location = 2) in vec4 aColour;  // rgb, alpha
layout(location = 3) in vec4 aKind;    // shape, glow, stretch, param
uniform vec2 uCanvas;
uniform float uDpr;
out vec2 vQ;
out vec4 vColour;
flat out int vShape;
flat out float vGlow;
flat out float vStretch;
flat out float vParam;
flat out float vSize;
void main() {
  int shape = int(aKind.x);
  vec2 q;
  if (shape < 5) {
    // particles: wide glow quad; spell sprites (param < 0) glow over fixed pixels
    float ext = aKind.y > 0.5 ? (aKind.w < 0.0 ? 2.4 + 22.0 / max(aPos.z, 0.5) : 5.0) : 2.4;
    q = (aCorner * 2.0 - 1.0) * ext;
  } else {
    // spell shapes: stretched ones reach stretch units on x (arcs use it as thickness)
    // pad in pixels (glow halo, antialiasing) converted to shape units
    float pad = (aKind.y > 0.5 ? 22.0 : 2.0) / max(aPos.z, 0.5);
    if (shape == 14) pad = max(pad, 0.9);   // the beam's soft falloff
    float sx = (shape == 5 || shape == 6 || shape == 7 || shape == 11 || shape == 14) ? aKind.z : 1.0;
    q = (aCorner * 2.0 - 1.0) * vec2(sx + pad, 1.0 + pad);
  }
  float c = cos(aPos.w), s = sin(aPos.w);
  vec2 off = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * aPos.z;
  vec2 px = (aPos.xy + off) * uDpr;
  gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0);
  vQ = q;
  vColour = aColour;
  vShape = shape;
  vGlow = aKind.y;
  vStretch = aKind.z;
  vParam = aKind.w;
  vSize = aPos.z * uDpr;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vQ;
in vec4 vColour;
flat in int vShape;
flat in float vGlow;
flat in float vStretch;
flat in float vParam;
flat in float vSize;
out vec4 outColour;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdHeart(vec2 p) {
  p = vec2(abs(p.x), -p.y * 0.9 + 0.55) / 1.1;
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)), dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
float sdTri(vec2 p) {
  const float k = 1.7320508;
  p.x = abs(p.x) - 1.0; p.y = p.y + 1.0 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0, 0.0);
  return -length(p) * sign(p.y);
}
float sdHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h, a = sqrt(1.0 - b * b), k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}
void main() {
  vec2 p = vQ;
  float d;
  float fill = 0.0;   // extra interior opacity (shield, bubble)
  if (vShape >= 5) {
    float S = vStretch;
    if (vShape == 5) {            // capsule, taper 1 = lens
      float L = max(S - 1.0, 0.0), cx = clamp(p.x, -L, L), t = L > 0.0 ? cx / L : 0.0;
      d = length(vec2(p.x - cx, p.y)) - (1.0 - vParam * t * t * 0.92);
    } else if (vShape == 6) {     // fang: wide base at -x, tip at +x
      float L = max(S - 1.0, 0.0), cx = clamp(p.x, -L, L), t = L > 0.0 ? (cx + L) / (2.0 * L) : 0.0;
      d = length(vec2(p.x - cx, p.y)) - mix(1.0, 0.06, t);
    } else if (vShape == 7) {     // elliptic ring (radius 1 on y, S on x), thickness param
      vec2 q = vec2(p.x / S, p.y);
      d = abs(length(q) - 1.0 + vParam) - vParam;
    } else if (vShape == 8) {     // arc: thickness S, half-span param around +x
      float rd = abs(length(p) - 1.0 + S) - S;
      d = max(rd, (abs(atan(p.y, p.x)) - vParam) * length(p));
    } else if (vShape == 9) {     // crescent
      d = max(length(p) - 1.0, -(length(p - vec2(vParam, -vParam * 0.2)) - 0.92));
    } else if (vShape == 10) {    // hexagram rune in a circle
      d = abs(length(p) - 0.9) - 0.05;
      d = min(d, abs(sdTri(p / 0.62) * 0.62) - 0.04);
      d = min(d, abs(sdTri(-p / 0.62) * 0.62) - 0.04);
      d = min(d, abs(length(p) - 0.22) - 0.04);
    } else if (vShape == 11) {    // hex shield, squashed on x by S
      vec2 q = vec2(p.x / S, p.y);
      float h = sdHex(q.yx, 0.85);
      d = abs(h) - 0.05;
      if (h < 0.0) fill = 0.32 + 0.55 * exp(h * 7.0);
    } else if (vShape == 12) {    // teardrop, tip up
      d = sdUnevenCapsule(vec2(p.x, 0.4 - p.y), 0.6, 0.04, 1.4);
    } else if (vShape == 13) {    // bubble
      float l = length(p);
      d = abs(l - 0.92) - 0.08;
      if (l < 1.0) fill = 0.14 + 0.9 * exp(-dot(p - vec2(-0.4, -0.4), p - vec2(-0.4, -0.4)) * 25.0);
    } else if (vShape == 14) {    // beam: soft light, alpha computed directly
      float ends = 1.0 - smoothstep(S - 1.0, S, abs(p.x));
      float a = (exp(-p.y * p.y * 2.5) * 0.7 + exp(-p.y * p.y * 25.0) * 0.6) * ends * vColour.a;
      if (a <= 0.003) discard;
      outColour = vec4(vColour.rgb * a, 0.0);
      return;
    } else if (vShape == 16) {    // soft disc (spell dots: pixel-sized glow)
      d = length(p) - 1.0;
    } else {                      // skull
      d = min(length(p - vec2(0.0, -0.15)) - 0.72, sdBox(p - vec2(0.0, 0.55), vec2(0.38, 0.3)));
      d = max(d, -(length(p - vec2(-0.3, -0.1)) - 0.2));
      d = max(d, -(length(p - vec2(0.3, -0.1)) - 0.2));
      d = max(d, -sdTri(vec2(p.x, 0.42 - p.y) / 0.1) * 0.1);
      d = max(d, -sdBox(p - vec2(0.0, 0.72), vec2(0.02, 0.14)));
      d = max(d, -sdBox(p - vec2(-0.16, 0.72), vec2(0.02, 0.14)));
      d = max(d, -sdBox(p - vec2(0.16, 0.72), vec2(0.02, 0.14)));
    }
  }
  else if (vShape == 0) d = length(p) - 1.0;
  else if (vShape == 1) d = sdBox(p, vec2(1.8, 0.35));
  else if (vShape == 2) d = length(p / vec2(1.4, 0.6)) * 0.6 - 0.6;
  else if (vShape == 3) d = min(sdBox(p, vec2(2.0, 0.25)), sdBox(p, vec2(0.25, 2.0)));
  else d = sdHeart(p * 0.9);
  float aa = max(fwidth(d), 1e-3);
  float core = max(clamp(0.5 - d / aa, 0.0, 1.0), fill);
  float a = core;
  float additive = 0.0;
  if (vGlow > 0.5) {
    // spell shapes glow over a fixed pixel radius, whatever their size
    float halo = (vShape >= 5 || vParam < 0.0) ? exp(-max(d, 0.0) * vSize / 6.0) * 0.55 : exp(-max(d, 0.0) / 1.2) * 0.6;
    a = core + (1.0 - core) * halo;
    additive = 1.0;
  }
  a *= vColour.a;
  if (a <= 0.003) discard;
  outColour = vec4(vColour.rgb * a, a * (1.0 - additive));
}`;

const SHAPE_CODE: Record<ParticleShape, number> = {
  circulo: 0, chispa: 1, hoja: 2, estrella: 3, corazon: 4,
  capsula: 5, colmillo: 6, anillo: 7, arco: 8, 'media-luna': 9, runa: 10, escudo: 11, gota: 12, burbuja: 13, haz: 14, calavera: 15, disco: 16,
};
const FLOATS = 12;

export class ParticleRendererGL {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly program: WebGLProgram;
  private readonly instances: WebGLBuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly uCanvas: WebGLUniformLocation | null;
  private readonly uDpr: WebGLUniformLocation | null;
  private data = new Float32Array(256 * FLOATS);
  private readonly colours = new Map<string, [number, number, number, number]>();
  private wasEmpty = false;

  /** Returns null when WebGL2 is not available on this canvas. */
  static create(canvas: HTMLCanvasElement): ParticleRendererGL | null {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return null;
    try { return new ParticleRendererGL(canvas, gl); } catch (e) { console.warn('WebGL particles unavailable', e); return null; }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    this.program = p;
    this.uCanvas = gl.getUniformLocation(p, 'uCanvas');
    this.uDpr = gl.getUniformLocation(p, 'uDpr');
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instances = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
    const stride = FLOATS * 4;
    const attr = (loc: number, size: number, offset: number) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
      gl.vertexAttribDivisor(loc, 1);
    };
    attr(1, 4, 0);
    attr(2, 4, 4);
    attr(3, 4, 8);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private colour(c: string) {
    let v = this.colours.get(c);
    if (!v) { v = parseColour(c); this.colours.set(c, v); }
    return v;
  }

  render(list: Sprite[], width: number, height: number, dpr: number) {
    const gl = this.gl;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.wasEmpty = false; }
    // nothing to draw and already cleared: skip the frame entirely
    if (list.length === 0 && this.wasEmpty) return;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.wasEmpty = list.length === 0;
    if (!list.length) return;
    if (this.data.length < list.length * FLOATS) this.data = new Float32Array(list.length * FLOATS * 2);
    const d = this.data;
    list.forEach((p, i) => {
      const o = i * FLOATS, c = this.colour(p.colour);
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.size; d[o + 3] = p.angle;
      d[o + 4] = c[0]; d[o + 5] = c[1]; d[o + 6] = c[2]; d[o + 7] = particleAlpha(p) * c[3];
      d[o + 8] = SHAPE_CODE[p.shape]; d[o + 9] = p.glow ? 1 : 0; d[o + 10] = p.stretch ?? 1; d[o + 11] = p.param ?? 0;
    });
    gl.useProgram(this.program);
    gl.uniform2f(this.uCanvas, w, h);
    gl.uniform1f(this.uDpr, dpr);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
    gl.bufferData(gl.ARRAY_BUFFER, d.subarray(0, list.length * FLOATS), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
  }
}
