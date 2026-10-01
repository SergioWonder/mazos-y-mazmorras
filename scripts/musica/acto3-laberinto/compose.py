"""«El Laberinto del Contemplador» — «Fractura»: score generator (brief: docs/musica/acto3-laberinto.md).

One song in two synchronized versions, written from a single description of form, harmony and
reference melody:
    build/acto3-laberinto-explora.mid   (map and events)
    build/acto3-laberinto-combate.mid   (normal and elite fights)
Both: 24 bars of 4/4 at 70 bpm (82.286 s), one MIDI track per instrument and role. The common layers
(`Choir Pad` with its CC1, `Glasses`, `Celesta`) come from the same functions, so they are identical
tick for tick and the game's linear crossfade sums them in phase.

The approved sketches (scripts/musica/leitmotivs/acto3_bocetos.py `ojo_fractura`, acto3_combate.py
`fractura_asalto` and `fractura_espiral`) are kept as the building blocks: the chug (root, plus fifth
and octave for a power chord, and the root an octave down on the bass), the half-time breakdown full
of holes, Asalto's double-time 16th tremolo with grouped accents, blast beats and dead stops, and
Espiral's 7/16 cell sliding across the 4/4 bar, its double-kick breakdown, three hits and tom fall.

The leitmotif «Fractura» (D5 Eb5 A4 G#4 D5 F5 E5 Bb4, half notes): its head D-Eb in augmentation on the
glasses (intro), the exposition on celesta and glasses (A), the low choir (B), transposed to the
tritone over the D-G# drone (C), inverted from Eb (D), back at its own pitch reharmonized with the
climax on Bb major (bar 21), and the head that does not end (coda). The bass of the whole form sings
the head in augmentation: D (bars 1-14), Eb (15-16), A (17-18), D (19).

Humanization is seeded by track name and written position, not by note order: an attack written at
the same place in a track that exists in both versions sounds at the same instant in both, so the
crossfade never flams, even where the rest of the track differs.

Prints a verification table and exits with status 1 if a check fails; a note outside its
instrument's range aborts the build.

Deliberate deviations from the sketches (all asked for by the user or by the brief):
- The celesta plays the motif at its own pitch (68-77), an octave below the sketch (80-89): no pinging
  highs. Nothing held above F5 (77) anywhere.
- `Guitar 2` doubles `Guitar` note for note (power chords only on the accents) instead of playing power
  chords on every 16th: a true double-tracked rhythm part, and the accent grouping reads in both.
- In combat B (bars 7-10) the accents regroup 3+3+2+3+3+2 and the bass follows the accents only, so
  the Asalto riff never repeats a two-bar phrase more than twice.
- The bass heartbeat of the exploration's intro, A and coda falls every other bar (1, 3, 5, 24): the
  kick keeps the pulse in every bar.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-laberinto/compose.py
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
BAR = 4 * BEAT
BARS = 24
LOOP_END = BARS * BAR
BPM = 70
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per eighth
SEED = 'acto3-laberinto'
GUARD = 12                                           # ticks a note stops before a bar line it does not cross
VERSIONS = ('explora', 'combate')
OUT = {v: os.path.join(HERE, 'build', f'acto3-laberinto-{v}.mid') for v in VERSIONS}
TOP_VEL = {'explora': 118, 'combate': 124}           # section 7 ceilings
TOP_CC1 = {'explora': 92, 'combate': 110}
TRACK_CAP = {'Celesta': 52, 'Glasses': 60}


def ms(x: float) -> int:
    return int(round(x / 1000 / SEC_PER_TICK))


BAND = {'Guitar', 'Guitar 2', 'Bass', 'Drums', 'Lead'}
HUMAN_TICKS = {True: ms(4), False: ms(8)}            # the band plays tight (+-4 ms), the rest +-8 ms
HUMAN_VEL = {True: 4, False: 5}
OVERLAP = (ms(10.8), ms(29.5))                       # legato overlap, 10-30 ms

SECTIONS = [('Intro', 1, 2), ('A', 3, 6), ('B', 7, 10), ('C', 11, 14), ('D', 15, 18),
            ('Climax', 19, 22), ('Coda', 23, 24)]
LAYER_LIMITS = {'explora': [5, 6, 6, 5, 6, 7, 5], 'combate': [8, 8, 8, 8, 8, 8, 8]}


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


def t16(bar: int, k: int) -> int:
    return (bar - 1) * BAR + k * S16


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


# ── instruments: one track per instrument and role ───────────────────────────
def sso(n):
    return ('sso', 'Sonatina Symphonic Orchestra/' + n + '.sfz')


def vcsl(n):
    return ('VCSL', n + '.sfz')


GUITAR_SFZ = ('electric-guitar-FSBS-dist1', 'EGuitarFSBS-dist1 bridge 20220911.sfz')
BASS_SFZ = ('electric-bass-YR', 'PickedBassYR 20190930.sfz')
KIT_SFZ = ('virtuosity_drums', 'Programs/01-basic-kit.sfz')   # 02-full-kit mutes the open hihat without CC4

# (track name, library path, controller that shapes it: 1 = Sonatina CC1, None = velocity)
COMMON = [
    ('Choir Pad', sso('Chorus - Performance/Mixed Chorus'), 1),
    ('Glasses', vcsl('Idiophones/Friction Idiophones/Wine Glasses - Slow'), None),
    ('Celesta', sso('Percussion/Celeste'), None),
]
SHARED = [
    ('Choir', sso('Chorus - Performance/Large Chorus'), 1),
    ('Organ', sso('Organ/Great - Open Diapason 8ft'), None),   # amp_veltrack=0: its level is set in the mix
    ('Guitar', GUITAR_SFZ, None),
    ('Guitar 2', GUITAR_SFZ, None),
    ('Bass', BASS_SFZ, None),
    ('Drums', KIT_SFZ, None),
]
LAYOUT = {
    'explora': COMMON + SHARED,
    'combate': COMMON + SHARED + [
        ('Lead', GUITAR_SFZ, None),
        ('Choir Low', sso('Chorus - Performance/Large Chorus'), 1),
    ],
}
SFZ_OF = {v: {name: library(*lib) for name, lib, _ in LAYOUT[v]} for v in VERSIONS}
COMMON_NAMES = tuple(name for name, _, _ in COMMON)
UNPITCHED = {'Drums'}
KICK, SNARE, HH, CRASH, RIDE, CRASH2 = 36, 38, 42, 49, 51, 57
TOMS = [50, 48, 47, 45, 43, 41]
DRUM_LEN = 96                                        # one-shot samples: the note length does not matter


# ── score model ──────────────────────────────────────────────────────────────
@dataclass
class Note:
    pitch: int
    ws: int            # written start (ticks)
    dur: int           # written duration (ticks)
    vel: int
    legato: bool = False
    hv: int | None = None
    cap: int | None = None
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

    def note(self, ws: int, pitch, dur: int, vel: int, **kw) -> Note:
        n = Note(P(pitch), ws, dur, int(round(vel)), **kw)
        self.notes.append(n)
        return n

    def line(self, bar, items, vel, legato=True, shift=0, **kw):
        """Consecutive notes from beat 1 of `bar`: items = [(pitch, beats)]."""
        t = tick(bar)
        vels = vel if isinstance(vel, list) else [vel] * len(items)
        for (pitch, beats), v in zip(items, vels):
            length = int(round(beats * BEAT))
            self.note(t, P(pitch) + shift, length, v, legato=legato, **kw)
            t += length

    def phrase(self, points, shape='cos'):
        """Controller breakpoints [(bar, beat, value)] of one phrase (CC1)."""
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
        if name == 'Drums':
            channel = 9
        elif ctrl is None:
            channel = 15
        else:
            channel, ch = ch, ch + 1 + (ch + 1 == 9)
        parts[name] = Part(name, lib, ctrl, channel)
    return parts


# ── form and harmony (section 4, common to both versions) ────────────────────
# Rhythm-guitar root per bar (the bass plays it an octave down); bars 11-14 are the 7/16 cell on D.
ROOT = {**{b: P('D2') for b in range(1, 15)}, 15: P('Eb2'), 16: P('Eb2'), 17: P('A2'), 18: P('A2'),
        19: P('D2'), 20: P('F2'), 21: P('Bb2'), 22: P('E2'), 23: P('D2'), 24: P('D2')}
# Choir Pad: (first bar, voices, bars); a new attack at each entry (the common thread)
PAD = [(1, ['D3', 'F3', 'Ab3'], 10), (11, ['D3', 'G#3'], 4), (15, ['Eb3', 'Gb3', 'A3'], 2),
       (17, ['A2', 'C3', 'Eb3'], 1), (18, ['A2', 'C#3', 'G3'], 1), (19, ['D3', 'F3', 'Ab3'], 1),
       (20, ['F3', 'Ab3', 'B3'], 1), (21, ['Bb2', 'D3', 'F3'], 1), (22, ['E3', 'G3', 'Bb3'], 1),
       (23, ['D3', 'F3', 'Ab3'], 2)]
PAD_CC = [(1, 1, 48), (6, 1, 60), (7, 1, 68), (10, 4, 68), (11, 1, 58), (14, 4, 64), (15, 1, 66),
          (18, 4, 76), (21, 1, 80), (22, 1, 74), (23, 1, 60), (24, 4.5, 48)]
# Organ semitone clusters (root + b9) where the band plays: (first bar, voices, bars)
CLUSTERS_B = [(7, ['D3', 'Eb3'], 4)]
CLUSTERS_D = [(15, ['Eb3', 'E3'], 2), (17, ['A2', 'Bb2'], 2)]
CLUSTERS_CLIMAX = [(19, ['D3', 'Eb3'], 1), (20, ['F3', 'F#3'], 1), (21, ['Bb2', 'B2'], 1), (22, ['E3', 'F3'], 1)]


def clusters(part: Part, items, vel):
    for bar, voices, bars in items:
        for p in voices:
            part.note(tick(bar), p, bars * BAR, vel)


# ── reference melody (section 5): identical pitches and attacks in both versions ──
FRACTURA = ['D5', 'Eb5', 'A4', 'G#4', 'D5', 'F5', 'E5', 'Bb4']


def halves(names):
    return [(P(x), 2) for x in names]


REF = {
    'head1': (1, [(P('D5'), 4), (P('Eb5'), 4)]),                               # augmentation of the head
    'motif3': (3, halves(FRACTURA)),                                           # exposition
    'low7': (7, halves(['D4', 'Eb4', 'A3', 'G#3', 'D4', 'F4', 'E4', 'Bb3'])),  # the low choir of the sketch
    'tritone11': (11, halves(['G#4', 'A4', 'D#4', 'D4', 'G#4', 'B4', 'A#4', 'E4'])),   # at the tritone
    'inversion15': (15, halves(['Eb4', 'D4', 'G#4', 'A4', 'Eb4', 'C4', 'C#4', 'G4'])),  # inverted from Eb
    'climax19': (19, halves(FRACTURA)),                                        # reharmonized return
    'head23': (23, halves(['D5', 'Eb5'])),                                     # the head that does not end
}


def ref(part: Part, key: str, vel, shift: int = 0, legato: bool = True, **kw):
    bar, items = REF[key]
    part.line(bar, items, vel, legato=legato, shift=shift, **kw)


# ── common layers (identical in both versions) ───────────────────────────────
def common_layers(s):
    pad = s['Choir Pad']
    for bar, voices, bars in PAD:
        for i, p in enumerate(voices):
            pad.note(tick(bar), p, bars * BAR, 70 + i)
    pad.phrase(PAD_CC)
    glasses = s['Glasses']
    ref(glasses, 'head1', [54, 56], legato=False)
    bar, items = REF['motif3']
    t = tick(bar)
    vels = iter([52, 54, 52, 56, 52])
    for pitch, beats in items:                      # the glasses only exist from D5 up: the motif fractures
        if pitch >= P('D5'):
            glasses.note(t, pitch, beats * BEAT, next(vels))
        t += beats * BEAT
    ref(glasses, 'head23', [50, 52], legato=False)
    ref(s['Celesta'], 'motif3', [48, 50, 44, 44, 48, 50, 46, 44], legato=False)


# ── the band: the sketch's building blocks ───────────────────────────────────
def chug(s, ws, dur, root, vel, power=True, g2=None, bass=True, bass_vel=None, bass_dur=None, cap=None, hv=None):
    """acto3_bocetos.chug: the root (+ fifth and octave for a power chord) on `Guitar` and the root an
    octave down on `Bass`; `g2` doubles it on `Guitar 2` with that velocity (the double-tracked part).
    A chug never rings over the next bar line (the new bar's bass must be clean)."""
    bar_line = (ws // BAR + 1) * BAR
    dur = min(dur, bar_line - ws)
    bass_dur = min(bass_dur or dur, bar_line - ws)
    for name, v in (('Guitar', vel), ('Guitar 2', g2)):
        if v is None:
            continue
        for k in ([0, 7, 12] if power else [0]):
            s[name].note(ws, root + k, dur, v - (6 if k else 0), cap=cap, hv=hv)
    if bass:
        s['Bass'].note(ws, root - 12, bass_dur, bass_vel if bass_vel is not None else vel - 10, cap=cap)


def drum(s, ws, pitch, vel, **kw):
    s['Drums'].note(ws, pitch, DRUM_LEN, vel, **kw)


def hits_at(bar, beats):
    return [tick(bar) + int(round(b * BEAT)) for b in beats]


HITS_5 = [0, .75, 1.5, 2.5, 3.25]                    # the «Ojo» breakdown: the first bar of each pair
HITS_3 = [0, .75, 1.5]                               # ... and the second, that falls silent
GROUP_A = {0, 3, 6, 9, 12, 14}                       # 3+3+3+3+2+2
GROUP_B = {0, 3, 6, 8, 11, 14}                       # 3+3+2+3+3+2
CELL = [0, 0, None, 1, 0, None, 6]                   # «Espiral»: root, root, rest, b2, root, rest, tritone


def breakdown(s, bar, root, beats, vel, g2=None, crash=False, ride=True, snare=True, kick16=False,
              snare_vel=118, kick_vel=110, cap=None, hv=None):
    """The half-time breakdown of the «Ojo» sketch: power chords on `beats`, kick with each hit, snare
    on beat 3, crash (or ride) on beat 1; `kick16` puts Espiral's double kick under it."""
    for ws in hits_at(bar, beats):
        chug(s, ws, int(.35 * BEAT), root, vel, g2=g2, cap=cap, hv=hv)
        if not kick16:
            drum(s, ws, KICK, kick_vel)
    if kick16:
        for k in range(16):
            drum(s, t16(bar, k), KICK, 100)
    if snare:
        drum(s, tick(bar, 3), SNARE, snare_vel)
    if crash:
        drum(s, tick(bar), CRASH, 112 if kick16 else 100)
    elif ride:
        drum(s, tick(bar), RIDE, 96)


def grouped(s, bar, root, positions, vel, snare=False, crash=False, ride=False):
    """Exploration D: Asalto's accent grouping played at half time — only the accents, as chugs."""
    for k in sorted(positions):
        chug(s, t16(bar, k), int(.22 * BEAT), root, vel)
        drum(s, t16(bar, k), KICK, vel - 4)
    if snare:
        drum(s, tick(bar, 3), SNARE, 112)
    if crash:
        drum(s, tick(bar), CRASH, 104)
    if ride:
        drum(s, tick(bar), RIDE, 92)


def tom_fall(s, bar, base=104, step=2):
    for i, tom in enumerate(TOMS):
        drum(s, t16(bar, 10 + i), tom, base + step * i)


def asalto(s, bar, root, accents, mode='normal', turn=False, crash=False, cymbals='a', bass='all'):
    """«Asalto» (acto3_combate.fractura_asalto): 16th tremolo chugs, power chords on the accents,
    double-tracked; double kick on every 16th; snare on the «and»s, or on every 16th in a blast;
    a dead stop plays the first half and one hit on beat 3. `turn` climbs a semitone and to the tritone
    on beat 4; cymbals 'a' = crash 2 on the beats and ride on the «and»s, 'b' = ride on the eighths."""
    pos = sorted(accents)
    for k in range(16):
        if mode == 'stop' and k >= 8:
            break
        r = root
        if turn and k >= 12:
            r = root + 1 if k < 14 else root + 6
        acc = k in accents
        ws = t16(bar, k)
        if bass == 'all':
            bvel, bdur = (106 if acc else 86), int(.22 * BEAT)
        elif acc:
            nxt = next((p for p in pos if p > k), 16)
            if mode == 'stop':
                nxt = min(nxt, 8)
            bvel, bdur = 106, (nxt - k) * S16 - 20
        else:
            bvel = None
        chug(s, ws, int(.22 * BEAT), r, 116 if acc else 90, power=acc, g2=108 if acc else 84,
             bass=bvel is not None, bass_vel=bvel, bass_dur=bdur if bvel is not None else None,
             cap=None if acc else 92)
        drum(s, ws, KICK, 112 if acc else 98)
        if mode == 'blast':
            drum(s, ws, SNARE, 104 + 8 * acc)
        elif k % 4 == 2:
            drum(s, ws, SNARE, 118)
        if cymbals == 'a':
            if k % 4 == 0:
                drum(s, ws, CRASH2, 92)
            elif k % 4 == 2:
                drum(s, ws, RIDE, 76)
        else:
            if k % 2 == 0:
                drum(s, ws, RIDE, 84 + 6 * (k % 8 == 0))
    if mode == 'stop':                                   # the band hits once and leaves the choir alone
        ws = tick(bar, 3)
        chug(s, ws, int(.6 * BEAT), root, 120, g2=116, bass_vel=110)
        drum(s, ws, KICK, 118)
        drum(s, ws, CRASH, 116)
    if crash:
        drum(s, tick(bar), CRASH, 118)


def espiral(s, first_bar, soft: bool):
    """«Espiral» (acto3_combate.fractura_espiral): the 7/16 cell slides across four bars of 4/4.
    Soft (exploration): single notes on the soft guitar layer, the bass and a soft kick on the first
    note of each cell. Full (combat): double-tracked power chords on the roots, kick on every note,
    snare on 2 and 4, ride eighths, crash 2 on each downbeat."""
    root = ROOT[first_bar]
    for k in range(4 * 16):
        step = CELL[k % 7]
        if step is None:
            continue
        bar, pos = first_bar + k // 16, k % 16
        ws = t16(bar, pos)
        acc = k % 7 == 0
        if soft:
            chug(s, ws, int(.2 * BEAT), root + step, 80 if acc else 68, power=False, bass=False, cap=92)
            if acc:
                s['Bass'].note(ws, root - 12, min(int(.5 * BEAT), tick(bar + 1) - ws), 72)   # never over the bar line
                drum(s, ws, KICK, 70)
        else:
            chug(s, ws, int(.22 * BEAT), root + step, 114 if acc else 92, power=step == 0,
                 g2=104 if acc else 86, cap=None if step == 0 else 96)
            drum(s, ws, KICK, 108 if acc else 94)
    for bar in range(first_bar, first_bar + 4):
        if soft:
            if bar >= first_bar + 2:
                for e in range(8):
                    drum(s, tick(bar) + e * E8, HH, 46 + 6 * (e % 2 == 0))
            continue
        for beat in (2, 4):
            drum(s, tick(bar, beat), SNARE, 116)
        for e in range(8):
            drum(s, tick(bar) + e * E8, RIDE, 80)
        drum(s, tick(bar), CRASH2, 104)


def heartbeat(s, bar, bass: bool):
    """The exploration's pulse under the glasses: kick on 1 and «1 and», the bass every other bar."""
    drum(s, tick(bar), KICK, 66)
    drum(s, tick(bar, 1.5), KICK, 52)
    if bass:
        s['Bass'].note(tick(bar), ROOT[bar] - 12, BEAT, 64)


# ── exploration ──────────────────────────────────────────────────────────────
def explora_intro(s):
    s['Organ'].note(tick(1), 'D2', 6 * BAR, 50)                 # D2 pedal under intro and A
    for bar in (1, 2):
        heartbeat(s, bar, bass=bar == 1)


def explora_a(s):
    for bar in (3, 4, 5, 6):
        heartbeat(s, bar, bass=bar in (3, 5))
    for k, v in zip(range(12, 16), (70, 78, 86, 96)):           # a kick roll into the breakdown
        drum(s, t16(6, k), KICK, v)


def explora_b(s):
    for bar in (7, 8, 9, 10):
        breakdown(s, bar, ROOT[bar], HITS_5 if bar % 2 else HITS_3, 112, crash=bar == 7)
    ref(s['Choir'], 'low7', 90)
    s['Choir'].phrase([(7, 1, 80), (8, 3, 88), (10, 4, 82)])
    clusters(s['Organ'], CLUSTERS_B, 54)


def explora_c(s):
    espiral(s, 11, soft=True)
    ref(s['Organ'], 'tritone11', 70)


def explora_d(s):
    grouped(s, 15, ROOT[15], GROUP_A, 104, snare=True, crash=True)
    grouped(s, 16, ROOT[16], {0, 3, 6}, 106, ride=True)
    grouped(s, 17, ROOT[17], GROUP_A, 110, snare=True, crash=True)
    breakdown(s, 18, ROOT[18], HITS_3, 114, ride=True, snare=False, kick_vel=110, cap=116)
    tom_fall(s, 18, base=70, step=4)
    ref(s['Choir'], 'inversion15', 90)
    s['Choir'].phrase([(15, 1, 80), (18, 3, 90)])
    clusters(s['Organ'], CLUSTERS_D, 52)


CLIMAX_HITS = {19: HITS_5, 20: [0, .75, 1.5, 2.5, 3.25, 3.75],
               21: [0, .25, .75, 1, 1.5, 2, 2.5, 2.75, 3.25, 3.5], 22: HITS_3}


def explora_climax(s):
    for bar in (19, 20, 21, 22):
        top = bar == 21
        breakdown(s, bar, ROOT[bar], CLIMAX_HITS[bar], 118 if top else 112, g2=114 if top else 108,
                  crash=bar in (19, 21), cap=None if top else 116, hv=0 if top else None)
    drum(s, tick(21, 3), CRASH2, 104)
    ref(s['Choir'], 'climax19', 90)
    s['Choir'].phrase([(19, 1, 84), (20, 4, 88), (21, 1, 92), (22, 4, 84)])   # 92 only on bar 21
    clusters(s['Organ'], CLUSTERS_CLIMAX, 54)


def explora_coda(s):
    s['Organ'].note(tick(23), 'D2', 2 * BAR, 50)
    heartbeat(s, 23, bass=False)
    heartbeat(s, 24, bass=True)                                  # the same as bar 1: the seam


# ── combat ───────────────────────────────────────────────────────────────────
def combate_intro(s):
    asalto(s, 1, ROOT[1], GROUP_A, crash=True)
    asalto(s, 2, ROOT[2], GROUP_A, turn=True)
    ref(s['Choir'], 'head1', 90, shift=-12)


def combate_a(s):
    asalto(s, 3, ROOT[3], GROUP_A, crash=True)
    asalto(s, 4, ROOT[4], GROUP_A, turn=True)
    asalto(s, 5, ROOT[5], GROUP_A, mode='blast')
    asalto(s, 6, ROOT[6], GROUP_A, mode='stop')
    ref(s['Choir'], 'motif3', 90, shift=-12)
    s['Choir'].phrase([(1, 1, 96), (5, 1, 104), (6, 4, 98)])


def combate_b(s):
    for bar, mode in ((7, 'normal'), (8, 'normal'), (9, 'blast'), (10, 'stop')):
        asalto(s, bar, ROOT[bar], GROUP_B, mode=mode, turn=bar == 8, crash=bar == 7, cymbals='b', bass='accents')
    ref(s['Lead'], 'low7', 100)
    ref(s['Choir'], 'low7', 90)
    s['Choir'].phrase([(7, 1, 98), (9, 1, 104), (10, 4, 100)])
    clusters(s['Organ'], CLUSTERS_B, 84)


def combate_c(s):
    espiral(s, 11, soft=False)
    ref(s['Lead'], 'tritone11', 96)
    ref(s['Choir'], 'tritone11', 90)
    s['Choir'].phrase([(11, 1, 92), (14, 4, 100)])
    for p in ('D3', 'G#3'):
        s['Choir Low'].note(tick(11), p, 4 * BAR, 84)
    s['Choir Low'].phrase([(11, 1, 76), (14, 4, 90)])


def combate_d(s):
    breakdown(s, 15, ROOT[15], HITS_5, 118, g2=112, crash=True, kick16=True, snare_vel=120)
    breakdown(s, 16, ROOT[16], HITS_3, 118, g2=112, crash=True, kick16=True, snare_vel=120)
    for k in range(16):                                          # bar 17: blast, turning to Bb on beat 4
        ws = t16(17, k)
        chug(s, ws, int(.22 * BEAT), ROOT[17] + (1 if k >= 12 else 0), 112, g2=104)
        drum(s, ws, KICK, 108)
        drum(s, ws, SNARE, 104)
        if k % 2 == 0:
            drum(s, ws, CRASH2, 88)
    three_hits(s, 18)
    ref(s['Lead'], 'inversion15', 100)
    ref(s['Choir'], 'inversion15', 90)
    s['Choir'].phrase([(15, 1, 98), (18, 3, 104)])
    clusters(s['Organ'], CLUSTERS_D, 86)


def three_hits(s, bar):
    """Espiral's last bar: three hits, then the toms fall."""
    for ws in hits_at(bar, HITS_3):
        chug(s, ws, int(.35 * BEAT), ROOT[bar], 122, g2=116)
        drum(s, ws, KICK, 118)
        drum(s, ws, CRASH, 110)
    tom_fall(s, bar)


def combate_climax(s):
    asalto(s, 19, ROOT[19], GROUP_A, crash=True)
    asalto(s, 20, ROOT[20], GROUP_A, turn=True)
    asalto(s, 21, ROOT[21], GROUP_A, mode='blast', crash=True)
    drum(s, tick(21, 3), CRASH, 118)
    asalto(s, 22, ROOT[22], GROUP_A, mode='stop')
    ref(s['Choir'], 'climax19', 90)
    ref(s['Lead'], 'climax19', 104, shift=-12)
    s['Choir'].phrase([(19, 1, 100), (20, 4, 104), (21, 1, 108), (22, 4, 100)])
    clusters(s['Organ'], CLUSTERS_CLIMAX, 80)


def combate_coda(s):
    ws = tick(23)                                                # one hit, then the choir alone
    chug(s, ws, int(.6 * BEAT), ROOT[23], 120, g2=116, bass_vel=110)
    drum(s, ws, KICK, 118)
    drum(s, ws, CRASH, 116)
    ref(s['Choir'], 'head23', 90, shift=-12)
    s['Choir'].phrase([(23, 1, 96), (24, 1, 92)])
    for p in ('D3', 'Ab3'):
        s['Choir Low'].note(tick(23), p, 2 * BAR, 80)
    s['Choir Low'].phrase([(23, 1, 80), (24, 4, 72)])
    three_hits(s, 24)                                            # ... and the toms fall into bar 1


SCORE = {
    'explora': (explora_intro, explora_a, explora_b, explora_c, explora_d, explora_climax, explora_coda),
    'combate': (combate_intro, combate_a, combate_b, combate_c, combate_d, combate_climax, combate_coda),
}


# ── performance: humanization by position, legato, bar lines ─────────────────
def perform(part: Part, version: str):
    """Seeded by track name and written position (not by note order): the same attack in a track that
    exists in both versions is played at the same instant in both, and the common layers come out
    identical. Notes written together are played together."""
    band = part.name in BAND
    h = HUMAN_TICKS[band]
    top = min(TOP_VEL[version], TRACK_CAP.get(part.name, 127))
    part.notes.sort(key=lambda n: (n.ws, n.pitch))
    for n in part.notes:
        rng = random.Random(f'{SEED}:{part.name}:{n.ws}')
        shift = rng.randint(0, h) if n.ws == 0 else rng.randint(-h, h)
        n.start = max(0, n.ws + shift)
        n.end = n.start + n.dur
        hv = HUMAN_VEL[band] if n.hv is None else n.hv
        if hv:
            n.vel += random.Random(f'{SEED}:{part.name}:{n.ws}:{n.pitch}:v').randint(-hv, hv)
        n.vel = max(1, min(top, n.cap if n.cap is not None else top, n.vel))
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
        elif n.we % BAR == 0:
            n.end = min(n.end, n.we - GUARD)                    # leaves the bar line free
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
            tr.append(mido.MetaMessage('key_signature', key='Dm', time=0))
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
        print(f"\n[{v}] {'track':<10} {'sfz':<58} {'notes':>5}  range used")
        for name, part in parts.items():
            keys = sfz_keys(SFZ_OF[v][name])
            bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
            if bad:
                raise SystemExit(f'{v} {name}: notes outside {SFZ_OF[v][name]}: {bad}')
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'  {name:<10} {"/".join(part.lib)[-58:]:<58} {len(part.notes):>5}  '
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
        held_high = [(name, n.pitch) for name, p in parts.items() if name not in UNPITCHED
                     for n in p.notes if n.pitch > 77 and n.end - n.start >= BEAT - 30]
        check(f'{v}: 3  nothing held above F5', not held_high, str(held_high[:3]))
        for name, part in parts.items():
            if part.ctrl == 1:
                check(f'{v}: 10 {name} CC1 at tick 0', 0 in part.cc)
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
