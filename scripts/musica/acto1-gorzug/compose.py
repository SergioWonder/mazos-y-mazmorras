"""Gorzug's boss theme «El festín de Gorzug»: score generator (brief: docs/musica/acto1-gorzug.md).

Writes build/acto1-gorzug.mid (one MIDI track per instrument and articulation: VSCO 2 CE, VCSL and
Sonatina) and prints a verification table against the brief (ranges, registers, leitmotif, the
bar-16 silence, figures, layers, register clashes, dynamics, CC1 curves, note lengths, the 3+3+2
accents, parallels, repetition, loop seam). Exits with status 1 if any check fails.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-gorzug/compose.py
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
E8 = BEAT // 2                                       # eighth
S16 = BEAT // 4                                      # sixteenth
BAR = 4 * BEAT
BARS = 56
LOOP_END = BARS * BAR
BPM = 160
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per 1/8 bar
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # +-8 ms
HUMAN_VEL = 6
SEED = 160
GUARD = 12                                           # ticks a phrase-final note stops early
MAX_VEL = 105
MAX_CC = 112
OUT = os.path.join(HERE, 'build', 'acto1-gorzug.mid')

SECTIONS = [('Intro', 1, 4, 8), ('A', 5, 12, 11), ("A'", 13, 20, 11), ('B', 21, 28, 9),
            ('Bridge', 29, 36, 11), ('Climax', 37, 48, 12), ('Codetta', 49, 56, 10)]


def tick(bar: int, eighth: float = 0.0) -> int:
    return (bar - 1) * BAR + int(round(eighth * E8))


def tick16(bar: int, sixteenth: float) -> int:
    return (bar - 1) * BAR + int(round(sixteenth * S16))


# Notes on these ticks never anticipate (section starts, the bite of bar 16 and the bar after
# its silence): humanization only delays them.
NO_EARLY = {tick(first) for _, first, _, _ in SECTIONS} | {tick(16), tick(17), tick(29), tick(37)}

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


def pc_in(pc: int, lo: int, hi: int) -> int:
    """Lowest pitch of pitch class pc inside [lo, hi]."""
    for p in range(lo, hi + 1):
        if p % 12 == pc % 12:
            return p
    raise ValueError(f'pitch class {pc} not in {lo}-{hi}')


# ── harmony (section 4) ──────────────────────────────────────────────────────
# name -> pitch classes, root first. Bite chords use only triad (+ dominant 7th).
CHORDS = {
    'Dm': [2, 5, 9], 'Dm(add9)': [2, 5, 9, 4], 'Dm(maj7)': [2, 5, 9, 1], 'Eb': [3, 7, 10],
    'Ebmaj7': [3, 7, 10, 2], 'Em': [4, 7, 11], 'F': [5, 9, 0], 'Fm': [5, 8, 0], 'Gm': [7, 10, 2],
    'Gm7': [7, 10, 2, 5], 'Ab': [8, 0, 3], 'A': [9, 1, 4], 'A7': [9, 1, 4, 7], 'A7(b9)': [9, 1, 4, 7, 10],
    'A7(b13)': [9, 1, 4, 7, 5], 'Bb': [10, 2, 5], 'Bbmaj7': [10, 2, 5, 9], 'Bb7': [10, 2, 5, 8],
    'C': [0, 4, 7], 'C#dim7': [1, 4, 7, 10],
}
BITE_TONES = {'A7': 4, 'A7(b9)': 4, 'Bb7': 4}         # chords whose bite keeps the 7th

# bar -> [(eighth, chord, bass pitch class)]. Deviations from section 4, both deliberate:
# - bars 4 and 55: C#dim7 sounds over the D pedal (the contrabassoon and the ostinato keep D);
#   a bass C# under the violas' D3-C#3 (bar 4) would move in octaves with it.
# - bars 39 and 41: the lament bass moves on eighth 3 (the 3+3+2 accent) instead of beat 3, so the
#   melody's Bb4-A4 and G4-F4 become 4-3 / 9-8 suspensions instead of octaves with the bass; in 41
#   the E of bar 42 arrives on eighth 6 (A7(b13)/E under the tune's F4), so F-F / E-E between the
#   tune and the bass are not consecutive octaves either.
# - bar 14: the bass passes to D on eighth 6 (Bbmaj7/D), so the tune's F5-G5 over Bb-C is not a
#   pair of fifths with the bass.
D, Eb_, E_, F_, G_, Ab_, A_, Bb_, C_ = 2, 3, 4, 5, 7, 8, 9, 10, 0
HARMONY = {
    1: [(0, 'Dm', D)], 2: [(0, 'Dm', D)], 3: [(0, 'Eb', D)], 4: [(0, 'Dm', D), (6, 'C#dim7', D)],
    5: [(0, 'Dm', D)], 6: [(0, 'Bb', Bb_)], 7: [(0, 'Gm7', G_), (6, 'A7', A_)], 8: [(0, 'Dm', D)],
    9: [(0, 'Gm', G_)], 10: [(0, 'Dm', F_)], 11: [(0, 'Ebmaj7', Eb_)], 12: [(0, 'A7(b9)', A_)],
    13: [(0, 'Dm(add9)', D)], 14: [(0, 'Bbmaj7', Bb_), (6, 'Bbmaj7', D)], 15: [(0, 'C', C_), (6, 'A7', A_)],
    16: [(0, 'Bb', D)], 17: [(0, 'Gm', G_)], 18: [(0, 'A7', G_)], 19: [(0, 'Dm', F_)],
    20: [(0, 'Bb7', Bb_), (4, 'A7', A_)],
    21: [(0, 'Dm', D)], 22: [(0, 'Eb', D)], 23: [(0, 'Dm', D)], 24: [(0, 'Dm(maj7)', D)],
    25: [(0, 'Gm', D)], 26: [(0, 'Ab', D)], 27: [(0, 'Gm', D)], 28: [(0, 'A7(b9)', A_)],
    29: [(0, 'Dm', D)], 30: [(0, 'Eb', Eb_)], 31: [(0, 'Em', E_)], 32: [(0, 'F', F_)],
    33: [(0, 'Gm', G_)], 34: [(0, 'Ab', Ab_)], 35: [(0, 'A7(b13)', A_)], 36: [(0, 'A7(b9)', A_), (4, 'A7', A_)],
    37: [(0, 'Dm', D)], 38: [(0, 'F', C_)], 39: [(0, 'Gm', Bb_), (3, 'F', A_)], 40: [(0, 'Fm', Ab_)],
    41: [(0, 'Eb', G_), (3, 'Bb', F_), (6, 'A7(b13)', E_)], 42: [(0, 'A7', E_)], 43: [(0, 'Dm', D)], 44: [(0, 'Bbmaj7', Bb_)],
    45: [(0, 'Dm', D)], 46: [(0, 'Eb', D)], 47: [(0, 'Bbmaj7', D)], 48: [(0, 'A7(b9)', A_)],
    49: [(0, 'Dm', D)], 50: [(0, 'Dm', D)], 51: [(0, 'Eb', D)], 52: [(0, 'Dm', D)],
    53: [(0, 'Gm', D)], 54: [(0, 'Ab', D)], 55: [(0, 'Dm', D), (6, 'C#dim7', D)], 56: [(0, 'A7(b9)', A_)],
}


def chord_at(bar: int, eighth: float) -> tuple[str, int]:
    name, bass = HARMONY[bar][0][1:]
    for e, n, b in HARMONY[bar]:
        if eighth >= e:
            name, bass = n, b
    return name, bass


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
    tag: str = ''
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
        n = Note(P(pitch), tick(bar, eighth), int(round(eighths * E8)), vel, **kw)
        self.notes.append(n)
        return n

    def add16(self, bar, sixteenth, pitch, sixteenths, vel, **kw) -> Note:
        n = Note(P(pitch), tick16(bar, sixteenth), int(round(sixteenths * S16)), vel, **kw)
        self.notes.append(n)
        return n

    def chord(self, bar, eighth, pitches, eighths, vel, **kw):
        for i, p in enumerate(pitches):
            self.add(bar, eighth, p, eighths, vel + (i % 2), **kw)

    def line(self, bar, items, vels, legato=False, **kw):
        """items = [(pitch, eighth position, eighths)] inside one bar (positions may exceed 8)."""
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        for (pitch, pos, length), v in zip(items, vels):
            self.add(bar, pos, pitch, length, v, legato=legato, **kw)

    def chords_tied(self, events, vel, legato=True, **kw):
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
                    n = Note(p, t0, t1 - t0, v, legato=legato, **kw)
                    self.notes.append(n)
                    open_notes[p] = n

    def curve(self, points, number=None, shape='cos'):
        """Controller breakpoints [(bar, eighth, value)], sampled on the 1/8-bar grid."""
        number = number if number is not None else (1 if self.dynamics == 'cc1' else 11)
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
STRINGS = SSO + ('Strings - Performance',)
WINDS = SSO + ('Woodwinds - Performance',)
VCSL_ID = ('VCSL', 'Idiophones', 'Struck Idiophones')
VCSL_MEM = ('VCSL', 'Membranophones', 'Struck Membranophones')

# Score order: (track name, library path, dynamics, pitched). Every articulation is its own track.
LAYOUT = [
    ('Clarinet Stac', ('VSCO-2-CE', 'ClarinetStac.sfz'), 'vel', True),
    ('Contrabassoon Sustain', WINDS + ('Contrabassoon Solo Sustain (looped).sfz',), 'cc1', True),
    ('Contrabassoon Staccato', WINDS + ('Contrabassoon Solo Staccato.sfz',), 'vel', True),
    ('Horns Marcato', BRASS + ('Horns Marcato.sfz',), 'cc1', True),
    ('Horns Sustain', BRASS + ('Horns Sustain.sfz',), 'cc1', True),
    ('Trombones Marcato', BRASS + ('Trombones Marcato.sfz',), 'cc1', True),
    ('Trombones Sustain', BRASS + ('Trombones Sustain (looped).sfz',), 'cc1', True),
    ('Trombones Staccato', BRASS + ('Trombones Staccato.sfz',), 'vel', True),
    ('Bass Trombone Marcato', BRASS + ('Bass Trombone Solo Marcato.sfz',), 'cc1', True),
    ('Bass Trombone Sustain', BRASS + ('Bass Trombone Solo Sustain (looped).sfz',), 'cc1', True),
    ('Tuba Marcato', BRASS + ('Tuba Marcato.sfz',), 'cc1', True),
    ('Timpani', ('VSCO-2-CE', 'Timpani.sfz'), 'vel', True),
    ('Timpani Roll', ('VSCO-2-CE', 'TimpaniRolls.sfz'), 'vel', True),
    ('Bass Drum', VCSL_MEM + ('Bass Drum 2.sfz',), 'vel', False),
    ('Tom', VCSL_MEM + ('Tom 2.sfz',), 'vel', False),
    ('Forge', VCSL_ID + ('Brake Drum.sfz',), 'vel', False),
    ('Cymbal', VCSL_ID + ('Suspended Cymbal 2.sfz',), 'vel', False),
    ('Tam-tam', SSO + ('Percussion', 'Cymbals & Tamtam.sfz'), 'vel', False),
    ('Gong', VCSL_ID + ('Gong 1.sfz',), 'vel', False),
    ('Xylophone', VCSL_ID + ('Xylophone - Soft Mallets.sfz',), 'vel', True),
    ('Large Chorus', SSO + ('Chorus - Performance', 'Large Chorus.sfz'), 'cc1', True),
    ('1st Violins Marcato', STRINGS + ('1st Violins Marcato.sfz',), 'cc1', True),
    ('Violins Sus', ('VSCO-2-CE', 'ViolinEnsSusVib.sfz'), 'vel', True),
    ('Violins Trem', ('VSCO-2-CE', 'ViolinEnsTrem.sfz'), 'vel', True),
    ('Violas Trem', ('VSCO-2-CE', 'ViolaEnsTrem.sfz'), 'vel', True),
    ('Violas Spic', ('VSCO-2-CE', 'ViolaEnsSpic.sfz'), 'vel', True),
    ('Violas Col Legno', STRINGS + ('Violas Col Legno.sfz',), 'vel', True),
    ('Cellos Spic', ('VSCO-2-CE', 'CelloEnsSpic.sfz'), 'vel', True),
    ('Celli Col Legno', STRINGS + ('Celli Col Legno.sfz',), 'vel', True),
    ('Basses Spic', ('VSCO-2-CE', 'ContrabassSpic.sfz'), 'vel', True),
    ('Basses Trem', ('VSCO-2-CE', 'ContrabassTrem.sfz'), 'vel', True),
    ('Basses Col Legno', STRINGS + ('Basses Col Legno.sfz',), 'vel', True),
]
SFZ_OF = {name: library(*path) for name, path, _, _ in LAYOUT}
CC11_TRACKS = ('Violins Trem', 'Basses Trem', 'Violas Trem', 'Violins Sus', 'Timpani Roll')

TAMTAM, GONG_SCRAPE, BD_HIT, TOM_HIT = 57, 62, 62, 62
FORGE_HAMMER, FORGE_HAMMER_2 = 61, 65
CYMBAL_CRESC, CYMBAL_HIT = 64, 66
CYMBAL_PEAK_S = 3.77       # measured RMS peak of susCymb2_cresc_4s.wav, aligned to bar 37 beat 1


def new_parts() -> dict[str, Part]:
    """Channels: CC11 tracks get their own channel; CC1 tracks too; tracks without controllers
    share the CC1 channels (CC1 never changes the volume of a VSCO/VCSL patch); unpitched
    percussion goes to channel 10. The studio renderer reads tracks, not channels."""
    parts = {}
    free = [c for c in range(16) if c != 9]
    for name, path, dyn, pitched in LAYOUT:
        parts[name] = Part(name, library(*path), dyn, pitched)
    for name in CC11_TRACKS:
        parts[name].channel = free.pop(0)
    cc1 = [p for p in parts.values() if p.dynamics == 'cc1']
    for p in cc1:
        p.channel = free.pop(0)
    plain = [p for p in parts.values() if p.dynamics == 'vel' and p.name not in CC11_TRACKS]
    for i, p in enumerate(plain):
        p.channel = 9 if not p.pitched else cc1[i % len(cc1)].channel
    return parts


# ── shared figures ───────────────────────────────────────────────────────────
def ostinato(s, bar, base, offs='bass', low_last=False, basses=None, accent=16):
    """The ogre's step 3+3+2 in eighths: the bass in octave 2 on the accents (0, 3, 6), in octave
    3 elsewhere. offs='root' puts the chord root (over a pedal) on the off-beats."""
    vc = s['Cellos Spic']
    for e in range(8):
        name, bass = chord_at(bar, e)
        if e in (0, 3, 6):
            p, v = pc_in(bass, 36, 47), base + accent + (2 if e == 0 else 0)
        elif e == 7 and low_last:
            p, v = pc_in(bass, 36, 47), base + 4
        else:
            pc = CHORDS[name][0] if offs == 'root' else bass
            p, v = pc_in(pc, 48, 59), base + (e % 3 == 2) * 2
        vc.add(bar, e, p, 1, v)
    if basses is not None:
        for e in (0, 3, 6):
            s['Basses Spic'].add(bar, e, pc_in(chord_at(bar, e)[1], 33, 44), 1, basses + (4 if e == 0 else 0))


def ostinato16(s, bar, base):
    """Bridge 33-36: sixteenths, accents on sixteenths 0, 6, 12 in octave 2."""
    vc = s['Cellos Spic']
    bass = chord_at(bar, 0)[1]
    for k in range(16):
        acc = k in (0, 6, 12)
        p = pc_in(bass, 36, 47) if acc else pc_in(bass, 48, 59)
        vc.add16(bar, k, p, 1, base + (16 if acc else (k % 2) * 2))


def bite(s, bar, sixteenth, vel, trombones=False):
    """The bite: a dry eighth chord on the root of the moment (over the pedals too: the pedal stays in
    the sustained basses). Contrabassoon and basses on the root, celli on root and fifth, bass
    drum; in A', the climax and its coda also the trombones' full chord."""
    name, _ = chord_at(bar, sixteenth / 2)
    root = CHORDS[name][0]
    s['Contrabassoon Staccato'].add16(bar, sixteenth, pc_in(root, 34, 45), 2, vel)
    r = pc_in(root, 38, 49)
    fifth = r + 7 if r + 7 <= 52 else r - 5
    s['Celli Col Legno'].add16(bar, sixteenth, r, 2, vel)
    s['Celli Col Legno'].add16(bar, sixteenth, fifth, 2, vel - 4)
    s['Basses Col Legno'].add16(bar, sixteenth, pc_in(root, 27, 38), 2, vel)
    bd = s['Bass Drum']
    t = tick16(bar, sixteenth)
    bd.notes = [n for n in bd.notes if n.ws != t]
    bd.add16(bar, sixteenth, BD_HIT, 2, min(MAX_VEL, vel + 2), tag='bite')
    if trombones:
        tones = CHORDS[name][:BITE_TONES.get(name, 3)]
        voicing = sorted(min(p for p in range(45, 61) if p % 12 == pc) for pc in tones)
        for p in voicing:
            s['Trombones Staccato'].add16(bar, sixteenth, p, 2, vel)


def drums(s, bar, vel, tom=True, fill=False):
    """Bass drum on the accents 0, 3, 6; tom on eighth 4; optional tom fill on sixteenths 12-15."""
    for e, dv in ((0, 4), (3, -4), (6, 0)):
        if not any(n.ws == tick(bar, e) for n in s['Bass Drum'].notes):
            s['Bass Drum'].add(bar, e, BD_HIT, 1, vel + dv)
    if tom:
        s['Tom'].add(bar, 4, TOM_HIT, 1, vel - 14)
    if fill:
        for k, dv in zip(range(12, 16), (-10, -6, -2, 4)):
            s['Tom'].add16(bar, k, TOM_HIT, 1, vel + dv)


def goblin(s, bar, pitches, vel):
    """The goblin: head of the motif in diminution, sixteenths 0-3 and an eighth on 4."""
    shape = [0, -4, 3, -2, 4]
    for i, p in enumerate(pitches):
        length = 2 if i == 4 else 1
        s['Clarinet Stac'].add16(bar, i, p, length, vel + shape[i], tag='goblin')
        s['Xylophone'].add16(bar, i, p, length, vel - 10 + shape[(i + 2) % 5], tag='goblin')


# ── voice leading ────────────────────────────────────────────────────────────
def _parallel(a0, a1, b0, b1) -> bool:
    if None in (a0, a1, b0, b1) or a0 == a1 or b0 == b1 or (a1 - a0) * (b1 - b0) <= 0:
        return False
    return abs(a0 - b0) % 12 == abs(a1 - b1) % 12 and abs(a0 - b0) % 12 in (0, 7)


def moves(prev, cur) -> list[tuple[int, int]]:
    """Each pitch of a sonority to the nearest pitch of the next one (as the ear follows them)."""
    if not prev or not cur:
        return []
    return [(p, min(cur, key=lambda q: abs(q - p))) for p in prev]


def voice_lead(segs, n, lo, hi, before=None, thin=True):
    """Chooses n voices per segment (sorted pitches in [lo, hi]; n - 1 allowed when thin, at a
    cost) minimizing motion with no parallel 5ths/8ves against each other, the fixed top line, the
    bass and any external voices. A voice that starts or stops is not part of a parallel.
    seg: dict(chord, top=(first, last) | None, bass=(first, last), ext=[(first, last)],
    ext_in=[(from, to)] motions of other parts into the segment, forbid=set of pitch classes,
    need=set of pitch classes)."""
    cands = []
    for sg in segs:
        pcs = set(CHORDS[sg['chord']]) - set(sg.get('forbid', ()))
        need = set(sg.get('need', ()))
        top = sg.get('top')
        pool = [p for p in range(lo, hi + 1) if p % 12 in pcs]
        out = []
        for size in ((n - 1, n) if thin else (n,)):
            for combo in itertools.combinations(pool, size):
                if top and combo[-1] >= min(top):
                    continue
                full = list(combo) + ([top[0]] if top else [])
                if not need <= {p % 12 for p in full}:
                    continue
                if sum(p % 12 == 1 for p in full) > 1:                   # leading tone doubled
                    continue
                seq = sorted(full)
                if any(b - a > 12 for a, b in zip(seq, seq[1:])):
                    continue
                static = sum(3 for a, b in zip(seq, seq[1:]) if b - a < 3) + (n - size) * 10
                out.append((combo, static))
        if not out:
            raise ValueError(f'no voicing for {sg}')
        cands.append(out)

    def pair_cost(lines, sp, sc, prev, cur):
        c = 0
        for a, b in lines:
            c += abs(a - b) + max(0, abs(a - b) - 5) * 2
        fixed = []
        if sp.get('top') and sc.get('top'):
            fixed.append((sp['top'][1], sc['top'][0]))
        if sp.get('bass') and sc.get('bass'):
            fixed.append((sp['bass'][1], sc['bass'][0]))
        for x, y in zip(sp.get('ext', []), sc.get('ext', [])):
            fixed.append((x[1], y[0]))
        fixed += sc.get('ext_in', [])
        top = fixed[0] if sp.get('top') and sc.get('top') else None
        for a0, a1 in moves(prev, cur):                                 # as the ear pairs them
            for b0, b1 in fixed:
                if _parallel(a0, a1, b0, b1) and abs(a1 - a0) <= 7 and abs(b1 - b0) <= 7 \
                        and not ((b0, b1) == top and a0 == b0 - 12 and a1 == b1 - 12):
                    c += 1000
        for i, (a0, a1) in enumerate(lines):
            for b0, b1 in lines[i + 1:] + fixed:
                if (b0, b1) == top and a0 == b0 - 12 and a1 == b1 - 12:
                    c += 6                                              # the tune doubled 8vb (as the trombones)
                elif _parallel(a0, a1, b0, b1):
                    c += 1000
            if a0 % 12 == 1 and 2 in CHORDS[sc['chord']] and a1 != a0 + 1:
                c += 40                                                 # leading tone must rise
            if 'A7' in sp['chord'] and a0 % 12 == 7 and 5 in CHORDS[sc['chord']] and a1 != a0 - 2:
                c += 15                                                 # the 7th falls
        return c

    def cost(prev, cur, sp, sc):
        if len(prev) == len(cur):
            return pair_cost(list(zip(prev, cur)), sp, sc, prev, cur)
        small, big = (cur, prev) if len(cur) < len(prev) else (prev, cur)
        best_c = None
        for idx in itertools.combinations(range(len(big)), len(small)):
            sel = [big[i] for i in idx]
            lines = list(zip(sel, small)) if big is prev else list(zip(small, sel))
            c = pair_cost(lines, sp, sc, prev, cur) + 4
            best_c = c if best_c is None else min(best_c, c)
        return best_c

    best = [(st + (cost(before[0], cb, before[1], segs[0]) if before else 0), [cb]) for cb, st in cands[0]]
    for i in range(1, len(segs)):
        nxt = []
        for cb, st in cands[i]:
            c, path = min(((pc + cost(pp[-1], cb, segs[i - 1], segs[i]), pp) for pc, pp in best),
                          key=lambda x: x[0])
            nxt.append((c + st, path + [cb]))
        best = nxt
    total, path = min(best, key=lambda x: x[0])
    if total >= 1000:
        raise ValueError(f'voice leading with parallels (cost {total}): {path}')
    return path


# ── composition ─────────────────────────────────────────────────────────────
CONTEXT: dict = {}                                   # material handed from one section to the next


def frenzy(s):
    """Climax 37-44: violas in spiccato sixteenths, arpeggios of the chord between G3 and E4, in
    groups 6+6+4 (the 3+3+2 step at double speed), rising in the first two groups."""
    va = s['Violas Spic']
    shapes = {0: [0, 1, 2, 3, 2, 1], 6: [1, 2, 3, 2, 1, 0], 12: [3, 2, 1, 0]}
    for bar in range(37, 45):
        for k in range(16):
            name, _ = chord_at(bar, k / 2)
            tones = sorted(p for p in range(55, 65) if p % 12 in CHORDS[name][:4])
            group = 0 if k < 6 else (6 if k < 12 else 12)
            idx = shapes[group][k - group]
            p = tones[min(idx, len(tones) - 1)] if len(tones) > 2 else tones[idx % len(tones)]
            v = 70 + (12 if k == group else 0) + (bar == 41) * 4 + (bar - 37)
            va.add16(bar, k, p, 1, v)


def intro(s):
    """Bars 1-4: Dm | Dm | Eb/D | Dm -> C#dim7. Tam-tam, the contrabassoon's stomach, the step 3+3+2
    and the horns' war call (the head on bII, then on the tonic)."""
    for bar, base in ((1, 40), (2, 44), (3, 48), (4, 54)):
        ostinato(s, bar, base, low_last=(bar == 3))
    cb = s['Contrabassoon Sustain']
    cb.add(1, 0, 'D2', 32, 64)
    cb.curve([(1, 0, 60), (2, 4, 66), (4, 0, 72), (4, 7, 75)])
    s['Tam-tam'].add(1, 0, TAMTAM, 8, 62, jitter=False)
    for bar, vels in ((3, (44, 40, 46)), (4, (54, 50, 60))):
        for e, v in zip((0, 3, 6), vels):
            s['Timpani'].add(bar, e, 'D2', 1, v)
    hn = s['Horns Marcato']
    hn.line(3, [(63, 0, 3), (70, 3, 5)], [80, 84])
    hn.line(4, [(62, 0, 3), (69, 3, 3), (67, 6, 2)], [82, 84, 78])
    hn.curve([(1, 0, 85), (3, 0, 84), (3, 3, 88), (4, 0, 85), (4, 3, 88), (4, 7, 82)])
    va = s['Violas Trem']
    va.chord(3, 0, ['Eb3', 'G3'], 8, 34)
    va.chord(4, 0, ['D3', 'F3'], 6, 40)
    va.chord(4, 6, ['C#3', 'E3'], 2, 44)
    va.curve([(1, 0, 72), (3, 0, 72), (4, 0, 82), (4, 7, 90)])
    drums(s, 4, 60, tom=False)


RIFF = [(0, 3), (3, 5)], [(0, 3), (3, 3), (6, 2)]


def section_a(s):
    """Bars 5-12 «La marcha del glotón»: the whole motif in the low brass (Dm | Bb | Gm7-A7 | Dm),
    then the 5-4-3 cell sequenced down to the Neapolitan (Gm | Dm/F | Ebmaj7 | A7(b9))."""
    tbn, hn = s['Trombones Marcato'], s['Horns Marcato']
    phrase = {5: [50, 57], 6: [58, 57, 53], 7: [55, 53, 52], 8: [50],
              9: [58, 57, 55], 10: [57, 55, 53], 11: [55, 53, 51], 12: [52, 49, 45]}
    for bar, pitches in phrase.items():
        grid = RIFF[0] if len(pitches) == 2 else ([(0, 8)] if len(pitches) == 1 else RIFF[1])
        vels = [94, 88, 90][:len(pitches)]
        tbn.line(bar, [(p, e, d) for p, (e, d) in zip(pitches, grid)], vels)
        hn.line(bar, [(p + 12, e, d) for p, (e, d) in zip(pitches, grid)], [v - 2 for v in vels])
    shape = [(5, 0, 100), (6, 0, 101), (7, 0, 99), (8, 0, 100), (8, 6, 95), (9, 0, 100),
             (10, 0, 101), (11, 0, 102), (12, 0, 100), (12, 7, 96)]
    tbn.curve([(1, 0, 100)] + shape)
    hn.curve(shape)
    for bar in range(5, 13):
        ostinato(s, bar, 64, basses=76)
    vt = s['Violins Trem']
    for bar, p, bars in ((5, 'A5', 1), (6, 'Bb5', 2), (8, 'A5', 1), (9, 'Bb5', 1), (10, 'A5', 1), (11, 'Bb5', 2)):
        vt.add(bar, 0, p, 8 * bars, 62, legato=True)
    swell = []
    for bar in range(5, 13):
        swell += [(bar, 0, 64), (bar, 4, 98), (bar, 7, 66)]
    vt.curve([(1, 0, 64)] + swell)
    tuba = s['Tuba Marcato']
    for bar, p in zip(range(5, 13), ['D2', 'Bb2', 'G2', 'D2', 'G2', 'F2', 'Eb2', 'A2']):
        tuba.add(bar, 0, p, 3, 86)
    tuba.curve([(1, 0, 90), (5, 0, 90), (8, 0, 91), (12, 7, 90)])
    for bar, p, v in zip(range(5, 13), ['D2', 'Bb2', 'G2', 'D2', 'G2', 'F2', 'Eb2', 'A2'],
                         [80, 76, 78, 80, 78, 76, 78, 82]):
        s['Timpani'].add(bar, 0, p, 1, v)
    for bar in range(5, 13):
        drums(s, bar, 78 + (bar in (8, 12)) * 2, fill=bar in (8, 12))
    for bar, v in ((6, 64), (8, 68), (10, 66), (12, 72)):
        s['Forge'].add(bar, 7, FORGE_HAMMER, 1, v, hv=3)
    s['Tam-tam'].add(5, 0, TAMTAM, 8, 76)


def section_a2(s):
    """Bars 13-20 «El primer bocado»: Dm(add9) | Bbmaj7 | C-A7 | Bb/D (the bite eats the D) ||
    Gm | A7/G | Dm/F | Bb7-A7, the goblins and their bites."""
    vn, hn, tbn = s['1st Violins Marcato'], s['Horns Marcato'], s['Trombones Marcato']
    mel = {13: [74, 81], 14: [82, 81, 77], 15: [79, 77, 76]}
    for bar, pitches in mel.items():
        grid = RIFF[0] if len(pitches) == 2 else RIFF[1]
        vn.line(bar, [(p, e, d) for p, (e, d) in zip(pitches, grid)], [92, 88, 90][:len(pitches)])
        hn.line(bar, [(p - 12, e, d) for p, (e, d) in zip(pitches, grid)], [88, 84, 86][:len(pitches)])
    vn.curve([(1, 0, 100), (13, 0, 100), (13, 3, 102), (14, 0, 100), (15, 0, 101), (15, 7, 97)])
    hn.curve([(13, 0, 95), (14, 0, 96), (15, 0, 95), (15, 7, 94), (16, 0, 104), (16, 2, 100)])
    hits = {13: ['D3', 'F3', 'A3'], 14: ['D3', 'F3', 'A3'], 15: ['C3', 'E3', 'G3']}
    for bar, ch in hits.items():
        for e, v in ((0, 86), (3, 78), (6, 82)):
            tbn.chord(bar, e, ch if not (bar == 15 and e == 6) else ['C#3', 'E3', 'G3'], 1, v)
    tbn.curve([(13, 0, 90), (14, 0, 91), (15, 0, 90), (15, 7, 92), (16, 0, 104), (16, 2, 100)])
    # the first bite (bar 16, eighth 0) and the silence
    tbn.chord(16, 0, ['D3', 'F3', 'Bb3'], 1, 100)
    hn.chord(16, 0, ['D4', 'F4', 'Bb4'], 1, 100)
    tuba = s['Tuba Marcato']
    tuba.add(16, 0, 'D2', 1, 98)
    tuba.curve([(15, 7, 96), (16, 0, 104), (16, 2, 100)])
    bite(s, 16, 0, 96, trombones=True)
    s['Timpani'].add(16, 0, 'D2', 1, 96)
    s['Tam-tam'].add(16, 0, TAMTAM, 8, 94)
    s['Gong'].add(16, 1, GONG_SCRAPE, 7, 34, hv=3)
    for bar, base in ((13, 66), (14, 66), (15, 68)):
        ostinato(s, bar, base, basses=78)
    vc = s['Cellos Spic']
    for e in range(8):                               # bar 16: the hit, then subito pp
        p = pc_in(D, 36, 47) if e in (0, 3, 6) else pc_in(D, 48, 59)
        v = 94 if e == 0 else (37 if e in (3, 6) else 28)
        vc.add(16, e, p, 1, v, vmax=40 if e else MAX_VEL, hv=HUMAN_VEL if e == 0 else 3)   # pp: +-3
    for bar in range(17, 21):
        ostinato(s, bar, 56)
    va = s['Violas Trem']                            # guide tones / counter-line
    va.chords_tied([(tick(13), tick(14), [52, 57]), (tick(14), tick(15), [50, 57]),
                    (tick(15), tick(16), [52, 55])], 48)
    va.chords_tied([(tick(17), tick(18), [58, 62]), (tick(18), tick(19), [57, 61]),
                    (tick(19), tick(20), [57, 62]), (tick(20), tick(20, 4), [56, 62]),
                    (tick(20, 4), tick(21), [55, 61])], lambda t: 46 + (t >= tick(19)) * 4)
    va.curve([(13, 0, 86), (15, 7, 84), (17, 0, 84), (19, 0, 90), (20, 7, 82)])
    for bar, pitches in ((17, [67, 74, 75, 74, 70]), (18, [69, 76, 77, 76, 73]),
                         (19, [74, 81, 82, 81, 77]), (20, [70, 77, 79, 77, 74])):
        goblin(s, bar, pitches, 62)
        bite(s, bar, 8, 92 + (bar == 20) * 4, trombones=True)
    for bar, p in ((13, 'D2'), (14, 'F2'), (15, 'G2')):
        s['Timpani'].add(bar, 0, p, 1, 80)
    for bar, p in ((17, 'G2'), (18, 'G2'), (19, 'F2'), (20, 'A2')):
        s['Timpani'].add16(bar, 8, p, 2, 88)
    for bar in (13, 14, 15):
        drums(s, bar, 82, fill=bar == 15)


def section_b(s):
    """Bars 21-28 «La despensa»: pedal D; Dm | Eb/D | Dm | Dm(maj7) | Gm/D | Ab/D | Gm/D | A7(b9).
    The goblin is eaten sooner every time; the col legno keeps the pulse."""
    gob = {21: [74, 81, 82, 81, 77], 22: [75, 82, 84, 82, 79], 23: [74, 81, 82, 81, 77],
           24: [74, 81, 82, 81, 73], 25: [67, 74, 75, 74], 26: [68, 75, 77], 27: [67, 74]}
    eaten = {21: 8, 22: 8, 23: 8, 24: 8, 25: 4, 26: 3, 27: 2}
    for bar, pitches in gob.items():
        goblin(s, bar, pitches, 60)
        bite(s, bar, eaten[bar], 76)
    bite(s, 28, 0, 80)
    bt = s['Basses Trem']
    for bar, n in ((21, 2), (23, 2), (25, 2), (27, 1)):
        bt.add(bar, 0, 'D2', 8 * n, 34)
    bt.add(28, 2, 'A2', 6, 44)
    bt.curve([(1, 0, 70), (21, 0, 70), (22, 0, 92), (22, 7, 70), (23, 0, 70), (24, 0, 92), (24, 7, 70),
              (25, 0, 70), (26, 0, 94), (26, 7, 70), (27, 0, 70), (27, 4, 86), (27, 7, 70),
              (28, 2, 70), (28, 7, 112)])
    cl = s['Violas Col Legno']
    pattern = {21: 'DAD', 22: 'DDD', 23: 'DAD', 24: 'DAA', 25: 'DDD', 26: 'DDD', 27: 'DDD', 28: '-AA'}
    for bar, pat in pattern.items():
        for e, c in zip((0, 3, 6), pat):
            if c != '-':
                cl.add(bar, e, 'D3' if c == 'D' else 'A3', 1, 36 + (e == 0) * 4)
    va = s['Violas Trem']
    va.chords_tied([(tick(21), tick(22), [53, 57]), (tick(22), tick(23), [55, 58, 63]),
                    (tick(23), tick(24), [53, 57, 62]), (tick(24), tick(25), [53, 57, 61])], 32)
    va.chords_tied([(tick(25), tick(25, 4), [55, 58, 62]), (tick(25, 4), tick(26), [55, 58]),
                    (tick(26), tick(27), [56, 60, 63]), (tick(27), tick(28), [55, 58])], 32)
    va.chords_tied([(tick(28, 2), tick(29), [55, 58, 61, 64])], 50)
    va.curve([(21, 0, 72), (24, 7, 74), (25, 0, 72), (27, 7, 70), (28, 2, 70), (28, 7, 104)])
    for bar in (21, 23, 25, 27):
        s['Timpani'].add(bar, 0, 'D2', 1, 46)
    s['Gong'].add(26, 0, GONG_SCRAPE, 8, 32, hv=3)
    tbs, hns = s['Trombones Sustain'], s['Horns Sustain']
    tbs.chord(28, 2, ['A2', 'E3', 'G3'], 6, 70)
    hns.chord(28, 2, ['Bb3', 'C#4', 'E4'], 6, 70)
    for p in (tbs, hns):
        p.curve([(1, 0, 60), (28, 2, 60), (28, 5, 80), (28, 7, 95)])


def bridge(s):
    """Bars 29-36 «Hambre»: chromatic bass D-Eb-E-F-G-Ab-A-A, a triad per bar; the head (1-5-6)
    in sequence (horns, then violins), the chorus from bar 33, crescendo to the climax."""
    hn, tbn, vn = s['Horns Marcato'], s['Trombones Marcato'], s['1st Violins Marcato']
    heads = {29: [62, 69, 70], 30: [63, 70, 72], 31: [64, 71, 72], 32: [65, 72, 74]}
    for bar, pitches in heads.items():
        hn.line(bar, [(p, e, d) for p, (e, d) in zip(pitches, RIFF[1])], [86, 82, 84])
        tbn.line(bar, [(p - 12, e, d) for p, (e, d) in zip(pitches, RIFF[1])], [84, 80, 82])
    high = {33: [67, 74, 75], 34: [68, 75, 77], 35: [69, 76, 77], 36: [73, 76, 79]}
    for bar, pitches in high.items():
        vn.line(bar, [(p, e, d) for p, (e, d) in zip(pitches, RIFF[1])], [90, 86, 88])
        hn.line(bar, [(p - 12, e, d) for p, (e, d) in zip(pitches, RIFF[1])], [90, 86, 88])
    hn.curve([(29, 0, 90), (32, 7, 100), (33, 0, 100), (35, 0, 101), (36, 7, 102),
              (45, 0, 102), (46, 0, 103), (47, 0, 104), (48, 0, 100), (48, 7, 98)])
    tbn.curve([(29, 0, 85), (32, 7, 95)], shape='lin')
    vn.curve([(33, 0, 95), (36, 7, 108)], shape='lin')
    # chorus "Ah" under the tune: the bottom voice doubles the bass, the others are voice-led from
    # the violas' last chord; from bar 33 the violas tremolo double the chorus voices above D3
    chords = [(33, 0, 8, 'Gm', 43), (34, 0, 8, 'Ab', 44), (35, 0, 8, 'A7(b13)', 45),
              (36, 0, 4, 'A7(b9)', 45), (36, 4, 4, 'A7', 45)]
    need = {'Gm': {10}, 'Ab': {0}, 'A7(b13)': {1, 7, 5}, 'A7(b9)': {1, 7, 10}, 'A7': {1, 7}}
    tune = {33: (67, 75), 34: (68, 77), 35: (69, 77), 36: (73, 79)}       # first and last note per bar
    segs = []
    for bar, e, d, c, b in chords:
        ext_in = []
        if e == 0 and bar - 1 in tune:
            ext_in = [(tune[bar - 1][1], tune[bar][0]), (tune[bar - 1][1] - 12, tune[bar][0] - 12)]
        segs.append(dict(chord=c, bass=(b, b), need=need[c], ext_in=ext_in))
    violas_32 = [57, 60]
    upper = voice_lead(segs, 3, 46, 58, before=(tuple(violas_32), dict(chord='F', bass=(41, 41))))
    events = [(tick(bar, e), tick(bar, e + d), [b] + list(u)) for (bar, e, d, c, b), u in zip(chords, upper)]
    s['Large Chorus'].chords_tied(events, lambda t: 64 + (t - tick(33)) // BAR * 4)
    CONTEXT['bridge_chorus'] = events[-1][2]
    va = s['Violas Trem']
    lines = [(tick(b), tick(b + 1), ch) for b, ch in
             ((29, [53, 62]), (30, [55, 58]), (31, [52, 55]), (32, violas_32))]
    lines += [(t0, t1, [p for p in ch if 52 <= p <= 64]) for t0, t1, ch in events]
    va.chords_tied(lines, lambda t: 44 + (t - tick(29)) // BAR * 6)
    va.curve([(29, 0, 78), (36, 7, 112)], shape='lin')
    for bar in range(29, 33):
        ostinato(s, bar, 66 + (bar - 29) * 2, basses=80 + (bar - 29) * 2)
    for bar in range(33, 37):
        ostinato16(s, bar, 70 + (bar - 33) * 2)
        for e in (0, 3, 6):
            s['Basses Spic'].add(bar, e, pc_in(chord_at(bar, e)[1], 33, 44), 1, 86 + (bar - 33) * 2 + (e == 0) * 4)
    tuba = s['Tuba Marcato']
    for bar in range(29, 37):
        tuba.add(bar, 0, pc_in(chord_at(bar, 0)[1], 38, 45), 1.5, 88)
    tuba.curve([(29, 0, 90), (36, 7, 105)], shape='lin')
    for bar in range(29, 37):
        drums(s, bar, 76 + (bar - 29) * 2, fill=bar in (32, 36))
    for bar in range(29, 35):
        s['Timpani'].add(bar, 0, pc_in(chord_at(bar, 0)[1], 38, 45), 1, 72 + (bar - 29) * 3)
    roll = s['Timpani Roll']
    roll.add(35, 0, 'A2', 16, 82, jitter=False, hv=2)
    roll.curve([(1, 0, 70), (35, 0, 56), (36, 0, 84), (36, 7, 112)])
    cym = s['Cymbal']
    start = tick(37) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
    cym.notes.append(Note(CYMBAL_CRESC, start, tick(37, 1) - start, 74, jitter=False, hv=0, tag='cresc'))


MELODY_37 = [(37, 0, 8, 62), (38, 0, 8, 69), (39, 0, 4, 70), (39, 4, 4, 69), (40, 0, 8, 65),
             (41, 0, 4, 67), (41, 4, 4, 65), (42, 0, 8, 64), (43, 0, 8, 62), (44, 0, 8, 62)]
LAMENT = [(37, 0, 8, 38), (38, 0, 8, 36), (39, 0, 3, 34), (39, 3, 5, 33), (40, 0, 8, 32),
          (41, 0, 3, 31), (41, 3, 3, 29), (41, 6, 10, 28), (43, 0, 8, 38), (44, 0, 8, 34)]


def lament_at(t: int) -> int:
    return next(p for b, e, d, p in LAMENT if tick(b, e) <= t < tick(b, e + d))


def climax(s):
    """Bars 37-48 «El festín»: the motif in augmentation over the lament bass; Fm/Ab (40), the
    Neapolitan E♭/G on the climax (41), deceptive Bbmaj7 (44) and the coda of bites (45-48)."""
    shape_v = [88, 92, 94, 92, 90, 100, 96, 92, 88, 86]
    for name, octave in (('Horns Sustain', 0), ('Trombones Sustain', -12), ('Violins Sus', 12)):
        for (bar, e, d, p), v in zip(MELODY_37, shape_v):
            s[name].add(bar, e, p + octave, d, v, legato=True)
    s['Horns Sustain'].curve([(37, 0, 105), (39, 0, 106), (40, 0, 107), (40, 6, 108), (41, 0, 110),
                              (41, 4, 108), (42, 0, 104), (43, 0, 100), (44, 0, 98), (44, 7, 95)])
    s['Trombones Sustain'].curve([(37, 0, 100), (40, 0, 101), (41, 0, 102), (42, 0, 100), (44, 7, 95)])
    s['Violins Sus'].curve([(1, 0, 96), (37, 0, 96), (40, 6, 106), (41, 0, 112), (42, 0, 104),
                            (44, 0, 96), (44, 7, 90)])
    bt = s['Bass Trombone Sustain']
    for bar, e, d, p in LAMENT:
        bt.add(bar, e, p, d, 92, legato=True)
    bt.curve([(1, 0, 100), (37, 0, 100), (41, 0, 101), (44, 7, 96)])
    # chorus: the top voice sings the tune, two or three voices of the chord below (48-63)
    segs, spans = [], []
    for bar, e, d, p in MELODY_37:
        for k, (he, name, bass) in enumerate(HARMONY[bar]):
            nxt = HARMONY[bar][k + 1][0] if k + 1 < len(HARMONY[bar]) else 8
            lo, hi = max(e, he), min(e + d, nxt)
            if lo >= hi:
                continue
            spans.append((bar, lo, hi))
            lament = lament_at(tick(bar, lo))
            forbid = set()
            if p % 12 not in CHORDS[name] and CHORDS[name][1] in ((p - 1) % 12, (p - 2) % 12):
                forbid = {CHORDS[name][1]}                  # 4-3: the third is not sounded under it
            need = {CHORDS[name][1]} | ({CHORDS[name][3]} if name.startswith('A7') else set())
            segs.append(dict(chord=name, top=(p, p), bass=(lament, lament), forbid=forbid, need=need - forbid))
    before = CONTEXT['bridge_chorus']
    inner = voice_lead(segs, 3, 48, 63, before=(tuple(before[1:]), dict(chord='A7', bass=(45, 45))))
    events = [(tick(b, lo), tick(b, hi), list(v)) for (b, lo, hi), v in zip(spans, inner)]
    ch = s['Large Chorus']
    ch.chords_tied(events, 78)
    for n in ch.notes:                               # the coda's chord is a fresh attack
        if n.we == tick(45):
            n.legato = False
    for (bar, e, d, p), v in zip(MELODY_37, shape_v):
        ch.add(bar, e, p, d, v - 10, legato=True)
    coda_chords = [(45, 'Dm'), (46, 'Eb'), (47, 'Bbmaj7'), (48, 'A7(b9)')]
    need = {'Dm': {5}, 'Eb': {3, 7}, 'Bbmaj7': {2, 9}, 'A7(b9)': {1, 7}}
    horns = {45: (62, 65), 46: (63, 70), 47: (62, 69), 48: (None, None)}
    pedal = {44: 82, 45: 81, 46: 82, 47: 81, 48: 82}
    segs2 = [dict(chord=c, bass=(38, 38) if bar < 48 else (45, 45), need=need[c], ext=[horns[bar]],
                  ext_in=[(pedal[bar - 1], pedal[bar])] if bar > 45 else [])
             for bar, c in coda_chords]
    coda = voice_lead(segs2, 4, 48, 67, before=(tuple(inner[-1]) + (62,), dict(chord='Bbmaj7', bass=(34, 34))))
    ch.chords_tied([(tick(bar), tick(bar + 1), list(v)) for (bar, _), v in zip(coda_chords, coda)], 72)
    ch.curve([(1, 0, 55), (33, 0, 55), (36, 7, 97), (37, 0, 100), (39, 0, 103), (40, 0, 105), (40, 6, 107), (41, 0, 110),
              (41, 4, 108), (42, 0, 104), (44, 0, 98), (44, 7, 95), (45, 0, 90), (47, 7, 90), (48, 7, 84)])
    frenzy(s)
    for bar in range(37, 45):
        base = 72 if bar != 41 else 76
        ostinato(s, bar, base, basses=88)
    for bar in range(45, 49):
        ostinato(s, bar, 72, offs='root')
    for bar in range(37, 49):
        drums(s, bar, 90, tom=False, fill=bar in (38, 40, 42, 44, 46))
        hits = [(0, 4), (3, -6), (6, -2)] + {46: [(4, 6)], 47: [(2, 6)]}.get(bar, [])
        for e, dv in hits:                           # in the coda the timpani join the bites
            s['Timpani'].add(bar, e, pc_in(chord_at(bar, e)[1], 36, 46), 1, 90 + dv)
    s['Tam-tam'].add(37, 0, TAMTAM, 8, 92)
    s['Cymbal'].add(41, 0, CYMBAL_HIT, 8, 82, hv=3)
    for bar, v in ((38, 72), (40, 76), (42, 78)):
        s['Forge'].add(bar, 7, FORGE_HAMMER_2, 1, v, hv=2)
    # coda of bites: the motif in eighths, eaten sooner every bar
    hn = s['Horns Marcato']
    for bar, pitches, at in ((45, [62, 69, 70, 69, 65], 6), (46, [63, 70, 72, 70], 4), (47, [62, 69], 2), (48, [], 0)):
        for i, p in enumerate(pitches):
            hn.add(bar, i, p, 1, 94 - i * 2)
        bite(s, bar, at * 2, 98, trombones=True)
    vt = s['Violins Trem']
    for bar, p, length in ((45, 'A5', 8), (46, 'Bb5', 8), (47, 'A5', 8), (48, 'Bb5', 7)):
        vt.add(bar, 0, p, length, 74)
    vt.curve([(45, 0, 82), (46, 4, 96), (47, 4, 92), (48, 4, 100), (48, 7, 80)])


def codetta(s):
    """Bars 49-56 «Sobremesa»: Dm | Dm | Eb/D | Dm | Gm/D | Ab/D | Dm-C#dim7 | A7(b9) -> bar 1.
    What is left of the tune after the feast, in the cellar; more goblins; the dominant that
    leads back to the tam-tam of bar 1."""
    low = {49: [(38, 0, 3), (45, 3, 5)], 51: [(39, 0, 3), (46, 3, 5)], 53: [(43, 0, 3), (50, 3, 5)],
           54: [(44, 0, 3), (51, 3, 5)], 55: [(38, 0, 3), (45, 3, 3), (43, 6, 2)], 56: [(45, 0, 8)]}
    for name in ('Tuba Marcato', 'Bass Trombone Marcato'):
        for bar, items in low.items():
            s[name].line(bar, items, [84 - (bar - 49) * 2] * len(items))
        s[name].curve([(1, 0, 90), (49, 0, 90), (52, 0, 86), (54, 0, 82), (55, 0, 80), (56, 0, 78), (56, 7, 75)]
                      if name == 'Bass Trombone Marcato' else
                      [(49, 0, 90), (52, 0, 86), (54, 0, 82), (55, 0, 80), (56, 0, 78), (56, 7, 75)])
    goblin(s, 51, [75, 82, 84, 82, 79], 52)
    goblin(s, 53, [67, 74, 75, 74, 70], 50)
    bite(s, 51, 8, 78)
    bite(s, 53, 8, 74)
    for bar, base in zip(range(49, 57), (64, 62, 62, 60, 58, 56, 54, 52)):
        ostinato(s, bar, base, offs='root', low_last=bar in (50, 52))
    bs = s['Basses Spic']
    for bar, hits in ((49, [(0, 'D2'), (3, 'D2')]), (50, [(0, 'D2'), (3, 'D2'), (6, 'A1')]),
                      (51, [(0, 'D2'), (3, 'D2')]), (52, [(0, 'D2'), (3, 'D2'), (6, 'D2')])):
        for e, p in hits:
            bs.add(bar, e, p, 1, 76 - (bar - 49) * 2 + (e == 0) * 4)
    vt = s['Violins Trem']
    vt.add(49, 0, 'A5', 16, 48)
    vt.add(51, 0, 'Bb5', 8, 50)
    vt.add(52, 0, 'A5', 7, 46)
    vt.curve([(49, 0, 72), (50, 0, 86), (50, 7, 72), (51, 4, 88), (52, 0, 74), (52, 4, 82), (52, 7, 64)])
    va = s['Violas Trem']
    va.chords_tied([(tick(53), tick(54), [58, 62]), (tick(54), tick(55), [60, 63]),
                    (tick(55), tick(55, 6), [57, 62]), (tick(55, 6), tick(56), [58, 61]),
                    (tick(56), tick(57), [55, 58, 61])], 34)
    va.curve([(53, 0, 74), (55, 0, 70), (56, 0, 72), (56, 7, 84)])
    for bar in range(49, 53):
        drums(s, bar, 74 - (bar - 49) * 3, tom=False)
    roll = s['Timpani Roll']
    roll.add(56, 0, 'A2', 8, 44, jitter=False, hv=2)
    roll.curve([(56, 0, 70), (56, 7, 100)])


# ── performance: humanization, legato, seams ─────────────────────────────────
def perform(parts: dict[str, Part]):
    rng = random.Random(SEED)
    for part in parts.values():
        part.notes.sort(key=lambda n: (n.ws, n.pitch))
        prev_vel = None
        for n in part.notes:
            lo = 0 if n.ws in NO_EARLY else -HUMAN_TICKS
            d = rng.randint(lo, HUMAN_TICKS) if n.jitter else 0
            n.start = max(0, n.ws + d)
            n.end = n.start + n.dur
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
            n.vel = max(1, min(n.vmax, n.vel))
            if n.tag == 'goblin' and n.vel == prev_vel:          # no equal velocities in a row
                n.vel += 1 if n.vel < n.vmax else -1
            prev_vel = n.vel if n.tag == 'goblin' else prev_vel
        starts: dict[int, list[Note]] = {}
        for n in part.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = starts.get(n.we, [])
            if any(m.pitch == n.pitch for m in nxt):
                n.end = min(n.end, min(m.start for m in nxt if m.pitch == n.pitch) - 24)
            elif n.legato and nxt:
                n.end = min(m.start for m in nxt) + rng.randint(14, 37)   # 10-30 ms overlap
            elif not nxt:
                n.end = min(n.end, n.we - GUARD)
            n.end = min(n.end, LOOP_END - GUARD)
        by_pitch: dict[int, Note] = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = by_pitch.get(n.pitch)
            if prev is not None and prev.end > n.start - 6:
                prev.end = n.start - 6
            by_pitch[n.pitch] = n


def build() -> dict[str, Part]:
    s = new_parts()
    for section in (intro, section_a, section_a2, section_b, bridge, climax, codetta):
        section(s)
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
            tr.append(mido.MetaMessage('key_signature', key='Dm', time=0))
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
# Registers of the brief's section 6, per track and bar range (the ostinato in A follows the
# explicit "root in octave 3 off the accents", which puts Bb3/A3 = 58/57 above its column's 55).
REGISTERS = [
    ('Cellos Spic', 1, 4, 38, 50), ('Contrabassoon Sustain', 1, 4, 38, 38), ('Timpani', 1, 4, 38, 38),
    ('Horns Marcato', 1, 4, 62, 70), ('Violas Trem', 1, 4, 49, 55),
    ('Trombones Marcato', 5, 12, 45, 58), ('Horns Marcato', 5, 12, 57, 70), ('Cellos Spic', 5, 12, 38, 58),
    ('Basses Spic', 5, 15, 26, 45), ('Violins Trem', 5, 12, 81, 82), ('Tuba Marcato', 5, 12, 38, 46),
    ('Timpani', 5, 12, 38, 46),
    ('1st Violins Marcato', 13, 15, 74, 82), ('Horns Marcato', 13, 16, 62, 70), ('Trombones Marcato', 13, 16, 45, 58),
    ('Clarinet Stac', 17, 20, 67, 82), ('Xylophone', 17, 20, 67, 82), ('Violas Trem', 13, 20, 50, 62),
    ('Timpani', 13, 20, 38, 45), ('Cellos Spic', 13, 20, 36, 59), ('Tuba Marcato', 16, 16, 38, 38),
    ('Clarinet Stac', 21, 28, 67, 84), ('Xylophone', 21, 28, 67, 84), ('Basses Trem', 21, 28, 38, 45),
    ('Violas Col Legno', 21, 28, 50, 57), ('Violas Trem', 21, 28, 53, 65), ('Timpani', 21, 28, 38, 38),
    ('Trombones Sustain', 28, 28, 45, 58), ('Horns Sustain', 28, 28, 57, 70),
    ('Horns Marcato', 29, 32, 62, 74), ('Trombones Marcato', 29, 32, 50, 62),
    ('1st Violins Marcato', 33, 36, 67, 79), ('Horns Marcato', 33, 36, 55, 67), ('Large Chorus', 33, 36, 43, 58),
    ('Violas Trem', 29, 36, 52, 64), ('Tuba Marcato', 29, 36, 38, 45), ('Timpani', 29, 36, 38, 45),
    ('Timpani Roll', 35, 36, 45, 45), ('Cellos Spic', 29, 56, 36, 59), ('Basses Spic', 29, 52, 26, 45),
    ('Horns Sustain', 37, 44, 62, 70), ('Trombones Sustain', 37, 44, 50, 58), ('Violins Sus', 37, 44, 74, 82),
    ('Large Chorus', 37, 48, 48, 70), ('Bass Trombone Sustain', 37, 44, 28, 38), ('Violas Spic', 37, 48, 55, 64),
    ('Horns Marcato', 45, 48, 62, 72), ('Violins Trem', 45, 48, 81, 82), ('Timpani', 37, 48, 36, 46),
    ('Tuba Marcato', 49, 56, 38, 51), ('Bass Trombone Marcato', 49, 56, 38, 51),
    ('Clarinet Stac', 49, 56, 67, 84), ('Xylophone', 49, 56, 67, 84), ('Violins Trem', 49, 52, 81, 82),
    ('Violas Trem', 53, 56, 50, 63), ('Timpani Roll', 56, 56, 45, 45),
    ('Contrabassoon Staccato', 1, 56, 34, 45), ('Celli Col Legno', 1, 56, 38, 52),
    ('Basses Col Legno', 1, 56, 26, 38), ('Trombones Staccato', 1, 56, 45, 60),
    ('Tam-tam', 1, 56, 57, 57), ('Gong', 1, 56, 62, 62), ('Bass Drum', 1, 56, 62, 62), ('Tom', 1, 56, 62, 62),
    ('Forge', 1, 56, 61, 65), ('Cymbal', 1, 56, 64, 66),
]
CEILINGS = {'1st Violins Marcato': 84, 'Violins Sus': 84, 'Violins Trem': 84, 'Horns Marcato': 74,
            'Horns Sustain': 74, 'Trombones Marcato': 62, 'Trombones Sustain': 62, 'Trombones Staccato': 62,
            'Clarinet Stac': 84, 'Xylophone': 84}
MAX_NOTE_S = {'Horns Sustain': 2.8, 'Horns Marcato': 2.8, 'Trombones Marcato': 2.2,
              '1st Violins Marcato': 3.5, 'Bass Trombone Marcato': 2.8, 'Tuba Marcato': 2.8}
SHORT_OK = {'Clarinet Stac', 'Xylophone', 'Violas Spic', 'Tom'}     # sixteenths allowed (criterion 5)

# Melodies of section 5 (tracks, first bar, last bar) for the register-clash rule (criterion 7).
MELODIES = [
    (('Horns Marcato',), 3, 4), (('Trombones Marcato', 'Horns Marcato'), 5, 12),
    (('1st Violins Marcato', 'Horns Marcato'), 13, 15), (('Clarinet Stac', 'Xylophone'), 17, 27),
    (('Horns Marcato', 'Trombones Marcato'), 29, 32), (('1st Violins Marcato', 'Horns Marcato'), 33, 36),
    (('Horns Sustain', 'Trombones Sustain', 'Violins Sus', 'Large Chorus'), 37, 44),
    (('Horns Marcato',), 45, 48), (('Tuba Marcato', 'Bass Trombone Marcato'), 49, 56),
]
VOICES = ['Horns Marcato', 'Horns Sustain', 'Trombones Marcato', 'Trombones Sustain', 'Bass Trombone Marcato',
          'Bass Trombone Sustain', 'Tuba Marcato', 'Large Chorus', 'Contrabassoon Sustain', '1st Violins Marcato',
          'Violins Sus', 'Violins Trem', 'Violas Trem', 'Basses Trem', 'Basses Spic', 'Clarinet Stac']
_CLIMAX = ['Horns Sustain', 'Trombones Sustain', 'Violins Sus', 'Large Chorus']
DOUBLINGS = ([(frozenset({'Horns Marcato', 'Trombones Marcato'}), 1, 56),       # the riff in octaves
              (frozenset({'Horns Marcato', '1st Violins Marcato'}), 13, 36),
              (frozenset({'Tuba Marcato', 'Bass Trombone Marcato'}), 49, 56),
              (frozenset({'Tuba Marcato', 'Basses Spic'}), 1, 56),               # the bass, doubled
              (frozenset({'Bass Trombone Sustain', 'Basses Spic'}), 37, 44),
              (frozenset({'Large Chorus', 'Tuba Marcato'}), 33, 36),             # chorus bottom = bass
              (frozenset({'Trombones Marcato', 'Basses Spic'}), 5, 13),          # the riff is the bass
              (frozenset({'Horns Marcato', 'Basses Spic'}), 5, 13),              # on the accents
              (frozenset({'Trombones Marcato', 'Tuba Marcato'}), 5, 13),
              (frozenset({'Horns Marcato', 'Tuba Marcato'}), 5, 13),
              (frozenset({'Violins Trem', 'Horns Marcato'}), 5, 12),             # the pedal shadows A-Bb
              (frozenset({'Violins Trem', 'Trombones Marcato'}), 5, 12),
              (frozenset({'Large Chorus', 'Basses Spic'}), 33, 36),
              (frozenset({'Large Chorus', 'Violas Trem'}), 33, 36)]                # violas double the chorus
             + [(frozenset(pair), 37, 44) for pair in itertools.combinations(_CLIMAX, 2)])
CHORD_TRACKS = ('Large Chorus', 'Violas Trem')       # their own voices are checked too
MOTIF_PLACES = [   # (track, [(bar, eighth, pitch)]) from section 5
    ('Trombones Marcato', [(5, 0, 50), (5, 3, 57), (6, 0, 58), (6, 3, 57), (6, 6, 53), (7, 0, 55), (7, 3, 53),
                           (7, 6, 52), (8, 0, 50)]),
    ('Horns Marcato', [(3, 0, 63), (3, 3, 70), (4, 0, 62), (4, 3, 69), (4, 6, 67), (5, 0, 62), (5, 3, 69)]),
    ('1st Violins Marcato', [(13, 0, 74), (13, 3, 81), (14, 0, 82), (14, 3, 81), (14, 6, 77), (15, 0, 79),
                             (15, 3, 77), (15, 6, 76)]),
    ('Horns Marcato', [(29 + i // 3, (0, 3, 6)[i % 3], p) for i, p in enumerate(
        [62, 69, 70, 63, 70, 72, 64, 71, 72, 65, 72, 74])]),
    ('1st Violins Marcato', [(33 + i // 3, (0, 3, 6)[i % 3], p) for i, p in enumerate(
        [67, 74, 75, 68, 75, 77, 69, 76, 77, 73, 76, 79])]),
    ('Horns Sustain', [(b, e, p) for b, e, _, p in MELODY_37]),
    ('Large Chorus', [(b, e, p) for b, e, _, p in MELODY_37]),
]


def sec(t: int) -> float:
    return t * SEC_PER_TICK


def bar_of(t: int) -> int:
    return t // BAR + 1


def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') == 'attack' for k in range(r.lokey, r.hikey + 1)}


def notes_in(part: Part, t0: int, t1: int) -> list[Note]:
    return sorted((n for n in part.notes if t0 <= n.ws < t1), key=lambda n: (n.ws, n.pitch))


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


def doubled(a: str, b: str, t: int) -> bool:
    return any(pair == frozenset({a, b}) and first <= bar_of(t) <= last for pair, first, last in DOUBLINGS)


def parallels(parts) -> list[str]:
    """Consecutive perfect 5ths/8ves (same direction) between voices: across tracks (nearest-pitch
    pairing, as the ear follows them) and inside the chord tracks (voices sorted by pitch)."""
    found = []

    def at(part, t):
        return sorted({n.pitch for n in part.notes if n.ws <= t < n.we})

    names = [n for n in VOICES if parts[n].notes]
    for i, a in enumerate(names):
        for b in names[i:]:
            if a == b and a not in CHORD_TRACKS:
                continue
            times = sorted({n.ws for n in parts[a].notes} | {n.ws for n in parts[b].notes})
            for t1, t2 in zip(times, times[1:]):
                if a != b and doubled(a, b, t1):
                    continue
                # what sounds just before t2 (or before a rest shorter than an eighth) moves into t2
                gap = max(t1, t2 - E8)
                A1 = at(parts[a], t2 - 1) or at(parts[a], gap)
                B1 = at(parts[b], t2 - 1) or at(parts[b], gap)
                A2, B2 = at(parts[a], t2), at(parts[b], t2)
                if not (A1 and B1 and A2 and B2):
                    continue
                if a == b:
                    if len(A1) != len(A2) or len(A1) < 2:
                        continue
                    pairs = [((A1[x], A2[x]), (A1[y], A2[y])) for x in range(len(A1)) for y in range(x + 1, len(A1))
                             if not (y == len(A1) - 1 and A1[x] == A1[y] - 12 and A2[x] == A2[y] - 12)]
                else:
                    pairs = [((pa, min(A2, key=lambda q: abs(q - pa))), (pb, min(B2, key=lambda q: abs(q - pb))))
                             for pa in A1 for pb in B1]
                for (pa, qa), (pb, qb) in pairs:
                    if _parallel(pa, qa, pb, qb) and abs(qa - pa) <= 7 and abs(qb - pb) <= 7:
                        found.append(f'{a}/{b} b{bar_of(t1)}-{bar_of(t2)} {name_of(pa)}-{name_of(qa)} / '
                                     f'{name_of(pb)}-{name_of(qb)}')
    return found


def repetitions(parts) -> list[str]:
    """2-bar phrases repeated identical more than twice (pitched tracks; the unpitched drums keep
    the ogre's step, which the brief asks for in every bar)."""
    found = []
    for name, part in parts.items():
        if not part.pitched:
            continue
        seen: dict[tuple, list[int]] = {}
        for bar in range(1, BARS):
            sig = tuple((n.ws - tick(bar), n.pitch, n.dur) for n in notes_in(part, tick(bar), tick(bar + 2)))
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

    print(f"\n{'track':<24} {'patch':<44} {'notes':>5}  {'range used':<16} {'patch':<7} dyn")
    for name, part in parts.items():
        keys = sfz_keys(part.sfz_path)
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
        if bad:
            raise SystemExit(f'{name}: notes outside {os.path.basename(part.sfz_path)}: {bad}')
        print(f'{name:<24} {os.path.basename(part.sfz_path)[:44]:<44} {len(part.notes):>5}  '
              f'{name_of(lo) + "-" + name_of(hi) + f" ({lo}-{hi})":<16} {min(keys)}-{max(keys):<4} {part.dynamics}')
    every = [(p, n) for p in parts.values() for n in p.notes]
    # 1
    check('1  56 bars 4/4 at 160; all notes inside 84.000 s',
          all(0 <= n.start < LOOP_END and n.end < LOOP_END for _, n in every),
          f'loop {sec(LOOP_END):.3f} s, last note-off {sec(max(n.end for _, n in every)):.3f} s')
    # 2
    bad = []
    for p, n in every:
        rows_ = [r for r in REGISTERS if r[0] == p.name and r[1] <= bar_of(n.ws) <= r[2]]
        if not rows_ or not any(lo <= n.pitch <= hi for _, _, _, lo, hi in rows_):
            bad.append(f'{p.name} b{bar_of(n.ws)} {name_of(n.pitch)}')
        if n.pitch > CEILINGS.get(p.name, 127) or (p.name == 'Large Chorus' and not 43 <= n.pitch <= 70):
            bad.append(f'{p.name} ceiling {name_of(n.pitch)}')
    check('2  section-6 registers and ceilings', not bad, '; '.join(bad[:4]))
    # 3
    for name, events in MOTIF_PLACES:
        miss = []
        for bar, e, pitch in events:
            if not any(n.ws == tick(bar, e) and n.pitch == pitch for n in parts[name].notes):
                miss.append(f'b{bar}e{e}:{pitch}')
        check(f'3  motif in {name} bars {events[0][0]}-{events[-1][0]}', not miss, ' '.join(miss[:4]))
    gob = {b: len(notes_in(parts['Clarinet Stac'], tick(b), tick(b + 1))) for b in list(range(17, 29)) + [51, 53]}
    want = {**{b: 5 for b in range(17, 25)}, 25: 4, 26: 3, 27: 2, 28: 0, 51: 5, 53: 5}
    check('3  goblin 5 notes (17-24, 51, 53), then 4, 3, 2, none', gob == want, str(gob))
    # 4
    lo, hi = tick(16, 1), tick(17)
    intruders = [p.name for p, n in every if p.name not in ('Cellos Spic', 'Gong')
                 and (lo <= n.start < hi or (n.end > lo and n.start < tick(16)))]
    check('4  bar 16: only the ostinato, the gong and the tail of the bite', not intruders, ', '.join(sorted(set(intruders))))
    # 5
    short = []
    for p in parts.values():
        ons = sorted({n.ws for n in p.notes})
        for n in p.notes:
            fine = p.name in SHORT_OK or (p.name == 'Cellos Spic' and 33 <= bar_of(n.ws) <= 36)
            if not fine and n.dur < E8:
                short.append(f'{p.name} b{bar_of(n.ws)}')
        for a, b in zip(ons, ons[1:]):
            fine = p.name in SHORT_OK or (p.name == 'Cellos Spic' and 33 <= bar_of(a) <= 36)
            if not fine and b - a < E8:
                short.append(f'{p.name} b{bar_of(a)} ioi')
    check('5  sixteenths only in goblin, cellos 33-36, violas spic, toms', not short, '; '.join(short[:4]))
    # 6
    for label, first, last, limit in SECTIONS:
        worst, where = sounding(parts, tick(first), tick(last + 1))
        check(f'6  layers {label} (bars {first}-{last}) <= {limit}', worst <= limit, f'max {worst} at bar {bar_of(where)}')
    # 7
    clashes = []
    for tracks, first, last in MELODIES:
        t0, t1 = tick(first), tick(last + 1)
        mel = [(parts[t], n) for t in tracks for n in parts[t].notes if t0 <= n.ws < t1]
        for name, part in parts.items():
            if name in tracks or not part.pitched or (name == 'Violins Trem' and last <= 12):
                continue
            for o in part.notes:
                if o.end - o.start < BEAT - 50:
                    continue
                near = [(mp, m) for mp, m in mel if min(m.end, o.end, t1) - max(m.start, o.start) > 40
                        and abs(m.pitch - o.pitch) <= 11]
                if near and part.level(o) >= max(mp.level(m) for mp, m in near):
                    clashes.append(f'{name} {name_of(o.pitch)} L{part.level(o)} b{bar_of(o.ws)}')
    check('7  no register clash with the melody', not clashes, '; '.join(clashes[:4]))
    # 8
    vmax = max(n.vel for _, n in every)
    ccmax = max(v for p in parts.values() for store in p.cc.values() for v in store.values())
    check('8  velocity <= 105, controllers <= 112', vmax <= MAX_VEL and ccmax <= MAX_CC, f'vel {vmax}, cc {ccmax}')
    for family in (('Horns Marcato', 'Horns Sustain'), ('Large Chorus',)):
        pts = [(t, v) for f in family for t, v in parts[f].cc[1].items()]
        top = max(v for _, v in pts)
        inside = max(v for t, v in pts if tick(41) <= t < tick(42))
        outside = max(v for t, v in pts if not tick(41) <= t < tick(42))
        check(f'8  highest CC1 of {"/".join(family)} in bar 41', inside == top > outside, f'{inside} vs {outside}')
    # 9
    missing = [p.name for p in parts.values() if p.dynamics == 'cc1' and 0 not in p.cc.get(1, {})]
    check('9  every Sonatina CC1 track has CC1 at tick 0', not missing, ', '.join(missing))
    long_ = [f'{name} b{bar_of(n.ws)} {sec(n.end - n.start):.2f}s' for name, limit in MAX_NOTE_S.items()
             for n in parts[name].notes if sec(n.end - n.start) > limit]
    check('9  note lengths of the unlooped Sonatina patches', not long_, '; '.join(long_[:4]))
    dense = [p.name for p in parts.values() for store in p.cc.values()
             if any(b - a < CC_STEP for a, b in zip(sorted(store), sorted(store)[1:]))]
    check('   controller points at most every 1/8 bar', not dense, ', '.join(dense))
    # 10
    acc = []
    bd_bars = [4] + list(range(5, 16)) + list(range(29, 53))
    for bar in bd_bars:
        on = {n.ws for n in parts['Bass Drum'].notes}
        acc += [f'BD b{bar}e{e}' for e in (0, 3, 6) if tick(bar, e) not in on]
    for n in parts['Cellos Spic'].notes:
        bar = bar_of(n.ws)
        pos = n.ws - tick(bar)
        if 33 <= bar <= 36:
            if (pos in (0, 6 * S16, 12 * S16)) != (36 <= n.pitch <= 47):
                acc.append(f'Vc b{bar} s{pos // S16}')
        elif pos in (0, 3 * E8, 6 * E8) and not 36 <= n.pitch <= 47:
            acc.append(f'Vc b{bar} e{pos // E8}')
    acc += [f'Cb b{bar_of(n.ws)}' for n in parts['Basses Spic'].notes if (n.ws - tick(bar_of(n.ws))) not in (0, 3 * E8, 6 * E8)]
    check('10 ogre step: accents on eighths 0, 3, 6 (bass drum, ostinato, basses)', not acc, '; '.join(acc[:5]))
    # craft
    par = parallels(parts)
    check('   no parallel 5ths/8ves between voices', not par, '; '.join(par[:5]))
    rep = repetitions(parts)
    check('   no 2-bar phrase repeated identical more than twice', not rep, '; '.join(rep[:3]))
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

    print(f"\n{'check':<66} {'':4} detail")
    for label, status, detail in rows:
        print(f'{label:<66} {status:<4} {detail}')
    return ok_all


def main():
    parts = write_midi(OUT)
    ok = verify(parts)
    print(f'\nwritten {OUT}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
