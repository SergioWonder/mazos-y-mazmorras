// Dado d20 (icosaedro) en 3D real con WebGL: rueda y rebota por la pantalla
// y aterriza mostrando el resultado. El número se superpone en HTML (legible);
// el icosaedro es la floritura 3D. Si no hay WebGL, cae a una versión simple.

// ── Álgebra mínima de matrices 4×4 (column-major, como espera WebGL) ─────────
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
function rotacion(angulo: number, ejeX: number, ejeY: number, ejeZ: number): Mat4 {
  const len = Math.hypot(ejeX, ejeY, ejeZ) || 1;
  const x = ejeX / len, y = ejeY / len, z = ejeZ / len;
  const s = Math.sin(angulo), c = Math.cos(angulo), t = 1 - c;
  return new Float32Array([
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ]);
}
function escala(s: number): Mat4 {
  const m = identidad();
  m[0] = s; m[5] = s; m[10] = s;
  return m;
}

// ── Geometría del icosaedro (caras planas: cada vértice con la normal de su cara) ─
function geometriaIcosaedro(): { pos: Float32Array; nor: Float32Array } {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l] as [number, number, number];
  });
  const caras = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const pos: number[] = [];
  const nor: number[] = [];
  for (const [ia, ib, ic] of caras) {
    const a = v[ia], b = v[ib], c = v[ic];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(nx, ny, nz);
    }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor) };
}

const VERTEX_SRC = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uProj;
uniform mat4 uMV;
varying vec3 vNor;
void main() {
  gl_Position = uProj * uMV * vec4(aPos, 1.0);
  vNor = mat3(uMV) * aNor;
}`;

const FRAGMENT_SRC = `
precision mediump float;
varying vec3 vNor;
uniform vec3 uColor;
void main() {
  vec3 N = normalize(vNor);
  vec3 L = normalize(vec3(0.45, 0.75, 0.85));
  float dif = max(dot(N, L), 0.0);
  float bordes = pow(1.0 - max(N.z, 0.0), 2.0) * 0.25; // realce de aristas
  vec3 col = uColor * (0.34 + 0.72 * dif) + bordes;
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
const COLOR_PIFIA: [number, number, number] = [0.75, 0.22, 0.16];

const RODAR_MS = 2600;   // rueda y rebota por la pantalla
const MANTENER_MS = 2100; // el resultado se queda a la vista

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Lanza el dado: anima un icosaedro 3D (WebGL) rodando por la pantalla y
 * resuelve cuando termina. `n` es el resultado a mostrar (1..caras).
 */
export function rodarDado(n: number, caras: number): Promise<void> {
  return new Promise((resolver) => {
    const overlay = document.createElement('div');
    overlay.className = 'dado3d-overlay';
    const canvas = document.createElement('canvas');
    const num = document.createElement('span');
    num.className = 'dado3d-num';
    overlay.append(canvas, num);
    document.body.appendChild(overlay);

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    const cerrar = () => {
      overlay.classList.add('dado3d-fuera');
      setTimeout(() => { overlay.remove(); resolver(); }, 320);
    };

    // Respaldo sin WebGL: solo el número girando un instante
    if (!gl) {
      num.classList.add('sin-gl');
      const flick = window.setInterval(() => {
        num.textContent = String(1 + Math.floor(Math.random() * caras));
      }, 90);
      setTimeout(() => {
        window.clearInterval(flick);
        num.textContent = String(n);
        if (n === caras) num.classList.add('critico');
        else if (n === 1) num.classList.add('pifia');
        setTimeout(cerrar, MANTENER_MS);
      }, 1200);
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VERTEX_SRC)!);
    gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)!);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const { pos, nor } = geometriaIcosaedro();
    const bufPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const bufNor = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, nor, gl.STATIC_DRAW);
    const aNor = gl.getAttribLocation(prog, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);

    const uProj = gl.getUniformLocation(prog, 'uProj');
    const uMV = gl.getUniformLocation(prog, 'uMV');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    gl.enable(gl.DEPTH_TEST);

    const DEPTH = 6;
    const FOV = (50 * Math.PI) / 180;
    const RADIO = Math.tan(FOV / 2) * DEPTH; // medio alto visible a esa profundidad

    let t0 = 0;
    let ultimoFlick = 0;
    let revelado = false;
    let color = COLOR_NORMAL;

    const dibujar = (proj: Mat4, x: number, y: number, ang: number, s: number) => {
      let mv = traslacion(x, y, -DEPTH);
      mv = multiplicar(mv, rotacion(ang, 1, 0.65, 0.35));
      mv = multiplicar(mv, escala(s));
      gl.uniformMatrix4fv(uProj, false, proj);
      gl.uniformMatrix4fv(uMV, false, mv);
      gl.uniform3fv(uColor, color);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
    };

    const frame = (ts: number) => {
      if (!t0) t0 = ts;
      const e = ts - t0;

      // tamaño del lienzo (con densidad de píxel)
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
        // parpadeo de números mientras rueda
        if (e - ultimoFlick > 90) {
          ultimoFlick = e;
          num.textContent = String(1 + Math.floor(Math.random() * caras));
        }
        const p = e / RODAR_MS;            // 0..1
        const k = 1 - easeOut(p);          // amplitud que decae hacia el centro
        // espiral que rebota por la pantalla y converge al centro
        const x = halfW * 0.8 * k * Math.cos(p * Math.PI * 3.2);
        const y = RADIO * 0.7 * k * Math.sin(p * Math.PI * 4.4);
        const ang = easeOut(p) * Math.PI * 12; // muchas vueltas, frenando
        const s = 1.0 + 0.25 * (1 - k);
        dibujar(proj, x, y, ang, s);
      } else {
        if (!revelado) {
          revelado = true;
          num.textContent = String(n);
          num.classList.add('revelado');
          if (n === caras) { color = COLOR_CRITICO; num.classList.add('critico'); }
          else if (n === 1) { color = COLOR_PIFIA; num.classList.add('pifia'); }
        }
        // reposa centrado girando muy despacio
        const ang = Math.PI * 12 + (e - RODAR_MS) * 0.0006;
        dibujar(proj, 0, 0, ang, 1.25);
      }

      if (e < RODAR_MS + MANTENER_MS) requestAnimationFrame(frame);
      else cerrar();
    };
    requestAnimationFrame(frame);
  });
}
