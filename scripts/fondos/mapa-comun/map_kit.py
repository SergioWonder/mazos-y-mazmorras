"""Shared toolkit for the campaign-map backgrounds: an old D&D adventure map on parchment.

The pipeline has two halves:
  * paper   - numpy: aged parchment with mottling, crumple relief, folds, tea stains and
              darkened / burnt edges;
  * sketch  - SVG: sepia pen drawings (hatching, pines, mountains, rooms...) and very washed
              watercolour accents, rasterised at 2x with headless Chrome on white.
The sketch is laid over the paper with a multiply blend, faded down in the centre where the
map nodes will be drawn by the game UI.
"""
import math
import os
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SEPIA = (62, 40, 24)


def hexc(c):
    if isinstance(c, str):
        return c
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def P(points):
    return " ".join("%.1f,%.1f" % p for p in points)


def smooth_path(points, closed=False):
    """Catmull-Rom spline through points, as an SVG path string."""
    p = list(points)
    if len(p) < 3:
        return "M" + " L".join("%.1f,%.1f" % q for q in p)
    if closed:
        p = [p[-1]] + p + [p[0], p[1]]
    else:
        p = [p[0]] + p + [p[-1]]
    d = "M%.1f,%.1f" % p[1]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (c1 + c2 + p2)
    return d + (" Z" if closed else "")


# ---------------------------------------------------------------------------
# sketch (SVG)
# ---------------------------------------------------------------------------
class Sketch:
    def __init__(self, W, H, seed=1, ink=SEPIA):
        self.W, self.H = W, H
        self.rng = random.Random(seed)
        self.ink_col = hexc(ink)
        self.wash, self.ink, self.defs = [], [], []
        self._id = 0
        self.k = 1.5  # global pen weight (the map is shown scaled down)

    def uid(self, p="c"):
        self._id += 1
        return "%s%d" % (p, self._id)

    # --- raw ------------------------------------------------------------------
    def add(self, s):
        self.ink.append(s)

    def stroke(self, d, w=1.4, op=1.0, col=None, fill="none", cap="round", dash=None):
        extra = ' stroke-dasharray="%s"' % dash if dash else ""
        self.ink.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-opacity="%.2f" '
                        'stroke-linecap="%s" stroke-linejoin="round"%s/>'
                        % (d, fill, col or self.ink_col, w * self.k, op, cap, extra))

    def line(self, a, b, w=1.0, op=1.0):
        self.stroke("M%.1f,%.1f L%.1f,%.1f" % (a + b), w, op)

    def fill(self, d, col=None, op=1.0):
        self.ink.append('<path d="%s" fill="%s" fill-opacity="%.2f"/>' % (d, col or self.ink_col, op))

    def white(self, d):
        """Paper-coloured occluder (white is neutral under the multiply blend)."""
        self.ink.append('<path d="%s" fill="#fff"/>' % d)

    def poly(self, points, w=1.4, op=1.0, fill="none"):
        self.stroke("M" + " L".join("%.1f,%.1f" % q for q in points) + " Z", w, op, fill=fill)

    def circle(self, x, y, r, w=1.2, op=1.0, fill="none"):
        self.ink.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="%.2f" '
                        'stroke-opacity="%.2f"/>' % (x, y, r, fill, self.ink_col, w * self.k, op))

    def dot(self, x, y, r, op=1.0):
        self.ink.append('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="%s" fill-opacity="%.2f"/>'
                        % (x, y, r, self.ink_col, op))

    def text(self, x, y, s, size=14, op=0.9, anchor="middle", italic=True):
        self.ink.append('<text x="%.1f" y="%.1f" font-family="Georgia, serif" font-size="%.1f" %s '
                        'text-anchor="%s" fill="%s" fill-opacity="%.2f">%s</text>'
                        % (x, y, size, 'font-style="italic"' if italic else "", anchor, self.ink_col, op, s))

    def washblob(self, d, col, op=0.25):
        self.wash.append('<path d="%s" fill="%s" fill-opacity="%.2f"/>' % (d, hexc(col), op))

    def washellipse(self, x, y, rx, ry, col, op=0.2):
        self.wash.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" fill-opacity="%.2f"/>'
                         % (x, y, rx, ry, hexc(col), op))

    def washstroke(self, d, col, w, op=0.25):
        self.wash.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-opacity="%.2f" '
                         'stroke-linecap="round" stroke-linejoin="round"/>' % (d, hexc(col), w, op))

    # --- hatching -------------------------------------------------------------
    def hatch(self, clip_d, bbox, angle=45, spacing=5.0, w=0.8, op=0.85, jit=0.6, cross=False):
        """Parallel pen lines clipped to a shape."""
        cid = self.uid()
        self.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, clip_d))
        x0, y0, x1, y1 = bbox
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + 4
        out = []
        for ang in ([angle, angle + 90] if cross else [angle]):
            a = math.radians(ang)
            ux, uy = math.cos(a), math.sin(a)
            nx, ny = -uy, ux
            t = -R
            while t <= R:
                o = t + self.rng.uniform(-jit, jit)
                ax, ay = cx + nx * o - ux * R, cy + ny * o - uy * R
                bx, by = cx + nx * o + ux * R, cy + ny * o + uy * R
                out.append("M%.1f,%.1f L%.1f,%.1f" % (ax, ay, bx, by))
                t += spacing * self.rng.uniform(0.85, 1.15)
        self.ink.append('<g clip-path="url(#%s)"><path d="%s" fill="none" stroke="%s" stroke-width="%.2f" '
                        'stroke-opacity="%.2f" stroke-linecap="round"/></g>'
                        % (cid, " ".join(out), self.ink_col, w * self.k, op))

    # --- output ---------------------------------------------------------------
    def svg(self, scale=2, wobble=3.0):
        W, H = self.W, self.H
        return """<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">
<defs>
<filter id="pen" filterUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d">
  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="n1"/>
  <feDisplacementMap in="SourceGraphic" in2="n1" scale="%.1f" xChannelSelector="R" yChannelSelector="G" result="d1"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="1" seed="9" result="n2"/>
  <feDisplacementMap in="d1" in2="n2" scale="1.1" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="wash" filterUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d">
  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="2.5"/>
</filter>
%s
</defs>
<rect width="%d" height="%d" fill="#fff"/>
<g filter="url(#pen)">%s</g>
<g filter="url(#wash)" style="mix-blend-mode:multiply">%s</g>
</svg>""" % (W * scale, H * scale, W, H, W, H, wobble, W, H, "\n".join(self.defs), W, H,
             "\n".join(self.ink), "\n".join(self.wash))


def render(sketch, out_png, scale=2):
    html = out_png.replace(".png", ".html")
    with open(html, "w") as fh:
        fh.write('<html><body style="margin:0;background:#fff;overflow:hidden">%s</body></html>'
                 % sketch.svg(scale))
    W, H = sketch.W * scale, sketch.H * scale
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=%d,%d" % (W, H),
                    "--screenshot=%s" % out_png, "file://" + html],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600)
    img = Image.open(out_png).convert("RGB").resize((sketch.W, sketch.H), Image.LANCZOS)
    return to_f(img)


# ---------------------------------------------------------------------------
# numpy helpers
# ---------------------------------------------------------------------------
def to_f(img):
    return np.asarray(img).astype(np.float32) / 255.0


def from_f(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def value_noise(W, H, cell, rng, stretch=(1.0, 1.0)):
    gw = max(2, int(W / (cell * stretch[0])) + 2)
    gh = max(2, int(H / (cell * stretch[1])) + 2)
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    return np.asarray(im).astype(np.float32) / 255.0


def fbm(W, H, cell, rng, octaves=4, stretch=(1.0, 1.0)):
    acc, amp, tot = np.zeros((H, W), np.float32), 1.0, 0.0
    for _ in range(octaves):
        acc += amp * value_noise(W, H, cell, rng, stretch)
        tot += amp
        amp *= 0.5
        cell = max(2, cell / 2)
    return acc / tot


def blur(a, r):
    """Separable Gaussian blur in float precision (H, W) or (H, W, C)."""
    k = int(math.ceil(r * 3))
    t = np.arange(-k, k + 1, dtype=np.float32)
    g = np.exp(-(t / r) ** 2 / 2)
    g /= g.sum()
    out = a.astype(np.float32)
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (k, k)
        p = np.pad(out, pad, mode="edge")
        acc = np.zeros_like(out)
        n = out.shape[axis]
        for i, w in enumerate(g):
            acc += w * np.take(p, np.arange(i, i + n), axis=axis)
        out = acc
    return out


def radial(W, H, cx, cy, rx, ry=None):
    ry = ry or rx
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)


# ---------------------------------------------------------------------------
# parchment
# ---------------------------------------------------------------------------
def paper(W, H, rng, base=(224, 203, 163), folds_x=(0.5,), folds_y=(0.25, 0.5, 0.75), stains=9,
          edge=110, edge_dark=0.6, burn=0.0, holes=(), crumple=1.0, mottle=1.0, table=(20, 14, 10)):
    """Aged parchment as a float RGB array. `burn` (0..1) chars the border; `holes` are
    (x, y, r) burn holes in pixels."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    col = np.ones((H, W, 3), np.float32) * (np.array(base, np.float32) / 255.0)
    brown = np.array([0.42, 0.56, 0.78], np.float32)  # how much each channel darkens (warm)

    def darken(a, k=1.0):
        return 1 - np.clip(a, 0, 1)[..., None] * brown * k

    # mottling and fibres
    lf = fbm(W, H, 420, rng, 4) - 0.5
    mf = fbm(W, H, 80, rng, 3) - 0.5
    fib = value_noise(W, H, 3, rng, stretch=(9.0, 0.6)) - 0.5
    col *= darken(0.22 * mottle * (lf + 0.5) ** 2 * 2.2)
    col *= (1 + 0.035 * mottle * mf + 0.018 * fib)[..., None]

    # crumple relief: soft height field plus sharp ridges, lit from the top left
    ridge = 1 - np.abs(2 * fbm(W, H, 260, rng, 5) - 1)
    ridge2 = 1 - np.abs(2 * fbm(W, H, 120, rng, 4) - 1)
    h = 0.3 * fbm(W, H, 200, rng, 4) + 0.22 * ridge ** 6 + 0.14 * ridge2 ** 8
    h = blur(h, 1.2)
    gy, gx = np.gradient(h)
    shade = -(gx * 0.7 + gy * 0.7) * 9 * crumple
    col *= (1 + np.clip(shade, -0.06, 0.06))[..., None]
    col *= darken(0.10 * crumple * ridge ** 14)

    # folds: a crease line with a shadow side and a highlight side, and slightly tilted panels
    wob = fbm(W, H, 300, rng, 2) - 0.5
    for fx in folds_x:
        d = x - (fx * W + wob * 14)
        col *= darken(0.34 * np.exp(-(d / 1.3) ** 2) + 0.10 * np.exp(-(d / 7) ** 2) * (d < 0))
        col *= (1 + 0.05 * np.exp(-((d - 3) / 3) ** 2))[..., None]
        col *= (1 - 0.025 * np.tanh(d / 180))[..., None]
    for fy in folds_y:
        d = y - (fy * H + wob * 12)
        col *= darken(0.30 * np.exp(-(d / 1.3) ** 2) + 0.09 * np.exp(-(d / 7) ** 2) * (d < 0))
        col *= (1 + 0.045 * np.exp(-((d - 3) / 3) ** 2))[..., None]
    # worn dots where folds cross
    for fx in folds_x:
        for fy in folds_y:
            r = radial(W, H, fx * W, fy * H, 26)
            col *= darken(0.18 * np.exp(-r ** 2))

    # tea / coffee stains with a darker tide line
    for _ in range(stains):
        cx, cy = rng.uniform(-0.05, 1.05) * W, rng.uniform(-0.05, 1.05) * H
        rr = rng.uniform(40, 190)
        pert = (fbm(W, H, rr * 0.7, rng, 3) - 0.5) * 0.5
        dist = radial(W, H, cx, cy, rr, rr * rng.uniform(0.7, 1.2)) + pert
        inside = np.clip((1.02 - dist) * 3, 0, 1)
        tide = np.exp(-((dist - 1.0) / 0.035) ** 2) * (dist < 1.08)
        k = rng.uniform(0.35, 1.0)
        col *= darken(k * (0.10 * inside + 0.32 * tide))

    # darkened edges and burn
    n_edge = (fbm(W, H, 140, rng, 4) - 0.5)
    dmin = np.minimum(np.minimum(x, W - 1 - x), np.minimum(y, H - 1 - y)).astype(np.float32)
    d = dmin + n_edge * (70 + 40 * burn)
    col *= darken(edge_dark * np.clip(1 - d / edge, 0, 1) ** 1.8)
    char = np.zeros((H, W), np.float32)
    if burn > 0:
        bw = 8 + 14 * burn
        char = np.clip(1 - (d - 4) / bw, 0, 1) ** 1.3
    for (hx, hy, hr) in holes:
        pert = (fbm(W, H, hr * 0.8, rng, 3) - 0.5) * 0.7
        dist = radial(W, H, hx, hy, hr, hr * rng.uniform(0.7, 1.1)) + pert
        col *= darken(0.55 * np.clip((2.2 - dist) / 1.2, 0, 1) ** 2)
        char = np.maximum(char, np.clip((1.35 - dist) / 0.35, 0, 1))
        d = np.minimum(d, (dist - 1.0) * hr)
    charcol = np.array([0.16, 0.09, 0.05], np.float32)
    col = col * (1 - char[..., None]) + charcol * char[..., None]
    # paper gone entirely (outside the torn / burnt edge)
    gone = np.clip(-(d - 1.5) / 2.5, 0, 1)[..., None]
    col = col * (1 - gone) + (np.array(table, np.float32) / 255.0) * gone
    return np.clip(col, 0, 1)


# ---------------------------------------------------------------------------
# composition helpers
# ---------------------------------------------------------------------------
def clear_mask(W, H, box, soft=80, floor=0.3):
    """Ink strength: 1 in the margins, `floor` inside box=(x0, y0, x1, y1) (fractions)."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    x0, y0, x1, y1 = box[0] * W, box[1] * H, box[2] * W, box[3] * H
    dx = np.maximum(np.maximum(x0 - x, x - x1), 0)
    dy = np.maximum(np.maximum(y0 - y, y - y1), 0)
    inside = np.minimum(np.minimum(x - x0, x1 - x), np.minimum(y - y0, y1 - y))
    t = np.where((dx > 0) | (dy > 0), 0.0, np.clip(inside / soft, 0, 1))
    t = t * t * (3 - 2 * t)
    return (1 - t * (1 - floor)).astype(np.float32)


def compose(pap, ink, mask, rng, center_lift=0.0):
    """Multiply the sketch over the paper with dry-pen variation and a centre fade."""
    H, W, _ = pap.shape
    a = 1 - ink
    dry = 0.82 + 0.3 * value_noise(W, H, 5, rng)
    a = a * dry[..., None] * mask[..., None]
    a = 0.8 * a + 0.2 * blur(a, 0.9)  # slight ink bleed into the fibres
    out = pap * (1 - a)
    if center_lift:
        out = out * (1 + center_lift * (1 - mask)[..., None])
    return np.clip(out, 0, 1)


def grade(img, rng, vignette=0.35, grain=0.012):
    H, W, _ = img.shape
    r = radial(W, H, W / 2, H / 2, W * 0.75, H * 0.75)
    img = img * (1 - vignette * np.clip(r - 0.45, 0, 1)[..., None] ** 1.5)
    img = img + rng.normal(0, grain, (H, W, 1)).astype(np.float32)
    return np.clip(img, 0, 1)


def save_webp(img_f, path, max_kb, q_hi=84, q_lo=70):
    im = from_f(img_f)
    q = q_hi
    while True:
        im.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= max_kb or q <= q_lo:
            return q, kb
        q -= 2


def mockup(img_f, out_png, wide):
    """Review mock-up with node markers where the UI draws them (not delivered).

    tall: the image covers the 680x960 map canvas (width-fit, centred);
    wide: the image covers a 1920x1080 desktop with the 680px canvas centred."""
    im = from_f(img_f).convert("RGBA")
    W, H = im.size
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    rng = random.Random(3)
    rows = [rng.choice([2, 3, 4]) for _ in range(9)] + [1]
    if wide:
        cw, ch = 680, 960
        ox, oy = (W - cw) / 2, (H - ch) / 2
        k = 1.0
    else:
        k = W / 680.0
        cw, ch = W, 960 * k
        ox, oy = 0, (H - ch) / 2
        d.rectangle([0, 0, W, oy], fill=(255, 0, 0, 40))
        d.rectangle([0, oy + ch, W, H], fill=(255, 0, 0, 40))
    pos = []
    for f, n in enumerate(rows):
        pos.append([(ox + ((c + 0.5) / n * 80 + 10) / 100 * cw, oy + (90 - f / 9 * 82) / 100 * ch)
                    for c in range(n)])
    for f in range(9):
        for a in pos[f]:
            b = min(pos[f + 1], key=lambda q: abs(q[0] - a[0]))
            d.line([a, b], fill=(60, 30, 10, 150), width=int(3 * k))
    r = 29 * k
    for f, row in enumerate(pos):
        for (x, y) in row:
            rr = r * (1.5 if f == 9 else 1)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(40, 22, 12, 235), outline=(230, 190, 110, 255),
                      width=int(3 * k))
    if wide:
        d.rectangle([ox, oy, ox + cw, oy + ch], outline=(255, 0, 0, 110), width=2)
    Image.alpha_composite(im, ov).convert("RGB").save(out_png)


# ---------------------------------------------------------------------------
# drawing primitives (pen and ink)
# ---------------------------------------------------------------------------
def scribble(sk, x, y, w, h=10, wt=1.0, op=0.8):
    """Illegible cursive handwriting along a baseline from x to x+w (h = x-height)."""
    r = sk.rng
    d = "M%.1f,%.1f" % (x, y)
    cx = x
    word = 0
    while cx < x + w:
        lw = h * r.uniform(0.55, 0.8)
        if word > r.randint(3, 7):
            cx += h * r.uniform(0.9, 1.4)
            d += " M%.1f,%.1f" % (cx, y)
            word = 0
            continue
        k = r.random()
        if k < 0.35:    # round arch (n, m)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 0.1, y - h * 1.2, cx + lw * 0.9, y - h * 1.2, cx + lw, y)
        elif k < 0.55:  # cup (u, w)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx - lw * 0.1, y + h * 0.1, cx + lw * 0.8, y + h * 0.2,
                                                     cx + lw, y - h)
            d += " L%.1f,%.1f" % (cx + lw, y)
        elif k < 0.7:   # ascender loop (l, h, b)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 1.1, y - h * 1.2, cx + lw * 0.6, y - h * 2.4,
                                                     cx + lw * 0.35, y - h * 1.6)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 0.2, y - h * 0.9, cx + lw * 0.3, y, cx + lw, y)
        elif k < 0.82:  # descender loop (g, y)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 0.3, y - h * 1.1, cx + lw, y - h * 0.9, cx + lw * 0.8,
                                                     y + h * 0.4)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 0.7, y + h * 1.4, cx, y + h * 1.1, cx + lw * 1.1, y)
        else:           # small loop (e, o)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx + lw * 1.0, y - h * 0.4, cx + lw * 0.5, y - h * 1.1,
                                                     cx + lw * 0.2, y - h * 0.5)
            d += " C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx, y, cx + lw * 0.6, y + h * 0.1, cx + lw, y - h * 0.15)
        cx += lw
        word += 1
    sk.stroke(d, wt, op)


def scribble_block(sk, x, y, w, lines=3, h=9, gap=15, op=0.7):
    for i in range(lines):
        lw = w * (sk.rng.uniform(0.55, 0.9) if i == lines - 1 else sk.rng.uniform(0.85, 1.0))
        scribble(sk, x, y + i * gap, lw, h, 0.9, op)


def mountain(sk, x, y, w, h, shade_sp=4.2, op=1.0):
    r = sk.rng
    px = x + r.uniform(-0.12, 0.12) * w
    top = (px, y - h)
    L = (x - w / 2, y)
    R = (x + w / 2, y)
    lm = ((L[0] + top[0]) / 2 + r.uniform(-4, 4), (L[1] + top[1]) / 2 + r.uniform(-6, 6))
    rm = ((R[0] + top[0]) / 2 + r.uniform(-4, 4), (R[1] + top[1]) / 2 + r.uniform(-6, 6))
    outline = [L, lm, top, rm, R]
    body = "M" + " L".join("%.1f,%.1f" % q for q in outline) + " Z"
    sk.white(body)
    ridge = [top, (px + w * 0.06, y - h * 0.55), (px + w * 0.02, y - h * 0.25), (px + w * 0.1, y)]
    shade = "M" + " L".join("%.1f,%.1f" % q for q in ridge + [R, rm]) + " Z"
    sk.hatch(shade, (px - 2, y - h - 2, R[0] + 2, y + 2), angle=-62, spacing=shade_sp, w=0.75, op=0.8 * op)
    sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in outline), 1.6, op)
    sk.stroke(smooth_path(ridge), 1.0, 0.85 * op)
    # snow-line / crag ticks on the lit side
    for i in range(3):
        t = r.uniform(0.3, 0.8)
        ax, ay = top[0] + (L[0] - top[0]) * t, top[1] + (L[1] - top[1]) * t
        sk.stroke("M%.1f,%.1f l%.1f,%.1f" % (ax + 3, ay, w * 0.08, h * 0.06), 0.8, 0.6 * op)


def mountain_range(sk, x0, x1, y, h, n=None, op=1.0):
    r = sk.rng
    n = n or max(2, int((x1 - x0) / (h * 0.7)))
    peaks = []
    for i in range(n):
        t = (i + r.uniform(0.2, 0.8)) / n
        peaks.append((x0 + (x1 - x0) * t, y + r.uniform(-h * 0.25, h * 0.2), h * r.uniform(0.7, 1.1)))
    for (px, py, ph) in sorted(peaks, key=lambda q: q[1]):
        mountain(sk, px, py, ph * r.uniform(1.1, 1.5), ph, op=op)


def hill(sk, x, y, w, h, op=1.0):
    r = sk.rng
    d = "M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (x - w / 2, y, x - w * 0.3, y - h * 1.3,
                                                     x + w * 0.25, y - h * 1.35, x + w / 2, y)
    sk.white(d + " Z")
    sk.stroke(d, 1.4, op)
    for i in range(4):
        t = 0.55 + i * 0.1
        sx = x - w / 2 + w * t
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (sx, y - h * (1.0 - (t - 0.5) * 1.6) * 0.8,
                                                     w * 0.05, h * 0.3, w * 0.03, h * 0.6), 0.8, 0.7 * op)
    for i in range(r.randint(2, 4)):
        gx = x + r.uniform(-w / 2, w / 2)
        sk.stroke("M%.1f,%.1f l-2,-4 M%.1f,%.1f l0,-5 M%.1f,%.1f l2,-4" % (gx, y + 5, gx + 2, y + 5, gx + 4, y + 5),
                  0.7, 0.6 * op)


def pine(sk, x, y, s, op=1.0):
    r = sk.rng
    tiers = 3
    left, right = [], []
    for i in range(tiers + 1):
        t = i / tiers
        yy = y - s * 0.2 - s * 0.8 * (1 - t)
        ww = s * 0.34 * t
        if i > 0:
            left.append((x - ww, yy))
            right.append((x + ww, yy))
            if i < tiers:
                left.append((x - ww * 0.45, yy + s * 0.02))
                right.append((x + ww * 0.45, yy + s * 0.02))
    pts = [(x, y - s)] + right + [(x, y - s * 0.2)] + left[::-1]
    d = "M" + " L".join("%.1f,%.1f" % q for q in pts) + " Z"
    sk.white(d)
    sk.stroke(d, 1.1, op)
    sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (x, y - s * 0.2, x, y), 1.1, op)
    for i in range(3):
        yy = y - s * (0.35 + i * 0.22)
        sk.stroke("M%.1f,%.1f l%.1f,%.1f" % (x + 1.5, yy, s * 0.12, -s * 0.07), 0.7, 0.75 * op)
    sk.stroke("M%.1f,%.1f l%.1f,0" % (x - s * 0.15 + r.uniform(-2, 2), y, s * 0.3), 0.7, 0.5 * op)


def broadleaf(sk, x, y, s, op=1.0):
    r = sk.rng
    n = 9
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = s * 0.36 * r.uniform(0.85, 1.1)
        pts.append((x + math.cos(a) * rr, y - s * 0.62 + math.sin(a) * rr * 0.85))
    d = "M%.1f,%.1f" % pts[0]
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        ox, oy = mx - x, my - (y - s * 0.62)
        d += " Q%.1f,%.1f %.1f,%.1f" % (mx + ox * 0.35, my + oy * 0.35, b[0], b[1])
    sk.white(d + " Z")
    sk.stroke(d + " Z", 1.0, op)
    sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (x, y - s * 0.28, x, y), 1.1, op)
    for i in range(6):
        sk.dot(x + s * r.uniform(0.02, 0.28), y - s * r.uniform(0.35, 0.8), 0.9, 0.7 * op)


def forest(sk, region_ok, n, s, rng=None, kinds=("pine",), min_d=None, op=1.0, bounds=None):
    """Scatter trees where region_ok(x, y) is True, drawn back (top) to front."""
    r = rng or sk.rng
    min_d = min_d or s * 0.42
    x0, y0, x1, y1 = bounds or (0, 0, sk.W, sk.H)
    placed = []
    tries = 0
    while len(placed) < n and tries < n * 40:
        tries += 1
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        if not region_ok(x, y):
            continue
        if any((x - a) ** 2 + ((y - b) * 1.6) ** 2 < min_d ** 2 for a, b in placed):
            continue
        placed.append((x, y))
    for x, y in sorted(placed, key=lambda q: q[1]):
        k = r.choice(kinds)
        ss = s * r.uniform(0.8, 1.15)
        (pine if k == "pine" else broadleaf)(sk, x, y, ss, op)
    return placed


def house(sk, x, y, s, burned=False, op=1.0):
    r = sk.rng
    w, h = s, s * 0.55
    roof = s * 0.45
    wall = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (x - w / 2, y, x - w / 2, y - h, x + w / 2, y - h,
                                                              x + w / 2, y)
    sk.white(wall)
    sk.stroke(wall, 1.1, op)
    if burned:
        # broken roof beams and scorch
        pts = [(x - w / 2 - 2, y - h), (x - w * 0.25, y - h - roof * 0.6), (x - w * 0.05, y - h - roof * 0.2),
               (x + w * 0.1, y - h - roof * 0.75), (x + w * 0.3, y - h - roof * 0.1), (x + w / 2 + 2, y - h)]
        sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in pts), 1.0, op)
        for i in range(3):
            bx = x - w * 0.3 + i * w * 0.3
            sk.stroke("M%.1f,%.1f l%.1f,%.1f" % (bx, y - h, r.uniform(-3, 3), -roof * r.uniform(0.5, 0.9)), 1.0, op)
        sk.hatch(wall, (x - w / 2, y - h, x + w / 2, y), angle=40, spacing=2.6, w=0.6, op=0.55 * op, cross=True)
        # smoke curl
        sx, sy = x + r.uniform(-w * 0.2, w * 0.2), y - h - roof * 0.5
        pts = [(sx, sy)]
        for i in range(6):
            pts.append((sx + math.sin(i * 1.3) * s * 0.18 + i * s * 0.05, sy - (i + 1) * s * 0.22))
        sk.stroke(smooth_path(pts), 0.8, 0.55 * op)
    else:
        rp = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (x - w / 2 - 2, y - h, x, y - h - roof, x + w / 2 + 2, y - h)
        sk.white(rp)
        sk.hatch(rp, (x - w / 2 - 2, y - h - roof, x + w / 2 + 2, y - h), angle=90, spacing=2.4, w=0.6, op=0.7 * op)
        sk.stroke(rp, 1.1, op)
        sk.fill("M%.1f,%.1f h%.1f v%.1f h%.1f Z" % (x - w * 0.1, y, w * 0.2, -h * 0.55, -w * 0.2), op=0.8 * op)


def compass_rose(sk, cx, cy, R, op=1.0):
    r = sk.rng
    sk.circle(cx, cy, R, 1.4, op)
    sk.circle(cx, cy, R * 0.93, 0.8, op)
    sk.circle(cx, cy, R * 0.62, 0.8, 0.8 * op)
    for i in range(64):
        a = 2 * math.pi * i / 64
        l = 0.07 if i % 4 else 0.12
        sk.line((cx + math.cos(a) * R * 0.93, cy + math.sin(a) * R * 0.93),
                (cx + math.cos(a) * R * (0.93 - l), cy + math.sin(a) * R * (0.93 - l)), 0.7, 0.8 * op)
    # rhumb lines reaching out a little
    for i in range(16):
        a = 2 * math.pi * i / 16
        sk.line((cx + math.cos(a) * R, cy + math.sin(a) * R), (cx + math.cos(a) * R * 1.9, cy + math.sin(a) * R * 1.9),
                0.5, 0.35 * op)

    def point(a, length, width):
        tip = (cx + math.cos(a) * length, cy + math.sin(a) * length)
        la = (cx + math.cos(a - math.pi / 2) * width, cy + math.sin(a - math.pi / 2) * width)
        ra = (cx + math.cos(a + math.pi / 2) * width, cy + math.sin(a + math.pi / 2) * width)
        sk.white("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (cx, cy, la[0], la[1], tip[0], tip[1], ra[0], ra[1]))
        sk.fill("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (cx, cy, la[0], la[1], tip[0], tip[1]), op=0.85 * op)
        sk.stroke("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (cx, cy, la[0], la[1], tip[0], tip[1], ra[0], ra[1]),
                  0.9, op)

    for i in range(8):
        a = -math.pi / 2 + math.pi / 8 + i * math.pi / 4
        point(a, R * 0.62, R * 0.07)
    for i in range(4):
        a = -math.pi / 2 + math.pi / 4 + i * math.pi / 2
        point(a, R * 0.78, R * 0.11)
    for i in range(4):
        a = -math.pi / 2 + i * math.pi / 2
        point(a, R * 1.12 if i == 0 else R * 1.0, R * 0.15)
    sk.circle(cx, cy, R * 0.08, 1.0, op, fill="#fff")
    sk.dot(cx, cy, R * 0.03, op)
    # fleur-de-lis on north
    ty = cy - R * 1.12
    sk.stroke("M%.1f,%.1f c%.1f,%.1f %.1f,%.1f 0,%.1f c%.1f,%.1f %.1f,%.1f 0,%.1f" % (
        cx, ty - 2, -R * 0.12, -R * 0.05, -R * 0.06, -R * 0.2, -R * 0.26, R * 0.06, R * 0.06, R * 0.12, -R * 0.05,
        R * 0.26), 1.1, op)
    for s in (-1, 1):
        sk.stroke("M%.1f,%.1f c%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (cx, ty - R * 0.08, s * R * 0.08, -R * 0.1,
                                                              s * R * 0.2, -R * 0.02, s * R * 0.13, R * 0.06), 1.0, op)


def cartouche(sk, cx, cy, w, h, op=1.0, lines=2, title_h=16):
    """Ornamental scroll cartouche with illegible lettering."""
    x0, x1, y0, y1 = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
    curl = h * 0.32
    body = ("M%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z"
            % (x0, y0, x1, y0, x1 + curl, cy, x1, y1, x0, y1, x0 - curl, cy, x0, y0))
    sk.white(body)
    sk.stroke(body, 1.6, op)
    inner = ("M%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z"
             % (x0 + 7, y0 + 7, x1 - 7, y0 + 7, x1 + curl - 12, cy, x1 - 7, y1 - 7, x0 + 7, y1 - 7,
                x0 - curl + 12, cy, x0 + 7, y0 + 7))
    sk.stroke(inner, 0.8, 0.8 * op)
    # rolled ends
    for s, xe in ((-1, x0), (1, x1)):
        ex = xe + s * curl * 0.95
        sk.white("M%.1f,%.1f m-%.1f,0 a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0" % (
            ex, cy, h * 0.2, h * 0.2, h * 0.2, h * 0.4, h * 0.2, h * 0.2, h * 0.4))
        sp = []
        for i in range(40):
            t = i / 39
            a = t * 3.6 * math.pi
            rr = h * 0.2 * (1 - t * 0.8)
            sp.append((ex + s * math.cos(a) * rr, cy + math.sin(a) * rr))
        sk.stroke(smooth_path(sp), 1.1, op)
        # tassel-like flourish
        sk.stroke("M%.1f,%.1f c%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (ex, cy + h * 0.22, s * 10, h * 0.3, s * 30, h * 0.2,
                                                              s * 42, h * 0.5), 0.9, 0.8 * op)
    # top ornament
    sk.stroke("M%.1f,%.1f c%.1f,%.1f %.1f,%.1f %.1f,0 c%.1f,%.1f %.1f,%.1f %.1f,0" % (
        cx - w * 0.22, y0, w * 0.06, -h * 0.28, w * 0.16, -h * 0.28, w * 0.22, w * 0.06, -h * 0.28, w * 0.16, -h * 0.28,
        w * 0.22), 1.0, op)
    sk.circle(cx, y0 - h * 0.14, h * 0.05, 1.0, op)
    # lettering: a big illegible title line and smaller lines
    tw = w * 0.72
    scribble(sk, cx - tw / 2, cy - h * 0.06 + (0 if lines else h * 0.1), tw, title_h, 1.7, 0.95 * op)
    for i in range(lines):
        lw = w * (0.5 - i * 0.12)
        scribble(sk, cx - lw / 2, cy + h * 0.22 + i * 12, lw, 7, 0.8, 0.7 * op)


def scale_bar(sk, x, y, w, segs=5, op=1.0, numbers=True):
    h = 7
    sk.stroke("M%.1f,%.1f h%.1f v%.1f h%.1f Z" % (x, y, w, h, -w), 1.1, op)
    for i in range(segs):
        sx = x + w * i / segs
        if i % 2 == 0:
            sk.fill("M%.1f,%.1f h%.1f v%.1f h%.1f Z" % (sx, y, w / segs, h, -w / segs), op=0.85 * op)
        sk.line((sx, y - 4), (sx, y + h), 0.8, op)
        if numbers:
            sk.text(sx, y - 7, str(i * 5), 10, 0.85 * op, italic=False)
    sk.line((x + w, y - 4), (x + w, y + h), 0.8, op)
    if numbers:
        sk.text(x + w, y - 7, str(segs * 5), 10, 0.85 * op, italic=False)
    # half-segment subdivisions on the first block
    for i in range(1, 5):
        sk.line((x + w / segs * i / 5, y + h), (x + w / segs * i / 5, y + h - 3), 0.5, op)
    scribble(sk, x + w * 0.3, y + h + 16, w * 0.4, 7, 0.8, 0.75 * op)


def neatline(sk, m, op=1.0, seg=60):
    """Double map border with alternating graduated blocks."""
    W, H = sk.W, sk.H
    sk.stroke("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (m, m, W - m, H - m, m), 1.6, op)
    m2 = m + 8
    sk.stroke("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (m2, m2, W - m2, H - m2, m2), 0.8, op)
    blocks = []
    x = m
    i = 0
    while x < W - m:
        x2 = min(W - m, x + seg)
        if i % 2 == 0:
            blocks.append("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (x, m, x2, m2, x))
            blocks.append("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (x, H - m2, x2, H - m, x))
        x = x2
        i += 1
    y = m
    i = 0
    while y < H - m:
        y2 = min(H - m, y + seg)
        if i % 2 == 0:
            blocks.append("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (m, y, m2, y2, m))
            blocks.append("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (W - m2, y, W - m, y2, W - m2))
        y = y2
        i += 1
    sk.fill(" ".join(blocks), op=0.75 * op)


def skull(sk, x, y, s, op=1.0):
    sk.white("M%.1f,%.1f a%.1f,%.1f 0 1,1 %.1f,0 l-%.1f,%.1f h-%.1f Z" % (
        x - s * 0.5, y, s * 0.5, s * 0.5, s, s * 0.15, s * 0.45, s * 0.7))
    sk.stroke("M%.1f,%.1f a%.1f,%.1f 0 1,1 %.1f,0 q0,%.1f -%.1f,%.1f v%.1f h-%.1f v-%.1f q-%.1f,0 -%.1f,-%.1f Z" % (
        x - s * 0.5, y, s * 0.5, s * 0.52, s, s * 0.25, s * 0.18, s * 0.22, s * 0.22, s * 0.64, s * 0.22, s * 0.18,
        s * 0.18, s * 0.22), 1.1, op)
    for sx in (-1, 1):
        sk.fill("M%.1f,%.1f a%.1f,%.1f 0 1,0 0.1,0 Z" % (x + sx * s * 0.2 - s * 0.12, y + s * 0.02, s * 0.12,
                                                         s * 0.11), op=0.9 * op)
    sk.fill("M%.1f,%.1f l-%.1f,%.1f h%.1f Z" % (x, y + s * 0.14, s * 0.05, s * 0.14, s * 0.1), op=0.9 * op)
    for i in range(-2, 3):
        sk.line((x + i * s * 0.08, y + s * 0.4), (x + i * s * 0.08, y + s * 0.52), 0.6, op)
    sk.hatch("M%.1f,%.1f a%.1f,%.1f 0 0,1 %.1f,%.1f l-%.1f,%.1f Z" % (x + s * 0.15, y - s * 0.48, s * 0.5, s * 0.5,
                                                                   s * 0.35, s * 0.5, s * 0.2, s * 0.25),
             (x, y - s * 0.55, x + s * 0.55, y + s * 0.3), angle=60, spacing=2.4, w=0.5, op=0.6 * op)


def crossbones(sk, x, y, s, op=1.0):
    for sgn in (-1, 1):
        a = (x - s * 0.5, y - sgn * s * 0.3)
        b = (x + s * 0.5, y + sgn * s * 0.3)
        sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (a + b), s * 0.09, op)
        for q in (a, b):
            sk.circle(q[0], q[1], s * 0.07, 0.8, op, fill="#fff")


def meander(rng, pts_ctrl, amp, step=18):
    """Densify a control polyline and add a wandering sideways offset."""
    out = []
    ph = rng.uniform(0, 6)
    for (a, b) in zip(pts_ctrl, pts_ctrl[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(2, int(L / step))
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
        for i in range(n):
            t = i / n
            ph += rng.uniform(0.15, 0.45)
            o = math.sin(ph) * amp * (0.6 + 0.4 * math.sin(ph * 0.37))
            out.append((a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o))
    out.append(pts_ctrl[-1])
    return out


def offset_line(pts, dist):
    out = []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
        dd = dist(i / (len(pts) - 1)) if callable(dist) else dist
        out.append((p[0] + nx * dd, p[1] + ny * dd))
    return out


def river(sk, pts, width, op=1.0, wash=None, wash_op=0.22, ripples=True):
    """Double-banked river along pts; width may be a function of t."""
    wf = width if callable(width) else (lambda t: width)
    a = offset_line(pts, lambda t: wf(t) / 2)
    b = offset_line(pts, lambda t: -wf(t) / 2)
    body = smooth_path(a) + " L" + " L".join("%.1f,%.1f" % q for q in b[::-1]) + " Z"
    sk.white(body)
    if wash:
        sk.washblob(body, wash, wash_op)
    sk.stroke(smooth_path(a), 1.3, op)
    sk.stroke(smooth_path(b), 1.3, op)
    # bank shading: short strokes outside the banks
    for bank, s in ((a, 1), (b, -1)):
        o = offset_line(bank, s * 4)
        for i in range(0, len(o) - 1, 2):
            sk.line(o[i], (o[i][0] + (o[i + 1][0] - o[i][0]) * 0.6, o[i][1] + (o[i + 1][1] - o[i][1]) * 0.6), 0.6,
                    0.5 * op)
    if ripples:
        for i in range(1, len(pts) - 2, 2):
            if sk.rng.random() < 0.6:
                p, q = pts[i], pts[i + 1]
                off = sk.rng.uniform(-0.25, 0.25) * wf(i / len(pts))
                L = math.hypot(q[0] - p[0], q[1] - p[1]) or 1
                nx, ny = -(q[1] - p[1]) / L, (q[0] - p[0]) / L
                sk.line((p[0] + nx * off, p[1] + ny * off),
                        (p[0] + (q[0] - p[0]) * 0.5 + nx * off, p[1] + (q[1] - p[1]) * 0.5 + ny * off), 0.6, 0.55 * op)


def road(sk, pts, op=0.7, w=1.0):
    sk.stroke(smooth_path(pts), w, op, dash="6 5")


def grid_texture(sk, cell, op=0.12, box=None):
    x0, y0, x1, y1 = box or (0, 0, sk.W, sk.H)
    d = []
    x = x0
    while x <= x1:
        d.append("M%.1f,%.1f V%.1f" % (x, y0, y1))
        x += cell
    y = y0
    while y <= y1:
        d.append("M%.1f,%.1f H%.1f" % (x0, y, x1))
        y += cell
    sk.stroke(" ".join(d), 0.5, op, cap="butt")


# ---------------------------------------------------------------------------
# driver
# ---------------------------------------------------------------------------
FORMATS = {"tall": (1080, 1920, ""), "wide": (1920, 1080, "-ancho")}


def run(act_id, build, paper_kw, out_dir, work_dir, max_kb=450, seed=7, floor=0.3, grade_kw=None):
    """Render both formats of one act.

    build(sk, wide) draws into the sketch and returns (clear_box, reveals) where reveals are
    (x, y, rx, ry) ellipses (pixels) whose ink must stay at full strength inside the clear box."""
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(work_dir, exist_ok=True)
    report = []
    for name, (W, H, suffix) in FORMATS.items():
        wide = name == "wide"
        sk = Sketch(W, H, seed=seed + (100 if wide else 0))
        clear_box, reveals = build(sk, wide)
        ink = render(sk, os.path.join(work_dir, "%s-%s-ink.png" % (act_id, name)))
        rng = np.random.default_rng(seed + (100 if wide else 0))
        pw = dict(paper_kw)
        if wide:
            pw["folds_x"], pw["folds_y"] = pw.get("folds_y", (0.25, 0.5, 0.75)), pw.get("folds_x", (0.5,))
        if callable(pw.get("holes")):
            pw["holes"] = pw["holes"](W, H)
        pap = paper(W, H, rng, **pw)
        mask = clear_mask(W, H, clear_box, soft=90, floor=floor)
        for (x, y, rx, ry) in reveals:
            r = radial(W, H, x, y, rx, ry)
            mask = np.maximum(mask, np.clip((1.25 - r) / 0.35, 0, 1) ** 1.5)
        img = compose(pap, ink, mask, rng)
        img = grade(img, rng, **(grade_kw or {}))
        path = os.path.join(out_dir, "%s%s.webp" % (act_id, suffix))
        q, kb = save_webp(img, path, max_kb)
        mockup(img, os.path.join(work_dir, "%s%s-maqueta.png" % (act_id, suffix)), wide)
        from_f(img).save(os.path.join(work_dir, "%s%s.png" % (act_id, suffix)))
        report.append("%s q=%d %.0f KB" % (path, q, kb))
    print("\n".join(report))


def massif(sk, box, n, hmin, hmax, op=1.0):
    """A mountain mass: peaks scattered inside box=(x0, y0, x1, y1) (base line y), back to front."""
    r = sk.rng
    x0, y0, x1, y1 = box
    peaks = []
    for _ in range(n * 20):
        if len(peaks) >= n:
            break
        h = r.uniform(hmin, hmax)
        w = h * r.uniform(1.15, 1.5)
        x = r.uniform(x0 + w / 2, x1 - w / 2)
        y = r.uniform(y0 + h, y1)
        if any(abs(x - a) < w * 0.35 and abs(y - b) < h * 0.3 for a, b, _, _ in peaks):
            continue
        peaks.append((x, y, w, h))
    for x, y, w, h in sorted(peaks, key=lambda q: q[1]):
        mountain(sk, x, y, w, h, op=op)


def label(sk, x, y, w, op=0.75):
    """Small illegible place name."""
    scribble(sk, x - w / 2, y, w, 6, 0.8, op)


# ---------------------------------------------------------------------------
# shared pieces for the per-scenario maps (added for the second scenario of each act)
# ---------------------------------------------------------------------------
def group(sk, x, y, rot=0, s=1.0, sy=None):
    """Open a transformed group in both the ink and the wash layers (close with ungroup)."""
    g = '<g transform="translate(%.1f,%.1f) rotate(%.1f) scale(%.3f,%.3f)">' % (x, y, rot, s, s if sy is None else sy)
    sk.add(g)
    sk.wash.append(g)


def ungroup(sk):
    sk.add("</g>")
    sk.wash.append("</g>")


def densify(pts, step=8.0):
    out = []
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n)]
    out.append(pts[-1])
    return out


class Plan:
    """Dungeon-style floor plan: rooms and tunnels with solid walls, rock hatching outside,
    white floors and a faint square grid. Overlapping pieces merge into clean junctions
    because every wall is drawn before every floor."""

    def __init__(self, sk, wall=3.0, depth=24, grid=12, grid_op=0.3, hatch_op=0.9):
        self.sk, self.wall, self.depth, self.grid, self.grid_op, self.hatch_op = sk, wall, depth, grid, grid_op, hatch_op
        self.items = []

    def rect(self, x0, y0, x1, y1):
        self.items.append(("rect", (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))))
        return self

    def circle(self, cx, cy, r):
        self.items.append(("circle", (cx, cy, r)))
        return self

    def tunnel(self, pts, w):
        self.items.append(("tunnel", (densify(pts, 6), w)))
        return self

    def _samples(self):
        """Wall points with outward normals."""
        out = []
        for kind, g in self.items:
            if kind == "rect":
                x0, y0, x1, y1 = g
                for (ax, ay, bx, by, nx, ny) in ((x0, y0, x1, y0, 0, -1), (x1, y0, x1, y1, 1, 0),
                                                 (x1, y1, x0, y1, 0, 1), (x0, y1, x0, y0, -1, 0)):
                    n = max(1, int(math.hypot(bx - ax, by - ay) / 9))
                    out += [(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, nx, ny) for i in range(n)]
            elif kind == "circle":
                cx, cy, r = g
                n = max(12, int(2 * math.pi * r / 9))
                for i in range(n):
                    a = 2 * math.pi * i / n
                    out.append((cx + math.cos(a) * r, cy + math.sin(a) * r, math.cos(a), math.sin(a)))
            else:
                pts, w = g
                for i in range(0, len(pts), 2):
                    a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
                    L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
                    nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
                    for s in (1, -1):
                        out.append((pts[i][0] + s * nx * w / 2, pts[i][1] + s * ny * w / 2, s * nx, s * ny))
        return out

    def _floor(self, grow, col):
        """SVG elements for every floor piece grown by `grow` px, filled/stroked with col."""
        k = self.sk.k
        els = []
        for kind, g in self.items:
            if kind == "rect":
                x0, y0, x1, y1 = g
                els.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
                           % (x0 - grow, y0 - grow, x1 - x0 + 2 * grow, y1 - y0 + 2 * grow, col))
            elif kind == "circle":
                cx, cy, r = g
                els.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (cx, cy, r + grow, col))
            else:
                pts, w = g
                els.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="butt" '
                           'stroke-linejoin="round"/>' % (smooth_path(pts), col, w + 2 * grow))
        return els

    def render(self, wash=None, wash_op=0.3):
        sk, r = self.sk, self.sk.rng
        lines = []
        for (px, py, nx, ny) in self._samples():
            for _ in range(2):
                o = self.wall + r.uniform(2, self.depth)
                hx, hy = px + nx * o + r.uniform(-4, 4), py + ny * o + r.uniform(-4, 4)
                a = r.uniform(0, math.pi)
                ux, uy = math.cos(a), math.sin(a)
                ln = r.uniform(8, 15) * (1.2 - o / (self.depth + self.wall) * 0.5)
                for kk in range(r.randint(3, 4)):
                    off = (kk - 1.5) * 2.9
                    ax, ay = hx - uy * off, hy + ux * off
                    lines.append("M%.1f,%.1f L%.1f,%.1f" % (ax - ux * ln / 2, ay - uy * ln / 2,
                                                            ax + ux * ln / 2, ay + uy * ln / 2))
        sk.stroke(" ".join(lines), 0.75, self.hatch_op)
        sk.add("".join(self._floor(self.wall, sk.ink_col)))
        sk.add("".join(self._floor(0, "#fff")))
        if wash:
            for e in self._floor(0, hexc(wash)):
                sk.wash.append(e.replace("/>", ' fill-opacity="%.2f" stroke-opacity="%.2f"/>' % (wash_op, wash_op), 1)
                               if 'fill="none"' not in e else e.replace("/>", ' stroke-opacity="%.2f"/>' % wash_op))
        if self.grid_op > 0:
            xs, ys = [], []
            for kind, g in self.items:
                if kind == "rect":
                    xs += [g[0], g[2]]; ys += [g[1], g[3]]
                elif kind == "circle":
                    xs += [g[0] - g[2], g[0] + g[2]]; ys += [g[1] - g[2], g[1] + g[2]]
                else:
                    xs += [p[0] - g[1] for p in g[0]] + [p[0] + g[1] for p in g[0]]
                    ys += [p[1] - g[1] for p in g[0]] + [p[1] + g[1] for p in g[0]]
            mid = sk.uid("m")
            sk.defs.append('<mask id="%s" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="10000" '
                           'height="10000">%s</mask>' % (mid, "".join(self._floor(-0.5, "#fff"))))
            gl = []
            x = min(xs) - (min(xs) % self.grid)
            while x <= max(xs):
                gl.append("M%.1f,%.1f V%.1f" % (x, min(ys), max(ys)))
                x += self.grid
            y = min(ys) - (min(ys) % self.grid)
            while y <= max(ys):
                gl.append("M%.1f,%.1f H%.1f" % (min(xs), y, max(xs)))
                y += self.grid
            sk.add('<g mask="url(#%s)"><path d="%s" fill="none" stroke="%s" stroke-width="0.5" '
                   'stroke-opacity="%.2f"/></g>' % (mid, " ".join(gl), sk.ink_col, self.grid_op))


def dagger(sk, x, y, ang, L, op=1.0, fancy=True, wf=1.0):
    """A dagger from its pommel at (x, y) pointing along `ang` (degrees), total length L;
    wf widens the blade and grip."""
    group(sk, x, y, ang)
    w = L * 0.065 * wf
    b0 = L * 0.33
    blade = "M%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,0 Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Z" % (
        b0, -w, L * 0.8, -w * 0.75, L * 0.95, -w * 0.4, L, L * 0.95, w * 0.4, L * 0.8, w * 0.75, b0, w)
    sk.white(blade)
    lower = "M%.1f,0 L%.1f,0 Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Z" % (b0, L, L * 0.95, w * 0.4, L * 0.8, w * 0.75, b0, w)
    sk.hatch(lower, (b0, 0, L, w), angle=12, spacing=2.2, w=0.55, op=0.75 * op)
    sk.stroke(blade, 1.3, op)
    sk.line((b0 + L * 0.03, 0), (L * 0.78, 0), 0.8, 0.9 * op)  # fuller
    # crossguard with curled quillons
    gw = L * 0.15
    g = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (b0 - L * 0.03, -gw, L * 0.03, 2 * gw, L * 0.03)
    sk.white(g)
    sk.stroke(g, 1.2, op)
    if fancy:
        for s in (-1, 1):
            sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (
                b0 - L * 0.015, s * gw, L * 0.05, s * L * 0.02, L * 0.04, s * L * 0.06, -L * 0.02, s * L * 0.02,
                -L * 0.035, -s * L * 0.005), 1.0, op)
        sk.circle(b0 - L * 0.015, 0, w * 0.45, 0.8, op, fill="#fff")
    # grip with wraps and a pommel
    gh = w * 0.75
    grip = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (L * 0.1, -gh, b0 - L * 0.13, 2 * gh, b0 - L * 0.13)
    sk.white(grip)
    sk.stroke(grip, 1.1, op)
    n = 7
    for i in range(1, n):
        xx = L * 0.1 + (b0 - L * 0.13) * i / n
        sk.line((xx - 2, -gh), (xx + 2, gh), 0.7, 0.9 * op)
    sk.circle(L * 0.06, 0, w * 1.15, 1.2, op, fill="#fff")
    sk.dot(L * 0.06, 0, w * 0.4, op)
    ungroup(sk)


def spiral(sk, x, y, r, turns=4.0, w=0.9, op=0.7, squash=1.0):
    pts = []
    n = int(turns * 36)
    ph = sk.rng.uniform(0, 6.28)
    for i in range(n + 1):
        t = i / n
        a = ph + t * turns * 2 * math.pi
        rr = r * t * (1 + 0.06 * math.sin(a * 3.1))
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr * squash))
    sk.stroke(smooth_path(pts), w, op)


def eye_glyph(sk, x, y, s, op=1.0, slit=True, lashes=True, look=(0.0, 0.0)):
    """A drawn eye: almond, radiating iris, pupil (slit or round) and a catch light."""
    ew, eh = s, s * 0.5
    alm = "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (x - ew, y, x, y - eh * 1.9, x + ew, y, x,
                                                                    y + eh * 1.9, x - ew, y)
    sk.white(alm)
    sk.stroke(alm, 1.3, op)
    ir = eh * 0.95
    ix, iy = x + look[0] * ir * 0.5, y + look[1] * ir * 0.3
    cid = sk.uid()
    sk.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, alm))
    rays = []
    for i in range(28):
        a = 2 * math.pi * i / 28
        rays.append("M%.1f,%.1f L%.1f,%.1f" % (ix + math.cos(a) * ir * 0.35, iy + math.sin(a) * ir * 0.35,
                                               ix + math.cos(a) * ir, iy + math.sin(a) * ir))
    sk.add('<g clip-path="url(#%s)"><path d="%s" stroke="%s" stroke-width="%.2f" stroke-opacity="%.2f" fill="none"/>'
           '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="%.2f" stroke-opacity="%.2f"/>'
           '</g>' % (cid, " ".join(rays), sk.ink_col, 0.55 * sk.k, op, ix, iy, ir, sk.ink_col, 1.1 * sk.k, op))
    if slit:
        sk.fill("M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (
            ix, iy - ir * 0.9, ix + ir * 0.3, iy, ix, iy + ir * 0.9, ix - ir * 0.3, iy, ix, iy - ir * 0.9), op=0.95 * op)
    else:
        sk.dot(ix, iy, ir * 0.42, 0.95 * op)
    sk.circle(ix + ir * 0.3, iy - ir * 0.3, ir * 0.13, 0.5, op, fill="#fff")
    if lashes:
        for i in range(7):
            a = math.pi + math.pi * (i + 0.5) / 7
            px, py = x + math.cos(a) * ew * 0.9, y - abs(math.sin(a)) * eh * 0.95
            sk.line((px, py), (px + math.cos(a) * s * 0.2, py - s * 0.18), 0.8, op)


def rune(sk, x, y, s, op=0.9, w=1.0):
    """A random angular rune glyph inside an s x 1.4s cell centred on (x, y)."""
    r = sk.rng
    pts = [(x + (i - 1) * s * 0.5, y + (j - 1) * s * 0.7) for i in range(3) for j in range(3)]
    d = "M%.1f,%.1f L%.1f,%.1f" % (pts[1] + pts[7])  # stave
    for _ in range(r.randint(2, 3)):
        a, b = r.sample(pts, 2)
        d += " M%.1f,%.1f L%.1f,%.1f" % (a + b)
    sk.stroke(d, w, op)
