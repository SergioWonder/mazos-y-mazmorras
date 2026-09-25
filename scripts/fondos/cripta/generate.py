"""Combat background «La Cripta» (Act II): the crypt of Vol'guth under the ruined settlement.

Black-stone vaults, ossuary niches with skulls, sarcophagi with recumbent effigies, cobwebbed
columns, chains and a hanging cage, a staircase that keeps going down, blue will-o'-the-wisps,
cold ground fog and a pale blue moonbeam through a crack in the vault (top left).

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paint_kit import (STD_DEFS, Camera, Canvas, blur, blur_hdr, fbm, finish, hexc, jitter,  # noqa: E402
                       mix, mockup, polygon_mask, pts, radial, render, save_webp, to_f)

MOON = (190, 210, 255)

FORMATS = {
    "wide": dict(W=1920, H=1080, cam=dict(vpx=0.52, vpy=0.50, yn=1.05, yb=0.63, bw=0.30, vt=0.16, ys=0.36),
                 crack=(0.225, 0.185), beam_foot=(0.33, 0.63), stairs=(0.37, 0.51), sarc=(0.265, 0.405), suffix="", max_kb=380),
    "tall": dict(W=1080, H=1440, cam=dict(vpx=0.52, vpy=0.52, yn=1.04, yb=0.655, bw=0.36, vt=0.22, ys=0.40),
                 crack=(0.22, 0.20), beam_foot=(0.30, 0.66), stairs=(0.37, 0.53), sarc=(0.18, 0.40), suffix="-movil", max_kb=300),
}

C = dict(
    back=(39, 44, 57), left=(35, 40, 52), right=(46, 52, 67), vault=(33, 38, 50), floor=(29, 33, 42),
    mortar=(21, 24, 31), rib=(55, 61, 76), rib_side=(34, 38, 49), pil=(50, 56, 71), pil_side=(33, 37, 48),
    niche=(9, 10, 14), bone=(176, 178, 176), bone_dark=(92, 96, 104), iron=(24, 26, 32),
    sarc=(50, 56, 70), sarc_side=(40, 45, 57), effigy=(112, 120, 138), column=(22, 25, 32),
)


# ---------------------------------------------------------------------------
# small drawing helpers
# ---------------------------------------------------------------------------
def skull(cv, cx, cy, s, z, bone=C["bone"], dark=C["bone_dark"], turn=0.0):
    """Frontal skull at screen position; `turn` (-1..1) squashes it towards a side."""
    kx = 1 - 0.25 * abs(turn)
    ox = turn * s * 0.08
    cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (cx, cy - s * 0.12, s * 0.5 * kx, s * 0.46),
             bone, z)
    cv.path("M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (
        cx - s * 0.33 * kx, cy + s * 0.05, cx - s * 0.3 * kx, cy + s * 0.48, cx, cy + s * 0.5,
        cx, cy + s * 0.5, cx + s * 0.3 * kx, cy + s * 0.48, cx + s * 0.33 * kx, cy + s * 0.05), bone, z)
    # shading on the side away from the moon
    cv.paint('<path d="M%.1f,%.1f A%.1f,%.1f 0 0 1 %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" fill="%s" opacity="0.55"/>' % (
        cx + s * 0.1, cy - s * 0.56, s * 0.5 * kx, s * 0.46, cx + s * 0.3, cy + s * 0.45,
        cx + s * 0.2, cy, cx + s * 0.1, cy - s * 0.56, hexc(dark)))
    for sx in (-1, 1):
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#07080b"/>' % (
            cx + ox + sx * s * 0.19 * kx, cy + s * 0.02, s * 0.13 * kx, s * 0.12))
    cv.paint('<path d="M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" fill="#07080b"/>' % (
        cx + ox, cy + s * 0.14, cx + ox - s * 0.06, cy + s * 0.27, cx + ox + s * 0.06, cy + s * 0.27))
    cv.paint('<path d="M%.1f,%.1f L%.1f,%.1f" stroke="#101216" stroke-width="%.2f"/>' % (
        cx - s * 0.2 * kx, cy + s * 0.38, cx + s * 0.2 * kx, cy + s * 0.38, max(0.6, s * 0.04)))
    for i in range(-2, 3):
        cv.paint('<path d="M%.1f,%.1f L%.1f,%.1f" stroke="#101216" stroke-width="%.2f"/>' % (
            cx + i * s * 0.08 * kx, cy + s * 0.33, cx + i * s * 0.08 * kx, cy + s * 0.44, max(0.4, s * 0.025)))


def long_bone(cv, x0, y0, x1, y1, w, z, bone=C["bone"]):
    cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (x0, y0, x1, y1), "none", z,
             stroke=bone, sw=w)
    for x, y in ((x0, y0), (x1, y1)):
        dx, dy = (y1 - y0), -(x1 - x0)
        n = math.hypot(dx, dy) or 1
        dx, dy = dx / n * w * 0.55, dy / n * w * 0.55
        for s in (-1, 1):
            cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (x + s * dx, y + s * dy, w * 0.62), bone, z)


def box(cv, cam, x0, x1, y0, y1, z0, z1, front, side, top, extra_front=None):
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


def chain(cv, cam, X, Y0, Y1, Z, rng):
    k = cam.scale(Z)
    step = 0.075
    n = int((Y1 - Y0) / step)
    for i in range(n):
        x, y = cam.p(X + math.sin(i * 0.3) * 0.004, Y0 + i * step, Z)
        if i % 2 == 0:
            cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (x, y, 0.024 * k, 0.045 * k), "none", Z,
                     stroke=C["iron"], sw=max(1.0, 0.012 * k))
            cv.paint('<path d="M%.1f,%.1f a%.1f,%.1f 0 0 1 0,%.1f" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.5"/>' % (
                x - 0.024 * k, y + 0.03 * k, 0.024 * k, 0.045 * k, -0.06 * k, hexc(mix(MOON, C["iron"], 0.55)),
                max(0.6, 0.006 * k)))
        else:
            cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (x, y - 0.04 * k, x, y + 0.04 * k), "none", Z,
                     stroke=C["iron"], sw=max(1.2, 0.016 * k))
    return cam.p(X, Y0 + n * step, Z)


def cobweb(cv, ax, ay, R, a0, a1, rng, op=0.2):
    n = 7
    angs = [a0 + (a1 - a0) * i / (n - 1) for i in range(n)]
    ends = []
    for a in angs:
        r = R * rng.uniform(0.75, 1.05)
        ends.append((a, r))
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#c9d2e6" stroke-width="0.7" opacity="%.2f"/>' % (
            ax, ay, ax + r * math.cos(a), ay + r * math.sin(a), op))
    for ring in (0.25, 0.42, 0.6, 0.78, 0.95):
        d = ""
        for i in range(n - 1):
            (a, r), (b, q) = ends[i], ends[i + 1]
            p0 = (ax + r * ring * math.cos(a), ay + r * ring * math.sin(a))
            p1 = (ax + q * ring * math.cos(b), ay + q * ring * math.sin(b))
            m = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
            c = (m[0] + (ax - m[0]) * 0.18, m[1] + (ay - m[1]) * 0.18)
            d += "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f " % (p0[0], p0[1], c[0], c[1], p1[0], p1[1])
        cv.paint('<path d="%s" fill="none" stroke="#c9d2e6" stroke-width="0.6" opacity="%.2f"/>' % (d, op * 0.9))
    for _ in range(3):
        a, r = rng.choice(ends)
        x, y = ax + r * math.cos(a) * 0.9, ay + r * math.sin(a) * 0.9
        cv.paint('<path d="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" fill="none" stroke="#c9d2e6" stroke-width="0.6" opacity="%.2f"/>' % (
            x, y, rng.uniform(-6, 6), R * 0.3, rng.uniform(-4, 4), R * rng.uniform(0.3, 0.6), op * 0.8))


def wisp(cv, x, y, s, strength=1.0):
    """Blue will-o'-the-wisp: soft halo, flame tongue and bright core (emissive)."""
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#3d6cff" opacity="%.2f" filter="url(#blur30)"/>' % (
        x, y, s * 4.5, 0.35 * strength))
    cv.glow('<path d="M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z" fill="#7fa6ff" opacity="%.2f" filter="url(#blur5)"/>' % (
        x - s, y, x - s * 1.1, y - s * 1.8, x - s * 0.2, y - s * 2.2, x + s * 0.2, y - s * 3.6,
        x + s * 0.6, y - s * 2.0, x + s * 1.2, y - s * 1.2, x + s, y, 0.75 * strength))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#cfe0ff" opacity="%.2f" filter="url(#blur2)"/>' % (
        x, y - s * 0.2, s * 0.7, 0.95 * strength),
        '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#8fb0ff" opacity="0.5" filter="url(#blur5)"/>' % (x, y, s * 1.4))


def stone_courses(cv, rng, quad_fn, u0, u1, v0, v1, course_h, block_w, base, var=0.16, z=5.0, gap=0.011):
    """Fills a planar region with staggered ashlar blocks. quad_fn maps (u, v) to screen."""
    v = v0
    row = 0
    while v < v1 - 1e-6:
        h = min(course_h * rng.uniform(0.85, 1.15), v1 - v)
        u = u0 - (block_w * 0.5 if row % 2 else 0) * rng.uniform(0.3, 1)
        while u < u1 - 1e-6:
            w = block_w * rng.uniform(0.45, 1.4)
            a, b = max(u, u0), min(u + w, u1)
            if b - a > 0.05:
                col = jitter(base, var, rng)
                if rng.random() < 0.06:
                    col = mix(col, (52, 60, 56), 0.2)  # a little damp moss
                q = [quad_fn(a + gap, v + gap), quad_fn(b - gap, v + gap),
                     quad_fn(b - gap, v + h - gap), quad_fn(a + gap, v + h - gap)]
                cv.poly(q, col, z)
            u += w
        v += h
        row += 1


# ---------------------------------------------------------------------------
# scene
# ---------------------------------------------------------------------------
def build(fmt, seed=7):
    rng = random.Random(seed)
    W, H = fmt["W"], fmt["H"]
    cam = Camera(W, H, **fmt["cam"])
    P = cam.p
    Wr, Zb, Ys, Yc = cam.Wr, cam.Zb, cam.Ys, cam.Yc
    cv = Canvas(W, H)
    cv.defs.append(STD_DEFS)
    rise = Ys - Yc

    def vault_pt(th, Z, inset=0.0):
        return P(-(Wr - inset) * math.cos(th), Ys - (rise - inset) * math.sin(th), Z)

    def screen_X(xf, Z):
        return (xf * W - cam.cx) * Z / cam.f

    Zf = 2.1                               # front arcade
    ribs = [Zf + (Zb - Zf) * 0.5]           # transverse arch in the middle of the room
    t = 0.24                                # rib / pilaster thickness

    # ---- back wall with the stair doorway ------------------------------------------
    Zs = Zb - 0.62                          # face of the staircase block
    sx0, sx1 = screen_X(fmt["stairs"][0], Zs), screen_X(fmt["stairs"][1], Zs)
    n_steps = 9
    run = (sx1 - sx0) / n_steps
    step_rise = 0.14
    top_Y = 1 - n_steps * step_rise
    land0 = sx0 - 0.55
    door = [P(land0 + 0.04, top_Y, Zb)]
    door_w = sx0 - land0 + 0.15
    for i in range(13):
        a = math.pi * i / 12
        door.append(P(land0 + 0.04 + door_w / 2 * (1 - math.cos(a)), top_Y - 1.05 - 0.35 * math.sin(a), Zb))
    door.append(P(land0 + 0.04 + door_w, top_Y, Zb))

    wall = [P(-Wr, 1, Zb)] + [vault_pt(math.pi * i / 48, Zb) for i in range(49)] + [P(Wr, 1, Zb)]
    cv.defs.append('<clipPath id="backwall"><polygon points="%s"/></clipPath>' % pts(wall))
    cv.poly(wall, C["mortar"], Zb)
    cv.open('filter="url(#rock)"', 'clip-path="url(#backwall)"')
    stone_courses(cv, rng, lambda u, v: P(u, v, Zb), -Wr, Wr, Yc - 0.1, 1.0, 0.27, 0.72, C["back"], z=Zb)
    cv.close()
    cv.defs.append('<linearGradient id="streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.5"/>'
                   '<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>'
                   '<linearGradient id="damp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0a0d0c" stop-opacity="0.7"/>'
                   '<stop offset="1" stop-color="#0a0d0c" stop-opacity="0"/></linearGradient>')
    grp = ['<g clip-path="url(#backwall)">']
    for _ in range(14):
        X = rng.uniform(-Wr, Wr)
        a = P(X, Yc, Zb)
        wdt = rng.uniform(0.1, 0.5) * cam.scale(Zb)
        hgt = rng.uniform(0.3, 0.8) * (P(0, 1, Zb)[1] - a[1])
        grp.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#streak)" opacity="%.2f" filter="url(#blur5)"/>' % (
            a[0], a[1], wdt, hgt, rng.uniform(0.3, 0.7)))
    fl = P(-Wr, 1, Zb)
    grp.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#damp)"/>' % (
        fl[0], fl[1] - 0.6 * cam.scale(Zb), 2 * Wr * cam.scale(Zb), 0.6 * cam.scale(Zb)))
    grp.append('</g>')
    cv.paint("".join(grp))
    cv.defs.append('<linearGradient id="doorg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030406"/>'
                   '<stop offset="1" stop-color="#141925"/></linearGradient>')
    cv.poly(door, (8, 9, 13), Zb)
    cv.paint('<polygon points="%s" fill="url(#doorg)"/>' % pts(door))       # the upper doorway, where the stair comes from
    # voussoirs around the doorway
    cx_d = land0 + 0.04 + door_w / 2
    for i in range(9):
        a0, a1 = math.pi * i / 9, math.pi * (i + 1) / 9
        r0x, r0y, r1x, r1y = door_w / 2, 0.35, door_w / 2 + 0.16, 0.5
        q = [P(cx_d - r0x * math.cos(a0), top_Y - 1.05 - r0y * math.sin(a0), Zb),
             P(cx_d - r1x * math.cos(a0), top_Y - 1.05 - r1y * math.sin(a0), Zb),
             P(cx_d - r1x * math.cos(a1), top_Y - 1.05 - r1y * math.sin(a1), Zb),
             P(cx_d - r0x * math.cos(a1), top_Y - 1.05 - r0y * math.sin(a1), Zb)]
        cv.poly(q, jitter(C["rib"], 0.1, rng), Zb, stroke=C["mortar"], sw=1)

    # ossuary niches on the back wall, right of the stairs (kept dim: enemies stand in front)
    nx0 = sx1 + 1.2
    rows = [(Ys - 0.5, Ys - 0.2), (Ys - 0.02, Ys + 0.28)]
    X = nx0
    while X + 0.32 < Wr - t - 0.1:
        for (ya, yb) in rows:
            q = [P(X, yb, Zb), P(X, ya + 0.05, Zb)]
            for i in range(7):
                a = math.pi * i / 6
                q.append(P(X + 0.14 * (1 - math.cos(a)), ya + 0.05 - 0.07 * math.sin(a), Zb))
            q += [P(X + 0.28, yb, Zb)]
            cv.poly(q, C["niche"], Zb + 0.1)
            r = rng.random()
            cx, cy = P(X + 0.14, yb - 0.1, Zb)
            dim = mix(C["bone"], C["back"], 0.62)
            if r < 0.5:
                skull(cv, cx, cy, cam.scale(Zb) * 0.15, Zb, bone=dim,
                      dark=mix(C["bone_dark"], C["niche"], 0.5), turn=rng.uniform(-0.7, 0.7))
            elif r < 0.75:
                for j in range(3):
                    a, b = P(X + 0.03, yb - 0.03 - j * 0.045, Zb), P(X + 0.25, yb - 0.03 - j * 0.045, Zb)
                    long_bone(cv, a[0], a[1], b[0], b[1], cam.scale(Zb) * 0.028, Zb, bone=dim)
        X += 0.4

    # the staircase block against the back wall, descending left to right
    prof = [(land0, 1), (land0, top_Y), (sx0, top_Y)]
    xx, yy = sx0, top_Y
    for i in range(n_steps):
        yy += step_rise
        prof += [(xx, yy), (xx + run, yy)]
        xx += run
    prof += [(xx, 1)]
    for i in range(n_steps):
        Y = top_Y + (i + 1) * step_rise
        if Y > 0:  # treads below eye level are visible
            X0 = sx0 + i * run
            cv.poly([P(X0, Y, Zs), P(X0 + run, Y, Zs), P(X0 + run, Y, Zb), P(X0, Y, Zb)],
                    jitter(mix(C["rib"], MOON, 0.08), 0.06, rng), Zs)
    face = [P(x, y, Zs) for x, y in prof]
    stair_c = (27, 30, 39)
    cv.poly(face, stair_c, Zs)
    cv.open('filter="url(#rockfine)"')
    for i in range(n_steps):
        X0 = sx0 + i * run
        Y = top_Y + (i + 1) * step_rise
        cv.poly([P(X0 + 0.01, Y, Zs), P(X0 + run, Y, Zs), P(X0 + run, 1, Zs), P(X0 + 0.01, 1, Zs)],
                jitter(stair_c, 0.12, rng), Zs)
    cv.close()
    for i in range(n_steps):
        X0 = sx0 + i * run
        Y = top_Y + (i + 1) * step_rise
        cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.8" opacity="0.5"/>' % (
            pts([P(X0 + 0.01, Y - step_rise + 0.01, Zs), P(X0 + 0.01, Y, Zs), P(X0 + run, Y, Zs)]),
            hexc(mix(MOON, C["rib"], 0.35))))
    # iron handrail following the flight
    rail = [P(land0 + 0.1, top_Y - 0.42, Zs - 0.02), P(sx0, top_Y - 0.42, Zs - 0.02),
            P(xx if False else sx0 + n_steps * run, 1 - 0.45, Zs - 0.02)]
    cv.solid("polyline", 'points="%s"' % pts(rail), "none", Zs - 0.02, stroke=C["iron"], sw=max(2, cam.scale(Zs) * 0.025))
    for i in range(0, n_steps + 1, 3):
        X0 = sx0 + i * run
        Y = top_Y + i * step_rise
        a, b = P(X0 + 0.04, Y, Zs - 0.02), P(X0 + 0.04, Y - 0.43, Zs - 0.02)
        cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (*a, *b), "none", Zs, stroke=C["iron"],
                 sw=max(1.5, cam.scale(Zs) * 0.018))
    # the dark stairwell that keeps descending "al fondo"
    pit0, pit1 = xx, xx + (sx1 - sx0) * 0.5
    cv.poly([P(pit0, 1, Zs), P(pit1, 1, Zs), P(pit1, 1, Zb), P(pit0, 1, Zb)], (5, 6, 9), Zs)
    cv.poly([P(pit0, 1, Zs), P(pit0, 1, Zb), P(pit0, 1.12, Zb), P(pit0, 1.12, Zs)], (15, 17, 23), Zs)
    for i in range(3):  # first steps down
        Yd = 1 + (i + 1) * 0.1
        a, b = P(pit0 + 0.05 + i * 0.12, Yd, Zb - 0.15), P(pit1, Yd, Zb - 0.15)
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#48577a" stroke-width="1.2" opacity="%.2f"/>' % (
            a[0], a[1] - 2 * i, b[0], b[1] - 2 * i, 0.5 - 0.12 * i))
    px, py = P((pit0 + pit1) / 2, 1, Zb - 0.3)
    cv.glow('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#2f5cff" opacity="0.22" filter="url(#blur30)"/>' % (
        px, py - 20, (P(pit1, 1, Zb)[0] - P(pit0, 1, Zb)[0]) * 0.7, 40))
    # low parapet on the stairwell edge
    box(cv, cam, pit1, pit1 + 0.14, 0.72, 1, Zs, Zb, C["pil"], C["pil_side"], C["rib"])

    # inscription band of runes above the stairs
    rx0 = sx0 + 0.2
    while rx0 < sx1 + 0.8:
        a = P(rx0, top_Y - 1.75, Zb)
        k = cam.scale(Zb) * 0.07
        cv.paint('<path d="M%.1f,%.1f l%.1f,%.1f l%.1f,%.1f m%.1f,%.1f l%.1f,%.1f" stroke="#12141a" stroke-width="1.3" fill="none" opacity="0.8"/>' % (
            a[0], a[1], rng.uniform(-1, 1) * k, k, rng.uniform(-1, 1) * k, k * 0.6, -k * 0.5, -k, k, rng.uniform(0, 1) * k))
        rx0 += 0.13

    # ---- side walls -----------------------------------------------------------------
    for side in (-1, 1):
        Xw = side * Wr
        z_near = max(1.05, cam.f * Wr / (cam.cx if side < 0 else W - cam.cx) * 0.9)
        quad = [P(Xw, Ys, z_near), P(Xw, Ys, Zb), P(Xw, 1, Zb), P(Xw, 1, z_near)]
        cv.poly(quad, C["mortar"], (z_near + Zb) / 2)
        base = C["left"] if side < 0 else C["right"]
        cv.open('filter="url(#rock)"')
        stone_courses(cv, rng, lambda u, v: P(Xw, v, u), z_near, Zb, Ys, 1.0, 0.27, 0.7, base, z=3.0)
        cv.close()
        # rows of burial niches (loculi) with skulls and bones
        Z = z_near + 0.1
        while Z < Zb - 0.3:
            if all(abs(Z + 0.15 - r) > 0.32 for r in ribs):
                for (ya, yb) in ((-0.6, -0.25), (-0.12, 0.2), (0.34, 0.62)):
                    za, zb2 = Z, Z + 0.3
                    q = [P(Xw, yb, za), P(Xw, ya, za), P(Xw, ya - 0.05, (za + zb2) / 2), P(Xw, ya, zb2), P(Xw, yb, zb2)]
                    cv.poly(q, C["niche"], Z)
                    cx, cy = P(Xw, yb - 0.1, (za + zb2) / 2)
                    r = rng.random()
                    if r < 0.6:
                        skull(cv, cx, cy, cam.scale(Z) * 0.13, Z, bone=mix(C["bone"], base, 0.3),
                              dark=mix(C["bone_dark"], C["niche"], 0.3), turn=-side * 0.8)
                    elif r < 0.85:
                        for j in range(3):
                            a = P(Xw, yb - 0.03 - j * 0.05, za + 0.03)
                            b = P(Xw, yb - 0.03 - j * 0.05, zb2 - 0.03)
                            long_bone(cv, a[0], a[1], b[0], b[1], cam.scale(Z) * 0.03, Z,
                                      bone=mix(C["bone"], base, 0.4))
            Z += 0.4

    # ---- vault ----------------------------------------------------------------------
    zs = [1.0]
    while zs[-1] < Zb:
        zs.append(min(Zb, zs[-1] * 1.12))
    NTH = 18
    cv.open('filter="url(#rock)"')
    for i in range(len(zs) - 1):
        za, zb2 = zs[i], zs[i + 1]
        for j in range(NTH):
            th0, th1 = math.pi * j / NTH, math.pi * (j + 1) / NTH
            off = (0.5 if i % 2 else 0) / NTH * math.pi
            a0, a1 = max(0, th0 - off), min(math.pi, th1 - off) if j < NTH - 1 else math.pi
            q = [vault_pt(a0, za), vault_pt(a1, za), vault_pt(a1, zb2), vault_pt(a0, zb2)]
            shade = 0.85 + 0.25 * math.sin((a0 + a1) / 2) * (0.5 + 0.5 * (za - 1) / (Zb - 1))
            cv.poly(q, jitter(tuple(v * shade for v in C["vault"]), 0.12, rng), za, stroke=C["mortar"], sw=1.2)
    cv.close()

    # ---- floor ----------------------------------------------------------------------
    cv.poly([P(-Wr, 1, 1.0), P(Wr, 1, 1.0), P(Wr, 1, Zb), P(-Wr, 1, Zb)], C["mortar"], 2.0)
    cv.open('filter="url(#rockfine)"')
    zf = [1.0]
    while zf[-1] < Zb:
        zf.append(min(Zb, zf[-1] * 1.09))
    for i in range(len(zf) - 1):
        za, zb2 = zf[i], zf[i + 1]
        calm = max(0.0, min(1.0, (za - 1.9) / 1.0))  # near floor (fighters) stays quiet
        X = -Wr - (0.33 if i % 2 else 0)
        while X < Wr:
            w = 0.66 * rng.uniform(0.85, 1.15)
            a, b = max(X, -Wr), min(X + w, Wr)
            g = 0.008 + 0.014 * calm
            col = jitter(C["floor"], 0.025 + 0.1 * calm, rng)
            cv.poly([P(a + g, 1, za + g * 0.6), P(b - g, 1, za + g * 0.6), P(b - g, 1, zb2 - g * 0.6),
                     P(a + g, 1, zb2 - g * 0.6)], col, za)
            X += w
    cv.close()
    # a few cracks in the flagstones, away from the fighters
    for _ in range(7):
        X, Z = rng.uniform(-Wr * 0.9, Wr * 0.9), rng.uniform(2.2, Zb - 0.3)
        d = "M%.1f,%.1f" % P(X, 1, Z)
        for _ in range(4):
            X += rng.uniform(-0.3, 0.3)
            Z += rng.uniform(-0.1, 0.25)
            d += " L%.1f,%.1f" % P(X, 1, Z)
        cv.paint('<path d="%s" fill="none" stroke="#0b0c10" stroke-width="1.2" opacity="0.8"/>' % d)

    # ---- objects, far to near ------------------------------------------------------
    objects = []

    def rib_at(Zr):
        def draw():
            # soffit
            inner0 = [vault_pt(math.pi * i / 40, Zr, t) for i in range(41)]
            inner1 = [vault_pt(math.pi * i / 40, Zr + 0.2, t) for i in range(41)]
            cv.poly(inner0 + inner1[::-1], C["rib_side"], Zr + 0.1)
            # pilasters: inner side face, then front face, capital and base
            for sd in (-1, 1):
                xa, xb = (-Wr, -Wr + t) if sd < 0 else (Wr - t, Wr)
                xi = xb if sd < 0 else xa
                cv.poly([P(xi, Ys, Zr), P(xi, Ys, Zr + 0.2), P(xi, 1, Zr + 0.2), P(xi, 1, Zr)], C["pil_side"], Zr)
                cv.open('filter="url(#rockfine)"')
                cv.poly([P(xa, Ys, Zr), P(xb, Ys, Zr), P(xb, 1, Zr), P(xa, 1, Zr)], C["pil"], Zr)
                cv.close()
                box(cv, cam, xa - 0.05 if sd > 0 else xa, xb + 0.05 if sd < 0 else xb, Ys, Ys + 0.13, Zr - 0.05,
                    Zr + 0.2, C["rib"], C["rib_side"], C["rib"])
                box(cv, cam, xa - 0.04 if sd > 0 else xa, xb + 0.04 if sd < 0 else xb, 0.84, 1, Zr - 0.04,
                    Zr + 0.2, C["rib"], C["rib_side"], C["rib"])
            # voussoirs of the arch face
            cv.open('filter="url(#rockfine)"')
            nv = 15
            for i in range(nv):
                a0, a1 = math.pi * i / nv, math.pi * (i + 1) / nv
                q = [vault_pt(a0, Zr), vault_pt(a1, Zr), vault_pt(a1, Zr, t), vault_pt(a0, Zr, t)]
                cv.poly(q, jitter(C["rib"], 0.1, rng), Zr, stroke=C["mortar"], sw=1.2)
            cv.close()
            # cobwebs in the corners under the arch
            for sd in (-1, 1):
                xi = (-Wr + t) if sd < 0 else (Wr - t)
                ax, ay = P(xi, Ys + 0.13, Zr)
                R = cam.scale(Zr) * 0.5
                if sd < 0:
                    cobweb(cv, ax, ay, R, 0.05, 1.5, rng, 0.16)
                else:
                    cobweb(cv, ax, ay, R, math.pi - 1.5, math.pi - 0.05, rng, 0.12)
        return draw

    for Zr in ribs:
        objects.append((Zr, rib_at(Zr)))

    def effigy_profile(L):
        """Side profile (t along the body, height over the lid) of a recumbent statue."""
        r = 0.085
        prof = [(0.015, 0), (0.015, 0.08), (0.05, 0.085)]
        hc = 0.05 + r / L * 1.2
        for i in range(13):
            a_ = math.pi * (1.05 - 1.1 * i / 12)
            prof.append((hc + math.cos(a_) * r / L, 0.075 + r + math.sin(a_) * r))
        prof += [(hc + r / L * 1.1, 0.1), (hc + r / L * 1.8, 0.16), (0.3, 0.2), (0.37, 0.215),
                 (0.39, 0.24), (0.405, 0.3), (0.415, 0.305), (0.43, 0.24), (0.46, 0.21), (0.55, 0.18), (0.7, 0.15),
                 (0.85, 0.13), (0.87, 0.19), (0.885, 0.25), (0.9, 0.265), (0.915, 0.255), (0.925, 0.19), (0.93, 0.12), (0.95, 0)]
        return prof

    def sarcophagus(side, z0, dim, span=None):
        def draw():
            L = min(1.5, 0.75 * Wr)
            w = 0.58
            x0 = -Wr + 0.12 if side < 0 else Wr - 0.12 - L
            if span:
                x0, L = screen_X(span[0], z0), screen_X(span[1], z0) - screen_X(span[0], z0)
            x1 = x0 + L
            z1 = z0 + w
            hb = 0.5
            sc = mix(C["sarc"], C["floor"], dim)
            ss = mix(C["sarc_side"], C["floor"], dim)
            box(cv, cam, x0 - 0.05, x1 + 0.05, 1 - 0.08, 1, z0 - 0.05, z1 + 0.05, ss, ss, sc)
            cv.open('filter="url(#rockfine)"')
            box(cv, cam, x0, x1, 1 - hb, 1 - 0.08, z0, z1, sc, ss, sc)
            cv.close()
            # carved panels and a skull on the long front face
            n = 3
            for i in range(n):
                xa = x0 + 0.07 + i * (L - 0.07) / n
                xb = xa + (L - 0.07) / n - 0.07
                q = [P(xa, 1 - hb + 0.07, z0), P(xb, 1 - hb + 0.07, z0), P(xb, 0.86, z0), P(xa, 0.86, z0)]
                cv.paint('<polygon points="%s" fill="#000" opacity="0.22" stroke="%s" stroke-opacity="0.3" stroke-width="1.2"/>' % (
                    pts(q), hexc(mix(MOON, sc, 0.5))))
            fx, fy = P((x0 + x1) / 2, 1 - hb / 2 - 0.02, z0)
            skull(cv, fx, fy, cam.scale(z0) * 0.14, z0, bone=mix(sc, C["bone"], 0.3), dark=ss)
            ylid = 1 - hb - 0.07
            box(cv, cam, x0 - 0.04, x1 + 0.04, ylid, 1 - hb, z0 - 0.04, z1 + 0.04, mix(sc, MOON, 0.05), ss,
                mix(ss, (8, 9, 12), 0.25))
            # recumbent effigy in profile, head towards the wall
            e = mix(C["effigy"], C["floor"], dim)
            ed = mix(e, (10, 12, 16), 0.45)
            xh, xf = (x0 + 0.05, x1 - 0.05) if side <= 0 else (x1 - 0.05, x0 + 0.05)

            def prof(Z, grow=1.0):
                return [P(xh + t_ * (xf - xh), ylid - h_ * grow * 1.35, Z) for t_, h_ in effigy_profile(L)]
            zm = z0 + w * 0.5
            cv.poly(prof(zm + 0.14, 0.92), ed, zm)
            cv.poly(prof(zm - 0.02), e, zm - 0.1)
            top = prof(zm - 0.02)[2:-2]
            gid = "effg%d" % (side + 1)
            y_top = P(0, ylid - 0.34, zm)[1]
            y_bot = P(0, ylid, zm)[1]
            cv.defs.append('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="0" y1="%.1f" x2="0" y2="%.1f">'
                           '<stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>'
                           '</linearGradient>' % (gid, y_top, y_bot))
            cv.paint('<polygon points="%s" fill="url(#%s)"/>' % (pts(prof(zm - 0.02)), gid))
            cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.7" stroke-linejoin="round"/>' % (
                pts(top), hexc(mix(MOON, e, 0.4)), max(1.2, cam.scale(z0) * 0.012)))
            # sword hilt on the chest and the folds of the shroud
            hx, hy = P(xh + 0.36 * (xf - xh), ylid - 0.21, zm - 0.03)
            k = cam.scale(zm)
            cv.paint('<path d="M%.1f,%.1f l%.1f,%.1f M%.1f,%.1f l%.1f,%.1f" stroke="%s" stroke-width="%.1f" fill="none"/>' % (
                hx, hy - 0.06 * k, 0, 0.12 * k, hx - 0.04 * k * (1 if side < 0 else -1), hy - 0.02 * k,
                0.08 * k * (1 if side < 0 else -1), 0, hexc(ed), max(1.2, 0.015 * k)))
            for f_ in (0.55, 0.64, 0.73):
                a_ = P(xh + f_ * (xf - xh), ylid - 0.16, zm - 0.02)
                b_ = P(xh + (f_ + 0.05) * (xf - xh), ylid - 0.02, zm - 0.02)
                cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.6"/>' % (
                    *a_, *b_, hexc(ed)))
            ax, ay = P(x1 + 0.04 if side <= 0 else x0 - 0.04, ylid, z0 - 0.04)
            if side <= 0:
                cobweb(cv, ax, ay, cam.scale(z0) * 0.28, 0.1, 1.5, rng, 0.12)
            else:
                cobweb(cv, ax, ay, cam.scale(z0) * 0.28, math.pi - 1.5, math.pi - 0.1, rng, 0.1)
        return draw

    objects.append((2.95, sarcophagus(0, 2.95, 0.0, span=fmt["sarc"])))
    objects.append((2.7, sarcophagus(1, 2.7, 0.35)))

    # ---- the crack in the vault where the moonlight enters (drawn over the rib) ----
    def crack_fn():
        kx, ky = fmt["crack"][0] * W, fmt["crack"][1] * H
        s = W / 1920 if W > H else 0.8
        # jagged opening: a zig-zag outline with broken stones around it
        crack = []
        n = 16
        for i in range(n):
            a_ = 2 * math.pi * i / n
            rr = (1.0 if i % 2 == 0 else 0.45) * rng.uniform(0.7, 1.15)
            crack.append((kx + math.cos(a_) * 62 * s * rr, ky + math.sin(a_) * 20 * s * rr))
        rim = [(x + (x - kx) * 0.35, y + (y - ky) * 0.6) for x, y in crack]
        cv.poly(rim, (18, 20, 26), 2.5)
        for _ in range(6):  # loose broken stones on the rim
            a_ = rng.uniform(0, 2 * math.pi)
            x, y = kx + math.cos(a_) * 75 * s, ky + math.sin(a_) * 26 * s
            r_ = rng.uniform(6, 12) * s
            cv.poly([(x - r_, y), (x - r_ * 0.3, y - r_ * 0.6), (x + r_, y - r_ * 0.2), (x + r_ * 0.4, y + r_ * 0.5)],
                    jitter((40, 45, 58), 0.2, rng), 2.5)
        cv.glow('<polygon points="%s" fill="#c4d4f4" opacity="0.75" filter="url(#blur2)"/>' % pts(crack),
                '<polygon points="%s" fill="#7f93b8"/>' % pts(crack))
        cv.glow('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#7f9fff" opacity="0.22" filter="url(#blur30)"/>' % (
            kx, ky + 10 * s, 130 * s, 60 * s))
        for _ in range(5):  # hanging roots from the broken vault
            x = kx + rng.uniform(-50, 50) * s
            y = ky + rng.uniform(-4, 8) * s
            L = rng.uniform(25, 60) * s
            cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (x, y, rng.uniform(-5, 5), L / 2, rng.uniform(-4, 4), L),
                     "none", 2.5, stroke=(12, 13, 16), sw=1.1)

    objects.append((Zf + 0.05, crack_fn))

    # hanging chains and an iron cage with a skeleton
    def chains():
        for (xf, Z, y1) in ((0.40, 2.7, -0.85), (0.70, 3.3, -0.95), (0.60, 2.4, -1.2)):
            X = screen_X(xf, Z)
            end = chain(cv, cam, X, Yc - 0.3, y1, Z, rng)
            k = cam.scale(Z)
            cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (
                end[0], end[1], 0, 0.08 * k, 0.05 * k, 0.1 * k, 0.05 * k, 0, 0.06 * k, -0.06 * k), "none", Z,
                stroke=C["iron"], sw=max(1.3, 0.015 * k))
    objects.append((2.4, chains))

    def cage():
        xf = fmt["crack"][0] + 0.12
        Z = 3.3
        X = screen_X(xf, Z)
        top, bot = -1.25 if W > H else -1.1, -0.55 if W > H else -0.4
        chain(cv, cam, X, Yc - 0.3, top - 0.12, Z, rng)
        k = cam.scale(Z)
        r = 0.2
        cx, ty = P(X, top, Z)
        _, by = P(X, bot, Z)
        rx = r * k
        cv.solid("path", 'd="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f"' % (cx - rx, ty + 0.06 * k, cx, ty - 0.12 * k, cx + rx, ty + 0.06 * k),
                 "none", Z, stroke=C["iron"], sw=max(1.5, 0.02 * k))
        # skeleton slumped inside
        sk = mix(C["bone"], (40, 44, 54), 0.55)
        skull(cv, cx - rx * 0.2, by - (by - ty) * 0.62, 0.12 * k, Z, bone=sk, dark=C["bone_dark"], turn=0.4)
        for i in range(5):
            yy = by - (by - ty) * (0.46 - i * 0.06)
            cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (cx - rx * 0.45, yy, rx * 0.45, rx * 0.25, rx * 0.9, 0),
                     "none", Z, stroke=sk, sw=max(1.0, 0.012 * k))
        cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (cx, by - (by - ty) * 0.52, cx + rx * 0.1, by - 0.06 * k),
                 "none", Z, stroke=sk, sw=max(1.2, 0.02 * k))
        long_bone(cv, cx + rx * 0.1, by - 0.05 * k, cx + rx * 0.9, by + 0.12 * k, 0.025 * k, Z, bone=sk)
        long_bone(cv, cx - rx * 0.3, by - 0.04 * k, cx - rx * 0.4, by + 0.2 * k, 0.025 * k, Z, bone=sk)
        # bars and rings
        for i in range(9):
            a = math.pi * i / 8
            x = cx - rx * math.cos(a)
            cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (x, ty + 0.05 * k * math.sin(a), x, by),
                     "none", Z, stroke=C["iron"], sw=max(1.2, 0.012 * k))
        for yy in (ty + 0.05 * k, (ty + by) / 2, by):
            cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (cx, yy, rx, rx * 0.22), "none", Z,
                     stroke=C["iron"], sw=max(1.4, 0.015 * k))
        cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (cx, by + rx * 0.1, rx, rx * 0.25), C["iron"], Z)
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.6"/>' % (
            cx - rx, ty + 0.05 * k, cx - rx, by, hexc(mix(MOON, C["iron"], 0.3))))
    objects.append((3.3, cage))

    # bones and skulls heaped at the foot of the walls
    def bones():
        for side in (-1, 1):
            for _ in range(6):
                Z = rng.uniform(2.3, Zb - 0.2)
                if any(abs(Z - r) < 0.25 for r in ribs):
                    continue
                if 2.5 < Z < 3.8:
                    continue
                X = side * (Wr - rng.uniform(0.1, 0.5))
                x, y = P(X, 0.97, Z)
                k = cam.scale(Z)
                a = rng.uniform(0, math.pi)
                long_bone(cv, x - math.cos(a) * 0.14 * k, y - math.sin(a) * 0.02 * k, x + math.cos(a) * 0.14 * k,
                          y + math.sin(a) * 0.02 * k, 0.025 * k, Z, bone=mix(C["bone"], C["floor"], 0.35))
                if rng.random() < 0.5:
                    skull(cv, x + rng.uniform(-0.1, 0.1) * k, y - 0.06 * k, 0.12 * k, Z,
                          bone=mix(C["bone"], C["floor"], 0.3), turn=rng.uniform(-1, 1))
        # skull heap at the stair foot
        for i in range(8):
            X = sx1 - 0.2 + rng.uniform(-0.2, 0.3)
            x, y = P(X, 0.94 - 0.04 * (i // 3), Zs - 0.12 - rng.uniform(0, 0.1))
            skull(cv, x, y, cam.scale(Zs) * 0.12, Zs - 0.2, bone=mix(C["bone"], C["floor"], 0.58), turn=rng.uniform(-1, 1))
    objects.append((Zs - 0.2, bones))

    # front arcade: freestanding columns and the arch between them
    def front():
        xl = -cam.half_visible(Zf) * (cam.cx / (W / 2)) * 0.9
        xr = cam.half_visible(Zf) * ((W - cam.cx) / (W / 2)) * 0.9
        rc = 0.3
        spring = Ys + 0.1
        span = (xr - xl) / 2 + rc
        mid = (xl + xr) / 2
        arise = span * 0.62

        def arch(o, Z):
            return [P(mid - (span - o) * math.cos(math.pi * i / 40), spring - (arise - o) * math.sin(math.pi * i / 40), Z)
                    for i in range(41)]
        outer = arch(-0.45, Zf)
        inner = arch(0.0, Zf)
        # spandrel wall above the arch (dark, framing)
        frame = [(-10, -10), (W + 10, -10), (W + 10, P(0, spring, Zf)[1])] + inner[::-1] + [(-10, P(0, spring, Zf)[1])]
        cv.poly(frame, (17, 19, 25), Zf)
        cv.open('filter="url(#rock)"')
        nv = 17
        for i in range(nv):
            a, b = inner[int(40 * i / nv)], inner[int(40 * (i + 1) / nv)]
            c, d = outer[int(40 * (i + 1) / nv)], outer[int(40 * i / nv)]
            cv.poly([a, b, c, d], jitter((30, 34, 44), 0.12, rng), Zf, stroke=(12, 13, 17), sw=1.5)
        cv.close()
        soff = arch(0.0, Zf + 0.3)
        cv.paint('<polygon points="%s" fill="#0e1015" opacity="0.9"/>' % pts(inner + soff[::-1]))
        for X in (xl, xr):
            x0, y0 = P(X - rc, spring + 0.12, Zf)
            x1, y1 = P(X + rc, 1, Zf)
            gid = "colgrad%d" % int(X * 100 + 1000)
            cv.defs.append(('<linearGradient id="%s" x1="0" x2="1"><stop offset="0" stop-color="#3a4252"/>'
                            '<stop offset="0.18" stop-color="#1c2029"/><stop offset="0.7" stop-color="#101217"/>'
                            '<stop offset="1" stop-color="#0a0b0e"/></linearGradient>') % gid)
            cv.solid("rect", 'x="%.1f" y="%.1f" width="%.1f" height="%.1f"' % (x0, y0, x1 - x0, y1 - y0), C["column"], Zf,
                     depth=True)
            cv.paint('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#%s)" filter="url(#rockfine)"/>' % (
                x0, y0, x1 - x0, y1 - y0, gid))
            # fluting
            for i in range(1, 6):
                xx = x0 + (x1 - x0) * (0.5 - 0.5 * math.cos(math.pi * i / 6))
                cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="1.5" opacity="0.35"/>' % (
                    xx, y0, xx, y1))
            box(cv, cam, X - rc - 0.08, X + rc + 0.08, spring - 0.05, spring + 0.14, Zf - 0.08, Zf + 0.15,
                (30, 34, 44), (20, 22, 29), (26, 29, 37))
            box(cv, cam, X - rc - 0.1, X + rc + 0.1, 0.8, 1, Zf - 0.1, Zf + 0.3, (26, 29, 38), (18, 20, 26), (30, 34, 44))
            # cobwebs between column and arch
            ax, ay = P(X + rc + 0.08 if X < 0 else X - rc - 0.08, spring + 0.14, Zf - 0.08)
            if X < 0:
                cobweb(cv, ax, ay, cam.scale(Zf) * 0.75, 0.0, 1.45, rng, 0.2)
            else:
                cobweb(cv, ax, ay, cam.scale(Zf) * 0.7, math.pi - 1.45, math.pi, rng, 0.14)
            # a chain draped around the column with a shackle
            k = cam.scale(Zf)
            cx0 = P(X, 0.1, Zf - 0.3)
            cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (x0, cx0[1], (x1 - x0) / 2, 0.08 * k, x1 - x0, 0),
                     "none", Zf - 0.3, stroke=C["iron"], sw=max(2, 0.03 * k))
            hang = x1 if X < 0 else x0
            cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (hang, cx0[1], (8 if X < 0 else -8), 0.2 * k, 0, 0.4 * k),
                     "none", Zf - 0.3, stroke=C["iron"], sw=max(2, 0.025 * k))
            cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (hang, cx0[1] + 0.44 * k, 0.05 * k, 0.04 * k),
                     "none", Zf - 0.3, stroke=C["iron"], sw=max(2, 0.02 * k))
    objects.append((Zf, front))

    for _, fn in sorted(objects, key=lambda o: -o[0]):
        fn()

    # ---- will-o'-the-wisps (emissive) ------------------------------------------------
    s = min(W / 1920, H / 1080) ** 0.5 * (1 if W > H else 0.9)
    for (xf, yf, size, st) in ((0.10, 0.44, 9, 0.9), (0.52, 0.36, 6, 0.6), (0.515, 0.615, 5, 0.45),
                               (0.47, 0.48, 5, 0.45), (0.66, 0.27, 5, 0.4), (0.88, 0.33, 6, 0.45),
                               (0.20, 0.62, 5, 0.6)):
        wisp(cv, xf * W, yf * H, size * 1.7 * s * (1.3 if W < H else 1), st)
    return cv, cam


# ---------------------------------------------------------------------------
# compositing
# ---------------------------------------------------------------------------
def composite(col, dep, emi, fmt, cam, seed=3):
    rng = np.random.default_rng(seed)
    W, H = fmt["W"], fmt["H"]
    moon = np.array(MOON, np.float32) / 255.0
    z = dep[..., 0] * 12.0
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    kx, ky = fmt["crack"][0] * W, fmt["crack"][1] * H
    bx, by = fmt["beam_foot"][0] * W, fmt["beam_foot"][1] * H
    # cold moonlight: pool on the floor and diffuse wash near the crack
    pool = np.exp(-radial(W, H, bx, by, W * 0.16, H * 0.07) ** 2)
    wash = np.exp(-radial(W, H, kx + W * 0.05, ky + H * 0.25, W * 0.33, H * 0.42) ** 2)
    near = np.clip((z - 2.2) / 0.8, 0, 1)
    light = 0.62 + (0.9 * wash + 0.6 * pool) * (0.25 + 0.75 * near)
    img = col * light[..., None]
    img = img * (0.92 + 0.08 * moon)
    # depth fog, bluish and dark
    fog_amt = 1 - np.exp(-np.clip(z - 2.0, 0, None) * 0.33)
    fog_col = np.array([0.075, 0.095, 0.14], np.float32)
    img = img * (1 - 0.5 * fog_amt[..., None]) + fog_col * 0.5 * fog_amt[..., None]
    # moonbeam: volumetric shaft from the crack to the floor
    sw = W * 0.018 if W > H else W * 0.03
    fw = W * 0.06 if W > H else W * 0.1
    beam = polygon_mask(W, H, [(kx - sw, ky), (kx + sw, ky), (bx + fw, by), (bx - fw * 0.8, by)], r=W * 0.004)
    streak = np.clip(0.55 + 0.9 * (np.asarray(np.random.default_rng(5).random((1, 64))).repeat(2, 0)), 0, 1)
    from PIL import Image
    st = Image.fromarray((streak / streak.max() * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    st = np.asarray(st.rotate(-math.degrees(math.atan2(bx - kx, by - ky)), resample=Image.BICUBIC,
                              center=(kx, ky))).astype(np.float32) / 255.0
    along = np.clip((y - ky) / (by - ky), 0, 1)
    beam = beam * (0.55 + 0.45 * st) * (1 - 0.55 * along) * (0.6 + 0.4 * fbm(W, H, 120, rng, 3))
    halo = blur(beam, W * 0.03)
    img = img + (beam * 0.5 + halo * 0.25)[..., None] * moon
    # the pool of moonlight where the shaft lands
    spot = np.exp(-radial(W, H, bx + fw * 0.1, by + H * 0.01, fw * 1.3, H * 0.035) ** 4)
    img = img + (spot * 0.06)[..., None] * moon + img * (spot * 0.45)[..., None]
    # floating dust in the beam
    dust = np.zeros((H, W), np.float32)
    n = int(W * H / 3500)
    ys_ = rng.integers(0, H, n)
    xs_ = rng.integers(0, W, n)
    dust[ys_, xs_] = rng.random(n) * 1.5
    dust = blur(np.clip(dust, 0, 1), 0.8) * 4 * beam
    img = img + dust[..., None] * moon * 0.5
    # cold ground fog, layered, thicker in the middle distance
    horizon = cam.cy + cam.f / cam.Zb
    prof = np.exp(-((y - (horizon + H * 0.07)) / (H * 0.085)) ** 2) + 0.35 * np.exp(-((y - H * 0.88) / (H * 0.07)) ** 2)
    n1 = fbm(W, H, 260, rng, 4, stretch=(3.0, 1.0))
    n2 = fbm(W, H, 90, rng, 3, stretch=(4.0, 1.0))
    fog = np.clip((n1 * 0.7 + n2 * 0.5 - 0.35) * 1.6, 0, 1) * prof
    fog_c = np.array([0.36, 0.43, 0.58], np.float32)
    img = img * (1 - 0.4 * fog[..., None]) + fog_c * 0.4 * fog[..., None] * (0.7 + 0.8 * pool[..., None])
    # wisps and moonlight cast light on nearby stone
    img = img + col * blur_hdr(emi, 60) * 2.5
    # emissive and bloom
    img = img + emi * 0.9
    bloom = blur_hdr(emi, 14) * 0.9 + blur_hdr(emi, 45) * 0.8
    img = img + bloom
    # wisps light the ground fog around them
    img = img + blur_hdr(emi, 90)[..., :] * fog[..., None] * 1.5
    return finish(img, rng, max_value=0.84, shadow_tint=(0.01, 0.02, 0.05))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "..", "..", "public", "fondos")
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
            passes[which] = to_f(render(cv, which, os.path.join(work, "cripta-%s-%s.png" % (name, which))))
        img = composite(passes["color"], passes["depth"], passes["emissive"], fmt, cam)
        out = os.path.join(out_dir, "cripta%s.webp" % fmt["suffix"])
        q, kb = save_webp(img, out, fmt["max_kb"])
        mockup(img, os.path.join(work, "cripta-%s-maqueta.png" % name))
        print("%s  q=%d  %.0f KB" % (out, q, kb))


if __name__ == "__main__":
    main()
