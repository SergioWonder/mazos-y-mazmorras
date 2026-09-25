#!/usr/bin/env python3
"""Combat background "asentamiento-ogro" (Act I): a goblin and ogre war camp at night.

Paints the scene as a procedural SVG, rasterises it with headless Chrome at 2x,
then post-processes it with numpy/PIL (painterly filter, bloom, grading, grain)
and exports the landscape and mobile WebP files.

Usage: python3 build.py <work_dir> <output_dir> [--review]
"""
import math
import random
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BG_ID = "asentamiento-ogro"
FORMATS = {"": (1920, 1080), "-movil": (1080, 1440)}

# Main warm light colour (amber moon), rgb(255,214,160).
LIGHT = "#ffd6a0"


def f(v):
    return f"{v:.1f}"


class Scene:
    """Holds the canvas size and helpers; every coordinate is derived from it."""

    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.s = min(w, h) / 1080.0
        self.rng = random.Random(seed)
        self.gy = 0.78 * h  # top of the combat floor band
        self.parts = []

    def add(self, svg):
        self.parts.append(svg)

    def r(self, a, b):
        return self.rng.uniform(a, b)


# ---------------------------------------------------------------- shapes

def ridge(sc, x0, x1, base, amp, rough, step, seed):
    """Closed path of a noisy ridge line from x0 to x1, filled down to the bottom."""
    rng = random.Random(seed)
    phases = [rng.uniform(0, 6.28) for _ in range(4)]
    pts = []
    x = x0
    while x <= x1 + step:
        t = x / sc.w
        y = base - amp * (0.55 * math.sin(t * 5.1 + phases[0]) + 0.3 * math.sin(t * 11.7 + phases[1])
                          + 0.15 * math.sin(t * 23.0 + phases[2]))
        y += rng.uniform(-rough, rough)
        pts.append((x, y))
        x += step
    d = f"M{f(x0)} {f(sc.h)} " + " ".join(f"L{f(px)} {f(py)}" for px, py in pts) + f" L{f(x1 + step)} {f(sc.h)} Z"
    return d, pts


def pine(x, y, h, rng):
    """Conifer silhouette made of stacked, slightly ragged triangles standing at (x, y)."""
    w = h * rng.uniform(0.42, 0.52)
    tiers = rng.randint(3, 4)
    d = f"M{f(x - w * 0.05)} {f(y)} L{f(x - w * 0.05)} {f(y - h * 0.2)} L{f(x + w * 0.05)} {f(y - h * 0.2)} L{f(x + w * 0.05)} {f(y)} Z "
    for i in range(tiers):
        t0 = i / tiers
        yb = y - h * (0.12 + 0.8 * t0)
        yt = y - h * (0.12 + 0.8 * t0) - h * 0.45
        ww = w * (1 - 0.72 * t0) / 2
        lean = rng.uniform(-0.06, 0.06) * w
        d += (f"M{f(x - ww)} {f(yb)} L{f(x - ww * 0.4)} {f(yb - h * 0.04)} L{f(x + lean)} {f(yt)} "
              f"L{f(x + ww * 0.4)} {f(yb - h * 0.05)} L{f(x + ww)} {f(yb + h * 0.01)} Z ")
    return d


def skull(x, y, r, bone="#6f6454", dark="#1a120e", horns=False, rim=None):
    """Front-facing skull centred at (x, y)."""
    out = []
    if horns:
        out.append(f'<path d="M{f(x - r * 0.8)} {f(y - r * 0.5)} Q{f(x - r * 2.4)} {f(y - r * 0.9)} {f(x - r * 2.0)} {f(y - r * 2.4)} '
                   f'Q{f(x - r * 1.6)} {f(y - r * 1.2)} {f(x - r * 0.5)} {f(y - r * 0.95)} Z" fill="#5e5242" stroke="{dark}" stroke-width="{f(r * 0.12)}"/>')
        out.append(f'<path d="M{f(x + r * 0.8)} {f(y - r * 0.5)} Q{f(x + r * 2.4)} {f(y - r * 0.9)} {f(x + r * 2.0)} {f(y - r * 2.4)} '
                   f'Q{f(x + r * 1.6)} {f(y - r * 1.2)} {f(x + r * 0.5)} {f(y - r * 0.95)} Z" fill="#4e4436" stroke="{dark}" stroke-width="{f(r * 0.12)}"/>')
    cran = (f"M{f(x - r)} {f(y)} C{f(x - r)} {f(y - r * 1.35)} {f(x + r)} {f(y - r * 1.35)} {f(x + r)} {f(y)} "
            f"L{f(x + r * 0.62)} {f(y + r * 0.55)} L{f(x + r * 0.5)} {f(y + r * 0.95)} L{f(x - r * 0.5)} {f(y + r * 0.95)} "
            f"L{f(x - r * 0.62)} {f(y + r * 0.55)} Z")
    if rim:
        out.append(f'<path d="{cran}" fill="{rim}" transform="translate({f(-r * 0.1)} {f(-r * 0.1)})" opacity="0.45"/>')
    out.append(f'<path d="{cran}" fill="{bone}" stroke="{dark}" stroke-width="{f(r * 0.1)}"/>')
    out.append(f'<path d="M{f(x + r * 0.1)} {f(y - r * 0.9)} Q{f(x + r * 0.9)} {f(y - r * 0.6)} {f(x + r * 0.62)} {f(y + r * 0.55)} '
               f'L{f(x + r * 0.5)} {f(y + r * 0.95)} L{f(x + r * 0.1)} {f(y + r * 0.95)} Z" fill="#000" opacity="0.28"/>')
    for sx in (-1, 1):
        out.append(f'<ellipse cx="{f(x + sx * r * 0.38)}" cy="{f(y - r * 0.08)}" rx="{f(r * 0.27)}" ry="{f(r * 0.24)}" fill="{dark}"/>')
    out.append(f'<path d="M{f(x)} {f(y + r * 0.2)} L{f(x - r * 0.12)} {f(y + r * 0.45)} L{f(x + r * 0.12)} {f(y + r * 0.45)} Z" fill="{dark}"/>')
    for i in range(-2, 3):
        out.append(f'<path d="M{f(x + i * r * 0.17)} {f(y + r * 0.62)} V{f(y + r * 0.92)}" stroke="{dark}" stroke-width="{f(r * 0.06)}"/>')
    return "".join(out)


def stake(sc, x, base, w, h, tilt, fill="url(#woodV)", rim_op=0.55):
    """A sharpened palisade log with bark marks and a warm rim on the left edge."""
    rng = sc.rng
    tip = h * rng.uniform(0.12, 0.18)
    dx = tilt * h
    d = (f"M{f(x - w / 2)} {f(base)} L{f(x - w / 2 + dx * 0.85)} {f(base - h + tip)} "
         f"L{f(x + dx + rng.uniform(-w * 0.15, w * 0.15))} {f(base - h)} "
         f"L{f(x + w / 2 + dx * 0.85)} {f(base - h + tip)} L{f(x + w / 2)} {f(base)} Z")
    out = [f'<path d="{d}" fill="{LIGHT}" opacity="{rim_op * 0.6}" transform="translate({f(-2.2 * sc.s)} {f(-1.5 * sc.s)})"/>',
           f'<path d="{d}" fill="{fill}" stroke="#120c09" stroke-width="{f(1.6 * sc.s)}"/>']
    # bark streaks
    for _ in range(rng.randint(2, 4)):
        bx = x + rng.uniform(-w * 0.35, w * 0.35)
        by0 = base - rng.uniform(0, h * 0.4)
        by1 = by0 - rng.uniform(h * 0.15, h * 0.5)
        out.append(f'<path d="M{f(bx)} {f(by0)} L{f(bx + dx * (base - by1) / h)} {f(by1)}" stroke="#140d09" '
                   f'stroke-width="{f(rng.uniform(1, 2.2) * sc.s)}" opacity="0.7"/>')
    # knot
    if rng.random() < 0.4:
        ky = base - rng.uniform(h * 0.25, h * 0.7)
        out.append(f'<ellipse cx="{f(x + dx * (base - ky) / h)}" cy="{f(ky)}" rx="{f(w * 0.16)}" ry="{f(w * 0.24)}" fill="#1a110c"/>')
    # carved sharp tip, pale fresh wood
    out.append(f'<path d="M{f(x - w / 2 + dx * 0.85)} {f(base - h + tip)} L{f(x + dx)} {f(base - h)} '
               f'L{f(x + dx * 0.9)} {f(base - h + tip * 1.1)} Z" fill="#6e5238" opacity="0.8"/>')
    return "".join(out), (x + dx, base - h)


def rope_band(x0, x1, y, sag, s, seed):
    """A rope lashing running across the palisade."""
    rng = random.Random(seed)
    d = f"M{f(x0)} {f(y)}"
    x = x0
    while x < x1:
        nx = x + rng.uniform(30, 44) * s
        d += f" Q{f((x + nx) / 2)} {f(y + sag)} {f(nx)} {f(y + rng.uniform(-2, 2) * s)}"
        x = nx
    return (f'<path d="{d}" fill="none" stroke="#0f0a07" stroke-width="{f(6 * s)}"/>'
            f'<path d="{d}" fill="none" stroke="#5a4630" stroke-width="{f(3.4 * s)}" stroke-dasharray="{f(3 * s)} {f(2.5 * s)}"/>')


def horn(x, y, size, s, flip=False):
    """A hanging war horn with a rope."""
    k = -1 if flip else 1
    d = (f"M{f(x)} {f(y)} Q{f(x + k * size * 0.9)} {f(y + size * 0.1)} {f(x + k * size * 1.2)} {f(y + size * 0.75)} "
         f"L{f(x + k * size * 1.05)} {f(y + size * 0.82)} Q{f(x + k * size * 0.75)} {f(y + size * 0.3)} {f(x)} {f(y + size * 0.32)} Z")
    out = [f'<path d="M{f(x + k * size * 0.2)} {f(y - size * 0.5)} L{f(x + k * size * 0.1)} {f(y + size * 0.05)} '
           f'M{f(x + k * size * 0.2)} {f(y - size * 0.5)} L{f(x + k * size * 0.9)} {f(y + size * 0.3)}" stroke="#2a2016" stroke-width="{f(1.6 * s)}" fill="none"/>',
           f'<path d="{d}" fill="#7a6a50" stroke="#140d0a" stroke-width="{f(1.5 * s)}"/>',
           f'<ellipse cx="{f(x)}" cy="{f(y + size * 0.16)}" rx="{f(size * 0.08)}" ry="{f(size * 0.17)}" fill="#2a1f16"/>']
    for t in (0.35, 0.6, 0.8):
        bx = x + k * size * (0.1 + 1.0 * t)
        by = y + size * (0.08 + 0.55 * t * t)
        out.append(f'<path d="M{f(bx)} {f(by - size * 0.12)} L{f(bx - k * size * 0.05)} {f(by + size * 0.14)}" stroke="#3a2c1e" stroke-width="{f(2.4 * s)}"/>')
    return "".join(out)


def hut(sc, cx, base, w, h, glow=True):
    """Dome hut of stitched hides over bone ribs, with tusks on top."""
    rng = sc.rng
    s = sc.s
    x0, x1 = cx - w / 2, cx + w / 2
    dome = (f"M{f(x0)} {f(base)} C{f(x0)} {f(base - h * 0.95)} {f(x0 + w * 0.18)} {f(base - h)} {f(cx)} {f(base - h)} "
            f"C{f(x1 - w * 0.18)} {f(base - h)} {f(x1)} {f(base - h * 0.95)} {f(x1)} {f(base)} Z")
    cid = f"hut{int(cx)}{int(base)}"
    out = [f'<clipPath id="{cid}"><path d="{dome}"/></clipPath>']
    # tusks / poles sticking out of the top
    for sx in (-1, 1):
        px = cx + sx * w * 0.08
        out.append(f'<path d="M{f(px)} {f(base - h * 0.9)} Q{f(px + sx * w * 0.2)} {f(base - h * 1.2)} {f(px + sx * w * 0.14)} {f(base - h * 1.42)} '
                   f'Q{f(px + sx * w * 0.1)} {f(base - h * 1.18)} {f(px - sx * w * 0.04)} {f(base - h * 0.95)} Z" fill="#5a5044" stroke="#120c09" stroke-width="{f(1.5 * s)}"/>')
    out.append(f'<path d="{dome}" fill="{LIGHT}" opacity="0.35" transform="translate({f(-3 * s)} {f(-2.5 * s)})"/>')
    out.append(f'<path d="{dome}" fill="#3b2a1f"/>')
    out.append(f'<g clip-path="url(#{cid})">')
    tones = ["#4a3526", "#57402d", "#3d2b20", "#62472f", "#44301f", "#503826"]
    # hide patches
    for _ in range(int(9 + w / (18 * s))):
        px = rng.uniform(x0, x1)
        py = rng.uniform(base - h, base)
        pw = rng.uniform(w * 0.18, w * 0.38)
        ph = rng.uniform(h * 0.18, h * 0.35)
        pts = []
        for k in range(6):
            a = k / 6 * 6.283 + rng.uniform(-0.3, 0.3)
            pts.append((px + math.cos(a) * pw / 2 * rng.uniform(0.7, 1), py + math.sin(a) * ph / 2 * rng.uniform(0.7, 1)))
        dd = "M" + " L".join(f"{f(a)} {f(b)}" for a, b in pts) + " Z"
        out.append(f'<path d="{dd}" fill="{rng.choice(tones)}" stroke="#1a110b" stroke-width="{f(1.3 * s)}"/>')
        out.append(f'<path d="{dd}" fill="none" stroke="#8a6e4c" stroke-width="{f(1.1 * s)}" stroke-dasharray="{f(2 * s)} {f(4 * s)}" opacity="0.5"/>')
    # fur tufts at patch edges
    for _ in range(int(w / (5 * s))):
        fx = rng.uniform(x0, x1)
        fy = rng.uniform(base - h, base)
        out.append(f'<path d="M{f(fx)} {f(fy)} l{f(rng.uniform(-3, 3) * s)} {f(rng.uniform(4, 9) * s)}" stroke="#2a1c13" stroke-width="{f(1.2 * s)}" opacity="0.6"/>')
    # shading: dark on the right (light comes from the upper left)
    out.append(f'<rect x="{f(x0)}" y="{f(base - h)}" width="{f(w)}" height="{f(h)}" fill="url(#shadeR)"/>')
    out.append('</g>')
    # bone ribs
    for i in range(5):
        t = (i + 0.5) / 5
        bx = x0 + w * t
        top = base - h * (1 - 1.9 * (t - 0.5) ** 2) * 0.98
        out.append(f'<path d="M{f(bx - (bx - cx) * 0.25)} {f(base)} Q{f(bx + (bx - cx) * 0.25)} {f((base + top) / 2)} {f(cx + (bx - cx) * 0.2)} {f(top)}" '
                   f'fill="none" stroke="#120c09" stroke-width="{f(7 * s)}" stroke-linecap="round"/>')
        out.append(f'<path d="M{f(bx - (bx - cx) * 0.25)} {f(base)} Q{f(bx + (bx - cx) * 0.25)} {f((base + top) / 2)} {f(cx + (bx - cx) * 0.2)} {f(top)}" '
                   f'fill="none" stroke="#6e6452" stroke-width="{f(3.6 * s)}" stroke-linecap="round" opacity="0.7"/>')
    # doorway
    dw, dh = w * 0.26, h * 0.5
    door = (f"M{f(cx - dw / 2)} {f(base)} L{f(cx - dw / 2)} {f(base - dh * 0.6)} Q{f(cx)} {f(base - dh * 1.1)} "
            f"{f(cx + dw / 2)} {f(base - dh * 0.6)} L{f(cx + dw / 2)} {f(base)} Z")
    out.append(f'<path d="{door}" fill="#0d0806" stroke="#2a1d14" stroke-width="{f(3 * s)}"/>')
    if glow:
        out.append(f'<ellipse cx="{f(cx)}" cy="{f(base - dh * 0.25)}" rx="{f(dw * 0.35)}" ry="{f(dh * 0.35)}" fill="#ff8a3a" opacity="0.45" filter="url(#blur6)"/>')
    # hanging hide flap
    out.append(f'<path d="M{f(cx - dw * 0.55)} {f(base - dh * 0.72)} Q{f(cx - dw * 0.2)} {f(base - dh * 0.9)} {f(cx + dw * 0.1)} {f(base - dh * 0.95)} '
               f'L{f(cx - dw * 0.35)} {f(base - dh * 0.1)} L{f(cx - dw * 0.55)} {f(base - dh * 0.2)} Z" fill="#4e3726" stroke="#140d09" stroke-width="{f(1.3 * s)}"/>')
    # small skull above the door
    out.append(skull(cx, base - dh * 1.08, 9 * s, rim=LIGHT))
    return "".join(out)


def totem(sc, x, base, h, w):
    """Carved totem pole topped with stacked skulls."""
    rng = sc.rng
    s = sc.s
    out = [f'<rect x="{f(x - w / 2 - 2.5 * s)}" y="{f(base - h - 2 * s)}" width="{f(w)}" height="{f(h)}" fill="{LIGHT}" opacity="0.35"/>',
           f'<rect x="{f(x - w / 2)}" y="{f(base - h)}" width="{f(w)}" height="{f(h)}" fill="url(#woodV)" stroke="#120c09" stroke-width="{f(1.6 * s)}"/>']
    seg = h / 4
    for i in range(3):
        y0 = base - h + seg * (i + 0.6)
        # carved face: brow, eyes, mouth
        out.append(f'<rect x="{f(x - w * 0.62)}" y="{f(y0)}" width="{f(w * 1.24)}" height="{f(seg * 0.14)}" rx="{f(2 * s)}" fill="#3a281b" stroke="#120c09" stroke-width="{f(1.2 * s)}"/>')
        for sx in (-1, 1):
            out.append(f'<ellipse cx="{f(x + sx * w * 0.22)}" cy="{f(y0 + seg * 0.32)}" rx="{f(w * 0.13)}" ry="{f(seg * 0.09)}" fill="#0e0907"/>')
        out.append(f'<path d="M{f(x - w * 0.28)} {f(y0 + seg * 0.62)} Q{f(x)} {f(y0 + seg * 0.8)} {f(x + w * 0.28)} {f(y0 + seg * 0.62)} '
                   f'L{f(x + w * 0.2)} {f(y0 + seg * 0.72)} L{f(x)} {f(y0 + seg * 0.66)} L{f(x - w * 0.2)} {f(y0 + seg * 0.72)} Z" fill="#0e0907"/>')
        out.append(f'<rect x="{f(x - w / 2)}" y="{f(y0 + seg * 0.84)}" width="{f(w)}" height="{f(seg * 0.07)}" fill="#6a2a1c" opacity="0.7"/>')
    # rags and feathers
    for _ in range(3):
        ry = base - h + rng.uniform(0.2, 0.9) * h
        sx = rng.choice((-1, 1))
        out.append(f'<path d="M{f(x + sx * w / 2)} {f(ry)} l{f(sx * 8 * s)} {f(18 * s)} l{f(-sx * 3 * s)} {f(4 * s)} l{f(-sx * 6 * s)} {f(-20 * s)} Z" '
                   f'fill="{rng.choice(["#5a2a1e", "#4a3b28", "#3a3226"])}" stroke="#120c09" stroke-width="{f(s)}"/>')
    # skulls stack
    top = base - h
    out.append(skull(x, top - 10 * s, w * 0.55, rim=LIGHT))
    out.append(skull(x, top - 10 * s - w * 1.05, w * 0.62, horns=True, rim=LIGHT))
    return "".join(out)


def drum(sc, x, base, r, hgt):
    """A war drum: barrel body, laced hide head, bone sticks."""
    s = sc.s
    ry = r * 0.32
    top = base - hgt
    body = (f"M{f(x - r)} {f(top)} Q{f(x - r * 1.12)} {f(top + hgt / 2)} {f(x - r)} {f(base)} "
            f"A{f(r)} {f(ry)} 0 0 0 {f(x + r)} {f(base)} Q{f(x + r * 1.12)} {f(top + hgt / 2)} {f(x + r)} {f(top)} Z")
    out = [f'<path d="{body}" fill="{LIGHT}" opacity="0.3" transform="translate({f(-3 * s)} {f(-2 * s)})"/>',
           f'<path d="{body}" fill="url(#drumBody)" stroke="#120c09" stroke-width="{f(2 * s)}"/>']
    # lacing
    n = 9
    lace = ""
    for i in range(n):
        a0 = math.pi * (i / (n - 1))
        xa = x - r * math.cos(a0)
        xb = x - r * math.cos(min(math.pi, a0 + math.pi / (n - 1) * 0.5))
        lace += f"M{f(xa)} {f(top + ry * math.sin(a0))} L{f(xb)} {f(base - hgt * 0.18 + ry * math.sin(a0))} "
    out.append(f'<path d="{lace}" stroke="#b09470" stroke-width="{f(1.6 * s)}" opacity="0.6" fill="none"/>')
    out.append(f'<path d="M{f(x - r * 1.04)} {f(base - hgt * 0.18)} A{f(r * 1.04)} {f(ry)} 0 0 0 {f(x + r * 1.04)} {f(base - hgt * 0.18)}" '
               f'fill="none" stroke="#1a110c" stroke-width="{f(6 * s)}"/>')
    out.append(f'<path d="M{f(x - r * 1.04)} {f(base - hgt * 0.18)} A{f(r * 1.04)} {f(ry)} 0 0 0 {f(x + r * 1.04)} {f(base - hgt * 0.18)}" '
               f'fill="none" stroke="#5a3a24" stroke-width="{f(3 * s)}"/>')
    # head
    out.append(f'<ellipse cx="{f(x)}" cy="{f(top)}" rx="{f(r)}" ry="{f(ry)}" fill="#8a7454" stroke="#120c09" stroke-width="{f(2 * s)}"/>')
    out.append(f'<ellipse cx="{f(x + r * 0.15)}" cy="{f(top + ry * 0.1)}" rx="{f(r * 0.7)}" ry="{f(ry * 0.6)}" fill="#6e5a40" opacity="0.6"/>')
    # painted mark on the head
    out.append(f'<path d="M{f(x - r * 0.3)} {f(top)} L{f(x)} {f(top - ry * 0.5)} L{f(x + r * 0.3)} {f(top)} L{f(x)} {f(top + ry * 0.5)} Z" fill="#5a1f16" opacity="0.7"/>')
    # sticks
    for sx in (-1, 1):
        out.append(f'<path d="M{f(x + sx * r * 0.2)} {f(top - ry * 0.1)} L{f(x + sx * r * 1.1)} {f(top - ry * 2.4)}" stroke="#120c09" stroke-width="{f(6 * s)}" stroke-linecap="round"/>')
        out.append(f'<path d="M{f(x + sx * r * 0.2)} {f(top - ry * 0.1)} L{f(x + sx * r * 1.1)} {f(top - ry * 2.4)}" stroke="#8c7e66" stroke-width="{f(3 * s)}" stroke-linecap="round"/>')
        out.append(f'<circle cx="{f(x + sx * r * 1.12)}" cy="{f(top - ry * 2.45)}" r="{f(5 * s)}" fill="#8c7e66" stroke="#120c09" stroke-width="{f(1.4 * s)}"/>')
    return "".join(out)


def banner(sc, x, base, h, bw, bl, color, emblem=True):
    """A pole with a torn, wind-blown banner."""
    rng = sc.rng
    s = sc.s
    top = base - h
    out = [f'<path d="M{f(x)} {f(base)} L{f(x)} {f(top)}" stroke="{LIGHT}" stroke-width="{f(7 * s)}" opacity="0.3" transform="translate({f(-2 * s)} 0)"/>',
           f'<path d="M{f(x)} {f(base)} L{f(x)} {f(top)}" stroke="#1e140e" stroke-width="{f(6 * s)}"/>',
           f'<path d="M{f(x - bw * 0.1)} {f(top + 8 * s)} L{f(x + bw * 1.05)} {f(top + 4 * s)}" stroke="#1e140e" stroke-width="{f(4.5 * s)}"/>']
    # spear tip / horns on the pole
    out.append(f'<path d="M{f(x - 5 * s)} {f(top)} L{f(x)} {f(top - 26 * s)} L{f(x + 5 * s)} {f(top)} Z" fill="#4a4440" stroke="#120c09" stroke-width="{f(1.2 * s)}"/>')
    # cloth with ragged bottom
    x0, x1 = x + 2 * s, x + bw
    ytop = top + 7 * s
    bottom = []
    n = 9
    for i in range(n + 1):
        t = i / n
        yy = ytop + bl * (1 - 0.25 * t) + rng.uniform(-bl * 0.22, bl * 0.05)
        if i % 2 == 1:
            yy -= rng.uniform(bl * 0.05, bl * 0.25)
        bottom.append((x0 + (x1 - x0) * t + math.sin(t * 3) * 6 * s, yy))
    d = f"M{f(x0)} {f(ytop)} Q{f((x0 + x1) / 2)} {f(ytop + 6 * s)} {f(x1)} {f(ytop - 2 * s)} "
    d += " ".join(f"L{f(a)} {f(b)}" for a, b in reversed(bottom)) + " Z"
    # holes (evenodd)
    for _ in range(rng.randint(1, 3)):
        hx = rng.uniform(x0 + bw * 0.2, x1 - bw * 0.2)
        hy = rng.uniform(ytop + bl * 0.3, ytop + bl * 0.7)
        hr = rng.uniform(3, 7) * s
        d += f" M{f(hx - hr)} {f(hy)} a{f(hr)} {f(hr * 0.8)} 0 1 0 {f(hr * 2)} 0 a{f(hr)} {f(hr * 0.8)} 0 1 0 {f(-hr * 2)} 0 Z"
    out.append(f'<path d="{d}" fill="{LIGHT}" opacity="0.28" fill-rule="evenodd" transform="translate({f(-2.5 * s)} {f(-2 * s)})"/>')
    out.append(f'<path d="{d}" fill="{color}" fill-rule="evenodd" stroke="#120c09" stroke-width="{f(1.5 * s)}"/>')
    out.append(f'<path d="{d}" fill="url(#clothShade)" fill-rule="evenodd"/>')
    # folds
    for i in range(3):
        fx = x0 + (x1 - x0) * (0.25 + i * 0.25)
        out.append(f'<path d="M{f(fx)} {f(ytop + 4 * s)} Q{f(fx + 6 * s)} {f(ytop + bl * 0.4)} {f(fx - 2 * s)} {f(ytop + bl * 0.75)}" stroke="#000" stroke-width="{f(3 * s)}" opacity="0.25" fill="none"/>')
    if emblem:
        ex, ey = (x0 + x1) / 2, ytop + bl * 0.36
        er = bw * 0.2
        # crude painted ogre fist / claw marks
        out.append(f'<g opacity="0.55" stroke="#c9b48a" stroke-width="{f(3.2 * s)}" stroke-linecap="round" fill="none">'
                   f'<path d="M{f(ex - er)} {f(ey - er)} L{f(ex - er * 0.4)} {f(ey + er)}"/>'
                   f'<path d="M{f(ex - er * 0.2)} {f(ey - er * 1.1)} L{f(ex + er * 0.2)} {f(ey + er * 1.05)}"/>'
                   f'<path d="M{f(ex + er * 0.6)} {f(ey - er)} L{f(ex + er * 0.8)} {f(ey + er)}"/></g>')
    return "".join(out)


def bonfire(sc, x, base, size, glow_op=0.5):
    """Campfire with logs, stone ring, layered flames and rising embers."""
    rng = sc.rng
    s = sc.s
    out = [f'<ellipse cx="{f(x)}" cy="{f(base)}" rx="{f(size * 5)}" ry="{f(size * 1.6)}" fill="url(#fireGround)" opacity="{glow_op}"/>',
           f'<circle cx="{f(x)}" cy="{f(base - size * 0.9)}" r="{f(size * 3.2)}" fill="url(#fireAir)" opacity="{glow_op}"/>']
    # smoke
    out.append(f'<path d="M{f(x - size * 0.3)} {f(base - size * 1.8)} C{f(x - size * 0.8)} {f(base - size * 4)} {f(x + size * 1.2)} {f(base - size * 5.5)} '
               f'{f(x + size * 0.6)} {f(base - size * 9)} L{f(x + size * 1.8)} {f(base - size * 9)} C{f(x + size * 2.2)} {f(base - size * 5)} '
               f'{f(x + size * 0.4)} {f(base - size * 3.5)} {f(x + size * 0.4)} {f(base - size * 1.8)} Z" fill="#3a2e2c" opacity="0.35" filter="url(#smoke)"/>')
    # logs
    for a in (-28, 24, -8, 12):
        out.append(f'<rect x="{f(x - size * 0.9)}" y="{f(base - size * 0.28)}" width="{f(size * 1.8)}" height="{f(size * 0.26)}" rx="{f(size * 0.1)}" '
                   f'fill="#2a1b12" stroke="#0e0906" stroke-width="{f(1.2 * s)}" transform="rotate({a} {f(x)} {f(base - size * 0.15)})"/>')
    # embers bed
    out.append(f'<ellipse cx="{f(x)}" cy="{f(base - size * 0.12)}" rx="{f(size * 0.7)}" ry="{f(size * 0.14)}" fill="#d0561e" opacity="0.8" filter="url(#blur2)"/>')
    # flames
    layers = [("#8a2a12", 1.0, 0.85), ("#c4481a", 0.85, 0.9), ("#e0782c", 0.62, 0.95), ("#f2a850", 0.4, 0.95), ("#f8cf8a", 0.2, 0.9)]
    for col, k, op in layers:
        d = f"M{f(x - size * 0.7 * k)} {f(base - size * 0.15)}"
        tongues = 4
        for i in range(tongues):
            t0 = i / tongues
            t1 = (i + 1) / tongues
            xa = x - size * 0.7 * k + size * 1.4 * k * t0
            xb = x - size * 0.7 * k + size * 1.4 * k * t1
            peak = base - size * (1.2 + 1.6 * math.sin(math.pi * (t0 + t1) / 2)) * k * rng.uniform(0.75, 1.15)
            px = (xa + xb) / 2 + rng.uniform(-0.2, 0.3) * size * k
            d += f" Q{f(xa)} {f((base + peak) / 2)} {f(px)} {f(peak)} Q{f(xb)} {f((base + peak) / 2)} {f(xb)} {f(base - size * 0.2)}"
        d += " Z"
        out.append(f'<path d="{d}" fill="{col}" opacity="{op}" filter="url(#flame)"/>')
    # stone ring
    for i in range(9):
        a = math.pi * (i / 8)
        sx_ = x - math.cos(a) * size * 1.1
        sy_ = base + math.sin(a) * size * 0.12
        out.append(f'<ellipse cx="{f(sx_)}" cy="{f(sy_)}" rx="{f(size * 0.22)}" ry="{f(size * 0.13)}" fill="#2c241f" stroke="#0e0a08" stroke-width="{f(s)}"/>')
        out.append(f'<ellipse cx="{f(sx_)}" cy="{f(sy_ - size * 0.05)}" rx="{f(size * 0.14)}" ry="{f(size * 0.05)}" fill="#a0602e" opacity="0.5"/>')
    # rising embers
    emb = []
    for _ in range(int(26 * size / (30 * s))):
        ey = base - size * rng.uniform(1.2, 7)
        ex = x + rng.uniform(-0.8, 1.6) * size * (base - ey) / (size * 4)
        er = rng.uniform(0.8, 2.0) * s
        emb.append(f'<circle cx="{f(ex)}" cy="{f(ey)}" r="{f(er)}" fill="{rng.choice(["#ffb050", "#ff8a30", "#ffd080"])}" opacity="{f(rng.uniform(0.4, 0.95))}"/>')
    out.append('<g filter="url(#glow2)">' + "".join(emb) + '</g>')
    return "".join(out)


def brazier(sc, x, base, size):
    s = sc.s
    out = [f'<path d="M{f(x - size * 0.2)} {f(base)} L{f(x)} {f(base - size * 1.4)} L{f(x + size * 0.2)} {f(base)} M{f(x)} {f(base)} L{f(x)} {f(base - size * 1.4)}" '
           f'stroke="#1a120d" stroke-width="{f(3 * s)}" fill="none"/>',
           f'<path d="M{f(x - size * 0.55)} {f(base - size * 1.7)} L{f(x + size * 0.55)} {f(base - size * 1.7)} L{f(x + size * 0.35)} {f(base - size * 1.35)} '
           f'L{f(x - size * 0.35)} {f(base - size * 1.35)} Z" fill="#2a221c" stroke="#0e0a08" stroke-width="{f(1.4 * s)}"/>',
           f'<circle cx="{f(x)}" cy="{f(base - size * 2)}" r="{f(size * 1.6)}" fill="url(#fireAir)" opacity="0.55"/>']
    for col, k in (("#b8401a", 1.0), ("#e67a2c", 0.7), ("#f6c070", 0.38)):
        out.append(f'<path d="M{f(x - size * 0.45 * k)} {f(base - size * 1.7)} Q{f(x - size * 0.5 * k)} {f(base - size * (1.7 + 0.6 * k))} '
                   f'{f(x - size * 0.1)} {f(base - size * (1.7 + 1.3 * k))} Q{f(x + size * 0.05)} {f(base - size * (1.7 + 0.7 * k))} '
                   f'{f(x + size * 0.2 * k)} {f(base - size * (1.7 + 1.0 * k))} Q{f(x + size * 0.55 * k)} {f(base - size * (1.7 + 0.5 * k))} '
                   f'{f(x + size * 0.45 * k)} {f(base - size * 1.7)} Z" fill="{col}" filter="url(#flame)"/>')
    return "".join(out)


def spit(sc, x, base, size):
    """Tripod spit with a roasting boar over a fire."""
    s = sc.s
    out = []
    for sx in (-1, 1):
        px = x + sx * size * 1.6
        out.append(f'<path d="M{f(px - sx * size * 0.3)} {f(base)} L{f(px)} {f(base - size * 2.1)} L{f(px + sx * size * 0.3)} {f(base)}" '
                   f'stroke="#1a110c" stroke-width="{f(5 * s)}" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M{f(x - size * 1.9)} {f(base - size * 2.0)} L{f(x + size * 1.9)} {f(base - size * 2.0)}" stroke="#2a1d14" stroke-width="{f(4 * s)}"/>')
    boar = (f"M{f(x - size * 0.9)} {f(base - size * 2.0)} Q{f(x - size * 0.8)} {f(base - size * 2.55)} {f(x)} {f(base - size * 2.5)} "
            f"Q{f(x + size * 0.8)} {f(base - size * 2.5)} {f(x + size * 1.0)} {f(base - size * 2.1)} L{f(x + size * 1.25)} {f(base - size * 2.0)} "
            f"L{f(x + size * 0.95)} {f(base - size * 1.85)} Q{f(x)} {f(base - size * 1.55)} {f(x - size * 0.9)} {f(base - size * 2.0)} Z")
    out.append(f'<path d="{boar}" fill="#5a2e18" stroke="#140c08" stroke-width="{f(1.5 * s)}"/>')
    out.append(f'<path d="M{f(x - size * 0.6)} {f(base - size * 2.35)} Q{f(x)} {f(base - size * 2.5)} {f(x + size * 0.7)} {f(base - size * 2.3)}" '
               f'stroke="#c07a3a" stroke-width="{f(2 * s)}" fill="none" opacity="0.6"/>')
    for k in (-0.5, 0.4):
        out.append(f'<path d="M{f(x + k * size)} {f(base - size * 1.8)} l{f(-3 * s)} {f(size * 0.35)} M{f(x + k * size + 8 * s)} {f(base - size * 1.8)} l{f(2 * s)} {f(size * 0.35)}" '
                   f'stroke="#3a1c10" stroke-width="{f(3 * s)}"/>')
    return "".join(out)


def cauldron(sc, x, base, size):
    """Iron cauldron on a small fire, with a bone ladle and steam."""
    s = sc.s
    top = base - size * 1.25
    body = (f"M{f(x - size)} {f(top)} Q{f(x - size * 1.15)} {f(base - size * 0.1)} {f(x)} {f(base - size * 0.05)} "
            f"Q{f(x + size * 1.15)} {f(base - size * 0.1)} {f(x + size)} {f(top)} Z")
    out = [f'<path d="{body}" fill="{LIGHT}" opacity="0.25" transform="translate({f(-2 * s)} {f(-2 * s)})"/>',
           f'<path d="{body}" fill="#1e1a18" stroke="#0a0807" stroke-width="{f(2 * s)}"/>',
           f'<path d="M{f(x - size * 0.4)} {f(base - size * 0.1)} Q{f(x + size * 0.6)} {f(base - size * 0.2)} {f(x + size * 0.9)} {f(top + size * 0.3)}" '
           f'stroke="#d06a2c" stroke-width="{f(3 * s)}" fill="none" opacity="0.5" filter="url(#blur2)"/>',
           f'<ellipse cx="{f(x)}" cy="{f(top)}" rx="{f(size)}" ry="{f(size * 0.22)}" fill="#2c2420" stroke="#0a0807" stroke-width="{f(2 * s)}"/>',
           f'<ellipse cx="{f(x)}" cy="{f(top + size * 0.03)}" rx="{f(size * 0.82)}" ry="{f(size * 0.15)}" fill="#6a5a22"/>',
           f'<ellipse cx="{f(x - size * 0.2)}" cy="{f(top + size * 0.02)}" rx="{f(size * 0.3)}" ry="{f(size * 0.05)}" fill="#9a8a3a" opacity="0.6"/>',
           f'<path d="M{f(x + size * 0.2)} {f(top)} L{f(x + size * 0.9)} {f(top - size * 0.9)}" stroke="#6e6452" stroke-width="{f(4 * s)}" stroke-linecap="round"/>',
           f'<path d="M{f(x - size * 0.3)} {f(top - size * 0.2)} C{f(x - size * 0.8)} {f(top - size * 1.5)} {f(x + size * 0.6)} {f(top - size * 2)} '
           f'{f(x)} {f(top - size * 3.5)} L{f(x + size * 0.8)} {f(top - size * 3.5)} C{f(x + size)} {f(top - size * 2)} {f(x + size * 0.2)} {f(top - size)} '
           f'{f(x + size * 0.3)} {f(top - size * 0.2)} Z" fill="#6a584a" opacity="0.28" filter="url(#smoke)"/>']
    for sx in (-1, 1):
        out.append(f'<path d="M{f(x + sx * size * 0.6)} {f(base - size * 0.2)} L{f(x + sx * size * 0.75)} {f(base + size * 0.12)}" stroke="#141010" stroke-width="{f(4 * s)}"/>')
    return "".join(out)


def weapon_rack(sc, x, base, w):
    """A-frame rack of crude spears, cleavers and a spiked club."""
    s = sc.s
    rng = sc.rng
    h = w * 0.9
    out = [f'<path d="M{f(x)} {f(base)} L{f(x + w * 0.1)} {f(base - h * 0.55)} M{f(x + w)} {f(base)} L{f(x + w * 0.9)} {f(base - h * 0.55)} '
           f'M{f(x)} {f(base - h * 0.45)} L{f(x + w)} {f(base - h * 0.45)}" stroke="#1e140e" stroke-width="{f(5 * s)}"/>']
    for i in range(6):
        px = x + w * (0.1 + i * 0.16)
        top = base - h * rng.uniform(0.85, 1.2)
        lean = rng.uniform(-10, 10) * s
        out.append(f'<path d="M{f(px)} {f(base)} L{f(px + lean)} {f(top)}" stroke="#2a1d14" stroke-width="{f(3.2 * s)}"/>')
        kind = i % 3
        if kind == 0:
            out.append(f'<path d="M{f(px + lean - 5 * s)} {f(top + 4 * s)} L{f(px + lean)} {f(top - 20 * s)} L{f(px + lean + 5 * s)} {f(top + 4 * s)} Z" fill="#4a4642" stroke="#0e0a08" stroke-width="{f(s)}"/>')
        elif kind == 1:
            out.append(f'<path d="M{f(px + lean)} {f(top)} L{f(px + lean + 22 * s)} {f(top - 4 * s)} L{f(px + lean + 20 * s)} {f(top + 18 * s)} L{f(px + lean)} {f(top + 14 * s)} Z" fill="#3e3a36" stroke="#0e0a08" stroke-width="{f(s)}"/>')
        else:
            out.append(f'<ellipse cx="{f(px + lean)}" cy="{f(top + 6 * s)}" rx="{f(8 * s)}" ry="{f(16 * s)}" fill="#3a281b" stroke="#0e0a08" stroke-width="{f(s)}"/>')
            for k in range(5):
                out.append(f'<path d="M{f(px + lean - 8 * s)} {f(top + k * 6 * s)} l{f(-6 * s)} {f(-2 * s)} M{f(px + lean + 8 * s)} {f(top + k * 6 * s)} l{f(6 * s)} {f(-2 * s)}" stroke="#5a5650" stroke-width="{f(1.6 * s)}"/>')
    return "".join(out)


def bone_pile(sc, x, base, w):
    s = sc.s
    rng = sc.rng
    out = [f'<ellipse cx="{f(x)}" cy="{f(base)}" rx="{f(w * 0.6)}" ry="{f(w * 0.12)}" fill="#0e0a08" opacity="0.5"/>']
    for _ in range(9):
        a = rng.uniform(-0.6, 0.6)
        bx = x + rng.uniform(-w * 0.4, w * 0.4)
        by = base - rng.uniform(0, w * 0.18)
        ln = rng.uniform(w * 0.18, w * 0.35)
        dx, dy = math.cos(a) * ln / 2, math.sin(a) * ln / 2
        out.append(f'<path d="M{f(bx - dx)} {f(by - dy)} L{f(bx + dx)} {f(by + dy)}" stroke="#120c09" stroke-width="{f(6 * s)}" stroke-linecap="round"/>')
        out.append(f'<path d="M{f(bx - dx)} {f(by - dy)} L{f(bx + dx)} {f(by + dy)}" stroke="#5e5446" stroke-width="{f(3.4 * s)}" stroke-linecap="round"/>')
    out.append(skull(x + w * 0.1, base - w * 0.2, w * 0.1))
    return "".join(out)


def chief_tent(sc, cx, base, w, h):
    """The ogre warlord's great tent with a bone throne, tusks and a beast skull."""
    rng = sc.rng
    s = sc.s
    x0, x1 = cx - w / 2, cx + w / 2
    out = []
    # poles crossing at the top
    for dx in (-0.12, 0.0, 0.1):
        out.append(f'<path d="M{f(cx + dx * w)} {f(base - h * 0.9)} L{f(cx + dx * w * 2.2)} {f(base - h * 1.18)}" stroke="#1a110c" stroke-width="{f(8 * s)}" stroke-linecap="round"/>')
    tent = (f"M{f(x0)} {f(base)} Q{f(x0 + w * 0.12)} {f(base - h * 0.45)} {f(cx - w * 0.08)} {f(base - h * 0.95)} "
            f"L{f(cx + w * 0.08)} {f(base - h * 0.95)} Q{f(x1 - w * 0.12)} {f(base - h * 0.45)} {f(x1)} {f(base)} Z")
    cid = f"tent{int(cx)}"
    out.append(f'<clipPath id="{cid}"><path d="{tent}"/></clipPath>')
    out.append(f'<path d="{tent}" fill="{LIGHT}" opacity="0.3" transform="translate({f(-3 * s)} {f(-3 * s)})"/>')
    out.append(f'<path d="{tent}" fill="#34251b"/>')
    out.append(f'<g clip-path="url(#{cid})">')
    # vertical hide panels
    n = 9
    for i in range(n):
        t0 = i / n
        col = ["#3a2a1e", "#45311f", "#302219", "#4c3622"][i % 4]
        xa = x0 + w * t0
        xb = x0 + w * (t0 + 1 / n)
        out.append(f'<path d="M{f(xa)} {f(base)} L{f(cx + (xa - cx) * 0.1)} {f(base - h)} L{f(cx + (xb - cx) * 0.1)} {f(base - h)} L{f(xb)} {f(base)} Z" '
                   f'fill="{col}" stroke="#150e0a" stroke-width="{f(1.6 * s)}"/>')
        out.append(f'<path d="M{f(xb)} {f(base)} L{f(cx + (xb - cx) * 0.1)} {f(base - h)}" stroke="#806446" stroke-width="{f(1.2 * s)}" stroke-dasharray="{f(3 * s)} {f(5 * s)}" opacity="0.45"/>')
    # painted war stripes
    for k in range(2):
        yy = base - h * (0.35 + k * 0.12)
        out.append(f'<path d="M{f(x0)} {f(yy)} Q{f(cx)} {f(yy + 16 * s)} {f(x1)} {f(yy)}" stroke="#5e2218" stroke-width="{f(9 * s)}" fill="none" opacity="0.6"/>')
    # dangling trophies on a rope
    rope_y = base - h * 0.62
    out.append(f'<path d="M{f(x0 + w * 0.2)} {f(rope_y)} Q{f(cx)} {f(rope_y + 40 * s)} {f(x1 - w * 0.2)} {f(rope_y)}" stroke="#1a120c" stroke-width="{f(3 * s)}" fill="none"/>')
    for i in range(7):
        t = (i + 1) / 8
        tx = x0 + w * 0.2 + (w * 0.6) * t
        ty = rope_y + 40 * s * (1 - (2 * t - 1) ** 2) * 0.5
        if i % 2:
            out.append(skull(tx, ty + 14 * s, 8 * s))
        else:
            out.append(f'<path d="M{f(tx)} {f(ty)} l{f(-4 * s)} {f(22 * s)} l{f(8 * s)} 0 Z" fill="#6e6250" stroke="#120c09" stroke-width="{f(s)}"/>')
    out.append(f'<rect x="{f(x0)}" y="{f(base - h)}" width="{f(w)}" height="{f(h)}" fill="url(#shadeR)"/>')
    out.append('</g>')
    # entrance with throne
    ew, eh = w * 0.3, h * 0.52
    ent = f"M{f(cx - ew / 2)} {f(base)} Q{f(cx - ew * 0.2)} {f(base - eh * 0.7)} {f(cx)} {f(base - eh)} Q{f(cx + ew * 0.2)} {f(base - eh * 0.7)} {f(cx + ew / 2)} {f(base)} Z"
    out.append(f'<path d="{ent}" fill="#0c0806"/>')
    out.append(f'<ellipse cx="{f(cx)}" cy="{f(base - eh * 0.3)}" rx="{f(ew * 0.4)}" ry="{f(eh * 0.4)}" fill="#c4581e" opacity="0.28" filter="url(#blur6)"/>')
    # bone throne silhouette
    tw = ew * 0.5
    th = eh * 0.72
    thr = (f"M{f(cx - tw / 2)} {f(base)} L{f(cx - tw / 2)} {f(base - th * 0.45)} L{f(cx - tw * 0.62)} {f(base - th * 0.5)} "
           f"L{f(cx - tw * 0.4)} {f(base - th)} L{f(cx - tw * 0.2)} {f(base - th * 0.8)} L{f(cx)} {f(base - th * 1.08)} "
           f"L{f(cx + tw * 0.2)} {f(base - th * 0.8)} L{f(cx + tw * 0.4)} {f(base - th)} L{f(cx + tw * 0.62)} {f(base - th * 0.5)} "
           f"L{f(cx + tw / 2)} {f(base - th * 0.45)} L{f(cx + tw / 2)} {f(base)} Z")
    out.append(f'<path d="{thr}" fill="#2a2119" stroke="#5a4c3a" stroke-width="{f(1.6 * s)}"/>')
    out.append(skull(cx, base - th * 0.72, tw * 0.16, bone="#6a5e4c"))
    # great tusks framing the entrance
    for sx in (-1, 1):
        bx = cx + sx * ew * 0.62
        tusk = (f"M{f(bx)} {f(base)} Q{f(bx + sx * ew * 0.35)} {f(base - eh * 0.9)} {f(bx - sx * ew * 0.15)} {f(base - eh * 1.35)} "
                f"Q{f(bx + sx * ew * 0.1)} {f(base - eh * 0.9)} {f(bx - sx * ew * 0.12)} {f(base)} Z")
        out.append(f'<path d="{tusk}" fill="{LIGHT}" opacity="0.22" transform="translate({f(-3 * s)} {f(-2 * s)})"/>')
        out.append(f'<path d="{tusk}" fill="#62584a" stroke="#120c09" stroke-width="{f(2 * s)}"/>')
        for k in range(4):
            yy = base - eh * (0.2 + k * 0.22)
            out.append(f'<path d="M{f(bx - sx * ew * 0.12 + sx * k * 2 * s)} {f(yy)} l{f(sx * ew * 0.22)} {f(-6 * s)}" stroke="#3a2e22" stroke-width="{f(2.4 * s)}"/>')
    # beast skull on top of the entrance
    out.append(skull(cx, base - eh - 30 * s, 26 * s, bone="#5e5446", horns=True, rim=LIGHT))
    # braziers flanking
    out.append(brazier(sc, cx - ew * 1.05, base + 4 * s, 22 * s))
    out.append(brazier(sc, cx + ew * 1.05, base + 4 * s, 22 * s))
    # ropes to pegs
    for sx in (-1, 1):
        out.append(f'<path d="M{f(cx + sx * w * 0.3)} {f(base - h * 0.55)} L{f(cx + sx * w * 0.72)} {f(base + 6 * s)}" stroke="#1a120c" stroke-width="{f(2.2 * s)}"/>')
    return "".join(out)


def cottage(x, base, w, h, s, burning, rng):
    """Distant village cottage silhouette, optionally burning."""
    roof = h * 0.55
    out = [f'<path d="M{f(x)} {f(base)} L{f(x)} {f(base - h + roof)} L{f(x + w / 2)} {f(base - h)} L{f(x + w)} {f(base - h + roof)} L{f(x + w)} {f(base)} Z" fill="#1c1418"/>']
    if burning:
        out.append(f'<rect x="{f(x + w * 0.3)}" y="{f(base - h * 0.35)}" width="{f(w * 0.16)}" height="{f(h * 0.18)}" fill="#ff9a40" opacity="0.85"/>')
        fl = f"M{f(x + w * 0.1)} {f(base - h + roof)}"
        for i in range(4):
            fx = x + w * (0.15 + i * 0.22)
            fl += f" Q{f(fx)} {f(base - h - rng.uniform(0.4, 1.1) * h)} {f(fx + w * 0.11)} {f(base - h + roof * 0.6)}"
        fl += f" L{f(x + w * 0.9)} {f(base - h + roof)} Z"
        out.append(f'<path d="{fl}" fill="#e06a24" opacity="0.8" filter="url(#flame)"/>')
    else:
        out.append(f'<rect x="{f(x + w * 0.55)}" y="{f(base - h * 0.4)}" width="{f(w * 0.12)}" height="{f(h * 0.14)}" fill="#d08040" opacity="0.5"/>')
    return "".join(out)


# ---------------------------------------------------------------- defs

def defs(sc):
    s = sc.s
    return f"""
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#140f18"/><stop offset="0.35" stop-color="#2a1d26"/>
 <stop offset="0.62" stop-color="#4c3230"/><stop offset="0.8" stop-color="#6a4632"/><stop offset="1" stop-color="#3a2820"/>
</linearGradient>
<radialGradient id="moonHalo" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="{LIGHT}" stop-opacity="0.55"/><stop offset="0.25" stop-color="#f0b27a" stop-opacity="0.28"/>
 <stop offset="0.6" stop-color="#b0704a" stop-opacity="0.1"/><stop offset="1" stop-color="#6a4030" stop-opacity="0"/>
</radialGradient>
<radialGradient id="moonDisc" cx="0.42" cy="0.4" r="0.62">
 <stop offset="0" stop-color="#fbe2b6"/><stop offset="0.7" stop-color="#f1c285"/><stop offset="1" stop-color="#d69a5c"/>
</radialGradient>
<radialGradient id="villageGlow" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="#e2702e" stop-opacity="0.55"/><stop offset="1" stop-color="#a0401c" stop-opacity="0"/>
</radialGradient>
<radialGradient id="fireGround" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="#e07a34" stop-opacity="0.7"/><stop offset="0.5" stop-color="#9a4a22" stop-opacity="0.25"/><stop offset="1" stop-color="#5a2a14" stop-opacity="0"/>
</radialGradient>
<radialGradient id="fireAir" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="#ffa050" stop-opacity="0.5"/><stop offset="0.4" stop-color="#d06a2c" stop-opacity="0.18"/><stop offset="1" stop-color="#803818" stop-opacity="0"/>
</radialGradient>
<linearGradient id="woodV" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#4a3422"/><stop offset="0.35" stop-color="#3a281b"/><stop offset="1" stop-color="#1e150f"/>
</linearGradient>
<linearGradient id="drumBody" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#5a3a24"/><stop offset="0.4" stop-color="#46301f"/><stop offset="1" stop-color="#1e140e"/>
</linearGradient>
<linearGradient id="shadeR" x1="0" y1="0" x2="1" y2="0.3">
 <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.45" stop-color="#000" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
</linearGradient>
<linearGradient id="clothShade" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
</linearGradient>
<linearGradient id="campFloor" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#3a2a20"/><stop offset="1" stop-color="#211812"/>
</linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#261b14"/><stop offset="0.4" stop-color="#1c140f"/><stop offset="1" stop-color="#110c09"/>
</linearGradient>
<linearGradient id="hazeBand" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#8a5a3c" stop-opacity="0"/><stop offset="0.6" stop-color="#8a5a3c" stop-opacity="0.35"/><stop offset="1" stop-color="#8a5a3c" stop-opacity="0"/>
</linearGradient>
<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(2 * s)}"/></filter>
<filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(6 * s)}"/></filter>
<filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(14 * s)}"/></filter>
<filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
 <feGaussianBlur stdDeviation="{f(2.2 * s)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="flame" x="-50%" y="-50%" width="200%" height="200%">
 <feTurbulence type="fractalNoise" baseFrequency="0.05 0.02" numOctaves="2" seed="4" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="{f(9 * s)}" xChannelSelector="R" yChannelSelector="G" result="d"/>
 <feGaussianBlur in="d" stdDeviation="{f(1.2 * s)}" result="b"/>
 <feGaussianBlur in="d" stdDeviation="{f(6 * s)}" result="g"/>
 <feMerge><feMergeNode in="g"/><feMergeNode in="b"/></feMerge>
</filter>
<filter id="smoke" x="-80%" y="-30%" width="260%" height="160%">
 <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="9" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="{f(60 * s)}" xChannelSelector="R" yChannelSelector="G" result="d"/>
 <feGaussianBlur in="d" stdDeviation="{f(8 * s)}"/>
</filter>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
 <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="{f(3 * s)}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="woodTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="0.45 0.018" numOctaves="3" seed="5" result="n"/>
 <feColorMatrix in="n" type="matrix" values="1.3 0 0 0 0.25  1.3 0 0 0 0.25  1.3 0 0 0 0.25  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="hideTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="4" seed="8" result="n"/>
 <feDiffuseLighting in="n" surfaceScale="{f(2.5 * s)}" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
 <feColorMatrix in="l" type="matrix" values="0.7 0 0 0 0.38  0.7 0 0 0 0.38  0.7 0 0 0 0.38  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="groundTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="0.006 0.03" numOctaves="5" seed="11" result="n"/>
 <feDiffuseLighting in="n" surfaceScale="{f(4 * s)}" lighting-color="#fff" result="l"><feDistantLight azimuth="235" elevation="60"/></feDiffuseLighting>
 <feColorMatrix in="l" type="matrix" values="0.45 0 0 0 0.6  0.45 0 0 0 0.6  0.45 0 0 0 0.6  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="clouds" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.0018 / s:.5f} {0.0065 / s:.5f}" numOctaves="5" seed="17" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.12  3.2 0 0 0 -1.55"/>
</filter>
<filter id="cloudsLit" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.0018 / s:.5f} {0.0065 / s:.5f}" numOctaves="5" seed="17" result="n"/>
 <feOffset dx="{f(-5 * s)}" dy="{f(-5 * s)}"/>
 <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.6  0 0 0 0 0.42  3.2 0 0 0 -1.5"/>
</filter>
<filter id="moonTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.02 / s:.4f}" numOctaves="4" seed="21" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.25  0 0 0 0 0.12  2.2 0 0 0 -0.95"/>
</filter>
<filter id="mist" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.003 / s:.5f} {0.02 / s:.5f}" numOctaves="4" seed="31" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.3  2.0 0 0 0 -0.7"/>
</filter>
<filter id="veil" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.004 / s:.5f} {0.028 / s:.5f}" numOctaves="4" seed="41" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.19  0 0 0 0 0.17  2.6 0 0 0 -1.15"/>
 <feGaussianBlur stdDeviation="{f(3 * s)}"/>
</filter>
</defs>"""


# ---------------------------------------------------------------- composition

def build_svg(w, h):
    sc = Scene(w, h, seed=1337)
    s, W, H, gy = sc.s, w, h, sc.gy
    rng = sc.rng
    mx, my = 0.23 * W, 0.26 * H
    tall = H > W
    mr = (132 if tall else 112) * s
    pb = gy - 118 * s          # palisade base line
    horizon = pb - 40 * s
    gate0, gate1 = 0.11 * W, 0.335 * W

    sc.add(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    # stars, very faint, away from the moon
    stars = []
    for _ in range(int(160 * W / 1920)):
        x_, y_ = rng.uniform(0, W), rng.uniform(0.1 * H, horizon - 150 * s)
        if math.hypot(x_ - mx, y_ - my) < mr * 3:
            continue
        stars.append(f'<circle cx="{f(x_)}" cy="{f(y_)}" r="{f(rng.uniform(0.5, 1.4) * s)}" fill="#e8cfa8" opacity="{f(rng.uniform(0.15, 0.5))}"/>')
    sc.add("".join(stars))
    # moon halo, disc and texture
    sc.add(f'<circle cx="{f(mx)}" cy="{f(my)}" r="{f(mr * 7.5)}" fill="url(#moonHalo)"/>')
    sc.add(f'<circle cx="{f(mx)}" cy="{f(my)}" r="{f(mr * 1.25)}" fill="{LIGHT}" opacity="0.35" filter="url(#blur14)"/>')
    sc.add(f'<circle cx="{f(mx)}" cy="{f(my)}" r="{f(mr)}" fill="url(#moonDisc)"/>')
    sc.add(f'<clipPath id="moonClip"><circle cx="{f(mx)}" cy="{f(my)}" r="{f(mr)}"/></clipPath>')
    sc.add(f'<g clip-path="url(#moonClip)"><rect x="{f(mx - mr)}" y="{f(my - mr)}" width="{f(2 * mr)}" height="{f(2 * mr)}" filter="url(#moonTex)" opacity="0.55"/>'
           f'<circle cx="{f(mx + mr * 0.55)}" cy="{f(my + mr * 0.45)}" r="{f(mr * 1.1)}" fill="#8a4a28" opacity="0.18" filter="url(#blur14)"/></g>')
    # clouds: lit edges behind, dark bodies in front
    ch0, ch1 = 0, horizon - 60 * s
    sc.add(f'<rect x="0" y="{f(ch0)}" width="{W}" height="{f(ch1 - ch0)}" filter="url(#cloudsLit)" opacity="0.55"/>')
    sc.add(f'<rect x="0" y="{f(ch0)}" width="{W}" height="{f(ch1 - ch0)}" filter="url(#clouds)" opacity="0.8"/>')
    # thin veil of cloud drifting over the lower half of the moon
    sc.add(f'<radialGradient id="veilFade" cx="{f(mx)}" cy="{f(my + mr * 0.6)}" r="{f(mr * 4)}" gradientUnits="userSpaceOnUse">'
           f'<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>'
           f'<mask id="veilMask"><rect width="{W}" height="{H}" fill="url(#veilFade)"/></mask>')
    sc.add(f'<rect x="0" y="0" width="{W}" height="{f(horizon)}" filter="url(#veil)" opacity="0.8" mask="url(#veilMask)"/>')

    # far mountains
    d, _ = ridge(sc, -20, W + 20, horizon - (230 if tall else 150) * s, (110 if tall else 70) * s, 4 * s, 14 * s, 3)
    sc.add(f'<path d="{d}" fill="#3e2d34" opacity="0.9"/>')
    sc.add(f'<rect x="0" y="{f(horizon - 240 * s)}" width="{W}" height="{f(260 * s)}" fill="url(#hazeBand)"/>')
    # burning village on a distant hill, seen through the gate
    vx = 0.3 * W
    vbase = horizon - 58 * s
    sc.add(f'<ellipse cx="{f(vx + 20 * s)}" cy="{f(vbase - 30 * s)}" rx="{f(260 * s)}" ry="{f(120 * s)}" fill="url(#villageGlow)"/>')
    # smoke columns from the village drifting right
    for i in range(3):
        sx0 = vx + (i * 45 - 20) * s
        sc.add(f'<path d="M{f(sx0)} {f(vbase - 20 * s)} C{f(sx0 - 30 * s)} {f(vbase - 140 * s)} {f(sx0 + 90 * s)} {f(vbase - 220 * s)} '
               f'{f(sx0 + 180 * s)} {f(vbase - 380 * s)} L{f(sx0 + 290 * s)} {f(vbase - 360 * s)} C{f(sx0 + 170 * s)} {f(vbase - 200 * s)} '
               f'{f(sx0 + 40 * s)} {f(vbase - 120 * s)} {f(sx0 + 30 * s)} {f(vbase - 20 * s)} Z" fill="#2a1e22" opacity="0.45" filter="url(#smoke)"/>')
    d, _ = ridge(sc, -20, W + 20, horizon - 70 * s, 34 * s, 2 * s, 10 * s, 5)
    sc.add(f'<path d="{d}" fill="#34252b"/>')
    # distant pines on that ridge
    trees = []
    _, pts = ridge(sc, -20, W + 20, horizon - 70 * s, 34 * s, 2 * s, 10 * s, 5)
    canopy = []
    for px, py in pts:
        if rng.random() < 0.85:
            rr = rng.uniform(7, 14) * s
            canopy.append(f'<circle cx="{f(px + rng.uniform(-4, 4) * s)}" cy="{f(py + rr * 0.3)}" r="{f(rr)}"/>')
        if rng.random() < 0.12:
            trees.append(pine(px, py + 4 * s, rng.uniform(22, 34) * s, rng))
    sc.add(f'<g fill="#30222a">{"".join(canopy)}<path d="{" ".join(trees)}"/></g>')
    houses = []
    vr = random.Random(77)
    # chapel with a bell tower, the recognisable heart of a shire village
    tx_ = vx + 30 * s
    houses.append(f'<path d="M{f(tx_)} {f(vbase)} L{f(tx_)} {f(vbase - 62 * s)} L{f(tx_ + 9 * s)} {f(vbase - 84 * s)} L{f(tx_ + 18 * s)} {f(vbase - 62 * s)} '
                  f'L{f(tx_ + 18 * s)} {f(vbase - 30 * s)} L{f(tx_ + 50 * s)} {f(vbase - 30 * s)} L{f(tx_ + 50 * s)} {f(vbase)} Z" fill="#1c1418"/>')
    houses.append(f'<rect x="{f(tx_ + 6 * s)}" y="{f(vbase - 56 * s)}" width="{f(6 * s)}" height="{f(9 * s)}" fill="#ff9a40" opacity="0.8"/>')
    for i, hx in enumerate((-110, -72, -30, 90, 130)):
        houses.append(cottage(vx + hx * s + vr.uniform(-5, 5) * s, vbase + vr.uniform(-3, 5) * s, vr.uniform(32, 44) * s,
                              vr.uniform(28, 38) * s, s, i in (1, 2, 3), vr))
    sc.add("".join(houses))
    # a second, dimmer fire far right
    sc.add(f'<ellipse cx="{f(0.86 * W)}" cy="{f(horizon - 60 * s)}" rx="{f(90 * s)}" ry="{f(40 * s)}" fill="url(#villageGlow)" opacity="0.45"/>')

    # valley hills with forest
    d, pts = ridge(sc, -20, W + 20, horizon - 8 * s, 30 * s, 2 * s, 8 * s, 8)
    sc.add(f'<path d="{d}" fill="#2a1e22"/>')
    trees = []
    for px, py in pts:
        if rng.random() < 0.8:
            trees.append(pine(px + rng.uniform(-3, 3) * s, py + 10 * s, rng.uniform(40, 80) * s, rng))
    sc.add(f'<path d="{" ".join(trees)}" fill="#261b1f"/>')
    sc.add(f'<rect x="0" y="{f(horizon - 60 * s)}" width="{W}" height="{f(110 * s)}" fill="url(#hazeBand)" opacity="0.8"/>')
    sc.add(f'<rect x="0" y="{f(horizon - 60 * s)}" width="{W}" height="{f(120 * s)}" filter="url(#mist)" opacity="0.35"/>')

    # camp floor
    sc.add(f'<rect x="0" y="{f(pb - 30 * s)}" width="{W}" height="{f(H - pb + 30 * s)}" fill="url(#campFloor)" filter="url(#groundTex)"/>')
    # moonlight spilling through the gate onto the floor
    sc.add(f'<path d="M{f(gate0)} {f(pb)} L{f(gate1)} {f(pb)} L{f(gate1 + 90 * s)} {f(gy + 40 * s)} L{f(gate0 - 60 * s)} {f(gy + 40 * s)} Z" '
           f'fill="#b88058" opacity="0.18" filter="url(#blur14)"/>')

    # palisade (left and right of the gate)
    stakes = []
    tips = []
    x = -10 * s
    while x < W + 20 * s:
        if gate0 - 12 * s < x < gate1 + 12 * s:
            x = gate1 + 12 * s
            continue
        sw = rng.uniform(17, 25) * s
        sh = rng.uniform(150, 190) * s
        svg, tip = stake(sc, x, pb + rng.uniform(0, 6) * s, sw, sh, rng.uniform(-0.03, 0.03))
        stakes.append(svg)
        tips.append(tip)
        x += sw * rng.uniform(0.92, 1.02)
    sc.add('<g filter="url(#woodTex)">' + "".join(stakes) + '</g>')
    # packed earth banked against the foot of the palisade
    for x_a, x_b in ((-20, gate0 + 10 * s), (gate1 - 10 * s, W + 20)):
        sc.add(f'<path d="M{f(x_a)} {f(pb + 14 * s)} Q{f(x_a + (x_b - x_a) * 0.3)} {f(pb - 16 * s)} {f((x_a + x_b) / 2)} {f(pb - 8 * s)} '
               f'T{f(x_b)} {f(pb + 2 * s)} L{f(x_b)} {f(pb + 24 * s)} L{f(x_a)} {f(pb + 24 * s)} Z" fill="#1c140f" filter="url(#blur2)"/>')
    sc.add(rope_band(-10, gate0 - 6 * s, pb - 50 * s, 6 * s, s, 1) + rope_band(gate1 + 6 * s, W + 10, pb - 50 * s, 6 * s, s, 2))
    sc.add(rope_band(-10, gate0 - 6 * s, pb - 120 * s, 5 * s, s, 3) + rope_band(gate1 + 6 * s, W + 10, pb - 120 * s, 5 * s, s, 4))
    # skulls impaled on some tips
    for i, (tx, ty) in enumerate(tips):
        if i % 7 == 3:
            sc.add(skull(tx, ty + 8 * s, 10 * s, rim=LIGHT))
    # hanging horns
    for i, (tx, ty) in enumerate(tips):
        if i % 11 == 5:
            sc.add(horn(tx, pb - 118 * s, 30 * s, s, flip=(i % 2 == 0)))

    # gate towers with a lintel and hanging skull charm
    for gx in (gate0, gate1):
        tw_ = 44 * s
        sc.add(f'<g filter="url(#woodTex)">')
        for k in (-1, 1):
            svg, _ = stake(sc, gx + k * tw_ * 0.28, pb + 4 * s, 24 * s, 250 * s, 0)
            sc.add(svg)
        sc.add('</g>')
        # watch platform
        sc.add(f'<rect x="{f(gx - tw_ * 0.8)}" y="{f(pb - 200 * s)}" width="{f(tw_ * 1.6)}" height="{f(12 * s)}" fill="#2a1d14" stroke="#120c09" stroke-width="{f(1.5 * s)}"/>')
        sc.add(f'<path d="M{f(gx - tw_ * 0.8)} {f(pb - 200 * s)} L{f(gx - tw_ * 0.8)} {f(pb - 228 * s)} M{f(gx + tw_ * 0.8)} {f(pb - 200 * s)} L{f(gx + tw_ * 0.8)} {f(pb - 228 * s)} '
               f'M{f(gx - tw_ * 0.8)} {f(pb - 222 * s)} L{f(gx + tw_ * 0.8)} {f(pb - 222 * s)}" stroke="#1e140e" stroke-width="{f(4 * s)}"/>')
        sc.add(f'<path d="M{f(gx - tw_ * 0.6)} {f(pb - 188 * s)} L{f(gx + tw_ * 0.6)} {f(pb - 120 * s)} M{f(gx + tw_ * 0.6)} {f(pb - 188 * s)} L{f(gx - tw_ * 0.6)} {f(pb - 120 * s)}" '
               f'stroke="#24180f" stroke-width="{f(5 * s)}"/>')
    sc.add(f'<path d="M{f(gate0 - 30 * s)} {f(pb - 214 * s)} Q{f((gate0 + gate1) / 2)} {f(pb - 196 * s)} {f(gate1 + 30 * s)} {f(pb - 214 * s)}" stroke="#120c09" stroke-width="{f(13 * s)}" fill="none"/>')
    sc.add(f'<path d="M{f(gate0 - 30 * s)} {f(pb - 214 * s)} Q{f((gate0 + gate1) / 2)} {f(pb - 196 * s)} {f(gate1 + 30 * s)} {f(pb - 214 * s)}" stroke="#3a281b" stroke-width="{f(8 * s)}" fill="none"/>')
    # charms hanging from the lintel
    for k in range(5):
        cx_ = gate0 + (gate1 - gate0) * (k + 1) / 6
        cy_ = pb - 205 * s + 8 * s * math.sin(math.pi * (k + 1) / 6)
        ln = rng.uniform(18, 40) * s
        sc.add(f'<path d="M{f(cx_)} {f(cy_)} L{f(cx_)} {f(cy_ + ln)}" stroke="#1a120c" stroke-width="{f(1.6 * s)}"/>')
        if k % 2 == 0:
            sc.add(skull(cx_, cy_ + ln + 7 * s, 7 * s))
        else:
            sc.add(f'<path d="M{f(cx_ - 4 * s)} {f(cy_ + ln)} L{f(cx_)} {f(cy_ + ln + 20 * s)} L{f(cx_ + 4 * s)} {f(cy_ + ln)} Z" fill="#7a6c56" stroke="#120c09" stroke-width="{f(s)}"/>')

    # chief tent behind the fighting area, dim
    sc.add('<g filter="url(#hideTex)">' + chief_tent(sc, 0.63 * W, pb + 14 * s, 380 * s, 300 * s) + '</g>')

    # banners on tall poles
    sc.add(banner(sc, 0.075 * W, pb + 30 * s, 330 * s, 80 * s, 150 * s, "#5e2319"))
    sc.add(banner(sc, 0.44 * W, pb + 20 * s, 300 * s, 70 * s, 130 * s, "#5a4a26"))
    sc.add(banner(sc, 0.8 * W, pb + 24 * s, 320 * s, 78 * s, 140 * s, "#5e2319"))

    # totems
    sc.add('<g filter="url(#woodTex)">' + totem(sc, 0.385 * W, pb + 40 * s, 150 * s, 26 * s) + '</g>')
    sc.add('<g filter="url(#woodTex)">' + totem(sc, 0.9 * W, pb + 34 * s, 170 * s, 28 * s) + '</g>')
    sc.add('<g filter="url(#woodTex)">' + totem(sc, 0.515 * W, pb + 30 * s, 120 * s, 22 * s) + '</g>')

    # huts
    sc.add('<g filter="url(#hideTex)">' + hut(sc, 0.03 * W, pb + 60 * s, 190 * s, 150 * s) + '</g>')
    sc.add('<g filter="url(#hideTex)">' + hut(sc, 0.97 * W, pb + 64 * s, 210 * s, 160 * s) + '</g>')
    sc.add('<g filter="url(#hideTex)">' + hut(sc, 0.47 * W, pb + 52 * s, 150 * s, 118 * s, glow=False) + '</g>')

    # war drums
    sc.add('<g filter="url(#woodTex)">' + drum(sc, 0.36 * W, gy - 10 * s, 40 * s, 62 * s) + drum(sc, 0.415 * W, gy - 6 * s, 28 * s, 44 * s) + '</g>')
    sc.add('<g filter="url(#woodTex)">' + drum(sc, 0.84 * W, gy - 30 * s, 34 * s, 54 * s) + '</g>')

    # bonfires
    sc.add(bonfire(sc, 0.09 * W, gy - 12 * s, 30 * s, 0.7))
    sc.add(spit(sc, 0.09 * W, gy - 12 * s, 30 * s))
    sc.add(bonfire(sc, 0.555 * W, gy - 40 * s, 16 * s, 0.45))
    sc.add(cauldron(sc, 0.555 * W, gy - 52 * s, 30 * s))
    sc.add(weapon_rack(sc, 0.705 * W, pb + 44 * s, 100 * s))
    sc.add(bone_pile(sc, 0.6 * W, gy - 22 * s, 90 * s))
    sc.add(bone_pile(sc, 0.935 * W, gy - 16 * s, 80 * s))
    sc.add(bone_pile(sc, 0.03 * W, gy + 4 * s, 70 * s))

    # combat floor
    sc.add(f'<path d="M0 {f(gy - 12 * s)} Q{f(W * 0.3)} {f(gy - 22 * s)} {f(W * 0.6)} {f(gy - 8 * s)} T{f(W)} {f(gy - 14 * s)} L{f(W)} {f(H)} L0 {f(H)} Z" '
           f'fill="url(#ground)" filter="url(#groundTex)"/>')
    sc.add(f'<rect x="0" y="{f(gy - 34 * s)}" width="{W}" height="{f(50 * s)}" fill="#20170f" opacity="0.55" filter="url(#blur14)"/>')
    # soft trampled tracks and faint warm spill near the fires
    sc.add(f'<ellipse cx="{f(0.1 * W)}" cy="{f(gy + 10 * s)}" rx="{f(260 * s)}" ry="{f(40 * s)}" fill="#a0522a" opacity="0.14" filter="url(#blur14)"/>')
    sc.add(f'<ellipse cx="{f(0.24 * W)}" cy="{f(gy + 30 * s)}" rx="{f(300 * s)}" ry="{f(40 * s)}" fill="#8a6446" opacity="0.1" filter="url(#blur14)"/>')
    for _ in range(int(40 * W / 1920)):
        px, py = rng.uniform(0, W), rng.uniform(gy + 10 * s, H)
        sc.add(f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="{f(rng.uniform(4, 14) * s)}" ry="{f(rng.uniform(2, 4) * s)}" fill="#0e0a07" opacity="0.35"/>')

    body = "".join(sc.parts)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs(sc)}{body}</svg>'


# ---------------------------------------------------------------- raster and post

def render(svg, w, h, work, name):
    html = work / f"{name}.html"
    png = work / f"{name}-raw.png"
    html.write_text("<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#000;overflow:hidden}"
                    "svg{display:block}</style></head><body>" + svg + "</body></html>")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={w},{h}", f"--screenshot={png}", "--virtual-time-budget=4000", html.as_uri()],
                   check=True, capture_output=True)
    return png


def box_mean(a, r):
    """Box filter via integral image, same size output (edges clamped)."""
    pad = np.pad(a, ((r + 1, r), (r + 1, r), (0, 0)), mode="edge")
    c = pad.cumsum(0).cumsum(1)
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def kuwahara(img, r):
    """Cheap Kuwahara filter: flattens texture into painterly strokes while keeping edges."""
    h, w, _ = img.shape
    lum = img.mean(axis=2, keepdims=True)
    m = box_mean(img, r)
    v = box_mean(lum * lum, r) - box_mean(lum, r) ** 2
    best = None
    bestv = None
    for dy in (-r, r):
        for dx in (-r, r):
            mm = np.roll(np.roll(m, dy, 0), dx, 1)
            vv = np.roll(np.roll(v, dy, 0), dx, 1)
            if best is None:
                best, bestv = mm.copy(), vv.copy()
            else:
                sel = vv < bestv
                best = np.where(sel, mm, best)
                bestv = np.where(sel, vv, bestv)
    return best


def smooth_noise(h, w, scale, rng):
    small = rng.random((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    im = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0


def stroke_noise(h, w, rng, length=7, angle=-0.35):
    """Directional streak noise that reads as brush strokes."""
    small = rng.random((h // 3 + 1, w // 3 + 1)).astype(np.float32)
    n = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), dtype=np.float32) / 255.0
    acc = np.zeros_like(n)
    for i in range(-length, length + 1):
        dy = int(round(i * 2 * math.sin(angle)))
        dx = int(round(i * 2 * math.cos(angle)))
        acc += np.roll(np.roll(n, dy, 0), dx, 1)
    acc /= (2 * length + 1)
    return (acc - acc.mean()) / (acc.std() + 1e-6)


def post(raw_png, w, h, light_xy, seed):
    rng = np.random.default_rng(seed)
    im = Image.open(raw_png).convert("RGB")
    big = np.asarray(im, dtype=np.float32) / 255.0
    # painterly flattening at 2x, then downsample
    big = 0.55 * kuwahara(big, 3) + 0.45 * big
    img = np.asarray(Image.fromarray((np.clip(big, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS),
                     dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ny, nx = yy / h, xx / w
    # brush strokes and low frequency paint variation
    st = stroke_noise(h, w, rng)
    lf = smooth_noise(h, w, 90, rng) - 0.5
    lf2 = smooth_noise(h, w, 24, rng) - 0.5
    img *= (1 + 0.012 * st[..., None] + 0.08 * lf[..., None] + 0.05 * lf2[..., None])
    # warm tint variation in the paint
    img[..., 0] *= 1 + 0.03 * lf
    img[..., 2] *= 1 - 0.03 * lf
    # bloom
    lum = img.mean(axis=2)
    bright = np.clip((img - 0.45) * 1.8, 0, 1)
    b8 = Image.fromarray((bright * 255).astype(np.uint8))
    bloom = (np.asarray(b8.filter(ImageFilter.GaussianBlur(18 * min(w, h) / 1080)), dtype=np.float32) / 255.0 * 0.6
             + np.asarray(b8.filter(ImageFilter.GaussianBlur(5 * min(w, h) / 1080)), dtype=np.float32) / 255.0 * 0.35)
    img = 1 - (1 - img) * (1 - bloom * 0.55)
    # split toning: cool violet shadows, warm highlights
    lum = img.mean(axis=2, keepdims=True)
    shadow = np.clip(1 - lum * 2.2, 0, 1)
    img = img + shadow * np.array([-0.004, -0.006, 0.012]) + (1 - shadow) * lum * np.array([0.02, 0.008, -0.02])
    lum = img.mean(axis=2, keepdims=True)
    img = lum + (img - lum) * 1.12
    # light wrap from the main source
    lx, ly = light_xy
    dist = np.sqrt(((nx - lx) * w / h) ** 2 + (ny - ly) ** 2)
    img += (np.exp(-(dist / 0.5) ** 2) * 0.05)[..., None] * np.array([1.0, 0.8, 0.55])
    # UI bands: calm top strip, darker floor band
    top = np.clip(1 - ny / 0.14, 0, 1) ** 1.5
    img *= (1 - 0.45 * top)[..., None]
    floor = np.clip((ny - 0.8) / 0.2, 0, 1)
    img *= (1 - 0.35 * floor)[..., None]
    # vignette
    vig = np.sqrt(((nx - 0.45) / 0.8) ** 2 + ((ny - 0.45) / 0.75) ** 2)
    img *= (1 - 0.45 * np.clip(vig - 0.45, 0, 1) ** 1.3)[..., None]
    # fine grain
    img += rng.normal(0, 0.012, (h, w, 1)).astype(np.float32)
    # contained contrast: no pure whites
    img = np.clip(img, 0, 1)
    img = 0.012 + img * 0.9
    return Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))


def save_webp(img, path, limit_kb):
    for q in (84, 82, 80, 78, 75, 72):
        img.save(path, "WEBP", quality=q, method=6)
        if path.stat().st_size <= limit_kb * 1024:
            break
    return q, path.stat().st_size // 1024


def review(img, path):
    """Mock-up with hero/enemy placeholder silhouettes and the dark top bar."""
    w, h = img.size
    im = img.copy().convert("RGB")
    dr = ImageDraw.Draw(im, "RGBA")
    dr.rectangle([0, 0, w, int(h * 0.075)], fill=(10, 8, 12, 215))
    s = min(w, h) / 1080
    floor = int(h * 0.9)

    def fighter(cx, height, col, rim=None):
        hw = height * 0.22
        if rim:
            dr.ellipse([cx - hw * 0.5 - 3, floor - height - 3, cx + hw * 0.5 - 3, floor - height + hw - 3], fill=rim)
            dr.rounded_rectangle([cx - hw - 3, floor - height + hw * 0.8 - 3, cx + hw - 3, floor - 3], radius=int(hw * 0.4), fill=rim)
        dr.ellipse([cx - hw * 0.5, floor - height, cx + hw * 0.5, floor - height + hw], fill=col)
        dr.rounded_rectangle([cx - hw, floor - height + hw * 0.8, cx + hw, floor], radius=int(hw * 0.4), fill=col)
        dr.ellipse([cx - hw * 1.3, floor - 8 * s, cx + hw * 1.3, floor + 8 * s], fill=(0, 0, 0, 90))

    fighter(w * 0.2, 380 * s, (8, 7, 10, 255), rim=(255, 214, 160, 255))
    for fx, fh in ((0.6, 300), (0.74, 360), (0.88, 280)):
        fighter(w * fx, fh * s, (70, 58, 50, 255))
    im.save(path)


def main():
    work = Path(sys.argv[1])
    out = Path(sys.argv[2])
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    for suffix, (w, h) in FORMATS.items():
        name = BG_ID + suffix
        svg = build_svg(w, h)
        (work / f"{name}.svg").write_text(svg)
        raw = render(svg, w, h, work, name)
        img = post(raw, w, h, (0.23, 0.26), seed=7)
        img.save(work / f"{name}-final.png")
        q, kb = save_webp(img, out / f"{name}.webp", 380 if not suffix else 300)
        review(img, work / f"{name}-review.png")
        print(f"{name}: {w}x{h} q={q} {kb} KB")


if __name__ == "__main__":
    main()
