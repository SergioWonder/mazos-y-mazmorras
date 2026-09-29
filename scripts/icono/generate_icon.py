#!/usr/bin/env python3
"""App icon generator for «Mazo y Mazmorra».

Motif: the Dungeon Master (hooded, backlit, red eyes) raising a golden-framed card
in front of a warm moon halo, with a resin d20 peeking from the bottom-left.

The artwork is written as SVG (ink outlines, cel shading, filters), rasterised with
headless Chrome at 2x and post-processed with PIL/numpy (bloom on the glows,
fine grain, vignette). Outputs:

  public/icono.svg              vector source (self-contained, no text/image/script)
  public/icono-dm-512.png          opaque, square corners
  public/icono-dm-192.png
  public/icono-dm-maskable-512.png motif inside the 80 % safe circle, background bleeds
  public/apple-touch-icon.png   180x180, opaque
  public/favicon.png            48x48, simplified drawing

Usage:  python3 scripts/icono/generate_icon.py [scratch_dir]
The scratch dir (default: a temp dir) receives the intermediate HTML/PNG renders.
"""
from __future__ import annotations

import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

INK = "#0a0609"
ROBE = "#0c0810"
ROBE_SHADE = "#050307"
HAND = "#1f1828"
RIM = "#ffb45a"
MAGIC = "#b98cff"


# ── geometry helpers ─────────────────────────────────────────────────────────
def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def sparkle(cx, cy, r, fill, opacity=1.0, thin=0.22):
    """Four-pointed twinkle, as the game draws its stars."""
    t = r * thin
    d = (f"M{cx},{cy - r} Q{cx + t},{cy - t} {cx + r},{cy} Q{cx + t},{cy + t} {cx},{cy + r} "
         f"Q{cx - t},{cy + t} {cx - r},{cy} Q{cx - t},{cy - t} {cx},{cy - r} Z")
    return f'<path d="{d}" fill="{fill}" opacity="{opacity}"/>'


# ── pieces ───────────────────────────────────────────────────────────────────
def defs(simple: bool) -> str:
    return f"""
<defs>
  <radialGradient id="bg" cx="46%" cy="34%" r="80%">
    <stop offset="0" stop-color="#4a2240"/>
    <stop offset="0.45" stop-color="#241330"/>
    <stop offset="1" stop-color="#0a0610"/>
  </radialGradient>
  <radialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff9a4a" stop-opacity="0.75"/>
    <stop offset="0.55" stop-color="#d0503a" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#6a1e3a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="moon" cx="44%" cy="40%" r="62%">
    <stop offset="0" stop-color="#fff0c2"/>
    <stop offset="0.35" stop-color="#ffd07a"/>
    <stop offset="0.75" stop-color="#f08a3e"/>
    <stop offset="1" stop-color="#b8472e"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff0a8"/>
    <stop offset="0.3" stop-color="#f2c55a"/>
    <stop offset="0.65" stop-color="#c78a2c"/>
    <stop offset="1" stop-color="#7a4a18"/>
  </linearGradient>
  <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a5a1e"/>
    <stop offset="1" stop-color="#4a2c10"/>
  </linearGradient>
  <radialGradient id="art" cx="50%" cy="45%" r="70%">
    <stop offset="0" stop-color="#8e62ff"/>
    <stop offset="0.35" stop-color="#4b2aa8"/>
    <stop offset="1" stop-color="#140c34"/>
  </radialGradient>
  <linearGradient id="parch" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f1e2b6"/>
    <stop offset="1" stop-color="#d2bb86"/>
  </linearGradient>
  <radialGradient id="gem" cx="38%" cy="34%" r="70%">
    <stop offset="0" stop-color="#ffe7a0"/>
    <stop offset="0.45" stop-color="#f3a93a"/>
    <stop offset="1" stop-color="#a0501a"/>
  </radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{MAGIC}" stop-opacity="0.8"/>
    <stop offset="1" stop-color="{MAGIC}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="eyeCore" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff2d8"/>
    <stop offset="0.45" stop-color="#ff7a52"/>
    <stop offset="1" stop-color="#e0201e"/>
  </radialGradient>
  <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
  </radialGradient>

  <!-- warm rim light: the part of the shape that its eroded, lowered copy leaves -->
  <filter id="rimWarm" x="-10%" y="-10%" width="120%" height="120%">
    <feMorphology in="SourceAlpha" operator="erode" radius="{4 if simple else 4.5}" result="er"/>
    <feOffset in="er" dx="1.5" dy="{6 if simple else 7}" result="sh"/>
    <feComposite in="SourceAlpha" in2="sh" operator="out" result="edge"/>
    <feGaussianBlur in="edge" stdDeviation="0.9" result="edgeB"/>
    <feComposite in="edgeB" in2="SourceAlpha" operator="in" result="edgeC"/>
    <feFlood flood-color="{RIM}"/>
    <feComposite in2="edgeC" operator="in" result="rim"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="rim"/></feMerge>
  </filter>
  <!-- violet rim from the card's magic, lighting the hand from above-left -->
  <filter id="rimMagic" x="-20%" y="-20%" width="140%" height="140%">
    <feMorphology in="SourceAlpha" operator="erode" radius="2.5" result="er"/>
    <feOffset in="er" dx="3" dy="3.5" result="sh"/>
    <feComposite in="SourceAlpha" in2="sh" operator="out" result="edge"/>
    <feGaussianBlur in="edge" stdDeviation="0.7" result="edgeB"/>
    <feComposite in="edgeB" in2="SourceAlpha" operator="in" result="edgeC"/>
    <feFlood flood-color="#d8b8ff"/>
    <feComposite in2="edgeC" operator="in" result="rim"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="rim"/></feMerge>
  </filter>
  <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <!-- mottled lunar surface -->
  <filter id="moonTex" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 -1.6 0.9" result="spots"/>
    <feComposite in="spots" in2="SourceAlpha" operator="in" result="spotsIn"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="spotsIn"/></feMerge>
  </filter>
  <!-- cloth grain on the robe -->
  <filter id="cloth" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.16  0 0 0 0 0.32  0 0 0 0.18 -0.06" result="g"/>
    <feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge>
  </filter>
  <clipPath id="hoodClip"><path d="{HOOD}"/></clipPath>
  <clipPath id="faceClip"><path d="{FACE}"/></clipPath>
</defs>"""


# Hood and shoulders in one silhouette (centred slightly left, the card sits right).
HOOD = ("M238,34 C258,26 276,22 292,24 C282,34 276,44 272,52 C312,74 336,118 340,168 "
        "C344,214 334,252 322,282 C360,300 404,316 440,338 C486,366 510,420 526,480 "
        "L560,760 L-50,760 L-26,480 C-10,420 22,366 64,340 C96,320 124,302 150,284 "
        "C136,250 128,210 132,166 C138,98 184,40 238,34 Z")
FACE = ("M236,104 C274,106 304,142 306,190 C308,236 284,270 236,276 "
        "C188,270 164,236 166,190 C168,142 198,106 236,104 Z")


def background(simple: bool) -> str:
    out = ['<rect x="-200" y="-200" width="912" height="912" fill="url(#bg)"/>']
    # ember haze behind everything
    out.append('<circle cx="236" cy="170" r="250" fill="url(#haloGlow)"/>')
    if not simple:
        stars = [(58, 70, 11), (440, 60, 14), (470, 170, 8), (40, 200, 7), (96, 128, 5),
                 (400, 118, 6), (486, 250, 6), (30, 300, 9), (120, 30, 6), (360, 30, 5)]
        for x, y, r in stars:
            out.append(sparkle(x, y, r, "#cdb8e8", 0.55))
        for x, y, r in [(80, 250, 2), (420, 210, 2.4), (150, 60, 1.8), (330, 70, 2), (470, 110, 1.6)]:
            out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#ffc07a" opacity="0.8"/>')
    return "\n".join(out)


def moon(simple: bool) -> str:
    tex = "" if simple else ' filter="url(#moonTex)"'
    return f"""
<circle cx="236" cy="168" r="176" fill="#ffb060" opacity="0.28" filter="url(#blur14)"/>
<circle cx="236" cy="168" r="160" fill="url(#moon)"{tex}/>
<circle cx="236" cy="168" r="160" fill="none" stroke="#ffe6b0" stroke-width="3" opacity="0.7"/>
<circle cx="236" cy="168" r="160" fill="none" stroke="{INK}" stroke-width="{3 if simple else 2}" opacity="0.5"/>"""


def dm(simple: bool) -> str:
    folds = "" if simple else f"""
  <g clip-path="url(#hoodClip)" fill="none" stroke="{INK}" stroke-linecap="round">
    <path d="M150,284 C170,300 200,312 236,314" stroke-width="3"/>
    <path d="M322,282 C300,300 272,312 236,314" stroke-width="3"/>
    <path d="M100,340 C120,400 126,460 118,540" stroke-width="3"/>
    <path d="M60,380 C74,430 72,490 62,560" stroke-width="2"/>
    <path d="M236,314 C232,380 236,450 240,560" stroke-width="2.5"/>
    <path d="M292,24 C300,60 330,110 336,160" stroke="#3a2230" stroke-width="2"/>
  </g>
  <!-- cel shadow on the lower left of the hood -->
  <g clip-path="url(#hoodClip)">
    <path d="M132,166 C138,230 170,290 236,316 L150,420 L-60,420 L-60,300 Z" fill="{ROBE_SHADE}" opacity="0.7"/>
  </g>"""
    return f"""
<g filter="url(#rimWarm)">
  <path d="{HOOD}" fill="{ROBE}"/>
</g>
<g filter="url(#cloth)"><path d="{HOOD}" fill="{ROBE}" opacity="0.001"/></g>
{folds}
<g clip-path="url(#hoodClip)"><ellipse cx="{CARD_X - 20}" cy="{CARD_Y + 20}" rx="150" ry="170" fill="#7a4ad8" opacity="0.22" filter="url(#blur14)"/></g>
<path d="{HOOD}" fill="none" stroke="{INK}" stroke-width="{6 if simple else 4}" stroke-linejoin="round"/>
<!-- the hood's opening: deeper dark, a faint lit lip on the upper edge -->
<path d="{FACE}" fill="#030204"/>
<path d="M176,160 C190,124 212,108 236,106 C262,108 286,126 298,160" fill="none" stroke="#5a2e2a" stroke-width="3" opacity="0.8"/>
{eyes(simple)}"""


def eyes(simple: bool) -> str:
    # slanted, menacing: the inner corners dip toward the nose
    left = "M188,186 C196,176 212,178 226,192 C214,198 198,197 188,186 Z"
    right = "M284,186 C276,176 260,178 246,192 C258,198 274,197 284,186 Z"
    s = 1.25 if simple else 1.0
    tf = f' transform="translate(236 188) scale({s}) translate(-236 -188)"'
    return f"""
<g{tf}>
  <g filter="url(#blur6)" opacity="0.95">
    <path d="{left}" fill="#ff3a2a"/>
    <path d="{right}" fill="#ff3a2a"/>
    <ellipse cx="207" cy="189" rx="30" ry="16" fill="#ff2a1a" opacity="0.6"/>
    <ellipse cx="265" cy="189" rx="30" ry="16" fill="#ff2a1a" opacity="0.6"/>
  </g>
  <path d="{left}" fill="url(#eyeCore)"/>
  <path d="{right}" fill="url(#eyeCore)"/>
</g>"""


# Card placement (card-local coordinates are centred on the card).
CARD_X, CARD_Y, CARD_ROT = 330, 320, -11
CW, CH = 84, 116  # half width / half height


def card(simple: bool) -> str:
    art_detail = "" if simple else f"""
      {sparkle(-34, -64, 5, "#e8dcff", 0.9)}
      {sparkle(36, -22, 6, "#e8dcff", 0.85)}
      {sparkle(30, -78, 3.5, "#fff", 0.9)}
      <circle cx="-30" cy="-18" r="2.2" fill="#fff" opacity="0.8"/>
      <circle cx="16" cy="-86" r="1.6" fill="#fff" opacity="0.8"/>
      <path d="M-58,4 C-30,-10 30,-10 58,4 L58,24 L-58,24 Z" fill="#1a0e30" opacity="0.8"/>
      <path d="M-58,14 C-20,2 20,2 58,14" fill="none" stroke="#6a4ab8" stroke-width="1.5" opacity="0.7"/>"""
    lines = "" if simple else f"""
      <g stroke="#5a4020" stroke-width="3" stroke-linecap="round" opacity="0.75">
        <line x1="-44" y1="52" x2="44" y2="52"/>
        <line x1="-44" y1="66" x2="36" y2="66"/>
        <line x1="-30" y1="80" x2="30" y2="80"/>
      </g>"""
    frame_w = 6 if simple else 4
    return f"""
<g transform="translate({CARD_X} {CARD_Y}) rotate({CARD_ROT})">
  <!-- magic spill behind the card -->
  <ellipse cx="0" cy="-10" rx="{CW + 60}" ry="{CH + 60}" fill="url(#cardGlow)" opacity="0.75"/>
  {hand_back()}
  <rect x="{-CW}" y="{-CH}" width="{2 * CW}" height="{2 * CH}" rx="12" fill="url(#gold)" stroke="{INK}" stroke-width="{frame_w + 1}"/>
  <rect x="{-CW + 5}" y="{-CH + 5}" width="{2 * CW - 10}" height="{2 * CH - 10}" rx="8" fill="none" stroke="#fff4c4" stroke-width="2" opacity="0.65"/>
  <rect x="{-CW + 11}" y="{-CH + 11}" width="{2 * CW - 22}" height="{2 * CH - 22}" rx="5" fill="url(#goldDark)" stroke="{INK}" stroke-width="2.5"/>
  <!-- art window -->
  <rect x="-62" y="-94" width="124" height="118" rx="3" fill="url(#art)" stroke="{INK}" stroke-width="3"/>
  <circle cx="0" cy="-44" r="46" fill="#c9a8ff" opacity="0.45" filter="url(#blur6)"/>
  {art_detail}
  <g filter="url(#blur3)">{sparkle(0, -44, 40, "#e4d2ff", 0.9, 0.2)}</g>
  {sparkle(0, -44, 34, "#ffffff", 1.0, 0.16)}
  {sparkle(0, -44, 16, "#ffffff", 1.0, 0.3)}
  <!-- rules box -->
  <rect x="-62" y="32" width="124" height="62" rx="3" fill="url(#parch)" stroke="{INK}" stroke-width="3"/>
  {lines}
  <!-- gold studs and the cost gem -->
  <circle cx="{CW - 12}" cy="{CH - 12}" r="4" fill="#fff0b0" stroke="{INK}" stroke-width="1.5"/>
  <circle cx="{-CW + 12}" cy="{CH - 12}" r="4" fill="#fff0b0" stroke="{INK}" stroke-width="1.5"/>
  <circle cx="{CW - 12}" cy="{-CH + 12}" r="4" fill="#fff0b0" stroke="{INK}" stroke-width="1.5"/>
  <circle cx="{-CW + 4}" cy="{-CH + 4}" r="21" fill="url(#gem)" stroke="{INK}" stroke-width="4"/>
  <circle cx="{-CW - 2}" cy="{-CH - 3}" r="6" fill="#fff6d0" opacity="0.85"/>
  {hand_front()}
  <!-- glint on the top-right corner of the frame -->
  <g filter="url(#blur3)">{sparkle(CW - 4, -CH + 2, 26, "#ffe7a8", 0.9)}</g>
  {sparkle(CW - 4, -CH + 2, 22, "#fffbe8", 1.0, 0.14)}
</g>"""


def hand_back() -> str:
    # sleeve rising from the lower right plus bony fingers wrapped behind the card's right edge
    sleeve = "M50,156 C80,146 114,148 132,168 L240,430 L56,430 C50,340 46,240 50,156 Z"
    cuff = "M50,158 C80,146 114,148 132,168 L138,186 C116,168 80,166 50,180 Z"
    fingers = ("M82,34 C92,28 104,34 104,46 C104,56 98,64 88,68 Z "
               "M82,70 C94,64 106,72 105,84 C104,94 96,100 86,102 Z "
               "M82,104 C92,100 102,108 100,118 C98,126 90,130 82,130 Z")
    return f"""
  <g filter="url(#rimWarm)"><path d="{sleeve}" fill="{ROBE}"/></g>
  <path d="{sleeve}" fill="none" stroke="{INK}" stroke-width="4"/>
  <g filter="url(#rimMagic)"><path d="{fingers}" fill="{HAND}"/></g>
  <path d="{fingers}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="{cuff}" fill="#24142c" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M52,160 C80,149 112,151 131,170" fill="none" stroke="#c9a04a" stroke-width="2.5" opacity="0.9"/>"""


def hand_front() -> str:
    # a gaunt palm under the card's corner and a long thumb pressed on its face
    palm = "M46,126 C62,114 94,112 106,126 C114,140 108,160 94,168 C78,176 58,172 48,160 C40,150 40,136 46,126 Z"
    thumb = "M50,140 C40,118 30,96 24,80 C20,70 28,62 37,68 C48,84 62,110 74,134 Z"
    return f"""
  <g filter="url(#rimMagic)"><path d="{palm}" fill="{HAND}"/><path d="{thumb}" fill="{HAND}"/></g>
  <path d="{palm}" fill="none" stroke="{INK}" stroke-width="3.5"/>
  <path d="{thumb}" fill="none" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M27,74 C29,68 34,66 37,70" fill="none" stroke="#8a78a0" stroke-width="2" stroke-linecap="round"/>
  <path d="M44,104 C48,102 52,104 53,108" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>"""


def d20(simple: bool) -> str:
    cx, cy, r, rot = 96, 446, 70, -14
    v = [(cx + r * math.cos(math.radians(-90 + 60 * k + rot)), cy + r * math.sin(math.radians(-90 + 60 * k + rot)))
         for k in range(6)]
    inner_r = 0.52 * r
    a, b, c = [(cx + inner_r * math.cos(math.radians(-90 + 120 * k + rot)),
                cy + inner_r * math.sin(math.radians(-90 + 120 * k + rot))) for k in range(3)]
    faces = [
        ((a, v[0], v[1]), "#e0485a"), ((a, v[5], v[0]), "#f06a74"), ((a, b, v[1]), "#c02838"),
        ((b, v[1], v[2]), "#96182a"), ((b, v[2], v[3]), "#6e0f1e"), ((b, c, v[3]), "#84142a"),
        ((c, v[3], v[4]), "#8e1a2c"), ((c, v[4], v[5]), "#b8303e"), ((c, a, v[5]), "#d23e4c"),
        ((a, b, c), "#cc3242"),
    ]
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r + 14}" fill="#ff5a4a" opacity="0.25" filter="url(#blur14)"/>']
    for tri, col in faces:
        out.append(f'<polygon points="{pts(tri)}" fill="{col}"/>')
    if not simple:
        # resin: a bright translucent core and a specular streak
        out.append(f'<circle cx="{cx + 4}" cy="{cy + 8}" r="{r * 0.34}" fill="#ff8a7a" opacity="0.35" filter="url(#blur6)"/>')
        mx, my = (a[0] + v[5][0] + v[0][0]) / 3, (a[1] + v[5][1] + v[0][1]) / 3
        out.append(f'<ellipse cx="{mx:.1f}" cy="{my:.1f}" rx="10" ry="4" transform="rotate(-40 {mx:.1f} {my:.1f})" fill="#fff2e8" opacity="0.85"/>')
        # engraved pips instead of a numeral on the facing triangle
        gx, gy = (a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3
        out.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="5" fill="#ffe0a0" stroke="{INK}" stroke-width="1.5"/>')
    edges = [(a, b), (b, c), (c, a), (a, v[0]), (a, v[1]), (a, v[5]), (b, v[1]), (b, v[2]), (b, v[3]),
             (c, v[3]), (c, v[4]), (c, v[5])]
    for p, q in edges:
        out.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
    out.append(f'<polygon points="{pts(v)}" fill="none" stroke="{INK}" stroke-width="{6 if simple else 4.5}" stroke-linejoin="round"/>')
    # warm edge highlights facing the moon
    out.append(f'<polyline points="{pts([v[4], v[5], v[0], v[1]])}" fill="none" stroke="#ffb88a" stroke-width="2" opacity="0.8" stroke-linejoin="round"/>')
    return "\n".join(out)


def build_svg(mask_scale: float = 1.0, simple: bool = False, size: int = 512) -> str:
    """mask_scale shrinks the motif around the centre while the background keeps bleeding."""
    motif = f"""
{moon(simple)}
{dm(simple)}
{d20(simple)}
{card(simple)}"""
    if mask_scale != 1.0:
        motif = f'<g transform="translate(256 256) scale({mask_scale}) translate(-256 -256)">{motif}</g>'
    if simple:
        # favicon crop: tighter on the face and the card
        view = "40 40 432 432"
    else:
        view = "0 0 512 512"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="{view}">
{defs(simple)}
{background(simple)}
{motif}
<rect x="-200" y="-200" width="912" height="912" fill="url(#vignette)"/>
</svg>"""
    return svg


# ── raster pipeline ──────────────────────────────────────────────────────────
def render(svg: str, px: int, scratch: Path, name: str) -> Image.Image:
    html = scratch / f"{name}.html"
    png = scratch / f"{name}-raw.png"
    svg_sized = svg.replace('width="512" height="512"', f'width="{px}" height="{px}"', 1)
    html.write_text(f'<!doctype html><html><body style="margin:0;background:#000">{svg_sized}</body></html>')
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--window-size={px},{px}", f"--screenshot={png}", html.as_uri()],
                   check=True, capture_output=True)
    return Image.open(png).convert("RGB")


def post(img: Image.Image, grain: float = 1.2) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    # bloom: blur the brightest pixels and add them back
    lum = arr.mean(axis=2, keepdims=True)
    bright = np.clip((lum - 170) / 85, 0, 1) * arr
    glow = np.asarray(Image.fromarray(bright.astype(np.uint8)).filter(ImageFilter.GaussianBlur(img.width / 90))).astype(np.float32)
    arr = arr + glow * 0.35
    # fine painterly grain
    rng = np.random.default_rng(11)
    noise = rng.normal(0, grain, arr.shape[:2])[..., None]
    arr = arr + noise
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def main() -> None:
    scratch = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp())
    scratch.mkdir(parents=True, exist_ok=True)

    full = build_svg()
    (PUBLIC / "icono.svg").write_text(full.replace('width="512" height="512" ', ""))

    big = post(render(full, 1024, scratch, "icon"))
    big.save(scratch / "icon-1024.png")
    for size, name in [(512, "icono-dm-512.png"), (192, "icono-dm-192.png"), (180, "apple-touch-icon.png")]:
        big.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)

    mask = post(render(build_svg(mask_scale=0.8), 1024, scratch, "maskable"))
    mask.save(scratch / "maskable-1024.png")
    mask.resize((512, 512), Image.LANCZOS).save(PUBLIC / "icono-dm-maskable-512.png", optimize=True)

    fav = post(render(build_svg(simple=True), 384, scratch, "favicon"), grain=0)
    fav.resize((48, 48), Image.LANCZOS).save(PUBLIC / "favicon.png", optimize=True)
    print(f"done; intermediates in {scratch}")


if __name__ == "__main__":
    main()
