"""«Behind the Screen»: the Dungeon Master's battle theme for Dracs & Rogues.

Instrumental, slightly progressive metalcore (no vocals) in G minor/phrygian at
140 BPM with drop-G 7-string guitars. An atmospheric intro plays once; then the
loop: main riff, verse, a 7/8 passage with a 4-against-7 arpeggio, pre-chorus,
huge instrumental chorus with a clean delayed lead, ambient interlude, half-time
breakdown with a stop and a 3-over-4 return, second chorus with lead harmony and
the riff again as the outro, which falls back into the main riff.

Usage: python3 dm.py [out_dir]   -> dm.mp3 (+ dm-muestra.mp3) in out_dir.
The loop and intro lengths (samples) are printed for src/fx/music-tracks.ts.
"""
import os
import subprocess
import sys
import zlib
from collections import defaultdict
from multiprocessing import Pool

import numpy as np

import metal as mt
import synth as sy

SR = sy.SR
BPM = 140
STEP_N = 4725                 # samples per sixteenth at 140 BPM (exact)
STEP = STEP_N / SR
TAIL = 3.0                    # seconds rendered past the end of each part
TARGET_LUFS = -13.9           # internal estimate; tuned to match jefe3.mp3 (ffmpeg)

# ---------------------------------------------------------------- score model


class Part:
    """A timeline of sections measured in sixteenths, with event lists."""

    def __init__(self):
        self.sections = {}
        self.cursor = 0
        self.ev = defaultdict(list)

    def section(self, name, bars, spb=16):
        self.sections[name] = (self.cursor, bars, spb)
        self.cursor += bars * spb

    def t(self, sec, bar, step=0.0):
        s0, _, spb = self.sections[sec]
        return (s0 + bar * spb + step) * STEP

    @property
    def n(self):
        return self.cursor * STEP_N

    def add(self, kind, *args):
        self.ev[kind].append(args)


def pc(root):
    return [root, root + 7, root + 12]


CHUG = [31, 38]
CH = {'G': pc(31), 'Ab': pc(32), 'Bb': pc(34), 'C': pc(36), 'Db': pc(37), 'D': pc(38),
      'Eb': pc(39), 'F': pc(41), 'Gh': pc(43), 'Tri': [31, 37, 43]}
G_MINOR = [7, 9, 10, 0, 2, 3, 5]


def third_below(m):
    """Diatonic third below in G natural minor."""
    for d in range(1, 6):
        c = m - d
        if c % 12 in G_MINOR:
            steps = sum(1 for k in range(c, m) if k % 12 in G_MINOR)
            if steps == 2:
                return c
    return m - 3


def play(p, sec, bar, pattern, kick=1.0, bass=True, open_mute=0.15):
    """Guitar pattern: (step, length, symbol). 'c' = low palm-muted chug,
    ('m', root) = muted power chord, a chord name = open, ringing chord."""
    for step, ln, sym in pattern:
        t = p.t(sec, bar, step)
        if sym == 'c':
            notes, mute, dur = CHUG, 1.0, ln * STEP * 0.85
        elif isinstance(sym, tuple):
            notes, mute, dur = [sym[1], sym[1] + 7], 0.9, ln * STEP * 0.85
        else:
            notes, mute, dur = CH[sym], open_mute, ln * STEP * 0.97
        p.add('gtr', t, dur, notes, mute)
        if bass:
            p.add('bass', t, dur, notes[0], min(mute, 0.9))
        if kick:
            p.add('kick', t, kick * (1.0 if sym != 'c' or step % 4 == 0 else 0.92))


def melody(p, kind, sec, bar0, notes, vel=0.85):
    for beat, dur, midi in notes:
        p.add(kind, p.t(sec, bar0, beat * 4), dur * 4 * STEP, midi, vel)


def backbeat(p, sec, bars, steps=(4, 12), vel=1.0):
    for b in bars:
        for s in steps:
            p.add('snare', p.t(sec, b, s), vel)


def eighths(p, sec, bars, kind='hat', vel=0.55, spb=16):
    for b in bars:
        for s in range(0, spb, 2):
            p.add(kind, p.t(sec, b, s), vel * (1.0 if s % 4 == 0 else 0.7))


def quarters(p, sec, bars, kind='china', vel=0.6, skip0=False):
    for b in bars:
        for s in (0, 4, 8, 12):
            if not (skip0 and s == 0):
                p.add(kind, p.t(sec, b, s), vel)


def snare_roll(p, sec, bar, s0, s1, v0, v1):
    steps = list(range(s0, s1))
    for i, s in enumerate(steps):
        p.add('snare', p.t(sec, bar, s), v0 + (v1 - v0) * i / max(1, len(steps) - 1))


# ---------------------------------------------------------------- riff material

RIFF = [
    [(0, 2, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 2, 'c'), (11, 2, 'c'), (14, 2, 'Bb')],
    [(0, 2, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 2, 'c'), (10, 1, 'c'), (11, 1, 'c'), (12, 4, 'Ab')],
    [(0, 2, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 2, 'c'), (11, 2, 'c'), (14, 2, 'Db')],
    [(0, 1, 'c'), (2, 1, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 3, 'F'), (11, 3, 'Eb'), (14, 2, 'D')],
    [(0, 1, 'c'), (1, 1, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 1, 'c'), (9, 1, 'c'), (11, 2, 'c'), (14, 2, 'Bb')],
    [(0, 2, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 2, 'c'), (10, 1, 'c'), (11, 1, 'c'), (12, 4, 'C')],
    [(0, 2, 'c'), (3, 2, 'c'), (6, 2, 'c'), (8, 2, 'c'), (11, 2, 'c'), (14, 2, 'Db')],
    [(0, 4, 'Ab'), (4, 4, 'Bb')] + [(s, 1, 'c') for s in range(8, 16)],
]


def riff_section(p, sec, hats_first=True, outro=False):
    for b, pat in enumerate(RIFF):
        play(p, sec, b, pat)
    first, second = (range(0, 4), range(4, 7)) if hats_first else (range(4, 7), range(0, 4))
    eighths(p, sec, first, 'hat', 0.55)
    quarters(p, sec, second, 'china', 0.5)
    backbeat(p, sec, range(7))
    p.add('crash', p.t(sec, 0), 0.9)
    p.add('crash', p.t(sec, 4), 0.75)
    # bar 8 fill: snare and toms into the next downbeat
    p.add('crash', p.t(sec, 7, 0), 0.6)
    p.add('snare', p.t(sec, 7, 4), 0.9)
    toms = [(8, 180.0), (9, 180.0), (10, 130.0), (11, 130.0), (12, 95.0), (13, 95.0), (14, 75.0), (15, 75.0)]
    if outro:
        for s, f in toms:
            p.add('tom', p.t(sec, 7, s), f, 0.85)
        snare_roll(p, sec, 7, 14, 16, 0.8, 1.0)
    else:
        snare_roll(p, sec, 7, 8, 16, 0.45, 1.0)
        p.add('tom', p.t(sec, 7, 12), 95.0, 0.7)
        p.add('tom', p.t(sec, 7, 14), 75.0, 0.8)
    # synth layer: a dark choir drone and, in the second half, a delayed arpeggio
    p.add('choir', p.t(sec, 0), 4 * 16 * STEP, [55, 62, 67], 0.45)
    p.add('choir', p.t(sec, 4), 4 * 16 * STEP, [56, 63, 67], 0.45)
    cell = [79, 74, 70, 74, 80, 74, 70, 77]
    for i in range(32):
        p.add('arp', p.t(sec, 4, 2 * i), 2 * STEP, cell[i % 8], 0.4)


# ---------------------------------------------------------------- the intro


def build_intro():
    p = Part()
    p.section('I', 8)
    S = 'I'
    bar = 16 * STEP
    chords = [([55, 62, 69, 70], 0), ([51, 58, 62, 67], 2), ([48, 55, 62, 63], 4), ([50, 57, 62, 66], 6)]
    for notes, b in chords:
        p.add('pad', p.t(S, b), 2 * bar, notes, 0.55 if b else 0.45)
        p.add('choir', p.t(S, b), 2 * bar, [n - 12 for n in notes[:2]] + notes[1:3], 0.35 + 0.05 * b)
    p.add('sub', p.t(S, 0), 0.25)
    p.add('sub', p.t(S, 4), 0.3)
    cell = [67, 74, 69, 70]
    for i in range(2, 64):
        p.add('arp', p.t(S, 0, 2 * i), 2 * STEP, cell[i % 4] + (0 if i < 32 else 5 * (i % 2)), 0.25 + 0.3 * i / 64)
    # a first, low glimpse of the chorus hook
    melody(p, 'lead', S, 4, [(0, 2, 67), (2, 1, 65), (3, 1, 63), (4, 3, 62), (7, 1, 63),
                             (8, 2, 65), (10, 2, 66)], vel=0.7)
    # heartbeat and the build
    for b in (4, 5):
        p.add('tom', p.t(S, b, 0), 70.0, 0.35)
        p.add('tom', p.t(S, b, 8), 70.0, 0.3)
    for i, s in enumerate(range(0, 16, 4)):
        p.add('kick', p.t(S, 6, s), 0.5 + 0.08 * i)
    p.add('gswell', p.t(S, 6), 2 * bar, CH['Gh'], 0.8)
    snare_roll(p, S, 7, 0, 15, 0.2, 0.95)
    for s in (0, 4, 8, 12):
        p.add('kick', p.t(S, 7, s), 0.75)
    p.add('riser', p.t(S, 8), 2 * bar, 0.5)
    p.add('swell', p.t(S, 8), bar, 0.7)
    return p


# ---------------------------------------------------------------- the loop


def build_loop():
    p = Part()
    p.section('RIFF', 8)
    p.section('VERSE', 8)
    p.section('PROG', 8, 14)
    p.section('PRE', 4)
    p.section('CHORUS', 8)
    p.section('INTER', 4)
    p.section('BREAK', 12)
    p.section('CHORUS2', 8)
    p.section('OUTRO', 8)
    bar = 16 * STEP

    # ── main riff
    riff_section(p, 'RIFF', hats_first=True)

    # ── verse: ringing chords and muted chugs under the clean lead
    S = 'VERSE'
    roots = [('G', 31), ('Eb', 39), ('C', 36), ('D', 38)]
    for i, (name, r) in enumerate(roots):
        a = [(0, 6, name), (6, 1, ('m', r)), (8, 2, ('m', r)), (10, 1, ('m', r)), (11, 1, ('m', r)),
             (12, 2, ('m', r)), (14, 2, ('m', r))]
        b = [(0, 2, ('m', r)), (3, 1, ('m', r)), (4, 2, ('m', r)), (6, 2, ('m', r)), (8, 6, name),
             (14, 1, ('m', r)), (15, 1, ('m', r))]
        play(p, S, 2 * i, a, kick=0.85, open_mute=0.35)
        play(p, S, 2 * i + 1, b, kick=0.85, open_mute=0.35)
        for bb in (2 * i, 2 * i + 1):
            p.add('snare', p.t(S, bb, 7), 0.22)
            p.add('snare', p.t(S, bb, 15), 0.18)
    backbeat(p, S, range(8), vel=0.85)
    eighths(p, S, range(8), 'hat', 0.5)
    p.add('crash', p.t(S, 0), 0.75)
    p.add('crash', p.t(S, 4), 0.65)
    pads = [[55, 58, 62, 67], [55, 58, 63, 67], [55, 60, 63, 67], [54, 57, 62, 66]]
    for i, notes in enumerate(pads):
        p.add('pad', p.t(S, 2 * i), 2 * bar, notes, 0.45)
    melody(p, 'lead', S, 0, [(0, 1.5, 74), (1.5, 0.5, 72), (2, 2, 70), (4, 1, 67), (5, 1, 70), (6, 2, 69),
                             (8, 1.5, 70), (9.5, 0.5, 72), (10, 2, 74), (12, 1, 75), (13, 1, 74), (14, 2, 70),
                             (16, 1.5, 72), (17.5, 0.5, 70), (18, 2, 67), (20, 1, 63), (21, 1, 67), (22, 2, 72),
                             (24, 1.5, 74), (25.5, 0.5, 72), (26, 1, 70), (27, 1, 69), (28, 3, 66), (31, 1, 69)],
           vel=0.78)

    # ── 7/8 passage: 3+3+3+3+2 chugs, a 4-note arpeggio cycling against 7 eighths
    S = 'PROG'
    accents = ['Bb', 'Ab', 'Bb', 'C', 'Bb', 'Ab', 'Eb', 'D']
    for b, ch in enumerate(accents):
        if b < 7:
            pat = [(0, 2, 'c'), (3, 2, 'c'), (6, 1, 'c'), (7, 1, 'c'), (9, 3, ch), (12, 1, 'c'), (13, 1, 'c')]
        else:
            pat = [(0, 1, 'c'), (1, 1, 'c'), (2, 1, 'c'), (3, 2, 'c'), (6, 4, 'D'), (10, 4, 'Eb')]
        play(p, S, b, pat)
        p.add('snare', p.t(S, b, 6), 0.95)
        if b % 2:
            p.add('snare', p.t(S, b, 12), 0.8)
        for s in range(0, 14, 2):
            p.add('hat', p.t(S, b, s), 0.5 if s % 6 else 0.62, True if s == 12 else False)
        if b in (3, 7):
            p.add('china', p.t(S, b, 9), 0.6)
    p.add('crash', p.t(S, 0), 0.85)
    p.add('crash', p.t(S, 4), 0.75)
    cell = [67, 70, 74, 77]
    for i in range(8 * 7):
        p.add('arp', p.t(S, 0, 2 * i), 2 * STEP, cell[i % 4] + (12 if (i // 4) % 4 == 3 else 0), 0.45)
    p.add('choir', p.t(S, 0), 4 * 14 * STEP, [55, 62, 67], 0.45)
    p.add('choir', p.t(S, 4), 4 * 14 * STEP, [56, 63, 68], 0.45)
    p.add('brass', p.t(S, 3, 9), 3 * STEP, [48, 55], 0.5)
    p.add('brass', p.t(S, 6, 9), 3 * STEP, [51, 58], 0.5)
    p.add('brass', p.t(S, 7, 6), 8 * STEP, [50, 57], 0.55)

    # ── pre-chorus: rising strums and a snare build that stops dead
    S = 'PRE'
    for b, r in enumerate([36, 32, 34]):
        for s in range(0, 16, 2):
            if b == 2 and s >= 12:
                continue
            p.add('gtr', p.t(S, b, s), 1.7 * STEP, [r, r + 7, r + 12], 0.55)
            p.add('bass', p.t(S, b, s), 1.7 * STEP, r, 0.6)
            p.add('kick', p.t(S, b, s), 0.8)
        if b == 2:
            for s in range(12, 16):
                p.add('gtr', p.t(S, b, s), 0.85 * STEP, [r, r + 7, r + 12], 0.6)
                p.add('bass', p.t(S, b, s), 0.85 * STEP, r, 0.6)
                p.add('kick', p.t(S, b, s), 0.85)
    for s in (0, 4, 8, 12):
        p.add('snare', p.t(S, 0, s), 0.6 + 0.05 * s / 4)
    for s in range(0, 16, 2):
        p.add('snare', p.t(S, 1, s), 0.65 + 0.15 * s / 14)
    snare_roll(p, S, 2, 0, 16, 0.55, 1.0)
    p.add('crash', p.t(S, 0), 0.7)
    play(p, S, 3, [(0, 8, 'D')])
    p.add('crash', p.t(S, 3), 0.9)
    p.add('snare', p.t(S, 3, 0), 1.0)
    p.add('snare', p.t(S, 3, 14), 0.8)
    p.add('snare', p.t(S, 3, 15), 1.0)
    for b, notes in enumerate([[48, 55, 60, 63], [48, 56, 60, 63], [50, 53, 58, 62], [50, 54, 57, 62]]):
        p.add('choir', p.t(S, b), bar, notes, 0.45 + 0.1 * b)
        p.add('pad', p.t(S, b), bar, [n + 12 for n in notes], 0.35 + 0.08 * b)
    melody(p, 'lead', S, 2, [(0, 1, 70), (1, 1, 72), (2, 1, 74), (3, 1, 75), (4, 2, 74), (6, 2, 78)], vel=0.8)
    p.add('riser', p.t('CHORUS', 0), 2 * bar, 0.55)
    p.add('swell', p.t('CHORUS', 0), bar, 0.75)

    # ── chorus: open chords, driving kick, the soaring lead
    def chorus(S, second):
        names = ['Eb', 'Eb', 'Bb', 'Bb', 'F', 'F', 'G', 'G']
        roots = [39, 39, 34, 34, 41, 41, 31, 31]
        for b, (name, r) in enumerate(zip(names, roots)):
            if second and b == 7:
                pat = [(0, 6, 'G'), (6, 4, 'G'), (10, 2, 'c'), (12, 1, 'c'), (13, 1, 'c'), (14, 1, 'c'), (15, 1, 'c')]
            elif b % 2 == 0:
                pat = [(0, 6, name), (6, 4, name), (10, 6, name)]
            else:
                pat = [(0, 10, name), (10, 3, name), (13, 3, name)]
            play(p, S, b, pat, kick=0.95, bass=False)
            for s in range(0, 16, 2):
                p.add('bass', p.t(S, b, s), 1.8 * STEP, r, 0.45)
            # driving eighths, double kick in sixteenths later on (skipping the guitar onsets)
            double = second or b >= 4
            onsets = {st for st, _, _ in pat}
            for s in range(0, 16, 1 if double else 2):
                if s not in onsets:
                    p.add('kick', p.t(S, b, s), 0.7 if s % 2 else 0.78)
            p.add('crash', p.t(S, b, 0), 0.85 if b % 4 == 0 else 0.65)
            for s in (4, 8, 12):
                p.add('ride', p.t(S, b, s), 0.45)
            if b % 2 and b != 7:
                p.add('china', p.t(S, b, 14), 0.55)
        backbeat(p, S, range(7 if not second else 8))
        if not second:
            p.add('snare', p.t(S, 7, 4), 1.0)
            snare_roll(p, S, 7, 12, 16, 0.7, 1.0)
        voic = {'Eb': [51, 55, 58, 63], 'Bb': [50, 53, 58, 62], 'F': [53, 57, 60, 65], 'G': [50, 55, 58, 62]}
        for b in range(0, 8, 2):
            v = voic[names[b]]
            p.add('choir', p.t(S, b), 2 * bar, v if not second else [n + 12 for n in v[:3]] + v[:1], 0.7)
            p.add('pad', p.t(S, b), 2 * bar, [n + 12 for n in v], 0.5)
        p.add('sub', p.t(S, 0), 0.5)
        if not second:
            mel = [(0, 2, 79), (2, 1, 77), (3, 1, 75), (4, 3, 74), (7, 1, 75), (8, 2, 77), (10, 1, 74), (11, 1, 72),
                   (12, 3, 70), (15, 1, 72), (16, 2, 72), (18, 1, 74), (19, 1, 77), (20, 3, 81), (23, 1, 79),
                   (24, 2, 79), (26, 1, 77), (27, 1, 74), (28, 4, 79)]
        else:
            mel = [(0, 2, 79), (2, 1, 77), (3, 1, 75), (4, 2, 74), (6, 1, 75), (7, 1, 77), (8, 2, 77), (10, 1, 74),
                   (11, 1, 72), (12, 2, 70), (14, 1, 72), (15, 1, 74), (16, 2, 72), (18, 1, 74), (19, 1, 77),
                   (20, 2, 82), (22, 1, 81), (23, 1, 79), (24, 2, 79), (26, 1, 82), (27, 1, 81), (28, 4, 79)]
            melody(p, 'harm', S, 0, [(bt, d, third_below(m)) for bt, d, m in mel], vel=0.6)
        melody(p, 'lead', S, 0, mel, vel=0.9)

    chorus('CHORUS', False)

    # ── interlude: the wall rings out, only synths, a heartbeat and a feedback swell
    S = 'INTER'
    play(p, S, 0, [(0, 16, 'G')], open_mute=0.0)
    p.add('crash', p.t(S, 0), 0.8)
    p.add('pad', p.t(S, 0), 2 * bar, [55, 58, 62, 67], 0.5)
    p.add('pad', p.t(S, 2), 2 * bar, [55, 58, 63, 70], 0.5)
    p.add('choir', p.t(S, 0), 4 * bar, [43, 50, 55], 0.4)
    cell = [79, 74, 70, 74, 77, 74, 70, 72]
    for i in range(32):
        p.add('arp', p.t(S, 0, 2 * i), 2 * STEP, cell[i % 8], 0.4)
    melody(p, 'lead', S, 1, [(0, 1.5, 74), (1.5, 0.5, 72), (2, 2, 70), (4, 1, 69), (5, 1, 70), (6, 2, 67),
                             (8, 4, 74)], vel=0.7)
    for b in (1, 2):
        for s in (0, 8):
            p.add('tom', p.t(S, b, s), 70.0, 0.3 + 0.1 * b)
    for s in range(0, 12, 2):
        p.add('kick', p.t(S, 3, s), 0.5 + 0.04 * s)
    p.add('gswell', p.t(S, 2), 2 * bar, [31, 38, 43], 0.8)
    snare_roll(p, S, 3, 12, 16, 0.5, 1.0)
    p.add('swell', p.t('BREAK', 0), bar, 0.7)

    # ── breakdown: half time, tritone stabs, a stop and a 3-over-4 return
    S = 'BREAK'
    BA = [(0, 3, 'c'), (3, 3, 'c'), (6, 1, 'c'), (7, 1, 'c'), (10, 3, 'Tri'), (14, 2, 'c')]
    BB = [(0, 3, 'c'), (3, 3, 'c'), (6, 2, 'c'), (8, 1, 'c'), (9, 1, 'c'), (10, 1, 'c'), (12, 4, 'Bb')]
    BB2 = BB[:-1] + [(12, 4, 'Ab')]
    BA2 = BA[:-1] + [(12, 1, 'c'), (13, 1, 'c'), (14, 1, 'c'), (15, 1, 'c')]
    BEND = [(0, 3, 'c'), (3, 3, 'c'), (6, 2, 'Db'), (8, 1, 'c'), (9, 1, 'c'), (10, 1, 'c'), (11, 1, 'c'),
            (12, 4, 'Gh')]
    for b, pat in enumerate([BA, BB, BA, BB2, BA2, BB, BA, BEND]):
        play(p, S, b, pat, open_mute=0.1)
        p.add('snare', p.t(S, b, 8), 1.0)
        if b < 4:
            quarters(p, S, [b], 'china', 0.6)
        else:
            p.add('crash', p.t(S, b, 0), 0.75)
            quarters(p, S, [b], 'china', 0.6, skip0=True)
        for st, _, sym in pat:
            if sym == 'Tri':
                p.add('brass', p.t(S, b, st), 3 * STEP, [43, 49], 0.6)
    p.add('crash', p.t(S, 0), 0.9)
    p.add('sub', p.t(S, 0), 0.6)
    p.add('choir', p.t(S, 0), 4 * bar, [43, 50, 55, 58], 0.5)
    p.add('choir', p.t(S, 4), 4 * bar, [44, 51, 56, 60], 0.55)
    # the stop: one hit, then only the room answers
    play(p, S, 8, [(0, 2, 'G')], open_mute=0.2)
    p.add('crash', p.t(S, 8), 0.9)
    p.add('china', p.t(S, 8), 0.7)
    p.add('sub', p.t(S, 8), 0.6)
    p.add('choir', p.t(S, 8, 2), 13 * STEP, [55, 58, 62], 0.4)
    p.add('swell', p.t(S, 9), bar * 0.75, 0.6)
    p.add('snare', p.t(S, 8, 14), 0.7)
    p.add('snare', p.t(S, 8, 15), 0.95)
    # return: chugs every three sixteenths against the half-time kit
    for k in range(16):
        s = 3 * k
        b, st = 9 + s // 16, s % 16
        play(p, S, b, [(st, 3 if k == 15 else 2, 'Bb' if k == 15 else ('Ab' if k in (5, 10) else 'c'))])
    for b in (9, 10, 11):
        p.add('snare', p.t(S, b, 8), 1.0)
        quarters(p, S, [b], 'china', 0.6, skip0=(b == 9))
    p.add('crash', p.t(S, 9), 0.95)
    p.add('choir', p.t(S, 9), 3 * bar, [55, 62, 67, 70], 0.6)
    p.add('pad', p.t(S, 9), 3 * bar, [67, 70, 74], 0.4)
    snare_roll(p, S, 11, 12, 16, 0.75, 1.0)

    chorus('CHORUS2', True)

    # ── outro: the riff again, the lead sings over it, and a tom fill closes the loop
    riff_section(p, 'OUTRO', hats_first=False, outro=True)
    melody(p, 'lead', 'OUTRO', 0, [(0, 3, 79), (3, 1, 80), (4, 4, 79), (8, 3, 77), (11, 1, 75), (12, 4, 74),
                                   (16, 3, 79), (19, 1, 82), (20, 4, 80), (24, 4, 79)], vel=0.75)
    return p


PARTS = {'intro': build_intro(), 'loop': build_loop()}
NAMES = ['gtrL', 'gtrR', 'gswell', 'bass', 'kick', 'snare', 'toms', 'hats', 'cym', 'pad', 'choir',
         'arp', 'lead', 'brass', 'fx']


# ---------------------------------------------------------------- rendering


class Buf:
    """Mono or stereo buffer; circular parts fold their tail onto the start."""

    def __init__(self, n, circular, ch=2):
        self.n = n
        self.circular = circular
        self.x = np.zeros((ch, n + int(TAIL * SR)))

    def add(self, sig, t, pan=0.0, gain=1.0):
        if sig.ndim == 1:
            if self.x.shape[0] == 1:
                st = sig[None, :] * gain
            else:
                th = (pan + 1.0) * np.pi / 4.0
                st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * gain
        else:
            st = sig * gain
        i0 = int(round(t * SR))
        if i0 < 0:
            if self.circular:
                self.x[:, self.n + i0:self.n] += st[:, :-i0]
            st = st[:, -i0:]
            i0 = 0
        end = min(i0 + st.shape[1], self.x.shape[1])
        if end > i0:
            self.x[:, i0:end] += st[:, :end - i0]

    def done(self):
        if not self.circular:
            return self.x
        out = self.x[:, :self.n].copy()
        tail = self.x[:, self.n:]
        out[:, :tail.shape[1]] += tail
        return out


def jit(rng, sd=0.003, lim=0.008):
    return float(np.clip(rng.normal(0.0, sd), -lim, lim))


def vel(rng, v, sd=0.06):
    return float(np.clip(v * (1.0 + rng.normal(0.0, sd)), 0.05, 1.2))


def delay(x, circular, delay_s, fb, repeats=6, lp=2800.0):
    if circular:
        return mt.pingpong(x, delay_s, fb, repeats, lp, circular=True)
    return mt.pingpong(x, delay_s, fb, repeats, lp, circular=False)


def render(task):
    part, name = task
    p = PARTS[part]
    circ = part == 'loop'
    rng = np.random.default_rng(zlib.crc32(f'{part}-{name}'.encode()))
    ev = p.ev
    out = Buf(p.n, circ)

    if name in ('gtrL', 'gtrR'):
        di = Buf(p.n, circ, ch=1)
        det = -3.0 if name == 'gtrL' else 3.0
        for t, dur, notes, mute in ev['gtr']:
            di.add(mt.guitar_di(notes, dur, mute, rng, det), t + jit(rng, 0.0025, 0.006), gain=vel(rng, 1.0, 0.04))
        x = di.done()[0] * 0.45
        y = mt.cab_sim(mt.amp_sim(x))
        pan = -0.92 if name == 'gtrL' else 0.92
        th = (pan + 1.0) * np.pi / 4.0
        return np.vstack([y * np.cos(th), y * np.sin(th)]).astype(np.float32)

    if name == 'gswell':
        di = Buf(p.n, circ, ch=1)
        env = np.zeros(di.x.shape[1])
        for t, dur, notes, v in ev['gswell']:
            di.add(mt.guitar_di(notes, dur + 0.2, 0.0, rng), t)
            i0, n = int(t * SR), int(dur * SR)
            shape = np.linspace(0.0, 1.0, n) ** 2.2 * v
            env[i0:i0 + n] = np.maximum(env[i0:i0 + n], shape)
            cut = int(0.03 * SR)
            env[i0 + n:i0 + n + cut] = np.maximum(env[i0 + n:i0 + n + cut], np.linspace(v, 0, cut))
        x = di.done()[0] * 0.45
        e = env[:x.size] if not circ else env[:p.n]
        y = mt.cab_sim(mt.amp_sim(x)) * e
        return np.vstack([y, y]).astype(np.float32) * 0.7

    if name == 'bass':
        sub, grit = Buf(p.n, circ, ch=1), Buf(p.n, circ, ch=1)
        for t, dur, midi, mute in ev['bass']:
            tt = t + jit(rng, 0.002, 0.005)
            s, g = mt.bass_di(midi, dur, mute, rng)
            sub.add(s, tt)
            grit.add(g, tt)
        s, g = mt.bass_amp(sub.done()[0] * 0.8, grit.done()[0] * 0.8)
        y = 0.62 * s + 0.6 * g
        return np.vstack([y, y]).astype(np.float32) * 0.7

    if name == 'kick':
        for t, v in ev['kick']:
            out.add(mt.kick(vel(rng, v, 0.04), rng), t + jit(rng, 0.002, 0.005))
    elif name == 'snare':
        for t, v in ev['snare']:
            out.add(mt.snare(vel(rng, v, 0.05), rng), t + jit(rng, 0.002, 0.005))
    elif name == 'toms':
        for t, f, v in ev['tom']:
            pan = float(np.clip((f - 120.0) / 120.0, -0.5, 0.5))
            out.add(mt.tom(f, vel(rng, v), rng), t + jit(rng, 0.002, 0.005), pan)
    elif name == 'hats':
        for args in ev['hat']:
            t, v = args[0], args[1]
            op = args[2] if len(args) > 2 else False
            out.add(mt.hat(vel(rng, v, 0.08), rng, op), t + jit(rng, 0.003, 0.006), 0.35)
    elif name == 'cym':
        side = 1.0
        for t, v in ev['crash']:
            side = -side
            out.add(mt.crash(vel(rng, v, 0.05), rng), t + jit(rng, 0.002, 0.005), 0.45 * side)
        for t, v in ev['china']:
            out.add(mt.china(vel(rng, v, 0.06), rng), t + jit(rng, 0.002, 0.005), gain=0.8)
        for t, v in ev['ride']:
            out.add(mt.ride(vel(rng, v, 0.08), rng), t + jit(rng, 0.003, 0.006), 0.4)
    elif name == 'pad':
        for t, dur, notes, v in ev['pad']:
            for i, m in enumerate(notes):
                pan = -0.6 + 1.2 * i / max(1, len(notes) - 1)
                s = sy.strings_note(m, dur, vel(rng, v, 0.04), rng, voices=4, attack=0.9, release=1.4,
                                    bright=0.55, spread=12.0)
                out.add(s, t + jit(rng), pan)
    elif name == 'choir':
        for t, dur, notes, v in ev['choir']:
            for i, m in enumerate(notes):
                pan = 0.5 - 1.0 * i / max(1, len(notes) - 1)
                out.add(sy.choir_note(m, dur, vel(rng, v, 0.04), rng, attack=0.7, release=1.2), t + jit(rng), pan)
    elif name == 'arp':
        for i, (t, dur, midi, v) in enumerate(ev['arp']):
            out.add(mt.pluck(midi, dur, vel(rng, v, 0.08), rng), t + jit(rng, 0.002, 0.004), 0.3 if i % 2 else -0.3)
        x = out.done()
        return (x + delay(x, circ, 3 * STEP, 0.42, 6, 2600.0)).astype(np.float32)
    elif name == 'lead':
        for kind, pan in (('lead', 0.0), ('harm', 0.0)):
            prev, last_end = None, -1.0
            for t, dur, midi, v in ev[kind]:
                p_prev = prev if t - last_end < 0.12 else None
                s = mt.lead(midi, dur, vel(rng, v, 0.04), rng, p_prev)
                out.add(s, t + jit(rng, 0.003, 0.006), pan, 1.0 if kind == 'lead' else 0.8)
                prev, last_end = midi, t + dur
        x = out.done()
        return (x + delay(x, circ, 3 * STEP, 0.38, 6, 2600.0)).astype(np.float32)
    elif name == 'brass':
        for t, dur, notes, v in ev['brass']:
            for m in notes:
                out.add(sy.brass_note(m, dur, vel(rng, v), rng, kind='trombone', release=0.35), t + jit(rng))
    elif name == 'fx':
        for t, v in ev['sub']:
            out.add(mt.sub_drop(v), t)
        for t_end, dur, v in ev['riser']:
            out.add(mt.riser(dur, v, rng), t_end - dur, 0.0)
        for t_end, dur, v in ev['swell']:
            out.add(sy.cymbal(rng, swell=dur, vel=v), t_end - dur - 0.05)
    return out.done().astype(np.float32)


# ---------------------------------------------------------------- mix

GAIN = {'gtrL': 0.42, 'gtrR': 0.42, 'gswell': 0.35, 'bass': 0.55, 'kick': 0.42, 'snare': 0.55, 'toms': 0.5,
        'hats': 0.7, 'cym': 0.45, 'pad': 0.5, 'choir': 0.55, 'arp': 0.5, 'lead': 0.6, 'brass': 0.35, 'fx': 0.6}
ROOM = {'kick': 0.05, 'snare': 0.3, 'toms': 0.3, 'hats': 0.12, 'cym': 0.15, 'gtrL': 0.06, 'gtrR': 0.06,
        'gswell': 0.1}
HALL = {'snare': 0.16, 'toms': 0.12, 'cym': 0.08, 'gswell': 0.3, 'pad': 0.45, 'choir': 0.5, 'arp': 0.45,
        'lead': 0.5, 'brass': 0.3, 'fx': 0.35}


def reverb(x, ir, circular):
    if circular:
        return sy.reverb_circular(x, ir)
    pad = np.zeros((2, ir.shape[1]))
    return sy.reverb_circular(np.concatenate([x, pad], axis=1), ir)[:, :x.shape[1]]


def duck_env(kick_buf, circular):
    """Sidechain envelope from the kick: fast attack, ~90 ms release."""
    a = np.abs(kick_buf).max(axis=0)
    w = int(0.012 * SR)
    k = np.ones(w) / w
    if circular:
        a = np.concatenate([a[-w:], a, a[:w]])
        s = np.convolve(a, k, mode='same')[w:-w]
    else:
        s = np.convolve(a, k, mode='same')
    s /= s.max() + 1e-9
    # release: one-pole in blocks (vectorised decay per 64-sample block)
    blk = 64
    nb = int(np.ceil(s.size / blk))
    m = np.concatenate([s, np.zeros(nb * blk - s.size)]).reshape(nb, blk).max(axis=1)
    rel = np.exp(-blk / (0.09 * SR))
    out = np.empty(nb)
    acc = 0.0
    for _ in range(2 if circular else 1):
        for i in range(nb):
            acc = max(m[i], acc * rel)
            out[i] = acc
    return np.repeat(out, blk)[:s.size]


BANDS = ((20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 8000), (8000, 16000))


def band_levels(x, relative=False):
    """Energy per band in dB (absolute, or relative to the total)."""
    spec = np.abs(np.fft.rfft(x.mean(axis=0))) ** 2
    f = np.fft.rfftfreq(x.shape[1], 1.0 / SR)
    ref = spec.sum() if relative else x.shape[1] ** 2
    return ' '.join('%+.0f' % (10 * np.log10(spec[(f >= lo) & (f < hi)].sum() / ref + 1e-12)) for lo, hi in BANDS)


def mix_part(bufs, circular, stats=True):
    dry = 0.0
    room = 0.0
    hall = 0.0
    env = duck_env(bufs['kick'], circular)
    for name in NAMES:
        b = bufs[name].astype(np.float64) * GAIN[name]
        if name == 'bass':
            b *= 1.0 - 0.5 * env
        elif name in ('gtrL', 'gtrR'):
            b *= 1.0 - 0.12 * env
        if stats:
            print(f'   {name:7s} rms {sy.db(np.sqrt((b ** 2).mean())):6.1f} dB  peak {sy.db(np.abs(b).max()):6.1f}'
                  f'  bands(abs) {band_levels(b)}')
        dry = dry + b
        room = room + b * ROOM.get(name, 0.0)
        hall = hall + b * HALL.get(name, 0.0)
    wet = reverb(room, sy.make_ir(seconds=1.2, rt60=0.7, predelay=0.006, seed=11), circular) * 0.8
    wet = wet + reverb(hall, sy.make_ir(seconds=4.0, rt60=3.0, predelay=0.03, seed=7), circular)
    mix = dry + wet
    mix = sy.fft_filter(mix, lambda f: sy.hp_mag(f, 32.0, 2) * mt.peak_mag(f, 300.0, -1.5, 0.8)
                        * mt.peak_mag(f, 55.0, -2.5, 0.5) * sy.lp_mag(f, 10000.0, 2))
    return mix


def master(x, circular):
    y = sy.limiter(x, -2.0) if circular else sy.limiter(np.concatenate([x, np.zeros((2, 4096))], axis=1), -2.0)[:, :x.shape[1]]
    return sy.soft_clip(y, -1.3)


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    tasks = [(part, name) for part in ('loop', 'intro') for name in NAMES]
    with Pool(6) as pool:
        res = pool.map(render, tasks)
    bufs = {part: {} for part in PARTS}
    for (part, name), b in zip(tasks, res):
        bufs[part][name] = b
    del res
    print('loop tracks:')
    loop = mix_part(bufs['loop'], True)
    intro = mix_part(bufs['intro'], False, stats=False)
    del bufs
    g = 10 ** ((TARGET_LUFS - sy.lufs(loop)) / 20)
    loop = master(loop * g, True)
    intro = master(intro * g, False)[:, :PARTS['intro'].n]
    # crossfade the last 8 ms of the intro into the loop's own ending, so the entry is seamless
    xf = int(0.008 * SR)
    w = np.linspace(1.0, 0.0, xf)
    intro[:, -xf:] = intro[:, -xf:] * w + loop[:, -xf:] * (1.0 - w)
    full = np.concatenate([intro, loop], axis=1)
    lp = PARTS['loop']
    sy.analyze(loop, 'loop')
    starts = [int(round(lp.t(sec, b) * SR)) for sec, (_, bars, _) in lp.sections.items() for b in range(bars)][1:]
    print(f'   typical step at other downbeats: median {np.median([np.abs(loop[:, i] - loop[:, i - 1]).max() for i in starts]):.5f}'
          f', max {max(np.abs(loop[:, i] - loop[:, i - 1]).max() for i in starts):.5f}')
    ni = PARTS['intro'].n
    print(f'   intro->loop step {np.abs(full[:, ni] - full[:, ni - 1]).max():.5f}; '
          f'intro RMS {sy.db(np.sqrt((intro ** 2).mean())):.1f} dB')
    print(f'INTRO_SAMPLES={ni} LOOP_SAMPLES={PARTS["loop"].n} total {full.shape[1] / SR:.2f}s')
    wav = os.path.join(out_dir, 'dm.wav')
    sy.write_wav(wav, full)
    mp3 = os.path.join(out_dir, 'dm.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', mp3],
                   check=True)
    # 30 s preview: heavy breakdown, stop, return and the second chorus
    s0 = ni + int(round(lp.t('BREAK', 4) * SR))
    seg = full[:, s0:s0 + 30 * SR].copy()
    fi, fo = int(0.3 * SR), int(1.5 * SR)
    seg[:, :fi] *= np.linspace(0, 1, fi)
    seg[:, -fo:] *= np.linspace(1, 0, fo)
    swav = os.path.join(out_dir, 'dm-muestra.wav')
    sy.write_wav(swav, seg)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', swav, '-codec:a', 'libmp3lame', '-b:a', '160k',
                    os.path.join(out_dir, 'dm-muestra.mp3')], check=True)
    for f in (wav, swav):
        os.remove(f)
    # per-section spectrum, to spot harsh or boomy passages
    for sec, (st, bars, spb) in lp.sections.items():
        a = ni + st * STEP_N
        seg = full[:, a:a + bars * spb * STEP_N]
        print(f'   {sec:8s} rms {sy.db(np.sqrt((seg ** 2).mean())):6.1f} dB  bands {band_levels(seg, True)}')


if __name__ == '__main__':
    main()
