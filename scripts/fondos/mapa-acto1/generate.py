"""Campaign map «El Valle» (Act I): an adventure map in sepia ink on aged parchment.

Hills, pine woods, a meandering river, burnt hamlets, the ogre stockade, the smugglers' cave
in a river cliff, a compass rose, a title cartouche and a scale in leagues. Every big drawing
lives in the margins and corners; the centre (where the UI draws the map nodes) only keeps
faint roads, the river and paper texture. Washed green and ochre accents.

Usage: python3 generate.py [output_dir] [work_dir]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "mapa-comun"))
import map_kit as K  # noqa: E402

GREEN = (110, 150, 90)
OCHRE = (200, 150, 70)
RIVER = (110, 140, 140)


def stockade(sk, cx, cy, rx, ry):
    """Ogre settlement: ring of sharpened stakes with huts, bonfire and a skull totem."""
    r = sk.rng
    sk.washellipse(cx, cy, rx * 1.2, ry * 1.3, OCHRE, 0.2)
    stakes = []
    n = int(2 * math.pi * rx / 7)
    for i in range(n):
        a = 2 * math.pi * i / n
        if abs(a - math.pi / 2) < 0.18:
            continue  # the gate
        stakes.append((a, cx + math.cos(a) * rx, cy + math.sin(a) * ry))

    def draw_stake(x, y, h):
        d = "M%.1f,%.1f v-%.1f l2.5,-5 l2.5,5 v%.1f Z" % (x - 2.5, y, h, h)
        sk.white(d)
        sk.stroke(d, 0.9)

    for a, x, y in stakes:
        if math.sin(a) < 0:
            draw_stake(x, y, r.uniform(15, 20))
    # huts inside
    for (hx, hy, hs) in ((-0.4, -0.15, 1.0), (0.35, -0.3, 0.85), (0.1, 0.25, 0.9), (-0.25, 0.35, 0.7)):
        x, y, s = cx + hx * rx, cy + hy * ry, 26 * hs
        d = "M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f Z" % (x - s * 0.6, y, x, y - s, x + s * 0.6, y)
        sk.white(d)
        sk.hatch(d, (x - s, y - s, x + s, y), angle=75, spacing=2.4, w=0.6, op=0.7)
        sk.stroke(d, 1.1)
        sk.fill("M%.1f,%.1f h5 v-8 h-5 Z" % (x - 2.5, y), op=0.9)
    # bonfire with smoke
    fx, fy = cx - 0.05 * rx, cy + 0.02 * ry
    for i in range(5):
        a = -math.pi / 2 + (i - 2) * 0.35
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,%.1f" % (fx, fy, math.cos(a) * 4, math.sin(a) * 6, math.cos(a) * 3,
                                                   math.sin(a) * 12), 1.0)
    pts = [(fx, fy - 12)] + [(fx + math.sin(i * 1.1) * 7 + i * 3, fy - 16 - i * 9) for i in range(7)]
    sk.stroke(K.smooth_path(pts), 0.8, 0.6)
    # skull totem on a pole
    tx, ty = cx + 0.45 * rx, cy + 0.15 * ry
    sk.line((tx, ty), (tx, ty - 34), 1.4)
    K.skull(sk, tx, ty - 40, 12)
    for a, x, y in stakes:
        if math.sin(a) >= 0:
            draw_stake(x, y, r.uniform(15, 20))
    # gate posts and scattered bones
    for s in (-1, 1):
        gx = cx + math.cos(math.pi / 2 + s * 0.2) * rx
        gy = cy + math.sin(math.pi / 2 + s * 0.2) * ry
        d = "M%.1f,%.1f v-28 l3,-6 l3,6 v28 Z" % (gx - 3, gy)
        sk.white(d)
        sk.stroke(d, 1.1)
    for i in range(6):
        bx, by = cx + r.uniform(-1.4, 1.4) * rx, cy + ry + r.uniform(8, 30)
        a = r.uniform(0, math.pi)
        sk.line((bx - math.cos(a) * 5, by - math.sin(a) * 2), (bx + math.cos(a) * 5, by + math.sin(a) * 2), 1.4, 0.8)


def hamlet(sk, cx, cy, n=5, s=20):
    r = sk.rng
    spots = []
    for i in range(n):
        spots.append((cx + r.uniform(-1, 1) * s * 2.2, cy + r.uniform(-1, 1) * s * 1.1))
    for x, y in sorted(spots, key=lambda q: q[1]):
        K.house(sk, x, y, s * r.uniform(0.8, 1.1), burned=r.random() < 0.8)
    # a charred patch and a broken well
    sk.washellipse(cx, cy, s * 3, s * 1.6, (120, 90, 60), 0.18)


def smugglers_cove(sk, cx, cy, s=1.0):
    """River cliff with a cave mouth, a moored boat and crates."""
    r = sk.rng
    w, h = 170 * s, 120 * s
    top = [(cx - w / 2, cy)]
    for i in range(11):
        t = i / 10
        env = math.sin(math.pi * (0.1 + 0.85 * t)) ** 0.6
        top.append((cx - w / 2 + w * t + r.uniform(-4, 4), cy - h * env * r.uniform(0.8, 1.05)))
    top.append((cx + w / 2, cy))
    d = "M" + " L".join("%.1f,%.1f" % q for q in top) + " Z"
    sk.white(d)
    sk.hatch(d, (cx - w / 2, cy - h, cx + w / 2, cy), angle=-70, spacing=3.2, w=0.7, op=0.55)
    sk.stroke("M" + " L".join("%.1f,%.1f" % q for q in top), 1.6)
    for i in range(7):  # rock strata
        y = cy - h * r.uniform(0.15, 0.7)
        x = cx + r.uniform(-0.35, 0.3) * w
        sk.stroke("M%.1f,%.1f q%.1f,%.1f %.1f,0" % (x, y, w * 0.08, -4, w * 0.18), 0.8, 0.7)
    cave = "M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f Z" % (cx - w * 0.16, cy, cx - w * 0.16, cy - h * 0.62,
                                                           cx + w * 0.16, cy - h * 0.62, cx + w * 0.16, cy)
    sk.white(cave)
    sk.hatch(cave, (cx - w * 0.2, cy - h * 0.6, cx + w * 0.2, cy), angle=35, spacing=1.8, w=0.8, op=0.95, cross=True)
    sk.stroke(cave, 1.5)
    # lantern by the mouth
    sk.circle(cx + w * 0.2, cy - 10, 3, 1.0)
    sk.line((cx + w * 0.2, cy - 13), (cx + w * 0.2, cy - 20), 0.8)
    # boat
    bx, by = cx - w * 0.05, cy + 26 * s
    hull = "M%.1f,%.1f q%.1f,%.1f %.1f,0 l-6,-7 h-%.1f Z" % (bx - 30, by - 7, 30, 14, 60, 48)
    sk.white(hull)
    sk.hatch(hull, (bx - 30, by - 8, bx + 30, by + 8), angle=0, spacing=2.2, w=0.6, op=0.7)
    sk.stroke(hull, 1.2)
    sk.line((bx, by - 7), (bx, by - 45), 1.1)
    sk.stroke("M%.1f,%.1f l18,26 h-18" % (bx, by - 43), 0.9, 0.9)
    sk.stroke("M%.1f,%.1f q-8,6 -18,4" % (bx - 30, by - 6), 0.7, 0.7)  # mooring rope
    # crates and barrels
    for i in range(3):
        x = cx + w * 0.3 + i * 13
        sk.stroke("M%.1f,%.1f h10 v-10 h-10 Z M%.1f,%.1f l10,-10" % (x, cy + 6, x, cy + 6), 0.9)
    for i in range(2):
        sk.circle(cx - w * 0.32 - i * 11, cy + 2, 5, 1.0)


def watchtower(sk, x, y, s=1.0):
    """Ruined stone watchtower with a broken crown."""
    w, h = 26 * s, 70 * s
    d = ("M%.1f,%.1f L%.1f,%.1f L%.1f,%.1f l6,8 l6,-10 l5,6 L%.1f,%.1f L%.1f,%.1f Z"
         % (x - w / 2, y, x - w / 2 + 2, y - h, x - w / 2 + 6, y - h, x + w / 2 - 2, y - h + 6, x + w / 2, y))
    sk.white(d)
    sk.hatch(d, (x, y - h - 10, x + w / 2, y), angle=90, spacing=2.6, w=0.6, op=0.7)
    sk.stroke(d, 1.3)
    for i in range(5):
        yy = y - h * (0.15 + i * 0.17)
        sk.line((x - w / 2 + 2, yy), (x + w / 2 - 1, yy), 0.6, 0.6)
    sk.fill("M%.1f,%.1f h5 v-9 h-5 Z" % (x - 2.5, y - h * 0.55), op=0.9)
    for i in range(4):
        sk.circle(x + w * 0.7 + i * 7, y - 2, 2.5, 0.8)


def tufts(sk, box, n):
    """Little grass tufts and field marks scattered over the valley floor."""
    r = sk.rng
    for _ in range(n):
        gx, gy = r.uniform(box[0], box[2]), r.uniform(box[1], box[3])
        sk.stroke("M%.1f,%.1f l-2,-5 M%.1f,%.1f l0,-6 M%.1f,%.1f l2,-5" % (gx, gy, gx + 2, gy, gx + 4, gy), 0.7, 0.6)


def valley_hills(sk, pts, s=1.0, op=1.0):
    for x, y in sorted(pts, key=lambda q: q[1]):
        K.hill(sk, x, y, 70 * s * sk.rng.uniform(0.8, 1.2), 22 * s * sk.rng.uniform(0.8, 1.2), op)


def build(sk, wide):
    W, H = sk.W, sk.H
    r = sk.rng
    K.neatline(sk, 44)
    reveals = []
    if not wide:
        box = (0.175, 0.075, 0.825, 0.93)
        # --- river: from the upper right across the valley to the lower left -------
        riv = K.meander(r, [(W + 20, 520), (820, 700), (560, 950), (330, 1180), (170, 1420), (-20, 1560)], 26)
        K.river(sk, riv, lambda t: 16 + 16 * t, wash=RIVER, wash_op=0.2)
        # faint roads through the centre
        K.road(sk, K.meander(r, [(540, 1880), (500, 1500), (600, 1100), (480, 700), (540, 250)], 30, 30), 0.55)
        K.road(sk, K.meander(r, [(60, 1000), (300, 1060), (560, 1000)], 12, 30), 0.5)
        K.road(sk, K.meander(r, [(1020, 1300), (820, 1350), (600, 1300)], 12, 30), 0.5)
        # scattered faint hills and lone trees in the centre
        valley_hills(sk, [(r.uniform(300, 780), r.uniform(350, 1650)) for _ in range(9)], 0.8, 0.8)
        for _ in range(16):
            K.pine(sk, r.uniform(260, 820), r.uniform(300, 1700), 26, 0.8)
        tufts(sk, (240, 300, 840, 1700), 60)
        # --- margins ------------------------------------------------------------
        K.cartouche(sk, 280, 150, 330, 92)
        reveals.append((280, 150, 250, 100))
        stockade(sk, 890, 270, 115, 72)
        reveals.append((900, 250, 170, 130))
        sk.washblob(K.smooth_path([(40, 300), (230, 280), (250, 700), (200, 860), (40, 880)], True), OCHRE, 0.2)
        K.massif(sk, (70, 300, 195, 860), 12, 60, 100)
        K.label(sk, 150, 880, 90)
        watchtower(sk, 165, 905, 1.0)
        valley_hills(sk, [(90, 960), (200, 1000), (120, 1030)], 1.2)
        hamlet(sk, 120, 1130, 5, 24)
        K.label(sk, 125, 1195, 80)
        K.label(sk, 890, 380, 90)
        K.label(sk, 945, 1150, 70)
        K.label(sk, 945, 1395, 90)
        reveals.append((120, 1120, 130, 80))
        forest_l = lambda x, y: x < 185 and 1230 < y < 1560
        sk.washblob(K.smooth_path([(50, 1210), (210, 1200), (230, 1560), (60, 1580)], True), GREEN, 0.24)
        K.forest(sk, forest_l, 60, 40, bounds=(80, 1240, 185, 1560))
        forest_r = lambda x, y: x > 895 and 400 < y < 930
        sk.washblob(K.smooth_path([(870, 390), (1040, 380), (1040, 940), (880, 950)], True), GREEN, 0.24)
        K.forest(sk, forest_r, 60, 42, bounds=(895, 420, 1005, 930))
        hamlet(sk, 960, 1090, 4, 24)
        reveals.append((950, 1080, 120, 70))
        smugglers_cove(sk, 950, 1330, 0.85)
        reveals.append((940, 1320, 120, 110))
        forest_r2 = lambda x, y: x > 895 and 1450 < y < 1640
        K.forest(sk, forest_r2, 30, 38, kinds=("pine", "leaf"), bounds=(895, 1470, 1005, 1640))
        K.compass_rose(sk, 205, 1725, 100)
        reveals.append((200, 1720, 200, 170))
        K.scale_bar(sk, 760, 1800, 230)
        reveals.append((875, 1800, 160, 50))
        valley_hills(sk, [(820, 1720), (930, 1700), (1000, 1740)], 0.9)
    else:
        box = (0.305, 0.06, 0.695, 0.94)
        riv = K.meander(r, [(W + 20, 230), (1560, 330), (1200, 460), (860, 620), (560, 760), (300, 790), (-20, 770)],
                        28)
        K.river(sk, riv, lambda t: 16 + 16 * t, wash=RIVER, wash_op=0.2)
        K.road(sk, K.meander(r, [(960, 1060), (930, 800), (1010, 500), (940, 250), (960, 60)], 30, 30), 0.55)
        K.road(sk, K.meander(r, [(420, 700), (700, 560), (940, 520)], 14, 30), 0.5)
        K.road(sk, K.meander(r, [(1560, 600), (1250, 700), (980, 680)], 14, 30), 0.5)
        valley_hills(sk, [(r.uniform(640, 1280), r.uniform(150, 980)) for _ in range(8)], 0.8, 0.8)
        for _ in range(14):
            K.pine(sk, r.uniform(620, 1300), r.uniform(120, 1000), 26, 0.8)
        tufts(sk, (600, 100, 1320, 1000), 60)
        # left side
        K.cartouche(sk, 300, 140, 380, 100)
        sk.washblob(K.smooth_path([(60, 230), (560, 220), (560, 470), (60, 480)], True), OCHRE, 0.2)
        K.massif(sk, (72, 230, 590, 520), 16, 70, 120)
        watchtower(sk, 560, 560, 1.0)
        stockade(sk, 390, 660, 120, 74)
        hamlet(sk, 140, 650, 5, 26)
        K.compass_rose(sk, 190, 935, 88)
        sk.washblob(K.smooth_path([(330, 800), (570, 790), (580, 1010), (330, 1020)], True), GREEN, 0.24)
        K.forest(sk, lambda x, y: x > 330 and y > 810, 50, 40, bounds=(340, 830, 575, 1010))
        # right side
        sk.washblob(K.smooth_path([(1380, 90), (1870, 90), (1870, 380), (1380, 400)], True), GREEN, 0.24)
        K.forest(sk, lambda x, y: True, 110, 42, bounds=(1380, 110, 1845, 380))
        hamlet(sk, 1480, 570, 5, 26)
        K.label(sk, 1480, 630, 80)
        K.label(sk, 390, 775, 100)
        K.label(sk, 140, 710, 70)
        K.label(sk, 1760, 715, 90)
        smugglers_cove(sk, 1760, 650, 1.0)
        valley_hills(sk, [(1420, 760), (1520, 790), (1640, 770), (1780, 800), (1470, 860)])
        K.forest(sk, lambda x, y: True, 25, 38, kinds=("pine", "leaf"), bounds=(1400, 880, 1600, 1000))
        K.scale_bar(sk, 1620, 1000, 230)
        valley_hills(sk, [(1800, 920), (1870, 960)], 0.9)
    return box, reveals


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "src", "arte", "mapa")
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mapa-fondos"
    K.run("mapa-acto1", build,
          dict(base=(226, 206, 166), stains=9, edge=120, edge_dark=0.55, burn=0.15, crumple=1.0),
          out, work, seed=11)
