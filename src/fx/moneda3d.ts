// 3D coin toss in WebGL, the sibling of the d20 (`dado.ts`): the coin is flicked onto
// the table, flips in the air, bounces, wobbles on its rim and falls flat on the
// side the engine already decided (seeded rigid-body toss in `coin-physics.ts`, with
// a constant compensation, so nothing turns after it rests). Look: struck gold with
// the relief of `coin-art.ts` (bump-mapped from a 16-bit height map), polished design
// on a satin field, patina in the recesses and a reeded edge. Without WebGL it
// returns false and draws nothing, so the caller can fall back to a simpler coin.

import { simulateToss, coinPoseAt, rotateVec, COIN_HALF_THICKNESS, type TossTrack, type Vec3, type Quat } from './coin-physics.ts';
import type { RollBox } from './d20-physics.ts';
import { coinAtlas } from './coin-art.ts';
import { audio } from './audio.ts';
import { modelMatrix, program, fitTableCamera, projectToScreen, tableDust, type Mat4 } from './gl-scene.ts';

const SEG = 128;
const FLAT_R = 0.955; // where the flat face ends and the bevel starts
const BEVEL = 0.024;

/** pos(3) nor(3) uv(2) side(1): side = 1 heads, −1 tails, 0 the reeded edge. */
function buildCoinMesh(): Float32Array {
  const H = COIN_HALF_THICKNESS;
  const data: number[] = [];
  const put = (p: Vec3, n: Vec3, side: number) => {
    // heads is seen from +y with the top of the drawing towards −z; tails from −y, mirrored in x
    const u = side > 0 ? 0.25 + 0.25 * p[0] : side < 0 ? 0.75 - 0.25 * p[0] : 0;
    const v = side !== 0 ? 0.5 + 0.5 * p[2] : 0;
    data.push(p[0], p[1], p[2], n[0], n[1], n[2], u, v, side);
  };
  const ring = (i: number): [number, number] => [Math.cos((i / SEG) * Math.PI * 2), Math.sin((i / SEG) * Math.PI * 2)];
  for (const s of [1, -1]) {
    const y = s * H, yb = s * (H - BEVEL);
    const up: Vec3 = [0, s, 0];
    for (let i = 0; i < SEG; i++) {
      const [c0, s0] = ring(i), [c1, s1] = ring(i + 1);
      // flat face
      put([0, y, 0], up, s); put([c0 * FLAT_R, y, s0 * FLAT_R], up, s); put([c1 * FLAT_R, y, s1 * FLAT_R], up, s);
      // bevel: the normal turns from the face towards the edge
      const nb0: Vec3 = [c0 * 0.8, s * 0.6, s0 * 0.8], nb1: Vec3 = [c1 * 0.8, s * 0.6, s1 * 0.8];
      const a: Vec3 = [c0 * FLAT_R, y, s0 * FLAT_R], b: Vec3 = [c1 * FLAT_R, y, s1 * FLAT_R];
      const a2: Vec3 = [c0, yb, s0], b2: Vec3 = [c1, yb, s1];
      put(a, up, s); put(a2, nb0, s); put(b2, nb1, s);
      put(a, up, s); put(b2, nb1, s); put(b, up, s);
    }
  }
  // the edge
  const yb = COIN_HALF_THICKNESS - BEVEL;
  for (let i = 0; i < SEG; i++) {
    const [c0, s0] = ring(i), [c1, s1] = ring(i + 1);
    const n0: Vec3 = [c0, 0, s0], n1: Vec3 = [c1, 0, s1];
    put([c0, yb, s0], n0, 0); put([c0, -yb, s0], n0, 0); put([c1, -yb, s1], n1, 0);
    put([c0, yb, s0], n0, 0); put([c1, -yb, s1], n1, 0); put([c1, yb, s1], n1, 0);
  }
  return new Float32Array(data);
}

const COIN_VS = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aUV;
attribute float aSide;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vObj;
varying vec3 vNObj;
varying vec3 vW;
varying vec2 vUV;
varying float vSide;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  gl_Position = uProj * uView * w;
  vObj = aPos;
  vNObj = aNor;
  vW = w.xyz;
  vUV = aUV;
  vSide = aSide;
}`;

const COIN_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vObj;
varying vec3 vNObj;
varying vec3 vW;
varying vec2 vUV;
varying float vSide;
uniform mat3 uRot;
uniform vec3 uCamW;
uniform vec3 uLight;
uniform float uRelief;
uniform float uGlow;
uniform sampler2D uTex;

float heightAt(vec2 uv) { vec4 t = texture2D(uTex, uv); return t.r * 0.99611 + t.g * 0.00389; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// warm studio: dark table below, bright ceiling, a key softbox and a rim light
vec3 env(vec3 r, float rough) {
  float w = 0.04 + rough * 0.5;
  vec3 c = mix(vec3(0.16, 0.14, 0.1), vec3(0.7, 0.62, 0.52), smoothstep(-0.35 - w, 0.55 + w, r.y));
  c += vec3(2.1, 1.95, 1.75) * smoothstep(0.93 - w, 0.985 - w * 0.5, dot(r, normalize(vec3(-0.45, 0.8, 0.4))));
  c += vec3(1.5, 1.1, 0.7) * smoothstep(0.9 - w, 0.97 - w * 0.5, dot(r, normalize(vec3(0.8, 0.35, -0.45))));
  c += vec3(0.5, 0.55, 0.65) * smoothstep(0.85 - w, 0.95, dot(r, normalize(vec3(0.1, 0.25, 1.0))));
  return c;
}

void main() {
  vec3 n = normalize(vNObj);
  float struck = 0.0, cav = 0.0, h = 0.0;
  vec3 np = n;
  if (abs(vSide) > 0.5) {
    vec2 du = vec2(1.0 / 2048.0, 0.0), dv = vec2(0.0, 1.0 / 1024.0);
    h = heightAt(vUV);
    float hu = heightAt(vUV + du) - heightAt(vUV - du);
    float hv = heightAt(vUV + dv) - heightAt(vUV - dv);
    float su = vSide > 0.0 ? 1.0 : -1.0;
    np = normalize(n - uRelief * (hu * vec3(su, 0.0, 0.0) + hv * vec3(0.0, 0.0, 1.0)));
    struck = texture2D(uTex, vUV).b;
    // recesses next to the relief gather patina
    float around = heightAt(vUV + du * 6.0) + heightAt(vUV - du * 6.0) + heightAt(vUV + dv * 6.0) + heightAt(vUV - dv * 6.0);
    cav = clamp((around * 0.25 - h) * 7.0, 0.0, 1.0);
  } else {
    // reeded edge: fine vertical ridges all round
    float a = atan(vObj.z, vObj.x) * 150.0;
    vec3 t = vec3(-n.z, 0.0, n.x);
    np = normalize(n + t * 0.55 * sin(a));
    cav = 0.35 * smoothstep(0.6, 1.0, -cos(a));
    struck = 0.6;
  }
  vec3 N = normalize(uRot * np);
  vec3 V = normalize(uCamW - vW);
  vec3 L = uLight;
  vec3 R = reflect(-V, N);
  float ndv = max(dot(N, V), 0.0);
  float nh = max(dot(N, normalize(L + V)), 0.0);
  float rough = mix(0.32, 0.08, struck);
  // a few tiny scratches and grain on the field
  float grain = hash(floor(vUV * 2048.0)) - 0.5;
  rough += grain * 0.05 * (1.0 - struck);

  vec3 gold = vec3(1.0, 0.76, 0.33);
  vec3 F = gold + (vec3(1.0) - gold) * pow(1.0 - ndv, 5.0);
  vec3 col = env(R, rough) * F;
  col += gold * 0.16 * max(dot(N, L), 0.0);
  col += mix(gold, vec3(1.0), 0.5) * pow(nh, mix(50.0, 260.0, struck)) * mix(0.6, 1.6, struck);
  // patina: brown-black in the recesses, a hint over the satin field
  col = mix(col, vec3(0.16, 0.09, 0.03), cav * 0.75 + (1.0 - struck) * 0.08);
  col *= 0.94 + grain * 0.06;
  col += vec3(1.0, 0.8, 0.35) * uGlow * (0.12 + 0.8 * pow(1.0 - ndv, 2.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const SHADOW_VS = `
attribute vec2 aCorner;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uCenter;
uniform vec2 uSize;
varying vec2 vC;
void main() {
  vC = aCorner;
  gl_Position = uProj * uView * vec4(uCenter + vec3(aCorner.x * uSize.x, 0.0, aCorner.y * uSize.y), 1.0);
}`;
const SHADOW_FS = `
precision mediump float;
varying vec2 vC;
uniform float uAlpha;
void main() {
  float r = length(vC);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha * pow(clamp(1.0 - r, 0.0, 1.0), 1.5));
}`;

const HOLD_MS = 1500;
const FADE_MS = 320;
const LIGHT: Vec3 = (() => { const l: Vec3 = [-0.35, 1, 0.45]; const k = Math.hypot(...l); return [l[0] / k, l[1] / k, l[2] / k]; })();
const PITCH = (70 * Math.PI) / 180;
const FOV = (36 * Math.PI) / 180;

interface DebugOptions { preserve?: boolean; timeScale?: number; seed?: number; freezeAt?: number }
const debugOptions = (): DebugOptions | null =>
  (typeof window !== 'undefined' && (window as unknown as { __monedaDebug?: DebugOptions }).__monedaDebug) || null;

let meshCache: Float32Array | null = null;

export interface CoinTexts { title: string; result: string }

/** Tosses the coin across the screen until it lands on `heads` (cara) or tails (cruz).
 *  Resolves true once the result has been shown and the overlay is gone; resolves
 *  false right away, without drawing anything, if WebGL is unavailable. With `still`
 *  (reduced motion) the coin is shown already lying on its side. `onRest` runs when it settles. */
export function tossCoin(heads: boolean, texts: CoinTexts, still = false, onRest?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const dbg = debugOptions();
    const canvas = document.createElement('canvas');
    const attrs: WebGLContextAttributes = { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: !!dbg?.preserve };
    const gl = (canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
    const coinProg = gl && program(gl, COIN_VS, COIN_FS);
    const shadowProg = gl && program(gl, SHADOW_VS, SHADOW_FS);
    if (!gl || !coinProg || !shadowProg) { resolve(false); return; }

    const overlay = document.createElement('div');
    overlay.className = 'dado3d-overlay moneda3d-overlay';
    overlay.setAttribute('role', 'status');
    const title = document.createElement('p');
    title.className = 'moneda3d-titulo';
    title.textContent = texts.title;
    overlay.append(canvas, title);
    document.body.appendChild(overlay);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.classList.add('dado3d-fuera');
      setTimeout(() => {
        if (!dbg) gl.getExtension('WEBGL_lose_context')?.loseContext();
        overlay.remove();
        resolve(true);
      }, FADE_MS);
    };

    // play area follows the screen shape, a little tighter than the dice: the coin is the star
    const aspect0 = window.innerWidth / Math.max(1, window.innerHeight);
    const hz = 1.75;
    const box: RollBox = aspect0 >= 1
      ? { minX: -Math.min(3, Math.max(2.3, hz * aspect0 * 0.95)), maxX: Math.min(3, Math.max(2.3, hz * aspect0 * 0.95)), minZ: -hz, maxZ: hz }
      : { minX: -1.9, maxX: 1.9, minZ: -Math.min(3.4, 1.9 / aspect0 * 0.8), maxZ: Math.min(3.4, 1.9 / aspect0 * 0.8) };
    const seed = dbg?.seed ?? Math.floor(Math.random() * 1e9);
    const track: TossTrack = simulateToss({ heads, seed, box });
    if (dbg) (window as unknown as { __monedaUltima?: unknown }).__monedaUltima = { track, box };

    // ── GPU resources ──
    const mesh = meshCache ?? (meshCache = buildCoinMesh());
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, coinAtlas());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const cu = {
      proj: U(coinProg, 'uProj'), view: U(coinProg, 'uView'), model: U(coinProg, 'uModel'), rot: U(coinProg, 'uRot'),
      camW: U(coinProg, 'uCamW'), light: U(coinProg, 'uLight'), relief: U(coinProg, 'uRelief'), glow: U(coinProg, 'uGlow'), tex: U(coinProg, 'uTex'),
    };
    const su = { proj: U(shadowProg, 'uProj'), view: U(shadowProg, 'uView'), center: U(shadowProg, 'uCenter'), size: U(shadowProg, 'uSize'), alpha: U(shadowProg, 'uAlpha') };
    const aPos = gl.getAttribLocation(coinProg, 'aPos'), aNor = gl.getAttribLocation(coinProg, 'aNor');
    const aUV = gl.getAttribLocation(coinProg, 'aUV'), aSide = gl.getAttribLocation(coinProg, 'aSide');
    const aCorner = gl.getAttribLocation(shadowProg, 'aCorner');

    // ── camera ──
    let proj: Mat4 = new Float32Array(16), view: Mat4 = new Float32Array(16), eye: Vec3 = [0, 10, 6];
    let cssW = 0, cssH = 0;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = window.innerWidth; cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      ({ proj, view, eye } = fitTableCamera(box, cssW / Math.max(1, cssH), FOV, PITCH));
    };
    fit();
    const project = (p: Vec3) => projectToScreen(proj, view, p, cssW, cssH);

    const drawShadow = (q: Quat, x: Vec3) => {
      const h = Math.max(0, x[1] - COIN_HALF_THICKNESS);
      // a coin on its edge casts a thin shadow: squash it along the axis it is tilted on
      const axis = rotateVec(q, [0, 1, 0]);
      const flat = Math.abs(axis[1]);
      gl.useProgram(shadowProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aCorner);
      gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(su.proj, false, proj);
      gl.uniformMatrix4fv(su.view, false, view);
      gl.uniform3f(su.center, x[0] - LIGHT[0] * h * 0.35 + 0.06, 0.002, x[2] - LIGHT[2] * h * 0.35 + 0.08);
      const base = 1.18 + h * 0.3;
      const squash = 0.35 + 0.65 * flat;
      gl.uniform2f(su.size, base * (Math.abs(axis[0]) > Math.abs(axis[2]) ? squash : 1), base * (Math.abs(axis[0]) > Math.abs(axis[2]) ? 1 : squash));
      gl.uniform1f(su.alpha, 0.6 / (1 + h * 0.5));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(aCorner);
    };
    const drawCoin = (q: Quat, x: Vec3, glow: number) => {
      gl.useProgram(coinProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      const stride = 9 * 4;
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(aSide); gl.vertexAttribPointer(aSide, 1, gl.FLOAT, false, stride, 32);
      const m = modelMatrix(q, x);
      gl.uniformMatrix4fv(cu.proj, false, proj);
      gl.uniformMatrix4fv(cu.view, false, view);
      gl.uniformMatrix4fv(cu.model, false, m);
      gl.uniformMatrix3fv(cu.rot, false, new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]));
      gl.uniform3fv(cu.camW, eye);
      gl.uniform3fv(cu.light, LIGHT);
      gl.uniform1f(cu.relief, 7.5);
      gl.uniform1f(cu.glow, glow);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(cu.tex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 9);
      gl.disableVertexAttribArray(aPos); gl.disableVertexAttribArray(aNor);
      gl.disableVertexAttribArray(aUV); gl.disableVertexAttribArray(aSide);
    };

    const render = (t: number, glow: number) => {
      const p = coinPoseAt(track, t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      drawShadow(p.q, p.x);
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      drawCoin(p.q, p.x, glow);
    };

    const showResult = () => {
      const x = coinPoseAt(track, track.duration).x;
      const [sx, sy] = project(x);
      const [, sy2] = project([x[0], x[1], x[2] + 1]);
      const px = Math.abs(sy2 - sy) || 60;
      const halo = document.createElement('span');
      halo.className = 'dado3d-halo critico';
      halo.style.left = `${sx}px`; halo.style.top = `${sy}px`;
      halo.style.setProperty('--r', `${Math.round(px * 3.6)}px`);
      overlay.insertBefore(halo, canvas);
      const label = document.createElement('span');
      label.className = 'dado3d-num dado3d-etiqueta revelado moneda3d-resultado';
      label.textContent = texts.result;
      label.style.left = `${sx}px`;
      label.style.top = `${Math.min(cssH - 30, sy + px * 1.5)}px`;
      overlay.appendChild(label);
      onRest?.();
    };

    if (still) {
      render(track.duration, 0.5);
      showResult();
      setTimeout(close, HOLD_MS);
      return;
    }

    const pending = track.impacts.slice();
    const lastImpact = track.impacts[track.impacts.length - 1];
    let knocks = 0, lastKnock = -1, shake = 0;
    const timeScale = dbg?.timeScale ?? 1;
    let t0 = 0, rested = false;
    const frame = (ts: number) => {
      if (closed) return;
      if (!t0) t0 = ts;
      let t = ((ts - t0) / 1000) * timeScale;
      if (dbg?.freezeAt !== undefined) t = Math.min(t, dbg.freezeAt);
      if (window.innerWidth !== cssW || window.innerHeight !== cssH) fit();

      // knocks on the table: a soft clink, a tiny shake, dust on the hard ones and the last
      while (pending.length && pending[0].t <= t) {
        const imp = pending.shift()!;
        if (knocks < 7 && imp.t - lastKnock > 0.05) {
          audio.sfx('bloqueo', Math.min(0.45, 0.08 + imp.strength / 32));
          knocks++; lastKnock = imp.t;
        }
        shake = Math.max(shake, Math.min(6, imp.strength * 0.35));
        if (imp === lastImpact || imp.strength > 9) {
          const [sx, sy] = project(imp.x);
          tableDust(overlay, sx, sy, imp.strength, imp === lastImpact);
        }
      }
      if (shake > 0.2) {
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
        shake *= 0.82;
      } else if (canvas.style.transform) {
        canvas.style.transform = '';
        shake = 0;
      }

      const done = t >= track.duration;
      render(t, done ? 0.45 : 0);
      if (dbg?.freezeAt !== undefined && t >= dbg.freezeAt && !done) return;
      if (done && !rested) {
        rested = true;
        canvas.style.transform = '';
        showResult();
        setTimeout(close, HOLD_MS / timeScale);
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
