"""Vol'guth's boss theme «Misa de la filacteria»: score generator (brief: docs/musica/acto2-volguth.md).

Writes build/acto2-volguth.mid (one MIDI track per instrument and articulation: VSCO 2 CE, VCSL and
Sonatina) and prints a verification table against the brief (ranges, the leitmotif in its five
transformations, the phylactery, figures, layers, register clashes, dynamics, CC1 curves, note lengths,
gallop and 3+3+2 patterns, heartbeat, bass, voice leading, repetition, loop seam). Exits with status 1
if any check fails.

Form (56 bars of 4/4 at 144, C minor):
  1-4    Intro «La campana»      bell, gong, organ pedal, the gallop; Db/C -> G7(b9)
  5-12   A «El rito»             the hymn: «Sombra» in augmentation, choir + organ 8'
  13-20  A' «La congregación»    the hymn reharmonized over a rising bass; horns and tuba join
  21-28  B «La filacteria»       tutti hit and silence: heartbeat, contrabassoon, the glass, the
                                 organ (Gedact) plays the hymn backwards
  29-36  Bridge «El despertar»   the heartbeat speeds up into the gallop; the head rises by semitones
  37-48  Climax «La no-vida»     the motif at real speed in the brass (C minor, then F minor), the
                                 choir shouts the hits; the cadence in augmentation, peak on bar 46
  49-56  Codetta «El rito sigue» the organ alone with the first half of the hymn (and the Gedact
                                 answering it), then the intro again, whose dominant leads to bar 1

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-volguth/compose.py
"""
from __future__ import annotations

import bisect
import itertools
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
E8 = BEAT // 2                                       # eighth
BAR = 4 * BEAT
BARS = 56
LOOP_END = BARS * BAR
BPM = 144
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per 1/8 bar (an eighth)
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # +-8 ms
HUMAN_VEL = 6
SEED = 144
GUARD = 12                                           # ticks a phrase-final note stops early
DETACH = 6                                           # gap before the next note of a non-legato line
LEGATO = (12, 34)                                    # overlap range in ticks: 10-30 ms
MAX_VEL = 105
MAX_CC1 = 112
B_VEL, B_CC1 = 62, 72                                # ceilings of the phylactery (bar 21 beat 2 - bar 28)
GALLOP_LEN = 0.8                                     # spiccato: 0.4 beats
HIT_LEN = 0.7                                        # the 3+3+2 hits: 0.35 beats
OUT = os.path.join(HERE, 'build', 'acto2-volguth.mid')

SECTIONS = [('Intro', 1, 4, 9), ('A', 5, 12, 11), ("A'", 13, 20, 13), ('B', 21, 28, 8),
            ('Bridge', 29, 36, 11), ('Climax', 37, 48, 14), ('Codetta', 49, 56, 9)]


def tick(bar: int, eighth: float = 0.0) -> int:
    return (bar - 1) * BAR + int(round(eighth * E8))


# Notes on these ticks never anticipate (section starts and the start of the phylactery): humanization
# only delays them.
NO_EARLY = {tick(first) for _, first, _, _ in SECTIONS} | {tick(21, 2)}

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name) -> int:
    """'F#4' / 'Bb2' / 66 -> MIDI number (C4 = 60)."""
    if isinstance(name, int):
        return name
    step, rest = name[0], name[1:]
    acc = 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


def name_of(p: int) -> str:
    return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][p % 12] + str(p // 12 - 1)


def place(pc: int, lo: int, hi: int) -> int | None:
    """Lowest pitch of pitch class pc inside [lo, hi] (None if there is none)."""
    for p in range(lo, hi + 1):
        if p % 12 == pc % 12:
            return p
    return None


def pc_in(pc: int, lo: int, hi: int) -> int:
    p = place(pc, lo, hi)
    if p is None:
        raise ValueError(f'pitch class {pc} not in {lo}-{hi}')
    return p


# ── harmony (section 4) ──────────────────────────────────────────────────────
# name -> pitch classes, root first, then third (or sus 4th), fifth and colours.
CHORDS = {
    'Cm': [0, 3, 7], 'Cm(add9)': [0, 3, 7, 2], 'Cm/Bb': [0, 3, 7, 10], 'Db/C': [1, 5, 8], 'Db': [1, 5, 8],
    'Dbmaj7': [1, 5, 8, 0], 'Db7': [1, 5, 8, 11], 'C#m': [1, 4, 8], 'D': [2, 6, 9], 'Dm': [2, 5, 9],
    'D7': [2, 6, 9, 0], 'Dø7': [2, 5, 8, 0], 'Eb': [3, 7, 10], 'Ebm': [3, 6, 10], 'Ebmaj7': [3, 7, 10, 2],
    'Fm': [5, 8, 0], 'Fm9': [5, 8, 0, 3, 7], 'Fm(add9)/C': [5, 8, 0, 7], 'Gb': [6, 10, 1],
    'G7': [7, 11, 2, 5], 'G7(b9)': [7, 11, 2, 5, 8], 'G7(b13)': [7, 11, 2, 5, 3], 'G7sus4': [7, 0, 2, 5],
    'Ab7': [8, 0, 3, 6], 'Abmaj7': [8, 0, 3, 7], 'C7': [0, 4, 7, 10], 'C7(b13)': [0, 4, 7, 10, 8],
}
SEVENTH = {'G7': 5, 'G7(b9)': 5, 'G7(b13)': 5, 'C7': 10, 'C7(b13)': 10, 'D7': 0, 'Db7': 11, 'Ab7': 6}

C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B = range(12)
# bar -> [(eighth, chord, bass pitch class)]. The bass is the bracket of section 4 (the real bass). In bars
# 30, 32 and 34 the brief's chord names say «Db/C», «D/C#», «Eb/D», but its bass line moves to the bII
# on beat 3 (and that bII becomes the next bar's tonic): the bII is written in root position.
HARMONY = {
    1: [(0, 'Cm', C)], 2: [(0, 'Cm', C)], 3: [(0, 'Db/C', C)], 4: [(0, 'G7(b9)', G)],
    5: [(0, 'Cm', C)], 6: [(0, 'Ab7', Ab)], 7: [(0, 'G7(b13)', G)], 8: [(0, 'G7', G)],
    9: [(0, 'Cm', C)], 10: [(0, 'Abmaj7', Ab)], 11: [(0, 'Dbmaj7', Db)], 12: [(0, 'G7sus4', G), (4, 'G7(b9)', G)],
    13: [(0, 'Cm(add9)', C)], 14: [(0, 'D7', D)], 15: [(0, 'Ebmaj7', Eb)], 16: [(0, 'G7', B)],
    17: [(0, 'Abmaj7', Ab)], 18: [(0, 'Fm9', F)], 19: [(0, 'Dø7', D)], 20: [(0, 'G7sus4', G), (4, 'G7(b9)', G)],
    21: [(0, 'Cm', C)], 22: [(0, 'Cm', C)], 23: [(0, 'Fm(add9)/C', C)], 24: [(0, 'Cm', C)],
    25: [(0, 'G7', B)], 26: [(0, 'G7(b13)', G)], 27: [(0, 'Ab7', Ab)], 28: [(0, 'G7sus4', G), (4, 'G7', G)],
    29: [(0, 'Cm', C)], 30: [(0, 'Cm', C), (4, 'Db', Db)], 31: [(0, 'C#m', Db)], 32: [(0, 'C#m', Db), (4, 'D', D)],
    33: [(0, 'Dm', D)], 34: [(0, 'Dm', D), (4, 'Eb', Eb)], 35: [(0, 'Ebm', Eb)], 36: [(0, 'G7(b9)', G)],
    37: [(0, 'Cm', C), (4, 'Ab7', Ab)], 38: [(0, 'G7(b13)', G), (4, 'G7', G)],
    39: [(0, 'Cm', C), (4, 'Db', Db), (6, 'G7', G)], 40: [(0, 'Cm', C), (4, 'C7', C)],
    41: [(0, 'Fm', F), (4, 'Db7', Db)], 42: [(0, 'C7(b13)', C), (4, 'C7', C)],
    43: [(0, 'Fm', F), (4, 'Gb', Gb), (6, 'C7', C)], 44: [(0, 'Fm', F), (4, 'G7(b9)', G)],
    45: [(0, 'Cm', C)], 46: [(0, 'Abmaj7', Ab), (4, 'G7(b9)', G)], 47: [(0, 'Cm', C), (4, 'Cm/Bb', Bb)],
    48: [(0, 'Abmaj7', Ab), (4, 'G7(b9)', G)],
    49: [(0, 'Cm', C)], 50: [(0, 'Ab7', Ab)], 51: [(0, 'G7(b13)', G)], 52: [(0, 'G7', G)],
    53: [(0, 'Cm', C)], 54: [(0, 'Cm', C)], 55: [(0, 'Db/C', C)], 56: [(0, 'G7(b9)', G)],
}


def chord_at(bar: int, eighth: float) -> tuple[str, int]:
    name, bass = HARMONY[bar][0][1:]
    for e, n, b in HARMONY[bar]:
        if eighth >= e:
            name, bass = n, b
    return name, bass


def segments(bar: int) -> list[tuple[int, int, str, int]]:
    """[(first eighth, last eighth + 1, chord, bass pc)] of a bar."""
    rows = HARMONY[bar]
    return [(e, rows[i + 1][0] if i + 1 < len(rows) else 8, n, b) for i, (e, n, b) in enumerate(rows)]


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
    vmax: int = MAX_VEL
    start: int = 0     # performed values (after humanization)
    end: int = 0

    @property
    def we(self) -> int:
        return self.ws + self.dur


@dataclass
class Part:
    name: str
    sfz_path: str
    dynamics: str      # 'cc1' (Sonatina performance patches) or 'vel'
    pitched: bool = True
    channel: int = 0
    notes: list[Note] = field(default_factory=list)
    cc: dict[int, dict[int, int]] = field(default_factory=dict)

    def add(self, bar, eighth, pitch, eighths, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, eighth), int(round(eighths * E8)), int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def chord(self, bar, eighth, pitches, eighths, vel, **kw):
        for i, p in enumerate(sorted(pitches)):
            self.add(bar, eighth, p, eighths, vel - (i % 2), **kw)

    def line(self, events, vels, legato=False, **kw):
        """events = [(bar, eighth, pitch, eighths)]; vels = list or a single value."""
        vels = vels if isinstance(vels, list) else [vels] * len(events)
        for (bar, e, p, d), v in zip(events, vels):
            self.add(bar, e, p, d, v, legato=legato, **kw)

    def tied(self, events, vel, legato=False, **kw):
        """events = [(start tick, end tick, pitches)]: consecutive chords; a pitch present in the
        next chord is held (common tone) instead of being re-attacked."""
        open_notes: dict[int, Note] = {}
        for t0, t1, pitches in events:
            v = vel(t0) if callable(vel) else vel
            for p in list(open_notes):
                if p not in pitches or open_notes[p].we != t0:
                    del open_notes[p]
            for p in pitches:
                if p in open_notes:
                    open_notes[p].dur = t1 - open_notes[p].ws
                else:
                    n = Note(p, t0, t1 - t0, int(round(v)), legato=legato, **kw)
                    self.notes.append(n)
                    open_notes[p] = n

    def curve(self, points, number=None, shape='cos'):
        """Controller breakpoints [(bar, eighth, value)], sampled on the 1/8-bar grid."""
        number = number if number is not None else (1 if self.dynamics == 'cc1' else 11)
        if number == 1 and self.dynamics != 'cc1':
            raise ValueError(f'{self.name}: CC1 would be a volume fader on a velocity patch')
        store = self.cc.setdefault(number, {})
        pts = [(tick(b, e), v) for b, e, v in points]
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            g = -(-t0 // CC_STEP) * CC_STEP
            while g <= t1:
                x = 0.0 if t1 == t0 else min(1.0, max(0.0, (g - t0) / (t1 - t0)))
                if shape == 'cos':
                    x = (1 - math.cos(math.pi * x)) / 2
                store[g] = int(round(v0 + (v1 - v0) * x))
                g += CC_STEP
        for t, v in (pts[0], pts[-1]):
            store[(t // CC_STEP) * CC_STEP] = v

    def lean(self, onsets, amount=4, cap=MAX_CC1):
        """A small CC1 lean on each new note (for one eighth): the choir's breath on every syllable."""
        store = self.cc[1]
        for t in onsets:
            g = (t // CC_STEP) * CC_STEP
            if g in store and g + CC_STEP in store:
                store[g] = min(cap, store[g] + amount)

    def cc_value(self, number: int, t: int) -> int | None:
        """Value of a controller at tick t (linear between points, as the sampler reads it)."""
        pts = sorted(self.cc.get(number, {}).items())
        if not pts:
            return None
        if t <= pts[0][0]:
            return pts[0][1]
        for (a, va), (b, vb) in zip(pts, pts[1:]):
            if a <= t <= b:
                return int(round(va + (vb - va) * (t - a) / (b - a)))
        return pts[-1][1]

    def level(self, n: Note) -> int:
        """Dynamic level: CC1 at the note start for CC1 patches, else the velocity."""
        return self.cc_value(1, n.start) if self.dynamics == 'cc1' else n.vel


SSO = ('sso', 'Sonatina Symphonic Orchestra')
BRASS = SSO + ('Brass - Performance',)
ORGAN = SSO + ('Organ',)
VCSL_ID = ('VCSL', 'Idiophones', 'Struck Idiophones')
VCSL_MEM = ('VCSL', 'Membranophones', 'Struck Membranophones')

# Score order: (track name, library path, dynamics, pitched). Every articulation is its own track.
LAYOUT = [
    ('Choir', SSO + ('Chorus - Performance', 'Large Chorus.sfz'), 'cc1', True),
    ('Choir Whisper', SSO + ('Chorus - Performance', 'Mixed Chorus.sfz'), 'cc1', True),
    ('Organ 8', ORGAN + ('Great - Open Diapason 8ft.sfz',), 'vel', True),
    ('Organ Stopped', ORGAN + ('Great - Stopped Diapason 8ft.sfz',), 'vel', True),
    ('Organ Gedact', ORGAN + ('Swell - Gedact 8ft.sfz',), 'cc1', True),
    ('Organ Pedal', ORGAN + ('Pedal - Bourdon 16ft.sfz',), 'vel', True),
    ('Organ Violon', ORGAN + ('Pedal - Violon 16ft.sfz',), 'vel', True),
    ('Horns Marc', BRASS + ('Horns Marcato.sfz',), 'cc1', True),
    ('Horns', BRASS + ('Horns Sustain.sfz',), 'cc1', True),
    ('Trombones Marc', BRASS + ('Trombones Marcato.sfz',), 'cc1', True),
    ('Tuba Marc', BRASS + ('Tuba Marcato.sfz',), 'cc1', True),
    ('Celli Trem', SSO + ('Strings - Performance', 'Celli Tremolo.sfz'), 'cc1', True),
    ('Contrabassoon', SSO + ('Woodwinds - Performance', 'Contrabassoon Solo Sustain (looped).sfz'), 'cc1', True),
    ('Gallop', ('VSCO-2-CE', 'ContrabassSpic.sfz'), 'vel', True),
    ('Gallop 8va', ('VSCO-2-CE', 'CelloEnsSpic.sfz'), 'vel', True),
    ('Timpani', ('VSCO-2-CE', 'Timpani.sfz'), 'vel', True),
    ('Timp Roll', ('VSCO-2-CE', 'TimpaniRolls.sfz'), 'vel', True),
    ('Bass Drum', VCSL_MEM + ('Bass Drum 2.sfz',), 'vel', False),
    ('Tom', VCSL_MEM + ('Tom 2.sfz',), 'vel', False),
    ('Bell', VCSL_ID + ('Tubular Bells 1.sfz',), 'vel', True),
    ('Gong', VCSL_ID + ('Gong 1.sfz',), 'vel', False),
    ('Glass', ('VCSL', 'Idiophones', 'Friction Idiophones', 'Wine Glasses - Slow.sfz'), 'vel', True),
]
SFZ_OF = {name: library(*path) for name, path, _, _ in LAYOUT}
# Velocity tracks without any controller share a channel with a sibling (the renderer reads tracks).
SHARED_CHANNEL = {'Organ Stopped': 'Organ 8', 'Organ Violon': 'Organ Pedal', 'Gallop 8va': 'Gallop',
                  'Bell': 'Timpani'}

BD_HIT, BD_ROLL, TOM_HIT, GONG_HIT = 62, 63, 62, 60
GLASS_NOTE = 75                                      # the glass sample's own pitch (no transposition)
GLASS_LEAD_S = 0.150                                 # its slow attack starts 150 ms early


def new_parts() -> dict[str, Part]:
    parts = {name: Part(name, library(*path), dyn, pitched) for name, path, dyn, pitched in LAYOUT}
    free = [c for c in range(16) if c != 9]
    for p in parts.values():
        if not p.pitched:
            p.channel = 9
        elif p.name not in SHARED_CHANNEL:
            p.channel = free.pop(0)
    for name, sibling in SHARED_CHANNEL.items():
        parts[name].channel = parts[sibling].channel
    return parts


# ── the leitmotif «Sombra» (section 5), in eighths: (bar offset, eighth, pitch, length) ─────────
# The motif in C minor at real speed: | C D Eb F# G | Eb D B | C Eb G Ab G | C |
MOTIF = [(0, 0, 60, 1), (0, 1, 62, 1), (0, 2, 63, 2), (0, 4, 66, 3), (0, 7, 67, 1), (1, 0, 63, 2), (1, 2, 62, 2),
         (1, 4, 59, 4), (2, 0, 60, 1), (2, 1, 63, 1), (2, 2, 67, 2), (2, 4, 68, 2), (2, 6, 67, 2), (3, 0, 60, 8)]


def augment(events, factor=2):
    """Augmentation: every onset and length times factor (re-barred in eighths of 8 per bar)."""
    out = []
    for b, e, p, d in events:
        on = (b * 8 + e) * factor
        out.append((on // 8, on % 8, p, d * factor))
    return out


_AUG = augment(MOTIF)                                # the final whole note becomes a breve (16 eighths)
# The hymn: the breve turns into C (w + h) -> B (h), the appoggiatura over the dominant.
HYMN = _AUG[:-1] + [(6, 0, 60, 12), (7, 4, 59, 4)]


def retrograde(events, total):
    """Notes and rhythm backwards: each note ends where its mirror image starts."""
    out = []
    for b, e, p, d in reversed(events):
        on = total - (b * 8 + e + d)
        out.append((on // 8, on % 8, p, d))
    return out


# B: the augmented motif (breve ending) backwards; it starts after the hit, on beat 2 of bar 21, so the
# opening breve loses its first quarter and everything else stays on the bar grid.
_BACK = retrograde(_AUG, 64)
RETRO = [(0, 2, _BACK[0][2], _BACK[0][3] - 2)] + _BACK[1:]
# The bridge: the head (1 2 b3 #4 -> 5) in quarters, sequenced up by semitones; the last target is the
# Ab4 - B4 that opens the climax (B4 is the leading tone).
HEADS = []
for _k in range(4):
    HEADS += [(2 * _k, 2 * i, p + _k, 2) for i, p in enumerate((60, 62, 63, 66))]
    HEADS += [(2 * _k + 1, 0, 67 + _k, 8)] if _k < 3 else [(7, 0, 68, 4), (7, 4, 71, 4)]
# The climax: the motif at real speed (a diminution of the hymn), then its sequence to the subdominant.
IN_F = [(b, e, p + 5, d) for b, e, p, d in MOTIF[:-1]] + [(3, 0, 65, 6)]
# The cadence in augmentation (the hymn's last four bars) an octave up.
CADENCE = [(b - 4, e, p + 12, d) for b, e, p, d in HYMN[8:]]
# The Gedact's answer to the organ hymn in the codetta: it holds while the hymn moves and moves while the
# hymn holds; contrary motion against the rising head, then a falling line over the hymn's long B.
COUNTER = [(0, 4, 67, 4), (1, 0, 63, 4), (1, 4, 60, 4), (2, 0, 59, 4), (2, 4, 65, 4),
           (3, 0, 67, 2), (3, 2, 65, 2), (3, 4, 63, 2), (3, 6, 62, 2)]

# Velocity contour of the hymn (one offset per note): it rises to the Ab4 of its fifth bar.
HYMN_SHAPE = [0, 2, 4, 6, 8, 5, 3, 1, 5, 7, 10, 12, 9, 6, 2]


def at(bar, events, shift=0):
    return [(bar + b, e, p + shift, d) for b, e, p, d in events]


MELODY: list[tuple[int, int, int]] = []              # (start, end, pitch) of the main tune, for the hits


def sing(events):
    MELODY.extend((tick(b, e), tick(b, e + d), p) for b, e, p, d in events)


def melody_pcs(t0: int, t1: int) -> set[int]:
    return {p % 12 for s, e, p in MELODY if s < t1 and e > t0}


# ── shared figures ───────────────────────────────────────────────────────────
def gallop(s, bar, accent=96, weak=72, high=False):
    """8 spiccato eighths on the bass of the moment, an octave up on eighths 2 and 6, accents on the even
    eighths. Over Ab/Bb/B the octave notes reach 44-47 (the brief's 43 only covers G)."""
    for e in range(8):
        _, bass = chord_at(bar, e)
        p = pc_in(bass, 24, 35) + (12 if e in (2, 6) else 0)
        v = (accent + (2 if e == 0 else 0)) if e % 2 == 0 else weak
        s['Gallop'].add(bar, e, p, GALLOP_LEN, v, hv=4)
        if high:
            s['Gallop 8va'].add(bar, e, p + 12, GALLOP_LEN, v - 6, hv=4)


def _pair(root: int, partner: int) -> list[int] | None:
    """Root and partner inside the trombones' 43-56: root below if it fits, else the partner below."""
    for lo_pc, hi_pc in ((root, partner), (partner, root)):
        for r in range(43, 57):
            if r % 12 == lo_pc:
                q = next(p for p in range(r + 1, r + 13) if p % 12 == hi_pc)
                if q <= 56:
                    return [r, q]
    return None


def hit_pair(bar: int, e: int) -> list[int]:
    """Trombones on a 3+3+2 hit: root + third in 43-56. Where the third would double the note the tune
    holds (the leading tone B over G7, F# over D7) or the chord is a sus4 (the tune has the 4th), they take
    the seventh or the fifth: a doubled leading tone resolving with the tune would move in octaves."""
    name, _ = chord_at(bar, e)
    tones = CHORDS[name]
    t0 = tick(bar, e)
    sung = melody_pcs(t0, t0 + E8)
    options = [] if name.endswith('sus4') or tones[1] in sung else [tones[1]]
    options += [x for x in (SEVENTH.get(name), tones[2]) if x is not None and x not in sung]
    for partner in options:
        pair = _pair(tones[0], partner)
        if pair and (partner != SEVENTH.get(name) or pair[0] % 12 == tones[0]):
            return pair
    raise ValueError(f'no trombone pair for {name} at bar {bar}')


def hits(s, bar, vels=(100, 90, 95), trombones=True, tuba=False, skip=()):
    """The 3+3+2 hammer on eighths 0, 3 and 6."""
    for e, v in zip((0, 3, 6), vels):
        if e in skip:
            continue
        name, bass = chord_at(bar, e)
        if trombones:
            s['Trombones Marc'].chord(bar, e, hit_pair(bar, e), HIT_LEN, v)
        if tuba:
            s['Tuba Marc'].add(bar, e, pc_in(bass, 28, 39), HIT_LEN, v)


def pedal(s, first, last, vel, track='Organ Pedal', hv=3):
    """The 16' pedal on the bass of section 4 (36-47; it sounds an octave lower); common tones held."""
    events = []
    for bar in range(first, last + 1):
        v = vel(bar) if callable(vel) else vel
        for e0, e1, _, bass in segments(bar):
            p = pc_in(bass, 36, 47)
            if events and events[-1][2] == p and events[-1][1] == tick(bar, e0):
                events[-1][1] = tick(bar, e1)
            else:
                events.append([tick(bar, e0), tick(bar, e1), p, v])
    for t0, t1, p, v in events:
        s[track].notes.append(Note(p, t0, t1 - t0, v, hv=hv))


def timp_root(bar: int, e: int) -> int:
    name, bass = chord_at(bar, e)
    return bass if name.endswith('/C') else CHORDS[name][0]    # over the pedal, the pedal note


def timpani(s, bar, v1, v2=None, second=5, hv=HUMAN_VEL, vmax=MAX_VEL):
    """Root on beat 1 and the fifth of the chord on «3 and» (the root again where the fifth does not
    fit the drums' 36-44)."""
    s['Timpani'].add(bar, 0, pc_in(timp_root(bar, 0), 36, 44), 1, v1, hv=hv, vmax=vmax)
    if v2 is not None:
        r = timp_root(bar, second)
        fifth = place(r + 7, 36, 44)
        s['Timpani'].add(bar, second, fifth if fifth is not None else pc_in(r, 36, 44), 1, v2, hv=hv, vmax=vmax)


def heartbeat(s, bar, beats, pitch_of, lub, hv=HUMAN_VEL, vmax=MAX_VEL):
    """Lub on the beat, dub an eighth later and 18 softer."""
    for b in beats:
        p = pitch_of(b)
        s['Timpani'].add(bar, 2 * b, p, 1, lub, hv=hv, vmax=vmax)
        s['Timpani'].add(bar, 2 * b + 1, p, 1, lub - 18, hv=hv, vmax=vmax)


def tom_roll(s, bar, first=0, n=8, v0=70, v1=98):
    for k in range(n):
        s['Tom'].add(bar, first + k, TOM_HIT, 1, v0 + (v1 - v0) * k / max(1, n - 1), hv=3)


def drum(s, bar, e, v, **kw):
    s['Bass Drum'].add(bar, e, BD_HIT, 1, v, **kw)


def bell(s, bar, pitch, v, hv=3):
    s['Bell'].add(bar, 0, pitch, 2, v, hv=hv)


def gong(s, bar, v, hv=3, vmax=98):
    s['Gong'].add(bar, 0, GONG_HIT, 2, v, hv=hv, vmax=vmax)


# ── composition ─────────────────────────────────────────────────────────────
def hymn_parts(s, bar, choir=80, organ=78, stopped=68, horns=None):
    """The hymn in unison: choir + organ 8' open and stopped (+ horns in A')."""
    ev = at(bar, HYMN)
    sing(ev)
    s['Choir'].line(ev, [choir + o for o in HYMN_SHAPE], legato=True)
    s['Organ 8'].line(ev, [organ + o * 0.5 for o in HYMN_SHAPE], legato=True, hv=3)
    s['Organ Stopped'].line(ev, [stopped + o * 0.5 for o in HYMN_SHAPE], legato=True, hv=3)
    if horns is not None:
        s['Horns'].line(ev, [horns + o for o in HYMN_SHAPE], legato=True)
    return ev


def intro(s):
    """Bars 1-4: Cm | Cm | Db/C | G7(b9). The crypt bell and the gong, the 16' pedal, the gallop from the
    first eighth; trombones and celli tremolo on the Neapolitan over the pedal and the dominant."""
    bell(s, 1, 60, 84)
    gong(s, 1, 70)
    pedal(s, 1, 4, 76)
    for bar in range(1, 5):
        gallop(s, bar, 92, 68)
        drum(s, bar, 0, 80, hv=4)
    for bar in (1, 2, 3):
        timpani(s, bar, 90, 74)
    timpani(s, 4, 90)
    hits(s, 3, (96, 88, 92))
    hits(s, 4, (98, 90, 96))
    s['Trombones Marc'].curve([(3, 0, 90), (4, 7, 100)])
    s['Celli Trem'].curve([(3, 0, 60), (4, 7, 85)])
    tom_roll(s, 4, v0=70, v1=98)


def rite(s):
    """Bars 5-12 «El rito»: Cm | Ab7 (German sixth) | G7(b13) | G7 | Cm | Abmaj7 | Dbmaj7 (N) | G7sus4-G7(b9).
    The hymn in augmentation, choir and organ in unison over the gallop and the 3+3+2 hammer."""
    ev = hymn_parts(s, 5, choir=82, organ=78, stopped=68)
    ch = s['Choir']
    ch.curve([(5, 0, 84), (9, 0, 100), (12, 7, 90)])
    ch.lean([tick(b, e) for b, e, _, _ in ev])
    pedal(s, 5, 12, 78)
    for bar in range(5, 13):
        gallop(s, bar, 94, 70)
        hits(s, bar, (100, 90, 95) if bar % 4 else (102, 92, 98))
        timpani(s, bar, 92, 76)
        drum(s, bar, 0, 86, hv=4)
    s['Trombones Marc'].curve([(5, 0, 96), (9, 0, 103), (12, 7, 106)])
    s['Celli Trem'].curve([(5, 0, 70), (9, 0, 95), (12, 7, 80)])
    tom_roll(s, 8, v0=70, v1=94)
    tom_roll(s, 12, v0=72, v1=96)
    bell(s, 5, 60, 80)
    bell(s, 9, 67, 72)


def congregation(s):
    """Bars 13-20 «La congregación»: Cm(add9) | D7 (V/V) | Ebmaj7 | G7/B | Abmaj7 | Fm9 | Dø7 | G7sus4-G7(b9).
    The same hymn over a bass that climbs C-D-Eb and falls through the leading tone; horns double the
    choir, the tuba joins the hammer, the bass drum adds «2 and»."""
    ev = hymn_parts(s, 13, choir=84, organ=80, stopped=70, horns=84)
    ch = s['Choir']
    ch.curve([(13, 0, 90), (17, 0, 104), (20, 7, 94)])
    ch.lean([tick(b, e) for b, e, _, _ in ev])
    s['Horns'].curve([(13, 0, 86), (17, 0, 100), (20, 7, 90)])
    pedal(s, 13, 20, 80)
    for bar in range(13, 21):
        gallop(s, bar, 96, 72)
        hits(s, bar, (100, 92, 96) if bar % 4 else (104, 94, 100), tuba=True)
        timpani(s, bar, 94, 78)
        drum(s, bar, 0, 88, hv=4)
        drum(s, bar, 3, 72, hv=4)
    s['Trombones Marc'].curve([(13, 0, 100), (17, 0, 105), (20, 7, 108)])
    s['Tuba Marc'].curve([(13, 0, 100), (20, 7, 108)])
    s['Celli Trem'].curve([(13, 0, 80), (17, 0, 100), (20, 7, 90)])
    tom_roll(s, 16, v0=72, v1=96)
    tom_roll(s, 20, v0=76, v1=100)
    bell(s, 13, 60, 84)


def phylactery(s):
    """Bars 21-28 «La filacteria»: the tutti hit on beat 1 of bar 21, then the music dies. Pedal C (Cm |
    Fm(add9)/C | Cm), the leading tone in the bass (G7/B), G7(b13), the German sixth and the dominant.
    The heartbeat, the contrabassoon breathing, the glass growing brighter, the hum of low voices and the
    Gedact playing the hymn backwards: time runs back and death is undone."""
    # the hit (a quarter; the tuba's hit is as short as all its hits)
    s['Choir'].chord(21, 0, [60, 63, 67], 2, 96)
    s['Trombones Marc'].chord(21, 0, [48, 55], 2, 100)
    s['Tuba Marc'].add(21, 0, 36, HIT_LEN, 100)
    s['Timpani'].add(21, 0, 36, 2, 100, hv=3, vmax=100)
    drum(s, 21, 0, 96, hv=2, vmax=98)
    gong(s, 21, 96)
    s['Organ Pedal'].add(21, 0, 36, 2, 94, hv=3, vmax=100)
    s['Choir'].curve([(21, 0, 105), (21, 1, 105), (21, 2, 70), (28, 7, 70)])
    s['Trombones Marc'].curve([(21, 0, 106), (21, 1, 106), (21, 2, B_CC1), (28, 7, B_CC1)])
    s['Tuba Marc'].curve([(21, 0, 106)])
    quiet = dict(vmax=B_VEL)
    # the hymn backwards, far away
    ged = s['Organ Gedact']
    ged.line(at(21, RETRO), [52, 54, 56, 55, 53, 52, 56, 54, 55, 57, 58, 54, 52, 50], legato=True, **quiet)
    ged.curve([(21, 2, 58), (25, 0, 70), (28, 7, 62)])
    # the pedal and the breath of the contrabassoon (a breath before each new note)
    pd = s['Organ Pedal']
    for bar, e, p, d in ((21, 2, 36, 30), (25, 0, 47, 8), (26, 0, 43, 8), (27, 0, 44, 8), (28, 0, 43, 8)):
        pd.add(bar, e, p, d, 58, hv=3, **quiet)
    cb = s['Contrabassoon']
    for bar, e, p, d in ((21, 2, 24, 13), (23, 0, 24, 15), (25, 0, 23, 7), (26, 0, 31, 7), (27, 0, 32, 7),
                         (28, 0, 31, 8)):
        cb.add(bar, e, p, d, 56, **quiet)
    swell = []
    for bar in range(21, 29):
        x = (bar - 21) / 4 if bar <= 25 else 1 - (bar - 25) / 3 * (9 / 16)
        base = 48 + 16 * x
        swell += [(bar, 2 if bar == 21 else 0, base - 6), (bar, 4, base + 6), (bar, 7, base - 4)]
    cb.curve([(b, e, int(round(v))) for b, e, v in swell])
    # the heartbeat and the muffled drum with each lub
    beat = {22: 36, 23: 36, 24: 36, 25: 43, 26: 43, 27: 44, 28: 43}
    for bar, p in beat.items():
        heartbeat(s, bar, [0], lambda _b, p=p: p, 62, **quiet)
        drum(s, bar, 0, 38, hv=4, **quiet)
    # the soul in the flask
    lead = int(round(GLASS_LEAD_S / SEC_PER_TICK))
    s['Glass'].notes.append(Note(GLASS_NOTE, tick(22) - lead, tick(28, 6) - tick(22) + lead, 34,
                                 jitter=False, hv=2, vmax=B_VEL))
    s['Glass'].curve([(21, 7, 51), (28, 6, 127)], number=11, shape='lin')
    # low voices, mouths closed. The B of bar 25 comes a beat late (C3-G3 held as a suspension over the
    # B in the bass) so the hum does not shadow the Gedact's C4-B3 in octaves.
    s['Choir Whisper'].tied([(tick(21, 2), tick(25, 2), [48, 55]), (tick(25, 2), tick(27), [47, 53]),
                             (tick(27), tick(28), [48, 54]), (tick(28), tick(29), [47, 53])], 50, vmax=B_VEL)
    s['Choir Whisper'].curve([(21, 2, 40), (28, 7, 52)], shape='lin')
    bell(s, 23, 60, 52)


def awakening(s):
    """Bars 29-36 «El despertar»: Cm | Cm-Db | C#m | C#m-D | Dm | Dm-Eb | Ebm | G7(b9). Parallel minor
    triads a semitone apart (each bII becomes the next tonic); the heartbeat doubles, doubles again and
    becomes the gallop; the head of the motif climbs in horns and trombones, the choir opens above."""
    hn, tb = s['Horns Marc'], s['Trombones Marc']
    ev = at(29, HEADS)
    vels = [84 + 2 * (b - 29) + (4 if e == 0 else 0) + (3 if d == 8 else 0) for b, e, _, d in ev]
    hn.line(ev, vels)
    tb.line([(b, e, p - 12, d) for b, e, p, d in ev], [v - 2 for v in vels])
    hn.curve([(29, 0, 84), (35, 0, 107), (36, 7, 107)], shape='lin')
    tb.curve([(29, 0, 82), (36, 7, 104)], shape='lin')
    ch = s['Choir']
    voicings = {29: [72, 75, 79], 30: [72, 75, 79], 31: [73, 76, 80], 32: [73, 76, 80], 33: [74, 77, 81],
                34: [74, 77, 81], 35: [70, 75, 78], 36: [71, 74, 77]}
    for bar, chord in voicings.items():                 # a fresh attack every bar
        ch.chord(bar, 0, chord, 8, 80 + 2 * (bar - 29), legato=True)
    ch.curve([(29, 0, 70), (36, 7, 105)], shape='lin')
    pedal(s, 29, 36, lambda bar: 76 + min(4, bar - 29))
    for bar, lub in ((29, 70), (30, 74)):
        heartbeat(s, bar, [0, 2], lambda b, bar=bar: pc_in(chord_at(bar, 2 * b)[1], 36, 44), lub)
    for bar, lub in ((31, 80), (32, 86)):
        heartbeat(s, bar, [0, 1, 2, 3], lambda b, bar=bar: pc_in(chord_at(bar, 2 * b)[1], 36, 44), lub)
    for bar in range(33, 37):
        gallop(s, bar, 96, 72)
    s['Celli Trem'].curve([(29, 0, 60), (36, 7, 100)], shape='lin')
    roll = s['Timp Roll']
    roll.add(35, 0, 39, 8, 66, hv=3)
    roll.add(36, 0, 43, 8, 86, hv=3)
    roll.curve([(35, 0, 38), (36, 7, 127)], number=11, shape='lin')
    for bar, v in ((33, 80), (34, 86), (35, 92)):
        drum(s, bar, 0, v, hv=4)
    s['Bass Drum'].add(36, 0, BD_ROLL, 8, 96, hv=2, vmax=98)
    tom_roll(s, 32, v0=72, v1=86)
    tom_roll(s, 34, v0=80, v1=94)
    tom_roll(s, 36, first=4, n=4, v0=88, v1=100)


def undeath(s):
    """Bars 37-48 «La no-vida»: the motif at real speed in horns and trombones (37-40 in C minor, 41-44 in
    F minor, with Db7 as its German sixth and Gb as its Neapolitan), the choir shouting the 3+3+2 hits;
    then the cadence in augmentation (45-48) with Abmaj7 and the climax on beat 1 of bar 46."""
    hn, tb = s['Horns Marc'], s['Trombones Marc']
    real = at(37, MOTIF) + at(41, IN_F)
    shape = [96, 90, 94, 98, 92, 96, 92, 90, 96, 90, 96, 100, 94, 98]
    vels = shape + [v + 2 for v in shape]
    hn.line(real, vels)
    tb.line([(b, e, p - 12, d) for b, e, p, d in real], [v - 2 for v in vels])
    hn.curve([(37, 0, 100), (39, 0, 103), (40, 4, 102), (41, 0, 104), (43, 4, 107), (44, 5, 99)])
    tb.curve([(37, 0, 100), (43, 4, 108), (44, 5, 100)])
    # the cadence: choir and organ 8' in unison, horns an octave below
    cad = at(45, CADENCE)
    sing(cad)
    cad_shape = [0, 2, 6, 10, 6, 2, -2]
    s['Choir'].line(cad, [90 + o for o in cad_shape], legato=True)
    s['Organ 8'].line(cad, [84 + o * 0.5 for o in cad_shape], legato=True, hv=3)
    s['Horns'].line([(b, e, p - 12, d) for b, e, p, d in cad], [92 + o for o in cad_shape], legato=True)
    s['Choir'].curve([(37, 0, 100), (44, 3, 106)], shape='lin')
    s['Choir'].curve([(45, 0, 100), (46, 0, 110), (48, 7, 95)], shape='lin')
    s['Horns'].curve([(45, 0, 96), (46, 0, 108), (48, 7, 90)], shape='lin')
    for bar in range(45, 49):
        hits(s, bar, (100, 92, 96) if bar != 46 else (104, 94, 98), skip=(6,) if bar == 48 else ())
    tb.curve([(45, 0, 100), (46, 0, 110), (48, 3, 100)], shape='lin')
    for bar in range(37, 49):
        hits(s, bar, (100, 92, 96), trombones=False, tuba=True, skip=(6,) if bar in (44, 48) else ())
    s['Tuba Marc'].curve([(37, 0, 100), (46, 0, 110), (48, 3, 100)], shape='lin')
    pedal(s, 37, 48, 84)
    pedal(s, 37, 48, 70, track='Organ Violon')
    for bar in range(37, 49):
        gallop(s, bar, 97, 73, high=True)
        if bar == 46:
            timpani(s, bar, 104, 92, hv=0)
            s['Bass Drum'].add(bar, 0, BD_HIT, 1, 100, hv=0, vmax=100)
            drum(s, bar, 3, 90, hv=3, vmax=98)
            drum(s, bar, 6, 92, hv=3, vmax=98)
        else:
            timpani(s, bar, 94, None if bar == 48 else 82, vmax=100)
            for e, v in ((0, 94), (3, 86), (6, 90)):
                if not (bar == 48 and e == 6):
                    drum(s, bar, e, v, hv=4, vmax=98)
    tom_roll(s, 40, v0=74, v1=90)
    tom_roll(s, 44, first=4, n=4, v0=84, v1=100)
    tom_roll(s, 48, first=0, n=4, v0=80, v1=96)
    bell(s, 37, 60, 90)
    bell(s, 41, 65, 86)
    bell(s, 45, 60, 94, hv=1)
    gong(s, 37, 90)
    s['Gong'].add(46, 0, GONG_HIT, 2, 100, hv=0, vmax=100)


def codetta(s):
    """Bars 49-56 «El rito sigue»: Cm | Ab7 | G7(b13) | G7 || Cm | Cm | Db/C | G7(b9) -> bar 1. The organ alone
    with the first half of the hymn, the Gedact answering it; then the intro's texture, whose dominant
    leads back to the bell of bar 1 (the seam 56 -> 1 is the same as 4 -> 5)."""
    ev = at(49, HYMN[:8])
    sing(ev)
    shape = [0, 2, 4, 6, 8, 5, 3, 1]
    s['Organ 8'].line(ev, [78 + o * 0.5 for o in shape], legato=True, hv=3)
    s['Organ Stopped'].line(ev, [68 + o * 0.5 for o in shape], legato=True, hv=3)
    ged = s['Organ Gedact']
    ged.line(at(49, COUNTER), [58, 60, 57, 58, 61, 60, 58, 56, 54], legato=True)
    ged.curve([(49, 0, 60), (51, 0, 66), (52, 7, 58)])
    pedal(s, 49, 56, 76)
    bell(s, 49, 60, 70)
    for bar in range(49, 57):
        gallop(s, bar, 92, 68)
        drum(s, bar, 0, 78, hv=4)
        timpani(s, bar, 86, 70 if bar < 56 else None)
    hits(s, 55, (96, 88, 92))
    hits(s, 56, (98, 90, 96))
    s['Trombones Marc'].curve([(55, 0, 90), (56, 7, 100)])
    s['Celli Trem'].curve([(55, 0, 60), (56, 7, 85)])
    tom_roll(s, 52, v0=70, v1=92)
    tom_roll(s, 56, v0=70, v1=98)


# ── voice leading of the inner voices (celli tremolo, the choir's shouts) ─────────────────────────
def _spans(part: Part):
    """Written sounding spans for the voice-leading analysis: a short note (a hit) lasts until the next
    attack of its track if that comes within three eighths (the ear hears the hammer as a line)."""
    notes = sorted(part.notes, key=lambda n: n.ws)
    onsets = sorted({n.ws for n in notes})
    spans = []
    for n in notes:
        i = bisect.bisect_right(onsets, n.ws)
        end = n.we
        if i < len(onsets) and n.we < onsets[i] <= n.we + 3 * E8:
            end = onsets[i]
        spans.append((n.ws, end, n.pitch))
    return spans


def son(spans, t: int) -> list[int]:
    return sorted({p for a, b, p in spans if a <= t < b})


def _parallel(a0, a1, b0, b1) -> str | None:
    if a0 == a1 or b0 == b1 or (a1 - a0) * (b1 - b0) <= 0 or abs(a1 - a0) > 7 or abs(b1 - b0) > 7:
        return None
    i0, i1 = abs(a0 - b0) % 12, abs(a1 - b1) % 12
    if i0 == i1 and i0 in (0, 7):
        return 'P8' if i0 == 0 else 'P5'
    return None


def _motions(X1, X2):
    """How the voices of a sonority move: by register when the number of voices stays (each written
    voice is a line), to the nearest pitch when it changes (as the ear follows them)."""
    if len(X1) == len(X2):
        return list(zip(X1, X2))
    return [(x, min(X2, key=lambda q: (abs(q - x), q))) for x in X1]


def moving_parallels(A1, A2, B1, B2, same=False):
    """Parallel perfect 5ths/8ves between two sonorities in motion (or between the voices of one chord
    track when same=True)."""
    found = []
    if same:
        if len(A1) != len(A2) or len(A1) < 2:
            return found
        lines = _motions(A1, A2)
        for (a0, a1), (b0, b1) in itertools.combinations(lines, 2):
            kind = _parallel(a0, a1, b0, b1)
            if kind:
                found.append((a0, a1, b0, b1, kind))
        return found
    for a0, a1 in _motions(A1, A2):
        for b0, b1 in _motions(B1, B2):
            kind = _parallel(a0, a1, b0, b1)
            if kind:
                found.append((a0, a1, b0, b1, kind))
    return found


def best_path(segs, candidates, cost, before=None):
    """Viterbi over the candidate voicings of each segment."""
    layer = [(cost(before, c, None, segs[0]) if before else 0, [c]) for c in candidates[0]]
    for i in range(1, len(segs)):
        nxt = []
        for c in candidates[i]:
            best = min(((pc + cost(pp[-1], c, segs[i - 1], segs[i]), pp) for pc, pp in layer), key=lambda x: x[0])
            nxt.append((best[0], best[1] + [c]))
        layer = nxt
    total, path = min(layer, key=lambda x: x[0])
    if total >= 1000:
        raise ValueError(f'voice leading with parallels (cost {total}): {path}')
    return path


def lead_voices(segs, candidates, ext, before=None):
    """segs: dicts with t0. ext: [(spans, octave_ok)] of the parts the voices must not move in parallel
    with. Cost: motion (leaps weigh more) + 1000 per parallel 5th/8ve (inside and against ext)."""
    def cost(prev, cur, sp, sc):
        t = sc['t0']
        c = sum(abs(a - b) + max(0, abs(a - b) - 4) * 2 for a, b in zip(prev, cur)) + sc['static'](cur)
        if prev == cur:
            return c
        c += 1000 * len(moving_parallels(list(prev), list(cur), [], [], same=True))
        for spans, octave_ok in ext:
            B1, B2 = son(spans, t - 1), son(spans, t)
            if not B1 or not B2:
                continue
            for *_, kind in moving_parallels(list(prev), list(cur), B1, B2):
                if not (kind == 'P8' and octave_ok):
                    c += 1000
        return c
    return best_path(segs, candidates, cost, before)


def celli_cost(v, fifth) -> int:
    """Root + fifth is the brief's figure; the root alone costs a little, root + third more (and more the
    lower it sits: a close third below the low-interval limit muddies the tremolo)."""
    if len(v) == 1:
        return 45
    if {p % 12 for p in v} == fifth:
        return 0
    return 40 + 4 * max(0, 46 - v[0])


CELLI_ANCHOR = {(3, 0): (37, 44), (4, 0): (38, 43)}   # Db2-Ab2, then D2-G2 (not G2-D3: no 5ths Db-Ab -> G-D)


def celli(s):
    """Celli tremolo: root + fifth of each chord in 36-50, voice-led per half bar (common tones held,
    no parallel 5ths/8ves against each other, the tune, the hits, the choir or the pedal). The root alone
    (or root + third) is allowed at a cost, only where every root + fifth would move in parallel (bars
    35-36: Eb2-Bb2 can only go to D2-G2, octaves with the choir's Eb5-D5, or to G2-D3, fifths with the
    pedal Eb-G). Bars 3-4 and 55-56 are fixed (the same figure, for the seam)."""
    pd = _spans(s['Organ Pedal'])
    tb = _spans(s['Trombones Marc'])
    runs = [(3, 20, [(_spans(s['Choir']), False), (_spans(s['Horns']), False), (pd, True), (tb, True)]),
            (29, 36, [(_spans(s['Horns Marc']), False), (tb, False), (pd, True), (_spans(s['Choir']), False)]),
            (55, 56, [(pd, True), (tb, True)])]
    for first, last, ext in runs:
        segs = []
        for bar in range(first, last + 1):
            for e0, e1, name, bass in segments(bar):
                tones = CHORDS[name]
                anchor = CELLI_ANCHOR.get((bar if bar < 50 else bar - 52, e0))
                fifth = {tones[0], tones[2]}
                segs.append(dict(t0=tick(bar, e0), t1=tick(bar, e1), pcs=[fifth, {tones[0], tones[1]}], bass=bass,
                                 bar=bar, anchor=anchor, root=tones[0], static=lambda v, f=fifth: celli_cost(v, f)))
        cands = []
        for sg in segs:
            if sg['anchor']:
                cands.append([sg['anchor']])
                continue
            out = []
            for a, b in itertools.combinations(range(36, 51), 2):
                if {a % 12, b % 12} not in sg['pcs'] or b - a > 12:
                    continue
                low_ok = 33 <= sg['bar'] or sg['bar'] < 29 or a % 12 == sg['bass'] \
                    or a >= pc_in(sg['bass'], 36, 47)                         # bars 29-32 have no gallop
                if low_ok:
                    out.append((a, b))
            r = place(sg['root'], 36, 50)
            if 33 <= sg['bar'] or sg['bar'] < 29 or r % 12 == sg['bass'] or r >= pc_in(sg['bass'], 36, 47):
                out.append((r,))
            cands.append(out)
        path = lead_voices(segs, cands, ext)
        s['Celli Trem'].tied([(sg['t0'], sg['t1'], list(v)) for sg, v in zip(segs, path)], 70)


SHOUT_NEED = {'Cm': {0, 3}, 'Ab7': {0, 6}, 'G7(b13)': {3, 7}, 'G7': {5}, 'C7': {4, 10}, 'Fm': {8},
              'Db7': {5, 11}, 'C7(b13)': {4, 8}}
SHOUT_ANCHOR = {(37, 0): (72, 75, 79), (37, 6): (72, 75, 78), (41, 0): (72, 77, 80), (41, 6): (71, 77, 80)}


def shouts(s):
    """Climax 37-44: the choir shouts the chord of each half bar on the 3+3+2 hits (eighths 0, 3, 6),
    three voices between G4 and Ab5, voice-led against the brass tune and the pedal. Beat 4 of bar 44 is
    the breath before the cadence."""
    ext = [(_spans(s['Horns Marc']), False), (_spans(s['Trombones Marc']), False), (_spans(s['Organ Pedal']), False)]
    segs = []
    for bar in range(37, 45):
        for e in (0, 6):
            if bar == 44 and e == 6:
                continue
            name, _ = chord_at(bar, e)
            segs.append(dict(t0=tick(bar, e), bar=bar, e=e, chord=name, anchor=SHOUT_ANCHOR.get((bar, e)),
                             static=lambda v: sum(3 for x, y in zip(v, v[1:]) if y - x > 7)
                             + sum(12 for x, y in zip(v, v[1:]) if y - x == 1)))     # no semitone clusters
    cands = []
    for sg in segs:
        if sg['anchor']:
            cands.append([sg['anchor']])
            continue
        pcs = set(CHORDS[sg['chord']])
        out = []
        for v in itertools.combinations(range(67, 81), 3):
            got = [p % 12 for p in v]
            if not set(got) <= pcs or not SHOUT_NEED[sg['chord']] <= set(got):
                continue
            if got.count(11) > 1 or any(got.count(x) > 2 for x in got) or any(y - x > 9 for x, y in zip(v, v[1:])):
                continue
            out.append(v)
        cands.append(out)
    path = lead_voices(segs, cands, ext, before=(71, 74, 77))   # the bridge's last chord
    ch = s['Choir']
    for sg, v in zip(segs, path):
        for e in ((0, 3) if sg['e'] == 0 else (6,)):
            ch.chord(sg['bar'], e, list(v), 1, (96, None, None, 88, None, None, 92)[e])


# ── performance: humanization, legato, seams ─────────────────────────────────
def perform(parts: dict[str, Part]):
    rng = random.Random(SEED)
    for part in parts.values():
        part.notes.sort(key=lambda n: (n.ws, n.pitch))
        for n in part.notes:
            lo = 0 if n.ws in NO_EARLY else -HUMAN_TICKS
            d = rng.randint(lo, HUMAN_TICKS) if n.jitter else 0
            n.start = max(0, n.ws + d)
            n.end = n.start + n.dur
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
            n.vel = max(1, min(n.vmax, n.vel))
        starts: dict[int, list[Note]] = {}
        for n in part.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = starts.get(n.we, [])
            if any(m.pitch == n.pitch for m in nxt):
                n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
            elif n.legato and nxt:
                n.end = min(m.start for m in nxt) + rng.randint(*LEGATO)
            elif nxt:
                n.end = min(n.end, min(m.start for m in nxt) - DETACH)
            else:
                n.end = min(n.end, n.start + n.dur - GUARD)
            n.end = min(n.end, LOOP_END - GUARD)
        by_pitch: dict[int, Note] = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = by_pitch.get(n.pitch)
            if prev is not None and prev.end > n.start - 6:
                prev.end = n.start - 6
            by_pitch[n.pitch] = n


def build() -> dict[str, Part]:
    MELODY.clear()
    s = new_parts()
    for section in (intro, rite, congregation, phylactery, awakening, undeath, codetta):
        section(s)
    celli(s)
    shouts(s)
    for part in s.values():                          # every controller curve starts at tick 0
        for number, store in part.cc.items():
            if 0 not in store:
                store[0] = store[min(store)]
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
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Cm', time=0))
        events = []
        for number, store in part.cc.items():
            for t, v in store.items():
                events.append((t, 1, mido.Message('control_change', channel=part.channel, control=number, value=v)))
        for n in part.notes:
            events.append((n.start, 2, mido.Message('note_on', channel=part.channel, note=n.pitch, velocity=n.vel)))
            events.append((n.end, 0, mido.Message('note_off', channel=part.channel, note=n.pitch, velocity=0)))
        now = 0
        for t, _, msg in sorted(events, key=lambda e: (e[0], e[1], getattr(e[2], 'note', 0),
                                                       getattr(e[2], 'control', 0))):
            tr.append(msg.copy(time=t - now))
            now = t
        tr.append(mido.MetaMessage('end_of_track', time=LOOP_END - now))
        mid.tracks.append(tr)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    mid.save(path)
    return parts


# ── verification ─────────────────────────────────────────────────────────────
RANGES = {
    'Choir': (47, 81), 'Choir Whisper': (47, 55), 'Organ Pedal': (36, 47), 'Organ Violon': (36, 47),
    'Organ 8': (59, 80), 'Organ Stopped': (59, 80), 'Organ Gedact': (59, 68), 'Horns Marc': (59, 73),
    'Horns': (59, 73), 'Trombones Marc': (43, 61), 'Tuba Marc': (28, 43), 'Celli Trem': (36, 50),
    'Contrabassoon': (23, 32), 'Gallop': (24, 47), 'Gallop 8va': (36, 59), 'Timpani': (36, 44),
    'Timp Roll': (36, 44), 'Bell': (60, 67), 'Glass': (75, 75), 'Bass Drum': (62, 63), 'Tom': (62, 62),
    'Gong': (60, 60),
}
MAX_NOTE_S = {'Horns Marc': 2.8, 'Horns': 2.8, 'Trombones Marc': 2.2, 'Tuba Marc': 0.4, 'Glass': 20.0,
              'Timp Roll': 16.0}
MELODIES = [(('Choir', 'Organ 8', 'Organ Stopped'), 5, 12), (('Choir', 'Horns', 'Organ 8', 'Organ Stopped'), 13, 20),
            (('Organ Gedact',), 21, 28), (('Horns Marc', 'Trombones Marc'), 29, 36),
            (('Horns Marc', 'Trombones Marc'), 37, 44), (('Choir', 'Organ 8', 'Horns'), 45, 48),
            (('Organ 8', 'Organ Stopped'), 49, 52)]
LEITMOTIF = [('Choir', at(5, HYMN)), ('Organ 8', at(5, HYMN)), ('Choir', at(13, HYMN)), ('Horns', at(13, HYMN)),
             ('Organ Gedact', at(21, RETRO)), ('Horns Marc', at(29, HEADS)), ('Horns Marc', at(37, MOTIF)),
             ('Horns Marc', at(41, IN_F)), ('Choir', at(45, CADENCE)), ('Organ 8', at(49, HYMN[:8]))]

# Voice-leading analysis. Roles: the tune of section 5, the bass (16' pedal, contrabassoon) and the inner
# voices. Octave doublings that are part of the orchestration are exempt (tune in unison/octaves, the
# celli and the hits doubling the bass, the low hum doubling it in B); so are the bridge's planed triads.
VOICES = ['Choir', 'Choir Whisper', 'Organ Gedact', 'Organ 8', 'Horns', 'Horns Marc', 'Trombones Marc',
          'Celli Trem', 'Organ Pedal', 'Contrabassoon']
TUNE = {'Choir': [(5, 20), (45, 48)], 'Organ 8': [(5, 20), (45, 52)], 'Horns': [(13, 20), (45, 48)],
        'Organ Gedact': [(21, 28)], 'Horns Marc': [(29, 44)], 'Trombones Marc': [(29, 44)]}
BASS_VOICES = {'Organ Pedal', 'Contrabassoon'}
HIT_BARS = [(1, 28), (45, 56)]
BASS_DOUBLINGS = [(frozenset({'Organ Pedal', 'Celli Trem'}), [(1, 56)]),
                  (frozenset({'Organ Pedal', 'Trombones Marc'}), HIT_BARS),
                  (frozenset({'Celli Trem', 'Trombones Marc'}), HIT_BARS),
                  (frozenset({'Choir Whisper', 'Contrabassoon'}), [(21, 28)]),
                  (frozenset({'Choir Whisper', 'Organ Pedal'}), [(21, 28)])]
# Outer-voice parallels the brief's own tune (section 5) and bass (section 4, in fixed registers: gallop
# 24-35, pedal 36-47) impose (bar, eighth, interval): the retrograde's C4-B3 over the bass C-B (25); the
# motif's G-Ab over C-Db and its sequence's C-Db over F-Gb, on beat 3 (39, 43); the tune's G-C over the
# bass G-C at real speed (40) and in the cadence (47); the sequence entering on F over the bass C-F (41);
# the cadence's Ab5-G5 over Ab-G (46). The tune doubles the bass at those points; they are reported, not
# hidden. No other voice moves in parallel 5ths/8ves.
BRIEF_OUTER_PARALLELS = {(25, 0, 'P8'), (39, 4, 'P5'), (40, 0, 'P8'), (41, 0, 'P8'), (43, 4, 'P5'),
                         (46, 4, 'P8'), (47, 0, 'P8')}


def sec(t: int) -> float:
    return t * SEC_PER_TICK


def bar_of(t: int) -> int:
    return t // BAR + 1


def role(name: str, bar: int) -> str:
    if name in BASS_VOICES:
        return 'bass'
    return 'tune' if any(a <= bar <= b for a, b in TUNE.get(name, [])) else 'inner'


def parallels(parts) -> tuple[list[str], list[tuple[int, int, str]]]:
    """(inner, outer): parallel 5ths/8ves on the written score. inner = anything that is not between the
    tune and the bass (must be empty); outer = tune against bass (brief-imposed, listed above)."""
    spans = {name: _spans(parts[name]) for name in VOICES}
    onsets = {name: sorted({n.ws for n in parts[name].notes}) for name in VOICES}
    inner, outer = [], set()
    for i, a in enumerate(VOICES):
        for b in VOICES[i:]:
            times = sorted(set(onsets[a]) | set(onsets[b]))
            for t2 in times:
                if t2 == 0:
                    continue
                A1, A2, B1, B2 = son(spans[a], t2 - 1), son(spans[a], t2), son(spans[b], t2 - 1), son(spans[b], t2)
                if not (A1 and A2 and B1 and B2) or (A1 == A2 and B1 == B2):
                    continue
                found = moving_parallels(A1, A2, [], [], same=True) if a == b else moving_parallels(A1, A2, B1, B2)
                bar, eighth = bar_of(t2), (t2 % BAR) // E8
                ra, rb = role(a, bar), role(b, bar)
                for pa, qa, pb, qb, kind in found:
                    if a == b == 'Choir' and 29 <= bar <= 36:
                        continue                                   # planed triads (brief, section 4)
                    if kind == 'P8' and (ra == rb != 'inner' or any(
                            pair == frozenset({a, b}) and any(x <= bar <= y for x, y in rng)
                            for pair, rng in BASS_DOUBLINGS)):
                        continue
                    if {ra, rb} == {'tune', 'bass'}:
                        outer.add((bar, eighth, kind))
                    else:
                        inner.append(f'{a}/{b} b{bar}e{eighth} {kind} {name_of(pa)}-{name_of(qa)} / '
                                     f'{name_of(pb)}-{name_of(qb)}')
    return inner, sorted(outer)


def repetitions(parts) -> list[str]:
    """Two-bar windows of the whole texture (every track) repeated identical more than twice."""
    seen: dict[tuple, list[int]] = {}
    for bar in range(1, BARS):
        sig = tuple(sorted((p.name, n.ws - tick(bar), n.pitch, n.dur) for p in parts.values()
                           for n in p.notes if tick(bar) <= n.ws < tick(bar + 2)))
        seen.setdefault(sig, []).append(bar)
    return [f'bars {bars}' for bars in seen.values() if len(bars) > 2]


def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack' for k in range(r.lokey, r.hikey + 1)}


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


def verify(parts: dict[str, Part]) -> bool:
    ok_all = True
    rows = []

    def check(label, ok, detail=''):
        nonlocal ok_all
        ok_all &= bool(ok)
        rows.append((label, 'OK' if ok else 'FAIL', detail))

    print(f"\n{'track':<15} {'patch':<46} {'notes':>5}  {'range used':<16} {'patch':<7} {'brief':<7} dyn")
    bad_range = []
    for name, part in parts.items():
        keys = sfz_keys(part.sfz_path)
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        rlo, rhi = RANGES[name]
        outside = sorted({n.pitch for n in part.notes if n.pitch not in keys or not rlo <= n.pitch <= rhi})
        if outside:
            bad_range.append(f'{name}: {outside}')
        print(f'{name:<15} {os.path.basename(part.sfz_path)[:46]:<46} {len(part.notes):>5}  '
              f'{name_of(lo) + "-" + name_of(hi) + f" ({lo}-{hi})":<16} {min(keys)}-{max(keys):<4} '
              f'{rlo}-{rhi:<4} {part.dynamics}')
    if bad_range:
        raise SystemExit('notes outside the patch or the brief\'s register: ' + '; '.join(bad_range))
    every = [(p, n) for p in parts.values() for n in p.notes]
    check('1  56 bars 4/4 at 144; every note inside 93.333 s',
          all(0 <= n.start < LOOP_END and n.end < LOOP_END for _, n in every),
          f'loop {sec(LOOP_END):.3f} s, last note-off {sec(max(n.end for _, n in every)):.3f} s')
    check('2  ranges of the patches and the brief', True, 'choir A/A\' <= 68, 67-81 in 29-48')
    chorus = [n for n in parts['Choir'].notes if (5 <= bar_of(n.ws) <= 20 and n.pitch > 68)
              or (29 <= bar_of(n.ws) <= 48 and n.pitch < 67)]
    check('2  choir registers per section', not chorus, str([(bar_of(n.ws), n.pitch) for n in chorus][:4]))
    for name, events in LEITMOTIF:
        miss = [f'b{b}e{e}:{p}' for b, e, p, d in events
                if not any(n.ws == tick(b, e) and n.pitch == p and n.dur == d * E8 for n in parts[name].notes)]
        check(f'3  leitmotif in {name} bars {events[0][0]}-{events[-1][0]}', not miss, ' '.join(miss[:4]))
    short = [p.name for p in parts.values() for a, b in zip(sorted({n.ws for n in p.notes}),
                                                            sorted({n.ws for n in p.notes})[1:]) if b - a < E8]
    check('4  nothing faster than an eighth', not short, ', '.join(sorted(set(short))))
    for label, first, last, limit in SECTIONS:
        worst, where = sounding(parts, tick(first), tick(last + 1))
        check(f'5  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit,
              f'max {worst} at bar {bar_of(where)}')
    clashes = []
    for tracks, first, last in MELODIES:
        t0, t1 = (tick(21, 2) if first == 21 else tick(first)), tick(last + 1)
        mel = [(parts[t], n) for t in tracks for n in parts[t].notes if t0 <= n.ws < t1]
        for name, part in parts.items():
            if name in tracks or not part.pitched:
                continue
            for o in part.notes:
                if o.end - o.start < BEAT - 46 or (name == 'Bell' and bar_of(o.ws) == 5):
                    continue
                held = int(round(0.06 / SEC_PER_TICK))      # more than a legato tail plus the humanization
                near = [(mp, m) for mp, m in mel if min(m.end, o.end, t1) - max(m.start, o.start, t0) > held
                        and abs(m.pitch - o.pitch) <= 11]
                if near and part.level(o) >= max(mp.level(m) for mp, m in near):
                    clashes.append(f'{name} {name_of(o.pitch)} L{part.level(o)} b{bar_of(o.ws)}')
    check('6  no register clash with the melody', not clashes, '; '.join(clashes[:4]))
    allowed = {'Organ Gedact', 'Organ Pedal', 'Contrabassoon', 'Timpani', 'Bass Drum', 'Glass', 'Choir Whisper', 'Bell'}
    lo, hi = tick(21, 2), tick(29)
    intruders = sorted({p.name for p, n in every if (lo - HUMAN_TICKS <= n.start < hi and p.name not in allowed)
                        or (n.start < lo and n.end > lo and p.name not in allowed)})
    loud = [p.name for p, n in every if lo - HUMAN_TICKS <= n.start < hi and n.vel > B_VEL]
    loud += [p.name for p in parts.values() for t, v in p.cc.get(1, {}).items() if lo <= t < hi and v > B_CC1]
    check('7  the phylactery: only its eight tracks, vel <= 62, CC1 <= 72', not intruders and not loud,
          ', '.join(intruders + sorted(set(loud))))
    vmax = max(n.vel for _, n in every)
    ccmax = max(v for p in parts.values() for v in p.cc.get(1, {}).values())
    check('8  velocity <= 105, CC1 <= 112', vmax <= MAX_VEL and ccmax <= MAX_CC1, f'vel {vmax}, CC1 {ccmax}')
    for name in ('Choir', 'Horns'):
        pts = parts[name].cc[1]
        inside = max(v for t, v in pts.items() if tick(46) <= t < tick(47))
        outside = max(v for t, v in pts.items() if not tick(46) <= t < tick(47))
        check(f'8  highest CC1 of {name} in bar 46', inside > outside, f'{inside} vs {outside}')
    for name in ('Timpani', 'Bass Drum', 'Gong'):
        inside = max(n.vel for n in parts[name].notes if bar_of(n.ws) == 46)
        outside = max(n.vel for n in parts[name].notes if bar_of(n.ws) != 46)
        check(f'8  loudest {name} in bar 46', inside > outside, f'{inside} vs {outside}')
    missing = [p.name for p in parts.values() if p.dynamics == 'cc1' and 0 not in p.cc.get(1, {})]
    check('9  every Sonatina CC1 track has CC1 at tick 0', not missing, ', '.join(missing))
    long_ = [f'{name} b{bar_of(n.ws)} {sec(n.end - n.start):.2f}s' for name, limit in MAX_NOTE_S.items()
             for n in parts[name].notes if sec(n.end - n.start) > limit]
    check('9  note lengths (horns 2.8, trombones 2.2, tuba 0.4, glass 20, roll 16 s)', not long_, '; '.join(long_[:4]))
    dense = [p.name for p in parts.values() for store in p.cc.values()
             if any(b - a < CC_STEP for a, b in zip(sorted(store), sorted(store)[1:]))]
    check('   controller points at most every 1/8 bar', not dense, ', '.join(dense))
    pattern = []
    for n in parts['Gallop'].notes:
        bar, e = bar_of(n.ws), (n.ws % BAR) // E8
        want = pc_in(chord_at(bar, e)[1], 24, 35) + (12 if e in (2, 6) else 0)
        if n.pitch != want:
            pattern.append(f'b{bar}e{e}')
    hits_off = [f'{p} b{bar_of(n.ws)}' for p in ('Trombones Marc', 'Tuba Marc') for n in parts[p].notes
                if not (p == 'Trombones Marc' and 29 <= bar_of(n.ws) <= 44) and (n.ws % BAR) // E8 not in (0, 3, 6)]
    check('10 gallop pattern; hits only on eighths 0, 3, 6', not pattern and not hits_off,
          '; '.join(pattern[:3] + hits_off[:3]))
    lubs = {bar: sum(1 for n in parts['Timpani'].notes if bar_of(n.ws) == bar and (n.ws % BAR) % BEAT == 0)
            for bar in range(22, 33)}
    want = {**{b: 1 for b in range(22, 29)}, 29: 2, 30: 2, 31: 4, 32: 4}
    check('10 heartbeat: 1 lub (22-28), 2 (29-30), 4 (31-32)', lubs == want, str(lubs))
    counts = {name: sorted(bar_of(n.ws) for n in parts[name].notes) for name in ('Bell', 'Gong', 'Glass')}
    check('11 bell 9, gong 4, glass 1', counts['Bell'] == [1, 5, 9, 13, 23, 37, 41, 45, 49]
          and counts['Gong'] == [1, 21, 37, 46] and len(counts['Glass']) == 1, str(counts))
    wrong = []
    for bar in range(1, BARS + 1):
        for e in (0, 4):
            when = tick(bar, e) + int(round(0.03 / SEC_PER_TICK))
            low = min((n.pitch for p in parts.values() if p.pitched for n in p.notes if n.start <= when < n.end),
                      default=None)
            if low is None or low % 12 != chord_at(bar, e)[1]:
                wrong.append(f'b{bar}e{e}:{name_of(low) if low else "-"}')
    check('12 lowest note on beats 1 and 3 = bass of section 4', not wrong, ' '.join(wrong[:5]))
    inner, outer = parallels(parts)
    check('   no parallel 5ths/8ves in the inner voices', not inner, '; '.join(inner[:4]))
    check('   tune/bass parallels only where the brief imposes them', set(outer) <= BRIEF_OUTER_PARALLELS,
          ', '.join(f'b{b}e{e} {k}' for b, e, k in outer))
    rep = repetitions(parts)
    check('   no 2-bar phrase (whole texture) repeated identical more than twice', not rep, '; '.join(rep[:3]))
    overlaps = []
    for p in parts.values():
        starts = {}
        for n in p.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in p.notes:
            nxt = starts.get(n.we, [])
            if n.legato and nxt and all(m.pitch != n.pitch for m in nxt):
                overlaps.append(sec(n.end - min(m.start for m in nxt)) * 1000)
    check('   legato overlaps 10-30 ms', overlaps and all(10 <= o <= 30.5 for o in overlaps),
          f'{len(overlaps)} joins, {min(overlaps):.1f}-{max(overlaps):.1f} ms')

    print(f"\n{'check':<70} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<70} {status:<4} {detail}')
    return ok_all


def main():
    parts = write_midi(OUT)
    ok = verify(parts)
    print(f'\nwritten {OUT}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
