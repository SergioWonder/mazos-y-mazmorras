"""Menu theme «La puerta del juego»: score generator (brief: docs/musica/menu.md).

Writes build/menu.mid (one MIDI track per VSCO 2 CE instrument/articulation) and prints a
verification table against the brief (ranges, registers, leitmotif, layers, velocities,
register clashes, parallels, repetition, loop seam). Exits with status 1 if any check fails.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/menu/compose.py
"""
from __future__ import annotations

import math
import os
import random
import sys
from dataclasses import dataclass, field

import mido

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import sfz  # noqa: E402
from estudio.config import library  # noqa: E402

# ── time grid ────────────────────────────────────────────────────────────────
TPB = 480
BEAT = TPB
EIGHTH = BEAT // 2
BAR = 3 * BEAT
BARS = 42
LOOP_END = BARS * BAR
BPM = 108
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per 1/8 bar
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # ±8 ms
HUMAN_VEL = 6
SEED = 108
GUARD = 12                                           # ticks a note stops before a seam/section edge
MAX_VEL = 105
OUT = os.path.join(HERE, 'build', 'menu.mid')

SECTIONS = [('Intro', 1, 4, 4), ('A', 5, 12, 6), ("A'", 13, 20, 7), ('B', 21, 28, 5),
            ('Bridge', 29, 32, 8), ('Return', 33, 40, 10), ('Codetta', 41, 42, 5)]


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


SECTION_TICKS = {tick(first) for _, first, _, _ in SECTIONS if first > 1}

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name) -> int:
    """'F#4' / 'Bb2' / 66 → MIDI number (C4 = 60)."""
    if isinstance(name, int):
        return name
    step, rest = name[0], name[1:]
    acc = 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


# ── score model ──────────────────────────────────────────────────────────────
@dataclass
class Note:
    pitch: int
    ws: int            # written start (ticks)
    dur: int           # written duration (ticks)
    vel: int
    legato: bool = False
    jitter: bool = True
    hv: int = HUMAN_VEL
    tag: str = ''
    start: int = 0     # performed values (after humanization)
    end: int = 0

    @property
    def we(self) -> int:
        return self.ws + self.dur


@dataclass
class Part:
    name: str
    patch: str
    channel: int
    notes: list[Note] = field(default_factory=list)
    cc: dict[int, int] = field(default_factory=dict)

    @property
    def sfz_path(self) -> str:
        return library('VSCO-2-CE', self.patch + '.sfz')

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), vel, **kw)
        self.notes.append(n)
        return n

    def line(self, bar, beat, items, vels, legato=True, tie=False, **kw):
        """Consecutive notes from (bar, beat): items = [(pitch | None for a rest, beats)].
        tie=True merges repeated pitches into one sustained note (common tones)."""
        t = tick(bar, beat)
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        prev = None
        vi = iter(vels)
        for pitch, beats in items:
            length = int(round(beats * BEAT))
            if pitch is None:
                prev = None
                t += length
                continue
            v = next(vi)
            if tie and prev is not None and prev.pitch == P(pitch) and prev.we == t:
                prev.dur += length
            else:
                prev = Note(P(pitch), t, length, v, legato=legato, **kw)
                self.notes.append(prev)
            t += length

    def chord(self, bar, beat, pitches, beats, vel, roll_ms=0, **kw):
        step = int(round(roll_ms / 1000 / SEC_PER_TICK))
        jitter = kw.pop('jitter', True) and step == 0   # a rolled chord is already spread
        for i, p in enumerate(pitches):
            self.notes.append(Note(P(p), tick(bar, beat) + i * step, int(round(beats * BEAT)) - i * step,
                                   vel + i, jitter=jitter, **kw))

    def arp(self, bar, events, vels, beats=0.5):
        """Harp arpeggio: events = [(beat, pitch)], each an eighth unless the next one is later."""
        vels = vels if isinstance(vels, list) else [vels] * len(events)
        for (beat, pitch), v in zip(events, vels):
            self.add(bar, beat, pitch, beats, v)

    def curve(self, points, shape='cos'):
        """CC11 breakpoints [(bar, beat, value)], sampled on the 1/8-bar grid."""
        pts = [(tick(b, bt), v) for b, bt, v in points]
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            g = (t0 // CC_STEP) * CC_STEP
            while g <= t1:
                x = 0.0 if t1 == t0 else min(1.0, max(0.0, (g - t0) / (t1 - t0)))
                if shape == 'cos':
                    x = (1 - math.cos(math.pi * x)) / 2
                self.cc[g] = int(round(v0 + (v1 - v0) * x))
                g += CC_STEP
        last_t, last_v = pts[-1]
        self.cc[(last_t // CC_STEP) * CC_STEP] = last_v


# Score order. Each articulation of a section is its own track (and VSCO patch).
LAYOUT = [
    ('Flute Sus', 'FluteSusVib'), ('Oboe Sus', 'OboeSusVib'), ('Clarinet Sus', 'ClarinetSus'),
    ('Trompa 1', 'FHornSus'), ('Trompa 2', 'FHornSus'),
    ('Timpani', 'Timpani'), ('Timpani Roll', 'TimpaniRolls'), ('Cymbal', 'GM-StylePerc'),
    ('Glockenspiel', 'Glockenspiel'), ('Harp', 'Harp'),
    ('Violins Sus', 'ViolinEnsSusVib'), ('Violins Sus Quiet', 'ViolinEnsSusVib-Quiet'),
    ('Violas Sus', 'ViolaEnsSusVib'), ('Violas Sus Quiet', 'ViolaEnsSusVib-Quiet'),
    ('Violas Pizz', 'ViolaEnsPizz'), ('Violas Trem', 'ViolaEnsTrem'),
    ('Cellos Sus', 'CelloEnsSusVib'), ('Cellos Sus Quiet', 'CelloEnsSusVib-Quiet'),
    ('Basses Sus', 'ContrabassSusVB'), ('Basses Pizz', 'ContrabassPizz'),
]
SFZ_OF = {name: library('VSCO-2-CE', patch + '.sfz') for name, patch in LAYOUT}
CYMBAL_KEY = 48            # GM-StylePerc.sfz: susCymb1-cresc-Median_v1.wav (lokey=hikey=48)
CYMBAL_PEAK_S = 3.57       # measured RMS peak of that sample, aligned to bar 33 beat 1
TIMP_D2, TIMP_A2 = 38, 45  # Timpani.sfz / TimpaniRolls.sfz regions 36-43 and 44-47


def new_parts() -> dict[str, Part]:
    parts, ch = {}, 0
    for name, patch in LAYOUT:
        if name in ('Timpani', 'Cymbal', 'Glockenspiel', 'Harp', 'Violas Pizz', 'Basses Pizz'):
            channel = 9 if name == 'Cymbal' else 15    # tracks without CC11 share a channel
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, patch, channel)
    return parts


# ── composition ─────────────────────────────────────────────────────────────
def intro(s):
    """Bars 1-4: Bm(add9) | Gmaj7 | Em9 | A7sus4 - A7. Head of the motif as a memory."""
    s['Glockenspiel'].line(1, 1, [('D6', 1), ('A5', 2), ('B5', 1), ('A5', 1), ('F#5', 1)],
                           [48, 44, 47, 45, 42], legato=False)
    h = s['Harp']
    h.chord(1, 1, ['B2', 'F#3', 'B3', 'C#4'], 1, 32, roll_ms=60)
    h.add(1, 2, 'D4', 1, 34)
    h.add(1, 3, 'F#4', 1, 35)
    h.chord(2, 1, ['D3', 'G3', 'B3'], 1, 33, roll_ms=60)
    h.add(2, 2, 'D4', 1, 35)
    h.add(2, 3, 'F#4', 1, 33)
    h.chord(3, 1, ['E3', 'B3', 'D4'], 1, 35, roll_ms=60)
    h.add(3, 2, 'F#4', 1, 37)
    h.add(3, 3, 'B4', 1, 38)
    h.chord(4, 1, ['E3', 'A3', 'D4', 'G4'], 1, 38, roll_ms=60)
    h.add(4, 3, 'C#4', 1, 34)                        # sus4 resolves: the only sound of bar 4 beat 3
    v = s['Violins Sus Quiet']                       # halo of common tones
    v.line(1, 1, [('D5', 9), ('E5', 3)], [30, 31])
    v.line(1, 1, [('F#5', 6), ('G5', 6)], [29, 31])
    v.curve([(1, 1, 62), (3, 3, 70), (4, 1, 74), (4, 3.5, 100), (4, 3.9, 100)])
    c = s['Cellos Sus Quiet']
    c.line(1, 1, [('B2', 3), ('G2', 3), ('E2', 3), ('A2', 3)], [32, 32, 34, 36])
    c.curve([(1, 1, 72), (4, 1, 78), (4, 3.5, 86)])


def section_a(s):
    """Bars 5-12: D | Bm7 | Em7-A7 | D || Gmaj7 | F#m7-B7 | Em7 | A7sus4-A7 (half cadence)."""
    hn = s['Trompa 1']
    hn.line(5, 1, [('D4', 1), ('A4', 2), ('B4', 1), ('A4', 1), ('F#4', 1),
                   ('G4', 1), ('F#4', 1), ('E4', 1), ('D4', 2.5)],
            [58, 64, 65, 62, 58, 62, 59, 56, 56])
    hn.curve([(5, 1, 90), (5, 2, 90), (5, 3, 104), (6, 1, 92), (7, 3, 88),
              (8, 1, 88), (8, 2, 100), (8, 3.5, 78)])
    fl = s['Flute Sus']
    fl.line(9, 1, [('B4', 2), ('D5', 1), ('C#5', 1), ('A4', 1), ('D#5', 1),
                   ('E5', 3), ('E5', 2), ('C#5', 1)],
            [58, 61, 60, 56, 64, 66, 58, 46])
    fl.curve([(9, 1, 88), (10, 1, 92), (11, 1, 90), (11, 2.5, 104), (12, 1, 90), (12, 3.9, 74)])
    h = s['Harp']                                   # never in the octave of the melody (<= C#4)
    pat = {5: [(1, 'D2'), (1.5, 'A2'), (2, 'D3'), (2.5, 'F#3'), (3, 'A3')],
           6: [(1, 'B2'), (1.5, 'D3'), (2, 'F#3'), (2.5, 'A3'), (3, 'B3')],
           7: [(1, 'E2'), (1.5, 'B2'), (2, 'D3'), (2.5, 'G3'), (3, 'A2'), (3.5, 'E3')],
           8: [(1, 'D2'), (1.5, 'A2'), (2, 'E3'), (2.5, 'F#3'), (3, 'A3')],
           9: [(1, 'G2'), (1.5, 'D3'), (2, 'F#3'), (2.5, 'B3')],
           10: [(1, 'F#2'), (1.5, 'C#3'), (2, 'E3'), (2.5, 'A3'), (3, 'B2'), (3.5, 'D#3')],
           11: [(1, 'E2'), (1.5, 'B2'), (2, 'D3'), (2.5, 'G3'), (3, 'B3')],
           12: [(1, 'A2'), (1.5, 'E3'), (2, 'G3'), (2.5, 'A3')]}            # beat 3: breath
    for bar, ev in pat.items():
        h.arp(bar, ev, [41] + [37 + (i % 3) for i in range(len(ev) - 1)])
    va = s['Violas Sus Quiet']                      # guide tones (3rds / 7ths)
    # Bar 10 beat 3: A3 (7th of B7 -> G3), not D#3, which would double the flute's D#5-E5.
    va.line(5, 1, [('F#3', 3), ('A3', 3), ('G3', 3), ('F#3', 6), ('E3', 2), ('A3', 1),
                   ('G3', 6)], [39, 40, 40, 39, 38, 40, 40], tie=True)
    va.curve([(5, 1, 82), (8, 1, 88), (9, 1, 84), (12, 1, 90), (12, 3.9, 78)])
    c = s['Cellos Sus Quiet']
    # Bar 9: G2-E2, so the bass does not follow the flute's D5-C#5 in fifths.
    c.line(5, 1, [('D3', 3), ('B2', 3), ('E2', 2), ('A2', 1), ('D3', 3), ('G2', 2), ('E2', 1),
                  ('F#2', 2), ('B2', 1), ('E2', 2), ('G2', 1), ('A2', 3)],
           [44, 44, 42, 43, 44, 46, 44, 46, 44, 44, 42, 42])
    c.curve([(5, 1, 84), (8, 3, 88), (9, 1, 84), (12, 3, 90), (12, 3.9, 84)])
    b = s['Basses Pizz']
    for bar, p, v in [(5, 'D2', 46), (6, 'B1', 44), (7, 'E2', 45), (8, 'D2', 47),
                      (9, 'G2', 46), (10, 'F#2', 44), (11, 'E2', 45), (12, 'A2', 43)]:
        b.add(bar, 1, p, 1, v)


def section_a2(s):
    """Bars 13-20: Dmaj7 | Gmaj7 | Em9-A13 | Bm (deceptive) || Gmaj7 | E7/G# | A - A/G | F#7sus4-F#7."""
    vn = s['Violins Sus']
    vn.add(12, 3.5, 'A4', 0.5, 60, legato=True)      # anacrusis
    # Bar 19 beat 3 is E5 (not the brief's G5): A-G-F# against the bass A-G-F# would be octaves.
    vn.line(13, 1, [('D5', 1), ('A5', 2), ('B5', 1), ('A5', 1), ('F#5', 1),
                    ('G5', 1), ('F#5', 1), ('E5', 1), ('D5', 3),
                    ('B5', 2), ('A5', 1), ('G#5', 1), ('E5', 1), ('B5', 1),
                    ('A5', 2), ('E5', 1), ('F#5', 2), ('E5', 1)],
            [62, 66, 64, 62, 60, 62, 60, 58, 62, 66, 66, 70, 66, 74, 78, 72, 68, 60])
    vn.curve([(12, 3.5, 84), (13, 1, 84), (14, 2, 92), (15, 3, 88), (16, 1, 90), (16, 3, 86),
              (17, 1, 88), (19, 3, 112), (20, 1, 108), (20, 3.9, 70)])
    hn = s['Trompa 1']                               # countermelody: moves when the tune holds
    hn.line(13, 1, [('F#4', 3), ('D4', 2), ('E4', 3), ('C#4', 1), ('D4', 1), ('F#4', 2),
                    ('G4', 3), ('E4', 2), ('D4', 1), ('C#4', 2), ('E4', 4)],
            [48, 54, 56, 54, 52, 48, 58, 60, 58, 60, 58])
    hn.curve([(13, 1, 84), (13, 2.5, 96), (14, 1, 88), (14, 3, 88), (15, 1, 98), (15, 3, 90),
              (16, 2, 88), (16, 3, 96), (17, 1, 92), (19, 3, 104), (20, 1, 100), (20, 3.9, 64)])
    pz = s['Violas Pizz']                            # ternary lift on beats 2 and 3
    dyads = {13: (['A3', 'F#4'], ['A3', 'C#4']), 14: (['B3', 'F#4'], ['B3', 'D4']),
             15: (['B3', 'D4'], ['C#4', 'F#4']), 16: (['B3', 'D4'], ['B3', 'F#4']),
             17: (['B3', 'D4'], ['D4', 'F#4']), 18: (['B3', 'D4'], ['B3', 'E4']),
             19: (['A3', 'C#4'], ['C#4', 'E4']), 20: (['B3', 'E4'], ['A#3', 'E4'])}
    for bar, (two, three) in dyads.items():
        lift = 2 if bar in (17, 18, 19) else 0
        pz.chord(bar, 2, two, 1, 44 + lift)
        pz.chord(bar, 3, three, 1, 41 + lift)
    h = s['Harp']                                    # never above G#4
    pat = {13: [(1, 'D2'), (1.5, 'A2'), (2, 'D3'), (2.5, 'F#3'), (3, 'A3'), (3.5, 'C#4')],
           14: [(1, 'G2'), (1.5, 'D3'), (2, 'F#3'), (2.5, 'B3'), (3, 'D4')],
           15: [(1, 'E2'), (1.5, 'B2'), (2, 'F#3'), (2.5, 'G3'), (3, 'A2'), (3.5, 'C#4')],
           16: [(1, 'B2'), (1.5, 'F#3'), (2, 'B3'), (2.5, 'D4'), (3, 'F#4')],
           17: [(1, 'G2'), (1.5, 'D3'), (2, 'A3'), (2.5, 'B3'), (3, 'F#4')],
           18: [(1, 'G#2'), (1.5, 'E3'), (2, 'B3'), (2.5, 'D4'), (3, 'E4')],
           19: [(1, 'A2'), (1.5, 'E3'), (2, 'A3'), (2.5, 'C#4'), (3, 'G2'), (3.5, 'E4')],
           20: [(1, 'F#2'), (1.5, 'C#3'), (2, 'B3'), (2.5, 'E4'), (3, 'A#3'), (3.5, 'C#4')]}
    for bar, ev in pat.items():
        base = 44 if bar < 17 else 47
        h.arp(bar, ev, [base] + [base - 4 + (i % 2) * 2 for i in range(len(ev) - 1)])
    c = s['Cellos Sus']                              # own line; G# - A - G - F# in 18-20
    c.line(13, 1, [('D3', 3), ('G2', 3), ('E2', 2), ('A2', 1), ('B2', 2), ('A2', 1),
                   ('G2', 3), ('G#2', 3), ('A2', 2), ('G2', 1), ('F#2', 3)],
           [58, 58, 58, 60, 60, 58, 62, 64, 66, 62, 58])
    c.curve([(13, 1, 92), (16, 3, 92), (17, 1, 94), (19, 3, 106), (20, 3.9, 84)])
    b = s['Basses Pizz']
    for bar, p, v in [(13, 'D2', 48), (14, 'G2', 46), (15, 'E2', 47), (16, 'B1', 50),
                      (17, 'G2', 48), (18, 'G#2', 50), (19, 'A2', 52), (20, 'F#2', 46)]:
        b.add(bar, 1, p, 1, v)
    g = s['Glockenspiel']
    for bar, p, v in [(13, 'D6', 44), (14, 'B5', 43), (15, 'G5', 40)]:
        g.add(bar, 1, p, 1, v)


def section_b(s):
    """Bars 21-28 (B minor, the breath): Bm | Gmaj7 | Em7-F#7 | Bm || Bm/A | Gmaj7 | Em7-C#ø7 | F#7(b9)."""
    cl = s['Clarinet Sus']
    cl.line(21, 1, [('B3', 1), ('F#4', 2), ('G4', 1), ('F#4', 1), ('D4', 1),
                    ('E4', 1), ('D4', 1), ('C#4', 1), ('C#4', 0.75), ('B3', 1.75)],
            [50, 54, 54, 52, 50, 52, 50, 50, 53, 48])
    cl.line(25, 1, [('F#4', 3), ('D4', 3), ('E4', 3), ('C#4', 3)], [30, 30, 32, 28], hv=2)
    cl.curve([(21, 1, 90), (22, 2, 96), (23, 3, 90), (24, 1, 92), (24, 3.5, 70),
              (25, 1, 82), (28, 3.9, 74)])
    ob = s['Oboe Sus']                               # A#4 tied over as Bb4 into bar 29
    ob.line(25, 1, [('D5', 2), ('C#5', 1), ('B4', 2), ('F#4', 1), ('G4', 1), ('A4', 1),
                    ('B4', 1), ('A#4', 4)], [54, 52, 55, 50, 50, 52, 55, 46])
    ob.notes[-1].hv = 2
    ob.curve([(25, 1, 90), (26, 2, 94), (27, 3, 92), (28, 1, 86), (28, 2.5, 108),
              (29, 1, 86), (29, 2, 60)])
    v = s['Violins Sus Quiet']                       # halo above the clarinet, silent in 25-28
    v.line(21, 1, [('D5', 8), ('E5', 1), ('D5', 2.5)], [29, 28, 28])
    v.line(21, 1, [('F#5', 11.5)], [28])
    v.curve([(21, 1, 70), (24, 1, 70), (24, 3.5, 50)])
    h = s['Harp']                                    # rolled chord + one high note on beat 3
    for bar, chord, top in [(21, ['B1', 'F#2', 'D3', 'F#3'], 'D5'), (22, ['G2', 'D3', 'F#3', 'B3'], 'B4'),
                            (23, ['E2', 'B2', 'D3', 'G3'], 'A#4'), (24, ['B1', 'F#2', 'B2', 'D3'], 'B4'),
                            (25, ['A2', 'D3', 'F#3', 'B3'], 'F#5'), (26, ['G2', 'D3', 'A3', 'B3'], 'D5'),
                            (27, ['E2', 'B2', 'G3', 'D4'], 'E5'), (28, ['F#2', 'C#3', 'E3', 'A#3'], 'G4')]:
        h.chord(bar, 1, chord, 2, 32, roll_ms=70)
        h.add(bar, 3, top, 1, 33)
    c = s['Cellos Sus Quiet']
    c.line(21, 1, [('B2', 3), ('G2', 3), ('E2', 2), ('F#2', 1), ('B2', 3), ('A2', 3),
                   ('G2', 3), ('E2', 3), ('F#2', 3)], [40, 38, 38, 40, 40, 38, 38, 38, 40])
    c.curve([(21, 1, 78), (28, 3.9, 74)])


def bridge(s):
    """Bars 29-32: Bbmaj7 (bVI) | Cmaj9 (bVII) | Em9 | A7sus4-A7. Sequence of the head, crescendo."""
    mel = [('D5', 1), ('A5', 2), ('E5', 1), ('B5', 2), ('G5', 1), ('F#5', 1), ('E5', 1)]
    s['Flute Sus'].line(29, 1, mel + [('A5', 1.9)], [60, 62, 62, 64, 66, 66, 64, 70])
    s['Flute Sus'].curve([(29, 1, 76), (32, 2.9, 110)], shape='lin')
    s['Violins Sus'].line(29, 1, mel + [('A5', 3)], [60, 62, 62, 64, 66, 66, 64, 72])
    s['Violins Sus'].curve([(29, 1, 74), (32, 3.9, 118)], shape='lin')
    hn = s['Trompa 1']                               # E4 in bar 30 avoids 5ths with Bb-C in the bass
    hn.line(29, 1, [('F4', 3), ('E4', 3), ('G4', 3), ('A4', 2.5)], [40, 46, 50, 56])
    hn.curve([(29, 1, 64), (29, 2.5, 80), (30, 1, 76), (30, 2.5, 92), (31, 1, 88),
              (31, 2.5, 104), (32, 1, 100), (32, 3.5, 118)])
    tr = s['Violas Trem']
    tr.chord(29, 1, ['A3', 'D4'], 3, 36)
    tr.chord(30, 1, ['G3', 'B3', 'D4'], 3, 44)
    tr.chord(31, 1, ['G3', 'B3', 'D4'], 3, 54)
    tr.add(32, 1, 'G3', 3, 64)                        # B3 held over the bass A (A9sus4), then A7
    tr.chord(32, 1, ['B3', 'D4'], 2, 64, legato=True)
    tr.chord(32, 3, ['A3', 'C#4'], 1, 66)
    tr.curve([(29, 1, 56), (32, 3.9, 118)], shape='lin')
    # Passing B on bar 31 beat 3: E -> A under the tune's E5 -> A5 would be parallel octaves.
    for name, pitches in (('Cellos Sus', ['Bb2', 'C3', 'E2', 'B2', 'A2']),
                          ('Basses Sus', ['Bb1', 'C2', 'E1', 'B1', 'A1'])):
        s[name].line(29, 1, [(p, b) for p, b in zip(pitches, [3, 3, 2, 1, 3])], [50, 54, 60, 58, 66])
        s[name].curve([(29, 1, 72 if name == 'Cellos Sus' else 70),
                       (32, 3.9, 116 if name == 'Cellos Sus' else 114)], shape='lin')
    h = s['Harp']
    h.arp(29, [(1, 'Bb2'), (1.5, 'F3'), (2, 'A3'), (2.5, 'D4'), (3, 'F4'), (3.5, 'A4')],
          [46, 42, 43, 44, 45, 46])
    h.arp(30, [(1, 'C3'), (1.5, 'G3'), (2, 'B3'), (2.5, 'D4')], [48, 44, 45, 46])
    h.add(30, 3, 'E4', 0.9, 47)                      # harp rests in 31: the roll takes over
    scale = [P(n) for n in ('D3', 'E3', 'F#3', 'G3', 'A3', 'B3', 'C#4')]
    gliss = [p + 12 * o for o in range(3) for p in scale] + [P('D6')]
    t0, span = tick(32, 3), int(0.92 * BEAT)
    for i, p in enumerate(gliss):                    # D3 -> D6 in D major (= A mixolydian)
        x = i / (len(gliss) - 1)
        h.notes.append(Note(p, t0 + int(span * x ** 1.15), EIGHTH, 42 + int(20 * x),
                            jitter=False, hv=2, tag='gliss'))
    roll = s['Timpani Roll']
    roll.add(31, 1, TIMP_A2, 6, 70, jitter=False, hv=0)
    roll.curve([(31, 1, 36), (32, 3, 108), (32, 3.9, 120)])
    cym_start = tick(33) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
    s['Cymbal'].notes.append(Note(CYMBAL_KEY, cym_start, tick(33) - cym_start, 72,
                                  jitter=False, hv=0, tag='cymbal'))


def return_section(s):
    """Bars 33-40: D | A/C# | Em7/B-A7 | D || Gmaj7 (climax) | A/G | F#m7-Bm7 | Em7-A7."""
    head = [('D5', 1), ('A5', 2), ('B5', 1), ('A5', 1), ('F#5', 1), ('G5', 1), ('F#5', 1), ('E5', 1)]
    cons = [('D6', 3), ('C#6', 1), ('B5', 1), ('A5', 1), ('A5', 2), ('F#5', 1),
            ('G5', 1), ('F#5', 1), ('E5', 1)]
    head_v = [76, 80, 80, 78, 76, 78, 76, 74]
    cons_v = [95, 82, 78, 75, 72, 69, 66, 62, 58]
    s['Violins Sus'].line(33, 1, head + [('D5', 3)] + cons, head_v + [80] + cons_v)
    s['Flute Sus'].line(33, 1, head + [('D5', 1), ('F#5', .5), ('G5', .5), ('A5', .5), ('B5', .5)] + cons,
                        head_v + [78, 78, 80, 82, 84] + cons_v)
    shape = [(33, 1, 104), (36, 3, 108), (37, 1, 122), (38, 1, 110), (39, 1, 100),
             (40, 1, 92), (40, 3.9, 82)]
    s['Violins Sus'].curve(shape)
    s['Flute Sus'].curve([(b, bt, v - 4) for b, bt, v in shape])
    for name in ('Violins Sus', 'Flute Sus'):        # the climax stays inside f (85-100)
        next(n for n in s[name].notes if n.ws == tick(37)).hv = 3
    h1 = s['Trompa 1']
    # Bars 36 and 39 differ from the brief's sketch (D4 F#4 A4 / A4 F#4), which would move in
    # octaves with the flute run and with the tune: here F#4-A4 and F#4-D4 (tenths).
    h1.line(33, 1, [('F#4', 3), ('E4', 2), ('C#4', 1), ('D4', 2), ('C#4', 1), ('F#4', 2),
                    ('A4', 1), ('B4', 3), ('A4', 3), ('F#4', 2), ('D4', 1),
                    ('E4', 2), ('C#4', 0.5), (None, 0.5), ('D4', 1), ('A4', 2)],
            [62, 70, 66, 70, 66, 64, 66, 90, 77, 72, 68, 66, 60, 50, 46])
    h1.curve([(33, 1, 96), (36, 3, 100), (37, 1, 116), (38, 1, 104), (39, 1, 96),
              (40, 1, 90), (40, 3.5, 80), (41, 1, 84), (41, 2, 80), (41, 3.9, 52)])
    h2 = s['Trompa 2']                               # thirds / sixths under Trompa 1
    # B3 held through bar 35 (9th of A7 on beat 3) avoids 5ths with the tune's F#5-E5.
    # A3 in bar 34 (not C#4): no octaves with the bass D-C# and no doubled leading tone.
    h2.line(33, 1, [('D4', 3), ('A3', 3), ('B3', 3), ('D4', 3),
                    ('B3', 3), ('C#4', 3)], [56, 56, 58, 56, 72, 59])
    h2.curve([(33, 1, 90), (36, 3, 94), (37, 1, 110), (38, 1, 98), (38, 3.9, 84)])
    va = s['Violas Sus']                             # two voices; 9-8 suspension E4-D4 in bar 36
    va.line(33, 1, [('F#3', 3), ('A3', 3), ('G3', 3), ('F#3', 3)], [66, 68, 68, 70])
    va.line(37, 1, [('F#3', 3), ('A3', 6), ('G3', 3)], [80, 72, 66], tie=True)
    va.line(33, 1, [('A3', 3), ('E4', 7), ('D4', 2)], [66, 64, 68])
    va.line(37, 1, [('D4', 3), ('E4', 5), ('F#4', 1), ('E4', 3)], [80, 70, 66, 64])
    va.curve([(33, 1, 96), (36, 3, 100), (37, 1, 112), (38, 1, 102), (40, 3.9, 88)])
    for name, octave, top in (('Cellos Sus', 0, 118), ('Basses Sus', -12, 116)):
        # A arrives on beat 2 of bar 35 (A9sus4 -> A7): B-A under F#5-E5 would be parallel 5ths.
        line = [('D3', 3), ('C#3', 3), ('B2', 1), ('A2', 2), ('D3', 3), ('G2', 6),
                ('F#2', 2), ('B2', 1), ('E2', 2), ('A2', 1)]
        s[name].line(33, 1, [(P(p) + octave, b) for p, b in line],
                     [76, 74, 72, 70, 76, 90, 74, 72, 70, 66])
        s[name].curve([(33, 1, top - 14), (37, 1, top), (38, 1, top - 10), (39, 1, top - 18),
                       (40, 3.9, top - 28)])
    h = s['Harp']
    pat = {33: [(1, 'D2'), (1.5, 'A2'), (2, 'D3'), (2.5, 'F#3'), (3, 'A3'), (3.5, 'D4')],
           34: [(1, 'C#3'), (1.5, 'E3'), (2, 'A3'), (2.5, 'C#4'), (3, 'E4')],
           35: [(1, 'B2'), (1.5, 'E3'), (2, 'G3'), (2.5, 'D4'), (3, 'A2'), (3.5, 'C#4')],
           36: [(1, 'D2'), (1.5, 'A2'), (2, 'F#3'), (2.5, 'A3'), (3, 'D4'), (3.5, 'F#4')],
           37: [(1, 'G2'), (1.5, 'D3'), (2, 'B3'), (2.5, 'D4'), (3, 'F#4'), (3.5, 'A4')],
           38: [(1, 'G2'), (1.5, 'E3'), (2, 'A3'), (2.5, 'C#4'), (3, 'E4'), (3.5, 'A4')],
           39: [(1, 'F#2'), (1.5, 'C#3'), (2, 'E3'), (2.5, 'A3'), (3, 'B2'), (3.5, 'F#3')],
           40: [(1, 'E2'), (1.5, 'B2'), (2, 'D3'), (2.5, 'G3'), (3, 'A2'), (3.5, 'C#4')]}
    level = {33: 56, 34: 56, 35: 58, 36: 60, 37: 66, 38: 62, 39: 58, 40: 54}
    for bar, ev in pat.items():
        h.arp(bar, ev, [level[bar]] + [level[bar] - 5 + (i % 2) * 2 for i in range(len(ev) - 1)])
    tp = s['Timpani']
    for bar, beat, p, beats, v in [(33, 1, TIMP_D2, 1, 76), (35, 3, TIMP_A2, 1, 64),
                                   (36, 1, TIMP_D2, 1, 72), (37, 1, TIMP_D2, 2, 92)]:
        tp.add(bar, beat, p, beats, v, hv=3 if bar == 37 else HUMAN_VEL)
    g = s['Glockenspiel']
    g.add(33, 1, 'D6', 1, 50)
    g.add(34, 1, 'B5', 1, 48)
    g.chord(37, 1, ['D6', 'E6'], 1, 56)


def codetta(s):
    """Bars 41-42: D(add9) | Gmaj7(#11)/D, pedal D; plagal and Lydian, back to Bm(add9) at bar 1."""
    v = s['Violins Sus Quiet']
    v.line(41, 1, [('D5', 3), ('F#5', 2)], [32, 28])
    v.curve([(41, 1, 80), (42, 1, 70), (42, 3, 36)])
    h = s['Harp']
    h.chord(41, 1, ['D3', 'A3', 'E4', 'F#4'], 2, 33, roll_ms=60)
    h.arp(42, [(1, 'G3'), (1.5, 'B3'), (2, 'D4'), (2.5, 'F#4'), (3, 'C#5'), (3.5, 'A5')],
          [34, 35, 36, 37, 38, 40])
    s['Glockenspiel'].add(42, 1, 'C#6', 1, 32)
    c = s['Cellos Sus Quiet']
    c.add(41, 1, 'D3', 6, 34)
    c.curve([(41, 1, 80), (42, 3, 30), (42, 3.9, 20)])
    s['Basses Pizz'].add(41, 1, 'D2', 1, 36)


# ── performance: humanization, legato, seams ─────────────────────────────────
def perform(parts: dict[str, Part]):
    rng = random.Random(SEED)
    for part in parts.values():
        part.notes.sort(key=lambda n: (n.ws, n.pitch))
        for n in part.notes:
            lo = 0 if n.ws in SECTION_TICKS or n.ws == 0 else -HUMAN_TICKS
            d = rng.randint(lo, HUMAN_TICKS) if n.jitter else 0
            n.start = max(0, n.ws + d)
            n.end = n.start + n.dur
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
            n.vel = max(1, min(MAX_VEL, n.vel))
        starts = {}
        for n in part.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = starts.get(n.we, [])
            if any(m.pitch == n.pitch for m in nxt):
                n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
            elif n.legato and nxt:
                n.end = min(m.start for m in nxt) + rng.randint(9, 26)   # 10-30 ms overlap
        for n in part.notes:
            for b in SECTION_TICKS:                  # tracks that stop at a section edge
                if n.we == b and b not in starts:
                    n.end = min(n.end, b - GUARD)
            n.end = min(n.end, LOOP_END - GUARD)
        by_pitch = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = by_pitch.get(n.pitch)
            if prev is not None and prev.end > n.start - 6:
                prev.end = n.start - 6
            by_pitch[n.pitch] = n


def build() -> dict[str, Part]:
    s = new_parts()
    for section in (intro, section_a, section_a2, section_b, bridge, return_section, codetta):
        section(s)
    perform(s)
    return s


def write_midi(path: str = OUT) -> dict[str, Part]:
    parts = build()
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=3, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='D', time=0))
        events = []
        for t, v in sorted(part.cc.items()):
            events.append((t, 1, mido.Message('control_change', channel=part.channel, control=11, value=v)))
        for n in part.notes:
            events.append((n.start, 2, mido.Message('note_on', channel=part.channel, note=n.pitch, velocity=n.vel)))
            events.append((n.end, 0, mido.Message('note_off', channel=part.channel, note=n.pitch, velocity=0)))
        now = 0
        for t, _, msg in sorted(events, key=lambda e: (e[0], e[1])):
            tr.append(msg.copy(time=t - now))
            now = t
        tr.append(mido.MetaMessage('end_of_track', time=LOOP_END - now))
        mid.tracks.append(tr)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    mid.save(path)
    return parts


# ── verification ─────────────────────────────────────────────────────────────
# Registers of the brief's section 6, per track and bar range. Deviations, all deliberate:
# Basses Pizz B1 (35) on the Bm bars 6 and 16 (the deceptive cadence needs B in the bass);
# Trompa 1 C#4 (61) in A' as in the brief's own example, and E4 (64) in bar 30 to avoid 5ths;
# Cellos Sus Quiet E2-G2 in B as listed by the brief (its "45-47" column omits them).
REGISTERS = [
    ('Glockenspiel', 1, 2, 78, 86), ('Glockenspiel', 13, 15, 79, 86),
    ('Glockenspiel', 33, 37, 81, 88), ('Glockenspiel', 42, 42, 85, 85),
    ('Harp', 1, 4, 47, 78), ('Harp', 5, 12, 38, 61), ('Harp', 13, 20, 38, 68),
    ('Harp', 21, 28, 35, 78), ('Harp', 29, 31, 38, 74), ('Harp', 32, 32, 38, 86),
    ('Harp', 33, 40, 38, 74), ('Harp', 41, 42, 50, 81),
    ('Violins Sus Quiet', 1, 4, 74, 81), ('Violins Sus Quiet', 21, 24, 74, 78),
    ('Violins Sus Quiet', 41, 42, 74, 78),
    ('Cellos Sus Quiet', 1, 4, 40, 47), ('Cellos Sus Quiet', 5, 12, 38, 50),
    ('Cellos Sus Quiet', 21, 28, 40, 47), ('Cellos Sus Quiet', 41, 42, 50, 50),
    ('Trompa 1', 5, 8, 62, 71), ('Trompa 1', 13, 20, 61, 69), ('Trompa 1', 29, 32, 64, 69),
    ('Trompa 1', 33, 40, 61, 71), ('Trompa 1', 41, 41, 62, 69),
    ('Trompa 2', 33, 38, 57, 62),
    ('Flute Sus', 9, 12, 69, 76), ('Flute Sus', 29, 40, 74, 86),
    ('Violas Sus Quiet', 5, 12, 50, 57), ('Violas Pizz', 13, 20, 57, 66),
    ('Violas Trem', 29, 32, 53, 62), ('Violas Sus', 33, 40, 53, 66),
    ('Basses Pizz', 5, 20, 35, 45), ('Basses Pizz', 41, 41, 38, 38),
    ('Violins Sus', 12, 20, 69, 83), ('Violins Sus', 29, 32, 74, 83), ('Violins Sus', 33, 40, 74, 86),
    ('Cellos Sus', 13, 20, 38, 50), ('Cellos Sus', 29, 32, 40, 48), ('Cellos Sus', 33, 40, 40, 50),
    ('Basses Sus', 29, 32, 28, 36), ('Basses Sus', 33, 40, 28, 38),
    ('Clarinet Sus', 21, 28, 59, 67), ('Oboe Sus', 25, 28, 66, 74),
    ('Timpani Roll', 31, 32, 45, 45), ('Timpani', 33, 37, 38, 45), ('Cymbal', 30, 30, 48, 48),
]
CEILINGS = {'Violins Sus': 86, 'Violins Sus Quiet': 86, 'Flute Sus': 86, 'Trompa 1': 71, 'Trompa 2': 71}

# Melodies of section 5/6 (track set, from tick, to tick) for the register-clash rule.
MELODIES = [
    (('Glockenspiel',), tick(1), tick(3)), (('Trompa 1',), tick(5), tick(9)),
    (('Flute Sus',), tick(9), tick(12, 3.5)), (('Violins Sus',), tick(12, 3.5), tick(21)),
    (('Clarinet Sus',), tick(21), tick(25)), (('Oboe Sus',), tick(25), tick(29)),
    (('Flute Sus', 'Violins Sus'), tick(29), tick(41)), (('Trompa 1',), tick(41), tick(42)),
]
DOUBLINGS = {frozenset({'Flute Sus', 'Violins Sus'}), frozenset({'Cellos Sus', 'Basses Sus'})}
VOICES = ['Flute Sus', 'Oboe Sus', 'Clarinet Sus', 'Trompa 1', 'Trompa 2', 'Violins Sus',
          'Violins Sus Quiet', 'Violas Sus', 'Violas Sus Quiet', 'Violas Trem', 'Cellos Sus',
          'Cellos Sus Quiet', 'Basses Sus']
MOTIF = [62, 69, 71, 69, 66, 67, 66, 64, 62]
MOTIF_ONSETS = [0, 1, 3, 4, 5, 6, 7, 8, 9]          # in beats: q h | q q q | q q q | h.


def sec(t: int) -> float:
    return t * SEC_PER_TICK


def name_of(p: int) -> str:
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p % 12] + str(p // 12 - 1)


def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
            for k in range(r.lokey, r.hikey + 1)}


def bar_of(t: int) -> int:
    return t // BAR + 1


def notes_in(part: Part, t0: int, t1: int) -> list[Note]:
    return sorted((n for n in part.notes if t0 <= n.ws < t1), key=lambda n: (n.ws, n.pitch))


def sounding(parts, t0, t1):
    """Max number of tracks with a note sounding at once inside [t0, t1)."""
    cuts = sorted({t0} | {min(t1, max(t0, x)) for p in parts.values() for n in p.notes
                          for x in (n.start, n.end)})
    worst, where = 0, t0
    for a, b in zip(cuts, cuts[1:]):
        if b <= a:
            continue
        mid = (a + b) / 2
        k = sum(any(n.start <= mid < n.end for n in p.notes) for p in parts.values())
        if k > worst:
            worst, where = k, a
    return worst, where


def verify(parts: dict[str, Part]) -> bool:
    ok_all = True
    rows = []

    def check(label, ok, detail=''):
        nonlocal ok_all
        ok_all &= bool(ok)
        rows.append((label, 'OK' if ok else 'FAIL', detail))

    # per-track table
    print(f"\n{'track':<18} {'VSCO patch':<24} {'notes':>5}  {'range used':<15} {'instrument':<11} in")
    for name, part in parts.items():
        keys = sfz_keys(part.sfz_path)
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        inside = all(n.pitch in keys for n in part.notes)
        print(f'{name:<18} {part.patch:<24} {len(part.notes):>5}  '
              f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})'.ljust(70)[:70] +
              f' {min(keys)}-{max(keys)}'.ljust(12) + (' yes' if inside else ' NO'))
        if not inside:
            bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
            raise SystemExit(f'{name}: notes outside {part.patch}.sfz: {bad}')

    # 1. tempo, meter, length
    starts_ok = all(sec(n.start) < 70.0 and sec(n.end) < 70.0 for p in parts.values() for n in p.notes)
    check('1  42 bars 3/4 at 108, nothing starts after 70.00 s', starts_ok,
          f'loop = {sec(LOOP_END):.4f} s, tempo {TEMPO} us/beat')
    # 2. registers and ceilings
    bad = []
    for name, b0, b1, lo, hi in REGISTERS:
        for n in parts[name].notes:
            if b0 <= bar_of(n.ws) <= b1 and not lo <= n.pitch <= hi:
                bad.append(f'{name} b{bar_of(n.ws)} {name_of(n.pitch)}')
    for name, part in parts.items():
        for n in part.notes:
            if n.tag != 'gliss' and not any(r[0] == name and r[1] <= bar_of(n.ws) <= r[2] for r in REGISTERS):
                bad.append(f'{name} b{bar_of(n.ws)} has no register entry')
            if n.pitch > CEILINGS.get(name, 127):
                bad.append(f'{name} above ceiling: {name_of(n.pitch)}')
    glock = [n.pitch for n in parts['Glockenspiel'].notes]
    check('2  section-6 registers and ceilings (vn/fl <= 86, hn <= 71, glock 78-88)',
          not bad and 78 <= min(glock) and max(glock) <= 88, '; '.join(bad[:4]))
    # 3. leitmotif pitches (and canonical rhythm) in the four places
    places = [('Trompa 1', 5, MOTIF), ('Violins Sus', 13, [p + 12 for p in MOTIF]),
              ('Clarinet Sus', 21, None), ('Violins Sus', 33, [p + 12 for p in MOTIF]),
              ('Flute Sus', 33, [p + 12 for p in MOTIF])]
    for name, bar, want in places:
        got = notes_in(parts[name], tick(bar), tick(bar + 4))
        pitches = [n.pitch for n in got]
        if want is None:
            want = [59, 66, 67, 66, 62, 64, 62, 61, 61, 59]
            okp = pitches == want
        else:
            if name == 'Flute Sus':
                pitches = pitches[:9]
            onsets = [(n.ws - tick(bar)) / BEAT for n in got[:9]]
            okp = pitches == want and onsets == MOTIF_ONSETS
        check(f'3  motif in {name} bars {bar}-{bar + 3}', okp, ' '.join(map(str, pitches)))
    extra = [('Glockenspiel', 1, 2, [86, 81, 83, 81, 78]), ('Flute Sus', 29, 3, [74, 81, 76, 83, 79, 78, 76]),
             ('Violins Sus', 29, 3, [74, 81, 76, 83, 79, 78, 76]),
             ('Violins Sus', 37, 4, [86, 85, 83, 81, 81, 78, 79, 78, 76]), ('Trompa 1', 41, 1, [62, 69])]
    for name, bar, nbars, want in extra:
        got = [n.pitch for n in notes_in(parts[name], tick(bar), tick(bar + nbars))]
        check(f'3+ section-5 entry {name} bar {bar}', got == want, ' '.join(map(str, got)))
    # 4. nothing shorter than an eighth (except the bar-32 glissando)
    short = [(p.name, bar_of(n.ws)) for p in parts.values() for n in p.notes
             if n.tag != 'gliss' and (n.dur < EIGHTH or n.end - n.start < EIGHTH - 2 * HUMAN_TICKS - GUARD)]
    gaps = []
    for p in parts.values():
        ons = sorted({n.ws for n in p.notes if n.tag != 'gliss'})
        clusters = [t for i, t in enumerate(ons) if i == 0 or t - ons[i - 1] > 100]
        gaps += [(p.name, bar_of(b)) for a, b in zip(clusters, clusters[1:]) if b - a < EIGHTH]
    check('4  no figure shorter than an eighth (gliss excepted)', not short and not gaps,
          str((short + gaps)[:4]))
    # 5. layers per section
    for label, first, last, limit in SECTIONS:
        worst, where = sounding(parts, tick(first), tick(last + 1))
        check(f'5  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit,
              f'max {worst} at bar {bar_of(where)}')
    # 6. register clashes against the melodies
    clashes = []
    for tracks, t0, t1 in MELODIES:
        mel = [Note(n.pitch, n.ws, n.dur, n.vel, start=n.start, end=min(n.end, t1 + 40))
               for t in tracks for n in parts[t].notes if t0 <= n.ws < t1]   # clipped to the window
        for name, part in parts.items():
            if name in tracks or (name == 'Clarinet Sus' and tracks == ('Oboe Sus',)):
                continue
            for o in part.notes:
                if o.end - o.start < BEAT - 40:
                    continue
                over = [m for m in mel if min(m.end, o.end) - max(m.start, o.start) > 40]
                near = [m for m in over if abs(m.pitch - o.pitch) <= 11]
                if near and o.vel >= max(m.vel for m in near):
                    clashes.append(f'{name} {name_of(o.pitch)} v{o.vel} b{bar_of(o.ws)}')
    check('6  no register clash with the melody', not clashes, '; '.join(clashes[:4]))
    cl = [n for n in parts['Clarinet Sus'].notes if tick(25) <= n.ws < tick(29)]
    ob = [n for n in parts['Oboe Sus'].notes if tick(25) <= n.ws < tick(29)]
    margin = min(o.vel - c.vel for c in cl for o in ob if min(o.end, c.end) > max(o.start, c.start))
    check('6  clarinet >= 10 below the oboe in 25-28', margin >= 10, f'min margin {margin}')
    # 7. velocities and climax
    top = max(n.vel for p in parts.values() for n in p.notes)
    check('7  no velocity above 105', top <= MAX_VEL, f'max {top}')
    for family in (('Violins Sus', 'Violins Sus Quiet'), ('Trompa 1', 'Trompa 2'), ('Timpani', 'Timpani Roll')):
        notes = [n for f in family for n in parts[f].notes]
        vmax = max(n.vel for n in notes)
        bars = sorted({bar_of(n.ws) for n in notes if n.vel == vmax})
        rest = max(n.vel for n in notes if bar_of(n.ws) != 37)
        check(f'7  top velocity of {"/".join(family)} in bar 37', bars == [37], f'{vmax} vs {rest} elsewhere')
    # 8. seam
    last = max(n.end for p in parts.values() for n in p.notes)
    check('8  everything ends before 70.00 s', sec(last) < 70.0, f'last note-off {sec(last):.3f} s')
    # craft checks
    cc_ok = all(b - a >= CC_STEP for p in parts.values() for a, b in zip(sorted(p.cc), sorted(p.cc)[1:]))
    check('   CC11 points at most every 1/8 bar', cc_ok)
    check('   one suspended cymbal in the whole track', len(parts['Cymbal'].notes) == 1,
          f'key {CYMBAL_KEY}, starts {sec(parts["Cymbal"].notes[0].start):.2f} s, peak at bar 33')
    par = parallels(parts)
    check('   no parallel 5ths/8ves between sustained voices', not par, '; '.join(par[:6]))
    rep = repetitions(parts)
    check('   no 2-bar phrase repeated identical more than twice', not rep, '; '.join(rep[:3]))
    overlaps = []
    for p in parts.values():
        if p.name not in VOICES:
            continue
        for n in p.notes:
            nxt = [m for m in p.notes if m.ws == n.we]
            if n.legato and nxt and all(m.pitch != n.pitch for m in nxt):
                overlaps.append((n.end - min(m.start for m in nxt)) * SEC_PER_TICK * 1000)
    check('   legato overlaps 10-30 ms in sustained lines', all(10 <= o <= 30.5 for o in overlaps),
          f'{len(overlaps)} joins, {min(overlaps):.1f}-{max(overlaps):.1f} ms')

    print(f"\n{'check':<62} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<62} {status:<4} {detail}')
    return ok_all


def parallels(parts) -> list[str]:
    """Consecutive perfect 5ths/8ves (same direction) between pairs of sustained voices."""
    found = []

    def at(part, t):
        return sorted({n.pitch for n in part.notes if n.ws <= t < n.we})

    names = [n for n in VOICES if parts[n].notes]
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if frozenset({a, b}) in DOUBLINGS:
                continue
            times = sorted({n.ws for n in parts[a].notes} | {n.ws for n in parts[b].notes})
            for t1, t2 in zip(times, times[1:]):
                A1, B1, A2, B2 = at(parts[a], t1), at(parts[b], t1), at(parts[a], t2), at(parts[b], t2)
                if not (A1 and B1 and A2 and B2):
                    continue
                for pa in A1:
                    qa = min(A2, key=lambda x: abs(x - pa))
                    for pb in B1:
                        qb = min(B2, key=lambda x: abs(x - pb))
                        iv1, iv2 = abs(pa - pb) % 12, abs(qa - qb) % 12
                        if pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and iv1 == iv2 and iv1 in (0, 7) \
                                and abs(qa - pa) <= 7 and abs(qb - pb) <= 7:
                            found.append(f'{a}/{b} b{bar_of(t1)}-{bar_of(t2)} '
                                         f'{name_of(pa)}-{name_of(qa)} / {name_of(pb)}-{name_of(qb)}')
    return found


def repetitions(parts) -> list[str]:
    found = []
    for name, part in parts.items():
        seen = {}
        for bar in range(1, BARS):
            sig = tuple((n.ws - tick(bar), n.pitch, n.dur) for n in notes_in(part, tick(bar), tick(bar + 2)))
            if len(sig) >= 2:
                seen.setdefault(sig, []).append(bar)
        found += [f'{name} bars {bars}' for bars in seen.values() if len(bars) > 2]
    return found


def main():
    parts = write_midi(OUT)
    ok = verify(parts)
    print(f'\nwritten {OUT}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
