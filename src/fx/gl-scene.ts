// Small WebGL helpers shared by the 3D dice and the 3D coin: column-major 4×4
// matrices, a camera fitted to a rectangle of the table, and shader compilation.

import type { Quat, Vec3, RollBox } from './d20-physics.ts';

// ── 4×4 matrices (column-major) ──────────────────────────────────────────────
export type Mat4 = Float32Array;

export function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
export function lookAt(eye: Vec3, target: Vec3): Mat4 {
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
export function modelMatrix(q: Quat, x: Vec3): Mat4 {
  const [a, b, c, w] = q;
  return new Float32Array([
    1 - 2 * (b * b + c * c), 2 * (a * b + w * c), 2 * (a * c - w * b), 0,
    2 * (a * b - w * c), 1 - 2 * (a * a + c * c), 2 * (b * c + w * a), 0,
    2 * (a * c + w * b), 2 * (b * c - w * a), 1 - 2 * (a * a + b * b), 0,
    x[0], x[1], x[2], 1,
  ]);
}
export const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

export function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('shader:', gl.getShaderInfoLog(s)); return null; }
  return s;
}
export function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const v = compile(gl, gl.VERTEX_SHADER, vs), f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}


/** Camera looking down at `pitch` onto the table, as close as it can get while the
 *  play area (plus a margin) stays on screen. */
export function fitTableCamera(box: RollBox, aspect: number, fov: number, pitch: number, margin = 1.2, height = 0): { proj: Mat4; view: Mat4; eye: Vec3 } {
  const proj = perspective(fov, aspect, 0.1, 100);
  const target: Vec3 = [0, 0, 0.3];
  const pts: Vec3[] = [];
  for (const x of [box.minX - margin, box.maxX + margin]) for (const z of [box.minZ - margin, box.maxZ + margin]) pts.push([x, 0, z]);
  // something flying up to `height` (plus its own size) must stay on screen too; it peaks
  // over the middle of the table, never over its corners
  if (height > 0) {
    const mx = (box.maxX - box.minX) * 0.3, mz = (box.maxZ - box.minZ) * 0.2, cx = (box.minX + box.maxX) / 2, cz = (box.minZ + box.maxZ) / 2;
    for (const x of [cx - mx, cx + mx]) for (const z of [cz - mz, cz + mz]) pts.push([x, height + 1, z]);
  }
  let eye: Vec3 = [0, 10, 6], view = lookAt(eye, target);
  for (let d = 5; d < 60; d += 0.25) {
    eye = [0, target[1] + d * Math.sin(pitch), target[2] + d * Math.cos(pitch)];
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
  return { proj, view, eye };
}

/** Screen position (CSS px) and clip w of a world point. */
export function projectToScreen(proj: Mat4, view: Mat4, p: Vec3, cssW: number, cssH: number): [number, number, number] {
  const m = mul(proj, view);
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [(x / w * 0.5 + 0.5) * cssW, (1 - (y / w * 0.5 + 0.5)) * cssH, w];
}

/** Dust puffs (and a flash on the last knock) where a die or a coin hits the table. */
export function tableDust(overlay: HTMLElement, sx: number, sy: number, strength: number, flash: boolean): void {
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
}
