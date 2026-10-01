"""«La Guarida del Dragón» — «Tesoro maldito»: score generator (brief: docs/musica/acto3-guarida.md).

One song in two synchronized versions, written from a single description of form, harmony and
reference melody:
    build/acto3-guarida-explora.mid   (map and events: the «Ruinas de oro» arrangement)
    build/acto3-guarida-combate.mid   (normal and elite fights: «Saqueo» and «Derrumbe»)
Both: 36 bars of 3/4 at 84 bpm (77.142857 s = 3 402 000 samples), one MIDI track per instrument and
articulation. The common layers (`Contrabassoon` with its CC1, `Gong`, `Bell`) come from the same
functions with the same per-track seed, so they are identical tick for tick and the game's linear
crossfade sums them in phase; `Choir` sings the same voices in both (only its CC1 differs).

The leitmotiv «Tesoro maldito» (A4 G4 | F4 E4 | D4 E4 F4 | E4 | C5 B4 | A4 G#4 F4 | E4 F4 D4 | A3) is
stated over a lament bass with a Phrygian cadence (Bb -> Am), sequenced to the subdominant in A'
(D minor, Eb as its flat II), its head inverted and augmented in F lydian in B, fragmented into
hemiola (dotted quarters, 6/8 against 3/4) and sequenced a step up in the bridge, and its second half
returns over the deceptive cadence E7 -> Fmaj7 (the climax, bar 31). The codetta keeps bars 3-4 of
the motif and the dominant of bar 36 leads into bar 1.

Every ostinato is the sketch's «flat-2» figure (A1 E2 A2 Bb2 E2 A2) or the «Derrumbe» hemiola cell
(A2 Bb2 A2 E3 F3 E3), transposed onto each bar's bass with the neighbour taken from the section's
scale (A phrygian, D phrygian in A', F lydian in bars 21-24).

The bowed vibraphone speaks late: its notes are written 120 ms early (all of them are a quarter or
longer), except the glow of bar 1, which starts at tick 0.

Prints a verification table and exits with status 1 if a check fails; a note outside its
instrument's range aborts the build.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-guarida/compose.py
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
E8 = BEAT // 2
S16 = BEAT // 4
S32 = BEAT // 8
BAR = 3 * BEAT
BARS = 36
LOOP_END = BARS * BAR
BPM = 84
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = E8                                         # at most one CC point per eighth
HUMAN_TICKS = int(0.008 / SEC_PER_TICK)              # +-8 ms
HUMAN_VEL = 6
SEED = 'acto3-guarida'
GUARD = 12                                           # ticks a note stops before a bar line it does not cross
VERSIONS = ('explora', 'combate')
OUT = {v: os.path.join(HERE, 'build', f'acto3-guarida-{v}.mid') for v in VERSIONS}
TOP_VEL = {'explora': 80, 'combate': 116}            # section 7 ceilings
TOP_CC1 = {'explora': 90, 'combate': 110}
TRACK_CAP = {'Vibes Bowed': 64}


def ms(x: float) -> int:
    return int(round(x / 1000 / SEC_PER_TICK))


VIB_EARLY = ms(120)                                  # the bow needs time to make the bar speak
OVERLAP = (ms(11), ms(29))                           # legato overlap, 10-30 ms

SECTIONS = [('Intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 26), ('Bridge', 27, 30),
            ('Return', 31, 34), ('Codetta', 35, 36)]
LAYER_LIMITS = {'explora': [5, 7, 8, 5, 8, 9, 5], 'combate': [15, 18, 21, 13, 21, 21, 16]}
S_BARS = set(range(1, 13)) | set(range(31, 37))     # «Saqueo»
D_BARS = set(range(13, 21)) | set(range(27, 31))    # «Derrumbe»
B_BARS = set(range(21, 27))
PHRASE_END = (16, 20, 30)


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


def t16(bar: int, pos: int) -> int:
    return (bar - 1) * BAR + pos * S16


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
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p % 12] + str(p // 12 - 1)


# ── instruments: one track per instrument and articulation ───────────────────
def vsco(n):
    return ('VSCO-2-CE', n + '.sfz')


def sso(n):
    return ('sso', 'Sonatina Symphonic Orchestra/' + n + '.sfz')


def vcsl(n):
    return ('VCSL', n + '.sfz')


def idio(n):
    return vcsl('Idiophones/Struck Idiophones/' + n)


def memb(n):
    return vcsl('Membranophones/Struck Membranophones/' + n)


# (track name, library path, controller that shapes it: 1 = Sonatina CC1, 11 = CC11, None = velocity)
COMMON = [
    ('Contrabassoon', sso('Woodwinds - Performance/Contrabassoon Solo Sustain (looped)'), 1),
    ('Gong', idio('Gong 1'), None),
    ('Bell', idio('Tubular Bells 1'), None),
]
SHARED = [
    ('Cello Solo', sso('Strings - Performance/Cello Solo Sustain'), 1),
    ('Harp', vcsl('Chordophones/Composite Chordophones/Concert Harp'), None),
    ('Choir', sso('Chorus - Performance/Mixed Chorus'), 1),
    ('Timp Roll', vsco('TimpaniRolls'), 11),
    ('Timpani', vsco('Timpani'), None),
    ('Frame Drum', memb('Frame Drum'), None),
]
LAYOUT = {
    'explora': COMMON + SHARED + [
        ('Alto Flute', sso('Woodwinds - Performance/Alto Flute Solo Sustain (looped)'), 1),
        ('Bass Clarinet', sso('Woodwinds - Performance/Bass Clarinet Solo Sustain (looped)'), 1),
        ('Vibes Bowed', idio('Vibraphone - Bowed'), None),
    ],
    'combate': COMMON + SHARED + [
        ('Horns', sso('Brass - Performance/Horns Sustain'), 1),
        ('Choir Melody', sso('Chorus - Performance/Mixed Chorus'), 1),
        ('Low Brass', sso('Brass - Performance/Trombones Marcato'), 1),
        ('Tuba', sso('Brass - Performance/Tuba Marcato'), 1),
        ('Cellos Spic', vsco('CelloEnsSpic'), None),
        ('Violins Spic', vsco('ViolinEnsSpic'), None),
        ('Basses Spic', vsco('ContrabassSpic'), None),
        ('War Drums', memb('Bass Drum 2'), None),
        ('Toms', memb('Tom 2'), None),
        ('Snare', memb('Snare Drum, Rope Tension'), None),
        ('Anvil', idio('Anvil'), None),
        ('Shaker', idio('Shaker, Small'), None),
        ('Clash', idio('Clash Cymbals 1'), None),
        ('Cymbal', idio('Suspended Cymbal 2'), None),
        ('Ratchet', idio('Ratchet'), None),
    ],
}
SFZ_OF = {v: {name: library(*lib) for name, lib, _ in LAYOUT[v]} for v in VERSIONS}
COMMON_NAMES = tuple(name for name, _, _ in COMMON)
MAX_NOTE_S = {'Horns': 2.8}
# unpitched notes (section 6): what each key of the VCSL percussion plays
GONG = 61                                            # Gong 1, the dark hit
FD_LOW, FD_HAND, FD_HIGH = 61, 63, 64                # Frame Drum: low hit, small hand, high hit
WAR = 62                                             # Bass Drum 2: hit
TOM_RIM, TOM_RIM_SHORT, TOM_HEAD = 60, 61, 62        # Tom 2
SNARE = 62                                           # rope snare, high with snares
ANVIL_A, ANVIL_B = 60, 61
SHAKE = 61                                           # Shaker, Small: slap
CLASH = 60                                           # Clash Cymbals 1: crash
SWELL = 63                                           # Suspended Cymbal 2: 2.5 s crescendo, summit at 2.17 s
RATCHET = 60                                         # one crank


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
    cap: int | None = None
    early: int = 0     # ticks the note is played ahead of its written start
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
    phrases: list[tuple[list[tuple[int, int]], str]] = field(default_factory=list)
    cc: dict[int, int] = field(default_factory=dict)

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), vel, **kw)
        self.notes.append(n)
        return n

    def hit(self, bar, pos, pitch, beats, vel, **kw) -> Note:
        """A note on the sixteenth grid: `pos` sixteenths after the bar line."""
        n = Note(P(pitch), t16(bar, pos), int(round(beats * BEAT)), vel, **kw)
        self.notes.append(n)
        return n

    def line(self, bar, beat, items, vels, legato=False, tie=False, **kw):
        """Consecutive notes from (bar, beat): items = [(pitch | None for a rest, beats)].
        tie=True merges repeated pitches into one held note (common tones)."""
        t = tick(bar, beat)
        vels = vels if isinstance(vels, list) else [vels]
        prev, k = None, 0
        for pitch, beats in items:
            length = int(round(beats * BEAT))
            if pitch is None:
                prev = None
                t += length
                continue
            v = vels[min(k, len(vels) - 1)]
            if tie and prev is not None and prev.pitch == P(pitch) and prev.we == t:
                prev.dur += length
            else:
                prev = Note(P(pitch), t, length, v, legato=legato, **kw)
                self.notes.append(prev)
                k += 1
            t += length

    def chords(self, items, vel, **kw):
        """Held chords [(bar, beat, [pitches], beats)]: common tones are tied, the other voices move."""
        held: dict[int, Note] = {}
        for k, (bar, beat, pitches, beats) in enumerate(items):
            t, length = tick(bar, beat), int(round(beats * BEAT))
            now = {}
            for i, p in enumerate(pitches):
                p = P(p)
                n = held.get(p)
                if n is not None and n.we == t:
                    n.dur += length
                else:
                    n = Note(p, t, length, vel + (i % 2) + (k % 3) - 1, **kw)
                    self.notes.append(n)
                now[p] = n
            held = now

    def phrase(self, points, shape='cos'):
        """Controller breakpoints [(bar, beat, value)] of one phrase (CC1 or CC11)."""
        self.phrases.append(([(tick(b, bt), int(round(v))) for b, bt, v in points], shape))

    def build_cc(self):
        """Phrases -> controller points on the eighth grid: interpolated inside a phrase, held
        between phrases and moved within the grid step before the next phrase starts, with a point
        at tick 0 (the value of the first phrase)."""
        if not self.phrases:
            return
        out: dict[int, int] = {}
        phrases = sorted(self.phrases, key=lambda ph: ph[0][0][0])
        for i, (pts, shape) in enumerate(phrases):
            pts = sorted(pts)
            first = (pts[0][0] // CC_STEP) * CC_STEP
            if i == 0:
                out[0] = pts[0][1]
            else:
                last_t = max(out)
                if first - CC_STEP > last_t:
                    out[first - CC_STEP] = out[last_t]     # hold, then move in one grid step
            for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
                g = (t0 // CC_STEP) * CC_STEP
                while g < t1:
                    x = 0.0 if t1 == t0 else min(1.0, max(0.0, (g - t0) / (t1 - t0)))
                    if shape == 'cos':
                        x = (1 - math.cos(math.pi * x)) / 2
                    out[g] = int(round(v0 + (v1 - v0) * x))
                    g += CC_STEP
            out[(pts[-1][0] // CC_STEP) * CC_STEP] = pts[-1][1]
        last = None
        for t in sorted(out):                              # drop repeated values
            if out[t] != last or t == 0:
                self.cc[t] = out[t]
                last = out[t]


def new_parts(version: str) -> dict[str, Part]:
    parts, ch = {}, 0
    for name, lib, ctrl in LAYOUT[version]:
        if ctrl is None:
            channel = 15
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, lib, ctrl, channel)
    return parts


# ── harmony (section 4, common to both versions) ─────────────────────────────
CHORDS = {
    'Am': (9, (0, 3, 7)), 'Bb': (10, (0, 4, 7)), 'E7(b9)': (4, (0, 4, 7, 10, 1)), 'G7': (7, (0, 4, 7, 10)),
    'Dm': (2, (0, 3, 7)), 'E7sus4': (4, (0, 5, 7, 10)), 'Bb(#11)': (10, (0, 4, 7, 6)), 'C7': (0, (0, 4, 7, 10)),
    'Gm': (7, (0, 3, 7)), 'A7(b9)': (9, (0, 4, 7, 10, 1)), 'A7sus4': (9, (0, 5, 7, 10)), 'Eb(#11)': (3, (0, 4, 7, 6)),
    'F(add9)': (5, (0, 4, 7, 2)), 'Fmaj7(#11)': (5, (0, 4, 7, 11, 6)), 'Dm9': (2, (0, 3, 7, 10, 2)),
    'G7sus4': (7, (0, 5, 7, 10)), 'Bbmaj7': (10, (0, 4, 7, 11)),
}
# bar: 'chord | beat chord ...' (the bass is always the root here, so it is not written)
HARMONY_SRC = {
    1: 'Am', 2: 'Am', 3: 'Bb', 4: 'E7(b9)',
    5: 'Am', 6: 'G7', 7: 'Dm', 8: 'E7(b9)', 9: 'Am', 10: 'E7sus4 | 2 E7(b9)', 11: 'Bb(#11)', 12: 'Am',
    13: 'Dm', 14: 'C7', 15: 'Gm', 16: 'A7(b9)', 17: 'Dm', 18: 'A7sus4 | 2 A7(b9)', 19: 'Eb(#11)', 20: 'Dm',
    21: 'F(add9)', 22: 'Fmaj7(#11)', 23: 'Dm9', 24: 'G7sus4 | 3 G7', 25: 'Bbmaj7', 26: 'E7(b9)',
    27: 'Dm', 28: 'Bb(#11)', 29: 'E7sus4', 30: 'E7(b9)',
    31: 'Fmaj7(#11)', 32: 'E7sus4 | 2 E7(b9)', 33: 'Bb(#11)', 34: 'Am',
    35: 'Bb(#11)', 36: 'E7(b9)',
}
# the written bass (Contrabassoon) per bar, octave 1-2 (28-39)
BASS = {1: 'A1', 2: 'A1', 3: 'Bb1', 4: 'E1', 5: 'A1', 6: 'G1', 7: 'D2', 8: 'E1', 9: 'A1', 10: 'E1', 11: 'Bb1',
        12: 'A1', 13: 'D2', 14: 'C2', 15: 'G1', 16: 'A1', 17: 'D2', 18: 'A1', 19: 'Eb2', 20: 'D2', 21: 'F1',
        22: 'F1', 23: 'D2', 24: 'G1', 25: 'Bb1', 26: 'E1', 27: 'D2', 28: 'Bb1', 29: 'E1', 30: 'E1', 31: 'F1',
        32: 'E1', 33: 'Bb1', 34: 'A1', 35: 'Bb1', 36: 'E1'}
PHRYG_A = (9, 10, 0, 2, 4, 5, 7)
PHRYG_D = (2, 3, 5, 7, 9, 10, 0)
LYD_F = (5, 7, 9, 11, 0, 2, 4)
SCALE = {bar: PHRYG_D if 13 <= bar <= 20 else LYD_F if 21 <= bar <= 24 else PHRYG_A for bar in range(1, BARS + 1)}


def _parse_harmony():
    out = {}
    for bar, src in HARMONY_SRC.items():
        segs = []
        for i, chunk in enumerate(src.split('|')):
            words = chunk.split()
            beat = 1.0 if i == 0 else float(words.pop(0))
            segs.append((beat, words[0]))
        out[bar] = segs
    return out


HARMONY = _parse_harmony()


def chord_at(bar: int, beat: float = 1.0) -> str:
    sym = HARMONY[bar][0][1]
    for b, s in HARMONY[bar]:
        if b <= beat + 1e-9:
            sym = s
    return sym


def chord_pcs(sym: str) -> set[int]:
    root, ivs = CHORDS[sym]
    return {(root + i) % 12 for i in ivs}


def bass_pc(bar: int) -> int:
    return P(BASS[bar]) % 12


def base_in(pc: int, low: int) -> int:
    """The pitch of class `pc` in the octave [low, low + 11]."""
    return low + (pc - low) % 12


def up_neighbour(bar: int, pitch: int) -> int:
    """The next pitch above `pitch` in the bar's scale: the flat 2 over A and E (section 4)."""
    p = pitch + 1
    while p % 12 not in SCALE[bar]:
        p += 1
    return p


def fifth_of(bar: int, root: int) -> int:
    """The fifth above `root` if it belongs to the bar's (first) chord, else the nearest chord tone."""
    pcs = chord_pcs(chord_at(bar))
    if (root + 7) % 12 in pcs:
        return root + 7
    tones = [p for p in range(root + 3, root + 10) if p % 12 in pcs]
    return min(tones, key=lambda p: (abs(p - (root + 7)), p))


def third_of(bar: int, root: int) -> int:
    """The chord's third (or its suspended fourth) above `root`."""
    pcs = chord_pcs(chord_at(bar))
    return next(root + i for i in (4, 3, 5) if (root + i) % 12 in pcs)


def flat2_figure(bar: int, low: int) -> list[int]:
    """The sketch's ostinato A1 E2 A2 Bb2 E2 A2 on the bar's bass: [r, q, r+12, v+12, q, r+12]."""
    r = base_in(bass_pc(bar), low)
    q = fifth_of(bar, r)
    v = up_neighbour(bar, r)
    return [r, q, r + 12, v + 12, q, r + 12]


def hemiola_cell(bar: int, low: int) -> list[int]:
    """The «Derrumbe» cell A2 Bb2 A2 E3 F3 E3 on the bar's bass: [r, v, r, q, w, q] (two groups of three)."""
    r = base_in(bass_pc(bar), low)
    q = fifth_of(bar, r)
    return [r, up_neighbour(bar, r), r, q, up_neighbour(bar, q), q]


ROOTS = {bar: CHORDS[chord_at(bar)][0] for bar in range(1, BARS + 1)}


def dagger_cell(bar: int) -> list[int]:
    """The violins' daggers: the cell on the chord's root in E4-D#5 and its fifth a fourth below."""
    R = base_in(ROOTS[bar], 64)
    pcs = chord_pcs(chord_at(bar))
    F = R - 5 if (R - 5) % 12 in pcs else max(p for p in range(R - 9, R - 2) if p % 12 in pcs)
    return [R, up_neighbour(bar, R), R, F, up_neighbour(bar, F), F]


# ── reference melody (section 5): identical pitches and attacks in both versions ──
MOTIF = [('A4', 2), ('G4', 1), ('F4', 2), ('E4', 1), ('D4', 1), ('E4', 1), ('F4', 1), ('E4', 3),
         ('C5', 2), ('B4', 1), ('A4', 1), ('G#4', 1), ('F4', 1), ('E4', 1.5), ('F4', .5), ('D4', 1), ('A3', 3)]
REF = {
    'motif': (5, MOTIF),                                                         # exposition
    'seq': (13, [(P(p) + 5, b) for p, b in MOTIF]),                              # sequence to the subdominant
    'counter': (13, [('F4', 3), ('E4', 3), ('D4', 3), ('C#4', 3), ('D4', 3), ('C#4', 3), ('G3', 3),
                     ('A3', 3)]),                                                # lament of guide tones
    'inv': (21, [('A4', 3), ('B4', 2), ('C5', 1), ('D5', 3), ('C5', 2), ('B4', 1), ('A4', 3),
                 ('G#4', 3)]),                                                   # the head inverted, augmented
    'frag': (27, [('A4', 1.5), ('G4', 1.5), ('F4', 1.5), ('E4', 1.5), ('B4', 1.5), ('A4', 1.5), ('G#4', 1.5),
                  ('F4', 1.5)]),                                                 # the head in hemiola, a step up
    'ret': (31, MOTIF[8:]),                                                      # the second half returns
    'cod': (35, [('D4', 1), ('E4', 1), ('F4', 1), ('E4', 3)]),                   # bars 3-4, unresolved
}


def contour(key: str, base: int, spread: int = 6, end_drop: int = 3) -> list[int]:
    """Velocities that draw the phrase: higher notes a little louder, metric weight (beat 1 > 2/3 >
    off-beats) and a softer last note."""
    _, items = REF[key]
    pitches = [P(p) for p, _ in items]
    lo, hi = min(pitches), max(pitches)
    out, pos = [], 0.0
    for p, beats in items:
        x = (P(p) - lo) / (hi - lo) if hi > lo else 0.5
        b = pos % 3
        metric = 3 if b == 0 else -2 if b % 1 else 0
        out.append(base + int(round(spread * (x - 0.5) * 2)) + metric)
        pos += beats
    out[-1] -= end_drop
    return out


def play(part: Part, key: str, vels, shift: int = 0, legato: bool = True, cut: dict[int, float] | None = None,
         hv: int = HUMAN_VEL, cap: int | None = None, early: bool = False) -> list[Note]:
    """Writes a reference-melody window into a track (shift = declared octave doubling, cut = beats
    taken off a note's end, early = the bowed vibraphone's anticipation)."""
    bar, items = REF[key]
    vels = vels if isinstance(vels, list) else [vels] * len(items)
    t, notes = tick(bar), []
    for i, ((p, beats), v) in enumerate(zip(items, vels)):
        length = int(round(beats * BEAT))
        dur = length - int(round((cut or {}).get(i, 0) * BEAT))
        n = Note(P(p) + shift, t, dur, v, legato=legato and dur == length, hv=hv, cap=cap,
                 early=VIB_EARLY if early and t > 0 else 0)
        part.notes.append(n)
        notes.append(n)
        t += length
    return notes


# ── common layers (identical in both versions) ───────────────────────────────
def common_layers(s):
    cb = s['Contrabassoon']
    cb.line(1, 1, [(BASS[bar], 3) for bar in range(1, BARS + 1)],
            [70 + (2, -1, 1, -2, 0, 3, -3)[i % 7] for i in range(BARS)], legato=True, tie=True)
    cb.phrase([(1, 1, 60), (4, 3.5, 66)])
    cb.phrase([(5, 1, 64), (9, 1, 70), (12, 3.5, 64)])
    cb.phrase([(13, 1, 64), (17, 1, 72), (20, 3.5, 62)])
    cb.phrase([(21, 1, 58), (26, 3.5, 60)])
    cb.phrase([(27, 1, 62), (30, 3.5, 80)], shape='lin')                 # the roof gives way
    cb.phrase([(31, 1, 80), (34, 3.5, 66)])
    cb.phrase([(35, 1, 62), (36, 3.5, 60)])
    gong = s['Gong']
    for bar, v in ((1, 46), (21, 40), (31, 58)):
        gong.add(bar, 1, GONG, 2, v, hv=2)
    bell = s['Bell']                                   # one-shots: short notes ring on
    for bar, p, v in ((5, 'A4', 50), (13, 'D4', 46), (31, 'F4', 58)):
        bell.add(bar, 1, p, .75, v, hv=2)


# ── shared material ──────────────────────────────────────────────────────────
CHOIR = {   # low voices, 43-55 (male samples); no parallel fifths or octaves with the bass, the tune or the
    # countermelody: they hold or move against the falling lament (F4 E4 D4 C#4 D4 C#4 G3 A3)
    13: ['A2', 'D3', 'F3'], 14: ['Bb2', 'E3', 'G3'], 15: ['G2', 'Bb2', 'G3'], 16: ['G2', 'Bb2', 'E3'],
    17: ['A2', 'C3', 'F3'], 18: ['A2', 'C#3', 'G3'], 19: ['G2', 'Bb2', 'Eb3'], 20: ['C3', 'D3', 'F3'],
    27: ['A2', 'D3', 'F3'], 28: ['Bb2', 'D3', 'E3'], 29: ['A2', 'B2', 'E3'], 30: ['B2', 'D3', 'F3'],
    31: ['A2', 'C3', 'E3'], 32: ['G#2', 'D3', 'E3'], 33: ['Bb2', 'D3', 'E3'], 34: ['C3', 'E3', 'G3'],
}


def choir_voices(part: Part):
    """The same voices in both versions; only the CC1 differs."""
    part.chords([(bar, 1, CHOIR[bar], 3) for bar in range(13, 21)], 64)
    part.chords([(bar, 1, CHOIR[bar], 3) for bar in range(27, 35)], 66)


# ── exploration ──────────────────────────────────────────────────────────────
def harp_bar(s, bar, base):
    """The flat-2 ostinato in eighths, the first one leaning (+8)."""
    h = s['Harp']
    for k, p in enumerate(flat2_figure(bar, 28)):
        h.add(bar, 1 + k / 2, p, .5, base + (8 if k == 0 else (0, 1, -1, 2, 0, -2)[k]), hv=2)


def harp_hemiola(s, bar, base):
    """The «Derrumbe» cell in eighths, accents on eighths 0 and 3 (6/8 against the bar)."""
    h = s['Harp']
    for k, p in enumerate(hemiola_cell(bar, 28)):
        h.add(bar, 1 + k / 2, p, .5, base + (10 if k in (0, 3) else (0, 0, -1, 0, 1, -1)[k]), hv=2)


def harp_rolled(s, bar, vels=(46, 42, 43)):
    """B: a low chord broken over eighths 0-2 (root, fifth, tenth), left to ring to the bar line."""
    h = s['Harp']
    r = base_in(bass_pc(bar), 28)
    for k, (p, v) in enumerate(zip((r, fifth_of(bar, r), third_of(bar, r) + 12), vels)):
        h.add(bar, 1 + k / 2, p, 3 - k / 2, v, hv=2)


def glow(s, bars):
    """The bowed vibraphone's glow (the sketch): E4 and F4 in turn, a dotted half every other bar."""
    vib = s['Vibes Bowed']
    for i, (bar, v) in enumerate(bars):
        p = 'E4' if i % 2 == 0 else 'F4'
        vib.add(bar, 1, p, 3, v, early=VIB_EARLY if bar > 1 else 0, hv=2, cap=62)


def frame_hits(s, bar, hits):
    """hits: [(beat, note, velocity)]."""
    fd = s['Frame Drum']
    for beat, note, v in hits:
        fd.add(bar, beat, note, .5, v, hv=3)


def explora_intro(s):
    """Bars 1-4: Am | Am | Bb | E7(b9). The ruins: the ostinato, the bass falls to the flat II."""
    for bar, base in zip(range(1, 5), (50, 51, 53, 54)):
        harp_bar(s, bar, base)
        frame_hits(s, bar, [(1, FD_LOW, 56), (3, FD_HIGH, 42)])
    glow(s, [(1, 44), (3, 46)])


def explora_a(s):
    """Bars 5-12: the exposition on the solo cello over the lament bass and the Phrygian cadence."""
    vc = s['Cello Solo']
    play(vc, 'motif', contour('motif', 64, spread=4))
    vc.phrase([(5, 1, 70), (7, 1, 76), (8, 3, 74), (9, 1, 84), (10, 1, 80), (11, 1, 76), (12, 3.5, 72)])
    for bar, base in zip(range(5, 13), (52, 53, 54, 53, 56, 58, 57, 54)):
        harp_bar(s, bar, base)
        hits = [(1, FD_LOW, 58), (3, FD_HIGH, 44)] + ([(2.5, FD_HAND, 34)] if bar >= 9 else [])
        frame_hits(s, bar, hits)
    glow(s, [(5, 46), (7, 48), (9, 46), (11, 44)])


def explora_a2(s):
    """Bars 13-20: the sequence in D minor on the alto flute, the lament below on the bass clarinet."""
    fl = s['Alto Flute']
    play(fl, 'seq', contour('seq', 64, spread=4), cut={16: .5})     # breath before the vibraphone's early bow
    fl.phrase([(13, 1, 68), (15, 1, 74), (16, 3, 76), (17, 1, 84), (18, 1, 80), (19, 1, 76), (20, 3.5, 70)])
    bcl = s['Bass Clarinet']
    play(bcl, 'counter', [56, 55, 56, 58, 60, 58, 56, 52])
    bcl.phrase([(13, 1, 54), (15, 1, 58), (17, 1, 64), (19, 1, 60), (20, 3.5, 56)])
    s['Choir'].phrase([(13, 1, 42), (17, 1, 56), (20, 3.5, 46)])
    for bar, base in zip(range(13, 21), (54, 55, 56, 55, 58, 57, 56, 54)):
        harp_bar(s, bar, base)
        frame_hits(s, bar, [(1, FD_LOW, 58), (2.5, FD_HAND, 36), (3, FD_HIGH, 44)])


def explora_b(s):
    """Bars 21-26 (the lava river): the head inverted and augmented on the bowed vibraphone."""
    vib = s['Vibes Bowed']
    play(vib, 'inv', [48, 50, 52, 58, 54, 52, 50, 46], early=True, hv=2, cap=62)
    for bar in range(21, 27):
        harp_rolled(s, bar, (46 - (bar == 26) * 2, 42, 43))
    for bar in (21, 23, 25):
        frame_hits(s, bar, [(1, FD_LOW, 44)])


def explora_bridge(s):
    """Bars 27-30: Dm | Bb(#11) | E7sus4 | E7(b9). The roof gives way: the head in hemiola."""
    vc, bcl = s['Cello Solo'], s['Bass Clarinet']
    play(vc, 'frag', [64, 62, 63, 61, 68, 66, 68, 66])
    vc.phrase([(27, 1, 72), (30, 3.5, 86)], shape='lin')
    play(bcl, 'frag', [58, 56, 57, 55, 62, 60, 62, 60], shift=-12)
    bcl.phrase([(27, 1, 60), (30, 3.5, 72)], shape='lin')
    s['Choir'].phrase([(27, 1, 46), (30, 3.5, 70)], shape='lin')
    for i, bar in enumerate(range(27, 31)):
        base = 52 + 6 * i
        harp_hemiola(s, bar, base)
        fd = [(1 + k / 2, FD_LOW if k in (0, 3) else FD_HAND, base + (8 if k in (0, 3) else -12)) for k in range(6)]
        frame_hits(s, bar, fd)
    roll = s['Timp Roll']
    roll.add(29, 1, 'A2', 3, 52, hv=2)
    roll.add(30, 1, 'E2', 3, 58, hv=2)
    roll.phrase([(29, 1, 38), (30, 3.5, 120)], shape='lin')               # 30 % -> 95 %


def explora_return(s):
    """Bars 31-34: Fmaj7(#11) (climax) | E7sus4 - E7(b9) | Bb(#11) | Am. The dragon wakes."""
    vc, fl = s['Cello Solo'], s['Alto Flute']
    play(vc, 'ret', [76, 70, 70, 68, 66, 64, 62, 62, 58])
    vc.phrase([(31, 1, 88), (31, 3, 86), (32, 1, 82), (33, 1, 78), (34, 3.5, 72)])
    play(fl, 'ret', [76, 70, 70, 68, 66, 64, 62, 62, 58])
    fl.phrase([(31, 1, 88), (31, 3, 86), (32, 1, 82), (33, 1, 76), (34, 3.5, 70)])
    s['Choir'].phrase([(31, 1, 70), (34, 3.5, 56)])
    for bar, base in zip(range(31, 35), (64, 62, 60, 58)):
        harp_bar(s, bar, base)
        frame_hits(s, bar, [(1, FD_LOW, base + 6), (2.5, FD_HAND, base - 18), (3, FD_HIGH, base - 6)])
    tp = s['Timpani']
    tp.add(31, 1, 'F2', .5, 72, hv=0)
    tp.add(33, 1, 'Bb2', .5, 58, hv=2)


def explora_codetta(s):
    """Bars 35-36: Bb(#11) | E7(b9). Embers: bars 3-4 of the motif, and the dominant leads to bar 1."""
    bcl = s['Bass Clarinet']
    play(bcl, 'cod', [58, 56, 57, 52])
    bcl.phrase([(35, 1, 62), (36, 3.5, 54)])
    for bar, base in zip((35, 36), (52, 50)):
        harp_bar(s, bar, base)
        frame_hits(s, bar, [(1, FD_LOW, 56), (3, FD_HIGH, 42)])


# ── combat ───────────────────────────────────────────────────────────────────
WAVE = [0, 1, -1, 2, 0, -2, 1, 0, -1, 2, -1, 0]


def saqueo_strings(s, bar, cello_base, harp_base):
    """«Saqueo»: the flat-2 figure in sixteenths on the spiccato cellos (accent on each group's first
    note) and on the harp, an octave and more below."""
    cel, harp = s['Cellos Spic'], s['Harp']
    cf, hf = flat2_figure(bar, 40), flat2_figure(bar, 28)
    for k in range(12):
        acc = k % 6 == 0
        cel.hit(bar, k, cf[k % 6], .22, cello_base + (16 if acc else WAVE[k]), hv=2)
        harp.hit(bar, k, hf[k % 6], .25, harp_base + (10 if acc else WAVE[k] // 2), hv=2)


def saqueo_low(s, bar, brass=True, vel=0):
    """The bass on beat 1 and 2.5: spiccato basses, marcato trombones an octave up and the tuba on 1."""
    bass = P(BASS[bar])
    s['Basses Spic'].hit(bar, 0, bass, .4, 108 + vel, hv=2)
    s['Basses Spic'].hit(bar, 6, bass, .4, 94 + vel, hv=2)
    if brass:
        s['Low Brass'].hit(bar, 0, bass + 12, .45, 110 + vel, hv=2)
        s['Low Brass'].hit(bar, 6, bass + 12, .45, 96 + vel, hv=2)
        s['Tuba'].hit(bar, 0, bass, .45, 108 + vel, hv=2)


def saqueo_drums(s, bar, lift=0, war=110):
    """War drums on 1 with a sixteenth pickup, toms every dotted eighth (4 against 3), frame drum
    eighths, shaker sixteenths, the anvil on beat 2 and the timpani on the bass."""
    wd = s['War Drums']
    wd.hit(bar, 0, WAR, .5, war, hv=0 if war > 112 else 2, cap=None if war > 112 else 112)
    wd.hit(bar, 10, WAR, .25, 86 + lift, hv=2)
    wd.hit(bar, 11, WAR, .5, 94 + lift, hv=2)
    for k in range(12):
        if k % 3 == 0:
            s['Toms'].hit(bar, k, TOM_HEAD, .2, 98 + lift, hv=2)
        else:
            s['Toms'].hit(bar, k, TOM_RIM, .2, 64 + lift + WAVE[k], hv=2)
        s['Shaker'].hit(bar, k, SHAKE, .2, (80 if k % 2 == 0 else 64) + lift, hv=2)
    for k in range(6):
        s['Frame Drum'].hit(bar, 2 * k, FD_LOW if k % 2 == 0 else FD_HAND, .4, (84 if k % 2 == 0 else 62) + lift, hv=2)
    s['Anvil'].hit(bar, 4, ANVIL_A, .5, 94 + lift, hv=2)


def timpani_hit(s, bar, pos, pitch, vel, peak=False):
    s['Timpani'].hit(bar, pos, pitch, .5, vel, hv=0 if peak else 2, cap=None if peak else 108)


def timp_root(bar):
    return base_in(bass_pc(bar), 38)


def timp_fifth(bar):
    t = timp_root(bar)
    f = fifth_of(bar, t)
    return f if f <= 49 else f - 12


def derrumbe_bar(s, bar, base=0):
    """«Derrumbe»: the hemiola cell on the spiccato cellos (accents on eighths 0 and 3), the violins'
    daggers with their sixteenth echo, trombones and basses on the accents, war drums on every beat,
    toms in a rolling wheel, the anvil on the 6/8 accent (beat 2.5), timpani on 1 and 2.5."""
    cel, vn = s['Cellos Spic'], s['Violins Spic']
    cell, dag = hemiola_cell(bar, 40), dagger_cell(bar)
    for k in range(6):
        acc = k in (0, 3)
        cel.hit(bar, 2 * k, cell[k], .4, (100 if acc else 76) + base + (0, 1, -1, 0, 1, -1)[k], hv=2)
        vn.hit(bar, 2 * k, dag[k], .2, (84 if acc else 66) + base, hv=2)
        vn.hit(bar, 2 * k + 1, dag[k], .2, (58 if acc else 50) + base, hv=2)
    r = base_in(bass_pc(bar), 40)
    q = fifth_of(bar, r)
    s['Low Brass'].hit(bar, 0, r, .45, 106 + base, hv=2)
    s['Low Brass'].hit(bar, 6, q, .45, 98 + base, hv=2)
    s['Basses Spic'].hit(bar, 0, P(BASS[bar]), .5, 106 + base, hv=2)
    s['Basses Spic'].hit(bar, 6, q - 12, .5, 98 + base, hv=2)
    wd = s['War Drums']
    for k, v in ((0, 108), (4, 90), (8, 90)):
        wd.hit(bar, k, WAR, .5, v + base, hv=2, cap=112)
    for k in range(12):
        if k % 4 != 3:
            s['Toms'].hit(bar, k, TOM_RIM + k % 3, .2, (98 if k % 6 == 0 else 68) + base, hv=2)
    s['Shaker'].hit(bar, 0, SHAKE, .2, 70 + base, hv=2)
    s['Anvil'].hit(bar, 6, ANVIL_B, .5, 92 + base, hv=2)
    if bar not in PHRASE_END and bar != 29:
        timpani_hit(s, bar, 0, timp_root(bar), 102 + base)
        timpani_hit(s, bar, 6, timp_fifth(bar), 90 + base)


def phrase_end(s, bars, roll_notes, vel_lo, vel_hi):
    """The ceiling gives way: a rope-snare roll in thirty-seconds that only grows, a timpani roll on the
    bass and the ratchet on beat 3 of the last bar."""
    sn = s['Snare']
    total = 24 * len(bars)
    for i in range(total):
        bar, k = bars[i // 24], i % 24
        v = vel_lo + int(round((vel_hi - vel_lo) * i / (total - 1)))
        sn.notes.append(Note(SNARE, tick(bar) + k * S32, S32 - 10, v, hv=1))
    roll = s['Timp Roll']
    for bar, p, v in roll_notes:
        roll.add(bar, 1, p, 3, v, hv=2)
    s['Ratchet'].add(bars[-1], 3, RATCHET, 1, 96, hv=2)


def clash(s, bar, v, peak=False):
    s['Clash'].add(bar, 1, CLASH, 2, v, hv=0 if peak else 2, cap=None if peak else 106)


def swell(s, bar, v):
    """A suspended-cymbal crescendo from beat 1 of `bar`: its summit lands on the next downbeat."""
    dur = BAR + BEAT if bar < BARS else LOOP_END - GUARD - tick(bar)
    s['Cymbal'].notes.append(Note(SWELL, tick(bar), dur, v, jitter=False, hv=2))


def combate_intro(s):
    """Bars 1-4: the «Saqueo» starts at once; trombones and tuba join in bar 3."""
    for bar, (cb, hb) in zip(range(1, 5), ((80, 58), (80, 59), (82, 60), (84, 61))):
        saqueo_strings(s, bar, cb, hb)
        saqueo_low(s, bar, brass=bar >= 3)
        saqueo_drums(s, bar, lift=-4 if bar < 3 else 0, war=104 if bar < 3 else 108)
        timpani_hit(s, bar, 0, timp_root(bar), 100 if bar < 3 else 104)
    s['Low Brass'].phrase([(3, 1, 92), (4, 3.5, 98)])
    s['Tuba'].phrase([(3, 1, 90), (4, 3.5, 96)])
    clash(s, 1, 98)
    swell(s, 4, 76)


def combate_a(s):
    """Bars 5-12 «Saqueo»: the cello and the horns an octave below sing over the whole machine."""
    vc, hn = s['Cello Solo'], s['Horns']
    play(vc, 'motif', contour('motif', 84, spread=4))
    vc.phrase([(5, 1, 88), (7, 1, 92), (8, 3, 90), (9, 1, 100), (10, 1, 96), (11, 1, 94), (12, 3.5, 90)])
    play(hn, 'motif', contour('motif', 80, spread=4), shift=-12)
    hn.phrase([(5, 1, 84), (9, 1, 96), (12, 3.5, 86)])
    for bar in range(5, 13):
        lift = 2 if bar in (9, 10) else 0
        saqueo_strings(s, bar, 84 + lift, 62)
        saqueo_low(s, bar, vel=lift)
        saqueo_drums(s, bar, lift=lift, war=110)
        timpani_hit(s, bar, 0, timp_root(bar), 104 + lift)
    s['Low Brass'].phrase([(5, 1, 98), (9, 1, 104), (12, 3.5, 100)])
    s['Tuba'].phrase([(5, 1, 96), (9, 1, 102), (12, 3.5, 98)])
    clash(s, 5, 100)
    clash(s, 9, 98)
    swell(s, 12, 78)


def combate_a2(s):
    """Bars 13-20 «Derrumbe»: hemiola everywhere; the choir doubles the cello, the horns sing the lament."""
    vc, cm, hn = s['Cello Solo'], s['Choir Melody'], s['Horns']
    play(vc, 'seq', contour('seq', 86, spread=4))
    vc.phrase([(13, 1, 92), (15, 1, 96), (16, 3, 98), (17, 1, 104), (18, 1, 100), (19, 1, 98), (20, 3.5, 94)])
    play(cm, 'seq', 80)
    cm.phrase([(13, 1, 84), (17, 1, 98), (20, 3.5, 86)])
    play(hn, 'counter', [80, 79, 80, 82, 84, 82, 80, 76])
    hn.phrase([(13, 1, 80), (17, 1, 90), (20, 3.5, 82)])
    s['Choir'].phrase([(13, 1, 68), (17, 1, 84), (20, 3.5, 72)])
    for bar in range(13, 21):
        derrumbe_bar(s, bar, base=2 if bar in (17, 18) else 0)
    s['Low Brass'].phrase([(13, 1, 100), (17, 1, 106), (20, 3.5, 100)])
    s['Tuba'].phrase([(13, 1, 100), (17, 1, 104), (20, 3.5, 98)])
    for bar in (13, 17):
        s['Tuba'].hit(bar, 0, P(BASS[bar]), 2.5, 108, hv=2)
    clash(s, 13, 104)
    clash(s, 17, 100)
    phrase_end(s, [16], [(16, timp_root(16), 74)], 56, 102)
    phrase_end(s, [20], [(20, timp_root(20), 76)], 58, 104)
    s['Timp Roll'].phrase([(16, 1, 50), (16, 3.5, 118)], shape='lin')
    s['Timp Roll'].phrase([(20, 1, 52), (20, 3.5, 120)], shape='lin')


def combate_b(s):
    """Bars 21-26: the horns carry the inverted head; the machine thins out but never stops."""
    hn = s['Horns']
    play(hn, 'inv', [76, 78, 79, 84, 80, 78, 76, 72])
    hn.phrase([(21, 1, 74), (23, 1, 86), (25, 1, 78), (26, 3.5, 72)])
    cel, harp = s['Cellos Spic'], s['Harp']
    for bar in range(21, 27):
        r = base_in(bass_pc(bar), 40)
        for k in range(6):
            cel.hit(bar, 2 * k, r if k % 2 == 0 else fifth_of(bar, r), .4, 60 + (0, 1, -1, 1, 0, -1)[k], hv=1)
        hf = flat2_figure(bar, 28)
        for k in range(12):
            harp.hit(bar, k, hf[k % 6], .25, 48 + (8 if k % 6 == 0 else WAVE[k] // 2), hv=2)
            s['Shaker'].hit(bar, k, SHAKE, .2, 56 if k % 2 == 0 else 46, hv=2)
        for k in range(6):
            s['Frame Drum'].hit(bar, 2 * k, FD_LOW if k % 2 == 0 else FD_HAND, .4, 60 if k % 2 == 0 else 46, hv=2)
        for k in (0, 3, 6, 9):
            s['Toms'].hit(bar, k, TOM_HEAD, .2, 72, hv=2)
        timpani_hit(s, bar, 0, timp_root(bar), 70)
    for bar in (21, 23, 25):
        s['War Drums'].hit(bar, 0, WAR, .5, 88, hv=2)
    s['War Drums'].hit(26, 10, WAR, .25, 80, hv=2)
    s['War Drums'].hit(26, 11, WAR, .5, 88, hv=2)
    swell(s, 26, 74)


def combate_bridge(s):
    """Bars 27-30 «Derrumbe» again, growing: the horns carry the head in hemiola."""
    hn = s['Horns']
    play(hn, 'frag', [82, 80, 81, 79, 88, 86, 90, 88])
    hn.phrase([(27, 1, 84), (30, 3.5, 104)], shape='lin')
    s['Choir'].phrase([(27, 1, 72), (30, 3.5, 92)], shape='lin')
    for i, bar in enumerate(range(27, 31)):
        derrumbe_bar(s, bar, base=-6 + 3 * i)
    s['Low Brass'].phrase([(27, 1, 96), (30, 3.5, 108)], shape='lin')
    s['Tuba'].phrase([(27, 1, 96), (30, 3.5, 106)], shape='lin')
    s['Tuba'].hit(27, 0, P(BASS[27]), 2.5, 106, hv=2)
    clash(s, 27, 104)
    phrase_end(s, [29, 30], [(29, 'A2', 76), (30, 'E2', 82)], 50, 104)
    s['Timp Roll'].phrase([(29, 1, 48), (30, 3.5, 124)], shape='lin')
    swell(s, 30, 84)


def combate_return(s):
    """Bars 31-34 «Saqueo», tutti: the cello, the horns an octave below and the choir. The climax is bar 31."""
    vc, hn, cm = s['Cello Solo'], s['Horns'], s['Choir Melody']
    play(vc, 'ret', [96, 90, 90, 88, 86, 84, 82, 82, 78])
    vc.phrase([(31, 1, 108), (31, 3, 106), (32, 1, 102), (33, 1, 98), (34, 3.5, 94)])
    play(hn, 'ret', [92, 88, 88, 86, 84, 82, 80, 80, 76], shift=-12)
    hn.phrase([(31, 1, 104), (32, 1, 98), (34, 3.5, 90)])
    play(cm, 'ret', 84)
    cm.phrase([(31, 1, 100), (32, 1, 96), (34, 3.5, 86)])
    s['Choir'].phrase([(31, 1, 94), (34, 3.5, 80)])
    for bar in range(31, 35):
        lift = {31: 6, 32: 4, 33: 2, 34: 0}[bar]
        saqueo_strings(s, bar, 86 + lift // 2, 64 + lift // 2)
        saqueo_low(s, bar, vel=lift // 2)
        saqueo_drums(s, bar, lift=lift, war=116 if bar == 31 else 110)
        timpani_hit(s, bar, 0, timp_root(bar), 112 if bar == 31 else 104, peak=bar == 31)
    s['Low Brass'].phrase([(31, 1, 108), (34, 3.5, 100)])
    s['Tuba'].phrase([(31, 1, 106), (34, 3.5, 98)])
    clash(s, 31, 112, peak=True)


def combate_codetta(s):
    """Bars 35-36: bars 3-4 of the motif on the cello and horns; the machine enters bar 1 as it left it."""
    vc, hn = s['Cello Solo'], s['Horns']
    play(vc, 'cod', [84, 82, 83, 78])
    vc.phrase([(35, 1, 86), (36, 3.5, 80)])
    play(hn, 'cod', [80, 78, 79, 74], shift=-12)
    hn.phrase([(35, 1, 84), (36, 3.5, 78)])
    for bar, (cb, hb) in zip((35, 36), ((82, 60), (80, 58))):
        saqueo_strings(s, bar, cb, hb)
        saqueo_low(s, bar)
        saqueo_drums(s, bar, lift=-2, war=106)
        timpani_hit(s, bar, 0, timp_root(bar), 100)
    s['Low Brass'].phrase([(35, 1, 96), (36, 3.5, 92)])
    s['Tuba'].phrase([(35, 1, 94), (36, 3.5, 90)])
    swell(s, 36, 76)


SCORE = {
    'explora': (explora_intro, explora_a, explora_a2, explora_b, explora_bridge, explora_return,
                explora_codetta),
    'combate': (combate_intro, combate_a, combate_a2, combate_b, combate_bridge, combate_return,
                combate_codetta),
}


# ── performance: humanization, legato, bar lines ─────────────────────────────
def _rng(part: Part, *key) -> random.Random:
    return random.Random(f'{SEED}:{part.name}:' + ':'.join(map(str, key)))


def perform(part: Part, version: str):
    """Humanization seeded by the track name and the written position of each note (not by the order of the
    notes): a note that both versions write at the same place on the same track is played identically in both
    (the common layers entirely, and the shared attacks of the cello, the harp and the frame drum, so the
    crossfade never flams). Notes on a bar line are never early (the phrases' CC1 points sit there)."""
    part.notes.sort(key=lambda n: (n.ws, n.pitch))
    top = min(TOP_VEL[version], TRACK_CAP.get(part.name, 127))
    shift: dict[int, int] = {}
    for n in part.notes:
        if n.ws not in shift:              # notes written together are played together
            r = _rng(part, 'shift', n.ws)
            if not n.jitter:
                shift[n.ws] = 0
            elif n.ws % BAR == 0:
                shift[n.ws] = r.randint(0, HUMAN_TICKS)
            else:
                shift[n.ws] = r.randint(-HUMAN_TICKS, HUMAN_TICKS)
        n.start = max(0, n.ws + shift[n.ws] - n.early)
        n.end = n.start + n.dur
        if n.hv:
            n.vel += _rng(part, 'vel', n.ws, n.pitch).randint(-n.hv, n.hv)
        n.vel = max(1, min(top, n.cap if n.cap is not None else top, n.vel))
    starts: dict[int, list[Note]] = {}
    for n in part.notes:
        starts.setdefault(n.ws, []).append(n)
    for n in part.notes:
        nxt = starts.get(n.we, [])
        if any(m.pitch == n.pitch for m in nxt):
            n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
        elif n.legato and nxt:
            n.end = min(m.start for m in nxt) + _rng(part, 'legato', n.ws, n.pitch).randint(*OVERLAP)  # 10-30 ms
        elif n.we % BAR == 0:
            n.end = min(n.end, n.we - n.early - GUARD)                      # leaves the bar line free
        n.end = min(n.end, LOOP_END - GUARD)
    by_pitch: dict[int, Note] = {}
    for n in sorted(part.notes, key=lambda n: n.start):
        prev = by_pitch.get(n.pitch)
        if prev is not None and prev.end > n.start - 6:
            prev.end = n.start - 6
        by_pitch[n.pitch] = n
    part.build_cc()
    if part.ctrl == 1:
        part.cc = {t: min(TOP_CC1[version], v) for t, v in part.cc.items()}


def build(version: str) -> dict[str, Part]:
    s = new_parts(version)
    common_layers(s)
    choir_voices(s['Choir'])
    for section in SCORE[version]:
        section(s)
    for part in s.values():
        perform(part, version)
    return s


def write_midi(parts: dict[str, Part], path: str):
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=3, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Am', time=0))
        events = []
        for t, v in sorted(part.cc.items()):
            events.append((t, 1, mido.Message('control_change', channel=part.channel, control=part.ctrl,
                                              value=max(0, min(127, v)))))
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


def write_midis(out_dir: str | None = None) -> dict[str, str]:
    """Builds and writes both versions; returns {version: path}."""
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
        print(f"\n[{v}] {'track':<14} {'sfz':<62} {'notes':>5}  range used")
        for name, part in parts.items():
            keys = sfz_keys(SFZ_OF[v][name])
            bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
            if bad:
                raise SystemExit(f'{v} {name}: notes outside {SFZ_OF[v][name]}: {bad}')
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'  {name:<14} {"/".join(part.lib)[-62:]:<62} {len(part.notes):>5}  '
                  f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})')
        last = max(n.end for p in parts.values() for n in p.notes)
        first = min(n.start for p in parts.values() for n in p.notes)
        check(f'{v}: 1  everything inside 0-{sec(LOOP_END):.3f} s', first >= 0 and last < LOOP_END,
              f'last note-off {sec(last):.3f} s')
        for (label, a, b), limit in zip(SECTIONS, LAYER_LIMITS[v]):
            worst, where = sounding(parts, tick(a), tick(b + 1))
            check(f'{v}: 7  layers {label} <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
        top = max(n.vel for p in parts.values() for n in p.notes)
        cc_top = max((val for p in parts.values() if p.ctrl == 1 for val in p.cc.values()), default=0)
        check(f'{v}: 9  velocity <= {TOP_VEL[v]}, CC1 <= {TOP_CC1[v]}',
              top <= TOP_VEL[v] and cc_top <= TOP_CC1[v], f'{top} / {cc_top}')
        step_ok = all(b - a >= CC_STEP for p in parts.values() for a, b in zip(sorted(p.cc), sorted(p.cc)[1:]))
        check(f'{v}: 10 CC points at most every eighth', step_ok)
        for name, part in parts.items():
            if part.ctrl == 1:
                check(f'{v}: 10 {name} CC1 at tick 0', 0 in part.cc)
            if name in MAX_NOTE_S:
                worst = max(sec(n.end - n.start) for n in part.notes)
                check(f'{v}: 10 {name} notes <= {MAX_NOTE_S[name]} s', worst <= MAX_NOTE_S[name],
                      f'longest {worst:.2f} s')
    for name in COMMON_NAMES:
        a = [(n.pitch, n.start, n.end, n.vel) for n in scores['explora'][name].notes]
        b = [(n.pitch, n.start, n.end, n.vel) for n in scores['combate'][name].notes]
        same_cc = scores['explora'][name].cc == scores['combate'][name].cc
        check(f'5  common layer {name} identical in both versions', a == b and same_cc, f'{len(a)} notes')
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
