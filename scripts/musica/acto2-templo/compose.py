"""«Vísperas del pozo» (Act II, El Templo Oscuro): score generator.

Brief: docs/musica/acto2-templo.md. One description of form, harmony and melody renders two
synchronized versions of the same song:

  build/acto2-templo-explora.mid   (map and events: the office at half voice)
  build/acto2-templo-combate.mid   (normal and elite fights: the invocation in full cry)

Both have 28 bars of 4/4 at quarter = 80 (84.000 s), one MIDI track per instrument and articulation,
the same reference melody in the same tracks (`Choir Low` = Large Chorus, `Choir High` = Mixed Chorus,
identical notes and ticks; only their CC1 changes) and the common layers (`Organ Pedal`, `Contrabassoon`
with its CC1, `Frame Drum`) identical note for note. Prints a verification table and exits with status 1
if any check fails.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-templo/compose.py
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
SIXTEENTH = TPB // 4
EIGHTH = TPB // 2
BEAT = TPB
BAR = 4 * TPB
BARS = 28
LOOP_END = BARS * BAR
BPM = 80
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                  # at most one controller point per eighth (1/8 bar)
HUMAN_TICKS = int(0.008 / SEC_PER_TICK)             # +-8 ms (5 ticks = 7.8 ms)
HUMAN_VEL = 6
SEED = 2101
GUARD = 12                                          # ticks a note stops before a section edge / the seam
SAME_PITCH_GAP = 12                                 # note-off before a repeated note of the same pitch
SYLLABLE_GAP = int(round(0.060 / SEC_PER_TICK))     # recitation: each syllable released 60 ms early
BREATH = 48                                         # a wind player's breath (75 ms)
LEGATO_MIN, LEGATO_MAX = 7, 19                      # legato overlaps of 10.9-29.7 ms
VERSIONS = ('explora', 'combate')
CEILING = {'explora': (80, 92), 'combate': (104, 112)}   # (velocity, CC1)
COMMON_VEL_CEILING = 80                             # tracks shared by both versions obey the lower ceiling
OUT_DIR = os.path.join(HERE, 'build')

# (label, first bar, last bar, max layers E, max layers C)
SECTIONS = [('Intro', 1, 2, 6, 11), ('A', 3, 6, 8, 14), ("A'", 7, 10, 8, 14), ('B', 11, 16, 7, 11),
            ('Bridge', 17, 20, 8, 14), ('Return', 21, 26, 10, 14), ('Codetta', 27, 28, 6, 10)]
B_BARS = range(11, 17)
ACCENTS = (0, 3, 6, 8, 11, 14)                      # 3+3+2, twice


def T(bar: int, s: float = 0) -> int:
    """Tick of sixteenth `s` (0-15) of `bar` (1-based)."""
    return (bar - 1) * BAR + int(round(s * SIXTEENTH))


SECTION_TICKS = {T(first) for _, first, *_ in SECTIONS if first > 1}


def out_path(version: str, folder: str = OUT_DIR) -> str:
    return os.path.join(folder, f'acto2-templo-{version}.mid')


# ── patches ──────────────────────────────────────────────────────────────────
_VSCO = 'VSCO-2-CE/{}.sfz'.format
_VCSL = 'VCSL/'
_SSO = 'sso/Sonatina Symphonic Orchestra/'
PATCHES = {
    'Choir Low': _SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Choir High': _SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Chant': _SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Organ Pedal': _SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
    'Organ': _SSO + 'Organ/Great - Stopped Diapason 8ft.sfz',
    'Organ Open': _SSO + 'Organ/Great - Open Diapason 8ft.sfz',
    'Contrabassoon': _SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
    'Cor Anglais': _SSO + 'Woodwinds - Performance/Cor Anglais Solo Sustain.sfz',
    'Trombones': _SSO + 'Brass - Performance/Trombones Sustain (looped).sfz',
    'Horns': _SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Brass Stabs': _SSO + 'Brass - Performance/Horns Marcato.sfz',
    'Ostinato': _VSCO('CelloEnsSpic'),
    'Ostinato Low': _VSCO('ContrabassSpic'),
    'Daggers': _VSCO('ViolinEnsSpic'),
    'Timp Roll': _VSCO('TimpaniRolls'),
    'Timpani': _VSCO('Timpani'),
    'Frame Drum': _VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz',
    'Darbuka': _VCSL + 'Membranophones/Struck Membranophones/Darbuka.sfz',
    'Bass Drum': _VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Tom': _VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz',
    'Finger Cymbals': _VCSL + 'Idiophones/Struck Idiophones/Finger Cymbals.sfz',
    'Hand Bell': _VCSL + 'Idiophones/Struck Idiophones/Hand Bells, Nepalese.sfz',
    'Bell': _VCSL + 'Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
    'Broken Bells': _VCSL + 'Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
    'Gong': _VCSL + 'Idiophones/Struck Idiophones/Gong 1.sfz',
    'Metal': _VCSL + 'Idiophones/Struck Idiophones/Gong 2.sfz',
}
# Score order of each version. Every articulation is its own track (and its own .sfz).
LAYOUT = {
    'explora': ['Choir Low', 'Choir High', 'Cor Anglais', 'Organ', 'Organ Open', 'Organ Pedal', 'Contrabassoon',
                'Timp Roll', 'Frame Drum', 'Darbuka', 'Finger Cymbals', 'Hand Bell', 'Bell', 'Gong'],
    'combate': ['Choir Low', 'Choir High', 'Chant', 'Trombones', 'Horns', 'Brass Stabs', 'Organ Pedal',
                'Contrabassoon', 'Ostinato', 'Ostinato Low', 'Daggers', 'Timpani', 'Timp Roll', 'Frame Drum',
                'Bass Drum', 'Tom', 'Metal', 'Broken Bells', 'Finger Cymbals'],
}
COMMON = ('Organ Pedal', 'Contrabassoon', 'Frame Drum')
CHOIRS = ('Choir Low', 'Choir High')
SONATINA_CC1 = {'Choir Low', 'Choir High', 'Contrabassoon', 'Cor Anglais', 'Trombones', 'Horns', 'Brass Stabs',
                'Chant'}
MAX_S = {'Cor Anglais': 2.8, 'Horns': 2.8, 'Brass Stabs': 0.3, 'Daggers': 0.1, 'Timp Roll': 16.0}
UNPITCHED = {'Frame Drum', 'Darbuka', 'Bass Drum', 'Tom', 'Finger Cymbals', 'Hand Bell', 'Gong', 'Metal'}
BELLS = {'Bell', 'Broken Bells'}
REGISTERS = {'Choir Low': (52, 66), 'Choir High': (69, 78), 'Chant': (43, 54), 'Trombones': (52, 66),
             'Horns': (59, 70), 'Brass Stabs': (41, 55), 'Cor Anglais': (63, 70), 'Ostinato': (46, 58),
             'Ostinato Low': (28, 46), 'Organ': (45, 56), 'Organ Open': (45, 56), 'Organ Pedal': (37, 48),
             'Contrabassoon': (28, 37), 'Timpani': (41, 46)}
# Suggested placement for the mix (pan -1 left .. 1 right); the shared tracks sit in the same place.
PAN = {'Choir Low': -0.2, 'Choir High': 0.2, 'Chant': 0.0, 'Organ Pedal': 0.0, 'Organ': -0.1, 'Organ Open': 0.1,
       'Contrabassoon': -0.1, 'Cor Anglais': 0.3, 'Trombones': 0.3, 'Horns': -0.3, 'Brass Stabs': -0.25,
       'Ostinato': 0.3, 'Ostinato Low': 0.35, 'Daggers': -0.4, 'Timp Roll': 0.15, 'Timpani': 0.15,
       'Frame Drum': 0.2, 'Darbuka': -0.2, 'Bass Drum': 0.0, 'Tom': 0.15, 'Finger Cymbals': -0.3,
       'Hand Bell': 0.35, 'Bell': -0.2, 'Broken Bells': -0.2, 'Gong': 0.25, 'Metal': 0.25}

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def P(name) -> int:
    """'F#4' / 'Bb2' / 66 -> MIDI number (C4 = 60)."""
    if isinstance(name, int):
        return name
    step, rest, acc = name[0], name[1:], 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


def name_of(p: int) -> str:
    return _NAMES[p % 12] + str(p // 12 - 1)


def in_range(pc: int, lo: int, hi: int) -> int:
    """The single pitch of pitch class `pc` in [lo, lo + 11] (hi only bounds the check)."""
    p = next(x for x in range(lo, lo + 12) if x % 12 == pc % 12)
    if p > hi:
        raise ValueError(f'{name_of(p)} above {hi}')
    return p


# ── harmony (section 4 of the brief, common to both versions) ────────────────
QUALITIES = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10),
             '7sus4': (0, 5, 7, 10), '7b9': (0, 4, 7, 10, 1), '7b13': (0, 4, 7, 10, 8), 'madd9': (0, 3, 7, 2),
             'dim7': (0, 3, 6, 9)}


@dataclass(frozen=True)
class Chord:
    symbol: str
    root: int
    pcs: tuple
    bass: int
    fifth: int


def chord(symbol: str) -> Chord:
    head, _, slash = symbol.partition('/')
    acc = {'b': -1, '#': 1}.get(head[1:2], 0)        # no quality starts with b or #
    root = (_STEPS[head[0]] + acc) % 12
    quality = head[2:] if acc else head[1:]
    pcs = tuple((root + x) % 12 for x in QUALITIES[quality])
    bass = root
    if slash:
        bass = (_STEPS[slash[0]] + {'b': -1, '#': 1}.get(slash[1:2], 0)) % 12
    return Chord(symbol, root, pcs, bass, (root + (6 if quality == 'dim7' else 7)) % 12)


# bar -> [(sixteenth where the chord starts, symbol)]
HARMONY = {
    1: [(0, 'Bbm')], 2: [(0, 'Gbmaj7/Bb'), (8, 'F7b9')],
    3: [(0, 'Bbm'), (8, 'Gb7')], 4: [(0, 'F7b13'), (8, 'F7')], 5: [(0, 'Bbm'), (8, 'Cb'), (12, 'F7')],
    6: [(0, 'Bbm'), (8, 'Bbm/Ab')],
    7: [(0, 'Bbm'), (8, 'C7/Bb')], 8: [(0, 'F7b13/A'), (8, 'F7/A')], 9: [(0, 'Bbm/Ab'), (8, 'Gbmaj7')],
    10: [(0, 'Bbm/F'), (8, 'F7sus4'), (12, 'F7b9')],
    11: [(0, 'Bbmadd9')], 12: [(0, 'C7/E')], 13: [(0, 'Dbmaj7')], 14: [(0, 'F7b9/A')],
    15: [(0, 'Bbm'), (8, 'Bbm/Ab')], 16: [(0, 'Gbmaj7'), (8, 'F7sus4'), (12, 'F7')],
    17: [(0, 'Bbm')], 18: [(0, 'Cbm')], 19: [(0, 'Cm')], 20: [(0, 'F7b9')],
    21: [(0, 'Bbm'), (8, 'Edim7')], 22: [(0, 'F7b13'), (8, 'F7')], 23: [(0, 'Gbmaj7'), (8, 'Ebm7'), (12, 'F7')],
    24: [(0, 'Bbm'), (8, 'Bbm/Ab')], 25: [(0, 'Ebm/Gb'), (8, 'Bbm/F')], 26: [(0, 'F7b13'), (8, 'F7b9')],
    27: [(0, 'Bbm'), (8, 'Gbmaj7/Bb')], 28: [(0, 'F7sus4'), (8, 'F7b9')],
}


def H(bar: int, s: int = 0) -> Chord:
    """Chord sounding on sixteenth s of bar."""
    return chord([sym for start, sym in HARMONY[bar] if start <= s][-1])


def bass_segments(bar: int) -> list[tuple[int, int, int]]:
    """[(first sixteenth, length in sixteenths, bass pitch class)]: chords with the same bass merge."""
    out = []
    for start, sym in HARMONY[bar]:
        b = chord(sym).bass
        if out and out[-1][2] == b:
            continue
        out.append([start, 0, b])
    for i, seg in enumerate(out):
        seg[1] = (out[i + 1][0] if i + 1 < len(out) else 16) - seg[0]
    return [tuple(x) for x in out]


def cbsn_pitch(pc: int) -> int:
    return in_range(pc, 28, 39)                    # E1..Eb2 (Eb only in bar 23, where it rests)


def pedal_pitch(pc: int) -> int:
    return in_range(pc, 37, 48)                    # Db2..C3


def chant_pitch(pc: int) -> int:
    return in_range(pc, 43, 54)                    # G2..Gb3: Bb2 46, A2 45, Gb3 54, F3 53 ...


def ostinato_pitch(pc: int) -> int:
    return in_range(pc, 46, 57)


# ── reference melody (section 5 of the brief, identical in both versions) ────
_MOTIF_LOW = 'Bb3:2 C4:2 Db4:4 E4:6 F4:2 | Db4:4 C4:4 A3:8 | Bb3:2 Db4:2 F4:4 Gb4:4 F4:4 | Bb3:12 r:4'
_MOTIF_HIGH = 'Bb4:2 C5:2 Db5:4 E5:6 F5:2 | Db5:4 C5:4 A4:8 | Bb4:2 Db5:2 F5:4 Gb5:4 F5:4 | Bb4:12 r:4'
REF = {
    'call': (2, 'Bb3:8 A3:8'),                                     # the call: tonic and leading tone, reversed
    'ant1': (3, 'Bb3:2 C4:2 Db4:4 E4:6 F4:2'),                     # antiphon: bar 1 of the motif, low voices
    'ant2': (4, 'Db5:4 C5:4 A4:8'),                                # bar 2, high voices
    'ant3': (5, 'Bb3:2 Db4:2 F4:4 Gb4:4 F4:4'),                    # bar 3, low voices
    'ant4': (6, 'Bb4:12 r:4'),                                     # the tonic, high voices
    'psalm': (7, _MOTIF_HIGH),                                     # the whole motif over the lament bass
    'recit': (7, 'F3:6 F3:6 E3:4 | F3:6 F3:6 F3:4 | F3:6 F3:6 F3:4 | F3:6 F3:6 F3:4'),   # recto tono 3+3+2
    'aug': (11, 'Bb3:4 C4:4 Db4:8 | E4:12 F4:4 | Db4:8 C4:8 | A3:16 | Bb3:4 Db4:4 F4:8 | Gb4:8 F4:8'),
    'halo': (11, 'F5:16 | E5:16 | F5:16 | Eb5:16 | F5:16 | Eb5:16'),
    'counter': (12, 'G4:8 Bb4:8 | Ab4:8 F4:8 | Eb4:8 Gb4:8 | F4:8 Ab4:8 | Bb4:8 A4:8'),
    'circle1': (17, 'Bb3:4 C4:4 Db4:4 E4:4'),                      # the head on b flat, low
    'circle2': (18, 'B4:4 C#5:4 D5:4 F5:4'),                       # on c flat, high
    'circle3': (19, 'C4:4 D4:4 Eb4:4 F#4:4'),                      # on c, low
    'sigh': (20, 'Gb5:8 F5:8'),                                    # b6 -> 5 above ...
    'guide': (20, 'A3:8 Eb4:8'),                                   # ... and the guide tones of F7 below
    'ret_low': (21, _MOTIF_LOW + ' | Gb4:8 F4:8 | Db4:4 C4:4 A3:8'),
    'ret_high': (21, _MOTIF_HIGH + ' | Gb5:8 F5:8 | Db5:4 C5:4 A4:8'),
    'amen': (27, 'Bb4:12 r:4'),
    'call2': (28, 'Bb3:8 A3:8'),
}
LOW_REF = ('call', 'ant1', 'ant3', 'recit', 'aug', 'circle1', 'circle3', 'guide', 'ret_low', 'call2')
HIGH_REF = ('ant2', 'ant4', 'psalm', 'halo', 'circle2', 'sigh', 'ret_high', 'amen')


def phrase(bar: int, text: str) -> list[tuple[int, int, int | None, int]]:
    """'Bb3:2 C4:2 | ...' (durations in sixteenths, r = rest) -> [(bar, sixteenth, pitch, sixteenths)]."""
    out = []
    for i, chunk in enumerate(text.split('|')):
        s = 0
        for item in chunk.split():
            p, d = item.split(':')
            out.append((bar + i, s, None if p == 'r' else P(p), int(d)))
            s += int(d)
        if s != 16:
            raise ValueError(f'bar {bar + i} of {text!r} has {s} sixteenths')
    return out


def ref_events(key: str) -> list[tuple[int, int, int]]:
    """[(tick, pitch, ticks)] of a reference passage, rests dropped."""
    bar, text = REF[key]
    return [(T(b, s), p, d * SIXTEENTH) for b, s, p, d in phrase(bar, text) if p is not None]


def ref_bars(key: str) -> range:
    bar, text = REF[key]
    return range(bar, bar + text.count('|') + 1)


# ── score model ──────────────────────────────────────────────────────────────
@dataclass
class Note:
    pitch: int
    ws: int                 # written start (ticks)
    dur: int                # written duration (ticks)
    vel: int
    legato: bool = False
    jitter: bool = True
    hv: int = HUMAN_VEL
    tag: str = ''           # 'mel' = reference timing shared by every track and both versions
    voice: object = None    # voice id inside a polyphonic track (organ)
    group: object = None    # notes of one stroke share one timing offset
    detached: bool = False  # recitation syllables: released 60 ms before the next note
    breath: bool = False
    cap: int | None = None  # velocity ceiling of this note after humanization
    start: int = 0          # performed values (after humanization)
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

    @property
    def patch(self) -> str:
        return PATCHES[self.name]

    @property
    def sfz_path(self) -> str:
        return library(*self.patch.split('/'))

    def add(self, bar, s, pitch, sixteenths, vel, **kw) -> Note:
        n = Note(P(pitch), T(bar, s), int(round(sixteenths * SIXTEENTH)), int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def ticks(self, ws, dur, pitch, vel, **kw) -> Note:
        n = Note(P(pitch), ws, dur, int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def mel(self, key, vels, transpose=0, **kw) -> list[Note]:
        """The reference passage `key` (section 5), tagged so that every track and both versions share
        the same attack ticks (no flam in a crossfade or in a declared unison)."""
        evs = ref_events(key)
        vels = vels if isinstance(vels, list) else [vels] * len(evs)
        if len(vels) != len(evs):
            raise ValueError(f'{self.name} {key}: {len(evs)} notes, {len(vels)} velocities')
        kw.setdefault('legato', True)
        out = [Note(p + transpose, t, d, int(round(v)), tag='mel', **kw) for (t, p, d), v in zip(evs, vels)]
        self.notes.extend(out)
        return out

    def curve(self, num, points):
        """Controller `num` over the whole loop from breakpoints [(bar, sixteenth, value)]: cosine
        interpolation sampled on the eighth-note grid, held before the first and after the last point;
        only changes are written (the first point always lands on tick 0)."""
        pts = sorted(((T(b, s), v) for b, s, v in points), key=lambda x: x[0])
        top = CEILING_CC.get(self.name, 127) if num == 1 else 127

        def value(t):
            if t <= pts[0][0]:
                return pts[0][1]
            for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
                if t0 <= t <= t1 and t1 > t0:
                    x = (t - t0) / (t1 - t0)
                    return v0 + (v1 - v0) * (1 - math.cos(math.pi * x)) / 2
            return pts[-1][1]

        d, last = {}, None
        for g in range(0, LOOP_END, CC_STEP):
            v = max(0, min(top, int(round(value(g)))))
            if v != last:
                d[g] = v
                last = v
        self.cc[num] = d


CEILING_CC: dict[str, int] = {}                     # per-track CC1 ceiling, set by new_parts()


def arch(n, base, top, end, peak=0.55):
    """Velocities of an n-note phrase: rise from base to top at `peak`, fall to `end`."""
    out = []
    for i in range(n):
        x = i / max(1, n - 1)
        v = base + (top - base) * (x / peak) if x <= peak else top + (end - top) * ((x - peak) / (1 - peak))
        out.append(int(round(v)))
    return out


# ── the shared layers: choirs (notes), organ pedal, contrabassoon, frame drum ─
CHOIR_VELS = {
    'call': [60, 56], 'ant1': arch(5, 62, 72, 64), 'ant3': arch(5, 64, 74, 66), 'ant2': [66, 70, 64], 'ant4': [66],
    'psalm': arch(14, 62, 74, 60, peak=0.75),
    'recit': [54, 50, 52, 55, 51, 53, 58, 54, 56, 53, 49, 50],
    'aug': arch(13, 56, 70, 58, peak=0.45), 'halo': [44, 46, 50, 48, 46, 44],
    'circle1': [60, 63, 66, 69], 'circle2': [62, 65, 68, 71], 'circle3': [64, 67, 70, 73],
    'sigh': [74, 68], 'guide': [66, 70],
    'ret_low': arch(19, 66, 74, 58, peak=0.42), 'ret_high': arch(19, 64, 72, 56, peak=0.42),
    'amen': [62], 'call2': [60, 56],
}


def choirs(s):
    """Choir Low / Choir High: the reference melody, identical in both versions (only CC1 changes)."""
    for key in LOW_REF:
        s['Choir Low'].mel(key, CHOIR_VELS[key], detached=key == 'recit', legato=key != 'recit',
                           cap=COMMON_VEL_CEILING)
    for key in HIGH_REF:
        s['Choir High'].mel(key, CHOIR_VELS[key], cap=COMMON_VEL_CEILING)


CBSN_VEL = {1: 60, 2: 62, **{b: 64 for b in range(3, 7)}, 7: 64, 8: 66, 9: 70, 10: 66,
            **{b: 56 for b in B_BARS}, 17: 62, 18: 66, 19: 70, 20: 72, 27: 60, 28: 62}
PEDAL_VEL = {1: 66, 2: 70, **{b: 70 for b in range(3, 11)}, 9: 72, **{b: 62 for b in B_BARS},
             17: 66, 18: 68, 19: 71, 20: 74, **{b: 74 for b in range(21, 27)}, 23: 76, 27: 68, 28: 70}
# Section ends where the contrabassoon breathes (it rests in the return).
CBSN_BREATHS = {T(3), T(7), T(11), T(17), T(21), LOOP_END}


def common_layers(s):
    """Organ Pedal, Contrabassoon (with its CC1) and Frame Drum: the same in both versions."""
    for bar in range(1, BARS + 1):
        for start, length, pc in bass_segments(bar):
            s['Organ Pedal'].add(bar, start, pedal_pitch(pc), length, PEDAL_VEL[bar], legato=True,
                                 cap=COMMON_VEL_CEILING, hv=4)
            if not 21 <= bar <= 26:
                n = s['Contrabassoon'].add(bar, start, cbsn_pitch(pc), length, CBSN_VEL[bar] + start // 8,
                                           legato=True, cap=COMMON_VEL_CEILING, hv=4)
                n.breath = n.we in CBSN_BREATHS
    # contrabassoon dynamics (CC1, common): intro 55, A 58, A' 58 -> 66, B 50, bridge 60 -> 72, codetta 55
    s['Contrabassoon'].curve(1, [(1, 0, 55), (2, 14, 55), (3, 0, 58), (6, 12, 58), (7, 0, 58), (9, 8, 66),
                                 (10, 14, 60), (11, 0, 50), (13, 0, 53), (16, 14, 50), (17, 0, 60),
                                 (20, 14, 72), (21, 2, 72), (26, 14, 55), (28, 14, 55)])
    # the pedal is a velocity-blind organ stop: its phrase shape is a swell curve (CC11), common too
    s['Organ Pedal'].curve(11, [(1, 0, 100), (2, 14, 106), (3, 0, 108), (6, 14, 108), (9, 8, 114),
                                (10, 14, 108), (11, 0, 98), (13, 0, 102), (16, 14, 100), (17, 0, 102),
                                (20, 14, 122), (21, 0, 120), (23, 0, 127), (26, 14, 112), (27, 0, 106),
                                (28, 14, 100)])
    fd = s['Frame Drum']
    for bar in range(1, BARS + 1):
        if bar in B_BARS:
            fd.add(bar, 0, 62, 2, (60, 58, 62, 58, 60, 62)[bar - 11], hv=4, cap=COMMON_VEL_CEILING)
            continue
        lift = {1: -4, 2: -2, 9: 2, 17: -2, 19: 2, 20: 4, 21: 2, 22: 2, 23: 4, 24: 2, 26: -2, 27: -4,
                28: -2}.get(bar, 0)
        fd.add(bar, 0, 61, 2, 74 + lift, hv=4, cap=COMMON_VEL_CEILING)
        fd.add(bar, 10, 64, 2, 56 + lift, hv=4, cap=COMMON_VEL_CEILING)


# ── exploration: the office at half voice ────────────────────────────────────
# Organ voicings (three voices, None = silent): bar, sixteenth, sixteenths, (v0, v1, v2). A voice keeps its
# line (common tones are tied, never handed to another voice); in 26-27 the ninth G-flat3 crosses above
# E-flat3 so that each resolves by step (Gb -> F, Eb -> Db).
ORGAN = [
    (3, 0, 8, (None, 49, 53)), (3, 8, 8, (None, 49, 52)), (4, 0, 16, (None, 45, 51)),
    (5, 0, 8, (None, 49, 53)), (5, 8, 4, (None, None, 51)), (5, 12, 4, (None, 45, 51)), (6, 0, 16, (None, 49, 53)),
    (17, 0, 16, (None, 49, 53)), (18, 0, 16, (None, 50, None)), (19, 0, 16, (None, 51, 55)),
    (20, 0, 16, (45, 51, None)),
    (21, 0, 8, (None, 49, 53)), (21, 8, 8, (46, 49, 55)), (22, 0, 8, (45, 49, 51)), (22, 8, 8, (None, 48, 51)),
    (23, 0, 8, (46, None, 53)), (23, 8, 4, (46, 49, 51)), (23, 12, 4, (45, 48, 51)), (24, 0, 16, (None, 49, 53)),
    (25, 0, 8, (46, 51, None)), (25, 8, 8, (46, 49, 53)), (26, 0, 8, (45, 49, 51)), (26, 8, 8, (45, 54, 51)),
    (27, 0, 16, (None, 53, 49)),
]
ORGAN_VEL = {3: 48, 4: 50, 5: 52, 6: 46, 17: 48, 18: 52, 19: 56, 20: 62, 21: 56, 22: 60, 23: 68, 24: 62,
             25: 56, 26: 54, 27: 44}


def organ(part, first, last, vel_shift=0):
    """Organ chords of ORGAN in bars first..last, tied by voice where a voice keeps its pitch."""
    events = [e for e in ORGAN if first <= e[0] <= last]
    held = {}
    for bar, s, length, voicing in events:
        t = T(bar, s)
        for v, p in enumerate(voicing):
            prev = held.get(v)
            if p is None:
                held.pop(v, None)
                continue
            if prev is not None and prev.pitch == p and prev.we == t:
                prev.dur += length * SIXTEENTH
                continue
            held[v] = part.ticks(t, length * SIXTEENTH, p, ORGAN_VEL[bar] + vel_shift, voice=v, legato=True, hv=3)
        for v in [v for v, n in held.items() if n.we != t + length * SIXTEENTH]:
            held.pop(v)


def explora(s):
    low, high = s['Choir Low'], s['Choir High']
    # CC1: E ceiling 92; the recitation of A' 16+ below the high choir, the halo of B 16+ below the low one
    low.curve(1, [(1, 0, 55), (2, 0, 55), (2, 14, 62), (3, 0, 62), (3, 8, 78), (3, 14, 64), (4, 8, 62),
                  (5, 0, 62), (5, 8, 78), (5, 14, 64), (6, 8, 52), (7, 0, 48), (9, 8, 60), (10, 14, 50),
                  (11, 0, 62), (13, 0, 72), (16, 14, 64), (17, 0, 62), (20, 14, 88), (21, 0, 78), (22, 12, 89),
                  (23, 0, 92), (26, 14, 72), (27, 8, 55), (28, 0, 55), (28, 14, 62)])
    high.curve(1, [(1, 0, 60), (4, 0, 60), (4, 8, 76), (4, 14, 62), (6, 0, 60), (6, 4, 74), (6, 12, 60),
                   (7, 0, 64), (9, 8, 84), (10, 14, 66), (11, 0, 42), (13, 0, 52), (16, 14, 46), (17, 0, 62),
                   (20, 14, 88), (21, 0, 76), (22, 12, 87), (23, 0, 90), (26, 14, 70), (27, 0, 66), (27, 12, 55),
                   (28, 14, 60)])
    # B: the cor anglais answers the low voices, 10+ below them (they share an octave in 14-15)
    ca = s['Cor Anglais']
    ca.mel('counter', [52, 56, 55, 52, 50, 54, 52, 56, 58, 54])
    ca.curve(1, [(1, 0, 52), (12, 0, 52), (14, 0, 59), (16, 14, 53), (28, 14, 52)])
    # organ: guide tones in A, rising minor triads in the bridge, full in the return (+ open diapason)
    org = s['Organ']
    organ(org, 3, 6)
    organ(org, 17, 27)
    org.curve(11, [(1, 0, 96), (3, 0, 100), (4, 0, 106), (5, 0, 104), (6, 8, 100), (6, 14, 90), (16, 14, 92),
                   (17, 0, 96), (20, 14, 120), (21, 0, 112), (22, 12, 122), (23, 0, 127), (24, 0, 118),
                   (26, 14, 100), (27, 0, 96), (27, 14, 80), (28, 14, 96)])
    organ(s['Organ Open'], 21, 24, vel_shift=-4)
    s['Organ Open'].curve(11, [(1, 0, 100), (21, 0, 100), (23, 0, 124), (24, 8, 104), (24, 14, 94),
                               (28, 14, 100)])
    # the pulse of the office: doum, counted finger cymbals, bells, gongs
    dk = s['Darbuka']
    for bar in list(range(3, 11)) + [17, 18] + list(range(21, 27)):
        vel = 56 if bar >= 21 else 50 + (bar in (5, 9)) * 2 - (bar in (6, 10)) * 2
        dk.add(bar, 6, 60, 2, vel, hv=4)
    for i, bar_s in enumerate([(19, s_) for s_ in range(0, 16, 2)] + [(20, s_) for s_ in range(0, 16, 2)]):
        dk.add(*bar_s, 60, 2, 46 + round(20 * i / 15), hv=3)
    for bar in (3, 5, 7, 9, 21, 23):
        s['Finger Cymbals'].add(bar, 12, 60, 4, 44 if bar >= 21 else 40, hv=2, cap=44)
    for bar, vel in ((10, 48), (11, 46), (15, 46), (27, 44)):
        s['Hand Bell'].add(bar, 0, 62, 8, vel, hv=2)
    s['Bell'].add(1, 0, 70, 16, 56, hv=2)
    s['Bell'].add(21, 0, 70, 16, 62, hv=2)
    for bar, start, vel in ((1, 0, 42), (10, 8, 40), (21, 0, 50)):
        s['Gong'].add(bar, start, 61, 8, vel, hv=2)
    tr = s['Timp Roll']
    tr.add(20, 0, 41, 16, 44, hv=2)
    tr.curve(11, [(1, 0, 60), (20, 0, 60), (20, 14, 100), (21, 0, 100), (21, 2, 60), (28, 14, 60)])


# ── combat: the invocation in full cry ───────────────────────────────────────
DAGGER_RHYTHMS = {'F': (2, 5, 9, 11, 13), 'a': (2, 5, 9, 13), 'b': (2, 5, 11, 13), 'c': (5, 9, 11, 13),
                  'd': (2, 9, 11, 13), 'r': (2, 5, 9, 11)}
# bar -> (dyad, rhythm): F5+F#5 while the low voices sing, F4+Gb4 for the high ones, G4+Ab4 between
DAGGERS = {3: (77, 'F'), 4: (65, 'a'), 5: (77, 'F'), 6: (65, 'r'), 7: (67, 'F'), 8: (67, 'b'), 9: (67, 'F'),
           10: (67, 'c'), 17: (77, 'F'), 18: (65, 'F'), 19: (77, 'F'), 20: (67, 'F'), 21: (67, 'F'),
           22: (67, 'a'), 23: (67, 'F'), 24: (67, 'd'), 25: (67, 'F'), 26: (67, 'b')}
DAGGER_VEL = {2: 86, 5: 83, 9: 85, 11: 82, 13: 84}       # lower note; the upper one 1 softer (80-88)
# Ostinato velocities per bar: (accent, other); bar 1 grows from p, B has no accents
OST_VEL = {2: (84, 64), **{b: (94, 68) for b in range(3, 11)}, 9: (96, 70), 17: (92, 66), 18: (94, 68),
           19: (96, 70), 20: (98, 72), **{b: (96, 70) for b in range(21, 27)}, 23: (100, 72), 25: (94, 68),
           27: (84, 62), 28: (86, 64)}
CHANT_DUR = {0: 0.7, 3: 0.7, 6: 0.45, 8: 0.7, 11: 0.7, 14: 0.45}     # beats
CHANT_VEL = {0: 100, 3: 92, 6: 88, 8: 98, 11: 90, 14: 86}
LOW_BARS_C = [b for b in range(1, BARS + 1) if not (b == 1 or b in B_BARS or b == 27)]


def ostinato(s):
    """Cellos (and basses an octave down) in spiccato 16ths on the bass, the fifth on 6 and 14,
    accented 3+3+2; in B unaccented (down/up bow), without the basses."""
    ost, low = s['Ostinato'], s['Ostinato Low']
    for bar in range(1, BARS + 1):
        for k in range(16):
            ch = H(bar, k)
            base = ostinato_pitch(ch.bass)
            p = base
            if k in (6, 14):
                # the chord's fifth; over a 6/4 (the fifth already in the bass) the root instead
                target = ch.root if ch.fifth == ch.bass else ch.fifth
                up = [x for x in range(base + 1, 59) if x % 12 == target]
                p = up[0] if up else next(x for x in range(base - 1, 45, -1) if x % 12 == target)
            acc = k in ACCENTS
            if bar == 1:
                vel = 60 + 20 * k / 15 if acc else 46 + 12 * k / 15
                hv = 4
            elif bar in B_BARS:
                vel, hv = (64 if k % 2 == 0 else 58), 1
            else:
                a, o = OST_VEL[bar]
                vel, hv = (a if acc else o - (k % 3 == 2) * 2), 5
            ost.add(bar, k, p, 0.8, vel, hv=hv)
            if bar in LOW_BARS_C:
                a, o = (80, 60) if bar == 2 else OST_VEL[bar]
                low.add(bar, k, base - 12, 0.8, (a - 4) if acc else (o - 4), hv=4)


def chant(s):
    """The shouted invocation on the bass of section 4 (G2-Gb3), syllables on 0 3 6 8 11 14."""
    ch = s['Chant']
    for bar in range(1, BARS + 1):
        if bar in B_BARS:
            slots = (0, 3, 6) if bar in (11, 13, 15) else ()
        elif bar == 27:
            slots = (0, 3, 6)
        else:
            slots = ACCENTS
        for k in slots:
            vel = CHANT_VEL[k] - (bar in B_BARS) * 10 - (bar in (1, 27)) * 6 + (bar == 23) * 4
            ch.ticks(T(bar, k), int(round(CHANT_DUR[k] * BEAT)), chant_pitch(H(bar, k).bass), vel, hv=4)


def stabs(s):
    """Horns marcato: root + fifth of the chord (41-55) on eighths 0, 3 and 6."""
    st = s['Brass Stabs']
    for bar in range(1, BARS + 1):
        if bar in (1, 2, 27, 28) or bar in (12, 14, 16):
            continue
        for k in ((0,) if bar in B_BARS else (0, 6, 12)):
            ch = H(bar, k)
            root = next(x for x in range(41, 53) if x % 12 == ch.root)
            fifth = root + (ch.fifth - ch.root) % 12
            if fifth > 55:
                fifth -= 12
            vel = 96 + (k == 0) * 4 - (bar in B_BARS) * 6
            for p in (root, fifth):
                st.ticks(T(bar, k), int(0.3 * BEAT), p, vel, hv=3, group=(bar, k))


def drums(s):
    bd, tom = s['Bass Drum'], s['Tom']
    for bar in range(1, BARS + 1):
        if bar in (1, 27, 28) or bar in B_BARS:
            vel = {1: 84, 27: 84, 28: 86}.get(bar, 78)
            for k in (0, 8):
                bd.add(bar, k, 62, 1, vel + (k == 0) * 2, hv=3)
            continue
        for k in (0, 3, 6, 8, 12, 14):
            strong = k in (0, 6, 12)
            if bar == 23:
                bd.add(bar, k, 62, 1, 104 if strong else 92, hv=0 if strong else 4)
                continue
            lift = {2: -4, 17: -2, 19: 1, 20: 2, 21: 0, 25: -2}.get(bar, 0)
            bd.add(bar, k, 62, 1, (100 if strong else 80) + lift, hv=4, cap=102)
    bd.add(20, 0, 63, 8, 74, hv=2)                   # the bass-drum roll that opens the return
    bd.add(20, 8, 63, 8, 90, hv=2)
    for bar in (2, 4, 6, 8, 10, 18, 26, 28):
        for i, (k, p) in enumerate(((10, 62), (11, 62), (13, 62), (14, 62), (15, 64))):
            tom.add(bar, k, p, 0.8, 84 + round(10 * i / 4), hv=3)
    for i, k in enumerate(range(4, 16)):             # bar 20: the fill grows into the return
        tom.add(20, k, 64 if k < 10 else 62, 0.8, 70 + round(30 * i / 11), hv=2)


def daggers(s):
    """Semitone dyads in spiccato, 0.1 s, never in the octave of the choir that sings."""
    dg = s['Daggers']
    for bar, (low_note, rhythm) in DAGGERS.items():
        lift = 2 if bar >= 21 or bar == 20 else 1 if bar >= 17 else 0   # A 80-88, bridge 82-88, return 84-88
        for k in DAGGER_RHYTHMS[rhythm]:
            v = DAGGER_VEL[k] + lift
            dg.ticks(T(bar, k), int(round(0.1 / SEC_PER_TICK)), low_note, v, hv=1, cap=88, group=(bar, k))
            dg.ticks(T(bar, k), int(round(0.1 / SEC_PER_TICK)), low_note + 1, v - 1, hv=1, cap=88, group=(bar, k))


def combate(s):
    low, high = s['Choir Low'], s['Choir High']
    low.curve(1, [(1, 0, 88), (2, 0, 88), (2, 14, 96), (3, 0, 92), (3, 8, 108), (3, 14, 94), (4, 8, 92),
                  (5, 0, 92), (5, 8, 108), (5, 14, 94), (6, 8, 88), (7, 0, 88), (9, 8, 100), (10, 14, 90),
                  (11, 0, 84), (13, 0, 98), (16, 14, 86), (17, 0, 96), (20, 14, 110), (21, 0, 100),
                  (22, 12, 109), (23, 0, 112), (26, 14, 96), (27, 8, 88), (28, 0, 88), (28, 14, 96)])
    high.curve(1, [(1, 0, 90), (4, 0, 90), (4, 8, 104), (4, 14, 92), (6, 0, 90), (6, 4, 102), (6, 12, 88),
                   (7, 0, 94), (9, 8, 106), (10, 14, 96), (11, 0, 60), (16, 14, 70), (17, 0, 96), (20, 14, 106),
                   (21, 0, 98), (23, 0, 106), (26, 14, 94), (27, 0, 94), (27, 12, 86), (28, 14, 90)])
    # the demon that answers: trombones in unison with every note of the low voices
    tb = s['Trombones']
    for key in LOW_REF:
        tb.mel(key, [min(96, v + 18) for v in CHOIR_VELS[key]], detached=key == 'recit', legato=key != 'recit')
    tb.curve(1, [(1, 0, 76), (2, 0, 76), (2, 14, 86), (3, 0, 76), (3, 8, 96), (3, 14, 84), (4, 8, 76),
                 (5, 0, 76), (5, 8, 96), (5, 14, 84), (6, 8, 80), (7, 0, 80), (9, 8, 94), (10, 14, 86),
                 (11, 0, 70), (13, 0, 86), (16, 14, 80), (17, 0, 84), (20, 14, 104), (21, 0, 90), (23, 0, 106),
                 (26, 14, 88), (27, 8, 76), (28, 0, 76), (28, 14, 86)])
    # horns: the counter-melody of B (below the low voices), then the high voices 8vb in the bridge
    hn = s['Horns']
    hn.mel('counter', [70, 74, 73, 70, 68, 72, 70, 74, 76, 72])
    hn.mel('circle2', [70, 72, 74, 76], transpose=-12)
    hn.mel('sigh', [78, 74], transpose=-12)
    hn.curve(1, [(1, 0, 70), (12, 0, 70), (14, 0, 82), (16, 14, 76), (17, 0, 84), (20, 14, 104), (21, 2, 80),
                 (28, 14, 70)])
    chant(s)
    s['Chant'].curve(1, [(1, 0, 84), (2, 14, 92), (3, 0, 86), (6, 14, 104), (7, 0, 90), (10, 14, 104),
                         (11, 0, 80), (16, 14, 88), (17, 0, 94), (20, 14, 110), (21, 0, 96), (23, 0, 110),
                         (26, 14, 100), (27, 0, 82), (28, 14, 86)])
    stabs(s)
    s['Brass Stabs'].curve(1, [(1, 0, 92), (3, 0, 92), (6, 14, 106), (7, 0, 96), (10, 14, 106), (11, 0, 90),
                               (16, 14, 90), (17, 0, 100), (20, 14, 108), (21, 0, 100), (23, 0, 110),
                               (26, 14, 104), (28, 14, 92)])
    ostinato(s)
    daggers(s)
    drums(s)
    for bar, p in zip(range(21, 27), (46, 41, 42, 46, 42, 41)):
        s['Timpani'].add(bar, 0, p, 2, 100 if bar == 23 else 90, hv=0 if bar == 23 else 4)
    tr = s['Timp Roll']
    tr.add(16, 0, 41, 16, 56, hv=2)
    tr.add(20, 0, 41, 16, 66, hv=2)
    tr.curve(11, [(1, 0, 38), (16, 0, 38), (16, 14, 114), (17, 0, 114), (17, 2, 50), (20, 0, 50),
                  (20, 14, 120), (21, 0, 120), (21, 2, 38), (28, 14, 38)])
    for bar, p, vel in ((1, 61, 70), (3, 63, 80), (5, 63, 80), (7, 63, 80), (9, 63, 80), (17, 63, 82),
                        (19, 63, 82), (23, 61, 88)):
        s['Metal'].add(bar, 0, p, 4, vel, hv=2)
    for bar, vel in ((1, 72), (21, 78), (23, 84), (25, 80)):
        for p in (60, 61):
            s['Broken Bells'].add(bar, 0, p, 4, vel - (p == 61) * 2, hv=2, group=('bb', bar))
    for bar in (3, 7, 17, 21):
        s['Finger Cymbals'].add(bar, 12, 60, 4, 46, hv=3, cap=50)


# ── performance: humanization, legato, seams ─────────────────────────────────
def mel_offset(ws: int, lo: int) -> int:
    """Timing of the reference melody: a function of the written tick only, so that every track and
    both versions put a melody note on exactly the same tick."""
    return random.Random(f'{SEED}:melody:{ws}').randint(lo, HUMAN_TICKS)


def legato_overlap(t: int) -> int:
    """Overlap of a legato join landing on written tick t (shared by unison tracks): 10-30 ms."""
    return random.Random(f'{SEED}:legato:{t}').randint(LEGATO_MIN, LEGATO_MAX)


def perform(parts: dict[str, Part], version: str):
    vmax = CEILING[version][0]
    for part in parts.values():
        rng = random.Random(f'{SEED}:{part.name}')  # same seed per track name in both versions
        part.notes.sort(key=lambda n: (n.ws, n.pitch))
        groups = {}
        for n in part.notes:
            lo = 0 if n.ws == 0 or n.ws in SECTION_TICKS else -HUMAN_TICKS
            if n.tag == 'mel':
                d = mel_offset(n.ws, lo)
            elif n.group is not None:
                if n.group not in groups:
                    groups[n.group] = rng.randint(lo, HUMAN_TICKS)
                d = groups[n.group]
            else:
                d = rng.randint(lo, HUMAN_TICKS) if n.jitter else 0
            n.start = max(0, n.ws + d)
            n.end = n.ws + n.dur + d
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
        by_start = {}
        for n in part.notes:
            by_start.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = [m for m in by_start.get(n.we, []) if m.voice == n.voice]
            same = [m for m in nxt if m.pitch == n.pitch]
            if n.detached and nxt:
                n.end = min(m.start for m in nxt) - SYLLABLE_GAP
            elif same:
                n.end = min(n.end, min(m.start for m in same) - SAME_PITCH_GAP)
            elif n.legato and nxt and not n.breath:
                n.end = min(m.start for m in nxt) + legato_overlap(n.we)
            if n.breath:
                n.end = min(n.end, n.ws + n.dur - BREATH)
        starts = set(by_start)
        for n in part.notes:
            if n.we in SECTION_TICKS and n.we not in starts:
                n.end = min(n.end, n.we - GUARD)
            n.end = min(n.end, LOOP_END - GUARD)
        last = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = last.get(n.pitch)
            if prev is not None and prev.end > n.start - SAME_PITCH_GAP:
                prev.end = n.start - SAME_PITCH_GAP
            last[n.pitch] = n
        for n in part.notes:
            n.vel = max(1, min(vmax, n.cap if n.cap is not None else 127, n.vel))


def new_parts(version: str) -> dict[str, Part]:
    parts, ch = {}, 0
    for name in LAYOUT[version]:
        if name in UNPITCHED:
            channel = 9
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, min(channel, 15))
    CEILING_CC.clear()
    CEILING_CC.update({name: CEILING[version][1] for name in parts})
    if version == 'combate':
        CEILING_CC['Choir High'] = 106
    return parts


def build(version: str) -> dict[str, Part]:
    if version not in VERSIONS:
        raise ValueError(version)
    s = new_parts(version)
    choirs(s)
    common_layers(s)
    (explora if version == 'explora' else combate)(s)
    perform(s, version)
    check_ranges(s)
    return s


def check_ranges(parts: dict[str, Part]):
    """Every note must exist in its .sfz and inside the register of the brief: the script fails otherwise."""
    for name, part in parts.items():
        keys = sfz_keys(part.sfz_path)
        bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
        if bad:
            raise SystemExit(f'{name}: notes outside {part.patch}: {[name_of(p) for p in bad]}')
        lo, hi = REGISTERS.get(name, (0, 127))
        bad = sorted({n.pitch for n in part.notes if not lo <= n.pitch <= hi})
        if bad:
            raise SystemExit(f'{name}: notes outside the register {lo}-{hi} of the brief: {bad}')


_KEYS = {}


def sfz_keys(path: str) -> set[int]:
    if path not in _KEYS:
        inst = sfz.load(path)
        _KEYS[path] = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                       for k in range(r.lokey, r.hikey + 1)}
    return _KEYS[path]


def write_midi(version: str, path: str) -> dict[str, Part]:
    parts = build(version)
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Bbm', time=0))
        events = []
        for num, pts in part.cc.items():
            for t, val in sorted(pts.items()):
                events.append((t, 1, mido.Message('control_change', channel=part.channel, control=num, value=val)))
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


def write_all(folder: str = OUT_DIR) -> dict[str, str]:
    paths = {}
    for version in VERSIONS:
        paths[version] = out_path(version, folder)
        write_midi(version, paths[version])
    return paths


# ── craft checks (voice leading, development, legato) ────────────────────────
def bar_of(t: int) -> int:
    return t // BAR + 1


def sec(t: int) -> float:
    return t * SEC_PER_TICK


# Sustained lines checked for parallel 5ths/8ves.
VOICES = {'explora': ['Choir Low', 'Choir High', 'Cor Anglais', 'Organ', 'Organ Open', 'Organ Pedal', 'Contrabassoon'],
          'combate': ['Choir Low', 'Choir High', 'Trombones', 'Horns', 'Organ Pedal', 'Contrabassoon']}
MELODIC = {'Choir Low', 'Choir High', 'Trombones'}
BASS_LINES = {'Organ Pedal', 'Contrabassoon'}
# Declared doublings (unisons / octaves on purpose): (track a, track b, first bar, last bar).
DOUBLINGS = [('Choir Low', 'Trombones', 1, 28), ('Choir Low', 'Choir High', 21, 26), ('Choir High', 'Trombones', 21, 26),
             ('Choir High', 'Horns', 17, 20),
             ('Organ', 'Organ Open', 1, 28), ('Organ Pedal', 'Contrabassoon', 1, 28)]
# Imposed by the brief's own pitches (§5): halo Eb5 over the counter-melody Eb4, from F/F (13 t3 -> 14 t1).
BRIEF_EXCEPTIONS = [('Choir High', 'Cor Anglais', 13, 14), ('Choir High', 'Horns', 13, 14)]


def _lines(part: Part) -> dict:
    lines = {}
    for n in part.notes:
        lines.setdefault((part.name, n.voice), []).append(n)
    return lines


def _parallel(a1, a2, b1, b2) -> bool:
    if None in (a1, a2, b1, b2) or a1 == a2 or b1 == b2 or (a2 - a1) * (b2 - b1) <= 0:
        return False
    i1, i2 = abs(a1 - b1) % 12, abs(a2 - b2) % 12
    return i1 == i2 and i1 in (0, 7)


def parallels(parts: dict[str, Part], version: str) -> list[str]:
    """Consecutive perfect 5ths/8ves (same direction) between two sustained lines in which at least one
    is an inner voice (the melody against the bass is the brief's outer frame: §4 and §5 fix both)."""
    lines = {}
    for name in VOICES[version]:
        lines.update(_lines(parts[name]))
    found = []

    def at(notes, t):
        s_ = [n.pitch for n in notes if n.ws <= t < n.we]
        return max(s_) if s_ else None

    def excused(a, b, bar):
        return any({a, b} == {x, y} and f <= bar <= l for x, y, f, l in DOUBLINGS + BRIEF_EXCEPTIONS)

    keys = sorted(lines, key=str)
    for i, ka in enumerate(keys):
        for kb in keys[i + 1:]:
            if {ka[0], kb[0]} & MELODIC and {ka[0], kb[0]} & BASS_LINES:
                continue
            na, nb = lines[ka], lines[kb]
            times = sorted({n.ws for n in na} | {n.ws for n in nb})
            for t1, t2 in zip(times, times[1:]):
                if excused(ka[0], kb[0], bar_of(t1)) and excused(ka[0], kb[0], bar_of(t2)):
                    continue
                a1, a2, b1, b2 = at(na, t1), at(na, t2), at(nb, t1), at(nb, t2)
                if _parallel(a1, a2, b1, b2) and abs(a2 - a1) <= 7 and abs(b2 - b1) <= 7:
                    found.append(f'{ka[0]}[{ka[1]}]/{kb[0]}[{kb[1]}] b{bar_of(t1)}-{bar_of(t2)} '
                                 f'{name_of(a1)}-{name_of(a2)} / {name_of(b1)}-{name_of(b2)}')
    return found


def repetitions(parts: dict[str, Part]) -> list[str]:
    """Two-bar cells (onset, pitch, length) that appear identical more than twice in a pitched track."""
    found = []
    for name, part in parts.items():
        if name in UNPITCHED or name in BELLS:
            continue
        seen = {}
        for bar in range(1, BARS):
            sig = tuple(sorted((n.ws - T(bar), n.pitch, n.dur) for n in part.notes if T(bar) <= n.ws < T(bar + 2)))
            if len(sig) >= 2:
                seen.setdefault(sig, []).append(bar)
        found += [f'{name} bars {bars}' for bars in seen.values() if len(bars) > 2]
    return found


def legato_joins(parts: dict[str, Part], version: str) -> list[float]:
    """Overlaps (ms) of every legato join between different pitches in the sustained lines."""
    out = []
    for name in VOICES[version]:
        for notes in _lines(parts[name]).values():
            starts = {}
            for n in notes:
                starts.setdefault(n.ws, []).append(n)
            for n in notes:
                nxt = starts.get(n.we, [])
                if n.legato and not n.breath and not n.detached and nxt and all(m.pitch != n.pitch for m in nxt):
                    out.append((n.end - min(m.start for m in nxt)) * SEC_PER_TICK * 1000)
    return out


def cc_value(part: Part, num: int, t: int) -> int:
    pts = part.cc.get(num, {})
    val = None
    for g in sorted(pts):
        if g <= t:
            val = pts[g]
    return val if val is not None else 0


def layers(parts: dict[str, Part], t0: int, t1: int) -> tuple[int, int]:
    cuts = sorted({t0, t1} | {min(t1, max(t0, x)) for p in parts.values() for n in p.notes for x in (n.start, n.end)})
    worst, where = 0, t0
    for a, b in zip(cuts, cuts[1:]):
        if b <= a:
            continue
        mid = (a + b) / 2
        k = sum(any(n.start <= mid < n.end for n in p.notes) for p in parts.values())
        if k > worst:
            worst, where = k, a
    return worst, where


def verify(all_parts: dict[str, dict[str, Part]]) -> bool:
    ok_all = True
    rows = []

    def check(label, ok, detail=''):
        nonlocal ok_all
        ok_all &= bool(ok)
        rows.append((label, 'OK' if ok else 'FAIL', detail))

    for version, parts in all_parts.items():
        print(f'\n== {version} ==')
        print(f"{'track':<15} {'patch':<66} {'pan':>5} {'notes':>5}  range used")
        for name, part in parts.items():
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'{name:<15} {part.patch[-66:]:<66} {PAN[name]:>5.2f} {len(part.notes):>5}  '
                  f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})')
        tag = version[:1].upper()
        last_end = max(n.end for p in parts.values() for n in p.notes)
        check(f'{tag} 1  28 bars 4/4, everything ends before 84.000 s', sec(last_end) < 84.0,
              f'last note-off {sec(last_end):.3f} s')
        for label, first, last, le, lc in SECTIONS:
            limit = le if version == 'explora' else lc
            worst, where = layers(parts, T(first), T(last + 1))
            check(f'{tag} 6  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit,
                  f'max {worst} at bar {bar_of(where)}')
        vmax, cmax = CEILING[version]
        top_v = max(n.vel for p in parts.values() for n in p.notes)
        top_c = max((v for p in parts.values() for v in p.cc.get(1, {}).values()), default=0)
        check(f'{tag} 8  velocity <= {vmax}, CC1 <= {cmax}', top_v <= vmax and top_c <= cmax,
              f'vel {top_v}, CC1 {top_c}')
        low = parts['Choir Low'].cc[1]
        peak = max(low.values())
        check(f'{tag} 8  Choir Low CC1 peak only in bar 23', {bar_of(t) for t, v in low.items() if v == peak} == {23},
              f'CC1 {peak}')
        bad = [n for n in parts if n in SONATINA_CC1 and 0 not in parts[n].cc.get(1, {})]
        long_ = [f'{n} {sec(x.end - x.start):.2f} s' for n, lim in MAX_S.items() if n in parts
                 for x in parts[n].notes if sec(x.end - x.start) > lim + 1e-3]
        check(f'{tag} 9  Sonatina CC1 at tick 0, maximum note lengths', not bad and not long_,
              '; '.join(bad + long_[:3]))
        cc_ok = all(b - a >= CC_STEP for p in parts.values() for pts in p.cc.values()
                    for a, b in zip(sorted(pts), sorted(pts)[1:]))
        check(f'{tag}    controller points at most every eighth', cc_ok)
        par = parallels(parts, version)
        check(f'{tag}    no parallel 5ths/8ves with an inner voice', not par, '; '.join(par[:4]))
        rep = repetitions(parts)
        check(f'{tag}    no 2-bar cell repeated identical more than twice', not rep, '; '.join(rep[:3]))
        joins = legato_joins(parts, version)
        check(f'{tag}    legato overlaps 10-30 ms', joins and all(10 <= j <= 30.5 for j in joins),
              f'{len(joins)} joins, {min(joins):.1f}-{max(joins):.1f} ms')
    for name in COMMON + CHOIRS:
        a, b = (all_parts[v][name] for v in VERSIONS)
        same = [(n.pitch, n.start, n.end, n.vel) for n in a.notes] == [(n.pitch, n.start, n.end, n.vel) for n in b.notes]
        if name in COMMON:
            same = same and a.cc == b.cc
        check(f'   4  {name} identical in both versions' + (' (notes)' if name in CHOIRS else ''), same,
              f'{len(a.notes)} notes')
    print(f"\n{'check':<62} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<62} {status:<4} {detail}')
    return ok_all


def main():
    all_parts = {}
    for version in VERSIONS:
        all_parts[version] = write_midi(version, out_path(version))
    ok = verify(all_parts)
    for version in VERSIONS:
        print(f'written {out_path(version)}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
