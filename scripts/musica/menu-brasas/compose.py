"""Main-menu theme «Brasas»: score generator (brief: docs/musica/menu-brasas.md).

Writes build/menu-brasas.mid (one MIDI track per instrument and articulation: Sonatina,
VSCO 2 CE and VCSL patches) and prints a verification table (patch ranges, registers,
layers, parallels, repetitions, legato joins, note lengths). Exits with status 1 if a
check fails, and refuses to write anything if a note falls outside its patch.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/menu-brasas/compose.py
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
BAR = 4 * BEAT
BARS = 28
LOOP_END = BARS * BAR
BPM = 84
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = EIGHTH                                     # at most one CC point per eighth (= 1/8 bar)
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # ±8 ms
HUMAN_VEL = 6
SEED = 84
GUARD = 12                                           # ticks a note stops before a section edge
END_GUARD = 60                                       # held notes release ~90 ms before the seam
MAX_VEL = 92
MAX_CC1 = 100
ANTICIPATE = int(round(0.150 / SEC_PER_TICK))       # wine glasses start 150 ms early
ROLL_MS = 45                                         # rolled harp chords: <= 60 ms between notes
OUT = os.path.join(HERE, 'build', 'menu-brasas.mid')

# (name, first bar, last bar, max layers)
SECTIONS = [('Intro', 1, 2, 7), ('A', 3, 6, 8), ("A'", 7, 10, 9), ('B', 11, 14, 6),
            ('Bridge', 15, 18, 12), ('Return', 19, 24, 12), ('Codetta', 25, 28, 8)]


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


SECTION_TICKS = {tick(first) for _, first, _, _ in SECTIONS if first > 1}

# ── patches ──────────────────────────────────────────────────────────────────
S = 'Sonatina Symphonic Orchestra'
LAYOUT = [   # score order; each articulation is its own track and patch
    ('Flauta alto', ('sso', S, 'Woodwinds - Performance', 'Alto Flute Solo Sustain.sfz')),
    ('Clarinete', ('VSCO-2-CE', 'ClarinetSus.sfz')),
    ('Trompa', ('VSCO-2-CE', 'FHornSus.sfz')),
    ('Timbal', ('VSCO-2-CE', 'Timpani.sfz')),
    ('Timbal redoble', ('VSCO-2-CE', 'TimpaniRolls.sfz')),
    ('Plato', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Suspended Cymbal 2.sfz')),
    ('Mark Trees', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Mark Trees.sfz')),
    ('Glockenspiel', ('VSCO-2-CE', 'Glockenspiel.sfz')),
    ('Copas', ('VCSL', 'Idiophones', 'Friction Idiophones', 'Wine Glasses - Slow.sfz')),
    ('Celesta', ('sso', S, 'Percussion', 'Celeste.sfz')),
    ('Arpa', ('sso', S, 'Concert Harp.sfz')),
    ('Coro', ('sso', S, 'Chorus - Performance', 'Mixed Chorus.sfz')),
    ('Violín solista', ('sso', S, 'Strings - Performance', 'Violin Solo 1 Sustain.sfz')),
    ('Armónicos', ('sso', S, 'Strings - Performance', '1st Violins Harmonics.sfz')),
    ('Violas pp', ('VSCO-2-CE', 'ViolaEnsSusVib-Quiet.sfz')),
    ('Violas trém', ('VSCO-2-CE', 'ViolaEnsTrem.sfz')),
    ('Violas', ('VSCO-2-CE', 'ViolaEnsSusVib.sfz')),
    ('Chelos pp', ('VSCO-2-CE', 'CelloEnsSusVib-Quiet.sfz')),
    ('Chelos pizz', ('VSCO-2-CE', 'CelloEnsPizz.sfz')),
    ('Chelos', ('VSCO-2-CE', 'CelloEnsSusVib.sfz')),
    ('Contrabajos', ('VSCO-2-CE', 'ContrabassSusVB.sfz')),
]
SFZ_OF = {name: library(*parts) for name, parts in LAYOUT}
CC1_TRACKS = ('Flauta alto', 'Violín solista', 'Coro', 'Armónicos')     # Sonatina: dynamics on CC1
CC11_TRACKS = ('Clarinete', 'Trompa', 'Violas pp', 'Violas trém', 'Violas', 'Chelos pp', 'Chelos',
               'Contrabajos', 'Timbal redoble')                         # VSCO sustains: CC11 shapes
CYMBAL_KEY = 63            # Suspended Cymbal 2.sfz: susCymb2_cresc_2.5s2.wav (offset 12247)
CYMBAL_PEAK_S = 1.910      # measured RMS (100 ms) peak of that sample after its offset
MARK_TREES_KEY = 60        # Mark Trees.sfz: windchimes_asc1.wav (ascending sweep)

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
    channel: int
    notes: list[Note] = field(default_factory=list)
    cc: dict[int, dict[int, int]] = field(default_factory=dict)

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), vel, **kw)
        self.notes.append(n)
        return n

    def line(self, bar, beat, items, vels, legato=True, **kw):
        """Consecutive notes from (bar, beat): items = [(pitch | None for a rest, beats)]."""
        t = tick(bar, beat)
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        vi = iter(vels)
        for pitch, beats in items:
            length = int(round(beats * BEAT))
            if pitch is not None:
                self.notes.append(Note(P(pitch), t, length, next(vi), legato=legato, **kw))
            t += length

    def pad(self, events, vels, max_beats=8.0, **kw):
        """Sustained chords [(bar, beat, [pitches], beats)], back to back. Common tones are tied
        (one held note) unless the tie would exceed max_beats; then the voice breathes and
        sings again."""
        vels = vels if isinstance(vels, list) else [vels] * len(events)
        open_notes: dict[int, Note] = {}
        limit = int(round(max_beats * BEAT))
        for (bar, beat, pitches, beats), v in zip(events, vels):
            t, length = tick(bar, beat), int(round(beats * BEAT))
            now = {}
            for p in map(P, pitches):
                held = open_notes.get(p)
                if held is not None and held.we == t and held.dur + length <= limit:
                    held.dur += length
                    now[p] = held
                else:
                    now[p] = Note(p, t, length, v, **kw)
                    self.notes.append(now[p])
            open_notes = now

    def wave(self, bar, pitches, vels, holds=None, start_beat=1.0):
        """Harp ripple: eighths from start_beat; holds = {index: beats} lets the bass ring."""
        holds = holds or {0: 4}
        vels = vels if isinstance(vels, list) else [vels] * len(pitches)
        for i, (p, v) in enumerate(zip(pitches, vels)):
            self.add(bar, start_beat + i / 2, p, holds.get(i, 0.5), v)

    def roll(self, bar, beat, pitches, vel, bass_beats, upper_beats=0.5, step_ms=ROLL_MS):
        """Rolled chord, bottom to top, step_ms apart; the bass rings for bass_beats."""
        step = int(round(step_ms / 1000 / SEC_PER_TICK))
        for i, p in enumerate(pitches):
            beats = bass_beats if i == 0 else upper_beats
            self.notes.append(Note(P(p), tick(bar, beat) + i * step, int(round(beats * BEAT)),
                                   vel + (2 if i == 0 else i % 2), jitter=False, hv=3, tag='roll'))

    def curve(self, num, points, shape='cos'):
        """Controller breakpoints [(bar, beat, value)], sampled on the eighth grid."""
        pts = [(tick(b, bt), v) for b, bt, v in points]
        table = self.cc.setdefault(num, {})
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            if v0 == v1:                              # a plateau: its two ends are enough
                table[(t0 // CC_STEP) * CC_STEP] = v0
                table[(t1 // CC_STEP) * CC_STEP] = v1
                continue
            g = (t0 // CC_STEP) * CC_STEP
            while g <= t1:
                x = 0.0 if t1 == t0 else min(1.0, max(0.0, (g - t0) / (t1 - t0)))
                if shape == 'cos':
                    x = (1 - math.cos(math.pi * x)) / 2
                v = int(round(v0 + (v1 - v0) * x))
                if x < 1 and v == v1:                 # the target is reached only at its point
                    v -= 1 if v1 > v0 else -1
                table[g] = v
                g += CC_STEP
        last_t, last_v = pts[-1]
        table[(last_t // CC_STEP) * CC_STEP] = last_v


def new_parts() -> dict[str, Part]:
    channels = [c for c in range(16) if c != 9]
    return {name: Part(name, channels[i % len(channels)]) for i, (name, _) in enumerate(LAYOUT)}


def glass(part: Part, bar, beat, pitch, end_bar, end_beat, vel):
    """Wine glass: slow attack, so it starts 150 ms before the beat it belongs to."""
    t0, t1 = tick(bar, beat) - ANTICIPATE, tick(end_bar, end_beat)
    part.notes.append(Note(P(pitch), t0, t1 - t0, vel, hv=2, tag='glass'))


# ── composition ─────────────────────────────────────────────────────────────
MOTIF_A = [(62, 1), (65, 1), (64, 1), (57, 1), (62, 1), (65, 1), (67, 1), (69, 1),
           (70, 2), (69, 1), (64, 1), (62, 3)]


def intro(s):
    """Bars 1-2 «El umbral»: Dm(add9) | Bbmaj7(#11)/D (1-3) / A7sus4 (4). Pedal D, the key."""
    s['Mark Trees'].add(1, 1, MARK_TREES_KEY, 2, 30, jitter=False, hv=3)
    h = s['Arpa']
    h.wave(1, [38, 45, 52, 53, 57, 64, 65, 69], [46, 38, 39, 40, 41, 42, 43, 44])
    h.wave(2, [38, 46, 53, 57, 62, 64, 45, 50], [52, 45, 46, 47, 48, 49, 50, 48], holds={0: 3, 6: 1})
    s['Celesta'].line(2, 1, [(86, 1), (82, 1), (84, 1), (91, 1)], [48, 45, 47, 52], legato=False)
    s['Armónicos'].add(1, 1, 86, 8, 56, jitter=False)
    glass(s['Copas'], 1, 2, 81, 3, 1, 35)
    s['Coro'].pad([(1, 1, [57, 62, 64], 4), (2, 1, [58, 62, 64], 3), (2, 4, [57, 62, 67], 1)],
                  [58, 60, 60], jitter=False)
    s['Chelos pp'].line(1, 1, [(38, 7), (45, 1)], [35, 37], jitter=False)


def section_a(s):
    """Bars 3-6 «La llama»: Dm(add9) | Bbmaj7 | Gm(add9)-Gm6 | A7sus4-A7. The exposition."""
    s['Flauta alto'].line(3, 1, MOTIF_A, [62, 64, 63, 58, 62, 65, 67, 70, 74, 70, 64, 60])
    s['Celesta'].line(3, 1, [(p + 12, d) for p, d in MOTIF_A],
                      [64, 66, 65, 62, 64, 66, 67, 68, 70, 67, 64, 62], legato=False)
    h = s['Arpa']
    h.wave(3, [38, 45, 52, 53, 57, 64, 57, 53], [54, 46, 47, 48, 49, 50, 48, 46])
    h.wave(4, [46, 53, 57, 60, 62, 60, 57, 53], [55, 47, 48, 49, 50, 49, 48, 47])
    h.wave(5, [43, 50, 57, 58, 62, 58, 55, 52], [56, 49, 50, 51, 52, 50, 49, 48])
    h.wave(6, [45, 52, 55, 62, 64, 62], [54, 47, 48, 49, 48, 46], holds={0: 3})
    h.roll(6, 4, [45, 49, 55], 50, 1)                    # the sus4 resolves when the flute breathes
    # Choir: high voice held as a common tone (E5 is the #11 over Bb), low male pair.
    s['Coro'].pad([(3, 1, [62, 65, 76], 4), (4, 1, [62, 65, 76], 4), (5, 1, [58, 62, 81], 4),
                   (6, 1, [57, 62, 79], 3), (6, 4, [57, 61, 79], 1)], [60, 60, 64, 62, 58])
    # Harmonics: E6 in bar 6 (not A5): G5-A5 over the bass G2-A2 would move in octaves.
    for bar, p in ((3, 86), (4, 86), (5, 79), (6, 88)):
        s['Armónicos'].add(bar, 1, p, 4, 56)
    s['Chelos pp'].line(3, 1, [(50, 4), (46, 4), (43, 4), (45, 4)], [45, 45, 46, 44])
    s['Glockenspiel'].add(5, 1, 86, 0.5, 38)
    s['Glockenspiel'].add(6, 1, 81, 0.5, 38)
    glass(s['Copas'], 6, 1, 81, 7, 1, 40)


def section_a2(s):
    """Bars 7-10 «El violín»: Dm(add9)-Dm/C | Bbmaj7-G7/B | C7sus4-C7 | F(add9). To F major."""
    s['Violín solista'].line(7, 1, [(74, 1.5), (77, .5), (76, 1), (69, 1), (74, 1), (77, 1), (79, 1),
                                    (81, 1), (82, 2), (81, 1), (79, 1), (77, 3)],
                             [66, 64, 68, 62, 66, 70, 72, 76, 82, 78, 74, 70])
    cel = s['Celesta']                                   # the echo, on «2 and» and «4 and»
    for bar, (a, b), (va, vb) in ((7, (86, 88), (52, 50)), (8, (86, 91), (53, 51)),
                                  (9, (94, 93), (56, 54)), (10, (89, 84), (52, 50))):
        cel.add(bar, 2.5, a, 0.5, va)
        cel.add(bar, 4.5, b, 0.5, vb)
    h = s['Arpa']                                        # its bass follows the cellos: D C | Bb B | C | F
    h.wave(7, [38, 45, 52, 53, 48, 53, 57, 64], [56, 47, 48, 49, 54, 48, 49, 50], holds={0: 2, 4: 2})
    h.wave(8, [46, 53, 57, 62, 47, 53, 55, 62], [57, 49, 50, 51, 55, 50, 51, 52], holds={0: 2, 4: 2})
    h.wave(9, [48, 55, 58, 65, 64, 58, 55, 52], [64, 56, 57, 58, 59, 57, 56, 55])
    h.wave(10, [41, 48, 55, 57, 60, 67, 60, 55], [60, 52, 53, 54, 53, 52, 50, 48])
    s['Violas pp'].line(7, 1, [(57, 6), (53, 4), (52, 2), (57, 4)], [44, 46, 48, 42])
    s['Chelos pp'].line(7, 1, [(50, 2), (48, 2), (46, 2), (47, 2), (48, 4), (41, 4)],
                        [48, 47, 48, 50, 49, 46])
    # Choir (bars 9-10): D4 rather than F4 in the sus chord, so its resolution E4 does not move
    # in octaves with the violas' F3-E3.
    s['Coro'].pad([(9, 1, [58, 62, 67], 2), (9, 3, [58, 64, 67], 2), (10, 1, [57, 60, 67], 4)],
                  [60, 62, 58])
    # Harmonics: G6 held over bars 9-10 (9th of F) instead of G6-F6, which moved in octaves with
    # the violin's G5-F5.
    s['Armónicos'].add(7, 1, 86, 8, 54)
    s['Armónicos'].add(9, 1, 91, 8, 56)
    s['Glockenspiel'].add(9, 1, 86, 0.5, 38)
    s['Glockenspiel'].add(10, 1, 84, 0.5, 38)
    glass(s['Copas'], 10, 1, 77, 11, 1, 40)              # unison with the violin's arrival on F5


def section_b(s):
    """Bars 11-14 «Junto al fuego»: Gm9-C9sus4 | F/A-Bbm6 | Dm7-C7 | F(add9)-A7(b9). Warmth."""
    s['Clarinete'].line(11, 1, [(65, 1.5), (69, .5), (67, 1), (60, 1), (65, 1.5), (69, .5), (70, 1),
                                (72, 1), (74, 2), (72, 1), (67, 1), (65, 2), (64, 2)],
                        [56, 54, 57, 53, 56, 55, 58, 59, 60, 57, 55, 56, 54])
    # Horn countermelody: moves when the clarinet holds; G3-F3 resolves the 7th of A7 (bar 15).
    s['Trompa'].line(13, 1, [(53, 2), (52, 2), (53, 2), (55, 2), (53, 2)], [46, 44, 45, 42, 46])
    # Pizzicato embers on beats 1 and 3. D2 in bar 13 (not D3): D3-C3 under the clarinet's
    # D5-C5 would be parallel octaves; D2-C3 moves against it.
    pz = s['Chelos pizz']
    for bar, one, three in ((11, 43, 48), (12, 45, 46), (13, 38, 48), (14, 41, 45)):
        pz.add(bar, 1, one, 1, 46)
        pz.add(bar, 3, three, 1, 40)
    s['Coro'].pad([(11, 1, [53, 58], 4), (12, 1, [53, 57], 2), (12, 3, [53, 61], 2),
                   (13, 1, [53, 57], 2), (13, 3, [52, 58], 2), (14, 1, [57, 60], 2), (14, 3, [55, 61], 2)],
                  [56, 56, 58, 56, 56, 54, 54])
    h = s['Arpa']                                        # rolled low chord + one high note on beat 3
    for bar, chord, top, v in ((11, [43, 50, 53, 57], 81, 46), (12, [45, 48, 53, 57], 84, 44),
                               (13, [50, 53, 57], 81, 47), (14, [41, 48, 55, 57], 76, 42)):
        h.roll(bar, 1, chord, v, 2)
        h.add(bar, 3, top, 0.5, v - 2)


def bridge(s):
    """Bars 15-18 «El hechizo»: Bbmaj7(#11) | Gm(add9) | Ebmaj7(#11) | A7sus4-A7(b9)."""
    vn, fl = s['Violín solista'], s['Flauta alto']
    vn.line(15, 1, [(74, 1), (77, 1), (76, 1), (69, 1)], [70, 72, 70, 66])
    fl.line(16, 1, [(67, 1), (70, 1), (69, 1), (62, 1)], [66, 70, 68, 64])
    s['Celesta'].line(16, 1, [(79, 1), (82, 1), (81, 1), (74, 1)], [60, 62, 60, 56], legato=False)
    vn.line(17, 1, [(79, 2), (82, 2), (81, 2), (74, 1), (73, 1)], [76, 80, 82, 86, 78])
    fl.line(17, 1, [(67, 2), (70, 2), (69, 2), (62, 1), (61, 1)], [72, 76, 78, 82, 74])
    # Choir: Bb3 held as the b9 over A7sus4, D4 rises to E4 on beat 3, so nothing moves in
    # octaves with the tune's Bb-A, nor sounds C#4 against the flute's D4 appoggiatura.
    s['Coro'].pad([(15, 1, [53, 57, 64], 4)], [60])
    s['Coro'].pad([(16, 1, [55, 58, 62], 4)], [62])
    s['Coro'].pad([(17, 1, [55, 58, 62], 4), (18, 1, [55, 58, 62], 2), (18, 3, [55, 58, 64], 2)],
                  [64, 64, 66])
    # Harmonics: Bb5 in bar 16 (not D6): E6-D6 over the choir's E4-D4 would be octaves.
    s['Armónicos'].add(15, 1, 88, 4, 56)
    s['Armónicos'].add(16, 1, 82, 4, 57)
    s['Armónicos'].add(17, 1, 86, 4, 58)
    s['Armónicos'].add(18, 1, 88, 4, 60)
    s['Violas trém'].pad([(17, 1, [58, 62], 4), (18, 1, [55, 62], 2), (18, 3, [55, 58], 2)],
                         [40, 42, 44])
    s['Chelos'].line(15, 1, [(46, 4), (43, 4), (39, 4), (45, 4)], [50, 56, 64, 72])
    s['Contrabajos'].line(17, 1, [(27, 4), (33, 4)], [54, 64])
    h = s['Arpa']
    h.wave(15, [46, 53, 57, 62, 64, 62, 57, 53], [56, 50, 51, 52, 53, 52, 51, 50])
    h.wave(16, [43, 50, 55, 57, 58, 62, 58, 55], [60, 54, 55, 56, 57, 56, 55, 54])
    h.wave(17, [39, 46, 50, 55, 57, 62, 57, 55], [64, 58, 59, 60, 61, 60, 59, 58])
    h.wave(18, [45, 50, 52, 55, 58, 61], [66, 60, 61, 62, 63, 64], holds={0: 3})
    gliss = [57, 58, 61, 62, 64, 65, 67, 69, 70, 73, 74, 76, 77, 79]    # D harmonic minor, A3-G5
    t0 = tick(18, 4)
    for i, p in enumerate(gliss):
        h.notes.append(Note(p, t0 + int(round(i * (BEAT - 20) / len(gliss))), EIGHTH // 2,
                            56 + i, jitter=False, hv=2, tag='gliss'))
    h.add(19, 1, 81, 0.5, 66, jitter=False, hv=2)        # the glissando lands on A5
    s['Timbal redoble'].add(17, 1, 45, 8, 45, jitter=False, hv=0)
    start = tick(19) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
    s['Plato'].notes.append(Note(CYMBAL_KEY, start, tick(19, 3) - start, 60, jitter=False, hv=0,
                                 tag='cymbal'))


RETURN = [(74, 1), (77, 1), (76, 1), (69, 1), (74, 1), (77, 1), (79, 1), (81, 1),
          (82, 2), (81, 1), (76, 1), (74, 2), (73, 2)]


def return_section(s):
    """Bars 19-24 «La puerta»: Dm(add9)-A7/E | Dm/F-Gm9 | Bbmaj7(#11) | A7sus4-A7(b9) |
    D(add9) | G/D-Gm6/D. Climax in bar 21, Picardy third in bar 23."""
    vn, fl = s['Violín solista'], s['Flauta alto']
    vn.line(19, 1, RETURN + [(74, 4), (71, 2), (70, 2), (69, 3)],
            [78, 82, 80, 76, 80, 84, 86, 88, 90, 86, 82, 84, 80, 76, 66, 64, 58])
    fl.line(19, 1, RETURN + [(66, 3)], [74, 78, 76, 72, 76, 80, 82, 84, 86, 82, 78, 80, 76, 66])
    for part in (vn, fl):
        next(n for n in part.notes if n.ws == tick(21)).hv = 3
    # Horn: F4-C#4 | D4-Bb3 instead of F4-E4 | A3-Bb3, which doubled the tune's F5-E5 in octaves.
    hn = s['Trompa']
    hn.line(19, 1, [(65, 2), (61, 2), (62, 2), (58, 2), (62, 4), (64, 2), (67, 2)],
            [70, 68, 70, 72, 85, 62, 58])
    for n in hn.notes:
        if n.ws >= tick(21):                             # the climax and the quiet answer under the D-C#
            n.hv = 3
    # Choir (never above A4). Bar 19: G4 (7th of A7) instead of E4, which doubled the tune's F5-E5
    # in octaves; bar 20: A3 held. Bar 22: Bb3 and A4 held from the climax chord (Bb is the b9),
    # F4 drops out and D4 rises to E4 on beat 3, so nothing moves in octaves or fifths with the
    # tune's D-C#, the bass Bb-A or the violas' F-G; bar 23: Bb3-A3 resolves the b9; bar 24:
    # no B-Bb, which the violin and celesta sing.
    s['Coro'].pad([(19, 1, [57, 62, 65], 2), (19, 3, [57, 61, 67], 2), (20, 1, [57, 62, 65], 2),
                   (20, 3, [58, 62, 69], 2), (21, 1, [58, 62, 65, 69], 4), (22, 1, [58, 62, 69], 2),
                   (22, 3, [58, 64, 69], 2), (23, 1, [57, 62, 66], 4), (24, 1, [55, 62], 2),
                   (24, 3, [55, 64], 2)],
                  [66, 64, 66, 68, 72, 66, 64, 60, 56, 54])
    s['Violas'].line(19, 1, [(57, 2), (55, 2), (57, 4), (53, 4), (55, 2), (58, 2)], [60, 62, 64, 68, 64, 62])
    # Bass: G2 / G1 on beat 3 of bar 20 (not G3 / G2): F3-G3 under the tune's F5-G5 would be
    # parallel octaves; the leap down makes the climax Bb a rising arrival.
    ch = s['Chelos']
    ch.line(19, 1, [(50, 2), (52, 2), (53, 2), (43, 2), (46, 4), (45, 4), (50, 4), (50, 4)],
            [70, 71, 72, 74, 85, 72, 62, 50])
    next(n for n in ch.notes if n.ws == tick(21)).hv = 3
    s['Contrabajos'].line(19, 1, [(38, 2), (40, 2), (41, 2), (31, 2), (34, 4), (33, 4), (38, 4), (38, 3.5)],
                          [66, 67, 68, 70, 78, 68, 58, 46])
    h = s['Arpa']
    h.wave(19, [38, 45, 52, 53, 40, 45, 49, 55], [62, 55, 56, 57, 60, 56, 57, 58], holds={0: 2, 4: 2})
    h.wave(20, [41, 45, 50, 53, 43, 50, 57, 58], [63, 56, 57, 58, 61, 57, 58, 59], holds={0: 2, 4: 2})
    h.wave(21, [46, 53, 57, 60, 64, 69, 64, 57], [66, 59, 60, 61, 62, 63, 61, 59])
    h.wave(22, [45, 52, 55, 62, 45, 49, 55, 58], [60, 54, 55, 56, 58, 54, 53, 52], holds={0: 2, 4: 2})
    h.roll(23, 1, [38, 45, 52, 54, 57, 62, 66], 56, 4)
    h.roll(24, 1, [50, 55, 59, 62], 52, 2)
    h.roll(24, 3, [50, 55, 58, 64], 49, 2)
    cel = s['Celesta']                                   # the light; F#6 lands on beat 4
    cel.line(23, 1, [(74, .5), (76, .5), (78, .5), (81, .5), (86, .5), (88, .5), (90, 1)],
             [48, 49, 50, 51, 52, 53, 52], legato=False)
    cel.line(24, 1, [(83, 2), (82, 2)], [52, 50], legato=False)
    s['Glockenspiel'].add(21, 1, 86, 0.5, 55)
    s['Glockenspiel'].add(23, 1, 90, 0.5, 40)
    glass(s['Copas'], 23, 1, 78, 24, 3, 40)
    tp = s['Timbal']
    tp.add(19, 1, 38, 1, 62, jitter=False)
    tp.add(21, 1, 46, 1, 78, hv=3)
    s['Mark Trees'].add(23, 1, MARK_TREES_KEY, 2, 30, hv=3)


def codetta(s):
    """Bars 25-28 «Brasas»: Dm(add9) | Gm(add9)/D | Ebmaj7(#11)/D | A7sus4, back to bar 1."""
    s['Celesta'].line(25, 1, [(p, .5) for p in (74, 77, 76, 69, 74, 77, 79, 81, 82, 81, 79, 76)] + [(74, 2)],
                      [52, 51, 51, 50, 50, 49, 49, 48, 48, 47, 46, 45, 44], legato=False)
    s['Flauta alto'].line(27, 1, [(62, 2), (65, 2), (64, 2), (57, 1.35)], [52, 54, 50, 44])  # A3 breathes
    h = s['Arpa']
    for bar, chord, v in ((25, [38, 45, 52, 53], 48), (26, [38, 43, 46, 57], 44),
                          (27, [38, 51, 55, 57], 40), (28, [45, 50, 52, 55], 36)):
        h.roll(bar, 1, chord, v, 4)
    s['Armónicos'].add(25, 1, 81, 16, 52)
    s['Coro'].pad([(25, 1, [53, 57, 64], 4), (26, 1, [55, 58, 62], 4), (27, 1, [55, 57, 62], 4),
                   (28, 1, [57, 62, 64], 4)], [58, 56, 54, 52])
    s['Chelos pp'].line(25, 1, [(50, 4), (50, 4), (50, 4), (45, 4)], [44, 41, 39, 37])
    glass(s['Copas'], 26, 1, 86, 28, 1, 32)


def dynamics(s):
    """CC1 on the Sonatina sustains (from tick 0), CC11 on the VSCO sustains."""
    s['Flauta alto'].curve(1, [(1, 1, 64), (3, 1, 64), (5, 1, 88), (6, 2, 72), (6, 4, 70), (16, 1, 70)])
    s['Flauta alto'].curve(1, [(16, 1, 72), (16, 4.5, 80), (17, 1, 80), (18, 3, 94), (18, 4, 86),
                               (19, 1, 84), (21, 1, 96), (22, 1, 82), (22, 4, 78), (23, 1, 70), (23, 4, 66),
                               (27, 1, 66)])
    s['Flauta alto'].curve(1, [(27, 1, 60), (28, 1, 50), (28, 4.5, 45)])
    s['Violín solista'].curve(1, [(1, 1, 66), (7, 1, 66), (9, 1, 94), (10, 3, 72), (15, 1, 72)])
    s['Violín solista'].curve(1, [(15, 1, 70), (15, 4.5, 78), (17, 1, 82), (18, 3, 96), (18, 4, 90),
                                  (19, 1, 88), (21, 1, 100), (22, 1, 86), (22, 4, 82), (23, 1, 74), (24, 1, 62),
                                  (25, 1, 54), (25, 3.5, 40)])
    # Choir: at least 15 under the flute in A; under the melody everywhere; peak in bar 21.
    s['Coro'].curve(1, [(1, 1, 42), (2, 3, 52), (3, 1, 48), (5, 1, 66), (6, 2, 54), (6, 3.5, 52),
                        (6, 4, 55), (9, 1, 55)])
    s['Coro'].curve(1, [(9, 1, 50), (9, 3, 70), (10, 4.5, 56), (11, 1, 45), (12, 3, 55), (13, 3, 50),
                        (14, 4.5, 47), (15, 1, 50), (18, 4, 82), (19, 1, 78), (21, 1, 90), (22, 1, 76),
                        (23, 1, 62), (24, 1, 56), (25, 1, 55), (28, 4.5, 40)])
    s['Armónicos'].curve(1, [(1, 1, 40), (2, 4.5, 52), (3, 1, 46), (5, 1, 56), (6, 4.5, 42), (7, 1, 40),
                             (9, 1, 55), (10, 4.5, 46), (15, 1, 45), (18, 4.5, 65), (25, 1, 50), (28, 4.5, 38)])
    s['Chelos pp'].curve(11, [(1, 1, 84), (2, 4, 96), (3, 1, 92), (5, 1, 100), (6, 4, 90), (7, 1, 94),
                              (9, 1, 104), (10, 4.5, 88), (25, 1, 96), (28, 4.5, 60)])
    s['Violas pp'].curve(11, [(1, 1, 90), (7, 1, 90), (9, 1, 102), (10, 4.5, 84)])
    cl = s['Clarinete']
    cl.curve(11, [(1, 1, 96), (11, 1, 96), (13, 1, 98), (13, 2, 112), (13, 3, 96), (14, 3, 92),
                  (14, 4.5, 80)])
    s['Trompa'].curve(11, [(1, 1, 88), (13, 1, 88), (14, 1, 96), (15, 1, 92), (15, 2.5, 70),
                           (19, 1, 100), (21, 1, 118), (22, 1, 104), (22, 4.5, 88)])
    s['Violas trém'].curve(11, [(1, 1, 64), (17, 1, 64), (18, 4.5, 120)], shape='lin')
    s['Violas'].curve(11, [(1, 1, 96), (19, 1, 96), (21, 1, 112), (22, 4.5, 92)])
    s['Chelos'].curve(11, [(1, 1, 80), (15, 1, 80), (18, 4.5, 112), (19, 1, 104), (21, 1, 118),
                           (22, 1, 108), (23, 1, 96), (24, 1, 84), (24, 4.5, 64)])
    s['Contrabajos'].curve(11, [(1, 1, 80), (17, 1, 80), (18, 4.5, 110), (19, 1, 104), (21, 1, 116),
                                (24, 1, 80), (24, 4, 60)])
    s['Timbal redoble'].curve(11, [(1, 1, 38), (17, 1, 38), (18, 4.5, 108)])


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
        starts: dict[int, list[Note]] = {}
        for n in part.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = starts.get(n.we, [])
            if any(m.pitch == n.pitch for m in nxt):
                n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
            elif n.legato and nxt:
                n.end = min(m.start for m in nxt) + rng.randint(7, 20)   # 10-30 ms overlap
        for n in part.notes:
            for b in SECTION_TICKS:                  # tracks that stop at a section edge
                if n.we == b and b not in starts:
                    n.end = min(n.end, b - GUARD)
            n.end = min(n.end, LOOP_END - END_GUARD)
        by_pitch: dict[int, Note] = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = by_pitch.get(n.pitch)
            if prev is not None and prev.end > n.start - 6:
                prev.end = n.start - 6
            by_pitch[n.pitch] = n


def build() -> dict[str, Part]:
    s = new_parts()
    for section in (intro, section_a, section_a2, section_b, bridge, return_section, codetta, dynamics):
        section(s)
    perform(s)
    check_ranges(s)
    return s


def write_midi(path: str = OUT) -> dict[str, Part]:
    parts = build()
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Dm', time=0))
        events = []
        for num, table in sorted(part.cc.items()):
            for t, v in sorted(table.items()):
                events.append((t, 1, mido.Message('control_change', channel=part.channel, control=num, value=v)))
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
# Floors and ceilings of the brief (section 8, criterion 2).
REGISTER = {
    'Violín solista': (69, 82), 'Flauta alto': (57, 82), 'Celesta': (69, 94), 'Clarinete': (60, 74),
    'Trompa': (52, 67), 'Coro': (52, 81), 'Armónicos': (79, 91), 'Glockenspiel': (81, 90),
    'Copas': (77, 86), 'Arpa': (38, 84), 'Chelos': (38, 55), 'Chelos pp': (38, 55), 'Chelos pizz': (38, 55),
    'Contrabajos': (27, 43), 'Violas': (52, 62), 'Violas pp': (52, 62), 'Violas trém': (52, 62),
    'Timbal': (38, 46), 'Timbal redoble': (45, 45), 'Plato': (63, 63), 'Mark Trees': (60, 60),
}
MAX_SECONDS = {'Flauta alto': 2.8, 'Violín solista': 5.0, 'Coro': 2 * BAR * SEC_PER_TICK + 0.05,
               'Armónicos': 4 * BAR * SEC_PER_TICK + 0.05, 'Clarinete': 8.0, 'Trompa': 7.0,
               'Violas pp': 7.0, 'Violas': 7.0, 'Chelos pp': 6.0, 'Chelos': 6.0, 'Contrabajos': 6.0,
               'Copas': 11.0, 'Timbal redoble': 16.0}
VOICES = ['Flauta alto', 'Violín solista', 'Clarinete', 'Trompa', 'Coro', 'Armónicos', 'Violas pp',
          'Violas trém', 'Violas', 'Chelos pp', 'Chelos', 'Chelos pizz', 'Contrabajos']
DOUBLINGS = {frozenset({'Flauta alto', 'Violín solista'}), frozenset({'Chelos', 'Contrabajos'})}
LEGATO_LINES = ('Flauta alto', 'Violín solista', 'Clarinete', 'Trompa', 'Violas pp', 'Violas',
                'Chelos pp', 'Chelos', 'Contrabajos')


def sec(t: int) -> float:
    return t * SEC_PER_TICK


def name_of(p: int) -> str:
    return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'][p % 12] + str(p // 12 - 1)


def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
            for k in range(r.lokey, r.hikey + 1)}


def bar_of(t: int) -> int:
    return t // BAR + 1


def check_ranges(parts: dict[str, Part]):
    """Hard stop: every note inside its patch and inside the brief's floor/ceiling."""
    errors = []
    for name, part in parts.items():
        keys = sfz_keys(SFZ_OF[name])
        lo, hi = REGISTER[name]
        for n in part.notes:
            if n.pitch not in keys:
                errors.append(f'{name}: {name_of(n.pitch)} ({n.pitch}) outside {os.path.basename(SFZ_OF[name])}')
            if not lo <= n.pitch <= hi:
                errors.append(f'{name}: {name_of(n.pitch)} ({n.pitch}) outside the register {lo}-{hi}, bar {bar_of(n.ws)}')
        for num, table in part.cc.items():
            if num == 1 and max(table.values()) > MAX_CC1:
                errors.append(f'{name}: CC1 above {MAX_CC1}')
    if errors:
        raise SystemExit('\n'.join(errors))


def sounding(parts, t0, t1):
    """Max number of tracks with a note sounding at once inside [t0, t1)."""
    cuts = sorted({t0} | {min(t1, max(t0, x)) for p in parts.values() for n in p.notes for x in (n.start, n.end)})
    worst, where = 0, t0
    for a, b in zip(cuts, cuts[1:]):
        if b <= a:
            continue
        mid = (a + b) / 2
        k = sum(any(n.start <= mid < n.end for n in p.notes) for p in parts.values())
        if k > worst:
            worst, where = k, a
    return worst, where


def parallels(parts) -> list[str]:
    """Consecutive perfect 5ths/8ves (same direction) between pairs of sustained voices. Common
    tones count as held voices; the moving voices are paired bottom to top. Unison doublings of
    one line by two colours are orchestration, not voice leading, and are not reported."""
    found = []

    def at(name, t):
        # a pizzicato note counts as sounding for its written quarter only (it decays)
        return [n for n in parts[name].notes if n.ws <= t < n.ws + (BEAT if name == 'Chelos pizz' else n.dur)]

    def moves(name, t1, t2):
        a, b = at(name, t1), at(name, t2)
        if not a or not b:
            return None
        held = {id(n) for n in a} & {id(n) for n in b}
        pa = sorted({n.pitch for n in a if id(n) not in held})
        pb = sorted({n.pitch for n in b if id(n) not in held})
        common = set(pa) & set(pb)
        pa, pb = [p for p in pa if p not in common], [p for p in pb if p not in common]
        if not pa or not pb:
            return []
        if len(pa) == len(pb):
            return list(zip(pa, pb))
        return [(p, min(pb, key=lambda x: abs(x - p))) for p in pa]

    names = [n for n in VOICES if parts[n].notes]
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if frozenset({a, b}) in DOUBLINGS:
                continue
            times = sorted({n.ws for n in parts[a].notes} | {n.ws for n in parts[b].notes})
            for t1, t2 in zip(times, times[1:]):
                ma, mb = moves(a, t1, t2), moves(b, t1, t2)
                if not ma or not mb:
                    continue
                for pa, qa in ma:
                    for pb, qb in mb:
                        iv1, iv2 = abs(pa - pb), abs(qa - qb)
                        if (qa - pa) * (qb - pb) > 0 and iv1 % 12 == iv2 % 12 and iv1 % 12 in (0, 7) \
                                and iv1 and iv2:
                            found.append(f'{a}/{b} b{bar_of(t1)}-{bar_of(t2)} '
                                         f'{name_of(pa)}-{name_of(qa)} / {name_of(pb)}-{name_of(qb)}')
    return found


def repetitions(parts) -> list[str]:
    found = []
    for name, part in parts.items():
        seen: dict[tuple, list[int]] = {}
        for bar in range(1, BARS):
            sig = tuple((n.ws - tick(bar), n.pitch, n.dur) for n in part.notes if tick(bar) <= n.ws < tick(bar + 2))
            if len(sig) >= 2:
                seen.setdefault(sig, []).append(bar)
        found += [f'{name} bars {bars}' for bars in seen.values() if len(bars) > 2]
    return found


def verify(parts: dict[str, Part]) -> bool:
    ok_all = True
    rows = []

    def check(label, ok, detail=''):
        nonlocal ok_all
        ok_all &= bool(ok)
        rows.append((label, 'OK' if ok else 'FAIL', detail))

    print(f"\n{'track':<16} {'patch':<38} {'notes':>5}  {'range used':<16} {'patch range':<11} dynamics")
    for name, part in parts.items():
        keys = sfz_keys(SFZ_OF[name])
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        dyn = 'CC1' if name in CC1_TRACKS else ('vel+CC11' if name in CC11_TRACKS else 'vel')
        print(f'{name:<16} {os.path.basename(SFZ_OF[name]):<38} {len(part.notes):>5}  '
              f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})'.ljust(80)[:80] + f' {min(keys)}-{max(keys)}'.ljust(12) + dyn)

    check('1  nothing before tick 0 or after the seam',
          all(0 <= n.start and n.end < LOOP_END for p in parts.values() for n in p.notes),
          f'loop {sec(LOOP_END):.4f} s')
    for label, first, last, limit in SECTIONS:
        worst, where = sounding(parts, tick(first), tick(last + 1))
        check(f'6  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
    top = max(n.vel for p in parts.values() for n in p.notes)
    check(f'8  no velocity above {MAX_VEL}', top <= MAX_VEL, f'max {top}')
    long = [f'{name} {sec(n.end - n.start):.2f} s b{bar_of(n.ws)}' for name, limit in MAX_SECONDS.items()
            for n in parts[name].notes if sec(n.end - n.start) > limit]
    check('9  note lengths within the patch limits', not long, '; '.join(long[:4]))
    check('9  CC1 from tick 0 on the Sonatina sustains', all(0 in parts[n].cc.get(1, {}) for n in CC1_TRACKS))
    check('9  no CC1 on celesta and harp', not parts['Celesta'].cc and not parts['Arpa'].cc)
    dense = [p.name for p in parts.values() for table in p.cc.values()
             if any(b - a < CC_STEP for a, b in zip(sorted(table), sorted(table)[1:]))]
    check('   CC points at most one per eighth', not dense, ', '.join(dense))
    par = parallels(parts)
    check('   no parallel 5ths/8ves between sustained voices', not par, '; '.join(par[:6]))
    rep = repetitions(parts)
    check('   no 2-bar phrase repeated identical more than twice', not rep, '; '.join(rep[:3]))
    overlaps = []
    for name in LEGATO_LINES:
        notes = parts[name].notes
        for n in notes:
            nxt = [m for m in notes if m.ws == n.we]
            if n.legato and nxt and all(m.pitch != n.pitch for m in nxt):
                overlaps.append(sec(n.end - min(m.start for m in nxt)) * 1000)
    check('   legato overlaps 10-30 ms in the sustained lines', all(9.5 <= o <= 30.5 for o in overlaps),
          f'{len(overlaps)} joins, {min(overlaps):.1f}-{max(overlaps):.1f} ms')
    cym = parts['Plato'].notes
    check('10 one cymbal, peak on bar 19', len(cym) == 1,
          f'starts {sec(cym[0].start):.3f} s, peak {sec(cym[0].start) + CYMBAL_PEAK_S:.3f} s (bar 19 = {sec(tick(19)):.3f} s)')

    print(f"\n{'check':<58} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<58} {status:<4} {detail}')
    return ok_all


def main():
    parts = write_midi(OUT)
    ok = verify(parts)
    print(f'\nwritten {OUT}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
