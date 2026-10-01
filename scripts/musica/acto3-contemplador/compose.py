"""El Contemplador's boss theme «Mirada del abismo / Caos cromático»: score generator
(brief: docs/musica/acto3-contemplador.md).

Writes build/acto3-contemplador.mid: 47 bars at 140 bpm in four metres (4/4, 7/8, 4/4, 5/4), 188 beats
= 80.571 s, one MIDI track per instrument and role. Game id `cap3-e1-jefe`.

The two approved sketches (scripts/musica/leitmotivs/acto3_jefes.py `contemplador_abismo` at 140 bpm and
`contemplador_caos` at 150, played here at 140) are kept whole and joined into one form:

    intro (pluck arpeggio, reverse swell) → verse (djent riff with holes, growls on the accents) →
    verse II → chorus (Bm–G–D–C, the motif on the supersaw and the low choir) → dead stop (only the
    vocal fry and a glitch) → half-time breakdown (every accent drops a sub) → «Caos» in 7/8 (the
    sidechain-pumped supersaw pad, the pluck in sevens) → half-time with the choir crying the motif →
    climax (the chorus with the motif an octave up, then backwards over the chords backwards) →
    blast and tom fall → 5/4 glitch storm whose riser lands on the loop's downbeat.

The building blocks are the sketches' and the Laberinto's (scripts/musica/acto3-laberinto/compose.py):
the chug (root, plus fifth and octave on an accent, on `Guitar`, doubled note for note on `Guitar 2`,
the root an octave down on `Bass`), riffs written as 16-character strings (x accent, o single chug,
. hole), the stutter (one note retriggered n times per beat while CC1 opens the filter).

Leitmotif «Fractura» in B (B4 C5 F#4 F4 B4 D5 C#5 G4): head in augmentation (intro), fragment with holes
(verse II), exposition (chorus), augmentation of its first half (breakdown), one note per 7/8 bar (Caos),
the choir cries it (half time), at the octave (climax) and backwards (climax peak, bar 39); the storm's
riff is the head again (three beats of B, two of C).

Humanization is seeded by track name and written position: the band ±4 ms, the synths ±2 ms, choirs and
growl ±8 ms; the FX are exact (the riser must end on the loop point). The Saw Pad's sidechain pumping in
the 7/8 is a fader ride: `pump_points()` hands it to mix.py.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-contemplador/compose.py
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

# ── time grid and meter map ──────────────────────────────────────────────────
TPB = 480
BPM = 140
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
METERS = [(1, 21, 4.0, (4, 4)), (22, 29, 3.5, (7, 8)), (30, 43, 4.0, (4, 4)), (44, 47, 5.0, (5, 4))]
BARS = 47
BAR_BEAT: dict[int, float] = {}
_at = 0.0
for _first, _last, _beats, _ in METERS:
    for _b in range(_first, _last + 1):
        BAR_BEAT[_b] = _at
        _at += _beats
BAR_BEAT[BARS + 1] = _at
TOTAL_BEATS = _at                                   # 188
LOOP_END = int(round(TOTAL_BEATS * TPB))
BAR_LINES = {int(round(b * TPB)) for b in BAR_BEAT.values()}
CC_STEP = TPB // 2                                  # at most one CC point per eighth
GUARD = 12                                          # ticks a note stops before a bar line it does not cross
SEED = 'acto3-contemplador'
OUT = os.path.join(HERE, 'build', 'acto3-contemplador.mid')
TOP_VEL = 124
TOP_CC = {'sonatina': 110, 'filter': 120}


def T(bar: int, beat: float = 0.0) -> int:
    """Tick of `beat` (from 0) inside `bar`."""
    return int(round((BAR_BEAT[bar] + beat) * TPB))


def B(beats: float) -> int:
    return int(round(beats * TPB))


def ms(x: float) -> int:
    return int(round(x / 1000 / SEC_PER_TICK))


def seconds_to_ticks(s: float) -> int:
    return int(round(s / SEC_PER_TICK))


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


def chord(names: str) -> list[int]:
    return [P(x) for x in names.split()]


def name_of(p: int) -> str:
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p % 12] + str(p // 12 - 1)


# ── instruments: one track per instrument and role ───────────────────────────
GUITAR_SFZ = ('electric-guitar-FSBS-dist1', 'EGuitarFSBS-dist1 bridge 20220911.sfz')
SSO = 'Sonatina Symphonic Orchestra/Chorus - Performance/'


def syn(name):
    return ('dracs-synths', name + '.sfz')


# (track, library, controller: 'sonatina' = CC1 dynamics, 'filter' = CC1 opens a filter, None = velocity)
LAYOUT = [
    ('Guitar', GUITAR_SFZ, None),
    ('Guitar 2', GUITAR_SFZ, None),
    ('Bass', ('electric-bass-YR', 'PickedBassYR 20190930.sfz'), None),
    ('Drums', ('virtuosity_drums', 'Programs/01-basic-kit.sfz'), None),
    ('Sub', syn('sub-bass'), None),
    ('Drop', syn('sub-drop'), None),
    ('Saw Lead', syn('supersaw-lead'), 'filter'),
    ('Saw Pad', syn('supersaw-pad'), 'filter'),
    ('Pluck', syn('pluck-sweep'), 'filter'),
    ('Glitch', syn('supersaw-lead'), 'filter'),
    ('Growl', syn('growl'), None),
    ('Choir', ('sso', SSO + 'Mixed Chorus.sfz'), 'sonatina'),
    ('Choir Low', ('sso', SSO + 'Large Chorus.sfz'), 'sonatina'),
    ('FX', syn('fx'), None),
]
SFZ_OF = {name: library(*lib) for name, lib, _ in LAYOUT}
BAND = {'Guitar', 'Guitar 2', 'Bass', 'Drums'}
SYNTHS = {'Sub', 'Drop', 'Saw Lead', 'Saw Pad', 'Pluck', 'Glitch'}
EXACT = {'FX'}
HUMAN_TICKS = {'band': ms(4), 'synth': ms(2), 'voice': ms(8), 'exact': 0}
HUMAN_VEL = {'band': 4, 'synth': 3, 'voice': 5, 'exact': 0}
OVERLAP = (ms(10.8), ms(29.5))                      # legato overlap, 10-30 ms
UNPITCHED = {'Drums', 'FX'}
KICK, SNARE, CRASH, RIDE, CRASH2 = 36, 38, 49, 51, 57
TOMS = [50, 48, 47, 45, 43, 41]
DRUM_LEN = 96
RISER, DOWNLIFTER, IMPACT, SWELL = 60, 61, 62, 63
RISER_TICKS = seconds_to_ticks(4.0)                 # the riser sample lasts 4.0 s
SWELL_TICKS = seconds_to_ticks(2.0)                 # the reverse swell, 2.0 s


def kind(name: str) -> str:
    if name in BAND:
        return 'band'
    if name in SYNTHS:
        return 'synth'
    if name in EXACT:
        return 'exact'
    return 'voice'


# ── score model ──────────────────────────────────────────────────────────────
@dataclass
class Note:
    pitch: int
    ws: int
    dur: int
    vel: int
    legato: bool = False
    cap: int | None = None
    start: int = 0
    end: int = 0

    @property
    def we(self) -> int:
        return self.ws + self.dur


@dataclass
class Part:
    name: str
    lib: tuple
    ctrl: str | None
    channel: int
    notes: list[Note] = field(default_factory=list)
    phrases: list[tuple[list[tuple[int, int]], str]] = field(default_factory=list)
    cc: dict[int, int] = field(default_factory=dict)

    def note(self, ws: int, pitch, dur: int, vel: float, **kw) -> Note:
        n = Note(P(pitch), int(ws), int(dur), int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def phrase(self, points, shape='lin'):
        """CC1 breakpoints [(tick, value)] of one phrase."""
        self.phrases.append(([(int(t), int(round(v))) for t, v in points], shape))

    def build_cc(self):
        """Phrases -> CC1 points on the eighth grid: interpolated inside a phrase, held between phrases
        and moved within one grid step before the next one starts, with a point at tick 0."""
        if not self.phrases:
            return
        out: dict[int, int] = {}
        for i, (pts, shape) in enumerate(sorted(self.phrases, key=lambda ph: ph[0][0][0])):
            pts = sorted(pts)
            first = (pts[0][0] // CC_STEP) * CC_STEP
            if i == 0:
                out[0] = pts[0][1]
            else:
                last_t = max(out)
                if first - CC_STEP > last_t:
                    out[first - CC_STEP] = out[last_t]
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
        for t in sorted(out):
            if out[t] != last or t == 0:
                self.cc[t] = out[t]
                last = out[t]


def new_parts() -> dict[str, Part]:
    parts, ch = {}, 0
    for name, lib, ctrl in LAYOUT:
        if name == 'Drums':
            channel = 9
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, lib, ctrl, channel)
    return parts


# ── material ─────────────────────────────────────────────────────────────────
B1, C2, D2, F2, G2 = P('B1'), P('C2'), P('D2'), P('F2'), P('G2')
FRACTURA_B = chord('B4 C5 F#4 F4 B4 D5 C#5 G4')     # «Fractura» a minor third down, in B
FRACTURA_LOW = [p - 12 for p in FRACTURA_B]         # the sketch's register for the supersaw
ARP = chord('B3 F#4 C4 B4 D4 F#4 C4 F4')            # the pluck arpeggio of «Mirada del abismo»
SEVEN = chord('B3 C4 F#4 F4 D4 C4 B4')              # the pluck in sevens of «Caos cromático»
B5B9 = chord('B2 F#3 C4')                           # B5 with the b9: the eye's chord
CLUSTER = chord('B2 C3')
# chorus: (guitar root, pad voicing, sub note); the climax plays it forward, then backwards
CHORUS = [(B1, chord('B2 D3 F#3'), P('B1')), (G2, chord('G2 B2 D3'), P('G1')),
          (D2, chord('D3 F#3 A3'), P('D2')), (C2, chord('C3 E3 G3'), P('C2'))]
RETRO = CHORUS[::-1]

VERSE = {5: 'x.oxo.x..xo.x.o.', 6: 'x.ox..xo.x.xo.x.', 7: 'x.oxo.x..xo.x.o.', 8: 'x..x..x.x..xxoxo',
         9: 'x.ox.ox..x.ox.o.', 10: 'x.ox..xo.x.xo.x.', 11: 'x.oxo.x..xo.xo.o', 12: 'x..x..x.x.x.xxxx'}
ANSWER_BARS = {6, 8, 10, 12}                        # the b2 answers in the last beat
BREAKDOWN = {18: 'x..x..x.....x.x.', 19: 'x..x..x.........', 20: 'x..x..x...x.x.x.', 21: 'x.x.x...x.x.x.xx'}
HALFTIME = {30: 'x..x..x.....x.x.', 31: 'x..x..x.........', 32: 'x.x..x..x.x..x..', 33: 'x..x..x...x.xxxx'}

PUMP: list[tuple[float, float]] = []                # Saw Pad sidechain, filled by caos()


def drum(s, ws, pitch, vel):
    s['Drums'].note(ws, pitch, DRUM_LEN, vel)


def bar_line_after(ws: int) -> int:
    return min(t for t in BAR_LINES if t > ws)


def chug(s, ws, dur, root, vel, power=True, g2=None, bass=True, bass_vel=None, cap=None):
    """The root (+ fifth and octave on an accent) on `Guitar`, doubled note for note on `Guitar 2`,
    and the root an octave down (if it fits, else at pitch) on `Bass`. Never rings over a bar line."""
    dur = min(dur, bar_line_after(ws) - ws)
    for name, v in (('Guitar', vel), ('Guitar 2', g2 if g2 is not None else vel - 6)):
        for k in ([0, 7, 12] if power else [0]):
            s[name].note(ws, root + k, dur, v - (6 if k else 0), cap=cap)
    if bass:
        s['Bass'].note(ws, root - 12 if root - 12 >= 26 else root, dur,
                       bass_vel if bass_vel is not None else vel - 10, cap=cap)


def riff(s, bar, pattern, root_of, vel=116, dur=.22, kick=True, drops=None):
    """A riff of 16 characters: x accent (power chord), o single chug (soft layer), . hole; kick with
    each hit; `drops` = (velocity of the first, of the others) puts a sub drop on every accent."""
    first = True
    for k, c in enumerate(pattern):
        if c == '.':
            continue
        acc = c == 'x'
        ws = T(bar, k / 4)
        root = root_of(k)
        chug(s, ws, B(dur), root, vel if acc else vel - 22, power=acc, cap=None if acc else 92)
        if kick:
            drum(s, ws, KICK, 114 if acc else 98)
        if drops and acc:
            nxt = next((j for j in range(k + 1, 16) if pattern[j] == 'x'), 16)
            s['Drop'].note(ws, root, min(T(bar, nxt / 4), T(bar + 1)) - ws, drops[0] if first else drops[1])
            first = False


def stutter(s, track, ws, beats, pitch, rate, vel, cc):
    """Glitch: the same note `rate` times per beat (each 0.6 of its step) while CC1 opens the filter."""
    step = TPB / rate
    for k in range(int(round(beats * rate))):
        s[track].note(ws + int(round(k * step)), pitch, int(round(step * .6)), vel)
    s[track].phrase([(ws, cc[0]), (ws + B(beats), cc[1])])


def line(s, track, bar, items, vel, legato=True, shift=0):
    """Consecutive notes from the downbeat of `bar` across bar lines: items = [(pitch, beats)]."""
    t = T(bar)
    for pitch, beats in items:
        s[track].note(t, P(pitch) + shift, B(beats), vel, legato=legato)
        t += B(beats)


def halves(pitches):
    return [(p, 2) for p in pitches]


# ── sections ─────────────────────────────────────────────────────────────────
def landing(s, bar, vel=120):
    """The downbeat hit the riser (or the stop) lands on: impact, sub drop, crash, one power chord."""
    ws = T(bar)
    chug(s, ws, B(.6), B1, vel)
    drum(s, ws, KICK, 118)
    drum(s, ws, CRASH, 116)
    s['FX'].note(ws, IMPACT, B(3), 118)
    s['Drop'].note(ws, B1, B(3.5), 116)


def swell_into(s, bar, vel=110):
    """The reverse swell, placed to end on the downbeat of `bar`."""
    s['FX'].note(T(bar) - SWELL_TICKS, SWELL, SWELL_TICKS, vel)


def intro(s):
    landing(s, 1)
    for k in range(64):
        s['Pluck'].note(T(1, k / 4), ARP[k % 8], B(.3), 70 + 20 * (k % 4 == 0))
    s['Pluck'].phrase([(T(1), 20), (T(4, 3.5), 100)])
    for bar in (1, 3):
        for p in B5B9:
            s['Saw Pad'].note(T(bar), p, B(8), 90 + 2 * (bar == 3))
    s['Saw Pad'].phrase([(T(1), 50), (T(4, 3.5), 70)])
    s['Growl'].note(T(1, 2), P('B2'), B(6), 70)
    for bar in (3, 4):                               # the pulse arrives, half time
        s['Sub'].note(T(bar), B1, B(3.9), 96)
        drum(s, T(bar), KICK, 104)
        drum(s, T(bar, 1.5), KICK, 86)
        drum(s, T(bar, 2), SNARE, 104)
    drum(s, T(3), CRASH2, 90)
    drum(s, T(4, 3.5), KICK, 92)
    s['Saw Lead'].note(T(3), 'B3', B(4), 96)          # the head in augmentation
    s['Saw Lead'].note(T(4), 'C4', B(4), 98)
    s['Saw Lead'].phrase([(T(3), 50), (T(4, 3.5), 62)])
    stutter(s, 'Glitch', T(4, 3), 1, P('B4'), 8, 96, (30, 110))
    swell_into(s, 5)


def verse(s):
    for bar, pattern in VERSE.items():
        root_of = (lambda k: C2 if k >= 12 else B1) if bar in ANSWER_BARS else (lambda k: B1)
        riff(s, bar, pattern, root_of)
        for beat in (1, 3):
            drum(s, T(bar, beat), SNARE, 118)
        drum(s, T(bar), CRASH2, 96)
        for beat in (1, 2, 3):
            drum(s, T(bar, beat), RIDE, 78)
        s['Sub'].note(T(bar), B1, B(3.9), 100)
        if bar % 2 == 1:
            s['Drop'].note(T(bar), B1, B(3), 110)
        for k in (0, 6, 12):
            if pattern[k] == 'x':
                s['Growl'].note(T(bar, k / 4), P('B2'), B(.45), 104)
    for k in range(64):                              # verse: the arpeggio under the riff
        s['Pluck'].note(T(5, k / 4), ARP[k % 8], B(.25), 56)
    for k in range(64):                              # verse II: the sevens over the 4/4 (foreshadows Caos)
        s['Pluck'].note(T(9, k / 4), SEVEN[k % 7], B(.25), 60 + 14 * (k % 7 == 0))
    s['Pluck'].phrase([(T(5), 84), (T(8, 3.5), 84)])
    s['Pluck'].phrase([(T(9), 88), (T(12, 3.5), 100)])
    s['Saw Pad'].phrase([(T(5), 70), (T(12, 3.5), 70)])
    # verse II: the motif in pieces, the glitch answers in the holes
    s['Saw Lead'].note(T(9), 'B3', B(2), 100)
    s['Saw Lead'].note(T(9, 2), 'C4', B(2), 102)
    s['Saw Lead'].note(T(11), 'F#3', B(2), 100)
    s['Saw Lead'].note(T(11, 2), 'F3', B(2), 98)
    s['Saw Lead'].phrase([(T(9), 64), (T(11, 3.5), 80)])
    stutter(s, 'Glitch', T(10, 3), 1, P('B3'), 8, 94, (30, 100))
    stutter(s, 'Glitch', T(12, 3), 1, P('B4'), 8, 98, (40, 115))
    for k in range(4):                               # snare roll into the chorus
        drum(s, T(12, 3 + k / 4), SNARE, 96 + 7 * k)


def chorus_bars(s, first, chords, climax=False):
    for i, (root, pad, sub) in enumerate(chords):
        bar = first + i
        for e in range(8):
            chug(s, T(bar, e / 2), B(.5), root, 110 if e % 2 == 0 else 96, bass_vel=100)
        for k in range(16):
            drum(s, T(bar, k / 4), KICK, 96 + 10 * (k % 4 == 0))
        for beat in (1, 3):
            drum(s, T(bar, beat), SNARE, 120)
        drum(s, T(bar), CRASH, 104)
        for beat in (1, 2, 3):
            drum(s, T(bar, beat), CRASH2, 88)
        for p in pad:
            s['Saw Pad'].note(T(bar), p, B(4), 96)
            s['Choir'].note(T(bar), p + 12, B(4), 86)
        s['Sub'].note(T(bar), sub, B(3.9), 104)


def chorus(s):
    chorus_bars(s, 13, CHORUS)
    s['Drop'].note(T(13), B1, B(3), 112)
    line(s, 'Saw Lead', 13, halves(FRACTURA_LOW), 108)
    line(s, 'Choir Low', 13, halves(FRACTURA_LOW), 100)
    s['Saw Lead'].phrase([(T(13), 60), (T(16, 3.5), 96)])
    s['Choir Low'].phrase([(T(13), 94), (T(16, 3.5), 100)])
    s['Choir'].phrase([(T(13), 88), (T(16, 3.5), 96)])
    s['Saw Pad'].phrase([(T(13), 80), (T(16, 3.5), 84)])


def stop(s):
    ws = T(17)
    chug(s, ws, B(.6), B1, 124)
    drum(s, ws, KICK, 120)
    drum(s, ws, CRASH, 120)
    s['FX'].note(ws, IMPACT, B(3), 120)
    s['Drop'].note(ws, B1, B(3.5), 120)
    s['Growl'].note(T(17, 1), P('A#2'), B(2.5), 96)   # the vocal fry, alone
    stutter(s, 'Glitch', T(17, 3), 1, P('B3'), 12, 100, (20, 100))
    swell_into(s, 18, 120)


def breakdown(s):
    for bar, pattern in BREAKDOWN.items():
        root = C2 if bar == 21 else B1
        riff(s, bar, pattern, lambda k: root, vel=122, dur=.3, drops=(122, 100))
        drum(s, T(bar, 2), SNARE, 124)
        for beat in range(4):
            drum(s, T(bar, beat), CRASH2, 98)
        s['Growl'].note(T(bar), P('B2'), B(.8), 112)
        s['Growl'].note(T(bar, 1.5), P('B2'), B(.6), 104)
        for p in CLUSTER:
            s['Saw Pad'].note(T(bar), p, B(4), 100)
    line(s, 'Choir Low', 18, [(p, 4) for p in FRACTURA_LOW[:4]], 104)
    s['Choir Low'].phrase([(T(18), 96), (T(21, 3.5), 108)])
    s['Saw Pad'].phrase([(T(18), 76), (T(21, 3.5), 80)])


def caos(s):
    """«Caos cromático» in 7/8 (2+2+3): the pad pumps against every group."""
    for i, bar in enumerate(range(22, 30)):
        stop_bar = bar == 29
        for g in ([0] if stop_bar else [0, 1, 2]):
            t = T(bar, g)
            root = C2 if (bar == 25 and g == 2) else B1
            chug(s, t, B(.35), root, 118)
            drum(s, t, KICK, 116)
            chug(s, t + B(.5), B(.2), root, 92, power=False, cap=92)
            drum(s, t + B(.5), KICK, 96)
            if bar == 28 and g == 0:                 # one more chug: the riff stumbles
                chug(s, t + B(.25), B(.2), root, 90, power=False, cap=92)
                drum(s, t + B(.25), KICK, 92)
            if g == 2:                               # the flick at the end of the long group
                chug(s, t + B(1), B(.2), root + (1 if bar == 27 else 6), 100, power=False)
            beat = BAR_BEAT[bar] + g + 1             # MixSpec positions: 1-based beats
            PUMP.extend([(beat, 0.0), (beat + .001, -16.0), (beat + .45, 0.0)])
        if not stop_bar:
            drum(s, T(bar, 1), SNARE, 118)
            drum(s, T(bar, 2.5), SNARE, 112)
            s['Growl'].note(T(bar), P('B2'), B(.4), 106)
        for k in range(7):
            s['Pluck'].note(T(bar, k / 2), SEVEN[k], B(.4), 74 + 16 * (k == 0))
            drum(s, T(bar, k / 2), CRASH2 if k == 0 else RIDE, 92 if k == 0 else 74)
        for p in B5B9:
            s['Saw Pad'].note(T(bar), p, B(3.5), 104)
        s['Saw Lead'].note(T(bar), FRACTURA_LOW[i], B(3.5), 104, legato=True)
        s['Sub'].note(T(bar), B1, B(3.4), 100)
        if stop_bar:
            drum(s, T(bar), CRASH, 120)
            s['FX'].note(T(bar), IMPACT, B(3), 116)
            stutter(s, 'Glitch', T(bar, 1.5), 2, P('F4'), 6, 100, (30, 120))
    s['Saw Lead'].phrase([(T(22), 60), (T(29, 3), 100)])
    s['Pluck'].phrase([(T(22), 80), (T(29, 3), 104)])
    s['Saw Pad'].phrase([(T(22), 84), (T(29, 3), 90)])


def halftime(s):
    for bar, pattern in HALFTIME.items():
        riff(s, bar, pattern, lambda k: B1, vel=122, dur=.3)
        drum(s, T(bar, 2), SNARE, 124)
        for beat in range(4):
            drum(s, T(bar, beat), CRASH2, 98)
        s['Drop'].note(T(bar), B1, B(3.5), 122)
        s['Growl'].note(T(bar), P('B2'), B(1.2), 114)
        for p in CLUSTER:
            s['Saw Pad'].note(T(bar), p, B(4), 104)
            s['Choir Low'].note(T(bar), p, B(4), 96)
    line(s, 'Choir', 30, halves(FRACTURA_LOW), 108)
    s['Choir'].phrase([(T(30), 100), (T(33, 3.5), 106)])
    s['Choir Low'].phrase([(T(30), 94), (T(33, 3.5), 98)])
    s['Saw Pad'].phrase([(T(30), 78), (T(33, 3.5), 82)])


def climax(s):
    chorus_bars(s, 34, CHORUS)
    chorus_bars(s, 38, RETRO)
    s['Drop'].note(T(34), B1, B(3), 114)
    s['Drop'].note(T(38), C2, B(3), 116)
    s['Drop'].note(T(39), D2, B(3), 122)
    drum(s, T(39), CRASH2, 110)
    s['FX'].note(T(39), IMPACT, B(3), 120)
    for k in range(4):                               # snare roll into the blast
        drum(s, T(41, 3 + k / 4), SNARE, 100 + 6 * k)
    line(s, 'Saw Lead', 34, halves(FRACTURA_B) + halves(FRACTURA_B[::-1]), 110)
    line(s, 'Choir Low', 34, halves(FRACTURA_LOW) + halves(FRACTURA_LOW[::-1]), 104)
    # one peak: bar 39, the D5 of the retrograde
    s['Saw Lead'].phrase([(T(34), 80), (T(38, 3.5), 104), (T(39), 112), (T(41, 3.5), 96)])
    s['Choir Low'].phrase([(T(34), 96), (T(38, 3.5), 106), (T(39), 110), (T(41, 3.5), 100)])
    s['Choir'].phrase([(T(34), 94), (T(38, 3.5), 102), (T(39), 106), (T(41, 3.5), 98)])
    s['Saw Pad'].phrase([(T(34), 86), (T(41, 3.5), 92)])


def blast(s):
    for k in range(24):                              # bar 42 on B, beats 1-2 of bar 43 on C
        bar, pos = (42, k) if k < 16 else (43, k - 16)
        ws = T(bar, pos / 4)
        root = B1 if k < 16 else C2
        chug(s, ws, B(.2), root, 112)
        drum(s, ws, KICK, 110)
        drum(s, ws, SNARE, 100 + 4 * (pos % 4 == 0))
        if pos % 2 == 0:
            drum(s, ws, CRASH2, 90)
    for e in range(4):                               # beats 3-4 of bar 43: F under the tom fall
        ws = T(43, 2 + e / 2)
        chug(s, ws, B(.4), F2, 110)
        drum(s, ws, KICK, 108)
    for i, tom in enumerate(TOMS):
        drum(s, T(43, 2 + i / 3), tom, 108 + 2 * i)
    stutter(s, 'Glitch', T(42), 4, P('B3'), 4, 96, (20, 110))


def storm(s):
    """5/4 (3+2): three beats of B, two of C (the head), the sub and pad climb by semitones, the glitch
    storm speeds up and the riser ends exactly on the loop point."""
    for j, bar in enumerate(range(44, 48)):
        for k in range(20):
            ws = T(bar, k / 4)
            root = B1 if k < 12 else C2
            power = (k % 4 == 0) if j < 2 else ((k % 2 == 0) if j == 2 else True)
            chug(s, ws, B(.2), root, 104 + 10 * (k % 4 == 0), power=power)
            drum(s, ws, KICK, 104 + 6 * (k % 4 == 0))
            if j == 3:
                drum(s, ws, SNARE, 90 + 1.6 * k)
            elif j == 2 and k % 2 == 0:
                drum(s, ws, SNARE, 98 + k)
        if j < 2:
            for beat in (1, 3):
                drum(s, T(bar, beat), SNARE, 116)
        for beat in range(5):
            drum(s, T(bar, beat), CRASH2, 88)
        for k in (0, 12):
            s['Growl'].note(T(bar, k / 4), P('B2'), B(.45), 106)
        s['Sub'].note(T(bar), B1 + j, B(4.9), 100)
        for p in (P('B2') + j, P('F#3') + j):
            s['Saw Pad'].note(T(bar), p, B(5), 104)
        stutter(s, 'Glitch', T(bar), 5, P('B4'), [4, 4, 6, 8][j], 96 + 4 * j, (10 + 28 * j, 38 + 28 * j))
    drum(s, T(44), CRASH, 114)
    for p in CLUSTER:
        s['Choir Low'].note(T(44), p, B(20), 96)
    s['Choir Low'].phrase([(T(44), 80), (T(47, 4.5), 104)])
    s['Saw Pad'].phrase([(T(44), 70), (T(47, 4.5), 100)])
    s['FX'].note(LOOP_END - RISER_TICKS, RISER, RISER_TICKS, 112)


SECTIONS = (intro, verse, chorus, stop, breakdown, caos, halftime, climax, blast, storm)


# ── performance: humanization by position, legato, bar lines ─────────────────
def perform(part: Part):
    k = kind(part.name)
    h = HUMAN_TICKS[k]
    unique: dict[tuple[int, int], Note] = {}          # the same hit written twice (a roll over a backbeat): keep the louder
    for n in part.notes:
        key = (n.ws, n.pitch)
        if key not in unique or n.vel > unique[key].vel:
            unique[key] = n
    part.notes = sorted(unique.values(), key=lambda n: (n.ws, n.pitch))
    for n in part.notes:
        rng = random.Random(f'{SEED}:{part.name}:{n.ws}')
        shift = 0 if not h else (rng.randint(0, h) if n.ws == 0 else rng.randint(-h, h))
        n.start = max(0, n.ws + shift)
        n.end = n.start + n.dur
        hv = HUMAN_VEL[k]
        if hv:
            n.vel += random.Random(f'{SEED}:{part.name}:{n.ws}:{n.pitch}:v').randint(-hv, hv)
        n.vel = max(1, min(TOP_VEL, n.cap if n.cap is not None else TOP_VEL, n.vel))
    starts: dict[int, list[Note]] = {}
    for n in part.notes:
        starts.setdefault(n.ws, []).append(n)
    for n in part.notes:
        nxt = starts.get(n.we, [])
        if any(m.pitch == n.pitch for m in nxt):
            n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
        elif n.legato and nxt:
            lo, hi = OVERLAP
            n.end = min(m.start for m in nxt) + random.Random(f'{SEED}:{part.name}:{n.ws}:legato').randint(lo, hi)
        elif n.we in BAR_LINES:
            n.end = min(n.end, n.we - GUARD)          # leaves the bar line free
        n.end = min(n.end, LOOP_END - GUARD)
    by_pitch: dict[int, Note] = {}
    for n in sorted(part.notes, key=lambda n: n.start):
        prev = by_pitch.get(n.pitch)
        if prev is not None and prev.end > n.start - 6:
            prev.end = n.start - 6
        by_pitch[n.pitch] = n
    part.build_cc()
    if part.ctrl:
        part.cc = {t: max(0, min(TOP_CC[part.ctrl], v)) for t, v in part.cc.items()}


def build() -> dict[str, Part]:
    PUMP.clear()
    s = new_parts()
    for section in SECTIONS:
        section(s)
    for part in s.values():
        perform(part)
    return s


def pump_points() -> list[tuple[float, float]]:
    """The Saw Pad's sidechain pumping in the 7/8, as MixSpec automation (1-based beats, dB)."""
    if not PUMP:
        build()
    return list(PUMP)


def write_midi(parts: dict[str, Part], path: str):
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        events = []
        if i == 0:
            events.append((0, 0, mido.MetaMessage('set_tempo', tempo=TEMPO)))
            events.append((0, 0, mido.MetaMessage('key_signature', key='Bm')))
            for first, _, _, (num, den) in METERS:
                events.append((T(first), 0, mido.MetaMessage('time_signature', numerator=num, denominator=den)))
        for t, v in sorted(part.cc.items()):
            events.append((t, 1, mido.Message('control_change', channel=part.channel, control=1, value=v)))
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


def write_midi_file(path: str = OUT) -> str:
    write_midi(build(), path)
    return path


# ── verification ─────────────────────────────────────────────────────────────
def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack' for k in range(r.lokey, r.hikey + 1)}


def verify(parts: dict[str, Part]) -> bool:
    ok = True
    print(f"{'track':<10} {'sfz':<52} {'notes':>5}  range used")
    for name, part in parts.items():
        keys = sfz_keys(SFZ_OF[name])
        bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
        if bad:
            raise SystemExit(f'{name}: notes outside {SFZ_OF[name]}: {bad}')
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        print(f'  {name:<10} {"/".join(part.lib)[-52:]:<52} {len(part.notes):>5}  {name_of(lo)}-{name_of(hi)} ({lo}-{hi})')
    held = [(name, n.pitch) for name, p in parts.items() if name not in UNPITCHED
            for n in p.notes if n.pitch > 77 and n.end - n.start >= TPB - 30]
    last = max(n.end for p in parts.values() for n in p.notes)
    for label, good, detail in (
            ('nothing held above F5', not held, str(held[:3])),
            ('everything inside the loop', last <= LOOP_END, f'last note-off {last * SEC_PER_TICK:.3f} s'),
            ('velocity <= 124', max(n.vel for p in parts.values() for n in p.notes) <= TOP_VEL, '')):
        ok &= good
        print(f"  {label:<40} {'OK' if good else 'FAIL'} {detail}")
    seconds = TOTAL_BEATS * 60 / BPM
    print(f'  loop: {TOTAL_BEATS:.0f} beats = {seconds:.3f} s = {round(seconds * 44100)} samples at 44.1 kHz')
    return ok


def main():
    parts = build()
    write_midi(parts, OUT)
    ok = verify(parts)
    print(f'written {OUT}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
