// WebGL2 particle renderer: one instanced draw per frame. Each particle is a
// quad whose fragment shader draws its shape as a distance field, with the glow
// computed in the shader instead of canvas 2D shadowBlur (very slow on mobile).

import { particleAlpha, type Particle, type ParticleShape } from './particle-sim.ts';
import { parseColour } from './puppet-gpu.ts';

const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aPos;     // x, y, size, angle (px, radians)
layout(location = 2) in vec4 aColour;  // rgb, alpha
layout(location = 3) in vec2 aKind;    // shape, glow
uniform vec2 uCanvas;
uniform float uDpr;
out vec2 vQ;
out vec4 vColour;
flat out int vShape;
flat out float vGlow;
void main() {
  float ext = aKind.y > 0.5 ? 5.0 : 2.4;   // quad half-size in particle units
  vec2 q = (aCorner * 2.0 - 1.0) * ext;
  float c = cos(aPos.w), s = sin(aPos.w);
  vec2 off = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * aPos.z;
  vec2 px = (aPos.xy + off) * uDpr;
  gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0);
  vQ = q;
  vColour = aColour;
  vShape = int(aKind.x);
  vGlow = aKind.y;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vQ;
in vec4 vColour;
flat in int vShape;
flat in float vGlow;
out vec4 outColour;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdHeart(vec2 p) {
  p = vec2(abs(p.x), -p.y * 0.9 + 0.55) / 1.1;
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)), dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
void main() {
  vec2 p = vQ;
  float d;
  if (vShape == 0) d = length(p) - 1.0;
  else if (vShape == 1) d = sdBox(p, vec2(1.8, 0.35));
  else if (vShape == 2) d = length(p / vec2(1.4, 0.6)) * 0.6 - 0.6;
  else if (vShape == 3) d = min(sdBox(p, vec2(2.0, 0.25)), sdBox(p, vec2(0.25, 2.0)));
  else d = sdHeart(p * 0.9);
  float aa = max(fwidth(d), 1e-3);
  float core = clamp(0.5 - d / aa, 0.0, 1.0);
  float a = core;
  float additive = 0.0;
  if (vGlow > 0.5) {
    a = core + (1.0 - core) * exp(-max(d, 0.0) / 1.2) * 0.6;
    additive = 1.0;
  }
  a *= vColour.a;
  if (a <= 0.003) discard;
  outColour = vec4(vColour.rgb * a, a * (1.0 - additive));
}`;

const SHAPE_CODE: Record<ParticleShape, number> = { circulo: 0, chispa: 1, hoja: 2, estrella: 3, corazon: 4 };
const FLOATS = 10;

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
    attr(3, 2, 8);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private colour(c: string) {
    let v = this.colours.get(c);
    if (!v) { v = parseColour(c); this.colours.set(c, v); }
    return v;
  }

  render(list: Particle[], width: number, height: number, dpr: number) {
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
      d[o + 8] = SHAPE_CODE[p.shape]; d[o + 9] = p.glow ? 1 : 0;
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
