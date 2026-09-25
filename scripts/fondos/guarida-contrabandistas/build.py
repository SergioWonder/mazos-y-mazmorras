#!/usr/bin/env python3
"""Combat background "guarida-contrabandistas" (Act I): the smugglers' vaulted cellar under the old inn.

Paints the scene as a procedural SVG, rasterises it with headless Chrome at 2x,
then post-processes it with numpy/PIL (painterly filter, bloom, grading, grain)
and exports the landscape and mobile WebP files.

Usage: python3 build.py <work_dir> <output_dir>
"""
import math
import random
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BG_ID = "guarida-contrabandistas"
FORMATS = {"": (1920, 1080), "-movil": (1080, 1440)}

# Main warm light colour (amber moonlight through the skylight), rgb(255,214,160).
LIGHT = "#ffd6a0"
LIGHT_XY = (0.23, 0.24)


def f(v):
    return f"{v:.1f}"


class Scene:
    """Holds the canvas size and helpers; every coordinate is derived from it."""

    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.s = min(w, h) / 1080.0
        self.rng = random.Random(seed)
        self.gy = 0.78 * h            # top of the combat floor band
        self.fb = self.gy - 78 * self.s  # where the back wall meets the floor
        self.parts = []

    def add(self, svg):
        self.parts.append(svg)


# ---------------------------------------------------------------- building blocks

def masonry(sc, x0, y0, x1, y1, tones, seed, row_h=(34, 46)):
    """Rows of irregular stone blocks with mortar gaps."""
    rng = random.Random(seed)
    s = sc.s
    out = [f'<rect x="{f(x0)}" y="{f(y0)}" width="{f(x1 - x0)}" height="{f(y1 - y0)}" fill="#161210"/>']
    y = y0
    while y < y1:
        rh = rng.uniform(*row_h) * s
        x = x0 - rng.uniform(0, 60) * s
        while x < x1:
            bw = rng.uniform(58, 118) * s
            g = 2.2 * s
            c = rng.choice(tones)
            # slightly bevelled block
            out.append(f'<rect x="{f(x + g)}" y="{f(y + g)}" width="{f(bw - 2 * g)}" height="{f(rh - 2 * g)}" rx="{f(5 * s)}" fill="{c}"/>')
            # top-left lit chamfer, bottom-right shadow chamfer
            out.append(f'<path d="M{f(x + g)} {f(y + rh - g)} L{f(x + g)} {f(y + g)} L{f(x + bw - g)} {f(y + g)}" stroke="#6a5a4a" '
                       f'stroke-width="{f(1.6 * s)}" fill="none" opacity="0.35"/>')
            out.append(f'<path d="M{f(x + g * 1.5)} {f(y + rh - g)} L{f(x + bw - g)} {f(y + rh - g)} L{f(x + bw - g)} {f(y + g * 1.5)}" stroke="#0a0807" '
                       f'stroke-width="{f(2 * s)}" fill="none" opacity="0.5"/>')
            if rng.random() < 0.18:
                cx_ = x + rng.uniform(0.2, 0.8) * bw
                out.append(f'<path d="M{f(cx_)} {f(y + g)} l{f(rng.uniform(-8, 8) * s)} {f(rh * 0.4)} l{f(rng.uniform(-6, 6) * s)} {f(rh * 0.3)}" '
                           f'stroke="#0e0b09" stroke-width="{f(1.2 * s)}" fill="none" opacity="0.7"/>')
            x += bw
        y += rh
    return "".join(out)


def arch_path(cx, spring, r):
    return f"M{f(cx - r)} {f(spring)} A{f(r)} {f(r)} 0 0 1 {f(cx + r)} {f(spring)}"


def voussoirs(sc, cx, spring, r, depth, n, tone="#453a33"):
    """Ring of wedge stones around a semicircular arch."""
    s = sc.s
    rng = sc.rng
    out = []
    for i in range(n):
        a0 = math.pi * (1 - i / n)
        a1 = math.pi * (1 - (i + 1) / n)
        pts = [(cx + math.cos(a0) * r, spring - math.sin(a0) * r), (cx + math.cos(a0) * (r + depth), spring - math.sin(a0) * (r + depth)),
               (cx + math.cos(a1) * (r + depth), spring - math.sin(a1) * (r + depth)), (cx + math.cos(a1) * r, spring - math.sin(a1) * r)]
        d = "M" + " L".join(f"{f(a)} {f(b)}" for a, b in pts) + " Z"
        col = tone if i % 2 else "#3d332d"
        if i == n // 2:
            col = "#4e4239"
        out.append(f'<path d="{d}" fill="{col}" stroke="#110d0b" stroke-width="{f(2.4 * s)}"/>')
        # lit inner edge from the upper left
        la = (a0 + a1) / 2
        op = max(0.0, math.cos(la - 2.3)) * 0.35
        out.append(f'<path d="M{f(pts[0][0])} {f(pts[0][1])} L{f(pts[3][0])} {f(pts[3][1])}" stroke="#8a7058" stroke-width="{f(2 * s)}" opacity="{f(op + rng.uniform(0, 0.05))}"/>')
    return "".join(out)


def barrel_end(sc, x, y, r):
    """Barrel lying on its side, seen end-on."""
    s = sc.s
    rng = sc.rng
    out = [f'<circle cx="{f(x - 2.5 * s)}" cy="{f(y - 2.5 * s)}" r="{f(r)}" fill="{LIGHT}" opacity="0.18"/>',
           f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="#2a2018" stroke="#0c0907" stroke-width="{f(2 * s)}"/>',
           f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r * 0.86)}" fill="url(#barrelEnd)" stroke="#120d0a" stroke-width="{f(1.5 * s)}"/>']
    # end planks
    for k in (-0.5, -0.17, 0.17, 0.5):
        hw = math.sqrt(max(0, 1 - k * k)) * r * 0.86
        out.append(f'<path d="M{f(x + k * r * 0.86)} {f(y - hw)} L{f(x + k * r * 0.86)} {f(y + hw)}" stroke="#140f0b" stroke-width="{f(1.4 * s)}"/>')
    # iron hoop and rivets
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r * 0.93)}" fill="none" stroke="#3a3632" stroke-width="{f(r * 0.1)}"/>')
    out.append(f'<path d="{arch_path(x, y, r * 0.93)}" fill="none" stroke="#6e645a" stroke-width="{f(1.4 * s)}" opacity="0.45" transform="rotate(-40 {f(x)} {f(y)})"/>')
    out.append(f'<circle cx="{f(x + r * 0.3)}" cy="{f(y + r * 0.35)}" r="{f(r * 0.08)}" fill="#0e0a08"/>')
    if rng.random() < 0.5:
        # branded smugglers' mark
        out.append(f'<path d="M{f(x - r * 0.25)} {f(y - r * 0.25)} L{f(x + r * 0.25)} {f(y + r * 0.1)} M{f(x + r * 0.25)} {f(y - r * 0.25)} L{f(x - r * 0.25)} {f(y + r * 0.1)}" '
                   f'stroke="#140c08" stroke-width="{f(2.4 * s)}" opacity="0.7"/>')
    return "".join(out)


def barrel_up(sc, x, base, r, hgt):
    """Upright barrel with hoops."""
    s = sc.s
    top = base - hgt
    ry = r * 0.28
    body = (f"M{f(x - r)} {f(top)} Q{f(x - r * 1.18)} {f(top + hgt / 2)} {f(x - r)} {f(base)} A{f(r)} {f(ry)} 0 0 0 {f(x + r)} {f(base)} "
            f"Q{f(x + r * 1.18)} {f(top + hgt / 2)} {f(x + r)} {f(top)} Z")
    out = [f'<path d="{body}" fill="{LIGHT}" opacity="0.16" transform="translate({f(-2.5 * s)} {f(-2 * s)})"/>',
           f'<path d="{body}" fill="url(#barrelSide)" stroke="#0c0907" stroke-width="{f(2 * s)}"/>']
    for k in (-0.6, -0.25, 0.1, 0.45, 0.78):
        out.append(f'<path d="M{f(x + k * r)} {f(top + ry * 0.8)} Q{f(x + k * r * 1.18)} {f(top + hgt / 2)} {f(x + k * r)} {f(base + ry * 0.7)}" stroke="#120d0a" '
                   f'stroke-width="{f(1.3 * s)}" fill="none" opacity="0.8"/>')
    for t in (0.14, 0.34, 0.66, 0.86):
        yy = top + hgt * t
        bulge = 1 + 0.18 * math.sin(math.pi * t)
        out.append(f'<path d="M{f(x - r * bulge)} {f(yy)} A{f(r * bulge)} {f(ry)} 0 0 0 {f(x + r * bulge)} {f(yy)}" fill="none" stroke="#2c2926" stroke-width="{f(5 * s)}"/>')
        out.append(f'<path d="M{f(x - r * bulge)} {f(yy)} A{f(r * bulge)} {f(ry)} 0 0 0 {f(x - r * 0.2)} {f(yy + ry * 0.95)}" fill="none" stroke="#6a6258" '
                   f'stroke-width="{f(1.3 * s)}" opacity="0.5"/>')
    out.append(f'<ellipse cx="{f(x)}" cy="{f(top)}" rx="{f(r)}" ry="{f(ry)}" fill="#3a2c20" stroke="#0c0907" stroke-width="{f(1.8 * s)}"/>')
    out.append(f'<ellipse cx="{f(x)}" cy="{f(top)}" rx="{f(r * 0.86)}" ry="{f(ry * 0.8)}" fill="#46362a"/>')
    return "".join(out)


def crate(sc, x, base, w, h, mark=True):
    """Plank crate with cross brace, stencilled mark and rope."""
    s = sc.s
    rng = sc.rng
    y0 = base - h
    out = [f'<rect x="{f(x - 2.5 * s)}" y="{f(y0 - 2.5 * s)}" width="{f(w)}" height="{f(h)}" fill="{LIGHT}" opacity="0.18"/>',
           f'<rect x="{f(x)}" y="{f(y0)}" width="{f(w)}" height="{f(h)}" fill="url(#crateWood)" stroke="#0c0907" stroke-width="{f(2 * s)}"/>']
    n = max(3, int(h / (22 * s)))
    for i in range(1, n):
        yy = y0 + h * i / n
        out.append(f'<path d="M{f(x)} {f(yy)} L{f(x + w)} {f(yy)}" stroke="#140f0b" stroke-width="{f(1.6 * s)}"/>')
    bw = 9 * s
    out.append(f'<rect x="{f(x)}" y="{f(y0)}" width="{f(bw)}" height="{f(h)}" fill="#3a2a1d" stroke="#0c0907" stroke-width="{f(1.2 * s)}"/>')
    out.append(f'<rect x="{f(x + w - bw)}" y="{f(y0)}" width="{f(bw)}" height="{f(h)}" fill="#2a1e15" stroke="#0c0907" stroke-width="{f(1.2 * s)}"/>')
    out.append(f'<path d="M{f(x + bw)} {f(base - bw * 0.5)} L{f(x + w - bw)} {f(y0 + bw * 0.5)}" stroke="#0c0907" stroke-width="{f(bw + 2.4 * s)}"/>')
    out.append(f'<path d="M{f(x + bw)} {f(base - bw * 0.5)} L{f(x + w - bw)} {f(y0 + bw * 0.5)}" stroke="#35271b" stroke-width="{f(bw)}"/>')
    for cx_, cy_ in ((x + bw / 2, y0 + bw / 2), (x + w - bw / 2, y0 + bw / 2), (x + bw / 2, base - bw / 2), (x + w - bw / 2, base - bw / 2)):
        out.append(f'<circle cx="{f(cx_)}" cy="{f(cy_)}" r="{f(1.8 * s)}" fill="#5a524a"/>')
    if mark:
        mx_, my_ = x + w * 0.62, y0 + h * 0.34
        kind = rng.randint(0, 2)
        if kind == 0:
            # crossed keys
            out.append(f'<g stroke="#8a6a42" stroke-width="{f(2.6 * s)}" opacity="0.55" fill="none">'
                       f'<path d="M{f(mx_ - 12 * s)} {f(my_ - 12 * s)} L{f(mx_ + 12 * s)} {f(my_ + 12 * s)} M{f(mx_ + 12 * s)} {f(my_ - 12 * s)} L{f(mx_ - 12 * s)} {f(my_ + 12 * s)}"/>'
                       f'<circle cx="{f(mx_ - 14 * s)}" cy="{f(my_ - 14 * s)}" r="{f(4 * s)}"/><circle cx="{f(mx_ + 14 * s)}" cy="{f(my_ - 14 * s)}" r="{f(4 * s)}"/></g>')
        elif kind == 1:
            # shuriken star, the brotherhood's mark
            pts = []
            for k in range(8):
                a = k * math.pi / 4
                rr = 13 * s if k % 2 == 0 else 4 * s
                pts.append((mx_ + math.cos(a) * rr, my_ + math.sin(a) * rr))
            out.append(f'<path d="M' + " L".join(f"{f(a)} {f(b)}" for a, b in pts) + f' Z" fill="#8a6a42" opacity="0.5"/>')
        else:
            out.append(f'<text x="{f(mx_)}" y="{f(my_ + 6 * s)}" font-family="Georgia, serif" font-size="{f(18 * s)}" fill="#8a6a42" opacity="0.5" text-anchor="middle">XXX</text>')
    return "".join(out)


def sack(sc, x, base, w, h, coins=False):
    """Bulging loot sack tied at the neck, optionally spilling coins."""
    s = sc.s
    rng = sc.rng
    d = (f"M{f(x - w * 0.45)} {f(base)} C{f(x - w * 0.62)} {f(base - h * 0.55)} {f(x - w * 0.25)} {f(base - h * 0.78)} {f(x - w * 0.1)} {f(base - h * 0.82)} "
         f"L{f(x - w * 0.18)} {f(base - h)} Q{f(x)} {f(base - h * 1.06)} {f(x + w * 0.2)} {f(base - h * 0.98)} L{f(x + w * 0.1)} {f(base - h * 0.82)} "
         f"C{f(x + w * 0.3)} {f(base - h * 0.76)} {f(x + w * 0.62)} {f(base - h * 0.5)} {f(x + w * 0.48)} {f(base)} Z")
    out = [f'<ellipse cx="{f(x)}" cy="{f(base)}" rx="{f(w * 0.6)}" ry="{f(h * 0.1)}" fill="#050403" opacity="0.5"/>',
           f'<path d="{d}" fill="{LIGHT}" opacity="0.18" transform="translate({f(-2.5 * s)} {f(-2 * s)})"/>',
           f'<path d="{d}" fill="url(#sackCloth)" stroke="#0e0a07" stroke-width="{f(1.8 * s)}"/>',
           f'<path d="M{f(x - w * 0.14)} {f(base - h * 0.83)} Q{f(x)} {f(base - h * 0.78)} {f(x + w * 0.14)} {f(base - h * 0.84)}" stroke="#2a1e12" stroke-width="{f(4 * s)}" fill="none"/>',
           f'<path d="M{f(x - w * 0.2)} {f(base - h * 0.5)} Q{f(x - w * 0.05)} {f(base - h * 0.3)} {f(x - w * 0.18)} {f(base - h * 0.1)}" stroke="#1a130c" stroke-width="{f(1.6 * s)}" fill="none" opacity="0.6"/>']
    if coins:
        for _ in range(int(14 * w / (60 * s))):
            cx_ = x + w * rng.uniform(0.3, 1.1)
            cy_ = base - rng.uniform(0, 5) * s
            out.append(f'<ellipse cx="{f(cx_)}" cy="{f(cy_)}" rx="{f(4 * s)}" ry="{f(1.8 * s)}" fill="#b08a3a" stroke="#3a2a10" stroke-width="{f(0.8 * s)}"/>')
        out.append(f'<ellipse cx="{f(x + w * 0.7)}" cy="{f(base - 2 * s)}" rx="{f(w * 0.4)}" ry="{f(6 * s)}" fill="#e0a850" opacity="0.18" filter="url(#blur6)"/>')
    return "".join(out)


def candle(sc, x, base, h, glow=0.6):
    s = sc.s
    w = 7 * s
    out = [f'<circle cx="{f(x)}" cy="{f(base - h - 8 * s)}" r="{f(46 * s)}" fill="url(#warmGlow)" opacity="{glow}"/>',
           f'<rect x="{f(x - w / 2)}" y="{f(base - h)}" width="{f(w)}" height="{f(h)}" fill="#a08a66" stroke="#2a2016" stroke-width="{f(s)}"/>',
           f'<path d="M{f(x - w / 2)} {f(base - h + 2 * s)} q{f(-1 * s)} {f(8 * s)} {f(1 * s)} {f(10 * s)} M{f(x + w / 2)} {f(base - h + 1 * s)} q{f(1.5 * s)} {f(5 * s)} 0 {f(14 * s)}" '
           f'stroke="#b8a07a" stroke-width="{f(2 * s)}" fill="none"/>',
           f'<rect x="{f(x - w / 2)}" y="{f(base - h)}" width="{f(w * 0.45)}" height="{f(h)}" fill="#fff" opacity="0.12"/>',
           f'<path d="M{f(x - 3 * s)} {f(base - h - 1 * s)} Q{f(x - 3 * s)} {f(base - h - 8 * s)} {f(x)} {f(base - h - 15 * s)} Q{f(x + 3 * s)} {f(base - h - 8 * s)} {f(x + 3 * s)} {f(base - h - 1 * s)} Z" '
           f'fill="#f4b860" filter="url(#glow2)"/>',
           f'<ellipse cx="{f(x)}" cy="{f(base - h - 5 * s)}" rx="{f(1.3 * s)}" ry="{f(3 * s)}" fill="#fbe2b0"/>']
    return "".join(out)


def lantern(sc, x, y, size, chain_top=None, glow=0.75):
    """Hanging iron lantern with warm glass panes."""
    s = sc.s
    out = []
    if chain_top is not None:
        out.append(f'<path d="M{f(x)} {f(chain_top)} L{f(x)} {f(y - size * 1.1)}" stroke="#16120f" stroke-width="{f(2.4 * s)}" stroke-dasharray="{f(4 * s)} {f(2 * s)}"/>')
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(size * 6)}" fill="url(#warmGlow)" opacity="{glow}"/>')
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(size * 2.2)}" fill="#ffb060" opacity="0.35" filter="url(#blur6)"/>')
    out.append(f'<path d="M{f(x - size * 0.5)} {f(y - size * 0.8)} L{f(x)} {f(y - size * 1.25)} L{f(x + size * 0.5)} {f(y - size * 0.8)} Z" fill="#1c1814" stroke="#0a0807" stroke-width="{f(1.2 * s)}"/>')
    out.append(f'<circle cx="{f(x)}" cy="{f(y - size * 1.3)}" r="{f(size * 0.14)}" fill="none" stroke="#1c1814" stroke-width="{f(2 * s)}"/>')
    out.append(f'<rect x="{f(x - size * 0.42)}" y="{f(y - size * 0.8)}" width="{f(size * 0.84)}" height="{f(size * 1.25)}" fill="#e89a48" stroke="#16120f" stroke-width="{f(2.4 * s)}"/>')
    out.append(f'<rect x="{f(x - size * 0.22)}" y="{f(y - size * 0.55)}" width="{f(size * 0.44)}" height="{f(size * 0.8)}" fill="#f6cc86"/>')
    out.append(f'<path d="M{f(x)} {f(y - size * 0.8)} L{f(x)} {f(y + size * 0.45)}" stroke="#16120f" stroke-width="{f(2 * s)}"/>')
    out.append(f'<rect x="{f(x - size * 0.52)}" y="{f(y + size * 0.42)}" width="{f(size * 1.04)}" height="{f(size * 0.18)}" fill="#1c1814"/>')
    return "".join(out)


def map_board(sc, x, y, w, h):
    """Wooden board with maps of the valley pinned by knives and kunai."""
    s = sc.s
    rng = sc.rng
    out = [f'<rect x="{f(x - 3 * s)}" y="{f(y - 3 * s)}" width="{f(w)}" height="{f(h)}" fill="{LIGHT}" opacity="0.15"/>',
           f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" fill="url(#crateWood)" stroke="#0c0907" stroke-width="{f(2.4 * s)}"/>']
    for i in range(1, 4):
        out.append(f'<path d="M{f(x + w * i / 4)} {f(y)} L{f(x + w * i / 4)} {f(y + h)}" stroke="#140f0b" stroke-width="{f(1.4 * s)}"/>')
    sheets = [(0.08, 0.08, 0.55, 0.5, -4), (0.5, 0.14, 0.44, 0.42, 5), (0.18, 0.54, 0.4, 0.38, 3), (0.6, 0.58, 0.32, 0.34, -6)]
    for i, (sx, sy, sw, sh, rot) in enumerate(sheets):
        px, py, pw, ph = x + w * sx, y + h * sy, w * sw, h * sh
        cx_, cy_ = px + pw / 2, py + ph / 2
        g = f'<g transform="rotate({rot} {f(cx_)} {f(cy_)})">'
        g += (f'<path d="M{f(px)} {f(py)} L{f(px + pw)} {f(py + 2 * s)} L{f(px + pw - 2 * s)} {f(py + ph)} L{f(px + pw * 0.6)} {f(py + ph - 4 * s)} '
              f'L{f(px + 3 * s)} {f(py + ph + 2 * s)} Z" fill="#8c7a58" stroke="#3a2e1e" stroke-width="{f(1.2 * s)}"/>')
        g += f'<rect x="{f(px)}" y="{f(py)}" width="{f(pw)}" height="{f(ph)}" fill="url(#parchShade)"/>'
        if i == 0:
            # the valley: river, roads, the inn and a red X
            g += (f'<path d="M{f(px + pw * 0.05)} {f(py + ph * 0.3)} C{f(px + pw * 0.3)} {f(py + ph * 0.5)} {f(px + pw * 0.5)} {f(py + ph * 0.1)} {f(px + pw * 0.95)} {f(py + ph * 0.6)}" '
                  f'stroke="#3a4a52" stroke-width="{f(2.4 * s)}" fill="none" opacity="0.7"/>')
            g += (f'<path d="M{f(px + pw * 0.1)} {f(py + ph * 0.85)} L{f(px + pw * 0.4)} {f(py + ph * 0.6)} L{f(px + pw * 0.7)} {f(py + ph * 0.75)} L{f(px + pw * 0.9)} {f(py + ph * 0.2)}" '
                  f'stroke="#4a3620" stroke-width="{f(1.4 * s)}" stroke-dasharray="{f(4 * s)} {f(3 * s)}" fill="none"/>')
            for k in range(6):
                tx = px + pw * rng.uniform(0.1, 0.9)
                ty = py + ph * rng.uniform(0.1, 0.9)
                g += f'<path d="M{f(tx - 3 * s)} {f(ty)} L{f(tx)} {f(ty - 6 * s)} L{f(tx + 3 * s)} {f(ty)} Z" fill="#4a3a24" opacity="0.7"/>'
            g += (f'<path d="M{f(px + pw * 0.66)} {f(py + ph * 0.66)} l{f(10 * s)} {f(10 * s)} M{f(px + pw * 0.66 + 10 * s)} {f(py + ph * 0.66)} l{f(-10 * s)} {f(10 * s)}" '
                  f'stroke="#8a2a1a" stroke-width="{f(3 * s)}"/>')
        else:
            for k in range(5):
                ly = py + ph * (0.2 + k * 0.15)
                g += f'<path d="M{f(px + pw * 0.12)} {f(ly)} L{f(px + pw * rng.uniform(0.5, 0.88))} {f(ly)}" stroke="#3a2e1e" stroke-width="{f(1.3 * s)}" opacity="0.6"/>'
            if i == 2:
                g += f'<circle cx="{f(px + pw * 0.7)}" cy="{f(py + ph * 0.3)}" r="{f(6 * s)}" fill="none" stroke="#8a2a1a" stroke-width="{f(2 * s)}"/>'
        g += '</g>'
        out.append(g)
    # knives and kunai pinning the sheets
    for kx, ky, kr in ((0.1, 0.1, 35), (0.9, 0.18, -30), (0.36, 0.58, 20), (0.82, 0.62, -40)):
        px, py = x + w * kx, y + h * ky
        out.append(f'<g transform="rotate({kr} {f(px)} {f(py)})">'
                   f'<path d="M{f(px)} {f(py)} L{f(px - 2.5 * s)} {f(py - 16 * s)} L{f(px + 2.5 * s)} {f(py - 16 * s)} Z" fill="#6a6660"/>'
                   f'<rect x="{f(px - 2 * s)}" y="{f(py - 30 * s)}" width="{f(4 * s)}" height="{f(14 * s)}" fill="#1e1712"/>'
                   f'<circle cx="{f(px)}" cy="{f(py - 33 * s)}" r="{f(3.2 * s)}" fill="none" stroke="#6a6660" stroke-width="{f(1.4 * s)}"/></g>')
    return "".join(out)


def net(sc, x0, x1, top, sag, drop):
    """A fishing net draped from the beam, with cork floats."""
    s = sc.s
    rng = sc.rng
    cid = f"net{int(x0)}"
    outline = (f"M{f(x0)} {f(top)} Q{f((x0 + x1) / 2)} {f(top + sag * 0.3)} {f(x1)} {f(top)} "
               f"L{f(x1 - 10 * s)} {f(top + drop * 0.8)} Q{f((x0 + x1) / 2 + 20 * s)} {f(top + drop + sag)} {f(x0 + 16 * s)} {f(top + drop * 0.7)} Z")
    out = [f'<clipPath id="{cid}"><path d="{outline}"/></clipPath>', f'<g clip-path="url(#{cid})" opacity="0.8">']
    step = 16 * s
    lines = ""
    x = x0 - drop
    while x < x1 + drop:
        lines += f"M{f(x)} {f(top)} Q{f(x + drop * 0.4)} {f(top + drop * 0.6)} {f(x + drop * 0.7)} {f(top + drop + sag)} "
        lines += f"M{f(x)} {f(top)} Q{f(x - drop * 0.3)} {f(top + drop * 0.6)} {f(x - drop * 0.7)} {f(top + drop + sag)} "
        x += step
    out.append(f'<path d="{lines}" stroke="#0e0b09" stroke-width="{f(3 * s)}" fill="none"/>')
    out.append(f'<path d="{lines}" stroke="#6a5a44" stroke-width="{f(1.3 * s)}" fill="none"/>')
    out.append('</g>')
    out.append(f'<path d="M{f(x1 - 10 * s)} {f(top + drop * 0.8)} Q{f((x0 + x1) / 2 + 20 * s)} {f(top + drop + sag)} {f(x0 + 16 * s)} {f(top + drop * 0.7)}" '
               f'stroke="#4a3e30" stroke-width="{f(3 * s)}" fill="none"/>')
    for i in range(6):
        t = (i + 0.5) / 6
        # point on the quadratic bottom edge
        ax, ay = x1 - 10 * s, top + drop * 0.8
        bx, by = (x0 + x1) / 2 + 20 * s, top + drop + sag
        cx_, cy_ = x0 + 16 * s, top + drop * 0.7
        px = (1 - t) ** 2 * ax + 2 * (1 - t) * t * bx + t * t * cx_
        py = (1 - t) ** 2 * ay + 2 * (1 - t) * t * by + t * t * cy_
        out.append(f'<ellipse cx="{f(px)}" cy="{f(py + 4 * s)}" rx="{f(7 * s)}" ry="{f(5 * s)}" fill="#6e4a2a" stroke="#120c08" stroke-width="{f(1.2 * s)}"/>')
    return "".join(out)


def rope_coil(sc, x, y, r):
    s = sc.s
    out = [f'<path d="M{f(x)} {f(y - r * 1.2)} l0 {f(r * 0.3)}" stroke="#3a3430" stroke-width="{f(4 * s)}"/>']
    for k in range(5):
        rr = r * (1 - k * 0.08)
        out.append(f'<ellipse cx="{f(x + k * 1.2 * s)}" cy="{f(y + k * 2 * s)}" rx="{f(rr * 0.55)}" ry="{f(rr)}" fill="none" stroke="#0e0b09" stroke-width="{f(6 * s)}"/>')
        out.append(f'<ellipse cx="{f(x + k * 1.2 * s)}" cy="{f(y + k * 2 * s)}" rx="{f(rr * 0.55)}" ry="{f(rr)}" fill="none" stroke="#6a5438" stroke-width="{f(3.4 * s)}" '
                   f'stroke-dasharray="{f(3 * s)} {f(2 * s)}"/>')
    out.append(f'<path d="M{f(x + 6 * s)} {f(y + r)} q{f(10 * s)} {f(r * 0.6)} {f(2 * s)} {f(r * 1.4)}" stroke="#6a5438" stroke-width="{f(3.4 * s)}" fill="none"/>')
    return "".join(out)


def bottle_shelf(sc, x, y, w):
    """Plank shelf on iron brackets with dusty bottles and a stolen goblet."""
    s = sc.s
    rng = sc.rng
    out = []
    bx = x + 8 * s
    while bx < x + w - 14 * s:
        bw = rng.uniform(10, 16) * s
        bh = rng.uniform(28, 44) * s
        col = rng.choice(["#2a3a2a", "#3a2a1e", "#2a2a3a", "#4a3a22"])
        out.append(f'<path d="M{f(bx)} {f(y)} L{f(bx)} {f(y - bh * 0.6)} Q{f(bx)} {f(y - bh * 0.72)} {f(bx + bw * 0.3)} {f(y - bh * 0.78)} '
                   f'L{f(bx + bw * 0.3)} {f(y - bh)} L{f(bx + bw * 0.7)} {f(y - bh)} L{f(bx + bw * 0.7)} {f(y - bh * 0.78)} '
                   f'Q{f(bx + bw)} {f(y - bh * 0.72)} {f(bx + bw)} {f(y - bh * 0.6)} L{f(bx + bw)} {f(y)} Z" fill="{col}" stroke="#0a0807" stroke-width="{f(1.2 * s)}"/>')
        out.append(f'<path d="M{f(bx + bw * 0.25)} {f(y - bh * 0.1)} L{f(bx + bw * 0.25)} {f(y - bh * 0.55)}" stroke="#e8b070" stroke-width="{f(1.6 * s)}" opacity="0.45"/>')
        bx += bw + rng.uniform(3, 9) * s
    out.append(f'<path d="M{f(x + w * 0.72)} {f(y)} l{f(4 * s)} {f(-8 * s)} l{f(-6 * s)} {f(-4 * s)} q{f(10 * s)} {f(-18 * s)} {f(20 * s)} 0 l{f(-6 * s)} {f(4 * s)} l{f(4 * s)} {f(8 * s)} Z" fill="#a07c34" stroke="#2a1e0a" stroke-width="{f(s)}"/>')
    out.append(f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(9 * s)}" fill="#3a2a1d" stroke="#0a0706" stroke-width="{f(1.4 * s)}"/>')
    for k in (0.12, 0.88):
        out.append(f'<path d="M{f(x + w * k)} {f(y + 9 * s)} l0 {f(22 * s)} l{f(18 * s * (1 if k < 0.5 else -1))} {f(-22 * s)}" stroke="#2a2622" stroke-width="{f(3 * s)}" fill="none"/>')
    return "".join(out)


def pulley_rope(sc, x, top, bottom):
    """Pulley on the beam with a rope running down and a hanging hook."""
    s = sc.s
    return (f'<path d="M{f(x)} {f(top)} l0 {f(18 * s)}" stroke="#2a2622" stroke-width="{f(4 * s)}"/>'
            f'<circle cx="{f(x)}" cy="{f(top + 30 * s)}" r="{f(13 * s)}" fill="#2e2217" stroke="#0a0706" stroke-width="{f(2 * s)}"/>'
            f'<circle cx="{f(x)}" cy="{f(top + 30 * s)}" r="{f(3 * s)}" fill="#5a524a"/>'
            f'<path d="M{f(x - 13 * s)} {f(top + 30 * s)} L{f(x - 13 * s)} {f(bottom)} M{f(x + 13 * s)} {f(top + 30 * s)} L{f(x + 13 * s)} {f(bottom - 120 * s)}" '
            f'stroke="#0e0b09" stroke-width="{f(5 * s)}"/>'
            f'<path d="M{f(x - 13 * s)} {f(top + 30 * s)} L{f(x - 13 * s)} {f(bottom)} M{f(x + 13 * s)} {f(top + 30 * s)} L{f(x + 13 * s)} {f(bottom - 120 * s)}" '
            f'stroke="#7a6444" stroke-width="{f(2.6 * s)}" stroke-dasharray="{f(3 * s)} {f(2 * s)}"/>'
            f'<path d="M{f(x + 13 * s)} {f(bottom - 120 * s)} q0 {f(16 * s)} {f(-10 * s)} {f(16 * s)} q{f(-8 * s)} 0 {f(-8 * s)} {f(-8 * s)}" stroke="#3a3632" stroke-width="{f(4 * s)}" fill="none"/>')


def post_beam(sc, x, y0, y1, w):
    """Vertical oak post with texture and a rim from the skylight."""
    s = sc.s
    return (f'<rect x="{f(x - w / 2 - 3 * s)}" y="{f(y0)}" width="{f(w)}" height="{f(y1 - y0)}" fill="{LIGHT}" opacity="0.12"/>'
            f'<rect x="{f(x - w / 2)}" y="{f(y0)}" width="{f(w)}" height="{f(y1 - y0)}" fill="url(#postWood)" stroke="#0a0706" stroke-width="{f(2 * s)}"/>'
            f'<path d="M{f(x - w * 0.2)} {f(y0)} L{f(x - w * 0.15)} {f(y1)} M{f(x + w * 0.15)} {f(y0)} L{f(x + w * 0.2)} {f(y1)}" stroke="#0e0a08" stroke-width="{f(1.4 * s)}" opacity="0.7"/>')


# ---------------------------------------------------------------- defs

def defs(sc):
    s = sc.s
    return f"""
<defs>
<radialGradient id="warmGlow" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="#ffb466" stop-opacity="0.55"/><stop offset="0.35" stop-color="#d4782e" stop-opacity="0.2"/><stop offset="1" stop-color="#6a3414" stop-opacity="0"/>
</radialGradient>
<radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="{LIGHT}" stop-opacity="0.5"/><stop offset="0.3" stop-color="#e0a468" stop-opacity="0.2"/><stop offset="1" stop-color="#7a4a2a" stop-opacity="0"/>
</radialGradient>
<linearGradient id="skyWin" x1="0" y1="0" x2="0.4" y2="1">
 <stop offset="0" stop-color="#f7dcae"/><stop offset="0.6" stop-color="#eab678"/><stop offset="1" stop-color="#b87a48"/>
</linearGradient>
<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="{LIGHT}" stop-opacity="0.34"/><stop offset="0.7" stop-color="#e8a86a" stop-opacity="0.12"/><stop offset="1" stop-color="#c88850" stop-opacity="0.04"/>
</linearGradient>
<radialGradient id="tunnel" cx="0.55" cy="0.62" r="0.62">
 <stop offset="0" stop-color="#020202"/><stop offset="0.55" stop-color="#0a0807"/><stop offset="1" stop-color="#1e1814"/>
</radialGradient>
<linearGradient id="barrelEnd" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#5a4028"/><stop offset="1" stop-color="#2a1d12"/>
</linearGradient>
<linearGradient id="barrelSide" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#553b26"/><stop offset="0.35" stop-color="#46301e"/><stop offset="1" stop-color="#1c130c"/>
</linearGradient>
<linearGradient id="crateWood" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#57422c"/><stop offset="1" stop-color="#2c2016"/>
</linearGradient>
<linearGradient id="postWood" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#3e2c1e"/><stop offset="0.4" stop-color="#2e2117"/><stop offset="1" stop-color="#140e0a"/>
</linearGradient>
<linearGradient id="beamWood" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#1a130e"/><stop offset="0.5" stop-color="#2e2117"/><stop offset="1" stop-color="#150f0b"/>
</linearGradient>
<linearGradient id="sackCloth" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#6a5638"/><stop offset="1" stop-color="#2e2416"/>
</linearGradient>
<linearGradient id="parchShade" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0a" stop-opacity="0.45"/>
</linearGradient>
<linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
</linearGradient>
<linearGradient id="recessShade" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>
</linearGradient>
<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(2 * s)}"/></filter>
<filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(6 * s)}"/></filter>
<filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(14 * s)}"/></filter>
<filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{f(30 * s)}"/></filter>
<filter id="glow2" x="-100%" y="-100%" width="300%" height="300%">
 <feGaussianBlur stdDeviation="{f(2.5 * s)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="stoneTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.05 / s:.4f}" numOctaves="4" seed="3" result="n"/>
 <feDiffuseLighting in="n" surfaceScale="{f(3 * s)}" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
 <feColorMatrix in="l" type="matrix" values="0.6 0 0 0 0.45  0.6 0 0 0 0.45  0.6 0 0 0 0.45  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="woodTex" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.4 / s:.3f} {0.02 / s:.4f}" numOctaves="3" seed="5" result="n"/>
 <feColorMatrix in="n" type="matrix" values="1.2 0 0 0 0.3  1.2 0 0 0 0.3  1.2 0 0 0 0.3  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="woodTexH" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.02 / s:.4f} {0.4 / s:.3f}" numOctaves="3" seed="6" result="n"/>
 <feColorMatrix in="n" type="matrix" values="1.2 0 0 0 0.3  1.2 0 0 0 0.3  1.2 0 0 0 0.3  0 0 0 0 1" result="g"/>
 <feBlend in="SourceGraphic" in2="g" mode="multiply" result="m"/>
 <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>
<filter id="dust" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="{0.006 / s:.5f} {0.012 / s:.5f}" numOctaves="3" seed="12" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.84  0 0 0 0 0.63  1.6 0 0 0 -0.55"/>
</filter>
</defs>"""


# ---------------------------------------------------------------- composition

def build_svg(w, h):
    sc = Scene(w, h, seed=2024)
    s, W, H, gy, fb = sc.s, w, h, sc.gy, sc.fb
    rng = sc.rng
    tall = H > W
    ceil = (0.11 if not tall else 0.1) * H   # underside of the main beam
    lx, ly = LIGHT_XY[0] * W, LIGHT_XY[1] * H

    # back wall masonry
    tones = ["#3d3029", "#372a23", "#31261f", "#43352b", "#3a2d25", "#2e231d"]
    sc.add('<g filter="url(#stoneTex)">' + masonry(sc, 0, ceil - 10 * s, W, fb + 4 * s, tones, 5) + '</g>')

    # left vault recess holding the skylight
    ra = 0.165 * W if not tall else 0.2 * W
    acx = 0.235 * W
    aspring = ly + 150 * s
    rec = f"{arch_path(acx, aspring, ra)} L{f(acx + ra)} {f(fb)} L{f(acx - ra)} {f(fb)} Z"
    sc.add(f'<clipPath id="recA"><path d="{rec}"/></clipPath>')
    sc.add('<g clip-path="url(#recA)"><g filter="url(#stoneTex)">' +
           masonry(sc, acx - ra, aspring - ra, acx + ra, fb, ["#2c2521", "#29221e", "#2f2723", "#26201c"], 9, (28, 36)) + '</g>'
           f'<rect x="{f(acx - ra)}" y="{f(aspring - ra)}" width="{f(2 * ra)}" height="{f(fb - aspring + ra)}" fill="url(#recessShade)"/></g>')

    # skylight: barred window with amber moonlight
    ww_, wh_ = 150 * s, 104 * s
    wx0, wy0 = lx - ww_ / 2, ly - wh_ / 2
    win = (f"M{f(wx0)} {f(wy0 + wh_)} L{f(wx0)} {f(wy0 + wh_ * 0.3)} Q{f(lx)} {f(wy0 - wh_ * 0.25)} {f(wx0 + ww_)} {f(wy0 + wh_ * 0.3)} "
           f"L{f(wx0 + ww_)} {f(wy0 + wh_)} Z")
    sc.add(f'<circle cx="{f(lx)}" cy="{f(ly)}" r="{f(420 * s)}" fill="url(#moonGlow)"/>')
    sc.add(f'<path d="{win}" fill="#120e0c" transform="translate(0 {f(10 * s)}) scale(1)" stroke="#120e0c" stroke-width="{f(22 * s)}"/>')
    sc.add(f'<path d="{win}" fill="url(#skyWin)"/>')
    # a hint of the moon and the street outside: cobbles and a passing boot-shadow
    sc.add(f'<clipPath id="winC"><path d="{win}"/></clipPath>')
    sc.add(f'<g clip-path="url(#winC)"><circle cx="{f(lx - ww_ * 0.18)}" cy="{f(wy0 + wh_ * 0.25)}" r="{f(34 * s)}" fill="#fbe6c2" opacity="0.9"/>'
           f'<path d="M{f(wx0)} {f(wy0 + wh_ * 0.82)} L{f(wx0 + ww_)} {f(wy0 + wh_ * 0.76)} L{f(wx0 + ww_)} {f(wy0 + wh_)} L{f(wx0)} {f(wy0 + wh_)} Z" fill="#6a4a30" opacity="0.8"/>'
           f'<path d="M{f(wx0 + ww_ * 0.55)} {f(wy0 + wh_ * 0.8)} q{f(8 * s)} {f(-26 * s)} {f(26 * s)} {f(-28 * s)} l{f(4 * s)} {f(30 * s)} Z" fill="#4a3222" opacity="0.8"/>'
           f'<path d="M{f(wx0)} {f(wy0 + wh_ * 0.62)} q{f(ww_ * 0.3)} {f(-14 * s)} {f(ww_ * 0.6)} {f(-4 * s)}" stroke="#c89a6a" stroke-width="{f(6 * s)}" fill="none" opacity="0.5" filter="url(#blur6)"/></g>')
    bars = ""
    for i in range(1, 5):
        bx = wx0 + ww_ * i / 5
        bars += f"M{f(bx)} {f(wy0 - wh_ * 0.1)} L{f(bx)} {f(wy0 + wh_)} "
    bars += f"M{f(wx0)} {f(wy0 + wh_ * 0.55)} L{f(wx0 + ww_)} {f(wy0 + wh_ * 0.55)}"
    sc.add(f'<g clip-path="url(#winC)"><path d="{bars}" stroke="#16110e" stroke-width="{f(8 * s)}"/><path d="{bars}" stroke="#6a5a48" stroke-width="{f(2 * s)}" opacity="0.5" transform="translate({f(-2 * s)} 0)"/></g>')
    sc.add(f'<path d="{win}" fill="none" stroke="#4a3e34" stroke-width="{f(10 * s)}"/>')
    # stone sill
    sc.add(f'<rect x="{f(wx0 - 16 * s)}" y="{f(wy0 + wh_ - 2 * s)}" width="{f(ww_ + 32 * s)}" height="{f(16 * s)}" fill="#4a3e35" stroke="#110d0b" stroke-width="{f(2 * s)}"/>')
    sc.add(f'<rect x="{f(wx0 - 16 * s)}" y="{f(wy0 + wh_ - 2 * s)}" width="{f(ww_ + 32 * s)}" height="{f(4 * s)}" fill="#c89a6a" opacity="0.5"/>')
    sc.add(voussoirs(sc, acx, aspring, ra, 38 * s, 15))

    # tunnel arch into darkness
    rb = 0.13 * W if not tall else 0.17 * W
    bcx = 0.655 * W
    bspring = fb - 190 * s
    tun = f"{arch_path(bcx, bspring, rb)} L{f(bcx + rb)} {f(fb)} L{f(bcx - rb)} {f(fb)} Z"
    sc.add(f'<clipPath id="tunC"><path d="{tun}"/></clipPath>')
    inner = [f'<rect x="{f(bcx - rb)}" y="{f(bspring - rb)}" width="{f(2 * rb)}" height="{f(fb - bspring + rb)}" fill="url(#tunnel)"/>']
    vpx, vpy = bcx + rb * 0.12, bspring + 40 * s
    for k in range(1, 5):
        t = 1 - k * 0.2
        r_ = rb * t
        cxk = vpx + (bcx - vpx) * t
        sp = vpy + (bspring - vpy) * t
        fl = vpy + (fb - vpy) * t
        inner.append(f'<path d="{arch_path(cxk, sp, r_)} L{f(cxk + r_)} {f(fl)} M{f(cxk - r_)} {f(sp)} L{f(cxk - r_)} {f(fl)}" '
                     f'stroke="#3a302a" stroke-width="{f(9 * s * t)}" fill="none" opacity="{f(0.55 * t)}"/>')
    for k in range(-3, 4):
        inner.append(f'<path d="M{f(bcx + k * rb * 0.33)} {f(fb)} L{f(vpx + k * rb * 0.06)} {f(vpy + (fb - vpy) * 0.2)}" stroke="#2a221d" stroke-width="{f(1.6 * s)}" opacity="0.5"/>')
    # a distant lantern deep inside the tunnel
    inner.append(f'<circle cx="{f(vpx + 14 * s)}" cy="{f(vpy + (fb - vpy) * 0.2 - 16 * s)}" r="{f(30 * s)}" fill="url(#warmGlow)" opacity="0.6"/>')
    inner.append(f'<rect x="{f(vpx + 12 * s)}" y="{f(vpy + (fb - vpy) * 0.2 - 20 * s)}" width="{f(4 * s)}" height="{f(6 * s)}" fill="#e89a48" opacity="0.8"/>')
    sc.add('<g clip-path="url(#tunC)">' + "".join(inner) + '</g>')
    sc.add(voussoirs(sc, bcx, bspring, rb, 34 * s, 13))
    # map board on the pier between the arches
    mbw = 150 * s
    mbx = (acx + ra + bcx - rb) / 2 - mbw / 2
    mby = fb - 330 * s
    if tall:
        mbx, mby = 0.47 * W, fb - 600 * s
    sc.add(map_board(sc, mbx, mby, mbw, 118 * s))

    # ceiling: planks of the inn floor above, with light leaking through the gaps
    sc.add(f'<rect x="0" y="0" width="{W}" height="{f(ceil)}" fill="#120d0a"/>')
    pl = ""
    y = 0
    while y < ceil:
        ph = rng.uniform(26, 34) * s
        pl += f'<rect x="0" y="{f(y)}" width="{W}" height="{f(ph - 2 * s)}" fill="#1e1610"/>'
        if rng.random() < 0.6:
            gx = rng.uniform(0, W * 0.8)
            pl += f'<rect x="{f(gx)}" y="{f(y + ph - 2.5 * s)}" width="{f(rng.uniform(80, 300) * s)}" height="{f(1.6 * s)}" fill="#c88a4a" opacity="0.35"/>'
        y += ph
    sc.add(f'<g filter="url(#woodTexH)">{pl}</g>')
    # joists receding and the great beam
    for i in range(9):
        jx = W * (i + 0.5) / 9
        sc.add(f'<path d="M{f(jx - 14 * s)} 0 L{f(jx + 14 * s)} 0 L{f(jx + 12 * s)} {f(ceil)} L{f(jx - 12 * s)} {f(ceil)} Z" fill="#0e0a08" opacity="0.8"/>')
    sc.add(f'<g filter="url(#woodTexH)"><rect x="0" y="{f(ceil - 8 * s)}" width="{W}" height="{f(42 * s)}" fill="url(#beamWood)" stroke="#070504" stroke-width="{f(2 * s)}"/></g>')
    sc.add(f'<rect x="0" y="{f(ceil + 30 * s)}" width="{W}" height="{f(14 * s)}" fill="#000" opacity="0.35" filter="url(#blur6)"/>')
    # iron hooks along the beam
    for hx in (0.33, 0.47, 0.86):
        sc.add(f'<path d="M{f(hx * W)} {f(ceil + 34 * s)} l0 {f(10 * s)} q0 {f(8 * s)} {f(8 * s)} {f(6 * s)}" stroke="#2a2622" stroke-width="{f(3 * s)}" fill="none"/>')

    # the net and ropes hanging from the beam, over the tunnel
    sc.add(net(sc, bcx - rb * 0.9, bcx + rb * 1.5, ceil + 34 * s, 50 * s, 120 * s))
    sc.add(rope_coil(sc, 0.945 * W, ceil + 110 * s, 34 * s))

    # light shafts from the skylight, split by the bars
    fx_off = 0.2 * W if not tall else 0.26 * W
    fy = gy + 40 * s
    shafts = []
    for i in range(5):
        a0 = wx0 + ww_ * i / 5 + 4 * s
        a1 = wx0 + ww_ * (i + 1) / 5 - 4 * s
        b0 = a0 + fx_off - 30 * s + i * 10 * s
        b1 = a1 + fx_off + 10 * s + i * 22 * s
        shafts.append(f'<path d="M{f(a0)} {f(wy0 + wh_ * 0.2)} L{f(a1)} {f(wy0 + wh_ * 0.2)} L{f(b1)} {f(fy)} L{f(b0)} {f(fy)} Z"/>')
    sc.add(f'<g fill="url(#shaft)" filter="url(#blur6)" opacity="0.9">' + "".join(shafts) + '</g>')
    sc.add(f'<path d="M{f(wx0)} {f(wy0)} L{f(wx0 + ww_)} {f(wy0)} L{f(wx0 + ww_ + fx_off + 120 * s)} {f(fy)} L{f(wx0 + fx_off - 40 * s)} {f(fy)} Z" '
           f'fill="url(#shaft)" opacity="0.35" filter="url(#blur30)"/>')

    # floor: flagstones in perspective
    vpx0 = 0.6 * W
    vpy0 = 0.42 * H
    flo = [f'<rect x="0" y="{f(fb)}" width="{W}" height="{f(H - fb)}" fill="#141010"/>']
    y = fb
    rh = 12 * s
    row = 0
    while y < H:
        yb = y + rh
        k = (y - vpy0) / (fb - vpy0)
        sw = 70 * s * k
        x = -rng.uniform(0, sw)
        while x < W + sw:
            wdt = sw * rng.uniform(0.7, 1.3)
            c = rng.choice(["#2a2320", "#262020", "#2e2622", "#231d1b", "#29221e"])
            # joints converge towards the vanishing point
            xt0 = vpx0 + (x - vpx0) * (y - vpy0) / (yb - vpy0) if yb != vpy0 else x
            xt1 = vpx0 + (x + wdt - vpx0) * (y - vpy0) / (yb - vpy0) if yb != vpy0 else x + wdt
            g = 1.6 * s * k
            flo.append(f'<path d="M{f(xt0 + g)} {f(y + g)} L{f(xt1 - g)} {f(y + g)} L{f(x + wdt - g)} {f(yb - g)} L{f(x + g)} {f(yb - g)} Z" fill="{c}"/>')
            x += wdt
        y = yb
        rh *= 1.22
        row += 1
    sc.add('<g filter="url(#stoneTex)">' + "".join(flo) + '</g>')
    sc.add(f'<rect x="0" y="{f(fb)}" width="{W}" height="{f(H - fb)}" fill="url(#floorShade)"/>')
    # pool of moonlight on the floor behind the hero
    sc.add(f'<ellipse cx="{f(lx + fx_off + 60 * s)}" cy="{f(fy - 10 * s)}" rx="{f(260 * s)}" ry="{f(50 * s)}" fill="#e8b27a" opacity="0.22" filter="url(#blur14)"/>')
    # contact shadow along the base of the wall
    sc.add(f'<rect x="0" y="{f(fb - 8 * s)}" width="{W}" height="{f(26 * s)}" fill="#000" opacity="0.45" filter="url(#blur6)"/>')
    # straw scattered near the wall
    straw = ""
    for _ in range(int(120 * W / 1920)):
        sx_ = rng.uniform(0, W)
        sy_ = fb + rng.uniform(0, 50) * s
        a = rng.uniform(-0.5, 0.5)
        ln = rng.uniform(6, 16) * s
        straw += f"M{f(sx_)} {f(sy_)} l{f(math.cos(a) * ln)} {f(math.sin(a) * ln)} "
    sc.add(f'<path d="{straw}" stroke="#6a5a38" stroke-width="{f(1.2 * s)}" opacity="0.45"/>')

    # left: pyramid of barrels lying on their side
    br = 44 * s
    bx0 = 0.012 * W + br
    stack = []
    for rowi, count in enumerate((3, 2, 1)):
        for i in range(count):
            stack.append(barrel_end(sc, bx0 + (i + rowi * 0.5) * br * 2.02, fb + 26 * s - br - rowi * br * 1.74, br))
    sc.add('<g filter="url(#woodTex)">' + "".join(stack) + '</g>')
    sc.add(f'<path d="M{f(bx0 - br)} {f(fb + 30 * s)} L{f(bx0 + br * 5)} {f(fb + 30 * s)}" stroke="#000" stroke-width="{f(10 * s)}" opacity="0.4" filter="url(#blur6)"/>')

    # crates and a candle beneath the skylight recess
    cx0 = acx + ra * 0.2
    sc.add('<g filter="url(#woodTex)">' + crate(sc, cx0, fb + 18 * s, 118 * s, 92 * s) + crate(sc, cx0 + 14 * s, fb + 18 * s - 92 * s, 86 * s, 66 * s) + '</g>')
    sc.add(candle(sc, cx0 + 66 * s, fb + 18 * s - 158 * s, 26 * s))
    sc.add(candle(sc, cx0 + 80 * s, fb + 18 * s - 158 * s, 16 * s, glow=0.3))

    # loot sacks and spilled coins by the map board
    sx0 = mbx + mbw * 0.2 if not tall else 0.47 * W
    sc.add(sack(sc, sx0, fb + 22 * s, 70 * s, 84 * s) + sack(sc, sx0 + 56 * s, fb + 28 * s, 60 * s, 66 * s, coins=True))
    # a small keg with a candle stub on it
    sc.add('<g filter="url(#woodTex)">' + barrel_up(sc, bcx - rb - 30 * s if not tall else 0.4 * W, fb + 14 * s, 30 * s, 72 * s) + '</g>')
    sc.add(candle(sc, (bcx - rb - 30 * s) if not tall else 0.4 * W, fb + 14 * s - 72 * s, 20 * s, glow=0.45))

    # right: tall stack of crates and barrels
    rx = 0.845 * W if not tall else 0.8 * W
    sc.add('<g filter="url(#woodTex)">' +
           crate(sc, rx, fb + 20 * s, 140 * s, 110 * s) + crate(sc, rx + 130 * s, fb + 24 * s, 120 * s, 100 * s) +
           crate(sc, rx + 20 * s, fb + 20 * s - 110 * s, 110 * s, 84 * s, mark=False) +
           barrel_up(sc, rx + 190 * s, fb + 24 * s - 100 * s, 40 * s, 94 * s) + '</g>')
    sc.add(sack(sc, rx - 26 * s, fb + 30 * s, 64 * s, 72 * s, coins=True))

    # bottle shelf by the right lantern and a pulley over the crates
    sc.add(bottle_shelf(sc, (0.8 if not tall else 0.76) * W, ceil + 300 * s, 150 * s))
    sc.add(pulley_rope(sc, acx + ra * 0.62, ceil + 34 * s, fb - 190 * s))
    sc.add(rope_coil(sc, cx0 - 30 * s, fb - 10 * s, 22 * s))

    # hanging lanterns
    sc.add(lantern(sc, 0.47 * W if not tall else 0.5 * W, ceil + 150 * s, 20 * s, chain_top=ceil + 34 * s))
    sc.add(lantern(sc, 0.86 * W, ceil + 200 * s, 18 * s, chain_top=ceil + 34 * s, glow=0.55))

    # oak posts framing the cellar, with diagonal braces
    for px in (0.028 * W, 0.972 * W):
        sc.add('<g filter="url(#woodTex)">' + post_beam(sc, px, ceil, H, 50 * s) + '</g>')
        k = 1 if px < W / 2 else -1
        sc.add(f'<g filter="url(#woodTex)"><path d="M{f(px + k * 20 * s)} {f(ceil + 150 * s)} L{f(px + k * 150 * s)} {f(ceil + 30 * s)}" stroke="#0a0706" stroke-width="{f(26 * s)}"/>'
               f'<path d="M{f(px + k * 20 * s)} {f(ceil + 150 * s)} L{f(px + k * 150 * s)} {f(ceil + 30 * s)}" stroke="#2a1e15" stroke-width="{f(22 * s)}"/></g>')
    # cobwebs in the upper corners
    for cxw, k in ((0.028 * W + 25 * s, 1), (0.972 * W - 25 * s, -1)):
        web = ""
        for i in range(6):
            a = i / 5 * math.pi / 2
            web += f"M{f(cxw)} {f(ceil + 34 * s)} L{f(cxw + k * math.cos(a) * 90 * s)} {f(ceil + 34 * s + math.sin(a) * 90 * s)} "
        for rr in (30, 55, 80):
            pts = [(cxw + k * math.cos(i / 5 * math.pi / 2) * rr * s, ceil + 34 * s + math.sin(i / 5 * math.pi / 2) * rr * s) for i in range(6)]
            web += "M" + " Q".join(f"{f(pts[i][0])} {f(pts[i][1])}" + (f" {f((pts[i][0] + pts[i + 1][0]) / 2)} {f((pts[i][1] + pts[i + 1][1]) / 2)}" if i < 5 else "") for i in range(6)) + " "
        sc.add(f'<path d="{web}" stroke="#8a7a66" stroke-width="{f(0.9 * s)}" fill="none" opacity="0.25"/>')

    # darkness everywhere except around the light sources
    lamp_x = 0.47 * W if not tall else 0.5 * W
    keg_x = (bcx - rb - 30 * s) if not tall else 0.4 * W
    holes = [(lx, ly, 380), (lx + fx_off * 0.35, (ly + fy) / 2, 330), (lx + fx_off + 60 * s, fy - 20 * s, 360),
             (lamp_x, ceil + 150 * s, 300), (0.86 * W, ceil + 200 * s, 250), (cx0 + 70 * s, fb - 150 * s, 220),
             (keg_x, fb - 70 * s, 170), (rx + 110 * s, fb - 90 * s, 230), (vpx, vpy + (fb - vpy) * 0.2, 60)]
    sc.add('<radialGradient id="hole" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="1"/>'
           '<stop offset="0.45" stop-color="#000" stop-opacity="0.6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>')
    m = f'<mask id="dark" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/>'
    for hx, hy, hr in holes:
        m += f'<circle cx="{f(hx)}" cy="{f(hy)}" r="{f(hr * s)}" fill="url(#hole)"/>'
    sc.add(m + '</mask>')
    sc.add(f'<rect width="{W}" height="{H}" fill="#08050a" opacity="0.62" mask="url(#dark)"/>')

    # dust hanging in the moonlight
    sc.add(f'<rect x="0" y="{f(ceil)}" width="{W}" height="{f(gy - ceil)}" filter="url(#dust)" opacity="0.07"/>')
    motes = []
    for _ in range(90):
        t = rng.random()
        mx_ = lx + rng.uniform(-60, 60) * s + (fx_off + 80 * s) * t
        my_ = ly + (fy - ly) * t
        motes.append(f'<circle cx="{f(mx_)}" cy="{f(my_)}" r="{f(rng.uniform(0.6, 1.8) * s)}" fill="#ffe2b8" opacity="{f(rng.uniform(0.2, 0.7))}"/>')
    sc.add('<g filter="url(#glow2)">' + "".join(motes) + '</g>')

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
        img = post(raw, w, h, LIGHT_XY, seed=11)
        img.save(work / f"{name}-final.png")
        q, kb = save_webp(img, out / f"{name}.webp", 380 if not suffix else 300)
        review(img, work / f"{name}-review.png")
        print(f"{name}: {w}x{h} q={q} {kb} KB")


if __name__ == "__main__":
    main()
