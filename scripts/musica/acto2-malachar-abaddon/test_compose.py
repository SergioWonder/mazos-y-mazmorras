"""Acceptance tests for «El pacto» (docs/musica/acto2-malachar-abaddon.md): the boss of the Dark
Temple in two tracks that are the same song, Malachar (ritual) and Abaddon (chaos).

Section 8, criteria 1-13 (score), the synchrony rules of section 2 and the craft rules of the
orchestration brief (expression, legato, voice leading, development, loop seam). The tests read the
two generated MIDI files, independently of the checks compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto2-malachar-abaddon/test_compose.py
"""
import os
import sys
import tempfile
import unittest
from collections import defaultdict

import mido

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import compose  # noqa: E402
from estudio import midi_io, sfz  # noqa: E402
from estudio.config import library  # noqa: E402

BPM = 160
BEAT_S = 60 / BPM                         # 0.375 s
BAR_S = 4 * BEAT_S                        # 1.5 s
BARS = 56
LOOP_S = BARS * BAR_S                     # 84.000 s
E8 = BEAT_S / 2
S16 = BEAT_S / 4
TOL = 0.012                               # seconds: humanization (+-8 ms) plus rounding
VERSIONS = ('malachar', 'abaddon')

VSCO = 'VSCO-2-CE/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
VCSL = 'VCSL/'
MEM = VCSL + 'Membranophones/Struck Membranophones/'
IDIO = VCSL + 'Idiophones/Struck Idiophones/'
LARGE = SSO + 'Chorus - Performance/Large Chorus.sfz'
COMMON_PATCHES = {
    'Choir Low': LARGE,
    'Choir High': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Chant': LARGE,
    'Bass Drum': MEM + 'Bass Drum 2.sfz',
    'Frame Drum': MEM + 'Frame Drum.sfz',
    'Timpani': VSCO + 'Timpani.sfz',
    'Organ Pedal': SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
}
EXPECTED = {
    'malachar': {
        **COMMON_PATCHES,
        'Choir High 2': LARGE,
        'Organ 8': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
        'Organ 16': SSO + 'Organ/Great - Bourdon 16ft.sfz',
        'Didgeridoo': VCSL + 'Aerophones/Lip Aerophones/Didgeridoo.sfz',
        'Contrabassoon': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
        'Darbuka': MEM + 'Darbuka.sfz',
        'Col Legno Vc': SSO + 'Strings - Performance/Celli Col Legno.sfz',
        'Low Trem': SSO + 'Strings - Performance/Basses Tremolo.sfz',
        'Pact Bells': IDIO + 'Tubular Bells 1.sfz',
        'Hand Bell': IDIO + 'Hand Bells, Nepalese.sfz',
        'Finger Cymbals': IDIO + 'Finger Cymbals.sfz',
        'Gong': IDIO + 'Gong 1.sfz',
    },
    'abaddon': {
        **COMMON_PATCHES,
        'Horns Low': SSO + 'Brass - Performance/Horns Sustain.sfz',
        'Demon': SSO + 'Brass - Performance/Trombones Marcato.sfz',
        'Demon Low': SSO + 'Brass - Performance/Tuba Marcato.sfz',
        'Choir Shout': LARGE,
        'Cellos Spic': VSCO + 'CelloEnsSpic.sfz',
        'Celli Trem': SSO + 'Strings - Performance/Celli Tremolo.sfz',
        'Violas Trem': SSO + 'Strings - Performance/Violas Tremolo.sfz',
        'Knives': VSCO + 'ViolinEnsSpic.sfz',
        'Tom': MEM + 'Tom 2.sfz',
        'Gong Full': IDIO + 'Gong 2.sfz',
        'Cymbal': IDIO + 'Suspended Cymbal 2.sfz',
    },
}
COMMON = ('Bass Drum', 'Frame Drum', 'Timpani', 'Organ Pedal')
SHARED = ('Choir Low', 'Choir High', 'Chant')
STRUCK = {'Bass Drum', 'Frame Drum', 'Darbuka', 'Tom', 'Gong', 'Gong Full', 'Cymbal', 'Finger Cymbals',
          'Hand Bell', 'Pact Bells'}
SECTIONS = [('Intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 28), ('Bridge', 29, 36),
            ('Climax', 37, 48), ('Codetta', 49, 56)]
LAYERS = {'malachar': [12, 14, 14, 12, 14, 15, 12], 'abaddon': [12, 15, 15, 11, 15, 16, 12]}
ACCENTS = {0, 3, 6, 8, 11, 14}
KNIFE_POS = {2, 5, 9, 11, 13}

# ── criterion 2: registers (low, high) or the allowed keys ──────────────────
REGISTER = {
    'Choir Low': (46, 64), 'Choir High': (67, 82), 'Choir High 2': (67, 82), 'Choir Shout': (67, 82),
    'Chant': (49, 52), 'Organ 8': (59, 71), 'Organ 16': (37, 51), 'Organ Pedal': (37, 46),
    'Contrabassoon': (25, 32), 'Horns Low': (48, 58), 'Demon': (49, 58), 'Demon Low': (37, 40),
    'Cellos Spic': (37, 45), 'Celli Trem': (37, 45), 'Violas Trem': (59, 62), 'Col Legno Vc': (49, 52),
    'Low Trem': (33, 45), 'Timpani': (37, 46),
}
KEYS = {
    'Didgeridoo': {61, 68, 69}, 'Pact Bells': {61, 62}, 'Hand Bell': {62}, 'Cymbal': {67},
    'Knives': {64, 65, 73, 74}, 'Frame Drum': {61, 64}, 'Darbuka': {60}, 'Gong': {60, 61},
    'Gong Full': {61}, 'Bass Drum': {62}, 'Tom': {62, 64}, 'Finger Cymbals': {60},
}

# ── criterion 3: the reference melody of section 5 ──────────────────────────
HEAD = (.5, .5, 1, 1.5, .5)               # e e q q. e
TAIL = (1, 1, 2)                          # q q h
CELL = (.5, .5, 1, 1, 1)                  # e e q q q


def entry(bar, pitches, rhythm):
    out, pos = [], 0.0
    for p, beats in zip(pitches, rhythm):
        out.append((bar + int(pos // 4), 1 + pos % 4, p))
        pos += beats
    return out


def chant3(bar, p):
    return entry(bar, [p, p, p], (1.5, 1.5, 1))


def motif_d(bar, shift):
    return (entry(bar, [50 + shift, 52 + shift, 53 + shift, 56 + shift, 57 + shift], HEAD)
            + entry(bar + 1, [53 + shift, 52 + shift, 49 + shift], TAIL)
            + entry(bar + 2, [50 + shift, 53 + shift, 57 + shift, 58 + shift, 57 + shift], CELL)
            + entry(bar + 3, [50 + shift], (3,)))


def bridge_head(bar, pitches):
    return entry(bar, pitches, (.5, .5, 1, 1.5))


REF = {
    'Choir Low': (chant3(3, 49)
                  + entry(5, [49, 51, 52, 55, 56], HEAD) + entry(7, [49, 52, 56, 57, 56], CELL)
                  + entry(10, [52, 51, 48], TAIL) + entry(12, [49], (3,))
                  + [n for b in range(13, 21) for n in chant3(b, 55 if b == 14 else 56)]
                  + entry(21, [49, 52, 56, 57, 56], CELL) + entry(23, [49, 52, 56, 57, 56], CELL)
                  + entry(25, [56, 59, 63, 64, 63], CELL) + entry(27, [56], (4,))
                  + bridge_head(29, [49, 51, 52, 55]) + bridge_head(31, [50, 52, 53, 56])
                  + bridge_head(33, [51, 53, 54, 57]) + entry(35, [52, 54, 55, 58], (1, 1, 1, 1))
                  + [(36, 1, p) for p in (46, 49, 55)]
                  + motif_d(37, 0) + motif_d(41, 0)
                  + entry(47, [49, 52, 56, 57, 56], CELL)
                  + entry(49, [49, 51, 52, 55, 56], (1, 1, 2, 3, 1))
                  + chant3(55, 49)),
    'Choir High': (entry(4, [74], (3,))
                   + entry(6, [76, 75, 72], TAIL) + entry(8, [73], (3,))
                   + entry(9, [73, 75, 76, 79, 80], HEAD) + entry(11, [73, 76, 80, 81, 80], CELL)
                   + entry(13, [73, 75, 76, 79, 80, 76, 75, 72, 73, 76, 80, 81, 80, 73],
                           (1, 1, 2, 3, 1, 2, 2, 4, 1, 1, 2, 2, 2, 8))
                   + entry(22, [74, 73], (2, 2)) + entry(24, [76, 74], (2, 2))
                   + entry(26, [81, 80], (2, 2)) + entry(28, [72, 75], (2, 2))
                   + bridge_head(30, [73, 75, 76, 79]) + bridge_head(32, [74, 76, 77, 80])
                   + bridge_head(34, [75, 77, 78, 81]) + entry(35, [76, 78, 79, 82], (1, 1, 1, 1))
                   + [(36, 1, p) for p in (67, 70, 73)]
                   + motif_d(37, 24) + motif_d(41, 24)
                   + entry(45, [77, 76, 73], TAIL) + entry(46, [76, 75, 72], TAIL)
                   + entry(48, [73], (3,))
                   + entry(51, [76, 75, 72], (2, 2, 4))
                   + entry(56, [74], (3,))),
}
WINDOWS = [(3, 4), (5, 12), (13, 20), (21, 28), (29, 36), (37, 44), (45, 48), (49, 52), (55, 56)]
# The tonal fundamental of every bar (pitch class): do# phrygian, the bridge rising by semitones,
# the climax in re and the fall back to do#.
FUND = {**{b: 1 for b in range(1, 31)}, 31: 2, 32: 2, 33: 3, 34: 3, 35: 4, 36: 3,
        **{b: 2 for b in range(37, 46)}, **{b: 1 for b in range(46, 57)}}
# Bass of section 4 (Organ Pedal): bar -> [(beat, pitch)]. Deviations documented in compose.py:
# D/F# in bar 7 (beat 3), Dmaj7(#11)/F# in bar 18, Eb/G (Neapolitan sixth) and A7/C# in bars 39
# and 43, so the bass makes no parallel 5ths/8ves with the melody.
PEDAL = {
    1: [(1, 37)], 5: [(1, 37), (3, 45)], 6: [(1, 44)], 7: [(1, 37), (3, 42), (4, 44)], 8: [(1, 37), (3, 37)],
    9: [(1, 37), (3, 45)], 10: [(1, 44), (3, 44)], 11: [(1, 45), (3, 42), (4, 44)], 12: [(1, 37), (3, 37)],
    13: [(1, 37)], 14: [(1, 45)], 15: [(1, 44)], 16: [(1, 44)], 17: [(1, 37)], 18: [(1, 42)], 19: [(1, 37)],
    20: [(1, 37)], **{b: [(1, 37)] for b in range(21, 25)}, **{b: [(1, 44)] for b in range(25, 29)},
    29: [(1, 37)], 30: [(1, 37)], 31: [(1, 38)], 32: [(1, 38)], 33: [(1, 39)], 34: [(1, 39)], 35: [(1, 40)],
    36: [(1, 39)], 37: [(1, 38), (3, 46)], 38: [(1, 45)], 39: [(1, 38), (3, 43), (4, 37)], 40: [(1, 38), (3, 38)],
    41: [(1, 38), (3, 46)], 42: [(1, 45), (3, 45)], 43: [(1, 46), (3, 43), (4, 37)], 44: [(1, 38), (3, 38)],
    45: [(1, 46), (3, 45)], 46: [(1, 44)], 47: [(1, 37), (3, 45)], 48: [(1, 37), (3, 37)],
    49: [(1, 37)], 50: [(1, 37)], 51: [(1, 37)], 52: [(1, 44)], 53: [(1, 37)],
}
# Sustained tracks whose voice leading is checked, and the doublings declared in the brief.
VOICES = {'malachar': ['Choir Low', 'Choir High', 'Organ 8', 'Organ Pedal', 'Low Trem'],
          'abaddon': ['Choir Low', 'Choir High', 'Organ Pedal', 'Horns Low']}
DOUBLED = {frozenset(p) for p in [('Choir Low', 'Choir High'), ('Choir Low', 'Horns Low'), ('Choir High', 'Horns Low'),
                                  ('Organ Pedal', 'Low Trem')]}
UNISONS = {'Choir High 2': 'Choir High', 'Choir Shout': 'Choir High', 'Horns Low': 'Choir Low'}
SONATINA_LIMIT_S = {'Horns Low': 2.8, 'Demon': 0.3, 'Demon Low': 0.3}
SIXTEENTHS_OK = {'Darbuka', 'Cellos Spic', 'Chant', 'Col Legno Vc', 'Knives', 'Tom'} | set(COMMON)


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def beat_of(t):
    """Position inside the bar in beats (1-based), rounded to the eighth."""
    return 1 + round(((t + TOL) % BAR_S - TOL) / E8) / 2


def pos16(t):
    return round(((t + TOL) % BAR_S - TOL) / S16)


def notes_between(track, first_bar, last_bar):
    if track is None:
        return []
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi]


def pedal_at(bar, beat):
    """Pitch of the Organ Pedal sounding at (bar, beat) according to section 4."""
    found = None
    for b in sorted(PEDAL):
        for bt, p in PEDAL[b]:
            if (b, bt) <= (bar, beat):
                found = p
    return found


def sounding_in(track, bar):
    lo, hi = bar_start(bar), bar_start(bar + 1)
    return [n for n in track.notes if n.start < hi - 0.05 and n.end > lo + 0.05]


def section_of(bar):
    return next(label for label, first, last in SECTIONS if first <= bar <= last)


def is_sonatina(version, name):
    return EXPECTED[version][name].startswith('sso/')


def cc_at(track, ctrl, t):
    value = None
    for time, v in track.cc.get(ctrl, []):
        if time <= t + 1e-6:
            value = v
    return value


def level(version, track, note):
    """Dynamic level on the velocity scale: velocity, or CC1 - 15 for Sonatina (section 7 table)."""
    if is_sonatina(version, track.name) and track.cc.get(1):
        return cc_at(track, 1, note.start) - 15
    return note.velocity


def raw(path):
    """Per track: notes [(pitch, on tick, off tick, velocity)] and controllers {ctrl: [(tick, value)]}."""
    mid = mido.MidiFile(path)
    notes, ccs = {}, {}
    for tr in mid.tracks:
        name = next(m.name for m in tr if m.type == 'track_name')
        t, open_, out, cc = 0, {}, [], defaultdict(list)
        for m in tr:
            t += m.time
            if m.type == 'note_on' and m.velocity > 0:
                open_.setdefault(m.note, []).append((t, m.velocity))
            elif m.type in ('note_on', 'note_off'):
                on, vel = open_[m.note].pop(0)
                out.append((m.note, on, t, vel))
            elif m.type == 'control_change':
                cc[m.control].append((t, m.value))
        notes[name] = sorted(out, key=lambda n: (n[1], n[0]))
        ccs[name] = dict(cc)
    return notes, ccs


class PactoScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        out = tempfile.mkdtemp()
        cls.paths = compose.write_midis(out)
        cls.mid = {v: mido.MidiFile(cls.paths[v]) for v in VERSIONS}
        cls.song = {v: midi_io.load(cls.paths[v]) for v in VERSIONS}
        cls.raw = {v: raw(cls.paths[v]) for v in VERSIONS}

    def tracks(self, v):
        return self.song[v].tracks

    def track(self, v, name):
        return self.song[v].tracks.get(name)

    # ── structure ─────────────────────────────────────────────────────────────
    def test_output_paths(self):
        for v in VERSIONS:
            self.assertEqual(os.path.basename(self.paths[v]), f'acto2-{v}.mid')
            self.assertEqual(os.path.basename(compose.OUT[v]), f'acto2-{v}.mid')
            self.assertEqual(os.path.dirname(compose.OUT[v]), os.path.join(HERE, 'build'))

    def test_one_named_track_per_instrument_and_articulation(self):
        for v in VERSIONS:
            names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid[v].tracks]
            self.assertEqual(len(names), len(set(names)), v)
            self.assertEqual(set(names), set(EXPECTED[v]), v)
            for name, rel in EXPECTED[v].items():
                self.assertEqual(compose.SFZ_OF[v][name], library(*rel.split('/', 1)), name)
                self.assertTrue(os.path.exists(compose.SFZ_OF[v][name]), rel)
                self.assertNotIn('KS', os.path.basename(rel), rel)
            for name in EXPECTED[v]:
                self.assertTrue(self.track(v, name) and self.track(v, name).notes, f'{v} {name} is empty')

    # ── criterion 1 ───────────────────────────────────────────────────────────
    def test_tempo_meter_and_length(self):
        lengths = set()
        for v in VERSIONS:
            mid = self.mid[v]
            tempos = [(i, m) for i, tr in enumerate(mid.tracks) for m in tr if m.type == 'set_tempo']
            sigs = [m for tr in mid.tracks for m in tr if m.type == 'time_signature']
            self.assertEqual(len(tempos), 1, v)
            self.assertEqual(tempos[0][0], 0, 'tempo in the first track')
            self.assertAlmostEqual(mido.tempo2bpm(tempos[0][1].tempo), BPM, places=3)
            self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(4, 4)])
            for tr in mid.tracks:
                self.assertEqual(sum(m.time for m in tr), BARS * 4 * mid.ticks_per_beat, v)
            lengths.add((mid.ticks_per_beat, BARS * 4 * mid.ticks_per_beat))
        self.assertEqual(len(lengths), 1, 'both tracks share resolution and length')

    def test_notes_inside_the_loop(self):
        for v in VERSIONS:
            for track in self.tracks(v).values():
                for n in track.notes:
                    self.assertGreaterEqual(n.start, 0.0)
                    self.assertLess(n.start, LOOP_S, f'{v} {track.name}')
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

    def test_no_overlapping_notes_of_the_same_pitch(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                last_end = {}
                for n in track.notes:
                    self.assertLessEqual(last_end.get(n.pitch, -1), n.start, f'{v} {name} {n.pitch} at {n.start:.2f}')
                    last_end[n.pitch] = n.end

    # ── criterion 2 ───────────────────────────────────────────────────────────
    def test_instrument_ranges(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                inst = sfz.load(compose.SFZ_OF[v][name])
                keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                        for k in range(r.lokey, r.hikey + 1)}
                for n in track.notes:
                    self.assertIn(n.pitch, keys, f'{v} {name} {n.pitch}')

    def test_section6_registers(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    b = bar_of(n.start)
                    if name in KEYS:
                        self.assertIn(n.pitch, KEYS[name], f'{v} {name} bar {b}')
                    else:
                        lo, hi = REGISTER[name]
                        self.assertTrue(lo <= n.pitch <= hi, f'{v} {name} bar {b} pitch {n.pitch}')
                    if name == 'Organ 8' and not 37 <= b <= 48:
                        self.assertLessEqual(n.pitch, 70, f'{v} Organ 8 bar {b}')
                    if name in ('Choir High', 'Choir High 2', 'Choir Shout') and n.pitch == 82:
                        self.assertIn(b, (35, 39, 43), f'{v} {name}')

    def test_highest_note_is_the_summit(self):
        for v in VERSIONS:
            pitched = [(n.pitch, bar_of(n.start)) for name, tr in self.tracks(v).items()
                       if name not in STRUCK and name != 'Didgeridoo' for n in tr.notes]
            top = max(p for p, _ in pitched)
            self.assertEqual(top, 82, v)
            self.assertEqual({b for p, b in pitched if p == 82}, {35, 39, 43}, v)

    # ── criterion 3 and synchrony rule 2 ──────────────────────────────────────
    def test_reference_melody_in_both_tracks(self):
        for v in VERSIONS:
            for name in ('Choir Low', 'Choir High'):
                track = self.track(v, name)
                for first, last in WINDOWS:
                    got = sorted((bar_of(n.start), beat_of(n.start), n.pitch)
                                 for n in notes_between(track, first, last))
                    want = sorted(n for n in REF[name] if first <= n[0] <= last)
                    self.assertEqual(got, want, f'{v} {name} bars {first}-{last}')
                for first, last in ((1, 2), (53, 54)):
                    self.assertFalse(notes_between(track, first, last), f'{v} {name} bars {first}-{last}')

    def test_declared_unisons(self):
        for v in VERSIONS:
            for name, lead in UNISONS.items():
                if name not in EXPECTED[v]:
                    continue
                lead_set = {(bar_of(n.start), beat_of(n.start), n.pitch) for n in self.track(v, lead).notes}
                for n in self.track(v, name).notes:
                    self.assertIn((bar_of(n.start), beat_of(n.start), n.pitch), lead_set, f'{v} {name}')
        m = self.track('malachar', 'Choir High 2')
        self.assertFalse(notes_between(m, 21, 28), 'Choir High 2 rests in B')
        self.assertTrue(notes_between(m, 4, 4) and notes_between(m, 5, 20) and notes_between(m, 29, 48))
        shout = self.track('abaddon', 'Choir Shout')
        self.assertEqual({bar_of(n.start) for n in shout.notes} - set(range(37, 49)), set())
        self.assertEqual(len(notes_between(shout, 37, 44)),
                         len(notes_between(self.track('abaddon', 'Choir High'), 37, 44)))

    def test_horns_low_doubles_the_low_voices(self):
        horns = self.track('abaddon', 'Horns Low')
        bars = {bar_of(n.start) for n in horns.notes}
        low_bars = {bar_of(n.start) for n in self.track('abaddon', 'Choir Low').notes}
        self.assertEqual(bars, low_bars - {51, 52})

    # ── criterion 4 and synchrony rule 3 ──────────────────────────────────────
    def test_common_layers_identical(self):
        notes = {v: self.raw[v][0] for v in VERSIONS}
        for name in COMMON:
            self.assertTrue(notes['malachar'][name])
            self.assertEqual(notes['malachar'][name], notes['abaddon'][name], name)

    def test_voices_identical_but_their_cc1(self):
        notes = {v: self.raw[v][0] for v in VERSIONS}
        ccs = {v: self.raw[v][1] for v in VERSIONS}
        for name in SHARED:
            a = [(p, on, off) for p, on, off, _ in notes['malachar'][name]]
            b = [(p, on, off) for p, on, off, _ in notes['abaddon'][name]]
            self.assertEqual(a, b, name)
            self.assertNotEqual(ccs['malachar'][name][1], ccs['abaddon'][name][1], name)

    def test_common_layer_patterns(self):
        song = self.tracks('malachar')
        by_bar = {name: defaultdict(list) for name in COMMON}
        for name in COMMON:
            for n in song[name].notes:
                by_bar[name][bar_of(n.start)].append(n)
        for bar in range(1, BARS + 1):
            intro = bar <= 4 or bar >= 53
            ib = bar - 52 if bar >= 53 else bar
            sec = section_of(bar)
            bd = {pos16(n.start) for n in by_bar['Bass Drum'][bar]}
            fd = {(pos16(n.start), n.pitch) for n in by_bar['Frame Drum'][bar]}
            if (intro and ib in (1, 2)) or sec == 'B' or 49 <= bar <= 52:
                self.assertEqual(bd, {0, 8}, f'bass drum bar {bar}')
            else:
                self.assertEqual(bd, {0, 6, 8, 14}, f'bass drum bar {bar}')
            if intro and ib in (1, 2):
                self.assertEqual(fd, {(15, 64)}, f'frame drum bar {bar}')
            elif sec == 'B':
                self.assertEqual(fd, {(3, 61), (11, 61)}, f'frame drum bar {bar}')
            else:
                self.assertEqual(fd, {(3, 61), (11, 61), (15, 64)}, f'frame drum bar {bar}')
            tp = sorted((pos16(n.start), n.pitch) for n in by_bar['Timpani'][bar])
            root = 38 if intro and ib == 4 else pedal_at(bar, 1)
            if 37 <= bar <= 48:
                self.assertEqual(tp, [(0, root), (8, pedal_at(bar, 3))], f'timpani bar {bar}')
            else:
                self.assertEqual(tp, [(0, root)], f'timpani bar {bar}')
        for bar, items in PEDAL.items():
            got = [(beat_of(n.start), n.pitch) for n in by_bar['Organ Pedal'][bar]]
            self.assertEqual(got, [(float(b), p) for b, p in items], f'organ pedal bar {bar}')
        attacked = {bar_of(n.start) for n in song['Organ Pedal'].notes}
        self.assertEqual(attacked, set(PEDAL))

    # ── criterion 5 ───────────────────────────────────────────────────────────
    def positions(self, v, name):
        out = defaultdict(dict)
        for n in self.track(v, name).notes:
            b, p = bar_of(n.start), pos16(n.start)
            out[b][p] = max(out[b].get(p, 0), n.velocity)
        return out

    def test_same_skeleton(self):
        darb, spic = self.positions('malachar', 'Darbuka'), self.positions('abaddon', 'Cellos Spic')
        self.assertTrue(set(darb) <= set(spic))
        for bar, pos in darb.items():
            self.assertEqual(set(pos), set(spic[bar]), f'ostinato bar {bar}')
            self.assertEqual(set(pos), set(range(16)), f'ostinato bar {bar}')
            for track in (pos, spic[bar]):
                acc = {p for p in track if p in ACCENTS}
                self.assertGreater(min(track[p] for p in acc),
                                   max(track[p] for p in track if p not in ACCENTS), f'accents bar {bar}')
        cl, kn = self.positions('malachar', 'Col Legno Vc'), self.positions('abaddon', 'Knives')
        self.assertEqual(set(cl), set(kn))
        for bar in cl:
            self.assertEqual(set(cl[bar]), KNIFE_POS, f'col legno bar {bar}')
            self.assertEqual(set(kn[bar]), KNIFE_POS, f'knives bar {bar}')
        gm, gf = self.positions('malachar', 'Gong'), self.positions('abaddon', 'Gong Full')
        self.assertEqual({b: set(p) for b, p in gm.items()}, {b: set(p) for b, p in gf.items()})
        for v in VERSIONS:
            for bar, pos in self.positions(v, 'Chant').items():
                self.assertLessEqual(set(pos), ACCENTS, f'{v} chant bar {bar}')

    def test_ostinato_details(self):
        for n in self.track('malachar', 'Darbuka').notes:
            bar, p = bar_of(n.start), pos16(n.start)
            self.assertNotIn(section_of(bar), ('B',))
            if p in ACCENTS:
                self.assertTrue(78 <= n.velocity <= 100, f'darbuka accent bar {bar}: {n.velocity}')
            else:
                self.assertTrue(40 <= n.velocity <= 62, f'darbuka bar {bar}: {n.velocity}')
        spic = self.positions('abaddon', 'Cellos Spic')
        self.assertEqual(set(spic), set(range(1, BARS + 1)))
        for n in self.track('abaddon', 'Cellos Spic').notes:
            bar, p = bar_of(n.start), pos16(n.start)
            fund = 44 if 25 <= bar <= 28 else 36 + (FUND[bar] - 0) % 12
            if section_of(bar) == 'B':
                self.assertIn(p, range(0, 16, 2), f'B is in eighths, bar {bar}')
                self.assertTrue(54 <= n.velocity <= 72, f'B without accents, bar {bar}')
                self.assertEqual(n.pitch, fund + 1 if p in (6, 14) else fund, f'bar {bar} pos {p}')
            else:
                self.assertEqual(n.pitch, fund + 1 if p in (7, 15) else fund, f'bar {bar} pos {p}')

    def test_demon_hits(self):
        for name in ('Demon', 'Demon Low'):
            for n in self.track('abaddon', name).notes:
                bar, p = bar_of(n.start), pos16(n.start)
                self.assertIn(p, (0, 6, 12), f'{name} bar {bar}')
                s = FUND[bar] - 1
                if name == 'Demon':
                    self.assertIn(n.pitch, (49 + s, 50 + s, 55 + s), f'Demon bar {bar}')
                else:
                    self.assertEqual(n.pitch, 37 + s, f'Demon Low bar {bar}')
                if section_of(bar) in ('B', 'Codetta') and not bar == 56:
                    self.assertEqual(p, 0, f'{name} only on the downbeat in bar {bar}')
        demon_bars = {bar_of(n.start) for n in self.track('abaddon', 'Demon').notes}
        self.assertEqual(demon_bars, set(range(5, 21)) | set(range(29, 49)))
        for bar in (5, 20, 33, 43):
            chord = sorted(n.pitch for n in notes_between(self.track('abaddon', 'Demon'), bar, bar)
                           if pos16(n.start) == 0)
            self.assertEqual(len(chord), 3, f'Demon cluster bar {bar}')

    # ── criterion 6 ───────────────────────────────────────────────────────────
    def test_figures(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in SIXTEENTHS_OK:
                    continue
                onsets = sorted({round(n.start, 3) for n in track.notes})
                for a, b in zip(onsets, onsets[1:]):
                    self.assertGreaterEqual(b - a, E8 - 2 * TOL, f'{v} {name} at {a:.2f} s')
                for n in track.notes:
                    self.assertGreaterEqual(n.end - n.start, E8 - 0.03, f'{v} {name} at {n.start:.2f} s')

    def test_sixteenths_only_where_allowed(self):
        for v in VERSIONS:
            for name in ('Darbuka', 'Cellos Spic', 'Col Legno Vc', 'Knives'):
                if name in EXPECTED[v]:
                    for n in self.track(v, name).notes:
                        self.assertLessEqual(n.end - n.start, S16 + 0.01, f'{v} {name}')

    # ── criterion 7 ───────────────────────────────────────────────────────────
    def test_layers_per_section(self):
        for v in VERSIONS:
            tracks = list(self.tracks(v).values())
            for (label, first, last), limit in zip(SECTIONS, LAYERS[v]):
                lo, hi = bar_start(first), bar_start(last + 1)
                times = sorted({max(lo, min(hi, x)) for tr in tracks for n in tr.notes
                                for x in (n.start, n.end)} | {lo, hi})
                worst = 0
                for a, b in zip(times, times[1:]):
                    if b - a < 1e-6:
                        continue
                    mid = (a + b) / 2
                    worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes) for tr in tracks))
                self.assertLessEqual(worst, limit, f'{v} {label}')

    def test_struck_notes_are_one_eighth(self):
        for v in VERSIONS:
            for name in ('Gong', 'Gong Full', 'Pact Bells', 'Hand Bell', 'Finger Cymbals', 'Cymbal'):
                if name in EXPECTED[v]:
                    for n in self.track(v, name).notes:
                        self.assertAlmostEqual(n.end - n.start, E8, delta=0.02, msg=f'{v} {name}')

    # ── criterion 8 ───────────────────────────────────────────────────────────
    def test_no_register_clash_with_the_singing_choir(self):
        for v in VERSIONS:
            tr = self.tracks(v)
            for lead in ('Choir Low', 'Choir High'):
                mel = tr[lead].notes
                for name, track in tr.items():
                    if name in STRUCK or name in ('Choir Low', 'Choir High') or UNISONS.get(name) == lead:
                        continue
                    for o in track.notes:
                        if o.end - o.start < BEAT_S - 0.04:
                            continue
                        pitch = 37 if name == 'Didgeridoo' else o.pitch      # every sample sounds C#2
                        for m in mel:
                            if min(m.end, o.end) - max(m.start, o.start) <= 0.04 or abs(m.pitch - pitch) > 11:
                                continue
                            self.assertLess(level(v, track, o), level(v, tr[lead], m),
                                            f'{v} {name} {o.pitch} vs {lead} {m.pitch} at bar {bar_of(o.start)}')

    def test_salmodia_below_the_high_voices(self):
        for v in VERSIONS:
            low, high = self.track(v, 'Choir Low'), self.track(v, 'Choir High')
            for n in notes_between(low, 13, 20):
                self.assertLessEqual(cc_at(low, 1, n.start), cc_at(high, 1, n.start) - 6, f'{v} bar {bar_of(n.start)}')

    def test_knives_out_of_the_singing_octave(self):
        knives = self.track('abaddon', 'Knives')
        tr = self.tracks('abaddon')
        for n in knives.notes:
            bar = bar_of(n.start)
            sung = [m.pitch for lead in ('Choir Low', 'Choir High') for m in sounding_in(tr[lead], bar)]
            self.assertTrue(sung, f'knives in bar {bar} without voices')
            self.assertNotIn(n.pitch // 12, {p // 12 for p in sung}, f'knives bar {bar}')
            low = bool(sounding_in(tr['Choir Low'], bar))
            high = bool(sounding_in(tr['Choir High'], bar))
            self.assertEqual(n.pitch in (73, 74), low and not high, f'knives bar {bar}')
            self.assertLessEqual(n.end - n.start, 0.08 + 1e-6)
            self.assertLessEqual(n.velocity, 86)
        for n in self.track('malachar', 'Col Legno Vc').notes:
            self.assertLessEqual(n.velocity, 70)
            s = min(FUND[bar_of(n.start)] - 1, 2)
            self.assertIn(n.pitch, (49 + s, 50 + s), f'col legno bar {bar_of(n.start)}')

    # ── criterion 9 ───────────────────────────────────────────────────────────
    def test_malachar_without_horns_or_trumpets(self):
        for name in self.tracks('malachar'):
            path = compose.SFZ_OF['malachar'][name]
            self.assertNotRegex(os.path.basename(path), r'(?i)horn|trumpet', name)
        for n in self.track('abaddon', 'Horns Low').notes:
            self.assertLessEqual(n.pitch, 58)

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_didgeridoo_only_in_c_sharp(self):
        allowed = set(range(1, 19)) | set(range(21, 29)) | set(range(47, 57))
        for n in self.track('malachar', 'Didgeridoo').notes:
            first, last = bar_of(n.start), bar_of(n.end - 0.05)
            if n.pitch == 61:
                self.assertIn((first, beat_of(n.start)), [(21, 1), (29, 1)])
                self.assertEqual(first, last)
            else:
                self.assertTrue(first in allowed and last in allowed, f'{n.pitch} bars {first}-{last}')
                self.assertTrue({first, last}.isdisjoint(range(30, 47)))
                self.assertLessEqual(n.end - n.start, 12.0 if n.pitch == 68 else 9.5)
        growls = [bar_of(n.start) for n in self.track('malachar', 'Didgeridoo').notes if n.pitch == 61]
        self.assertEqual(sorted(growls), [21, 29])

    # ── criterion 11 ──────────────────────────────────────────────────────────
    def test_ceilings(self):
        ceil = {'malachar': (100, 110, 106), 'abaddon': (105, 112, 108)}
        for v in VERSIONS:
            vel_max, cc_max, high_max = ceil[v]
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    self.assertLessEqual(n.velocity, 105 if name in COMMON else vel_max, f'{v} {name}')
                for value in (val for pts in track.cc.values() for _, val in pts):
                    self.assertLessEqual(value, cc_max, f'{v} {name}')
                if name in ('Choir High', 'Choir High 2', 'Choir Shout'):
                    self.assertLessEqual(max(val for _, val in track.cc[1]), high_max, f'{v} {name}')
        for n in self.track('malachar', 'Finger Cymbals').notes:
            self.assertLessEqual(n.velocity, 44)
        for n in self.track('abaddon', 'Cymbal').notes:
            self.assertLessEqual(n.velocity, 70)

    def test_bar_43_is_the_summit(self):
        for v in VERSIONS:
            low = self.track(v, 'Choir Low')
            peak = max(val for _, val in low.cc[1])
            self.assertEqual({bar_of(t) for t, val in low.cc[1] if val == peak}, {43}, f'{v} Choir Low CC1')
            for name in ('Timpani', 'Bass Drum'):
                notes = self.track(v, name).notes
                top = max(n.velocity for n in notes)
                self.assertEqual({bar_of(n.start) for n in notes if n.velocity == top}, {43}, f'{v} {name}')

    def test_sections_intensity(self):
        """B is the minimum of both tracks, and Abaddon sings louder than Malachar in every section."""
        means = {}
        for v in VERSIONS:
            for lead in ('Choir Low', 'Choir High'):
                track = self.track(v, lead)
                for label, first, last in SECTIONS:
                    vals = [cc_at(track, 1, n.start) for n in notes_between(track, first, last)]
                    if vals:
                        means[v, lead, label] = sum(vals) / len(vals)
        for v in VERSIONS:
            for lead in ('Choir Low', 'Choir High'):
                b = means[v, lead, 'B']
                for label, _, _ in SECTIONS:
                    if label != 'B' and (v, lead, label) in means:
                        self.assertLess(b, means[v, lead, label], f'{v} {lead} {label}')
        for (v, lead, label), value in means.items():
            if v == 'abaddon':
                self.assertGreater(value, means['malachar', lead, label], f'{lead} {label}')

    # ── criterion 12 ──────────────────────────────────────────────────────────
    def test_sonatina_cc1_and_note_lengths(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if is_sonatina(v, name) and 'Col Legno' not in name and 'Organ' not in name:
                    pts = track.cc.get(1)
                    self.assertTrue(pts, f'{v} {name}')
                    self.assertEqual(pts[0][0], 0.0, f'{v} {name}: CC1 at tick 0')
                limit = SONATINA_LIMIT_S.get(name)
                if limit:
                    for n in track.notes:
                        self.assertLessEqual(n.end - n.start, limit + 1e-6, f'{v} {name} at {n.start:.2f} s')
                        self.assertGreaterEqual(n.end - n.start, E8 - 0.03, f'{v} {name} at {n.start:.2f} s')

    def test_velocity_driven_sustains_have_cc11(self):
        for name in ('Organ 8', 'Organ 16', 'Organ Pedal', 'Didgeridoo'):
            track = self.track('malachar', name)
            self.assertTrue(track.cc.get(11), name)
            self.assertEqual(track.cc[11][0][0], 0.0)
            self.assertGreater(len({v for _, v in track.cc[11]}), 3, name)

    def test_cc_points_at_most_every_eighth(self):
        for v in VERSIONS:
            mid = self.mid[v]
            step = mid.ticks_per_beat // 2
            for tr in mid.tracks:
                t, last = 0, {}
                for m in tr:
                    t += m.time
                    if m.type == 'control_change':
                        if m.control in last:
                            self.assertGreaterEqual(t - last[m.control], step, f'{v} {tr.name}')
                        last[m.control] = t

    # ── criterion 13 ──────────────────────────────────────────────────────────
    def strikes(self, v, name, pitch=None):
        return sorted({bar_of(n.start) for n in self.track(v, name).notes if pitch is None or n.pitch == pitch})

    def test_struck_counts(self):
        self.assertEqual(self.strikes('malachar', 'Finger Cymbals'), [14, 16, 18, 38, 40, 42, 44])
        self.assertEqual(len(self.track('malachar', 'Finger Cymbals').notes), 7)
        for n in self.track('malachar', 'Finger Cymbals').notes:
            self.assertEqual(pos16(n.start), 14)
        self.assertEqual(self.strikes('malachar', 'Hand Bell'), [16, 20, 22, 24, 26])
        self.assertEqual(len(self.track('malachar', 'Hand Bell').notes), 5)
        bells = [4, 8, 12, 20, 24, 28, 40, 44, 48, 56]
        self.assertEqual(self.strikes('malachar', 'Pact Bells'), bells)
        by_bar = defaultdict(set)
        for n in self.track('malachar', 'Pact Bells').notes:
            by_bar[bar_of(n.start)].add((beat_of(n.start), n.pitch))
        for bar in bells:
            self.assertEqual(by_bar[bar], {(1.0, 61), (1.0, 62)}, f'pact bells bar {bar}')
        self.assertEqual(self.strikes('malachar', 'Gong', 61), [1, 5, 13, 21, 29, 49])
        self.assertEqual(self.strikes('malachar', 'Gong', 60), [37, 43])
        self.assertEqual(len(self.track('malachar', 'Gong').notes), 8)
        self.assertEqual(self.strikes('abaddon', 'Gong Full'), [1, 5, 13, 21, 29, 37, 43, 49])
        self.assertEqual(len(self.track('abaddon', 'Gong Full').notes), 8)
        self.assertEqual(self.strikes('abaddon', 'Cymbal'), [39, 41, 45])
        self.assertEqual(len(self.track('abaddon', 'Cymbal').notes), 3)
        for v in VERSIONS:
            for name in self.tracks(v):
                self.assertNotRegex(os.path.basename(compose.SFZ_OF[v][name]), r'(?i)crash|china', name)
            for name in ('Gong', 'Gong Full', 'Pact Bells', 'Hand Bell', 'Cymbal'):
                if name in EXPECTED[v]:
                    for n in self.track(v, name).notes:
                        self.assertEqual(beat_of(n.start), 1.0, f'{v} {name} on beat 1')

    # ── section textures of section 6 ─────────────────────────────────────────
    def test_section_textures(self):
        def bars(v, name):
            return {bar_of(n.start) for n in self.track(v, name).notes}
        chant = set(range(5, 13)) | set(range(29, 49))
        for v in VERSIONS:
            self.assertEqual(bars(v, 'Chant'), chant, v)
        self.assertEqual(bars('malachar', 'Darbuka'),
                         set(range(3, 21)) | set(range(29, 53)) | {55, 56})
        self.assertEqual(bars('malachar', 'Col Legno Vc'), set(range(5, 21)) | set(range(29, 36)) | set(range(37, 49)))
        covered = {b for n in self.track('malachar', 'Organ 8').notes
                   for b in range(bar_of(n.start), bar_of(n.end - 0.05) + 1)}
        self.assertEqual(covered, set(range(5, 21)) | set(range(29, 53)))
        self.assertEqual(bars('malachar', 'Contrabassoon') - set(range(21, 29)) - set(range(49, 53)), set())
        self.assertEqual(bars('malachar', 'Low Trem') - set(range(29, 49)), set())
        self.assertEqual(bars('abaddon', 'Violas Trem') - set(range(13, 21)), set())
        self.assertFalse(bars('abaddon', 'Celli Trem') & (set(range(5, 21))))
        self.assertEqual(bars('abaddon', 'Tom'), {4, 6, 8, 10, 12, 14, 16, 18, 20, *range(29, 37), 56})
        for n in self.track('malachar', 'Contrabassoon').notes:
            self.assertIn(n.pitch, (25, 32))

    # ── craft: expression, voice leading, development, loop ──────────────────
    def test_humanized_velocities_and_timing(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if len(track.notes) >= 6:
                    self.assertGreater(len({n.velocity for n in track.notes}), 2, f'{v} {name}')
            off_grid = [n for tr in self.tracks(v).values() for n in tr.notes
                        if abs((n.start / S16) - round(n.start / S16)) * S16 > 0.002]
            self.assertGreater(len(off_grid), 300, v)
            for tr in self.tracks(v).values():
                for n in tr.notes:
                    grid = round(n.start / S16) * S16
                    self.assertLessEqual(abs(n.start - grid), 0.0085, f'{v} {tr.name}')

    def test_legato_overlaps_in_the_voices(self):
        for v in VERSIONS:
            for name in ('Choir Low', 'Choir High'):
                notes = self.track(v, name).notes
                onsets = sorted({n.start for n in notes})
                for a in notes:
                    later = [t for t in onsets if t > a.start + TOL]
                    if not later:
                        continue
                    nxt = [b for b in notes if abs(b.start - later[0]) < 1e-6]
                    over = a.end - later[0]
                    if any(b.pitch == a.pitch for b in nxt):
                        self.assertLess(over, 0, f'{v} {name} repeated note at {later[0]:.2f} s')
                    elif over > 0:
                        self.assertTrue(0.0095 <= over <= 0.0305, f'{v} {name} {over * 1000:.1f} ms at {a.start:.2f}')
                legato = sum(1 for a in notes for b in notes if 0.0095 <= a.end - b.start <= 0.0305 and b.start > a.start)
                self.assertGreater(legato, 40, f'{v} {name}')

    def test_cc1_draws_the_phrases(self):
        for v in VERSIONS:
            for name in ('Choir Low', 'Choir High'):
                values = [val for _, val in self.track(v, name).cc[1]]
                self.assertGreater(len(set(values)), 20, f'{v} {name}')

    def test_no_parallel_fifths_or_octaves(self):
        for v in VERSIONS:
            grid = {}
            for name in VOICES[v]:
                grid[name] = [(round(n.start / E8), round(n.end / E8), n.pitch) for n in self.track(v, name).notes]

            def at(name, q):
                return sorted({p for s, e, p in grid[name] if s <= q < e})

            def leaving(name, q1, q2):
                return sorted({p for s, e, p in grid[name] if s <= q1 < e and e >= q2 - 1})

            def moves(x1, x2):
                return list(zip(x1, x2)) if len(x1) == len(x2) else [(p, min(x2, key=lambda q: abs(q - p))) for p in x1]

            def parallel(pa, qa, pb, qb):
                iv1, iv2 = abs(pa - pb) % 12, abs(qa - qb) % 12
                return (pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and iv1 == iv2 and iv1 in (0, 7)
                        and abs(qa - pa) <= 7 and abs(qb - pb) <= 7)

            found = []
            names = VOICES[v]
            for i, a in enumerate(names):
                for b in names[i:]:
                    if frozenset((a, b)) in DOUBLED:
                        continue
                    times = sorted({s for s, _, _ in grid[a]} | {s for s, _, _ in grid[b]})
                    for q1, q2 in zip(times, times[1:]):
                        A1, B1, A2, B2 = leaving(a, q1, q2), leaving(b, q1, q2), at(a, q2), at(b, q2)
                        if not (A1 and B1 and A2 and B2):
                            continue
                        ma, mb = moves(A1, A2), moves(B1, B2)
                        pairs = [(x, y) for i_, x in enumerate(ma) for y in ma[i_ + 1:]] if a == b else \
                            [(x, y) for x in ma for y in mb]
                        for (pa, qa), (pb, qb) in pairs:
                            if parallel(pa, qa, pb, qb):
                                found.append(f'{v} {a}/{b} bar {int(q1 * E8 // BAR_S) + 1}: {pa}->{qa} / {pb}->{qb}')
            self.assertFalse(found, found[:6])

    def test_organ_leading_tones_resolve(self):
        """Malachar's organ: the leading tone (B#) of a G#7 that goes to C#m rises to C#."""
        organ = self.track('malachar', 'Organ 8')
        for bar in (6, 16, 46):
            end = bar_start(bar + 1)
            held = [n for n in organ.notes if n.start < end - 0.1 and n.end >= end - 0.05 and n.pitch % 12 == 0]
            nxt = {m.pitch for m in organ.notes if abs(m.start - end) < 0.03}
            for n in held:
                self.assertIn(n.pitch + 1, nxt, f'B# of bar {bar} does not rise')

    def test_no_two_bar_phrase_repeated_more_than_twice(self):
        """Phrases (voices, organ, chant) count as repeated only with the same bass: a reharmonized
        or reorchestrated repetition is development."""
        phrase_tracks = ('Choir Low', 'Choir High', 'Choir High 2', 'Choir Shout', 'Horns Low', 'Organ 8', 'Chant')
        for v in VERSIONS:
            bass = self.track(v, 'Organ Pedal')
            for name in phrase_tracks:
                track = self.track(v, name)
                if track is None:
                    continue
                seen = defaultdict(list)
                for bar in range(1, BARS):
                    sig = tuple(sorted((round((n.start - bar_start(bar)) / S16), n.pitch,
                                        round((n.end - n.start) / S16)) for n in notes_between(track, bar, bar + 1)))
                    if len(sig) < 2:
                        continue
                    low = tuple(sorted((round((n.start - bar_start(bar)) / S16), n.pitch)
                                       for n in notes_between(bass, bar, bar + 1)))
                    seen[sig, low].append(bar)
                repeated = [bars for bars in seen.values() if len(bars) > 2]
                self.assertFalse(repeated, f'{v} {name} {repeated[:2]}')

    def test_loop_seam_leads_to_bar_1(self):
        for v in VERSIONS:
            high = self.track(v, 'Choir High')
            self.assertEqual([n.pitch for n in notes_between(high, 56, 56)], [74], 'the D5 cry of the bII')
            tp = self.track(v, 'Timpani')
            self.assertEqual([n.pitch for n in notes_between(tp, 56, 56)], [38])
            self.assertEqual([n.pitch for n in notes_between(tp, 1, 1)], [37])
            pedal = self.track(v, 'Organ Pedal')
            self.assertEqual([n.pitch for n in notes_between(pedal, 53, 56)], [37])
            self.assertEqual([n.pitch for n in notes_between(pedal, 1, 1)], [37])
        tom = notes_between(self.track('abaddon', 'Tom'), 56, 56)
        vels = [n.velocity for n in sorted(tom, key=lambda n: n.start)]
        self.assertEqual(len(vels), 8)
        self.assertGreater(vels[-1], vels[0] + 15, 'crescendo into bar 1')
        self.assertTrue(notes_between(self.track('malachar', 'Pact Bells'), 56, 56))
        self.assertTrue(notes_between(self.track('malachar', 'Gong'), 1, 1))
        self.assertTrue(notes_between(self.track('abaddon', 'Gong Full'), 1, 1))


if __name__ == '__main__':
    unittest.main()
