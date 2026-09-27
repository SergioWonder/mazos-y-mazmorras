"""Campaign map «El Laberinto del Contemplador» (Act III, second scenario).

A mad cartographer's plan of the Beholder's labyrinth: an impossible maze whose corridors
twist into a vortex, Escher-like staircases that climb into each other and a ring of stairs
that only goes up, eyes drawn all over the margins, the Beholder itself in a corner with its
eyestalks, clusters of arcane crystals, petrified adventurers on their plinths, and the marks
of madness on the parchment (spirals, tallies, the same note written again and again).
Everything big lives in the margins and corners; the centre keeps faint spirals.
Washed turquoise and violet accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

TURQ = (40, 160, 160)
VIOLET = (125, 75, 170)


# ---------------------------------------------------------------------------
# the impossible labyrinth
# ---------------------------------------------------------------------------
def maze_walls(cols, rows, seed):
    rng = random.Random(seed)
    wh = [[True] * cols for _ in range(rows + 1)]
    wv = [[True] * (cols + 1) for _ in range(rows)]
    seen = [[False] * cols for _ in range(rows)]
    stack = [(rows // 2, cols // 2)]
    seen[rows // 2][cols // 2] = True
    while stack:
        r, c = stack[-1]
        nb = [(r + dr, c + dc) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))
              if 0 <= r + dr < rows and 0 <= c + dc < cols and not seen[r + dr][c + dc]]
        if not nb:
            stack.pop()
            continue
        nr, nc = rng.choice(nb)
        if nr != r:
            wh[max(nr, r)][c] = False
        else:
            wv[r][max(nc, c)] = False
        seen[nr][nc] = True
        stack.append((nr, nc))
    wh[rows][cols // 2] = False  # entrance
    wh[0][cols // 3] = False     # and a way out that should not exist
    segs = []
    for r in range(rows + 1):
        for c in range(cols):
            if wh[r][c]:
                segs.append(((c, r), (c + 1, r)))
    for r in range(rows):
        for c in range(cols + 1):
            if wv[r][c]:
                segs.append(((c, r), (c, r + 1)))
    return segs


def vortex_maze(sk, cols, cell, twist=2.2, seed=9):
    """Square maze centred on (0, 0), warped into a whirl (stronger towards the centre)."""
    S = cols * cell
    Rw = S * 0.72

    def warp(p):
        x, y = p[0] * cell - S / 2, p[1] * cell - S / 2
        r = math.hypot(x, y)
        a = math.atan2(y, x) + twist * max(0.0, 1 - r / Rw) ** 2
        return (math.cos(a) * r, math.sin(a) * r)

    def warped_line(a, b, n=5):
        return [warp((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)) for i in range(n + 1)]

    # outline of the whole block, rock hatching outside it
    border = []
    for (a, b) in (((0, 0), (cols, 0)), ((cols, 0), (cols, cols)), ((cols, cols), (0, cols)), ((0, cols), (0, 0))):
        border += warped_line(a, b, cols * 2)[:-1]
    rng = sk.rng
    lines = []
    for (px, py) in border[::1]:
        L = math.hypot(px, py) or 1
        nx, ny = px / L, py / L
        for _ in range(2):
            o = rng.uniform(4, 22)
            hx, hy = px + nx * o + rng.uniform(-3, 3), py + ny * o + rng.uniform(-3, 3)
            ang = rng.uniform(0, math.pi)
            ux, uy = math.cos(ang), math.sin(ang)
            ln = rng.uniform(7, 13)
            for k in range(3):
                off = (k - 1) * 2.9
                ax, ay = hx - uy * off, hy + ux * off
                lines.append("M%.1f,%.1f L%.1f,%.1f" % (ax - ux * ln / 2, ay - uy * ln / 2, ax + ux * ln / 2,
                                                        ay + uy * ln / 2))
    sk.stroke(" ".join(lines), 0.7, 0.85)
    floor = "M" + " L".join("%.1f,%.1f" % q for q in border) + " Z"
    sk.white(floor)
    sk.washblob(floor, VIOLET, 0.16)
    sk.washellipse(0, 0, S * 0.3, S * 0.3, TURQ, 0.3)
    d = []
    for a, b in maze_walls(cols, cols, seed):
        d.append(K.smooth_path(warped_line(a, b)))
    sk.stroke(" ".join(d), 1.7, 1.0, cap="square")
    # stairs drawn across a few corridors, some of them upside down
    for (c, r, rot) in ((1, 2, 0), (cols - 3, 1, 90), (2, cols - 3, 180), (cols - 2, cols - 4, 270),
                        (cols // 2 + 2, cols // 2 - 3, 45)):
        x, y = warp((c + 0.5, r + 0.5))
        K.group(sk, x, y, rot + math.degrees(twist * max(0.0, 1 - math.hypot(x, y) / Rw) ** 2))
        for i in range(4):
            sk.line((-cell * 0.3 + i * cell * 0.2, -cell * 0.32), (-cell * 0.3 + i * cell * 0.2, cell * 0.32), 0.7)
        sk.stroke("M%.1f,0 h%.1f l-3,-3 M%.1f,0 l-3,3" % (-cell * 0.3, cell * 0.6, cell * 0.3), 0.6)
        K.ungroup(sk)
    # the lair: an eye at the heart of the whirl
    K.eye_glyph(sk, 0, 0, cell * 0.55, lashes=False)
    ex, ey = warp((cols / 2, cols + 0.2))
    sk.stroke("M%.1f,%.1f v%.1f l-4,-6 M%.1f,%.1f l4,-6" % (ex, ey + 30, -22, ex, ey + 8), 0.9)


def iso(x, y, z, u=1.0):
    c = math.cos(math.radians(30))
    return ((x - y) * c * u, ((x + y) * 0.5 - z) * u)


def stair_flight(sk, n=6, d=12, h=9, wd=26):
    """Isometric flight climbing towards -x; boxes drawn back to front."""
    for i in range(n - 1, -1, -1):
        x0, x1 = -(i + 1) * d, -i * d
        zt = (i + 1) * h
        top = [iso(x0, 0, zt), iso(x1, 0, zt), iso(x1, wd, zt), iso(x0, wd, zt)]
        front = [iso(x1, 0, zt), iso(x1, wd, zt), iso(x1, wd, 0), iso(x1, 0, 0)]
        side = [iso(x0, wd, zt), iso(x1, wd, zt), iso(x1, wd, 0), iso(x0, wd, 0)]
        for face, sh in ((side, 1), (front, 0), (top, 2)):
            dd = "M" + " L".join("%.1f,%.1f" % q for q in face) + " Z"
            sk.white(dd)
            xs, ys = [q[0] for q in face], [q[1] for q in face]
            if sh == 1:
                sk.hatch(dd, (min(xs), min(ys), max(xs), max(ys)), angle=90, spacing=2.4, w=0.5, op=0.7)
            elif sh == 0:
                sk.hatch(dd, (min(xs), min(ys), max(xs), max(ys)), angle=-30, spacing=3.4, w=0.5, op=0.45)
            sk.stroke(dd, 1.0)


def escher_stairs(sk, R=1.0):
    """Three flights sharing one landing, each with its own gravity (rotated 120 degrees)."""
    sk.washellipse(0, 0, 110 * R, 100 * R, TURQ, 0.18)
    for k, rot in enumerate((0, 120, 240)):
        K.group(sk, 0, 0, rot, R)
        K.group(sk, 8, 18, 0)
        stair_flight(sk)
        K.ungroup(sk)
        # a tiny climber on each flight, all walking «up»
        fx, fy = iso(-44, 13, 45)
        fx, fy = fx + 8, fy + 18
        sk.stroke("M%.1f,%.1f v-10 M%.1f,%.1f l-3,6 M%.1f,%.1f l3,6 M%.1f,%.1f l-4,4 M%.1f,%.1f l4,3" % (
            fx, fy, fx, fy, fx, fy, fx, fy - 8, fx, fy - 8), 0.9)
        sk.circle(fx, fy - 13, 2.6, 0.9, fill="#fff")
        K.ungroup(sk)
    # landing in the middle
    sk.circle(0, 0, 9, 1.0, fill="#fff")
    sk.dot(0, 0, 2)


def stair_ring(sk, s=60, band=22, n=7):
    """Plan of a square ring of stairs where every flight goes up (clockwise)."""
    o, i = s, s - band
    p = K.Plan(sk, wall=2.6, depth=16, grid=10, grid_op=0.0)
    for (x0, y0, x1, y1) in ((-o, -o, o, -i), (i, -o, o, o), (-o, i, o, o), (-o, -o, -i, o)):
        p.rect(x0, y0, x1, y1)
    p.render(wash=TURQ, wash_op=0.18)
    sk.stroke("M%.1f,%.1f h%.1f v%.1f h%.1f Z" % (-i, -i, 2 * i, 2 * i, -2 * i), 1.6)
    sk.hatch("M%.1f,%.1f h%.1f v%.1f h%.1f Z" % (-i, -i, 2 * i, 2 * i, -2 * i), (-i, -i, i, i), angle=45,
             spacing=3.0, w=0.55, op=0.55)
    for side in range(4):
        K.group(sk, 0, 0, side * 90)
        for k in range(1, n + 1):
            x = -i + (2 * i) * k / (n + 1)
            sk.line((x, -o), (x, -i), 0.7)
        sk.stroke("M%.1f,%.1f h%.1f l-4,-3 M%.1f,%.1f l-4,3" % (-i + 6, -(o + i) / 2, 2 * i - 12, i - 6,
                                                            -(o + i) / 2), 0.9)
        K.ungroup(sk)
    K.eye_glyph(sk, 0, 0, i * 0.5, lashes=False)


# ---------------------------------------------------------------------------
# the Beholder, crystals, statues and madness
# ---------------------------------------------------------------------------
def tube(sk, pts, w, op=1.0):
    d = K.smooth_path(pts)
    sk.stroke(d, w / sk.k, op)
    sk.stroke(d, max(0.4, (w - 2.6) / sk.k), 1.0, col="#fff")


def beholder(sk, S, a0=-180, a1=0, n=10):
    rng = sk.rng
    sk.washellipse(0, 0, S * 1.2, S * 1.15, VIOLET, 0.32)
    # eyestalks behind the body
    tips = []
    for k in range(n):
        a = math.radians(a0 + (a1 - a0) * (k + 0.5) / n + rng.uniform(-5, 5))
        L = S * rng.uniform(1.35, 1.75)
        base = (math.cos(a) * S * 0.8, math.sin(a) * S * 0.8)
        pts = [base]
        ph = rng.uniform(0, 6)
        for j in range(1, 5):
            t = j / 4
            rr = S * 0.8 + (L - S * 0.8 + S * 0.2) * t
            off = math.sin(ph + t * 4) * S * 0.12 * t
            pts.append((math.cos(a) * rr - math.sin(a) * off, math.sin(a) * rr + math.cos(a) * off))
        tube(sk, pts, 6.5)
        tips.append((pts[-1], a))
    body = "M%.1f,0 a%.1f,%.1f 0 1,0 %.1f,0 a%.1f,%.1f 0 1,0 -%.1f,0 Z" % (-S, S, S * 0.95, 2 * S, S, S * 0.95, 2 * S)
    sk.white(body)
    shade = "M%.1f,%.1f A%.1f,%.1f 0 0,1 %.1f,%.1f A%.1f,%.1f 0 0,0 %.1f,%.1f Z" % (
        S * 0.7, -S * 0.68, S, S * 0.95, -S * 0.55, S * 0.8, S * 0.85, S * 0.8, S * 0.7, -S * 0.68)
    sk.hatch(shade, (-S, -S, S, S), angle=-50, spacing=2.6, w=0.6, op=0.7)
    # scales / warts
    for _ in range(26):
        a, rr = rng.uniform(0, 6.28), S * math.sqrt(rng.uniform(0.35, 0.9))
        x, y = math.cos(a) * rr, math.sin(a) * rr * 0.95
        if abs(x) < S * 0.62 and -S * 0.4 < y < S * 0.75:
            continue
        sk.stroke("M%.1f,%.1f q3,-4 6,0" % (x - 3, y), 0.7, 0.8)
    sk.stroke(body, 2.0)
    # the great central eye with a turquoise glow
    sk.washellipse(0, -S * 0.08, S * 0.55, S * 0.4, TURQ, 0.45)
    K.eye_glyph(sk, 0, -S * 0.08, S * 0.5)
    # heavy brow
    sk.stroke("M%.1f,%.1f Q0,%.1f %.1f,%.1f" % (-S * 0.62, -S * 0.3, -S * 0.72, S * 0.62, -S * 0.3), 1.6)
    # the maw with fangs
    mw = S * 0.62
    top = S * 0.42
    m = "M%.1f,%.1f Q0,%.1f %.1f,%.1f Q0,%.1f %.1f,%.1f Z" % (-mw, top, top + S * 0.18, mw, top, top + S * 0.5, -mw,
                                                             top)
    sk.fill(m, op=0.85)
    for i in range(9):
        t = (i + 0.5) / 9
        x = -mw + 2 * mw * t
        yt = top + (S * 0.09) * (1 - (2 * t - 1) ** 2) * 2
        sk.white("M%.1f,%.1f l%.1f,%.1f l%.1f,-%.1f Z" % (x - S * 0.05, yt - 1, S * 0.05, S * 0.11, S * 0.05, S * 0.11))
    for i in range(7):
        t = (i + 0.5) / 7
        x = -mw * 0.8 + 1.6 * mw * t
        yb = top + S * 0.22 * (1 - (2 * t - 1) ** 2) * 1.6
        sk.white("M%.1f,%.1f l%.1f,-%.1f l%.1f,%.1f Z" % (x - S * 0.04, yb + 1, S * 0.04, S * 0.09, S * 0.04, S * 0.09))
    sk.stroke(m, 1.2)
    # eyes on the stalk tips, each looking somewhere else
    for (p, a) in tips:
        sk.circle(p[0], p[1], S * 0.16, 1.2, fill="#fff")
        K.eye_glyph(sk, p[0], p[1], S * 0.13, lashes=False, slit=rng.random() < 0.5,
                    look=(rng.uniform(-1, 1), rng.uniform(-1, 1)))


def crystal(sk, x, y, w, h, ang):
    K.group(sk, x, y, ang)
    tip = h + w * 1.3
    out = [(-w, 0), (-w, -h), (0, -tip), (w, -h), (w, 0)]
    d = "M" + " L".join("%.1f,%.1f" % q for q in out) + " Z"
    sk.white(d)
    sk.washblob(d, TURQ, 0.4)
    right = "M0,0 L0,%.1f L%.1f,%.1f L%.1f,0 Z" % (-h - w * 0.3, w, -h, w)
    sk.hatch(right, (0, -tip, w, 0), angle=80, spacing=2.2, w=0.5, op=0.6)
    sk.stroke(d, 1.2)
    sk.stroke("M0,0 L0,%.1f L%.1f,%.1f M0,%.1f L%.1f,%.1f" % (-h - w * 0.3, 0, -tip, -h - w * 0.3, -w, -h), 0.7)
    K.ungroup(sk)


def crystals(sk, x, y, s=1.0, n=5):
    rng = sk.rng
    items = []
    for k in range(n):
        ang = (k - (n - 1) / 2) * 16 + rng.uniform(-6, 6)
        items.append((x + (k - (n - 1) / 2) * 11 * s, y + rng.uniform(-3, 3), rng.uniform(5, 8) * s,
                      rng.uniform(18, 42) * s * (1.2 if k == n // 2 else 1), ang))
    sk.washellipse(x, y - 25 * s, 40 * s, 38 * s, TURQ, 0.25)
    for it in sorted(items, key=lambda q: -q[3]):
        crystal(sk, *it)
    for k in range(4):  # sparkles
        sx, sy = x + rng.uniform(-40, 40) * s, y - rng.uniform(20, 70) * s
        sk.stroke("M%.1f,%.1f h6 M%.1f,%.1f v6" % (sx - 3, sy, sx, sy - 3), 0.6, 0.8)
    sk.stroke("M%.1f,%.1f q%.1f,6 %.1f,0" % (x - 38 * s, y + 2, 38 * s, 76 * s), 0.8, 0.7)


def statue(sk, x, y, s=1.0, pose=0):
    """A petrified adventurer on a plinth (feet at y); s=1 is ~100 px tall."""
    P = [  # (hip, knees, feet, shoulders, elbows, hands) offsets for a few poses
        dict(lk=(-9, -24), lf=(-14, 0), rk=(8, -24), rf=(14, 0), le=(-24, -64), lh=(-30, -86), re=(20, -56),
             rh=(30, -40), item="sword_up"),
        dict(lk=(-12, -22), lf=(-24, 0), rk=(10, -26), rf=(8, 0), le=(-18, -56), lh=(-10, -48), re=(22, -66),
             rh=(34, -82), item="shield"),
        dict(lk=(-4, -22), lf=(-18, -2), rk=(14, -20), rf=(22, 0), le=(-20, -52), lh=(-26, -36), re=(18, -52),
             rh=(22, -34), item="staff"),
    ][pose % 3]
    K.group(sk, x, y, 0, s)
    hip = (0, -44)
    sh_l, sh_r = (-10, -74), (10, -74)
    plinth = "M-30,0 h60 v12 h-60 Z"
    sk.white(plinth)
    sk.hatch(plinth, (-30, 0, 30, 12), angle=0, spacing=2.4, w=0.5, op=0.7)
    sk.stroke(plinth, 1.2)
    sk.stroke("M-26,12 v5 h52 v-5", 1.0)
    lw = 12
    tube(sk, [hip, P["lk"], P["lf"]], lw)
    tube(sk, [hip, P["rk"], P["rf"]], lw)
    torso = "M-14,-76 L14,-76 L10,-40 L-10,-40 Z"
    sk.white(torso)
    sk.hatch(torso, (0, -78, 15, -38), angle=70, spacing=2.2, w=0.5, op=0.7)
    sk.stroke(torso, 1.2)
    sk.stroke("M-10,-44 h20", 1.4)  # belt
    tube(sk, [sh_l, P["le"], P["lh"]], 10)
    tube(sk, [sh_r, P["re"], P["rh"]], 10)
    sk.stroke("M-14,-76 q-8,14 -6,40 M14,-76 q8,12 7,30", 0.9, 0.9)  # cloak
    sk.circle(0, -86, 9, 1.2, fill="#fff")
    sk.stroke("M-8,-86 q8,-10 16,0", 1.0)  # helmet rim
    it = P["item"]
    if it == "sword_up":
        hx, hy = P["lh"]
        sk.stroke("M%.1f,%.1f l-6,-30" % (hx, hy), 2.4)
        sk.stroke("M%.1f,%.1f l10,-2" % (hx - 5, hy + 1), 1.4)
    elif it == "shield":
        hx, hy = P["lh"]
        sk.circle(hx - 4, hy, 13, 1.3, fill="#fff")
        sk.circle(hx - 4, hy, 4, 0.9)
        rx, ry = P["rh"]
        sk.stroke("M%.1f,%.1f l10,-24" % (rx, ry), 2.2)
    else:
        rx, ry = P["rh"]
        sk.stroke("M%.1f,%.1f L%.1f,%.1f" % (rx, ry - 44, rx, ry + 34), 1.6)
        sk.circle(rx, ry - 48, 4, 1.0, fill="#fff")
    # cracks across the stone
    rng = sk.rng
    for _ in range(4):
        cx, cy = rng.uniform(-10, 10), rng.uniform(-80, -10)
        pts = [(cx, cy)]
        for k in range(3):
            pts.append((pts[-1][0] + rng.uniform(-5, 5), pts[-1][1] + rng.uniform(3, 7)))
        sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in pts), 0.6, 0.9)
    sk.washellipse(0, -44, 26, 52, (110, 110, 120), 0.18)
    K.ungroup(sk)


def eyes_along(sk, pts, s0, s1):
    rng = sk.rng
    for (x, y) in pts:
        K.eye_glyph(sk, x, y, rng.uniform(s0, s1), op=0.9, slit=rng.random() < 0.6,
                    look=(rng.uniform(-1, 1), rng.uniform(-0.6, 0.6)))


def repeated_note(sk, x, y, w, times, gap=14, op=0.7):
    """The same line of writing again and again, getting shakier."""
    st = sk.rng.getstate()
    for i in range(times):
        sk.rng.setstate(st)
        K.scribble(sk, x + i * 0.6, y + i * gap, w, 6, 0.8 + i * 0.03, op)
    sk.rng.setstate(st)
    sk.rng.random()


def tallies(sk, x, y, groups=4):
    for g in range(groups):
        gx = x + g * 24
        for i in range(4):
            sk.line((gx + i * 4, y), (gx + i * 4 + 1, y - 14), 0.8, 0.8)
        sk.line((gx - 2, y - 3), (gx + 16, y - 11), 0.8, 0.8)


def madness(sk, box, n_sp, n_eye=0):
    rng = sk.rng
    for _ in range(n_sp):
        K.spiral(sk, rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3]), rng.uniform(8, 22),
                 rng.uniform(2.5, 4.5), 0.7, 0.5)
    for _ in range(n_eye):
        K.eye_glyph(sk, rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3]), rng.uniform(6, 10), op=0.5,
                    lashes=False)


def compass_eye(sk, x, y, R):
    K.compass_rose(sk, x, y, R)
    K.eye_glyph(sk, x, y, R * 0.16, lashes=False)


# ---------------------------------------------------------------------------
# layouts
# ---------------------------------------------------------------------------
def build(sk, wide):
    K.neatline(sk, 44)
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        madness(sk, (260, 380, 820, 1540), 14, 6)
        K.group(sk, 895, 262, 0)
        beholder(sk, 76, -190, 25, 11)
        K.ungroup(sk)
        reveals.append((870, 230, 210, 190))
        K.group(sk, 185, 205, 0, 0.9)
        escher_stairs(sk)
        K.ungroup(sk)
        reveals.append((185, 200, 140, 120))
        # left margin
        statue(sk, 118, 580, 1.2, 0)
        crystals(sk, 118, 740, 1.25)
        eyes_along(sk, [(80, 810), (150, 850), (100, 905)], 16, 24)
        statue(sk, 122, 1060, 1.15, 1)
        repeated_note(sk, 60, 1110, 120, 7)
        tallies(sk, 64, 1250, 4)
        crystals(sk, 120, 1400, 1.3, 6)
        eyes_along(sk, [(80, 1470), (155, 1500)], 15, 22)
        K.spiral(sk, 120, 1545, 26, 5)
        # right margin
        crystals(sk, 958, 520, 1.2)
        eyes_along(sk, [(1000, 590), (925, 625), (985, 675)], 15, 22)
        statue(sk, 958, 860, 1.2, 2)
        K.group(sk, 958, 1000, 12)
        stair_ring(sk, 56, 20)
        K.ungroup(sk)
        repeated_note(sk, 895, 1110, 125, 6)
        eyes_along(sk, [(1000, 1230), (930, 1275), (990, 1325), (925, 1375), (1000, 1420)], 14, 22)
        crystals(sk, 955, 1540, 1.25)
        # bottom: the vortex maze, cartouche, compass
        K.group(sk, 190, 1738, 0)
        vortex_maze(sk, 10, 24, 2.4, 9)
        K.ungroup(sk)
        reveals.append((190, 1738, 170, 160))
        K.cartouche(sk, 600, 1815, 280, 68, lines=1)
        reveals.append((600, 1815, 210, 70))
        K.spiral(sk, 420, 1840, 16, 4)
        compass_eye(sk, 925, 1755, 60)
        reveals.append((925, 1740, 140, 140))
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        madness(sk, (640, 120, 1280, 960), 14, 6)
        K.group(sk, 275, 330, 0)
        vortex_maze(sk, 14, 28, 2.6, 13)
        K.ungroup(sk)
        K.group(sk, 250, 790, 0, 1.25)
        escher_stairs(sk)
        K.ungroup(sk)
        statue(sk, 470, 810, 1.3, 0)
        statue(sk, 555, 850, 1.15, 1)
        crystals(sk, 100, 640, 1.2)
        crystals(sk, 525, 620, 1.15, 4)
        eyes_along(sk, [(560, 120), (540, 195), (575, 270), (80, 1000), (160, 1020), (560, 985)], 15, 24)
        repeated_note(sk, 360, 930, 150, 4, gap=13)
        compass_eye(sk, 130, 930, 62)
        tallies(sk, 520, 520, 3)
        # right: the Beholder, crystals, stair ring, statues
        K.group(sk, 1640, 350, 0)
        beholder(sk, 118, -200, 20, 12)
        K.ungroup(sk)
        crystals(sk, 1395, 610, 1.4, 6)
        crystals(sk, 1855, 660, 1.1, 4)
        K.group(sk, 1480, 830, -8)
        stair_ring(sk, 64, 22)
        K.ungroup(sk)
        statue(sk, 1680, 850, 1.3, 2)
        statue(sk, 1785, 875, 1.15, 0)
        repeated_note(sk, 1360, 110, 160, 5, gap=13)
        eyes_along(sk, [(1860, 110), (1880, 770), (1850, 960), (1385, 330), (1350, 430), (1400, 975)], 15, 24)
        K.cartouche(sk, 1640, 1010, 300, 58, lines=1)
        tallies(sk, 1370, 1010, 3)
        K.spiral(sk, 1860, 1010, 18, 4)
    return box, reveals


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-contemplador", build,
          dict(base=(212, 188, 150), stains=12, edge=140, edge_dark=0.75, burn=0.35, crumple=1.1, mottle=1.3),
          out, work, seed=71, grade_kw=dict(vignette=0.45))
