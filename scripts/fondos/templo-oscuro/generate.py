"""Combat background «El Templo Oscuro» (Act II): a desecrated temple where a cult opens the Abyss.

Colossal broken columns, beheaded statues of old gods, cult banners, an altar with black candles
and spilled wax, a rune circle engraved in the middle-ground floor, braziers with violet fire, a
contained Abyss portal with violet swirls at the back, and cold light from a broken rose window
(top left).

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paint_kit import (STD_DEFS, Camera, Canvas, blur, blur_hdr, fbm, finish, hexc, jitter,  # noqa: E402
                       mix, mockup, polygon_mask, pts, radial, render, save_webp, to_f)

MOON = (190, 210, 255)

FORMATS = {
    "wide": dict(W=1920, H=1080, cam=dict(vpx=0.55, vpy=0.50, yn=1.05, yb=0.64, bw=0.36, vt=0.07, ys=0.30),
                 rose=(0.285, 0.255, 0.082), portal=(0.455, 0.40, 0.105), statues=(0.335, 0.565),
                 altar=(0.39, 0.52), circle=(0.43, 2.95, 0.95), braziers=(0.315, 0.525), banners=(0.455, 0.70),
                 rays_foot=(0.17, 0.40, 0.76), obj=1.0, suffix="", max_kb=380),
    "tall": dict(W=1080, H=1440, cam=dict(vpx=0.55, vpy=0.52, yn=1.04, yb=0.665, bw=0.42, vt=0.12, ys=0.33),
                 rose=(0.27, 0.27, 0.075), portal=(0.47, 0.44, 0.085), statues=(0.30, 0.64),
                 altar=(0.38, 0.56), circle=(0.44, 2.3, 0.5), braziers=(0.30, 0.575), banners=(0.47, 0.76),
                 rays_foot=(0.12, 0.42, 0.78), obj=0.72, suffix="-movil", max_kb=300),
}

C = dict(
    back=(38, 38, 52), left=(31, 31, 44), right=(40, 40, 55), vault=(30, 30, 43), floor=(27, 27, 37),
    mortar=(20, 20, 29), rib=(52, 52, 68), rib_side=(32, 32, 44), column=(50, 50, 66), column_dark=(22, 22, 31),
    statue=(50, 50, 65), statue_dark=(34, 35, 46), iron=(22, 21, 27), crimson=(92, 22, 38), violet=(58, 30, 84),
    gold=(146, 118, 70), candle=(20, 18, 24), wax=(44, 40, 50), altar=(46, 45, 60), cloth=(16, 12, 22),
)


def stone_courses(cv, rng, quad_fn, u0, u1, v0, v1, course_h, block_w, base, var=0.14, z=5.0, gap=0.01):
    v = v0
    row = 0
    while v < v1 - 1e-6:
        h = min(course_h * rng.uniform(0.85, 1.15), v1 - v)
        u = u0 - (block_w * 0.5 if row % 2 else 0) * rng.uniform(0.3, 1)
        while u < u1 - 1e-6:
            w = block_w * rng.uniform(0.5, 1.4)
            a, b = max(u, u0), min(u + w, u1)
            if b - a > 0.05:
                col = jitter(base, var, rng)
                if rng.random() < 0.05:
                    col = mix(col, (58, 44, 70), 0.25)
                q = [quad_fn(a + gap, v + gap), quad_fn(b - gap, v + gap),
                     quad_fn(b - gap, v + h - gap), quad_fn(a + gap, v + h - gap)]
                cv.poly(q, col, z)
            u += w
        v += h
        row += 1


def box(cv, cam, x0, x1, y0, y1, z0, z1, front, side, top):
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


def cult_sigil(cx, cy, r, colour, width, opacity=1.0):
    """The cult's mark: a broken ring around an eye, with three hooks falling from it."""
    s = ('<g fill="none" stroke="%s" stroke-width="%.1f" opacity="%.2f" stroke-linecap="round">' % (
        hexc(colour), width, opacity))
    s += '<path d="M%.1f,%.1f A%.1f,%.1f 0 1 1 %.1f,%.1f"/>' % (
        cx + r * math.cos(-1.2), cy + r * math.sin(-1.2), r, r, cx + r * math.cos(-1.9), cy + r * math.sin(-1.9))
    s += '<path d="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f"/>' % (
        cx - r * 0.62, cy, cx, cy - r * 0.5, cx + r * 0.62, cy, cx, cy + r * 0.5, cx - r * 0.62, cy)
    s += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (cx, cy, r * 0.17, hexc(colour))
    for dx in (-0.45, 0, 0.45):
        s += '<path d="M%.1f,%.1f l0,%.1f q0,%.1f %.1f,%.1f"/>' % (
            cx + dx * r, cy + r * (1.0 if dx == 0 else 0.9), r * 0.55, r * 0.25, -r * 0.2, r * 0.1)
    return s + "</g>"


def banner(cv, x, y0, w, L, z, rng, base=C["crimson"], sigil=True):
    """Hanging cult banner with a rod, folds, torn tails and the sigil."""
    gid = "ban%d" % rng.randint(0, 10 ** 8)
    cv.defs.append(('<linearGradient id="%s" x1="0" x2="1"><stop offset="0" stop-color="%s"/>'
                    '<stop offset="0.25" stop-color="%s"/><stop offset="0.55" stop-color="%s"/>'
                    '<stop offset="0.8" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>') % (
        gid, hexc(mix(base, (0, 0, 0), 0.55)), hexc(mix(base, MOON, 0.08)), hexc(mix(base, (0, 0, 0), 0.35)),
        hexc(base), hexc(mix(base, (0, 0, 0), 0.6))))
    sway = rng.uniform(-0.04, 0.04) * L
    tails = 3
    bottom = []
    for i in range(tails * 2 + 1):
        fx = i / (tails * 2)
        depth = L * (1.0 if i % 2 == 0 else 0.86) * rng.uniform(0.95, 1.03)
        bottom.append((x - w / 2 + fx * w + sway, y0 + depth))
    shape = [(x - w / 2, y0), (x + w / 2, y0)]
    shape += [(x + w / 2 + sway * 0.5, y0 + L * 0.5)] + bottom[::-1] + [(x - w / 2 + sway * 0.5, y0 + L * 0.5)]
    d = "M%.1f,%.1f " % shape[0] + " ".join("L%.1f,%.1f" % p for p in shape[1:]) + " Z"
    cv.path(d, base, z)
    cv.paint('<path d="%s" fill="url(#%s)"/>' % (d, gid))
    # a border band and torn holes
    cv.paint('<path d="M%.1f,%.1f L%.1f,%.1f M%.1f,%.1f L%.1f,%.1f" stroke="%s" stroke-width="%.1f" opacity="0.6"/>' % (
        x - w * 0.42, y0 + 4, x - w * 0.42 + sway * 0.8, y0 + L * 0.84, x + w * 0.42, y0 + 4, x + w * 0.42 + sway * 0.8,
        y0 + L * 0.84, hexc(mix(C["gold"], base, 0.55)), max(1, w * 0.03)))
    for _ in range(2):
        hx, hy = x + rng.uniform(-0.25, 0.25) * w, y0 + rng.uniform(0.55, 0.8) * L
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#08070b"/>' % (
            hx, hy, w * rng.uniform(0.04, 0.08), w * rng.uniform(0.06, 0.12)))
    if sigil:
        cv.paint(cult_sigil(x + sway * 0.3, y0 + L * 0.32, w * 0.26, mix(C["gold"], base, 0.25), max(1.2, w * 0.045)))
    # rod, finials and cords
    cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (x - w * 0.62, y0, x + w * 0.62, y0), "none", z,
             stroke=C["iron"], sw=max(2, w * 0.06))
    for sx in (-1, 1):
        cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (x + sx * w * 0.64, y0, max(2, w * 0.05)), C["iron"], z)
    for b in bottom[::2]:
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.7"/>' % (
            b[0], b[1], b[0] + rng.uniform(-2, 2), b[1] + L * 0.05, hexc(mix(C["gold"], base, 0.5))))


def headless_statue(cv, cam, X, Z, height, rng, dim=0.0, flip=1):
    """Colossal beheaded god on a pedestal. Local units: u lateral, v up (world units)."""
    P = cam.p
    k = cam.scale(Z)
    ped_h = 0.55
    box(cv, cam, X - 0.45, X + 0.45, 1 - ped_h, 1, Z - 0.35, Z + 0.35, mix(C["altar"], C["floor"], dim),
        mix(C["rib_side"], C["floor"], dim), mix(C["rib"], C["floor"], dim))
    box(cv, cam, X - 0.52, X + 0.52, 1 - ped_h - 0.08, 1 - ped_h, Z - 0.4, Z + 0.4, mix(C["rib"], C["floor"], dim),
        mix(C["rib_side"], C["floor"], dim), mix(C["rib"], C["floor"], dim))
    bx, by = P(X, 1 - ped_h - 0.08, Z - 0.05)
    s = height * k

    def T(u, v):
        return (bx + flip * u * s, by - v * s)
    body = [(-0.2, 0), (-0.19, 0.2), (-0.16, 0.45), (-0.14, 0.62), (-0.155, 0.75), (-0.17, 0.8), (-0.12, 0.83),
            (-0.045, 0.845), (-0.04, 0.87), (-0.01, 0.885), (0.02, 0.865), (0.045, 0.88), (0.05, 0.845),
            (0.13, 0.83), (0.175, 0.79), (0.18, 0.7), (0.15, 0.58), (0.16, 0.45), (0.19, 0.2), (0.21, 0)]
    arm_up = [(-0.15, 0.78), (-0.21, 0.83), (-0.27, 0.93), (-0.29, 0.99), (-0.25, 1.0), (-0.22, 0.92),
              (-0.16, 0.84)]
    arm_dn = [(0.14, 0.79), (0.18, 0.7), (0.15, 0.6), (0.05, 0.56), (0.03, 0.6), (0.12, 0.64), (0.13, 0.72)]
    stone = mix(C["statue"], C["floor"], dim)
    dark = mix(C["statue_dark"], C["floor"], dim)
    # staff held high, snapped at the top
    st0, st1 = T(-0.27, 1.08), T(-0.27, 0.05)
    cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (*st0, *st1), "none", Z, stroke=dark, sw=max(2, 0.035 * s))
    cv.poly([T(*p) for p in body], stone, Z)
    cv.poly([T(*p) for p in arm_up], stone, Z)
    cv.poly([T(*p) for p in arm_dn], stone, Z)
    # shading: the side away from the rose window light
    shade = [T(0.02, 0), T(0.21, 0), T(0.19, 0.2), T(0.16, 0.45), T(0.15, 0.58), T(0.18, 0.7), T(0.175, 0.79),
             T(0.13, 0.83), T(0.06, 0.84), T(0.07, 0.6), T(0.05, 0.3)]
    cv.paint('<polygon points="%s" fill="%s" opacity="0.75"/>' % (pts(shade), hexc(dark)))
    # drapery folds
    for u in (-0.12, -0.06, 0.0, 0.07, 0.12):
        a, b = T(u * 0.9, 0.52), T(u * 1.15, 0.02)
        cv.paint('<path d="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.6"/>' % (
            a[0], a[1], (a[0] + b[0]) / 2 + flip * 3, (a[1] + b[1]) / 2, b[0], b[1], hexc(dark), max(1, 0.008 * s)))
    belt = [T(-0.15, 0.56), T(0.15, 0.55)]
    cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" opacity="0.7"/>' % (
        *belt[0], *belt[1], hexc(dark), max(1.2, 0.012 * s)))
    # the broken neck: pale fresh fracture
    brk = [T(-0.045, 0.845), T(-0.04, 0.87), T(-0.01, 0.885), T(0.02, 0.865), T(0.045, 0.88), T(0.05, 0.845)]
    cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f"/>' % (
        pts(brk), hexc(mix(stone, MOON, 0.35)), max(1.2, 0.01 * s)))
    # rim light from the rose window on the lit edge
    rim = [T(*p) for p in body[:8]] if flip > 0 else [T(*p) for p in body[12:]]
    cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="%.2f"/>' % (
        pts(rim), hexc(mix(MOON, stone, 0.4)), max(1.2, 0.008 * s), 0.45 * (1 - dim)))
    return T


def build(fmt, seed=11):
    rng = random.Random(seed)
    W, H = fmt["W"], fmt["H"]
    cam = Camera(W, H, **fmt["cam"])
    P = cam.p
    Wr, Zb, Ys, Yc = cam.Wr, cam.Zb, cam.Ys, cam.Yc
    cv = Canvas(W, H)
    cv.defs.append(STD_DEFS)
    rise = Ys - Yc

    def arch_h(u):
        """Pointed (gothic) arch profile, 0 at the springing and 1 at the apex."""
        u = min(1.0, abs(u))
        return 0.55 * math.sqrt(max(0.0, 1 - u * u)) + 0.45 * (1 - u)

    def vault_pt(th, Z, inset=0.0):
        u = -math.cos(th)
        return P(u * (Wr - inset), Ys - (rise - inset) * arch_h(u), Z)

    def screen_X(xf, Z):
        return (xf * W - cam.cx) * Z / cam.f

    def screen_Y(yf, Z):
        return (yf * H - cam.cy) * Z / cam.f

    Zf = 2.2
    t = 0.3

    # ---- back wall -------------------------------------------------------------------
    wall = [P(-Wr, 1, Zb)] + [vault_pt(math.pi * i / 60, Zb) for i in range(61)] + [P(Wr, 1, Zb)]
    cv.defs.append('<clipPath id="backwall"><polygon points="%s"/></clipPath>' % pts(wall))
    cv.poly(wall, C["mortar"], Zb)
    cv.open('filter="url(#rock)"', 'clip-path="url(#backwall)"')
    stone_courses(cv, rng, lambda u, v: P(u, v, Zb), -Wr, Wr, Yc - 0.1, 1.0, 0.3, 0.8, C["back"], z=Zb)
    cv.close()
    cv.defs.append('<linearGradient id="streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.5"/>'
                   '<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>')
    grp = ['<g clip-path="url(#backwall)">']
    for _ in range(12):
        a = P(rng.uniform(-Wr, Wr), Yc, Zb)
        grp.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#streak)" opacity="%.2f" filter="url(#blur5)"/>' % (
            a[0], a[1], rng.uniform(0.1, 0.5) * cam.scale(Zb), rng.uniform(0.3, 0.8) * (P(0, 1, Zb)[1] - a[1]),
            rng.uniform(0.3, 0.6)))
    grp.append("</g>")
    cv.paint("".join(grp))

    # blind arcade on the back wall (tall pointed recesses)
    def pointed(xc, half, y_base, y_spring, height, Z, n=16):
        q = [P(xc - half, y_base, Z), P(xc - half, y_spring, Z)]
        for i in range(1, n):
            u = -1 + 2 * i / n
            q.append(P(xc + u * half, y_spring - height * arch_h(u), Z))
        q += [P(xc + half, y_spring, Z), P(xc + half, y_base, Z)]
        return q
    Xp = screen_X(fmt["portal"][0], Zb)
    for i in range(-6, 7):
        xc = Xp + i * 0.95
        if abs(i) <= 1 or abs(xc) > Wr - 0.5:
            continue
        cv.poly(pointed(xc, 0.3, 0.2, -1.4, 0.7, Zb), (17, 17, 25), Zb)
        cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.5" opacity="0.5"/>' % (
            pts(pointed(xc, 0.3, 0.2, -1.4, 0.7, Zb)[1:-1]), hexc(C["rib"])))
    # desecration: the cult sigil smeared on the wall
    sx_, sy_ = P(screen_X(0.74, Zb), -1.9, Zb)
    cv.paint(cult_sigil(sx_, sy_, cam.scale(Zb) * 0.32, (80, 18, 28), cam.scale(Zb) * 0.05, 0.55))

    # ---- broken rose window (main light) ----------------------------------------------
    rx, ry, rr = fmt["rose"][0] * W, fmt["rose"][1] * H, fmt["rose"][2] * H
    cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (rx, ry, rr * 1.18), (26, 26, 36), Zb)
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#9fb6e8" opacity="0.62"/>' % (rx, ry, rr),
            '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#8093b8"/>' % (rx, ry, rr))
    # broken panes: holes shine brighter
    for i in range(5):
        a = rng.uniform(math.pi * 0.6, math.pi * 1.6)
        r0 = rr * rng.uniform(0.3, 0.8)
        cx_, cy_ = rx + math.cos(a) * r0, ry + math.sin(a) * r0
        shard = [(cx_ + math.cos(b) * rr * rng.uniform(0.08, 0.2), cy_ + math.sin(b) * rr * rng.uniform(0.08, 0.2))
                 for b in np.linspace(0, 2 * math.pi, 7)[:-1]]
        cv.glow('<polygon points="%s" fill="#e2ecff" opacity="0.85"/>' % pts(shard),
                '<polygon points="%s" fill="#aebfdf"/>' % pts(shard))
    # stone tracery on top (occludes the glow)
    tw = max(2.5, rr * 0.07)
    trac = []
    trac.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke-width="%.1f"/>' % (rx, ry, rr, tw * 1.6))
    trac.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke-width="%.1f"/>' % (rx, ry, rr * 0.3, tw))
    trac.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke-width="%.1f"/>' % (rx, ry, rr * 0.66, tw * 0.8))
    for i in range(12):
        a = 2 * math.pi * i / 12
        if i in (8,):  # a missing spoke
            continue
        trac.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke-width="%.1f"/>' % (
            rx + math.cos(a) * rr * 0.3, ry + math.sin(a) * rr * 0.3, rx + math.cos(a) * rr, ry + math.sin(a) * rr, tw))
        a2 = a + math.pi / 12
        trac.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke-width="%.1f"/>' % (
            rx + math.cos(a2) * rr * 0.83, ry + math.sin(a2) * rr * 0.83, rr * 0.12, tw * 0.6))
    for m in trac:
        tag, rest = m[1:].split(" ", 1)
        geom = rest.rsplit(" stroke-width", 1)[0].replace(' fill="none"', "")
        sw = float(rest.split('stroke-width="')[1].split('"')[0])
        cv.solid(tag, geom, "none", Zb, stroke=(30, 30, 40), sw=sw)
    # jagged break in the lower left of the rose
    brk = [(rx - rr * 0.95, ry + rr * 0.1), (rx - rr * 0.6, ry + rr * 0.25), (rx - rr * 0.7, ry + rr * 0.5),
           (rx - rr * 0.35, ry + rr * 0.55), (rx - rr * 0.45, ry + rr * 0.85), (rx - rr * 0.9, ry + rr * 0.6)]
    cv.glow('<polygon points="%s" fill="#dfe9ff" opacity="0.9"/>' % pts(brk), '<polygon points="%s" fill="#a8b8d8"/>' % pts(brk))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#86a4ff" opacity="0.3" filter="url(#blur30)"/>' % (rx, ry, rr * 1.6))

    # ---- the Abyss portal (contained) -------------------------------------------------
    px, py, pr = fmt["portal"][0] * W, fmt["portal"][1] * H, fmt["portal"][2] * H
    cv.solid("circle", 'cx="%.1f" cy="%.1f" r="%.1f"' % (px, py, pr), (6, 3, 12), Zb)
    cv.paint('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#150a24"/>' % (px, py, pr))
    for arm in range(7):
        a0 = 2 * math.pi * arm / 7
        d = ""
        for i in range(40):
            f = i / 39
            a = a0 + f * 4.2
            r = pr * (0.08 + 0.9 * f)
            d += ("M" if i == 0 else "L") + "%.1f,%.1f " % (px + math.cos(a) * r, py + math.sin(a) * r * 0.98)
        colr = ["#5a2ab0", "#8250d0", "#3c1a78"][arm % 3]
        cv.glow('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.2" filter="url(#blur2)"/>' % (
            d, colr, pr * 0.07),
            '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.3" filter="url(#blur2)"/>' % (
            d, colr, pr * 0.08))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#050108"/>' % (px, py, pr * 0.2),
            '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#050108" filter="url(#blur5)"/>' % (px, py, pr * 0.22))
    cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#b27aff" stroke-width="%.1f" opacity="0.25" filter="url(#blur5)"/>' % (
        px, py, pr * 0.95, pr * 0.06))
    # stone ring with rune voussoirs and horns
    ring_w = pr * 0.22
    for i in range(18):
        a0, a1 = 2 * math.pi * i / 18, 2 * math.pi * (i + 1) / 18
        q = [(px + math.cos(a) * r, py + math.sin(a) * r) for a, r in
             ((a0, pr), (a1, pr), (a1, pr + ring_w), (a0, pr + ring_w))]
        cv.poly(q, jitter((44, 42, 58), 0.12, rng), Zb - 0.05, stroke=(16, 14, 22), sw=1.5)
        am = (a0 + a1) / 2
        rx_, ry_ = px + math.cos(am) * (pr + ring_w / 2), py + math.sin(am) * (pr + ring_w / 2)
        cv.glow('<path d="M%.1f,%.1f l%.1f,%.1f l%.1f,%.1f" stroke="#a36bff" stroke-width="1.4" fill="none" opacity="0.55"/>' % (
            rx_ - ring_w * 0.15, ry_ - ring_w * 0.2, ring_w * 0.15, ring_w * 0.4, ring_w * 0.15, -ring_w * 0.4),
            '<path d="M%.1f,%.1f l%.1f,%.1f l%.1f,%.1f" stroke="#1a1024" stroke-width="1.4" fill="none"/>' % (
            rx_ - ring_w * 0.15, ry_ - ring_w * 0.2, ring_w * 0.15, ring_w * 0.4, ring_w * 0.15, -ring_w * 0.4))
    for sx in (-1, 1):
        hb = (px + sx * (pr + ring_w * 0.5) * 0.7, py - (pr + ring_w * 0.5) * 0.7)
        horn = [(hb[0] - ring_w * 0.4, hb[1]), (hb[0] + ring_w * 0.4 * sx, hb[1] + ring_w * 0.3),
                (hb[0] + sx * ring_w * 1.6, hb[1] - ring_w * 2.3), (hb[0] + sx * ring_w * 0.5, hb[1] - ring_w * 0.6)]
        cv.poly(horn, (36, 33, 46), Zb - 0.05)
    cv.poly([(px - pr * 1.1, py + pr + ring_w * 0.9), (px + pr * 1.1, py + pr + ring_w * 0.9),
             (px + pr * 0.9, py + pr + ring_w * 0.2), (px - pr * 0.9, py + pr + ring_w * 0.2)], (40, 38, 52), Zb - 0.05)

    # ---- side walls --------------------------------------------------------------------
    for side in (-1, 1):
        Xw = side * Wr
        z_near = max(1.05, cam.f * Wr / (cam.cx if side < 0 else W - cam.cx) * 0.9)
        quad = [P(Xw, Ys, z_near), P(Xw, Ys, Zb), P(Xw, 1, Zb), P(Xw, 1, z_near)]
        cv.poly(quad, C["mortar"], (z_near + Zb) / 2)
        base = C["left"] if side < 0 else C["right"]
        cv.open('filter="url(#rock)"')
        stone_courses(cv, rng, lambda u, v: P(Xw, v, u), z_near, Zb, Ys, 1.0, 0.3, 0.8, base, z=3.0)
        cv.close()
        # tall statue niches along the aisle walls with small beheaded figures
        Z = z_near + 0.3
        while Z < Zb - 0.5:
            q = [P(Xw, 0.9, Z), P(Xw, -0.8, Z)]
            for i in range(1, 12):
                u = -1 + 2 * i / 12
                q.append(P(Xw, -0.8 - 0.35 * arch_h(u), Z + 0.25 + u * 0.25))
            q += [P(Xw, -0.8, Z + 0.5), P(Xw, 0.9, Z + 0.5)]
            cv.poly(q, (13, 13, 20), Z)
            cx_, cy_ = P(Xw, 0.9, Z + 0.25)
            k = cam.scale(Z + 0.25)
            fig = [(cx_ - 0.13 * k, cy_), (cx_ - 0.1 * k, cy_ - 0.9 * k), (cx_ - 0.13 * k, cy_ - 1.2 * k),
                   (cx_ - 0.03 * k, cy_ - 1.28 * k), (cx_ + 0.03 * k, cy_ - 1.27 * k), (cx_ + 0.12 * k, cy_ - 1.2 * k),
                   (cx_ + 0.1 * k, cy_ - 0.9 * k), (cx_ + 0.13 * k, cy_)]
            fig = [((x - cx_) * 0.55 + cx_, y) for x, y in fig]
            cv.poly(fig, mix(C["statue"], base, 0.5), Z + 0.25)
            Z += 0.8

    # ---- vault -------------------------------------------------------------------------
    zs = [1.0]
    while zs[-1] < Zb:
        zs.append(min(Zb, zs[-1] * 1.12))
    NTH = 20
    cv.open('filter="url(#rock)"')
    for i in range(len(zs) - 1):
        za, zb2 = zs[i], zs[i + 1]
        for j in range(NTH):
            off = (0.5 if i % 2 else 0) / NTH * math.pi
            a0 = max(0, math.pi * j / NTH - off)
            a1 = min(math.pi, math.pi * (j + 1) / NTH - off) if j < NTH - 1 else math.pi
            q = [vault_pt(a0, za), vault_pt(a1, za), vault_pt(a1, zb2), vault_pt(a0, zb2)]
            shade = 0.85 + 0.2 * math.sin((a0 + a1) / 2)
            cv.poly(q, jitter(tuple(v * shade for v in C["vault"]), 0.12, rng), za, stroke=C["mortar"], sw=1.2)
    cv.close()

    # ---- floor -------------------------------------------------------------------------
    cv.poly([P(-Wr, 1, 1.0), P(Wr, 1, 1.0), P(Wr, 1, Zb), P(-Wr, 1, Zb)], C["mortar"], 2.0)
    cv.open('filter="url(#rockfine)"')
    zf = [1.0]
    while zf[-1] < Zb:
        zf.append(min(Zb, zf[-1] * 1.1))
    for i in range(len(zf) - 1):
        za, zb2 = zf[i], zf[i + 1]
        calm = max(0.0, min(1.0, (za - 1.9) / 1.0))
        X = -Wr - (0.4 if i % 2 else 0)
        while X < Wr:
            w = 0.8 * rng.uniform(0.85, 1.15)
            a, b = max(X, -Wr), min(X + w, Wr)
            g = 0.008 + 0.012 * calm
            col = jitter(C["floor"], 0.025 + 0.09 * calm, rng)
            if (i + int(X / 0.8)) % 2 == 0:
                col = mix(col, (20, 18, 30), 0.3 * calm)  # chequered marble in the nave
            cv.poly([P(a + g, 1, za + g * 0.6), P(b - g, 1, za + g * 0.6), P(b - g, 1, zb2 - g * 0.6),
                     P(a + g, 1, zb2 - g * 0.6)], col, za)
            X += w
    cv.close()

    # ---- rune circle on the middle-ground floor ---------------------------------------
    cxf, cz, cr = fmt["circle"]
    cX = screen_X(cxf, cz)

    def ring(r, n=90):
        return [P(cX + r * math.cos(2 * math.pi * i / n), 1, cz + r * math.sin(2 * math.pi * i / n) * 0.75)
                for i in range(n)]
    rune_col = "#9a62ff"
    groove = "#0e0a16"
    for r, wdt in ((cr, 3.0), (cr * 0.84, 2.2), (cr * 0.45, 1.8)):
        cv.paint('<polygon points="%s" fill="none" stroke="%s" stroke-width="%.1f"/>' % (pts(ring(r)), groove, wdt + 1.5))
        cv.glow('<polygon points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.5"/>' % (pts(ring(r)), rune_col, wdt),
                '<polygon points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.5"/>' % (pts(ring(r)), rune_col, wdt * 0.6))
    star = []
    for i in range(7):
        a = -math.pi / 2 + 2 * math.pi * (i * 3 % 7) / 7
        star.append(P(cX + cr * 0.84 * math.cos(a), 1, cz + cr * 0.84 * math.sin(a) * 0.75))
    cv.paint('<polygon points="%s" fill="none" stroke="%s" stroke-width="3"/>' % (pts(star), groove))
    cv.glow('<polygon points="%s" fill="none" stroke="%s" stroke-width="1.6" opacity="0.4"/>' % (pts(star), rune_col),
            '<polygon points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity="0.45"/>' % (pts(star), rune_col))
    for i in range(28):
        a = 2 * math.pi * i / 28
        r = cr * 0.92
        x_, y_ = P(cX + r * math.cos(a), 1, cz + r * math.sin(a) * 0.75)
        k = cam.scale(cz + r * math.sin(a) * 0.75) * 0.05
        glyph = "M%.1f,%.1f l%.1f,%.1f l%.1f,%.1f m%.1f,%.1f l%.1f,%.1f" % (
            x_ - k, y_, k * rng.uniform(0.3, 1), -k * 0.35, k * rng.uniform(0.3, 1), k * 0.35, -k, -k * 0.2,
            rng.uniform(-1, 1) * k, k * 0.2)
        cv.glow('<path d="%s" stroke="%s" stroke-width="1.3" fill="none" opacity="0.55"/>' % (glyph, rune_col),
                '<path d="%s" stroke="%s" stroke-width="1.3" fill="none" opacity="0.6"/>' % (glyph, "#6a3fb0"))

    objects = []

    # ---- colossal columns: some intact, some broken, one fallen -------------------------
    def column(X, Z, radius, top_Y=None, broken=False, dim=0.0):
        def draw():
            k = cam.scale(Z)
            base_c = mix(C["column"], C["floor"], dim)
            box(cv, cam, X - radius - 0.15, X + radius + 0.15, 0.78, 1, Z - 0.2, Z + 0.2,
                mix(C["rib"], C["floor"], dim), mix(C["rib_side"], C["floor"], dim), mix(C["rib"], C["floor"], dim))
            box(cv, cam, X - radius - 0.08, X + radius + 0.08, 0.66, 0.78, Z - 0.14, Z + 0.14,
                mix(C["rib"], C["floor"], dim), mix(C["rib_side"], C["floor"], dim), mix(C["rib"], C["floor"], dim))
            yt = top_Y if top_Y is not None else Ys - 0.3
            x0, y0 = P(X - radius, yt, Z)
            x1, y1 = P(X + radius, 0.66, Z)
            gid = "col%d" % rng.randint(0, 10 ** 8)
            lit = X < screen_X(fmt["rose"][0], Z)  # columns left of the rose get light on their right side
            stops = ([(0, 0.3), (0.25, 0.55), (0.6, 1.25), (0.85, 0.9), (1, 0.35)] if lit else
                     [(0, 0.5), (0.18, 1.2), (0.5, 0.7), (0.8, 0.4), (1, 0.25)])
            cv.defs.append('<linearGradient id="%s" x1="0" x2="1">%s</linearGradient>' % (
                gid, "".join('<stop offset="%.2f" stop-color="%s"/>' % (o, hexc(tuple(v * m for v in base_c)))
                             for o, m in stops)))
            if broken:
                n = 9
                top = []
                for i in range(n + 1):
                    f = i / n
                    top.append((x0 + (x1 - x0) * f, y0 + rng.uniform(-0.25, 0.25) * k * (1 if 0 < i < n else 0.3)))
                shape = top + [(x1, y1), (x0, y1)]
            else:
                shape = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
            cv.poly(shape, base_c, Z)
            cv.paint('<polygon points="%s" fill="url(#%s)" filter="url(#rockfine)"/>' % (pts(shape), gid))
            for i in range(1, 10):
                xx = x0 + (x1 - x0) * (0.5 - 0.5 * math.cos(math.pi * i / 10))
                cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="%.1f" opacity="0.3"/>' % (
                    xx, max(y0, top[i][1] if broken and i < len(top) else y0) + 4, xx, y1, max(1, k * 0.012)))
            yy = y1
            drum = 0.55 * k
            while yy - drum > y0 + drum * 0.3:
                yy -= drum
                cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="1.2" opacity="0.45"/>' % (
                    x0, yy, x1, yy))
            if broken:
                cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.7"/>' % (
                    pts(top), hexc(mix(MOON, base_c, 0.7)), max(1.2, k * 0.008)))
            else:
                box(cv, cam, X - radius - 0.12, X + radius + 0.12, yt - 0.3, yt, Z - 0.12, Z + 0.12,
                    mix(C["rib"], C["floor"], dim), mix(C["rib_side"], C["floor"], dim), mix(C["rib"], C["floor"], dim))
        return draw

    def fallen_drums(X, Z, radius, n, dim=0.0):
        def draw():
            for i in range(n):
                xx = X + i * radius * 2.3
                zz = Z + i * 0.15
                k = cam.scale(zz)
                cx_, cy_ = P(xx, 1 - radius, zz)
                length = 0.6 * k
                col = mix(C["column"], C["floor"], dim)
                cv.poly([(cx_, cy_ - radius * k), (cx_ + length, cy_ - radius * k * 0.95),
                         (cx_ + length, cy_ + radius * k * 0.95), (cx_, cy_ + radius * k)], mix(col, (0, 0, 0), 0.25), zz)
                cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (cx_, cy_, radius * k * 0.4, radius * k),
                         mix(col, MOON, 0.08), zz)
                cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="#000" stroke-width="1" opacity="0.3"/>' % (
                    cx_, cy_, radius * k * 0.25, radius * k * 0.65))
        return draw

    colX_l = -cam.half_visible(Zf) * (cam.cx / (W / 2)) * 0.93
    colX_r = cam.half_visible(Zf) * ((W - cam.cx) / (W / 2)) * 0.93
    R = 0.42
    objects.append((Zf, column(colX_l, Zf, R)))
    objects.append((Zf, column(colX_r, Zf, R)))
    Zm = 3.25
    objects.append((Zm, column(screen_X(0.19, Zm), Zm, R * 0.95, top_Y=screen_Y(0.40, Zm), broken=True)))
    objects.append((Zm, column(screen_X(0.86, Zm), Zm, R * 0.95, top_Y=screen_Y(0.30, Zm), broken=True, dim=0.3)))
    objects.append((3.9, column(screen_X(0.80, 3.9), 3.9, R * 0.9, dim=0.35)))
    objects.append((2.9, fallen_drums(screen_X(0.235, 2.9), 2.9, 0.3, 2)))

    # ---- statues flanking the portal ----------------------------------------------------
    def statues():
        Zs_ = Zb - 0.45
        h_ = 2.1 * fmt["obj"] ** 0.7
        headless_statue(cv, cam, screen_X(fmt["statues"][0], Zs_), Zs_, h_, rng, flip=1)
        headless_statue(cv, cam, screen_X(fmt["statues"][1], Zs_), Zs_, h_, rng, dim=0.4, flip=-1)
        # the fallen stone head of a god, lying on the floor
        hx, hy = P(screen_X(fmt["statues"][0] + 0.06, Zs_ - 0.6), 0.86, Zs_ - 0.6)
        k = cam.scale(Zs_ - 0.6)
        cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (hx, hy, 0.17 * k, 0.14 * k), C["statue"], Zs_ - 0.6)
        cv.paint('<path d="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" stroke="%s" stroke-width="%.1f" fill="none"/>' % (
            hx - 0.1 * k, hy - 0.02 * k, 0.05 * k, 0.04 * k, 0.1 * k, 0, hexc(C["statue_dark"]), max(1, 0.015 * k)))
        cv.paint('<path d="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" stroke="%s" stroke-width="%.1f" fill="none"/>' % (
            hx - 0.12 * k, hy - 0.08 * k, 0.12 * k, -0.12 * k, 0.24 * k, -0.02 * k, hexc(C["statue_dark"]), max(1, 0.03 * k)))
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" opacity="0.6"/>' % (
            hx + 0.05 * k, hy + 0.04 * k, 0.11 * k, 0.08 * k, hexc(C["statue_dark"])))
    objects.append((Zb - 0.45, statues))

    # ---- altar with black candles and spilled wax -------------------------------------
    def altar():
        Za = Zb - 0.9
        xa, xb = screen_X(fmt["altar"][0], Za), screen_X(fmt["altar"][1], Za)
        # dais steps
        m = 1.0 if W > H else 0.5
        box(cv, cam, xa - 0.35, xb + 0.35, 0.9, 1, Za - 0.35 * m, Za + 0.8, C["rib_side"], C["rib_side"], C["rib"])
        box(cv, cam, xa - 0.2, xb + 0.2, 0.8, 0.9, Za - 0.2 * m, Za + 0.7, C["rib_side"], C["rib_side"], C["rib"])
        cv.open('filter="url(#rockfine)"')
        box(cv, cam, xa, xb, 0.32, 0.8, Za, Za + 0.5, C["altar"], C["rib_side"], C["altar"])
        cv.close()
        box(cv, cam, xa - 0.06, xb + 0.06, 0.24, 0.32, Za - 0.06, Za + 0.56, mix(C["altar"], MOON, 0.06),
            C["rib_side"], mix(C["rib_side"], (0, 0, 0), 0.2))
        k = cam.scale(Za)
        # black cloth with violet trim over the front
        c0, c1 = P(xa + 0.25, 0.32, Za - 0.001), P(xb - 0.25, 0.32, Za - 0.001)
        cl = [c0, c1, (c1[0], c1[1] + 0.35 * k), ((c0[0] + c1[0]) / 2, c1[1] + 0.42 * k), (c0[0], c0[1] + 0.35 * k)]
        cv.poly(cl, C["cloth"], Za - 0.01)
        cv.paint('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f" opacity="0.8"/>' % (
            pts(cl[2:] + [cl[0]][:0]), hexc(C["violet"]), max(1.5, k * 0.02)))
        cv.paint(cult_sigil((c0[0] + c1[0]) / 2, c0[1] + 0.17 * k, 0.09 * k, mix(C["gold"], C["cloth"], 0.3), max(1, k * 0.012), 0.9))
        # wax spilled down the altar front
        for _ in range(16):
            X = rng.uniform(xa + 0.05, xb - 0.05)
            if xa + 0.25 < X < xb - 0.25 and rng.random() < 0.7:
                continue
            a = P(X, 0.28, Za - 0.07)
            Lw = rng.uniform(0.05, 0.3) * k
            wd = rng.uniform(0.012, 0.03) * k
            cv.path("M%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Z" % (
                a[0] - wd, a[1], a[0] - wd * 0.7, a[1] + Lw, a[0] - wd * 0.7, a[1] + Lw + wd * 1.4, a[0], a[1] + Lw + wd * 1.4,
                a[0] + wd * 0.7, a[1] + Lw + wd * 1.4, a[0] + wd * 0.7, a[1] + Lw, a[0] + wd, a[1]), C["wax"], Za - 0.07)
        cv.paint('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" opacity="0.9"/>' % (
            P(xa - 0.06, 0.24, Za - 0.06)[0], P(xa, 0.24, Za - 0.06)[1] - 1, (xb - xa + 0.12) * cam.scale(Za - 0.06), 3,
            hexc(C["wax"])))
        # wax puddles on the dais
        for _ in range(4):
            X = rng.uniform(xa, xb)
            e = P(X, 0.8, Za - 0.12)
            cv.solid("ellipse", 'cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"' % (e[0], e[1], rng.uniform(0.05, 0.12) * k, 0.02 * k),
                     C["wax"], Za - 0.12)
        # black candles of many heights, flames of pale violet fire
        cands = []
        for _ in range(15):
            X = rng.uniform(xa + 0.05, xb - 0.05)
            Zc = Za + rng.uniform(0.05, 0.45)
            h = rng.uniform(0.08, 0.34)
            cands.append((Zc, X, h))
        for sx in (xa - 0.25, xb + 0.25):  # tall floor candelabra-candles on the dais corners
            cands.append((Za - 0.1, sx, 0.75))
        for Zc, X, h in sorted(cands, reverse=True):
            base_y = 0.24 if xa <= X <= xb else 0.8
            kc = cam.scale(Zc) * fmt["obj"] ** 0.5
            wdt = (0.035 if h < 0.5 else 0.05) * kc
            b = P(X, base_y, Zc)
            tp = P(X, base_y - h, Zc)
            cv.solid("rect", 'x="%.1f" y="%.1f" width="%.1f" height="%.1f"' % (b[0] - wdt / 2, tp[1], wdt, b[1] - tp[1]),
                     C["candle"], Zc)
            cv.paint('<path d="M%.1f,%.1f l0,%.1f" stroke="%s" stroke-width="%.1f" opacity="0.8"/>' % (
                b[0] - wdt * 0.3, tp[1] + 1, (b[1] - tp[1]) * rng.uniform(0.3, 0.7), hexc(C["wax"]), max(1, wdt * 0.25)))
            cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.5"/>' % (
                b[0] - wdt / 2, tp[1], b[0] - wdt / 2, b[1], hexc(mix(MOON, C["candle"], 0.6))))
            fx, fy = tp[0], tp[1] - wdt * 0.3
            fh = wdt * 2.2
            flame = "M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z" % (
                fx - wdt * 0.35, fy, fx - wdt * 0.4, fy - fh * 0.5, fx - wdt * 0.1, fy - fh * 0.7, fx, fy - fh,
                fx + wdt * 0.15, fy - fh * 0.7, fx + wdt * 0.4, fy - fh * 0.5, fx + wdt * 0.35, fy)
            cv.glow('<path d="%s" fill="#e4dcff" opacity="0.95"/>' % flame, '<path d="%s" fill="#cfc2ff"/>' % flame)
            cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#9c6bff" opacity="0.22" filter="url(#blur5)"/>' % (
                fx, fy - fh * 0.4, fh * 1.4))
        # a ritual bowl and dagger on the slab
        bw_ = P((xa + xb) / 2 - 0.15, 0.24, Za + 0.2)
        cv.solid("path", 'd="M%.1f,%.1f a%.1f,%.1f 0 0 0 %.1f,0 Z"' % (bw_[0] - 0.09 * k, bw_[1] - 0.03 * k, 0.09 * k, 0.07 * k,
                                                                    0.18 * k), (40, 34, 30), Za + 0.2)
        cv.paint('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#3a0c16"/>' % (bw_[0], bw_[1] - 0.03 * k, 0.085 * k, 0.018 * k))
        d0, d1 = P((xa + xb) / 2 + 0.1, 0.235, Za + 0.1), P((xa + xb) / 2 + 0.35, 0.235, Za + 0.18)
        cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (
            *d0, *d1, hexc(mix(MOON, (60, 60, 70), 0.5)), max(1.2, k * 0.012)))
    objects.append((Zb - 0.9, altar))

    # ---- braziers with violet fire -----------------------------------------------------
    def brazier(xf, Z):
        def draw():
            X = screen_X(xf, Z)
            k = cam.scale(Z) * fmt["obj"]
            top = (P(X, 1, Z)[0], P(X, 1, Z)[1] - 0.75 * k)
            foot = P(X, 1, Z)
            for dx in (-0.2, 0, 0.2):
                cv.solid("line", 'x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"' % (
                    top[0] + dx * k * 0.3, top[1], foot[0] + dx * k, foot[1] - (0.04 * k if dx == 0 else 0)), "none",
                    Z, stroke=C["iron"], sw=max(2, 0.03 * k))
            bw = 0.26 * k
            rim_y = top[1] - 0.08 * k
            cv.solid("path", 'd="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z"' % (top[0] - bw, rim_y, top[0], top[1] + 0.12 * k,
                                                                      top[0] + bw, rim_y), (30, 26, 30), Z)
            cv.paint('<path d="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="1.5" opacity="0.6"/>' % (
                top[0] - bw, rim_y, top[0] - bw * 0.6, top[1] + 0.06 * k, top[0], top[1] + 0.03 * k,
                hexc(mix(MOON, C["iron"], 0.5))))
            coals = '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#d0452c" opacity="0.4" filter="url(#blur2)"/>' % (
                top[0], rim_y, bw * 0.85, 0.035 * k)
            cv.glow(coals, coals.replace("#d0452c", "#6a2226"))
            # layered tongues of violet fire, soft-edged
            for layer, (colr, op, hs, blr) in enumerate((("#6f33e0", 0.32, 1.0, 5), ("#a879ff", 0.38, 0.72, 2),
                                                        ("#eadfff", 0.5, 0.38, 2))):
                for i in range(6):
                    fx = top[0] + (i - 2.5) * bw * 0.27 * (1 - 0.3 * layer)
                    fh = (0.34 - abs(i - 2.5) * 0.06) * k * hs * rng.uniform(0.75, 1.25)
                    fw = bw * 0.2 * (1 - 0.25 * layer)
                    lean = rng.uniform(-0.6, 0.6) * fw
                    fl = "M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z" % (
                        fx - fw, rim_y, fx - fw * 1.1, rim_y - fh * 0.45, fx + lean * 0.5 - fw * 0.2, rim_y - fh * 0.7,
                        fx + lean, rim_y - fh, fx + lean * 0.5 + fw * 0.3, rim_y - fh * 0.6, fx + fw * 1.1, rim_y - fh * 0.35,
                        fx + fw, rim_y)
                    cv.glow('<path d="%s" fill="%s" opacity="%.2f" filter="url(#blur%d)"/>' % (fl, colr, op, blr),
                            '<path d="%s" fill="%s" opacity="%.2f" filter="url(#blur%d)"/>' % (fl, colr, op * 0.8, blr))
            for sx in (-1, 1):
                cv.solid("path", 'd="M%.1f,%.1f q%.1f,%.1f %.1f,%.1f"' % (top[0] + sx * bw, rim_y, sx * 0.06 * k, -0.02 * k,
                                                                        sx * 0.05 * k, -0.1 * k), "none", Z,
                         stroke=C["iron"], sw=max(1.5, 0.02 * k))
            cv.glow('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#7c3cff" opacity="0.12" filter="url(#blur30)"/>' % (
                top[0], rim_y - 0.15 * k, 0.5 * k))
        return draw

    for xf in fmt["braziers"]:
        objects.append((Zb - 1.15, brazier(xf, Zb - 1.15)))

    # ---- banners hanging from the vault --------------------------------------------------
    def banners():
        Zbn = Zb - 0.3
        k = cam.scale(Zbn)
        x_, y_ = P(screen_X(fmt["banners"][0], Zbn), Yc + 0.35, Zbn)
        banner(cv, x_, y_, 0.55 * k * fmt["obj"], (fmt["portal"][1] - fmt["portal"][2] * 1.25) * H - y_ - 8, Zbn, rng)
        Zb2 = 3.0
        k2 = cam.scale(Zb2)
        x2, y2 = P(screen_X(fmt["banners"][1], Zb2), screen_Y(0.12, Zb2), Zb2)
        banner(cv, x2, y2, 0.5 * k2 * fmt["obj"], H * (0.26 if W > H else 0.24), Zb2, rng, base=C["violet"])
    objects.append((3.0, banners))

    def front_banner():
        Zb3 = Zf - 0.45
        k = cam.scale(Zb3)
        x3 = P(colX_l + 0.62, 0, Zb3)[0]
        banner(cv, x3, H * 0.1, 0.42 * k, H * 0.28, Zb3, rng, base=mix(C["crimson"], (0, 0, 0), 0.25))
    if W > H:
        objects.append((Zf - 0.45, front_banner))

    # rubble and shards across the middle ground
    def rubble():
        for _ in range(26):
            Z = rng.uniform(2.3, Zb - 0.2)
            X = rng.uniform(-Wr * 0.95, Wr * 0.95)
            x_, y_ = P(X, 1, Z)
            if y_ > H * 0.77:
                continue
            k = cam.scale(Z) * rng.uniform(0.04, 0.12)
            q = [(x_ - k, y_), (x_ - k * 0.5, y_ - k * 0.7), (x_ + k * 0.6, y_ - k * 0.6), (x_ + k, y_)]
            cv.poly(q, jitter(C["column"], 0.2, rng), Z)
            cv.paint('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" opacity="0.5"/>' % (
                q[1][0], q[1][1], q[2][0], q[2][1], hexc(mix(MOON, C["column"], 0.5))))
    objects.append((2.25, rubble))

    for _, fn in sorted(objects, key=lambda o: -o[0]):
        fn()

    # vault ribs over everything far (drawn last among architecture: the front arch)
    def front_arch():
        spring = Ys - 0.3
        span = (colX_r - colX_l) / 2 + R
        mid = (colX_l + colX_r) / 2

        def arch(o, Z):
            return [P(mid + (span - o) * (-1 + 2 * i / 40), spring - (span * 1.1 - o) * arch_h(-1 + 2 * i / 40), Z)
                    for i in range(41)]
        inner = arch(0.0, Zf)
        outer = arch(-0.5, Zf)
        sy = P(0, spring, Zf)[1]
        frame = [(-10, -10), (W + 10, -10), (W + 10, sy)] + inner[::-1] + [(-10, sy)]
        cv.poly(frame, (16, 16, 24), Zf)
        cv.open('filter="url(#rock)"')
        for i in range(18):
            a, b = inner[int(40 * i / 18)], inner[int(40 * (i + 1) / 18)]
            c, d = outer[int(40 * (i + 1) / 18)], outer[int(40 * i / 18)]
            cv.poly([a, b, c, d], jitter((30, 30, 42), 0.12, rng), Zf, stroke=(12, 12, 18), sw=1.5)
        cv.close()
    front_arch()
    return cv, cam


def composite(col, dep, emi, fmt, cam, seed=5):
    rng = np.random.default_rng(seed)
    W, H = fmt["W"], fmt["H"]
    moon = np.array(MOON, np.float32) / 255.0
    z = dep[..., 0] * 12.0
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    rx, ry, rr = fmt["rose"][0] * W, fmt["rose"][1] * H, fmt["rose"][2] * H
    fx0, fx1, fy = fmt["rays_foot"][0] * W, fmt["rays_foot"][1] * W, fmt["rays_foot"][2] * H
    near = np.clip((z - 2.2) / 0.8, 0, 1)
    wash = np.exp(-radial(W, H, rx + W * 0.03, ry + H * 0.3, W * 0.3, H * 0.45) ** 2)
    pool = np.exp(-radial(W, H, (fx0 + fx1) / 2, fy - H * 0.04, (fx1 - fx0) * 0.6, H * 0.06) ** 2)
    light = 0.6 + (0.85 * wash + 0.55 * pool) * (0.25 + 0.75 * near)
    img = col * light[..., None]
    # abyssal violet fog with depth
    fog_amt = 1 - np.exp(-np.clip(z - 2.0, 0, None) * 0.3)
    fog_col = np.array([0.085, 0.07, 0.14], np.float32)
    img = img * (1 - 0.5 * fog_amt[..., None]) + fog_col * 0.5 * fog_amt[..., None]
    # god rays from the rose window
    rays = np.zeros((H, W), np.float32)
    for i in range(7):
        f = i / 6
        xf = fx0 + (fx1 - fx0) * f
        w0 = rr * 0.12
        w1 = (fx1 - fx0) / 9 * rng.uniform(0.6, 1.3)
        sx = rx + (f - 0.5) * rr * 1.2
        m = polygon_mask(W, H, [(sx - w0, ry + rr * 0.4), (sx + w0, ry + rr * 0.4), (xf + w1, fy), (xf - w1, fy)], r=W * 0.004)
        rays += m * rng.uniform(0.5, 1.0)
    along = np.clip((y - ry) / (fy - ry), 0, 1)
    rays = np.clip(rays, 0, 1.3) * (1 - 0.6 * along) * (0.6 + 0.4 * fbm(W, H, 110, rng, 3))
    img = img + (rays * 0.28 + blur(np.clip(rays, 0, 1), W * 0.03) * 0.22)[..., None] * moon
    spot = np.exp(-radial(W, H, (fx0 + fx1) / 2, fy, (fx1 - fx0) * 0.55, H * 0.03) ** 4)
    img = img + (spot * 0.05)[..., None] * moon + img * (spot * 0.4)[..., None]
    # dust motes
    dust = np.zeros((H, W), np.float32)
    n = int(W * H / 3000)
    dust[rng.integers(0, H, n), rng.integers(0, W, n)] = rng.random(n) * 1.5
    dust = blur(np.clip(dust, 0, 1), 0.8) * 4 * np.clip(rays, 0, 1)
    img = img + dust[..., None] * moon * 0.45
    # violet mist creeping from the portal along the floor
    horizon = cam.cy + cam.f / cam.Zb
    prof = np.exp(-((y - (horizon + H * 0.06)) / (H * 0.08)) ** 2) + 0.3 * np.exp(-((y - H * 0.88) / (H * 0.07)) ** 2)
    n1 = fbm(W, H, 260, rng, 4, stretch=(3.0, 1.0))
    n2 = fbm(W, H, 90, rng, 3, stretch=(4.0, 1.0))
    mist = np.clip((n1 * 0.7 + n2 * 0.5 - 0.35) * 1.6, 0, 1) * prof
    mist_c = np.array([0.36, 0.3, 0.52], np.float32)
    img = img * (1 - 0.35 * mist[..., None]) + mist_c * 0.35 * mist[..., None]
    # local light from candles, braziers, runes and the portal
    img = img + col * blur_hdr(emi, 50) * 1.1
    img = img + emi * 0.7
    img = img + blur_hdr(emi, 12) * 0.5 + blur_hdr(emi, 40) * 0.35
    img = img + blur_hdr(emi, 90) * mist[..., None] * 0.9
    return finish(img, rng, max_value=0.84, shadow_tint=(0.02, 0.01, 0.05))


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
            passes[which] = to_f(render(cv, which, os.path.join(work, "templo-oscuro-%s-%s.png" % (name, which))))
        img = composite(passes["color"], passes["depth"], passes["emissive"], fmt, cam)
        out = os.path.join(out_dir, "templo-oscuro%s.webp" % fmt["suffix"])
        q, kb = save_webp(img, out, fmt["max_kb"])
        mockup(img, os.path.join(work, "templo-oscuro-%s-maqueta.png" % name))
        print("%s  q=%d  %.0f KB" % (out, q, kb))


if __name__ == "__main__":
    main()
