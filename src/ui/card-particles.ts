// Living particles over full-art cards: motes drifting up and twinkles in the
// class colour. One small canvas per card, all driven by a shared loop that
// forgets cards once they leave the page.

interface Mote { x: number; y: number; vy: number; vx: number; r: number; life: number; max: number; star: boolean }
interface Layer { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; colour: string; motes: Mote[]; acc: number; seen: boolean; born: number }

const layers = new Set<Layer>();
let running = false;
let last = 0;

function spawn(l: Layer, w: number, h: number) {
  const star = Math.random() < 0.25;
  const max = star ? 0.6 + Math.random() * 0.6 : 1.8 + Math.random() * 1.6;
  l.motes.push({
    x: Math.random() * w, y: star ? Math.random() * h : h + 4,
    vx: (Math.random() - 0.5) * 6, vy: star ? 0 : -(10 + Math.random() * 22),
    r: star ? 1.6 + Math.random() * 1.6 : 0.8 + Math.random() * 1.5, life: max, max, star,
  });
}

function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  for (const l of layers) {
    // a card is only forgotten once it has been on the page and left it
    if (!l.canvas.isConnected) { if (l.seen || now - l.born > 3000) layers.delete(l); continue; }
    l.seen = true;
    const { ctx } = l, w = l.canvas.width, h = l.canvas.height;
    l.acc += dt * 14;
    while (l.acc >= 1) { l.acc -= 1; spawn(l, w, h); }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = l.colour;
    ctx.strokeStyle = '#fff8e0';
    for (let i = l.motes.length - 1; i >= 0; i--) {
      const m = l.motes[i];
      m.life -= dt;
      if (m.life <= 0) { l.motes.splice(i, 1); continue; }
      m.x += m.vx * dt; m.y += m.vy * dt;
      const t = m.life / m.max;
      if (m.star) {
        // four-point twinkle that swells and fades
        const s = m.r * 2.4 * Math.sin(t * Math.PI);
        ctx.globalAlpha = Math.sin(t * Math.PI);
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(m.x - s, m.y); ctx.lineTo(m.x + s, m.y); ctx.moveTo(m.x, m.y - s); ctx.lineTo(m.x, m.y + s); ctx.stroke();
      } else {
        ctx.globalAlpha = Math.min(1, t * 2) * 0.85;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.2, 0, Math.PI * 2);
        ctx.globalAlpha *= 0.25; ctx.fill();
        ctx.globalAlpha *= 4;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  if (layers.size) requestAnimationFrame(loop);
  else { running = false; last = 0; }
}

/** Starts the particle layer of a full-art card on its overlay canvas. */
export function animateCardParticles(canvas: HTMLCanvasElement, colour: string) {
  canvas.width = 148 * 1.5;
  canvas.height = 208 * 1.5;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  layers.add({ canvas, ctx, colour, motes: [], acc: 0, seen: false, born: performance.now() });
  if (!running) { running = true; requestAnimationFrame(loop); }
}
