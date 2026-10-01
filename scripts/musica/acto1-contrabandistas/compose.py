"""«Bajo la posada vieja» (Acto I, La Guarida de los Contrabandistas): score generator.

Brief: docs/musica/acto1-contrabandistas.md. One description of form, harmony and melody renders
two synchronized versions of the same song:

  build/acto1-contrabandistas-explora.mid   (map and events: a rocking tavern song, half voice)
  build/acto1-contrabandistas-combate.mid   (normal and elite fights: the same song as a boarding jig)

Both have 60 bars of 6/8 at dotted quarter = 90 (quarter = 135), one MIDI track per instrument and
articulation, the same reference melody (pitches and attack ticks) and the common `Basses Pizz` layer
identical note for note. Prints a verification table against the brief and exits with status 1 if
any check fails.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-contrabandistas/compose.py
"""
from __future__ import annotations

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
EIGHTH = TPB // 2
BAR = 6 * EIGHTH                                    # 6/8 = three quarter notes
BARS = 60
LOOP_END = BARS * BAR
BPM = 135                                           # dotted quarter = 90
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                  # at most one controller point per 1/8 bar
HUMAN_TICKS = int(0.008 / SEC_PER_TICK)             # +-8 ms
HUMAN_VEL = 6
SEED = 90
GUARD = 12                                          # ticks a note stops before a seam/section edge
SAME_PITCH_GAP = 12                                 # note-off before a repeated note of the same pitch
BREATH = 70                                         # a wind player's breath at the end of a phrase
STRUM_DOWN = int(round(0.015 / SEC_PER_TICK))       # 15 ms between strings, low to high
STRUM_UP = int(round(0.010 / SEC_PER_TICK))         # 10 ms between strings, high to low
MAX_VEL = 105
MAX_CC1 = 112
VERSIONS = ('explora', 'combate')
OUT_DIR = os.path.join(HERE, 'build')

SECTIONS = [('Intro', 1, 4, 6, 8), ('A', 5, 12, 7, 11), ("A'", 13, 20, 8, 12), ('B', 21, 28, 7, 11),
            ('C', 29, 36, 6, 9), ('Bridge', 37, 44, 8, 12), ('Return', 45, 56, 10, 12),
            ('Codetta', 57, 60, 5, 8)]


def T(bar: int, e: float = 0) -> int:
    """Tick of eighth `e` (0-5) of `bar` (1-based)."""
    return (bar - 1) * BAR + int(round(e * EIGHTH))


SECTION_TICKS = {T(first) for _, first, *_ in SECTIONS if first > 1}


def out_path(version: str, folder: str = OUT_DIR) -> str:
    return os.path.join(folder, f'acto1-contrabandistas-{version}.mid')


# ── patches ──────────────────────────────────────────────────────────────────
_VSCO = 'VSCO-2-CE/{}.sfz'.format
_VCSL = 'VCSL/'
_SSO = 'sso/Sonatina Symphonic Orchestra/'
PATCHES = {
    'Ocarina': _VCSL + 'Aerophones/Edge-blown Aerophones/Ocarina, Typical - SusVib.sfz',
    'Tenor Recorder': _VCSL + 'Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - SusVib.sfz',
    'Harmonica Vib': _VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Vib.sfz',
    'Harmonica Accented': _VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Accented.sfz',
    'Strumstick': _VCSL + 'Chordophones/Composite Chordophones/Strumstick.sfz',
    'Folk Harp': _VCSL + 'Chordophones/Composite Chordophones/Folk Harp.sfz',
    'Tavern Piano': _VCSL + 'Chordophones/Zithers/Upright Piano, Knight.sfz',
    'Violin Solo': _SSO + 'Strings - Performance/Violin Solo 1 Sustain.sfz',
    'Bass Clarinet': _SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz',
    'Horns Marcato': _SSO + 'Brass - Performance/Horns Marcato.sfz',
    'Horns Sustain': _SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Violins Marcato': _SSO + 'Strings - Performance/1st Violins Marcato.sfz',
    'Horn Sus': _VSCO('FHornSus'),
    'Violins Sus': _VSCO('ViolinEnsSusVib'),
    'Violins Pizz': _VSCO('ViolinEnsPizz'),
    'Violas Sus Quiet': _VSCO('ViolaEnsSusVib-Quiet'),
    'Violas Spic': _VSCO('ViolaEnsSpic'),
    'Violas Trem': _VSCO('ViolaEnsTrem'),
    'Cellos Sus': _VSCO('CelloEnsSusVib'),
    'Cellos Sus Quiet': _VSCO('CelloEnsSusVib-Quiet'),
    'Cellos Spic': _VSCO('CelloEnsSpic'),
    'Basses Pizz': _VSCO('ContrabassPizz'),
    'Basses Sus Quiet': _VSCO('ContrabassSusVB-Quiet'),
    'Basses Trem': _VSCO('ContrabassTrem'),
    'Bassoon Stac': _VSCO('BassoonStac'),
    'Tuba Stac': _VSCO('TubaStac'),
    'Timpani': _VSCO('Timpani'),
    'Timpani Roll': _VSCO('TimpaniRolls'),
    'Cajon': _VCSL + 'Idiophones/Struck Idiophones/Cajon.sfz',
    'Frame Drum': _VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz',
    'Bass Drum': _VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Hull Creak': _VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Tom': _VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz',
    'Ocean Drum': _VCSL + 'Membranophones/Other Membranophones/Ocean Drum.sfz',
    'Cymbal': _VCSL + 'Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz',
}
# Score order of each version. Every articulation is its own track (and its own .sfz).
LAYOUT = {
    'explora': ['Ocarina', 'Tenor Recorder', 'Harmonica Vib', 'Bass Clarinet', 'Horn Sus', 'Timpani',
                'Timpani Roll', 'Cajon', 'Frame Drum', 'Hull Creak', 'Ocean Drum', 'Strumstick', 'Folk Harp',
                'Tavern Piano', 'Violin Solo', 'Violas Sus Quiet', 'Violas Trem', 'Cellos Sus',
                'Cellos Sus Quiet', 'Basses Sus Quiet', 'Basses Pizz'],
    'combate': ['Harmonica Accented', 'Bass Clarinet', 'Bassoon Stac', 'Horns Marcato', 'Horns Sustain',
                'Tuba Stac', 'Timpani', 'Timpani Roll', 'Cajon', 'Frame Drum', 'Bass Drum', 'Hull Creak', 'Tom',
                'Cymbal', 'Strumstick', 'Tavern Piano', 'Violin Solo', 'Violins Marcato', 'Violins Sus',
                'Violins Pizz', 'Violas Spic', 'Cellos Spic', 'Basses Trem', 'Basses Pizz'],
}
SONATINA_MAX_S = {'Violin Solo': 5.0, 'Horns Marcato': 2.8, 'Horns Sustain': 2.8, 'Violins Marcato': 3.5,
                  'Bass Clarinet': None}           # the looped bass clarinet has no limit
UNPITCHED = {'Cajon', 'Frame Drum', 'Bass Drum', 'Hull Creak', 'Tom', 'Ocean Drum', 'Cymbal'}
CYMBAL_SWELL, CYMBAL_HIT = 63, 66
CYMBAL_PEAK_S = 2.174          # measured RMS peak of susCymb2_cresc_2.5s2.wav (key 63)
CYMBAL_AUDIBLE_S = 1.0         # that sample stays below -20 dB of its peak for its first second

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


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


def near(pc: int, ref: int, lo: int, hi: int) -> int:
    """Pitch of pitch class `pc` inside [lo, hi] closest to `ref` (the lower one on a tie)."""
    options = [p for p in range(lo, hi + 1) if p % 12 == pc % 12]
    return min(options, key=lambda p: (abs(p - ref), p))


# ── harmony (section 4 of the brief, common to both versions) ────────────────
QUALITIES = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'maj7': (0, 4, 7, 11),
             '7sus4': (0, 5, 7, 10), 'm7b5': (0, 3, 6, 10), '7b9': (0, 4, 7, 10, 1)}


@dataclass(frozen=True)
class Chord:
    symbol: str
    root: int
    pcs: tuple
    bass: int

    @property
    def third(self) -> int:
        return self.pcs[1]

    @property
    def fifth(self) -> int:
        return self.pcs[2]

    @property
    def seventh(self):
        return self.pcs[3] if len(self.pcs) > 3 else None


def chord(symbol: str) -> Chord:
    head, _, slash = symbol.partition('/')
    i = 2 if len(head) > 1 and head[1] in '#b' and head[1:3] != 'b9' else 1
    root = (_STEPS[head[0]] + (1 if head[1:2] == '#' else -1 if i == 2 else 0)) % 12
    pcs = tuple((root + x) % 12 for x in QUALITIES[head[i:]])
    bass = root
    if slash:
        bass = (_STEPS[slash[0]] + (1 if slash[1:2] == '#' else -1 if slash[1:2] == 'b' else 0)) % 12
    return Chord(symbol, root, pcs, bass)


HARMONY = {
    1: ('Gm',), 2: ('F',), 3: ('Eb',), 4: ('D', 'D7'),
    5: ('Gm',), 6: ('C', 'Gm/Bb'), 7: ('F', 'D7'), 8: ('Gm',),
    9: ('Bb',), 10: ('Cm', 'F7'), 11: ('Gm', 'Cm7'), 12: ('D7sus4', 'D7'),
    13: ('Ebmaj7',), 14: ('C7', 'Gm/Bb'), 15: ('F', 'D7/F#'), 16: ('Gm', 'Gm/F'),
    17: ('Ebmaj7',), 18: ('Cm7', 'F7'), 19: ('Dm7', 'Gm7'), 20: ('Cm7', 'F7'),
    21: ('Bb',), 22: ('Eb', 'Bb/D'), 23: ('Cm7', 'F7'), 24: ('Bb', 'G7'),
    25: ('Cm',), 26: ('F7', 'Bbmaj7'), 27: ('Ebmaj7', 'Am7b5'), 28: ('D7b9',),
    29: ('Gm', 'Cm/G'), 30: ('Abmaj7/G',), 31: ('Gm7',), 32: ('Gm',),
    33: ('Cm/G',), 34: ('Abmaj7/G',), 35: ('Eb', 'C7'), 36: ('D7sus4', 'D7'),
    37: ('Eb',), 38: ('F',), 39: ('Gm',), 40: ('Ab',), 41: ('Bb',), 42: ('C',), 43: ('D7sus4',), 44: ('D7b9',),
    45: ('Gm',), 46: ('C', 'Gm/Bb'), 47: ('F', 'D7'), 48: ('Gm', 'Gm/F'),
    49: ('Ebmaj7',), 50: ('Cm7', 'F7'), 51: ('Bb', 'G7/B'), 52: ('Cm', 'D7'),
    53: ('Eb', 'D7'), 54: ('Gm',), 55: ('Eb', 'Cm'), 56: ('D7',),
    57: ('Gm',), 58: ('Gm/F',), 59: ('Ebmaj7',), 60: ('Am7b5', 'D7'),
}


def H(bar: int, half: int = 0) -> Chord:
    """Chord of beat `half` (0 = eighths 0-2, 1 = eighths 3-5) of `bar`."""
    syms = HARMONY[bar]
    return chord(syms[min(half, len(syms) - 1)])


def changes(bar: int) -> bool:
    return len(HARMONY[bar]) == 2


# ── reference melody (section 5 of the brief, identical in both versions) ────
def phrase(bar: int, text: str) -> list[tuple[int, int, int | None, int]]:
    """'G4:3 D5:3 | E5:2 ...' (durations in eighths, r = rest) -> [(bar, eighth, pitch, eighths)]."""
    out = []
    for i, chunk in enumerate(text.split('|')):
        e = 0
        for item in chunk.split():
            p, d = item.split(':')
            out.append((bar + i, e, None if p == 'r' else P(p), int(d)))
            e += int(d)
        if e != 6:
            raise ValueError(f'bar {bar + i} of {text!r} has {e} eighths')
    return out


_MOTIF = 'G4:3 D5:3 | E5:2 D5:1 Bb4:3 | C5:2 Bb4:1 A4:3 | G4:6'
_COLA = ' | '.join('C5:1 Bb4:1 {}:1 {}:3'.format('A4' if b in (29, 31, 32, 36) else 'Ab4',
                                                  'F#4' if b == 36 else 'G4') for b in range(29, 37))
REF = {
    'signal': (1, 'D5:3 A5:3 | r:6 | D5:3 A5:2 G5:1 | F#5:6'),
    'motif_a': (5, _MOTIF),
    'cons_a': (9, 'Bb4:2 C5:1 D5:3 | Eb5:2 D5:1 C5:3 | D5:3 C5:2 Bb4:1 | A4:6'),
    'motif_a2': (13, _MOTIF),
    'cons_a2': (17, 'G5:3 F5:2 Eb5:1 | Eb5:2 D5:1 C5:3 | F5:2 D5:1 Bb4:3 | C5:3 A4:3'),
    'tavern': (21, 'Bb4:3 F5:3 | G5:2 F5:1 D5:3 | Eb5:2 D5:1 C5:3 | Bb4:3 r:2 D5:1'),
    'tavern2': (25, 'G5:2 F5:1 Eb5:3 | F5:2 Eb5:1 D5:3 | Bb4:3 C5:2 Eb5:1 | D5:6'),
    'cellar': (29, 'G3:3 C3:3 | Bb2:2 C3:1 Eb3:3 | D3:2 Eb3:1 F3:3 | G3:6'),
    'cellar2': (33, 'Eb3:3 G3:3 | C4:2 Bb3:1 Ab3:3 | G3:3 E3:3 | G3:3 F#3:3'),
    'cola': (29, _COLA),
    'bridge_a': (37, 'Eb4:3 Bb4:3 | F4:3 C5:3 | G4:3 D5:3 | Ab4:3 Eb5:3'),
    'bridge_b': (41, 'Bb4:3 F5:3 | C5:3 G5:3 | D5:3 G5:3 | D5:3 F#4:3'),
    'motif_r': (45, _MOTIF),
    'climax': (49, 'Bb5:3 G5:2 Eb5:1 | Eb5:2 D5:1 C5:3 | Bb4:2 D5:1 F5:3 | Eb5:2 D5:1 C5:3'),
    'cadence': (53, 'C5:2 Bb4:1 A4:3 | G4:6'),
    'coda': (55, 'Eb5:3 C5:3 | D5:6'),
    'signal_b': (57, 'D5:3 A5:3 | r:6 | D5:3 A5:2 G5:1 | A4:3 F#5:3'),
}


def ref_events(key: str) -> list[tuple[int, int, int]]:
    """[(tick, pitch, ticks)] of a reference passage, rests dropped."""
    bar, text = REF[key]
    return [(T(b, e), p, d * EIGHTH) for b, e, p, d in phrase(bar, text) if p is not None]


_UPPER = [ev for k in REF if k not in ('cellar', 'cellar2') for ev in ref_events(k)]


def melody_at(t: int):
    """Highest reference-melody pitch sounding at tick t (None in a rest)."""
    sounding = [p for s, p, d in _UPPER if s <= t < s + d]
    return max(sounding) if sounding else None


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
    tag: str = ''           # 'mel' = reference melody (shared timing), 'thirds', 'pad'...
    voice: object = None    # voice id inside a polyphonic track (for voice-leading checks)
    group: object = None    # notes of one strum share one timing offset
    offset: int = 0         # fixed offset inside a group (strum spread)
    breath: bool = False
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

    @property
    def sonatina(self) -> bool:
        return self.name in SONATINA_MAX_S

    def add(self, bar, e, pitch, eighths, vel, **kw) -> Note:
        n = Note(P(pitch), T(bar, e), int(round(eighths * EIGHTH)), int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def line(self, bar, e, items, vels, legato=True, tie=False, **kw):
        """Consecutive notes from (bar, eighth): items = [(pitch | None for a rest, eighths)]."""
        t = T(bar, e)
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        vi, prev = iter(vels), None
        for pitch, eighths in items:
            length = int(round(eighths * EIGHTH))
            if pitch is None:
                prev = None
                t += length
                continue
            v = next(vi)
            if tie and prev is not None and prev.pitch == P(pitch) and prev.we == t:
                prev.dur += length
            else:
                prev = Note(P(pitch), t, length, int(round(v)), legato=legato, **kw)
                self.notes.append(prev)
            t += length

    def mel(self, key, vels, legato=True, transpose=0, hv=HUMAN_VEL, breath_last=False, last_eighths=None,
            **kw) -> list[Note]:
        """The reference melody `key` (section 5), tagged so that every track and both versions
        share the same attack ticks (no flam in a crossfade or in a declared unison)."""
        evs = ref_events(key)
        vels = vels if isinstance(vels, list) else [vels] * len(evs)
        if len(vels) != len(evs):
            raise ValueError(f'{self.name} {key}: {len(evs)} notes, {len(vels)} velocities')
        out = []
        for (t, p, d), v in zip(evs, vels):
            out.append(Note(p + transpose, t, d, int(round(v)), legato=legato, tag='mel', hv=hv, **kw))
        if breath_last:
            out[-1].breath = True
        if last_eighths:                             # a shorter last note: a written breath
            out[-1].dur = last_eighths * EIGHTH
        self.notes.extend(out)
        return out

    def chord_at(self, bar, e, pitches, eighths, vel, **kw):
        for p in pitches:
            self.add(bar, e, p, eighths, vel, **kw)

    def strum(self, bar, e, pitches, eighths, vel, down=True):
        """Strumstick stroke: down = low to high, 15 ms apart; up = high to low, 10 ms apart, -12 vel."""
        order = sorted(pitches) if down else sorted(pitches, reverse=True)
        step = STRUM_DOWN if down else STRUM_UP
        v0 = vel if down else vel - 12
        for i, p in enumerate(order):
            self.add(bar, e, p, eighths, v0 + (i if down else -i), group=(bar, e), offset=i * step)

    def curve(self, num, points, bumps=(), lead=True, shape='cos'):
        """Controller `num` through breakpoints [(bar, eighth, value)], sampled on the 1/8-bar grid,
        plus bumps [(bar, eighth, amount)] that decay over a quarter note (support on long notes)."""
        pts = [(T(b, e), v) for b, e, v in points]
        bmp = [(T(b, e), a) for b, e, a in bumps]
        d = self.cc.setdefault(num, {})
        first = (pts[0][0] // CC_STEP) * CC_STEP
        if lead and first >= CC_STEP and first - CC_STEP not in d:   # never overwrite a phrase's fade-out
            first -= CC_STEP
        last = (pts[-1][0] // CC_STEP) * CC_STEP
        top = MAX_CC1 if num == 1 else 127

        def base(t):
            if t <= pts[0][0]:
                return pts[0][1]
            for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
                if t0 <= t <= t1:
                    x = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
                    if shape == 'cos':
                        x = (1 - math.cos(math.pi * x)) / 2
                    return v0 + (v1 - v0) * x
            return pts[-1][1]

        for g in range(first, last + 1, CC_STEP):
            extra = sum(a * max(0.0, 1 - (g - tb) / (2 * EIGHTH)) for tb, a in bmp if tb <= g)
            d[g] = max(0, min(top, int(round(base(g) + extra))))


def supports(key, amount, min_eighths=3):
    """Bumps on every note of a reference passage that lasts a dotted quarter or more."""
    out = []
    for t, _, d in ref_events(key):
        if d >= min_eighths * EIGHTH:
            out.append(((t // BAR) + 1, (t % BAR) / EIGHTH, amount))
    return out


def arch(n, base, top, end, peak=0.55, accents=None):
    """Velocities of an n-note phrase: rise from base to top at `peak`, fall to `end`."""
    out = []
    for i in range(n):
        x = i / max(1, n - 1)
        if x <= peak:
            v = base + (top - base) * (x / peak if peak else 1)
        else:
            v = top + (end - top) * ((x - peak) / (1 - peak))
        out.append(v + (accents[i] if accents else 0))
    return [int(round(v)) for v in out]


def ref_arch(key, base, top, end, peak=0.55, accent=3):
    """arch() for a reference passage, with an accent on the notes that fall on a beat."""
    evs = ref_events(key)
    acc = [accent if (t % BAR) in (0, 3 * EIGHTH) else 0 for t, _, _ in evs]
    return arch(len(evs), base, top, end, peak, acc)


# ── chord voicing with voice leading ─────────────────────────────────────────
def _bass_events() -> list[tuple[int, int]]:
    """Conceptual bass line (the common pizzicato, plus the cello bass where the pizz rests)."""
    evs = [(n.ws, n.pitch) for n in pizz_notes()]
    for bar, p in ((1, 43), (2, 41), (3, 39), (4, 38), (58, 41), (59, 39)):
        evs.append((T(bar), p))
    evs += [(T(60), 45), (T(60, 3), 38)]
    return sorted(evs)


def bass_at(t: int) -> int:
    best = None
    for s, p in BASS_EVENTS:
        if s <= t:
            best = p
    return best


def _parallel(a1, a2, b1, b2) -> bool:
    if a1 is None or a2 is None or b1 is None or b2 is None:
        return False
    if a1 == a2 or b1 == b2 or (a2 - a1) * (b2 - b1) <= 0:
        return False
    i1, i2 = abs(a1 - b1) % 12, abs(a2 - b2) % 12
    return i1 == i2 and i1 in (0, 7)


def voice_lead(events, lo, hi, n, start=None, avoid=None, need_root=False, top_limit=None):
    """events = [(tick, Chord)] -> [(tick, pitches)]: n chord tones in [lo, hi] with the third (and the
    seventh) present, minimal motion, no parallel 5ths/8ves among the voices nor against the bass and
    the melody, no unison with the melody."""
    out, prev, prev_t = [], start, None
    for t, ch in events:
        cands = [p for p in range(lo, hi + 1) if p % 12 in ch.pcs]
        bass_now, top_now = bass_at(t), melody_at(t)
        bass_prev = bass_at(t - 1) if prev_t is not None else None     # what sounds just before the change
        top_prev = melody_at(t - 1) if prev_t is not None else None
        best = None
        sizes = n if isinstance(n, tuple) else (n,)
        for combo in (c for k in sizes for c in itertools.combinations(cands, k)):
            pcs = [p % 12 for p in combo]
            k = len(combo)
            avail = {p % 12 for p in cands}
            guide = [g for g in (ch.third, ch.seventh) if g is not None and g in avail]
            if k <= 2 and guide and not any(g in pcs for g in guide):
                continue
            if k >= 3 and any(g not in pcs for g in guide):
                continue
            if need_root and ch.root not in pcs:
                continue
            cost = 3.0 * (k - len(set(pcs))) + 2.0 * (max(sizes) - k)
            cost += 0 if ch.root in pcs or ch.bass in pcs else 1.5
            cost += sum(max(0, b - a - 9) for a, b in zip(combo, combo[1:]))
            cost += 1.5 * sum(1 for a, b in zip(combo, combo[1:]) if b - a == 1)    # no semitone clusters
            if top_now is not None:
                cost += 4 * sum(1 for p in combo if p == top_now)
                if top_limit is not None:
                    cost += 6 * sum(1 for p in combo if p > top_now - top_limit)
            if avoid is not None and avoid(t) is not None:
                cost += 4 * sum(1 for p in combo if p == avoid(t))
            if prev:
                m = min(len(prev), k)
                if len(prev) == k:
                    cost += sum(abs(a - b) for a, b in zip(prev, combo))
                else:
                    cost += sum(min(abs(p - q) for q in prev) for p in combo)
                par = sum(_parallel(prev[i], combo[i], prev[j], combo[j]) for i in range(m) for j in range(i + 1, m))
                par += sum(_parallel(prev[i], combo[i], bass_prev, bass_now) for i in range(m))
                par += sum(_parallel(prev[i], combo[i], top_prev, top_now) for i in range(m))
                cost += 40 * par
            else:
                cost += 0.5 * abs(sum(combo) / k - (lo + hi) / 2)
            if best is None or (cost, combo) < best:
                best = (cost, combo)
        if best is None:
            raise ValueError(f'no voicing of {ch.symbol} in {lo}-{hi} with {sizes} notes')
        prev, prev_t = best[1], t
        out.append((t, best[1]))
    return out


def half_events(first, last, halves=(0, 1), offsets=(0, 3)):
    """[(tick, chord)] for each beat of bars first..last (a beat without a change repeats the chord)."""
    out = []
    for bar in range(first, last + 1):
        for h, e in zip(halves, offsets):
            out.append((T(bar, e), H(bar, h)))
    return out


def bar_of(t: int) -> int:
    return t // BAR + 1


def eighth_of(t: int) -> float:
    return (t % BAR) / EIGHTH


# ── the common layer: Basses Pizz (identical in both versions) ───────────────
PIZZ_VEL = {**{b: (52, 46) for b in range(5, 13)}, 8: (48, 42), 12: (50, 44),
            **{b: (56, 50) for b in range(13, 21)}, 19: (60, 54),
            **{b: (52, 46) for b in range(21, 29)}, **{b: (46, 0) for b in range(29, 36)}, 36: (50, 0),
            **{b: (52 + 2 * (b - 37), 46 + 2 * (b - 37)) for b in range(37, 45)},
            **{b: (66, 60) for b in range(45, 53)}, 49: (70, 62),
            53: (60, 54), 54: (58, 52), 55: (56, 50), 56: (54, 48), 57: (44, 0)}
# Pedal of the cellar (29-34): the octave of G changes so that no two-bar cell repeats.
PIZZ_CELLAR = {29: 43, 30: 31, 31: 31, 32: 43, 33: 43, 34: 31, 35: 39, 36: 38}


def _pizz_bar(bar, prev):
    """Pizz notes of one bar: (eighth, pitch) pairs. The octave (and, if the fifth would move in
    parallel octaves/fifths with the tune, the chord tone of eighth 3) is chosen looking at both moves."""
    c0, c1 = H(bar), H(bar, 1)
    if bar in PIZZ_CELLAR:
        return [(0, PIZZ_CELLAR[bar])]
    t0, t3 = T(bar), T(bar, 3)
    m_prev, m0, m3 = melody_at(t0 - EIGHTH), melody_at(t0), melody_at(t3)
    first = [p for p in range(31, 44) if p % 12 == c0.bass]
    if 29 <= bar <= 36 or bar == 57:
        return [(0, min(first, key=lambda p: (_parallel(prev, p, m_prev, m0), abs(p - prev), p)))]
    # eighth 3: the fifth (or the new bass when the chord changes); the alternative only to avoid parallels
    pcs = [c1.bass, c1.fifth] if changes(bar) and c1.bass != c0.bass else [c1.fifth, c1.third]
    best = None
    for p0 in first:
        for rank, pc in enumerate(pcs):
            for p3 in (p for p in range(31, 44) if p % 12 == pc):
                par = _parallel(prev, p0, m_prev, m0) + _parallel(p0, p3, m0, m3)
                key = (par, rank, abs(p0 - prev) + abs(p3 - p0), p0, p3)
                if best is None or key < best[0]:
                    best = (key, p0, p3)
    return [(0, best[1]), (3, best[2])]


def pizz_notes() -> list[Note]:
    """Root on eighth 0 and fifth on eighth 3 (the new bass if the chord changes) in 5-28 and 37-56;
    root on eighth 0 only in 29-36 and 57; silent in 1-4 and 58-60."""
    notes, prev = [], 43
    for bar in range(5, 58):
        v0, v3 = PIZZ_VEL[bar]
        cells = _pizz_bar(bar, prev)
        for e, p in cells:
            length = (3 if len(cells) == 1 else 2) * EIGHTH
            notes.append(Note(p, T(bar, e), length, v0 if e == 0 else v3))
            prev = p
    return notes


BASS_EVENTS = _bass_events()
PIZZ = pizz_notes()


# ── textures shared by both versions ─────────────────────────────────────────
def giga_cell(ch: Chord, second_half=False) -> list[int]:
    """Cello spiccato jig on one beat: bass, fifth (or root above an inverted bass), octave; 38-55."""
    b = near(ch.bass, 43, 38, 49)
    tones = sorted(p for p in range(b + 1, 56) if p % 12 in ch.pcs)
    if ch.bass == ch.root:
        n1 = b + 7 if (b + 7) % 12 in ch.pcs else next(p for p in tones if p >= b + 5)
    else:
        n1 = next(p for p in tones if p % 12 == ch.root)
    n2 = b + 12 if b + 12 <= 55 else next((p for p in tones if p > n1), None) or \
        max(p for p in tones if p < n1)
    if second_half and ch.seventh is not None:
        colour = ch.pcs[4] if len(ch.pcs) > 4 else ch.seventh      # b9 of a D7(b9), else the seventh
        sev = [p for p in tones if p % 12 == colour]
        if sev:
            n2 = sev[0]
    return [b, n1, n2]


def giga(part, first, last, vel_on, vel_off):
    for bar in range(first, last + 1):
        von = vel_on(bar) if callable(vel_on) else vel_on
        voff = vel_off(bar) if callable(vel_off) else vel_off
        for h in (0, 1):
            cell = giga_cell(H(bar, h), second_half=h == 1)
            for i, p in enumerate(cell):
                part.add(bar, 3 * h + i, p, 1, von if i == 0 else voff - (i == 2) * 2)


def tuba_bassoon(s, first, last, tuba_vel, bsn_vel, tuba=True, bassoon=True, tuba_range=(31, 43), walk=()):
    """Oom-pah: tuba on eighth 0 (the bass; in the `walk` bars also the new bass of eighth 3),
    bassoon on eighths 2 and 5 (third / fifth, 50-58)."""
    prev_b = 55
    tu = s['Tuba Stac'] if tuba else None
    for bar in range(first, last + 1):
        c0, c1 = H(bar), H(bar, 1)
        tv = tuba_vel(bar) if callable(tuba_vel) else tuba_vel
        bv = bsn_vel(bar) if callable(bsn_vel) else bsn_vel
        if tuba:
            p = _tuba_pick(tu, c0.bass, bar, tuba_range)
            tu.add(bar, 0, p, 2, tv)
            pz = [n.pitch for n in PIZZ if n.ws == T(bar, 3)]
            if bar in walk and changes(bar) and pz and pz[0] % 12 != c0.bass:
                tu.add(bar, 3, near(pz[0] % 12, p, *tuba_range), 2, tv - 6)
        if bassoon:
            for e, ch in ((2, c0), (5, c1)):
                opts = [p for p in range(50, 59) if p % 12 in (ch.third, ch.fifth)]
                p = min(opts, key=lambda q: (q == prev_b, abs(q - prev_b), q))
                s['Bassoon Stac'].add(bar, e, p, 1, bv - (2 if e == 5 else 0))
                prev_b = p


def _tuba_pick(tu, pc, bar, rng_):
    """Octave of the tuba's downbeat: nearest to the previous note, unless that would make the
    two-bar cell (previous bar, this bar) appear a third time; then the other octave."""
    before = [n for n in tu.notes if n.ws < T(bar)]
    prev = before[-1].pitch if before else 38
    options = sorted((p for p in range(rng_[0], rng_[1] + 1) if p % 12 == pc), key=lambda p: (abs(p - prev), p))
    if not before:
        return options[0]
    last_bar = [(n.ws - T(bar - 1), n.pitch) for n in before if n.ws >= T(bar - 1)]
    seen = {}
    for b in sorted({bar_of(n.ws) for n in before}):
        cell = tuple((n.ws - T(b), n.pitch) for n in tu.notes if T(b) <= n.ws < T(b + 2))
        seen[cell] = seen.get(cell, 0) + 1

    def count(p):
        return seen.get(tuple(last_bar) + ((BAR, p),), 0)
    return min(options, key=lambda p: (count(p) >= 2, abs(p - prev), p))


def offbeats(part, first, last, vel, rocking=False):
    """Viola spiccato after-beats on eighths 1, 2, 4 and 5, never above E4: dyads of the chord, or
    (rocking) the lower note then the upper one."""
    evs = voice_lead(half_events(first, last, offsets=(1, 4)), 55, 64, 2)
    for t, dyad in evs:
        bar, e = bar_of(t), eighth_of(t)
        v = vel(bar) if callable(vel) else vel
        for k in (0, 1):
            part.chord_at(bar, e + k, [dyad[k]] if rocking else dyad, 1, v - 4 * k)


def strums(part, first, last, rhythm, vel, start=None, sizes=(4, 3)):
    """Strumstick: rhythm 'rock' = down strokes on 0 and 3 (q. q.); 'jig' = 0, 2, 3, 5 (q e q e)."""
    evs = voice_lead(half_events(first, last), 55, 67, sizes, start=start, need_root=True)
    for t, voicing in evs:
        bar, e = bar_of(t), eighth_of(t)
        v = vel(bar) if callable(vel) else vel
        if rhythm == 'rock':
            part.strum(bar, e, voicing, 3, v - (3 if e else 0))
        else:
            part.strum(bar, e, voicing, 2, v - (2 if e else 0))
            part.strum(bar, e + 2, voicing[1:], 1, v, down=False)
    return evs[-1][1]


def cajon(part, first, last, keys, vel):
    """keys = {eighth: key}; vel(bar, eighth) or a dict {key: velocity}."""
    for bar in range(first, last + 1):
        for e, k in sorted(keys.items()):
            v = vel(bar, e) if callable(vel) else vel[k]
            part.add(bar, e, k, 1, v)


def tom_fill(part, bar, lo=54, hi=84):
    for i in range(6):                              # eighths 3-5 in sixteenths, crescendo
        part.notes.append(Note(62, T(bar, 3) + i * EIGHTH // 2, EIGHTH // 2, lo + (hi - lo) * i // 5, hv=3))


# ── sections ─────────────────────────────────────────────────────────────────
def intro(s, v):
    """Bars 1-4: Gm | F | Eb | D - D7. The smugglers' signal, re-la over G minor, Andalusian descent."""
    if v == 'explora':
        oc = s['Ocarina']
        oc.mel('signal', [46, 50, 47, 52, 48, 44])
        oc.curve(11, [(1, 0, 84), (1, 3, 90), (2, 0, 82), (3, 0, 84), (3, 3, 90), (3, 4.5, 108),
                      (3, 5.5, 90), (4, 0, 88), (4, 5.25, 64)])
        c = s['Cellos Sus Quiet']
        c.line(1, 0, [('G2', 6), ('F2', 6), ('Eb2', 6), ('D2', 6)], [32, 31, 33, 35])
        c.curve(11, [(1, 0, 74), (3, 0, 80), (4, 3, 86), (4, 5.25, 80)], lead=False)
        b = s['Basses Sus Quiet']
        b.line(1, 0, [('G1', 6), ('F1', 6), ('Eb1', 6), ('D1', 6)], [30, 30, 31, 33])
        b.curve(11, [(1, 0, 72), (3, 0, 78), (4, 3, 84), (4, 5.25, 70)], lead=False)
        hm = s['Harmonica Vib']                     # accordion: one held chord per bar, three voices
        # Each voice moves against the falling bass (G F Eb D) and against the signal's G5-F#5.
        hm.line(1, 0, [('G3', 6), ('A3', 6), ('G3', 6), ('A3', 6)], [31, 30, 32, 33], voice=0, tag='pad')
        hm.line(1, 0, [('Bb3', 6), ('C4', 6), ('Eb4', 6), ('F#4', 6)], [30, 30, 31, 32], voice=1, tag='pad')
        hm.line(1, 0, [('D4', 6), ('F4', 6), ('G4', 6), (None, 3), ('C4', 3)], [30, 31, 31, 31],
                voice=2, tag='pad')                    # D, then the seventh of D7 on the second beat
        hm.curve(11, [(1, 0, 80), (2, 3, 88), (3, 3, 84), (4, 5.25, 70)], lead=False)
        s['Ocean Drum'].add(1, 0, 61, 24, 30, jitter=False, hv=2)
        s['Ocean Drum'].curve(11, [(1, 0, 92), (2, 3, 100), (4, 5.25, 58)], lead=False)
        s['Hull Creak'].add(2, 0, 68, 3, 34, hv=3)
    else:
        vn = s['Violin Solo']
        vn.mel('signal', [64, 68, 64, 70, 66, 62])
        vn.curve(1, [(1, 0, 80), (1, 3, 82), (2, 0, 78), (3, 0, 80), (3, 3, 84), (3, 4.5, 92),
                     (3, 5.5, 82), (4, 0, 82), (4, 5.25, 74)], lead=False)
        giga(s['Cellos Spic'], 1, 4, 66, 56)
        hm = s['Harmonica Accented']
        for t, chord_ in voice_lead([(T(b, 3), H(b, 1)) for b in range(1, 5)], 55, 67, 3):
            hm.chord_at(bar_of(t), 3, chord_, 1, 48)
        tuba_bassoon(s, 3, 4, 62, 56)
        cajon(s['Cajon'], 1, 4, {0: 61, 3: 61, 5: 60}, lambda b, e: {0: 66, 3: 62, 5: 56}[e] + (b % 2))
        cajon(s['Frame Drum'], 1, 4, {1: 65, 4: 65}, lambda b, e: 32 + (e == 4) * 2)
        for bar in (1, 3):
            s['Bass Drum'].add(bar, 0, 62, 1, 64)


def section_a(s, v):
    """Bars 5-12: Gm | C - Gm/Bb | F - D7 | Gm || Bb | Cm - F7 | Gm - Cm7 | D7sus4 - D7."""
    if v == 'explora':
        rec = s['Tenor Recorder']
        rec.mel('motif_a', ref_arch('motif_a', 60, 67, 58), breath_last=True)
        rec.curve(11, [(5, 0, 90), (6, 0, 96), (7, 0, 94), (8, 0, 92), (8, 5.25, 72)],
                  bumps=supports('motif_a', 10))
        hm = s['Harmonica Vib']
        hm.mel('cons_a', ref_arch('cons_a', 56, 62, 55), hv=3)
        hm.curve(11, [(9, 0, 88), (10, 0, 96), (11, 0, 94), (12, 0, 90), (12, 5.25, 70)],
                 bumps=supports('cons_a', 10))
        strums(s['Strumstick'], 5, 12, 'rock', lambda b: 46 - (b == 8) * 5 - (b == 12) * 6 + (b in (6, 10)) * 2)
        c = s['Cellos Sus Quiet']                    # held roots under the harmonica's answer
        c.line(9, 0, [('Bb2', 6), ('C3', 3), ('A2', 3), ('G2', 3), ('C3', 3), ('D3', 6)],
               [34, 35, 34, 34, 36, 35])
        c.curve(11, [(9, 0, 76), (10, 3, 86), (12, 0, 84), (12, 5.25, 72)])
        cajon(s['Cajon'], 5, 12, {0: 61, 3: 60},
              lambda b, e: (48 if e == 0 else 42) + (b in (6, 10)) * 2 - (b in (8, 12)) * 3)
        s['Hull Creak'].add(8, 3, 68, 3, 33, hv=3)
    else:
        hn = s['Horns Marcato']
        hn.mel('motif_a', ref_arch('motif_a', 78, 84, 74))
        hn.curve(1, [(5, 0, 94), (6, 0, 97), (7, 0, 95), (8, 0, 93), (8, 5.25, 84)],
                 bumps=supports('motif_a', 5))
        vn = s['Violin Solo']
        vn.mel('cons_a', ref_arch('cons_a', 72, 80, 70))
        vn.curve(1, [(9, 0, 88), (10, 0, 92), (11, 0, 91), (12, 0, 88), (12, 5.25, 80)],
                 bumps=supports('cons_a', 6))
        giga(s['Cellos Spic'], 5, 12, lambda b: 78 - (b == 8) * 4, 66)
        offbeats(s['Violas Spic'], 5, 12, lambda b: 60 - (b == 8) * 4)
        tuba_bassoon(s, 5, 12, 74, 68, walk=range(5, 21))
        strums(s['Strumstick'], 5, 12, 'jig', lambda b: 64 - (b == 8) * 4)
        cajon(s['Cajon'], 5, 12, {0: 61, 2: 60, 3: 61, 5: 60},
              lambda b, e: {0: 78, 2: 64, 3: 74, 5: 62}[e] + (b in (6, 10)) * 2)
        cajon(s['Frame Drum'], 5, 12, {1: 65, 4: 65}, lambda b, e: 46 - (e == 1) * 2)
        for bar in (5, 7, 9, 11):
            s['Timpani'].add(bar, 0, near(H(bar).bass, 43, 38, 48), 3, 76)
        tom_fill(s['Tom'], 12)


def section_a2(s, v):
    """Bars 13-20: Ebmaj7 | C7 - Gm/Bb | F - D7/F# | Gm - Gm/F || Ebmaj7 | Cm7 - F7 | Dm7 - Gm7 | Cm7 - F7."""
    counter_13 = [('Bb3', 6), ('Bb3', 3), ('D4', 3), ('C4', 3), ('C4', 3), ('D4', 3), ('D4', 3)]
    if v == 'explora':
        vn = s['Violin Solo']
        vn.mel('motif_a2', ref_arch('motif_a2', 62, 70, 58))
        vn.curve(1, [(13, 0, 72), (14, 0, 80), (15, 0, 76), (16, 0, 72), (16, 5.25, 62)],
                 bumps=supports('motif_a2', 4))
        rec = s['Tenor Recorder']
        rec.mel('cons_a2', ref_arch('cons_a2', 62, 68, 58))
        rec.curve(11, [(17, 0, 90), (18, 3, 98), (19, 3, 100), (20, 3, 92), (20, 5.25, 76)])
        c = s['Cellos Sus']                           # countermelody against the violin
        c.line(13, 0, counter_13, [46, 48, 50, 48, 46, 48, 46])
        c.curve(11, [(13, 0, 80), (14, 3, 92), (15, 3, 86), (16, 5.25, 70)])
        hm = s['Harmonica Vib']
        avoid = lambda t: next((n.pitch for n in c.notes if n.ws <= t < n.we), None)  # noqa: E731
        for t, voicing in voice_lead(half_events(13, 20), 55, 67, (3, 2), avoid=avoid):
            for k, p in enumerate(voicing):
                hm.notes.append(Note(p, t, 3 * EIGHTH, 34 + (bar_of(t) >= 17) * 2, voice=k, tag='pad',
                                     legato=True))
        hm.curve(11, [(13, 0, 78), (16, 0, 84), (17, 0, 82), (19, 0, 88), (20, 5.25, 76)])
        strums(s['Strumstick'], 13, 20, 'rock', lambda b: 47 + (b in (14, 18, 19)) * 2 - (b == 16) * 3)
        h = s['Folk Harp']                            # rising eighths, never above G4
        arps = {17: ['Eb3', 'G3', 'Bb3', 'D4', 'Eb4', 'G4'], 18: ['C3', 'Eb3', 'G3', 'F3', 'A3', 'Eb4'],
                19: ['D3', 'F3', 'A3', 'G3', 'Bb3', 'F4'], 20: ['C3', 'Eb3', 'Bb3', 'F3', 'A3', 'Eb4']}
        for bar, ps in arps.items():
            for e, p in enumerate(ps):
                h.add(bar, e, p, 1, 46 + (e % 3) - (bar == 20) * 2 + (e == 0) * 2)
        cajon(s['Cajon'], 13, 20, {0: 61, 3: 60, 5: 62},
              lambda b, e: {0: 50, 3: 44, 5: 38}[e] + (b in (14, 18)) * 2 - (b == 16) * 3)
    else:
        vn = s['Violin Solo']
        vn.mel('motif_a2', ref_arch('motif_a2', 74, 82, 70))
        vn.curve(1, [(13, 0, 94), (14, 0, 98), (15, 0, 96), (16, 0, 94), (16, 5.25, 84)],
                 bumps=supports('motif_a2', 4))
        ens = s['Violins Sus']
        ens.mel('motif_a2', ref_arch('motif_a2', 72, 78, 68))
        ens.mel('cons_a2', [76, 76, 78, 80, 82, 82, 88, 86, 84, 80, 76])
        ens.curve(11, [(13, 0, 90), (14, 0, 96), (16, 0, 92), (16, 5.25, 80), (17, 0, 90), (18, 0, 100),
                       (19, 0, 114), (19, 3, 118), (20, 0, 104), (20, 5.25, 92)])
        hs = s['Horns Sustain']
        hs.line(13, 0, counter_13, [62, 64, 66, 64, 62, 64, 62])
        hs.line(17, 0, [('G3', 6), ('G3', 3), ('A3', 3), ('F3', 3), ('G3', 3), ('G3', 3), ('A3', 3)],
                [62, 62, 64, 64, 66, 64, 62])
        hs.curve(1, [(13, 0, 78), (14, 3, 84), (16, 5.25, 74), (17, 0, 78), (19, 0, 84), (20, 5.25, 76)])
        giga(s['Cellos Spic'], 13, 20, lambda b: 78 + (b == 19) * 6, lambda b: 66 + (b == 19) * 4)
        offbeats(s['Violas Spic'], 13, 20, lambda b: 62 + (b == 19) * 4, rocking=True)
        tuba_bassoon(s, 13, 20, 74, 68, walk=range(5, 21))
        strums(s['Strumstick'], 13, 20, 'jig', lambda b: 64 + (b == 19) * 4, sizes=(3,))   # lighter under the violins
        cajon(s['Cajon'], 13, 20, {0: 61, 2: 60, 3: 61, 5: 60},
              lambda b, e: {0: 80, 2: 64, 3: 74, 5: 62}[e] + (b == 19) * 4)
        cajon(s['Frame Drum'], 13, 20, {1: 65, 4: 65}, lambda b, e: 46 + (b == 19) * 4)
        for bar in (13, 15, 17, 19):
            s['Timpani'].add(bar, 0, near(H(bar).bass, 43, 38, 48), 3, 76 + (bar == 19) * 6)
        tom_fill(s['Tom'], 20)


def tavern_left_hand(pn, v):
    """Left hand of the tavern piano: bass 34-46 and chords 52-64 (rocking in E, stride in C)."""
    prev = 34
    chords = voice_lead(half_events(21, 28), 52, 64, 3)
    for bar in range(21, 29):
        c0, c1 = H(bar), H(bar, 1)
        b0 = near(c0.bass, prev, 34, 46)
        b3 = near(c1.bass if changes(bar) else c0.fifth, b0, 34, 46)
        prev = b0
        ch0 = chords[2 * (bar - 21)][1]
        ch1 = chords[2 * (bar - 21) + 1][1]
        if v == 'explora':
            pn.add(bar, 0, b0, 3, 46)
            pn.chord_at(bar, 3, ch1, 3, 41)
        else:
            pn.add(bar, 0, b0, 2, 72)
            pn.chord_at(bar, 2, ch0, 1, 62)
            pn.add(bar, 3, b3, 2, 68)
            pn.chord_at(bar, 5, ch1, 1, 60)


def harmonica_thirds(part):
    """A diatonic third under the tavern tune (a sixth when the third leaves the chord on a beat)."""
    scale = [10, 0, 2, 3, 5, 7, 9]                  # B-flat major
    for t, p, d in ref_events('tavern2'):
        deg = scale.index(p % 12)
        below = p - ((p % 12 - scale[(deg - 2) % 7]) % 12)
        e = eighth_of(t)
        ch = H(bar_of(t), 0 if e < 3 else 1)
        if e in (0, 3) and below % 12 not in ch.pcs:
            below = p - ((p % 12 - scale[(deg - 5) % 7]) % 12)
            if below % 12 not in ch.pcs:             # D7(b9): the chord's own sixth below (F#, not F)
                below = max(q for q in range(p - 9, p - 7) if q % 12 in ch.pcs)
        part.notes.append(Note(below, t, d, 0, tag='thirds', legato=True))


def section_b(s, v):
    """Bars 21-28 (B-flat major, the tavern): Bb | Eb - Bb/D | Cm7 - F7 | Bb - G7 || Cm | F7 - Bbmaj7 |
    Ebmaj7 - Am7b5 | D7(b9)."""
    pn = s['Tavern Piano']
    if v == 'explora':
        pn.mel('tavern', [64, 66, 65, 63, 64, 64, 62, 63, 62, 60])
        pn.mel('tavern2', [65, 63, 64, 64, 62, 63, 62, 64, 62, 60])
        harmonica_thirds(s['Harmonica Vib'])
        s['Harmonica Vib'].curve(11, [(25, 0, 84), (26, 3, 88), (28, 0, 86), (28, 5.25, 72)])
        strums(s['Strumstick'], 21, 28, 'rock', lambda b: 46 + (b == 24) * -3)
        va = s['Violas Sus Quiet']                   # guide tones
        va.line(21, 0, [('F4', 6), ('Eb4', 3), ('F4', 3), ('Eb4', 6), ('D4', 3), ('B3', 3), ('C4', 9),
                        ('D4', 6), ('Eb4', 9)], [30, 30, 31, 31, 30, 32, 30, 31, 32])
        va.curve(11, [(21, 0, 80), (24, 0, 84), (24, 3, 78), (25, 0, 82), (28, 0, 86), (28, 5.25, 70)])
        cajon(s['Cajon'], 21, 28, {0: 61, 3: 60}, lambda b, e: (48 if e == 0 else 42) - (b == 24) * 4)
    else:
        pn.mel('tavern', [72, 74, 73, 71, 72, 72, 70, 71, 70, 68], hv=4)
        pn.mel('tavern2', [73, 71, 72, 72, 70, 71, 70, 72, 70, 68], hv=4)
        vn = s['Violin Solo']
        vn.mel('tavern', ref_arch('tavern', 72, 76, 70))
        vn.mel('tavern2', ref_arch('tavern2', 72, 76, 70))
        vn.curve(1, [(21, 0, 90), (22, 0, 92), (24, 0, 90), (24, 3, 84), (25, 0, 90), (27, 0, 92),
                     (28, 0, 90), (28, 5.25, 82)])
        harmonica_thirds(s['Harmonica Accented'])
        giga(s['Cellos Spic'], 21, 28, 66, 56)
        offbeats(s['Violas Spic'], 21, 28, 48)
        tuba_bassoon(s, 21, 28, 62, 56)
        strums(s['Strumstick'], 21, 28, 'jig', 62)
        cajon(s['Cajon'], 21, 28, {0: 61, 2: 60, 3: 61, 5: 60},
              lambda b, e: {0: 78, 2: 64, 3: 74, 5: 62}[e] - (b == 24) * 4)
        for bar in (21, 23):
            s['Bass Drum'].add(bar, 0, 62, 1, 62)
    tavern_left_hand(pn, v)


def section_c(s, v):
    """Bars 29-36 (the cellar, the breath): pedal G with the Phrygian Abmaj7; the motif inverted in the
    bass clarinet; the tail as an ostinato (A natural / A flat with the harmony); C7 lets light in."""
    bc = s['Bass Clarinet']
    if v == 'explora':
        bc.mel('cellar', [58, 60, 56, 58, 62, 58, 60, 62, 58])
        bc.mel('cellar2', [60, 62, 66, 62, 60, 60, 58, 60, 62])
        bc.curve(1, [(29, 0, 62), (30, 3, 66), (31, 3, 68), (32, 5.25, 60), (33, 0, 64), (34, 0, 70),
                     (35, 0, 66), (36, 0, 64), (36, 5.25, 75)])
        harp = s['Folk Harp']
        harp.mel('cola', [v_ for b in range(29, 37) for v_ in
                          ([40, 37, 38, 41] if b % 2 else [42, 38, 39, 43])], legato=False)
        c = s['Cellos Sus Quiet']                    # pedal G, re-bowed every two bars
        c.line(29, 0, [('G2', 12), ('G2', 12), ('G2', 12), ('Eb2', 3), ('C3', 3), ('D3', 6)],
               [30, 30, 31, 31, 32, 34])
        c.curve(11, [(29, 0, 76), (30, 3, 82), (31, 0, 76), (32, 3, 82), (33, 0, 76), (34, 3, 82),
                     (35, 0, 78), (36, 0, 80), (36, 5.25, 96)])
        cajon(s['Cajon'], 29, 36, {0: 62, 3: 62}, lambda b, e: (30 if e == 0 else 26) + (b == 36) * 4)
        for bar in (30, 34):
            s['Hull Creak'].add(bar, 0, 68, 3, 33, hv=3)
    else:
        bc.mel('cellar', [68, 70, 66, 68, 72, 68, 70, 72, 68])
        bc.mel('cellar2', [70, 72, 74, 72, 70, 70, 68, 70, 72])
        bc.curve(1, [(29, 0, 74), (30, 3, 76), (31, 3, 78), (32, 5.25, 72), (33, 0, 74), (34, 0, 78),
                     (35, 0, 76), (36, 0, 76), (36, 5.25, 84)])
        bsn = s['Bassoon Stac']                      # doubles in staccato: footsteps with knives
        for t, p, d in ref_events('cellar') + ref_events('cellar2'):
            bsn.notes.append(Note(p, t, EIGHTH, 50 + (eighth_of(t) == 0) * 3, tag='mel'))
        s['Violins Pizz'].mel('cola', [v_ for b in range(29, 37) for v_ in
                                       ([48, 45, 46, 50] if b % 2 else [50, 46, 47, 52])], legato=False)
        tr = s['Basses Trem']
        tr.line(29, 0, [('G1', 12), ('G1', 12), ('G1', 12), ('Eb1', 3), ('C2', 3), ('D2', 6)],
                [34, 34, 35, 35, 36, 38])
        tr.curve(11, [(29, 0, 70), (30, 0, 96), (30, 5.25, 70), (31, 0, 70), (32, 0, 96), (32, 5.25, 70),
                      (33, 0, 70), (34, 0, 96), (34, 5.25, 70), (35, 0, 72), (36, 0, 84), (36, 5.25, 100)])
        sord = {29: 'G2 D3 G2 G2 C3 G2', 30: 'G2 C3 G2 G2 Eb3 G2', 31: 'G2 Bb2 D3 G2 D3 Bb2',
                32: 'G2 D3 G2 D3 G2 D3', 33: 'G2 C3 Eb3 G2 C3 G2', 34: 'G2 Eb3 C3 G2 Eb3 G2',
                35: 'G2 Bb2 G2 G2 C3 G2', 36: 'D3 G2 D3 D3 A2 D3'}
        for bar, txt in sord.items():                # jig on the pedal, muted
            for e, p in enumerate(txt.split()):
                s['Cellos Spic'].add(bar, e, p, 1, (46 if e in (0, 3) else 40) + (bar == 36) * 4)
        cajon(s['Frame Drum'], 29, 36, {2: 65, 5: 65}, lambda b, e: 30 + (e == 5) * 2)
        for bar in (29, 31, 33, 35):
            s['Bass Drum'].add(bar, 0, 62, 1, 46)
        cajon(s['Cajon'], 29, 36, {0: 62, 3: 62}, lambda b, e: (44 if e == 0 else 40) + (b == 36) * 4)
        s['Hull Creak'].add(34, 0, 68, 3, 46, hv=3)


def bridge(s, v):
    """Bars 37-44 («Abordaje»): Eb | F | Gm | Ab | Bb | C | D7sus4 | D7(b9): rising bass, the head of the
    motif in sequence, an eight-bar crescendo."""
    if v == 'explora':
        rec = s['Tenor Recorder']
        rec.mel('bridge_a', [50, 54, 54, 57, 57, 60, 60, 63])
        rec.mel('bridge_b', [64, 68, 68, 72, 72, 75, 76, 78])
        rec.curve(11, [(37, 0, 80), (40, 5, 100), (41, 0, 96), (44, 3, 116), (44, 5.25, 110)], shape='lin')
        hm = s['Harmonica Vib']
        hm.mel('bridge_a', [46, 49, 49, 52, 52, 55, 55, 58])
        hm.curve(11, [(37, 0, 78), (40, 3, 98), (40, 5.25, 86)], shape='lin')
        vn = s['Violin Solo']
        vn.mel('bridge_b', [66, 70, 70, 74, 74, 77, 78, 80])
        vn.curve(1, [(41, 0, 70), (44, 3, 90), (44, 5.25, 88)], shape='lin')
        last = strums(s['Strumstick'], 37, 40, 'rock', lambda b: 46 + 2 * (b - 37))
        strums(s['Strumstick'], 41, 44, 'jig', lambda b: 56 + 3 * (b - 41), start=last)
        c = s['Cellos Sus']
        c.line(37, 0, [('Eb2', 6), ('F2', 6), ('G2', 6), ('Ab2', 6), ('Bb2', 6), ('C3', 6), ('D3', 6),
                       ('D3', 6)], [48, 51, 54, 57, 60, 63, 66, 70])
        c.curve(11, [(37, 0, 70), (44, 5.25, 112)], shape='lin')
        tr = s['Violas Trem']
        tr.line(41, 0, [('D4', 6), ('E4', 6), ('C4', 9), ('Eb4', 3)], [38, 46, 54, 62], tie=True, voice=0)
        tr.line(41, 0, [('Bb3', 6), ('G3', 12), ('A3', 6)], [36, 44, 60], tie=True, voice=1)
        tr.curve(11, [(41, 0, 60), (44, 5.25, 110)], shape='lin')
        cajon(s['Cajon'], 37, 40, {0: 61, 3: 60}, lambda b, e: (48 if e == 0 else 42) + 2 * (b - 37))
        cajon(s['Cajon'], 41, 44, {0: 61, 1: 62, 2: 62, 3: 60, 4: 62, 5: 62},
              lambda b, e: (56 if e in (0, 3) else 42) + 4 * (b - 41) + e // 2)
        roll = s['Timpani Roll']
        roll.add(43, 0, 38, 12, 50, jitter=False, hv=0)
        roll.curve(11, [(43, 0, 40), (44, 5.25, 112)], shape='lin', lead=False)
    else:
        vm = s['Violins Marcato']
        vm.mel('bridge_a', [70, 72, 72, 74, 74, 76, 76, 78])
        vm.mel('bridge_b', [80, 82, 82, 84, 84, 86, 86, 88])
        vm.curve(1, [(37, 0, 85), (44, 3, 108), (44, 5.25, 108)], shape='lin', lead=False)
        hn = s['Horns Marcato']
        hn.mel('bridge_a', [72, 74, 74, 76, 76, 78, 78, 80])
        hn.mel('bridge_b', [80, 82, 82, 84, 84, 86, 86, 86], transpose=-12)
        hn.notes[-1].pitch = P('F#4')               # bar 44: the horns climb to unison on the leading tone
        hn.curve(1, [(37, 0, 85), (44, 3, 100), (44, 5.25, 100)], shape='lin')
        giga(s['Cellos Spic'], 37, 44, lambda b: 72 + 2 * (b - 37), lambda b: 62 + 2 * (b - 37))
        offbeats(s['Violas Spic'], 37, 44, lambda b: 62 + 2 * (b - 37), rocking=True)  # rocking while the bass climbs
        tuba = s['Tuba Stac']                        # rising bass; Eb1 lies below TubaStac, so it enters on F1
        for bar, p in zip(range(38, 45), ['F1', 'G1', 'Ab1', 'Bb1', 'C2', 'D2', 'D2']):
            tuba.add(bar, 0, p, 2, 70 + 2 * (bar - 38))
        cajon(s['Cajon'], 37, 44, {0: 61, 1: 62, 2: 60, 3: 61, 4: 62, 5: 60},
              lambda b, e: (70 if e in (0, 3) else 54) + 3 * (b - 37) - (e == 3) * 2)
        for bar in range(37, 45):
            s['Bass Drum'].add(bar, 0, 62, 1, 66 + 2 * (bar - 37))
        roll = s['Timpani Roll']
        roll.add(43, 0, 38, 12, 64, jitter=False, hv=0)
        roll.curve(11, [(43, 0, 50), (44, 5.25, 120)], shape='lin', lead=False)
        start = T(45) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
        s['Cymbal'].notes.append(Note(CYMBAL_SWELL, start, T(45) + 3 * EIGHTH - start, 72, jitter=False, hv=0))
        tom_fill(s['Tom'], 44, 58, 84)


def return_section(s, v):
    """Bars 45-56: the motif tutti (Gm | C - Gm/Bb | F - D7 | Gm - Gm/F), climax on Ebmaj7 (49), G7/B,
    deceptive D7 -> Eb (52-53), perfect cadence in 54, coda Eb - Cm | D7."""
    if v == 'explora':
        vn = s['Violin Solo']
        vn.mel('motif_r', ref_arch('motif_r', 74, 80, 72))
        vn.mel('climax', [90, 80, 78, 76, 74, 72, 70, 72, 74, 70, 68, 66])
        vn.curve(1, [(45, 0, 86), (46, 0, 88), (47, 0, 90), (48, 3, 92), (48, 5.5, 94), (49, 0, 100),
                     (50, 0, 94), (51, 0, 86), (52, 0, 80), (52, 5.25, 72)])
        rec = s['Tenor Recorder']
        rec.mel('motif_r', ref_arch('motif_r', 72, 80, 70))
        rec.mel('climax', [94, 82, 80, 78, 76, 74, 72, 74, 76, 70, 68, 66])
        rec.mel('cadence', [64, 62, 60, 58], last_eighths=5)
        rec.mel('coda', [58, 55, 52])
        rec.curve(11, [(45, 0, 96), (48, 3, 104), (49, 0, 118), (50, 0, 108), (51, 0, 100), (52, 0, 94),
                       (53, 0, 96), (54, 3, 88), (55, 0, 92), (56, 5.25, 74)])
        hn = s['Horn Sus']                            # countermelody 45-52
        hn.line(45, 0, [('Bb3', 6), ('C4', 3), ('D4', 3), ('C4', 3), ('C4', 3), ('Bb3', 3), ('D4', 3),
                        ('G3', 3), ('Bb3', 3), ('G3', 3), ('A3', 3), ('F3', 3), ('F3', 3), ('G3', 3),
                        ('F#3', 3)], [68, 70, 72, 70, 68, 68, 70, 76, 74, 72, 70, 68, 66, 64, 62])
        hn.curve(11, [(45, 0, 88), (48, 3, 96), (49, 0, 104), (50, 0, 98), (52, 5.25, 76)])
        hm = s['Harmonica Vib']
        for t, voicing in voice_lead([(T(b, 3), H(b, 1)) for b in range(45, 57)], 55, 67, (3, 2)):
            for k, p in enumerate(voicing):
                hm.notes.append(Note(p, t, 3 * EIGHTH, 46 - (bar_of(t) >= 53) * 4, voice=k, tag='pad'))
        hm.curve(11, [(45, 0, 84), (49, 3, 92), (56, 5.25, 76)])
        strums(s['Strumstick'], 45, 56, 'jig', lambda b: 58 + (b == 49) * 4 if b <= 52 else 44 - 3 * (b - 53))
        c = s['Cellos Sus']
        c.line(45, 0, [('G2', 6), ('C3', 3), ('Bb2', 3), ('F2', 3), ('D2', 3), ('G2', 3), ('F2', 3),
                       ('Eb2', 6), ('C3', 3), ('F2', 3), ('Bb2', 3), ('B2', 3), ('C3', 3), ('D3', 3),
                       ('Eb3', 3), ('F#2', 3), ('G2', 6), ('Eb2', 3), ('G2', 3), ('D2', 6)],
               [62, 63, 62, 63, 62, 64, 63, 70, 66, 64, 64, 63, 62, 63, 60, 59, 58, 56, 55, 56])
        c.curve(11, [(45, 0, 92), (49, 0, 104), (52, 0, 94), (54, 0, 88), (56, 5.25, 78)])
        cajon(s['Cajon'], 45, 56, {0: 61, 2: 62, 3: 61, 5: 60},
              lambda b, e: {0: 74, 2: 56, 3: 70, 5: 62}[e] + (b == 49) * 4 - max(0, b - 50) * 2)
        for bar in (45, 49):
            s['Frame Drum'].add(bar, 0, 61, 1, 72)
        s['Timpani'].add(49, 0, 'Eb2', 3, 78, hv=3)
    else:
        hn = s['Horns Marcato']
        hn.mel('motif_r', ref_arch('motif_r', 84, 88, 82))
        hn.curve(1, [(45, 0, 104), (46, 0, 104), (47, 0, 103), (48, 0, 102), (48, 5.25, 96)],
                 bumps=supports('motif_r', 2))
        ens = s['Violins Sus']
        ens.mel('motif_r', ref_arch('motif_r', 84, 90, 84))
        ens.mel('climax', [100, 90, 88, 88, 86, 86, 84, 84, 86, 84, 82, 80], hv=2)
        ens.curve(11, [(45, 0, 104), (48, 3, 110), (49, 0, 122), (50, 0, 112), (51, 0, 104), (52, 0, 98),
                       (52, 5.25, 90)])
        vn = s['Violin Solo']
        vn.mel('climax', [96, 86, 84, 84, 82, 82, 80, 80, 82, 80, 78, 76], hv=2)
        vn.mel('cadence', [76, 74, 72, 70])
        vn.mel('coda', [70, 68, 66])
        vn.curve(1, [(49, 0, 110), (50, 0, 104), (51, 0, 98), (52, 0, 92), (53, 0, 90), (54, 3, 84),
                     (55, 0, 82), (56, 5.25, 75)])
        hs = s['Horns Sustain']
        hs.line(49, 0, [('G3', 3), ('Bb3', 3), ('G3', 3), ('A3', 3), ('F3', 3), ('F3', 3), ('G3', 3),
                        ('F#3', 3)], [80, 78, 76, 76, 74, 72, 72, 70])
        hs.curve(1, [(49, 0, 95), (50, 0, 92), (51, 0, 88), (52, 0, 86), (52, 5.25, 80)])
        giga(s['Cellos Spic'], 45, 56, lambda b: 88 - max(0, b - 52) * 3, lambda b: 76 - max(0, b - 52) * 3)
        offbeats(s['Violas Spic'], 45, 56, lambda b: 72 - max(0, b - 52) * 2)
        tuba_bassoon(s, 45, 56, lambda b: 76 + (b == 49) * 6 - max(0, b - 52) * 2, 0, bassoon=False,
                     tuba_range=(29, 43), walk=(51, 52, 53, 55))
        strums(s['Strumstick'], 45, 56, 'jig', lambda b: 72 - (b >= 53) * (b - 52) * 3)
        cajon(s['Cajon'], 45, 56, {0: 61, 2: 62, 3: 61, 5: 60},
              lambda b, e: {0: 92, 2: 70, 3: 86, 5: 76}[e] + (b == 49) * 4 - max(0, b - 52) * 4)
        for bar in range(45, 57):
            s['Bass Drum'].add(bar, 0, 62, 1, 82 + (bar == 49) * 6 - max(0, bar - 52) * 2)
            if bar <= 52:
                s['Bass Drum'].add(bar, 3, 62, 1, 72)
            s['Timpani'].add(bar, 0, near(H(bar).bass, 43, 38, 48), 2,
                             80 + (bar == 49) * 12 - max(0, bar - 52) * 2, hv=3 if bar == 49 else HUMAN_VEL)
        s['Cymbal'].add(45, 0, CYMBAL_HIT, 3, 72, hv=3)


def codetta(s, v):
    """Bars 57-60: Gm | Gm/F | Ebmaj7 | Am7b5 - D7. The signal returns and the dominant opens bar 1."""
    if v == 'explora':
        oc = s['Ocarina']
        oc.mel('signal_b', [44, 46, 43, 45, 41, 40, 38])
        oc.curve(11, [(57, 0, 86), (57, 3, 90), (58, 0, 80), (59, 0, 84), (59, 3, 88), (60, 0, 82),
                      (60, 5.25, 84)])
        c = s['Cellos Sus Quiet']
        c.line(57, 0, [('G2', 6), ('F2', 6), ('Eb2', 6), ('A2', 3), ('D2', 3)], [32, 30, 30, 30, 31])
        c.curve(11, [(57, 0, 80), (59, 0, 76), (60, 3, 74), (60, 5.25, 74)])
        s['Ocean Drum'].add(58, 0, 61, 18, 30, jitter=False, hv=2)
        s['Ocean Drum'].curve(11, [(58, 0, 60), (59, 3, 88), (60, 5.25, 92)])
        s['Hull Creak'].add(58, 0, 68, 3, 32, hv=3)
    else:
        vn = s['Violin Solo']
        vn.mel('signal_b', [64, 68, 64, 68, 64, 62, 64])
        vn.curve(1, [(57, 0, 80), (57, 3, 82), (58, 0, 78), (59, 0, 80), (59, 3, 84), (60, 0, 80),
                     (60, 5.25, 80)])
        giga(s['Cellos Spic'], 57, 60, 66, 56)
        hm = s['Harmonica Accented']
        for t, chord_ in voice_lead([(T(b, 3), H(b, 1)) for b in range(57, 61)], 55, 67, 3):
            hm.chord_at(bar_of(t), 3, chord_, 1, 46)
        cajon(s['Cajon'], 57, 60, {0: 61, 3: 61, 5: 60}, lambda b, e: {0: 64, 3: 60, 5: 54}[e] + (b == 60) * 2)
        cajon(s['Frame Drum'], 57, 60, {1: 65, 4: 65}, lambda b, e: 32 + (e == 4) * 2)
        s['Bass Drum'].add(57, 0, 62, 1, 62)


# ── performance: humanization, legato, seams ─────────────────────────────────
def mel_offset(ws: int, lo: int) -> int:
    """Timing of the reference melody: a function of the written tick only, so that every track and
    both versions put a melody note on exactly the same tick."""
    return random.Random(f'{SEED}:melody:{ws}').randint(lo, HUMAN_TICKS)


def perform(parts: dict[str, Part]):
    for part in parts.values():
        rng = random.Random(f'{SEED}:{part.name}')  # same seed per track name in both versions
        part.notes.sort(key=lambda n: (n.ws, n.offset, n.pitch))
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
            n.start = max(0, n.ws + n.offset + d)
            n.end = n.ws + n.dur + d
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
        by_start = {}
        for n in part.notes:
            by_start.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = [m for m in by_start.get(n.we, []) if n.voice is None or m.voice == n.voice]
            if n.tag == 'mel':
                nxt = [m for m in nxt if m.tag == 'mel']
            same = [m for m in nxt if m.pitch == n.pitch]
            if same:
                n.end = min(n.end, min(m.start for m in same) - SAME_PITCH_GAP)
            elif n.legato and nxt and not n.breath:
                n.end = min(m.start for m in nxt) + rng.randint(11, 32)    # 10-30 ms overlap
            if n.breath:
                n.end = n.ws + n.dur - BREATH
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
            n.vel = max(1, min(MAX_VEL, n.vel))
    # the harmonica thirds of B follow the piano, 10 below
    piano = {n.ws: n.vel for n in parts['Tavern Piano'].notes if n.tag == 'mel'}
    for name in ('Harmonica Vib', 'Harmonica Accented'):
        if name in parts:
            for n in parts[name].notes:
                if n.tag == 'thirds':
                    n.vel = piano[n.ws] - 10


def new_parts(version: str) -> dict[str, Part]:
    parts, ch = {}, 0
    for name in LAYOUT[version]:
        if name in UNPITCHED:
            channel = 9
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
            channel = min(channel, 15)
        parts[name] = Part(name, channel)
    for n in pizz_notes():
        parts['Basses Pizz'].notes.append(n)
    return parts


def build(version: str) -> dict[str, Part]:
    if version not in VERSIONS:
        raise ValueError(version)
    s = new_parts(version)
    for section in (intro, section_a, section_a2, section_b, section_c, bridge, return_section, codetta):
        section(s, version)
    for part in s.values():
        for num, pts in part.cc.items():
            if 0 not in pts:
                pts[0] = pts[min(pts)]
    perform(s)
    check_ranges(s)
    return s


def check_ranges(parts: dict[str, Part]):
    """Every note must exist in its .sfz: the script fails otherwise."""
    for name, part in parts.items():
        keys = sfz_keys(part.sfz_path)
        bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
        if bad:
            raise SystemExit(f'{name}: notes outside {part.patch}: {[name_of(p) for p in bad]}')


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
            tr.append(mido.MetaMessage('time_signature', numerator=6, denominator=8, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Gm', time=0))
        events = []
        for num, pts in part.cc.items():
            for t, val in sorted(pts.items()):
                events.append((t, 1, mido.Message('control_change', channel=part.channel, control=num,
                                                  value=val)))
        for n in part.notes:
            events.append((n.start, 2, mido.Message('note_on', channel=part.channel, note=n.pitch,
                                                    velocity=n.vel)))
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


# ── verification ─────────────────────────────────────────────────────────────
def sec(t: int) -> float:
    return t * SEC_PER_TICK


# Melody windows (tracks, first bar, last bar, lowest melody pitch): register-clash rule and climax.
MELODY = {
    'explora': [(('Ocarina',), 1, 4, 0), (('Tenor Recorder',), 5, 8, 0), (('Harmonica Vib',), 9, 12, 0),
                (('Violin Solo',), 13, 16, 0), (('Tenor Recorder',), 17, 20, 0), (('Tavern Piano',), 21, 28, 70),
                (('Bass Clarinet', 'Folk Harp'), 29, 36, 0), (('Tenor Recorder', 'Harmonica Vib'), 37, 40, 0),
                (('Tenor Recorder', 'Violin Solo'), 41, 52, 0), (('Tenor Recorder',), 53, 56, 0),
                (('Ocarina',), 57, 60, 0)],
    'combate': [(('Violin Solo',), 1, 4, 0), (('Horns Marcato',), 5, 8, 0), (('Violin Solo',), 9, 12, 0),
                (('Violin Solo', 'Violins Sus'), 13, 16, 0), (('Violins Sus',), 17, 20, 0),
                (('Violin Solo', 'Tavern Piano'), 21, 28, 70),
                (('Bass Clarinet', 'Bassoon Stac', 'Violins Pizz'), 29, 36, 0),
                (('Violins Marcato', 'Horns Marcato'), 37, 44, 0), (('Horns Marcato', 'Violins Sus'), 45, 48, 0),
                (('Violins Sus', 'Violin Solo'), 49, 52, 0), (('Violin Solo',), 53, 60, 0)],
}
THIRDS = {'explora': 'Harmonica Vib', 'combate': 'Harmonica Accented'}
# Registers of section 6 of the brief (track, first bar, last bar, lo, hi), per version.
REGISTERS = {
    'explora': [('Ocarina', 1, 60, 69, 81), ('Tenor Recorder', 1, 60, 63, 82), ('Harmonica Vib', 1, 60, 55, 75),
                ('Strumstick', 1, 60, 55, 67), ('Folk Harp', 17, 20, 43, 67), ('Folk Harp', 29, 36, 66, 72),
                ('Tavern Piano', 21, 28, 34, 79), ('Violin Solo', 1, 60, 66, 82), ('Bass Clarinet', 29, 36, 46, 60),
                ('Horn Sus', 45, 52, 53, 62), ('Violas Sus Quiet', 21, 28, 55, 65), ('Violas Trem', 41, 44, 55, 64),
                ('Cellos Sus', 13, 16, 58, 62), ('Cellos Sus', 37, 44, 39, 50), ('Cellos Sus', 45, 56, 36, 55),
                ('Cellos Sus Quiet', 1, 4, 38, 43), ('Cellos Sus Quiet', 9, 12, 43, 55),
                ('Cellos Sus Quiet', 29, 36, 39, 50), ('Cellos Sus Quiet', 57, 60, 38, 45),
                ('Basses Sus Quiet', 1, 4, 26, 31), ('Basses Pizz', 5, 57, 31, 43), ('Timpani', 49, 49, 39, 39),
                ('Timpani Roll', 43, 44, 38, 38), ('Cajon', 1, 60, 60, 62), ('Frame Drum', 45, 49, 61, 61),
                ('Hull Creak', 1, 60, 68, 68), ('Ocean Drum', 1, 60, 61, 61)],
    'combate': [('Violin Solo', 1, 60, 67, 82), ('Horns Marcato', 5, 8, 67, 76), ('Horns Marcato', 37, 40, 63, 75),
                ('Horns Marcato', 41, 44, 58, 67), ('Horns Marcato', 45, 48, 67, 76),
                ('Horns Sustain', 13, 16, 58, 62), ('Horns Sustain', 17, 20, 53, 57), ('Horns Sustain', 49, 52, 53, 62),
                ('Violins Marcato', 37, 44, 63, 79), ('Violins Sus', 13, 52, 67, 82), ('Violins Pizz', 29, 36, 66, 72),
                ('Harmonica Accented', 1, 60, 55, 75), ('Strumstick', 1, 60, 55, 67), ('Tavern Piano', 21, 28, 34, 79),
                ('Bass Clarinet', 29, 36, 46, 60), ('Bassoon Stac', 1, 28, 50, 58), ('Bassoon Stac', 29, 36, 46, 60),
                ('Tuba Stac', 1, 36, 31, 43), ('Tuba Stac', 37, 44, 27, 38), ('Tuba Stac', 45, 56, 27, 43),
                ('Violas Spic', 1, 60, 55, 64), ('Cellos Spic', 1, 60, 38, 55), ('Basses Trem', 29, 36, 27, 38),
                ('Basses Pizz', 5, 57, 31, 43), ('Timpani', 1, 60, 38, 48), ('Timpani Roll', 43, 44, 38, 38),
                ('Cajon', 1, 60, 60, 62), ('Frame Drum', 1, 60, 65, 65), ('Bass Drum', 1, 60, 62, 62),
                ('Hull Creak', 1, 60, 68, 68), ('Tom', 1, 60, 62, 62), ('Cymbal', 43, 45, 63, 66)],
}
CEILINGS = {'Violin Solo': 82, 'Violins Sus': 82, 'Violins Marcato': 82, 'Violins Pizz': 82,
            'Tenor Recorder': 82, 'Horns Marcato': 76, 'Horns Sustain': 76, 'Horn Sus': 76}
# Lines checked for parallel 5ths/8ves (sustained melodic lines, pads by voice, and the bass).
VOICES = {
    'explora': ['Ocarina', 'Tenor Recorder', 'Harmonica Vib', 'Violin Solo', 'Bass Clarinet', 'Horn Sus',
                'Tavern Piano', 'Violas Sus Quiet', 'Violas Trem', 'Cellos Sus', 'Cellos Sus Quiet',
                'Basses Sus Quiet', 'Basses Pizz'],
    'combate': ['Violin Solo', 'Horns Marcato', 'Horns Sustain', 'Violins Marcato', 'Violins Sus',
                'Harmonica Accented', 'Tavern Piano', 'Bass Clarinet', 'Basses Trem', 'Basses Pizz'],
}
# Declared doublings (unisons / octaves on purpose): (track a, track b, first bar, last bar).
DOUBLINGS = [
    ('Tenor Recorder', 'Harmonica Vib', 37, 40), ('Tenor Recorder', 'Violin Solo', 41, 52),
    ('Violin Solo', 'Violins Sus', 13, 16), ('Violin Solo', 'Violins Sus', 49, 52),
    ('Violin Solo', 'Tavern Piano', 21, 28), ('Violins Marcato', 'Horns Marcato', 37, 44),
    ('Horns Marcato', 'Violins Sus', 45, 48),
    ('Cellos Sus Quiet', 'Basses Sus Quiet', 1, 60), ('Cellos Sus Quiet', 'Basses Pizz', 1, 60),
    ('Cellos Sus', 'Basses Pizz', 37, 56), ('Basses Trem', 'Basses Pizz', 29, 36),
    # bridge: the head (root -> fifth) in sequence over the pizz (root -> fifth) on the same rising roots
    ('Basses Pizz', 'Tenor Recorder', 37, 44), ('Basses Pizz', 'Harmonica Vib', 37, 40),
    ('Basses Pizz', 'Violin Solo', 41, 44), ('Basses Pizz', 'Violins Marcato', 37, 44),
    ('Basses Pizz', 'Horns Marcato', 37, 44),
]


def _line_notes(part: Part, version: str):
    """Monophonic lines of a track for the voice-leading check: by voice tag, melody separately."""
    lines = {}
    for n in part.notes:
        if part.name in ('Folk Harp', 'Tavern Piano', 'Violins Pizz') and n.tag != 'mel':
            continue
        if part.name.startswith('Harmonica') and version == 'combate' and n.tag != 'thirds':
            continue
        key = 'mel' if n.tag in ('mel', 'thirds') else n.voice
        lines.setdefault((part.name, key), []).append(n)
    return lines


def parallels(parts: dict[str, Part], version: str) -> list[str]:
    """Consecutive perfect 5ths/8ves (same direction) between any two sustained lines."""
    lines = {}
    for name in VOICES[version]:
        if name in parts:
            lines.update(_line_notes(parts[name], version))
    found = []

    def at(notes, t):
        s_ = [n.pitch for n in notes if n.ws <= t < n.we]
        return max(s_) if s_ else None

    def doubled(a, b, bar):
        return any({a, b} == {x, y} and f <= bar <= l for x, y, f, l in DOUBLINGS)

    keys = sorted(lines, key=str)
    for i, ka in enumerate(keys):
        for kb in keys[i + 1:]:
            na, nb = lines[ka], lines[kb]
            times = sorted({n.ws for n in na} | {n.ws for n in nb})
            for t1, t2 in zip(times, times[1:]):
                if doubled(ka[0], kb[0], bar_of(t1)) and doubled(ka[0], kb[0], bar_of(t2)):
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
        if name in UNPITCHED:
            continue
        seen = {}
        for bar in range(1, BARS):
            sig = tuple(sorted((n.ws - T(bar), n.pitch, n.dur) for n in part.notes
                               if T(bar) <= n.ws < T(bar + 2)))
            if len(sig) >= 2:
                seen.setdefault(sig, []).append(bar)
        found += [f'{name} bars {bars}' for bars in seen.values() if len(bars) > 2]
    return found


def legato_joins(parts: dict[str, Part], version: str) -> list[float]:
    """Overlaps (ms) of every legato join between different pitches in the sustained lines."""
    out = []
    for name in VOICES[version]:
        if name not in parts or name == 'Basses Pizz':
            continue
        for (_, key), notes in _line_notes(parts[name], version).items():
            starts = {}
            for n in notes:
                starts.setdefault(n.ws, []).append(n)
            for n in notes:
                nxt = starts.get(n.we, [])
                if n.legato and not n.breath and nxt and all(m.pitch != n.pitch for m in nxt):
                    out.append((n.end - min(m.start for m in nxt)) * SEC_PER_TICK * 1000)
    return out


def cc_value(part: Part, num: int, t: int) -> int:
    pts = part.cc.get(num, {})
    val = None
    for g in sorted(pts):
        if g <= t:
            val = pts[g]
    return val if val is not None else 0


def level(part: Part, n: Note) -> int:
    return cc_value(part, 1, n.start) if part.sonatina else n.vel


def melody_notes(parts, version):
    out = []
    for names, first, last, lo in MELODY[version]:
        for name in names:
            out += [(name, n) for n in parts[name].notes
                    if T(first) <= n.ws < T(last + 1) and n.pitch >= lo and n.tag in ('mel', '')]
    return out


def sounding(parts, t0, t1):
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
        print(f"{'track':<19} {'patch':<62} {'notes':>5}  {'range used':<16} {'sfz':<7}")
        for name, part in parts.items():
            keys = sfz_keys(part.sfz_path)
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'{name:<19} {part.patch[-62:]:<62} {len(part.notes):>5}  '
                  f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})'.ljust(108) + f' {min(keys)}-{max(keys)}')
        tag = version[:1].upper()
        # 1. length
        last_end = max(n.end for p in parts.values() for n in p.notes)
        check(f'{tag} 1  60 bars 6/8, everything ends before 80.000 s', sec(last_end) < 80.0,
              f'last note-off {sec(last_end):.3f} s, loop {sec(LOOP_END):.4f} s')
        # 2. registers
        bad = []
        for name, b0, b1, lo, hi in REGISTERS[version]:
            for n in parts[name].notes:
                if b0 <= bar_of(n.ws) <= b1 and not lo <= n.pitch <= hi:
                    bad.append(f'{name} b{bar_of(n.ws)} {name_of(n.pitch)}')
        for name, part in parts.items():
            for n in part.notes:
                if not any(r[0] == name and r[1] <= bar_of(n.ws) <= r[2] for r in REGISTERS[version]):
                    bad.append(f'{name} b{bar_of(n.ws)} has no register entry')
                    break
                if n.pitch > CEILINGS.get(name, 127):
                    bad.append(f'{name} above ceiling {name_of(n.pitch)}')
        check(f'{tag} 2  section-6 registers and ceilings', not bad, '; '.join(bad[:4]))
        # 3. reference melody exact (written pitches and ticks)
        for key, (bar, _) in REF.items():
            want = [(t, p) for t, p, _ in ref_events(key)]
            holders = [name for names, f, l, lo in MELODY[version] for name in names
                       if f <= bar <= l and name in parts]
            ok = any([(n.ws, n.pitch) for n in parts[h].notes if n.tag == 'mel' and want[0][0] <= n.ws <= want[-1][0]
                      and n.pitch >= (70 if h == 'Tavern Piano' else 0)] == want for h in holders)
            check(f'{tag} 3  reference melody {key} (bar {bar})', ok, ','.join(holders))
        # 5. figures
        short = [f'{p.name} b{bar_of(n.ws)}' for p in parts.values() for n in p.notes
                 if n.dur < EIGHTH and not (p.name == 'Tom' and bar_of(n.ws) in (12, 20, 44))]
        check(f'{tag} 5  no written figure shorter than an eighth (tom fills apart)', not short, ', '.join(short[:4]))
        # 6. layers
        for label, first, last, le, lc in SECTIONS:
            limit = le if version == 'explora' else lc
            worst, where = sounding(parts, T(first), T(last + 1))
            check(f'{tag} 6  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit,
                  f'max {worst} at bar {bar_of(where)}')
        # 7. register clashes
        clashes = []
        mels = melody_notes(parts, version)
        for names, first, last, lo in MELODY[version]:
            mel = [(nm, n) for nm, n in mels if nm in names and T(first) <= n.ws < T(last + 1)]
            for name, part in parts.items():
                if name in names or name in UNPITCHED or (name == THIRDS[version] and 21 <= first and last <= 28):
                    continue
                for o in part.notes:
                    if o.end - o.start < 2 * EIGHTH - 40:
                        continue
                    near_ = [(nm, m) for nm, m in mel if abs(m.pitch - o.pitch) <= 11
                             and min(m.end, o.end) - max(m.start, o.start) > 40]
                    if near_ and level(part, o) >= max(level(parts[nm], m) for nm, m in near_):
                        clashes.append(f'{name} {name_of(o.pitch)} {level(part, o)} b{bar_of(o.ws)}')
        check(f'{tag} 7  no register clash with the melody', not clashes, '; '.join(clashes[:4]))
        # 8. velocities, CC1, climax
        top_v = max(n.vel for p in parts.values() for n in p.notes)
        top_cc = max((v for p in parts.values() for v in p.cc.get(1, {}).values()), default=0)
        piano = max(n.vel for n in parts['Tavern Piano'].notes)
        harm = max(n.vel for nm in ('Harmonica Vib', 'Harmonica Accented') if nm in parts for n in parts[nm].notes)
        check(f'{tag} 8  velocity <= 105, CC1 <= 112, piano <= 90, harmonica <= mp',
              top_v <= MAX_VEL and top_cc <= MAX_CC1 and piano <= 90 and harm <= 70,
              f'vel {top_v}, CC1 {top_cc}, piano {piano}, harmonica {harm}')
        mv = max(n.vel for _, n in mels)
        bars_v = sorted({bar_of(n.ws) for _, n in mels if n.vel == mv})
        son = [(nm, n) for nm, n in mels if parts[nm].sonatina]
        mc = max(cc_value(parts[nm], 1, n.start) for nm, n in son)
        bars_c = sorted({bar_of(n.ws) for nm, n in son if cc_value(parts[nm], 1, n.start) == mc})
        check(f'{tag} 8  bar 49 holds the melody\'s top velocity and CC1', bars_v == [49] and bars_c == [49],
              f'vel {mv} in {bars_v}, CC1 {mc} in {bars_c}')
        # 9. Sonatina
        bad = []
        for name, limit in SONATINA_MAX_S.items():
            if name not in parts:
                continue
            if 0 not in parts[name].cc.get(1, {}):
                bad.append(f'{name} no CC1 at tick 0')
            if limit:
                longest = max(sec(n.end - n.start) for n in parts[name].notes)
                if longest > limit:
                    bad.append(f'{name} {longest:.2f} s')
        check(f'{tag} 9  Sonatina: CC1 at tick 0 and maximum note lengths', not bad, '; '.join(bad))
        # 10. percussion
        creaks = sum(n.pitch == 68 for nm in ('Hull Creak', 'Bass Drum') if nm in parts for n in parts[nm].notes)
        frame = {n.pitch for n in parts['Frame Drum'].notes}
        cym_ok = True
        if 'Cymbal' in parts:
            for n in parts['Cymbal'].notes:
                audible = n.start + (int(CYMBAL_AUDIBLE_S / SEC_PER_TICK) if n.pitch == CYMBAL_SWELL else 0)
                cym_ok &= T(44) <= audible < T(46)
        check(f'{tag} 10 percussion (frame 61/62/65, creak <= 5, cymbal only 44-45)',
              frame <= {61, 62, 65} and creaks <= 5 and cym_ok, f'creaks {creaks}, frame {sorted(frame)}')
        # 11. cola ostinato
        cola = parts['Folk Harp' if version == 'explora' else 'Violins Pizz']
        a_ok = all([n.pitch for n in cola.notes if bar_of(n.ws) == b and n.pitch in (68, 69)] ==
                   ([69] if b in (29, 31, 32, 36) else [68]) for b in range(29, 37))
        check(f'{tag} 11 cola ostinato: A natural in 29/31/32/36, A flat in 30/33/34/35', a_ok)
        # craft
        cc_ok = all(b - a >= CC_STEP for p in parts.values() for pts in p.cc.values()
                    for a, b in zip(sorted(pts), sorted(pts)[1:]))
        check(f'{tag}    controller points at most every 1/8 bar', cc_ok)
        par = parallels(parts, version)
        check(f'{tag}    no parallel 5ths/8ves between sustained lines', not par, '; '.join(par[:4]))
        rep = repetitions(parts)
        check(f'{tag}    no 2-bar cell repeated identical more than twice', not rep, '; '.join(rep[:3]))
        joins = legato_joins(parts, version)
        check(f'{tag}    legato overlaps 10-30 ms', joins and all(10 <= j <= 30.5 for j in joins),
              f'{len(joins)} joins, {min(joins):.1f}-{max(joins):.1f} ms')
        long_ = []
        for name in ('Tenor Recorder', 'Harmonica Vib', 'Ocarina', 'Cellos Sus Quiet', 'Basses Trem'):
            if name in parts:
                longest = max(sec(n.end - n.start) for n in parts[name].notes)
                if longest > 4.2:
                    long_.append(f'{name} {longest:.1f} s')
        check(f'{tag}    held notes shorter than their (unlooped) samples', not long_, '; '.join(long_))

    a, b = (all_parts[v]['Basses Pizz'].notes for v in VERSIONS)
    check('   4  Basses Pizz identical in both versions',
          [(n.pitch, n.start, n.end, n.vel) for n in a] == [(n.pitch, n.start, n.end, n.vel) for n in b],
          f'{len(a)} notes')
    print(f"\n{'check':<70} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<70} {status:<4} {detail}')
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
