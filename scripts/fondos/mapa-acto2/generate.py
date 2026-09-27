"""Campaign map «Las Profundidades» (Act II): a dungeon plan inked on darker parchment.

Old-school dungeon cartography: rooms and corridors with rock hatching around the walls, a
square grid, stairs, doors, pillars, sarcophagi in the crypt, a columned temple with an apse
and altar, an ossuary, a flooded cave, skulls in the margins and illegible cartographer's
notes. The plan hugs the margins and corners; the centre keeps only a faint grid and a few
fading passages. Washed violet and blue accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

VIOLET = (125, 95, 165)
BLUE = (85, 115, 165)


# ---------------------------------------------------------------------------
# shapes: (svg path, perimeter points in CCW-agnostic order)
# ---------------------------------------------------------------------------
def rect(x0, y0, x1, y1, step=9):
    pts = []
    for (ax, ay, bx, by) in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        pts += [(ax + (bx - ax) * i / n, ay + (by - ay) * i / n) for i in range(n)]
    return ("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (x0, y0, x1, y1, x0), pts)


def circle(cx, cy, r, step=9):
    n = max(12, int(2 * math.pi * r / step))
    pts = [(cx + math.cos(2 * math.pi * i / n) * r, cy + math.sin(2 * math.pi * i / n) * r) for i in range(n)]
    return ("M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (cx - r, cy, r, r, 2 * r, r, r, 2 * r),
            pts)


def blob(cx, cy, r, rng, n=14):
    pts = []
    ph = [rng.uniform(0, 6) for _ in range(3)]
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + 0.18 * math.sin(3 * a + ph[0]) + 0.1 * math.sin(5 * a + ph[1]) + rng.uniform(-0.06, 0.06))
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8))
    d = K.smooth_path(pts, closed=True)
    dense = []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        for t in (0, 0.33, 0.66):
            dense.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return (d, dense)


def dungeon(sk, shapes, depth=26, grid=12, grid_op=0.35):
    """Rock hatching outside, thick walls, white floor and a square grid inside."""
    r = sk.rng
    lines = []
    for d, pts in shapes:
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        for i, p in enumerate(pts):
            q = pts[(i + 1) % len(pts)]
            tx, ty = q[0] - p[0], q[1] - p[1]
            L = math.hypot(tx, ty) or 1
            nx, ny = -ty / L, tx / L
            if nx * (p[0] - cx) + ny * (p[1] - cy) < 0:
                nx, ny = -nx, -ny
            for _ in range(3):
                o = r.uniform(3, depth)
                hx, hy = p[0] + nx * o + r.uniform(-4, 4), p[1] + ny * o + r.uniform(-4, 4)
                a = r.uniform(0, math.pi)
                ux, uy = math.cos(a), math.sin(a)
                ln = r.uniform(8, 16) * (1.2 - o / depth * 0.5)
                for k in range(r.randint(3, 4)):
                    off = (k - 1.5) * 2.9
                    ax, ay = hx - uy * off, hy + ux * off
                    lines.append("M%.1f,%.1f L%.1f,%.1f" % (ax - ux * ln / 2, ay - uy * ln / 2,
                                                            ax + ux * ln / 2, ay + uy * ln / 2))
    sk.stroke(" ".join(lines), 0.75, 0.9)
    union = " ".join(d for d, _ in shapes)
    sk.stroke(union, 3.4, 1.0)
    sk.white(union)
    xs = [p[0] for _, pts in shapes for p in pts]
    ys = [p[1] for _, pts in shapes for p in pts]
    cid = sk.uid()
    sk.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, union))
    g = []
    x = min(xs) - (min(xs) % grid)
    while x <= max(xs):
        g.append("M%.1f,%.1f V%.1f" % (x, min(ys), max(ys)))
        x += grid
    y = min(ys) - (min(ys) % grid)
    while y <= max(ys):
        g.append("M%.1f,%.1f H%.1f" % (min(xs), y, max(xs)))
        y += grid
    sk.add('<g clip-path="url(#%s)"><path d="%s" fill="none" stroke="%s" stroke-width="0.5" stroke-opacity="%.2f"/></g>'
           % (cid, " ".join(g), sk.ink_col, grid_op))


# ---------------------------------------------------------------------------
# furniture
# ---------------------------------------------------------------------------
def stairs(sk, x0, y0, x1, y1, n=7, vertical=True):
    sk.white("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (x0, y0, x1, y1, x0))
    sk.stroke("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (x0, y0, x1, y1, x0), 1.0)
    for i in range(1, n):
        if vertical:
            y = y0 + (y1 - y0) * i / n
            sk.line((x0, y), (x1, y), 0.8)
        else:
            x = x0 + (x1 - x0) * i / n
            sk.line((x, y0), (x, y1), 0.8)
    if vertical:
        cx = (x0 + x1) / 2
        sk.stroke("M%.1f,%.1f V%.1f l-3,-5 M%.1f,%.1f l3,-5" % (cx, y0 + 3, y1 - 3, cx, y1 - 3), 0.7, 0.8)


def door(sk, x, y, horizontal=True):
    w, h = (12, 6) if horizontal else (6, 12)
    d = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - w / 2, y - h / 2, w, h, w)
    sk.white(d)
    sk.stroke(d, 1.0)


def pillar(sk, x, y, r=6):
    d = "M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (x - r, y, r, r, 2 * r, r, r, 2 * r)
    sk.white(d)
    sk.hatch(d, (x - r, y - r, x + r, y + r), angle=45, spacing=2.0, w=0.6, op=0.9)
    sk.stroke(d, 1.1)


def sarcophagus(sk, x, y, w=14, h=30):
    d = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - w / 2, y - h / 2, w, h, w)
    sk.white(d)
    sk.stroke(d, 1.1)
    sk.stroke("M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, w - 6), 0.6, 0.8)
    sk.line((x, y - h / 2 + 6), (x, y + h / 2 - 10), 0.7)
    sk.line((x - w / 4, y - h / 2 + 11), (x + w / 4, y - h / 2 + 11), 0.7)


def bones(sk, x, y, n=5, s=7):
    r = sk.rng
    for _ in range(n):
        bx, by = x + r.uniform(-s, s) * 1.6, y + r.uniform(-s, s)
        a = r.uniform(0, math.pi)
        sk.line((bx - math.cos(a) * s * 0.6, by - math.sin(a) * s * 0.6),
                (bx + math.cos(a) * s * 0.6, by + math.sin(a) * s * 0.6), 1.2, 0.85)
    sk.circle(x, y - s * 0.2, s * 0.35, 0.9)


def pit(sk, x, y, r=12):
    d = "M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (x - r, y, r, r, 2 * r, r, r, 2 * r)
    sk.hatch(d, (x - r, y - r, x + r, y + r), angle=30, spacing=2.0, w=0.6, op=0.9, cross=True)
    sk.stroke(d, 1.1)


def chest(sk, x, y):
    sk.stroke("M%.1f,%.1f h12 v8 h-12 Z M%.1f,%.1f h12" % (x - 6, y - 4, x - 6, y - 1), 0.9)


def number(sk, x, y, n):
    sk.text(x, y + 4, str(n), 11, 0.85, italic=False)


def note(sk, x, y, w, lines=3, arrow_to=None):
    K.scribble_block(sk, x, y, w, lines, 6, 11, 0.75)
    if arrow_to:
        ax, ay = x + w / 2, y - 10 if arrow_to[1] < y else y + lines * 11 + 2
        sk.stroke(K.smooth_path([(ax, ay), ((ax + arrow_to[0]) / 2 + 10, (ay + arrow_to[1]) / 2),
                                 arrow_to]), 0.7, 0.7)


# ---------------------------------------------------------------------------
# modules in local coordinates (placed with an SVG transform)
# ---------------------------------------------------------------------------
def begin(sk, x, y, rot=0, s=1.0):
    g = '<g transform="translate(%.1f,%.1f) rotate(%.1f) scale(%.3f)">' % (x, y, rot, s)
    sk.add(g)
    sk.wash.append(g)


def end(sk):
    sk.add("</g>")
    sk.wash.append("</g>")


def temple(sk):
    """Horizontal temple, ~330 x 240: porch, columned nave, apse with altar, side chapels."""
    nave = rect(40, 60, 250, 180)
    apse = circle(250, 120, 58)
    porch = rect(0, 100, 40, 140)
    ch1, ch2 = rect(110, 22, 170, 60), rect(110, 180, 170, 218)
    sk.washellipse(170, 120, 170, 110, VIOLET, 0.4)
    dungeon(sk, [nave, apse, porch, ch1, ch2])
    for x in range(62, 240, 34):
        pillar(sk, x, 84)
        pillar(sk, x, 156)
    stairs(sk, 4, 104, 38, 136, 5, vertical=False)
    # altar and a statue
    sk.fill("M272,106 h16 v28 h-16 Z", op=0.9)
    sk.circle(292, 120, 4, 0.9)
    K.skull(sk, 280, 92, 9)
    sk.stroke("M126,32 h28 v18 h-28 Z M126,190 h28 v18 h-28 Z", 1.0)
    door(sk, 140, 60)
    door(sk, 140, 180)
    number(sk, 150, 125, 7)
    number(sk, 285, 150, 8)


def crypt(sk):
    """Vertical crypt, ~140 x 420: hall with wall niches and sarcophagi, corridor, ossuary."""
    shapes = [rect(0, 0, 130, 230)]
    for y in range(18, 220, 34):
        shapes.append(rect(-16, y, 0, y + 20))
        shapes.append(rect(130, y, 146, y + 20))
    shapes.append(rect(52, 230, 78, 330))
    shapes.append(circle(65, 372, 46))
    shapes.append(rect(52, -60, 78, 0))
    sk.washellipse(65, 200, 100, 230, VIOLET, 0.32)
    dungeon(sk, shapes)
    for row in range(3):
        for col in (38, 92):
            sarcophagus(sk, col, 45 + row * 62)
    door(sk, 65, 230)
    door(sk, 65, 0)
    stairs(sk, 54, -58, 76, -8, 6)
    bones(sk, 65, 372, 9, 12)
    for a in range(0, 360, 45):
        K.skull(sk, 65 + math.cos(math.radians(a)) * 34, 372 + math.sin(math.radians(a)) * 34, 7)
    number(sk, 65, 118, 3)


def cluster(sk, rooms, links, feats):
    """Generic rooms (rects/circles) joined by corridors; feats is a list of callables."""
    shapes = list(rooms) + list(links)
    dungeon(sk, shapes)
    for f in feats:
        f()


def cave(sk, cx, cy, s=1.0):
    r = sk.rng
    shapes = [blob(cx, cy, 70 * s, r), blob(cx + 70 * s, cy + 80 * s, 50 * s, r), blob(cx - 50 * s, cy + 110 * s, 42 * s, r)]
    sk.washellipse(cx + 10 * s, cy + 40 * s, 120 * s, 120 * s, BLUE, 0.32)
    dungeon(sk, shapes, depth=30, grid_op=0.0)
    # underground pool with ripples
    pool = K.smooth_path([(cx - 40 * s, cy), (cx - 10 * s, cy - 30 * s), (cx + 35 * s, cy - 18 * s),
                          (cx + 30 * s, cy + 20 * s), (cx - 20 * s, cy + 25 * s)], closed=True)
    sk.washblob(pool, BLUE, 0.55)
    sk.stroke(pool, 1.0)
    for i in range(4):
        y = cy - 14 * s + i * 10 * s
        sk.stroke("M%.1f,%.1f q6,-4 12,0 t12,0" % (cx - 16 * s + (i % 2) * 6, y), 0.6, 0.7)
    for _ in range(14):  # stalagmites
        a, rr = r.uniform(0, 6.28), r.uniform(0.2, 0.8)
        k = r.choice([0, 1, 2])
        ox, oy, R = [(cx, cy, 70), (cx + 70 * s, cy + 80 * s, 50), (cx - 50 * s, cy + 110 * s, 42)][k]
        x, y = ox + math.cos(a) * R * s * rr, oy + math.sin(a) * R * s * rr * 0.7
        if k == 0 and abs(x - cx) < 45 * s and abs(y - cy) < 32 * s:
            continue
        sk.circle(x, y, 2.5, 0.8)
        sk.dot(x, y, 0.9)


def ghosts(sk, rooms):
    """Half-erased pencil rooms the cartographer never finished (very faint)."""
    for (x, y, w, h) in rooms:
        sk.stroke("M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - w / 2, y - h / 2, w, h, w), 1.2, 0.45, dash="3 4")
        K.scribble(sk, x - w * 0.3, y + 4, w * 0.6, 5, 0.7, 0.5)


def margin_skulls(sk, spots):
    for (x, y, s) in spots:
        K.skull(sk, x, y, s)
        K.crossbones(sk, x, y + s * 0.75, s * 1.1)


def build(sk, wide):
    W, H = sk.W, sk.H
    r = sk.rng
    K.neatline(sk, 44)
    K.grid_texture(sk, 24, 0.16, (52, 52, W - 52, H - 52))
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        # faint passages and half-erased rooms fading into the centre
        for pts in ([(190, 700), (330, 720), (420, 820)], [(890, 560), (760, 600), (700, 700)],
                    [(190, 1300), (360, 1260), (480, 1350)], [(890, 1250), (720, 1300)],
                    [(470, 300), (540, 420), (520, 560)], [(560, 1500), (600, 1640), (540, 1760)],
                    [(200, 1000), (340, 980)], [(890, 1000), (760, 960), (660, 1020)]):
            sk.stroke(K.smooth_path(pts), 1.0, 0.6, dash="10 6")
        ghosts(sk, [(380, 880, 90, 70), (650, 1150, 110, 80), (430, 1500, 80, 90), (640, 480, 100, 70)])
        begin(sk, 72, 60, 0, 1.0)
        temple(sk)
        end(sk)
        reveals.append((240, 180, 230, 150))
        K.compass_rose(sk, 915, 200, 78)
        reveals.append((915, 200, 150, 150))
        begin(sk, 70, 470, 0, 0.8)
        crypt(sk)
        end(sk)
        # left lower rooms
        cluster(sk, [rect(80, 900, 180, 990), circle(130, 1080, 40), rect(84, 1180, 176, 1320)],
                [rect(120, 990, 140, 1045), rect(120, 1118, 140, 1180), rect(176, 1240, 200, 1260)],
                [lambda: pit(sk, 130, 1080, 15), lambda: door(sk, 130, 990), lambda: door(sk, 130, 1180),
                 lambda: chest(sk, 110, 930), lambda: bones(sk, 150, 1290), lambda: number(sk, 150, 960, 4),
                 lambda: number(sk, 110, 1250, 5)])
        cluster(sk, [rect(80, 1420, 180, 1540)], [rect(120, 1320, 140, 1420)],
                [lambda: stairs(sk, 96, 1440, 164, 1470, 6, False), lambda: door(sk, 130, 1420),
                 lambda: pillar(sk, 105, 1510), lambda: pillar(sk, 155, 1510), lambda: number(sk, 130, 1495, 6)])
        # right side rooms
        cluster(sk, [rect(900, 360, 1010, 470), rect(920, 540, 1010, 640), rect(900, 700, 1010, 760)],
                [rect(945, 470, 965, 540), rect(955, 640, 975, 700), rect(880, 410, 900, 430)],
                [lambda: door(sk, 955, 470), lambda: door(sk, 965, 640), lambda: sarcophagus(sk, 955, 415, 30, 14),
                 lambda: bones(sk, 965, 590), lambda: stairs(sk, 915, 710, 995, 750, 8, False),
                 lambda: number(sk, 925, 385, 1), lambda: number(sk, 990, 565, 2)])
        cave(sk, 960, 900, 0.62)
        cluster(sk, [circle(955, 1230, 52), rect(905, 1330, 1005, 1470)], [rect(945, 1282, 965, 1330)],
                [lambda: [pillar(sk, 955 + math.cos(a) * 32, 1230 + math.sin(a) * 32, 5)
                          for a in [i * math.pi / 3 for i in range(6)]],
                 lambda: K.skull(sk, 955, 1230, 13), lambda: door(sk, 955, 1330),
                 lambda: [sarcophagus(sk, x, 1400) for x in (925, 955, 985)], lambda: number(sk, 955, 1455, 9)])
        margin_skulls(sk, [(125, 1640, 30), (955, 1560, 26), (955, 1085, 20)])
        note(sk, 900, 1640, 110, 4, (955, 1480))
        note(sk, 84, 820, 100, 3)
        note(sk, 890, 300, 110, 2)
        K.cartouche(sk, 300, 1785, 340, 86)
        reveals.append((300, 1780, 250, 90))
        K.scale_bar(sk, 770, 1800, 220, numbers=True)
        reveals.append((880, 1800, 160, 50))
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        for pts in ([(580, 300), (700, 360), (760, 460)], [(1340, 620), (1220, 660), (1180, 760)],
                    [(580, 780), (720, 760)], [(1340, 300), (1230, 260)], [(900, 60), (960, 200)],
                    [(1000, 1030), (940, 900)]):
            sk.stroke(K.smooth_path(pts), 1.0, 0.6, dash="10 6")
        ghosts(sk, [(800, 560, 100, 70), (1100, 360, 90, 80), (1080, 820, 110, 70)])
        begin(sk, 90, 70, 0, 1.3)
        temple(sk)
        end(sk)
        begin(sk, 150, 520, -90, 0.9)
        crypt(sk)
        end(sk)
        cluster(sk, [rect(470, 440, 570, 560), circle(520, 660, 45), rect(430, 770, 570, 880)],
                [rect(510, 560, 530, 615), rect(510, 705, 530, 770), rect(400, 820, 430, 840)],
                [lambda: pit(sk, 520, 660, 16), lambda: door(sk, 520, 560), lambda: door(sk, 520, 770),
                 lambda: [pillar(sk, x, 825) for x in (460, 500, 540)], lambda: chest(sk, 490, 470),
                 lambda: number(sk, 540, 510, 4), lambda: number(sk, 470, 860, 5)])
        cluster(sk, [rect(90, 820, 250, 930)], [rect(250, 865, 400, 885)],
                [lambda: stairs(sk, 100, 840, 170, 910, 7, False), lambda: bones(sk, 210, 880),
                 lambda: number(sk, 225, 845, 6)])
        margin_skulls(sk, [(330, 990, 28), (1830, 470, 22), (620, 60, 18)])
        note(sk, 300, 720, 130, 3, (360, 660))
        K.compass_rose(sk, 1750, 190, 85)
        cluster(sk, [rect(1360, 80, 1520, 200), rect(1400, 270, 1520, 380), rect(1560, 300, 1660, 420)],
                [rect(1430, 200, 1450, 270), rect(1520, 320, 1560, 340), rect(1340, 130, 1360, 150)],
                [lambda: door(sk, 1440, 200), lambda: door(sk, 1540, 330, False),
                 lambda: [sarcophagus(sk, x, 140) for x in (1390, 1420, 1450, 1480)],
                 lambda: stairs(sk, 1580, 320, 1640, 400, 7), lambda: bones(sk, 1460, 330),
                 lambda: number(sk, 1500, 100, 1), lambda: number(sk, 1500, 360, 2)])
        cave(sk, 1560, 590, 0.95)
        cluster(sk, [circle(1760, 690, 60), rect(1700, 800, 1830, 910)], [rect(1750, 750, 1770, 800),
                                                                         rect(1690, 680, 1700, 700)],
                [lambda: [pillar(sk, 1760 + math.cos(a) * 38, 690 + math.sin(a) * 38, 5)
                          for a in [i * math.pi / 3 for i in range(6)]],
                 lambda: K.skull(sk, 1760, 690, 14), lambda: door(sk, 1760, 800),
                 lambda: [sarcophagus(sk, x, 860) for x in (1730, 1765, 1800)], lambda: number(sk, 1810, 820, 9)])
        note(sk, 1370, 850, 150, 4, (1500, 760))
        K.cartouche(sk, 1600, 972, 300, 64, lines=1)
        K.scale_bar(sk, 1360, 440, 150)
    return box, reveals


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-acto2", build,
          dict(base=(200, 172, 128), stains=13, edge=140, edge_dark=0.7, burn=0.2, crumple=1.1, mottle=1.3),
          out, work, seed=23, grade_kw=dict(vignette=0.45))
