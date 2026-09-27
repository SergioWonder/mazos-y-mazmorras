"""Campaign map «La Guarida de los Contrabandistas» (Act I, second scenario).

A smuggler's chart on parchment: the old inn with its cellars drawn as a plan, a network of
smuggling tunnels, the river bank with rowboats and a jetty, piles of crates and barrels, a
pinned treasure map with its X, dotted secret routes, a big dagger in a margin and a compass
rose made of crossed daggers. Everything big lives in the margins and corners; the centre
keeps only fading dotted routes. Washed teal / night-ink accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

TEAL = (55, 130, 128)
NIGHT = (50, 70, 115)
CRIMSON = "#8a2418"


# ---------------------------------------------------------------------------
# small props
# ---------------------------------------------------------------------------
def crate(sk, x, y, s=12, op=1.0):
    d = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - s / 2, y - s / 2, s, s, s)
    sk.white(d)
    sk.stroke(d, 1.0, op)
    sk.stroke("M%.1f,%.1f l%.1f,%.1f M%.1f,%.1f l%.1f,%.1f" % (x - s / 2, y - s / 2, s, s, x + s / 2, y - s / 2, -s, s),
              0.6, 0.8 * op)


def barrel_top(sk, x, y, r=6, op=1.0):
    sk.circle(x, y, r, 1.0, op, fill="#fff")
    sk.circle(x, y, r * 0.6, 0.6, 0.8 * op)
    sk.dot(x, y, 0.9, op)


def barrel_side(sk, x, y, h=22, op=1.0):
    w = h * 0.7
    d = "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (
        x - w * 0.42, y - h / 2, x - w * 0.62, y, x - w * 0.42, y + h / 2, x + w * 0.42, y + h / 2, x + w * 0.62, y,
        x + w * 0.42, y - h / 2)
    sk.white(d)
    sk.hatch(d, (x, y - h / 2, x + w * 0.62, y + h / 2), angle=90, spacing=2.2, w=0.55, op=0.6 * op)
    sk.stroke(d, 1.1, op)
    for t in (-0.3, 0.3):
        sk.stroke("M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f" % (x - w * 0.55, y + t * h, x, y + t * h + 2, x + w * 0.55,
                                                     y + t * h), 0.8, op)


def crate_side(sk, x, y, s=20, op=1.0):
    d = "M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x - s / 2, y - s, s, s, s)
    sk.white(d)
    sk.stroke(d, 1.1, op)
    for i in (1, 2):
        sk.line((x - s / 2, y - s + s * i / 3), (x + s / 2, y - s + s * i / 3), 0.5, 0.6 * op)
    sk.line((x - s / 2 + 2, y - 2), (x + s / 2 - 2, y - s + 2), 0.8, op)


def cargo_pile(sk, x, y, s=1.0):
    """Stacked crates and barrels (side view) on the ground line y."""
    crate_side(sk, x - 18 * s, y, 22 * s)
    crate_side(sk, x + 5 * s, y, 20 * s)
    crate_side(sk, x - 7 * s, y - 20 * s, 18 * s)
    barrel_side(sk, x + 28 * s, y - 11 * s, 22 * s)
    barrel_side(sk, x + 48 * s, y - 11 * s, 22 * s)
    barrel_side(sk, x + 38 * s, y - 31 * s, 20 * s)
    sk.stroke("M%.1f,%.1f h%.1f" % (x - 36 * s, y + 1, 100 * s), 0.8, 0.6)


def rowboat(sk, x, y, ang, L=46, oars=True):
    """Rowboat seen from above."""
    K.group(sk, x, y, ang)
    w = L * 0.28
    hull = "M%.1f,0 C%.1f,%.1f %.1f,%.1f %.1f,0 C%.1f,%.1f %.1f,%.1f %.1f,0 Z" % (
        -L / 2, -L * 0.3, -w, L * 0.3, -w, L / 2, L * 0.3, w, -L * 0.3, w, -L / 2)
    sk.white(hull)
    sk.hatch(hull, (-L / 2, 0, L / 2, w), angle=0, spacing=2.2, w=0.55, op=0.6)
    sk.stroke(hull, 1.2)
    inner = "M%.1f,0 C%.1f,%.1f %.1f,%.1f %.1f,0 C%.1f,%.1f %.1f,%.1f %.1f,0 Z" % (
        -L * 0.42, -L * 0.25, -w * 0.72, L * 0.25, -w * 0.72, L * 0.42, L * 0.25, w * 0.72, -L * 0.25, w * 0.72,
        -L * 0.42)
    sk.stroke(inner, 0.7, 0.8)
    for t in (-0.15, 0.12):
        sk.line((L * t, -w * 0.68), (L * t, w * 0.68), 1.0)
    if oars:
        for s in (-1, 1):
            sk.line((0, s * w * 0.5), (-L * 0.35, s * w * 2.4), 1.0)
            sk.stroke("M%.1f,%.1f l-6,%.1f l3,%.1f Z" % (-L * 0.35, s * w * 2.4, s * 3, s * 4), 0.9, fill="#fff")
    crate(sk, L * 0.28, 0, 7)
    K.ungroup(sk)


def barge(sk, x, y, ang, L=110):
    """Flat cargo barge seen from above, loaded with crates and barrels."""
    K.group(sk, x, y, ang)
    w = 30
    hull = "M%.1f,%.1f L%.1f,%.1f L%.1f,0 L%.1f,%.1f L%.1f,%.1f L%.1f,0 Z" % (
        -L / 2 + 10, -w / 2, L / 2 - 10, -w / 2, L / 2, L / 2 - 10, w / 2, -L / 2 + 10, w / 2, -L / 2)
    sk.white(hull)
    sk.stroke(hull, 1.3)
    for i in range(1, 12):
        xx = -L / 2 + 10 + (L - 20) * i / 12
        sk.line((xx, -w / 2), (xx, w / 2), 0.5, 0.55)
    for (cx, cy) in ((-30, -6), (-30, 7), (-17, -6), (-17, 7), (10, 0)):
        crate(sk, cx, cy, 11)
    for (cx, cy) in ((26, -7), (26, 7), (38, 0)):
        barrel_top(sk, cx, cy, 5.5)
    sk.line((-L / 2 - 8, 16), (L / 2 - 20, -22), 1.2)  # punt pole
    K.ungroup(sk)


def boathouse(sk, x, y, s=1.0):
    """Riverside boathouse in elevation on ground line y, with a water gate."""
    w, h, roof = 90 * s, 44 * s, 34 * s
    wall = "M%.1f,%.1f v%.1f h%.1f v%.1f Z" % (x - w / 2, y, -h, w, h)
    sk.white(wall)
    for i in range(1, 9):
        sk.line((x - w / 2 + w * i / 9, y), (x - w / 2 + w * i / 9, y - h), 0.5, 0.6)
    sk.stroke(wall, 1.3)
    rp = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (x - w / 2 - 6, y - h, x, y - h - roof, x + w / 2 + 6, y - h)
    sk.white(rp)
    sk.hatch(rp, (x - w / 2 - 6, y - h - roof, x + w / 2 + 6, y - h), angle=90, spacing=2.5, w=0.6, op=0.7)
    sk.stroke(rp, 1.3)
    gate = "M%.1f,%.1f v%.1f q%.1f,%.1f %.1f,0 v%.1f Z" % (x - w * 0.22, y, -h * 0.62, w * 0.22, -h * 0.3, w * 0.44,
                                                         h * 0.62)
    sk.white(gate)
    sk.hatch(gate, (x - w * 0.22, y - h * 0.95, x + w * 0.22, y), angle=35, spacing=1.9, w=0.7, op=0.9, cross=True)
    sk.stroke(gate, 1.2)
    sk.circle(x + w * 0.34, y - h * 0.55, 3, 1.0, fill="#fff")
    sk.washellipse(x + w * 0.34, y - h * 0.55, 9, 9, (215, 170, 70), 0.5)
    for i in range(5):  # stilts into the water
        sk.line((x - w / 2 + 6 + i * (w - 12) / 4, y), (x - w / 2 + 6 + i * (w - 12) / 4, y + 10 * s), 1.0)
    sk.stroke("M%.1f,%.1f q8,-3 16,0 t16,0 t16,0 t16,0" % (x - w / 2, y + 12 * s), 0.7, 0.7)


def reeds(sk, x, y, n=5):
    r = sk.rng
    for i in range(n):
        gx = x + i * 4 + r.uniform(-1, 1)
        h = r.uniform(7, 13)
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (gx, y, r.uniform(-2, 2), -h / 2, r.uniform(-3, 3), -h), 0.7, 0.75)
        if r.random() < 0.4:
            sk.stroke("M%.1f,%.1f v-4" % (gx + 0.5, y - h + 1), 2.0, 0.8)


def secret_route(sk, pts, op=0.85, arrow=True):
    d = K.smooth_path(pts)
    sk.stroke(d, 1.3, op, dash="0.1 7")
    if arrow:
        (ax, ay), (bx, by) = pts[-2], pts[-1]
        a = math.atan2(by - ay, bx - ax)
        for s in (-1, 1):
            sk.line((bx, by), (bx - math.cos(a + s * 0.5) * 10, by - math.sin(a + s * 0.5) * 10), 1.0, op)


def x_mark(sk, x, y, s=14, col=CRIMSON, w=2.4):
    sk.stroke("M%.1f,%.1f l%.1f,%.1f M%.1f,%.1f l%.1f,%.1f" % (x - s / 2, y - s / 2, s, s, x + s / 2, y - s / 2, -s, s),
              w, 0.95, col=col)


def note(sk, x, y, w, lines=3):
    K.scribble_block(sk, x, y, w, lines, 6, 11, 0.75)


# ---------------------------------------------------------------------------
# set pieces (local coordinates, placed with K.group)
# ---------------------------------------------------------------------------
def inn(sk):
    """The old inn in elevation, ~220 x 170 on the ground line y=0 (x from -110 to 110)."""
    r = sk.rng
    # main building: two storeys, gable roof, chimney
    w, h, roof = 150, 70, 58
    x0 = -75
    wall = "M%.1f,0 v%.1f h%.1f v%.1f Z" % (x0, -h, w, h)
    sk.white(wall)
    sk.stroke(wall, 1.4)
    # timber framing
    for fx in (-40, 0, 40):
        sk.line((fx, 0), (fx, -h), 0.7, 0.7)
    sk.line((x0, -h * 0.5), (x0 + w, -h * 0.5), 0.8, 0.8)
    for fx in (-58, -20, 20, 58):
        sk.stroke("M%.1f,%.1f l8,-13 M%.1f,%.1f l-8,-13" % (fx - 10, -h * 0.5 - 1, fx + 10, -h * 0.5 - 1), 0.6, 0.55)
    # windows (upper lit, lower shuttered)
    for fx in (-58, -20, 20, 58):
        d = "M%.1f,%.1f h10 v12 h-10 Z" % (fx - 5, -h + 10)
        sk.white(d)
        sk.stroke(d, 0.9)
        sk.line((fx, -h + 10), (fx, -h + 22), 0.6)
        sk.washblob(d, (215, 170, 70), 0.55)
    for fx in (-58, 58):
        d = "M%.1f,%.1f h12 v12 h-12 Z" % (fx - 6, -26)
        sk.white(d)
        sk.hatch(d, (fx - 6, -26, fx + 6, -14), angle=90, spacing=2.0, w=0.55, op=0.8)
        sk.stroke(d, 0.9)
    door = "M-9,0 v-22 q9,-8 18,0 v22 Z"
    sk.white(door)
    sk.hatch(door, (-9, -30, 9, 0), angle=90, spacing=2.4, w=0.6, op=0.85)
    sk.stroke(door, 1.1)
    # roof with shingle hatching
    rp = "M%.1f,%.1f L0,%.1f L%.1f,%.1f Z" % (x0 - 8, -h, -h - roof, x0 + w + 8, -h)
    sk.white(rp)
    sk.hatch(rp, (x0 - 8, -h - roof, x0 + w + 8, -h), angle=90, spacing=2.6, w=0.6, op=0.65)
    for i in range(1, 5):
        yy = -h - roof * i / 5
        half = (w / 2 + 8) * (1 - i / 5)
        sk.line((-half, yy), (half, yy), 0.6, 0.6)
    sk.stroke(rp, 1.4)
    # dormer
    dm = "M-12,%.1f v-12 l12,-10 l12,10 v12 Z" % (-h - 14)
    sk.white(dm)
    sk.stroke(dm, 1.0)
    sk.stroke("M-4,%.1f h8 v-8 h-8 Z" % (-h - 16), 0.7)
    # chimney and smoke curl
    ch = "M38,%.1f v-34 h14 v%.1f Z" % (-h - roof * 0.34, 34 - roof * 0.2)
    sk.white(ch)
    sk.hatch(ch, (38, -h - roof * 0.34 - 34, 52, -h), angle=0, spacing=4, w=0.6, op=0.7)
    sk.stroke(ch, 1.1)
    pts = [(45, -h - roof * 0.34 - 36)]
    for i in range(7):
        pts.append((45 + math.sin(i * 1.2) * 9 + i * 5, pts[0][1] - (i + 1) * 9))
    sk.stroke(K.smooth_path(pts), 0.9, 0.6)
    # hanging sign on a bracket, with a tankard
    sk.stroke("M%.1f,%.1f h-30 M%.1f,%.1f l14,-12" % (x0, -h * 0.62, x0 - 16, -h * 0.62), 1.1)
    sign = "M%.1f,%.1f h24 v18 h-24 Z" % (x0 - 34, -h * 0.62 + 6)
    sk.line((x0 - 30, -h * 0.62), (x0 - 30, -h * 0.62 + 6), 0.7)
    sk.line((x0 - 14, -h * 0.62), (x0 - 14, -h * 0.62 + 6), 0.7)
    sk.white(sign)
    sk.stroke(sign, 1.1)
    sk.stroke("M%.1f,%.1f h8 v10 h-8 Z M%.1f,%.1f q5,1 0,6" % (x0 - 27, -h * 0.62 + 10, x0 - 19, -h * 0.62 + 12), 0.8)
    # side stable with a lean-to roof
    sx = x0 + w
    st = "M%.1f,0 v-38 h52 v38 Z" % sx
    sk.white(st)
    sk.stroke(st, 1.2)
    lr = "M%.1f,-52 L%.1f,-36 L%.1f,-38 Z" % (sx, sx + 58, sx)
    sk.white(lr)
    sk.hatch(lr, (sx, -52, sx + 58, -36), angle=80, spacing=2.4, w=0.6, op=0.7)
    sk.stroke(lr, 1.1)
    sk.stroke("M%.1f,0 v-24 h20 v24" % (sx + 16), 1.0)
    sk.stroke("M%.1f,0 l20,-24 M%.1f,-24 l20,24" % (sx + 16, sx + 16), 0.6, 0.7)
    # barrels by the door and a lantern
    barrel_side(sk, -30, -9, 18)
    barrel_side(sk, 30, -9, 18)
    crate_side(sk, sx + 62, 0, 16)
    sk.circle(x0 + 20, -34, 3, 1.0, fill="#fff")
    sk.washellipse(x0 + 20, -34, 10, 10, (215, 170, 70), 0.5)
    # ground line with grass
    sk.stroke("M%.1f,1 h%.1f" % (x0 - 40, w + 120), 1.0, 0.8)
    for i in range(10):
        gx = x0 - 36 + i * 24 + r.uniform(-4, 4)
        sk.stroke("M%.1f,2 l-2,-5 M%.1f,2 l0,-6 M%.1f,2 l2,-5" % (gx, gx + 2, gx + 4), 0.6, 0.6)


def cellars(sk, s_dir=1):
    """Cellar plan under the inn (~140 x 330): three vaults, a trapdoor, stairs and a
    hidden tunnel mouth at the bottom. Returns the tunnel mouth in local coordinates."""
    p = K.Plan(sk, wall=3.0, depth=20, grid=10, grid_op=0.3)
    p.rect(-60, 0, 60, 110)        # wine cellar
    p.rect(-60, 128, 20, 220)      # store room
    p.rect(30, 128, 62, 220)       # strong room
    p.rect(-18, 110, 18, 128)      # passage
    p.rect(20, 160, 30, 178)
    p.rect(-40, 220, -22, 262)     # the hidden way down
    p.circle(-31, 282, 22)
    p.render(wash=TEAL, wash_op=0.2)
    # barrels (top view) in racks
    for row in range(3):
        for col in range(5):
            barrel_top(sk, -46 + col * 16, 18 + row * 16, 6)
    for i in range(4):
        barrel_top(sk, 48, 60 + i * 13, 5.5)
    # stairs down from the tavern
    sk.white("M-12,70 h24 v36 h-24 Z")
    sk.stroke("M-12,70 h24 v36 h-24 Z", 1.0)
    for i in range(1, 6):
        sk.line((-12, 70 + i * 6), (12, 70 + i * 6), 0.7)
    # crates in the store room
    for (cx, cy) in ((-48, 142), (-34, 142), (-48, 156), (-20, 150), (-44, 204), (-30, 204), (5, 204)):
        crate(sk, cx, cy, 11)
    # trapdoor with a ring
    td = "M-24,168 h22 v22 h-22 Z"
    sk.hatch(td, (-24, 168, -2, 190), angle=45, spacing=2.4, w=0.6, op=0.85)
    sk.stroke(td, 1.0)
    sk.circle(-13, 179, 3, 0.8, fill="#fff")
    # strong room: a chest and coins
    sk.stroke("M36,140 h20 v12 h-20 Z M36,145 h20", 0.9)
    for (cx, cy) in ((40, 170), (46, 176), (52, 168), (44, 190)):
        sk.circle(cx, cy, 2.2, 0.7)
    # secret door (dashed wall) and the round well-shaft
    sk.stroke("M-40,221 h18", 3.0, 1.0, col="#fff")
    sk.stroke("M-40,221 h18", 1.0, 0.9, dash="3 3")
    sk.circle(-31, 282, 9, 1.0)
    sk.hatch("M-40,282 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0 Z", (-40, 273, -22, 291), angle=30, spacing=2.0, w=0.6,
             op=0.9, cross=True)
    for (n, x, y) in ((1, 40, 18), (2, -10, 205), (3, 46, 210)):
        sk.text(x, y + 4, str(n), 10, 0.85, italic=False)
    return (-31, 304)


def tunnels(sk, P, wide):
    """Smuggling tunnels as one plan: a list of (points, width) plus caches (rooms)."""
    p = K.Plan(sk, wall=2.6, depth=16, grid=10, grid_op=0.22)
    for pts, w in P["tunnels"]:
        p.tunnel(pts, w)
    for (x0, y0, x1, y1) in P["rooms"]:
        p.rect(x0, y0, x1, y1)
    for (cx, cy, rr) in P.get("caves", []):
        p.circle(cx, cy, rr)
    p.render(wash=NIGHT, wash_op=0.22)
    for (x0, y0, x1, y1) in P["rooms"]:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        for i in range(3):
            crate(sk, x0 + 9 + i * 12, y0 + 9, 9)
        barrel_top(sk, x1 - 9, y1 - 9, 5)
        barrel_top(sk, x1 - 21, y1 - 9, 5)
    for (cx, cy, rr) in P.get("caves", []):
        for i in range(6):
            a = i * 1.05 + 0.3
            sk.circle(cx + math.cos(a) * rr * 0.6, cy + math.sin(a) * rr * 0.6, 2.2, 0.7)


def jetty(sk, x, y, L, ang, planks=True):
    """Wooden jetty from (x, y) going along ang (degrees), width 18."""
    K.group(sk, x, y, ang)
    d = "M0,-9 h%.1f v18 h-%.1f Z" % (L, L)
    sk.white(d)
    sk.stroke(d, 1.2)
    if planks:
        for i in range(1, int(L / 5)):
            sk.line((i * 5, -9), (i * 5, 9), 0.5, 0.7)
    for i in range(0, int(L) + 1, 24):
        for s in (-1, 1):
            sk.circle(i, s * 11, 2.6, 0.9, fill="#fff")
    # T head
    d = "M%.1f,-26 h18 v52 h-18 Z" % (L - 2)
    sk.white(d)
    sk.stroke(d, 1.2)
    for i in range(1, 10):
        sk.line((L - 2, -26 + i * 5.2), (L + 16, -26 + i * 5.2), 0.5, 0.7)
    for yy in (-28, 28):
        sk.circle(L + 7, yy, 2.8, 0.9, fill="#fff")
    K.ungroup(sk)


def treasure_map(sk, w=230, h=160):
    """A smaller pinned map, local (0,0) at its centre."""
    x0, y0 = -w / 2, -h / 2
    fold = 22
    sheet = "M%.1f,%.1f h%.1f v%.1f l-%.1f,%.1f h-%.1f Z" % (x0, y0, w, h - fold, fold, fold, w - fold)
    sk.white(sheet)
    sk.washblob(sheet, (200, 170, 110), 0.25)
    sk.stroke(sheet, 1.3)
    curl = "M%.1f,%.1f l-%.1f,%.1f q2,-%.1f %.1f,-%.1f Z" % (x0 + w, y0 + h - fold, fold, fold, fold * 0.8, fold,
                                                         fold * 0.2)
    sk.white(curl)
    sk.hatch(curl, (x0 + w - fold, y0 + h - fold, x0 + w, y0 + h), angle=45, spacing=2.2, w=0.55, op=0.7)
    sk.stroke(curl, 1.0)
    # the island
    r = sk.rng
    isl = []
    for i in range(16):
        a = 2 * math.pi * i / 16
        rr = 1 + 0.2 * math.sin(3 * a + 1) + r.uniform(-0.08, 0.08)
        isl.append((10 + math.cos(a) * 70 * rr, 4 + math.sin(a) * 42 * rr))
    d = K.smooth_path(isl, closed=True)
    sk.stroke(d, 1.2)
    sk.stroke(K.smooth_path([(q[0] * 1.12 - 1.2, q[1] * 1.14) for q in isl], closed=True), 0.6, 0.5, dash="2 3")
    K.hill(sk, -18, -6, 34, 12)
    K.hill(sk, 12, -14, 28, 10)
    for (px, py) in ((40, 14), (50, 4), (-40, 20)):
        sk.stroke("M%.1f,%.1f q2,-8 0,-14 M%.1f,%.1f q-6,-2 -9,2 M%.1f,%.1f q6,-2 9,2 M%.1f,%.1f q-1,-5 -5,-6 "
                  "M%.1f,%.1f q1,-5 5,-6" % (px, py, px, py - 14, px, py - 14, px, py - 14, px, py - 14), 0.8)
    # dashed route from a boat to the X, and a skull
    sk.stroke(K.smooth_path([(-100, 55), (-70, 30), (-40, 36), (-10, 16), (22, 26), (44, 30)]), 1.1, 0.9, dash="5 4")
    sk.stroke("M-110,58 q10,6 20,0 l-3,-4 h-14 Z M-100,54 v-12 l8,9", 0.8)
    x_mark(sk, 50, 30, 16)
    K.skull(sk, 84, -40, 11)
    sk.stroke("M%.1f,%.1f h14 M%.1f,%.1f v14" % (x0 + 14, y0 + 22, x0 + 21, y0 + 15), 0.8)
    sk.text(x0 + 21, y0 + 12, "N", 8, 0.9, italic=False)
    K.scribble(sk, x0 + 40, y0 + 18, 110, 7, 1.0, 0.85)
    # pin and a wax seal
    sk.circle(0, y0 + 2, 3.5, 1.0, fill="#fff")
    sk.dot(0, y0 + 2, 1.2)
    sk.washellipse(x0 + 26, y0 + h - 22, 14, 13, (150, 30, 25), 0.6)
    sk.circle(x0 + 26, y0 + h - 22, 11, 0.9)
    sk.stroke("M%.1f,%.1f l6,-6 l6,6 l-6,6 Z" % (x0 + 20, y0 + h - 22), 0.8)


def dagger_rose(sk, cx, cy, R):
    """Compass rose made of crossed daggers."""
    sk.circle(cx, cy, R, 1.4)
    sk.circle(cx, cy, R * 0.9, 0.8)
    for i in range(48):
        a = 2 * math.pi * i / 48
        l = 0.06 if i % 3 else 0.12
        sk.line((cx + math.cos(a) * R * 0.9, cy + math.sin(a) * R * 0.9),
                (cx + math.cos(a) * R * (0.9 - l), cy + math.sin(a) * R * (0.9 - l)), 0.7, 0.8)
    for i in range(16):
        a = 2 * math.pi * i / 16
        sk.line((cx + math.cos(a) * R, cy + math.sin(a) * R), (cx + math.cos(a) * R * 1.8, cy + math.sin(a) * R * 1.8),
                0.5, 0.35)
    sk.washellipse(cx, cy, R * 0.85, R * 0.85, TEAL, 0.18)
    # two daggers crossed in an X and a long one pointing north through the centre
    for a in (45, 135):
        rad = math.radians(a)
        L = R * 1.75
        K.dagger(sk, cx - math.cos(rad) * L * 0.5, cy - math.sin(rad) * L * 0.5, a, L, wf=1.3)
    L = R * 2.25
    K.dagger(sk, cx, cy + R * 0.98, -90, L, wf=1.35)
    sk.circle(cx, cy, R * 0.1, 1.0, fill="#fff")
    sk.dot(cx, cy, R * 0.04)
    sk.text(cx, cy - R * 1.36, "N", R * 0.2, 0.95, italic=False)


def river_bank(sk, pts, width):
    K.river(sk, pts, width, wash=TEAL, wash_op=0.26)


def night_wash(sk, spots):
    for (x, y, rx, ry, op) in spots:
        sk.washellipse(x, y, rx, ry, NIGHT, op)


# ---------------------------------------------------------------------------
# layouts
# ---------------------------------------------------------------------------
def build(sk, wide):
    W, H = sk.W, sk.H
    r = sk.rng
    K.neatline(sk, 44)
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        # river along the right margin, jetty, boats and cargo
        riv = K.meander(r, [(1080, 640), (1000, 760), (960, 960), (975, 1180), (945, 1400), (990, 1600),
                            (1080, 1700)], 10)
        river_bank(sk, riv, lambda t: 58 + 10 * math.sin(t * 5))
        for (x, y) in ((925, 900), (905, 1120), (918, 1350), (935, 1560), (1020, 1690)):
            reeds(sk, x, y)
        jetty(sk, 880, 1250, 70, 0)
        rowboat(sk, 1000, 1180, 80, 58)
        rowboat(sk, 1008, 1330, 100, 52, oars=False)
        barge(sk, 985, 1520, 95, 120)
        rowboat(sk, 995, 900, 70, 50, oars=False)
        sk.stroke(K.smooth_path([(960, 1222), (975, 1210), (988, 1206)]), 0.8, 0.8)
        cargo_pile(sk, 915, 1225, 0.9)
        cargo_pile(sk, 900, 1470, 0.75)
        night_wash(sk, [(990, 1100, 110, 380, 0.14)])
        # the inn and its cellars (top left), tunnels down the left margin
        K.group(sk, 190, 250, 0, 0.95)
        inn(sk)
        K.ungroup(sk)
        reveals.append((190, 190, 190, 110))
        sk.stroke("M110,262 v44 M270,262 v44", 0.8, 0.6, dash="4 4")
        K.group(sk, 125, 330, 0, 0.92)
        mouth = cellars(sk)
        K.ungroup(sk)
        mx, my = 125 + mouth[0] * 0.92, 330 + mouth[1] * 0.92
        T = dict(
            tunnels=[(K.meander(r, [(mx, my - 10), (80, 760), (130, 900), (95, 1060), (150, 1210), (110, 1380),
                                    (160, 1520)], 8), 22),
                     (K.meander(r, [(130, 900), (175, 950)], 3), 18),
                     (K.meander(r, [(150, 1210), (190, 1250)], 3), 18)],
            rooms=[(62, 1010, 130, 1060), (120, 1410, 186, 1470)],
            caves=[(110, 760, 30)])
        tunnels(sk, T, wide)
        # dotted secret routes fading towards the centre and over to the jetty
        secret_route(sk, [(190, 950), (320, 1010), (430, 980)], 0.7)
        secret_route(sk, [(190, 1250), (360, 1300), (520, 1260), (700, 1320), (870, 1250)], 0.75)
        secret_route(sk, [(170, 1520), (330, 1600), (560, 1640), (760, 1560), (890, 1480)], 0.8)
        secret_route(sk, [(300, 280), (430, 420), (470, 560)], 0.6)
        # treasure map pinned in the top right corner
        K.group(sk, 865, 195, -7, 0.95)
        treasure_map(sk)
        K.ungroup(sk)
        reveals.append((865, 195, 150, 110))
        # a big dagger down the right margin
        K.dagger(sk, 960, 355, 90, 250)
        note(sk, 900, 640, 110, 3)
        note(sk, 60, 1580, 110, 2)
        x_mark(sk, 700, 1320, 12)
        # compass of daggers bottom left, cartouche and scale bar
        dagger_rose(sk, 205, 1735, 72)
        reveals.append((205, 1720, 170, 170))
        K.cartouche(sk, 565, 1815, 300, 70, lines=1)
        reveals.append((565, 1815, 220, 70))
        K.scale_bar(sk, 760, 1820, 190)
        reveals.append((855, 1820, 130, 45))
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        # inn and cellars on the left, tunnel network running down and right
        K.group(sk, 230, 245, 0, 1.2)
        inn(sk)
        K.ungroup(sk)
        K.group(sk, 110, 300, 0, 1.0)
        mouth = cellars(sk)
        K.ungroup(sk)
        mx, my = 110 + mouth[0], 300 + mouth[1]
        T = dict(
            tunnels=[(K.meander(r, [(mx, my - 10), (90, 720), (230, 800), (360, 760), (470, 860), (560, 960)], 9), 24),
                     (K.meander(r, [(230, 800), (250, 930), (160, 990)], 5), 20),
                     (K.meander(r, [(360, 760), (420, 640), (520, 590)], 5), 20)],
            rooms=[(470, 540, 560, 600), (100, 960, 170, 1020)],
            caves=[(90, 720, 34), (470, 860, 30)])
        tunnels(sk, T, wide)
        secret_route(sk, [(560, 960), (700, 1000), (900, 990)], 0.7)
        secret_route(sk, [(560, 580), (660, 520), (720, 440)], 0.6)
        secret_route(sk, [(330, 460), (450, 470), (540, 400)], 0.7, arrow=False)
        dagger_rose(sk, 480, 190, 78)
        K.cartouche(sk, 360, 1010, 300, 58, lines=1)
        # river along the right, jetty, boats, cargo
        riv = K.meander(r, [(1920, 250), (1830, 380), (1790, 560), (1810, 760), (1760, 940), (1720, 1080)], 10)
        river_bank(sk, riv, lambda t: 64 + 10 * math.sin(t * 5))
        for (x, y) in ((1745, 520), (1740, 700), (1700, 900), (1660, 1030)):
            reeds(sk, x, y)
        jetty(sk, 1690, 780, 80, 0)
        rowboat(sk, 1835, 690, 75, 60)
        rowboat(sk, 1830, 870, 105, 54, oars=False)
        barge(sk, 1770, 1000, 105, 130)
        rowboat(sk, 1850, 470, 60, 54, oars=False)
        boathouse(sk, 1690, 640, 1.0)
        sk.stroke(K.smooth_path([(1780, 752), (1800, 735), (1815, 728)]), 0.8, 0.8)
        cargo_pile(sk, 1560, 770, 1.0)
        cargo_pile(sk, 1520, 930, 0.85)
        for (cx, cy) in ((1660, 850), (1674, 850), (1667, 836)):
            crate(sk, cx, cy, 12)
        night_wash(sk, [(1810, 700, 140, 360, 0.14)])
        K.group(sk, 1500, 220, -6, 1.1)
        treasure_map(sk)
        K.ungroup(sk)
        K.dagger(sk, 1400, 470, -8, 300)
        secret_route(sk, [(1330, 880), (1180, 950), (1000, 930)], 0.7)
        secret_route(sk, [(1340, 320), (1250, 200), (1150, 160)], 0.6)
        x_mark(sk, 1180, 950, 12)
        note(sk, 1380, 580, 140, 3)
        K.scale_bar(sk, 1400, 1010, 180)
    return box, reveals


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-contrabandistas", build,
          dict(base=(220, 202, 166), stains=10, edge=125, edge_dark=0.6, burn=0.15, crumple=1.0),
          out, work, seed=53, grade_kw=dict(vignette=0.4))
