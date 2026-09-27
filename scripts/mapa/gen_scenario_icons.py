"""Generates the per-scenario ink map icons: `<tipo>-<scenario>.svg` for combat,
elite, event, rest, chest and tavern in each of the six scenarios.

Usage: python3 scripts/mapa/gen_scenario_icons.py src/arte/mapa/iconos
It reuses the pen helpers (and a few drawings) of gen_icons.py.
"""
import math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_icons as g  # noqa: E402  (reads the output folder from argv[1] too)
from gen_icons import Svg, INK, INK2, RED, along, lerp, sword, horn, flame  # noqa: E402,F401


# ── small geometry helpers ───────────────────────────────────────────────────
def ell(cx, cy, rx, ry, k=10, a0=0.0):
    return [(cx + rx * math.cos(a0 + i * 2 * math.pi / k), cy + ry * math.sin(a0 + i * 2 * math.pi / k)) for i in range(k)]


def arc(cx, cy, rx, ry, a0, a1, k=6):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / k), cy + ry * math.sin(a0 + (a1 - a0) * i / k)) for i in range(k + 1)]


def box(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def outline(s, pts, w=1.6):
    """Closed shape drawn as one open pen stroke (crisp corners)."""
    s.stroke(pts + [pts[0]], w, taper=False)


def coin(s, x, y, r=3.4, wash=True):
    if wash:
        s.wash(ell(x, y, r, r * 0.55, 8), '#b8860b', 0.35)
    s.ring(x, y, r, r * 0.55, w=0.9)


def tentacle(s, base, dx, length, amp, w=1.6, phase=0.0):
    pts = []
    for i in range(6):
        t = i / 5
        pts.append((base[0] + dx * t + amp * math.sin(phase + t * 5) * t, base[1] + length * t))
    s.stroke(pts, w)


# ── Ogre Settlement ──────────────────────────────────────────────────────────
def elite_ogro():
    s = Svg('elite-ogro', seed=301)
    # horns sprouting from the sides of the helm
    horn(s, (14, 30), (16, 24), [[(7, 24), (4, 14)], [(10, 20), (8, 12)]], (8, 4), 1.5)
    horn(s, (50, 30), (48, 24), [[(57, 24), (60, 14)], [(54, 20), (56, 12)]], (56, 4), 1.5)
    dome = [(12, 40), (13, 28), (19, 18), (32, 13), (45, 18), (51, 28), (52, 40)]
    s.wash(dome + [(52, 58), (12, 58)], '#5a5a50', 0.16)
    s.hatch([(38, 14), (45, 18), (51, 28), (52, 40), (42, 40), (44, 26)], angle=40, gap=1.4, w=0.45)
    s.stroke(dome, 2.0, taper=False)
    # riveted brow band
    s.stroke([(11, 40), (32, 42), (53, 40)], 2.0, taper=False)
    s.stroke([(12, 45), (32, 47), (52, 45)], 1.4, taper=False)
    for x in (16, 24, 40, 48):
        s.dot(x, 43 + (0.8 if 20 < x < 44 else 0), 0.9)
    # cheek guards and nasal bar
    s.stroke([(12, 45), (13, 55), (20, 60), (24, 52), (24, 47)], 1.7, taper=False)
    s.stroke([(52, 45), (51, 55), (44, 60), (40, 52), (40, 47)], 1.7, taper=False)
    s.hatch([(12, 45), (24, 47), (24, 52), (20, 60), (13, 55)], angle=-50, gap=1.3, w=0.4)
    s.hatch([(52, 45), (40, 47), (40, 52), (44, 60), (51, 55)], angle=50, gap=1.3, w=0.4)
    s.stroke([(29, 42), (29, 58), (32, 61), (35, 58), (35, 42)], 1.6, taper=False)
    # dark eye holes glaring either side of the nasal
    s.blot([(24, 48), (28, 48), (28, 53), (25, 52)], INK)
    s.blot([(40, 48), (36, 48), (36, 53), (39, 52)], INK)
    # dents and a notch on the dome
    s.stroke([(24, 20), (27, 24), (25, 27)], 0.8)
    s.line((38, 30), (42, 33), 0.7)
    s.save()


def cofre_ogro():
    s = Svg('cofre-ogro', seed=321)
    sack = [(14, 58), (10, 48), (12, 38), (19, 30), (26, 26), (38, 26), (45, 30), (52, 38), (54, 48), (50, 58)]
    s.wash(sack, '#8a6a3a', 0.2)
    s.hatch([(40, 27), (45, 30), (52, 38), (54, 48), (50, 58), (40, 58), (46, 44)], angle=35, gap=1.4, w=0.45)
    s.stroke(sack, 1.9, closed=True)
    # gathered neck and tie
    s.stroke([(26, 26), (24, 20), (22, 14), (27, 16), (32, 12), (37, 16), (42, 14), (40, 20), (38, 26)], 1.6)
    s.stroke([(24, 23), (32, 25), (40, 23)], 2.2, taper=False)
    s.stroke([(32, 25), (27, 31), (25, 36)], 1.0)
    s.stroke([(32, 25), (36, 32), (35, 36)], 1.0)
    # patch with stitches
    s.stroke(box(18, 40, 27, 49), 1.0, closed=True)
    for i in range(4):
        s.line((18 + i * 2.6, 39), (19 + i * 2.6, 41), 0.5)
    # folds
    s.stroke([(30, 34), (29, 44), (31, 52)], 0.8)
    s.stroke([(40, 36), (42, 46)], 0.7)
    # coins spilling out at the foot
    for x, y in [(8, 60), (15, 61.5), (56, 60), (48, 62)]:
        coin(s, x, y, 3.2)
    coin(s, 58, 54, 2.6)
    s.save()


# ── Smugglers' Den ───────────────────────────────────────────────────────────
def combate_contrabandistas():
    s = Svg('combate-contrabandistas', seed=331)
    # a long dagger pointing up-right
    base, tip = (12, 54), (56, 8)
    g = lerp(base, tip, 0.3)
    s.stroke([along(g, tip, 0, 3), along(g, tip, 0.6, 2.6), tip], 1.4, taper=False)
    s.stroke([along(g, tip, 0, -3), along(g, tip, 0.6, -2.6), tip], 1.4, taper=False)
    s.hatch([along(g, tip, 0, 0), tip, along(g, tip, 0.6, -2.6), along(g, tip, 0, -3)], angle=30, gap=1.1, w=0.4)
    s.line(along(g, tip, 0.05, 0), along(g, tip, 0.8, 0), 0.6)
    s.stroke([along(g, base, 0, 7), along(g, base, 0.06, 4), along(g, base, 0, 0), along(g, base, 0.06, -4), along(g, base, 0, -7)], 2.0)
    s.stroke([g, lerp(g, base, 0.8)], 3.0, taper=False)
    pb = lerp(g, base, 0.95)
    s.ring(pb[0], pb[1], 2.2, w=1.0)
    # red bandana knotted round the grip, its two tails flying
    knot = along(g, base, 0.35, 0)
    kx, ky = knot
    s.wash([(kx - 4, ky - 4), (kx + 4, ky - 4), (kx + 4, ky + 4), (kx - 4, ky + 4)], RED, 0.35)
    s.stroke([(kx - 4, ky - 3), (kx + 3, ky - 4), (kx + 4, ky + 3), (kx - 3, ky + 4)], 1.3, closed=True)
    tail1 = [(kx + 2, ky + 3), (kx + 8, ky + 8), (kx + 16, ky + 8), (kx + 22, ky + 12), (kx + 16, ky + 12), (kx + 8, ky + 11), (kx + 1, ky + 5)]
    tail2 = [(kx - 2, ky + 3), (kx - 3, ky + 10), (kx + 1, ky + 16), (kx - 4, ky + 14), (kx - 6, ky + 8), (kx - 4, ky + 3)]
    for t in (tail1, tail2):
        s.wash(t, RED, 0.3)
        s.stroke(t, 1.2, closed=True)
    s.hatch(tail1, angle=-20, gap=1.5, w=0.4)
    for x, y in [(kx + 9, ky + 9.5), (kx + 15, ky + 10)]:
        s.dot(x, y, 0.7)
    s.save()


def elite_contrabandistas():
    s = Svg('elite-contrabandistas', seed=341)
    # tricorn hat of the bandit captain
    hat = [(4, 26), (14, 20), (22, 10), (32, 7), (42, 10), (50, 20), (60, 26), (46, 30), (32, 27), (18, 30)]
    s.wash(hat, '#2a2a30', 0.3)
    s.hatch(hat, angle=60, gap=1.3, w=0.45)
    s.stroke(hat, 1.9, closed=True)
    s.stroke([(16, 24), (32, 21), (48, 24)], 1.1)
    # feather
    s.stroke([(40, 13), (48, 5), (56, 2), (52, 8), (44, 14)], 1.1, closed=True)
    s.line((42, 14), (54, 4), 0.6)
    # face and eye patch
    face = [(18, 30), (32, 28), (46, 30), (46, 42), (42, 52), (32, 58), (22, 52), (18, 42)]
    s.stroke(face, 1.7, closed=True)
    s.stroke([(16, 33), (32, 36), (48, 32)], 0.9)
    s.blot([(34, 33), (42, 32), (42, 38), (35, 38)], INK)
    s.stroke([(23, 35), (26, 34), (29, 35), (26, 37)], 1.0, closed=True)
    s.dot(26, 35.5, 0.9)
    s.stroke([(21, 32), (26, 31), (29, 33)], 1.2)
    # scar across the cheek
    s.stroke([(22, 40), (28, 46)], 1.0)
    for t in (0.3, 0.7):
        p = lerp((22, 40), (28, 46), t)
        s.line((p[0] - 1.5, p[1] + 1.5), (p[0] + 1.5, p[1] - 1.5), 0.6)
    # moustache and smirk
    s.stroke([(24, 46), (29, 44), (32, 46), (35, 44), (41, 46)], 1.8)
    s.stroke([(28, 50), (32, 51), (37, 49)], 0.9)
    # stubble shading on the jaw
    s.hatch([(22, 48), (42, 48), (42, 52), (32, 58), (22, 52)], angle=0, gap=1.2, w=0.35)
    # golden earring
    s.ring(18, 45, 2.2, w=0.9, color='#8a6a2a')
    s.save()


def cofre_contrabandistas():
    s = Svg('cofre-contrabandistas', seed=371)
    # barrel of contraband, lying slightly tilted, cork and stencilled mark
    body = [(16, 10), (48, 10), (53, 22), (54, 36), (52, 50), (48, 58), (16, 58), (12, 50), (10, 36), (11, 22)]
    s.wash(body, '#7a5230', 0.18)
    s.hatch([(40, 10), (48, 10), (53, 22), (54, 36), (52, 50), (48, 58), (42, 58), (46, 36)], angle=80, gap=1.2, w=0.45)
    s.stroke(body, 1.9, closed=True)
    # staves
    for x0, x1 in [(22, 20), (29, 28.5), (36, 36.5), (42, 44)]:
        s.stroke([(x0, 10.5), (x1, 34), (x0, 57.5)], 0.6)
    # iron hoops
    for y, dx in [(17, 2), (51, 2)]:
        s.stroke([(12 + dx * 0.2, y), (32, y + 1.4), (52 - dx * 0.2, y)], 2.0, taper=False)
        s.stroke([(12, y + 3), (32, y + 4.4), (52, y + 3)], 1.0, taper=False)
    s.line((10.5, 34), (53.5, 34), 1.2)
    # bung and cork
    s.ring(32, 26, 2.4, w=1.0)
    s.dot(32, 26, 1.0)
    # stencilled crossed-keys mark on the belly
    s.stroke([(25, 38), (39, 48)], 1.3)
    s.stroke([(39, 38), (25, 48)], 1.3)
    s.ring(25, 38, 1.7, w=0.8)
    s.ring(39, 38, 1.7, w=0.8)
    # hidden bottle peeping out of a broken stave
    s.stroke([(46, 4), (46, 8), (44, 10), (44, 18), (50, 18), (50, 10), (48, 8), (48, 4)], 1.1)
    s.hatch([(44, 10), (50, 10), (50, 18), (44, 18)], angle=90, gap=1.0, w=0.35)
    s.save()


def taberna_contrabandistas():
    s = Svg('taberna-contrabandistas', seed=381)
    # wall bracket with a hanging inn signboard
    s.stroke([(4, 4), (4, 30)], 2.2, taper=False)
    s.stroke([(4, 8), (56, 8)], 2.4, taper=False)
    s.stroke([(4, 22), (14, 14), (24, 9)], 1.4)
    s.stroke([(10, 10), (12, 12), (10, 14), (8, 12)], 0.8, closed=True)
    for x in (16, 50):
        s.line((x, 8), (x, 20), 0.7)
        for y in (11, 15):
            s.ring(x, y, 0.9, 1.6, w=0.5)
    board = [(10, 20), (56, 20), (58, 50), (32, 56), (8, 50)]
    s.wash(board, '#6b4420', 0.18)
    s.hatch([(10, 20), (56, 20), (58, 50), (32, 56), (8, 50)], angle=5, gap=2.4, w=0.35)
    s.stroke(board, 1.9, closed=True)
    s.stroke([(13, 24), (53, 24), (54, 47), (32, 52), (12, 47)], 0.8, closed=True)
    # painted emblem: a crescent moon over a bottle
    s.stroke([(24, 29), (20, 32), (19, 37), (22, 41), (26, 42), (23, 38), (22, 34), (24, 29)], 1.2, closed=True)
    s.blot([(24, 29), (20, 32), (19, 37), (22, 41), (26, 42), (22.5, 37), (22.2, 33)], INK, 0.7)
    bottle = [(38, 27), (42, 27), (42, 32), (46, 36), (46, 48), (34, 48), (34, 36), (38, 32)]
    s.wash(bottle, '#3a5a2a', 0.3)
    s.stroke(bottle, 1.3, closed=True)
    s.stroke(box(37, 25, 43, 27), 0.9, closed=True)
    s.line((35, 40), (45, 40), 0.7)
    s.save()


# ── The Crypt ────────────────────────────────────────────────────────────────
def elite_cripta():
    s = Svg('elite-cripta', seed=391)
    # carved lid of a sarcophagus, the entombed lord lying in stone
    lid = [(22, 3), (42, 3), (50, 18), (46, 61), (18, 61), (14, 18)]
    s.wash(lid, '#8a7c5e', 0.16)
    s.hatch([(42, 3), (50, 18), (46, 61), (38, 61), (42, 18), (38, 4)], angle=60, gap=1.3, w=0.45)
    s.stroke(lid, 2.0, closed=True)
    s.stroke([(24, 6), (40, 6), (46, 18), (43, 58), (21, 58), (18, 18)], 0.7, closed=True)
    # face with closed eyes and a beard
    face = [(26, 10), (32, 7), (38, 10), (38, 18), (32, 23), (26, 18)]
    s.stroke(face, 1.4, closed=True)
    s.stroke([(28, 14), (30.5, 15)], 0.9)
    s.stroke([(36, 14), (33.5, 15)], 0.9)
    s.stroke([(27, 19), (32, 28), (37, 19)], 1.0)
    for x in (30, 32, 34):
        s.line((x, 21), (x + (x - 32) * 0.3, 25.5), 0.5)
    # crossed arms holding a sword
    s.stroke([(18, 30), (26, 34), (38, 40), (44, 38)], 1.6)
    s.stroke([(46, 30), (38, 34), (26, 40), (20, 38)], 1.6)
    s.stroke([(32, 26), (32, 56)], 1.6, taper=False)
    s.stroke([(27, 44), (37, 44)], 1.4)
    s.stroke([(30, 56), (32, 60), (34, 56)], 0.9, taper=False)
    # cracked, chipped corner and a trickle of dust
    s.stroke([(46, 46), (42, 50), (45, 53), (41, 57)], 0.9, taper=False)
    s.blot([(46, 58), (48, 57), (47, 61)], INK)
    for x, y in [(52, 60), (54, 57), (51, 55)]:
        s.dot(x, y, 0.5)
    s.save()


def cofre_cripta():
    s = Svg('cofre-cripta', seed=421)
    # funerary urn with a domed lid and two handles
    urn = [(24, 20), (40, 20), (42, 24), (50, 34), (50, 44), (44, 52), (40, 54), (42, 60), (22, 60), (24, 54), (20, 52), (14, 44), (14, 34), (22, 24)]
    s.wash(urn, '#6e6a4a', 0.18)
    s.hatch([(40, 22), (50, 34), (50, 44), (44, 52), (40, 54), (42, 60), (36, 60), (42, 42)], angle=40, gap=1.3, w=0.45)
    s.stroke(urn, 1.9, closed=True)
    # lid and knob
    s.stroke([(21, 20), (24, 14), (32, 12), (40, 14), (43, 20), (21, 20)], 1.6, closed=True)
    s.ring(32, 9, 2.4, w=1.1)
    s.hatch([(34, 12), (40, 14), (43, 20), (34, 20)], angle=-40, gap=1.2, w=0.4)
    # handles
    s.stroke([(16, 32), (8, 30), (6, 36), (10, 42), (15, 42)], 1.6)
    s.stroke([(48, 32), (56, 30), (58, 36), (54, 42), (49, 42)], 1.6)
    # decorative bands: wave and a skull medallion
    s.line((16, 30), (48, 30), 1.0)
    s.line((15, 47), (49, 47), 1.0)
    for i in range(5):
        x = 18 + i * 6.4
        s.stroke([(x, 49.5), (x + 1.6, 48.2), (x + 3.2, 49.5), (x + 4.8, 50.8)], 0.6)
    sk = [(27, 34), (32, 32), (37, 34), (37, 40), (34, 43), (30, 43), (27, 40)]
    s.stroke(sk, 1.1, closed=True)
    s.dot(30, 37.5, 1.2)
    s.dot(34, 37.5, 1.2)
    s.line((30.5, 41.5), (33.5, 41.5), 0.5)
    # base
    s.line((20, 60), (44, 60), 2.0)
    s.save()


def taberna_cripta():
    s = Svg('taberna-cripta', seed=431)
    # an old tankard forgotten in the dark, web and spider
    body = [(18, 22), (42, 22), (41, 56), (19, 56)]
    s.wash(body, '#7a7060', 0.16)
    s.hatch([(34, 22), (42, 22), (41, 56), (34, 56)], angle=75, gap=1.3, w=0.45)
    s.stroke([(18, 22), (18.5, 40), (19, 56)], 1.8)
    s.stroke([(42, 22), (41.5, 40), (41, 56)], 1.8)
    s.line((18, 56), (42, 56), 1.8)
    s.stroke([(16, 22), (30, 20), (44, 22)], 1.6)
    s.stroke([(16, 22), (30, 25), (44, 22)], 1.0)
    for y in (29, 50):
        s.line((18, y), (42, y), 1.1)
    # dents and a crack
    s.stroke([(24, 34), (26, 39), (24, 44)], 0.8)
    s.stroke([(38, 30), (36, 34), (38, 38)], 0.7)
    # handle
    s.stroke([(42, 27), (51, 27), (54, 34), (53, 43), (48, 47), (41, 47)], 1.9, taper=False)
    s.stroke([(41, 32), (47, 32), (49, 37), (47, 42), (41, 43)], 0.9, taper=False)
    # cobweb stretched from the rim to the handle
    hub = (52, 12)
    ends = [(44, 22), (54, 26), (62, 20), (62, 6), (48, 4), (40, 10)]
    for e in ends:
        s.line(hub, e, 0.45)
    for r in (0.35, 0.65, 0.95):
        ring = [lerp(hub, e, r) for e in ends]
        for a, b in zip(ring, ring[1:]):
            m = lerp(a, b, 0.5)
            s.stroke([a, lerp(m, hub, 0.12), b], 0.4, taper=False)
    s.line((52, 12), (52, 16), 0.4)
    s.dot(52, 17, 1.5)
    for dx in (-2.4, 2.4):
        s.line((52, 17), (52 + dx, 15.5), 0.4)
        s.line((52, 17), (52 + dx, 19), 0.4)
    # dust motes
    for x, y in [(12, 30), (10, 44), (26, 14)]:
        s.dot(x, y, 0.5)
    s.save()


# ── The Dark Temple ──────────────────────────────────────────────────────────
def combate_templo():
    s = Svg('combate-templo', seed=441)
    # a hooded cultist raising a curved ritual knife
    hood = [(10, 62), (13, 44), (18, 26), (26, 12), (32, 6), (38, 12), (46, 26), (51, 44), (54, 62)]
    s.wash(hood + [(32, 62)], '#3a1a2a', 0.22)
    s.stroke(hood, 2.0, taper=False)
    s.hatch([(10, 62), (13, 44), (18, 26), (24, 20), (20, 44), (22, 62)], angle=65, gap=1.4, w=0.45)
    s.hatch([(54, 62), (51, 44), (46, 26), (40, 20), (44, 44), (42, 62)], angle=-65, gap=1.4, w=0.45)
    face = [(22, 32), (26, 20), (32, 16), (38, 20), (42, 32), (38, 42), (32, 45), (26, 42)]
    s.blot(face, INK, 0.92)
    s.dot(27.5, 30, 1.5, '#c9642a')
    s.dot(36.5, 30, 1.5, '#c9642a')
    # robe opening and a rope belt with a sigil pendant
    s.stroke([(32, 45), (31, 62)], 1.1)
    s.stroke([(16, 52), (32, 55), (48, 52)], 1.4)
    s.stroke([(32, 55), (32, 58)], 0.7)
    s.stroke([(32, 58), (35, 61), (32, 64), (29, 61)], 0.9, closed=True)
    # hands on the hilt and the curved knife
    s.stroke([(24, 48), (29, 46), (35, 46), (40, 48)], 1.6)
    s.stroke([(40, 48), (44, 47)], 2.4, taper=False)
    s.stroke([(44, 44), (45, 50)], 1.3)
    blade = [(45, 45.5), (52, 40), (60, 38), (56, 44), (46, 49)]
    s.wash(blade, '#e8d8b0', 0.5)
    s.stroke(blade, 1.2, closed=True)
    s.hatch([(46, 47.5), (56, 44), (46, 49)], angle=20, gap=1.0, w=0.4)
    s.save()


def elite_templo():
    s = Svg('elite-templo', seed=451)
    # bat wings behind a lesser demon's head
    for sg in (-1, 1):
        cx = 32
        wing = [(cx + sg * 12, 30), (cx + sg * 22, 14), (cx + sg * 30, 10), (cx + sg * 29, 22), (cx + sg * 31, 34),
                (cx + sg * 25, 32), (cx + sg * 22, 40), (cx + sg * 18, 36)]
        s.stroke(wing, 1.2, closed=True, n=2)
        s.line((cx + sg * 22, 14), (cx + sg * 20, 34), 0.6)
        s.line((cx + sg * 29, 22), (cx + sg * 21, 34), 0.6)
        s.wash(wing, '#5a1a1a', 0.2)
    # curling horns
    horn(s, (22, 22), (26, 18), [[(16, 16), (14, 8)], [(20, 13), (18, 7)]], (22, 2), 1.3)
    horn(s, (42, 22), (38, 18), [[(48, 16), (50, 8)], [(44, 13), (46, 7)]], (42, 2), 1.3)
    head = [(20, 28), (22, 18), (32, 14), (42, 18), (44, 28), (42, 42), (36, 52), (32, 56), (28, 52), (22, 42)]
    s.wash(head, '#8b1e12', 0.2)
    s.hatch([(36, 15), (42, 18), (44, 28), (42, 42), (36, 52), (34, 44), (38, 28)], angle=35, gap=1.3, w=0.45)
    s.stroke(head, 1.8, closed=True)
    # pointed ears
    s.stroke([(21, 28), (13, 26), (21, 35)], 1.2)
    s.stroke([(43, 28), (51, 26), (43, 35)], 1.2)
    # slanted glowing eyes and heavy brow
    s.stroke([(22, 26), (28, 30), (31, 29)], 1.8)
    s.stroke([(42, 26), (36, 30), (33, 29)], 1.8)
    s.blot([(24, 31), (30, 32), (27, 34)], '#c9642a')
    s.blot([(40, 31), (34, 32), (37, 34)], '#c9642a')
    s.dot(27, 32.5, 0.7)
    s.dot(37, 32.5, 0.7)
    # wicked grin with fangs and a goatee
    s.stroke([(24, 40), (28, 44), (32, 45), (36, 44), (40, 40)], 1.3)
    s.stroke([(27, 42.6), (28, 46.5), (29, 43.6)], 0.8, taper=False)
    s.stroke([(35, 43.6), (36, 46.5), (37, 42.6)], 0.8, taper=False)
    s.stroke([(30, 50), (32, 58), (34, 50)], 1.1)
    s.save()


def cofre_templo():
    s = Svg('cofre-templo', seed=481)
    # jewelled chalice
    cup = [(14, 10), (50, 10), (48, 22), (42, 30), (36, 34), (28, 34), (22, 30), (16, 22)]
    s.wash(cup, '#b8860b', 0.22)
    s.hatch([(40, 10), (50, 10), (48, 22), (42, 30), (36, 34), (40, 22)], angle=60, gap=1.2, w=0.45)
    s.stroke(cup, 1.9, closed=True)
    s.stroke([(14, 10), (32, 13), (50, 10)], 1.0)
    s.stroke([(15, 16), (32, 19), (49, 16)], 0.8)
    for x, y in [(24, 24), (32, 26), (40, 24)]:
        s.stroke([(x, y - 2.4), (x + 2, y), (x, y + 2.4), (x - 2, y)], 0.9, closed=True)
        s.dot(x, y, 0.6)
    # stem with a knot
    s.stroke([(29, 34), (29.5, 44), (29, 50)], 1.6)
    s.stroke([(35, 34), (34.5, 44), (35, 50)], 1.6)
    s.stroke([(27, 40), (32, 38), (37, 40), (32, 43), (27, 40)], 1.3, closed=True)
    s.hatch([(32, 34), (35, 34), (35, 50), (32, 50)], angle=80, gap=1.0, w=0.4)
    # foot
    foot = [(29, 50), (35, 50), (46, 56), (48, 60), (16, 60), (18, 56)]
    s.wash(foot, '#b8860b', 0.2)
    s.stroke(foot, 1.7, closed=True)
    s.hatch([(35, 50), (46, 56), (48, 60), (38, 60)], angle=30, gap=1.1, w=0.4)
    # glints
    for x, y in [(10, 6), (54, 14), (8, 26)]:
        s.line((x - 2.2, y), (x + 2.2, y), 0.6)
        s.line((x, y - 2.2), (x, y + 2.2), 0.6)
    s.save()


# ── The Dragon's Lair ────────────────────────────────────────────────────────
def elite_dragon():
    s = Svg('elite-dragon', seed=501)
    # a young drake's head in profile, facing right, with a crest of spines
    for x, y, h in [(10, 28, 7), (7, 38, 7), (5, 48, 6)]:
        s.stroke([(x + 3, y + 1), (x - 4, y - h), (x + 5, y - 2)], 1.2, taper=False)
    head = [(12, 20), (24, 14), (36, 16), (46, 22), (58, 28), (60, 34), (50, 36), (36, 36), (28, 40), (34, 44), (46, 44),
            (52, 48), (40, 52), (26, 54), (14, 60), (8, 50), (8, 36)]
    s.wash(head, '#7a2a14', 0.16)
    s.stroke(head, 1.9, closed=True)
    s.hatch([(8, 36), (12, 22), (20, 30), (18, 50), (14, 60), (8, 50)], angle=60, gap=1.3, w=0.45, cross=True)
    # horns swept back
    horn(s, (22, 16), (28, 15), [[(16, 8)], [(24, 9)]], (10, 2), 1.3)
    horn(s, (32, 16), (36, 17), [[(30, 8)], [(35, 9)]], (27, 3), 1.1)
    # fanged jaw line
    for x in (38, 44, 50):
        s.stroke([(x, 36), (x + 1.5, 40), (x + 3, 36)], 0.8, taper=False)
    for x in (36, 42):
        s.stroke([(x, 44), (x + 1.5, 40.5), (x + 3, 44)], 0.8, taper=False)
    # eye, brow ridge, nostril
    s.stroke([(30, 25), (35, 22), (40, 25), (35, 27)], 1.2, closed=True)
    s.blot([(34.4, 22.6), (35.6, 22.6), (35.6, 26.6), (34.4, 26.6)], INK)
    s.stroke([(26, 22), (34, 19), (42, 22)], 2.0)
    s.stroke([(54, 29), (56, 28), (56.5, 30)], 1.0)
    # scales
    for x, y in [(18, 30), (22, 36), (16, 44), (22, 46), (28, 32)]:
        s.stroke([(x, y), (x + 2.5, y + 2.5), (x + 5, y)], 0.6)
    # smoke from the nostril
    s.stroke([(58, 26), (60, 20), (56, 16), (60, 10)], 0.8)
    s.save()


def cofre_dragon():
    s = Svg('cofre-dragon', seed=531)
    # a heaped hoard of gold coins with a crown and goblet on top
    mound = [(2, 60), (8, 48), (18, 38), (32, 34), (46, 38), (56, 48), (62, 60)]
    s.wash(mound + [(32, 62)], '#b8860b', 0.22)
    s.stroke(mound, 1.9)
    s.line((2, 60), (62, 60), 1.4)
    s.hatch([(40, 36), (46, 38), (56, 48), (62, 60), (44, 60), (46, 48)], angle=30, gap=1.3, w=0.4)
    for x, y, r in [(12, 54, 3.4), (20, 48, 3.2), (26, 55, 3.4), (34, 46, 3.2), (40, 54, 3.4), (48, 49, 3.2), (54, 55, 3.2),
                    (18, 58, 3), (46, 58, 3), (28, 42, 2.8)]:
        coin(s, x, y, r, wash=False)
    # crown perched on top
    crown = [(20, 36), (19, 24), (25, 30), (30, 20), (34, 30), (40, 22), (42, 36)]
    s.wash(crown + [(31, 38)], '#d9a040', 0.3)
    s.stroke(crown, 1.6, taper=False)
    s.stroke([(20, 36), (31, 38), (42, 36)], 1.6, taper=False)
    for x, y in [(19, 22.5), (30, 18.5), (40, 20.5)]:
        s.dot(x, y, 1.1)
    s.stroke([(29, 32), (31, 30), (33, 32), (31, 34)], 0.8, closed=True)
    # goblet tipped over on the side
    s.stroke([(46, 30), (58, 26), (60, 34), (50, 38)], 1.3, closed=True)
    s.stroke([(50, 36), (44, 40), (42, 38)], 1.1)
    # sparkles
    for x, y in [(8, 36), (56, 16), (14, 26)]:
        s.line((x - 2.2, y), (x + 2.2, y), 0.6)
        s.line((x, y - 2.2), (x, y + 2.2), 0.6)
    s.save()


# ── The Beholder's Labyrinth ─────────────────────────────────────────────────
def combate_contemplador():
    s = Svg('combate-contemplador', seed=551)
    # a floating eye trailing tentacles
    for i, (x, dx, amp) in enumerate([(18, -8, 3), (25, -3, 3.5), (32, 0, 4), (39, 3, 3.5), (46, 8, 3)]):
        tentacle(s, (x, 40), dx, 20 - abs(i - 2) * 2, amp, w=1.8 - abs(i - 2) * 0.2, phase=i * 1.3)
    eye = ell(32, 28, 20, 16, 12)
    s.wash(eye, '#e8d8b0', 0.3)
    s.hatch([(44, 16), (52, 28), (46, 40), (38, 44), (46, 28)], angle=40, gap=1.3, w=0.45)
    s.stroke(eye, 2.0, closed=True)
    # veins
    for p in [((14, 22), (20, 25), (22, 22)), ((48, 36), (44, 34), (43, 38)), ((16, 34), (21, 32))]:
        s.stroke(list(p), 0.5)
    s.ring(32, 28, 9, w=1.4)
    s.wash(ell(32, 28, 8.6, 8.6, 10), '#3a6a5a', 0.3)
    s.hatch(ell(32, 28, 8.6, 8.6, 10), angle=0, gap=1.2, w=0.4)
    s.blot([(30, 21), (34, 21), (35, 28), (34, 35), (30, 35), (29, 28)], INK)
    s.dot(34, 24, 1.1, '#f0e2bc')
    # eyelid lashes
    for a in (-2.4, -2.0, -1.57, -1.14, -0.74):
        s.line((32 + 20 * math.cos(a), 28 + 16 * math.sin(a)), (32 + 24 * math.cos(a), 28 + 20 * math.sin(a)), 1.0)
    s.save()


def elite_contemplador():
    s = Svg('elite-contemplador', seed=561)
    # a mind flayer's brain: two folded lobes with feelers dangling below
    for i, x in enumerate((18, 26, 38, 46)):
        tentacle(s, (x, 42), (-4, -2, 2, 4)[i], 18, 3, w=1.7, phase=i)
    brain = [(8, 32), (8, 22), (14, 12), (24, 8), (32, 10), (40, 8), (50, 12), (56, 22), (56, 32), (50, 42), (40, 46), (24, 46), (14, 42)]
    s.wash(brain, '#b86a7a', 0.2)
    s.stroke(brain, 2.0, closed=True)
    s.hatch([(44, 10), (50, 12), (56, 22), (56, 32), (50, 42), (42, 45), (48, 30)], angle=40, gap=1.3, w=0.45)
    # central fissure
    s.stroke([(32, 10), (31, 20), (33, 30), (32, 44)], 1.3)
    # gyri: squiggles on each lobe
    for sg in (-1, 1):
        for y0, x0 in [(16, 10), (26, 16), (36, 12)]:
            pts = [(32 + sg * (x0 + 6 * math.sin(k * 1.4)), y0 + k * 1.6 - 4 + 3 * math.cos(k * 1.1)) for k in range(6)]
            s.stroke(pts, 0.8)
    for x, y in [(16, 22), (48, 22), (24, 36), (40, 36)]:
        s.stroke([(x - 3, y), (x, y - 2), (x + 3, y), (x + 5, y - 2)], 0.7)
    # psionic ripples
    s.stroke(arc(32, 26, 30, 24, -2.6, -0.54, 6), 0.7)
    s.stroke(arc(32, 26, 34, 28, -2.4, -0.74, 6), 0.5)
    s.save()


def cofre_contemplador():
    s = Svg('cofre-contemplador', seed=591)
    # a chest turned to stone by a petrifying gaze: cracked, chipped, speckled
    body = [(10, 34), (54, 34), (53, 58), (11, 58)]
    lid = [(10, 34), (12, 24), (20, 18), (32, 16), (44, 18), (52, 24), (54, 34)]
    s.wash(body + [(11, 58)], '#7a7a74', 0.22)
    s.wash(lid + [(10, 34)], '#8a8a84', 0.2)
    s.hatch([(10, 34), (54, 34), (53, 58), (11, 58)], angle=45, gap=2.0, w=0.4, cross=True)
    s.stroke([(10, 34), (11, 46), (11, 58), (32, 58.5), (53, 58), (53.5, 46), (54, 34)], 2.0, taper=False)
    s.stroke(lid, 2.0, taper=False)
    s.line((9, 34), (55, 34), 1.8)
    # stone bands without rivets (they fused into rock)
    for x in (20, 44):
        s.line((x, 17.5), (x, 58), 1.0)
    s.stroke(box(28, 30, 36, 40), 1.4, closed=True)
    s.blot([(31, 34), (33, 34), (32.5, 38), (31.5, 38)], INK)
    # big cracks and a broken corner
    s.stroke([(38, 17), (35, 24), (39, 29), (36, 34), (40, 42), (37, 50)], 1.2, taper=False)
    s.stroke([(14, 38), (18, 44), (16, 50)], 0.9, taper=False)
    s.blot([(54, 34), (54, 42), (49, 38)], '#f0e2bc', 0.95)
    s.stroke([(54, 42), (49, 38), (54, 34)], 1.1, taper=False)
    # rubble chips and speckles
    for x, y, r in [(58, 58, 2), (60, 52, 1.4), (5, 60, 1.6)]:
        s.stroke(ell(x, y, r, r * 0.7, 5), 0.8, closed=True)
    for x, y in [(24, 22), (46, 26), (16, 28), (26, 50), (48, 50), (41, 22)]:
        s.dot(x, y, 0.6)
    s.save()


# ── shared families: rest = a fire, event = a question mark, tavern = a tankard ─
# The player must spot these three at a glance in every scenario, so each one
# keeps the same silhouette and only the material and surroundings change.
FLAME_OUT = [(-10, 0), (-14, -11), (-9, -21), (-6, -15), (-2, -33), (4, -21), (9, -28), (14, -13), (12, 0)]
FLAME_IN = [(-4, 0), (-5, -9), (0, -18), (2, -13), (4, -16), (7, -7), (5, 0)]


def fire(s, cx, by, sc=1.0, color='#c9642a', core='#e8b040', w=1.6):
    """The common campfire flame: three tongues and an inner core, base centred at (cx, by)."""
    out = [(cx + x * sc, by + y * sc) for x, y in FLAME_OUT]
    inn = [(cx + x * sc, by + y * sc) for x, y in FLAME_IN]
    s.wash(out, color, 0.34)
    s.wash(inn, core, 0.5)
    s.hatch([out[0], out[1], out[2], out[3], inn[1], inn[0]], angle=70, gap=1.3, w=0.4)
    s.stroke(out, w, closed=True)
    s.stroke(inn, 1.0, closed=True)
    return out


def sparks(s, pts, color=INK, r=0.8):
    for x, y in pts:
        s.dot(x, y, r, color)


# centre line of the common question mark (hook, then stem), dot below it
Q_LINE = [(20, 20), (22, 12), (29, 6.5), (37, 6.5), (43, 11), (44.5, 18), (41, 25), (34, 30), (32, 35), (32, 40)]
Q_DOT = (32, 49.5)


def qline(ox=0.0, oy=0.0, sc=1.0):
    return [(32 + (x - 32) * sc + ox, 28 + (y - 28) * sc + oy) for x, y in Q_LINE]


def offset(pts, d):
    out = []
    for i, p in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        dd = d(i / (len(pts) - 1)) if callable(d) else d
        out.append((p[0] - dy / n * dd, p[1] + dx / n * dd))
    return out


def qshape(line, hw):
    """Closed outline of a thick question-mark stroke with rounded ends."""
    left, right = offset(line, hw), offset(line, lambda t: -(hw(t) if callable(hw) else hw))
    h0 = hw(0) if callable(hw) else hw
    h1 = hw(1) if callable(hw) else hw
    a, b = line[0], line[1]
    n = math.hypot(b[0] - a[0], b[1] - a[1])
    cap0 = (a[0] - (b[0] - a[0]) / n * h0 * 0.8, a[1] - (b[1] - a[1]) / n * h0 * 0.8)
    a, b = line[-1], line[-2]
    n = math.hypot(b[0] - a[0], b[1] - a[1])
    cap1 = (a[0] - (b[0] - a[0]) / n * h1 * 0.8, a[1] - (b[1] - a[1]) / n * h1 * 0.8)
    return [cap0] + left + [cap1] + list(reversed(right))


def bone(s, p, q, r=2.0, w=1.1):
    s.line(along(p, q, 0.1, r), along(p, q, 0.9, r), w)
    s.line(along(p, q, 0.1, -r), along(p, q, 0.9, -r), w)
    for t in (0.02, 0.98):
        for o in (r * 0.95, -r * 0.95):
            c = along(p, q, t, o)
            s.ring(c[0], c[1], r * 1.1, w=w * 0.9)


def tankard(s, x0=18, x1=42, top=22, bot=56, washc='#a0661e', op=0.15, foamc=None, bands=(28, 50)):
    """Body, bands, handle and foam of the common beer tankard; returns the body outline."""
    body = [(x0, top), (x1, top), (x1 - 1.5, bot), (x0 + 1.5, bot)]
    s.wash(body, washc, op)
    s.hatch([(x1 - 8, top), (x1, top), (x1 - 1.5, bot), (x1 - 9, bot)], angle=75, gap=1.3, w=0.45)
    s.stroke([(x0, top), (x0 + 0.8, (top + bot) / 2), (x0 + 1.5, bot)], 1.9)
    s.stroke([(x1, top), (x1 - 0.8, (top + bot) / 2), (x1 - 1.5, bot)], 1.9)
    s.line((x0 + 1, bot), (x1 - 1, bot), 1.9)
    for y in bands:
        s.line((x0 + 0.4, y), (x1 - 0.4, y), 1.2)
    # handle
    s.stroke([(x1, top + 5), (x1 + 9, top + 5), (x1 + 13, top + 12), (x1 + 12, top + 22), (x1 + 6, top + 27), (x1 - 1, top + 27)], 2.0, taper=False)
    s.stroke([(x1 - 1, top + 10), (x1 + 6, top + 10), (x1 + 8, top + 16), (x1 + 6, top + 21), (x1 - 1, top + 22)], 1.0, taper=False)
    # foam crown and a drip
    cx = (x0 + x1) / 2
    foam = [(x0 - 3, top + 1), (x0 - 1, top - 6), (x0 + 5, top - 7), (cx - 4, top - 12), (cx + 2, top - 9), (cx + 7, top - 12),
            (x1 + 1, top - 8), (x1 + 3, top - 1), (x1 - 2, top + 2), (cx + 4, top + 1), (cx - 2, top + 3), (x0 + 4, top + 2)]
    if foamc:
        s.wash(foam, foamc, 0.38)
    s.stroke(foam, 1.4, closed=True)
    s.stroke([(x0 + 3, top + 2), (x0 + 3, top + 8), (x0 + 4.5, top + 10), (x0 + 5, top + 7), (x0 + 5, top + 3)], 0.8)
    for x, y in [(x0 + 6, top - 3), (cx + 1, top - 5), (cx + 8, top - 4)]:
        s.ring(x, y, 1.3, w=0.6)
    return body


# ── rest: always a fire ──────────────────────────────────────────────────────
def descanso_ogro():
    s = Svg('descanso-ogro', seed=611)
    # campfire whose firewood is a pair of gnawed thigh bones, ringed by stones
    for i in range(7):
        a = math.pi * (0.05 + 0.9 * i / 6)
        x, y = 32 - 24 * math.cos(a), 55 + 5 * math.sin(a)
        s.ring(x, y, 3.2, 2.2, w=0.9)
    bone(s, (13, 54), (51, 44), r=2.2, w=1.3)
    bone(s, (13, 44), (51, 54), r=2.2, w=1.3)
    fire(s, 31, 47, 1.0, '#c9642a', '#e8b040')
    # a skull and a rib lying by the fire
    sk = [(50, 36), (50, 30), (55, 27), (60, 30), (60, 36), (58, 39), (52, 39)]
    s.wash(sk, '#e8d8b0', 0.3)
    s.stroke(sk, 1.3, closed=True)
    s.blot([(51.8, 32), (54.2, 31.5), (54, 34.5), (52, 34.5)], INK)
    s.blot([(56, 31.5), (58.4, 32), (58, 34.5), (56.2, 34.5)], INK)
    s.stroke([(4, 40), (8, 34), (14, 32)], 1.1)
    s.stroke([(6, 42), (10, 37), (15, 36)], 0.9)
    sparks(s, [(24, 7), (40, 8), (33, 3), (46, 13)])
    s.save()


def descanso_contrabandistas():
    s = Svg('descanso-contrabandistas', seed=361)
    # an iron basket brazier on a tripod in the cellar, a keg to sit on
    s.stroke([(2, 16), (62, 16)], 0.5)
    for x in range(4, 62, 10):
        s.line((x, 4), (x, 16), 0.5)
    fire(s, 34, 38, 0.85, '#c9642a', '#e8b040')
    basket = [(20, 36), (48, 36), (44, 48), (24, 48)]
    s.wash(basket, '#3a3a3a', 0.2)
    s.stroke([(19, 36), (34, 34.5), (49, 36)], 1.8, taper=False)
    s.stroke([(24, 48), (44, 48)], 1.8, taper=False)
    for t in (0, 0.2, 0.4, 0.6, 0.8, 1):
        s.line((20 + 28 * t, 36), (24 + 20 * t, 48), 1.0)
    s.line((22, 42), (46, 42), 0.9)
    # tripod legs
    s.stroke([(26, 48), (18, 61)], 1.7, taper=False)
    s.stroke([(42, 48), (50, 61)], 1.7, taper=False)
    s.stroke([(34, 48), (34, 61)], 1.7, taper=False)
    # little keg on the left and a bottle on the right
    keg = [(2, 46), (12, 46), (13, 53), (12, 61), (2, 61), (1, 53)]
    s.wash(keg, '#7a5230', 0.2)
    s.stroke(keg, 1.3, closed=True)
    for y in (49, 58):
        s.line((1.5, y), (12.5, y), 0.9)
    s.stroke([(56, 44), (56, 48), (54, 50), (54, 61), (60, 61), (60, 50), (58, 48), (58, 44)], 1.1)
    s.wash([(54, 50), (60, 50), (60, 61), (54, 61)], '#3a5a2a', 0.3)
    s.line((10, 62), (60, 62), 1.2)
    sparks(s, [(26, 8), (42, 5), (46, 12)], '#c9642a')
    s.save()


def descanso_cripta():
    s = Svg('descanso-cripta', seed=411)
    # a stone brazier on a pedestal, burning with a cold blue will-o'-the-wisp
    fire(s, 32, 32, 0.8, '#4a7ab0', '#a8c8e0')
    # wisp curling off the tip of the flame
    s.stroke([(30, 6), (27, 2), (31, 0.5)], 0.8, color='#3a5a80')
    bowl = [(14, 30), (50, 30), (46, 38), (18, 38)]
    s.wash(bowl, '#7a7a6a', 0.2)
    s.hatch([(38, 30), (50, 30), (46, 38), (36, 38)], angle=40, gap=1.2, w=0.45)
    s.stroke(bowl, 1.9, closed=True)
    s.line((13, 30), (51, 30), 2.0)
    # column with a carved skull, and a stepped plinth
    s.stroke([(26, 38), (27, 52)], 1.7, taper=False)
    s.stroke([(38, 38), (37, 52)], 1.7, taper=False)
    s.hatch([(33, 38), (38, 38), (37, 52), (33, 52)], angle=80, gap=1.1, w=0.4)
    s.stroke([(29.5, 41), (32, 40), (34.5, 41), (34.5, 44), (33.5, 45.5), (30.5, 45.5), (29.5, 44)], 0.9, closed=True)
    s.dot(31, 42.5, 0.7)
    s.dot(33, 42.5, 0.7)
    s.stroke(box(20, 52, 44, 56), 1.6, closed=True)
    s.stroke(box(16, 56, 48, 60), 1.6, closed=True)
    s.hatch(box(38, 52, 48, 60), angle=40, gap=1.2, w=0.4)
    # cobweb in the corner and drifting mist
    for e in [(2, 14), (6, 10), (12, 4), (16, 2)]:
        s.line((2, 2), e, 0.45)
    for r in (0.5, 0.9):
        pts = [lerp((2, 2), e, r) for e in [(2, 14), (6, 10), (12, 4), (16, 2)]]
        s.stroke(pts, 0.4, taper=False)
    s.stroke([(2, 50), (8, 48), (14, 50)], 0.7)
    s.stroke([(50, 46), (56, 44), (62, 47)], 0.7)
    s.save()


def descanso_templo():
    s = Svg('descanso-templo', seed=471)
    # a ritual brazier on three claw feet, its fire burning violet
    fire(s, 32, 36, 0.9, '#6a3a8a', '#c0a0d8')
    bowl = [(12, 34), (52, 34), (48, 42), (40, 46), (24, 46), (16, 42)]
    s.wash(bowl, '#5a3a3a', 0.2)
    s.hatch([(40, 34), (52, 34), (48, 42), (40, 46), (38, 46)], angle=40, gap=1.2, w=0.45)
    s.stroke(bowl, 1.9, closed=True)
    s.line((11, 34), (53, 34), 2.0)
    # small horns on the rim
    s.stroke([(12, 34), (7, 30), (6, 24)], 1.4)
    s.stroke([(52, 34), (57, 30), (58, 24)], 1.4)
    # sigil on the belly
    s.ring(32, 40.5, 3.2, w=0.9)
    s.stroke([(32, 37.3), (34, 42.8), (29.2, 39.5), (34.8, 39.5), (30, 42.8), (32, 37.3)], 0.6, taper=False)
    # claw feet
    for bx, ex in [(22, 14), (32, 32), (42, 50)]:
        s.stroke([(bx, 46), ((bx + ex) / 2, 53), (ex, 58)], 1.7, taper=False)
        for d in (-2.2, 0, 2.2):
            s.line((ex, 58), (ex + d, 60.5), 0.8)
    # drops of wax or blood below and a curl of incense smoke
    s.stroke([(46, 42), (46.5, 47)], 1.1, color=RED)
    s.dot(46.6, 48.4, 0.9, RED)
    s.stroke([(46, 10), (50, 6), (47, 2)], 0.7)
    sparks(s, [(18, 12), (44, 16)], '#6a3a8a')
    s.save()


def descanso_dragon():
    s = Svg('descanso-dragon', seed=521)
    # a bonfire roaring over a bed of volcanic embers, jagged rocks around
    s.wash(ell(32, 50, 26, 9, 12), '#8b1e12', 0.2)
    coals = [(16, 50, 4.5), (24, 47, 5), (40, 47, 5), (48, 50, 4.5), (22, 54, 4.5), (32, 54, 5), (42, 54, 4.5)]
    for i, (x, y, r) in enumerate(coals):
        pts = ell(x, y, r, r * 0.6, 6, 0.3)
        s.stroke(pts, 1.1, closed=True, n=2)
        s.line((x - r * 0.4, y), (x + r * 0.4, y - 0.5), 0.7, color=RED)
    fire(s, 31, 47, 1.0, '#c9642a', '#e8b040')
    # jagged volcanic rocks with glowing cracks
    for pts in ([(1, 60), (3, 50), (7, 45), (10, 52), (12, 60)], [(52, 60), (55, 48), (59, 43), (62, 50), (63, 60)]):
        s.wash(pts, '#3a2a2a', 0.25)
        s.hatch(pts, angle=60, gap=1.5, w=0.45)
        s.stroke(pts, 1.5, taper=False)
    s.stroke([(6, 50), (7, 55), (5, 59)], 0.8, color=RED)
    s.stroke([(58, 47), (57, 53), (59, 58)], 0.8, color=RED)
    s.line((1, 61), (63, 61), 1.3)
    # smoke and rising sparks
    s.stroke([(46, 16), (50, 10), (47, 4), (51, 0.5)], 0.8)
    sparks(s, [(18, 18), (22, 8), (42, 4), (54, 22)], '#c9642a', 0.9)
    s.save()


def descanso_contemplador():
    s = Svg('descanso-contemplador', seed=581)
    # an arcane turquoise fire burning inside a rune circle chalked on the floor
    s.ring(32, 50, 29, 10, w=1.7)
    s.ring(32, 50, 23, 7.5, w=0.9)
    glyphs = [[(-1.4, -1.6), (1.4, 0), (-1.4, 1.6)], [(-1.4, 1.6), (0, -1.6), (1.4, 1.6)], [(0, -1.6), (0, 1.6), (1.4, 0)],
              [(-1.4, -1.6), (1.4, -1.6), (-1.4, 1.6), (1.4, 1.6)]]
    for i in range(10):
        a = i * math.pi / 5 + math.pi / 10
        cx, cy = 32 + 26 * math.cos(a), 50 + 8.7 * math.sin(a)
        s.stroke([(cx + x, cy + y * 0.8) for x, y in glyphs[i % 4]], 0.8, taper=False)
    fire(s, 31, 51, 1.0, '#3a8a9a', '#a8e0d8')
    # an open eye glimmering in the heart of the flame
    s.stroke([(27, 40), (31, 37.5), (35, 40), (31, 42.5)], 1.0, closed=True)
    s.dot(31, 40, 1.1)
    # floating motes of light
    for x, y, r in [(10, 20, 2.4), (52, 14, 2.2), (56, 32, 1.8)]:
        s.stroke([(x, y - r), (x + r * 0.7, y), (x, y + r), (x - r * 0.7, y)], 0.8, closed=True)
    s.save()


# ── event: always a question mark ────────────────────────────────────────────
def evento_ogro():
    s = Svg('evento-ogro', seed=311)
    # question mark hacked out of a log, lashed with rope, with a knucklebone for a dot
    line = qline(0, -1, 0.95)
    shape = qshape(line, 4.2)
    s.wash(shape, '#6b4420', 0.28)
    s.stroke(shape, 1.8, closed=True)
    for d in (-1.6, 1.4):
        s.stroke(offset(line, d)[1:-1], 0.5)
    s.hatch(shape, angle=75, gap=1.9, w=0.4)
    # knot on the hook and a rope binding on the stem
    s.ring(38, 7, 1.4, 1.0, w=0.7)
    s.stroke([(27.5, 34), (32, 32.5), (36.5, 34)], 1.2)
    # the dot: the sawn end of a log, its growth rings showing
    s.wash(ell(32, 50, 5, 4.6, 10), '#8a6a3a', 0.35)
    s.ring(32, 50, 5, 4.6, w=1.7)
    s.ring(32, 50, 2.8, 2.5, w=0.6)
    s.dot(32, 50, 0.6)
    # tufts of grass and feathers on the hook tip
    s.stroke([(10, 62), (20, 59), (32, 60), (44, 59), (54, 62)], 1.3)
    for x in (14, 48):
        s.stroke([(x, 60), (x - 1, 55), (x + 0.5, 59), (x + 2, 54), (x + 1.5, 60)], 0.7, taper=False)
    s.line((17, 21), (13, 26), 0.7)
    s.stroke([(13, 26), (11, 30), (13, 34), (15, 30)], 0.9, closed=True)
    s.save()


def evento_contrabandistas():
    s = Svg('evento-contrabandistas', seed=351)
    # a question mark inked on a parchment note, sealed with red wax as its dot
    sheet = [(8, 6), (31, 5), (54, 4), (55.5, 31), (57, 58), (31, 59), (6, 60), (7, 33)]
    s.wash(sheet, '#b8945a', 0.2)
    s.stroke([(8, 6), (31, 5), (54, 4)], 1.3)
    s.stroke([(54, 4), (55.5, 31), (57, 58)], 1.3)
    s.stroke([(6, 60), (31, 59), (57, 58)], 1.3)
    s.stroke([(8, 6), (7, 33), (6, 60)], 1.3)
    # curled corners
    s.stroke([(8, 6), (12, 12), (15, 7)], 0.9)
    s.stroke([(57, 58), (51, 55), (52, 60)], 0.9)
    s.hatch([(54, 4), (57, 58), (53, 58), (51, 5)], angle=80, gap=1.2, w=0.4)
    line = qline(0, -2, 0.82)
    s.stroke(line, 5.4)
    s.stroke(offset(line, 1.8)[1:-2], 0.5)
    s.dot(line[0][0] - 1, line[0][1] + 1.5, 1.5)
    # ink splatter
    for x, y, r in [(46, 30, 0.8), (44, 33, 0.5), (17, 38, 0.6)]:
        s.dot(x, y, r)
    # wax seal as the dot, with its ribbon
    s.stroke([(28, 52), (24, 60), (22, 63)], 1.2, color=RED)
    s.stroke([(36, 52), (40, 60), (43, 62)], 1.2, color=RED)
    seal = []
    for i in range(10):
        a = i * math.pi / 5
        r = 5.6 + (0.9 if i % 2 else 0)
        seal.append((32 + r * math.cos(a), 49 + r * math.sin(a)))
    s.blot(seal, '#8b1e12', 0.65)
    s.stroke(seal, 1.2, closed=True)
    s.ring(32, 49, 3.2, w=0.7)
    s.save()


def evento_cripta():
    s = Svg('evento-cripta', seed=401)
    # a tombstone with a question mark chiselled deep into it
    stone = [(12, 56), (12, 24), (16, 13), (25, 6), (39, 6), (48, 13), (52, 24), (52, 56)]
    s.wash(stone, '#7a7a6a', 0.18)
    s.hatch([(42, 7), (48, 13), (52, 24), (52, 56), (46, 56), (48, 24)], angle=40, gap=1.3, w=0.45)
    s.stroke(stone, 1.9, taper=False)
    line = qline(0, 3, 0.74)
    shape = qshape(line, 3.3)
    s.blot(shape, INK, 0.3)
    s.hatch(shape, angle=45, gap=1.5, w=0.45)
    s.stroke(shape, 1.3, closed=True)
    s.stroke(offset(line, 3.3)[2:-1], 0.9)
    dot = ell(32, 48, 3.4, 3.2, 8)
    s.blot(dot, INK, 0.3)
    s.stroke(dot, 1.3, closed=True)
    # crack and moss
    s.stroke([(46, 30), (43, 35), (46, 38), (43, 44)], 0.9, taper=False)
    s.stroke([(12, 40), (15, 42), (13, 46)], 0.8)
    # heaped earth, grass and mist
    s.stroke([(3, 60), (12, 56), (32, 55), (52, 56), (61, 60)], 1.8)
    s.hatch([(5, 60), (12, 57), (32, 56), (52, 57), (59, 60), (32, 63)], angle=0, gap=1.5, w=0.4)
    for x in (8, 55):
        s.stroke([(x, 58), (x - 1, 53), (x + 0.5, 57), (x + 2, 52), (x + 1.5, 58)], 0.7, taper=False)
    s.stroke([(1, 48), (6, 46), (10, 48)], 0.7)
    s.stroke([(54, 46), (58, 44), (63, 47)], 0.7)
    s.save()


def evento_templo():
    s = Svg('evento-templo', seed=461)
    # a question mark of black wax, lit at its tip and dripping onto an altar
    line = qline(0, 2, 0.9)
    shape = qshape(line, 3.6)
    s.blot(shape, INK, 0.95)
    # drips hanging from the hook and the stem
    for x, y, ln in [(43.5, 20, 6), (30.5, 40, 4)]:
        s.blot([(x - 1.4, y - 1), (x + 1.4, y - 1), (x + 1, y + ln), (x, y + ln + 1.6), (x - 1, y + ln)], INK)
    # wick and violet flame at the start of the hook
    tip = line[0]
    fx, fy = tip[0] - 1.5, tip[1] - 4
    s.line((tip[0] - 1, tip[1] - 2), (fx, fy), 0.8)
    fl = [(fx, fy), (fx - 3.6, fy - 5), (fx - 0.5, fy - 14), (fx + 3.2, fy - 5)]
    s.wash(fl, '#6a3a8a', 0.45)
    s.stroke(fl, 1.2, closed=True)
    s.stroke([(fx, fy - 1.5), (fx - 1.2, fy - 4.5), (fx - 0.3, fy - 8)], 0.6)
    # the dot: a puddle of wax
    s.blot(ell(32, 50, 4.2, 3.4, 8), INK, 0.95)
    # altar slab with a sigil
    slab = [(6, 56), (58, 56), (55, 62), (9, 62)]
    s.wash(slab, '#6a5a5a', 0.2)
    s.hatch([(40, 56), (58, 56), (55, 62), (40, 62)], angle=60, gap=1.2, w=0.45)
    s.stroke(slab, 1.6, closed=True)
    s.stroke([(46, 50), (50, 54), (54, 50), (50, 46)], 0.9, closed=True)
    s.dot(50, 50, 0.8, RED)
    s.stroke([(12, 44), (16, 40), (13, 36), (17, 32)], 0.6)
    s.save()


def evento_dragon():
    s = Svg('evento-dragon', seed=511)
    # a question mark forged in gold, scaled like a dragon's tail with a spiny ridge
    line = qline(0, -1, 0.95)
    shape = qshape(line, lambda t: 4.4 - 1.4 * t)
    s.wash(shape, '#b8860b', 0.4)
    s.hatch([shape[i] for i in range(len(shape) // 2, len(shape))], angle=40, gap=1.3, w=0.45)
    s.stroke(shape, 1.8, closed=True)
    # scales along the body
    for i in range(1, len(line) - 1):
        p, q = line[i], line[i + 1]
        m = lerp(p, q, 0.5)
        s.stroke([along(p, q, 0.2, 1.8), (m[0], m[1]), along(p, q, 0.8, 1.8)], 0.6, taper=False)
    # spines along the outer edge of the hook
    outer = offset(line, 4.2)
    for i in range(1, 7):
        p, q = outer[i], outer[i + 1]
        tip = along(p, q, 0.5, 3.2)
        s.stroke([lerp(p, q, 0.15), tip, lerp(p, q, 0.85)], 1.0, taper=False)
    # the dot: a gold coin
    s.wash(ell(32, 50, 4.4, 4.2, 10), '#b8860b', 0.45)
    s.ring(32, 50, 4.4, w=1.6)
    s.ring(32, 50, 2.4, w=0.6)
    # little heaps of coins and glints
    for x, y in [(14, 59), (20, 60.5), (44, 60.5), (50, 59)]:
        coin(s, x, y, 3.0)
    for x, y in [(8, 36), (56, 34)]:
        s.line((x - 2.2, y), (x + 2.2, y), 0.6)
        s.line((x, y - 2.2), (x, y + 2.2), 0.6)
    s.save()


def evento_contemplador():
    s = Svg('evento-contemplador', seed=571)
    # a tentacle curled into a question mark, an eye staring up as its dot
    line = qline(0, -1, 0.95)
    shape = qshape(line, lambda t: 1.4 + 3.2 * t ** 0.8)
    s.wash(shape, '#7a5a8a', 0.28)
    s.stroke(shape, 1.8, closed=True)
    s.hatch([shape[i] for i in range(len(shape) // 2, len(shape))], angle=50, gap=1.3, w=0.45)
    # suckers along the inner side
    inner = offset(line, lambda t: -(0.2 + 1.6 * t))
    for i in range(3, len(inner) - 1):
        s.ring(inner[i][0], inner[i][1], 0.9 + 0.2 * i / len(inner), w=0.6)
    # the dot: an eye
    eye = [(24, 50), (28, 46.5), (32, 45.5), (36, 46.5), (40, 50), (36, 53.5), (32, 54.5), (28, 53.5)]
    s.wash(eye, '#e8d8b0', 0.45)
    s.stroke(eye, 1.6, closed=True)
    s.ring(32, 50, 3.4, w=1.0)
    s.wash(ell(32, 50, 3.2, 3.2, 8), '#3a6a5a', 0.35)
    s.blot([(31.2, 47.4), (32.8, 47.4), (33.2, 50), (32.8, 52.6), (31.2, 52.6), (30.8, 50)], INK)
    for a in (-2.5, -1.57, -0.64):
        s.line((32 + 8 * math.cos(a), 50 + 4.8 * math.sin(a)), (32 + 10.5 * math.cos(a), 50 + 7 * math.sin(a)), 0.8)
    # psionic ripples
    s.stroke(arc(32, 30, 28, 26, 2.9, 3.6, 4), 0.6)
    s.stroke(arc(32, 30, 28, 26, -0.45, 0.25, 4), 0.6)
    for x, y, r in [(10, 10, 2.4), (54, 40, 2)]:
        s.line((x - r, y), (x + r, y), 0.7)
        s.line((x, y - r), (x, y + r), 0.7)
    s.save()


# ── tavern: always a tankard of beer ─────────────────────────────────────────
def taberna_templo():
    s = Svg('taberna-templo', seed=491)
    # a pewter tankard with the cult's sigil and reddish foam
    tankard(s, washc='#6a6a70', op=0.22, foamc='#b04a3a', bands=(28, 51))
    # hinge knuckle of the lid on top of the handle
    s.ring(46, 25, 2, 1.6, w=1.0)
    # sigil: a ringed pentagram with a drop of red
    s.ring(29, 39.5, 6.4, w=1.1)
    pts = [(29 + 6 * math.cos(-math.pi / 2 + k * 4 * math.pi / 5), 39.5 + 6 * math.sin(-math.pi / 2 + k * 4 * math.pi / 5)) for k in range(6)]
    s.stroke(pts, 0.7, taper=False)
    s.dot(29, 39.5, 0.8, RED)
    # dents in the pewter
    s.stroke([(37, 32), (36, 35), (37.5, 37)], 0.6)
    s.save()


def taberna_dragon():
    s = Svg('taberna-dragon', seed=541)
    # a copper tankard covered in scales, a claw handle, foam still steaming
    tankard(s, washc='#b0602a', op=0.24, bands=(27, 51))
    for row, y in enumerate((31, 36, 41, 46)):
        x = 21 + (row % 2) * 2.5
        while x < 36:
            s.stroke([(x, y), (x + 2.5, y + 2.6), (x + 5, y)], 0.6, taper=False, jitter=0.2)
            x += 5
    # spikes on the handle's back
    for x, y, dx, dy in [(51, 28, 3, -2), (55, 34, 3.5, 0), (54, 42, 3, 2.5)]:
        s.stroke([(x - 1, y - 1.5), (x + dx, y + dy), (x + 1, y + 1.5)], 0.9, taper=False)
    # clawed feet
    for x in (22, 38):
        s.stroke([(x - 3, 56), (x - 4, 60), (x, 58), (x + 4, 60), (x + 3, 56)], 1.0, taper=False)
    # steam
    s.stroke([(22, 9), (19, 5), (23, 1)], 0.8)
    s.stroke([(34, 7), (37, 3), (34, 0.5)], 0.8)
    s.stroke([(44, 11), (47, 7), (45, 3)], 0.7)
    s.save()


def taberna_contemplador():
    s = Svg('taberna-contemplador', seed=601)
    # a glass tankard: beer seen through the glass, an eye floating in it, turquoise foam
    body = tankard(s, washc='#e8e0c0', op=0.3, foamc='#3a8a9a', bands=())
    s.wash([(19, 27), (40.5, 27), (39.5, 55), (20, 55)], '#6a8a3a', 0.25)
    s.stroke([(19, 27), (25, 26), (31, 27.5), (40.5, 26.5)], 0.8)
    # facets of the glass and a highlight
    for x in (24, 30, 36):
        s.line((x, 28), (x, 54), 0.4)
    s.stroke([(21, 30), (21, 44)], 1.0, color='#f5ecd0')
    # the eye bobbing in the beer
    eye = [(22, 40), (26, 36.5), (30, 35.5), (34, 36.5), (38, 40), (34, 43.5), (30, 44.5), (26, 43.5)]
    s.wash(eye, '#f0e2bc', 0.8)
    s.stroke(eye, 1.3, closed=True)
    s.ring(30, 40, 3, w=0.9)
    s.blot([(29.3, 37.8), (30.7, 37.8), (31, 40), (30.7, 42.2), (29.3, 42.2), (29, 40)], INK)
    # bubbles rising
    for x, y, r in [(25, 50, 1.0), (34, 48, 0.8), (27, 31, 0.7)]:
        s.ring(x, y, r, w=0.45)
    s.save()


# ── the full per-scenario set ────────────────────────────────────────────────
SCENARIO_ICONS = [
    # Ogre Settlement (reuses the goblin and the tankard)
    lambda: g.combate_acto1('combate-ogro'), elite_ogro, evento_ogro,
    descanso_ogro, cofre_ogro, lambda: g.taberna('taberna-ogro'),
    # Smugglers' Den
    combate_contrabandistas, elite_contrabandistas, evento_contrabandistas,
    descanso_contrabandistas, cofre_contrabandistas, taberna_contrabandistas,
    # The Crypt (reuses the skull and crossbones)
    lambda: g.combate_acto2('combate-cripta'), elite_cripta, evento_cripta, descanso_cripta, cofre_cripta, taberna_cripta,
    # The Dark Temple
    combate_templo, elite_templo, evento_templo, descanso_templo, cofre_templo, taberna_templo,
    # The Dragon's Lair (reuses the claw marks)
    lambda: g.combate_acto3('combate-dragon'), elite_dragon, evento_dragon, descanso_dragon, cofre_dragon, taberna_dragon,
    # The Beholder's Labyrinth
    combate_contemplador, elite_contemplador, evento_contemplador, descanso_contemplador, cofre_contemplador,
    taberna_contemplador,
]

if __name__ == '__main__':
    for fn in SCENARIO_ICONS:
        fn()
