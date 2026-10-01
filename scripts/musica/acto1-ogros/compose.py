"""«El Asentamiento Ogro» — «Tambores en el valle»: score generator (brief: docs/musica/acto1-ogros.md).

One song in two synchronized versions, written from a single description of form, harmony and
reference melody:
    build/acto1-ogros-explora.mid   (map and events)
    build/acto1-ogros-combate.mid   (normal and elite fights)
Both: 44 bars of 4/4 at 132 bpm (80.000 s), one MIDI track per instrument and articulation. The
common layers (`Basses Pizz`, `Harp`) come from the same function with the same per-track seed, so
they are identical note for note and the game's linear crossfade sums them in phase.

Prints a verification table (ranges, registers, layers, dynamics, common layers) and exits with
status 1 if a check fails; a note outside its instrument's range aborts the build.

Deliberate deviations from the brief's section 6 sketches (all to keep the voice leading clean):
- Bridge held line (FHornSus / Trombones Sustain): G3 · F#3 · G3 · Bb3-A3 instead of G3 · A3 · B3,
  which moves in parallel fifths with the bass C-D-E.
- Return countermelody (FHornSus / Trombones Sustain 8vb), bar 37: G4 E4 instead of E4 G4 (G4 -> A4
  over C -> D would be parallel fifths).
- Bar 39: the bass walks A - E - G (Am7, Am7/E, Em/G) and the pizzicato plays the root E on beat 3:
  A5 -> G5 in the tune over A -> G in the bass would be parallel octaves.
- Return bass (ContrabassSusVB) E2 (40) on bars 33, 34 and 36 as in the brief's own bracket (its
  register column says 27-38): with E1 the bass would rise E -> A with the tune in octaves.
- A' violas reach E4 (64) in bar 13: the D#4 of bar 12 resolves up.
- A' countermelody (FHornSus / Horns Sustain), bar 14: E3 D#3 E3 as q q h (the brief's h q q puts
  the D#3 on the C chord, a minor ninth against the tune's E4); the D# now sounds with B7.
- Bridge roll (TimpaniRolls): E2 until beat 2 of bar 32 and B2 from beat 3 (B2 under C7 would clash
  with its Bb).
- A' cellos (CelloEnsSusVib-Quiet) take C2 in bar 17, B cellos D2 in bar 26: contrary motion against
  the countermelodies, which otherwise make parallel fifths with the bass.
- Forge in combat: 8 hits (bars 2, 4, 8, 12, 16, 36, 37, 44); the section-6 list adds up to 13 and
  criterion 11 allows 8.
- Exploration codetta: the flute ends with the F#5 of bar 40 (the E5 of bar 41 is the quiet
  violins'), so the codetta stays within 6 layers.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-ogros/compose.py
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
BARS = 44
LOOP_END = BARS * BAR
BPM = 132
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per 1/8 bar
HUMAN_TICKS = int(0.008 / SEC_PER_TICK)              # +-8 ms
HUMAN_VEL = 6
SEED = 'acto1-ogros'
GUARD = 12                                           # ticks a note stops before a bar line it does not cross
MAX_VEL = 105
MAX_CC = 112
CC11_SCALE = MAX_CC / 122                            # CC11 curves are drafted up to 122
VERSIONS = ('explora', 'combate')
OUT = {v: os.path.join(HERE, 'build', f'acto1-ogros-{v}.mid') for v in VERSIONS}

SECTIONS = [('Intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 28), ('Bridge', 29, 32),
            ('Return', 33, 40), ('Codetta', 41, 44)]
LAYER_LIMITS = {'explora': [6, 7, 8, 6, 8, 9, 6], 'combate': [9, 11, 11, 9, 11, 12, 9]}
ACCENTS = (0, 3, 6, 8, 11, 14)                       # 3+3+2 on the sixteenth grid


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


FRAME = vcsl('Membranophones/Struck Membranophones/Frame Drum')
FORGE = vcsl('Idiophones/Struck Idiophones/Brake Drum')                 # brake drum, not the Anvil
HARP = vcsl('Chordophones/Composite Chordophones/Concert Harp')
BASS_DRUM = vcsl('Membranophones/Struck Membranophones/Bass Drum 2')
# (track name, library path, controller that shapes it: 1 = Sonatina CC1, 11 = CC11, None)
LAYOUT = {
    'explora': [
        ('Recorder', vcsl('Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - SusVib'), 11),
        ('Flute Sus', vsco('FluteSusVib'), 11), ('Clarinet Sus', vsco('ClarinetSus'), 11),
        ('Trompa', vsco('FHornSus'), 11),
        ('Timpani', vsco('Timpani'), None), ('Timpani Roll', vsco('TimpaniRolls'), 11),
        ('Frame Drum', FRAME, None), ('Forge', FORGE, None), ('Harp', HARP, None),
        ('Violins Sus', vsco('ViolinEnsSusVib'), 11), ('Violins Sus Quiet', vsco('ViolinEnsSusVib-Quiet'), 11),
        ('Violas Sus', vsco('ViolaEnsSusVib'), 11), ('Violas Sus Quiet', vsco('ViolaEnsSusVib-Quiet'), 11),
        ('Violas Trem', vsco('ViolaEnsTrem'), 11),
        ('Cellos Sus', vsco('CelloEnsSusVib'), 11), ('Cellos Sus Quiet', vsco('CelloEnsSusVib-Quiet'), 11),
        ('Cellos Pizz', vsco('CelloEnsPizz'), None),
        ('Basses Sus', vsco('ContrabassSusVB'), 11), ('Basses Sus Quiet', vsco('ContrabassSusVB-Quiet'), 11),
        ('Basses Pizz', vsco('ContrabassPizz'), None),
    ],
    'combate': [
        ('Horns Marc', sso('Brass - Performance/Horns Marcato'), 1),
        ('Horns Sus', sso('Brass - Performance/Horns Sustain'), 1),
        ('Trombones Marc', sso('Brass - Performance/Trombones Marcato'), 1),
        ('Trombones Sus', sso('Brass - Performance/Trombones Sustain (looped)'), 1),
        ('Timpani', vsco('Timpani'), None), ('Timpani Roll', vsco('TimpaniRolls'), 11),
        ('Bass Drum', BASS_DRUM, None), ('Bass Drum Roll', BASS_DRUM, 11),
        ('Frame Drum', FRAME, None), ('Tom', vcsl('Membranophones/Struck Membranophones/Tom 2'), None),
        ('Forge', FORGE, None), ('Cymbal', vcsl('Idiophones/Struck Idiophones/Suspended Cymbal 2'), None),
        ('Harp', HARP, None),
        ('Violins Marc', sso('Strings - Performance/1st Violins Marcato'), 1),
        ('Violins Sus', vsco('ViolinEnsSusVib'), 11), ('Violins Trem', vsco('ViolinEnsTrem'), 11),
        ('Violas Spic', vsco('ViolaEnsSpic'), None), ('Violas Trem', vsco('ViolaEnsTrem'), 11),
        ('Cellos Spic', vsco('CelloEnsSpic'), None), ('Basses Spic', vsco('ContrabassSpic'), None),
        ('Basses Pizz', vsco('ContrabassPizz'), None),
    ],
}
SFZ_OF = {v: {name: library(*lib) for name, lib, _ in LAYOUT[v]} for v in VERSIONS}
COMMON = ('Basses Pizz', 'Harp')
UNPITCHED = {'Frame Drum', 'Forge', 'Bass Drum', 'Bass Drum Roll', 'Tom', 'Cymbal'}
SONATINA_MAX_S = {'Horns Marc': 2.8, 'Horns Sus': 2.8, 'Trombones Marc': 2.2, 'Violins Marc': 3.5}
# Unpitched keys (checked in the .sfz files, brief section 6)
FD_BIG, FD_BIG_MUTED, FD_SMALL, FD_SMALL_MUTED = 61, 62, 64, 65
BD_HIT, BD_ROLL = 62, 63
TOM = 62
FORGE_HAMMER, FORGE_SOFT, FORGE_SECOND = 61, 63, 65
CYM_CRESC, CYM_HIT = 64, 66
CYMBAL_PEAK_S = 2.85      # measured: RMS peak of susCymb2_cresc_4s.wav (after its offset) 2.75-3.0 s


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

    def hit(self, bar, pos, key, vel, length=S16, **kw) -> Note:
        n = Note(P(key), t16(bar, pos), length, vel, **kw)
        self.notes.append(n)
        return n

    def line(self, bar, beat, items, vels, legato=True, tie=False, **kw):
        """Consecutive notes from (bar, beat): items = [(pitch | None for a rest, beats)].
        tie=True merges repeated pitches into one held note (common tones)."""
        t = tick(bar, beat)
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        vi = iter(vels)
        prev = None
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

    def phrase(self, points, shape='cos'):
        """Controller breakpoints [(bar, beat, value)] of one phrase (CC1 or CC11). CC11 curves are
        written on a 0-122 scale and scaled into the 0-112 ceiling (same shape, -0.7 dB overall)."""
        scale = CC11_SCALE if self.ctrl == 11 else 1.0
        self.phrases.append(([(tick(b, bt), int(round(v * scale))) for b, bt, v in points], shape))

    def build_cc(self):
        """Phrases -> controller points on the 1/8-bar grid: interpolated inside a phrase, held
        between phrases and moved within the grid step before the next phrase starts (its first
        attack is never humanized early, so it reads its own phrase's value), with a point at tick 0."""
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
    'Em': (4, (0, 3, 7)), 'F': (5, (0, 4, 7)), 'B7sus4': (11, (0, 5, 7, 10)), 'B7': (11, (0, 4, 7, 10)),
    'Am': (9, (0, 3, 7)), 'Dm': (2, (0, 3, 7)), 'E7': (4, (0, 4, 7, 10)), 'Cmaj7': (0, (0, 4, 7, 11)),
    'Am7': (9, (0, 3, 7, 10)), 'D7': (2, (0, 4, 7, 10)), 'G': (7, (0, 4, 7)), 'F#ø7': (6, (0, 3, 6, 10)),
    'C': (0, (0, 4, 7)), 'Fmaj7': (5, (0, 4, 7, 11)), 'Dm7': (2, (0, 3, 7, 10)), 'Bø7': (11, (0, 3, 6, 10)),
    'Em7': (4, (0, 3, 7, 10)), 'D7sus4': (2, (0, 5, 7, 10)), 'Ebmaj7': (3, (0, 4, 7, 11)), 'D': (2, (0, 4, 7)),
    'C7': (0, (0, 4, 7, 10)),
}
# bar: 'chord[:bass] | beat chord[:bass] ...'
HARMONY_SRC = {
    1: 'Em', 2: 'Em', 3: 'F:E', 4: 'B7sus4 | 3 B7',
    5: 'Em', 6: 'Am | 2 B7 | 3 Em', 7: 'Am | 3 F', 8: 'Dm | 2 E7 | 3 Am', 9: 'Cmaj7', 10: 'Am7 | 3 D7',
    11: 'G | 3 Cmaj7', 12: 'F#ø7 | 3 B7',
    13: 'Em | 3 C', 14: 'Am7 | 2 B7 | 3 C', 15: 'Fmaj7 | 3 Dm7', 16: 'Bø7 | 2 E7 | 3 Am', 17: 'Cmaj7',
    18: 'Am7 | 3 Em7', 19: 'Cmaj7 | 3 Am7', 20: 'D7sus4 | 3 D7',
    21: 'G', 22: 'Em7 | 3 Cmaj7', 23: 'Am7 | 3 D7', 24: 'G | 3 Em7', 25: 'Cmaj7', 26: 'D7', 27: 'Ebmaj7',
    28: 'B7sus4 | 3 B7',
    29: 'C', 30: 'D', 31: 'Em | 3 Em:D', 32: 'C7 | 3 B7',
    33: 'Em | 3 C', 34: 'Am | 2 B7 | 3 Em', 35: 'Am | 3 F', 36: 'Bø7 | 2 E7 | 3 Am', 37: 'Cmaj7', 38: 'D',
    39: 'Am7 | 2 Am7:E | 3 Em:G', 40: 'B7sus4 | 3 B7',
    41: 'Em', 42: 'Em', 43: 'F:E', 44: 'B7sus4 | 3 B7',
}
PCS = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'A': 9, 'B': 11}


def _parse_harmony():
    out = {}
    for bar, src in HARMONY_SRC.items():
        segs = []
        for i, chunk in enumerate(src.split('|')):
            words = chunk.split()
            beat = 1.0 if i == 0 else float(words.pop(0))
            sym, _, bass = words[0].partition(':')
            root = CHORDS[sym][0]
            segs.append((beat, sym, PCS[bass] if bass else root))
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


# ── reference melody (section 5): identical pitches and attacks in both versions ──
MOTIF_RHYTHM = [1, 1, .5, .5, 1, .5, .5, 1, 2]       # q q e e q | e e q h
HEAD = ['E4', 'B4', 'C5', 'B4', 'G4', 'A4', 'G4', 'F#4', 'E4']
SEQ = ['A4', 'E5', 'F5', 'E5', 'C5', 'D5', 'C5', 'B4', 'A4']


def _motif(pitches):
    return list(zip(pitches, MOTIF_RHYTHM))


REF = {
    'head': (2, [('E3', 2), ('B3', 2), ('C4', 4), ('B3', 2)]),
    'motif5': (5, _motif(HEAD)), 'seq7': (7, _motif(SEQ)),
    'cons9': (9, [('E5', 2), ('D5', 1), ('C5', 1), ('B4', 1), ('A4', 1), ('F#4', 2),
                  ('G4', 1), ('A4', 1), ('B4', 1), ('C5', 1), ('C5', 2), ('B4', 2)]),
    'motif13': (13, _motif(HEAD)), 'seq15': (15, _motif(SEQ)),
    'cons17': (17, [('E5', 2), ('F#5', 1), ('G5', 1), ('A5', 2), ('G5', 1), ('F#5', 1),
                    ('E5', 1), ('D5', 1), ('C5', 2), ('D5', 4)]),
    'aug21': (21, [('G4', 2), ('D5', 2), ('E5', 1), ('D5', 1), ('B4', 2), ('C5', 1), ('B4', 1),
                   ('A4', 2), ('G4', 4)]),
    'cons25': (25, [('E5', 2), ('D5', 2), ('F#5', 2), ('E5', 1), ('C5', 1), ('Bb4', 2), ('G4', 2),
                    ('A4', 2), ('F#4', 2)]),
    'frag29': (29, [('E4', 1), ('B4', 1), ('C5', 2), ('F#4', 1), ('C#5', 1), ('D5', 2),
                    ('G4', 1), ('D5', 1), ('E5', 2), ('A4', 1), ('E5', 1), ('D#5', 2)]),
    'motif33': (33, _motif(HEAD)), 'seq35': (35, _motif(SEQ)),
    'climax37': (37, [('B5', 2), ('A5', 1), ('G5', 1), ('F#5', 2), ('E5', 1), ('D5', 1),
                      ('A5', 2), ('G5', 2), ('F#5', 4)]),
    'final41': (41, [('E5', 4)]),
    'echo42': (42, [('E4', 1), ('B4', 3)]),
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


def play(part: Part, key: str, vels, shift: int = 0, legato: bool = True, marcato: bool = False,
         cut: dict[int, float] | None = None, hv: int = HUMAN_VEL) -> list[Note]:
    """Writes a reference-melody window into a track (shift = declared octave doubling)."""
    bar, items = REF[key]
    vels = vels if isinstance(vels, list) else [vels] * len(items)
    t, notes = tick(bar), []
    for i, ((p, beats), v) in enumerate(zip(items, vels)):
        length = int(round(beats * BEAT))
        dur = length - int(round((cut or {}).get(i, 0) * BEAT))
        if marcato:
            dur = int(dur * 0.9)                         # every note with its own attack
        n = Note(P(p) + shift, t, dur, v, legato=legato and dur == length, hv=hv, tag='mel')
        part.notes.append(n)
        notes.append(n)
        t += length
    return notes


# ── generic figures ──────────────────────────────────────────────────────────
WAVE = [0, 1, -1, 0, 1, 0, -1, 1, 0, -1, 1, 0, 0, 1, -1, 0]   # small fixed variation of the 16ths


def ostinato_pitches(bar, beat, lo=36, hi=52):
    """(accent, other) pitches for the cello ostinato: the bass of section 4 in the low octave on
    the accents; its octave (or the nearest chord tone around the fifth) on the other 16ths."""
    sym, bass = chord_at(bar, beat)
    low = lo + (bass - lo) % 12
    if low + 12 <= hi:
        return low, low + 12
    target = low + 7 if low + 7 <= hi else low - 5
    tones = [p for p in range(36, hi + 1) if p % 12 in chord_pcs(sym) and p != low]
    return low, min(tones, key=lambda p: (abs(p - target), p))


def cello_ostinato(part, bar, base, slope=0, lo=36, hi=52, phrygian=False):
    """16 sixteenths, accents 3+3+2 (+18), alternating octave between accents and the rest."""
    for pos in range(16):
        beat = 1 + pos / 4
        low, high = ostinato_pitches(bar, beat, lo, hi)
        acc = pos in ACCENTS
        pitch = low if acc else (P('F3') if phrygian and pos in (2, 5, 10, 13) else high)
        v = base + int(round(slope * pos / 15)) + (18 if acc else WAVE[pos])
        part.notes.append(Note(pitch, t16(bar, pos), S16, v, hv=3 if acc else 6, tag='ost'))


def cello_eighths(part, bar, base):
    """Section B: eighths with accents on eighths 0, 3, 6 (3+3+2)."""
    for k in range(8):
        low, high = ostinato_pitches(bar, 1 + k / 2)
        acc = k in (0, 3, 6)
        part.notes.append(Note(low if acc else high, t16(bar, 2 * k), E8,
                               base + (18 if acc else WAVE[k]), hv=3 if acc else 5, tag='ost'))


def bass_accents(part, bar, base, high_on=(1, 4)):
    """Contrabass spiccato on the accents only (eighths), E1/E2 octave swaps where they fit."""
    for i, pos in enumerate(ACCENTS):
        _, bass = chord_at(bar, 1 + pos / 4)
        low = 28 + (bass - 4) % 12
        pitch = low + 12 if i in high_on and low + 12 <= 40 else low
        part.notes.append(Note(pitch, t16(bar, pos), E8, base + (6 if pos in (0, 8) else 0) + WAVE[pos],
                               hv=4, tag='ost'))


def viola_offbeats(part, bar, base, lo=52, hi=64, targets=(57, 62)):
    """Off-beat eighths («and» of every beat) on chord tones, swinging between two registers."""
    for k, pos in enumerate((2, 6, 10, 14)):
        sym, _ = chord_at(bar, 1 + pos / 4)
        target = targets[(k + bar) % 2]
        tones = [p for p in range(lo, hi + 1) if p % 12 in chord_pcs(sym)]
        part.notes.append(Note(min(tones, key=lambda p: (abs(p - target), p)), t16(bar, pos), E8,
                               base + (3 if k % 2 else 0), tag='offbeat'))


# ── common layers (identical in both versions) ───────────────────────────────
PIZZ = {
    5: ('E2', 'E2'), 6: ('A1', 'E2'), 7: ('A1', 'F1'), 8: ('D2', 'A1'), 9: ('C2', 'C2'), 10: ('A1', 'D2'),
    11: ('G1', 'C2'), 12: ('F#1', 'B1'),
    13: ('E2', 'C2'), 14: ('A1', 'C2'), 15: ('F1', 'D2'), 16: ('B1', 'A1'), 17: ('C2', 'C2'),
    18: ('A1', 'E2'), 19: ('C2', 'A1'), 20: ('D2', 'D2'),
    21: ('G1',), 22: ('E1',), 23: ('A1',), 24: ('G1',), 25: ('C2',), 26: ('D2',), 27: ('Eb1',), 28: ('B1',),
    29: ('C2', 'C2'), 30: ('D2', 'D2'), 31: ('E2', 'D2'), 32: ('C2', 'B1'),
    33: ('E2', 'C2'), 34: ('A1', 'E2'), 35: ('A1', 'F1'), 36: ('B1', 'A1'), 37: ('C2', 'C2'),
    38: ('D2', 'D2'), 39: ('A1', 'E1'), 40: ('B1', 'B1'),
}
PIZZ_VEL = {**{b: (54, 48) for b in range(5, 13)}, **{b: (56, 50) for b in range(13, 21)},
            **{b: (46,) for b in range(21, 29)},
            29: (50, 52), 30: (56, 58), 31: (62, 62), 32: (66, 68),
            33: (66, 60), 34: (64, 60), 35: (66, 60), 36: (64, 62), 37: (72, 64), 38: (68, 62),
            39: (64, 60), 40: (62, 58)}
PIZZ_VEL.update({12: (52, 56), 18: (60, 54), 20: (54, 52)})
HARP_B = {   # beat 1: the root; beats 2-4: rising chord tones, never above E4
    21: ['G1', 'D3', 'G3', 'B3'], 22: ['E2', 'B2', 'E3', 'G3'], 23: ['A1', 'G2', 'C3', 'F#3'],
    24: ['G1', 'D3', 'G3', 'B3'], 25: ['C2', 'G2', 'E3', 'B3'], 26: ['D2', 'A2', 'F#3', 'C4'],
    27: ['Eb2', 'Bb2', 'G3', 'D4'], 28: ['B1', 'E3', 'A3', 'D#4'],
}


def common_layers(s):
    pz = s['Basses Pizz']
    for bar, notes in PIZZ.items():
        for (beat, p), v in zip(zip((1, 3), notes), PIZZ_VEL[bar]):
            pz.add(bar, beat, p, 1, v)
    h = s['Harp']
    for bar, notes in HARP_B.items():
        lift = 2 if bar in (22, 26) else 0              # the harmonic rhythm breathes with the tune
        for beat, (p, v) in enumerate(zip(notes, (44, 38, 40, 42)), start=1):
            h.add(bar, beat, p, 1, v + lift)


# ── exploration ──────────────────────────────────────────────────────────────
def explora_intro(s):
    """Bars 1-4: Em | Em | F/E | B7sus4-B7. E drone, the head on the horn, a far forge."""
    vc, cb, va, hn = s['Cellos Sus Quiet'], s['Basses Sus Quiet'], s['Violas Sus Quiet'], s['Trompa']
    vc.line(1, 1, [('E2', 12), ('B2', 4)], [34, 37])
    cb.line(1, 1, [('E1', 12), ('B1', 4)], [33, 36])
    for p in (vc, cb):
        p.phrase([(1, 1, 84), (3, 1, 90), (4, 1, 92), (4, 4.5, 84)])
    va.line(1, 1, [('B3', 8), ('A3', 8)], [31, 33], tie=True)
    va.line(1, 1, [('E3', 9), ('F3', 3), ('F#3', 4)], [30, 32, 34])   # F after the horn's C4
    va.phrase([(1, 1, 80), (3, 1, 84), (4, 1, 86), (4, 3, 98), (4, 4.5, 92)])   # slight swell in bar 4
    play(hn, 'head', [46, 49, 52, 47])
    hn.phrase([(2, 1, 78), (3, 1, 90), (3, 3, 94), (4, 1, 86), (4, 2.5, 70)])
    fd = s['Frame Drum']
    for bar, (a, b) in zip(range(1, 5), [(32, 28), (33, 29), (35, 30), (36, 32)]):
        fd.add(bar, 1, FD_BIG_MUTED, .5, a)
        fd.add(bar, 3, FD_BIG_MUTED, .5, b)
    s['Forge'].add(1, 1, FORGE_SOFT, .5, 34, hv=2)
    s['Forge'].add(3, 1, FORGE_SOFT, .5, 37, hv=2)


def explora_a(s):
    """Bars 5-12: Em | Am-B7-Em | Am-F | Dm-E7-Am || Cmaj7 | Am7-D7 | G-Cmaj7 | F#ø7-B7."""
    hn = s['Trompa']
    play(hn, 'motif5', contour('motif5', 62, 5))
    hn.phrase([(5, 1, 92), (5, 3, 98), (6, 1, 96), (6, 3, 90), (6, 4, 100), (6, 4.75, 86)])
    cl = s['Clarinet Sus']
    play(cl, 'seq7', contour('seq7', 62, 5), cut={8: .5})            # breath at the end of bar 8
    play(cl, 'cons9', contour('cons9', 64, 6), cut={11: 1})          # breath on beat 4 of bar 12
    cl.phrase([(7, 1, 90), (7, 3, 98), (8, 1, 96), (8, 3, 90), (8, 4, 98), (8, 4.5, 84)])
    cl.phrase([(9, 1, 92), (9, 2, 100), (10, 1, 96), (10, 3, 92), (10, 4, 100), (11, 4, 102),
               (12, 1, 98), (12, 3, 94), (12, 3.75, 76)])
    va = s['Violas Sus Quiet']                    # guide tones, never above E4 under the horn
    va.line(5, 1, [('B3', 8), ('C4', 5), ('D4', 1), ('C4', 2), ('B3', 4), ('C4', 4), ('B3', 4),
                   ('E4', 2), ('D#4', 2)], [44, 46, 47, 45, 43, 45, 44, 47, 46], tie=True)
    va.line(5, 1, [('G3', 5), ('A3', 1), ('G3', 2), ('A3', 5), ('G#3', 1), ('A3', 2), ('G3', 6), ('A3', 2),
                   ('G3', 4), ('A3', 4)], [43, 45, 43, 45, 46, 44, 43, 45, 44, 46], tie=True)
    va.phrase([(5, 1, 86), (6, 3, 90), (7, 1, 88), (8, 3, 92), (9, 1, 88), (11, 1, 90), (12, 1, 94),
               (12, 4.5, 90)])
    vc = s['Cellos Sus Quiet']
    vc.line(5, 1, [('E3', 4), ('A2', 1), ('B2', 1), ('E3', 2), ('A2', 2), ('F2', 2), ('D3', 1), ('E3', 1),
                   ('A2', 2), ('C3', 4), ('A2', 2), ('D3', 2), ('G2', 2), ('C3', 2), ('F#2', 2), ('B2', 2)],
            [48, 46, 47, 46, 47, 46, 48, 47, 45, 46, 45, 47, 46, 46, 47, 49])
    vc.phrase([(5, 1, 88), (8, 3, 92), (9, 1, 88), (12, 3, 96), (12, 4.5, 92)])
    fd = s['Frame Drum']
    for bar in range(5, 13):
        lift = 2 if bar in (8, 12) else 0
        fd.add(bar, 1, FD_BIG_MUTED, .5, 48 + lift)
        fd.hit(bar, 6, FD_SMALL_MUTED, 41, E8)
        fd.add(bar, 3, FD_BIG_MUTED, .5, 44 + lift)
        fd.hit(bar, 14, FD_SMALL_MUTED, 40 + lift, E8)
    s['Timpani'].add(8, 1, 'A2', 1, 48)
    s['Timpani'].add(12, 1, 'B2', 1, 52)


A2_COUNTER = [('G3', 2), ('E3', 2), ('E3', 1), ('D#3', 1), ('E3', 2), ('C4', 2), ('A3', 2), ('F3', 1), ('G#3', 1),
              ('A3', 2), ('G4', 4), ('E4', 2), ('D4', 2), ('E4', 2), ('C4', 2), ('A3', 2), ('C4', 2)]


def explora_a2(s):
    """Bars 13-20: Em-C | Am7-B7-C (deceptive) | Fmaj7-Dm7 | Bø7-E7-Am || Cmaj7 | Am7-Em7 | Cmaj7-Am7 | D7sus4-D7."""
    vn = s['Violins Sus']
    play(vn, 'motif13', contour('motif13', 64, 5))
    play(vn, 'seq15', contour('seq15', 66, 5))
    play(vn, 'cons17', [74, 76, 78, 82, 78, 76, 76, 74, 72, 66])
    vn.phrase([(13, 1, 90), (14, 3, 96), (15, 1, 92), (16, 3, 98), (17, 1, 100), (18, 1, 110),
               (19, 1, 112), (19, 3, 106), (20, 1, 100), (20, 4.5, 74)])
    hn = s['Trompa']                              # countermelody: moves when the tune holds
    hn.line(13, 1, A2_COUNTER, [50, 52, 52, 50, 52, 54, 52, 50, 52, 54, 60, 62, 58, 60, 58, 56, 58], tie=True)
    hn.phrase([(13, 1, 86), (14, 1, 92), (15, 1, 96), (16, 3, 90), (17, 1, 94), (18, 1, 102),
               (19, 1, 104), (20, 1, 96), (20, 4.5, 74)])
    va = s['Violas Sus Quiet']
    # the 7th of B7 (A3) is the common tone of bar 14; no unison with the horn's countermelody
    va.line(13, 1, [('E4', 4), ('C4', 1), (None, 1), ('C4', 2), ('A3', 2), ('C4', 2), ('B3', 2), ('C4', 2),
                    ('B3', 4), ('C4', 2), ('B3', 4), ('A3', 2), ('C4', 2), ('A3', 2)],
            [46, 45, 44, 44, 45, 44, 45, 44, 46, 45, 44, 45, 43], tie=True)
    va.line(13, 1, [('B3', 4), ('A3', 2), ('G3', 2), ('F3', 4), ('D3', 2), ('C3', 2), ('E3', 12),
                    ('G3', 2), ('F#3', 2)], [44, 45, 43, 44, 45, 44, 45, 44, 42], tie=True)
    va.phrase([(13, 1, 90), (16, 3, 92), (17, 1, 90), (19, 1, 96), (20, 1, 92), (20, 4.5, 80)])
    vc = s['Cellos Sus Quiet']
    vc.line(13, 1, [('E3', 2), ('C3', 2), ('A2', 1), ('B2', 1), ('C3', 2), ('F2', 2), ('D3', 2),
                    ('B2', 1), ('E2', 1), ('A2', 2), ('C2', 4), ('A2', 2), ('E2', 2), ('C3', 2), ('A2', 2),
                    ('D3', 4)], [50, 48, 48, 49, 47, 48, 50, 49, 48, 47, 50, 50, 48, 50, 48, 49])
    vc.phrase([(13, 1, 90), (16, 3, 94), (17, 1, 92), (19, 1, 98), (20, 1, 96), (20, 4.5, 86)])
    pz = s['Cellos Pizz']                         # the fifth on beats 2 and 4: the half-voiced march
    for bar, (two, four) in {13: ('B2', 'G2'), 14: ('F#3', 'G3'), 15: ('C3', 'A2'), 16: ('B2', 'E3'),
                             17: ('G2', 'G3'), 18: ('E3', 'B2'), 19: ('G3', 'E3'), 20: ('A2', 'A2')}.items():
        lift = 3 if bar in (17, 18, 19) else 0
        pz.add(bar, 2, two, 1, 46 + lift)
        pz.add(bar, 4, four, 1, 43 + lift)
    fd = s['Frame Drum']
    for bar in range(13, 21):
        lift = 3 if bar in (17, 18, 19) else 0
        fd.add(bar, 1, FD_BIG_MUTED, .5, 50 + lift)
        fd.hit(bar, 6, FD_SMALL_MUTED, 42 + lift, E8)
        fd.add(bar, 3, FD_BIG_MUTED, .5, 46 + lift)
        if bar % 2 == 0:
            fd.hit(bar, 14, FD_SMALL, 44 + lift, E8)
        else:
            fd.hit(bar, 14, FD_SMALL_MUTED, 41 + lift, E8)
    s['Timpani'].add(16, 1, 'A2', 1, 50)
    s['Timpani'].add(20, 3, 'D2', 1, 52)


B_COUNTER = [('G4', 4), ('A4', 2), ('F#4', 2), ('Eb4', 2), ('D4', 2), ('E4', 2), ('D#4', 2)]


def explora_b(s):
    """Bars 21-28 (the breath, G major): G | Em7-Cmaj7 | Am7-D7 | G-Em7 || Cmaj7 | D7 | Ebmaj7 | B7sus4-B7."""
    rec = s['Recorder']
    play(rec, 'aug21', [57, 59, 60, 59, 57, 58, 57, 57, 56], cut={8: .5}, hv=2)
    play(rec, 'cons25', [59, 58, 60, 58, 57, 58, 57, 58, 56], cut={4: .5}, hv=2)
    rec.phrase([(21, 1, 96), (22, 3, 102), (24, 1, 96), (24, 4, 86)])
    rec.phrase([(25, 1, 96), (26, 1, 104), (27, 1, 98), (28, 3, 94), (28, 4.5, 82)])
    cl = s['Clarinet Sus']                        # at least 10 below the recorder
    cl.line(25, 1, B_COUNTER, [42, 43, 41, 42, 41, 42, 41], hv=2)
    cl.phrase([(25, 1, 84), (26, 1, 88), (28, 4.5, 78)])
    vc = s['Cellos Sus Quiet']
    vc.line(21, 1, [('G2', 4), ('E2', 2), ('C3', 2), ('A2', 2), ('D3', 2), ('G2', 2), ('E2', 2),
                    ('C3', 4), ('D2', 4), ('Eb2', 4), ('B2', 4)], [36, 35, 34, 35, 34, 36, 34, 35, 36, 37, 36])
    vc.phrase([(21, 1, 82), (28, 4.5, 80)])
    fd = s['Frame Drum']
    for bar, v in ((21, 32), (23, 30), (25, 33), (27, 31)):
        fd.add(bar, 1, FD_BIG_MUTED, .5, v)


BRIDGE_HELD = [('G3', 4), ('F#3', 4), ('G3', 4), ('Bb3', 2), ('A3', 2)]
VIOLA_BRIDGE_UP = [('E4', 4), ('D4', 4), ('B3', 4), ('C4', 3), ('B3', 1)]
VIOLA_BRIDGE_LOW = [('C4', 4), ('A3', 4), ('E3', 6), ('F#3', 2)]


def explora_bridge(s):
    """Bars 29-32: C (bVI) | D (bVII) | Em - Em/D | C7 - B7 (augmented sixth). Crescendo p -> mf."""
    vn = s['Violins Sus']
    play(vn, 'frag29', [56 + int(round(24 * i / 11)) for i in range(12)])
    vn.phrase([(29, 1, 80), (32, 4.5, 118)], shape='lin')
    hn = s['Trompa']
    hn.line(29, 1, BRIDGE_HELD, [46, 50, 56, 62, 64])
    hn.phrase([(29, 1, 76), (32, 4.5, 114)], shape='lin')
    tr = s['Violas Trem']
    tr.line(29, 1, VIOLA_BRIDGE_UP, [34, 44, 54, 60, 62], tie=True)
    tr.line(29, 1, VIOLA_BRIDGE_LOW, [34, 44, 54, 62], tie=True)
    tr.phrase([(29, 1, 74), (32, 4.5, 118)], shape='lin')
    for name, octave, vels in (('Cellos Sus', 0, [52, 58, 62, 64, 70, 74]), ('Basses Sus', -12, [50, 56, 60, 62, 68, 72])):
        s[name].line(29, 1, [(P(p) + octave, b) for p, b in
                             [('C3', 4), ('D3', 4), ('E3', 2), ('D3', 2), ('C3', 2), ('B2', 2)]], vels)
        s[name].phrase([(29, 1, 70), (32, 4.5, 116)], shape='lin')
    fd = s['Frame Drum']
    for i, bar in enumerate(range(29, 33)):
        fd.add(bar, 1, FD_BIG, .5, 46 + 6 * i)
        fd.add(bar, 3, FD_BIG, .5, 44 + 6 * i)
    for k, pos in enumerate((2, 4, 6, 10, 12, 14)):
        fd.hit(32, pos, FD_SMALL_MUTED, 48 + 3 * k, E8)
    roll = s['Timpani Roll']
    roll.add(31, 1, 'E2', 6, 62, hv=2)               # E is in C7; B2 arrives with B7
    roll.add(32, 3, 'B2', 2, 72, hv=2)
    roll.phrase([(31, 1, 62), (32, 4.5, 120)], shape='lin')


RETURN_COUNTER = [('E5', 4), ('F#5', 2), ('G5', 2), ('A5', 4), ('F5', 1), ('G#5', 1), ('A5', 2)]
RETURN_HORN = [('G4', 2), ('E4', 2), ('A4', 2), ('F#4', 2), ('E4', 2), ('B3', 2), ('A3', 2), ('D#4', 2), ('E4', 2)]
RETURN_BASS = [('E2', 2), ('C2', 2), ('A1', 1), ('B1', 1), ('E2', 2), ('A1', 2), ('F1', 2), ('B1', 1), ('E2', 1),
               ('A1', 2), ('C2', 4), ('D2', 4), ('A1', 1), ('E1', 1), ('G1', 2), ('B1', 4)]
CLIMAX_TAIL = [('C3', 4), ('D3', 4), ('A2', 1), ('E2', 1), ('G2', 2), ('B2', 4)]
RETURN_VIOLA_UP = [('C4', 4), ('A3', 4), ('C4', 2), ('E4', 4), ('B3', 2)]
RETURN_VIOLA_LOW = [('G3', 5), ('F#3', 3), ('G3', 4), ('A3', 2), ('F#3', 2)]


def explora_return(s):
    """Bars 33-40: Em-C | Am-B7-Em | Am-F | Bø7-E7-Am || Cmaj7 (climax) | D | Am7-Am7/E-Em/G | B7sus4-B7."""
    hn, vc = s['Trompa'], s['Cellos Sus']
    play(hn, 'motif33', contour('motif33', 74, 4), hv=2)
    play(vc, 'motif33', contour('motif33', 72, 4))
    hn.phrase([(33, 1, 100), (34, 1, 104), (34, 3, 100), (34, 4.5, 94)])
    cl, va = s['Clarinet Sus'], s['Violas Sus']
    play(cl, 'seq35', contour('seq35', 76, 4))
    play(va, 'seq35', contour('seq35', 72, 4))
    for p in (cl, va):
        p.phrase([(35, 1, 102), (36, 1, 106), (36, 3, 102), (36, 4.5, 94)])
    vn, fl = s['Violins Sus'], s['Flute Sus']
    vn.line(33, 1, RETURN_COUNTER, [68, 66, 68, 70, 66, 68, 70])
    climax = [90, 84, 82, 80, 78, 76, 76, 74, 68]
    play(vn, 'climax37', climax, hv=2)
    play(fl, 'climax37', [v - 2 for v in climax], hv=2)
    vn.phrase([(33, 1, 96), (36, 3, 104), (37, 1, 120), (38, 1, 110), (39, 1, 102), (40, 1, 94), (40, 4.5, 80)])
    fl.phrase([(37, 1, 112), (38, 1, 104), (39, 1, 98), (40, 1, 92), (40, 4.5, 78)])
    hn.line(37, 1, RETURN_HORN, [86, 80, 76, 72, 68, 64, 60, 58, 52], hv=0)
    hn.phrase([(37, 1, 104), (38, 1, 100), (39, 1, 96), (40, 1, 92), (40, 4.5, 88), (41, 1, 84), (41, 2.5, 70)])
    va.line(37, 1, RETURN_VIOLA_UP, [72, 70, 68, 68, 64], tie=True)
    va.line(37, 1, RETURN_VIOLA_LOW, [70, 68, 66, 65, 63], tie=True)
    va.phrase([(37, 1, 104), (40, 4.5, 86)])
    cb = s['Basses Sus']
    cb.line(33, 1, RETURN_BASS, [72, 70, 70, 71, 72, 72, 71, 72, 71, 72, 80, 76, 74, 72, 72, 70])
    cb.phrase([(33, 1, 100), (36, 3, 104), (37, 1, 112), (39, 1, 102), (40, 4.5, 88)])
    vc.line(37, 1, CLIMAX_TAIL, [82, 76, 72, 70, 70, 66])
    vc.phrase([(37, 1, 110), (39, 1, 100), (40, 4.5, 86)])
    fd = s['Frame Drum']
    for bar in range(33, 41):
        top = 78 if bar == 37 else 70 - abs(bar - 36) * 2
        fd.add(bar, 1, FD_BIG, .5, top)
        fd.add(bar, 2, FD_SMALL_MUTED, .5, top - 12)
        fd.add(bar, 3, FD_BIG, .5, top - 6)
        fd.add(bar, 4, FD_SMALL_MUTED, .5, top - 14)
    tp = s['Timpani']
    tp.add(33, 1, 'E2', 1, 76)
    tp.add(37, 1, 'C2', 2, 88, hv=0)
    tp.add(40, 3, 'B2', 1, 66)


def explora_codetta(s):
    """Bars 41-44: Em | Em | F/E | B7sus4-B7 (as the intro: the seam 44 -> 1 is the seam 4 -> 5)."""
    vq = s['Violins Sus Quiet']
    play(vq, 'final41', [52], cut={0: 1}, hv=2)     # releases on beat 4
    vq.phrase([(41, 1, 100), (41, 3.5, 60)])
    hn = s['Trompa']
    play(hn, 'echo42', [48, 46], hv=3)
    hn.phrase([(42, 1, 86), (42, 3, 80), (42, 4.5, 62)])
    va = s['Violas Sus Quiet']
    va.line(41, 1, [('B3', 8), ('A3', 8)], [32, 30], tie=True)
    va.line(41, 1, [('E3', 9), ('F3', 3), ('F#3', 4)], [31, 30, 31])
    va.phrase([(41, 1, 84), (44, 4.5, 74)])
    s['Cellos Sus Quiet'].line(41, 1, [('E2', 12), ('B2', 4)], [36, 33])
    s['Basses Sus Quiet'].line(41, 1, [('E1', 12), ('B1', 4)], [35, 32])
    for name in ('Cellos Sus Quiet', 'Basses Sus Quiet'):
        s[name].phrase([(41, 1, 90), (43, 1, 86), (44, 4.5, 80)])
    fd = s['Frame Drum']
    for bar, (a, b) in zip(range(41, 45), [(36, 32), (34, 30), (33, 30), (32, 29)]):
        fd.add(bar, 1, FD_BIG_MUTED, .5, a)
        fd.add(bar, 3, FD_BIG_MUTED, .5, b)
    s['Forge'].add(43, 1, FORGE_SOFT, .5, 36, hv=2)


# ── combat ───────────────────────────────────────────────────────────────────
def combate_intro(s):
    """Bars 1-4: the same E drone as a 3+3+2 spiccato ostinato; the head in marcato brass."""
    vc, cb = s['Cellos Spic'], s['Basses Spic']
    for bar, base, slope in ((1, 54, 0), (2, 55, 0), (3, 56, 2), (4, 56, 4)):
        cello_ostinato(vc, bar, base, slope, lo=40, hi=59, phrygian=bar == 3)
    for bar, base in ((3, 66), (4, 70)):
        bass_accents(cb, bar, base)
    hm, tb = s['Horns Marc'], s['Trombones Marc']
    play(hm, 'head', 80, marcato=True, legato=False)
    play(tb, 'head', 78, shift=-12, marcato=True, legato=False)
    hm.phrase([(2, 1, 75), (3, 1, 84), (4, 1, 90), (4, 2.5, 82)])
    tb.phrase([(2, 1, 72), (3, 1, 80), (4, 1, 86), (4, 2.5, 78)])
    tr = s['Violas Trem']
    tr.line(3, 1, [('F3', 4), ('F#3', 4)], [36, 44])
    tr.line(3, 1, [('A3', 8)], [38])
    tr.phrase([(3, 1, 72), (4, 4.5, 96)])
    bd, fd = s['Bass Drum'], s['Frame Drum']
    for bar in range(1, 5):
        bd.hit(bar, 0, BD_HIT, 62 + bar, E8)
        bd.hit(bar, 8, BD_HIT, 56 + bar, E8)
        for pos, v in zip((3, 6, 11, 14), (54, 56, 55, 58)):
            fd.hit(bar, pos, FD_BIG, v + bar)
    for pos, v in zip(range(12, 16), (50, 58, 66, 74)):
        s['Tom'].hit(4, pos, TOM, v)
    s['Forge'].hit(2, 12, FORGE_HAMMER, 58, E8, hv=3)
    s['Forge'].hit(4, 12, FORGE_HAMMER, 62, E8, hv=3)


def combat_drums(s, bars, top=0, tom_bars=(), forge_bars=()):
    """Sections A, A' and the return: bass drum 0 and 8 (+11 in even bars), frame drum on the
    off accents 3, 6, 11, 14 and a small stroke on 15."""
    bd, fd = s['Bass Drum'], s['Frame Drum']
    for bar in bars:
        lift = top if bar == 37 else 0
        bd.hit(bar, 0, BD_HIT, 74 + lift, E8, hv=0 if lift else 4)
        bd.hit(bar, 8, BD_HIT, 68, E8)
        if bar % 2 == 0:
            bd.hit(bar, 11, BD_HIT, 60, E8)
        for pos, v in zip((3, 6, 11, 14), (60, 62, 58, 64)):
            fd.hit(bar, pos, FD_BIG, v)
        fd.hit(bar, 15, FD_SMALL, 48)
    for bar in tom_bars:
        for pos, v in zip(range(12, 16), (54, 62, 70, 78)):
            s['Tom'].hit(bar, pos, TOM, v)
    for bar in forge_bars:
        s['Forge'].hit(bar, 12, FORGE_HAMMER, 62 + (bar % 4), E8, hv=3)


def combate_a(s):
    hm, tb, vm, vn = s['Horns Marc'], s['Trombones Marc'], s['Violins Marc'], s['Violins Sus']
    play(hm, 'motif5', contour('motif5', 86, 4), marcato=True, legato=False)
    play(tb, 'motif5', contour('motif5', 82, 4), shift=-12, marcato=True, legato=False)
    hm.phrase([(5, 1, 95), (6, 1, 100), (6, 3, 100), (6, 4.5, 85)])
    tb.phrase([(5, 1, 85), (6, 1, 90), (6, 3, 90), (6, 4.5, 76)])
    play(vm, 'seq7', contour('seq7', 86, 4), marcato=True, legato=False)
    play(hm, 'seq7', contour('seq7', 80, 4), shift=-12, marcato=True, legato=False)
    vm.phrase([(7, 1, 95), (8, 3, 95), (8, 4.5, 88)])
    hm.phrase([(7, 1, 85), (8, 3, 85), (8, 4.5, 80)])
    play(vn, 'cons9', contour('cons9', 78, 5), cut={11: 1})
    vn.phrase([(9, 1, 96), (10, 3, 104), (11, 4, 104), (12, 3, 98), (12, 3.75, 80)])
    vc, cb, va = s['Cellos Spic'], s['Basses Spic'], s['Violas Spic']
    for bar in range(5, 13):
        cello_ostinato(vc, bar, 62 + (bar in (8, 12)) * 2, slope=2)
        bass_accents(cb, bar, 72)
        viola_offbeats(va, bar, 58)
    combat_drums(s, range(5, 13), forge_bars=(8, 12))
    for bar, p, v in ((5, 'E2', 74), (7, 'A2', 72), (9, 'C3', 76), (11, 'G2', 74)):
        s['Timpani'].add(bar, 1, p, 1, v)


GOLPES = {   # trombone hits on sixteenths 0 and 6 (beat 1 and the «and» of beat 2)
    13: (['E3', 'G3', 'B3'], ['E3', 'G3', 'B3']), 14: (['E3', 'G3', 'C4'], ['D#3', 'F#3', 'A3']),
    15: (['F3', 'A3', 'C4'], ['F3', 'A3', 'C4']), 16: (['D3', 'F3', 'A3'], ['D3', 'G#3', 'B3']),
    17: (['E3', 'G3', 'C4'], ['E3', 'G3', 'B3']), 18: (['E3', 'A3', 'C4'], ['E3', 'G3', 'C4']),
    19: (['E3', 'G3', 'B3'], ['E3', 'G3', 'C4']), 20: (['D3', 'G3', 'C4'], ['D3', 'G3', 'A3']),
}


def combate_a2(s):
    vn = s['Violins Sus']
    play(vn, 'motif13', contour('motif13', 80, 4))
    play(vn, 'seq15', contour('seq15', 82, 4))
    play(vn, 'cons17', [82, 84, 86, 90, 86, 84, 84, 82, 80, 78])
    vn.phrase([(13, 1, 98), (16, 3, 104), (17, 1, 106), (18, 1, 116), (19, 3, 106), (20, 1, 100),
               (20, 4.5, 82)])
    hs = s['Horns Sus']
    hs.line(13, 1, A2_COUNTER, 70, tie=True)
    hs.phrase([(13, 1, 80), (14, 1, 82), (15, 1, 84), (16, 3, 82), (17, 1, 84), (18, 1, 86),
               (19, 1, 86), (20, 1, 84), (20, 4.5, 78)])
    tb = s['Trombones Marc']
    for bar, (one, two) in GOLPES.items():
        for pos, chord in ((0, one), (6, two)):
            for p in chord:
                tb.notes.append(Note(P(p), t16(bar, pos), E8, 76, tag='hit'))
    tb.phrase([(13, 1, 85), (20, 4.5, 85)])
    vc, cb, va = s['Cellos Spic'], s['Basses Spic'], s['Violas Spic']
    for bar in range(13, 21):
        cello_ostinato(vc, bar, 64 + (2 if bar in (17, 18, 19) else 0), slope=2)
        bass_accents(cb, bar, 74, high_on=(1, 4) if bar % 2 else (2, 5))
        viola_offbeats(va, bar, 60, hi=62, targets=(55, 60))
    combat_drums(s, range(13, 21), tom_bars=(16, 20), forge_bars=(16,))
    for bar, p, v in ((13, 'E2', 74), (15, 'F2', 74), (17, 'C3', 78), (19, 'C3', 76)):
        s['Timpani'].add(bar, 1, p, 1, v)


def combate_b(s):
    hs, vn = s['Horns Sus'], s['Violins Sus']
    play(hs, 'aug21', contour('aug21', 70, 4))
    hs.phrase([(21, 1, 75), (22, 1, 85), (22, 4.5, 76)])
    hs.phrase([(23, 1, 76), (23, 3, 85), (24, 4.5, 75)])
    play(vn, 'cons25', contour('cons25', 66, 4))
    vn.phrase([(25, 1, 92), (26, 1, 100), (27, 1, 96), (28, 4.5, 84)])
    hs.line(25, 1, B_COUNTER, 62)
    hs.phrase([(25, 1, 70), (28, 4.5, 70)])
    vc = s['Cellos Spic']
    for bar in range(21, 29):
        cello_eighths(vc, bar, 52 + (2 if bar in (22, 26) else 0))
    pad = s['Violas Trem']                        # guide tones in tremolo, pp
    pad.line(21, 1, [('D4', 6), ('E4', 4), ('C4', 2), ('D4', 4), ('E4', 4), ('C4', 4), ('D4', 4), ('B3', 4)],
             [34, 35, 34, 35, 36, 35, 34, 33], tie=True)
    pad.line(21, 1, [('B3', 8), ('A3', 4), ('B3', 8), ('A3', 4), ('G3', 4)], [33, 34, 34, 35, 33], tie=True)
    pad.phrase([(21, 1, 80), (28, 4.5, 80)])
    fd = s['Frame Drum']
    for bar in range(21, 29):
        fd.hit(bar, 0, FD_BIG_MUTED, 50)
        fd.hit(bar, 6, FD_SMALL_MUTED, 42)
        fd.hit(bar, 8, FD_BIG_MUTED, 46)
        fd.hit(bar, 12, FD_SMALL_MUTED, 40)
    s['Timpani'].add(21, 1, 'G2', 1, 50)
    s['Timpani'].add(25, 1, 'C3', 1, 52)


def combate_bridge(s):
    vm, hm = s['Violins Marc'], s['Horns Marc']
    ramp = [62 + int(round(30 * i / 11)) for i in range(12)]
    play(vm, 'frag29', ramp, marcato=True, legato=False)
    play(hm, 'frag29', ramp, shift=-12, marcato=True, legato=False)
    vm.phrase([(29, 1, 80), (32, 4.5, 105)], shape='lin')
    hm.phrase([(29, 1, 75), (32, 4.5, 100)], shape='lin')
    ts = s['Trombones Sus']
    ts.line(29, 1, BRIDGE_HELD, 70)
    ts.phrase([(29, 1, 70), (32, 4.5, 96)], shape='lin')
    tr = s['Violas Trem']
    tr.line(29, 1, VIOLA_BRIDGE_UP, [48, 58, 68, 76, 78], tie=True)
    tr.line(29, 1, VIOLA_BRIDGE_LOW, [48, 58, 68, 78], tie=True)
    tr.phrase([(29, 1, 80), (32, 4.5, 120)], shape='lin')
    vc, cb = s['Cellos Spic'], s['Basses Spic']
    for i, bar in enumerate(range(29, 33)):
        cello_ostinato(vc, bar, 62 + 4 * i, slope=4)
        bass_accents(cb, bar, 70 + 4 * i)
    roll = s['Timpani Roll']
    roll.add(31, 1, 'E2', 6, 72, hv=2)
    roll.add(32, 3, 'B2', 2, 84, hv=2)
    roll.phrase([(31, 1, 62), (32, 4.5, 120)], shape='lin')
    bdr = s['Bass Drum Roll']
    bdr.add(32, 1, BD_ROLL, 4, 80, hv=2)
    bdr.phrase([(32, 1, 70), (32, 4.5, 112)], shape='lin')
    for bar, v in ((29, 66), (30, 70), (31, 74)):
        s['Bass Drum'].hit(bar, 0, BD_HIT, v, E8)
    cym_start = tick(33) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
    s['Cymbal'].notes.append(Note(CYM_CRESC, cym_start, tick(33) - cym_start, 74, jitter=False, hv=0))
    for k, pos in enumerate(range(8, 16)):
        s['Tom'].hit(32, pos, TOM, 46 + 5 * k)
    fd = s['Frame Drum']
    for bar in (29, 30):
        for pos in ACCENTS:
            fd.hit(bar, pos, FD_BIG, 54 + (4 if pos in (0, 8) else 0) + (bar - 29) * 3)
    for pos in range(16):
        fd.hit(31, pos, FD_SMALL, 40 + int(round(24 * pos / 15)) + (4 if pos in ACCENTS else 0), hv=3)


def combate_return(s):
    hm, tb, vm = s['Horns Marc'], s['Trombones Marc'], s['Violins Marc']
    play(hm, 'motif33', contour('motif33', 90, 4), marcato=True, legato=False)
    play(tb, 'motif33', contour('motif33', 86, 4), shift=-12, marcato=True, legato=False)
    hm.phrase([(33, 1, 104), (34, 3, 104), (34, 4.5, 96)])
    tb.phrase([(33, 1, 98), (34, 3, 98), (34, 4.5, 90)])
    play(vm, 'seq35', contour('seq35', 90, 4), marcato=True, legato=False)
    play(hm, 'seq35', contour('seq35', 84, 4), shift=-12, marcato=True, legato=False)
    vm.phrase([(35, 1, 105), (36, 3, 105), (36, 4.5, 98)])
    hm.phrase([(35, 1, 95), (36, 3, 95), (36, 4.5, 90)])
    vt = s['Violins Trem']
    vt.line(33, 1, RETURN_COUNTER, [72, 70, 72, 74, 70, 72, 74])
    vt.phrase([(33, 1, 96), (36, 3, 104), (36, 4.5, 98)])
    vn, hs = s['Violins Sus'], s['Horns Sus']
    climax = [100, 94, 92, 88, 86, 84, 84, 82, 78]
    play(vn, 'climax37', climax, hv=2)
    play(vn, 'final41', [74], hv=2)
    play(hs, 'climax37', 80, shift=-12)
    play(hs, 'final41', 76, shift=-12)
    vn.phrase([(37, 1, 122), (38, 1, 112), (39, 1, 104), (40, 1, 96), (41, 1, 90), (41, 4.5, 56)])
    hs.phrase([(37, 1, 108), (38, 1, 100), (39, 1, 94), (40, 1, 88), (41, 1, 85), (41, 4.5, 76)])
    ts = s['Trombones Sus']
    ts.line(37, 1, [(P(p) - 12, b) for p, b in RETURN_HORN], 72)
    ts.phrase([(37, 1, 92), (39, 1, 90), (40, 4.5, 86), (41, 2.5, 78)])
    vc, cb, va = s['Cellos Spic'], s['Basses Spic'], s['Violas Spic']
    for bar in range(33, 41):
        base = {37: 78, 38: 74, 39: 72, 40: 70}.get(bar, 74)
        cello_ostinato(vc, bar, base, slope=2)
        bass_accents(cb, bar, 78 + (6 if bar == 37 else 0), high_on=(1, 4) if bar % 2 else (2, 5))
        viola_offbeats(va, bar, 64, targets=(60, 64))
    combat_drums(s, range(33, 41), top=22, tom_bars=(36,), forge_bars=(36,))
    for k, pos in enumerate(range(8, 12)):
        s['Tom'].hit(40, pos, TOM, 50 + 4 * k)
    for pos, v in zip(range(12, 16), (66, 72, 78, 84)):
        s['Tom'].hit(40, pos, TOM, v)
    tp = s['Timpani']
    for bar, p, v in ((33, 'E2', 86), (34, 'A2', 80), (35, 'A2', 82), (36, 'B2', 84), (37, 'C2', 100),
                      (38, 'D2', 90), (39, 'A2', 84), (40, 'B2', 80)):
        tp.add(bar, 1, p, 1, v, hv=0 if bar == 37 else 4)
    s['Cymbal'].add(33, 1, CYM_HIT, 1, 72, hv=2)
    s['Cymbal'].add(37, 1, CYM_HIT, 1, 80, hv=0)
    s['Forge'].add(37, 1, FORGE_SECOND, .5, 84, hv=0)


def combate_codetta(s):
    hm = s['Horns Marc']
    play(hm, 'echo42', [76, 72], marcato=True, legato=False)
    hm.phrase([(42, 1, 85), (42, 4.5, 76)])
    ts = s['Trombones Sus']
    ts.line(43, 1, [('A3', 8)], 62)
    ts.line(43, 1, [('F3', 4), ('F#3', 4)], [60, 62])
    ts.phrase([(43, 1, 70), (44, 4.5, 70)])
    vc, cb = s['Cellos Spic'], s['Basses Spic']
    for bar, base in ((41, 58), (42, 57), (43, 56), (44, 56)):
        cello_ostinato(vc, bar, base, slope=4 if bar == 44 else 0, lo=40, hi=59, phrygian=bar == 43)
    for bar, base in ((41, 70), (42, 66)):
        bass_accents(cb, bar, base)
    bd, fd = s['Bass Drum'], s['Frame Drum']
    for bar, v in ((41, 66), (42, 62), (43, 60), (44, 58)):
        bd.hit(bar, 0, BD_HIT, v, E8)
        for pos in ACCENTS:
            fd.hit(bar, pos, FD_BIG, v - 8 + (4 if pos in (0, 8) else 0))
    for pos, v in zip(range(12, 16), (50, 58, 66, 74)):
        s['Tom'].hit(44, pos, TOM, v)
    s['Forge'].hit(44, 12, FORGE_HAMMER, 62, E8, hv=3)


SCORE = {
    'explora': (explora_intro, explora_a, explora_a2, explora_b, explora_bridge, explora_return,
                explora_codetta),
    'combate': (combate_intro, combate_a, combate_a2, combate_b, combate_bridge, combate_return,
                combate_codetta),
}


# ── performance: humanization, legato, bar lines ─────────────────────────────
def perform(part: Part):
    """Seeded by the track name: a track that exists in both versions with the same notes is
    humanized identically in both (the common layers)."""
    rng = random.Random(f'{SEED}:{part.name}')
    part.notes.sort(key=lambda n: (n.ws, n.pitch))
    phrase_starts = {(min(pts)[0] // CC_STEP) * CC_STEP for pts, _ in part.phrases}
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
        n.start = max(0, n.ws + shift[n.ws])
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
            n.end = min(m.start for m in nxt) + rng.randint(11, 31)        # 10-30 ms overlap
        elif n.we % BAR == 0:
            n.end = min(n.end, n.we - GUARD)                              # leaves the bar line free
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
    common_layers(s)
    for section in SCORE[version]:
        section(s)
    for part in s.values():
        perform(part)
    return s


def write_midi(parts: dict[str, Part], path: str):
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='Em', time=0))
        events = []
        for t, v in sorted(part.cc.items()):
            events.append((t, 1, mido.Message('control_change', channel=part.channel, control=part.ctrl,
                                              value=min(MAX_CC, v))))
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
        print(f"\n[{v}] {'track':<18} {'sfz':<58} {'notes':>5}  range used")
        for name, part in parts.items():
            keys = sfz_keys(SFZ_OF[v][name])
            bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
            if bad:
                raise SystemExit(f'{v} {name}: notes outside {SFZ_OF[v][name]}: {bad}')
            lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
            print(f'  {name:<18} {"/".join(part.lib)[-58:]:<58} {len(part.notes):>5}  '
                  f'{name_of(lo)}-{name_of(hi)} ({lo}-{hi})')
        last = max(n.end for p in parts.values() for n in p.notes)
        check(f'{v}: 1  everything inside 80.000 s', sec(last) < 80.0, f'last note-off {sec(last):.3f} s')
        for (label, first, last_bar), limit in zip(SECTIONS, LAYER_LIMITS[v]):
            worst, where = sounding(parts, tick(first), tick(last_bar + 1))
            check(f'{v}: 6  layers {label} <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
        top = max(n.vel for p in parts.values() for n in p.notes)
        cc_top = max((val for p in parts.values() for val in p.cc.values()), default=0)
        check(f'{v}: 8  velocity <= 105, CC <= 112', top <= MAX_VEL and cc_top <= MAX_CC, f'{top} / {cc_top}')
        forge = len(parts['Forge'].notes)
        check(f'{v}: 11 forge hits', forge <= (3 if v == 'explora' else 8), str(forge))
        step_ok = all(b - a >= CC_STEP for p in parts.values() for a, b in zip(sorted(p.cc), sorted(p.cc)[1:]))
        check(f'{v}:    CC points at most every 1/8 bar', step_ok)
        for name, longest in SONATINA_MAX_S.items():
            if name in parts:
                worst = max(sec(n.end - n.start) for n in parts[name].notes)
                check(f'{v}: 9  {name} CC1 at tick 0, notes <= {longest} s',
                      0 in parts[name].cc and worst <= longest, f'longest {worst:.2f} s')
    for name in COMMON:
        a = [(n.pitch, n.start, n.end, n.vel) for n in scores['explora'][name].notes]
        b = [(n.pitch, n.start, n.end, n.vel) for n in scores['combate'][name].notes]
        check(f'4  common layer {name} identical in both versions', a == b, f'{len(a)} notes')
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
