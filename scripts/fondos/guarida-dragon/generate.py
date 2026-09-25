"""Combat background for Act III: "La Guarida del Dragón" (Ignifax's lair).

Paints a colossal volcanic cavern procedurally: lava crack and falls behind
the hero (upper left), lava river in the distance, basalt pillars,
stalactites, a gold hoard with crowns, goblets, swords and shields, giant
bones of old prey, kobold altars with offerings, smoke and ash.

Usage: python3 generate.py <scratch_dir> <output_dir>
"""

import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paint_tools as pt  # noqa: E402

LIGHT = (255, 150, 110)


def hexc(r, g, b):
    return "#%02x%02x%02x" % tuple(int(max(0, min(255, v))) for v in (r, g, b))


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def ridge(rng, x0, x1, base, amp, step, freq=1.0):
    """Irregular silhouette line from x0 to x1 around `base`."""
    ph = rng.random(3) * 10
    out = []
    x = x0
    while x <= x1 + step:
        t = x / 300.0 * freq
        y = base - amp * (0.5 * math.sin(t + ph[0]) + 0.3 * math.sin(2.3 * t + ph[1])
                          + 0.2 * math.sin(5.1 * t + ph[2])) - rng.random() * amp * 0.35
        out.append((x, y))
        x += step * (0.6 + rng.random() * 0.8)
    return out


class Scene:
    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.s = min(w, h) / 1080.0
        self.rng = np.random.default_rng(seed)
        self.defs = []
        self.body = []
        self.lx, self.ly = 0.23 * w, 0.23 * h
        self.floor = 0.78 * h
        self.river = 0.60 * h

    def light_at(self, x, y):
        """0..1 warm light falloff from the main source (plus river glow)."""
        d = math.hypot((x - self.lx) / self.w, (y - self.ly) / self.h)
        main = max(0.0, 1.0 - d / 0.85) ** 1.6
        side = max(0.0, 1.0 - x / self.w * 1.25)
        return min(1.0, main * 0.85 + side * 0.25)

    def add(self, s):
        self.body.append(s)

    # ------------------------------------------------------------------ defs
    def build_defs(self):
        w, h, s = self.w, self.h, self.s
        lr, lg, lb = LIGHT
        self.defs.append(f"""
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#120807"/>
  <stop offset="0.45" stop-color="#2e140d"/>
  <stop offset="0.62" stop-color="#4a1d10"/>
  <stop offset="0.8" stop-color="#1c0c08"/>
  <stop offset="1" stop-color="#0d0605"/>
</linearGradient>
<radialGradient id="mainGlow" gradientUnits="userSpaceOnUse" cx="{self.lx}" cy="{self.ly}" r="{0.62 * w}">
  <stop offset="0" stop-color="rgb({lr},{lg},{lb})" stop-opacity="0.75"/>
  <stop offset="0.25" stop-color="rgb({lr},{lg - 30},{lb - 40})" stop-opacity="0.38"/>
  <stop offset="0.6" stop-color="rgb(160,60,30)" stop-opacity="0.12"/>
  <stop offset="1" stop-color="rgb(80,20,10)" stop-opacity="0"/>
</radialGradient>
<linearGradient id="lavaRiver" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#ffc07a"/>
  <stop offset="0.3" stop-color="#ff8a44"/>
  <stop offset="0.55" stop-color="#c8461c"/>
  <stop offset="0.8" stop-color="#6a1c0c"/>
  <stop offset="1" stop-color="#3a0e08"/>
</linearGradient>
<linearGradient id="lavaFall" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#ffd49a"/>
  <stop offset="0.5" stop-color="#ff9a55"/>
  <stop offset="1" stop-color="#ff7a3a"/>
</linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#f6cf78"/>
  <stop offset="0.45" stop-color="#c88a34"/>
  <stop offset="1" stop-color="#4a2a0e"/>
</linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#e6c6b0"/>
  <stop offset="0.5" stop-color="#8a7470"/>
  <stop offset="1" stop-color="#3a2c2a"/>
</linearGradient>
<linearGradient id="bone" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#b08a70"/>
  <stop offset="0.5" stop-color="#6a4a3a"/>
  <stop offset="1" stop-color="#2a1a14"/>
</linearGradient>
<linearGradient id="basalt" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#6a3424"/>
  <stop offset="0.35" stop-color="#3a1c14"/>
  <stop offset="1" stop-color="#140a08"/>
</linearGradient>
<linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#2a130c"/>
  <stop offset="0.25" stop-color="#1a0c08"/>
  <stop offset="1" stop-color="#0a0504"/>
</linearGradient>
<linearGradient id="penumbra" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#1a0605" stop-opacity="0"/>
  <stop offset="0.5" stop-color="#1a0605" stop-opacity="0"/>
  <stop offset="0.75" stop-color="#1a0605" stop-opacity="0.35"/>
  <stop offset="1" stop-color="#140404" stop-opacity="0.6"/>
</linearGradient>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="{0.014 / s:.4f}" numOctaves="4" seed="3"/>
  <feDisplacementMap in="SourceGraphic" scale="{16 * s:.1f}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="roughFine" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="{0.05 / s:.4f}" numOctaves="3" seed="9"/>
  <feDisplacementMap in="SourceGraphic" scale="{5 * s:.1f}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="rockTex" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}">
  <feTurbulence type="fractalNoise" baseFrequency="{0.011 / s:.4f} {0.02 / s:.4f}" numOctaves="6" seed="21" result="n"/>
  <feDiffuseLighting in="n" surfaceScale="{6 * s:.1f}" lighting-color="#ffffff" result="lit">
    <feDistantLight azimuth="200" elevation="42"/>
  </feDiffuseLighting>
  <feBlend in="lit" in2="SourceGraphic" mode="overlay" result="bl"/>
  <feComposite in="bl" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="smoke" x="-30%" y="-30%" width="160%" height="160%">
  <feTurbulence type="fractalNoise" baseFrequency="{0.008 / s:.4f}" numOctaves="4" seed="5"/>
  <feDisplacementMap in="SourceGraphic" scale="{120 * s:.0f}" xChannelSelector="R" yChannelSelector="B"/>
  <feGaussianBlur stdDeviation="{14 * s:.1f}"/>
</filter>
""")
        for r in (2, 5, 12, 30, 70):
            self.defs.append(
                f'<filter id="b{r}" x="-100%" y="-100%" width="300%" height="300%">'
                f'<feGaussianBlur stdDeviation="{r * s:.1f}"/></filter>')

    # ---------------------------------------------------------------- layers
    def background(self):
        w, h = self.w, self.h
        self.add(f'<rect width="{w}" height="{h}" fill="url(#bg)"/>')
        self.add(f'<rect width="{w}" height="{h}" fill="url(#mainGlow)"/>')

    def far_walls(self):
        """Three receding layers of cavern wall, hazier with depth."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        layers = [
            (0.40, 70, (120, 52, 34), 0.9),
            (0.47, 90, (84, 36, 24), 1.0),
            (0.53, 60, (58, 24, 16), 1.0),
        ]
        for i, (base, amp, col, op) in enumerate(layers):
            line = ridge(rng, -20, w + 20, base * h, amp * s, 26 * s, freq=1.3 + i * 0.4)
            poly = line + [(w + 20, self.river + 20), (-20, self.river + 20)]
            self.add(f'<polygon points="{pts(poly)}" fill="{hexc(*col)}" opacity="{op}" '
                     f'filter="url(#rough)"/>')
            # warm rim on crests facing the light
            rim = [(x, y + 2 * s) for x, y in line if x < w * 0.7]
            self.add(f'<polyline points="{pts(rim)}" fill="none" stroke="rgb(255,150,100)" '
                     f'stroke-width="{2.2 * s:.1f}" opacity="{0.35 - i * 0.08:.2f}" filter="url(#b2)"/>')
        # far ceiling vault: an arch of darker rock framing the cavern
        top = ridge(rng, -20, w + 20, 0.2 * h, 40 * s, 30 * s, freq=0.8)
        poly = [(-20, -20), (w + 20, -20)] + top[::-1]
        self.add(f'<polygon points="{pts(poly)}" fill="#1a0b08" filter="url(#rough)"/>')
        self.add(f'<rect width="{w}" height="{0.42 * h:.0f}" fill="#1a0b08" opacity="0.5"/>')

    def lava_crack(self):
        """Glowing fissure top-left: the main light source."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        cx, cy = self.lx, self.ly
        # dark rock mass around the crack
        # overhang of the ceiling that holds the crack, hanging from the top edge
        mass = [(cx - 0.3 * w, -20)]
        for i in range(31):
            t = i / 30
            x = cx - 0.3 * w + t * 0.62 * w
            y = cy + 0.07 * h * math.sin(math.pi * t) ** 0.6 + (rng.random() - 0.5) * 18 * s - 0.1 * h * (1 - math.sin(math.pi * t))
            mass.append((x, y))
        mass.append((cx + 0.32 * w, -20))
        self.add(f'<polygon points="{pts(mass)}" fill="#1c0c08" opacity="0.8" filter="url(#rough)"/>')
        # zig-zag fissure
        top, bot = [], []
        n = 16
        for i in range(n + 1):
            t = i / n
            x = cx - 0.12 * w + t * 0.24 * w
            y = cy - 0.07 * h + t * 0.09 * h + math.sin(t * 9) * 12 * s + (rng.random() - 0.5) * 16 * s
            width = (18 + 34 * math.sin(math.pi * t) ** 0.8) * s
            top.append((x, y - width * 0.5))
            bot.append((x + (rng.random() - 0.5) * 8 * s, y + width * 0.5))
        crack = top + bot[::-1]
        self.add(f'<polygon points="{pts(crack)}" fill="rgb(255,150,110)" opacity="0.9" filter="url(#b30)"/>')
        self.add(f'<polygon points="{pts(crack)}" fill="#ff9a5a" filter="url(#roughFine)"/>')
        inner = [(x, y + (by - y) * 0.3) for (x, y), (bx, by) in zip(top, bot)] + \
                [(x, y - (y - ty) * 0.3) for (x, y), (tx, ty) in zip(bot[::-1], top[::-1])]
        self.add(f'<polygon points="{pts(inner)}" fill="#ffd8a8" opacity="0.85" filter="url(#b5)"/>')
        # branching hairline cracks
        for _ in range(9):
            x, y = crack[rng.integers(0, len(crack))]
            path = [(x, y)]
            ang = rng.random() * 2 * math.pi
            for _ in range(5):
                ang += (rng.random() - 0.5) * 1.2
                x += math.cos(ang) * 22 * s
                y += math.sin(ang) * 14 * s
                path.append((x, y))
            self.add(f'<polyline points="{pts(path)}" fill="none" stroke="#ff9a5a" '
                     f'stroke-width="{2.4 * s:.1f}" opacity="0.8"/>')
        return crack

    def light_shafts(self):
        """Faint diagonal shafts of warm light spilling from the crack."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for i in range(6):
            a0 = 0.35 + i * 0.16 + rng.random() * 0.05
            spread = 0.04 + rng.random() * 0.04
            ln = (0.7 + rng.random() * 0.4) * h
            p = [(self.lx, self.ly),
                 (self.lx + math.cos(a0) * ln, self.ly + math.sin(a0) * ln),
                 (self.lx + math.cos(a0 + spread) * ln, self.ly + math.sin(a0 + spread) * ln)]
            self.add(f'<polygon points="{pts(p)}" fill="rgb(255,150,110)" opacity="{0.05 + rng.random() * 0.04:.2f}" filter="url(#b30)"/>')

    def lava_falls(self):
        """Curtains of lava pouring from rock ledges into the river."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        falls = [
            (self.lx + 0.015 * w, self.ly + 0.02 * h, 58 * s, 1.0),   # main, from the crack
            (0.06 * w, 0.16 * h, 20 * s, 0.7),
            (0.47 * w, 0.17 * h, 30 * s, 0.6),
            (0.69 * w, 0.18 * h, 14 * s, 0.22),                  # dim, right side
        ]
        for x, y0, fw, op in falls:
            y1 = self.river + 6 * s
            steps = 24
            left, right = [], []
            for i in range(steps + 1):
                t = i / steps
                y = y0 + (y1 - y0) * t
                wob = math.sin(t * 5 + x * 0.01) * 5 * s
                width = fw * (0.6 + 0.9 * t ** 1.5)
                left.append((x - width / 2 + wob + (rng.random() - 0.5) * 3 * s, y))
                right.append((x + width / 2 + wob + (rng.random() - 0.5) * 3 * s, y))
            path = left + right[::-1]
            self.add(f'<polygon points="{pts(path)}" fill="rgb(255,140,90)" opacity="{0.55 * op:.2f}" filter="url(#b30)"/>')
            self.add(f'<polygon points="{pts(path)}" fill="#c8481c" opacity="{op:.2f}" filter="url(#roughFine)"/>')
            # bright flowing ribbons inside the curtain
            for k in range(int(fw / s / 5)):
                off = (rng.random() - 0.5) * 0.8
                rib = []
                for i in range(steps + 1):
                    t = i / steps
                    lx, ly = left[i]
                    rx, _ = right[i]
                    rib.append((lx + (rx - lx) * (0.5 + off * (0.9 - 0.3 * t)) + math.sin(t * 9 + k) * 2 * s, ly))
                col = ["#ffd8a0", "#ffb070", "#ff8a44", "#7a2410"][rng.integers(0, 4)]
                self.add(f'<polyline points="{pts(rib)}" fill="none" stroke="{col}" '
                         f'stroke-width="{(1.5 + rng.random() * 4) * s:.1f}" opacity="{op * (0.5 + rng.random() * 0.5):.2f}"/>')
            if fw < 50 * s:
                ledge = None
            # rock ledge at the lip (only for the main fall under the crack)
            else:
                ledge = [(x - fw * 1.3, y0 + 4 * s), (x - fw * 0.9, y0 - 10 * s), (x + fw * 0.8, y0 - 12 * s),
                     (x + fw * 1.4, y0 + 2 * s), (x + fw * 0.6, y0 + 8 * s), (x - fw * 0.6, y0 + 9 * s)]
            if ledge:
                self.add(f'<polygon points="{pts(ledge)}" fill="#2a120c" filter="url(#rough)"/>')
            # steam and splash glow at the foot
            self.add(f'<ellipse cx="{x:.1f}" cy="{y1:.1f}" rx="{fw * 2.4:.1f}" ry="{fw * 0.7:.1f}" '
                     f'fill="#ffb070" opacity="{0.6 * op:.2f}" filter="url(#b12)"/>')
            self.add(f'<ellipse cx="{x:.1f}" cy="{y1 - 30 * s:.1f}" rx="{fw * 3:.1f}" ry="{fw * 1.2:.1f}" '
                     f'fill="#8a5a4a" opacity="{0.25 * op:.2f}" filter="url(#smoke)"/>')

    def bridge(self):
        """Ancient kobold-carved stone bridge arching over the distant river."""
        w, h, s = self.w, self.h, self.s
        x0, x1, y = 0.50 * w, 0.66 * w, self.river - 4 * s
        top = y - 0.10 * h
        d = (f"M{x0:.1f},{y:.1f} Q{(x0 + x1) / 2:.1f},{top - 0.04 * h:.1f} {x1:.1f},{y:.1f} "
             f"L{x1 - 22 * s:.1f},{y:.1f} Q{(x0 + x1) / 2:.1f},{top + 0.02 * h:.1f} {x0 + 22 * s:.1f},{y:.1f} Z")
        self.add(f'<path d="{d}" fill="#3a1a12" opacity="0.85" filter="url(#rough)"/>')
        # railing posts and tiny kobold banners
        for i in range(7):
            t = (i + 0.5) / 7
            bx = x0 + (x1 - x0) * t
            by = y + (1 - (2 * t - 1) ** 2) * 0.5 * (top - 0.04 * h - y)
            self.add(f'<rect x="{bx - 2 * s:.1f}" y="{by - 14 * s:.1f}" width="{4 * s:.1f}" height="{14 * s:.1f}" fill="#2a120c"/>')
            if i % 3 == 1:
                self.add(f'<path d="M{bx:.1f},{by - 30 * s:.1f} l{12 * s:.1f},{4 * s:.1f} l{-12 * s:.1f},{5 * s:.1f} Z" fill="#7a2418" opacity="0.7"/>'
                         f'<line x1="{bx:.1f}" y1="{by - 30 * s:.1f}" x2="{bx:.1f}" y2="{by:.1f}" stroke="#2a120c" stroke-width="{1.5 * s:.1f}"/>')
        self.add(f'<rect x="{x0 - 20 * s:.1f}" y="{top - 0.08 * h:.1f}" width="{x1 - x0 + 40 * s:.1f}" height="{0.2 * h:.1f}" '
                 f'fill="#6a2c1c" opacity="0.28" filter="url(#b30)"/>')
    def lava_river(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        y = self.river
        top = [(x, y - 8 * s + math.sin(x / (140 * s)) * 6 * s) for x in np.linspace(-20, w + 20, 60)]
        bot = [(x, y + 16 * s + math.sin(x / (90 * s) + 1) * 7 * s + (1 - x / w) * 10 * s)
               for x in np.linspace(w + 20, -20, 60)]
        band = top + bot
        self.add(f'<polygon points="{pts(band)}" fill="url(#lavaRiver)" filter="url(#b30)" opacity="0.9"/>')
        self.add(f'<polygon points="{pts(band)}" fill="url(#lavaRiver)" filter="url(#roughFine)"/>')
        # crust plates floating
        for _ in range(int(90 * w / 1920)):
            cx = rng.random() * w
            cy = y + (rng.random() * 18 - 4) * s
            rw = (6 + rng.random() * 26) * s
            dim = 0.3 + 0.5 * (cx / w)
            self.add(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rw:.1f}" ry="{rw * 0.18:.1f}" '
                     f'fill="#3a1208" opacity="{dim:.2f}"/>')
        # banks
        bank = ridge(rng, -20, w + 20, y + 14 * s, 8 * s, 18 * s, freq=4)
        poly = bank + [(w + 20, y + 60 * s), (-20, y + 60 * s)]
        self.add(f'<polygon points="{pts(poly)}" fill="#26100a" filter="url(#rough)"/>')

    def basalt_cluster(self, x0, count, base_y, top_y, col_w, dim, far=False):
        """Hexagonal basalt columns: lit left face, dark right face, caps."""
        s, rng = self.s, self.rng
        x = x0
        for _ in range(count):
            cw = col_w * (0.7 + rng.random() * 0.6)
            ty = top_y + rng.random() * (base_y - top_y) * 0.35
            face = cw * 0.38
            lit = self.light_at(x, ty) * dim
            lc = mix((40, 18, 12), (170, 80, 50), lit)
            mc = mix((26, 12, 9), (90, 40, 26), lit)
            dc = mix((12, 6, 5), (40, 18, 12), lit)
            self.add(f'<polygon points="{pts([(x, ty + face * 0.3), (x + face, ty), (x + face, base_y), (x, base_y)])}" fill="{hexc(*lc)}"/>')
            self.add(f'<polygon points="{pts([(x + face, ty), (x + cw - face * 0.6, ty), (x + cw - face * 0.6, base_y), (x + face, base_y)])}" fill="{hexc(*mc)}"/>')
            self.add(f'<polygon points="{pts([(x + cw - face * 0.6, ty), (x + cw, ty + face * 0.35), (x + cw, base_y), (x + cw - face * 0.6, base_y)])}" fill="{hexc(*dc)}"/>')
            # horizontal joints
            yy = ty + (40 + rng.random() * 60) * s
            while yy < base_y - 20 * s:
                self.add(f'<line x1="{x:.1f}" y1="{yy:.1f}" x2="{x + cw:.1f}" y2="{yy + 3 * s:.1f}" '
                         f'stroke="#0c0605" stroke-width="{1.6 * s:.1f}" opacity="0.7"/>')
                yy += (50 + rng.random() * 90) * s
            if lit > 0.25:
                self.add(f'<line x1="{x + 1:.1f}" y1="{ty + face * 0.3:.1f}" x2="{x + 1:.1f}" y2="{base_y:.1f}" '
                         f'stroke="rgb(255,160,110)" stroke-width="{1.5 * s:.1f}" opacity="{min(0.7, lit):.2f}"/>')
            x += cw * (0.92 + rng.random() * 0.2)
        return x

    def pillars(self):
        w, h, s = self.w, self.h, self.s
        # far columns (veiled by haze)
        self.basalt_cluster(0.33 * w, 4, self.river + 10 * s, 0.24 * h, 34 * s, 0.9, far=True)
        self.basalt_cluster(0.58 * w, 5, self.river + 10 * s, 0.28 * h, 30 * s, 0.7, far=True)
        self.add('</g>')
        # atmospheric veil over the far columns
        self.add(f'<rect x="{0.3 * w:.1f}" y="{0.2 * h:.1f}" width="{0.45 * w:.1f}" height="{0.45 * h:.1f}" '
                 f'fill="#6a2c1c" opacity="0.4" filter="url(#b30)"/>')
        self.add('<g filter="url(#rockTex)">')
        # mid columns reaching the ceiling
        self.basalt_cluster(-0.01 * w, 3, 0.74 * h, -0.02 * h, 58 * s, 1.0)
        self.basalt_cluster(0.86 * w, 4, 0.76 * h, -0.02 * h, 62 * s, 0.6)

    def stalactites(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for layer, (col, n, maxlen) in enumerate([((44, 20, 14), 40, 0.2), ((22, 10, 8), 26, 0.26)]):
            for _ in range(int(n * w / 1920)):
                x = rng.random() * w
                ln = (0.05 + rng.random() * maxlen) * h
                bw = (14 + rng.random() * 34) * s * (1 + layer * 0.4)
                pts_l = [(x - bw / 2, -5)]
                segs = 6
                for i in range(1, segs):
                    t = i / segs
                    pts_l.append((x - bw / 2 * (1 - t) ** 0.8 + (rng.random() - 0.5) * 4 * s, ln * t))
                pts_l.append((x + (rng.random() - 0.5) * 3 * s, ln))
                for i in range(segs - 1, 0, -1):
                    t = i / segs
                    pts_l.append((x + bw / 2 * (1 - t) ** 0.8 + (rng.random() - 0.5) * 4 * s, ln * t))
                pts_l.append((x + bw / 2, -5))
                lit = self.light_at(x, ln * 0.5)
                c = mix(col, (150, 70, 44), lit * (0.7 if layer == 0 else 0.45))
                self.add(f'<polygon points="{pts(pts_l)}" fill="{hexc(*c)}"/>')
                if lit > 0.2:
                    self.add(f'<line x1="{x - bw * 0.3:.1f}" y1="0" x2="{x:.1f}" y2="{ln:.1f}" '
                             f'stroke="rgb(255,150,100)" stroke-width="{1.4 * s:.1f}" opacity="{lit * 0.5:.2f}"/>')
                if rng.random() < 0.25 and lit > 0.3:
                    self.add(f'<circle cx="{x:.1f}" cy="{ln + 6 * s:.1f}" r="{2.2 * s:.1f}" fill="#ffb070" opacity="0.8"/>')

    # ---------------------------------------------------------- treasure
    def goblet(self, x, y, u, rot, lit):
        g = hexc(*mix((90, 56, 22), (250, 206, 120), lit))
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f}) scale({u:.2f})">'
                 f'<path d="M-10 -22 L10 -22 Q9 -8 2 -5 L2 6 L8 10 L-8 10 L-2 6 L-2 -5 Q-9 -8 -10 -22 Z" '
                 f'fill="url(#gold)" stroke="#2a1606" stroke-width="0.8"/>'
                 f'<path d="M-8 -20 Q-7 -10 -2 -7" stroke="{g}" stroke-width="1.3" fill="none"/>'
                 f'<circle cx="0" cy="-14" r="2" fill="#a0202a"/></g>')

    def crown(self, x, y, u, rot, lit):
        g = hexc(*mix((110, 70, 30), (255, 220, 140), lit))
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f}) scale({u:.2f})">'
                 f'<path d="M-14 0 L-15 -14 L-8 -6 L0 -18 L8 -6 L15 -14 L14 0 Z" fill="url(#gold)" '
                 f'stroke="#2a1606" stroke-width="0.8"/>'
                 f'<rect x="-14" y="-4" width="28" height="4" fill="{g}" opacity="0.7"/>'
                 f'<circle cx="0" cy="-8" r="2.2" fill="#2a6a8a"/><circle cx="-8" cy="-3" r="1.6" fill="#8a1a24"/>'
                 f'<circle cx="8" cy="-3" r="1.6" fill="#1a6a3a"/><circle cx="0" cy="-18" r="1.4" fill="{g}"/></g>')

    def sword(self, x, y, u, rot, lit):
        g = hexc(*mix((80, 60, 50), (255, 200, 170), lit))
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f}) scale({u:.2f})">'
                 f'<polygon points="-2,0 2,0 1.5,-50 0,-56 -1.5,-50" fill="url(#steel)" stroke="#1a1210" stroke-width="0.5"/>'
                 f'<line x1="-0.6" y1="-2" x2="-0.6" y2="-50" stroke="{g}" stroke-width="0.6"/>'
                 f'<rect x="-9" y="0" width="18" height="3" rx="1" fill="url(#gold)"/>'
                 f'<rect x="-1.5" y="3" width="3" height="10" fill="#3a2016"/>'
                 f'<circle cx="0" cy="14.5" r="2.6" fill="url(#gold)"/></g>')

    def shield(self, x, y, u, rot, lit, kind):
        base = [(130, 34, 26), (40, 84, 80), (150, 96, 50), (70, 40, 30)][kind % 4]
        c = hexc(*mix(tuple(v * 0.35 for v in base), base, lit))
        g = hexc(*mix((90, 56, 22), (240, 190, 100), lit))
        if kind % 2 == 0:
            self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f}) scale({u:.2f})">'
                     f'<circle r="16" fill="{c}" stroke="{g}" stroke-width="2.4"/>'
                     f'<circle r="4.5" fill="url(#gold)"/>'
                     f'<path d="M-11 -11 A16 16 0 0 1 11 -11" stroke="{g}" stroke-width="1" fill="none" opacity="0.6"/></g>')
        else:
            self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f}) scale({u:.2f})">'
                     f'<path d="M-14 -16 L14 -16 L14 -2 Q14 12 0 20 Q-14 12 -14 -2 Z" fill="{c}" stroke="{g}" stroke-width="2.2"/>'
                     f'<path d="M0 -14 L0 17 M-12 -4 L12 -4" stroke="{g}" stroke-width="2"/></g>')

    def chest(self, x, y, u, lit):
        wood = hexc(*mix((30, 16, 10), (120, 66, 36), lit))
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) scale({u:.2f})">'
                 f'<rect x="-22" y="-14" width="44" height="22" fill="{wood}" stroke="#140a06" stroke-width="1"/>'
                 f'<path d="M-22 -14 Q0 -30 22 -14" fill="{wood}" stroke="#140a06" stroke-width="1" transform="rotate(-24 -22 -14)"/>'
                 f'<rect x="-22" y="-10" width="44" height="3" fill="url(#gold)"/>'
                 f'<rect x="-14" y="-14" width="3" height="22" fill="url(#gold)"/><rect x="11" y="-14" width="3" height="22" fill="url(#gold)"/>'
                 f'<ellipse cx="0" cy="-16" rx="16" ry="4" fill="#f0c060" opacity="0.8"/></g>')

    def hoard(self, cx, base, width, height, density, n_items, dim=1.0):
        """Mound of coins with treasure items sticking out of its surface."""
        s, rng = self.s, self.rng

        def surf(x):
            t = (x - cx) / (width / 2)
            if abs(t) >= 1:
                return base
            bump = (1 - t * t) ** 1.4 * (1 + 0.15 * math.sin(t * 7 + cx))
            return base - height * bump

        xs = np.linspace(cx - width / 2, cx + width / 2, 80)
        outline = [(x, surf(x) + (rng.random() - 0.5) * 3 * s) for x in xs] + [(cx + width / 2, base + 6 * s), (cx - width / 2, base + 6 * s)]
        self.add(f'<polygon points="{pts(outline)}" fill="#5a3410"/>')
        self.add(f'<polygon points="{pts(outline)}" fill="url(#gold)" opacity="{0.3 * dim:.2f}"/>')
        coins = []
        for _ in range(int(density * width * height / (s * s) / 1000)):
            x = cx + (rng.random() - 0.5) * width
            top = surf(x)
            if top >= base:
                continue
            y = top + (rng.random() ** 2) * (base - top)
            coins.append((y, x, top))
        coins.sort()
        for y, x, top in coins:
            depth = (y - top) / max(1.0, base - top)
            lit = self.light_at(x, y) * dim * (1 - 0.65 * depth)
            r = (3.4 + rng.random() * 4.2) * s
            c = mix((96, 58, 20), (255, 214, 130), min(1.0, 0.2 + lit * (0.8 + rng.random() * 0.4)))
            rim = hexc(*mix(c, (30, 16, 6), 0.55))
            self.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r:.1f}" ry="{r * 0.55:.1f}" fill="{hexc(*c)}" '
                     f'stroke="{rim}" stroke-width="{0.7 * s:.1f}"/>')
            if lit > 0.45 and rng.random() < 0.5:
                self.add(f'<ellipse cx="{x - r * 0.3:.1f}" cy="{y - r * 0.2:.1f}" rx="{r * 0.4:.1f}" ry="{r * 0.18:.1f}" '
                         f'fill="#fff0c0" opacity="{(lit - 0.3):.2f}"/>')
        kinds = ["goblet", "crown", "shield", "chest", "goblet", "sword", "crown", "shield", "goblet"]
        for i in range(n_items):
            x = cx + (rng.random() - 0.5) * width * 0.85
            y = surf(x) + (4 + rng.random() * 12) * s
            lit = self.light_at(x, y) * dim
            u = (0.8 + rng.random() * 0.5) * s
            k = kinds[i % len(kinds)]
            if k == "goblet":
                self.goblet(x, y, u, (rng.random() - 0.5) * 50, lit)
            elif k == "crown":
                self.crown(x, y, u, (rng.random() - 0.5) * 30, lit)
            elif k == "sword":
                self.sword(x, y, u * 1.3, (rng.random() - 0.5) * 50, lit)
            elif k == "shield":
                self.shield(x, y, u * 1.2, (rng.random() - 0.5) * 40, lit, i)
            else:
                self.chest(x, y, u, lit)
        return surf

    # -------------------------------------------------------------- bones
    def rib_cage(self, x0, x1, base, height):
        s = self.s
        n = 9
        spine = []
        for i in range(n):
            t = i / (n - 1)
            x = x0 + (x1 - x0) * t
            sy = base - height * (0.9 + 0.1 * math.sin(t * math.pi))
            spine.append((x, sy))
            rh = height * (0.95 - 0.35 * abs(t - 0.4))
            lean = (t - 0.5) * 40 * s
            thick = (9 - 4 * abs(t - 0.4)) * s
            d = (f"M{x:.1f},{sy:.1f} Q{x + lean + 60 * s:.1f},{sy + rh * 0.3:.1f} {x + lean + 22 * s:.1f},{base:.1f} "
                 f"L{x + lean + 22 * s + thick:.1f},{base:.1f} Q{x + lean + 60 * s + thick * 1.8:.1f},{sy + rh * 0.3:.1f} "
                 f"{x + thick:.1f},{sy:.1f} Z")
            self.add(f'<path d="{d}" fill="url(#bone)" stroke="#120806" stroke-width="{1.2 * s:.1f}"/>')
        self.add(f'<polyline points="{pts(spine)}" fill="none" stroke="#5a3e30" stroke-width="{16 * s:.1f}" '
                 f'stroke-linecap="round"/>')
        for x, y in spine:
            self.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{11 * s:.1f}" ry="{9 * s:.1f}" fill="url(#bone)" '
                     f'stroke="#120806" stroke-width="{1 * s:.1f}"/>')
            self.add(f'<polygon points="{pts([(x - 4 * s, y - 6 * s), (x + 6 * s, y - 26 * s), (x + 5 * s, y - 5 * s)])}" '
                     f'fill="#4a3226"/>')

    def skull(self, x, y, u):
        """Huge horned beast skull lying on the ground, facing left."""
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) scale({u:.3f})">'
                 # horn
                 f'<path d="M40 -60 Q90 -150 170 -130 Q110 -120 80 -50 Z" fill="url(#bone)" stroke="#120806" stroke-width="2"/>'
                 # cranium and snout
                 f'<path d="M-140 -10 Q-150 -40 -120 -50 L-30 -70 Q20 -100 80 -80 Q130 -60 120 0 L100 30 '
                 f'L40 20 L-20 30 L-110 20 Q-140 15 -140 -10 Z" fill="url(#bone)" stroke="#120806" stroke-width="2.5"/>'
                 # lower jaw
                 f'<path d="M-120 22 L40 28 L90 40 Q60 60 20 52 L-100 44 Q-125 38 -120 22 Z" fill="#4a3226" stroke="#120806" stroke-width="2"/>'
                 # eye socket and nostril
                 f'<ellipse cx="30" cy="-42" rx="26" ry="18" fill="#0e0605"/>'
                 f'<ellipse cx="-110" cy="-22" rx="10" ry="6" fill="#0e0605"/>'
                 f'<path d="M-10 -20 Q30 -5 70 -10" stroke="#0e0605" stroke-width="3" fill="none" opacity="0.7"/>'
                 # teeth
                 + "".join(f'<polygon points="{-110 + i * 16},20 {-104 + i * 16},40 {-98 + i * 16},21" fill="#8a6a54"/>' for i in range(8))
                 + f'<path d="M-130 -30 Q-60 -62 40 -78" stroke="#b89078" stroke-width="3" fill="none" opacity="0.5"/>'
                 f'</g>')

    def femur(self, x, y, length, rot):
        s = self.s
        self.add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f})">'
                 f'<rect x="0" y="{-7 * s:.1f}" width="{length:.1f}" height="{14 * s:.1f}" fill="url(#bone)"/>'
                 f'<circle cx="0" cy="{-8 * s:.1f}" r="{12 * s:.1f}" fill="url(#bone)"/>'
                 f'<circle cx="0" cy="{8 * s:.1f}" r="{11 * s:.1f}" fill="url(#bone)"/>'
                 f'<circle cx="{length:.1f}" cy="{-9 * s:.1f}" r="{12 * s:.1f}" fill="url(#bone)"/>'
                 f'<circle cx="{length:.1f}" cy="{8 * s:.1f}" r="{13 * s:.1f}" fill="url(#bone)"/></g>')

    # -------------------------------------------------------------- kobolds
    def altar(self, x, base, u):
        """Kobold altar: stone slab, carved dragon sigil, candles and offerings."""
        s, rng = self.s, self.rng
        lit = self.light_at(x, base)
        stone = hexc(*mix((30, 16, 12), (120, 64, 44), lit))
        stone_d = hexc(*mix((16, 8, 6), (60, 30, 20), lit))
        g = []
        g.append(f'<rect x="-40" y="-40" width="80" height="40" fill="{stone}" stroke="#0e0605" stroke-width="1.5"/>')
        g.append(f'<rect x="20" y="-40" width="20" height="40" fill="{stone_d}"/>')
        g.append(f'<rect x="-48" y="-50" width="96" height="11" fill="{stone}" stroke="#0e0605" stroke-width="1.5"/>')
        # carved dragon sigil (glowing faintly)
        g.append('<path d="M-12 -12 Q-4 -34 8 -26 Q2 -22 6 -16 Q14 -12 10 -6 Q0 -14 -12 -12 Z" fill="#ff7a3a" opacity="0.55"/>')
        # candles
        for cxk in (-40, -30, 28, 38, -6):
            hgt = 8 + rng.random() * 12
            g.append(f'<rect x="{cxk - 2}" y="{-50 - hgt:.1f}" width="4" height="{hgt:.1f}" fill="#c8a880"/>')
            g.append(f'<circle cx="{cxk}" cy="{-53 - hgt:.1f}" r="7" fill="#ffb070" opacity="0.35" filter="url(#b5)"/>')
            g.append(f'<ellipse cx="{cxk}" cy="{-53 - hgt:.1f}" rx="1.6" ry="3.2" fill="#ffe0b0"/>')
        # offerings: bowl of coins, small skull, gem
        g.append('<path d="M-22 -50 Q-14 -40 -6 -50 Z" fill="#6a4a2a"/><ellipse cx="-14" cy="-51" rx="7" ry="2" fill="#e8b860"/>')
        g.append('<circle cx="12" cy="-55" r="5" fill="#a88a70"/><circle cx="10" cy="-56" r="1.2" fill="#140a08"/>'
                 '<circle cx="14" cy="-56" r="1.2" fill="#140a08"/>')
        g.append('<polygon points="0,-58 3,-53 0,-50 -3,-53" fill="#c83040"/>')
        # totem with dragon head on the side
        g.append(f'<rect x="-66" y="-120" width="8" height="120" fill="{stone_d}"/>')
        g.append(f'<path d="M-70 -120 L-50 -132 L-34 -126 L-48 -120 L-40 -112 L-58 -114 Z" fill="{stone}" stroke="#0e0605" stroke-width="1"/>')
        g.append('<circle cx="-46" cy="-126" r="1.6" fill="#ff9a5a"/>')
        # hanging kobold banner
        g.append('<path d="M-58 -106 L-32 -106 L-36 -70 L-45 -78 L-54 -70 Z" fill="#6a1a14" opacity="0.9"/>')
        g.append('<path d="M-50 -98 L-40 -98 L-45 -84 Z" fill="#c89040" opacity="0.8"/>')
        self.add(f'<g transform="translate({x:.1f},{base:.1f}) scale({u:.2f})">{"".join(g)}</g>')

    # --------------------------------------------------------------- floor
    def floor_plane(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        edge = ridge(rng, -20, w + 20, self.floor, 10 * s, 20 * s, freq=3)
        poly = edge + [(w + 20, h + 20), (-20, h + 20)]
        self.add(f'<polygon points="{pts(poly)}" fill="url(#floorG)" filter="url(#rough)"/>')
        # soft warm sheen near the hero
        self.add(f'<ellipse cx="{0.22 * w:.1f}" cy="{self.floor + 0.05 * h:.1f}" rx="{0.3 * w:.1f}" ry="{0.05 * h:.1f}" '
                 f'fill="rgb(255,140,100)" opacity="0.14" filter="url(#b30)"/>')
        # a few scattered coins and pebbles along the floor's rear edge
        for _ in range(int(60 * w / 1920)):
            x = rng.random() * w
            y = self.floor + rng.random() * 0.03 * h
            lit = self.light_at(x, y) * 0.8
            c = mix((40, 24, 10), (220, 170, 90), lit)
            self.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{3 * s:.1f}" ry="{1.5 * s:.1f}" fill="{hexc(*c)}"/>')
        # faint glowing cracks, very subdued
        for _ in range(5):
            x = rng.random() * w * 0.5
            y = self.floor + (0.04 + rng.random() * 0.14) * h
            path = [(x, y)]
            for _ in range(7):
                x += (20 + rng.random() * 40) * s
                y += (rng.random() - 0.5) * 10 * s
                path.append((x, y))
            self.add(f'<polyline points="{pts(path)}" fill="none" stroke="#ff7a3a" stroke-width="{1.4 * s:.1f}" '
                     f'opacity="0.22" filter="url(#b2)"/>')

    # ---------------------------------------------------------- atmosphere
    def haze(self, y, height, color, opacity):
        w = self.w
        self.add(f'<rect x="{-0.1 * w:.1f}" y="{y:.1f}" width="{1.2 * w:.1f}" height="{height:.1f}" fill="{color}" '
                 f'opacity="{opacity}" filter="url(#b70)"/>')

    def smoke(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for _ in range(9):
            cx = rng.random() * w
            cy = (0.15 + rng.random() * 0.45) * h
            self.add(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{(120 + rng.random() * 220) * s:.1f}" '
                     f'ry="{(30 + rng.random() * 60) * s:.1f}" fill="#5a2418" opacity="{0.10 + rng.random() * 0.08:.2f}" '
                     f'filter="url(#smoke)"/>')
        # a smoke column rising from the altars' incense
        for x in (0.33 * w,):
            self.add(f'<path d="M{x:.1f},{0.66 * h:.1f} C{x - 30 * s:.1f},{0.5 * h:.1f} {x + 40 * s:.1f},{0.4 * h:.1f} '
                     f'{x:.1f},{0.25 * h:.1f}" stroke="#8a5a4a" stroke-width="{30 * s:.1f}" fill="none" opacity="0.18" filter="url(#smoke)"/>')

    def ash(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for _ in range(int(380 * w * h / (1920 * 1080))):
            x, y = rng.random() * w, (0.08 + rng.random() * 0.75) * h
            r = (0.6 + rng.random() * 1.6) * s
            self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#9a8478" opacity="{0.25 + rng.random() * 0.35:.2f}"/>')
        for _ in range(int(140 * w * h / (1920 * 1080))):
            x = rng.random() * w * (0.35 + 0.65 * rng.random())
            y = (0.1 + rng.random() * 0.7) * h
            r = (0.8 + rng.random() * 1.8) * s
            op = 0.5 + rng.random() * 0.5
            if x > 0.55 * w:
                op *= 0.4
            self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 3:.1f}" fill="#ff8a4a" opacity="{op * 0.3:.2f}" filter="url(#b2)"/>')
            self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#ffc890" opacity="{op:.2f}"/>')

    # --------------------------------------------------------------- build
    def build(self):
        w, h, s = self.w, self.h, self.s
        self.build_defs()
        self.background()
        self.add('<g filter="url(#rockTex)">')
        self.far_walls()
        self.add('</g>')
        self.lava_falls()
        self.lava_crack()
        self.light_shafts()
        self.haze(0.45 * h, 0.2 * h, "#ff8a5a", 0.18)
        self.add('<g filter="url(#rockTex)">')
        self.pillars()
        self.add('</g>')
        self.bridge()
        self.lava_river()
        self.haze(0.52 * h, 0.14 * h, "#c8583a", 0.22)
        self.add('<g filter="url(#rockTex)">')
        self.stalactites()
        self.add('</g>')
        # mid plane: giant rib cage behind the right-hand hoard, in shadow
        self.rib_cage(0.60 * w, 0.84 * w, 0.72 * h, 0.2 * h)
        # hoards
        self.hoard(0.03 * w, 0.75 * h, 0.16 * w, 0.07 * h, 2.2, 4)
        self.hoard(0.50 * w, 0.76 * h, 0.42 * w, 0.16 * h, 2.6, 26)
        self.hoard(0.76 * w, 0.765 * h, 0.2 * w, 0.06 * h, 1.8, 6, dim=0.6)
        self.femur(0.40 * w, 0.73 * h, 190 * s, -8)
        self.altar(0.33 * w, 0.765 * h, 1.15 * s)
        self.altar(0.12 * w, 0.755 * h, 0.9 * s)
        self.skull(0.9 * w, 0.735 * h, 0.95 * s)
        self.smoke()
        self.add(f'<rect width="{w}" height="{h}" fill="url(#penumbra)"/>')
        self.add('<g filter="url(#rockTex)">')
        self.floor_plane()
        self.add('</g>')
        # contact shadow grounding the mid plane on the floor
        self.add(f'<rect x="-20" y="{self.floor - 14 * s:.1f}" width="{w + 40}" height="{40 * s:.1f}" fill="#0a0403" '
                 f'opacity="0.55" filter="url(#b12)"/>')
        self.ash()
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>')


def post(img, w, h, seed):
    rng = np.random.default_rng(seed)
    a = np.asarray(img, np.float32) / 255.0
    a = pt.kuwahara(a, r=2)
    a = pt.painterly_warp(a, rng, amp=2.4 * min(w, h) / 1080, scale=10)
    # rock texture and low-frequency colour variation
    n1 = pt.fractal_noise(h, w, rng, octaves=6, base=6)[..., None]
    n2 = pt.fractal_noise(h, w, rng, octaves=3, base=2)[..., None]
    a *= 0.84 + 0.3 * n1
    a *= np.concatenate([0.95 + 0.1 * n2, 0.96 + 0.06 * n2, 0.97 + 0.03 * n2], axis=2)
    a *= pt.brush_texture(h, w, rng, strength=0.07)
    a = pt.bloom(a, threshold=0.55)
    # colour grade: warm midtones, lifted reddish shadows
    a = np.clip(a, 0, None) ** np.array([0.96, 1.02, 1.08], np.float32)
    a = a * 0.94 + np.array([0.028, 0.010, 0.006], np.float32)
    # calm top band, darker floor, vignette
    a *= pt.vertical_band(h, w, 0.0, 0.16, 0.45)
    a *= 1 - 0.35 * np.clip((np.linspace(0, 1, h)[:, None, None] - 0.8) / 0.2, 0, 1)
    a *= pt.vignette(h, w, cx=0.35, cy=0.45, strength=0.5)
    # keep the floor a deep warm brown (the relief overlay drains its blue)
    fy = np.clip((np.linspace(0, 1, h)[:, None, None] - 0.78) / 0.22, 0, 1) * 0.45
    a = a * (1 - fy) + np.array([0.075, 0.036, 0.032], np.float32) * fy
    # warm the upper cavern so it doesn't read grey
    uy = np.clip(1 - np.abs(np.linspace(0, 1, h)[:, None, None] - 0.3) / 0.15, 0, 1) * 0.4
    lum = a[..., :1] * 0.3 + a[..., 1:2] * 0.55 + a[..., 2:] * 0.15
    a = a * (1 - uy) + lum * np.array([1.45, 0.72, 0.5], np.float32) * uy
    a += (rng.normal(0, 0.012, a.shape[:2])[..., None]).astype(np.float32)
    return np.clip(a, 0, 0.93)


def main():
    scratch = sys.argv[1]
    outdir = sys.argv[2]
    os.makedirs(scratch, exist_ok=True)
    os.makedirs(outdir, exist_ok=True)
    for suffix, (w, h), max_kb in (("", (1920, 1080), 380), ("-movil", (1080, 1440), 300)):
        name = f"guarida-dragon{suffix}"
        svg = Scene(w, h, seed=7).build()
        png = os.path.join(scratch, f"{name}.png")
        img = pt.render_svg(svg, w, h, png)
        arr = post(img, w, h, seed=11)
        q, kb = pt.save_webp(arr, os.path.join(outdir, f"{name}.webp"), quality=85, max_kb=max_kb)
        pt.mockup(arr, os.path.join(scratch, f"{name}-maqueta.png"))
        print(f"{name}.webp  q={q}  {kb:.0f} KB")


if __name__ == "__main__":
    main()
