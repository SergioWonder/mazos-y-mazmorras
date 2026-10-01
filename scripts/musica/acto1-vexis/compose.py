"""Vexis the Arcane Trickster, boss theme «La función de medianoche»: score generator
(brief: docs/musica/acto1-vexis.md).

A macabre-circus waltz that steals the menu's leitmotif: the menu's waltz rhythm at double speed
in C# minor, the menu's own horn starting the theme note for note until one note (G -> G#) turns
it into Vexis' key, a music-box mirage that quotes the menu literally over a G# pedal a tritone
away, a hemiola bridge of knives and a climax on D major as the Neapolitan of C# minor.

Writes build/acto1-vexis.mid (one MIDI track per instrument and articulation, named as the mix
will name them) and prints a verification table. Exits with status 1 if a note falls outside the
range of its patch or breaks the brief's hard limits (ceilings, velocity 105, CC1 112).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-vexis/compose.py
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
EIGHTH = BEAT // 2
BAR = 3 * BEAT
BARS = 80
LOOP_END = BARS * BAR
BPM = 180
TEMPO = mido.bpm2tempo(BPM)
SEC_PER_TICK = TEMPO / 1e6 / TPB
CC_STEP = BAR // 8                                   # at most one CC point per 1/8 bar
HUMAN_TICKS = int(round(0.008 / SEC_PER_TICK))       # ±8 ms
HUMAN_VEL = 6
SEED = 180
GUARD = 12                                           # ticks a note stops before the loop seam
SAME_PITCH_GAP = 24                                  # a repeated pitch is released before it returns
MAX_VEL = 105
MAX_CC1 = 112
SLOW_ATTACK = int(round(0.150 / SEC_PER_TICK))       # glasses and bowed vibraphone speak ~150 ms late
LATE_ARRIVAL = int(round(0.020 / SEC_PER_TICK))      # implied portamento of the solo violin
CYMBAL_PEAK_S = 2.174                                # measured RMS peak of susCymb2_cresc_2.5s2.wav (key 63)
OUT = os.path.join(HERE, 'build', 'acto1-vexis.mid')

SECTIONS = [('Intro', 1, 4, 8), ('A', 5, 20, 10), ('B1', 21, 28, 7), ('B2', 29, 36, 7),
            ('Bridge', 37, 44, 11), ('Climax', 45, 60, 12), ('Return', 61, 76, 12), ('Codetta', 77, 80, 6)]


def tick(bar: int, beat: float = 1.0) -> int:
    return (bar - 1) * BAR + int(round((beat - 1) * BEAT))


PROTECTED = {0, tick(61)}          # nothing may start before these downbeats (seam, bar-60 silence)

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name) -> int:
    """'F#4' / 'Bb2' / 'B#3' / 66 -> MIDI number (C4 = 60)."""
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


# ── instruments: one track per instrument and articulation ──────────────────
S = 'Sonatina Symphonic Orchestra'
TRACKS = [
    ('Flute Sus', ('VSCO-2-CE', 'FluteSusVib.sfz')),
    ('Flute Stac', ('VSCO-2-CE', 'FluteStac.sfz')),
    ('Clarinet Stac', ('VSCO-2-CE', 'ClarinetStac.sfz')),
    ('Bassoon Stac', ('VSCO-2-CE', 'BassoonStac.sfz')),
    ('Trompa 1', ('VSCO-2-CE', 'FHornSus.sfz')),              # the menu's horn: same patch, same name
    ('Horns Marcato', ('sso', S, 'Brass - Performance', 'Horns Marcato.sfz')),
    ('Horns Sus', ('sso', S, 'Brass - Performance', 'Horns Sustain.sfz')),
    ('Trombones Marcato', ('sso', S, 'Brass - Performance', 'Trombones Marcato.sfz')),
    ('Trombones Sus', ('sso', S, 'Brass - Performance', 'Trombones Sustain (looped).sfz')),
    ('Trombones Stac', ('sso', S, 'Brass - Performance', 'Trombones Staccato.sfz')),
    ('Tuba Stac', ('VSCO-2-CE', 'TubaStac.sfz')),
    ('Timpani', ('VSCO-2-CE', 'Timpani.sfz')),
    ('Timpani Roll', ('VSCO-2-CE', 'TimpaniRolls.sfz')),
    ('Bass Drum', ('VCSL', 'Membranophones', 'Struck Membranophones', 'Bass Drum 2.sfz')),
    ('Cymbal', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Suspended Cymbal 2.sfz')),
    ('Tam-tam', ('sso', S, 'Percussion', 'Cymbals & Tamtam.sfz')),
    ('Cuchillo', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Woodblock.sfz')),
    ('Flexaton', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Flexatone.sfz')),
    ('Carraca', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Ratchet.sfz')),
    ('Mark Trees', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Mark Trees.sfz')),
    ('Xylophone', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Xylophone - Soft Mallets.sfz')),
    ('Vibraphone Bowed', ('VCSL', 'Idiophones', 'Struck Idiophones', 'Vibraphone - Bowed.sfz')),
    ('Copas', ('VCSL', 'Idiophones', 'Friction Idiophones', 'Wine Glasses - Slow.sfz')),
    ('Celesta', ('sso', S, 'Percussion', 'Celeste.sfz')),
    ('Organillo', ('sso', S, 'Organ', 'Great - Flute 4ft.sfz')),
    ('Violin Solo', ('sso', S, 'Strings - Performance', 'Violin Solo 1 Sustain.sfz')),
    ('Violins Spic', ('VSCO-2-CE', 'ViolinEnsSpic.sfz')),
    ('Violins Col Legno', ('sso', S, 'Strings - Performance', '1st Violins Col Legno.sfz')),
    ('Violas Pizz', ('VSCO-2-CE', 'ViolaEnsPizz.sfz')),
    ('Violas Spic', ('VSCO-2-CE', 'ViolaEnsSpic.sfz')),
    ('Celli Col Legno', ('sso', S, 'Strings - Performance', 'Celli Col Legno.sfz')),
    ('Basses Pizz', ('VSCO-2-CE', 'ContrabassPizz.sfz')),
    ('Basses Trem', ('VSCO-2-CE', 'ContrabassTrem.sfz')),
    ('Coro', ('sso', S, 'Chorus - Performance', 'Mixed Chorus.sfz')),
]
SFZ_OF = {name: library(*parts) for name, parts in TRACKS}
SONATINA = {name for name, parts in TRACKS if parts[0] == 'sso'}
# Sonatina patches whose dynamics really are CC1 (the sampler crossfades layers with it); the other
# Sonatina tracks also carry a CC1 curve, which the sampler applies as an overall volume curve.
CC1_DYNAMICS = {'Violin Solo', 'Horns Marcato', 'Horns Sus', 'Trombones Marcato', 'Trombones Sus', 'Coro'}
UNPITCHED = {'Bass Drum', 'Cymbal', 'Tam-tam', 'Cuchillo', 'Flexaton', 'Carraca', 'Mark Trees'}
# fraction of the written value that sounds: detached articulations and percussion strokes
GATE = {name: 0.9 for name in ('Flute Stac', 'Clarinet Stac', 'Bassoon Stac', 'Horns Marcato',
                               'Trombones Marcato', 'Trombones Stac', 'Tuba Stac', 'Bass Drum', 'Tam-tam',
                               'Cuchillo', 'Flexaton', 'Xylophone', 'Organillo', 'Violins Spic',
                               'Violins Col Legno', 'Violas Pizz', 'Violas Spic', 'Celli Col Legno',
                               'Basses Pizz')}
GATE['Timpani'] = 0.75             # single strokes: the drum rings on its own (release 12 s)
GATE['Celesta'] = 0.95
MAX_NOTE = {'Horns Marcato': 2.8, 'Horns Sus': 2.8, 'Trombones Marcato': 2.2, 'Violin Solo': 5.0}
CEILINGS = {'Violin Solo': 85, 'Violins Spic': 85, 'Violins Col Legno': 85, 'Flute Sus': 85, 'Flute Stac': 85,
            'Trompa 1': 75, 'Horns Marcato': 75, 'Horns Sus': 75, 'Celesta': 83, 'Copas': 87, 'Coro': 69}


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
    shift: int = 0     # deliberate offset (slow attacks, late arrivals)
    cut: int | None = None   # hard release tick (e.g. the choir stops on the downbeat of bar 60)
    start: int = 0     # performed values
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

    def add(self, bar, beat, pitch, beats, vel, **kw) -> Note:
        n = Note(P(pitch), tick(bar, beat), int(round(beats * BEAT)), int(vel), **kw)
        self.notes.append(n)
        return n

    def line(self, bar, beat, items, vels, legato=True, tie=False, **kw) -> list[Note]:
        """Consecutive notes from (bar, beat): items = [(pitch | None for a rest, beats)].
        tie=True merges repeated pitches into one sustained note (common tones)."""
        t = tick(bar, beat)
        vels = vels if isinstance(vels, list) else [vels] * len(items)
        prev, out, vi = None, [], iter(vels)
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
                prev = Note(P(pitch), t, length, int(v), legato=legato, **kw)
                self.notes.append(prev)
                out.append(prev)
            t += length
        return out

    def chord(self, bar, beat, pitches, beats, vel, **kw):
        for i, p in enumerate(pitches):
            self.add(bar, beat, p, beats, vel + (i % 2), **kw)

    def curve(self, num, points, shape='cos'):
        """Controller breakpoints [(bar, beat, value)] sampled on the 1/8-bar grid; a flat
        segment only writes its two ends."""
        cc = self.cc.setdefault(num, {})
        pts = [((tick(b, bt) // CC_STEP) * CC_STEP, int(v)) for b, bt, v in points]
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            if v0 == v1 or t1 == t0:
                cc[t0], cc[t1] = v0, v1
                continue
            g = t0
            while g <= t1:
                x = (g - t0) / (t1 - t0)
                if shape == 'cos':
                    x = (1 - math.cos(math.pi * x)) / 2
                cc[g] = int(round(v0 + (v1 - v0) * x))
                g += CC_STEP
        cc[pts[-1][0]] = pts[-1][1]


class Score(dict):
    """Tracks by name (plus scratch data shared between sections)."""
    codetta_violas: list = []


def new_parts() -> Score:
    channels = [c for c in range(16) if c != 9]
    return Score({name: Part(name, channels[i % len(channels)]) for i, (name, _) in enumerate(TRACKS)})


# ── harmony ──────────────────────────────────────────────────────────────────
# chord -> (pitch classes allowed, pitch classes wanted, pitch classes never doubled)
CHORDS = {
    'C#m': ({1, 4, 8}, {1, 4}, set()), 'C#m/G#': ({1, 4, 8}, {1, 4}, set()),
    'C#m/B': ({1, 4, 8, 11}, {1, 4}, set()), 'C#m/E': ({1, 4, 8}, {1, 8}, set()),
    'Amaj7': ({9, 1, 4, 8}, {1, 8}, set()), 'A': ({9, 1, 4}, {1, 4}, set()),
    'A/C#': ({9, 1, 4}, {9, 4}, set()),
    'G#7': ({8, 0, 3, 6}, {0, 6}, {0, 6}), 'G#7b13': ({8, 0, 3, 6, 4}, {0, 6}, {0, 6}),
    'G#7b9': ({8, 0, 3, 6, 9}, {0, 6, 9}, {0, 6, 9}),
    'D': ({2, 6, 9}, {2, 6}, set()), 'D/F#': ({2, 6, 9}, {2, 9}, set()),
    'Dadd9': ({2, 6, 9, 4}, {6, 4}, set()),
    'F#m': ({6, 9, 1}, {9, 1}, set()), 'F#m9': ({6, 9, 1, 4, 8}, {9, 4, 8}, set()),
    'F#m7/A': ({6, 9, 1, 4}, {6, 4}, set()),
    'D#hd7': ({3, 6, 9, 1}, {6, 9, 1}, set()), 'Bm7': ({11, 2, 6, 9}, {2, 9}, set()),
}
HARM = {5: 'C#m', 6: 'Amaj7', 7: 'G#7b13', 8: 'C#m', 9: 'D', 10: 'D', 11: 'G#7', 12: 'C#m',
        13: 'C#m', 14: 'F#m9', 15: 'D#hd7', 16: 'C#m/G#', 17: 'D/F#', 18: 'Bm7', 19: 'G#7', 20: 'G#7b9',
        45: 'C#m', 46: 'C#m/B', 47: 'Amaj7', 48: 'G#7', 49: 'F#m', 50: 'C#m/E', 51: 'Dadd9', 52: 'A/C#',
        53: 'D', 54: 'F#m7/A', 55: 'G#7b9', 56: 'G#7b9', 57: 'C#m', 58: 'C#m/B', 59: 'Amaj7',
        69: 'F#m', 70: 'D#hd7', 71: 'C#m/G#', 72: 'A', 73: 'D', 74: 'G#7b9', 75: 'C#m', 76: 'G#7b9'}
for _b in range(61, 69):
    HARM[_b] = HARM[_b - 56]
HARM.update({77: 'C#m', 78: 'A/C#', 79: 'D', 80: 'G#7b9'})

# bass (tuba, double bass) on the downbeats of the waltz sections: own line, lament in the climax
BASS = {5: ('C#2', 'C#2'), 6: ('A1', 'A1'), 7: ('G#1', 'G#1'), 8: ('C#2', 'C#2'), 9: ('D2', 'D2'),
        10: ('A1', 'A1'), 11: ('G#1', 'G#1'), 12: ('C#2', 'C#2'), 13: ('C#2', 'C#2'), 14: ('F#2', 'F#1'),
        15: ('D#2', 'D#2'), 16: ('G#1', 'G#1'), 17: ('F#2', 'F#1'), 18: ('B1', 'B1'),
        19: ('B#1', 'B#1'),          # G#7/B#: B -> B# rises chromatically into the dominant
        20: ('G#1', 'G#1'),
        45: ('C#2', 'C#2'), 46: ('B1', 'B1'), 47: ('A1', 'A1'), 48: ('G#1', 'G#1'), 49: ('F#1', 'F#1'),
        50: ('E2', 'E2'), 51: ('D2', 'D2'), 52: ('C#2', 'C#2'), 53: ('D2', 'D2'), 54: ('A1', 'A1'),
        55: ('G#1', 'G#1'), 56: ('G#1', 'G#1'), 57: ('C#2', 'C#2'), 58: ('B1', 'B1'), 59: ('A1', 'A1'),
        60: ('G#1', 'G#1'),
        61: ('C#2', 'C#2'), 62: ('A1', 'A1'), 63: ('G#1', 'G#1'), 64: ('C#2', 'C#2'), 65: ('D2', 'D2'),
        66: ('F#2', 'F#1'),          # D/F# this time: F# -> G# instead of the A of bar 10
        67: ('G#1', 'G#1'), 68: ('C#2', 'C#2'), 69: ('F#2', 'F#1'), 70: ('D#2', 'D#2'), 71: ('G#1', 'G#1'),
        72: ('A1', 'A1'), 73: ('D2', 'D2'), 74: ('G#1', 'G#1'), 75: ('C#2', 'C#2'), 76: ('G#1', 'G#1')}

CANON = ['C#5', 'G#5', 'A5', 'G#5', 'E5', 'F#5', 'E5', 'D#5', 'C#5']        # «el vals robado»
TRICK = ['D4', 'A4', 'B4', 'A4', 'F#4', 'G#4', 'F#4', 'E4', 'D#4', 'C#4']   # the horn's trick
MENU_CANON = ['D5', 'A5', 'B5', 'A5', 'F#5', 'G5', 'F#5', 'E5', 'D5']    # the menu's own tune

# melodies of section 5 (tracks, first bar, last bar): accompaniment stays under them
MELODIES = [
    (('Celesta',), 1, 3), (('Clarinet Stac', 'Xylophone'), 5, 8), (('Trompa 1',), 9, 12),
    (('Violin Solo',), 13, 16), (('Flute Sus',), 17, 20), (('Celesta',), 21, 28),
    (('Vibraphone Bowed',), 29, 36), (('Horns Marcato',), 37, 44),
    (('Horns Sus', 'Coro', 'Trombones Sus'), 45, 58), (('Violins Spic', 'Xylophone', 'Flute Stac'), 59, 59),
    (('Clarinet Stac', 'Xylophone', 'Violins Col Legno'), 61, 64), (('Horns Marcato',), 65, 68),
    (('Violin Solo', 'Flute Sus'), 69, 76), (('Celesta',), 77, 79),
]
CLASH_EXEMPT = {('Copas', 21, 28)}
# tracks whose bar-to-bar motion is checked for consecutive 5ths/8ves (bass, chords, choir)
HARMONY_TRACKS = ('Tuba Stac', 'Basses Pizz', 'Violas Pizz', 'Violins Col Legno', 'Trombones Stac',
                  'Celli Col Legno', 'Organillo', 'Coro', 'Horns Sus', 'Trombones Sus')


def cc1_to_velocity(cc: float) -> float:
    """Brief section 7: the CC1 table laid over the velocity table (pp..f), piecewise linear."""
    pts = [(40, 25), (55, 40), (70, 55), (85, 70), (100, 85), (112, 105)]
    if cc <= pts[0][0]:
        return pts[0][1]
    for (c0, v0), (c1, v1) in zip(pts, pts[1:]):
        if cc <= c1:
            return v0 + (v1 - v0) * (cc - c0) / (c1 - c0)
    return pts[-1][1]


def cc_value(part: Part, num: int, t: int) -> int | None:
    pts = part.cc.get(num, {})
    before = [k for k in pts if k <= t]
    return pts[max(before)] if before else None


# ── voice leading ────────────────────────────────────────────────────────────
def motion_bad(a1, a2, b1, b2) -> bool:
    """Consecutive perfect 5ths/8ves in similar motion between two parts (each voice follows to
    the nearest pitch of the next chord, as the ear does)."""
    for pa in a1:
        qa = min(a2, key=lambda x: abs(x - pa))
        for pb in b1:
            qb = min(b2, key=lambda x: abs(x - pb))
            if pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and abs(qa - pa) <= 7 \
                    and abs(qb - pb) <= 7 and pa != pb and abs(pa - pb) % 12 in (0, 7) \
                    and abs(pa - pb) % 12 == abs(qa - qb) % 12:
                return True
    return False


def within_bad(v1, v2) -> bool:
    if len(v1) != len(v2) or len(v1) < 2:
        return False
    for i in range(len(v1)):
        for j in range(i + 1, len(v1)):
            if v1[i] != v2[i] and v1[j] != v2[j] and (v2[i] - v1[i]) * (v2[j] - v1[j]) > 0 \
                    and (v1[j] - v1[i]) % 12 in (0, 7) and (v1[j] - v1[i]) % 12 == (v2[j] - v2[i]) % 12:
                return True
    return False


def groups_of(voicing, st):
    """The pitches of every track (voices of the voicing plus fixed parts) at one step."""
    out = {}
    fixed = st.get('fixed', {})
    for g, items in st['groups'].items():
        ps = [voicing[i] for i in items if isinstance(i, int) and i < len(voicing)]
        ps += [p for i in items if isinstance(i, str) for p in fixed.get(i, [])]
        out[g] = sorted(ps)
    for k, ps in fixed.items():
        if k not in out and ps:
            out[k] = sorted(ps)
    return out


def trans(a, sa, b, sb):
    ga, gb = groups_of(a, sa), groups_of(b, sb)
    own = set(sa['groups']) | set(sb['groups'])
    skip = set(sa.get('skip', ())) | set(sb.get('skip', ()))
    cost = 0.0
    for g in set(sa['groups']) & set(sb['groups']):
        for p in ga[g]:
            d = min(abs(p - q) for q in gb[g])
            cost += d + (3 * (d - 5) if d > 5 else 0)
        if g in sb.get('restless', ()) and ga[g] == gb[g]:
            cost += 8                                  # this part should not sit on one chord
    names = [n for n in ga if n in gb]
    for i, x in enumerate(names):
        if x in own and within_bad(ga[x], gb[x]):
            cost += 1000
        for y in names[i + 1:]:
            if frozenset({x, y}) in skip or (x not in own and y not in own):
                continue
            if motion_bad(ga[x], gb[x], ga[y], gb[y]):
                cost += 300 if 'mel' in (x, y) else 1000
    return cost


def voice_lead(steps, start=None, keep=160, known=frozenset()):
    """Viterbi search of the voicings of a chord progression.

    steps: one dict per chord: chord (name in CHORDS), ranges [(lo, hi)] per voice (ascending),
           top (highest pitch allowed), fixed {name: [pitches]} (bass, melody, other parts),
           groups {track: [voice index | fixed name]} (how the voices are split between tracks;
           a step may have more or fewer voices than its neighbours) and skip (pairs of tracks
           that double each other). Every pair of groups and every group on its own is kept
           free of consecutive 5ths/8ves, judged the way the tests judge the score.
    start: {'voicing', 'step'} that precedes the first step (for continuity across sections)."""
    cands = []
    for st in steps:
        tones, need, nodouble = CHORDS[st['chord']]
        top = st.get('top', 127)
        pools = [[p for p in range(lo, min(hi, top) + 1) if p % 12 in tones] for lo, hi in st['ranges']]
        fixed_pcs = sorted({p % 12 for ps in st.get('fixed', {}).values() for p in ps})   # one per pitch class
        opts = []
        unison = st.get('unison', set())          # voices that may double the one below (other track)
        combos = [(0, c) for c in itertools.product(*pools)]
        for drop in range(1, st.get('optional', 0) + 1):     # the top voices may rest (thinner chord)
            combos += [(40 * drop, c) for c in itertools.product(*pools[:-drop])]
        for extra, combo in combos:
            if any((b < a or (b == a and i + 1 not in unison)) or b - a > 12
                   for i, (a, b) in enumerate(zip(combo, combo[1:]))):
                continue
            pcs = [p % 12 for p in combo]
            cost = extra + 30 * len(need - set(pcs))
            allp = pcs + fixed_pcs
            cost += 60 * sum(allp.count(x) - 1 for x in nodouble if allp.count(x) > 1)
            opts.append((cost, combo))
        if not opts:
            raise SystemExit(f'no voicing for {st}')
        opts.sort()
        cands.append(opts[:keep])

    best = []
    for c, v in cands[0]:
        c0 = c + (trans(start['voicing'], start['step'], v, steps[0]) if start else 0)
        best.append((c0, [v]))
    for k in range(1, len(steps)):
        nxt = []
        for c, v in cands[k]:
            bc, path = min(((bc + trans(path[-1], steps[k - 1], v, steps[k]), path) for bc, path in best),
                           key=lambda o: o[0])
            nxt.append((bc + c, path + [v]))
        best = nxt
    cost, path = min(best, key=lambda o: o[0])
    if cost >= 1000:
        for k in range(1, len(steps)):
            if k not in known and trans(path[k - 1], steps[k - 1], path[k], steps[k]) >= 1000:
                ga, gb = groups_of(path[k - 1], steps[k - 1]), groups_of(path[k], steps[k])
                pairs = [f'{x}/{y}' for x in ga for y in ga if x < y and x in gb and y in gb
                         and frozenset({x, y}) not in steps[k].get('skip', ()) and motion_bad(ga[x], gb[x], ga[y], gb[y])]
                pairs += [x for x in ga if x in gb and within_bad(ga[x], gb[x])]
                print(f'warning: unavoidable parallels at {steps[k]["chord"]} (step {k}): {pairs} {ga} -> {gb}')
    return path


def frame(part: Part, bar: int) -> list[int]:
    """Pitches this part attacks in a bar (or holds over its downbeat), as written."""
    lo, hi = tick(bar), tick(bar + 1)
    return sorted({n.pitch for n in part.notes if lo <= n.ws + n.shift < hi or n.ws < lo < n.we - 60})


def arp(tones, shape):
    """Arpeggio over the sorted chord tones following an index shape (clipped to the chord),
    never striking the same pitch twice in a row."""
    out = []
    for idx in shape:
        i = max(0, min(idx, len(tones) - 1))
        if out and tones[i] == out[-1]:
            i = i - 1 if i > 0 else i + 1
        out.append(tones[i])
    return out


def melody_at(s, bar, beat) -> int | None:
    t = tick(bar, beat)
    for tracks, first, last in MELODIES:
        if first <= bar <= last:
            ps = [n.pitch for name in tracks for n in s[name].notes if n.ws <= t < n.we]
            if ps:
                return max(ps)
    return None


def melody_floor(s, bar) -> int:
    """Lowest melody pitch sounding on beats 2-3 of a bar (where the pah-pah plays)."""
    lo, hi = tick(bar, 2), tick(bar + 1)
    for tracks, first, last in MELODIES:
        if first <= bar <= last:
            ps = [n.pitch for name in tracks for n in s[name].notes if n.ws < hi and n.we > lo
                  and n.pitch >= 60]
            if ps:
                return min(ps)
    return 127


# ── composition ─────────────────────────────────────────────────────────────
def intro(s):
    """Bars 1-4: C#m | C#m | D/C# | G#7(b9). The music box; the mechanism jams on bar 4."""
    ce = s['Celesta']
    ce.line(1, 1, [(p, b) for p, b in zip(['C#5', 'G#5', 'A5', 'G#5', 'E5', 'F#5', 'E5', 'D5'],
                                          [1, 2, 1, 1, 1, 1, 1, 1])],
            [50, 54, 53, 50, 46, 50, 47, 44], legato=False)
    ce.chord(1, 1, ['C#4', 'E4', 'G#4'], 1, 40)
    ce.chord(2, 1, ['C#4', 'E4', 'G#4'], 1, 38)
    ce.chord(3, 1, ['D4', 'F#4'], 1, 48)                 # the hero's D over the C# pedal
    ce.curve(1, [(1, 1, 100), (3, 3, 104), (3, 3.9, 96)])
    va = s['Violas Pizz']
    for bar, dyad in ((1, ['G#3', 'C#4']), (2, ['G#3', 'E4']), (3, ['A3', 'D4'])):
        va.chord(bar, 2, dyad, 1, 43)
        va.chord(bar, 3, dyad, 1, 40)
    cb = s['Basses Pizz']
    for bar, beat, p, v in ((1, 1, 'C#2', 52), (2, 1, 'C#2', 50), (2, 3, 'G#1', 44), (3, 1, 'C#2', 53)):
        cb.add(bar, beat, p, 1, v)
    tp = s['Timpani']
    for bar, beat, p, v in ((1, 1, 'C#2', 46), (2, 1, 'C#2', 44), (2, 3, 'G#2', 40), (3, 1, 'C#2', 50)):
        tp.add(bar, beat, p, 1, v)
    tb = s['Trombones Sus']                              # the threat: D/C# swells into the jam
    tb.chord(3, 1, ['D3', 'F#3', 'A3'], 3, 60)
    tb.curve(1, [(1, 1, 55), (3, 1, 55), (3, 3.9, 95), (4, 1, 95)])
    golpe(s, 4)
    cl = s['Violins Col Legno']                          # the rattle that starts the waltz
    cl.line(4, 2, [('G#3', .5), ('B#3', .5), ('D#4', .5), ('F#4', .5)], [70, 73, 76, 80], legato=False)


def golpe(s, bar):
    """The jam / «¡ta-chán!»: G#7(b9) as one accented quarter."""
    s['Trombones Marcato'].chord(bar, 1, ['G#2', 'B#2', 'D#3', 'A3'], 1, 98, hv=3)
    s['Horns Marcato'].chord(bar, 1, ['G#3', 'D#4', 'F#4', 'A4'], 1, 98, hv=3)
    s['Bass Drum'].add(bar, 1, 62, 1, 98, hv=3)
    s['Timpani'].add(bar, 1, 'G#2', 1, 100, hv=3)


def oom(s, bars, level):
    """Waltz downbeats: tuba and double bass on the bass line."""
    for bar in bars:
        tuba, cb = BASS[bar]
        v = level(bar)
        s['Tuba Stac'].add(bar, 1, tuba, 1, v)
        s['Basses Pizz'].add(bar, 1, cb, 1, v - 2)


def pah(part, bar, pitches, vel):
    part.chord(bar, 2, pitches, 1, vel)
    part.chord(bar, 3, pitches, 1, vel - 3)


def waltz_steps(s, bars, ranges, groups, skip=(), top_offset=-1, bass=('Tuba Stac', 'Basses Pizz'), unison=()):
    """Voice-leading steps for the pah-pah of some bars: the bass and the melody are fixed."""
    steps = []
    for bar in bars:
        mel = melody_at(s, bar, 2)
        top = melody_floor(s, bar) + top_offset
        fixed = {name: frame(s[name], bar) for name in tuple(bass) + HARMONY_TRACKS
                 if name not in groups and frame(s[name], bar)}
        if mel is not None:
            fixed['mel'] = [mel]
        steps.append({'chord': HARM[bar], 'ranges': ranges, 'top': top, 'fixed': fixed, 'unison': set(unison),
                      'restless': {'Celli Col Legno'},
                      'groups': groups, 'skip': {frozenset(p) for p in skip} | {frozenset(bass)}})
    return steps


def section_a(s):
    """Bars 5-20, «Vals de los mil rostros»: the stolen waltz, the horn's trick, the devil's
    violin and the trick again on the menu's flute."""
    melody_a_head(s, 5, clar=[76, 82, 84, 80, 75, 80, 76, 72, 79], xyl=[60, 66, 68, 64, 60, 64, 61, 58, 63])
    hn = s['Trompa 1']                                   # bars 9-11 = the menu's bars 5-7, G -> G#
    hn.line(9, 1, [(p, b) for p, b in zip(TRICK, [1, 2, 1, 1, 1, 1, 1, 1, 1, 2])],
            [58, 64, 65, 62, 58, 67, 63, 61, 69, 66])
    hn.curve(11, [(9, 1, 90), (9, 2, 90), (9, 3, 104), (10, 1, 92), (10, 3, 90), (11, 1, 100),
                  (11, 2, 104), (12, 1, 110), (12, 2, 106), (12, 3.9, 88)])
    vn = s['Violin Solo']
    notes = vn.line(13, 1, [(p, b) for p, b in zip(CANON, [1, 2, 1, 1, 1, 1, 1, 1, 3])],
                    [80, 86, 88, 84, 80, 84, 82, 78, 84])
    for i in (1, 8):                                    # arrivals after the leap and at the cadence
        notes[i].shift = LATE_ARRIVAL
    vn.curve(1, [(1, 1, 92), (13, 1, 92), (13, 2, 96), (13, 3, 98), (14, 1, 100), (14, 3, 94),
                 (15, 1, 96), (15, 3, 93), (16, 1, 98), (16, 3, 90), (16, 3.9, 84)])
    fl = s['Flute Sus']                                  # the trick an octave up, ends on the leading tone
    fl.line(17, 1, [(p, b) for p, b in zip(['D5', 'A5', 'B5', 'A5', 'F#5', 'G#5', 'F#5', 'E5', 'D#5', 'C#5', 'B#4'],
                                          [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1])],
            [78, 84, 86, 84, 80, 88, 84, 81, 82, 80, 78])
    fl.curve(11, [(17, 1, 96), (17, 3, 104), (18, 1, 106), (19, 1, 114), (19, 3, 106), (20, 1, 110),
                  (20, 3, 100), (20, 3.9, 84)])
    s['Mark Trees'].add(9, 1, 60, 3, 32, hv=2)
    s['Flexaton'].add(12, 3, 64, 1, 46, hv=2)

    oom(s, range(5, 21), lambda b: (80 if b < 13 else 86) + (4 if b in (5, 13, 17) else 0))
    for name in ('Tuba Stac', 'Basses Pizz'):           # dominant pickup into the second phrase
        s[name].add(12, 3, 'G#1', 1, 70)
    bd = s['Bass Drum']
    for bar in range(5, 21):
        bd.add(bar, 1, 62, 1, 62 + (6 if bar in (5, 9, 13, 17) else 0) + (4 if bar >= 13 else 0))
    tp = s['Timpani']
    for bar, p in ((5, 'C#2'), (7, 'G#2'), (9, 'D2'), (11, 'G#2'), (13, 'C#2'), (15, 'D#2'), (17, 'D2'), (19, 'G#2')):
        tp.add(bar, 1, p, 1, 74 + (6 if bar >= 13 else 0))

    # pah-pah: violas (low) and col legno (high), voice-led; the trombones double from bar 13
    vl, cl, tb = s['Violas Pizz'], s['Violins Col Legno'], s['Trombones Stac']
    path = voice_lead(
        waltz_steps(s, range(5, 9), [(56, 61), (56, 64), (58, 71), (60, 72)],
                    {'Violas Pizz': [0, 1], 'Violins Col Legno': [2, 3]}, unison={2})
        + waltz_steps(s, range(9, 13), [(56, 64), (57, 66)], {'Violas Pizz': [0, 1]}, top_offset=0)
        + waltz_steps(s, range(13, 21), [(52, 58), (56, 61), (57, 64), (60, 71), (62, 72)],
                      {'Trombones Stac': [0, 1, 2], 'Violas Pizz': [1, 2], 'Violins Col Legno': [3, 4]},
                      skip=[('Trombones Stac', 'Violas Pizz'), ('Trombones Stac', 'Violins Col Legno')], unison={3}))
    a1, a2, a3 = path[:4], path[4:8], path[8:]
    for bar, v in zip(range(5, 9), a1):
        pah(vl, bar, v[:2], 68)
        pah(cl, bar, v[2:], 64)
    for bar, v in zip(range(9, 13), a2):               # the horn sings: col legno rests
        pah(vl, bar, v, 56)
    for bar, v in zip(range(13, 21), a3):
        pah(vl, bar, v[1:3], 70)
        pah(cl, bar, v[3:], 64)
        pah(tb, bar, v[:3], 72)
    cl.curve(1, [(1, 1, 104), (12, 3.9, 104), (13, 1, 110), (20, 3.9, 110)])
    tb.curve(1, [(1, 1, 100), (20, 3.9, 106)])
    bassoon_grimaces(s, A_GRIMACES)


def melody_a_head(s, bar, clar, xyl, col_legno=None):
    """The stolen waltz in staccato: the half notes become a quarter and a rest."""
    rhythm = [(0, 1), (1, 1), (3, 1), (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (9, 1)]
    for name, vels in (('Clarinet Stac', clar), ('Xylophone', xyl), ('Violins Col Legno', col_legno)):
        if vels is None:
            continue
        for (beat, beats), p, v in zip(rhythm, CANON, vels):
            s[name].add(bar + beat // 3, 1 + beat % 3, p, beats, v)


# bassoon grimaces: (bar, two chromatic eighths on beat 3, landing figure in the next bar)
A_GRIMACES = [(6, ['F#3', 'G3'], [('G#3', 1)]), (8, ['C3', 'C#3'], [('D3', 1)]),
              (10, ['F#3', 'G3'], [('G#3', 1), (None, 1), ('F#3', 1)]), (12, ['B2', 'C3'], [('C#3', 1)]),
              (14, ['C#3', 'D3'], [('D#3', 1)]), (16, ['E3', 'F3'], [('F#3', 1)]),
              (18, ['A#2', 'B2'], [('B#2', 1)]), (20, ['F#3', 'G3'], [])]
R_GRIMACES = [(62, ['F#3', 'G3'], [('G#3', 1)]), (64, ['C3', 'C#3'], [('D3', 1)]),
              (66, ['F#3', 'G3'], [('G#3', 1), (None, 1), ('B#2', 1)]), (68, ['E3', 'F3'], [('F#3', 1)]),
              (70, ['F#3', 'G3'], [('G#3', 1), (None, 1), ('E3', 1)]),
              (72, ['C3', 'C#3'], [('D3', 1), (None, 1), ('F#3', 1)]), (74, ['B2', 'C3'], [('C#3', 1)]),
              (76, ['F#3', 'G3'], [])]


def bassoon_grimaces(s, plan):
    bn = s['Bassoon Stac']
    for bar, (a, b), landing in plan:
        bn.add(bar, 3, a, .5, 58)
        bn.add(bar, 3.5, b, .5, 62)
        beat = 1
        for p, beats in landing:
            if p is not None:
                bn.add(bar + 1, beat, p, beats, 64 if beat == 1 else 58)
            beat += beats


def section_b(s):
    """Bars 21-36, «El espejismo»: the menu's tune intact on the music box over a G# pedal, the
    crack, and the lament (motif in augmentation over parallel descending triads)."""
    ce = s['Celesta']
    rhythm = [1, 2, 1, 1, 1, 1, 1, 1, 3]
    ce.line(21, 1, list(zip(MENU_CANON, rhythm)), [50, 54, 53, 51, 48, 51, 49, 47, 52], legato=False)
    ce.line(25, 1, list(zip(['D5', 'A5', 'Bb5', 'A5', 'F5', 'G#5', 'F#5', 'E5', 'D#5', 'C#5'],
                            [1, 2, 1, 1, 1, 1, 1, 1, 1, 2])),
            [49, 53, 54, 50, 47, 52, 49, 47, 48, 45], legato=False)
    for bar, beat, chord in ((21, 1, ['D4', 'F#4', 'A4']), (22, 1, ['D4', 'F#4', 'B4']), (23, 1, ['E4', 'G4', 'B4']),
                             (23, 3, ['E4', 'G4', 'A4']), (24, 1, ['D4', 'F#4', 'A4']), (25, 1, ['D4', 'F#4', 'A4']),
                             (26, 1, ['D4', 'F4', 'A4']), (27, 1, ['E4', 'G#4', 'B4']), (28, 1, ['C#4', 'E4', 'G#4'])):
        ce.chord(bar, beat, chord, 1, 38)
    ce.curve(1, [(20, 3.9, 96), (21, 1, 104), (24, 3, 104), (25, 1, 100), (28, 3.9, 96)])
    # the halo: G#5 above and G#1 below lock the D major in
    s['Copas'].add(21, 1, 'G#5', 24 - GUARD / BEAT, 32, shift=-SLOW_ATTACK, jitter=False, hv=2)
    s['Copas'].curve(11, [(20, 3, 84), (21, 1, 90), (24, 1, 102), (25, 1, 94), (28, 1, 104), (28, 3.9, 80)])
    tr = s['Basses Trem']
    for bar, v in ((21, 34), (25, 34), (29, 38), (33, 46)):
        tr.add(bar, 1, 'G#1', 12, v, hv=2)
    tr.curve(11, [(21, 1, 72), (23, 1, 100), (24, 3.9, 74), (25, 1, 72), (27, 1, 100), (28, 3.9, 74),
                  (29, 1, 76), (31, 1, 104), (32, 3.9, 80), (33, 1, 84), (35, 1, 116), (36, 3.9, 120)])
    roll = s['Timpani Roll']
    roll.add(21, 1, 'G#2', 24, 30, hv=2)
    roll.add(29, 1, 'G#2', 12, 32, hv=2)
    roll.add(33, 1, 'G#2', 12, 54, hv=2)
    roll.curve(11, [(21, 1, 96), (32, 3.9, 96), (33, 1, 70), (36, 3.9, 124)], shape='lin')
    ck = s['Cuchillo']                                   # the clockwork of the music box
    clock = [30, 25, 27, 31, 24, 28, 29, 26, 25, 32, 27, 24]
    for i, bar in enumerate(range(21, 33)):
        for beat in (1, 2, 3):
            ck.add(bar, beat, 60, 1, clock[(i * 3 + beat) % len(clock)] - (2 if bar >= 29 else 0), hv=3)
    s['Mark Trees'].add(21, 1, 60, 3, 30, hv=2)
    s['Flexaton'].add(28, 1, 60, 2, 50, hv=2)            # the ghost that breaks the illusion

    vib = s['Vibraphone Bowed']                          # motif in augmentation (x3), bowed
    vib.line(29, 1, [(p, 3) for p in ['C#5', 'G#5', 'A5', 'G#5', 'E5', 'F#5', 'E5', 'D#5']],
             [46, 48, 51, 53, 56, 60, 62, 66], shift=-SLOW_ATTACK, jitter=False, hv=2)
    vib.curve(11, [(28, 3, 96), (29, 1, 98), (33, 1, 104), (36, 1, 112), (36, 3.9, 104)])
    co = s['Coro']                                       # «Ah»: parallel first-inversion triads, below G4
    voices = [['E3', 'D3', 'C#3', 'C#3', 'C#3', 'B2', 'A2', 'B#2'],
              ['G#3', 'F#3', 'E3', 'D#3', 'F#3', 'E3', 'D3', 'F#3'],
              ['C#4', 'B3', 'A3', 'G#3', 'A3', 'G#3', 'F#3', 'A3']]
    for vline, base in zip(voices, (48, 50, 52)):
        co.line(29, 1, [(p, 3) for p in vline], [base + i * 2 for i in range(8)], tie=True)
    co.curve(1, [(1, 1, 45), (29, 1, 45), (31, 1, 52), (33, 1, 62), (35, 1, 72), (36, 3.9, 80)])
    hs = s['Horns Sus']                                  # arrival: G#7(b9) opens to the bridge
    hs.chord(36, 1, ['G#3', 'B#3', 'D#4', 'F#4', 'A4'], 3 - GUARD / BEAT, 60, hv=3)
    hs.curve(1, [(1, 1, 60), (36, 1, 60), (36, 3.9, 100)])
    cymbal_swell(s, 37, 62)


def cymbal_swell(s, target_bar, vel):
    """Suspended cymbal crescendo (key 63) whose measured peak lands on the target downbeat."""
    start = tick(target_bar) - int(round(CYMBAL_PEAK_S / SEC_PER_TICK))
    s['Cymbal'].notes.append(Note(63, start, tick(target_bar) - start - GUARD, vel, jitter=False, hv=0))


HEMIOLA = [(0, 1), (0, 3), (1, 2)]                       # (bar offset, beat) of the three half notes


def bridge(s):
    """Bars 37-44, «Los cuchillos»: hemiola (three half notes per two bars), rising by pairs:
    C#m | D | D#dim7 | G#7(b9); knives on every half note, the waltz pulled from under the feet."""
    pairs = [(37, ['C#4', 'G#4', 'A4'], ['C#2', 'G#1', 'C#2'], ['C#2', 'G#2', 'C#2'], 'C#2',
              ['E4', 'C#5', 'E5'], [56, 61, 64, 68]),
             (39, ['D4', 'A4', 'B4'], ['D2', 'A1', 'D2'], ['D2', 'A2', 'D2'], 'D2',
              ['F#4', 'A4', 'B4'], [57, 62, 66]),
             (41, ['D#4', 'A4', 'C5'], ['D#2', 'A1', 'D#2'], ['D#2', 'A2', 'D#2'], 'D#2',
              ['F#4', 'A4', 'C5'], [57, 60, 63, 66]),
             (43, ['G#4', 'B#4', 'D#5'], ['G#1', 'D#2', 'G#1'], ['G#2', 'D#2', 'G#2'], 'G#2',
              ['F#4', 'B#4', 'D#5'], [56, 60, 63, 66, 68])]
    hn, ck, cl, vc = s['Horns Marcato'], s['Cuchillo'], s['Violins Col Legno'], s['Celli Col Legno']
    k = 0
    for bar0, mel, bass, celli, timp, knives, tones in pairs:
        for j, (off, beat) in enumerate(HEMIOLA):
            bar = bar0 + off
            x = k / 11
            hn.add(bar, beat, mel[j], 2, 84 + int(16 * x))
            ck.add(bar, beat, 62, 1, 66 + int(12 * x), hv=2)
            cl.chord(bar, beat, knives, 1, 66 + int(22 * x))
            vc.add(bar, beat, celli[j], 1, 70 + int(18 * x))
            s['Tuba Stac'].add(bar, beat, bass[j], 1, 76 + int(16 * x))
            s['Basses Pizz'].add(bar, beat, bass[j], 1, 74 + int(16 * x))
            s['Timpani'].add(bar, beat, timp, 1, 66 + int(24 * x))
            if bar0 < 43:
                s['Bass Drum'].add(bar, beat, 62, 1, 62 + int(20 * x))
            k += 1
        # frenzy: violas spiccato, four eighths per half note (the hemiola in the arpeggio)
        shapes = [[0, 1, 2, 1], [0, 1, 2, 3], [3, 2, 1, 2]] if bar0 != 41 else [[0, 1, 2, 3], [3, 2, 1, 0], [1, 2, 3, 2]]
        for g, (off, beat) in enumerate(HEMIOLA):
            t = tick(bar0 + off, beat)
            for e, p in enumerate(arp(tones, shapes[g])):
                x = ((bar0 - 37) * 6 + g * 2 + e / 2) / 48
                v = 58 + int(32 * x) + (8 if e == 0 else 0)
                bar_e, beat_e = divmod(t + e * EIGHTH, BAR)
                s['Violas Spic'].add(bar_e + 1, 1 + beat_e / BEAT, p, .5, v)
    s['Bass Drum'].add(43, 1, 63, 6 - GUARD / BEAT, 70, hv=2)    # roll, mp -> f with CC11
    s['Bass Drum'].curve(11, [(1, 1, 112), (42, 3.875, 112), (43, 1, 84), (44, 3.875, 126), (45, 1, 112),
                              (80, 3.875, 112)])
    hn.curve(1, [(1, 1, 105), (36, 3.875, 105), (37, 1, 88), (44, 3.875, 108), (45, 1, 105)])
    cl.curve(1, [(36, 3.875, 110), (37, 1, 104), (44, 3.875, 112), (61, 1, 108), (64, 3.875, 108)])
    vc.curve(1, [(1, 1, 104), (37, 1, 104), (44, 3.875, 112), (45, 1, 106), (76, 3.875, 106)])
    cymbal_swell(s, 45, 70)


def climax(s):
    """Bars 45-60, «La máscara cae»: the motif in augmentation (horns, choir, trombones 8vb) over a
    lament bass; D major (the hero's chord as Neapolitan) at bar 53; coda in eighths; the bang."""
    mel = [('C#4', 6), ('G#4', 6), ('A4', 3), ('G#4', 3), ('E4', 6), ('F#4', 3), ('E4', 3), ('D#4', 6), ('C#4', 6)]
    vels = [92, 94, 95, 94, 95, 100, 94, 92, 90]
    s['Horns Sus'].line(45, 1, mel, vels)
    s['Horns Sus'].curve(1, [(44, 3.875, 105), (45, 1, 105), (48, 1, 106), (50, 1, 107), (52, 3, 107),
                             (53, 1, 110), (53, 3, 108), (54, 1, 104), (56, 1, 100), (58, 3.875, 95)])
    s['Trombones Sus'].line(45, 1, [(P(p) - 12, b) for p, b in mel], [v - 4 for v in vels])
    s['Trombones Sus'].curve(1, [(44, 3.875, 98), (45, 1, 98), (53, 1, 102), (58, 3.875, 98)])
    co = s['Coro']
    co.line(45, 1, mel, [v - 6 for v in vels])
    co.curve(1, [(44, 3.875, 80), (45, 1, 100), (49, 1, 104), (52, 3, 107), (53, 1, 110), (54, 1, 106),
                 (57, 1, 100), (59, 3.875, 95)])

    oom(s, range(45, 61), lambda b: 100 if b == 53 else (96 if b == 60 else 88 + (2 if b in (45, 49, 57) else 0)))
    bd = s['Bass Drum']
    for bar in range(45, 60):
        bd.add(bar, 1, 62, 1, 100 if bar == 53 else 88)
    tp = s['Timpani']
    for bar, p, v in ((45, 'C#2', 88), (46, 'B2', 84), (47, 'A2', 84), (48, 'G#2', 86), (49, 'F#2', 86),
                      (50, 'E2', 84), (51, 'D2', 86), (52, 'C#2', 88), (53, 'D2', 98), (54, 'A2', 88),
                      (55, 'G#2', 90), (57, 'C#2', 90), (58, 'B2', 86), (59, 'A2', 88)):
        tp.add(bar, 1, p, 1, v)
    s['Timpani Roll'].add(56, 1, 'G#2', 3 - GUARD / BEAT, 72, hv=3)
    s['Tam-tam'].add(45, 1, 57, 1, 72, hv=2)
    s['Tam-tam'].curve(1, [(1, 1, 104), (45, 1, 108), (80, 3.875, 108)])
    s['Cymbal'].add(53, 1, 66, 1, 74, hv=2)

    # the choir's chord under the tune, doubled in pah-pah by celli col legno and trombones
    def fixed(bar):
        out = {'Tuba Stac': frame(s['Tuba Stac'], bar)}
        for name in ('Horns Sus', 'Trombones Sus'):
            f = frame(s[name], bar)
            if f:
                out[name] = f
        return out
    steps = []
    skip = {frozenset(p) for p in (('Coro', 'Horns Sus'), ('Coro', 'Trombones Sus'), ('Coro', 'Celli Col Legno'),
                                   ('Coro', 'Trombones Stac'), ('Celli Col Legno', 'Trombones Stac'),
                                   ('Celli Col Legno', 'Tuba Stac'), ('Celli Col Legno', 'Basses Pizz'),
                                   ('Horns Sus', 'Trombones Sus'), ('Tuba Stac', 'Basses Pizz'))}
    for bar in range(45, 60):
        top_mel = frame(s['Horns Sus'], bar)
        top = min(57, (min(top_mel) - 1) if top_mel else 57)
        f = fixed(bar)
        f['Basses Pizz'] = frame(s['Basses Pizz'], bar)
        steps.append({'chord': HARM[bar], 'ranges': [(45, 52), (47, 55), (50, 57)], 'top': top, 'fixed': f,
                      'optional': 1, 'groups': {'Coro': [0, 1, 2, 'Horns Sus'], 'Celli Col Legno': [0, 1],
                                                'Trombones Stac': [1, 2]}, 'skip': skip})
    # bars 54-55: the brief fixes both the tune (E4 -> D#4) and the lament bass (A1 -> G#1), a
    # compound fifth in similar motion; the search reports it and keeps everything else clean
    chords = voice_lead(steps, known={10})
    for i in range(3):
        items = [(chords[k][i] if i < len(chords[k]) else None, 3) for k in range(len(chords))]
        notes = co.line(45, 1, items, [78 + i * 2 + (6 if bar == 53 else 0) for bar, (p, _) in
                                       zip(range(45, 60), items) if p is not None], tie=True)
        notes[-1].cut = tick(60)                        # the choir stops on the downbeat of bar 60
    for k, bar in enumerate(range(45, 60)):
        v = chords[k]
        pah(s['Celli Col Legno'], bar, list(v[:2]), 78 + (6 if bar == 53 else 0))
        pah(s['Trombones Stac'], bar, list(v[1:]), 76 + (6 if bar == 53 else 0))

    # frenzy: violins spiccato arpeggios, up and down
    tones = {45: [73, 76, 80, 85], 46: [71, 73, 76, 80, 83], 47: [73, 76, 80, 81], 48: [72, 75, 78, 80, 84],
             49: [73, 78, 81, 85], 50: [73, 76, 80, 85], 51: [74, 76, 78, 81], 52: [73, 76, 81, 85],
             53: [74, 78, 81, 86], 54: [73, 76, 78, 81], 55: [75, 78, 80, 81, 84], 56: [75, 78, 80, 81, 84],
             57: [73, 76, 80, 85], 58: [73, 76, 80, 83]}
    vs = s['Violins Spic']
    for bar, ts in tones.items():
        ts = [p for p in ts if 73 <= p <= 85]
        shape = [0, 1, 2, 3, 2, 1] if bar % 2 else [3, 2, 1, 0, 1, 2]
        level = 76 + int(14 * (1 - abs(bar - 53) / 8))
        for e, p in enumerate(arp(ts, shape)):
            vs.add(bar, 1 + e / 2, p, .5, level + (6 if e == 0 else (2 if e == 3 else 0)))
    # coda (bar 59): the head in eighths, the last trick before the bang
    coda = ['C#5', 'G#5', 'A5', 'G#5', 'E5', 'G#5']
    for name, base in (('Violins Spic', 88), ('Xylophone', 80), ('Flute Stac', 86)):
        for e, p in enumerate(coda):
            s[name].add(59, 1 + e / 2, p, .5, base + [0, 4, 7, 4, 0, 9][e])
    golpe(s, 60)
    s['Flexaton'].add(60, 1, 64, 1, 52, hv=2)
    s['Trombones Marcato'].curve(1, [(1, 1, 105), (60, 1, 105), (80, 3.875, 100)])


def section_return(s):
    """Bars 61-76: the waltz with more orchestra (barrel organ, col legno), the trick shouted by
    the horn section and a new consequent that ends on the tail of the motif."""
    melody_a_head(s, 61, clar=[88, 94, 96, 92, 87, 92, 88, 84, 90], xyl=[72, 78, 80, 76, 72, 76, 73, 70, 75],
                  col_legno=[74, 80, 82, 78, 74, 78, 75, 72, 77])
    hm = s['Horns Marcato']
    for (beat, beats), p, v in zip([(0, 1), (1, 2), (3, 1), (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (9, 1), (10, 2)],
                                   TRICK, [90, 96, 97, 94, 90, 100, 95, 92, 96, 92]):
        hm.add(65 + beat // 3, 1 + beat % 3, p, beats, v)
    hm.curve(1, [(64, 3.875, 105), (65, 1, 98), (66, 1, 100), (67, 1, 102), (68, 1, 100), (68, 3.875, 96)])
    cons = [('A5', 1), ('G#5', 1), ('F#5', 1), ('F#5', 2), ('A5', 1), ('G#5', 3), ('C#6', 1), ('B5', 1), ('A5', 1),
            ('A5', 2), ('F#5', 1), ('F#5', 1), ('E5', 1), ('D#5', 1), ('C#5', 3), ('B#4', 1), ('D#5', 1), ('A5', 1)]
    vn_v = [88, 86, 84, 82, 88, 86, 96, 92, 90, 88, 84, 84, 82, 80, 78, 72, 76, 82]
    fl_v = [88, 86, 84, 84, 90, 88, 98, 94, 92, 90, 86, 84, 82, 80, 76, 74, 78, 84]
    s['Violin Solo'].line(69, 1, cons, vn_v)
    s['Violin Solo'].curve(1, [(68, 3.875, 98), (69, 1, 95), (72, 1, 100), (73, 1, 96), (74, 1, 92),
                               (75, 1, 86), (76, 1, 82), (76, 3.875, 76)])
    s['Flute Sus'].line(69, 1, cons, fl_v)
    s['Flute Sus'].curve(11, [(68, 3.875, 100), (69, 1, 104), (72, 1, 116), (73, 1, 108), (75, 1, 94),
                              (76, 1, 90), (76, 3.875, 98)])

    oom(s, range(61, 77), lambda b: (88 if 65 <= b <= 68 else 84) + (4 if b in (61, 65, 69, 73) else 0)
        - (6 if b >= 75 else 0))
    bd, tp = s['Bass Drum'], s['Timpani']
    timp = {61: 'C#2', 62: 'A2', 63: 'G#2', 64: 'C#2', 65: 'D2', 66: 'F#2', 67: 'G#2', 68: 'C#2', 69: 'F#2',
            70: 'D#2', 71: 'G#2', 72: 'A2', 73: 'D2', 74: 'G#2', 75: 'C#2', 76: 'G#2'}
    for bar in range(61, 77):
        lift = 8 if 65 <= bar <= 68 else 0
        bd.add(bar, 1, 62, 1, 76 + lift + (4 if bar in (61, 69, 73) else 0) - (8 if bar >= 75 else 0))
        tp.add(bar, 1, timp[bar], 1, 76 + lift - (8 if bar >= 75 else 0))

    full = {'Celli Col Legno': [0], 'Violas Pizz': [1, 2], 'Organillo': [3, 4]}
    # the codetta's violas (bars 77-80) are part of the same search, and so is the seam: the last
    # step is bar 1's own pah-pah (fixed by the intro), so bar 80 leads into it
    seam = {'chord': 'C#m', 'ranges': [(56, 56), (61, 61)], 'fixed': {'Basses Pizz': frame(s['Basses Pizz'], 1)},
            'groups': {'Violas Pizz': [0, 1]}}
    path = voice_lead(
        waltz_steps(s, range(61, 65), [(48, 57), (56, 61), (57, 64), (60, 70), (62, 72)], full, unison={3})
        + waltz_steps(s, range(65, 69), [(48, 57), (56, 64), (57, 66)],
                      {'Celli Col Legno': [0], 'Violas Pizz': [1, 2]}, top_offset=0)
        + waltz_steps(s, range(69, 77), [(48, 57), (56, 61), (57, 64), (60, 70), (62, 72)], full, unison={3})
        + waltz_steps(s, range(77, 81), [(56, 61), (57, 64)], {'Violas Pizz': [0, 1]}, bass=('Basses Pizz',))
        + [seam])
    r1, r2, r3, s.codetta_violas = path[:4], path[4:8], path[8:16], path[16:20]
    vl, vc, org = s['Violas Pizz'], s['Celli Col Legno'], s['Organillo']
    for bar, v in list(zip(range(61, 65), r1)) + list(zip(range(69, 77), r3)):
        soft = bar >= 75
        pah(vl, bar, v[1:3], 64 if soft else 72)
        if 69 <= bar <= 74:                              # lighter under the new consequent
            vc.chord(bar, 2, v[:1], 1, 72)
        else:
            pah(vc, bar, v[:1], 66 if soft else 74)
        pah(org, bar, v[3:], 46 if soft else 50)
    for bar, v in zip(range(65, 69), r2):
        pah(vl, bar, v[1:3], 74)
        pah(vc, bar, v[:1], 76)
    for bar, dyad in zip(range(77, 81), s.codetta_violas):   # the codetta's muted waltz
        vl.chord(bar, 2, list(dyad), 1, 42)
        vl.chord(bar, 3, list(dyad), 1, 39)
    org.curve(1, [(1, 1, 100), (61, 1, 100), (64, 3.875, 104), (69, 1, 100), (74, 3.875, 106), (76, 3.875, 96)])
    bassoon_grimaces(s, R_GRIMACES)

    # frenzy under the consequent: chord tones below the tune
    vs = s['Violins Spic']
    last = None
    for bar in range(69, 77):
        tones, _, _ = CHORDS[HARM[bar]]
        shape = [0, 1, 2, 3, 2, 1] if bar % 2 else [3, 2, 1, 0, 1, 2]
        for e in range(6):
            mel = melody_at(s, bar, 1 + e / 2) or 85
            pool = [p for p in range(64, 77) if p % 12 in tones and p < mel]
            if bar % 2 == 0:
                pool = pool[::-1][:4][::-1]               # the upper part of the pool, falling first
            i = min(shape[e], len(pool) - 1)
            if pool[i] == last:
                i = i - 1 if i > 0 else i + 1
            last = pool[i]
            vs.add(bar, 1 + e / 2, last, .5, (60 if bar < 75 else 54) + (5 if e == 0 else 0))


def codetta(s):
    """Bars 77-80: C#m | A/C# | D/C# | G#7(b9). The music box again; the ratchet winds it up."""
    ce = s['Celesta']
    ce.line(77, 1, [(p, b) for p, b in zip(['C#5', 'G#5', 'A5', 'G#5', 'E5', 'F#5', 'E5', 'D5'],
                                           [1, 2, 1, 1, 1, 1, 1, 1])],
            [48, 52, 51, 48, 45, 49, 46, 43], legato=False)
    for bar, chord in ((77, ['C#4', 'E4', 'G#4']), (78, ['C#4', 'E4', 'A4']), (79, ['D4', 'F#4', 'A4']),
                       (80, ['D#4', 'F#4', 'A4'])):
        ce.chord(bar, 1, chord, 1, 38)
    ce.add(80, 3, 'D#5', 1, 44)                         # upbeat: D#5 -> C#5 on bar 1
    ce.curve(1, [(76, 3.875, 96), (77, 1, 100), (80, 3.875, 98)])
    cb = s['Basses Pizz']
    for bar, beat, p, v in ((77, 1, 'C#2', 50), (78, 1, 'C#2', 48), (79, 1, 'C#2', 50), (80, 1, 'C#2', 47),
                            (80, 3, 'G#1', 45)):
        cb.add(bar, beat, p, 1 if beat == 1 else 1 - GUARD / BEAT, v)
    for bar, v in ((77, 46), (78, 43), (79, 48)):
        s['Timpani'].add(bar, 1, 'C#2', 1, v)
    tr = s['Basses Trem']
    tr.add(77, 1, 'C#1', 12 - GUARD / BEAT, 30, hv=2)
    tr.curve(11, [(76, 3.875, 80), (77, 1, 84), (79, 1, 100), (80, 3.875, 72)])
    s['Carraca'].add(80, 2, 60, 2 - GUARD / BEAT, 34, hv=2)


# ── accompaniment under the melody ───────────────────────────────────────────
def level_of(s, name, n) -> float:
    if name in CC1_DYNAMICS:
        v = cc_value(s[name], 1, n.ws + n.shift)
        return cc1_to_velocity(v if v is not None else 100)
    return n.vel


def keep_under_melody(s):
    """No other part holds a note of a quarter or longer in the melody's octave as loud as the
    melody (brief criterion 6): velocities come down, with room for the humanization."""
    margin = 2 * HUMAN_VEL + 1
    for tracks, first, last in MELODIES:
        t0, t1 = tick(first), tick(last + 1)
        mel = [(name, n) for name in tracks for n in s[name].notes if t0 - SLOW_ATTACK <= n.ws + n.shift < t1]
        for name, part in s.items():
            if name in tracks or name in UNPITCHED or any(e[0] == name and e[1] <= first and last <= e[2]
                                                         for e in CLASH_EXEMPT):
                continue
            for o in part.notes:
                if o.dur * GATE.get(name, 1.0) < 0.85 * BEAT:
                    continue
                os_, oe = o.ws + o.shift, o.ws + o.shift + int(o.dur * GATE.get(name, 1.0))
                near = [level_of(s, mn, m) for mn, m in mel
                        if min(m.we + m.shift, oe, t1) - max(m.ws + m.shift, os_, t0) > 58
                        and abs(m.pitch - o.pitch) <= 11]
                if not near:
                    continue
                cap = int(max(near)) - margin
                if name in CC1_DYNAMICS:
                    if level_of(s, name, o) + HUMAN_VEL >= max(near):
                        print(f'warning: {name} {name_of(o.pitch)} bar {o.ws // BAR + 1} is not under the melody')
                elif o.vel > cap:
                    o.vel = max(20, cap)


# ── performance: humanization, legato, seam ──────────────────────────────────
def perform(parts: dict[str, Part]):
    for part in parts.values():
        rng = random.Random(f'{SEED}:{part.name}')
        gate = GATE.get(part.name, 1.0)
        part.notes.sort(key=lambda n: (n.ws, n.pitch))
        for n in part.notes:
            at = n.ws + n.shift
            lo = 0 if at in PROTECTED else -HUMAN_TICKS
            d = rng.randint(lo, HUMAN_TICKS) if n.jitter else 0
            n.start = max(0, at + d)
            n.end = n.start + (n.dur if n.legato else int(round(n.dur * gate)))
            if n.hv:
                n.vel += rng.randint(-n.hv, n.hv)
            n.vel = max(1, min(MAX_VEL, n.vel))
        starts = {}
        for n in part.notes:
            starts.setdefault(n.ws, []).append(n)
        for n in part.notes:
            nxt = starts.get(n.we, [])
            same = [m for m in nxt if m.pitch == n.pitch]
            if same:
                n.end = min(n.end, min(m.start for m in same) - SAME_PITCH_GAP)
            elif n.legato and nxt:
                n.end = min(m.start for m in nxt) + rng.randint(16, 40)     # 11-28 ms overlap
            if n.cut is not None:
                n.end = min(n.end, n.cut)
            n.end = min(n.end, LOOP_END - GUARD)
        by_pitch = {}
        for n in sorted(part.notes, key=lambda n: n.start):
            prev = by_pitch.get(n.pitch)
            if prev is not None and prev.end > n.start - 6:
                prev.end = n.start - 6
            by_pitch[n.pitch] = n


def build() -> dict[str, Part]:
    s = new_parts()
    for section in (intro, section_a, section_b, bridge, climax, codetta, section_return):
        section(s)
    for name in SONATINA:                                # every Sonatina track: CC1 from tick 0
        cc = s[name].cc.setdefault(1, {})
        if 0 not in cc:
            first = cc[min(cc)] if cc else 100
            cc[0] = first
    keep_under_melody(s)
    perform(s)
    return s


def write_midi(path: str = OUT) -> dict[str, Part]:
    parts = build()
    check_limits(parts)
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    for i, part in enumerate(parts.values()):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=part.name, time=0))
        if i == 0:
            tr.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
            tr.append(mido.MetaMessage('time_signature', numerator=3, denominator=4, time=0))
            tr.append(mido.MetaMessage('key_signature', key='C#m', time=0))
        events = []
        for num, pts in sorted(part.cc.items()):
            for t, v in sorted(pts.items()):
                events.append((t, 1, mido.Message('control_change', channel=part.channel, control=num, value=v)))
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


# ── verification ─────────────────────────────────────────────────────────────
def sfz_keys(path: str) -> set[int]:
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') in ('attack', 'first')
            for k in range(r.lokey, r.hikey + 1)}


def check_limits(parts: dict[str, Part]):
    """Hard limits: the script refuses to write a score that breaks them."""
    errors = []
    for name, part in parts.items():
        if not part.notes:
            errors.append(f'{name}: empty track')
            continue
        keys = sfz_keys(SFZ_OF[name])
        bad = sorted({n.pitch for n in part.notes if n.pitch not in keys})
        if bad:
            errors.append(f'{name}: notes outside {os.path.basename(SFZ_OF[name])}: {[name_of(p) for p in bad]}')
        if max(n.pitch for n in part.notes) > CEILINGS.get(name, 127):
            errors.append(f'{name}: above its ceiling {CEILINGS[name]}')
        if max(n.vel for n in part.notes) > MAX_VEL:
            errors.append(f'{name}: velocity above {MAX_VEL}')
        if max(part.cc.get(1, {0: 0}).values()) > MAX_CC1:
            errors.append(f'{name}: CC1 above {MAX_CC1}')
        if name in MAX_NOTE:
            longest = max(n.end - n.start for n in part.notes) * SEC_PER_TICK
            if longest > MAX_NOTE[name]:
                errors.append(f'{name}: a note of {longest:.2f} s (max {MAX_NOTE[name]} s)')
        if any(n.start < 0 or n.end > LOOP_END - GUARD for n in part.notes):
            errors.append(f'{name}: a note crosses the loop seam')
    if errors:
        raise SystemExit('score rejected:\n  ' + '\n  '.join(errors))


def sounding(parts, t0, t1):
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


def report(parts: dict[str, Part]):
    print(f"\n{'track':<18} {'patch':<44} {'notes':>5}  {'range used':<16} {'patch range':<11} dyn")
    for name, part in parts.items():
        keys = sfz_keys(SFZ_OF[name])
        lo, hi = min(n.pitch for n in part.notes), max(n.pitch for n in part.notes)
        dyn = 'CC1' if name in CC1_DYNAMICS else ('vel+CC1' if name in SONATINA else
                                                 ('vel+CC11' if 11 in part.cc else 'vel'))
        patch = '/'.join(dict(TRACKS)[name][-2:])[-44:]
        print(f'{name:<18} {patch:<44} '
              f'{len(part.notes):>5}  {name_of(lo)}-{name_of(hi)} ({lo}-{hi})'.ljust(90)[:90] +
              f' {min(keys)}-{max(keys)}'.ljust(12) + f' {dyn}')
    print(f"\n{'section':<10} layers")
    for label, first, last, limit in SECTIONS:
        worst, where = sounding(parts, tick(first), tick(last + 1))
        print(f'{label:<10} {worst:>2} / {limit}  (max at bar {where // BAR + 1})')


def main():
    parts = write_midi(OUT)
    report(parts)
    print(f'\nwritten {OUT}  ({LOOP_END * SEC_PER_TICK:.4f} s, {BARS} bars of 3/4 at {BPM})')


if __name__ == '__main__':
    main()
