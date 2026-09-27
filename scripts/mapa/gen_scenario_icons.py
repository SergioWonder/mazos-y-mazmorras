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


def evento_ogro():
    s = Svg('evento-ogro', seed=311)
    # carved pole with two stacked faces and a skull on top
    pole = [(24, 24), (40, 24), (41, 61), (23, 61)]
    s.wash(pole, '#6b4420', 0.18)
    s.hatch([(34, 24), (40, 24), (41, 61), (35, 61)], angle=80, gap=1.2, w=0.45)
    s.stroke([(24, 24), (23.5, 42), (23, 61)], 1.8)
    s.stroke([(40, 24), (40.5, 42), (41, 61)], 1.8)
    s.line((21, 61), (43, 61), 1.8)
    for y in (42,):
        s.line((23, y), (41, y), 1.3)
    # upper face: angry brows and fanged mouth
    s.stroke([(26, 29), (30, 31)], 1.5)
    s.stroke([(38, 29), (34, 31)], 1.5)
    s.dot(28.5, 33, 1.1)
    s.dot(35.5, 33, 1.1)
    s.stroke([(27, 38), (32, 36.5), (37, 38)], 1.2)
    s.stroke([(28, 37.6), (29, 40), (30, 37.2)], 0.7, taper=False)
    s.stroke([(34, 37.2), (35, 40), (36, 37.6)], 0.7, taper=False)
    # lower face: round eyes, open mouth
    s.ring(28.5, 47, 1.8, w=0.9)
    s.ring(35.5, 47, 1.8, w=0.9)
    s.blot([(29, 52), (35, 52), (34, 56), (30, 56)], INK)
    # little wings to the sides
    s.stroke([(24, 45), (14, 40), (8, 42), (12, 46), (8, 49), (14, 50), (23, 51)], 1.4)
    s.stroke([(40, 45), (50, 40), (56, 42), (52, 46), (56, 49), (50, 50), (41, 51)], 1.4)
    s.hatch([(24, 45), (14, 40), (8, 42), (12, 46), (23, 50)], angle=-15, gap=1.4, w=0.4)
    s.hatch([(40, 45), (50, 40), (56, 42), (52, 46), (41, 50)], angle=15, gap=1.4, w=0.4)
    # small horned skull on the top
    sk = [(25, 20), (25, 12), (32, 7), (39, 12), (39, 20), (36, 24), (28, 24)]
    s.wash(sk, '#e8d8b0', 0.25)
    s.stroke(sk, 1.5, closed=True)
    s.blot([(27, 15), (30, 14), (30, 18), (27, 18)], INK)
    s.blot([(34, 14), (37, 15), (37, 18), (34, 18)], INK)
    s.line((29, 22), (35, 22), 0.7)
    s.stroke([(25, 13), (19, 9), (17, 3)], 1.4)
    s.stroke([(39, 13), (45, 9), (47, 3)], 1.4)
    # hanging feathers
    for x in (14, 50):
        s.line((x, 50), (x, 55), 0.7)
        s.stroke([(x, 55), (x - 1.8, 59), (x, 63), (x + 1.8, 59)], 0.9, closed=True)
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


def evento_contrabandistas():
    s = Svg('evento-contrabandistas', seed=351)
    # half-unrolled treasure map
    sheet = [(6, 30), (48, 26), (54, 56), (10, 60)]
    s.wash(sheet, '#b8945a', 0.18)
    s.stroke([(6, 30), (27, 28), (48, 26)], 1.4)
    s.stroke([(10, 60), (32, 58), (54, 56)], 1.4)
    s.stroke([(6, 30), (8, 45), (10, 60)], 1.4)
    # rolled right end
    s.stroke([(48, 26), (51, 41), (54, 56)], 1.4)
    s.stroke([(52, 25), (55, 40), (58, 55)], 1.4)
    s.ring(55, 25.5, 3, 2, w=1.0)
    s.hatch([(48, 26), (52, 25), (58, 55), (54, 56)], angle=70, gap=1.1, w=0.4)
    # dotted route, coastline and the X
    for i in range(9):
        t = i / 8
        x, y = 13 + 26 * t, 52 - 16 * math.sin(t * math.pi * 0.9) - 4 * t
        s.dot(x, y, 0.55)
    s.stroke([(10, 40), (16, 37), (18, 42), (24, 44), (28, 40)], 0.8)
    s.stroke([(38, 34), (44, 38)], 1.6, color=RED)
    s.stroke([(44, 34), (38, 38)], 1.6, color=RED)
    # oil lamp sitting on the corner
    lamp = [(4, 20), (10, 16), (20, 16), (26, 20), (20, 24), (10, 24)]
    s.wash(lamp, '#8a6a2a', 0.25)
    s.stroke(lamp, 1.5, closed=True)
    s.stroke([(26, 20), (31, 18), (34, 16)], 1.3)
    s.stroke([(4, 20), (1, 18), (2, 14), (6, 16)], 1.0)
    s.hatch([(15, 16), (20, 16), (26, 20), (20, 24), (15, 24)], angle=60, gap=1.1, w=0.4)
    fl = [(34, 15), (32, 10), (34.5, 3), (37, 10)]
    s.wash(fl, '#c9642a', 0.35)
    s.stroke(fl, 1.1, closed=True)
    for x, y in [(40, 6), (29, 5), (41, 13)]:
        s.line((x, y), (x + (x - 34) * 0.15, y - 1.5), 0.5)
    s.save()


def descanso_contrabandistas():
    s = Svg('descanso-contrabandistas', seed=361)
    # two posts with a sagging hammock slung between them
    for x in (6, 58):
        s.stroke([(x, 12), (x, 60)], 2.4, taper=False)
        s.line((x - 3, 60), (x + 3, 60), 1.4)
        s.ring(x, 20, 2, 1, w=0.8)
    s.stroke([(6, 20), (14, 30)], 0.9)
    s.stroke([(6, 20), (14, 34)], 0.9)
    s.stroke([(58, 20), (50, 30)], 0.9)
    s.stroke([(58, 20), (50, 34)], 0.9)
    top = [(14, 30), (22, 36), (32, 38), (42, 36), (50, 30)]
    bot = [(14, 34), (20, 44), (32, 48), (44, 44), (50, 34)]
    s.wash(top + list(reversed(bot)), '#8a6a3a', 0.18)
    s.hatch(top + list(reversed(bot)), angle=45, gap=2.2, w=0.45, cross=True)
    s.stroke(top, 1.5)
    s.stroke(bot, 1.9)
    # a rolled blanket and a hat hanging on the post
    s.stroke([(20, 35), (26, 33), (27, 38), (21, 40)], 1.1, closed=True)
    s.ring(23.5, 36.5, 1.4, w=0.6)
    s.stroke([(55, 12), (61, 12)], 1.4)
    s.stroke([(56, 12), (57, 7), (59, 7), (60, 12)], 1.1)
    # lantern hanging from a hook
    s.line((32, 4), (32, 12), 0.7)
    s.stroke(box(29, 12, 35, 20), 1.2, closed=True)
    s.dot(32, 16, 1.2, '#c9642a')
    # Zs of sleep
    s.stroke([(38, 8), (42, 8), (38, 12), (42, 12)], 0.9, taper=False)
    s.stroke([(44, 2), (47, 2), (44, 5), (47, 5)], 0.7, taper=False)
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


def evento_cripta():
    s = Svg('evento-cripta', seed=401)
    stone = [(14, 54), (14, 24), (18, 14), (26, 8), (38, 8), (46, 14), (50, 24), (50, 54)]
    s.wash(stone, '#7a7a6a', 0.16)
    s.hatch([(40, 9), (46, 14), (50, 24), (50, 54), (42, 54), (44, 24)], angle=40, gap=1.3, w=0.45)
    s.stroke(stone, 1.9, taper=False)
    s.stroke([(18, 52), (18, 25), (21, 17), (28, 12), (36, 12), (43, 17), (46, 25), (46, 52)], 0.6, taper=False)
    # carved cross and a few chiselled lines standing in for the epitaph
    s.stroke([(32, 17), (32, 35)], 2.0, taper=False)
    s.stroke([(26, 23), (38, 23)], 2.0, taper=False)
    for y, w0 in [(40, 10), (44, 8), (48, 9)]:
        s.line((32 - w0 / 2, y), (32 + w0 / 2, y), 0.8)
    # crack
    s.stroke([(44, 28), (40, 33), (43, 36), (39, 42)], 0.9, taper=False)
    # heaped earth and grass
    s.stroke([(4, 58), (14, 54), (32, 53), (50, 54), (60, 58)], 1.8)
    s.hatch([(6, 58), (14, 55), (32, 54), (50, 55), (58, 58), (32, 61)], angle=0, gap=1.1, w=0.4)
    for x in (8, 12, 52, 56, 22):
        s.stroke([(x, 56), (x - 1, 51), (x + 0.5, 55), (x + 2, 50), (x + 1.5, 56)], 0.7, taper=False)
    # wisps of mist
    s.stroke([(2, 46), (8, 44), (12, 46)], 0.7)
    s.stroke([(52, 44), (57, 42), (62, 45)], 0.7)
    s.save()


def descanso_cripta():
    s = Svg('descanso-cripta', seed=411)
    # stone blocks around an arched niche
    for y in (4, 16, 28, 40):
        off = 0 if (y // 12) % 2 else 6
        s.line((2, y), (62, y), 0.5)
        for x in range(2 + off, 62, 12):
            s.line((x, y), (x, y + 12), 0.5)
    niche = [(18, 58), (18, 26), (20, 18), (26, 12), (32, 10), (38, 12), (44, 18), (46, 26), (46, 58)]
    s.blot(niche, '#f0e2bc', 0.95)
    s.hatch(niche, angle=0, gap=1.4, w=0.4, op=0.8)
    s.stroke(niche, 2.2, taper=False)
    s.line((14, 58), (50, 58), 2.2)
    # candle with dripping wax on a little dish
    s.stroke([(27, 56), (37, 56)], 1.6)
    s.stroke([(25, 56), (26, 54), (38, 54), (39, 56)], 1.1)
    s.wash(box(29, 34, 35, 54), '#f5ecd0', 0.9)
    s.stroke([(29, 36), (29, 54)], 1.4, taper=False)
    s.stroke([(35, 36), (35, 54)], 1.4, taper=False)
    s.stroke([(29, 36), (31, 35), (32, 37), (33, 35), (35, 36)], 1.1)
    s.stroke([(29, 38), (28.5, 43), (29.5, 44)], 0.9)
    s.stroke([(35, 37), (36, 40), (35.5, 42)], 0.9)
    s.line((32, 35.5), (32, 32), 0.7)
    fl = [(32, 32), (29.5, 27), (32, 19), (34.5, 27)]
    s.wash(fl, '#d9a040', 0.4)
    s.stroke(fl, 1.1, closed=True)
    s.stroke([(32, 29.5), (31, 27), (32, 24)], 0.6)
    # halo of light
    for a in range(0, 360, 45):
        r = math.radians(a)
        s.line((32 + 9 * math.cos(r), 27 + 9 * math.sin(r)), (32 + 11.5 * math.cos(r), 27 + 11.5 * math.sin(r)), 0.5)
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


def evento_templo():
    s = Svg('evento-templo', seed=461)
    # stone altar block with a sigil carved on its face
    top = [(6, 36), (58, 36), (54, 42), (10, 42)]
    s.wash(top, '#6a5a5a', 0.2)
    s.stroke(top, 1.8, closed=True)
    body = [(12, 42), (52, 42), (50, 60), (14, 60)]
    s.wash(body, '#5a4a4a', 0.16)
    s.hatch([(40, 42), (52, 42), (50, 60), (40, 60)], angle=60, gap=1.2, w=0.45)
    s.stroke(body, 1.8, closed=True)
    s.line((8, 61), (56, 61), 1.8)
    s.ring(30, 51, 6, w=1.1)
    s.stroke([(30, 45.5), (34, 55), (25, 49), (35, 49), (26, 55), (30, 45.5)], 0.7, taper=False)
    # red stain dripping down the side
    s.stroke([(46, 42), (47, 48), (46.5, 51)], 1.4, color=RED)
    s.dot(46.5, 52.5, 1.0, RED)
    # black candle: filled wax, pale flame, smoke
    s.blot([(27, 16), (37, 16), (37, 36), (27, 36)], INK, 0.95)
    s.stroke([(27, 16), (29, 14.5), (32, 16.5), (35, 14.5), (37, 16)], 1.1)
    s.stroke([(37, 17), (38, 22), (37.5, 25)], 1.0)
    s.stroke([(24, 36), (40, 36)], 1.4)
    s.line((32, 15.5), (32, 12), 0.7)
    fl = [(32, 12), (29.5, 7), (32, 0.5), (34.5, 7)]
    s.wash(fl, '#6a3a8a', 0.3)
    s.stroke(fl, 1.1, closed=True)
    s.stroke([(38, 4), (42, 2), (40, 6), (44, 5)], 0.6)
    # scattered bones and a dagger lying on the altar
    s.stroke([(10, 34), (20, 32)], 1.2)
    s.stroke([(8, 33.5), (10, 34), (9, 35.5)], 0.9)
    s.stroke([(44, 34), (54, 32)], 1.4)
    s.stroke([(44, 32), (44, 36)], 1.2)
    s.save()


def descanso_templo():
    s = Svg('descanso-templo', seed=471)
    # a carved temple pew with a kneeler, seen three-quarter
    back = [(10, 14), (50, 8), (50, 34), (10, 38)]
    s.wash(back, '#5a3a2a', 0.18)
    s.hatch(back, angle=80, gap=1.6, w=0.4)
    s.stroke([(10, 38), (10, 14), (18, 9), (26, 12), (34, 6), (42, 9), (50, 4), (50, 34)], 1.9, taper=False)
    s.stroke([(14, 34), (14, 18), (46, 12), (46, 31)], 0.8, closed=True)
    # carved arch window on the backrest
    s.stroke([(24, 31), (24, 22), (27, 17), (30, 16), (33, 17), (35, 21), (35, 30)], 1.1)
    s.hatch([(24, 31), (24, 22), (27, 17), (33, 17), (35, 21), (35, 30)], angle=0, gap=1.1, w=0.4)
    # seat plank
    seat = [(8, 38), (50, 34), (58, 38), (16, 43)]
    s.wash(seat, '#8a6a3a', 0.2)
    s.stroke(seat, 1.6, closed=True)
    s.line((16, 43), (58, 38), 1.0)
    s.line((16, 45), (58, 40), 1.0)
    # legs
    for x0, y0 in [(10, 40), (18, 45), (50, 36), (56, 40)]:
        s.stroke([(x0, y0), (x0, y0 + 16)], 1.6, taper=False)
    # kneeler rail in front
    s.stroke([(14, 56), (58, 50)], 2.2, taper=False)
    s.stroke([(14, 59), (58, 53)], 1.0)
    s.hatch([(14, 56), (58, 50), (58, 53), (14, 59)], angle=80, gap=0.9, w=0.35)
    # a closed prayer book resting on the seat
    s.stroke([(32, 34), (42, 33), (44, 36), (34, 37.5)], 1.0, closed=True)
    s.line((33, 35.8), (43, 34.6), 0.5)
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


def taberna_templo():
    s = Svg('taberna-templo', seed=491)
    # a skull-bowl ritual cup on a tripod, brimming and smoking
    bowl = [(8, 30), (56, 30), (52, 40), (42, 47), (22, 47), (12, 40)]
    s.wash(bowl, '#e8d8b0', 0.3)
    s.hatch([(42, 30), (56, 30), (52, 40), (42, 47), (38, 47), (46, 38)], angle=40, gap=1.2, w=0.45)
    s.stroke(bowl, 1.9, closed=True)
    # liquid surface and a drip
    s.stroke([(10, 30), (32, 26), (54, 30), (32, 33), (10, 30)], 1.1, closed=True)
    s.wash([(12, 30), (32, 27), (52, 30), (32, 32)], RED, 0.45)
    s.stroke([(14, 34), (13, 40), (14, 43)], 1.3, color=RED)
    s.dot(14, 44.5, 1.0, RED)
    # sockets and teeth on the bowl side
    s.blot([(22, 35), (28, 34.5), (27, 39), (23, 39)], INK)
    s.blot([(36, 34.5), (42, 35), (41, 39), (37, 39)], INK)
    s.blot([(32, 39), (30.6, 42), (33.4, 42)], INK)
    for x in (26, 30, 34, 38):
        s.line((x, 44), (x, 47), 0.6)
    # tripod legs
    s.stroke([(22, 47), (14, 60)], 1.7, taper=False)
    s.stroke([(42, 47), (50, 60)], 1.7, taper=False)
    s.stroke([(32, 47), (32, 61)], 1.7, taper=False)
    s.line((10, 61), (54, 61), 1.2)
    # incense smoke curling up
    s.stroke([(24, 26), (20, 20), (25, 15), (21, 9), (26, 4)], 0.9)
    s.stroke([(38, 26), (42, 20), (37, 15), (42, 10), (39, 4)], 0.9)
    s.stroke([(31, 25), (33, 19), (30, 14)], 0.7)
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


def evento_dragon():
    s = Svg('evento-dragon', seed=511)
    # a dragon egg nested among stones and embers
    egg = ell(32, 30, 14, 20, 12, -math.pi / 2)
    s.wash(egg, '#6a3a1a', 0.16)
    s.stroke(egg, 1.9, closed=True)
    s.hatch([(38, 12), (44, 20), (46, 32), (43, 44), (36, 50), (40, 32)], angle=40, gap=1.3, w=0.45)
    # scale pattern
    for row, y in enumerate((18, 25, 32, 39)):
        half = [8, 11, 12, 11][row]
        x = 32 - half + (row % 2) * 3.5
        while x < 32 + half - 3:
            s.stroke([(x, y), (x + 3.5, y + 3), (x + 7, y)], 0.6, taper=False, jitter=0.2)
            x += 7
    # glowing crack
    s.stroke([(30, 10), (33, 16), (29, 21), (34, 26)], 1.2, taper=False, color=RED)
    # nest of stones
    for x, y, r in [(12, 52, 5), (22, 55, 5.5), (32, 56, 5), (42, 55, 5.5), (52, 52, 5), (6, 58, 3.5), (58, 58, 3.5)]:
        s.ring(x, y, r, r * 0.6, w=1.0)
        s.line((x - r * 0.5, y + r * 0.3), (x + r * 0.4, y + r * 0.2), 0.5)
    # heat shimmer and sparks
    for x in (10, 54):
        s.stroke([(x, 42), (x - 2, 36), (x + 1, 30), (x - 1, 24)], 0.7)
    for x, y in [(16, 20), (48, 14), (50, 26)]:
        s.dot(x, y, 0.7, '#c9642a')
    s.save()


def descanso_dragon():
    s = Svg('descanso-dragon', seed=521)
    # a bed of glowing embers ringed by stones, no big flame: the lair's warmth
    s.wash(ell(32, 46, 24, 10, 12), '#c9642a', 0.18)
    coals = [(18, 46, 5), (26, 42, 5.5), (36, 42, 5), (45, 46, 5), (24, 50, 5), (34, 50, 5.5), (42, 52, 4)]
    s.wash(ell(32, 47, 20, 8, 10), '#8b1e12', 0.2)
    for i, (x, y, r) in enumerate(coals):
        pts = ell(x, y, r, r * 0.65, 6, 0.3)
        s.stroke(pts, 1.2, closed=True, n=2)
        if i in (4, 5):
            s.hatch(pts, angle=35, gap=1.5, w=0.4)
        s.line((x - r * 0.4, y), (x + r * 0.4, y - 0.5), 0.6, color=RED)
    # ring of stones
    for i in range(7):
        a = math.pi * (0.02 + 0.96 * i / 6)
        x, y = 32 - 27 * math.cos(a), 52 + 7 * math.sin(a)
        s.ring(x, y, 3, 2, w=0.9)
    # little tongues of flame and rising sparks
    for x, y in [(24, 38), (35, 37), (44, 41)]:
        fl = [(x - 2, y + 2), (x - 2.4, y - 2), (x, y - 6), (x + 2.4, y - 2), (x + 2, y + 2)]
        s.stroke(fl, 0.9, closed=True, n=2)
    for x, y in [(20, 28), (30, 22), (40, 26), (46, 18), (26, 12), (36, 8)]:
        s.dot(x, y, 0.8, '#c9642a')
    s.stroke([(30, 34), (28, 28), (32, 22)], 0.6)
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


def taberna_dragon():
    s = Svg('taberna-dragon', seed=541)
    # a curved drinking horn with metal bands, brimming with foam
    outer = [(10, 18), (14, 34), (24, 48), (40, 56), (54, 58), (60, 56)]
    inner = [(24, 12), (26, 28), (32, 40), (44, 48), (54, 52), (60, 56)]
    s.wash(outer + list(reversed(inner)), '#b8945a', 0.22)
    s.hatch(outer + list(reversed(inner)), angle=-40, gap=1.4, w=0.45)
    s.stroke(outer, 2.0, taper=False)
    s.stroke(inner, 1.6, taper=False)
    # metal bands and the rim
    for t in (0.3, 0.62):
        a = lerp(outer[1], outer[2], t) if t < 0.5 else lerp(outer[2], outer[3], t - 0.3)
        b = lerp(inner[1], inner[2], t) if t < 0.5 else lerp(inner[2], inner[3], t - 0.3)
        s.stroke([a, b], 2.2, taper=False)
    s.stroke([(10, 18), (17, 14), (24, 12)], 2.2, taper=False)
    s.stroke([(9, 21), (17, 16.5), (25, 15)], 1.0, taper=False)
    # tip cap
    s.stroke([(56, 56), (62, 54), (63, 58), (58, 59)], 1.2, closed=True)
    # foam spilling over
    foam = [(8, 17), (8, 11), (13, 8), (17, 3), (22, 6), (27, 4), (29, 10), (25, 13), (17, 13)]
    s.stroke(foam, 1.3, closed=True)
    s.stroke([(10, 18), (9, 24), (10.5, 26), (11.5, 22)], 0.8)
    for x, y in [(14, 9), (21, 8)]:
        s.ring(x, y, 1.2, w=0.5)
    # carrying strap
    s.stroke([(16, 30), (26, 22), (36, 22), (44, 30), (46, 44)], 0.9)
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


def evento_contemplador():
    s = Svg('evento-contemplador', seed=571)
    # a cluster of arcane crystals jutting from rock, humming with light
    for pts, sh in [
        ([(26, 54), (24, 22), (32, 6), (40, 22), (38, 54)], [(32, 6), (40, 22), (38, 54), (32, 54)]),
        ([(14, 56), (10, 36), (16, 26), (24, 38), (24, 56)], [(16, 26), (24, 38), (24, 56), (18, 56)]),
        ([(40, 56), (42, 34), (50, 26), (54, 40), (50, 56)], [(50, 26), (54, 40), (50, 56), (46, 56)]),
    ]:
        s.wash(pts, '#4a5a9a', 0.2)
        s.hatch(sh, angle=70, gap=1.2, w=0.45)
        s.stroke(pts, 1.7, closed=True)
    s.line((32, 6), (32, 54), 0.7)
    s.line((16, 26), (18, 56), 0.6)
    s.line((50, 26), (46, 56), 0.6)
    # rock at the base
    s.stroke([(4, 60), (10, 54), (24, 55), (32, 53), (42, 55), (54, 54), (60, 60)], 1.8)
    s.line((4, 60), (60, 60), 1.4)
    # sparkles and a rune spark
    for x, y, r in [(10, 14, 3.2), (52, 12, 2.6), (56, 30, 2)]:
        s.line((x - r, y), (x + r, y), 0.7)
        s.line((x, y - r), (x, y + r), 0.7)
    for a in range(-150, -20, 26):
        rr = math.radians(a)
        s.line((32 + 12 * math.cos(rr), 20 + 12 * math.sin(rr)), (32 + 16 * math.cos(rr), 20 + 16 * math.sin(rr)), 0.5)
    s.save()


def descanso_contemplador():
    s = Svg('descanso-contemplador', seed=581)
    # a protective circle of runes chalked on the floor
    s.ring(32, 32, 28, w=1.8)
    s.ring(32, 32, 22, w=1.0)
    s.ring(32, 32, 8, w=1.0)
    s.wash(ell(32, 32, 8, 8, 10), '#4a5a9a', 0.25)
    # hexagram of two triangles
    tri1 = [(32 + 22 * math.cos(a), 32 + 22 * math.sin(a)) for a in (-math.pi / 2, math.pi / 6, 5 * math.pi / 6)]
    tri2 = [(32 + 22 * math.cos(a), 32 + 22 * math.sin(a)) for a in (math.pi / 2, -math.pi / 6, 7 * math.pi / 6)]
    for t in (tri1, tri2):
        s.stroke(t + [t[0]], 1.1, taper=False)
    # rune marks between the rings
    glyphs = [[(-1.5, -2), (1.5, 0), (-1.5, 2)], [(-1.5, 2), (0, -2), (1.5, 2)], [(0, -2), (0, 2), (1.5, 0)],
              [(-1.5, -2), (1.5, -2), (-1.5, 2), (1.5, 2)]]
    for i in range(12):
        a = i * math.pi / 6 + math.pi / 12
        cx, cy = 32 + 25 * math.cos(a), 32 + 25 * math.sin(a)
        s.stroke([(cx + x, cy + y) for x, y in glyphs[i % 4]], 0.8, taper=False)
    # a sleeping eye at the heart
    s.stroke([(26, 32), (29, 34.5), (32, 35.3), (35, 34.5), (38, 32)], 1.2)
    for x in (28, 32, 36):
        s.line((x, 35), (x, 37.5), 0.6)
    # candles at three points
    for a in (-math.pi / 2, math.pi / 6, 5 * math.pi / 6):
        x, y = 32 + 28 * math.cos(a), 32 + 28 * math.sin(a)
        s.dot(x, y, 2.2, '#f0e2bc')
        s.ring(x, y, 2.2, w=0.8)
        s.dot(x, y, 0.8, '#c9642a')
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


def taberna_contemplador():
    s = Svg('taberna-contemplador', seed=601)
    # a round-bellied bottle whose draught glows in the dark
    for a in range(0, 360, 30):
        r = math.radians(a)
        s.line((32 + 22 * math.cos(r), 42 + 20 * math.sin(r)), (32 + 28 * math.cos(r), 42 + 25 * math.sin(r)), 0.6)
    flask = [(28, 20), (28, 28), (18, 34), (14, 44), (18, 54), (32, 60), (46, 54), (50, 44), (46, 34), (36, 28), (36, 20)]
    s.wash(flask, '#e8e0c0', 0.5)
    s.stroke(flask, 1.9, taper=False)
    s.stroke([(18, 54), (32, 60), (46, 54)], 1.9, taper=False)
    # liquid
    liquid = [(16, 44), (24, 41), (32, 43), (40, 41), (48, 44), (46, 53), (32, 58), (18, 53)]
    s.wash(liquid, '#3a8a9a', 0.45)
    s.stroke([(16, 44), (24, 41), (32, 43), (40, 41), (48, 44)], 1.0)
    s.hatch([(40, 42), (48, 44), (46, 53), (38, 57)], angle=60, gap=1.2, w=0.4)
    for x, y, r in [(26, 50, 1.6), (36, 47, 1.1), (30, 38, 1.0), (33, 32, 0.8)]:
        s.ring(x, y, r, w=0.5)
    # cork and neck bands
    s.stroke(box(27, 12, 37, 20), 1.4, closed=True)
    s.hatch(box(27, 12, 37, 20), angle=90, gap=1.4, w=0.4)
    s.line((27, 22), (37, 22), 1.0)
    # highlight
    s.stroke([(21, 38), (19, 44), (21, 49)], 1.0, color='#f5ecd0')
    s.save()


# ── the full per-scenario set ────────────────────────────────────────────────
SCENARIO_ICONS = [
    # Ogre Settlement (reuses the goblin, the campfire and the tankard)
    lambda: g.combate_acto1('combate-ogro'), elite_ogro, evento_ogro,
    lambda: g.descanso('descanso-ogro'), cofre_ogro, lambda: g.taberna('taberna-ogro'),
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
