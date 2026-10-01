"""«La Cripta» — «Nana para los que no duermen»: score generator (brief: docs/musica/acto2-cripta.md).

One song in two synchronized versions, written from a single description of form, harmony and
reference melody:
    build/acto2-cripta-explora.mid   (map and events)
    build/acto2-cripta-combate.mid   (normal and elite fights)
Both: 24 bars of 4/4 at 72 bpm (80.000 s), one MIDI track per instrument and articulation. The
common layers (`Low Trem` with its CC1, `Bell`, `Gong`, `Col Legno Vc`) come from the same functions
with the same per-track seed, so they are identical tick for tick and the game's linear crossfade
sums them in phase.

The leitmotiv «Sombra» (D E F G# | A F E C# | D F A Bb A | D) becomes «the lullaby» in A minor: the
D# is the augmented sixth of the German sixth (F7) that resolves to E7; A' sequences it to the
subdominant (back to the original pitch, in D, over Bb7 = German sixth of D minor); B states its head
in F lydian and in augmentation x2 (the tritone becomes the #11); the bridge climbs the head through
the diminished axis A-C-Eb-F#; the return reharmonizes the arrival A-C-E over Fmaj7 (the climax).

The bowed vibraphone speaks late: its quarter-or-longer notes are written 120 ms early and its eighths
80 ms early (+6 velocity), as the brief asks (section 6, sample notes). The glass swell starts 150 ms
before bar 6.

Prints a verification table and exits with status 1 if a check fails; a note outside its
instrument's range aborts the build.

Deliberate deviations from the brief (all to keep the voice leading clean or to honour section 8):
- Passing bass notes on beat 2 (Low Trem, Basses Quiet, Basses Spic): C in bar 5 (A-C-Bb-E) and G in
  bar 10 (C-G-Bb). With the brief's A-Bb and C-Bb the bass moves in parallel fifths (E5-F5 over A-Bb)
  and parallel octaves (C5-Bb4 over C-Bb) with the tune.
- Choir voicings revoiced where the brief's moved in parallels with the bass, the tune or the
  countermelodies (or sat below the bass in combat, criterion 12):
  bar 4 beat 3 B2 D3 E3 (not G#2 B2 D3: G#-A octaves with the tune); bar 5 the A2 stops on beat 2 and
  the Neapolitan is Bb2 D3 (A-E -> Bb-F fifths, E-F octaves with the tune); bar 7 beat 3 Bb2 D3 F3
  (the Ab2 sat below the bass in combat and moved in octaves with the lament; the lament carries the
  Ab); bar 8 G2 C#3 F3 / A2 C#3 E3 (the F is the b13 of the cifrado and avoids the Mozart fifths
  Bb-F -> A-E; the G2 sat below the bass in combat); bar 16 beat 3 C3 Eb3 G3 (G2-Bb2 over C2-Eb2 is
  fifths); bar 18 beat 3 B2 D3 F3 (A2-G#2 octaves with the tune); bar 19 beat 3 A2 C3 F3 (E3-D#3
  octaves with the countermelody); bar 20 beat 3 B2 E3; bar 21 as bar 5, with B2 D3 E3 on beat 4.
- Combat timpani: where the brief's note would sound below the bass on beat 1 or 3 (criterion 12),
  the fifth goes up an octave (E3 in bars 1, 2, 6 and 8, F3 in bar 5) and bar 11 takes A2 instead of F2
  (the chord is F(add9)/A).
- Combat B pad (`Violas Trem`), bar 13 beat 3: Bb3 D4 instead of G3 D4 (A3-G3 under the horns'
  A4-G4 is parallel octaves).
- Codetta harp, bar 24: E2 B2 G#3 (the brief's E1 B1 lie below the harp floor of criterion 2, 32).
- Combat horns: CC1 84 -> 98 in the bridge (the brief's 100 would tie the climax of bar 21) and the
  countermelody's A3 of bar 22 held for a half note (section 6: «Notas <= h.»).
- Alto flute legato overlaps stay inside 10-30 ms like every other line (the brief says 40 ms).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-cripta/compose.py
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
T3 = BEAT // 3                                       # triplet eighth
BAR = 4 * BEAT
BARS = 24
LOOP_END = BARS * BAR
BPM = 72
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per eighth (1/8 bar)
HUMAN_TICKS = int(0.008 / SEC_PER_TICK)              # +-8 ms
HUMAN_VEL = 6
SEED = 'acto2-cripta'
GUARD = 12                                           # ticks a note stops before a bar line it does not cross
VERSIONS = ('explora', 'combate')
OUT = {v: os.path.join(HERE, 'build', f'acto2-cripta-{v}.mid') for v in VERSIONS}
TOP_VEL = {'explora': 80, 'combate': 100}            # section 7 ceilings
TOP_CC1 = {'explora': 90, 'combate': 105}
TRACK_CAP = {'Vibes Bowed': 64, 'Glass': 40, 'Celesta': 48, 'Xylophone': 60, 'Col Legno Vn': 70}


def ms(x: float) -> int:
    return int(round(x / 1000 / SEC_PER_TICK))


VIB_EARLY_LONG = ms(120)                             # the bow needs time to make the bar speak
VIB_EARLY_SHORT = ms(80)
GLASS_EARLY = ms(150)
OVERLAP = (ms(11), ms(29))                           # legato overlap, 10-30 ms

SECTIONS = [('Intro', 1, 2), ('A', 3, 6), ("A'", 7, 10), ('B', 11, 14), ('Bridge', 15, 18),
            ('Return', 19, 22), ('Codetta', 23, 24)]
LAYER_LIMITS = {'explora': [6, 8, 8, 6, 8, 10, 7], 'combate': [8, 11, 12, 7, 11, 12, 9]}


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


# (track name, library path, controller that shapes it: 1 = Sonatina CC1, 11 = CC11, None = velocity)
COMMON = [
    ('Low Trem', sso('Strings - Performance/Basses Tremolo'), 1),
    ('Bell', vcsl('Idiophones/Struck Idiophones/Tubular Bells 1'), None),
    ('Gong', vcsl('Idiophones/Struck Idiophones/Gong 1'), None),
    ('Col Legno Vc', sso('Strings - Performance/Celli Col Legno'), None),
]
SHARED = [
    ('Choir', sso('Chorus - Performance/Mixed Chorus'), 1),
    ('Piano Cluster', vcsl('Chordophones/Zithers/Upright Piano, Knight'), None),
    ('Timpani', vsco('Timpani'), None),
    ('Timp Roll', vsco('TimpaniRolls'), 11),
]
LAYOUT = {
    'explora': COMMON + [
        ('Vibes Bowed', vcsl('Idiophones/Struck Idiophones/Vibraphone - Bowed'), None),
        ('Alto Flute', sso('Woodwinds - Performance/Alto Flute Solo Sustain'), 1),
        ('Bass Clarinet', sso('Woodwinds - Performance/Bass Clarinet Solo Sustain'), 1),
        ('Cello Solo', sso('Strings - Performance/Cello Solo Sustain'), 1),
        ('Celesta', sso('Percussion/Celeste'), None),
        ('Harp', vcsl('Chordophones/Composite Chordophones/Concert Harp'), None),
        ('Basses', vsco('ContrabassSusVB'), 11),
        ('Basses Quiet', vsco('ContrabassSusVB-Quiet'), 11),
        ('Glass', vcsl('Idiophones/Friction Idiophones/Wine Glasses - Slow'), None),
        ('Hand Chimes', vcsl('Idiophones/Struck Idiophones/Hand Chimes'), None),
    ] + SHARED,
    'combate': COMMON + [
        ('Horns', sso('Brass - Performance/Horns Sustain'), 1),
        ('Trombones', sso('Brass - Performance/Trombones Sustain (looped)'), 1),
        ('Violins', vsco('ViolinEnsSusVib'), 11),
        ('Violins Trem', vsco('ViolinEnsTrem'), 11),
        ('Violas Trem', vsco('ViolaEnsTrem'), 11),
        ('Xylophone', vcsl('Idiophones/Struck Idiophones/Xylophone - Soft Mallets'), None),
        ('Cellos Spic', vsco('CelloEnsSpic'), None),
        ('Basses Spic', vsco('ContrabassSpic'), None),
        ('Col Legno Vn', sso('Strings - Performance/1st Violins Col Legno'), None),
        ('Choir Melody', sso('Chorus - Performance/Mixed Chorus'), 1),
        ('Bass Drum', vcsl('Membranophones/Struck Membranophones/Bass Drum 2'), 11),
    ] + SHARED,
}
SFZ_OF = {v: {name: library(*lib) for name, lib, _ in LAYOUT[v]} for v in VERSIONS}
COMMON_NAMES = tuple(name for name, _, _ in COMMON)
UNPITCHED = {'Gong', 'Bass Drum'}
MAX_NOTE_S = {'Alto Flute': 2.8, 'Bass Clarinet': 2.5, 'Horns': 2.8, 'Vibes Bowed': 9.0, 'Glass': 20.0,
              'Basses': 6.0, 'Basses Quiet': 6.0, 'Violins': 8.5, 'Violins Trem': 7.0, 'Violas Trem': 7.0,
              'Timp Roll': 16.0}
GONG = 61                                            # Gong 1, the dark hit (-46 dB in 2.5-6 kHz)
GLASS = 75                                           # Wine Glasses - Slow: its untransposed D#5 sample
BD_HIT, BD_ROLL = 62, 63


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
    phrases: list[tuple[list[tuple[int, int]], str]] = field(default_factory=list)
    cc: dict[int, int] = field(default_factory=dict)

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), vel, **kw)
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
            v = vels[min(k, len(vels) - 1)]               # one velocity per attack (ties use none)
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
    'Am(add9)': (9, (0, 3, 7, 2)), 'Fmaj7(#11)': (5, (0, 4, 7, 11, 6)), 'E7(b9)': (4, (0, 4, 7, 10, 1)),
    'Am': (9, (0, 3, 7)), 'F7': (5, (0, 4, 7, 10)), 'E7(b13)': (4, (0, 4, 7, 10, 8)), 'E7': (4, (0, 4, 7, 10)),
    'Bb': (10, (0, 4, 7)), 'Am7': (9, (0, 3, 7, 10)), 'Dm': (2, (0, 3, 7)), 'Bb7': (10, (0, 4, 7, 10)),
    'A7(b13)': (9, (0, 4, 7, 10, 8)), 'A7': (9, (0, 4, 7, 10)), 'Dm9': (2, (0, 3, 7, 10, 2)),
    'G7': (7, (0, 4, 7, 10)), 'Cmaj7': (0, (0, 4, 7, 11)), 'C7': (0, (0, 4, 7, 10)), 'F(add9)': (5, (0, 4, 7, 2)),
    'Bb6': (10, (0, 4, 7, 9)), 'E7sus4': (4, (0, 5, 7, 10)), 'Cm': (0, (0, 3, 7)), 'Ebm': (3, (0, 3, 7)),
    'F#ø7': (6, (0, 3, 6, 10)), 'F7(#11)': (5, (0, 4, 7, 10, 6)), 'Dm7': (2, (0, 3, 7, 10)),
    'Fmaj7': (5, (0, 4, 7, 11)), 'Bbmaj7': (10, (0, 4, 7, 11)),
}
# bar: 'chord[/bass] | beat chord[/bass] ...'   (F7 = German sixth of A minor, Bb7 = German sixth of D)
HARMONY_SRC = {
    1: 'Am(add9)', 2: 'Fmaj7(#11)/A | 3 E7(b9)/G#',
    3: 'Am | 3 F7', 4: 'E7(b13) | 3 E7', 5: 'Am | 3 Bb | 4 E7', 6: 'Am | 3 Am7/G',
    7: 'Dm/F | 3 Bb7', 8: 'A7(b13) | 3 A7', 9: 'Dm9 | 3 G7', 10: 'Cmaj7 | 3 C7/Bb',
    11: 'F(add9)/A', 12: 'Fmaj7(#11)', 13: 'Dm9 | 3 Bb6', 14: 'E7sus4 | 3 E7(b9)',
    15: 'Am', 16: 'Cm', 17: 'Ebm', 18: 'F#ø7 | 3 E7(b9)',
    19: 'Am(add9) | 3 F7(#11)', 20: 'Dm7/F | 3 E7(b9)/G#', 21: 'Fmaj7 | 3 Bb | 4 E7', 22: 'Am | 3 Dm/A',
    23: 'Am | 3 Bbmaj7/A', 24: 'E7sus4 | 3 E7(b9)',
}
PCS = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'B': 11}


def _parse_harmony():
    out = {}
    for bar, src in HARMONY_SRC.items():
        segs = []
        for i, chunk in enumerate(src.split('|')):
            words = chunk.split()
            beat = 1.0 if i == 0 else float(words.pop(0))
            sym, _, bass = words[0].partition('/')
            segs.append((beat, sym, PCS[bass] if bass else CHORDS[sym][0]))
        out[bar] = segs
    return out


HARMONY = _parse_harmony()


def chord_at(bar: int, beat: float) -> tuple[str, int]:
    """(chord symbol, bass pitch class) sounding at that beat."""
    sym, bass = HARMONY[bar][0][1], HARMONY[bar][0][2]
    for b, s, ba in HARMONY[bar]:
        if b <= beat + 1e-9:
            sym, bass = s, ba
    return sym, bass


def chord_pcs(sym: str) -> set[int]:
    root, ivs = CHORDS[sym]
    return {(root + i) % 12 for i in ivs}


def nearest_tone(sym: str, target: float, lo: int, hi: int, exclude=()) -> int:
    tones = [p for p in range(lo, hi + 1) if p % 12 in chord_pcs(sym) and p not in exclude]
    return min(tones, key=lambda p: (abs(p - target), p))


# The written bass line: section 4's bracket plus two passing notes on beat 2 (bars 5 and 10).
BASS_LINE = {
    1: [('A1', 4)], 2: [('A1', 2), ('G#1', 2)], 3: [('A1', 2), ('F1', 2)], 4: [('E1', 4)],
    5: [('A1', 1), ('C2', 1), ('Bb1', 1), ('E1', 1)], 6: [('A1', 2), ('G1', 2)],
    7: [('F1', 2), ('Bb1', 2)], 8: [('A1', 4)], 9: [('D2', 2), ('G1', 2)], 10: [('C2', 1), ('G1', 1), ('Bb1', 2)],
    11: [('A1', 4)], 12: [('F1', 4)], 13: [('D2', 2), ('Bb1', 2)], 14: [('E1', 4)],
    15: [('A1', 4)], 16: [('C2', 4)], 17: [('Eb2', 4)], 18: [('F#1', 2), ('E1', 2)],
    19: [('A1', 2), ('F1', 2)], 20: [('F1', 2), ('G#1', 2)], 21: [('F1', 2), ('Bb1', 1), ('E1', 1)],
    22: [('A1', 4)], 23: [('A1', 4)], 24: [('E1', 4)],
}


def bass_note_at(bar: int, beat: float) -> int:
    pos = 1.0
    for p, beats in BASS_LINE[bar]:
        if pos <= beat + 1e-9 < pos + beats:
            return P(p)
        pos += beats
    return P(BASS_LINE[bar][-1][0])


def bass_items(bars, shift=0):
    return [(P(p) + shift, b) for bar in bars for p, b in BASS_LINE[bar]]


# ── reference melody (section 5): identical pitches and attacks in both versions ──
NANA = [('A4', .5), ('B4', .5), ('C5', 1), ('D#5', 1.5), ('E5', .5), ('C5', 1), ('B4', 1), ('G#4', 2),
        ('A4', .5), ('C5', .5), ('E5', 1), ('F5', 1), ('E5', 1), ('A4', 3)]
REF = {
    'head1': (1, [('A2', 1), ('B2', 1), ('C3', 1), ('D#3', 1), ('E3', 2)]),     # augmentation, low
    'nana3': (3, NANA),                                                          # exposition in A minor
    'seq7': (7, [('D5', .5), ('E5', .5), ('F5', 1), ('G#5', 1.5), ('A5', .5), ('F5', 1), ('E5', 1),
                 ('C#5', 2)]),                                                   # «Sombra» at its own pitch
    'cons9': (9, [('F5', 1.5), ('E5', .5), ('D5', 1), ('B4', 1), ('C5', 2), ('Bb4', 1), ('G4', 1)]),
    'lyd11': (11, [('F4', 1), ('G4', 1), ('A4', 2), ('B4', 3), ('C5', 1), ('A4', 2), ('G4', 2),
                   ('E4', 4)]),                                                  # F lydian, augmentation x2
    'axis15': (15, [('A3', 1), ('B3', 1), ('C4', 1), ('D#4', 1), ('C4', 1), ('D4', 1), ('Eb4', 1),
                    ('F#4', 1)]),                                                # head on the diminished axis
    'axis17': (17, [('Eb4', 1), ('F4', 1), ('Gb4', 1), ('A4', 1), ('F#4', .5), ('G#4', .5), ('A4', 1),
                    ('G#4', 2)]),
    'nana19': (19, NANA),                                                        # reharmonized return
    'head23': (23, [('A4', .5), ('B4', .5), ('C5', 3)]),                         # the head that does not end
    'lament7': (7, [('A3', 2), ('Ab3', 2), ('G3', 2), ('G3', 2), ('F3', 2), ('F3', 2), ('E3', 2),
                    ('Bb2', 2)]),
    'counter19': (19, [('E4', 2), ('Eb4', 2), ('D4', 2), ('D4', 2), ('C4', 2), ('D4', 1), ('G#3', 1),
                       ('A3', 3)]),
    'link24': (24, [('E3', 2), ('G#2', 2)]),
}


def contour(key: str, base: int, spread: int = 6, end_drop: int = 3) -> list[int]:
    """Velocities that draw the phrase: higher notes a little louder, metric weight (beat 1 > 3 >
    2/4 > off-beats) and a softer last note."""
    _, items = REF[key]
    pitches = [P(p) for p, _ in items]
    lo, hi = min(pitches), max(pitches)
    out, pos = [], 0.0
    for p, beats in items:
        x = (P(p) - lo) / (hi - lo) if hi > lo else 0.5
        b = pos % 4
        metric = 3 if b == 0 else 1 if b == 2 else -2 if b % 1 else 0
        out.append(base + int(round(spread * (x - 0.5) * 2)) + metric)
        pos += beats
    out[-1] -= end_drop
    return out


def play(part: Part, key: str, vels, shift: int = 0, legato: bool = True, cut: dict[int, float] | None = None,
         hv: int = HUMAN_VEL, cap: int | None = None, early: bool = False, peak: int | None = None) -> list[Note]:
    """Writes a reference-melody window into a track (shift = declared octave doubling, cut = beats
    taken off a note's end, early = the bowed vibraphone's anticipation, peak = index of the climax
    note, played exactly at its velocity)."""
    bar, items = REF[key]
    vels = vels if isinstance(vels, list) else [vels] * len(items)
    t, notes = tick(bar), []
    for i, ((p, beats), v) in enumerate(zip(items, vels)):
        length = int(round(beats * BEAT))
        dur = length - int(round((cut or {}).get(i, 0) * BEAT))
        ahead = (VIB_EARLY_LONG if beats >= 1 else VIB_EARLY_SHORT) if early else 0
        n = Note(P(p) + shift, t, dur, v, legato=legato and dur == length, hv=0 if i == peak else hv,
                 cap=None if i == peak else cap, early=ahead, tag='mel')
        part.notes.append(n)
        notes.append(n)
        t += length
    return notes


# ── common layers (identical in both versions) ───────────────────────────────
LOW_TREM = [   # section 6, one note per chord, common tones tied (Basses Tremolo is looped)
    ('A2', 6), ('G#2', 2),
    ('A2', 2), ('F2', 2), ('E2', 4), ('A2', 1), ('C3', 1), ('Bb2', 1), ('E2', 1), ('A2', 2), ('G2', 2),
    ('F2', 2), ('Bb2', 2), ('A2', 4), ('D3', 2), ('G2', 2), ('C3', 1), ('G2', 1), ('Bb2', 2),
    ('A2', 4), ('F2', 4), ('D3', 2), ('Bb2', 2), ('E2', 4),
    ('A1', 4), ('C2', 4), ('Eb2', 4), ('F#2', 2), ('E2', 2),
    ('A2', 2), ('F2', 4), ('G#2', 2), ('F2', 2), ('Bb2', 1), ('E2', 1), ('A2', 8),
    ('E2', 4),
]


def common_layers(s):
    lt = s['Low Trem']
    lt.line(1, 1, LOW_TREM, [58 + (3, -1, 1, -2, 2, 0, -3)[i % 7] for i in range(len(LOW_TREM))], tie=True)
    lt.phrase([(1, 1, 48), (2, 4.5, 55)])
    lt.phrase([(3, 1, 50), (5, 1, 62), (6, 4.5, 52)])
    lt.phrase([(7, 1, 52), (9, 1, 62), (10, 4.5, 54)])
    lt.phrase([(11, 1, 45), (12, 3, 48), (14, 4.5, 45)])
    lt.phrase([(15, 1, 55), (18, 4.5, 85)], shape='lin')                  # the slab moves: crescendo
    lt.phrase([(19, 1, 62), (20, 4.5, 78), (21, 1, 80), (22, 4.5, 58)])
    lt.phrase([(23, 1, 50), (24, 4.5, 45)])
    bell = s['Bell']                               # one-shots (30 s release): short notes ring on
    for bar, p, v in ((1, 'A4', 48), (11, 'F4', 44), (19, 'A4', 60), (23, 'E4', 42)):
        bell.add(bar, 1, p, .75, v, hv=2)
    gong = s['Gong']
    gong.add(6, 3, GONG, 2, 40, hv=2)
    gong.add(19, 1, GONG, 2, 52, hv=2)
    legno = s['Col Legno Vc']                      # bone rattles: triplet eighths on beat 4
    for bar, pitches, vels in ((4, ('E3', 'F3', 'F#3'), (50, 46, 42)), (6, ('A2', 'Bb2', 'B2'), (50, 46, 42)),
                               (8, ('Bb2', 'B2', 'C#3'), (50, 46, 42)), (20, ('E2', 'F2', 'F#2'), (54, 50, 46))):
        for k, (p, v) in enumerate(zip(pitches, vels)):
            legno.notes.append(Note(P(p), tick(bar, 4) + k * T3, T3 - 10, v, hv=2))


# ── shared material ──────────────────────────────────────────────────────────
CHOIR = [   # low voices, 43-55 (male samples, a whisper); revoiced where the brief moved in parallels
    (3, 1, ['A2', 'C3', 'E3'], 2), (3, 3, ['A2', 'C3', 'D#3'], 2),
    (4, 1, ['G#2', 'C3', 'D3'], 2), (4, 3, ['B2', 'D3', 'E3'], 2),
    (5, 1, ['A2', 'C3', 'E3'], 1), (5, 2, ['C3', 'E3'], 1), (5, 3, ['Bb2', 'D3'], 1), (5, 4, ['G#2', 'B2', 'D3'], 1),
    (6, 1, ['A2', 'C3', 'E3'], 2), (6, 3, ['G2', 'C3', 'E3'], 2),
    (7, 1, ['A2', 'D3', 'F3'], 2), (7, 3, ['Bb2', 'D3', 'F3'], 2),
    (8, 1, ['G2', 'C#3', 'F3'], 2), (8, 3, ['A2', 'C#3', 'E3'], 2),
    (9, 1, ['A2', 'C3', 'F3'], 2), (9, 3, ['B2', 'D3', 'F3'], 2),
    (10, 1, ['B2', 'E3', 'G3'], 2), (10, 3, ['Bb2', 'E3', 'G3'], 2),
    (15, 1, ['A2', 'C3', 'E3'], 4),
    (16, 1, ['G2', 'C3', 'Eb3'], 2), (16, 3, ['C3', 'Eb3', 'G3'], 2),
    (17, 1, ['Bb2', 'Eb3', 'Gb3'], 4),
    (18, 1, ['A2', 'C3', 'F#3'], 2), (18, 3, ['B2', 'D3', 'F3'], 2),
    (19, 1, ['A2', 'C3', 'E3'], 2), (19, 3, ['A2', 'C3', 'F3'], 2),
    (20, 1, ['A2', 'C3', 'D3'], 2), (20, 3, ['B2', 'E3'], 2),
    (21, 1, ['A2', 'C3', 'E3'], 1), (21, 2, ['C3', 'E3'], 1), (21, 3, ['Bb2', 'D3'], 1), (21, 4, ['B2', 'D3', 'E3'], 1),
    (22, 1, ['A2', 'C3', 'E3'], 2), (22, 3, ['A2', 'D3', 'F3'], 2),
    (23, 1, ['A2', 'C3', 'E3'], 2), (23, 3, ['A2', 'D3', 'F3'], 2),
    (24, 1, ['A2', 'B2', 'D3'], 2), (24, 3, ['G#2', 'B2', 'D3', 'F3'], 2),
]


def choir_voices(part: Part):
    """The same voices in both versions; only the CC1 differs."""
    part.chords([c for c in CHOIR if c[0] <= 10], 62)
    part.chords([c for c in CHOIR if 15 <= c[0] <= 18], 64)
    part.chords([c for c in CHOIR if c[0] >= 19], 63)


def piano_cluster(part: Part, vels):
    """The slab: A1 + Bb1 on beat 1 of bar 15, a 2 s note (the only cluster of the loop)."""
    for p, v in zip(('A1', 'Bb1'), vels):
        part.notes.append(Note(P(p), tick(15), ms(2000), v, hv=2))


# ── exploration ──────────────────────────────────────────────────────────────
HARP_4 = {   # four plucks per bar: beat 1, «2 and», beat 3, «4 and» (the intro pattern, section 6)
    1: ('A1', 'E2', 'C3', 'E3'), 2: ('A1', 'E3', 'G#1', 'B2'),
    3: ('A1', 'E2', 'F2', 'D#3'), 4: ('E2', 'C3', 'G#3', 'D4'), 5: ('A1', 'C3', 'Bb1', 'G#2'),
    6: ('A1', 'E2', 'G2', 'E3'),
    7: ('F2', 'A2', 'Bb1', 'Ab2'), 8: ('A1', 'F2', 'C#3', 'G3'), 9: ('D2', 'A2', 'G2', 'B2'),
    10: ('C2', 'G2', 'Bb1', 'E3'),
}
HARP_B = {   # B: a low chord rolled in eighths from beat 1, then one high note on beat 3
    11: (['A1', 'F2', 'C3', 'G3'], 'A5'), 12: (['F2', 'C3', 'E3', 'A3'], 'G5'),
    13: (['D2', 'A2', 'E3', 'F3'], 'F5'), 14: (['E2', 'B2', 'D3', 'A3'], 'E5'),
}
HARP_EIGHTHS = {   # bridge (rising through the chord, <= 60) and return (<= 64)
    15: ['A1', 'E2', 'A2', 'C3', 'E2', 'A2', 'C3', 'E3'], 16: ['C2', 'G2', 'C3', 'Eb3', 'G2', 'C3', 'Eb3', 'G3'],
    17: ['Eb2', 'Bb2', 'Eb3', 'Gb3', 'Bb2', 'Eb3', 'Gb3', 'Bb3'], 18: ['F#2', 'C3', 'E3', 'A3', 'E2', 'B2', 'D3', 'G#3'],
    19: ['A1', 'E2', 'A2', 'B2', 'F2', 'C3', 'Eb3', 'A3'], 20: ['F2', 'A2', 'C3', 'D3', 'G#1', 'E2', 'B2', 'D3'],
    21: ['F2', 'C3', 'E3', 'A3', 'Bb1', 'F2', 'E2', 'G#2'], 22: ['A1', 'E2', 'A2', 'C3', 'A1', 'D2', 'F2', 'A2'],
}


def harp_four(s, bar, base):
    h = s['Harp']
    for (beat, length), p, lift in zip(((1, 1), (2.5, .5), (3, .5), (4.5, .5)), HARP_4[bar], (6, 0, 2, -1)):
        h.add(bar, beat, p, length, base + lift)


def explora_intro(s):
    """Bars 1-2: Am(add9) | Fmaj7(#11)/A - E7(b9)/G#. The head crawls under the slabs."""
    bcl = s['Bass Clarinet']
    play(bcl, 'head1', [50, 52, 55, 58, 54])
    bcl.phrase([(1, 1, 50), (1, 4, 62), (2, 1, 60), (2, 2.5, 52)])     # grows to the D#, dies on the E
    bq = s['Basses Quiet']
    bq.line(1, 1, bass_items([1, 2]), [32, 31], tie=True)
    bq.phrase([(1, 1, 88), (2, 4.5, 94)])
    harp_four(s, 1, 42)
    harp_four(s, 2, 43)


def explora_a(s):
    """Bars 3-6: Am - F7 (German sixth) | E7(b13) - E7 | Am - Bb - E7 | Am - Am/G. The lullaby."""
    vib = s['Vibes Bowed']
    base = [50, 51, 53, 56, 55, 54, 52, 50, 50, 52, 55, 58, 55, 52]
    play(vib, 'nana3', [b + (6 if beats == .5 else 0) for b, (_, beats) in zip(base, NANA)],
         early=True, hv=2, cap=62)
    ch = s['Choir']
    ch.phrase([(3, 1, 40), (5, 1, 55), (6, 4.5, 42)])
    bq = s['Basses Quiet']
    bq.line(3, 1, bass_items(range(3, 7)), [34, 33, 35, 34, 36, 33, 35, 34, 33], tie=True)
    bq.phrase([(3, 1, 92), (5, 1, 100), (6, 4.5, 92)])
    for bar, base_v in zip(range(3, 7), (46, 48, 50, 45)):
        harp_four(s, bar, base_v)
    s['Glass'].notes.append(Note(GLASS, tick(6) - GLASS_EARLY, BAR + GLASS_EARLY - GUARD, 38, jitter=False, hv=0))


def explora_a2(s):
    """Bars 7-10: Dm/F - Bb7 | A7(b13) - A7 | Dm9 - G7 | Cmaj7 - C7/Bb. The echo, which modulates to F."""
    fl = s['Alto Flute']
    play(fl, 'seq7', [60, 62, 64, 68, 70, 66, 64, 62], cut={7: .5})     # breath before the consequent
    play(fl, 'cons9', [64, 62, 62, 60, 62, 58, 56])
    fl.phrase([(7, 1, 64), (7, 3, 74), (8, 1, 84), (8, 3, 78), (9, 1, 76), (10, 1, 72), (10, 4.5, 66)])
    cel = s['Celesta']                                                 # the three ghosts, nothing more
    cel.add(7, 1.5, 'E6', .5, 44, hv=2)
    cel.add(7, 4.5, 'A5', .5, 40, hv=2)
    cel.add(8, 3, 'C#6', 1, 46, hv=2)
    bcl = s['Bass Clarinet']
    play(bcl, 'lament7', [50, 49, 48, 47, 47, 46, 46, 44])
    bcl.phrase([(7, 1, 58), (8, 1, 66), (8, 3, 70), (9, 3, 66), (10, 4.5, 60)])
    s['Choir'].phrase([(7, 1, 45), (8, 3, 60), (10, 4.5, 48)])
    bq = s['Basses Quiet']
    bq.line(7, 1, bass_items(range(7, 11)), [35, 34, 36, 35, 34, 36, 34, 35, 33], tie=True)
    bq.phrase([(7, 1, 92), (9, 1, 100), (10, 4.5, 88)])
    for bar, base_v in zip(range(7, 11), (44, 47, 45, 43)):
        harp_four(s, bar, base_v)


def explora_b(s):
    """Bars 11-14 (the chapel, F lydian): F(add9)/A | Fmaj7(#11) | Dm9 - Bb6 | E7sus4 - E7(b9)."""
    vc = s['Cello Solo']
    play(vc, 'lyd11', [52, 54, 56, 58, 57, 55, 53, 50])
    vc.phrase([(11, 1, 58), (12, 1, 68), (12, 3, 72), (13, 1, 66), (14, 1, 60), (14, 4.5, 55)])
    vib = s['Vibes Bowed']                                             # the halo, above the cello
    for bar, beat, p, beats, v in ((11, 1, 'E5', 8, 38), (13, 1, 'F5', 2, 40), (13, 3, 'D5', 6, 36)):
        vib.add(bar, beat, p, beats, v, legato=True, early=VIB_EARLY_LONG, hv=2, cap=40)
    h = s['Harp']
    for bar, (low, high) in HARP_B.items():
        for k, (p, v) in enumerate(zip(low, (46, 42, 43, 42))):
            h.add(bar, 1 + k / 2, p, .5, v - (bar == 14) * 2)
        h.add(bar, 3, high, .5, 48 - (bar - 11), hv=2)
    hc = s['Hand Chimes']
    hc.add(13, 1, 'C5', .75, 42, hv=2)
    hc.add(14, 3, 'B4', .75, 42, hv=2)


def explora_bridge(s):
    """Bars 15-18: Am | Cm | Ebm | F#ø7 - E7(b9). The slab moves: the head climbs the diminished axis."""
    bcl = s['Bass Clarinet']
    play(bcl, 'axis15', [56, 57, 58, 60, 60, 61, 62, 64])
    bcl.phrase([(15, 1, 60), (16, 4.5, 72)], shape='lin')
    fl = s['Alto Flute']
    play(fl, 'axis17', [62, 64, 66, 68, 68, 70, 72, 70])
    fl.phrase([(17, 1, 68), (18, 3, 86), (18, 4.5, 82)])
    piano_cluster(s['Piano Cluster'], (54, 50))
    s['Choir'].phrase([(15, 1, 45), (18, 4.5, 78)], shape='lin')
    cb = s['Basses']
    cb.line(15, 1, bass_items(range(15, 19)), [50, 56, 62, 68, 72])
    cb.phrase([(15, 1, 80), (18, 4.5, 118)], shape='lin')
    h = s['Harp']
    for i, (bar, notes) in enumerate((b, HARP_EIGHTHS[b]) for b in range(15, 19)):
        for k, p in enumerate(notes):
            h.add(bar, 1 + k / 2, p, .5, 44 + int(round(22 * (8 * i + k) / 31)) + (3 if k in (0, 4) else 0))
    roll = s['Timp Roll']
    roll.add(17, 1, 'Eb2', 4, 48, hv=2)
    roll.add(18, 1, 'E2', 4, 56, hv=2)
    roll.phrase([(17, 1, 38), (18, 4.5, 108)], shape='lin')


def explora_return(s):
    """Bars 19-22: Am(add9) - F7(#11) | Dm7/F - E7(b9)/G# | Fmaj7 (climax) - Bb - E7 | Am - Dm/A."""
    fl, vib = s['Alto Flute'], s['Vibes Bowed']
    play(fl, 'nana19', [70, 71, 72, 74, 73, 74, 72, 71, 76, 74, 74, 74, 72, 68], peak=8)
    fl.phrase([(19, 1, 76), (20, 1, 80), (20, 4.5, 86), (21, 1, 88), (21, 3, 84), (22, 1, 76), (22, 3.5, 70)])
    vbase = [54, 55, 56, 58, 56, 58, 56, 55, 64, 56, 60, 60, 57, 50]
    play(vib, 'nana19', [b + (6 if beats == .5 and i != 8 else 0) for i, (b, (_, beats)) in enumerate(zip(vbase, NANA))],
         early=True, hv=2, cap=62, peak=8)
    vc = s['Cello Solo']
    play(vc, 'counter19', [60, 59, 60, 59, 64, 62, 60, 56])
    vc.phrase([(19, 1, 66), (20, 1, 70), (20, 4.5, 78), (21, 1, 80), (21, 3, 76), (22, 1, 66), (22, 3.5, 60)])
    s['Choir'].phrase([(19, 1, 55), (21, 1, 70), (22, 4.5, 50)])
    cb = s['Basses']
    cb.line(19, 1, bass_items(range(19, 23)), [70, 72, 74, 78, 74, 72, 64], tie=True)
    cb.phrase([(19, 1, 104), (20, 4.5, 112), (21, 1, 118), (22, 4.5, 88)])
    h = s['Harp']
    for bar in range(19, 23):
        top = {19: 54, 20: 56, 21: 60, 22: 52}[bar]
        for k, p in enumerate(HARP_EIGHTHS[bar]):
            h.add(bar, 1 + k / 2, p, .5, top - (k % 4) * 2 + (2 if k == 0 else 0))
    tp = s['Timpani']
    tp.add(19, 1, 'A2', .5, 58, hv=2)
    tp.add(21, 1, 'F2', .5, 72, hv=0)


def explora_codetta(s):
    """Bars 23-24: Am - Bbmaj7/A | E7sus4 - E7(b9). They go back to sleep; the dominant leads to bar 1."""
    vib = s['Vibes Bowed']
    play(vib, 'head23', [46, 44, 40], early=True, hv=2, cap=62)
    bcl = s['Bass Clarinet']
    play(bcl, 'link24', [44, 42])
    bcl.phrase([(24, 1, 52), (24, 4.5, 45)])
    s['Choir'].phrase([(23, 1, 48), (24, 4.5, 40)])
    bq = s['Basses Quiet']
    bq.line(23, 1, bass_items([23, 24]), [30, 28])
    bq.phrase([(23, 1, 90), (24, 4.5, 76)])
    h = s['Harp']
    for k, (p, v) in enumerate(zip(('A1', 'E2', 'C3'), (40, 36, 37))):
        h.add(23, 1 + k / 2, p, .5, v)
    h.add(23, 3, 'Bb2', .5, 36)
    for k, (p, v) in enumerate(zip(('E2', 'B2', 'G#3'), (38, 35, 34))):
        h.add(24, 1 + k / 2, p, .5, v)


# ── combat ───────────────────────────────────────────────────────────────────
OSTINATO = [0, 0, 7, 0, 12, 0, 7, 3]
WAVE8 = [0, 1, -1, 0, 2, -1, 0, 1]


def ostinato_pitch(bar: int, k: int) -> int:
    """The sketch's pattern over the bass of section 4, base in octave 2 (36-47). The «7» and «3» are
    the fifth and the third above the bass when they belong to the chord (always, in root position);
    otherwise the nearest chord tone."""
    sym, bass = chord_at(bar, 1 + k / 2)
    base = 36 + bass % 12
    step = OSTINATO[k]
    if step in (0, 12):
        return base + step
    pcs = chord_pcs(sym)
    if step == 7:
        return base + 7 if (base + 7) % 12 in pcs else nearest_tone(sym, base + 7, base + 1, base + 11)
    thirds = [i for i in (3, 4) if (base + i) % 12 in pcs]
    return base + thirds[0] if thirds else nearest_tone(sym, base + 3.5, base + 1, base + 11)


def cello_ostinato(part, bar, base, slope=0):
    """8 eighths, accents 3+3+2 on eighths 0, 3 and 6 (+14)."""
    for k in range(8):
        acc = k in (0, 3, 6)
        v = base + int(round(slope * k / 7)) + (14 if acc else WAVE8[k])
        part.notes.append(Note(ostinato_pitch(bar, k), t16(bar, 2 * k), E8 - 24, v, hv=3, tag='ost'))


def cello_eighths_b(part, bar, vel=56):
    """B: the fundamental (even eighths) and its fifth (odd eighths) in 41-53, no accents."""
    for k in range(8):
        sym, bass = chord_at(bar, 1 + k / 2)
        low = 41 + (bass - 5) % 12
        if k % 2 == 0:
            p = low
        else:
            p = nearest_tone(sym, low + 7, 41, 53, exclude=(low,)) if low + 7 <= 53 else low - 5
        part.notes.append(Note(p, t16(bar, 2 * k), E8 - 24, vel + WAVE8[k], hv=2, tag='ost'))


def basses_spic(part, bar, vel):
    """The fundamental in octave 1 on eighths 0, 3 and 6 only (the bass line, passing notes included)."""
    for k in (0, 3, 6):
        part.notes.append(Note(bass_note_at(bar, 1 + k / 2), t16(bar, 2 * k), E8 - 24, vel + (4 if k == 0 else 0),
                               hv=3, tag='ost'))


def legno_pitch(bar: int, pos: int) -> int:
    """The chord's fifth in 55-64; when it falls outside, the nearest chord tone inside."""
    sym, _ = chord_at(bar, 1 + pos / 4)
    root, ivs = CHORDS[sym]
    fifth = (root + next(i for i in (7, 6, 8) if i in ivs)) % 12        # the diminished fifth of F#ø7
    inside = [p for p in range(55, 65) if p % 12 == fifth]
    if inside:
        return inside[0]
    target = min((p for p in range(48, 72) if p % 12 == fifth), key=lambda p: max(55 - p, p - 64))
    return nearest_tone(sym, target, 55, 64)


def legno_offbeats(part, bar, a, b):
    """8 hits on the odd sixteenths (the sketch's off-beat rattle), 0.1 s, alternating velocities."""
    for k, pos in enumerate(range(1, 16, 2)):
        part.notes.append(Note(legno_pitch(bar, pos), t16(bar, pos), ms(100), a if k % 2 == 0 else b, hv=3,
                               cap=70))


def legno_run(part, bar, lo, hi):
    """16 sixteenths in a row, accents 3+3+2+3+3+2, from `lo` to `hi`."""
    for pos in range(16):
        v = lo + int(round((hi - lo) * pos / 15)) + (8 if pos in (0, 3, 6, 8, 11, 14) else 0)
        part.notes.append(Note(legno_pitch(bar, pos), t16(bar, pos), ms(100), min(70, v), hv=2, cap=70))


def combate_intro(s):
    """Bars 1-2: the danse macabre starts at once under the head in the horns."""
    hn = s['Horns']
    play(hn, 'head1', [72, 74, 76, 80, 74])
    hn.phrase([(1, 1, 70), (1, 1.5, 67), (1, 2, 74), (1, 2.5, 71), (1, 3, 78), (1, 3.5, 75), (1, 4, 82),
               (1, 4.5, 79), (2, 1, 80), (2, 2.5, 72)])              # every quarter leans, the E falls
    for bar in (1, 2):
        cello_ostinato(s['Cellos Spic'], bar, 60)
        legno_offbeats(s['Col Legno Vn'], bar, 44, 52)
    tp = s['Timpani']
    for bar, (a, b) in ((1, (64, 54)), (2, (62, 52))):
        tp.add(bar, 1, 'A2', .5, a)
        tp.add(bar, 3, 'E3', .5, b)


def combate_a(s):
    vn, hn = s['Violins'], s['Horns']
    play(vn, 'nana3', [72, 73, 75, 79, 78, 80, 78, 76, 74, 76, 80, 84, 80, 76], hv=3, cap=90)
    vn.phrase([(3, 1, 100), (4, 3, 100), (4, 4, 112), (4, 4.5, 104), (5, 1, 104), (6, 1, 100), (6, 2, 112),
               (6, 3.5, 96)])                                          # < > on the half notes
    play(hn, 'nana3', 76, shift=-12, hv=3)
    hn.phrase([(3, 1, 82), (4, 1, 86), (5, 1, 92), (5, 3, 90), (6, 1, 86), (6, 3.5, 84)])
    s['Choir'].phrase([(3, 1, 60), (5, 1, 80), (6, 4.5, 62)])
    for bar in range(3, 7):
        cello_ostinato(s['Cellos Spic'], bar, 66 + (bar == 5) * 2)
        basses_spic(s['Basses Spic'], bar, 76)
        legno_offbeats(s['Col Legno Vn'], bar, 48, 56)
    tp = s['Timpani']
    for bar, one, three in ((3, 'A2', 'C3'), (4, 'E2', 'B2'), (5, 'A2', 'F3'), (6, 'A2', 'E3')):
        tp.add(bar, 1, one, .5, 74)
        tp.add(bar, 3, three, .5, 62)
    for bar in (3, 5):
        s['Bass Drum'].add(bar, 1, BD_HIT, .5, 62, hv=3)


def combate_a2(s):
    vn = s['Violins']
    play(vn, 'seq7', [80, 81, 83, 86, 88, 90, 86, 84], hv=3, cap=92)
    play(vn, 'cons9', [80, 78, 78, 76, 78, 74, 72], hv=3, cap=90)
    vn.phrase([(7, 1, 98), (8, 1, 116), (9, 1, 106), (10, 4.5, 96)])
    play(s['Xylophone'], 'seq7', [50, 51, 53, 56, 58, 55, 53, 52], legato=False, hv=2, cap=58)
    tb = s['Trombones']
    play(tb, 'lament7', [70, 69, 68, 67, 67, 66, 66, 64])
    tb.phrase([(7, 1, 72), (8, 3, 88), (10, 4.5, 75)])
    s['Choir'].phrase([(7, 1, 62), (8, 3, 85), (10, 4.5, 66)])
    for bar in range(7, 11):
        cello_ostinato(s['Cellos Spic'], bar, 66 + (bar == 8) * 2)
        basses_spic(s['Basses Spic'], bar, 76 + (bar == 8) * 2)
        legno_offbeats(s['Col Legno Vn'], bar, 50, 58)
    tp = s['Timpani']
    for bar, one, three in ((7, 'D2', 'Bb2'), (8, 'A2', 'E3'), (9, 'D2', 'G2'), (10, 'C2', 'Bb2')):
        tp.add(bar, 1, one, .5, 76)
        tp.add(bar, 3, three, .5, 64)
    for bar in (7, 9):
        s['Bass Drum'].add(bar, 1, BD_HIT, .5, 66, hv=3)


VIOLAS_B = [('A3', 8), ('A3', 2), ('Bb3', 2), ('A3', 2), ('G#3', 2)]
VIOLAS_B_HIGH = [('C4', 8), ('C4', 2), ('D4', 6)]


def combate_b(s):
    hn = s['Horns']
    play(hn, 'lyd11', [70, 72, 74, 76, 75, 73, 71, 66], cut={7: 1})   # the E4 for a dotted half
    hn.phrase([(11, 1, 70), (12, 1, 80), (12, 3, 84), (13, 1, 78), (14, 1, 72), (14, 3.5, 66)])
    for bar in range(11, 15):
        cello_eighths_b(s['Cellos Spic'], bar)
    va = s['Violas Trem']
    va.line(11, 1, VIOLAS_B, [36, 35, 37, 36, 35])
    va.line(11, 1, VIOLAS_B_HIGH, [35, 36, 37])
    va.phrase([(11, 1, 84), (12, 3, 90), (14, 4.5, 80)])
    tp = s['Timpani']
    tp.add(11, 1, 'A2', .5, 48)
    tp.add(13, 1, 'D2', .5, 48)
    tp.add(14, 3, 'E2', .5, 46)


def combate_bridge(s):
    tb = s['Trombones']
    play(tb, 'axis15', [74, 75, 76, 78, 78, 79, 80, 82])
    tb.phrase([(15, 1, 78), (16, 4.5, 92)], shape='lin')
    hn, vt = s['Horns'], s['Violins Trem']
    play(hn, 'axis17', [78, 80, 82, 84, 84, 86, 88, 86])
    hn.phrase([(17, 1, 84), (18, 4.5, 98)], shape='lin')
    play(vt, 'axis17', [60, 63, 66, 69, 72, 75, 78, 80], shift=12, hv=2, cap=82)
    vt.phrase([(17, 1, 92), (18, 4.5, 122)], shape='lin')
    piano_cluster(s['Piano Cluster'], (70, 66))
    s['Choir'].phrase([(15, 1, 60), (18, 4.5, 95)], shape='lin')
    for i, bar in enumerate(range(15, 19)):
        cello_ostinato(s['Cellos Spic'], bar, 66 + 4 * i, slope=3)
        basses_spic(s['Basses Spic'], bar, 74 + 4 * i)
    lv = s['Col Legno Vn']
    legno_offbeats(lv, 15, 48, 56)
    legno_offbeats(lv, 16, 50, 58)
    legno_run(lv, 17, 46, 56)
    legno_run(lv, 18, 56, 62)
    roll = s['Timp Roll']
    roll.add(17, 1, 'Eb2', 4, 58, hv=2)
    roll.add(18, 1, 'E2', 4, 70, hv=2)
    roll.phrase([(17, 1, 45), (18, 4.5, 122)], shape='lin')
    bd = s['Bass Drum']
    bd.add(18, 1, BD_ROLL, 4, 74, hv=0)
    bd.phrase([(1, 1, 127), (17, 4.5, 127)])
    bd.phrase([(18, 1, 51), (18, 4.5, 127)], shape='lin')            # 40 % -> 100 %


def combate_return(s):
    vn, cm = s['Violins'], s['Choir Melody']
    play(vn, 'nana19', [84, 85, 86, 89, 88, 88, 87, 86, 96, 92, 92, 92, 90, 82], hv=3, cap=94, peak=8)
    vn.phrase([(19, 1, 104), (20, 4.5, 116), (21, 1, 122), (22, 1, 108), (22, 3.5, 96)])
    play(cm, 'nana19', [72, 72, 74, 76, 74, 74, 72, 72, 80, 76, 76, 76, 74, 70])
    cm.phrase([(19, 1, 85), (20, 1, 90), (20, 4.5, 98), (21, 1, 100), (21, 3, 96), (22, 1, 86), (22, 3.5, 80)])
    hn = s['Horns']
    play(hn, 'counter19', [76, 75, 76, 75, 80, 78, 76, 72], cut={7: 1})
    hn.phrase([(19, 1, 86), (20, 1, 90), (20, 4.5, 98), (21, 1, 100), (21, 3, 96), (22, 1, 86), (22, 3, 80)])
    s['Choir'].phrase([(19, 1, 70), (21, 1, 88), (22, 4.5, 66)])
    for bar in range(19, 23):
        base = {19: 80, 20: 80, 21: 82, 22: 76}[bar]
        cello_ostinato(s['Cellos Spic'], bar, base)
        basses_spic(s['Basses Spic'], bar, {19: 84, 20: 84, 21: 88, 22: 80}[bar])
    lv = s['Col Legno Vn']
    legno_run(lv, 19, 58, 62)
    legno_run(lv, 20, 58, 62)
    legno_run(lv, 21, 60, 62)
    legno_offbeats(lv, 22, 52, 60)
    tp = s['Timpani']
    for bar, beat, p, v in ((19, 1, 'A2', 80), (20, 1, 'F2', 78), (21, 1, 'F2', 96), (21, 3, 'Bb2', 88),
                            (21, 4, 'E2', 84), (22, 1, 'A2', 76)):
        tp.add(bar, beat, p, .5, v, hv=0 if v == 96 else 3, cap=None if v == 96 else 90)
    s['Bass Drum'].add(19, 1, BD_HIT, .5, 74, hv=2)
    s['Bass Drum'].add(21, 1, BD_HIT, .5, 86, hv=0)


def combate_codetta(s):
    hn = s['Horns']
    play(hn, 'head23', [72, 70, 66])
    hn.phrase([(23, 1, 72), (23, 4, 60)])
    play(hn, 'link24', [66, 64])
    hn.phrase([(24, 1, 66), (24, 3, 66), (24, 4.5, 62)])
    cello_ostinato(s['Cellos Spic'], 23, 64)
    cello_ostinato(s['Cellos Spic'], 24, 60)                           # the figure bar 1 starts with
    basses_spic(s['Basses Spic'], 23, 70)
    s['Choir'].phrase([(23, 1, 60), (24, 4.5, 52)])
    for bar in (23, 24):
        legno_offbeats(s['Col Legno Vn'], bar, 40, 46)
    s['Timpani'].add(24, 1, 'E2', .5, 50)


SCORE = {
    'explora': (explora_intro, explora_a, explora_a2, explora_b, explora_bridge, explora_return,
                explora_codetta),
    'combate': (combate_intro, combate_a, combate_a2, combate_b, combate_bridge, combate_return,
                combate_codetta),
}


# ── performance: humanization, legato, bar lines ─────────────────────────────
def perform(part: Part, version: str):
    """Seeded by the track name: a track that exists in both versions with the same notes is
    humanized identically in both (the common layers)."""
    rng = random.Random(f'{SEED}:{part.name}')
    part.notes.sort(key=lambda n: (n.ws, n.pitch))
    phrase_starts = {(min(pts)[0] // CC_STEP) * CC_STEP for pts, _ in part.phrases}
    top = min(TOP_VEL[version], TRACK_CAP.get(part.name, 127))
    shift: dict[int, int] = {}
    for n in part.notes:
        if n.ws not in shift:              # notes written together are played together
            if not n.jitter:
                shift[n.ws] = 0
            elif n.ws == 0 or any(0 <= n.ws - t < CC_STEP for t in phrase_starts):
                shift[n.ws] = rng.randint(0, HUMAN_TICKS)
            elif n.ws % BAR == 0:
                shift[n.ws] = rng.randint(-HUMAN_TICKS // 2, HUMAN_TICKS)
            else:
                shift[n.ws] = rng.randint(-HUMAN_TICKS, HUMAN_TICKS)
        n.start = max(0, n.ws + shift[n.ws] - n.early)
        n.end = n.start + n.dur
        if n.hv:
            n.vel += rng.randint(-n.hv, n.hv)
        n.vel = max(1, min(top, n.cap if n.cap is not None else top, n.vel))
    starts: dict[int, list[Note]] = {}
    for n in part.notes:
        starts.setdefault(n.ws, []).append(n)
    for n in part.notes:
        nxt = starts.get(n.we, [])
        if any(m.pitch == n.pitch for m in nxt):
            n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
        elif n.legato and nxt:
            n.end = min(m.start for m in nxt) + rng.randint(*OVERLAP)        # 10-30 ms overlap
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
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
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
        check(f'{v}: 1  everything inside 0-80.000 s', first >= 0 and sec(last) < 80.0,
              f'last note-off {sec(last):.3f} s')
        for (label, a, b), limit in zip(SECTIONS, LAYER_LIMITS[v]):
            worst, where = sounding(parts, tick(a), tick(b + 1))
            check(f'{v}: 6  layers {label} <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
        top = max(n.vel for p in parts.values() for n in p.notes)
        cc_top = max((val for p in parts.values() if p.ctrl == 1 for val in p.cc.values()), default=0)
        check(f'{v}: 8  velocity <= {TOP_VEL[v]}, CC1 <= {TOP_CC1[v]}',
              top <= TOP_VEL[v] and cc_top <= TOP_CC1[v], f'{top} / {cc_top}')
        step_ok = all(b - a >= CC_STEP for p in parts.values() for a, b in zip(sorted(p.cc), sorted(p.cc)[1:]))
        check(f'{v}:    CC points at most every eighth', step_ok)
        for name, part in parts.items():
            if part.ctrl == 1:
                check(f'{v}: 9  {name} CC1 at tick 0', 0 in part.cc)
            if name in MAX_NOTE_S:
                worst = max(sec(n.end - n.start) for n in part.notes)
                check(f'{v}: 9  {name} notes <= {MAX_NOTE_S[name]} s', worst <= MAX_NOTE_S[name],
                      f'longest {worst:.2f} s')
    for name in COMMON_NAMES:
        a = [(n.pitch, n.start, n.end, n.vel) for n in scores['explora'][name].notes]
        b = [(n.pitch, n.start, n.end, n.vel) for n in scores['combate'][name].notes]
        same_cc = scores['explora'][name].cc == scores['combate'][name].cc
        check(f'4  common layer {name} identical in both versions', a == b and same_cc, f'{len(a)} notes')
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
