"""Generates the ink-drawn map icons (pen strokes with pressure, clipped hatching)."""
import math, random, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
INK = '#2a1a0e'
INK2 = '#3a2616'
RED = '#7a1a10'


PREC = [1]


def f(v):
    if PREC[0] == 0:
        return str(int(round(v)))
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


def enc(pts, close=True):
    """Compact relative path: m x y then deltas with minimal separators."""
    out = []
    px, py = 0.0, 0.0
    first = True
    for x, y in pts:
        x, y = round(x, PREC[0]), round(y, PREC[0])
        if first:
            out.append('M' + f(x) + num(y))
            first = False
        else:
            dx, dy = round(x - px, PREC[0]), round(y - py, PREC[0])
            if dx == 0 and dy == 0:
                continue
            out.append(num(dx) + num(dy))
        px, py = x, y
    d = out[0] + ('l' + ''.join(out[1:]) if len(out) > 1 else '')
    d = d.replace('l ', 'l')
    return d + ('z' if close else '')


def num(v):
    t = f(v)
    if t.startswith('0.'):
        t = t[1:]
    elif t.startswith('-0.'):
        t = '-' + t[2:]
    return t if t.startswith('-') else ' ' + t


class Svg:
    def __init__(self, name, size=64, seed=1):
        self.name, self.size = name, size
        self.parts, self.defs = [], []
        self.rng = random.Random(seed)
        self.nclip = 0
        self.k = size / 64  # jitter scale

    # ── geometry ──
    def smooth(self, pts, closed=False, n=3):
        P = list(pts)
        if closed:
            P = P + P[:3]
            segs = range(len(pts))
            ext = [P[-4]] + P
        else:
            ext = [P[0]] + P + [P[-1]]
            segs = range(len(pts) - 1)
        out = []
        for i in segs:
            p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
            for j in range(n):
                t = j / n
                t2, t3 = t * t, t * t * t
                out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2
                                        + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3) for c in (0, 1)))
        if not closed:
            out.append(P[-1])
        return out

    def jit(self, pts, a):
        a *= self.k
        return [(x + self.rng.uniform(-a, a), y + self.rng.uniform(-a, a)) for x, y in pts]

    # ── marks ──
    def stroke(self, pts, w=1.6, closed=False, taper=True, jitter=0.35, color=INK, n=3, op=None):
        """Pen stroke of varying width as a filled outline."""
        w *= self.k
        pts = self.smooth(self.jit(pts, jitter), closed, n)
        m = len(pts)
        L, R = [], []
        phase = self.rng.uniform(0, 6.28)
        for i, (x, y) in enumerate(pts):
            a = pts[max(i - 1, 0)] if not closed else pts[i - 1]
            b = pts[min(i + 1, m - 1)] if not closed else pts[(i + 1) % m]
            dx, dy = b[0] - a[0], b[1] - a[1]
            d = math.hypot(dx, dy) or 1
            nx, ny = -dy / d, dx / d
            t = i / max(m - 1, 1)
            if taper and not closed:
                prof = 0.25 + 0.75 * math.sin(math.pi * t) ** 0.6
            else:
                prof = 0.75 + 0.25 * math.sin(phase + t * 9)
            hw = w * prof * (0.9 + 0.2 * self.rng.random()) / 2
            L.append((x + nx * hw, y + ny * hw))
            R.append((x - nx * hw, y - ny * hw))
        if closed:
            d = enc(L) + enc(list(reversed(R)))
            self.parts.append(f'<path d="{d}" fill="{color}" fill-rule="evenodd"{self._op(op)}/>')
        else:
            poly = L + list(reversed(R))
            d = enc(poly)
            self.parts.append(f'<path d="{d}" fill="{color}"{self._op(op)}/>')

    def _op(self, op):
        return f' opacity="{op}"' if op is not None else ''

    def line(self, p, q, w=1.4, **kw):
        mid = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
        self.stroke([p, mid, q], w, **kw)

    def path_d(self, pts, closed=True, n=4):
        pts = self.smooth(pts, closed, n)
        return enc(pts, closed)

    def wash(self, pts, color='#6b4420', op=0.16):
        self.parts.append(f'<path d="{self.path_d(self.jit(pts, 0.3))}" fill="{color}" opacity="{op}"/>')

    def blot(self, pts, color=INK, op=None):
        self.parts.append(f'<path d="{self.path_d(self.jit(pts, 0.2))}" fill="{color}"{self._op(op)}/>')

    def dot(self, x, y, r, color=INK):
        pts = [(x + r * math.cos(a) * self.rng.uniform(0.85, 1.1), y + r * math.sin(a) * self.rng.uniform(0.85, 1.1))
               for a in [i * math.pi / 3 for i in range(6)]]
        self.parts.append(f'<path d="{self.path_d(pts)}" fill="{color}"/>')

    def ring(self, cx, cy, rx, ry=None, w=1.2, rot=0, **kw):
        ry = ry or rx
        pts = []
        k = 6 if rx < 5 else 8
        for i in range(k):
            a = i * 2 * math.pi / k
            x, y = rx * math.cos(a), ry * math.sin(a)
            c, s = math.cos(rot), math.sin(rot)
            pts.append((cx + x * c - y * s, cy + x * s + y * c))
        self.stroke(pts, w, closed=True, n=2 if rx < 5 else 3, **kw)

    def hatch(self, clip_pts, angle=45, gap=2.2, w=0.45, color=INK2, cross=False, op=None):
        """Parallel pen lines clipped to a shape (hand-drawn shading)."""
        self.nclip += 1
        cid = f'{self.name[:3]}{self.nclip}'
        self.defs.append(f'<clipPath id="{cid}"><path d="{self.path_d(clip_pts)}"/></clipPath>')
        xs = [p[0] for p in clip_pts]
        ys = [p[1] for p in clip_pts]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        r = math.hypot(max(xs) - min(xs), max(ys) - min(ys)) / 2 + 1
        gap *= self.k
        segs = []
        for ang in ([angle, angle + 90] if cross else [angle]):
            a = math.radians(ang)
            dx, dy = math.cos(a), math.sin(a)
            nx, ny = -dy, dx
            o = -r
            while o <= r:
                j = self.rng.uniform(-0.3, 0.3) * gap
                x0, y0 = cx + nx * (o + j) - dx * r, cy + ny * (o + j) - dy * r
                x1, y1 = cx + nx * (o + j * 0.5) + dx * r, cy + ny * (o + j * 0.5) + dy * r
                segs.append('M' + f(x0) + num(y0) + 'l' + num(x1 - x0).lstrip() + num(y1 - y0))
                o += gap
        self.parts.append(f'<g clip-path="url(#{cid})"><path d="{"".join(segs)}" stroke="{color}" stroke-width="{f(w * self.k) if w * self.k >= 0.1 else w}" '
                          f'stroke-linecap="round" fill="none"{self._op(op)}/></g>')

    def save(self):
        px = self.size * 2
        PREC[0] = 1
        body = ''.join(self.parts)
        defs = f'<defs>{"".join(self.defs)}</defs>' if self.defs else ''
        xml = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.size} {self.size}" width="{px}" height="{px}">'
               f'{defs}{body}</svg>\n')
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, self.name + '.svg'), 'w') as fh:
            fh.write(xml)
        print(f'{self.name}: {len(xml)} B')


# ── helpers ──────────────────────────────────────────────────────────────────
def lerp(p, q, t):
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


def along(p, q, t, off):
    dx, dy = q[0] - p[0], q[1] - p[1]
    d = math.hypot(dx, dy)
    nx, ny = -dy / d, dx / d
    x, y = lerp(p, q, t)
    return (x + nx * off, y + ny * off)


def sword(s, base, tip, bw=4.2, guard=12, w=1.3):
    g = lerp(base, tip, 0.3)
    s.stroke([along(g, tip, 0, bw / 2), along(g, tip, 0.85, bw / 2.4), tip], w, taper=False)
    s.stroke([along(g, tip, 0, -bw / 2), along(g, tip, 0.85, -bw / 2.4), tip], w, taper=False)
    s.hatch([along(g, tip, 0, 0), along(g, tip, 0.85, 0), tip, along(g, tip, 0.85, -bw / 2.4), along(g, tip, 0, -bw / 2)],
            angle=20, gap=1.3, w=0.4)
    s.line(along(g, tip, 0.05, 0), along(g, tip, 0.75, 0), 0.6)
    s.stroke([along(g, base, 0, guard / 2 + 1.5), along(g, base, 0.08, guard / 2), along(g, base, 0, 0),
              along(g, base, 0.08, -guard / 2), along(g, base, 0, -guard / 2 - 1.5)], w * 1.5)
    s.stroke([g, lerp(g, base, 0.85)], w * 2.2, taper=False)
    for t in (0.25, 0.5, 0.75):
        s.line(along(g, base, t, 1.4), along(g, base, t + 0.06, -1.4), 0.5)
    pb = lerp(g, base, 1.05)
    s.ring(pb[0], pb[1], 2.4, w=1.1)


def horn(s, root_a, root_b, pts_mid, tip, w=1.5):
    outer = [root_a] + pts_mid[0] + [tip]
    inner = [root_b] + pts_mid[1] + [tip]
    s.stroke(outer, w * 1.3, taper=False)
    s.stroke(inner, w, taper=False)
    shape = outer + list(reversed(inner))
    s.hatch(shape, angle=-30, gap=1.6, w=0.45)
    for i in range(len(pts_mid[0])):
        s.line(pts_mid[0][i], pts_mid[1][i], 0.7)


def flame(s, pts, washc='#a0521c'):
    s.wash(pts, washc, 0.14)
    s.stroke(pts, 1.5, closed=True)


# ── icons ────────────────────────────────────────────────────────────────────
def combate():
    s = Svg('combate', seed=3)
    sword(s, (13, 53), (54, 10))
    sword(s, (51, 53), (10, 10))
    s.save()


def combate_acto1(name='combate-acto1'):
    s = Svg(name, seed=11)
    # spear behind the head (only the visible pieces are drawn)
    s.stroke([(5, 63), (13, 55), (21, 47)], 2.2, taper=False)
    s.stroke([(43, 22), (48, 16), (51, 13)], 2.2, taper=False)
    s.stroke([(50, 15), (52, 9), (60, 3), (56, 11), (50, 15)], 1.3, closed=True)
    s.hatch([(50, 15), (52, 9), (60, 3), (56, 11)], angle=60, gap=1.2, w=0.4)
    s.line((49, 17), (54, 12), 1.0)
    s.line((47, 15), (52, 20), 0.7)
    head = [(18, 31), (22, 22), (32, 19), (42, 22), (46, 31), (44, 42), (38, 50), (32, 52), (26, 50), (20, 42)]
    s.wash(head, '#5d6a2e', 0.16)
    s.hatch([(34, 20), (42, 22), (46, 31), (44, 42), (38, 50), (34, 52), (38, 40), (39, 28)], angle=35, gap=1.7, w=0.45)
    s.stroke(head, 1.7, closed=True)
    # ears
    s.stroke([(19, 27), (10, 22), (3, 19), (9, 28), (14, 34), (19, 37)], 1.5)
    s.stroke([(45, 27), (54, 22), (61, 20), (56, 29), (50, 34), (45, 37)], 1.5)
    s.hatch([(19, 28), (6, 21), (14, 33), (19, 36)], angle=-20, gap=1.4, w=0.4)
    s.hatch([(45, 28), (58, 22), (50, 33), (45, 36)], angle=20, gap=1.4, w=0.4)
    # brows, eyes, nose
    s.stroke([(21, 28), (26, 30), (30, 32)], 1.9)
    s.stroke([(43, 28), (38, 30), (34, 32)], 1.9)
    s.stroke([(23, 33), (27, 35), (30, 35), (27, 36), (23, 33)], 1.0, closed=True)
    s.stroke([(41, 33), (37, 35), (34, 35), (37, 36), (41, 33)], 1.0, closed=True)
    s.dot(27.5, 35, 1.1)
    s.dot(36.5, 35, 1.1)
    s.stroke([(32, 35), (33.5, 40), (31, 41.5), (29.5, 40.5)], 1.1)
    # grin with jagged teeth
    s.stroke([(22, 43), (27, 47), (32, 48), (37, 47), (42, 43)], 1.4)
    s.stroke([(24, 44), (25.5, 41.5), (27, 46), (29, 43), (31, 47.5), (33, 43.5), (35, 47), (37, 43), (39, 46), (40.5, 42)], 0.8, taper=False)
    for x, y in [(21, 26), (43, 26)]:
        s.dot(x, y + 20, 0.5)
    s.save()


def combate_acto2(name='combate-acto2'):
    s = Svg(name, seed=21)

    def bone(p, q):
        s.line(along(p, q, 0.1, 2.0), along(p, q, 0.9, 2.0), 1.1)
        s.line(along(p, q, 0.1, -2.0), along(p, q, 0.9, -2.0), 1.1)
        for t in (0.02, 0.98):
            for o in (1.9, -1.9):
                c = along(p, q, t, o)
                s.ring(c[0], c[1], 2.3, w=1.0)
        s.hatch([along(p, q, 0.1, -2), along(p, q, 0.9, -2), along(p, q, 0.9, -0.5), along(p, q, 0.1, -0.5)], angle=80, gap=1.3, w=0.4)

    bone((10, 40), (54, 60))
    bone((54, 40), (10, 60))
    skull = [(19, 30), (18, 20), (24, 12), (32, 9), (40, 12), (46, 20), (45, 30), (41, 35), (40, 42), (24, 42), (23, 35)]
    s.wash(skull, '#8a7650', 0.12)
    s.hatch([(40, 12), (46, 20), (45, 30), (41, 35), (40, 42), (37, 42), (41, 26)], angle=40, gap=1.5, w=0.45)
    s.stroke(skull, 1.8, closed=True)
    for cx in (26, 38):
        pts = [(cx - 4.5, 25), (cx, 21.5), (cx + 4.5, 25), (cx + 2, 30), (cx - 2, 30)]
        s.blot(pts, INK, 0.92)
    s.blot([(32, 31), (30, 35.5), (34, 35.5)], INK)
    s.line((25, 38), (39, 38), 0.8)
    for x in (27, 30, 33, 36):
        s.line((x, 36.5), (x + 0.3, 41.5), 0.8)
    s.line((22, 17), (26, 22), 0.6)
    s.line((26, 22), (25, 25), 0.5)
    s.save()


def talon(s, base, bend, tip, bw=3.2):
    a = along(base, bend, 0, bw)
    b = along(base, bend, 0, -bw)
    outer = [a, along(base, bend, 1, bw * 0.7), tip]
    inner = [b, along(base, bend, 1, -bw * 0.5), tip]
    s.hatch(outer + list(reversed(inner)), angle=70, gap=1.1, w=0.45)
    s.stroke(outer, 1.6, taper=False)
    s.stroke(inner, 1.1, taper=False)


def combate_acto3(name='combate-acto3'):
    s = Svg(name, seed=31)
    # three claw slashes torn across the parchment
    for i, dx in enumerate((-13, 0, 13)):
        top, mid, bot = (22 + dx, 5 + abs(dx) * 0.3), (31 + dx, 30), (38 + dx, 58 - abs(dx) * 0.3)
        s.wash([along(top, bot, 0.1, 3), along(top, bot, 0.5, 4.5), along(top, bot, 0.9, 3),
                along(top, bot, 0.9, -3), along(top, bot, 0.5, -4.5), along(top, bot, 0.1, -3)], '#5c1a10', 0.12)
        s.stroke([top, mid, bot], 5.4, jitter=0.3)
        # torn edges and hatching beside each tear
        for t in (0.25, 0.45, 0.65):
            p0 = along(top, bot, t, 3.2)
            s.line(p0, along(top, bot, t + 0.07, 5.2), 0.6)
        s.hatch([along(top, bot, 0.15, -2.6), along(top, bot, 0.85, -2.6), along(top, bot, 0.85, -6), along(top, bot, 0.15, -5)],
                angle=-20, gap=1.3, w=0.4)
    s.save()


def skull_horned(s, big=1.0):
    skull = [(20, 32), (19, 22), (25, 14), (32, 12), (39, 14), (45, 22), (44, 32), (41, 37), (40, 46), (24, 46), (23, 37)]
    horn(s, (21, 22), (24, 16), [[(12, 20), (5, 12)], [(14, 15), (9, 9)]], (6, 2), 1.6)
    horn(s, (43, 22), (40, 16), [[(52, 20), (59, 12)], [(50, 15), (55, 9)]], (58, 2), 1.6)
    s.wash(skull, '#6e2a1a', 0.14)
    s.hatch([(39, 14), (45, 22), (44, 32), (41, 37), (40, 46), (37, 46), (41, 28)], angle=40, gap=1.3, w=0.5, cross=True)
    s.stroke(skull, 2.4, closed=True)
    for cx in (26.5, 37.5):
        s.blot([(cx - 5, 27), (cx, 23), (cx + 5, 27), (cx + 2.5, 32.5), (cx - 2.5, 32.5)], INK)
    s.blot([(32, 34), (29.6, 38.5), (34.4, 38.5)], INK)
    s.line((25, 42), (39, 42), 1.0)
    for x in (27, 30, 33, 36):
        s.line((x, 40), (x + 0.3, 45.8), 1.0)
    # crack
    s.stroke([(34, 12.5), (31, 17), (34, 19), (31, 23)], 1.0, taper=False)


def elite():
    s = Svg('elite', seed=41)
    # broken shield behind
    shield = [(10, 34), (54, 34), (52, 48), (32, 62), (12, 48)]
    s.stroke([(10, 36), (11, 46), (20, 55), (29, 61)], 2.0)
    s.stroke([(54, 36), (53, 46), (44, 55), (35, 61)], 2.0)
    s.stroke([(29, 61), (32, 56), (31, 59), (35, 61)], 1.2, taper=False)
    s.hatch([(10, 36), (24, 47), (20, 55), (12, 48)], angle=-45, gap=1.3, w=0.45)
    s.hatch([(54, 36), (40, 47), (44, 55), (52, 48)], angle=45, gap=1.3, w=0.45)
    skull_horned(s)
    s.save()


def evento():
    s = Svg('evento', seed=51)
    s.wash([(20, 20), (26, 9), (38, 8), (45, 16), (42, 27), (34, 33), (33, 40), (29, 40), (29, 31), (38, 23), (38, 15), (30, 14), (26, 21)], '#4a3a6a', 0.10)
    s.stroke([(22, 20), (25, 12), (32, 8), (40, 10), (44, 17), (42, 25), (35, 30), (32, 34), (31.5, 40)], 5.6)
    s.stroke([(22, 20), (19, 22), (17, 19), (19, 16)], 1.2)
    s.stroke([(24, 21), (27, 14), (33, 11), (39, 13), (41, 18), (38, 24), (33, 27)], 0.6)
    s.dot(31.5, 49, 3.4)
    # flourishes
    s.stroke([(14, 44), (8, 40), (6, 33), (10, 28), (14, 31), (11, 34)], 1.1)
    s.stroke([(50, 44), (56, 40), (58, 33), (54, 28), (50, 31), (53, 34)], 1.1)
    s.stroke([(16, 57), (24, 55), (32, 58), (40, 55), (48, 57)], 1.2)
    for x, y in [(12, 20), (52, 20), (20, 60), (44, 60)]:
        s.stroke([(x, y - 2.2), (x + 1.8, y), (x, y + 2.2), (x - 1.8, y)], 0.7, closed=True)
    s.save()


def descanso(name='descanso'):
    s = Svg(name, seed=61)
    # stones
    for i in range(7):
        a = math.pi * (0.05 + 0.9 * i / 6)
        x, y = 32 - 23 * math.cos(a), 54 + 5 * math.sin(a)
        s.ring(x, y, 3.2, 2.2, w=0.9)
        s.line((x - 1, y + 1.2), (x + 2, y + 0.6), 0.6)
    # logs
    for p, q in [((12, 53), (50, 43)), ((14, 43), (52, 53))]:
        s.line(along(p, q, 0, 2.6), along(p, q, 1, 2.6), 1.2)
        s.line(along(p, q, 0, -2.6), along(p, q, 1, -2.6), 1.2)
        e = q
        s.ring(e[0], e[1], 1.5, 2.7, w=0.9, rot=math.atan2(q[1] - p[1], q[0] - p[0]))
        s.hatch([along(p, q, 0, 2.6), along(p, q, 1, 2.6), along(p, q, 1, 0.5), along(p, q, 0, 0.5)], angle=10, gap=1.2, w=0.4)
    outer = [(21, 45), (17, 34), (22, 24), (25, 30), (29, 12), (35, 24), (40, 17), (45, 32), (43, 45)]
    flame(s, outer)
    s.stroke([(27, 45), (26, 36), (31, 27), (33, 32), (35, 29), (38, 38), (36, 45)], 1.0, closed=True)
    s.hatch([(21, 45), (17, 34), (22, 24), (24, 36), (27, 45)], angle=70, gap=1.3, w=0.4)
    for x, y in [(24, 8), (40, 9), (33, 5), (47, 14)]:
        s.dot(x, y, 0.8)
    s.save()


def cofre():
    s = Svg('cofre', seed=71)
    body = [(11, 33), (53, 33), (52, 56), (12, 56)]
    lid = [(11, 33), (12, 24), (19, 18.5), (32, 16.5), (45, 18.5), (52, 24), (53, 33)]
    s.wash(body + [(12, 56)], '#6b4420', 0.16)
    s.hatch([(12, 46), (52, 46), (52, 56), (12, 56)], angle=30, gap=1.3, w=0.45)
    s.hatch([(44, 18), (52, 24), (53, 33), (44, 33)], angle=-40, gap=1.6, w=0.4)
    s.stroke([(11, 33), (12, 45), (12, 56), (32, 56.5), (52, 56), (52.5, 45), (53, 33)], 1.8, taper=False)
    s.stroke(lid, 1.8, taper=False)
    s.line((10, 33), (54, 33), 1.6)
    for y in (41, 49):
        s.line((13, y), (51, y + 0.4), 0.6)
    for x in (18, 44):
        s.line((x, 18.8), (x - 0.5, 56), 1.1)
        s.line((x + 4, 18), (x + 4, 56), 1.1)
        for y in (25, 38, 51):
            s.dot(x + 2, y, 0.7)
    lock = [(28, 30), (36, 30), (36, 40), (28, 40)]
    s.wash(lock, '#8a6a2a', 0.25)
    s.stroke(lock, 1.3, closed=True)
    s.dot(32, 34, 1.2)
    s.line((32, 34.5), (32, 38), 1.0)
    s.save()


def taberna(name='taberna'):
    s = Svg(name, seed=81)
    body = [(16, 20), (42, 20), (40, 56), (18, 56)]
    s.wash(body, '#a0661e', 0.15)
    s.hatch([(34, 20), (42, 20), (40, 56), (33, 56)], angle=75, gap=1.3, w=0.45)
    s.stroke([(16, 20), (17, 38), (18, 56)], 1.8)
    s.stroke([(42, 20), (41, 38), (40, 56)], 1.8)
    s.line((17, 56), (41, 56), 1.8)
    for x in (23, 29, 35):
        s.line((x, 22), (x + (x - 29) * -0.05, 54), 0.6)
    for y in (26, 49):
        s.line((16, y), (42, y), 1.3)
        s.line((16.4, y + 2.4), (41.8, y + 2.4), 1.0)
        s.hatch([(16, y), (42, y), (42, y + 2.4), (16, y + 2.4)], angle=80, gap=0.9, w=0.35)
    # handle
    s.stroke([(42, 25), (51, 25), (55, 32), (54, 42), (48, 47), (41, 47)], 2.0, taper=False)
    s.stroke([(41, 30), (48, 30), (50, 36), (48, 41), (41, 42)], 1.0, taper=False)
    # foam and a drip
    foam = [(13, 21), (15, 14), (21, 13), (25, 8), (31, 11), (36, 8), (42, 12), (45, 19), (40, 22), (34, 21), (28, 23), (20, 22)]
    s.stroke(foam, 1.4, closed=True)
    s.stroke([(19, 22), (19, 28), (20.5, 30), (21, 27), (21, 23)], 0.8)
    for x, y in [(22, 17), (30, 15), (37, 16)]:
        s.ring(x, y, 1.3, w=0.6)
    s.save()


def mision():
    s = Svg('mision', seed=91)
    s.stroke([(10, 10), (22, 23), (34, 35), (46, 47)], 6.0, color=RED)
    s.stroke([(46, 10), (34, 22), (22, 34), (10, 46)], 6.0, color=RED)
    seal = []
    for i in range(12):
        a = i * math.pi / 6
        r = 10 + (1.4 if i % 2 else 0)
        seal.append((48 + r * math.cos(a), 48 + r * math.sin(a)))
    s.blot(seal, '#8b1e12', 0.55)
    s.stroke(seal, 1.3, closed=True)
    s.ring(48, 48, 6, w=0.9)
    star = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 4.2 if i % 2 == 0 else 1.8
        star.append((48 + r * math.cos(a), 48 + r * math.sin(a)))
    s.blot(star, INK)
    s.save()


def heroe():
    s = Svg('heroe', seed=101)
    fig = [(32, 7), (38, 10), (39, 17), (35, 22), (42, 27), (44, 38), (40, 40), (43, 52), (21, 52), (24, 40), (20, 38), (22, 27), (29, 22), (25, 17), (26, 10)]
    s.wash(fig, '#8b1e12', 0.38)
    s.hatch([(34, 22), (42, 27), (44, 38), (40, 40), (43, 52), (35, 52)], angle=60, gap=1.2, w=0.45)
    s.stroke(fig, 1.8, closed=True)
    base = [(14, 55), (32, 50), (50, 55), (32, 60)]
    s.stroke([(14, 55), (32, 51), (50, 55), (32, 60), (14, 55)], 1.8, closed=True)
    s.hatch([(14, 55), (50, 55), (32, 60)], angle=0, gap=1.0, w=0.4)
    s.save()


def aro():
    s = Svg('aro', seed=111)
    pts = []
    for i in range(14):
        a = -0.4 + i * (2 * math.pi + 0.7) / 13
        r = 28 + 1.2 * math.sin(i * 1.7)
        pts.append((32 + r * math.cos(a), 32 + r * 0.97 * math.sin(a)))
    s.stroke(pts, 2.2, jitter=0.5, color='#7a1a10')
    s.save()


def tachado():
    s = Svg('tachado', seed=121)
    s.stroke([(12, 14), (32, 33), (52, 52)], 3.4, color=INK)
    s.stroke([(51, 12), (32, 32), (13, 51)], 3.4, color=INK)
    s.save()


# ── bosses (128) ─────────────────────────────────────────────────────────────
def B(name, seed):
    PREC[0] = 0
    return Svg(name, size=128, seed=seed)


def jefe_ogro():
    s = B('jefe-ogro', 201)
    # club over the shoulder
    s.stroke([(88, 126), (98, 90), (106, 58)], 5.0, taper=False)
    club = [(100, 62), (97, 40), (102, 16), (114, 8), (123, 18), (120, 44), (110, 62)]
    s.wash(club, '#6b4420', 0.18)
    s.hatch([(110, 12), (123, 18), (120, 44), (110, 62)], angle=70, gap=2.0, w=0.5)
    s.stroke(club, 2.2, closed=True)
    for x, y, dx, dy in [(98, 30, -6, -3), (100, 48, -6, 2), (121, 30, 6, -2), (117, 50, 6, 2), (112, 9, 2, -6)]:
        s.stroke([(x, y), (x + dx, y + dy)], 2.0)
    for x, y in [(106, 30), (112, 44), (110, 20)]:
        s.ring(x, y, 1.6, w=0.7)
    head = [(20, 60), (22, 36), (36, 20), (56, 15), (76, 20), (88, 36), (90, 60), (86, 84), (76, 102), (56, 110), (36, 102), (24, 84)]
    s.wash(head, '#5d6a2e', 0.15)
    s.hatch([(64, 17), (76, 20), (88, 36), (90, 60), (86, 84), (76, 102), (62, 108), (72, 80), (76, 50)], angle=35, gap=2.4, w=0.6)
    s.stroke(head, 2.4, closed=True)
    # ears
    s.stroke([(21, 50), (10, 44), (8, 58), (13, 68), (22, 70)], 2.0)
    s.stroke([(89, 50), (99, 45), (100, 59), (96, 68), (88, 70)], 2.0)
    s.stroke([(15, 52), (13, 60), (18, 63)], 0.9)
    # brow ridge and small eyes
    s.stroke([(28, 46), (40, 40), (52, 44), (56, 48), (60, 44), (72, 40), (84, 46)], 3.6)
    s.hatch([(30, 44), (52, 42), (56, 50), (60, 42), (82, 44), (82, 50), (30, 50)], angle=0, gap=1.4, w=0.45)
    for cx in (43, 69):
        s.stroke([(cx - 6, 53), (cx, 50), (cx + 6, 53), (cx, 56)], 1.2, closed=True)
        s.dot(cx, 53, 2.0)
    # nose
    s.stroke([(52, 56), (48, 70), (52, 74), (56, 71), (60, 74), (64, 70), (60, 56)], 1.8)
    s.dot(52.5, 71, 1.3)
    s.dot(59.5, 71, 1.3)
    # underbite with tusks
    s.stroke([(32, 84), (44, 90), (56, 92), (68, 90), (80, 84)], 2.2)
    s.stroke([(34, 86), (44, 96), (56, 99), (68, 96), (78, 86)], 1.4)
    for x, sign in [(40, -1), (72, 1)]:
        tusk = [(x - 3, 92), (x + sign * 1, 76), (x + 3, 92)]
        s.wash(tusk, '#e8d8b0', 0.4)
        s.stroke(tusk, 1.5, closed=True)
    for x in (48, 56, 64):
        s.line((x, 91), (x, 95), 0.8)
    # scars and stubble
    s.stroke([(70, 26), (78, 38)], 1.3)
    for x, y in [(72, 29), (75, 33)]:
        s.line((x - 2, y + 2), (x + 2, y - 1), 0.8)
    for i in range(10):
        s.dot(36 + i * 4.4, 102 - abs(i - 4.5) * 1.3, 0.55)
    s.save()


def jefe_embaucador():
    s = B('jefe-embaucador-arcano', 211)
    # fan of cards behind
    for ang in (-38, -14, 14, 38):
        a = math.radians(ang)
        cx, cy = 64 + 40 * math.sin(a), 70 - 38 * math.cos(a)
        w, h = 11, 17
        c, sn = math.cos(a), math.sin(a)
        pts = [(cx + x * c - y * sn, cy + x * sn + y * c) for x, y in [(-w, -h), (w, -h), (w, h), (-w, h)]]
        s.stroke(pts + [pts[0]], 1.4, taper=False)
        dm = [(cx + x * c - y * sn, cy + x * sn + y * c) for x, y in [(0, -8), (5, 0), (0, 8), (-5, 0)]]
        s.wash(dm, '#6a1a3a', 0.3)
        s.stroke(dm, 0.9, closed=True)
    # jester hat, three drooping points with bells
    s.wash([(30, 62), (18, 30), (40, 44), (64, 16), (88, 44), (110, 30), (98, 62)], '#4a2a5a', 0.14)
    s.stroke([(30, 62), (22, 44), (12, 30), (8, 40)], 2.2)
    s.stroke([(40, 50), (30, 36), (12, 30)], 1.6)
    s.stroke([(46, 52), (52, 30), (64, 14), (76, 30), (82, 52)], 2.2)
    s.stroke([(98, 62), (106, 44), (116, 30), (120, 40)], 2.2)
    s.stroke([(88, 50), (98, 36), (116, 30)], 1.6)
    s.hatch([(46, 52), (52, 30), (64, 14), (60, 40), (56, 54)], angle=70, gap=2.0, w=0.5)
    s.hatch([(30, 62), (22, 44), (12, 30), (34, 44)], angle=-30, gap=2.0, w=0.5)
    for x, y in [(8, 43), (64, 11), (120, 43)]:
        s.ring(x, y, 4.2, w=1.3)
        s.line((x - 2, y + 1.5), (x + 2, y + 1.5), 0.7)
    # half mask face
    face = [(34, 60), (64, 54), (94, 60), (92, 84), (80, 104), (64, 112), (48, 104), (36, 84)]
    s.stroke([(30, 62), (64, 54), (98, 62)], 2.8, taper=False)
    s.hatch([(64, 56), (94, 60), (92, 84), (80, 104), (64, 112)], angle=-45, gap=2.0, w=0.55, cross=True)
    s.stroke(face, 2.2, closed=True)
    for cx, flip in [(50, -1), (78, 1)]:
        s.stroke([(cx - 9, 76), (cx, 70 + flip * 0), (cx + 9, 76), (cx, 80)], 1.6, closed=True)
        s.dot(cx, 76, 2.2)
        s.stroke([(cx - 10, 68), (cx, 64), (cx + 10, 68)], 1.2)
    s.stroke([(44, 92), (54, 99), (64, 100), (74, 99), (86, 90), (90, 84)], 2.0)
    s.stroke([(62, 80), (64, 88), (60, 90)], 1.1)
    s.blot([(50, 84), (52, 88), (50, 92), (48, 88)], INK)
    s.save()


def jefe_senor_cripta():
    s = B('jefe-senor-cripta', 221)
    # hood
    hood = [(14, 124), (18, 80), (30, 42), (50, 22), (64, 18), (78, 22), (98, 42), (110, 80), (114, 124)]
    s.wash(hood + [(64, 124)], '#3a3a2a', 0.15)
    s.stroke(hood, 2.6, taper=False)
    s.hatch([(14, 124), (18, 80), (30, 42), (44, 34), (32, 80), (34, 124)], angle=60, gap=1.8, w=0.5, cross=True)
    s.hatch([(114, 124), (110, 80), (98, 42), (84, 34), (96, 80), (94, 124)], angle=-60, gap=1.8, w=0.5, cross=True)
    # crown
    crown = [(40, 44), (42, 26), (50, 36), (56, 18), (64, 32), (72, 18), (78, 36), (86, 26), (88, 44)]
    s.wash(crown + [(64, 48)], '#8a6a2a', 0.2)
    s.stroke(crown, 2.0, taper=False)
    s.line((40, 44), (88, 44), 2.0)
    for x, y in [(56, 18), (72, 18), (42, 26), (86, 26)]:
        s.dot(x, y - 2, 1.6)
    s.stroke([(60, 38), (64, 34), (68, 38), (64, 42)], 1.0, closed=True)
    # skull face
    skull = [(42, 50), (86, 50), (88, 70), (80, 84), (78, 100), (50, 100), (48, 84), (40, 70)]
    s.hatch([(72, 50), (86, 50), (88, 70), (80, 84), (78, 100), (72, 100), (78, 74)], angle=40, gap=1.8, w=0.5)
    s.stroke(skull, 2.2, closed=True)
    for cx in (54, 74):
        s.blot([(cx - 8, 64), (cx, 57), (cx + 8, 64), (cx + 4, 73), (cx - 4, 73)], INK)
        s.dot(cx, 65, 1.4, '#c99a3a')
    s.blot([(64, 76), (60, 84), (68, 84)], INK)
    s.line((52, 92), (76, 92), 1.2)
    for x in (55, 60, 64, 68, 73):
        s.line((x, 88), (x, 99), 1.0)
    # robe collar with a clasp
    s.stroke([(30, 124), (44, 106), (64, 116), (84, 106), (98, 124)], 2.0)
    s.ring(64, 114, 4, w=1.4)
    s.save()


def jefe_heraldo():
    s = B('jefe-heraldo-culto', 231)
    # ritual circle behind
    s.ring(64, 60, 56, w=1.4)
    s.ring(64, 60, 50, w=0.8)
    for i in range(12):
        a = i * math.pi / 6 + 0.2
        x, y = 64 + 53 * math.cos(a), 60 + 53 * math.sin(a)
        if y < 96:
            s.stroke([(x - 2, y - 2), (x + 1.5, y), (x - 1.5, y + 2.5)], 0.9, taper=False)
    # hooded figure
    hood = [(30, 126), (34, 88), (40, 50), (52, 26), (64, 20), (76, 26), (88, 50), (94, 88), (98, 126)]
    s.wash(hood + [(64, 126)], '#3a1a2a', 0.2)
    s.stroke(hood, 2.6, taper=False)
    shadow = [(46, 60), (52, 40), (64, 34), (76, 40), (82, 60), (78, 80), (64, 86), (50, 80)]
    s.hatch(shadow, angle=45, gap=1.3, w=0.6, cross=True)
    s.stroke(shadow, 1.6, closed=True)
    for cx in (57, 71):
        s.dot(cx, 60, 2.2, '#c9642a')
        s.ring(cx, 60, 3.6, w=0.6, color='#7a1a10')
    s.hatch([(30, 126), (34, 88), (40, 60), (48, 90), (46, 126)], angle=70, gap=2.0, w=0.5)
    s.hatch([(98, 126), (94, 88), (88, 60), (80, 90), (82, 126)], angle=-70, gap=2.0, w=0.5)
    s.stroke([(64, 88), (64, 126)], 1.2)
    # sigil on the chest
    s.stroke([(64, 96), (70, 106), (64, 116), (58, 106)], 1.2, closed=True)
    s.dot(64, 106, 1.5)
    # two candles
    for x in (14, 114):
        s.stroke([(x - 5, 124), (x - 5, 96)], 1.6, taper=False)
        s.stroke([(x + 5, 124), (x + 5, 96)], 1.6, taper=False)
        s.stroke([(x - 5, 96), (x, 98), (x + 5, 96)], 1.2)
        s.stroke([(x - 5, 104), (x - 3, 110), (x - 2, 104)], 0.8)
        s.hatch([(x + 1, 96), (x + 5, 96), (x + 5, 124), (x + 1, 124)], angle=80, gap=1.2, w=0.4)
        s.line((x, 96), (x, 91), 0.8)
        fl = [(x, 92), (x - 3.5, 86), (x, 76), (x + 3.5, 86)]
        s.wash(fl, '#c9642a', 0.25)
        s.stroke(fl, 1.1, closed=True)
    s.save()


def jefe_ignifax():
    s = B('jefe-ignifax', 241)
    # wing spikes behind
    s.stroke([(80, 40), (96, 10), (104, 28), (118, 6), (122, 34), (110, 56)], 1.8, taper=False)
    for p, q in [((96, 10), (88, 46)), ((118, 6), (100, 50))]:
        s.line(p, q, 1.0)
    s.hatch([(84, 38), (96, 10), (104, 28), (118, 6), (122, 34), (110, 56)], angle=-60, gap=2.2, w=0.45)
    # head in profile, facing left, jaws open
    upper = [(98, 60), (84, 40), (66, 34), (46, 38), (26, 44), (8, 52), (6, 58), (20, 60), (40, 60), (58, 62)]
    lower = [(58, 66), (40, 74), (22, 82), (12, 84), (14, 90), (34, 90), (56, 86), (74, 84), (88, 90)]
    s.wash(upper + [(98, 70)], '#7a2a14', 0.14)
    s.wash(lower + [(80, 70)], '#7a2a14', 0.14)
    s.stroke(upper, 2.4, taper=False)
    s.stroke(lower, 2.2, taper=False)
    s.stroke([(58, 62), (62, 64), (58, 66)], 1.4)
    # teeth
    for x in range(12, 56, 7):
        s.stroke([(x, 59), (x + 2, 65), (x + 4, 59.5)], 0.9, taper=False)
    for x in range(18, 56, 7):
        s.stroke([(x, 83 - (56 - x) * 0.18), (x + 2, 77 - (56 - x) * 0.18), (x + 4, 83 - (56 - x) * 0.18)], 0.9, taper=False)
    # fire breath
    fire = [(10, 70), (2, 64), (6, 74), (0, 80), (8, 78), (14, 76)]
    s.wash(fire, '#c9642a', 0.3)
    s.stroke(fire, 1.0, closed=True)
    # neck
    s.stroke([(98, 60), (106, 80), (112, 104), (116, 126)], 2.4, taper=False)
    s.stroke([(88, 90), (86, 108), (82, 126)], 2.4, taper=False)
    for i in range(5):
        y = 94 + i * 7
        s.stroke([(88 - i * 0.8, y), (100, y - 3 + i * 0.5), (110 + i, y + 1)], 1.0)
    s.hatch([(100, 70), (106, 80), (112, 104), (116, 126), (102, 126), (100, 96)], angle=60, gap=1.7, w=0.5, cross=True)
    # horns
    horn(s, (70, 36), (80, 38), [[(76, 22), (84, 12)], [(84, 26), (90, 16)]], (96, 2), 1.5)
    horn(s, (56, 36), (62, 35), [[(56, 26)], [(62, 28)]], (60, 16), 1.2)
    # eye, brow, nostril, scales
    s.stroke([(58, 44), (66, 40), (74, 44), (66, 48)], 1.4, closed=True)
    s.blot([(65, 42), (67, 42), (67, 47), (65, 47)], INK)
    s.stroke([(52, 40), (66, 36), (80, 42)], 2.6)
    s.stroke([(14, 50), (18, 48), (19, 51)], 1.3)
    for x, y in [(28, 50), (36, 48), (44, 47), (32, 55), (40, 54), (48, 53), (76, 52), (84, 56), (80, 62)]:
        s.stroke([(x, y), (x + 3, y + 3), (x + 6, y)], 0.7)
    s.hatch([(66, 50), (84, 40), (98, 60), (80, 70), (66, 60)], angle=40, gap=1.8, w=0.45)
    # smoke curl from the nostril
    s.stroke([(12, 46), (10, 38), (16, 32), (12, 26), (16, 20)], 0.9)
    s.save()


def jefe_contemplador():
    s = B('jefe-contemplador', 251)
    body = [(64, 26), (92, 36), (106, 62), (100, 92), (78, 110), (50, 110), (28, 92), (22, 62), (36, 36)]
    # eye stalks
    stalks = [(-70, 50), (-50, 56), (-30, 60), (-10, 62), (10, 62), (30, 60), (50, 56), (70, 50)]
    for i, (ang, ln) in enumerate(stalks):
        a = math.radians(ang - 90)
        bx, by = 64 + 32 * math.cos(a), 66 + 36 * math.sin(a)
        ex, ey = 64 + ln * math.cos(a) * 1.0, 64 + ln * math.sin(a) * 0.95
        mx, my = (bx + ex) / 2 + (6 if i % 2 else -6), (by + ey) / 2
        s.stroke([(bx, by), (mx, my), (ex, ey)], 1.6)
        s.ring(ex, ey, 4.2, w=1.2)
        s.dot(ex + 0.6, ey + 0.4, 1.6)
    s.wash(body, '#4a3a2a', 0.15)
    s.hatch([(92, 36), (106, 62), (100, 92), (78, 110), (70, 110), (92, 80), (94, 52)], angle=35, gap=2.0, w=0.55, cross=True)
    s.stroke(body, 2.6, closed=True)
    # central eye
    s.stroke([(38, 58), (50, 46), (64, 42), (78, 46), (90, 58), (78, 70), (64, 74), (50, 70)], 2.2, closed=True)
    s.ring(64, 58, 12, w=1.6)
    s.hatch([(52, 58), (64, 46), (76, 58), (64, 70)], angle=0, gap=1.4, w=0.45)
    s.blot([(61, 50), (67, 50), (68, 58), (67, 66), (61, 66), (60, 58)], INK)
    s.dot(66, 54, 1.2, '#e8d8b0')
    s.stroke([(38, 52), (50, 40), (64, 36), (78, 40), (90, 52)], 1.4)
    # mouth with teeth
    s.stroke([(38, 84), (50, 92), (64, 95), (78, 92), (90, 84)], 2.0)
    s.stroke([(42, 88), (52, 100), (64, 103), (76, 100), (86, 88)], 1.6)
    for x in range(44, 88, 6):
        top = 84 + 11 * math.sin(math.pi * (x - 38) / 52) * 0.9
        s.stroke([(x, top - 1), (x + 2.5, top + 5), (x + 5, top - 1)], 0.8, taper=False)
    s.save()


ALL = [combate, combate_acto1, combate_acto2, combate_acto3, elite, evento, descanso, cofre, taberna, mision, heroe,
       aro, tachado, jefe_ogro, jefe_embaucador, jefe_senor_cripta, jefe_heraldo, jefe_ignifax, jefe_contemplador]

if __name__ == '__main__':
    # the per-scenario variants live in gen_scenario_icons.py (which imports these helpers)
    for fn in ALL:
        fn()
