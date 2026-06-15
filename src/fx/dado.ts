// Dado d20 (icosaedro) en 3D real con WebGL: cada cara lleva su número grabado
// (textura), rueda y rebota por la pantalla y aterriza con el resultado mirando
// a la cámara. Sin dependencias. Si no hay WebGL, cae a una versión simple.

// ── Matrices 4×4 (column-major) ──────────────────────────────────────────────
type Mat4 = Float32Array;

function identidad(): Mat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
function multiplicar(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function perspectiva(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}
function traslacion(x: number, y: number, z: number): Mat4 {
  const m = identidad();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
function escala(s: number): Mat4 {
  const m = identidad();
  m[0] = s; m[5] = s; m[10] = s;
  return m;
}

// ── Cuaterniones (para girar y aterrizar en una cara concreta) ───────────────
type Quat = [number, number, number, number]; // x, y, z, w

function qNorm(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
function qMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
function qAxis(x: number, y: number, z: number, ang: number): Quat {
  const l = Math.hypot(x, y, z) || 1;
  const s = Math.sin(ang / 2);
  return [(x / l) * s, (y / l) * s, (z / l) * s, Math.cos(ang / 2)];
}
function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb: Quat = b;
  if (dot < 0) { bb = [-b[0], -b[1], -b[2], -b[3]]; dot = -dot; }
  if (dot > 0.9995) {
    return qNorm([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t]);
  }
  const th = Math.acos(dot), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
}
/** Cuaternión que lleva el vector unitario v hasta (0,0,1) — cara mirando a cámara. */
function qHaciaCamara(v: [number, number, number]): Quat {
  const z: [number, number, number] = [0, 0, 1];
  const dot = v[0] * z[0] + v[1] * z[1] + v[2] * z[2];
  if (dot > 0.9999) return [0, 0, 0, 1];
  if (dot < -0.9999) return [0, 1, 0, 0]; // 180° sobre Y
  const cx = v[1] * z[2] - v[2] * z[1];
  const cy = v[2] * z[0] - v[0] * z[2];
  const cz = v[0] * z[1] - v[1] * z[0];
  return qNorm([cx, cy, cz, 1 + dot]);
}
function qToMat4(q: Quat): Mat4 {
  const [x, y, z, w] = q;
  return new Float32Array([
    1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y), 0,
    2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x), 0,
    2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ]);
}

// ── Geometría del icosaedro: posiciones, normales por cara, UV y normal de cada cara ─
const COLS = 5, FILAS = 4, TEX = 512;

function geometria() {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l] as [number, number, number]; });
  const caras = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const normalCara: [number, number, number][] = [];
  const cw = TEX / COLS, ch = TEX / FILAS;
  const aUV = (px: number, py: number): [number, number] => [px / TEX, 1 - py / TEX];
  caras.forEach(([ia, ib, ic], idx) => {
    const a = v[ia], b = v[ib], c = v[ic];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    normalCara.push([nx, ny, nz]);
    const col = idx % COLS, fila = Math.floor(idx / COLS);
    const x0 = col * cw, y0 = fila * ch;
    const triUV: [number, number][] = [
      aUV(x0 + cw * 0.5, y0 + ch * 0.16),
      aUV(x0 + cw * 0.12, y0 + ch * 0.9),
      aUV(x0 + cw * 0.88, y0 + ch * 0.9),
    ];
    [a, b, c].forEach((p, k) => {
      pos.push(p[0], p[1], p[2]);
      nor.push(nx, ny, nz);
      uv.push(triUV[k][0], triUV[k][1]);
    });
  });
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), normalCara };
}

/** Textura con los 20 números, uno por celda de la rejilla 5×4. */
function crearTextura(gl: WebGLRenderingContext): WebGLTexture | null {
  const cw = TEX / COLS, ch = TEX / FILAS;
  const cv = document.createElement('canvas');
  cv.width = TEX; cv.height = TEX;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, TEX, TEX);
  c.fillStyle = '#241a08';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `bold ${Math.round(ch * 0.3)}px Georgia, "Times New Roman", serif`;
  for (let i = 0; i < 20; i++) {
    const col = i % COLS, fila = Math.floor(i / COLS);
    const x0 = col * cw, y0 = fila * ch;
    const cx = (x0 + cw * 0.5 + x0 + cw * 0.12 + x0 + cw * 0.88) / 3;
    const cy = (y0 + ch * 0.16 + y0 + ch * 0.9 + y0 + ch * 0.9) / 3;
    c.fillText(String(i + 1), cx, cy);
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

const VERTEX_SRC = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aUV;
uniform mat4 uProj;
uniform mat4 uMV;
varying vec3 vNor;
varying vec2 vUV;
void main() {
  gl_Position = uProj * uMV * vec4(aPos, 1.0);
  vNor = mat3(uMV) * aNor;
  vUV = aUV;
}`;

const FRAGMENT_SRC = `
precision mediump float;
varying vec3 vNor;
varying vec2 vUV;
uniform vec3 uColor;
uniform sampler2D uTex;
void main() {
  vec3 N = normalize(vNor);
  vec3 L = normalize(vec3(0.45, 0.75, 0.85));
  float dif = max(dot(N, L), 0.0);
  vec3 base = uColor * (0.4 + 0.7 * dif);
  vec4 tx = texture2D(uTex, vUV); // dígito oscuro sobre alfa
  vec3 col = mix(base, vec3(0.12, 0.09, 0.04) * (0.5 + 0.7 * dif), tx.a);
  gl_FragColor = vec4(col, 1.0);
}`;

function compilar(gl: WebGLRenderingContext, tipo: number, src: string): WebGLShader | null {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

const COLOR_NORMAL: [number, number, number] = [0.92, 0.84, 0.58];
const COLOR_CRITICO: [number, number, number] = [1.0, 0.82, 0.3];
const COLOR_PIFIA: [number, number, number] = [0.78, 0.26, 0.18];

const RODAR_MS = 2600;
const MANTENER_MS = 2100;
const FIN_TUMBO = 0.74; // hasta aquí da tumbos; luego se orienta a la cara

function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
function suave(t: number): number { return t * t * (3 - 2 * t); }

/** Lanza el dado: icosaedro 3D rodando por la pantalla; aterriza con `n` de cara. */
export function rodarDado(n: number, caras: number): Promise<void> {
  return new Promise((resolver) => {
    const overlay = document.createElement('div');
    overlay.className = 'dado3d-overlay';
    const canvas = document.createElement('canvas');
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    const cerrar = () => {
      overlay.classList.add('dado3d-fuera');
      setTimeout(() => { overlay.remove(); resolver(); }, 320);
    };

    const gl = (canvas.getContext('webgl', { alpha: true }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      // Respaldo sin WebGL: número girando en el centro
      const num = document.createElement('span');
      num.className = 'dado3d-num sin-gl';
      overlay.appendChild(num);
      num.textContent = String(n);
      setTimeout(cerrar, MANTENER_MS);
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VERTEX_SRC)!);
    gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)!);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const { pos, nor, uv, normalCara } = geometria();
    const subir = (datos: Float32Array, nombre: string, tam: number) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, nombre);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, tam, gl.FLOAT, false, 0, 0);
    };
    subir(pos, 'aPos', 3);
    subir(nor, 'aNor', 3);
    subir(uv, 'aUV', 2);

    const tex = crearTextura(gl);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const uProj = gl.getUniformLocation(prog, 'uProj');
    const uMV = gl.getUniformLocation(prog, 'uMV');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
    gl.enable(gl.DEPTH_TEST);

    const DEPTH = 6;
    const FOV = (50 * Math.PI) / 180;
    const RADIO = Math.tan(FOV / 2) * DEPTH;

    // Cara con el número n (índice n-1) → orientación que la deja mirando a cámara
    const qDestino = qHaciaCamara(normalCara[Math.min(n, caras) - 1] ?? [0, 0, 1]);
    // Orientación libre justo antes de empezar a corregir
    const qTumbo = (p: number): Quat =>
      qMul(qAxis(0.3, 1, 0.2, easeOut(p) * Math.PI * 9), qAxis(1, 0.25, 0.5, easeOut(p) * Math.PI * 7));
    const qFinTumbo = qTumbo(FIN_TUMBO);
    let color = COLOR_NORMAL;
    let estallado = false;

    const dibujar = (proj: Mat4, x: number, y: number, q: Quat, s: number) => {
      let mv = traslacion(x, y, -DEPTH);
      mv = multiplicar(mv, qToMat4(q));
      mv = multiplicar(mv, escala(s));
      gl.uniformMatrix4fv(uProj, false, proj);
      gl.uniformMatrix4fv(uMV, false, mv);
      gl.uniform3fv(uColor, color);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
    };

    let t0 = 0;
    const frame = (ts: number) => {
      if (!t0) t0 = ts;
      const e = ts - t0;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      const aspect = canvas.width / canvas.height;
      const proj = perspectiva(FOV, aspect, 0.1, 100);
      const halfW = RADIO * aspect;

      if (e < RODAR_MS) {
        const p = e / RODAR_MS;
        const k = 1 - easeOut(p);
        const x = halfW * 0.8 * k * Math.cos(p * Math.PI * 3.2);
        const y = RADIO * 0.7 * k * Math.sin(p * Math.PI * 4.4);
        const s = 1.05 + 0.2 * (1 - k);
        let q: Quat;
        if (p < FIN_TUMBO) {
          q = qTumbo(p);
        } else {
          // se orienta suavemente hasta dejar la cara del resultado de frente
          q = qSlerp(qFinTumbo, qDestino, suave((p - FIN_TUMBO) / (1 - FIN_TUMBO)));
        }
        dibujar(proj, x, y, q, s);
      } else {
        if (!estallado) {
          estallado = true;
          if (n === caras) color = COLOR_CRITICO;
          else if (n === 1) color = COLOR_PIFIA;
        }
        // reposa centrado, con la cara del resultado mirando a cámara (leve bob)
        const s = 1.28 + Math.sin((e - RODAR_MS) * 0.004) * 0.03;
        dibujar(proj, 0, 0, qDestino, s);
      }

      if (e < RODAR_MS + MANTENER_MS) requestAnimationFrame(frame);
      else cerrar();
    };
    requestAnimationFrame(frame);
  });
}
