"""«El pacto» — the Dark Temple boss (Act II): score generator (brief: docs/musica/acto2-malachar-abaddon.md).

Two tracks that are the same song, written from a single description of form, harmony, melody and
rhythmic skeleton:
    build/acto2-malachar.mid   «El rito del Heraldo»  (game id cap2-e1-jefe): the ritual, the choirs lead
    build/acto2-abaddon.mid    «La carne abierta»     (game id cap2-e1-jefe-fase2): the same rite torn open
Both: 56 bars of 4/4 at 160 bpm (84.000 s), C# phrygian (the climax in D), one MIDI track per
instrument and articulation. The game crosses from one to the other at the same point of the loop,
so the common layers (`Bass Drum`, `Frame Drum`, `Timpani`, `Organ Pedal`) and the voices (`Choir
Low`, `Choir High`, `Chant`) come from the same functions with the same per-track seed: identical
note for note (the voices only change their CC1).

Prints a verification table and exits with status 1 if a check fails; a note outside its
instrument's range aborts the build. The full acceptance suite is test_compose.py.

Deliberate deviations from the brief (all small, to keep its own criteria):
- Bass (Organ Pedal, timpani, low tremolo): the melody of section 5 over the bracket of section 4
  makes parallel 5ths/8ves with the bass in four places; inversions fix them without touching the
  chords: bar 7 beat 3 D/F# (G#3-A3 over C#-D), bar 18 Dmaj7(#11)/F# (G#5-A5 over C#-D), bar 39
  Eb/G (the Neapolitan sixth: A3-Bb3 over D-Eb) and A7/C# on beat 4 of bars 39 and 43 (the tune's
  A3-D3 over A2-D2 into bars 40 and 44). The bass now walks D-G-C#-D (i - N6 - V6 - i).
- CC1 of the voices in the bridge: Choir Low 92 -> 104 (M) / 100 -> 106 (A), Choir High 92 -> 102 /
  100 -> 104, so the climax does not open with a drop and bar 43 stays the only peak of Choir Low
  (criterion 11). The climax then grows 104 -> 110 (M) / 106 -> 112 (A).
- A' salmodia CC1: Choir Low 89 -> 99 -> 91 (M) and 93 -> 99 -> 95 (A), always 7 below the high
  voices (criterion 8 asks for at least 6; section 6 of Abaddon wrote 100 -> 108).
- Bar 36 (Eb7, the whole-note chord of both choirs): no knives / col legno. The only diads the
  brief allows (E4 F4, C#5 D5) fall in the octave of the high voices' G4 Bb4 Db5; the tom roll
  (A) and the darbuka (M) carry the bar.
- Col legno in E minor (bar 35): D#3 + E3 (51 52); F3 would leave the 49-52 register.
- Horns Low in bar 25 hold the G#3 for the whole bar (the cell climbs to 59-64, above their 48-58);
  in bar 36 they double only the 49 and 55 of the Eb7 (46 is below their register).
- Section B in Abaddon: the cello ostinato goes in eighths without accents (half pulse), the b2 on
  the last eighth of each half bar (sixteenths 6 and 14).
- Ostinato, chant, demon hits and cello clusters sit on the tonal fundamental of each bar (C#,
  the bridge C# D Eb E, the climax D), as in the sketch; in B 25-28 on the G# pedal. Demon Low stays
  on C#2 in B (37-40 register).
- Chant: the reciting tone takes its bII (the chord of the half bar) on the last syllables of bars
  8, 12, 30, 32, 34, 40, 44 and 48, and anticipates the D of the climax at the end of bar 36.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-malachar-abaddon/compose.py
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
BEAT = TPB
E8 = BEAT // 2
S16 = BEAT // 4
BAR = 4 * BEAT
BARS = 56
LOOP_END = BARS * BAR
BPM = 160
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = E8                                         # at most one controller point per eighth (1/8 bar)
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # +-8 ms
HUMAN_VEL = 6
SEED = 'acto2-pacto'
GUARD = 12                                           # ticks a phrase-final note stops before its end
OVERLAP = (14, 37)                                   # legato overlap in ticks: 10.9-28.9 ms
VERSIONS = ('malachar', 'abaddon')
OUT = {v: os.path.join(HERE, 'build', f'acto2-{v}.mid') for v in VERSIONS}
CEIL = {'malachar': {'vel': 100, 'cc': 110, 'high': 106}, 'abaddon': {'vel': 105, 'cc': 112, 'high': 108}}
COMMON_VEL_MAX = 105
SHARED_VEL_MAX = 100

SECTIONS = [('Intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 28), ('Bridge', 29, 36),
            ('Climax', 37, 48), ('Codetta', 49, 56)]
LAYER_LIMITS = {'malachar': [12, 14, 14, 12, 14, 15, 12], 'abaddon': [12, 15, 15, 11, 15, 16, 12]}
ACCENTS = (0, 3, 6, 8, 11, 14)                       # 3+3+2 twice on the sixteenth grid
KNIFE_POS = (2, 5, 9, 11, 13)
DEMON_POS = (0, 6, 12)                               # eighths 0, 3, 6


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


def t16(bar: int, pos: int) -> int:
    return (bar - 1) * BAR + pos * S16


NO_EARLY = {0} | {tick(first) for _, first, _ in SECTIONS}   # section downbeats never anticipate

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
    return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'][p % 12] + str(p // 12 - 1)


# ── instruments: one track per instrument and articulation ───────────────────
def sso(n):
    return ('sso', 'Sonatina Symphonic Orchestra/' + n + '.sfz')


def vsco(n):
    return ('VSCO-2-CE', n + '.sfz')


def vcsl(n):
    return ('VCSL', n + '.sfz')


LARGE = sso('Chorus - Performance/Large Chorus')
MEM = 'Membranophones/Struck Membranophones/'
IDIO = 'Idiophones/Struck Idiophones/'
# (track name, library path, controller that shapes it: 1 = Sonatina CC1, 11 = CC11, None)
COMMON_LAYOUT = [
    ('Choir Low', LARGE, 1), ('Choir High', sso('Chorus - Performance/Mixed Chorus'), 1), ('Chant', LARGE, 1),
    ('Bass Drum', vcsl(MEM + 'Bass Drum 2'), None), ('Frame Drum', vcsl(MEM + 'Frame Drum'), None),
    ('Timpani', vsco('Timpani'), None), ('Organ Pedal', sso('Organ/Pedal - Bourdon 16ft'), 11),
]
LAYOUT = {
    'malachar': COMMON_LAYOUT + [
        ('Choir High 2', LARGE, 1),
        ('Organ 8', sso('Organ/Great - Open Diapason 8ft'), 11),
        ('Organ 16', sso('Organ/Great - Bourdon 16ft'), 11),
        ('Didgeridoo', vcsl('Aerophones/Lip Aerophones/Didgeridoo'), 11),
        ('Contrabassoon', sso('Woodwinds - Performance/Contrabassoon Solo Sustain (looped)'), 1),
        ('Low Trem', sso('Strings - Performance/Basses Tremolo'), 1),
        ('Darbuka', vcsl(MEM + 'Darbuka'), None),
        ('Col Legno Vc', sso('Strings - Performance/Celli Col Legno'), None),
        ('Pact Bells', vcsl(IDIO + 'Tubular Bells 1'), None),
        ('Hand Bell', vcsl(IDIO + 'Hand Bells, Nepalese'), None),
        ('Finger Cymbals', vcsl(IDIO + 'Finger Cymbals'), None),
        ('Gong', vcsl(IDIO + 'Gong 1'), None),
    ],
    'abaddon': COMMON_LAYOUT + [
        ('Horns Low', sso('Brass - Performance/Horns Sustain'), 1),
        ('Choir Shout', LARGE, 1),
        ('Demon', sso('Brass - Performance/Trombones Marcato'), 1),
        ('Demon Low', sso('Brass - Performance/Tuba Marcato'), 1),
        ('Celli Trem', sso('Strings - Performance/Celli Tremolo'), 1),
        ('Violas Trem', sso('Strings - Performance/Violas Tremolo'), 1),
        ('Cellos Spic', vsco('CelloEnsSpic'), None),
        ('Knives', vsco('ViolinEnsSpic'), None),
        ('Tom', vcsl(MEM + 'Tom 2'), None),
        ('Gong Full', vcsl(IDIO + 'Gong 2'), None),
        ('Cymbal', vcsl(IDIO + 'Suspended Cymbal 2'), None),
    ],
}
SFZ_OF = {v: {name: library(*lib) for name, lib, _ in LAYOUT[v]} for v in VERSIONS}
COMMON = ('Bass Drum', 'Frame Drum', 'Timpani', 'Organ Pedal')
SHARED = ('Choir Low', 'Choir High', 'Chant')
STRUCK = {'Bass Drum', 'Frame Drum', 'Darbuka', 'Tom', 'Gong', 'Gong Full', 'Cymbal', 'Finger Cymbals',
          'Hand Bell', 'Pact Bells'}
MAX_NOTE_S = {'Horns Low': 2.8, 'Demon': 0.3, 'Demon Low': 0.3, 'Knives': 0.08}
# Keys checked in the .sfz files (brief section 6)
BD_HIT = 62
FD_BIG, FD_SMALL = 61, 64                            # never 60 or 63
DOUM = 60
TOM, TOM_HIGH = 62, 64
GONG_DARK, GONG_FULL = 61, 60                        # Gong 1
GONG2_HIT = 61                                       # Gong 2
BELLS = (61, 62)                                     # C#4 + D4: the pact's semitone
HAND_BELL = 62
FINGER = 60
CYMBAL_DOME = 67
DIDG_SUS2, DIDG_SUS3, DIDG_GROWL = 68, 69, 61       # every sample sounds C#2


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
    vmax: int | None = None
    tag: str = ''
    start: int = 0     # performed values (after humanization)
    end: int = 0

    @property
    def we(self) -> int:
        return self.ws + self.dur


@dataclass
class Part:
    name: str
    lib: tuple
    ctrl: int | None
    channel: int
    notes: list[Note] = field(default_factory=list)
    points: list[tuple[int, int]] = field(default_factory=list)
    cc: dict[int, int] = field(default_factory=dict)

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), vel, **kw)
        self.notes.append(n)
        return n

    def hit(self, bar, pos, pitch, vel, length=S16, **kw) -> Note:
        n = Note(P(pitch), t16(bar, pos), length, vel, **kw)
        self.notes.append(n)
        return n

    def curve(self, points):
        """Controller breakpoints [(bar, beat, value)]; one continuous curve per track, cosine
        interpolated and sampled on the eighth grid."""
        self.points += [(tick(b, bt), v) for b, bt, v in points]

    def build_cc(self):
        if not self.ctrl or not self.points:
            return
        pts = sorted(self.points, key=lambda p: p[0])

        def value_at(t):
            if t <= pts[0][0]:
                return pts[0][1]
            for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
                if t0 <= t < t1:
                    x = (t - t0) / (t1 - t0)
                    return v0 + (v1 - v0) * (1 - math.cos(math.pi * x)) / 2
            return pts[-1][1]
        last = None
        for g in range(0, LOOP_END, CC_STEP):
            v = int(round(value_at(g)))
            if v != last:
                self.cc[g] = v
                last = v


def new_parts(version: str) -> dict[str, Part]:
    parts, ch = {}, 0
    for name, lib, ctrl in LAYOUT[version]:
        if ctrl is None:
            channel = 15
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, lib, ctrl, channel)
    return parts


# ── harmony (section 4, common to both tracks) ───────────────────────────────
CHORDS = {
    'C#5': (1, (0, 7)), 'C#m': (1, (0, 3, 7)), 'A': (9, (0, 4, 7)), 'D': (2, (0, 4, 7)),
    'A7': (9, (0, 4, 7, 10)), 'G#7b13': (8, (0, 4, 10, 8)), 'G#7': (8, (0, 4, 7, 10)),
    'Emaj7': (4, (0, 4, 7, 11)), 'G#7b9': (8, (0, 4, 7, 10, 1)), 'F#m': (6, (0, 3, 7)),
    'Dmaj7#11': (2, (0, 4, 7, 11, 6)), 'C#madd9': (1, (0, 3, 7, 2)), 'G#m': (8, (0, 3, 7)),
    'Aadd9': (9, (0, 4, 7, 2)), 'G#7sus4': (8, (0, 5, 7, 10)), 'Dm': (2, (0, 3, 7)), 'Eb': (3, (0, 4, 7)),
    'Ebm': (3, (0, 3, 7)), 'Fb': (4, (0, 4, 7)), 'Em': (4, (0, 3, 7)), 'Eb7': (3, (0, 4, 7, 10)),
    'Bb7': (10, (0, 4, 7, 10)), 'A7b13': (9, (0, 4, 10, 8)), 'F': (5, (0, 4, 7)), 'A7b9': (9, (0, 4, 7, 10, 1)),
    'Bbmaj7': (10, (0, 4, 7, 11)), 'Gm': (7, (0, 3, 7)), 'Ebmaj7#11': (3, (0, 4, 7, 11, 6)),
    'Amaj7': (9, (0, 4, 7, 11)), 'F#m6': (6, (0, 3, 7, 9)),
}
# bar: 'chord[:bass] | beat chord[:bass] ...'
HARMONY_SRC = {
    1: 'C#5', 2: 'C#m', 3: 'A:C#', 4: 'D:C#',
    5: 'C#m | 3 A7', 6: 'G#7b13 | 3 G#7', 7: 'C#m | 3 D:F# | 4 G#7', 8: 'C#m | 3 D:C#',
    9: 'C#m | 3 A7', 10: 'Emaj7:G# | 3 G#7b9', 11: 'A | 3 F#m | 4 G#7', 12: 'C#m | 3 D:C#',
    13: 'C#m', 14: 'A7', 15: 'G#7b13', 16: 'G#7', 17: 'C#m', 18: 'Dmaj7#11:F#', 19: 'C#madd9', 20: 'D:C#',
    21: 'C#m', 22: 'D:C#', 23: 'C#m', 24: 'D:C#', 25: 'G#m', 26: 'Aadd9:G#', 27: 'G#7sus4', 28: 'G#7b9',
    29: 'C#m', 30: 'C#m | 3 D:C#', 31: 'Dm', 32: 'Dm | 3 Eb:D', 33: 'Ebm', 34: 'Ebm | 3 Fb:Eb', 35: 'Em',
    36: 'Eb7',
    37: 'Dm | 3 Bb7', 38: 'A7b13 | 3 A7', 39: 'Dm | 3 Eb:G | 4 A7:C#', 40: 'Dm | 3 Eb:D', 41: 'Dm | 3 Bb7',
    42: 'F:A | 3 A7b9', 43: 'Bbmaj7 | 3 Gm | 4 A7:C#', 44: 'Dm | 3 Ebmaj7#11:D', 45: 'Gm:Bb | 3 A7',
    46: 'G#7b13 | 3 G#7', 47: 'C#m | 3 Amaj7', 48: 'C#m | 3 D:C#',
    49: 'C#m', 50: 'A7:C#', 51: 'F#m6:C#', 52: 'G#7b9', 53: 'C#5', 54: 'C#m', 55: 'A:C#', 56: 'D:C#',
}
PCS = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'B': 11}


def _parse_harmony():
    out = {}
    for bar, src in HARMONY_SRC.items():
        segs = []
        for i, chunk in enumerate(src.split('|')):
            words = chunk.split()
            beat = 1.0 if i == 0 else float(words.pop(0))
            sym, _, bass = words[0].partition(':')
            segs.append((beat, sym, PCS[bass] if bass else CHORDS[sym][0]))
        out[bar] = segs
    return out


HARMONY = _parse_harmony()


def chord_at(bar: int, beat: float) -> str:
    sym = HARMONY[bar][0][1]
    for b, s, _ in HARMONY[bar]:
        if b <= beat + 1e-9:
            sym = s
    return sym


def chord_pcs(sym: str) -> set[int]:
    root, ivs = CHORDS[sym]
    return {(root + i) % 12 for i in ivs}


# Tonal fundamental of each bar (pitch class): the drone of ostinato, chant, demon and clusters.
FUND = {**{b: 1 for b in range(1, 31)}, 31: 2, 32: 2, 33: 3, 34: 3, 35: 4, 36: 3,
        **{b: 2 for b in range(37, 46)}, **{b: 1 for b in range(46, 57)}}


def shift_of(bar: int) -> int:
    return FUND[bar] - 1                             # 0 = C#, 1 = D, 2 = Eb, 3 = E


# Bass of section 4 (Organ Pedal, 16': sounds an octave lower): bar -> [(beat, pitch)]
PEDAL = {
    1: [(1, 'C#2')], 5: [(1, 'C#2'), (3, 'A2')], 6: [(1, 'G#2')], 7: [(1, 'C#2'), (3, 'F#2'), (4, 'G#2')],
    8: [(1, 'C#2'), (3, 'C#2')], 9: [(1, 'C#2'), (3, 'A2')], 10: [(1, 'G#2'), (3, 'G#2')],
    11: [(1, 'A2'), (3, 'F#2'), (4, 'G#2')], 12: [(1, 'C#2'), (3, 'C#2')],
    13: [(1, 'C#2')], 14: [(1, 'A2')], 15: [(1, 'G#2')], 16: [(1, 'G#2')], 17: [(1, 'C#2')], 18: [(1, 'F#2')],
    19: [(1, 'C#2')], 20: [(1, 'C#2')],
    **{b: [(1, 'C#2')] for b in range(21, 25)}, **{b: [(1, 'G#2')] for b in range(25, 29)},
    29: [(1, 'C#2')], 30: [(1, 'C#2')], 31: [(1, 'D2')], 32: [(1, 'D2')], 33: [(1, 'Eb2')], 34: [(1, 'Eb2')],
    35: [(1, 'E2')], 36: [(1, 'Eb2')],
    37: [(1, 'D2'), (3, 'Bb2')], 38: [(1, 'A2')], 39: [(1, 'D2'), (3, 'G2'), (4, 'C#2')], 40: [(1, 'D2'), (3, 'D2')],
    41: [(1, 'D2'), (3, 'Bb2')], 42: [(1, 'A2'), (3, 'A2')], 43: [(1, 'Bb2'), (3, 'G2'), (4, 'C#2')],
    44: [(1, 'D2'), (3, 'D2')], 45: [(1, 'Bb2'), (3, 'A2')], 46: [(1, 'G#2')], 47: [(1, 'C#2'), (3, 'A2')],
    48: [(1, 'C#2'), (3, 'C#2')],
    49: [(1, 'C#2')], 50: [(1, 'C#2')], 51: [(1, 'C#2')], 52: [(1, 'G#2')], 53: [(1, 'C#2')],
}


def pedal_line() -> list[tuple[int, int, int]]:
    """[(written start, written end, pitch)] of the Organ Pedal: each attack lasts until the next one
    (the intro and its return hold until bar 5 / the end of the loop)."""
    attacks = sorted((tick(b, bt), P(p)) for b, items in PEDAL.items() for bt, p in items)
    out = []
    for (t, p), nxt in zip(attacks, attacks[1:] + [(LOOP_END, None)]):
        out.append((t, nxt[0], p))
    return out


PEDAL_LINE = pedal_line()


def pedal_at(t: int) -> int:
    return next(p for a, b, p in PEDAL_LINE if a <= t < b)


# ── reference melody (section 5): identical pitches and attacks in both tracks ──
HEAD = (.5, .5, 1, 1.5, .5)                          # e e q q. e
TAIL = (1, 1, 2)                                     # q q h
CELL = (.5, .5, 1, 1, 1)                             # e e q q q


def rh(pitches, rhythm):
    return list(zip(pitches, rhythm))


def motif_d(shift):
    """«Sombra» in D (the pact fulfilled): four bars, the last whole note held h. (breath on beat 4)."""
    s = shift
    return (rh([50 + s, 52 + s, 53 + s, 56 + s, 57 + s], HEAD) + rh([53 + s, 52 + s, 49 + s], TAIL)
            + rh([50 + s, 53 + s, 57 + s, 58 + s, 57 + s], CELL) + [(50 + s, 3), (None, 1)])


def salmodia(p):
    return [(p, 1.5), (p, 1.5), (p, 1)]                # 3+3+2 on one reciting tone


# (track, first bar, [(pitch | (chord) | None, beats)], base velocity, legato)
MELODY = [
    ('Choir Low', 3, salmodia(49), 78, False),
    ('Choir High', 4, [(74, 3)], 84, True),
    ('Choir Low', 5, rh([49, 51, 52, 55, 56], HEAD), 84, True),
    ('Choir High', 6, rh([76, 75, 72], TAIL), 86, True),
    ('Choir Low', 7, rh([49, 52, 56, 57, 56], CELL), 86, True),
    ('Choir High', 8, [(73, 3)], 84, True),
    ('Choir High', 9, rh([73, 75, 76, 79, 80], HEAD), 88, True),
    ('Choir Low', 10, rh([52, 51, 48], TAIL), 86, True),
    ('Choir High', 11, rh([73, 76, 80, 81, 80], CELL), 90, True),
    ('Choir Low', 12, [(49, 3)], 84, True),
    ('Choir High', 13, rh([73, 75, 76, 79, 80, 76, 75, 72, 73, 76, 80, 81, 80, 73],
                          (1, 1, 2, 3, 1, 2, 2, 4, 1, 1, 2, 2, 2, 8)), 86, True),
    *[('Choir Low', b, salmodia(55 if b == 14 else 56), v, False)
      for b, v in zip(range(13, 21), (72, 73, 74, 75, 76, 78, 75, 73))],
    ('Choir Low', 21, rh([49, 52, 56, 57, 56], CELL), 72, True),
    ('Choir High', 22, [(74, 2), (73, 2)], 72, True),
    ('Choir Low', 23, rh([49, 52, 56, 57, 56], CELL), 74, True),
    ('Choir High', 24, [(76, 2), (74, 2)], 74, True),
    ('Choir Low', 25, rh([56, 59, 63, 64, 63], CELL), 76, True),
    ('Choir High', 26, [(81, 2), (80, 2)], 76, True),
    ('Choir Low', 27, [(56, 4)], 74, True),
    ('Choir High', 28, [(72, 2), (75, 2)], 76, True),
    ('Choir Low', 29, rh([49, 51, 52, 55], HEAD[:4]) + [(None, .5)], 78, True),
    ('Choir High', 30, rh([73, 75, 76, 79], HEAD[:4]) + [(None, .5)], 80, True),
    ('Choir Low', 31, rh([50, 52, 53, 56], HEAD[:4]) + [(None, .5)], 82, True),
    ('Choir High', 32, rh([74, 76, 77, 80], HEAD[:4]) + [(None, .5)], 84, True),
    ('Choir Low', 33, rh([51, 53, 54, 57], HEAD[:4]) + [(None, .5)], 86, True),
    ('Choir High', 34, rh([75, 77, 78, 81], HEAD[:4]) + [(None, .5)], 88, True),
    ('Choir Low', 35, rh([52, 54, 55, 58], (1, 1, 1, 1)) + [((46, 49, 55), 4)], 90, True),
    ('Choir High', 35, rh([76, 78, 79, 82], (1, 1, 1, 1)) + [((67, 70, 73), 4)], 90, True),
    ('Choir Low', 37, motif_d(0), 88, True),
    ('Choir High', 37, motif_d(24), 90, True),
    ('Choir Low', 41, motif_d(0), 90, True),
    ('Choir High', 41, motif_d(24), 92, True),
    ('Choir High', 45, rh([77, 76, 73], TAIL) + rh([76, 75, 72], TAIL), 86, True),
    ('Choir Low', 47, rh([49, 52, 56, 57, 56], CELL), 82, True),
    ('Choir High', 48, [(73, 3)], 80, True),
    ('Choir Low', 49, rh([49, 51, 52, 55, 56], (1, 1, 2, 3, 1)), 78, True),
    ('Choir High', 51, [(76, 2), (75, 2), (72, 4)], 76, True),
    ('Choir Low', 55, salmodia(49), 78, False),
    ('Choir High', 56, [(74, 3)], 84, True),
]


def contour(items, base, spread=5, end_drop=4) -> list[int]:
    """Velocities that draw the phrase: higher notes a little louder, metric weight (beat 1 > 3 >
    2/4 > off-beats) and a softer last note."""
    pitches = [max(p) if isinstance(p, tuple) else p for p, _ in items if p is not None]
    lo, hi = min(pitches), max(pitches)
    out, pos = [], 0.0
    for p, beats in items:
        if p is not None:
            top = max(p) if isinstance(p, tuple) else p
            x = (top - lo) / (hi - lo) if hi > lo else 0.5
            b = pos % 4
            metric = 4 if b == 0 else 2 if b == 2 else -2 if b % 1 else 0
            out.append(base + int(round(spread * (x - 0.5) * 2)) + metric)
        pos += beats
    out[-1] -= end_drop
    return out


def voices(s):
    """Choir Low and Choir High: the same notes in both tracks (section 5)."""
    for track, bar, items, base, legato in MELODY:
        part = s[track]
        vels = iter(contour(items, base))
        t = tick(bar)
        sounding = [(i, p) for i, (p, _) in enumerate(items) if p is not None]
        last = sounding[-1][0]
        for i, (p, beats) in enumerate(items):
            length = int(round(beats * BEAT))
            if p is not None:
                v = next(vels)
                nxt = items[i + 1][0] if i + 1 < len(items) else None
                for q in (p if isinstance(p, tuple) else (p,)):
                    part.notes.append(Note(q, t, length, v, legato=legato and i != last and nxt is not None,
                                           vmax=SHARED_VEL_MAX, tag='mel'))
            t += length


# Chant syllables on the 3+3+2 accents: 0.7 / 0.7 / 0.45 beats (twice)
CHANT_LEN = {0: .7, 3: .7, 6: .45, 8: .7, 11: .7, 14: .45}
CHANT_VEL = {0: 82, 3: 74, 6: 70, 8: 78, 11: 72, 14: 68}
CHANT_BARS = list(range(5, 13)) + list(range(29, 49))
# inflections of the reciting tone: (bar, sixteenth) -> pitch (the bII of the half bar)
CHANT_TURNS = {(8, 14): 50, (12, 14): 50, (30, 11): 50, (30, 14): 50, (32, 11): 51, (32, 14): 51,
               (34, 11): 52, (34, 14): 52, (36, 14): 50, (40, 11): 51, (40, 14): 51, (44, 11): 51,
               (44, 14): 51, (48, 11): 50, (48, 14): 50}


def chant(s):
    """The salmodia of section 6: syllables on the tonal fundamental (49-52), identical in both."""
    ch = s['Chant']
    for bar in CHANT_BARS:
        lift = {5: 0, 29: -2, 37: 4}.get(bar, 0) + (2 if bar in (37, 41, 43) else 0)
        for pos, beats in CHANT_LEN.items():
            pitch = CHANT_TURNS.get((bar, pos), 49 + min(shift_of(bar), 3))
            ch.notes.append(Note(pitch, t16(bar, pos), int(round(beats * BEAT)), CHANT_VEL[pos] + lift,
                                 hv=4, vmax=SHARED_VEL_MAX, tag='chant'))


# ── common layers (identical in both tracks) ─────────────────────────────────
def intro_bar(bar: int) -> int | None:
    """Bars 1-4 and their return 53-56 share the intro texture."""
    if bar <= 4:
        return bar
    if bar >= 53:
        return bar - 52
    return None


def section_of(bar: int) -> str:
    return next(label for label, first, last in SECTIONS if first <= bar <= last)


def common_layers(s):
    bd, fd, tp, pd = s['Bass Drum'], s['Frame Drum'], s['Timpani'], s['Organ Pedal']
    for bar in range(1, BARS + 1):
        ib, sec = intro_bar(bar), section_of(bar)
        # bass drum: 0, 6, 8, 14 (B and the open intro: 0, 8)
        if ib in (1, 2):
            hits = [(0, 80 + 2 * ib), (8, 72 + 2 * ib)]
        elif ib in (3, 4):
            hits = [(0, 84 + 4 * (ib - 3)), (6, 74 + 4 * (ib - 3)), (8, 82 + 4 * (ib - 3)), (14, 78 + 4 * (ib - 3))]
        elif sec == 'B':
            hits = [(0, 80 - (bar % 2) * 2), (8, 70)]
        elif 49 <= bar <= 52:
            hits = [(0, 92 - 2 * (bar - 49)), (8, 80 - 2 * (bar - 49))]
        elif 37 <= bar <= 44:
            hits = [(0, 104), (6, 90), (8, 98), (14, 90)]
        elif 45 <= bar <= 48:
            hits = [(0, 100), (6, 86), (8, 94), (14, 86)]
        else:
            lift = (bar - 32) if 29 <= bar <= 36 else (2 if bar % 4 == 1 else 0)
            hits = [(0, 98 + lift), (6, 86), (8, 92 + lift), (14, 86 + (bar % 2))]
        for pos, v in hits:
            if bar == 43 and pos == 0:
                bd.hit(bar, pos, BD_HIT, 105, E8, hv=0, vmax=105)
            else:
                bd.hit(bar, pos, BD_HIT, v, E8, hv=4, vmax=104)
        # frame drum: 61 on the off accents 3 and 11, 64 on the last sixteenth
        if ib in (1, 2):
            fhits = [(15, FD_SMALL, 54 + 4 * ib)]
        elif ib in (3, 4):
            fhits = [(3, FD_BIG, 64 + 4 * (ib - 3)), (11, FD_BIG, 64 + 4 * (ib - 3)), (15, FD_SMALL, 58 + 4 * (ib - 3))]
        elif sec == 'B':
            fhits = [(3, FD_BIG, 58), (11, FD_BIG, 56)]
        elif sec == 'Climax':
            fhits = [(3, FD_BIG, 78 - (bar >= 45) * 4), (11, FD_BIG, 76 - (bar >= 45) * 4), (15, FD_SMALL, 66)]
        elif 49 <= bar <= 52:
            fhits = [(3, FD_BIG, 70 - (bar - 49)), (11, FD_BIG, 68 - (bar - 49)), (15, FD_SMALL, 58)]
        else:
            fhits = [(3, FD_BIG, 72 + (bar % 2)), (11, FD_BIG, 71), (15, FD_SMALL, 60 + 2 * (bar % 2 == 0))]
        for pos, key, v in fhits:
            fd.hit(bar, pos, key, v, S16, hv=4)
        # timpani: the root on 0 (and the bass of beat 3 on 8 in the climax)
        root = P('D2') if ib == 4 else pedal_at(tick(bar))
        if ib:
            tv = 76 + 2 * ib + (2 if ib == 4 else 0)
        elif sec == 'B':
            tv = 70
        elif sec == 'Climax':
            tv = 93 if bar <= 44 else 88
        elif sec == 'Bridge':
            tv = 82 + (bar - 29)
        elif 49 <= bar <= 52:
            tv = 84 - (bar - 49)
        else:
            tv = 86 + (2 if bar in (5, 9, 13, 17) else 0)
        if bar == 43:
            tp.hit(bar, 0, root, 100, E8, hv=0, vmax=100)
        else:
            tp.hit(bar, 0, root, tv, E8, hv=3, vmax=97)
        if sec == 'Climax':
            tp.hit(bar, 8, pedal_at(tick(bar, 3)), tv - 3, E8, hv=3, vmax=97)
    # organ pedal: the bass line of section 4 (legato between different notes)
    for t0, t1, p in PEDAL_LINE:
        bar = t0 // BAR + 1
        sec = section_of(bar)
        first = t0 % BAR == 0
        v = {'Intro': 66, 'A': 66, "A'": 66, 'B': 56, 'Codetta': 64}.get(sec, 0)
        if sec == 'Bridge':
            v = 62 + int(round(12 * (bar - 29) / 7))
        elif sec == 'Climax':
            v = 80 if bar == 43 else (76 if bar <= 44 else 70)
        pd.notes.append(Note(p, t0, t1 - t0, v + (2 if first else 0), legato=True, hv=3, tag='bass'))
    pd.curve([(1, 1, 96), (4, 4.5, 102), (5, 1, 104), (20, 4.5, 104), (21, 1, 94), (28, 4.5, 98),
              (29, 1, 96), (36, 4.5, 106), (37, 1, 106), (43, 1, 110), (48, 4.5, 102), (49, 1, 102),
              (52, 4.5, 98), (53, 1, 96), (56, 4.5, 100)])


# ── voice CC1 curves (the voices are shared; their dynamics are not) ─────────
VOICE_CC = {
    'malachar': {
        'Choir Low': [(1, 1, 88), (3, 1, 88), (3, 4.5, 96), (4, 2, 94), (5, 1, 94), (5, 3, 98), (5, 4.5, 95),
                      (7, 1, 97), (7, 3, 101), (7, 4.5, 98), (10, 1, 99), (10, 3, 103), (10, 4.5, 100),
                      (12, 1, 101), (12, 2, 104), (12, 3.5, 99), (13, 1, 89), (18, 1, 99), (20, 4.5, 91),
                      (21, 1, 82), (21, 2.5, 86), (21, 4.5, 83), (23, 1, 83), (23, 2.5, 87), (23, 4.5, 84),
                      (25, 1, 85), (25, 3, 89), (25, 4.5, 86), (27, 1, 86), (27, 3, 90), (27, 4.5, 88),
                      (29, 1, 92), (36, 4.5, 104), (37, 1, 104), (42, 4.5, 108), (43, 1, 110), (43, 4.5, 106),
                      (44, 4.5, 97), (45, 1, 98), (48, 4.5, 88), (49, 1, 88), (52, 4.5, 84), (55, 1, 88),
                      (55, 4.5, 96), (56, 4.5, 88)],
        'Choir High': [(1, 1, 90), (4, 1, 92), (4, 3.5, 100), (5, 1, 93), (6, 1, 93), (6, 3, 98), (6, 4.5, 95),
                       (8, 1, 95), (8, 2, 99), (8, 3.5, 96), (9, 1, 96), (9, 3, 101), (9, 4.5, 99), (11, 1, 99),
                       (11, 3, 102), (11, 4.5, 100), (12, 4.5, 96), (13, 1, 96), (18, 1, 106), (20, 4.5, 98),
                       (21, 1, 80), (22, 1, 80), (22, 2.5, 85), (22, 4.5, 81), (24, 1, 82), (24, 2.5, 87),
                       (24, 4.5, 83), (26, 1, 83), (26, 2.5, 88), (26, 4.5, 84), (28, 1, 84), (28, 2.5, 88),
                       (28, 4.5, 86), (29, 1, 92), (36, 4.5, 102), (37, 1, 102), (42, 4.5, 104), (43, 1, 106),
                       (43, 4.5, 103), (44, 4.5, 97), (45, 1, 98), (48, 4.5, 88), (49, 1, 88), (52, 4.5, 85),
                       (55, 4.5, 90), (56, 1, 92), (56, 3.5, 100), (56, 4.5, 90)],
        'Chant': [(1, 1, 84), (5, 1, 84), (12, 4.5, 96), (29, 1, 90), (36, 4.5, 104), (37, 1, 98), (43, 1, 108),
                  (44, 4.5, 102), (48, 4.5, 96), (52, 4.5, 84)],
    },
    'abaddon': {
        'Choir Low': [(1, 1, 96), (3, 1, 96), (3, 4.5, 104), (4, 2, 100), (5, 1, 100), (5, 3, 104), (5, 4.5, 101),
                      (7, 1, 102), (7, 3, 106), (7, 4.5, 103), (10, 1, 104), (10, 3, 108), (10, 4.5, 105),
                      (12, 1, 106), (12, 2, 110), (12, 3.5, 105), (13, 1, 93), (18, 1, 99), (20, 4.5, 95),
                      (21, 1, 90), (21, 2.5, 94), (21, 4.5, 91), (23, 1, 91), (23, 2.5, 95), (23, 4.5, 92),
                      (25, 1, 93), (25, 3, 97), (25, 4.5, 94), (27, 1, 94), (27, 3, 98), (27, 4.5, 96),
                      (29, 1, 100), (36, 4.5, 106), (37, 1, 106), (42, 4.5, 110), (43, 1, 112), (43, 4.5, 108),
                      (44, 4.5, 102), (45, 1, 103), (48, 4.5, 96), (49, 1, 96), (52, 4.5, 90), (55, 1, 96),
                      (55, 4.5, 104), (56, 4.5, 96)],
        'Choir High': [(1, 1, 98), (4, 1, 98), (4, 3.5, 106), (5, 1, 98), (6, 1, 99), (6, 3, 103), (6, 4.5, 100),
                       (8, 1, 100), (8, 2, 104), (8, 3.5, 101), (9, 1, 101), (9, 3, 105), (9, 4.5, 103),
                       (11, 1, 103), (11, 3, 106), (11, 4.5, 104), (12, 4.5, 100), (13, 1, 100), (18, 1, 106),
                       (20, 4.5, 102), (21, 1, 88), (22, 1, 88), (22, 2.5, 93), (22, 4.5, 89), (24, 1, 90),
                       (24, 2.5, 95), (24, 4.5, 91), (26, 1, 91), (26, 2.5, 96), (26, 4.5, 92), (28, 1, 92),
                       (28, 2.5, 96), (28, 4.5, 94), (29, 1, 100), (36, 4.5, 104), (37, 1, 104), (42, 4.5, 106),
                       (43, 1, 108), (43, 4.5, 105), (44, 4.5, 100), (45, 1, 101), (48, 4.5, 94), (49, 1, 96),
                       (52, 4.5, 92), (55, 4.5, 98), (56, 1, 98), (56, 3.5, 106), (56, 4.5, 98)],
        'Chant': [(1, 1, 94), (5, 1, 94), (12, 4.5, 106), (29, 1, 96), (36, 4.5, 108), (37, 1, 102),
                  (43, 1, 112), (44, 4.5, 106), (48, 4.5, 100), (52, 4.5, 94)],
    },
}


# ── Malachar's organ: inner voices by voice leading ──────────────────────────
ORGAN_RUNS = [(5, 20), (29, 52)]
# The brief's model for bars 5-6 (section 6): kept as written.
ORGAN_FORCED = {(5, 1.0): (64, 68), (5, 3.0): (64, 67), (6, 1.0): (60, 64, 66), (6, 3.0): (60, 63, 66)}
ORGAN_VEL = {5: 66, 6: 64, 7: 66, 8: 64, 9: 68, 10: 66, 11: 68, 12: 64,
             13: 64, 14: 65, 15: 66, 16: 67, 17: 68, 18: 70, 19: 67, 20: 65,
             **{b: 66 + int(round(12 * (b - 29) / 7)) for b in range(29, 37)},
             37: 74, 38: 75, 39: 76, 40: 76, 41: 78, 42: 80, 43: 82, 44: 78, 45: 72, 46: 70, 47: 68, 48: 66,
             49: 66, 50: 64, 51: 62, 52: 60}


def is_parallel(a0, a1, b0, b1) -> bool:
    if a0 == a1 or b0 == b1 or (a1 - a0) * (b1 - b0) <= 0:
        return False
    iv0, iv1 = abs(a0 - b0) % 12, abs(a1 - b1) % 12
    return iv0 == iv1 and iv0 in (0, 7) and abs(a1 - a0) <= 7 and abs(b1 - b0) <= 7


def moves(prev, cur) -> list[tuple[int, int]]:
    """Voices of one part from a sonority to the next: in order when the count is the same,
    otherwise each to the nearest pitch (as the acceptance test pairs them)."""
    prev, cur = sorted(prev), sorted(cur)
    if not prev or not cur:
        return []
    if len(prev) == len(cur):
        return list(zip(prev, cur))
    return [(p, min(cur, key=lambda q: abs(q - p))) for p in prev]


def organ_segments(first, last):
    segs = []
    for bar in range(first, last + 1):
        hs = HARMONY[bar]
        bounds = [b for b, _, _ in hs] + [5.0]
        for (beat, sym, _), end in zip(hs, bounds[1:]):
            cuts = sorted({beat, end} | ({3.0} if beat < 3 < end else set()))
            for a, b in zip(cuts, cuts[1:]):
                segs.append({'bar': bar, 'beat': a, 't0': tick(bar, a), 't1': tick(bar, b), 'chord': sym})
    return segs


def written_at(notes, t):
    return sorted({n.pitch for n in notes if n.ws <= t < n.we})


def written_before(notes, t):
    return sorted({n.pitch for n in notes if n.ws < t <= n.we + E8 and n.we > t - E8})


def organ_voice_lead(segs, melody, lo_hi):
    """Viterbi over voicings of 2-3 chord tones: smooth motion, no parallel 5ths/8ves (inside the
    organ, against the bass, against the singing voices), leading tones up and sevenths down."""
    pedal_notes = [Note(p, a, b - a, 0) for a, b, p in PEDAL_LINE]
    lines = [pedal_notes] + list(melody.values())

    def candidates(sg):
        key = (sg['bar'], sg['beat'])
        if key in ORGAN_FORCED:
            return [(tuple(ORGAN_FORCED[key]), 0)]
        root, ivs = CHORDS[sg['chord']]
        pcs = chord_pcs(sg['chord'])
        need = {(root + i) % 12 for i in ivs if i in (3, 4, 5)} | {(root + i) % 12 for i in ivs if i in (10, 11)}
        lo, hi = lo_hi(sg['bar'])
        pool = [p for p in range(lo, hi + 1) if p % 12 in pcs]
        mel = [n for ns in melody.values() for n in ns
               if min(n.we, sg['t1']) - max(n.ws, sg['t0']) >= E8 and n.dur >= BEAT]
        sung = {n.pitch % 12 for n in mel}
        need -= sung                                     # what the voices hold, the organ may leave out
        leading = (root + 4) % 12 if sg['chord'].startswith(('G#7', 'A7')) else None
        bass_pc = pedal_at(sg['t0']) % 12
        out = []
        for size in (3, 2):
            for combo in itertools.combinations(pool, size):
                got = {p % 12 for p in combo}
                if len(got) < size or not need <= got:
                    continue
                cost = (6 if size == 2 else 0) + (1 if bass_pc in got else 0)
                if leading is not None and leading in got and leading in sung:
                    cost += 8                            # never double the singing leading tone
                for o in combo:
                    for m in mel:
                        d = m.pitch - o
                        if d % 12 == 1 or abs(d) == 1:
                            cost += 6                    # no minor 2nd / 9th against the voice
                out.append((combo, cost))
        if not out:
            raise ValueError(f'no organ voicing for {sg}')
        return out

    def transition(prev, cur, sp, sc):
        c = 0
        mv = moves(prev, cur)
        for a, b in mv:
            c += abs(a - b) + 2 * max(0, abs(a - b) - 4)
        for i, (a0, a1) in enumerate(mv):
            for b0, b1 in mv[i + 1:]:
                if is_parallel(a0, a1, b0, b1):
                    c += 1000
        t = sc['t0']
        for notes in lines:
            for b0, b1 in moves(written_before(notes, t), written_at(notes, t)):
                for a0, a1 in mv:
                    if is_parallel(a0, a1, b0, b1):
                        c += 1000
        pr, pc = CHORDS[sp['chord']][0], CHORDS[sc['chord']][0]
        dominant = sp['chord'].startswith(('G#7', 'A7')) and (pr + 5) % 12 == pc
        if dominant:
            for a0, a1 in mv:
                if a0 % 12 == (pr + 4) % 12 and a1 != a0 + 1:
                    c += 40                              # the leading tone rises
                if a0 % 12 == (pr + 10) % 12 and not 1 <= a0 - a1 <= 2:
                    c += 15                              # the seventh falls
        return c

    cands = [candidates(sg) for sg in segs]
    best = [(cost, [combo]) for combo, cost in cands[0]]
    for i in range(1, len(segs)):
        nxt = []
        for combo, st in cands[i]:
            c, path = min(((pc + transition(pp[-1], combo, segs[i - 1], segs[i]), pp) for pc, pp in best),
                          key=lambda x: x[0])
            nxt.append((c + st, path + [combo]))
        best = nxt
    total, path = min(best, key=lambda x: x[0])
    if total >= 1000:
        raise ValueError(f'organ voice leading with parallels (cost {total})')
    return path


def organ8(s):
    org = s['Organ 8']
    melody = {'Choir Low': s['Choir Low'].notes, 'Choir High': s['Choir High'].notes}
    for first, last in ORGAN_RUNS:
        segs = organ_segments(first, last)
        path = organ_voice_lead(segs, melody, lambda bar: (59, 71 if 37 <= bar <= 48 else 70))
        held: dict[int, Note] = {}
        for sg, combo in zip(segs, path):
            v = ORGAN_VEL[sg['bar']]
            nxt_held = {}
            for p in combo:
                n = held.get(p)
                if n is not None and n.we == sg['t0']:
                    n.dur += sg['t1'] - sg['t0']        # common tone held
                else:
                    n = Note(p, sg['t0'], sg['t1'] - sg['t0'], v + (1 if sg['beat'] == 1 else 0),
                             legato=True, hv=3, tag='organ')
                    org.notes.append(n)
                nxt_held[p] = n
            held = nxt_held
        for n in held.values():
            n.legato = False
    org.curve([(1, 1, 100), (5, 1, 100), (12, 4.5, 102), (13, 1, 100), (18, 1, 106), (20, 4.5, 98),
               (29, 1, 96), (36, 4.5, 106), (37, 1, 106), (43, 1, 110), (44, 4.5, 104), (48, 4.5, 98),
               (49, 1, 98), (52, 4.5, 90), (56, 4.5, 100)])


# ── Malachar, «El rito del Heraldo» ──────────────────────────────────────────
WAVE = [0, 1, -1, 0, 1, 0, -1, 1, 0, -1, 1, 0, 0, 1, -1, 0]   # small fixed variation of the 16ths


def darbuka_level(bar):
    """(accent, other) velocities of the darbuka per bar."""
    ib = intro_bar(bar)
    if ib:
        return (86, 48) if ib == 3 else (88, 50)
    if bar <= 12:
        return 88, 50
    if bar <= 20:
        return (92, 52) if bar == 18 else (90, 50)
    if bar <= 36:
        return 84 + int(round(8 * (bar - 29) / 7)), 48 + int(round(4 * (bar - 29) / 7))
    if bar <= 44:
        return (96, 56) if bar == 43 else (94, 54)
    if bar <= 48:
        return 92 - (bar - 45) * 2, 52 - (bar - 45)
    return 86 - (bar - 49), 48 - (bar - 49) // 2


def malachar(s):
    for name, pts in VOICE_CC['malachar'].items():
        s[name].curve(pts)
    hi2 = s['Choir High 2']                          # the doubled high voices replace the sketch's horn
    for n in s['Choir High'].notes:
        bar = n.ws // BAR + 1
        if not (21 <= bar <= 28 or 49 <= bar <= 52):
            hi2.notes.append(Note(n.pitch, n.ws, n.dur, n.vel - 4, legato=n.legato, vmax=100, tag='mel'))
    hi2.curve([(b, bt, v - 2) for b, bt, v in VOICE_CC['malachar']['Choir High']])
    organ8(s)
    # Organ 16: the C#-G# fifth of the rite; in B the drone climbs to the dominant's fifth
    o16 = s['Organ 16']
    for bar, pitches, beats, v in ((1, (37, 44), 16, 66), (21, (37,), 16, 60), (21, (44,), 32, 60),
                                   (25, (51,), 16, 62), (49, (37, 44), 16, 58), (53, (37, 44), 16, 64)):
        for p in pitches:
            o16.add(bar, 1, p, beats, v, hv=2)
    o16.curve([(1, 1, 96), (4, 4.5, 104), (5, 1, 96), (21, 1, 92), (24, 4.5, 98), (25, 1, 98),
               (28, 4.5, 96), (49, 1, 100), (52, 4.5, 94), (53, 1, 96), (56, 4.5, 104)])
    # Didgeridoo: always C#2, silent while the key leaves C# (bridge and climax)
    dg = s['Didgeridoo']
    for bar, key, beats, v in ((1, DIDG_SUS3, 16, 80), (5, DIDG_SUS2, 30, 84), (13, DIDG_SUS3, 24, 80),
                               (21, DIDG_SUS2, 30, 78), (47, DIDG_SUS3, 8, 82), (49, DIDG_SUS2, 30, 80)):
        dg.add(bar, 1, key, beats, v, hv=3)
    dg.add(21, 1, DIDG_GROWL, 4, 70, hv=2)
    dg.add(29, 1, DIDG_GROWL, 4, 76, hv=2)
    dg.curve([(1, 1, 92), (4, 4.5, 100), (5, 1, 96), (9, 1, 104), (12, 3, 94), (13, 1, 98), (16, 1, 104),
              (18, 4.5, 92), (21, 1, 90), (25, 1, 100), (28, 3, 92), (29, 1, 100), (47, 1, 96), (48, 4.5, 102),
              (49, 1, 98), (53, 1, 104), (56, 3, 92)])
    # Contrabassoon: the floor of the sacrifice and of the codetta (breathing every two bars)
    cb = s['Contrabassoon']
    for bar, pitch, v in ((21, 'C#1', 60), (23, 'C#1', 62), (25, 'G#1', 64), (27, 'G#1', 62),
                          (49, 'C#1', 60), (51, 'C#1', 58)):
        cb.add(bar, 1, pitch, 8, v, hv=3)
    cb.curve([(1, 1, 56), (21, 1, 56), (24, 4.5, 62), (25, 1, 62), (28, 4.5, 66), (49, 1, 62), (52, 4.5, 56)])
    # Low Trem: the bass of section 4 in 33-45, bridge and climax
    lt = s['Low Trem']
    prev = None
    for t0, t1, p in PEDAL_LINE:
        bar = t0 // BAR + 1
        if not 29 <= bar <= 48:
            continue
        q = p if p <= 45 else p - 12
        if prev is not None and prev.pitch == q and prev.we == t0:
            prev.dur += t1 - t0
            continue
        prev = Note(q, t0, min(t1, tick(49)) - t0, 64 + (bar >= 37) * 6, legato=True, hv=3)
        lt.notes.append(prev)
    lt.curve([(1, 1, 60), (29, 1, 60), (36, 4.5, 94), (37, 1, 92), (43, 1, 100), (44, 4.5, 92),
              (48, 4.5, 84), (52, 4.5, 60)])
    # Darbuka: the ostinato (doum only), accents 3+3+2
    db = s['Darbuka']
    for bar in list(range(3, 21)) + list(range(29, 53)) + [55, 56]:
        acc, rest = darbuka_level(bar)
        for pos in range(16):
            a = pos in ACCENTS
            v = acc + (2 if pos in (0, 8) else 0) if a else rest + WAVE[pos]
            db.hit(bar, pos, DOUM, v, S16, hv=6, vmax=100)
    # Col legno: the knives of the rite, a semitone diad
    cl = s['Col Legno Vc']
    for bar in list(range(5, 21)) + list(range(29, 36)) + list(range(37, 49)):
        sh = min(shift_of(bar), 2)
        lift = {"A'": 2, 'Bridge': int(round(4 * (bar - 29) / 6)) - 2, 'Climax': 3}.get(section_of(bar), 0)
        for pos, v in zip(KNIFE_POS, (56, 62, 54, 60, 64)):
            for p in (49 + sh, 50 + sh):
                cl.hit(bar, pos, p, v + lift, S16, hv=4, vmax=70)
    # Bells, gong and finger cymbals: one stroke each, written as an eighth
    pb = s['Pact Bells']
    for bar, v in ((4, 70), (8, 66), (12, 66), (20, 64), (24, 62), (28, 62), (40, 72), (44, 74), (48, 76), (56, 70)):
        for p in BELLS:
            pb.add(bar, 1, p, .5, v - (2 if p == 62 else 0), hv=2)
    for bar, v in ((16, 52), (20, 52), (22, 50), (24, 50), (26, 50)):
        s['Hand Bell'].add(bar, 1, HAND_BELL, .5, v, hv=2)
    for bar, v in ((14, 38), (16, 40), (18, 42), (38, 40), (40, 42), (42, 44), (44, 44)):
        s['Finger Cymbals'].hit(bar, 14, FINGER, v, E8, hv=2, vmax=44)
    for bar, key, v in ((1, GONG_DARK, 76), (5, GONG_DARK, 72), (13, GONG_DARK, 74), (21, GONG_DARK, 70),
                        (29, GONG_DARK, 76), (37, GONG_FULL, 84), (43, GONG_FULL, 96), (49, GONG_DARK, 66)):
        s['Gong'].add(bar, 1, key, .5, v, hv=2)


# ── Abaddon, «La carne abierta» ──────────────────────────────────────────────
def spic_level(bar):
    """(accent, other) velocities of the cello ostinato per bar (B is handled apart)."""
    ib = intro_bar(bar)
    if ib:
        return {1: (86, 62), 2: (88, 64), 3: (90, 66), 4: (92, 68)}[ib]
    if bar <= 12:
        return 94, 70
    if bar <= 20:
        return (98, 72) if bar == 18 else (96, 70)
    if bar <= 36:
        return 92 + int(round(8 * (bar - 29) / 7)), 68 + int(round(6 * (bar - 29) / 7))
    if bar <= 44:
        return (102, 76) if bar == 43 else (100, 74)
    if bar <= 48:
        return 98 - (bar - 45), 72 - (bar - 45)
    return 94 - (bar - 49) * 2, 68 - (bar - 49)


def sounding_choirs(s, bar):
    lo, hi = tick(bar) + 64, tick(bar + 1) - 64
    return {name for name in ('Choir Low', 'Choir High')
            if any(n.ws < hi and n.we > lo for n in s[name].notes)}


def abaddon(s):
    for name, pts in VOICE_CC['abaddon'].items():
        s[name].curve(pts)
    # Horns Low: in unison with the low voices (only 48-58)
    hl = s['Horns Low']
    for n in s['Choir Low'].notes:
        bar = n.ws // BAR + 1
        if bar in (51, 52):
            continue
        if bar == 25:
            if n.ws == tick(25):
                hl.notes.append(Note(56, n.ws, BAR, n.vel - 6, tag='mel'))
            continue
        if 48 <= n.pitch <= 58:
            hl.notes.append(Note(n.pitch, n.ws, n.dur, n.vel - 6, legato=n.legato, tag='mel'))
    hl.curve([(1, 1, 88), (3, 1, 88), (3, 4.5, 96), (5, 1, 92), (12, 4.5, 102), (13, 1, 90), (20, 4.5, 98),
              (21, 1, 84), (28, 4.5, 90), (29, 1, 94), (36, 4.5, 102), (37, 1, 100), (43, 1, 106),
              (44, 4.5, 100), (48, 4.5, 94), (49, 1, 90), (52, 4.5, 86), (55, 1, 88), (55, 4.5, 96), (56, 4.5, 88)])
    # Choir Shout: the voice that screams with the high choir in the climax
    sh = s['Choir Shout']
    for n in s['Choir High'].notes:
        if 37 <= n.ws // BAR + 1 <= 48:
            sh.notes.append(Note(n.pitch, n.ws, n.dur, n.vel, legato=n.legato, vmax=105, tag='mel'))
    sh.curve([(1, 1, 100), (37, 1, 100), (42, 4.5, 104), (43, 1, 108), (43, 4.5, 104), (44, 4.5, 98),
              (45, 1, 98), (48, 4.5, 92)])
    # Cellos Spic: the ostinato on the fundamental with its b2 on sixteenths 7 and 15
    cs = s['Cellos Spic']
    for bar in range(1, BARS + 1):
        fund = 44 if 25 <= bar <= 28 else 36 + FUND[bar]
        if section_of(bar) == 'B':
            for pos in range(0, 16, 2):
                cs.hit(bar, pos, fund + 1 if pos in (6, 14) else fund, 64 + WAVE[pos], S16, hv=4)
            continue
        acc, rest = spic_level(bar)
        for pos in range(16):
            a = pos in ACCENTS
            v = acc + (2 if pos in (0, 8) else 0) if a else rest + WAVE[pos]
            cs.hit(bar, pos, fund + 1 if pos in (7, 15) else fund, v, S16, hv=4 if a else 6, vmax=105)
    # Demon and Demon Low: the hits on eighths 0, 3, 6, a cluster fundamental + b2 + tritone
    dm, dl = s['Demon'], s['Demon Low']
    hit_len = 300                                    # 0.23 s: at least an eighth, at most 0.3 s
    for bar in range(1, BARS + 1):
        sft = shift_of(bar)
        sec = section_of(bar)
        full = 5 <= bar <= 20 or 29 <= bar <= 48
        if full:
            base = 96 + (bar >= 29) * 2 + (4 if bar == 43 else 0)
            for pos, lift in zip(DEMON_POS, (4, 0, 2)):
                for p in (49 + sft, 50 + sft, 55 + sft):
                    dm.hit(bar, pos, p, base + lift, hit_len, hv=4, vmax=105)
        if full or bar in (4, 56):
            for pos, lift in zip(DEMON_POS, (4, 0, 2)):
                dl.hit(bar, pos, 37 + sft, 94 + lift, hit_len, hv=4, vmax=105)
        elif sec == 'B' or 49 <= bar <= 52:
            dl.hit(bar, 0, 37, 88, hit_len, hv=3)
    dm.curve([(1, 1, 100), (5, 1, 100), (12, 4.5, 108), (13, 1, 104), (20, 4.5, 106), (29, 1, 100),
              (36, 4.5, 108), (37, 1, 106), (43, 1, 110), (48, 4.5, 104)])
    dl.curve([(1, 1, 96), (4, 1, 96), (5, 1, 100), (12, 4.5, 108), (13, 1, 104), (20, 4.5, 106), (21, 1, 90),
              (28, 4.5, 90), (29, 1, 100), (36, 4.5, 108), (37, 1, 106), (43, 1, 110), (48, 4.5, 102),
              (49, 1, 92), (52, 4.5, 90), (56, 1, 96)])
    # Celli Trem: clusters fundamental + b2 under the voices (intro, B, bridge, climax, codetta)
    ct = s['Celli Trem']
    spans = [(1, 4, 37), (21, 4, 37), (25, 4, 44), (29, 2, 37), (31, 2, 38), (33, 2, 39), (35, 1, 40),
             (36, 1, 39), (37, 4, 38), (41, 2, 38), (43, 3, 38), (46, 3, 37), (49, 4, 37), (53, 4, 37)]
    for bar, bars, low in spans:
        for p in (low, low + 1):
            ct.add(bar, 1, p, 4 * bars, 66 + (bar >= 29) * 6, hv=3)
    ct.curve([(1, 1, 72), (4, 1, 92), (4, 4.5, 86), (21, 1, 60), (28, 4.5, 80), (29, 1, 72), (36, 4.5, 100),
              (37, 1, 94), (43, 1, 100), (44, 4.5, 94), (48, 4.5, 90), (49, 1, 84), (52, 4.5, 78), (53, 1, 72),
              (56, 1, 92), (56, 4.5, 86)])
    # Violas Trem: the C#4-D4 cluster between the choirs in A'
    vt = s['Violas Trem']
    for bar in (13, 17):
        for p in (61, 62):
            vt.add(bar, 1, p, 16, 62, hv=3)
    vt.curve([(1, 1, 66), (13, 1, 66), (18, 1, 84), (20, 4.5, 72)])
    # Knives: a semitone diad outside the octave of the voices that sing in the bar
    kn = s['Knives']
    for bar in list(range(5, 21)) + list(range(29, 36)) + list(range(37, 49)):
        singing = sounding_choirs(s, bar)
        diad = (73, 74) if singing == {'Choir Low'} else (64, 65)
        lift = {"A'": 2, 'Bridge': int(round(4 * (bar - 29) / 6)) - 2, 'Climax': 2}.get(section_of(bar), 0)
        for pos, v in zip(KNIFE_POS, (74, 80, 72, 78, 82)):
            for p in diad:
                kn.hit(bar, pos, p, v + lift, 102, hv=4, vmax=86)
    # Toms: the fills of the 3+3+2
    tm = s['Tom']
    for bar in (4, 56):
        for k, pos in enumerate(range(8, 16)):
            tm.hit(bar, pos, TOM_HIGH if pos == 15 else TOM, 58 + 5 * k, S16, hv=2)
    for i, bar in enumerate(list(range(6, 21, 2)) + list(range(29, 36))):
        base = 86 + int(round(10 * i / 14))
        for pos, lift in zip((10, 11, 13, 14, 15), (0, -4, 2, -2, 4)):
            tm.hit(bar, pos, TOM_HIGH if pos == 15 else TOM, base + lift, S16, hv=4, vmax=105)
    for pos in range(16):
        tm.hit(36, pos, TOM_HIGH if pos in (7, 15) else TOM, 60 + int(round(40 * pos / 15)), S16, hv=2, vmax=105)
    for bar, v in ((1, 84), (5, 86), (13, 86), (21, 80), (29, 88), (37, 90), (43, 100), (49, 80)):
        s['Gong Full'].add(bar, 1, GONG2_HIT, .5, v, hv=0 if bar == 43 else 2)
    for bar, v in ((39, 64), (41, 66), (45, 68)):
        s['Cymbal'].add(bar, 1, CYMBAL_DOME, .5, v, hv=2, vmax=70)


# ── performance: humanization, legato, bar lines ─────────────────────────────
def perform(part: Part, vmax: int):
    """Seeded by the track name and independent of the controller curves: a track that exists in
    both versions with the same notes is played identically in both."""
    rng = random.Random(f'{SEED}:{part.name}')
    part.notes.sort(key=lambda n: (n.ws, n.pitch))
    shift: dict[int, int] = {}
    for n in part.notes:
        if n.ws not in shift:                        # notes written together are played together
            if not n.jitter:
                shift[n.ws] = 0
            elif n.ws in NO_EARLY:
                shift[n.ws] = rng.randint(0, HUMAN_TICKS)
            elif n.ws % BAR == 0:
                shift[n.ws] = rng.randint(-HUMAN_TICKS // 2, HUMAN_TICKS)
            else:
                shift[n.ws] = rng.randint(-HUMAN_TICKS, HUMAN_TICKS)
        n.start = max(0, n.ws + shift[n.ws])
        n.end = n.start + n.dur
        if n.hv:
            n.vel += rng.randint(-n.hv, n.hv)
        n.vel = max(1, min(n.vmax or vmax, vmax, n.vel))
    starts: dict[int, list[Note]] = {}
    for n in part.notes:
        starts.setdefault(n.ws, []).append(n)
    onsets = sorted(starts)
    first_start = {t: min(m.start for m in starts[t]) for t in onsets}
    for n in part.notes:
        nxt = starts.get(n.we, [])
        if any(m.pitch == n.pitch for m in nxt):
            n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
        elif n.legato and nxt:
            n.end = min(m.start for m in nxt) + rng.randint(*OVERLAP)
        elif n.tag in ('mel', 'organ', 'bass') or n.we % BAR == 0:
            n.end = min(n.end, n.ws + shift[n.ws] + n.dur - GUARD)   # phrase end breathes
        if not (n.legato and nxt):
            later = [t for t in onsets if t >= n.we]
            if later:
                n.end = min(n.end, first_start[later[0]] - 8)            # a detached note stays detached
        n.end = min(n.end, LOOP_END - GUARD)
    by_pitch: dict[int, Note] = {}
    for n in sorted(part.notes, key=lambda n: n.start):
        prev = by_pitch.get(n.pitch)
        if prev is not None and prev.end > n.start - 6:
            prev.end = n.start - 6
        by_pitch[n.pitch] = n
    part.build_cc()


def build(version: str) -> dict[str, Part]:
    s = new_parts(version)
    voices(s)
    chant(s)
    common_layers(s)
    (malachar if version == 'malachar' else abaddon)(s)
    for name, part in s.items():
        top = COMMON_VEL_MAX if name in COMMON else SHARED_VEL_MAX if name in SHARED else CEIL[version]['vel']
        perform(part, top)
    return s


def write_midi(parts: dict[str, Part], path: str):
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='C#m', time=0))
        events = []
        for t, v in sorted(part.cc.items()):
            events.append((t, 1, 0, mido.Message('control_change', channel=part.channel, control=part.ctrl, value=v)))
        for n in part.notes:
            events.append((n.start, 2, n.pitch, mido.Message('note_on', channel=part.channel, note=n.pitch,
                                                               velocity=n.vel)))
            events.append((n.end, 0, n.pitch, mido.Message('note_off', channel=part.channel, note=n.pitch,
                                                             velocity=0)))
        now = 0
        for t, _, _, msg in sorted(events, key=lambda e: (e[0], e[1], e[2])):
            tr.append(msg.copy(time=t - now))
            now = t
        tr.append(mido.MetaMessage('end_of_track', time=LOOP_END - now))
        mid.tracks.append(tr)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    mid.save(path)


def write_midis(out_dir: str | None = None) -> dict[str, str]:
    """Builds and writes both tracks; returns {version: path}."""
    paths = {}
    for v in VERSIONS:
        path = OUT[v] if out_dir is None else os.path.join(out_dir, os.path.basename(OUT[v]))
        write_midi(build(v), path)
        paths[v] = path
    return paths


# ── verification ─────────────────────────────────────────────────────────────
def sec(t: int) -> float:
    return t * SEC_PER_TICK


def bar_of(t: int) -> int:
    return t // BAR + 1


def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
            for k in range(r.lokey, r.hikey + 1)}


def sounding(parts, t0, t1):
    cuts = sorted({t0, t1} | {min(t1, max(t0, x)) for p in parts.values() for n in p.notes
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


def verify(scores: dict[str, dict[str, Part]]) -> bool:
    ok_all = True
    rows = []

    def check(label, ok, detail=''):
        nonlocal ok_all
        ok_all &= bool(ok)
        rows.append((label, 'OK' if ok else 'FAIL', detail))

    for v, parts in scores.items():
        print(f"\n[{v}] {'track':<15} {'sfz':<62} {'notes':>5}  range used")
        for name, part in parts.items():
            keys = sfz_keys(SFZ_OF[v][name])
            bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
            if bad:
                raise SystemExit(f'{v} {name}: notes outside {SFZ_OF[v][name]}: {bad}')
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'  {name:<15} {"/".join(part.lib)[-62:]:<62} {len(part.notes):>5}  '
                  f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})')
        last = max(n.end for p in parts.values() for n in p.notes)
        check(f'{v}: 1  everything inside 84.000 s', sec(last) < 84.0, f'last note-off {sec(last):.3f} s')
        for (label, first, last_bar), limit in zip(SECTIONS, LAYER_LIMITS[v]):
            worst, where = sounding(parts, tick(first), tick(last_bar + 1))
            check(f'{v}: 7  layers {label} <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
        top = max(n.vel for name, p in parts.items() if name not in COMMON for n in p.notes)
        cc_top = max((val for p in parts.values() for val in p.cc.values()), default=0)
        check(f'{v}: 11 velocity <= {CEIL[v]["vel"]}, CC <= {CEIL[v]["cc"]}',
              top <= CEIL[v]['vel'] and cc_top <= CEIL[v]['cc'], f'{top} / {cc_top}')
        step_ok = all(b - a >= CC_STEP for p in parts.values() for a, b in zip(sorted(p.cc), sorted(p.cc)[1:]))
        check(f'{v}: 12 CC points at most every eighth', step_ok)
        cc1_ok = all(0 in p.cc for p in parts.values() if p.ctrl)
        check(f'{v}: 12 controller curve at tick 0', cc1_ok)
        for name, longest in MAX_NOTE_S.items():
            if name in parts:
                worst = max(sec(n.end - n.start) for n in parts[name].notes)
                check(f'{v}: 12 {name} notes <= {longest} s', worst <= longest + 1e-9, f'longest {worst:.3f} s')
        low_peak = max(parts['Choir Low'].cc.values())
        bars = {bar_of(t) for t, val in parts['Choir Low'].cc.items() if val == low_peak}
        check(f'{v}: 11 Choir Low CC1 peak in bar 43', bars == {43}, f'{low_peak} in {sorted(bars)}')
    for name in COMMON:
        a = [(n.pitch, n.start, n.end, n.vel) for n in scores['malachar'][name].notes]
        b = [(n.pitch, n.start, n.end, n.vel) for n in scores['abaddon'][name].notes]
        check(f'4  common layer {name} identical', a == b, f'{len(a)} notes')
    for name in SHARED:
        a = [(n.pitch, n.start, n.end) for n in scores['malachar'][name].notes]
        b = [(n.pitch, n.start, n.end) for n in scores['abaddon'][name].notes]
        check(f'4  voices {name} identical (only CC1 changes)', a == b, f'{len(a)} notes')
    print(f"\n{'check':<52} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<52} {status:<4} {detail}')
    return ok_all


def main():
    scores = {v: build(v) for v in VERSIONS}
    for v in VERSIONS:
        write_midi(scores[v], OUT[v])
    ok = verify(scores)
    for v in VERSIONS:
        print(f'written {OUT[v]}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
