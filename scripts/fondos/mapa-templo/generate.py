"""Campaign map «El Templo Oscuro» (Act II, second scenario).

A cartographer's survey of a desecrated temple on dark parchment: the plan of the temple with
its nave, aisles, columns (some toppled) and the sacrificial altar in the apse; a ritual
circle ringed with runes; black candles and skulls in the margins; the portal of the Abyss;
the cult's sigil (an eye inside a broken ring); and notes stained with wax and blood.
Everything big lives in the margins and corners; the centre keeps faint runes and fading
drag marks. Washed crimson and violet accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

CRIMSON = (150, 22, 28)
VIOLET = (110, 60, 150)
WAX = (226, 204, 150)


# ---------------------------------------------------------------------------
# stains and small props
# ---------------------------------------------------------------------------
def blob_path(sk, x, y, r, n=12, squash=1.0, jag=0.25):
    rng = sk.rng
    ph = [rng.uniform(0, 6) for _ in range(3)]
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + jag * math.sin(3 * a + ph[0]) + jag * 0.5 * math.sin(5 * a + ph[1]) + rng.uniform(-0.1, 0.1))
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr * squash))
    return K.smooth_path(pts, closed=True)


def blood(sk, x, y, r, op=0.62, drips=0):
    rng = sk.rng
    sk.washblob(blob_path(sk, x, y, r, 14, 0.8, 0.3), CRIMSON, op)
    for _ in range(int(r / 3)):
        a, d = rng.uniform(0, 6.28), rng.uniform(1.1, 2.2) * r
        sk.washellipse(x + math.cos(a) * d, y + math.sin(a) * d * 0.8, rng.uniform(1.2, 3.5), rng.uniform(1.2, 3.5),
                       CRIMSON, op * 0.9)
    for _ in range(drips):
        dx = rng.uniform(-r * 0.6, r * 0.6)
        ln = rng.uniform(r * 0.8, r * 2.2)
        sk.washstroke("M%.1f,%.1f v%.1f" % (x + dx, y, ln), CRIMSON, rng.uniform(2.5, 4.5), op)
        sk.washellipse(x + dx, y + ln, 3, 3.5, CRIMSON, op)


def wax(sk, x, y, r):
    d = blob_path(sk, x, y, r, 10, 0.85, 0.18)
    sk.washblob(d, WAX, 0.55)
    sk.stroke(d, 0.6, 0.35)
    for i in range(3):
        a = sk.rng.uniform(0, 6.28)
        sk.circle(x + math.cos(a) * r * 1.5, y + math.sin(a) * r * 1.2, sk.rng.uniform(1.5, 3), 0.5, 0.35)


def candle(sk, x, y, h=34, w=10, lit=True):
    """Black candle standing on y, with wax drips, a flame and a puddle."""
    rng = sk.rng
    top = y - h
    body = "M%.1f,%.1f L%.1f,%.1f" % (x - w / 2, y, x - w / 2, top + 2)
    # irregular melted rim
    for i in range(5):
        body += " L%.1f,%.1f" % (x - w / 2 + w * (i + 0.5) / 5, top + rng.uniform(-1, 2))
    body += " L%.1f,%.1f L%.1f,%.1f Z" % (x + w / 2, top + 2, x + w / 2, y)
    sk.fill(body, op=0.88)
    for s in (-1, 1):  # drips running down
        ln = rng.uniform(h * 0.2, h * 0.5)
        sk.stroke("M%.1f,%.1f v%.1f" % (x + s * w / 2, top + 3, ln), 1.6, 0.9)
    sk.stroke("M%.1f,%.1f q%.1f,4 %.1f,0" % (x - w, y, w, w * 2), 0.8, 0.8)  # puddle
    sk.line((x, top), (x, top - 3), 0.7)
    if lit:
        fl = "M%.1f,%.1f q-5,-7 0,-16 q5,9 0,16 Z" % (x, top - 2)
        sk.washellipse(x, top - 10, 11, 13, (230, 180, 80), 0.45)
        sk.white(fl)
        sk.stroke(fl, 0.9)
        for a in (-60, -30, 0, 30, 60):
            ra = math.radians(a - 90)
            sk.line((x + math.cos(ra) * 11, top - 8 + math.sin(ra) * 11), (x + math.cos(ra) * 15, top - 8 + math.sin(ra) * 15),
                    0.5, 0.6)


def candles(sk, x, y, n=3, s=1.0, lit=True):
    rng = sk.rng
    for i in range(n):
        cx = x + (i - (n - 1) / 2) * 17 * s + rng.uniform(-2, 2)
        candle(sk, cx, y + rng.uniform(-3, 3), rng.uniform(24, 46) * s, 10 * s, lit and rng.random() < 0.85)


def skull_candle(sk, x, y, s=22):
    """A black candle melted onto a skull, wax running down the cranium."""
    K.skull(sk, x, y, s)
    candle(sk, x, y - s * 0.45, s * 1.1, s * 0.34)
    for dx in (-0.22, 0.05, 0.2):
        sk.stroke("M%.1f,%.1f q1,%.1f 0,%.1f" % (x + dx * s, y - s * 0.46, s * 0.12, s * 0.22), 1.8, 0.85)


def ritual_knife(sk, x, y, ang, L):
    K.dagger(sk, x, y, ang, L, wf=1.2)
    ra = math.radians(ang)
    tx, ty = x + math.cos(ra) * L, y + math.sin(ra) * L
    blood(sk, tx, ty + 4, L * 0.06, 0.6, drips=1)


def cells(sk):
    """The cult's holding cells (plan, ~200 x 150): a corridor with barred cages."""
    p = K.Plan(sk, wall=3.0, depth=18, grid=10, grid_op=0.28)
    p.rect(0, 60, 200, 90)
    for i in range(4):
        p.rect(4 + i * 50, 0, 46 + i * 50, 56)
        p.rect(4 + i * 50, 94, 46 + i * 50, 150)
    p.render(wash=VIOLET, wash_op=0.15)
    for i in range(4):
        for (y0, y1) in ((56, 60), (90, 94)):
            for k in range(6):
                x = 8 + i * 50 + k * 6.5
                sk.line((x, y0 - 3), (x, y1 + 3), 0.9)
        K.skull(sk, 25 + i * 50, 28 + (i % 2) * 10, 9)
        if i % 2 == 0:
            sk.stroke("M%.1f,130 q10,-12 20,0" % (15 + i * 50), 0.8)
    blood(sk, 125, 120, 9, 0.55)
    sk.text(100, 80, "6", 11, 0.85, italic=False)


def skull_pile(sk, x, y, s=16):
    K.crossbones(sk, x, y + s * 0.9, s * 1.6)
    K.skull(sk, x - s * 0.7, y + s * 0.2, s * 0.8)
    K.skull(sk, x + s * 0.7, y + s * 0.25, s * 0.75)
    K.skull(sk, x, y - s * 0.3, s)


def note(sk, x, y, w, lines=3, stain=None):
    K.scribble_block(sk, x, y, w, lines, 6, 11, 0.75)
    if stain == "wax":
        wax(sk, x + w * 0.7, y + lines * 5, 17)
    elif stain == "blood":
        blood(sk, x + w * 0.3, y + lines * 4, 15, 0.62, drips=2)
    elif stain == "both":
        wax(sk, x + w * 0.8, y + 4, 15)
        blood(sk, x + w * 0.2, y + lines * 8, 13, 0.62, drips=1)


def number(sk, x, y, n):
    sk.text(x, y + 4, str(n), 11, 0.85, italic=False)


# ---------------------------------------------------------------------------
# set pieces (local coordinates)
# ---------------------------------------------------------------------------
def pillar(sk, x, y, r=6, broken=False):
    d = "M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (x - r, y, r, r, 2 * r, r, r, 2 * r)
    sk.white(d)
    if broken:
        sk.stroke(d, 1.0, 0.8, dash="3 2")
        rng = sk.rng
        for _ in range(5):
            px, py = x + rng.uniform(-14, 14), y + rng.uniform(-14, 14)
            sk.poly([(px, py), (px + rng.uniform(2, 5), py + rng.uniform(-2, 2)),
                     (px + rng.uniform(0, 4), py + rng.uniform(2, 5))], 0.7, 0.9)
    else:
        sk.hatch(d, (x - r, y - r, x + r, y + r), angle=45, spacing=2.0, w=0.6, op=0.9)
        sk.stroke(d, 1.1)


def fallen_column(sk, x, y, ang, L=46, r=6):
    K.group(sk, x, y, ang)
    d = "M0,%.1f h%.1f v%.1f h-%.1f Z" % (-r, L, 2 * r, L)
    sk.white(d)
    sk.hatch(d, (0, -r, L, r), angle=0, spacing=2.0, w=0.55, op=0.75)
    sk.stroke(d, 1.0)
    for t in (0.33, 0.66):
        sk.line((L * t, -r), (L * t + 2, r), 0.7)
    K.ungroup(sk)


def temple(sk):
    """Vertical temple plan ~140 x 860: apse (top) with the sacrificial altar, transept, a
    columned nave with side chapels, narthex and porch steps (bottom)."""
    rng = sk.rng
    p = K.Plan(sk, wall=3.4, depth=24, grid=12, grid_op=0.3)
    p.circle(0, 70, 50)
    p.rect(-50, 70, 50, 170)
    p.rect(-70, 170, 70, 250)
    p.rect(-45, 250, 45, 760)
    for y in (360, 560):
        p.rect(-70, y, -45, y + 60)
        p.rect(45, y, 70, y + 60)
    p.rect(-60, 760, 60, 820)
    p.rect(-26, 820, 26, 862)
    p.render(wash=VIOLET, wash_op=0.18)
    # columns, two of them toppled
    for i, y in enumerate(range(282, 745, 52)):
        for sx in (-1, 1):
            broken = (i, sx) in ((3, 1), (6, -1))
            pillar(sk, sx * 29, y, 6, broken)
    fallen_column(sk, 20, 432, 130, 44)
    fallen_column(sk, -26, 598, 60, 40)
    # broken pews
    for y in range(300, 740, 16):
        if rng.random() < 0.7:
            tilt = rng.uniform(-3, 3) if rng.random() < 0.3 else 0
            sk.line((-17, y), (-4, y + tilt), 0.8, 0.8)
        if rng.random() < 0.7:
            sk.line((4, y), (17, y + rng.uniform(-3, 3) if rng.random() < 0.3 else y), 0.8, 0.8)
    # the altar of sacrifice with blood channels to a basin
    alt = "M-22,78 h44 v26 h-44 Z"
    sk.white(alt)
    sk.hatch(alt, (-22, 78, 22, 104), angle=45, spacing=2.2, w=0.6, op=0.85, cross=True)
    sk.stroke(alt, 1.4)
    for sx in (-1, 1):
        sk.line((sx * 22, 104), (sx * 6, 138), 0.8, 0.9)
    sk.circle(0, 142, 8, 1.1)
    blood(sk, 0, 92, 18, 0.55)
    blood(sk, 0, 142, 7, 0.6)
    sk.washstroke(K.smooth_path([(0, 150), (6, 190), (-4, 240), (5, 300), (-2, 360), (6, 420)]), CRIMSON, 6, 0.35)
    for a in range(0, 360, 60):  # candles round the altar
        ax, ay = math.cos(math.radians(a)) * 38, 72 + math.sin(math.radians(a)) * 38
        if abs(ay - 92) < 18 and abs(ax) < 30:
            continue
        sk.dot(ax, ay, 2.6)
        sk.washellipse(ax, ay, 6, 6, (230, 180, 80), 0.4)
    # side chapels: shattered statues and a stair to the crypt
    for (sx, y) in ((-57, 390), (57, 590)):
        sk.circle(sx, y, 7, 1.0, fill="#fff")
        sk.stroke("M%.1f,%.1f l4,5 l-3,4 l5,6" % (sx - 3, y - 7), 0.8)
    sk.white("M46,568 h20 v44 h-20 Z")
    sk.stroke("M46,568 h20 v44 h-20 Z", 1.0)
    for i in range(1, 7):
        sk.line((46, 568 + i * 6.3), (66, 568 + i * 6.3), 0.6)
    K.skull(sk, -57, 590, 9)
    # transept: an inverted star scratched into the floor
    star = []
    for i in range(5):
        a = math.pi / 2 + i * 4 * math.pi / 5
        star.append((math.cos(a) * 28, 210 + math.sin(a) * 28))
    sk.poly(star, 0.8, 0.8)
    sk.circle(0, 210, 30, 0.7, 0.7)
    # narthex doors and porch steps
    for x in (-18, 18):
        sk.white("M%.1f,757 h12 v6 h-12 Z" % (x - 6))
        sk.stroke("M%.1f,757 h12 v6 h-12 Z" % (x - 6), 1.0)
    for i in range(1, 6):
        sk.line((-26, 820 + i * 7), (26, 820 + i * 7), 0.7)
    for (n, x, y) in ((1, 0, 845), (2, 34, 790), (3, 0, 520), (4, -52, 210), (5, 0, 40)):
        number(sk, x, y, n)


def ritual_circle(sk, R):
    rng = sk.rng
    sk.washellipse(0, 0, R * 1.05, R * 1.05, VIOLET, 0.22)
    sk.circle(0, 0, R, 1.6)
    sk.circle(0, 0, R * 0.95, 0.7)
    sk.circle(0, 0, R * 0.74, 1.2)
    n = 16
    for i in range(n):
        a = 2 * math.pi * i / n
        rx, ry = math.cos(a) * R * 0.845, math.sin(a) * R * 0.845
        K.group(sk, rx, ry, math.degrees(a) + 90)
        K.rune(sk, 0, 0, R * 0.075, 0.95, 0.9)
        K.ungroup(sk)
    pts = []
    for i in range(7):
        a = -math.pi / 2 + i * 2 * math.pi / 7
        pts.append((math.cos(a) * R * 0.74, math.sin(a) * R * 0.74))
    star = [pts[(i * 3) % 7] for i in range(7)]
    sk.poly(star, 1.0, 0.95)
    for (x, y) in pts:
        sk.circle(x, y, R * 0.07, 0.9, fill="#fff")
        sk.dot(x, y, R * 0.025)
    blood(sk, 0, 0, R * 0.2, 0.5)
    K.skull(sk, 0, -R * 0.03, R * 0.2)
    for i in range(5):  # drag marks leaving the circle
        a = rng.uniform(0, 6.28)
        sk.line((math.cos(a) * R * 1.05, math.sin(a) * R * 1.05), (math.cos(a) * R * 1.25, math.sin(a) * R * 1.25),
                0.6, 0.6)


def sigil(sk, R):
    """The cult's sigil: an eye inside a broken ring."""
    sk.washellipse(0, 0, R * 1.1, R * 1.1, VIOLET, 0.2)
    gaps = [(-100, -78), (35, 52)]

    def arcs(r, w):
        segs = []
        start = gaps[-1][1] - 360
        for g0, g1 in gaps:
            segs.append((start, g0))
            start = g1
        for a0, a1 in segs:
            pts = [(math.cos(math.radians(a)) * r, math.sin(math.radians(a)) * r) for a in
                   [a0 + (a1 - a0) * t / 40 for t in range(41)]]
            sk.stroke(K.smooth_path(pts), w)

    arcs(R, 2.0)
    arcs(R * 0.86, 1.0)
    for g0, g1 in gaps:  # jagged broken ends
        for a in (g0, g1):
            ra = math.radians(a)
            s = 1 if a == g0 else -1
            p0 = (math.cos(ra) * R, math.sin(ra) * R)
            p1 = (math.cos(ra + s * 0.05) * R * 0.95, math.sin(ra + s * 0.05) * R * 0.95)
            p2 = (math.cos(ra) * R * 0.86, math.sin(ra) * R * 0.86)
            sk.stroke("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f" % (p0 + p1 + p2), 1.0)
        # fragments drifting out of the gap
        am = math.radians((g0 + g1) / 2)
        for k in range(3):
            d = R * (1.05 + k * 0.1)
            x, y = math.cos(am + (k - 1) * 0.06) * d, math.sin(am + (k - 1) * 0.06) * d
            sk.poly([(x - 3, y - 2), (x + 3, y - 3), (x + 1, y + 3)], 0.8, fill="#fff")
    for i in range(24):  # rays between the rings
        a = math.radians(i * 15)
        if any(g0 - 4 <= (i * 15 + 180) % 360 - 180 <= g1 + 4 for g0, g1 in gaps):
            continue
        sk.line((math.cos(a) * R * 0.88, math.sin(a) * R * 0.88), (math.cos(a) * R * 0.98, math.sin(a) * R * 0.98), 0.7)
    sk.washellipse(0, 0, R * 0.22, R * 0.22, CRIMSON, 0.55)
    K.eye_glyph(sk, 0, 0, R * 0.62)
    sk.washstroke("M0,%.1f q-2,%.1f 0,%.1f" % (R * 0.3, R * 0.2, R * 0.42), CRIMSON, 3.5, 0.55)
    sk.washellipse(0, R * 0.74, 3.5, 4.5, CRIMSON, 0.6)


def portal(sk, rx, ry):
    """The portal of the Abyss: a swirling oval ringed with standing stones."""
    rng = sk.rng
    sk.washellipse(0, 0, rx * 1.35, ry * 1.25, VIOLET, 0.3)
    sk.washellipse(0, 0, rx * 0.8, ry * 0.8, (60, 25, 80), 0.35)
    ell = "M%.1f,0 a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (-rx, rx, ry, 2 * rx, rx, ry, 2 * rx)
    sk.white(ell)
    # swirl of the void and a dark heart
    for k in range(3):
        K.spiral(sk, 0, 0, rx * (0.95 - k * 0.12), turns=3.2 + k, w=0.8, op=0.8, squash=ry / rx)
    inner = "M%.1f,0 a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (
        -rx * 0.28, rx * 0.28, ry * 0.28, rx * 0.56, rx * 0.28, ry * 0.28, rx * 0.56)
    sk.hatch(inner, (-rx * 0.3, -ry * 0.3, rx * 0.3, ry * 0.3), angle=30, spacing=1.8, w=0.6, op=0.95, cross=True)
    sk.stroke(ell, 1.8)
    sk.stroke("M%.1f,0 a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (
        -rx * 1.08, rx * 1.08, ry * 1.08, rx * 2.16, rx * 1.08, ry * 1.08, rx * 2.16), 0.8, 0.8)
    # standing stones
    n = 11
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        cx, cy = math.cos(a) * rx * 1.28, math.sin(a) * ry * 1.2
        K.group(sk, cx, cy, math.degrees(a))
        st = "M-5,-7 L6,-6 L7,6 L-6,7 Z"
        sk.white(st)
        sk.hatch(st, (-7, -7, 7, 7), angle=60, spacing=2.0, w=0.55, op=0.8)
        sk.stroke(st, 1.0)
        K.ungroup(sk)
    # claws reaching out of the rim
    for (a, s) in ((200, 1), (330, -1), (80, 1)):
        ra = math.radians(a)
        bx, by = math.cos(ra) * rx * 0.7, math.sin(ra) * ry * 0.7
        for f in range(3):
            fa = ra + (f - 1) * 0.18
            tip = (math.cos(fa) * rx * 1.12, math.sin(fa) * ry * 1.1)
            mid = ((bx + tip[0]) / 2 + s * 5, (by + tip[1]) / 2)
            sk.stroke(K.smooth_path([(bx, by), mid, tip]), 1.1)
    # cracks radiating into the floor
    for i in range(8):
        a = rng.uniform(0, 6.28)
        pts = [(math.cos(a) * rx * 1.4, math.sin(a) * ry * 1.3)]
        for k in range(3):
            a += rng.uniform(-0.25, 0.25)
            pts.append((math.cos(a) * rx * (1.55 + k * 0.2), math.sin(a) * ry * (1.4 + k * 0.18)))
        sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in pts), 0.7, 0.75)


def altar_elevation(sk, s=1.0):
    """The sacrificial slab in elevation, with chains, blood and candles (ground y=0)."""
    w, h = 150 * s, 18 * s
    slab = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (-w / 2, -60 * s, w, h, w)
    for x in (-w / 2 + 10 * s, w / 2 - 34 * s):
        leg = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x, -42 * s, 24 * s, 42 * s, 24 * s)
        sk.white(leg)
        sk.hatch(leg, (x, -42 * s, x + 24 * s, 0), angle=70, spacing=2.4, w=0.6, op=0.75)
        sk.stroke(leg, 1.2)
        K.skull(sk, x + 12 * s, -24 * s, 12 * s)
    sk.white(slab)
    sk.hatch(slab, (-w / 2, -60 * s, w / 2, -42 * s), angle=0, spacing=2.6, w=0.55, op=0.6)
    sk.stroke(slab, 1.5)
    for sx in (-1, 1):  # shackles and chains
        x = sx * w * 0.36
        sk.circle(x, -64 * s, 5 * s, 1.0)
        for k in range(5):
            sk.stroke("M%.1f,%.1f a%.1f,%.1f 0 1,0 0.1,0" % (x + sx * (8 + k * 7) * s, -62 * s + k * 7 * s, 3 * s,
                                                             4 * s), 0.8)
    blood(sk, 0, -58 * s, 16 * s, 0.55, drips=4)
    sk.stroke("M%.1f,1 h%.1f" % (-w * 0.75, w * 1.5), 1.0, 0.8)
    candles(sk, -w * 0.62, 0, 2, s)
    candles(sk, w * 0.62, 0, 3, s)


def faint_runes(sk, box, n):
    rng = sk.rng
    for _ in range(n):
        x, y = rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3])
        K.rune(sk, x, y, 9, 0.4, 0.8)


# ---------------------------------------------------------------------------
# layouts
# ---------------------------------------------------------------------------
def build(sk, wide):
    rng = sk.rng
    K.neatline(sk, 44)
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        faint_runes(sk, (260, 360, 820, 1550), 26)
        for pts in ([(200, 560), (330, 610), (420, 700)], [(880, 700), (760, 760), (700, 860)],
                    [(200, 1100), (350, 1160), (470, 1130)], [(880, 1180), (730, 1230)]):
            sk.stroke(K.smooth_path(pts), 1.0, 0.55, dash="10 6")
        K.group(sk, 124, 108, 0, 0.95)
        temple(sk)
        K.ungroup(sk)
        # left margin below the temple: candles, skulls, a ritual knife and stained notes
        skull_candle(sk, 88, 1080, 24)
        candles(sk, 150, 1085, 2)
        note(sk, 60, 1140, 125, 4, "both")
        skull_pile(sk, 120, 1255, 20)
        ritual_knife(sk, 70, 1330, 12, 125)
        note(sk, 60, 1400, 125, 3, "blood")
        candles(sk, 95, 1520, 3, 1.1)
        skull_candle(sk, 160, 1515, 22)
        # right margin: sigil (corner), ritual circle, portal
        K.group(sk, 925, 205, 0)
        sigil(sk, 82)
        K.ungroup(sk)
        reveals.append((925, 205, 130, 130))
        K.group(sk, 955, 560, 0)
        ritual_circle(sk, 74)
        K.ungroup(sk)
        for (x, y) in ((884, 492), (1026, 492), (884, 660), (1026, 660)):
            candle(sk, x, y, 30, 9)
        note(sk, 900, 700, 120, 3, "wax")
        K.group(sk, 960, 1010, 0)
        portal(sk, 52, 88)
        K.ungroup(sk)
        note(sk, 900, 1170, 120, 3, "blood")
        skull_candle(sk, 925, 1300, 24)
        candles(sk, 990, 1305, 2)
        skull_pile(sk, 960, 1390, 20)
        note(sk, 900, 1470, 115, 4, "wax")
        skull_candle(sk, 990, 1580, 20)
        blood(sk, 320, 1700, 10, 0.4)
        wax(sk, 700, 170, 12)
        # compass, cartouche and scale bar along the bottom
        K.compass_rose(sk, 190, 1745, 68)
        reveals.append((190, 1730, 160, 160))
        K.cartouche(sk, 565, 1815, 300, 70, lines=1)
        blood(sk, 470, 1830, 9, 0.45, drips=1)
        reveals.append((565, 1815, 220, 70))
        K.scale_bar(sk, 760, 1820, 190)
        reveals.append((855, 1820, 130, 45))
        candles(sk, 960, 1745, 3)
        skull_candle(sk, 360, 1770, 18)
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        faint_runes(sk, (640, 120, 1280, 960), 26)
        for pts in ([(560, 300), (680, 360), (740, 460)], [(1340, 620), (1220, 660), (1180, 760)],
                    [(560, 800), (700, 780)], [(1340, 300), (1230, 260)]):
            sk.stroke(K.smooth_path(pts), 1.0, 0.55, dash="10 6")
        K.group(sk, 130, 95, 0, 1.03)
        temple(sk)
        K.ungroup(sk)
        K.group(sk, 395, 250, 0)
        ritual_circle(sk, 110)
        K.ungroup(sk)
        for (x, y) in ((280, 150), (510, 150), (280, 385), (510, 385)):
            candle(sk, x, y, 34, 10)
        K.group(sk, 420, 710, 0)
        portal(sk, 70, 110)
        K.ungroup(sk)
        note(sk, 290, 900, 150, 3, "blood")
        skull_pile(sk, 525, 925, 20)
        candles(sk, 270, 540, 3)
        skull_candle(sk, 545, 520, 22)
        K.cartouche(sk, 380, 1010, 300, 58, lines=1)
        # right side: sigil, altar in elevation, candles, notes, compass
        K.group(sk, 1690, 230, 0)
        sigil(sk, 115)
        K.ungroup(sk)
        K.group(sk, 1545, 740, 0, 1.45)
        altar_elevation(sk)
        K.ungroup(sk)
        K.group(sk, 1360, 380, 0)
        cells(sk)
        K.ungroup(sk)
        note(sk, 1380, 820, 170, 3, "both")
        note(sk, 1370, 120, 150, 4, "wax")
        note(sk, 1720, 440, 150, 3, "blood")
        skull_candle(sk, 1790, 560, 26)
        candles(sk, 1850, 580, 2)
        skull_pile(sk, 1840, 680, 20)
        ritual_knife(sk, 1380, 610, -10, 150)
        skull_candle(sk, 1360, 960, 20)
        K.compass_rose(sk, 1760, 915, 75)
        K.scale_bar(sk, 1400, 1010, 180)
        candles(sk, 1620, 1005, 2)
        blood(sk, 1270, 190, 9, 0.4, drips=1)
    return box, reveals


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-templo", build,
          dict(base=(186, 156, 116), stains=14, edge=140, edge_dark=0.8, burn=0.25, crumple=1.1, mottle=1.4),
          out, work, seed=61, grade_kw=dict(vignette=0.5))
