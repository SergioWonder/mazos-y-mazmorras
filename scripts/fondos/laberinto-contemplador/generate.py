"""Combat background for Act III: "El Laberinto del Contemplador".

Paints an impossible arcane labyrinth procedurally: twisting carved walls,
isometric floating maze islands with stairs and arches that defy
perspective (an upside-down island, a sideways flight, a stair into
nowhere), embedded arcane crystals, faint glowing runes, petrified
adventurers and, far away in the mist, the silhouette of a giant eye.
A warm arcane orb (upper left) is the main light.

Usage: python3 generate.py <scratch_dir> <output_dir>
"""

import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paint_tools as pt  # noqa: E402

LIGHT = (255, 150, 110)
MIST = (58, 48, 82)
STONE = (104, 96, 124)


def hexc(r, g, b):
    return "#%02x%02x%02x" % tuple(int(max(0, min(255, v))) for v in (r, g, b))


def mix(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def mul(c, k):
    return tuple(v * k for v in c)


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


class Scene:
    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.s = min(w, h) / 1080.0
        self.rng = np.random.default_rng(seed)
        self.defs = []
        self.body = []
        self.lx, self.ly = 0.22 * w, 0.23 * h
        self.floor = 0.78 * h

    def add(self, s):
        self.body.append(s)

    def light_at(self, x, y):
        d = math.hypot((x - self.lx) / self.w, (y - self.ly) / self.h)
        return max(0.0, 1.0 - d / 0.8) ** 1.5

    # ------------------------------------------------------------------ defs
    def build_defs(self):
        w, h, s = self.w, self.h, self.s
        lr, lg, lb = LIGHT
        self.defs.append(f"""
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#0c0a16"/>
  <stop offset="0.35" stop-color="#1e1830"/>
  <stop offset="0.6" stop-color="#2c2440"/>
  <stop offset="0.8" stop-color="#16121f"/>
  <stop offset="1" stop-color="#0b0911"/>
</linearGradient>
<radialGradient id="orbGlow" gradientUnits="userSpaceOnUse" cx="{self.lx}" cy="{self.ly}" r="{0.6 * w}">
  <stop offset="0" stop-color="rgb({lr},{lg},{lb})" stop-opacity="0.7"/>
  <stop offset="0.2" stop-color="rgb({lr},{lg - 20},{lb - 10})" stop-opacity="0.32"/>
  <stop offset="0.55" stop-color="rgb(150,80,90)" stop-opacity="0.1"/>
  <stop offset="1" stop-color="rgb(60,40,80)" stop-opacity="0"/>
</radialGradient>
<radialGradient id="orbCore" cx="0.4" cy="0.38" r="0.6">
  <stop offset="0" stop-color="#fff0dc"/>
  <stop offset="0.35" stop-color="#ffc49a"/>
  <stop offset="0.8" stop-color="rgb({lr},{lg},{lb})"/>
  <stop offset="1" stop-color="#b85a48"/>
</radialGradient>
<radialGradient id="eyeIris" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#0c0814"/>
  <stop offset="0.35" stop-color="#2a1c3c"/>
  <stop offset="0.8" stop-color="#4a3464"/>
  <stop offset="1" stop-color="#2a2038"/>
</radialGradient>
<linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#262036"/>
  <stop offset="0.3" stop-color="#18141f"/>
  <stop offset="1" stop-color="#0a0810"/>
</linearGradient>
<linearGradient id="penumbra" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#0c0a14" stop-opacity="0"/>
  <stop offset="0.5" stop-color="#0c0a14" stop-opacity="0"/>
  <stop offset="0.8" stop-color="#0c0a14" stop-opacity="0.3"/>
  <stop offset="1" stop-color="#08060e" stop-opacity="0.55"/>
</linearGradient>
<linearGradient id="crystalT" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#b8fff0"/>
  <stop offset="0.5" stop-color="#3ab0a8"/>
  <stop offset="1" stop-color="#123c44"/>
</linearGradient>
<linearGradient id="crystalV" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#e8d0ff"/>
  <stop offset="0.5" stop-color="#8a5ad8"/>
  <stop offset="1" stop-color="#2a1a4a"/>
</linearGradient>
<linearGradient id="crystalW" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fff0d8"/>
  <stop offset="0.5" stop-color="#ff9a70"/>
  <stop offset="1" stop-color="#6a2a24"/>
</linearGradient>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="{0.02 / s:.4f}" numOctaves="3" seed="4"/>
  <feDisplacementMap in="SourceGraphic" scale="{6 * s:.1f}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="stoneTex" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}">
  <feTurbulence type="fractalNoise" baseFrequency="{0.016 / s:.4f} {0.024 / s:.4f}" numOctaves="6" seed="31" result="n"/>
  <feDiffuseLighting in="n" surfaceScale="{4 * s:.1f}" lighting-color="#ffffff" result="lit">
    <feDistantLight azimuth="210" elevation="45"/>
  </feDiffuseLighting>
  <feBlend in="lit" in2="SourceGraphic" mode="overlay" result="bl"/>
  <feComposite in="bl" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="mist" x="-30%" y="-30%" width="160%" height="160%">
  <feTurbulence type="fractalNoise" baseFrequency="{0.006 / s:.4f}" numOctaves="4" seed="8"/>
  <feDisplacementMap in="SourceGraphic" scale="{140 * s:.0f}" xChannelSelector="R" yChannelSelector="B"/>
  <feGaussianBlur stdDeviation="{18 * s:.1f}"/>
</filter>
""")
        for r in (1, 3, 6, 12, 30, 70):
            self.defs.append(
                f'<filter id="b{r}" x="-100%" y="-100%" width="300%" height="300%">'
                f'<feGaussianBlur stdDeviation="{r * s:.1f}"/></filter>')

    # ----------------------------------------------------------- isometric
    @staticmethod
    def iso(ox, oy, u, x, y, z):
        return (ox + (x - y) * 0.866 * u, oy + (x + y) * 0.5 * u - z * u)

    def shade(self, px, py, haze):
        """Face colours (top, left, right) for a stone box at screen point."""
        lit = self.light_at(px, py)
        top = mix(STONE, (230, 170, 140), lit * 0.8)
        left = mix(mul(STONE, 0.72), (180, 120, 104), lit * 0.55)
        right = mix(mul(STONE, 0.38), (90, 60, 66), lit * 0.4)
        return tuple(hexc(*mix(c, MIST, haze)) for c in (top, left, right))

    def box(self, ox, oy, u, x, y, z, dx, dy, dz, haze=0.0, bricks=True, out=None):
        P = lambda a, b, c: self.iso(ox, oy, u, a, b, c)  # noqa: E731
        cx, cy = P(x + dx / 2, y + dy / 2, z + dz)
        top, left, right = self.shade(cx, cy, haze)
        g = []
        g.append(f'<polygon points="{pts([P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)])}" fill="{top}"/>')
        g.append(f'<polygon points="{pts([P(x, y + dy, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)])}" fill="{left}"/>')
        g.append(f'<polygon points="{pts([P(x + dx, y, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x + dx, y, z + dz)])}" fill="{right}"/>')
        edge = hexc(*mix((20, 16, 30), MIST, haze))
        g.append(f'<polyline points="{pts([P(x, y + dy, z + dz), P(x + dx, y + dy, z + dz), P(x + dx, y, z + dz)])}" '
                 f'fill="none" stroke="{hexc(*mix((240, 200, 180), MIST, haze))}" stroke-width="{0.8 * self.s:.1f}" opacity="0.35"/>')
        g.append(f'<line x1="{P(x + dx, y + dy, z)[0]:.1f}" y1="{P(x + dx, y + dy, z)[1]:.1f}" '
                 f'x2="{P(x + dx, y + dy, z + dz)[0]:.1f}" y2="{P(x + dx, y + dy, z + dz)[1]:.1f}" stroke="{edge}" stroke-width="{0.8 * self.s:.1f}" opacity="0.6"/>')
        if bricks and dz > 1.2 and u > 6 * self.s:
            zz = z + 0.55
            row = 0
            while zz < z + dz - 0.1:
                a, b = P(x, y + dy, zz), P(x + dx, y + dy, zz)
                c, d = P(x + dx, y, zz), P(x + dx, y + dy, zz)
                g.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{edge}" stroke-width="{0.7 * self.s:.1f}" opacity="0.45"/>')
                g.append(f'<line x1="{c[0]:.1f}" y1="{c[1]:.1f}" x2="{d[0]:.1f}" y2="{d[1]:.1f}" stroke="{edge}" stroke-width="{0.7 * self.s:.1f}" opacity="0.45"/>')
                # vertical joints, staggered
                xx = x + (0.5 if row % 2 else 1.0)
                while xx < x + dx:
                    p1, p2 = P(xx, y + dy, zz), P(xx, y + dy, min(zz + 0.55, z + dz))
                    g.append(f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" stroke="{edge}" stroke-width="{0.6 * self.s:.1f}" opacity="0.35"/>')
                    xx += 1.0
                zz += 0.55
                row += 1
        svg = "".join(g)
        if out is not None:
            out.append(((x + dx) + (y + dy) + z * 0.01, svg))
        else:
            self.add(svg)

    def stairs(self, ox, oy, u, x, y, z, steps, axis, haze, out, width=2.0, rise=0.5, run=0.7):
        """A flight ascending along +x (axis='x') or -y (axis='y')."""
        for i in range(steps):
            if axis == "x":
                self.box(ox, oy, u, x + i * run, y, z, run, width, rise * (i + 1), haze, bricks=False, out=out)
            else:
                self.box(ox, oy, u, x, y - (i + 1) * run, z, width, run, rise * (i + 1), haze, bricks=False, out=out)

    def arch_on_left_face(self, ox, oy, u, x0, x1, y, z, height, haze):
        """Dark arched doorway cut into a wall face at plane y."""
        P = lambda a, b, c: self.iso(ox, oy, u, a, b, c)  # noqa: E731
        r = (x1 - x0) / 2
        cxk = x0 + r
        p = [P(x0, y, z)]
        p.append(P(x0, y, z + height - r))
        for k in range(1, 12):
            a = math.pi - math.pi * k / 12
            p.append(P(cxk + math.cos(a) * r, y, z + height - r + math.sin(a) * r))
        p.append(P(x1, y, z + height - r))
        p.append(P(x1, y, z))
        dark = hexc(*mix((10, 8, 18), MIST, haze))
        lip = hexc(*mix((200, 170, 170), MIST, haze))
        return (f'<polygon points="{pts(p)}" fill="{dark}"/>'
                f'<polyline points="{pts(p[1:-1])}" fill="none" stroke="{lip}" stroke-width="{1.2 * self.s:.1f}" opacity="0.35"/>')

    def island_underside(self, ox, oy, u, dx, dy, depth, haze):
        """Jagged rock root hanging below a floating platform."""
        rng = self.rng
        P = lambda a, b, c: self.iso(ox, oy, u, a, b, c)  # noqa: E731
        edge = [P(0, dy, 0), P(dx / 2, dy, 0), P(dx, dy, 0), P(dx, dy / 2, 0), P(dx, 0, 0)]
        tip = P(dx * 0.6, dy * 0.6, -depth)
        pts_l = [edge[0]]
        n = 10
        for i in range(1, n):
            t = i / n
            bx = edge[0][0] + (edge[-1][0] - edge[0][0]) * t
            by = max(edge[0][1], edge[-1][1]) + 6 * self.s
            k = 1 - abs(2 * t - 1)
            pts_l.append((bx + (rng.random() - 0.5) * u, by + (tip[1] - by) * k ** 0.8 * (0.6 + rng.random() * 0.4)))
        pts_l.append(edge[-1])
        pts_l += [edge[3], edge[2], edge[1]]
        c = hexc(*mix((36, 30, 50), MIST, haze))
        return f'<polygon points="{pts(pts_l)}" fill="{c}"/>'

    def island(self, ox, oy, u, dx, dy, haze, walls, stair=None, arch=None, tower=None, crystals=0):
        """Floating platform with maze walls. Returns list of screen points for props."""
        out = []
        self.add(self.island_underside(ox, oy, u, dx, dy, dx * 0.7, haze))
        self.box(ox, oy, u, 0, 0, -1.0, dx, dy, 1.0, haze, bricks=False)
        for (x, y, wx, wy, hz) in walls:
            self.box(ox, oy, u, x, y, 0, wx, wy, hz, haze, out=out)
        if stair:
            self.stairs(ox, oy, u, *stair, haze=haze, out=out)
        if tower:
            tx, ty, tw, th = tower
            self.box(ox, oy, u, tx, ty, 0, tw, tw, th, haze, out=out)
            # crenellations
            for k in range(3):
                self.box(ox, oy, u, tx + k * tw / 3, ty + tw - 0.35, th, tw / 6, 0.35, 0.5, haze, bricks=False, out=out)
        out.sort(key=lambda t: t[0])
        for _, svg in out:
            self.add(svg)
        if arch:
            self.add(self.arch_on_left_face(ox, oy, u, *arch, haze=haze))

    # --------------------------------------------------------------- scene
    def background(self):
        w, h = self.w, self.h
        self.add(f'<rect width="{w}" height="{h}" fill="url(#bg)"/>')
        self.add(f'<rect width="{w}" height="{h}" fill="url(#orbGlow)"/>')

    def giant_eye(self):
        """Very subtle silhouette of the Beholder's eye, deep in the mist."""
        w, h, s = self.w, self.h, self.s
        cx, cy = 0.64 * w, 0.30 * h
        ew, eh = 0.15 * w * (1 if w > h else 1.35), 0.07 * h
        d = f"M{cx - ew:.1f},{cy:.1f} Q{cx:.1f},{cy - eh * 2:.1f} {cx + ew:.1f},{cy:.1f} Q{cx:.1f},{cy + eh * 2:.1f} {cx - ew:.1f},{cy:.1f} Z"
        self.add(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{ew * 1.5:.1f}" ry="{eh * 2.6:.1f}" fill="#120e1c" opacity="0.5" filter="url(#b30)"/>')
        self.add(f'<path d="{d}" fill="#5a4a6e" opacity="0.22" filter="url(#b6)"/>')
        ir = eh * 0.95
        self.add(f'<circle cx="{cx + ew * 0.08:.1f}" cy="{cy:.1f}" r="{ir:.1f}" fill="url(#eyeIris)" opacity="0.35" filter="url(#b3)"/>')
        self.add(f'<ellipse cx="{cx + ew * 0.08:.1f}" cy="{cy:.1f}" rx="{ir * 0.18:.1f}" ry="{ir * 0.75:.1f}" fill="#06040a" opacity="0.32" filter="url(#b3)"/>')
        self.add(f'<circle cx="{cx + ew * 0.08:.1f}" cy="{cy:.1f}" r="{ir:.1f}" fill="none" stroke="#9a70d0" stroke-width="{2 * s:.1f}" opacity="0.18" filter="url(#b3)"/>')
        # lids and faint veins
        self.add(f'<path d="M{cx - ew:.1f},{cy:.1f} Q{cx:.1f},{cy - eh * 2:.1f} {cx + ew:.1f},{cy:.1f}" fill="none" stroke="#1a1426" stroke-width="{8 * s:.1f}" opacity="0.45" filter="url(#b3)"/>')
        rng = self.rng
        for _ in range(9):
            a = rng.random() * 2 * math.pi
            r0 = ir * 1.05
            x, y = cx + math.cos(a) * r0, cy + math.sin(a) * r0 * 0.9
            p = [(x, y)]
            for _ in range(4):
                x += math.cos(a) * ew * 0.12 + (rng.random() - 0.5) * 8 * s
                y += math.sin(a) * eh * 0.25 + (rng.random() - 0.5) * 6 * s
                p.append((x, y))
            self.add(f'<polyline points="{pts(p)}" fill="none" stroke="#7a3a5a" stroke-width="{1.2 * s:.1f}" opacity="0.14"/>')

    def maze_walls(self, n):
        """Perfect maze on an n x n grid (recursive backtracker); returns wall segments."""
        rng = self.rng
        visited = np.zeros((n, n), bool)
        h_walls = np.ones((n + 1, n), bool)   # wall along x at row j, cell i
        v_walls = np.ones((n, n + 1), bool)   # wall along y at column i, cell j
        stack = [(0, 0)]
        visited[0, 0] = True
        while stack:
            i, j = stack[-1]
            nb = [(di, dj) for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if 0 <= i + di < n and 0 <= j + dj < n and not visited[i + di, j + dj]]
            if not nb:
                stack.pop()
                continue
            di, dj = nb[rng.integers(0, len(nb))]
            if di == 1:
                v_walls[j, i + 1] = False
            elif di == -1:
                v_walls[j, i] = False
            elif dj == 1:
                h_walls[j + 1, i] = False
            else:
                h_walls[j, i] = False
            visited[i + di, j + dj] = True
            stack.append((i + di, j + dj))
        segs = []
        for j in range(n + 1):
            for i in range(n):
                if h_walls[j, i]:
                    segs.append((i, j - 0.14, 1.0, 0.28))
        for j in range(n):
            for i in range(n + 1):
                if v_walls[j, i]:
                    segs.append((i - 0.14, j, 0.28, 1.0))
        return segs

    def maze_plane(self, ox, oy, u, n, haze_far, haze_near, wall_h=1.3):
        """A vast labyrinth seen from above, fading into the mist with depth."""
        self.box(ox, oy, u, 0, 0, -0.6, n, n, 0.6, (haze_far + haze_near) / 2, bricks=False)
        out = []
        for x, y, dx, dy in self.maze_walls(n):
            t = (x + y) / (2 * n)
            haze = haze_far + (haze_near - haze_far) * t
            hz = wall_h * (1 + 0.6 * (self.rng.random() < 0.04))
            self.box(ox, oy, u, x, y, 0, dx, dy, hz, haze, bricks=False, out=out)
        out.sort(key=lambda t: t[0])
        for _, svg in out:
            self.add(svg)

    def mist(self, y0, y1, color, op, n=7):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for _ in range(n):
            cx = rng.random() * w
            cy = y0 + rng.random() * (y1 - y0)
            self.add(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{(160 + rng.random() * 260) * s:.1f}" '
                     f'ry="{(30 + rng.random() * 60) * s:.1f}" fill="{color}" opacity="{op * (0.6 + rng.random() * 0.6):.2f}" filter="url(#mist)"/>')

    def far_structures(self):
        """Hazy distant fragments: stairs, arches and walls at odd angles."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        specs = [
            (0.08, 0.40, 0), (0.40, 0.22, 90), (0.52, 0.47, 0), (0.83, 0.42, 180),
            (0.30, 0.52, 0), (0.93, 0.20, 270), (0.72, 0.56, 0), (0.60, 0.14, 180),
        ]
        for fx, fy, rot in specs:
            ox, oy = fx * w, fy * h
            u = (7 + rng.random() * 4) * s
            haze = 0.72 + rng.random() * 0.12
            self.add(f'<g transform="rotate({rot} {ox:.1f} {oy:.1f})">')
            out = []
            self.box(ox, oy, u, 0, 0, -0.8, 7, 4, 0.8, haze, bricks=False)
            self.stairs(ox, oy, u, 0.5, 3, 0, 6, "x", haze, out, width=1.5)
            self.box(ox, oy, u, 4.5, 0.5, 0, 0.6, 3, 4 + rng.random() * 3, haze, bricks=False, out=out)
            out.sort(key=lambda t: t[0])
            for _, svg in out:
                self.add(svg)
            self.add(self.arch_on_left_face(ox, oy, u, 4.6, 5.0, 3.5, 0, 2.2, haze))
            self.add('</g>')

    def orb(self):
        """Warm arcane orb floating over an amber crystal shard: the key light."""
        w, h, s, rng = self.w, self.h, self.s, self.rng
        x, y = self.lx, self.ly
        r = 30 * s
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 5:.1f}" fill="rgb(255,150,110)" opacity="0.35" filter="url(#b30)"/>')
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 2:.1f}" fill="#ffb890" opacity="0.5" filter="url(#b12)"/>')
        # orbiting rune rings
        for k, (rx, ry, rot) in enumerate(((r * 2.6, r * 0.8, -18), (r * 3.4, r * 1.0, 24))):
            self.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" transform="rotate({rot} {x:.1f} {y:.1f})" '
                     f'fill="none" stroke="#ffc8a0" stroke-width="{1.6 * s:.1f}" stroke-dasharray="{6 * s:.1f} {4 * s:.1f} {1.5 * s:.1f} {4 * s:.1f}" opacity="{0.55 - 0.15 * k:.2f}"/>')
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="url(#orbCore)"/>')
        self.add(f'<ellipse cx="{x - r * 0.35:.1f}" cy="{y - r * 0.4:.1f}" rx="{r * 0.35:.1f}" ry="{r * 0.2:.1f}" fill="#fff8f0" opacity="0.7"/>')
        # floating shards
        for i in range(7):
            a = i / 7 * 2 * math.pi + rng.random() * 0.4
            d = r * (3.2 + rng.random() * 1.8)
            sx, sy = x + math.cos(a) * d, y + math.sin(a) * d * 0.45 + r * 0.6
            sz = (5 + rng.random() * 7) * s
            self.add(f'<polygon points="{pts([(sx, sy - sz * 1.6), (sx + sz * 0.5, sy), (sx, sy + sz * 0.9), (sx - sz * 0.5, sy)])}" '
                     f'fill="url(#crystalW)" opacity="0.9"/>')
        # rock with amber crystals underneath
        base_y = y + r * 3.2
        rock = [(x - r * 2.6, base_y), (x - r * 1.2, base_y - r * 0.5), (x + r * 1.4, base_y - r * 0.4),
                (x + r * 2.4, base_y + r * 0.2), (x + r * 0.6, base_y + r * 1.4), (x - r * 0.2, base_y + r * 2.8),
                (x - r * 1.3, base_y + r * 1.2)]
        self.add(f'<polygon points="{pts(rock)}" fill="#3a2a36" filter="url(#rough)"/>')
        self.add(f'<polyline points="{pts(rock[:4])}" fill="none" stroke="#ffb890" stroke-width="{2 * s:.1f}" opacity="0.6"/>')
        self.crystal_cluster(x - r * 0.4, base_y - r * 0.2, 1.3 * s, "crystalW", 5, glow="#ffb080")

    def crystal_cluster(self, x, y, u, grad, n, glow, glow_op=0.35, spread=1.0):
        rng = self.rng
        self.add(f'<ellipse cx="{x:.1f}" cy="{y - 18 * u:.1f}" rx="{36 * u * spread:.1f}" ry="{30 * u:.1f}" fill="{glow}" '
                 f'opacity="{glow_op:.2f}" filter="url(#b12)"/>')
        for i in range(n):
            ang = (i - (n - 1) / 2) * 16 + (rng.random() - 0.5) * 12
            hgt = (22 + rng.random() * 34) * u
            wid = (6 + rng.random() * 6) * u
            bx = x + (i - (n - 1) / 2) * 7 * u * spread
            g = (f'<g transform="translate({bx:.1f},{y:.1f}) rotate({ang:.1f})">'
                 f'<polygon points="{-wid / 2:.1f},0 {-wid / 2:.1f},{-hgt * 0.8:.1f} 0,{-hgt:.1f} {wid / 2:.1f},{-hgt * 0.8:.1f} {wid / 2:.1f},0" fill="url(#{grad})"/>'
                 f'<polygon points="0,0 0,{-hgt:.1f} {wid / 2:.1f},{-hgt * 0.8:.1f} {wid / 2:.1f},0" fill="#000" opacity="0.28"/>'
                 f'<line x1="{-wid * 0.25:.1f}" y1="{-hgt * 0.1:.1f}" x2="{-wid * 0.25:.1f}" y2="{-hgt * 0.75:.1f}" stroke="#fff" stroke-width="{0.8 * u:.1f}" opacity="0.45"/></g>')
            self.add(g)

    def rune(self, x, y, size, color, op):
        """A random angular glyph."""
        rng = self.rng
        segs = []
        for _ in range(3 + rng.integers(0, 3)):
            a = rng.integers(0, 8) * math.pi / 4
            b = rng.integers(0, 8) * math.pi / 4
            r1, r2 = size * rng.random(), size * rng.random()
            segs.append(f"M{x + math.cos(a) * r1:.1f},{y + math.sin(a) * r1:.1f} L{x + math.cos(b) * r2:.1f},{y + math.sin(b) * r2:.1f}")
        if rng.random() < 0.5:
            segs.append(f"M{x - size * 0.5:.1f},{y:.1f} a{size * 0.5:.1f},{size * 0.5:.1f} 0 1 0 {size:.1f},0")
        d = " ".join(segs)
        return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{2.4 * self.s:.1f}" opacity="{op * 0.5:.2f}" filter="url(#b3)"/>'
                f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{1.0 * self.s:.1f}" opacity="{op:.2f}"/>')

    def twisting_wall(self, x0, x1, top, bottom, phase, dim, flip=False):
        """Tall carved wall whose edges and courses twist like a ribbon."""
        s, rng = self.s, self.rng
        n = 40
        left, right = [], []
        for i in range(n + 1):
            t = i / n
            y = top + (bottom - top) * t
            tw = math.sin(t * math.pi * 1.6 + phase)
            wmid = (x0 + x1) / 2 + tw * (x1 - x0) * 0.18
            half = (x1 - x0) / 2 * (0.75 + 0.25 * math.cos(t * math.pi * 1.6 + phase))
            left.append((wmid - half, y))
            right.append((wmid + half, y))
        poly = left + right[::-1]
        base = mix((20, 18, 32), STONE, 0.55 * dim)
        self.add(f'<polygon points="{pts(poly)}" fill="{hexc(*base)}"/>')
        # the face turning away: shade the side where the twist narrows
        for i in range(n):
            t = i / n
            c = math.cos(t * math.pi * 1.6 + phase)
            if c < 0:
                (ax, ay), (bx, by) = left[i], right[i]
                (cx2, cy2), (dx2, dy2) = right[i + 1], left[i + 1]
                self.add(f'<polygon points="{pts([(ax, ay), (bx, by), (cx2, cy2), (dx2, dy2)])}" fill="#0a0812" opacity="{min(0.6, -c * 0.6):.2f}"/>')
        # curving stone courses
        for i in range(1, n, 2):
            (ax, ay), (bx, by) = left[i], right[i]
            bend = math.sin(i * 0.4 + phase) * 10 * s
            self.add(f'<path d="M{ax:.1f},{ay:.1f} Q{(ax + bx) / 2:.1f},{ay + bend:.1f} {bx:.1f},{by:.1f}" stroke="#0c0a14" '
                     f'stroke-width="{1.4 * s:.1f}" fill="none" opacity="0.6"/>')
            if i % 4 == 1:
                jx = ax + (bx - ax) * (0.3 + rng.random() * 0.4)
                ny = left[i + 1][1] if i + 1 <= n else by
                self.add(f'<line x1="{jx:.1f}" y1="{ay:.1f}" x2="{jx:.1f}" y2="{ny:.1f}" stroke="#0c0a14" stroke-width="{1.1 * s:.1f}" opacity="0.5"/>')
        # rim light on the edge facing the orb
        edge = left if not flip else right
        lit = self.light_at(edge[n // 3][0], edge[n // 3][1])
        self.add(f'<polyline points="{pts(edge)}" fill="none" stroke="rgb(255,160,120)" stroke-width="{2.2 * s:.1f}" opacity="{0.2 + lit * 0.5:.2f}"/>')
        return left, right

    def petrified(self, x, base, u, pose, dim):
        """Adventurer turned to stone by the eye's gaze."""
        lit = self.light_at(x, base) * dim
        stone = hexc(*mix((70, 66, 82), (180, 160, 160), lit))
        dark = hexc(*mix((24, 22, 32), (80, 70, 80), lit))
        rim = hexc(*mix((90, 84, 100), (255, 190, 160), lit))
        sw = 7
        g = [f'<ellipse cx="0" cy="0" rx="26" ry="5" fill="#0a0810" opacity="0.6"/>',
             f'<rect x="-22" y="-8" width="44" height="8" fill="{dark}"/>']  # plinth of rubble
        if pose == "warrior":
            g += [
                f'<path d="M-6 -8 L-9 -38 M6 -8 L9 -38" stroke="{stone}" stroke-width="{sw}" stroke-linecap="round"/>',
                f'<path d="M-10 -38 L10 -38 L12 -66 L-12 -66 Z" fill="{stone}"/>',
                f'<circle cx="0" cy="-74" r="7" fill="{stone}"/>',
                f'<path d="M-6 -80 Q0 -90 6 -80" stroke="{dark}" stroke-width="3" fill="none"/>',
                f'<path d="M-12 -62 L-26 -76" stroke="{stone}" stroke-width="{sw}" stroke-linecap="round"/>',
                f'<ellipse cx="-30" cy="-80" rx="11" ry="15" fill="{dark}" stroke="{stone}" stroke-width="2"/>',
                f'<path d="M12 -62 L22 -50 L40 -92" stroke="{stone}" stroke-width="{sw - 2}" stroke-linecap="round" fill="none"/>',
                f'<path d="M-12 -66 L-12 -40" stroke="{rim}" stroke-width="1.6" opacity="0.8"/>',
            ]
        elif pose == "mage":
            g += [
                f'<path d="M-14 -8 L-6 -56 L8 -56 L16 -8 Z" fill="{stone}"/>',
                f'<path d="M-8 -56 L0 -84 L9 -56 Z" fill="{dark}"/>',
                f'<circle cx="1" cy="-60" r="6" fill="{stone}"/>',
                f'<path d="M6 -48 L26 -60" stroke="{stone}" stroke-width="{sw - 1}" stroke-linecap="round"/>',
                f'<line x1="24" y1="-4" x2="30" y2="-96" stroke="{dark}" stroke-width="3.5"/>',
                f'<circle cx="30" cy="-98" r="4" fill="{stone}"/>',
                f'<path d="M-6 -46 L-22 -70" stroke="{stone}" stroke-width="{sw - 1}" stroke-linecap="round"/>',
                f'<path d="M-14 -8 L-6 -56" stroke="{rim}" stroke-width="1.6" opacity="0.8"/>',
            ]
        else:  # kneeling, shielding the face
            g += [
                f'<path d="M-10 -8 L-2 -22 L14 -8" stroke="{stone}" stroke-width="{sw}" stroke-linecap="round" fill="none"/>',
                f'<path d="M-8 -20 L8 -20 L4 -46 L-10 -44 Z" fill="{stone}"/>',
                f'<circle cx="-2" cy="-54" r="6.5" fill="{stone}"/>',
                f'<path d="M4 -40 L-4 -56 M-6 -40 L-12 -56" stroke="{stone}" stroke-width="{sw - 2}" stroke-linecap="round"/>',
                f'<path d="M-10 -44 L-8 -20" stroke="{rim}" stroke-width="1.6" opacity="0.8"/>',
            ]
        # cracks
        g.append(f'<path d="M-4 -30 l3 6 l-2 5 M6 -50 l-3 4" stroke="{dark}" stroke-width="1" fill="none"/>')
        self.add(f'<g transform="translate({x:.1f},{base:.1f}) scale({u:.2f})">{"".join(g)}</g>')

    def floor_plane(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        fy = self.floor
        self.add(f'<rect x="-10" y="{fy:.1f}" width="{w + 20}" height="{h - fy + 10:.1f}" fill="url(#floorG)"/>')
        # perspective flagstones, very faint
        vx, vy = 0.45 * w, fy - 0.35 * h
        for i in range(-14, 15):
            xb = vx + i * 0.09 * w
            x_top = vx + (xb - vx) * ((fy - vy) / (h - vy))
            self.add(f'<line x1="{x_top:.1f}" y1="{fy:.1f}" x2="{xb:.1f}" y2="{h:.1f}" stroke="#08060c" stroke-width="{1.4 * s:.1f}" opacity="0.4"/>')
        y = fy + 8 * s
        step = 14 * s
        while y < h:
            self.add(f'<line x1="0" y1="{y:.1f}" x2="{w}" y2="{y:.1f}" stroke="#08060c" stroke-width="{1.4 * s:.1f}" opacity="0.35"/>')
            step *= 1.35
            y += step
        # rear kerb of the floor
        self.add(f'<rect x="-10" y="{fy - 4 * s:.1f}" width="{w + 20}" height="{10 * s:.1f}" fill="#2e2840"/>')
        self.add(f'<rect x="-10" y="{fy - 4 * s:.1f}" width="{w + 20}" height="{2 * s:.1f}" fill="#8a6a70" opacity="0.4"/>')
        # warm pool of orb light near the hero
        self.add(f'<ellipse cx="{0.22 * w:.1f}" cy="{fy + 0.05 * h:.1f}" rx="{0.28 * w:.1f}" ry="{0.045 * h:.1f}" fill="rgb(255,150,110)" opacity="0.12" filter="url(#b30)"/>')
        # a faint arcane circle on the rear flagstones (very subdued)
        self.add(f'<ellipse cx="{0.45 * w:.1f}" cy="{fy + 0.04 * h:.1f}" rx="{0.16 * w:.1f}" ry="{0.022 * h:.1f}" fill="none" stroke="#7ad8c8" stroke-width="{1.5 * s:.1f}" opacity="0.12"/>')
        self.add(f'<ellipse cx="{0.45 * w:.1f}" cy="{fy + 0.04 * h:.1f}" rx="{0.13 * w:.1f}" ry="{0.017 * h:.1f}" fill="none" stroke="#7ad8c8" stroke-width="{1 * s:.1f}" stroke-dasharray="{8 * s:.1f} {6 * s:.1f}" opacity="0.1"/>')

    def motes(self):
        w, h, s, rng = self.w, self.h, self.s, self.rng
        for _ in range(int(110 * w * h / (1920 * 1080))):
            x, y = rng.random() * w, (0.1 + rng.random() * 0.7) * h
            near = self.light_at(x, y)
            col = "#ffc8a0" if rng.random() < near * 1.5 else ("#8ae8d8" if rng.random() < 0.6 else "#c0a0ff")
            r = (0.7 + rng.random() * 1.6) * s
            op = 0.3 + rng.random() * 0.5
            if x > 0.55 * w:
                op *= 0.5
            self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 3:.1f}" fill="{col}" opacity="{op * 0.25:.2f}" filter="url(#b3)"/>'
                     f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{col}" opacity="{op:.2f}"/>')

    # --------------------------------------------------------------- build
    def build(self):
        w, h, s = self.w, self.h, self.s
        portrait = h > w
        self.build_defs()
        self.background()
        # the labyrinth below and its mirror on the vault: an hourglass of mazes
        # converging on the misty horizon where the eye watches
        self.add('<g filter="url(#stoneTex)">')
        mu = (24 if not portrait else 17) * s
        self.maze_plane(0.5 * w, 0.40 * h, mu, 40, 0.88, 0.55)
        cy_top = 0.24 * h
        self.add(f'<g transform="rotate(180 {0.5 * w:.1f} {cy_top:.1f})">')
        self.maze_plane(0.5 * w, cy_top, mu, 40, 0.9, 0.7)
        self.add('</g>')
        self.add('</g>')
        # sink the vault maze into shadow and darken the near labyrinth toward the floor
        self.add(f'<rect x="-20" y="-20" width="{w + 40}" height="{cy_top + 20:.1f}" fill="#0c0a14" opacity="0.5" filter="url(#b30)"/>')
        self.add(f'<linearGradient id="nearDark" x1="0" y1="0" x2="0" y2="1">'
                 f'<stop offset="0" stop-color="#0e0b16" stop-opacity="0"/>'
                 f'<stop offset="1" stop-color="#0e0b16" stop-opacity="0.5"/></linearGradient>')
        self.add(f'<rect x="0" y="{0.5 * h:.1f}" width="{w}" height="{self.floor - 0.5 * h:.1f}" fill="url(#nearDark)"/>')
        self.mist(0.22 * h, 0.44 * h, "#3a3050", 0.5, n=10)
        self.giant_eye()
        self.mist(0.2 * h, 0.45 * h, "#3a3050", 0.3, n=8)
        self.add('<g filter="url(#stoneTex)">')
        self.far_structures()
        self.add('</g>')
        self.mist(0.35 * h, 0.6 * h, "#40365a", 0.3, n=8)

        self.add('<g filter="url(#stoneTex)">')
        # upside-down island hanging from the vault, top right (Escher cue)
        ox, oy = (0.80 if not portrait else 0.76) * w, 0.2 * h
        self.add(f'<g transform="rotate(180 {ox:.1f} {oy:.1f})">')
        self.island(ox, oy, 12 * s, 10, 6, 0.45,
                    walls=[(0.3, 0.3, 9.4, 0.6, 3.2), (0.3, 0.3, 0.6, 5.4, 3.2), (5, 0.9, 0.6, 4.5, 2.4)],
                    stair=(1.2, 5.2, 0, 6, "x"), arch=(6.2, 7.6, 0.9, 0, 2.6))
        self.add('</g>')
        # sideways flight climbing a vertical face (gravity turned 90 degrees)
        ox2, oy2 = (0.845 if not portrait else 0.8) * w, 0.47 * h
        self.add(f'<g transform="rotate(-90 {ox2:.1f} {oy2:.1f})">')
        out = []
        self.box(ox2, oy2, 11 * s, 0, 0, -1, 9, 3, 1, 0.5, bricks=False)
        self.stairs(ox2, oy2, 11 * s, 0.5, 2.6, 0, 8, "x", 0.5, out, width=2)
        out.sort(key=lambda t: t[0])
        for _, svg in out:
            self.add(svg)
        self.add('</g>')

        # right island, higher and further (kept dim: enemies stand below)
        self.island(0.60 * w, 0.40 * h, 15 * s, 12, 7, 0.38,
                    walls=[(0.4, 0.4, 11, 0.6, 3.4), (0.4, 0.4, 0.6, 6, 3.4), (4, 3, 0.6, 3.6, 2.6),
                           (7.5, 0.9, 0.6, 3.2, 2.6), (8, 5, 3.6, 0.6, 1.8)],
                    tower=(9, 1.2, 2.2, 6.5), arch=(1.6, 3.2, 1.0, 0, 2.8))
        # central left island with a stair that ends in mid-air
        self.island(0.34 * w, 0.49 * h, 18 * s, 11, 7, 0.2,
                    walls=[(0.4, 0.4, 10, 0.6, 3.6), (0.4, 0.4, 0.6, 6.2, 3.6), (3.6, 1, 0.6, 3.8, 2.8),
                           (6.8, 3.4, 3.6, 0.6, 2.8), (6.8, 1, 0.6, 2.4, 2.8)],
                    stair=(6.6, 5.6, 0, 9, "x"), arch=(1.4, 3.0, 1.0, 0, 3.0))
        self.add('</g>')

        # crystals embedded in the islands
        self.crystal_cluster(0.36 * w, 0.52 * h, 0.9 * s, "crystalT", 4, glow="#4ad0c0", glow_op=0.3)
        self.crystal_cluster(0.66 * w, 0.44 * h, 0.7 * s, "crystalV", 3, glow="#9a70ff", glow_op=0.22)
        self.crystal_cluster(0.52 * w, 0.62 * h, 0.8 * s, "crystalV", 5, glow="#9a70ff", glow_op=0.25)

        self.mist(0.55 * h, 0.75 * h, "#2e2644", 0.35, n=6)

        # twisting framing walls
        self.add('<g filter="url(#stoneTex)">')
        L = self.twisting_wall(-0.04 * w, 0.11 * w if not portrait else 0.16 * w, -0.02 * h, self.floor + 4 * s, 0.4, 0.9)
        R = self.twisting_wall(0.88 * w if not portrait else 0.84 * w, 1.06 * w, -0.02 * h, self.floor + 4 * s, 2.3, 0.45, flip=True)
        self.add('</g>')
        rng = self.rng
        for (left, right), col, op in ((L, "#7ae8d8", 0.55), (R, "#b090ff", 0.3)):
            for i in range(6, 36, 4):
                (ax, ay), (bx, by) = left[i], right[i]
                if 0 < (ax + bx) / 2 < w:
                    self.add(self.rune(ax + (bx - ax) * (0.3 + rng.random() * 0.4), ay, 9 * s, col, op))
        self.crystal_cluster(0.05 * w if not portrait else 0.08 * w, 0.66 * h, 1.0 * s, "crystalT", 4, glow="#4ad0c0", glow_op=0.35)
        self.crystal_cluster(0.95 * w if not portrait else 0.93 * w, 0.58 * h, 0.8 * s, "crystalV", 3, glow="#9a70ff", glow_op=0.18)

        self.orb()
        # petrified adventurers on the rear flagstones
        self.petrified(0.33 * w, self.floor + 2 * s, 1.15 * s, "warrior", 1.0)
        self.petrified(0.45 * w, self.floor + 2 * s, 1.05 * s, "kneeling", 0.9)
        self.petrified(0.40 * w, 0.49 * h + 5 * s, 0.55 * s, "mage", 0.8)
        self.add(f'<rect width="{w}" height="{h}" fill="url(#penumbra)"/>')
        self.add('<g filter="url(#stoneTex)">')
        self.floor_plane()
        self.add('</g>')
        self.add(f'<rect x="-20" y="{self.floor - 10 * s:.1f}" width="{w + 40}" height="{30 * s:.1f}" fill="#06050a" opacity="0.4" filter="url(#b12)"/>')
        self.motes()
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>')


def post(img, w, h, seed):
    rng = np.random.default_rng(seed)
    a = np.asarray(img, np.float32) / 255.0
    a = pt.kuwahara(a, r=2)
    a = pt.painterly_warp(a, rng, amp=2.2 * min(w, h) / 1080, scale=10)
    n1 = pt.fractal_noise(h, w, rng, octaves=6, base=6)[..., None]
    n2 = pt.fractal_noise(h, w, rng, octaves=3, base=2)[..., None]
    a *= 0.86 + 0.26 * n1
    # low-frequency hue drift between violet and teal
    a *= np.concatenate([0.97 + 0.06 * n2, 0.97 + 0.05 * (1 - n2), 0.97 + 0.06 * (1 - n2)], axis=2)
    a *= pt.brush_texture(h, w, rng, strength=0.07)
    a = pt.bloom(a, threshold=0.55)
    a = np.clip(a, 0, None) ** np.array([1.0, 1.02, 0.97], np.float32)
    a = a * 0.95 + np.array([0.012, 0.010, 0.022], np.float32)
    a *= pt.vertical_band(h, w, 0.0, 0.16, 0.45)
    fy = np.clip((np.linspace(0, 1, h)[:, None, None] - 0.8) / 0.2, 0, 1)
    a *= 1 - 0.35 * fy
    a *= pt.vignette(h, w, cx=0.35, cy=0.45, strength=0.5)
    a += (rng.normal(0, 0.012, a.shape[:2])[..., None]).astype(np.float32)
    return np.clip(a, 0, 0.93)


def main():
    scratch = sys.argv[1]
    outdir = sys.argv[2]
    os.makedirs(scratch, exist_ok=True)
    os.makedirs(outdir, exist_ok=True)
    for suffix, (w, h), max_kb in (("", (1920, 1080), 380), ("-movil", (1080, 1440), 300)):
        name = f"laberinto-contemplador{suffix}"
        svg = Scene(w, h, seed=5).build()
        png = os.path.join(scratch, f"{name}.png")
        img = pt.render_svg(svg, w, h, png)
        arr = post(img, w, h, seed=13)
        q, kb = pt.save_webp(arr, os.path.join(outdir, f"{name}.webp"), quality=85, max_kb=max_kb)
        pt.mockup(arr, os.path.join(scratch, f"{name}-maqueta.png"))
        print(f"{name}.webp  q={q}  {kb:.0f} KB")


if __name__ == "__main__":
    main()
