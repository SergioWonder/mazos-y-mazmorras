"""Combat background «Laberinto del Contemplador» (Act III): the heart of the labyrinth.

A carved-stone gallery seen from floor level. Ashlar walls with carved eyes and faint runes,
turquoise and violet arcane crystals growing out of the rock, adventurers turned to stone
with faces of terror, side passages of the maze, and a great arch at the back that opens on
a void where a stone causeway keeps going through gate after gate, each one twisted a little
more than the last (an impossible corridor, but in frontal perspective). Behind the gates,
veiled by the mist, the giant eye of the Beholder looks out of the darkness. The main light
is a warm arcane orb hanging from chains at the top left, behind the hero.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paint_kit import (STD_DEFS, Camera, Canvas, blur, blur_hdr, fbm, finish, hexc, jitter,  # noqa: E402
                       mix, mockup, pts, radial, render, save_webp, to_f)

ORB = (255, 150, 110)
TURQ = (70, 225, 205)
VIOL = (165, 105, 245)

FORMATS = {
    "wide": dict(W=1920, H=1080, cam=dict(vpx=0.53, vpy=0.50, yn=1.05, yb=0.655, bw=0.21, vt=0.20, ys=0.40),
                 orb=(0.22, 0.25, 2.2), eye=(0.548, 0.30, 205),
                 statues=[(0.315, 3.0, "shield", 1), (0.745, 3.25, "kneel", -1), (0.83, 2.75, "flee", -1)],
                 suffix="", max_kb=380),
    "tall": dict(W=1080, H=1440, cam=dict(vpx=0.50, vpy=0.52, yn=1.04, yb=0.66, bw=0.35, vt=0.24, ys=0.42),
                 orb=(0.22, 0.25, 2.5), eye=(0.505, 0.33, 170),
                 statues=[(0.16, 3.0, "shield", 1), (0.83, 3.2, "kneel", -1)],
                 suffix="-movil", max_kb=300),
}

C = dict(
    wall=(52, 48, 66), wall_r=(48, 45, 62), back=(46, 43, 60), ceil=(30, 28, 40), floor=(33, 31, 42),
    mortar=(20, 18, 27), trim=(62, 58, 78), trim_side=(36, 33, 47), void=(10, 8, 18), statue=(84, 84, 96),
    statue_dark=(50, 50, 62), bronze=(70, 52, 40), iron=(24, 22, 30),
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def stone_courses(cv, rng, quad_fn, u0, u1, v0, v1, course_h, block_w, base, var=0.14, z=5.0, gap=0.012):
    """Fills a planar region with staggered ashlar blocks. quad_fn maps (u, v) to screen."""
    v = v0
    row = 0
    while v < v1 - 1e-6:
        h = min(course_h * rng.uniform(0.85, 1.15), v1 - v)
        u = u0 - (block_w * 0.5 if row % 2 else 0) * rng.uniform(0.3, 1)
        while u < u1 - 1e-6:
            w = block_w * rng.uniform(0.5, 1.4)
            a, b = max(u, u0), min(u + w, u1)
            if b - a > 0.04:
                col = jitter(base, var, rng)
                if rng.random() < 0.05:
                    col = mix(col, (40, 70, 72), 0.25)  # a touch of arcane lichen
                q = [quad_fn(a + gap, v + gap), quad_fn(b - gap, v + gap),
                     quad_fn(b - gap, v + h - gap), quad_fn(a + gap, v + h - gap)]
                cv.poly(q, col, z)
            u += w
        v += h
        row += 1


def box(cv, cam, x0, x1, y0, y1, z0, z1, front, side, top):
    """Axis-aligned box; draws only the faces that face the camera."""
    P = cam.p
    if x1 < 0:
        cv.poly([P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)], side, z0)
    if x0 > 0:
        cv.poly([P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], side, z0)
    if y0 > 0:
        cv.poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], top, z0)
    if y1 < 0:
        cv.poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], side, z0)
    cv.poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], front, z0)


def almond(fn, cu, cv_, ru, rv, n=24):
    """Almond (eye) outline in plane coordinates, mapped through fn."""
    top = [fn(cu - ru + 2 * ru * i / n, cv_ - rv * math.sin(math.pi * i / n) ** 0.8) for i in range(n + 1)]
    bot = [fn(cu + ru - 2 * ru * i / n, cv_ + rv * math.sin(math.pi * i / n) ** 0.9) for i in range(1, n)]
    return top + bot


def ellipse_on(fn, cu, cv_, ru, rv, n=20):
    return [fn(cu + ru * math.cos(2 * math.pi * i / n), cv_ + rv * math.sin(2 * math.pi * i / n)) for i in range(n)]


def carved_eye(cv, fn, cu, cv_, ru, z, stone, glow=None, glow_op=0.0, look=0.0):
    """A carved eye relief on a plane: socket, lids, iris and slit pupil. Optional faint glow in the iris."""
    rv = ru * 0.46
    cv.poly(almond(fn, cu, cv_, ru * 1.28, rv * 1.55), mix(stone, (0, 0, 0), 0.45), z)            # socket shadow
    lid = almond(fn, cu, cv_, ru * 1.14, rv * 1.3)
    cv.poly(lid, mix(stone, (255, 240, 230), 0.12), z)                                              # upper lid ridge
    cv.poly(almond(fn, cu, cv_ + rv * 0.08, ru, rv), mix(stone, (0, 0, 0), 0.25), z)               # eyeball
    iris = ellipse_on(fn, cu + look * ru * 0.35, cv_ + rv * 0.1, ru * 0.36, rv * 0.78)
    cv.poly(iris, mix(stone, (0, 0, 0), 0.5), z)
    pupil = ellipse_on(fn, cu + look * ru * 0.35, cv_ + rv * 0.1, ru * 0.07, rv * 0.7, 12)
    cv.poly(pupil, (8, 7, 12), z)
    if glow:
        cv.glow('<polygon points="%s" fill="%s" opacity="%.2f" filter="url(#blur5)"/>' % (
            pts(iris), hexc(glow), glow_op),
            '<polygon points="%s" fill="%s" opacity="%.2f"/>' % (pts(iris), hexc(mix(glow, stone, 0.5)), glow_op))
    # lower lid line
    lo = [fn(cu - ru + 2 * ru * i / 16, cv_ + rv * 1.05 * math.sin(math.pi * i / 16)) for i in range(17)]
    cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity="0.7"/>' % (
        pts(lo), hexc(mix(stone, (255, 240, 230), 0.2))))


RUNES = [
    [(0, 0), (0, 1), (0.5, 0.5)], [(0, 1), (0.25, 0), (0.5, 1)], [(0, 0.2), (0.5, 0.2), (0.25, 1)],
    [(0.1, 0), (0.1, 1), (0.5, 0.7)], [(0, 0.5), (0.5, 0), (0.5, 1)], [(0.25, 0), (0.25, 1), (0, 0.4), (0.5, 0.6)],
    [(0, 0), (0.5, 1), (0, 1), (0.5, 0)], [(0.1, 1), (0.1, 0.2), (0.45, 0.2), (0.45, 0.6)],
]


def rune_band(cv, rng, fn, u0, u1, v, size, colour, op, z):
    """A band of faint glowing runes along a plane."""
    u = u0
    d = ""
    while u < u1 - size:
        g = rng.choice(RUNES)
        seq = [fn(u + gx * size, v + gy * size * 1.6) for gx, gy in g]
        d += "M%.1f,%.1f " % seq[0] + " ".join("L%.1f,%.1f" % p for p in seq[1:]) + " "
        u += size * rng.uniform(0.8, 1.3)
    cv.paint('<path d="%s" fill="none" stroke="#0c0a12" stroke-width="2.2" opacity="0.6"/>' % d)
    cv.glow('<path d="%s" fill="none" stroke="%s" stroke-width="1.6" opacity="%.2f"/>' % (d, hexc(colour), op),
            '<path d="%s" fill="none" stroke="%s" stroke-width="1.3" opacity="%.2f"/>' % (
                d, hexc(mix(colour, (40, 40, 60), 0.3)), op * 0.9))


def crystal_cluster(cv, rng, bx, by, s, colour, strength, z, lean=0.0, n=5):
    """Cluster of faceted arcane crystals growing from (bx, by). s = size in pixels."""
    dark = mix(colour, (10, 8, 20), 0.62)
    lite = mix(colour, (255, 255, 255), 0.15)
    shards = []
    for i in range(n):
        a = lean + (i - (n - 1) / 2) * 0.32 + rng.uniform(-0.12, 0.12)
        L = s * rng.uniform(0.45, 1.0) * (1.0 if i == n // 2 else 0.8)
        w = s * rng.uniform(0.09, 0.15)
        ox = bx + (i - (n - 1) / 2) * s * 0.1
        tip = (ox + math.sin(a) * L, by - math.cos(a) * L)
        nx, ny = math.cos(a) * w, math.sin(a) * w
        mid = (ox + math.sin(a) * L * 0.78, by - math.cos(a) * L * 0.78)
        shards.append((L, [(ox - nx, by - ny), (mid[0] - nx, mid[1] - ny), tip, (mid[0] + nx, mid[1] + ny),
                           (ox + nx, by + ny)], (ox, by), tip))
    shards.sort(key=lambda t: t[0])
    for L, poly, base, tip in shards:
        cv.poly(poly, dark, z)
        half = [poly[0], poly[1], poly[2], base] if rng.random() < 0.5 else [base, poly[2], poly[3], poly[4]]
        cv.paint('<polygon points="%s" fill="%s" opacity="0.8"/>' % (pts(half), hexc(mix(colour, dark, 0.35))))
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.7"/>' % (
            base[0], base[1], tip[0], tip[1], hexc(lite)))
        cv.glow('<polygon points="%s" fill="%s" opacity="%.2f" filter="url(#blur2)"/>' % (
            pts(poly), hexc(colour), 0.55 * strength))
    cv.glow('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" opacity="%.2f" filter="url(#blur30)"/>' % (
        bx, by - s * 0.4, s * 0.9, s * 0.7, hexc(colour), 0.28 * strength))


def statue(cv, rng, bx, by, s, pose, flip, z, stone=C["statue"], dark=C["statue_dark"], face=True):
    """A petrified adventurer frozen in terror. (bx, by) is the foot point, s = pixels per unit (height ~1.75)."""
    def T(x, y):
        return (bx + flip * x * s, by + y * s)

    def limb(seq, w, col=stone):
        cv.solid("polyline", 'points="%s"' % pts([T(*p) for p in seq]), "none", z, stroke=col, sw=w * s)

    def poly(seq, col=stone):
        cv.poly([T(*p) for p in seq], col, z)

    # rubble base where the feet fused with the floor
    poly([(-0.42, 0.02), (-0.3, -0.07), (0.3, -0.08), (0.45, 0.02)], dark)
    if pose == "shield":
        poly([(-0.36, -1.36), (-0.52, -0.35), (-0.4, -0.12), (-0.1, -0.85)], dark)          # cloak
        limb([(-0.14, -0.02), (-0.1, -0.45), (-0.06, -0.82)], 0.13)                           # legs, stepping back
        limb([(0.24, -0.02), (0.14, -0.42), (0.06, -0.82)], 0.13)
        poly([(-0.2, -0.8), (0.18, -0.8), (0.16, -1.36), (-0.24, -1.38)])                      # torso
        poly([(-0.2, -0.8), (0.18, -0.8), (0.2, -0.66), (-0.22, -0.66)], dark)                 # belt / tunic hem
        limb([(-0.2, -1.3), (-0.34, -1.02), (-0.3, -0.76)], 0.09)                              # sword arm
        limb([(-0.3, -0.76), (-0.1, -0.1)], 0.035, dark)                                       # sword
        limb([(0.16, -1.32), (0.36, -1.5), (0.16, -1.74)], 0.09)                               # arm raised to the face
        poly([(0.28, -1.95), (0.5, -1.72), (0.4, -1.4), (0.2, -1.5)], mix(stone, dark, 0.3))   # small shield
        head = (-0.02, -1.52)
    elif pose == "kneel":
        limb([(-0.3, -0.02), (-0.18, -0.36), (0.12, -0.38)], 0.13)                             # kneeling leg
        limb([(0.14, -0.02), (0.2, -0.36), (0.04, -0.62)], 0.13)
        poly([(-0.16, -0.6), (0.2, -0.62), (0.12, -1.14), (-0.26, -1.1)])
        poly([(-0.3, -1.14), (-0.46, -0.3), (-0.2, -0.5)], dark)                               # hood / cloak
        limb([(0.1, -1.08), (0.32, -1.18), (0.3, -1.46)], 0.085)                               # both hands raised
        limb([(-0.18, -1.06), (0.04, -1.24), (0.16, -1.5)], 0.085)
        poly([(0.26, -1.52), (0.34, -1.62), (0.38, -1.5)], stone)
        head = (-0.08, -1.3)
    else:  # flee: turning away, one arm reaching back
        limb([(-0.3, -0.02), (-0.14, -0.42), (0.0, -0.8)], 0.13)
        limb([(0.28, -0.06), (0.2, -0.4), (0.12, -0.8)], 0.13)
        poly([(-0.14, -0.8), (0.22, -0.78), (0.14, -1.34), (-0.22, -1.3)])
        limb([(0.12, -1.28), (0.44, -1.2), (0.7, -1.3)], 0.085)                                # reaching out
        limb([(-0.18, -1.26), (-0.36, -0.98), (-0.5, -0.9)], 0.085)
        poly([(-0.24, -1.3), (-0.56, -0.9), (-0.44, -0.5), (-0.12, -0.9)], dark)               # satchel / cape
        head = (0.02, -1.48)
    hx, hy = head
    cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (*T(hx, hy), 0.12 * s, 0.145 * s), stone, z)
    if pose == "shield":   # open helmet with a crest
        poly([(hx - 0.14, hy - 0.02), (hx - 0.13, hy - 0.12), (hx, hy - 0.2), (hx + 0.13, hy - 0.12), (hx + 0.14, hy - 0.02),
              (hx + 0.1, hy - 0.08), (hx - 0.1, hy - 0.08)], dark)
        poly([(hx - 0.02, hy - 0.19), (hx + 0.02, hy - 0.19), (hx - 0.12, hy - 0.34), (hx - 0.16, hy - 0.3)], stone)
    elif pose == "kneel":  # hood
        poly([(hx - 0.16, hy + 0.12), (hx - 0.15, hy - 0.1), (hx, hy - 0.2), (hx + 0.15, hy - 0.1), (hx + 0.13, hy - 0.04),
              (hx + 0.1, hy - 0.1), (hx - 0.1, hy - 0.1), (hx - 0.11, hy + 0.1)], dark)
    else:                  # travelling hat
        poly([(hx - 0.22, hy - 0.08), (hx + 0.22, hy - 0.1), (hx + 0.1, hy - 0.14), (hx + 0.03, hy - 0.3),
              (hx - 0.1, hy - 0.14)], dark)
    for sx_ in (-1, 1):    # shoulders
        cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (
            *T(sx_ * 0.19 + (hx if pose == "kneel" else 0) * 0.5, hy + 0.2), 0.07 * s, 0.05 * s), stone, z)
    if not face:
        return
    # face of terror: wide eyes, raised brows, screaming mouth
    for ex in (-0.045, 0.045):
        cv.paint('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#16141c"/>' % (*T(hx + ex, hy - 0.02), 0.024 * s))
        a, b = T(hx + ex - 0.03 * (1 if ex < 0 else -1), hy - 0.05), T(hx + ex + 0.03 * (1 if ex < 0 else -1), hy - 0.08)
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1c1a22" stroke-width="%.1f"/>' % (
            a[0], a[1], b[0], b[1], max(1, 0.012 * s)))
    cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#121018"/>' % (*T(hx, hy + 0.07), 0.03 * s, 0.045 * s))
    # shading on the side away from the orb (left light: shade the right)
    cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#000" opacity="0.28"/>' % (
        *T(hx + 0.07 * flip, hy + 0.02), 0.07 * s, 0.13 * s))
    # cracks and a crystal sprouting from the shoulder
    for _ in range(5):
        x, y = rng.uniform(-0.2, 0.2), rng.uniform(-1.4, -0.2)
        d = "M%.1f,%.1f" % T(x, y)
        for _ in range(3):
            x += rng.uniform(-0.08, 0.08)
            y += rng.uniform(0.02, 0.12)
            d += " L%.1f,%.1f" % T(x, y)
        cv.paint('<path d="%s" fill="none" stroke="#1d1b24" stroke-width="%.1f" opacity="0.8"/>' % (d, max(0.8, s * 0.008)))
    # moss of dust on top surfaces
    cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" opacity="0.07"/>' % (
        *T(hx - 0.03, hy - 0.09), 0.08 * s, 0.04 * s))


def chain(cv, x0, y0, x1, y1, link, z):
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / link))
    for i in range(n):
        t = (i + 0.5) / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if i % 2 == 0:
            cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (x, y, link * 0.32, link * 0.6), "none", z,
                     stroke=C["iron"], sw=max(1.2, link * 0.16))
        else:
            cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (x, y - link * 0.5, x, y + link * 0.5), "none", z,
                     stroke=C["iron"], sw=max(1.2, link * 0.2))


# ---------------------------------------------------------------------------
# scene
# ---------------------------------------------------------------------------
def build(fmt, seed=11):
    rng = random.Random(seed)
    W, H = fmt["W"], fmt["H"]
    cam = Camera(W, H, **fmt["cam"])
    P = cam.p
    Wr, Zb, Yc = cam.Wr, cam.Zb, cam.Yc
    k0 = min(W / 1920, H / 1080) ** 0.5
    cv = Canvas(W, H)
    cv.defs.append(STD_DEFS)
    cv.defs.append(
        '<radialGradient id="voidg" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#1b1430"/>'
        '<stop offset="0.6" stop-color="#0f0b1c"/><stop offset="1" stop-color="#07060d"/></radialGradient>'
        '<radialGradient id="irisg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#44283a"/>'
        '<stop offset="0.55" stop-color="#3f2340"/><stop offset="1" stop-color="#1b1226"/></radialGradient>'
        '<radialGradient id="bodyg" cx="0.42" cy="0.38" r="0.62"><stop offset="0" stop-color="#2a2038"/>'
        '<stop offset="0.8" stop-color="#150f22"/><stop offset="1" stop-color="#0d0916"/></radialGradient>'
        '<radialGradient id="orbg" cx="0.4" cy="0.38" r="0.6"><stop offset="0" stop-color="#fff0e0"/>'
        '<stop offset="0.35" stop-color="#ffb58e"/><stop offset="1" stop-color="#c0583e"/></radialGradient>')

    # ---- the void beyond the great arch ----------------------------------------------
    cv.solid("rect", 'x="0" y="0" width="%d" height="%d"' % (W, H), C["void"], 12.0)
    cv.paint('<rect x="0" y="0" width="%d" height="%d" fill="url(#voidg)"/>' % (W, H))

    # the Beholder: a huge dark body with eye stalks and one great eye, deep in the darkness
    ex, ey, erx = fmt["eye"][0] * W, fmt["eye"][1] * H, fmt["eye"][2] * k0 * (1.0 if W > H else 1.15)
    R = erx * 1.9
    cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (ex, ey + erx * 0.25, R), (18, 13, 28), 11.0)
    cv.paint('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#bodyg)"/>' % (ex, ey + erx * 0.25, R))
    for i in range(7):
        a = -math.pi / 2 + (i - 3) * 0.33 + rng.uniform(-0.06, 0.06)
        sx, sy = ex + math.cos(a) * R * 0.85, ey + erx * 0.25 + math.sin(a) * R * 0.85
        L = R * rng.uniform(0.55, 0.85)
        bend = rng.uniform(-0.6, 0.6)
        tx, ty = sx + math.cos(a + bend * 0.5) * L, sy + math.sin(a + bend * 0.5) * L
        cx_, cy_ = sx + math.cos(a - bend) * L * 0.6, sy + math.sin(a - bend) * L * 0.6
        cv.solid("path", 'd="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f"' % (sx, sy, cx_, cy_, tx, ty), "none", 11.0,
                 stroke=(20, 15, 31), sw=R * 0.07)
        cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (tx, ty, R * 0.075), (24, 18, 36), 11.0)
        cv.paint('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#3a2436" opacity="0.8"/>' % (tx, ty, R * 0.035))
    # the great eye
    lid = [(ex - erx * 1.25 + 2.5 * erx * i / 30, ey - erx * 0.62 * math.sin(math.pi * i / 30) ** 0.8) for i in range(31)]
    lid += [(ex + erx * 1.25 - 2.5 * erx * i / 30, ey + erx * 0.55 * math.sin(math.pi * i / 30) ** 0.9) for i in range(1, 30)]
    cv.poly(lid, (26, 18, 34), 10.5)
    cv.paint('<polygon points="%s" fill="#33273a" opacity="0.9"/>' % pts(lid))
    upper = [(ex - erx * 1.3 + 2.6 * erx * i / 30, ey - erx * 0.66 * math.sin(math.pi * i / 30) ** 0.8) for i in range(31)]
    fold = [(ex + erx * 1.2 - 2.4 * erx * i / 30, ey - erx * 0.9 * math.sin(math.pi * i / 30) ** 0.7) for i in range(31)]
    cv.poly(upper + fold, (30, 22, 40), 10.5)
    lower = [(ex - erx * 1.25 + 2.5 * erx * i / 30, ey + erx * 0.55 * math.sin(math.pi * i / 30) ** 0.9) for i in range(31)]
    lfold = [(ex + erx * 1.15 - 2.3 * erx * i / 30, ey + erx * 0.72 * math.sin(math.pi * i / 30) ** 0.8) for i in range(31)]
    cv.poly(lower + lfold, (24, 18, 33), 10.5)
    for j in range(9):  # veins in the sclera
        a = math.pi * (0.1 + 0.8 * j / 8)
        x0, y0 = ex + math.cos(a) * erx * 1.1 * (1 if j % 2 else -1), ey + rng.uniform(-0.2, 0.2) * erx
        cv.paint('<path d="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" fill="none" stroke="#4a2233" stroke-width="1.5" opacity="0.7"/>' % (
            x0, y0, (ex - x0) * 0.3, rng.uniform(-10, 10), (ex - x0) * 0.5, rng.uniform(-8, 8)))
    cv.paint('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#irisg)"/>' % (ex - erx * 0.05, ey + erx * 0.02, erx * 0.5))
    cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#07050b"/>' % (ex - erx * 0.05, ey + erx * 0.02,
                                                                                  erx * 0.09, erx * 0.44))
    cv.paint('<polyline points="%s" fill="none" stroke="#0a0710" stroke-width="%.1f" opacity="0.9"/>' % (
        pts(lid[:31]), erx * 0.08))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#7a3a5a" opacity="0.10" filter="url(#blur30)"/>' % (
        ex, ey, erx * 0.9))
    # banks of mist drifting in front of the eye
    for j in range(7):
        mx = ex + rng.uniform(-0.9, 0.9) * erx
        my = ey + (-0.55 + 1.3 * j / 6) * erx + rng.uniform(-0.08, 0.08) * erx
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#56496c" opacity="%.2f" filter="url(#blur12)"/>' % (
            mx, my, erx * rng.uniform(1.1, 1.9), erx * rng.uniform(0.07, 0.14), rng.uniform(0.35, 0.55)))

    # ---- the twisting causeway with its gates, far to near ------------------------------
    gates = []
    Zg = Zb + 0.9
    while Zg < 34:
        gates.append(Zg)
        Zg *= 1.3
    twist = 8.0 if W > H else 7.0
    half = 0.8
    seg_bounds = [Zb] + gates
    for i in range(len(gates) - 1, -1, -1):
        za, zg = seg_bounds[i], gates[i]
        ang = twist * (i + 1) * (1 if i % 2 == 0 else 1.15)
        fx, fy = P(0, 1, za)
        cv.open("", 'transform="rotate(%.2f %.1f %.1f)"' % (ang, fx, fy))
        # causeway slab from za to zg, with its dark side faces over the abyss
        cv.poly([P(-half, 1, za), P(half, 1, za), P(half, 1, zg), P(-half, 1, zg)], jitter(C["floor"], 0.06, rng), za)
        for sd in (-1, 1):
            cv.poly([P(sd * half, 1, za), P(sd * half, 1, zg), P(sd * half, 1.35, zg), P(sd * half, 1.35, za)],
                    (16, 14, 22), za)
        cv.poly([P(-half, 1, za), P(half, 1, za), P(half, 1.35, za), P(-half, 1.35, za)], (22, 20, 30), za)
        # maze walls standing on the slab, alternating sides like a winding corridor
        sd = -1 if i % 2 == 0 else 1
        wz0, wz1 = za + (zg - za) * 0.15, zg - 0.05
        cv.poly([P(sd * half * 0.9, 1, wz0), P(sd * half * 0.9, 1, wz1), P(sd * half * 0.9, -0.25, wz1),
                 P(sd * half * 0.9, -0.25, wz0)], jitter(C["wall"], 0.08, rng), wz0)
        cv.poly([P(sd * half * 0.9, -0.25, wz0), P(sd * half * 0.9, -0.25, wz1), P(sd * half * 0.7, -0.25, wz1),
                 P(sd * half * 0.7, -0.25, wz0)], C["trim"], wz0)
        # the gate: two posts and an arch
        t = 0.16
        for sx in (-1, 1):
            box(cv, cam, sx * half - (t if sx > 0 else 0), sx * half + (t if sx < 0 else 0), -0.3, 1, zg, zg + 0.2,
                jitter(C["trim"], 0.06, rng), C["trim_side"], C["trim"])
        outer = [P(-half * math.cos(math.pi * j / 20), -0.3 - 0.65 * math.sin(math.pi * j / 20), zg) for j in range(21)]
        inner = [P(-(half - t) * math.cos(math.pi * j / 20), -0.3 - (0.65 - t) * math.sin(math.pi * j / 20), zg)
                 for j in range(21)]
        cv.poly(outer + inner[::-1], jitter(C["trim"], 0.06, rng), zg, stroke=C["mortar"], sw=0.8)
        kx, ky = P(0, -0.87, zg)
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#0b0912" opacity="0.8"/>' % (
            kx, ky, cam.scale(zg) * 0.07, cam.scale(zg) * 0.035))
        # a faint turquoise rune on the keystone
        cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" opacity="0.35" filter="url(#blur2)"/>' % (
            kx, ky, max(1.2, cam.scale(zg) * 0.03), hexc(TURQ)))
        cv.close()

    # ---- back wall with the great arch ---------------------------------------------------
    Ao, spring, crown = Wr * 0.8, -0.15, Yc * 0.93
    arch = [P(-Ao, 1, Zb), P(-Ao, spring, Zb)]
    arch += [P(-Ao * math.cos(math.pi * j / 40), spring - (spring - crown) * math.sin(math.pi * j / 40), Zb)
             for j in range(1, 40)]
    arch += [P(Ao, spring, Zb), P(Ao, 1, Zb)]
    wall = [P(-Wr, 1, Zb), P(-Wr, Yc, Zb), P(Wr, Yc, Zb), P(Wr, 1, Zb)]
    d = "M" + " L".join("%.1f,%.1f" % p for p in wall) + " Z M" + " L".join("%.1f,%.1f" % p for p in arch) + " Z"
    cv.defs.append('<clipPath id="backwall"><path clip-rule="evenodd" d="%s"/></clipPath>' % d)
    cv.path(d, C["mortar"], Zb, extra='fill-rule="evenodd"')
    cv.open('filter="url(#rock)"', 'clip-path="url(#backwall)"')
    stone_courses(cv, rng, lambda u, v: P(u, v, Zb), -Wr, Wr, Yc, 1.0, 0.3, 0.75, C["back"], z=Zb)
    cv.close()
    # voussoirs framing the great arch
    nv = 23
    for j in range(nv):
        a0, a1 = math.pi * j / nv, math.pi * (j + 1) / nv

        def ap(a, o):
            return P(-(Ao + o) * math.cos(a), spring - (spring - crown + o) * math.sin(a), Zb)
        big = j == nv // 2
        o = 0.34 if big else 0.22
        cv.poly([ap(a0, 0), ap(a1, 0), ap(a1, o), ap(a0, o)], jitter(C["trim"], 0.08, rng), Zb,
                stroke=C["mortar"], sw=1.4)
    # jambs
    for sd in (-1, 1):
        x0, x1 = (sd * Ao, sd * (Ao + 0.22))
        cv.poly([P(x0, spring, Zb), P(x1, spring, Zb), P(x1, 1, Zb), P(x0, 1, Zb)], jitter(C["trim"], 0.05, rng), Zb)
        cv.poly([P(x0, spring, Zb), P(x0, 1, Zb), P(x0, 1, Zb + 0.35), P(x0, spring, Zb + 0.35)], C["trim_side"], Zb)
    # the soffit under the arch (thickness of the wall)
    soff_a = [P(-Ao * math.cos(math.pi * j / 40), spring - (spring - crown) * math.sin(math.pi * j / 40), Zb)
              for j in range(41)]
    soff_b = [P(-Ao * math.cos(math.pi * j / 40), spring - (spring - crown) * math.sin(math.pi * j / 40), Zb + 0.35)
              for j in range(41)]
    cv.poly(soff_a + soff_b[::-1], (24, 21, 33), Zb)
    # carved eye in the keystone and on the piers
    fnb = lambda u, v: P(u, v, Zb)  # noqa: E731
    carved_eye(cv, fnb, 0, crown - 0.17, 0.2, Zb, C["trim"], TURQ, 0.35)
    for sd in (-1, 1):
        carved_eye(cv, fnb, sd * (Ao + (Wr - Ao) * 0.55), -0.95, 0.17, Zb, C["back"],
                   TURQ if sd < 0 else VIOL, 0.3 if sd < 0 else 0.14, look=-sd * 0.6)
    rune_band(cv, rng, fnb, -Wr + 0.05, -Ao - 0.28, 0.25, 0.1, TURQ, 0.35, Zb)
    rune_band(cv, rng, fnb, Ao + 0.28, Wr - 0.05, 0.25, 0.1, VIOL, 0.18, Zb)

    # ---- ceiling --------------------------------------------------------------------------
    z_near = 1.02
    ceil = [P(-Wr, Yc, z_near), P(Wr, Yc, z_near), P(Wr, Yc, Zb), P(-Wr, Yc, Zb)]
    cv.poly(ceil, C["mortar"], 2.0)
    cv.open('filter="url(#rock)"')
    stone_courses(cv, rng, lambda u, v: P(u, Yc, v), -Wr, Wr, z_near, Zb, 0.4, 0.9, C["ceil"], z=2.0)
    cv.close()

    # ---- side walls --------------------------------------------------------------------
    doors = {-1: (2.55, 3.15), 1: (2.35, 3.0)} if W > H else {-1: (2.6, 3.2), 1: (2.4, 3.1)}
    for side in (-1, 1):
        Xw = side * Wr
        fn = (lambda Xw_: (lambda u, v: P(Xw_, v, u)))(Xw)
        quad = [fn(z_near, Yc), fn(Zb, Yc), fn(Zb, 1), fn(z_near, 1)]
        cv.poly(quad, C["mortar"], 2.2)
        cv.open('filter="url(#rock)"')
        stone_courses(cv, rng, fn, z_near, Zb, Yc, 1.0, 0.3, 0.62, C["wall"] if side < 0 else C["wall_r"], z=2.4)
        cv.close()
        # a side passage of the maze, dark, with a few steps of corridor visible
        da, db = doors[side]
        top = -0.5
        door = [fn(da, 1), fn(da, top)]
        door += [fn(da + (db - da) * (0.5 - 0.5 * math.cos(math.pi * j / 12)), top - 0.45 * math.sin(math.pi * j / 12))
                 for j in range(1, 12)]
        door += [fn(db, top), fn(db, 1)]
        cv.poly(door, (9, 8, 14), (da + db) / 2 + 1.5)
        cv.defs.append('<linearGradient id="doorg%d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050409"/>'
                       '<stop offset="1" stop-color="#1a1626"/></linearGradient>' % (side + 1))
        cv.paint('<polygon points="%s" fill="url(#doorg%d)"/>' % (pts(door), side + 1))
        for j in range(12):
            a0, a1 = math.pi * j / 12, math.pi * (j + 1) / 12

            def dp(a, o):
                return fn(da + (db - da) * (0.5 - 0.5 * math.cos(a)) - o * math.cos(a) * 0.4,
                          top - (0.45 + o) * math.sin(a))
            cv.poly([dp(a0, 0), dp(a1, 0), dp(a1, 0.13), dp(a0, 0.13)], jitter(C["trim"], 0.1, rng), da,
                    stroke=C["mortar"], sw=1)
        # carved eyes along the wall, at eye level of the statues, and runes below the ceiling
        for (zc, yc, r) in ((1.6, -0.95, 0.12), (1.85, 0.05, 0.1), (3.2, -0.9, 0.15)):
            if not (da - 0.2 < zc < db + 0.2):
                glow = TURQ if side < 0 else VIOL
                carved_eye(cv, fn, zc, yc, r, zc, C["wall"], glow, 0.2 if side < 0 else 0.08, look=0.5)
        rune_band(cv, rng, fn, z_near + 0.2, Zb - 0.1, Yc + 0.22, 0.08, TURQ if side < 0 else VIOL,
                  0.3 if side < 0 else 0.14, 2.5)
        # plinth along the base of the wall
        cv.poly([fn(z_near, 0.84), fn(Zb, 0.84), fn(Zb, 1), fn(z_near, 1)], mix(C["trim"], C["mortar"], 0.35), 2.0)
        cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.4" opacity="0.6"/>' % (
            pts([fn(z_near, 0.84), fn(Zb, 0.84)]), hexc(mix(C["trim"], ORB, 0.15))))

    # ---- floor ---------------------------------------------------------------------------
    cv.poly([P(-Wr, 1, z_near), P(Wr, 1, z_near), P(Wr, 1, Zb), P(-Wr, 1, Zb)], C["mortar"], 2.0)
    cv.open('filter="url(#rockfine)"')
    zf = [z_near]
    while zf[-1] < Zb:
        zf.append(min(Zb, zf[-1] * 1.1))
    for i in range(len(zf) - 1):
        za, zb2 = zf[i], zf[i + 1]
        calm = max(0.0, min(1.0, (za - 1.9) / 1.0))
        X = -Wr - (0.3 if i % 2 else 0)
        while X < Wr:
            w = 0.6 * rng.uniform(0.85, 1.15)
            a, b = max(X, -Wr), min(X + w, Wr)
            g = 0.008 + 0.012 * calm
            col = jitter(C["floor"], 0.03 + 0.08 * calm, rng)
            cv.poly([P(a + g, 1, za + g * 0.6), P(b - g, 1, za + g * 0.6), P(b - g, 1, zb2 - g * 0.6),
                     P(a + g, 1, zb2 - g * 0.6)], col, za)
            X += w
    cv.close()
    # the threshold of the great arch, with a worn maze inlay leading into the causeway
    cv.poly([P(-half, 1, Zb - 0.6), P(half, 1, Zb - 0.6), P(half, 1, Zb), P(-half, 1, Zb)], (38, 35, 50), Zb - 0.3)
    for j in range(5):
        Zl = Zb - 0.55 + j * 0.11
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#15121d" stroke-width="1.2"/>' % (
            *P(-half + (0.15 if j % 2 else 0), 1, Zl), *P(half - (0 if j % 2 else 0.2), 1, Zl)))

    # ---- crystals and statues (mid-ground) ----------------------------------------------
    s_unit = lambda Z: cam.scale(Z)  # noqa: E731
    crystals = [(-Wr + 0.02, 1, 3.3, 0.45, VIOL, 0.6, 0.4),
                (-Ao - 0.1, 1, Zb - 0.05, 0.35, TURQ, 0.55, -0.2), (Ao + 0.12, 1, Zb - 0.05, 0.32, VIOL, 0.28, 0.3),
                (Wr - 0.05, 1, 3.4, 0.4, TURQ, 0.15, -0.4)]
    for (X, Y, Z, size, colr, st, lean) in crystals:
        bx, by = P(X, Y, Z)
        crystal_cluster(cv, rng, bx, by, s_unit(Z) * size, colr, st, Z, lean)
    # crystals growing out of the wall high on the left, near the orb, and on the right
    for (X, Y, Z, size, colr, st, lean) in ((-Wr, -1.3, 2.9, 0.3, TURQ, 0.7, 1.4), (Wr, -1.2, 2.7, 0.28, VIOL, 0.2, -1.4),
                                            (-Wr, -0.3, 3.35, 0.22, VIOL, 0.5, 1.3), (-Wr, 0.35, 1.7, 0.3, TURQ, 0.35, 1.3)):
        bx, by = P(X, Y, Z)
        crystal_cluster(cv, rng, bx, by, s_unit(Z) * size, colr, st, Z, lean, n=4)
    for (xf, Z, pose, flip) in fmt["statues"]:
        bx = xf * W
        by = P(0, 1, Z)[1]
        su = s_unit(Z) * 0.62
        cv.open('filter="url(#rockfine)"')
        statue(cv, rng, bx + su * 0.035, by, su, pose, flip, Z, stone=(36, 35, 46), dark=(28, 27, 36), face=False)
        statue(cv, rng, bx - su * 0.012, by, su * 0.985, pose, flip, Z)
        cv.close()
        # dust and a crystal that has started to grow over the stone
        crystal_cluster(cv, rng, bx - flip * s_unit(Z) * 0.2, by, s_unit(Z) * 0.16,
                        TURQ if bx < W * 0.5 else VIOL, 0.35 if bx < W * 0.5 else 0.15, Z - 0.05, 0.3 * flip, n=3)
    # scattered gear of the petrified: a dropped helmet and a sword, half buried in dust
    for (xf, Z) in ((0.43, 2.9), (0.66, 3.2)):
        bx, by = xf * W, P(0, 1, Z)[1]
        k = s_unit(Z)
        cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (bx, by - 0.05 * k, 0.12 * k, 0.07 * k),
                 (46, 43, 54), Z)
        cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (bx + 0.1 * k, by, bx + 0.6 * k, by - 0.03 * k),
                 "none", Z, stroke=(52, 50, 60), sw=0.035 * k)

    # ---- foreground pillars framing the view -------------------------------------------
    Zf = 1.25
    for side in (-1, 1):
        edge = 0 if side < 0 else W
        wpx = W * (0.055 if W > H else 0.07)
        x0, x1 = (edge, edge + wpx) if side < 0 else (edge - wpx, edge)
        cv.solid("rect", 'x="%.1f" y="-5" width="%.1f" height="%.1f"' % (x0, x1 - x0, H + 10), (16, 14, 22), Zf)
        gid = "pilg%d" % (side + 1)
        cv.defs.append(('<linearGradient id="%s" x1="0" x2="1"><stop offset="0" stop-color="%s"/>'
                        '<stop offset="1" stop-color="%s"/></linearGradient>') % (
            gid, "#0c0b12" if side < 0 else "#2a2536", "#2a2536" if side < 0 else "#0c0b12"))
        cv.paint('<rect x="%.1f" y="-5" width="%.1f" height="%.1f" fill="url(#%s)" filter="url(#rockfine)"/>' % (
            x0, x1 - x0, H + 10, gid))
        for j in range(1, 9):
            yy = H * j / 9 + rng.uniform(-8, 8)
            cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#07060b" stroke-width="2" opacity="0.7"/>' % (
                x0, yy, x1, yy))
    # top lintel keeps the band under the UI bar calm
    cv.solid("rect", 'x="-5" y="-5" width="%d" height="%.1f"' % (W + 10, H * 0.06 + 5), (14, 12, 19), Zf)
    cv.paint('<rect x="-5" y="%.1f" width="%d" height="3" fill="#2c2738"/>' % (H * 0.06 - 2, W + 10))

    # ---- the warm arcane orb, hanging from chains (main light) -----------------------------
    oxf, oyf, oz = fmt["orb"]
    ox, oy = oxf * W, oyf * H
    r = cam.scale(oz) * 0.2
    link = max(5, r * 0.22)
    for dx in (-0.8, 0.8):
        chain(cv, ox + dx * r * 0.6, H * 0.06, ox + dx * r * 0.95, oy - r * 0.7, link, oz)
    # bronze cage with claws holding the orb
    cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (ox, oy, r), (120, 60, 45), oz)
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#ff9670" filter="url(#blur30)" opacity="0.35"/>' % (ox, oy, r * 2.4))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#ffb08a" filter="url(#blur5)" opacity="0.55"/>' % (ox, oy, r * 0.95),
            '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#orbg)"/>' % (ox, oy, r))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff0e4" filter="url(#blur5)" opacity="0.5"/>' % (
        ox - r * 0.15, oy - r * 0.15, r * 0.4))
    for j in range(5):
        a = -math.pi / 2 + (j - 2) * 0.55
        p0 = (ox + math.cos(a) * r * 1.35, oy + math.sin(a) * r * 1.25 - r * 0.2)
        p1 = (ox + math.cos(a) * r * 0.75, oy + math.sin(a) * r * 0.75)
        p2 = (ox + math.cos(a) * r * 0.95, oy + math.sin(a) * r * 0.2 + r * 0.5)
        cv.solid("path", 'd="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f"' % (*p0, *p1, *p2), "none", oz - 0.05,
                 stroke=C["bronze"], sw=max(2, r * 0.12))
    cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (ox, oy - r * 1.25, r * 0.55, r * 0.16),
             C["bronze"], oz - 0.05)
    # shard crystals floating around the orb
    for j in range(6):
        a = j * 1.05 + 0.3
        dx, dy = math.cos(a) * r * 1.9, math.sin(a) * r * 1.4
        sz = r * rng.uniform(0.18, 0.3)
        shard = [(ox + dx, oy + dy - sz), (ox + dx + sz * 0.3, oy + dy), (ox + dx, oy + dy + sz * 0.6),
                 (ox + dx - sz * 0.3, oy + dy)]
        cv.glow('<polygon points="%s" fill="#ffa07a" opacity="0.9" filter="url(#blur2)"/>' % pts(shard),
                '<polygon points="%s" fill="#e88a66"/>' % pts(shard))
    return cv, cam


# ---------------------------------------------------------------------------
# compositing
# ---------------------------------------------------------------------------
def composite(col, dep, emi, fmt, cam, seed=5):
    rng = np.random.default_rng(seed)
    W, H = fmt["W"], fmt["H"]
    orb = np.array(ORB, np.float32) / 255.0
    z = dep[..., 0] * 12.0
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    ox, oy = fmt["orb"][0] * W, fmt["orb"][1] * H
    # warm arcane light from the orb, fading with distance; cool violet ambient elsewhere
    wash = np.exp(-radial(W, H, ox, oy + H * 0.12, W * 0.36 if W > H else W * 0.6, H * 0.5) ** 2)
    floor_pool = np.exp(-radial(W, H, ox + W * 0.04, H * 0.86, W * 0.22 if W > H else W * 0.4, H * 0.1) ** 2)
    ambient = np.array([0.62, 0.6, 0.78], np.float32)
    light = ambient[None, None, :] * 0.8 + (1.05 * wash + 0.45 * floor_pool)[..., None] * orb[None, None, :]
    img = col * light
    # depth fog: violet haze, the void recedes into darkness
    fog_amt = 1 - np.exp(-np.clip(z - 2.2, 0, None) * 0.28)
    fog_col = np.array([0.08, 0.065, 0.13], np.float32)
    img = img * (1 - 0.55 * fog_amt[..., None]) + fog_col * 0.55 * fog_amt[..., None]
    # mist veiling the Beholder: soft drifting bank across the void
    ex, ey = fmt["eye"][0] * W, fmt["eye"][1] * H
    n1 = fbm(W, H, 220, rng, 4, stretch=(3.0, 1.0))
    veil = np.clip(0.3 + (n1 - 0.3) * 1.8, 0, 1) * np.exp(-((y - ey - H * 0.06) / (H * 0.14)) ** 2) * np.clip(z / 12 * 1.4 - 0.4, 0, 1)
    veil_c = np.array([0.2, 0.17, 0.3], np.float32)
    img = img * (1 - 0.7 * veil[..., None]) + veil_c * 0.5 * veil[..., None]
    img = img * (1 - 0.35 * np.exp(-radial(W, H, ex, ey, W * 0.2, H * 0.2) ** 2) * np.clip(z - 9, 0, 1))[..., None]
    # ground mist, layered, hugging the floor
    horizon = cam.cy + cam.f / cam.Zb
    prof = (np.exp(-((y - (horizon + H * 0.03)) / (H * 0.06)) ** 2)
            + 0.45 * np.exp(-((y - H * 0.84) / (H * 0.08)) ** 2))
    m1 = fbm(W, H, 240, rng, 4, stretch=(3.5, 1.0))
    m2 = fbm(W, H, 80, rng, 3, stretch=(4.0, 1.0))
    mist = np.clip((m1 * 0.7 + m2 * 0.5 - 0.38) * 1.7, 0, 1) * prof
    mist_c = np.array([0.36, 0.32, 0.5], np.float32)
    img = img * (1 - 0.4 * mist[..., None]) + mist_c * 0.38 * mist[..., None] * (0.7 + 0.9 * wash[..., None])
    # crystals and orb light the stone around them
    img = img + col * blur_hdr(emi, 55) * 2.2
    img = img + emi * 0.85
    bloom = blur_hdr(emi, 12) * 0.8 + blur_hdr(emi, 42) * 0.7
    img = img + bloom
    img = img + blur_hdr(emi, 90) * mist[..., None] * 1.4
    # arcane motes drifting in the air
    motes = np.zeros((H, W), np.float32)
    n = int(W * H / 9000)
    motes[rng.integers(0, H, n), rng.integers(0, W, n)] = rng.random(n)
    motes = blur(np.clip(motes, 0, 1), 1.0) * 5 * np.clip(1 - np.abs(y - H * 0.5) / (H * 0.4), 0, 1)
    motes *= (1 - 0.7 * np.clip((x - W * 0.5) / (W * 0.4), 0, 1))  # fewer behind the enemies
    tint = np.where(rng.random((H, W, 1)) < 0.5, np.array(TURQ, np.float32) / 255, np.array(VIOL, np.float32) / 255)
    img = img + motes[..., None] * blur(tint, 2) * 0.35
    return finish(img, rng, max_value=0.84, shadow_tint=(0.02, 0.015, 0.05))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "..", "..", "src", "arte", "fondos")
    work = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "_work")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(work, exist_ok=True)
    only = os.environ.get("ONLY")
    for name, fmt in FORMATS.items():
        if only and only != name:
            continue
        cv, cam = build(fmt)
        passes = {}
        for which in ("color", "depth", "emissive"):
            passes[which] = to_f(render(cv, which, os.path.join(work, "laberinto-%s-%s.png" % (name, which))))
        img = composite(passes["color"], passes["depth"], passes["emissive"], fmt, cam)
        out = os.path.join(out_dir, "laberinto-contemplador%s.webp" % fmt["suffix"])
        q, kb = save_webp(img, out, fmt["max_kb"])
        mockup(img, os.path.join(work, "laberinto-%s-maqueta.png" % name))
        print("%s  q=%d  %.0f KB" % (out, q, kb))


if __name__ == "__main__":
    main()
