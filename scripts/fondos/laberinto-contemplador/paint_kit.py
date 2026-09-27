"""Shared painting toolkit for the code-painted combat backgrounds.

A scene is drawn once into a Canvas that emits three SVG passes from the same geometry:
  * colour   - the painted scene (with texture filters),
  * depth    - opaque shapes filled with a grey proportional to their depth (for fog),
  * emissive - opaque shapes in black and light sources in colour (for glow/bloom).
Each pass is rasterised at 2x with headless Chrome, downsampled, and composited with numpy.
"""
import math
import os
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ZMAX = 12.0


def hexc(c):
    """Accept '#rrggbb' or an (r, g, b) tuple and return '#rrggbb'."""
    if isinstance(c, str):
        return c
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def mix(a, b, t):
    """Linear blend of two colours given as tuples or hex strings."""
    def tup(c):
        if isinstance(c, str):
            c = c.lstrip("#")
            return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
        return c
    a, b = tup(a), tup(b)
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def jitter(c, amount, rng):
    """Randomly vary the value of a colour."""
    if isinstance(c, str):
        c = mix(c, c, 0)
    k = 1 + rng.uniform(-amount, amount)
    return tuple(v * k for v in c)


def pts(points):
    return " ".join("%.1f,%.1f" % p for p in points)


class Camera:
    """One-point perspective camera. World Y grows downwards, the floor is at Y = 1."""

    def __init__(self, W, H, vpx, vpy, yn, yb, bw, vt, ys):
        self.W, self.H = W, H
        self.cx, self.cy = vpx * W, vpy * H
        self.f = (yn - vpy) * H           # floor at Z = 1 lands at yn
        self.Zb = self.f / ((yb - vpy) * H)  # back wall depth
        self.Wr = bw * W * self.Zb / self.f  # half room width
        self.Yc = (vt - vpy) * H * self.Zb / self.f  # vault crown
        self.Ys = (ys - vpy) * H * self.Zb / self.f  # vault springing line

    def p(self, X, Y, Z):
        return (self.cx + self.f * X / Z, self.cy + self.f * Y / Z)

    def ps(self, seq):
        return [self.p(*q) for q in seq]

    def scale(self, Z):
        """Pixels per world unit at depth Z."""
        return self.f / Z

    def half_visible(self, Z):
        return (self.W / 2) * Z / self.f


class Canvas:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.defs = []
        self.col, self.dep, self.emi = [], [], []

    # -- low level ---------------------------------------------------------
    @staticmethod
    def _grey(z):
        g = int(255 * max(0.0, min(1.0, z / ZMAX)))
        return "#%02x%02x%02x" % (g, g, g)

    def solid(self, tag, geom, fill, z, stroke=None, sw=0, extra="", depth=True):
        """Opaque shape: painted in colour, grey in depth, black in emissive."""
        s = ' stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"' % (
            hexc(stroke), sw) if stroke else ""
        fl = hexc(fill) if fill != "none" else "none"
        self.col.append('<%s %s fill="%s"%s %s/>' % (tag, geom, fl, s, extra))
        g = self._grey(z)
        gs = ' stroke="%s" stroke-width="%.2f" stroke-linecap="round"' % (g, sw) if stroke else ""
        gf = g if fill != "none" else "none"
        if depth:
            self.dep.append('<%s %s fill="%s"%s/>' % (tag, geom, gf, gs))
        bs = ' stroke="#000" stroke-width="%.2f" stroke-linecap="round"' % sw if stroke else ""
        bf = "#000" if fill != "none" else "none"
        self.emi.append('<%s %s fill="%s"%s/>' % (tag, geom, bf, bs))

    def poly(self, points, fill, z, **kw):
        self.solid("polygon", 'points="%s"' % pts(points), fill, z, **kw)

    def path(self, d, fill, z, **kw):
        self.solid("path", 'd="%s"' % d, fill, z, **kw)

    def paint(self, markup):
        """Colour-only overlay (shading, cobwebs, translucent details)."""
        self.col.append(markup)

    def glow(self, markup, colour_markup=None):
        """Light source: drawn in the emissive pass (and optionally in colour)."""
        self.emi.append(markup)
        if colour_markup:
            self.col.append(colour_markup)

    def open(self, colour_attrs="", all_attrs=""):
        self.col.append("<g %s %s>" % (colour_attrs, all_attrs))
        self.dep.append("<g %s>" % all_attrs)
        self.emi.append("<g %s>" % all_attrs)

    def close(self):
        for L in (self.col, self.dep, self.emi):
            L.append("</g>")

    # -- output ------------------------------------------------------------
    def svg(self, which, scale=2):
        body = {"color": self.col, "depth": self.dep, "emissive": self.emi}[which]
        bg = {"color": "#07080c", "depth": "#ffffff", "emissive": "#000"}[which]
        return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
                "<defs>%s</defs><rect width=\"100%%\" height=\"100%%\" fill=\"%s\"/>%s</svg>") % (
            self.W * scale, self.H * scale, self.W, self.H, "".join(self.defs), bg, "".join(body))


STD_DEFS = """
<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="blur5" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="blur12" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12"/></filter>
<filter id="blur30" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="rock" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="5" seed="11" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="4" result="n2"/>
  <feDiffuseLighting in="n2" surfaceScale="2.6" diffuseConstant="1" lighting-color="#fff" result="l">
    <feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>
  <feComposite in="l" in2="d" operator="arithmetic" k1="1.25" k2="0" k3="0" k4="0" result="m"/>
  <feComposite in="m" in2="d" operator="in"/>
</filter>
<filter id="rockfine" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="21" result="n2"/>
  <feDiffuseLighting in="n2" surfaceScale="1.6" diffuseConstant="1" lighting-color="#fff" result="l">
    <feDistantLight azimuth="235" elevation="55"/></feDiffuseLighting>
  <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1.2" k2="0" k3="0" k4="0" result="m"/>
  <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="8" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
</filter>
"""


# -- rasterising -------------------------------------------------------------
def render(canvas, which, out_png, scale=2):
    html = out_png.replace(".png", ".html")
    with open(html, "w") as fh:
        fh.write('<html><body style="margin:0;background:#000;overflow:hidden">%s</body></html>'
                 % canvas.svg(which, scale))
    W, H = canvas.W * scale, canvas.H * scale
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=%d,%d" % (W, H),
                    "--screenshot=%s" % out_png, "file://" + html],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
    img = Image.open(out_png).convert("RGB")
    return img.resize((canvas.W, canvas.H), Image.LANCZOS)


def to_f(img):
    return np.asarray(img).astype(np.float32) / 255.0


def from_f(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


# -- procedural helpers ------------------------------------------------------
def value_noise(W, H, cell, rng, stretch=(1.0, 1.0)):
    """Smooth noise in [0, 1] with feature size ~cell pixels."""
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
    """Gaussian blur of a float array (H, W) or (H, W, 3)."""
    if a.ndim == 2:
        im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
        return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
    return np.stack([blur(a[..., i], r) for i in range(3)], -1)


def blur_hdr(a, r):
    """Blur that keeps precision for values above 1 by splitting into ranges."""
    m = max(1e-6, float(a.max()))
    return blur(a / m, r) * m


def radial(W, H, cx, cy, rx, ry=None):
    ry = ry or rx
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)


def polygon_mask(W, H, points, r=0):
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in points], fill=255)
    if r:
        im = im.filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im).astype(np.float32) / 255.0


def brush_texture(W, H, rng, angle_deg=-20, length=22):
    """Directional streak noise that imitates brush strokes (mean 0)."""
    big = int(math.hypot(W, H)) + 4
    n = rng.random((big // 2, big // 2)).astype(np.float32)
    im = Image.fromarray((n * 255).astype(np.uint8)).resize((big, big), Image.BILINEAR)
    im = im.resize((big // length, big), Image.BILINEAR).resize((big, big), Image.BICUBIC)
    im = im.rotate(angle_deg, resample=Image.BICUBIC)
    l, t = (big - W) // 2, (big - H) // 2
    a = np.asarray(im.crop((l, t, l + W, t + H))).astype(np.float32) / 255.0
    return a - a.mean()


def luminance(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def finish(img, rng, top_calm=0.10, floor_band=0.22, max_value=0.86, grain=0.018,
           vignette=0.55, stroke_amount=0.035, mottling=0.07, shadow_tint=(0.02, 0.03, 0.06), paint_filter=3):
    """Painterly finishing: mottling, strokes, tone ceiling, vignette, calm bands and grain."""
    H, W, _ = img.shape
    lum = luminance(img)[..., None]
    # soft shoulder so nothing reaches pure white
    knee = max_value * 0.62
    over = np.clip(img - knee, 0, None)
    img = np.where(img > knee, knee + (max_value - knee) * (1 - np.exp(-over / (max_value - knee))), img)
    # paint-like softening: a small median filter merges hard vector edges into dabs
    if paint_filter:
        img = to_f(from_f(img).filter(ImageFilter.MedianFilter(paint_filter)))
    mott = fbm(W, H, 180, rng, 4) - 0.5
    img = img * (1 + mottling * mott[..., None])
    s1 = brush_texture(W, H, rng, -24, 26)
    s2 = brush_texture(W, H, rng, 58, 18)
    img = img * (1 + stroke_amount * (s1 + 0.6 * s2)[..., None] * 2.0)
    # cool the shadows a little
    img = img + np.array(shadow_tint, np.float32) * (1 - np.clip(lum * 3, 0, 1))
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((x - W * 0.5) / (W * 0.62)) ** 2 + ((y - H * 0.55) / (H * 0.7)) ** 2)
    img = img * (1 - vignette * np.clip(r - 0.55, 0, 1)[..., None] ** 1.4)
    top = np.clip(1 - y / (H * top_calm * 1.6), 0, 1) ** 1.5
    img = img * (1 - 0.45 * top[..., None])
    fl = np.clip((y - H * (1 - floor_band)) / (H * floor_band), 0, 1)
    img = img * (1 - 0.35 * fl[..., None])
    img = img + rng.normal(0, grain, (H, W, 1)).astype(np.float32)
    return np.clip(img, 0, 1)


def save_webp(img_f, path, max_kb, q_hi=85, q_lo=78):
    im = from_f(img_f)
    q = q_hi
    while True:
        im.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= max_kb or q <= q_lo:
            return q, kb
        q -= 1


def mockup(img_f, out_png, hero_x=0.20, enemies=(0.62, 0.80)):
    """Review mock-up: black placeholder silhouettes and a dark top bar (not delivered)."""
    im = from_f(img_f).convert("RGBA")
    W, H = im.size
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle([0, 0, W, int(H * 0.075)], fill=(10, 10, 14, 235))
    k = min(W / 1920, H / 1080) ** 0.5 * (1.0 if W > H else 1.25)
    fy = H * 0.9

    def figure(cx, h, colour, rim=None):
        w = h * 0.42
        body = [(cx - w * 0.5, fy), (cx - w * 0.35, fy - h * 0.55), (cx - w * 0.45, fy - h * 0.78),
                (cx, fy - h * 0.82), (cx + w * 0.45, fy - h * 0.78), (cx + w * 0.35, fy - h * 0.55),
                (cx + w * 0.5, fy)]
        if rim:
            d.polygon([(x - 3, y - 3) for x, y in body], fill=rim)
            d.ellipse([cx - w * 0.22 - 3, fy - h - 3, cx + w * 0.22 - 3, fy - h * 0.8 - 3], fill=rim)
        d.polygon(body, fill=colour)
        d.ellipse([cx - w * 0.22, fy - h, cx + w * 0.22, fy - h * 0.8], fill=colour)

    figure(W * hero_x, H * 0.36 * k, (5, 5, 8, 255), rim=(190, 210, 255, 200))
    for ex in enemies:
        figure(W * ex, H * 0.30 * k, (60, 70, 55, 255))
    d.line([(0, H * 0.78), (W, H * 0.78)], fill=(255, 80, 80, 90), width=1)
    Image.alpha_composite(im, ov).convert("RGB").save(out_png)
