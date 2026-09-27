"""Campaign map «Las Tierras Ardientes» (Act III): scorched parchment of the burning lands.

A smoking volcano with lava rivers, obsidian crags, the bones of a dragon, the Beholder's
labyrinth, a great eye with its stalks in a margin and, in the corner, a winged dragon over a
ribbon hinting at «hic sunt dracones» (illegible). The parchment is charred at the edges with
burn holes. Everything big lives in the margins; the centre keeps faint fissures and ash.
Washed red / orange accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

ORANGE = (225, 115, 40)
RED = (190, 60, 35)
ASH = (90, 70, 60)


def begin(sk, x, y, rot=0, s=1.0, flip=False):
    g = '<g transform="translate(%.1f,%.1f) rotate(%.1f) scale(%.3f,%.3f)">' % (x, y, rot, -s if flip else s, s)
    sk.add(g)
    sk.wash.append(g)


def end(sk):
    sk.add("</g>")
    sk.wash.append("</g>")


def puff_cloud(sk, x, y, r, n=6, op=0.9):
    rng = sk.rng
    d = ""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((x + math.cos(a) * r * rng.uniform(0.8, 1.1), y + math.sin(a) * r * 0.7 * rng.uniform(0.8, 1.1)))
    d = "M%.1f,%.1f" % pts[0]
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        d += " Q%.1f,%.1f %.1f,%.1f" % (mx + (mx - x) * 0.7, my + (my - y) * 0.7, b[0], b[1])
    sk.white(d + " Z")
    sk.washblob(d + " Z", ASH, 0.18)
    sk.stroke(d + " Z", 1.0, op)
    # a curl inside
    sk.stroke("M%.1f,%.1f q%.1f,-%.1f %.1f,0" % (x - r * 0.3, y, r * 0.3, r * 0.3, r * 0.5), 0.7, 0.6 * op)


def volcano(sk, x, y, w, h):
    r = sk.rng
    lip = w * 0.13
    L, R = (x - w / 2, y), (x + w / 2, y)
    body = ("M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z"
            % (L[0], L[1], x - w * 0.2, y - h * 0.25, x - lip, y - h, x + lip, y - h, x + w * 0.2, y - h * 0.25,
               R[0], R[1]))
    # smoke plume drifting to the right
    for i in range(7):
        t = i / 6
        puff_cloud(sk, x + 10 + t * w * 0.75 + r.uniform(-6, 6), y - h - 26 - t * h * 0.35 + r.uniform(-6, 6),
                   w * (0.06 + 0.07 * t))
    sk.white(body)
    right = ("M%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z"
             % (x + lip * 0.2, y - h, x + lip, y - h, x + w * 0.2, y - h * 0.25, R[0], R[1],
                x + w * 0.05, y - h * 0.3, x + lip * 0.2, y - h))
    sk.hatch(right, (x, y - h, R[0], y), angle=-72, spacing=3.4, w=0.7, op=0.85)
    sk.hatch(body, (L[0], y - h * 0.35, R[0], y), angle=15, spacing=5, w=0.5, op=0.35)
    sk.stroke(body, 1.8)
    # gullies
    for i in range(6):
        t = (i + 0.5) / 6
        top = (x - lip + 2 * lip * t, y - h + 6)
        bot = (x - w * 0.4 + w * 0.8 * t + r.uniform(-8, 8), y - h * r.uniform(0.05, 0.35))
        mid = ((top[0] + bot[0]) / 2 + (t - 0.5) * w * 0.12, (top[1] + bot[1]) / 2 + 4)
        sk.stroke(K.smooth_path([top, mid, bot]), 0.7, 0.55)
    for _ in range(12):  # boulders at the foot
        bx = x + r.uniform(-0.5, 0.5) * w
        sk.stroke("M%.1f,%.1f q3,-6 8,-2 q3,3 0,5 Z" % (bx, y + r.uniform(2, 12)), 0.8, 0.8, fill="#fff")
    # crater glow and lava tongues
    sk.washellipse(x, y - h, lip * 1.3, h * 0.07, ORANGE, 0.7)
    sk.stroke("M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0" % (
        x - lip, y - h, lip, h * 0.035, 2 * lip, lip, h * 0.035, 2 * lip), 1.2)
    for sx in (-0.5, 0.15, 0.6):
        pts = [(x + lip * sx, y - h + 4)]
        for j in range(1, 7):
            pts.append((x + lip * sx + sx * w * 0.07 * j + r.uniform(-4, 4), y - h + h * j / 6.5))
        a = K.offset_line(pts, lambda t: 2 + 6 * t)
        b = K.offset_line(pts, lambda t: -2 - 6 * t)
        d = K.smooth_path(a) + " L" + " L".join("%.1f,%.1f" % q for q in b[::-1]) + " Z"
        sk.washblob(d, ORANGE, 0.6)
        sk.white(d)
        sk.stroke(K.smooth_path(a), 0.9)
        sk.stroke(K.smooth_path(b), 0.9)
    # flying ejecta
    for _ in range(10):
        a = r.uniform(-2.6, -0.5)
        dd = r.uniform(30, 80)
        sk.dot(x + math.cos(a) * dd, y - h + math.sin(a) * dd, r.uniform(1.2, 2.4))


def spire(sk, x, y, w, h, op=1.0):
    r = sk.rng
    pts = [(x - w / 2, y)]
    for i in range(1, 4):
        t = i / 4
        pts.append((x - w / 2 * (1 - t) + r.uniform(-3, 3), y - h * t * r.uniform(0.85, 1.0)))
    pts.append((x + r.uniform(-3, 3), y - h))
    for i in range(3, 0, -1):
        t = i / 4
        pts.append((x + w / 2 * (1 - t) + r.uniform(-3, 3), y - h * t * r.uniform(0.8, 1.0)))
    pts.append((x + w / 2, y))
    d = "M" + " L".join("%.1f,%.1f" % q for q in pts) + " Z"
    sk.white(d)
    rt = "M%.1f,%.1f " % (x, y - h) + " L".join("%.1f,%.1f" % q for q in pts[4:]) + " L%.1f,%.1f Z" % (x + w * 0.05, y)
    sk.hatch(rt, (x - w / 2, y - h, x + w / 2, y), angle=-75, spacing=2.6, w=0.7, op=0.9 * op)
    sk.stroke(d, 1.4, op)


def crags(sk, box, n, hmin, hmax):
    r = sk.rng
    x0, y0, x1, y1 = box
    items = []
    for _ in range(n):
        h = r.uniform(hmin, hmax)
        w = h * r.uniform(0.35, 0.6)
        items.append((r.uniform(x0 + w / 2, x1 - w / 2), r.uniform(y0 + h, y1), w, h))
    for x, y, w, h in sorted(items, key=lambda q: q[1]):
        spire(sk, x, y, w, h)


def lava_river(sk, pts, width, op=1.0):
    K.river(sk, pts, width, op, wash=ORANGE, wash_op=0.42, ripples=False)
    r = sk.rng
    wf = width if callable(width) else (lambda t: width)
    for i in range(1, len(pts) - 1, 2):
        p = pts[i]
        w = wf(i / len(pts))
        a = r.uniform(0, math.pi)
        crack = [(p[0] + math.cos(a) * w * 0.35, p[1] + math.sin(a) * w * 0.35)]
        crack.append((p[0] + r.uniform(-2, 2), p[1] + r.uniform(-2, 2)))
        crack.append((p[0] - math.cos(a + 0.6) * w * 0.35, p[1] - math.sin(a + 0.6) * w * 0.35))
        sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in crack), 0.6, 0.7 * op)


def dragon_bones(sk):
    """Dragon skeleton lying along +x, local size ~340 x 200 (head at x=0)."""
    r = sk.rng
    spine = [(40 + i * 12, 100 + 10 * math.sin(i * 0.25) - (i < 8) * (8 - i) * 2) for i in range(26)]
    for i, (x, y) in enumerate(spine):
        s = max(2.5, 7 - i * 0.18)
        sk.stroke("M%.1f,%.1f a%.1f,%.1f 0 1,0 0.1,0 Z" % (x, y - s * 0.6, s * 0.7, s * 0.6), 1.0)
        sk.line((x, y - s * 0.6), (x - 2, y - s * 1.6), 0.9)
    # ribs
    for i in range(5, 14):
        x, y = spine[i]
        L = 34 + 14 * math.sin((i - 5) / 8 * math.pi)
        for sgn in (-1, 1):
            sk.stroke("M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (x, y, x + 10, y + sgn * L * 0.8,
                                                                   x - 6, y + sgn * L * 1.1, x - 14, y + sgn * L),
                      1.2)
    # skull with horns and teeth
    hx, hy = 22, 96
    skull = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (
        hx + 18, hy - 12, hx - 22, hy - 4, hx - 30, hy + 2, hx - 20, hy + 6, hx + 10, hy + 12, hx + 20, hy + 2)
    sk.white(skull)
    sk.hatch(skull, (hx - 30, hy - 12, hx + 20, hy + 12), angle=20, spacing=2.4, w=0.5, op=0.5)
    sk.stroke(skull, 1.3)
    sk.fill("M%.1f,%.1f a4,3 0 1,0 0.1,0 Z" % (hx + 4, hy - 3), op=0.95)
    jaw = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f" % (hx + 12, hy + 10, hx - 24, hy + 20, hx - 28, hy + 16)
    sk.stroke(jaw, 1.2)
    for i in range(6):
        tx = hx - 22 + i * 6
        sk.line((tx, hy + 5), (tx + 1, hy + 9), 0.7)
    for sgn in (-1, 1):
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (hx + 14, hy - 10, 18, sgn * 6 - 14, 34, sgn * 4 - 22), 1.4)
    # wing bones (one wing spread on the ground)
    sh = spine[6]
    elbow = (sh[0] + 40, sh[1] - 60)
    sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (sh + elbow), 1.6)
    for k, (dx, dy) in enumerate(((60, -40), (100, -20), (120, 10), (110, 40))):
        tip = (elbow[0] + dx, elbow[1] + dy)
        sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (elbow + tip), 1.1)
        sk.circle(tip[0], tip[1], 1.6, 0.8)
    # legs and claws
    for (ix, sgn) in ((7, 1), (16, 1)):
        x, y = spine[ix]
        knee = (x + 10, y + sgn * 48)
        foot = (x - 6, y + sgn * 66)
        sk.stroke("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f" % ((x, y) + knee + foot), 1.3)
        for c in (-6, 0, 6):
            sk.line(foot, (foot[0] + c - 4, foot[1] + 6), 0.8)
    # scattered teeth/scales
    for _ in range(10):
        sk.dot(r.uniform(20, 320), r.uniform(150, 190), r.uniform(0.8, 1.6), 0.8)


def maze(sk, x0, y0, cols, rows, cell, seed=5):
    rng = random.Random(seed)
    walls_h = [[True] * cols for _ in range(rows + 1)]
    walls_v = [[True] * (cols + 1) for _ in range(rows)]
    seen = [[False] * cols for _ in range(rows)]
    stack = [(rows - 1, cols // 2)]
    seen[rows - 1][cols // 2] = True
    while stack:
        rr, cc = stack[-1]
        nb = [(rr + dr, cc + dc) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))
              if 0 <= rr + dr < rows and 0 <= cc + dc < cols and not seen[rr + dr][cc + dc]]
        if not nb:
            stack.pop()
            continue
        nr, nc = rng.choice(nb)
        if nr != rr:
            walls_h[max(nr, rr)][cc] = False
        else:
            walls_v[rr][max(nc, cc)] = False
        seen[nr][nc] = True
        stack.append((nr, nc))
    walls_h[rows][cols // 2] = False  # entrance
    W, H = cols * cell, rows * cell
    # rock hatching around the outer wall
    for (bx0, by0, bx1, by1) in ((x0 - 16, y0 - 16, x0 + W + 16, y0), (x0 - 16, y0 + H, x0 + W + 16, y0 + H + 16),
                                 (x0 - 16, y0, x0, y0 + H), (x0 + W, y0, x0 + W + 16, y0 + H)):
        sk.hatch("M%.1f,%.1f H%.1f V%.1f H%.1f Z" % (bx0, by0, bx1, by1, bx0), (bx0, by0, bx1, by1), angle=35,
                 spacing=2.8, w=0.6, op=0.8)
    sk.white("M%.1f,%.1f h%.1f v%.1f h-%.1f Z" % (x0, y0, W, H, W))
    d = []
    for rr in range(rows + 1):
        for cc in range(cols):
            if walls_h[rr][cc]:
                d.append("M%.1f,%.1f h%.1f" % (x0 + cc * cell, y0 + rr * cell, cell))
    for rr in range(rows):
        for cc in range(cols + 1):
            if walls_v[rr][cc]:
                d.append("M%.1f,%.1f v%.1f" % (x0 + cc * cell, y0 + rr * cell, cell))
    sk.stroke(" ".join(d), 2.0, 1.0, cap="square")
    # the lair in the centre: a tiny eye
    cx, cy = x0 + W / 2, y0 + H / 2
    sk.washellipse(cx, cy, cell * 1.4, cell * 1.4, RED, 0.35)
    eye(sk, cx, cy, cell * 0.38, stalks=False)


def eye(sk, x, y, s, stalks=True):
    r = sk.rng
    if stalks:
        body = "M%.1f,%.1f a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (
            x - s * 1.25, y, s * 1.25, s * 1.15, s * 2.5, s * 1.25, s * 1.15, s * 2.5)
        for i in range(8):
            a = -math.pi / 2 + (i - 3.5) * 0.36
            base = (x + math.cos(a) * s * 1.1, y + math.sin(a) * s * 1.05)
            tip = (x + math.cos(a) * s * 2.3, y + math.sin(a) * s * 2.1)
            mid = ((base[0] + tip[0]) / 2 + math.sin(i * 1.7) * s * 0.25, (base[1] + tip[1]) / 2)
            sk.stroke(K.smooth_path([base, mid, tip]), 1.3)
            sk.circle(tip[0], tip[1], s * 0.13, 1.0, fill="#fff")
            sk.dot(tip[0], tip[1], s * 0.05)
        sk.washellipse(x, y, s * 1.4, s * 1.3, RED, 0.3)
        sk.white(body)
        sk.hatch(body, (x - s * 1.3, y - s * 1.2, x + s * 1.3, y + s * 1.2), angle=-60, spacing=3.2, w=0.6, op=0.5)
        sk.stroke(body, 1.6)
        # jagged mouth below the eye
        m = "M%.1f,%.1f " % (x - s * 0.7, y + s * 0.62)
        for i in range(9):
            m += "L%.1f,%.1f " % (x - s * 0.7 + s * 1.4 * (i + 0.5) / 9, y + s * (0.72 if i % 2 == 0 else 0.56))
        m += "L%.1f,%.1f" % (x + s * 0.7, y + s * 0.62)
        sk.stroke(m, 1.1)
    # the eye itself (almond, iris, slit pupil)
    ew, eh = s * 0.9, s * 0.48
    alm = "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (x - ew, y, x, y - eh * 1.9, x + ew, y, x,
                                                                    y + eh * 1.9, x - ew, y)
    sk.white(alm)
    sk.stroke(alm, 1.5)
    ir = eh * 0.95
    cid = sk.uid()
    sk.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, alm))
    rays = []
    for i in range(36):
        a = 2 * math.pi * i / 36
        rays.append("M%.1f,%.1f L%.1f,%.1f" % (x + math.cos(a) * ir * 0.35, y + math.sin(a) * ir * 0.35,
                                               x + math.cos(a) * ir, y + math.sin(a) * ir))
    sk.add('<g clip-path="url(#%s)"><path d="%s" stroke="%s" stroke-width="%.2f" fill="none"/>'
           '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="%.2f"/></g>'
           % (cid, " ".join(rays), sk.ink_col, 0.6 * sk.k, x, y, ir, sk.ink_col, 1.2 * sk.k))
    sk.fill("M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (x, y - ir * 0.9, x + ir * 0.3, y, x, y + ir * 0.9,
                                                                    x - ir * 0.3, y, x, y - ir * 0.9), op=0.95)
    sk.circle(x + ir * 0.35, y - ir * 0.35, ir * 0.12, 0.6, fill="#fff")
    if stalks:
        for i in range(7):  # lashes
            a = math.pi + math.pi * (i + 0.5) / 7
            px, py = x + math.cos(a) * ew * 0.9, y - abs(math.sin(a)) * eh * 0.95
            sk.line((px, py), (px + math.cos(a) * s * 0.18, py - s * 0.16), 0.8)


def catmull(points, n=8):
    """Dense Catmull-Rom polyline through points."""
    p = [points[0]] + list(points) + [points[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(points[-1])
    return out


def flying_dragon(sk):
    """Heraldic winged dragon in profile facing left, local size ~330 x 260."""
    spine = catmull([(62, 118), (92, 138), (128, 170), (175, 182), (222, 172), (262, 186), (292, 214), (300, 244),
                     (276, 252), (262, 236)], 8)
    n = len(spine)

    def prof(t):
        if t < 0.12:
            return 7 + 30 * t
        if t < 0.38:
            return 10.6 + 40 * (t - 0.12)
        return max(0.8, 21 * (1 - (t - 0.38) / 0.62) ** 1.3)

    belly = K.offset_line(spine, prof)
    back = K.offset_line(spine, lambda t: -prof(t))
    body = K.smooth_path(back) + " L" + " L".join("%.1f,%.1f" % q for q in belly[::-1]) + " Z"
    shoulder = spine[int(n * 0.24)]
    hip = spine[int(n * 0.45)]
    # far wing, peeking behind
    bat_wing(sk, (shoulder[0] - 14, shoulder[1] - 12), 0.8, far=True)
    # legs behind the body line
    for (px, py), fwd in ((spine[int(n * 0.27)], 1), (spine[int(n * 0.47)], 0)):
        knee = (px + (8 if fwd else 18), py + 30)
        foot = (px - (6 if fwd else -2), py + 44)
        leg = K.smooth_path([(px - 10, py + 6), knee, foot])
        sk.stroke(leg, 4.2)
        sk.stroke(leg, 2.4, col="#fff")
        for c in (-7, -2, 3):
            sk.stroke("M%.1f,%.1f q%.1f,2 %.1f,7" % (foot[0], foot[1], c * 0.5, c), 1.0)
    sk.white(body)
    sk.stroke(body, 1.5)
    sk.washblob(body, RED, 0.42)
    # belly plates and back spikes
    inner = K.offset_line(spine, lambda t: prof(t) * 0.45)
    for i in range(3, int(n * 0.8), 2):
        sk.line(inner[i], belly[i], 0.6, 0.8)
    sk.stroke(K.smooth_path(inner[3:int(n * 0.8)]), 0.6, 0.8)
    for i in range(4, int(n * 0.85), 3):
        q = back[i]
        tx, ty = spine[min(n - 1, i + 1)][0] - spine[i][0], spine[min(n - 1, i + 1)][1] - spine[i][1]
        L = math.hypot(tx, ty) or 1
        nx, ny = ty / L, -tx / L
        hgt = 7 * (1 - i / n) + 3
        d = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (q[0] - tx / L * 4, q[1] - ty / L * 4, q[0] + nx * hgt + tx / L * 2,
                                                    q[1] + ny * hgt + ty / L * 2, q[0] + tx / L * 4, q[1] + ty / L * 4)
        sk.white(d)
        sk.stroke(d, 0.9)
    # dorsal shading hatch on the back half of the body
    sk.hatch(body, (60, 100, 300, 260), angle=70, spacing=3.4, w=0.5, op=0.35)
    # tail spade
    tx, ty = spine[-1]
    sk.stroke("M%.1f,%.1f l-6,-12 l14,2 Z" % (tx, ty), 1.2, fill="#fff")
    # head
    hx, hy = spine[0]
    head = ("M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f L%.1f,%.1f L%.1f,%.1f L%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z"
            % (hx + 12, hy - 8, hx + 2, hy - 20, hx - 16, hy - 16, hx - 34, hy - 10, hx - 40, hy - 4,
               hx - 30, hy, hx - 38, hy + 12, hx - 20, hy + 12, hx - 4, hy + 14, hx + 10, hy + 10))
    sk.white(head)
    sk.stroke(head, 1.4)
    sk.hatch(head, (hx - 40, hy - 20, hx + 12, hy + 14), angle=60, spacing=3.0, w=0.5, op=0.4)
    sk.fill("M%.1f,%.1f l7,-2 l-2,4 Z" % (hx - 14, hy - 10), op=0.95)  # eye
    sk.dot(hx - 36, hy - 7, 1.1)                                          # nostril
    for i in range(4):                                                    # teeth
        sk.stroke("M%.1f,%.1f l1.5,3 l1.5,-3" % (hx - 36 + i * 4.5, hy + 1), 0.6)
    for k, (dx, dy) in enumerate(((26, -22), (32, -10))):                 # horns
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (hx - 2, hy - 13 + k * 4, dx * 0.4, dy * 0.2, dx, dy), 1.6 - k * 0.4)
    sk.stroke("M%.1f,%.1f q-4,10 -12,14 M%.1f,%.1f q-2,8 -8,12" % (hx - 24, hy + 12, hx - 14, hy + 13), 0.8, 0.8)
    # fire breath
    fx, fy = hx - 40, hy + 4
    flame = ("M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f "
             "C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z" % (fx, fy - 2, fx - 16, fy - 12, fx - 34, fy - 4, fx - 52, fy - 18,
                                                 fx - 46, fy - 4, fx - 66, fy - 2, fx - 72, fy + 8, fx - 58, fy + 10,
                                                 fx - 44, fy + 22, fx - 50, fy + 30, fx - 30, fy + 14, fx - 18, fy + 6,
                                                 fx, fy + 4))
    sk.washblob(flame, ORANGE, 0.6)
    sk.stroke(flame, 1.0)
    for i in range(3):
        sk.stroke("M%.1f,%.1f q-8,%.1f -18,%.1f" % (fx - 12 - i * 10, fy + 3, -3 + i * 2, i * 2 - 2), 0.6, 0.8)
    # near wing, raised above the back
    bat_wing(sk, (shoulder[0] + 4, shoulder[1] - 14), 1.0)


def bat_wing(sk, root, s=1.0, far=False):
    rx, ry = root
    P = lambda dx, dy: (rx + dx * s, ry + dy * s)
    wrist = P(26, -86)
    tips = [P(-18, -118), P(46, -138), P(112, -110), P(150, -48)]
    rear = P(92, 26)
    d = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f" % (root + wrist + tips[0])
    for a, b in zip(tips, tips[1:] + [rear]):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        cx, cy = mx + (wrist[0] - mx) * 0.28, my + (wrist[1] - my) * 0.28
        d += " Q%.1f,%.1f %.1f,%.1f" % (cx, cy, b[0], b[1])
    d += " Z"
    sk.white(d)
    sk.hatch(d, (rx - 30 * s, ry - 140 * s, rx + 150 * s, ry + 30 * s), angle=-35 if far else 60,
             spacing=2.6 if far else 4.6, w=0.55, op=0.75 if far else 0.45)
    sk.washblob(d, RED, 0.18)
    sk.stroke(d, 1.1)
    sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (root + wrist), 2.2)
    for t in tips:
        sk.stroke(K.smooth_path([wrist, ((wrist[0] + t[0]) / 2 + 3, (wrist[1] + t[1]) / 2 + 3), t]), 1.1)
    sk.stroke("M%.1f,%.1f l-4,-9 l6,4" % wrist, 1.1)  # thumb claw


def ribbon(sk, cx, cy, w, h=26):
    """Wavy banner with notched ends and illegible lettering."""
    pts = [(cx - w / 2 + w * i / 20, cy + 6 * math.sin(i / 20 * 2 * math.pi)) for i in range(21)]
    top = [(x, y - h / 2) for x, y in pts]
    bot = [(x, y + h / 2) for x, y in pts]
    d = K.smooth_path(top) + " L" + " L".join("%.1f,%.1f" % q for q in bot[::-1]) + " Z"
    for s, (x, y) in ((-1, pts[0]), (1, pts[-1])):
        tail = "M%.1f,%.1f l%.1f,%.1f l%.1f,%.1f l%.1f,%.1f l%.1f,%.1f Z" % (
            x, y - h / 2 + 8, s * 34, 0, -s * 12, h / 2, s * 12, h / 2, -s * 34, 0)
        sk.white(tail)
        sk.stroke(tail, 1.1)
        sk.hatch(tail, (x - 40, y - h, x + 40, y + h), angle=60, spacing=2.4, w=0.5, op=0.6)
    sk.white(d)
    sk.stroke(d, 1.3)
    K.scribble(sk, cx - w * 0.38, cy + 5, w * 0.76, 9, 1.2, 0.9)


def fissures(sk, box, n, op=0.8):
    r = sk.rng
    for _ in range(n):
        x, y = r.uniform(box[0], box[2]), r.uniform(box[1], box[3])
        a = r.uniform(0, 2 * math.pi)
        pts = [(x, y)]
        for i in range(r.randint(5, 9)):
            a += r.uniform(-0.8, 0.8)
            x, y = x + math.cos(a) * r.uniform(8, 18), y + math.sin(a) * r.uniform(8, 18)
            pts.append((x, y))
            if r.random() < 0.25:
                b = a + r.choice([-1, 1]) * r.uniform(0.6, 1.2)
                sk.line((x, y), (x + math.cos(b) * 12, y + math.sin(b) * 12), 0.7, op * 0.8)
        sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in pts), 1.0, op)


def scorch(sk, spots):
    for (x, y, rr) in spots:
        sk.washellipse(x, y, rr, rr * 0.8, (70, 40, 25), 0.35)


def build(sk, wide):
    W, H = sk.W, sk.H
    r = sk.rng
    K.neatline(sk, 44)
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        fissures(sk, (260, 300, 820, 1700), 22, 0.8)
        lava_river(sk, K.meander(r, [(235, 420), (150, 620), (140, 900), (175, 1150), (120, 1380), (70, 1470),
                                     (-20, 1520)], 14), lambda t: 22 - 8 * t)
        lava_river(sk, K.meander(r, [(160, 1150), (360, 1210), (520, 1320)], 10), lambda t: 12 - 8 * t, op=0.9)
        volcano(sk, 215, 440, 320, 190)
        reveals.append((260, 300, 260, 220))
        crags(sk, (70, 560, 130, 1000), 8, 50, 90)
        crags(sk, (70, 1540, 190, 1640), 6, 45, 80)
        begin(sk, 740, 150, 0, 0.88)
        flying_dragon(sk)
        end(sk)
        ribbon(sk, 862, 400, 230)
        reveals.append((880, 270, 210, 200))
        crags(sk, (895, 470, 1010, 660), 8, 50, 95)
        eye(sk, 950, 800, 44)
        reveals.append((950, 790, 130, 130))
        begin(sk, 1015, 950, 90, 0.75)
        dragon_bones(sk)
        end(sk)
        maze(sk, 790, 1545, 9, 9, 24, seed=7)
        reveals.append((898, 1650, 170, 160))
        K.compass_rose(sk, 225, 1755, 80)
        reveals.append((225, 1750, 170, 150))
        K.scale_bar(sk, 420, 1830, 200)
        reveals.append((520, 1830, 140, 50))
        for (x, y, s) in ((950, 1460, 22), (110, 1060, 18)):
            K.skull(sk, x, y, s)
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        fissures(sk, (620, 120, 1300, 980), 22, 0.8)
        lava_river(sk, K.meander(r, [(360, 440), (300, 600), (420, 760), (700, 860), (1000, 900), (1300, 1000),
                                     (1500, 1100)], 16), lambda t: 24 - 8 * t)
        volcano(sk, 260, 470, 400, 240)
        crags(sk, (460, 130, 590, 470), 9, 60, 110)
        crags(sk, (70, 720, 250, 860), 7, 50, 90)
        begin(sk, 80, 560, 8, 0.72)
        dragon_bones(sk)
        end(sk)
        K.compass_rose(sk, 160, 960, 80)
        begin(sk, 1420, 150, 0, 1.15)
        flying_dragon(sk)
        end(sk)
        ribbon(sk, 1640, 450, 300)
        eye(sk, 1450, 680, 60)
        maze(sk, 1600, 580, 10, 10, 24, seed=7)
        crags(sk, (1340, 820, 1560, 980), 8, 50, 90)
        K.scale_bar(sk, 1620, 1000, 200)
        for (x, y, s) in ((1860, 840, 20), (600, 1010, 18)):
            K.skull(sk, x, y, s)
    return box, reveals


def holes(W, H):
    if W < H:
        return [(1052, 1180, 26), (30, 700, 34), (720, 1893, 30)]
    return [(1890, 700, 30), (620, 1060, 28), (30, 300, 30)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-acto3", build,
          dict(base=(216, 180, 132), stains=11, edge=150, edge_dark=0.85, burn=0.8, holes=holes, crumple=1.0,
               mottle=1.4),
          out, work, seed=37, grade_kw=dict(vignette=0.45))
