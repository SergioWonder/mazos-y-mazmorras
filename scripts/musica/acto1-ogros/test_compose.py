"""Acceptance tests for «El Asentamiento Ogro» (docs/musica/acto1-ogros.md, section 8, criteria 1-11,
plus the synchrony rules of section 2 and the craft rules of the orchestration brief).

They read the two generated MIDI files (exploration and combat) independently of the checks that
compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto1-ogros/test_compose.py
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

BPM = 132
BEAT_S = 60 / BPM
BAR_S = 4 * BEAT_S
BARS = 44
LOOP_S = BARS * BAR_S                     # 80.000 s
E8 = BEAT_S / 2
S16 = BEAT_S / 4
TOL = 0.012                               # seconds: humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

VSCO = 'VSCO-2-CE/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
VCSL = 'VCSL/'
FRAME = VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz'
FORGE = VCSL + 'Idiophones/Struck Idiophones/Brake Drum.sfz'
HARP = VCSL + 'Chordophones/Composite Chordophones/Concert Harp.sfz'
EXPECTED = {
    'explora': {
        'Trompa': VSCO + 'FHornSus.sfz', 'Clarinet Sus': VSCO + 'ClarinetSus.sfz',
        'Flute Sus': VSCO + 'FluteSusVib.sfz',
        'Recorder': VCSL + 'Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - SusVib.sfz',
        'Violins Sus': VSCO + 'ViolinEnsSusVib.sfz', 'Violins Sus Quiet': VSCO + 'ViolinEnsSusVib-Quiet.sfz',
        'Violas Sus': VSCO + 'ViolaEnsSusVib.sfz', 'Violas Sus Quiet': VSCO + 'ViolaEnsSusVib-Quiet.sfz',
        'Violas Trem': VSCO + 'ViolaEnsTrem.sfz',
        'Cellos Sus': VSCO + 'CelloEnsSusVib.sfz', 'Cellos Sus Quiet': VSCO + 'CelloEnsSusVib-Quiet.sfz',
        'Cellos Pizz': VSCO + 'CelloEnsPizz.sfz',
        'Basses Sus': VSCO + 'ContrabassSusVB.sfz', 'Basses Sus Quiet': VSCO + 'ContrabassSusVB-Quiet.sfz',
        'Basses Pizz': VSCO + 'ContrabassPizz.sfz', 'Harp': HARP,
        'Timpani': VSCO + 'Timpani.sfz', 'Timpani Roll': VSCO + 'TimpaniRolls.sfz',
        'Frame Drum': FRAME, 'Forge': FORGE,
    },
    'combate': {
        'Horns Marc': SSO + 'Brass - Performance/Horns Marcato.sfz',
        'Horns Sus': SSO + 'Brass - Performance/Horns Sustain.sfz',
        'Trombones Marc': SSO + 'Brass - Performance/Trombones Marcato.sfz',
        'Trombones Sus': SSO + 'Brass - Performance/Trombones Sustain (looped).sfz',
        'Violins Marc': SSO + 'Strings - Performance/1st Violins Marcato.sfz',
        'Violins Sus': VSCO + 'ViolinEnsSusVib.sfz', 'Violins Trem': VSCO + 'ViolinEnsTrem.sfz',
        'Violas Spic': VSCO + 'ViolaEnsSpic.sfz', 'Violas Trem': VSCO + 'ViolaEnsTrem.sfz',
        'Cellos Spic': VSCO + 'CelloEnsSpic.sfz', 'Basses Spic': VSCO + 'ContrabassSpic.sfz',
        'Basses Pizz': VSCO + 'ContrabassPizz.sfz', 'Harp': HARP,
        'Timpani': VSCO + 'Timpani.sfz', 'Timpani Roll': VSCO + 'TimpaniRolls.sfz',
        'Bass Drum': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
        'Bass Drum Roll': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
        'Frame Drum': FRAME, 'Tom': VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz',
        'Forge': FORGE, 'Cymbal': VCSL + 'Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz',
    },
}
UNPITCHED = {'Frame Drum', 'Forge', 'Bass Drum', 'Bass Drum Roll', 'Tom', 'Cymbal'}
SECTIONS = [('Intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 28), ('Bridge', 29, 32),
            ('Return', 33, 40), ('Codetta', 41, 44)]
LAYERS = {'explora': [6, 7, 8, 6, 8, 9, 6], 'combate': [9, 11, 11, 9, 11, 12, 9]}

# ── reference melody of section 5 (identical in both versions) ───────────────
# (bar, beat, pitch); beat 1.5 = the eighth after beat 1.
MOTIF_BEATS = [(0, 1), (0, 2), (0, 3), (0, 3.5), (0, 4), (1, 1), (1, 1.5), (1, 2), (1, 3)]


def motif(bar, pitches):
    return [(bar + off, beat, p) for (off, beat), p in zip(MOTIF_BEATS, pitches)]


def line(bar, items):
    """items: [(pitch, beats)] from beat 1 of `bar`."""
    out, pos = [], 0.0
    for p, beats in items:
        out.append((bar + int(pos // 4), 1 + pos % 4, p))
        pos += beats
    return out


HEAD = [64, 71, 72, 71, 67, 69, 67, 66, 64]
SEQ = [69, 76, 77, 76, 72, 74, 72, 71, 69]
REFERENCE = {
    'head 2-4': line(2, [(52, 2), (59, 2), (60, 4), (59, 2)]),
    'motif 5-6': motif(5, HEAD),
    'sequence 7-8': motif(7, SEQ),
    'consequent 9-12': line(9, [(76, 2), (74, 1), (72, 1), (71, 1), (69, 1), (66, 2),
                                (67, 1), (69, 1), (71, 1), (72, 1), (72, 2), (71, 2)]),
    'motif 13-14': motif(13, HEAD),
    'sequence 15-16': motif(15, SEQ),
    'consequent 17-20': line(17, [(76, 2), (78, 1), (79, 1), (81, 2), (79, 1), (78, 1),
                                  (76, 1), (74, 1), (72, 2), (74, 4)]),
    'augmentation 21-24': line(21, [(67, 2), (74, 2), (76, 1), (74, 1), (71, 2),
                                    (72, 1), (71, 1), (69, 2), (67, 4)]),
    'consequent 25-28': line(25, [(76, 2), (74, 2), (78, 2), (76, 1), (72, 1),
                                  (70, 2), (67, 2), (69, 2), (66, 2)]),
    'fragment 29-32': line(29, [(64, 1), (71, 1), (72, 2), (66, 1), (73, 1), (74, 2),
                                (67, 1), (74, 1), (76, 2), (69, 1), (76, 1), (75, 2)]),
    'motif 33-34': motif(33, HEAD),
    'sequence 35-36': motif(35, SEQ),
    'climax 37-41': line(37, [(83, 2), (81, 1), (79, 1), (78, 2), (76, 1), (74, 1),
                              (81, 2), (79, 2), (78, 4), (76, 4)]),
    'echo 42': line(42, [(64, 1), (71, 3)]),
}
# Who carries each window: (first bar, last bar, lead track, [(doubling track, semitones)]).
MELODY = {
    'explora': [(2, 4, 'Trompa', []), (5, 6, 'Trompa', []), (7, 12, 'Clarinet Sus', []),
                (13, 20, 'Violins Sus', []), (21, 28, 'Recorder', []), (29, 32, 'Violins Sus', []),
                (33, 34, 'Trompa', [('Cellos Sus', 0)]), (35, 36, 'Clarinet Sus', [('Violas Sus', 0)]),
                (37, 40, 'Violins Sus', [('Flute Sus', 0)]), (41, 41, 'Violins Sus Quiet', []),
                (42, 42, 'Trompa', [])],
    'combate': [(2, 4, 'Horns Marc', [('Trombones Marc', -12)]), (5, 6, 'Horns Marc', [('Trombones Marc', -12)]),
                (7, 8, 'Violins Marc', [('Horns Marc', -12)]), (9, 20, 'Violins Sus', []),
                (21, 24, 'Horns Sus', []), (25, 28, 'Violins Sus', []),
                (29, 32, 'Violins Marc', [('Horns Marc', -12)]),
                (33, 34, 'Horns Marc', [('Trombones Marc', -12)]),
                (35, 36, 'Violins Marc', [('Horns Marc', -12)]),
                (37, 41, 'Violins Sus', [('Horns Sus', -12)]), (42, 42, 'Horns Marc', [])],
}

# Registers of section 6 per track and bar range; deviations documented in compose.py:
# D#3 (51) of the brief's own A' countermelody; A4 (69) of its own B countermelody; E4 (64) held
# by the A' violas in bars 13-15; F#3 (54) in the bridge's held line (no 5ths with
# the bass C-D-E); the Am7 - Am7/E - Em/G walk of bar 39 (E1/E2 in the bass, no octaves with A5-G5).
REGISTERS = {
    'explora': {
        'Trompa': [(2, 4, 52, 60), (5, 6, 64, 72), (13, 20, 51, 67), (29, 32, 54, 59), (33, 34, 64, 72),
                   (37, 41, 57, 69), (42, 42, 64, 71)],
        'Clarinet Sus': [(7, 12, 66, 77), (25, 28, 62, 69), (35, 36, 69, 77)],
        'Recorder': [(21, 28, 66, 78)], 'Flute Sus': [(37, 40, 74, 83)],
        'Violins Sus': [(13, 16, 64, 77), (17, 20, 72, 81), (29, 32, 64, 76), (33, 36, 76, 81), (37, 40, 74, 83)],
        'Violins Sus Quiet': [(41, 41, 76, 76)],
        'Violas Sus Quiet': [(1, 4, 52, 59), (5, 12, 52, 64), (13, 15, 48, 64), (16, 20, 48, 62), (41, 44, 52, 59)],
        'Violas Sus': [(35, 36, 69, 77), (37, 40, 52, 64)], 'Violas Trem': [(29, 32, 52, 64)],
        'Cellos Sus Quiet': [(1, 4, 40, 47), (5, 20, 36, 52), (21, 28, 36, 50), (41, 44, 40, 47)],
        'Cellos Sus': [(29, 32, 47, 52), (33, 34, 64, 72), (37, 40, 36, 50)],
        'Cellos Pizz': [(13, 20, 43, 55)],
        'Basses Sus Quiet': [(1, 4, 28, 35), (41, 44, 28, 35)],
        'Basses Sus': [(29, 32, 35, 40), (33, 40, 27, 40)],
        'Basses Pizz': [(5, 20, 28, 40), (21, 28, 27, 38), (29, 32, 35, 40), (33, 40, 28, 40)],
        'Harp': [(21, 28, 31, 64)],
        'Timpani': [(8, 8, 45, 45), (12, 12, 47, 47), (16, 16, 45, 45), (20, 20, 38, 38), (33, 33, 40, 40),
                    (37, 37, 36, 36), (40, 40, 47, 47)],
        'Timpani Roll': [(31, 31, 40, 40), (32, 32, 47, 47)],
    },
    'combate': {
        'Horns Marc': [(2, 4, 52, 60), (5, 6, 64, 72), (7, 8, 57, 65), (29, 32, 52, 64), (33, 34, 64, 72),
                       (35, 36, 57, 65), (42, 42, 64, 71)],
        'Trombones Marc': [(2, 4, 40, 48), (5, 6, 52, 60), (13, 20, 40, 60), (33, 34, 52, 60)],
        'Violins Marc': [(7, 8, 69, 77), (29, 32, 64, 76), (35, 36, 69, 77)],
        'Violins Sus': [(9, 12, 66, 76), (13, 20, 64, 81), (25, 28, 66, 78), (37, 41, 74, 83)],
        'Horns Sus': [(13, 20, 51, 67), (21, 24, 67, 76), (25, 28, 62, 69), (37, 41, 62, 71)],
        'Trombones Sus': [(29, 32, 54, 59), (37, 41, 45, 57), (43, 44, 52, 59)],
        'Violins Trem': [(33, 36, 76, 81)],
        'Cellos Spic': [(1, 4, 40, 59), (5, 20, 36, 52), (21, 28, 36, 52), (29, 40, 36, 52), (41, 44, 40, 59)],
        'Basses Spic': [(3, 4, 28, 40), (5, 20, 28, 40), (29, 40, 28, 40), (41, 42, 28, 40)],
        'Violas Spic': [(5, 12, 52, 64), (13, 20, 52, 62), (33, 40, 52, 64)],
        'Violas Trem': [(3, 4, 52, 59), (21, 28, 55, 64), (29, 32, 52, 64)],
        'Basses Pizz': [(5, 20, 28, 40), (21, 28, 27, 38), (29, 32, 35, 40), (33, 40, 28, 40)],
        'Harp': [(21, 28, 31, 64)],
        'Timpani': [(5, 12, 40, 48), (13, 20, 38, 48), (21, 28, 43, 48), (33, 40, 36, 48)],
        'Timpani Roll': [(31, 31, 40, 40), (32, 32, 47, 47)],
    },
}
# Sonatina: dynamics on CC1 and the longest note each patch can hold (seconds; None = looped).
SONATINA_MAX = {'Horns Marc': 2.8, 'Horns Sus': 2.8, 'Trombones Marc': 2.2, 'Violins Marc': 3.5,
                'Trombones Sus': None}
# Bass of section 4 (pitch classes) per bar and beat for the common pizzicato.
PIZZ_BASS = {
    5: 'E E', 6: 'A E', 7: 'A F', 8: 'D A', 9: 'C C', 10: 'A D', 11: 'G C', 12: 'F# B',
    13: 'E C', 14: 'A C', 15: 'F D', 16: 'B A', 17: 'C C', 18: 'A E', 19: 'C A', 20: 'D D',
    21: 'G', 22: 'E', 23: 'A', 24: 'G', 25: 'C', 26: 'D', 27: 'Eb', 28: 'B',
    29: 'C C', 30: 'D D', 31: 'E D', 32: 'C B', 33: 'E C', 34: 'A E', 35: 'A F', 36: 'B A',
    37: 'C C', 38: 'D D', 39: 'A E', 40: 'B B',
}
PC = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'A': 9, 'B': 11}


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def beat_of(t):
    """Position inside the bar in beats (1-based), rounded to the eighth."""
    return 1 + round(((t + TOL) % BAR_S - TOL) / E8) / 2


def notes_between(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi]


def is_sonatina(version, name):
    return EXPECTED[version][name].startswith('sso/')


def cc_at(track, ctrl, t):
    pts = track.cc.get(ctrl, [])
    value = None
    for time, v in pts:
        if time <= t + 1e-6:
            value = v
    return value


def level(version, track, note):
    """Dynamic level on the velocity scale: velocity, or CC1 - 15 for Sonatina (section 7 tables)."""
    if is_sonatina(version, track.name):
        return cc_at(track, 1, note.start) - 15
    return note.velocity


def raw_ticks(path):
    """Per track: [(pitch, on tick, off tick, velocity)] read straight from the file."""
    mid = mido.MidiFile(path)
    out = {}
    for tr in mid.tracks:
        name = next(m.name for m in tr if m.type == 'track_name')
        t, open_, notes = 0, {}, []
        for m in tr:
            t += m.time
            if m.type == 'note_on' and m.velocity > 0:
                open_.setdefault(m.note, []).append((t, m.velocity))
            elif m.type in ('note_on', 'note_off'):
                on, vel = open_[m.note].pop(0)
                notes.append((m.note, on, t, vel))
        out[name] = sorted(notes, key=lambda n: (n[1], n[0]))
    return out


class OgrosScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        out = tempfile.mkdtemp()
        cls.paths = compose.write_midis(out)
        cls.mid = {v: mido.MidiFile(cls.paths[v]) for v in VERSIONS}
        cls.song = {v: midi_io.load(cls.paths[v]) for v in VERSIONS}

    def tracks(self, v):
        return self.song[v].tracks

    # ── structure ─────────────────────────────────────────────────────────────
    def test_output_paths(self):
        for v in VERSIONS:
            self.assertEqual(os.path.basename(self.paths[v]), f'acto1-ogros-{v}.mid')
            self.assertEqual(os.path.basename(compose.OUT[v]), f'acto1-ogros-{v}.mid')

    def test_one_named_track_per_instrument_and_articulation(self):
        for v in VERSIONS:
            names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid[v].tracks]
            self.assertEqual(len(names), len(set(names)), v)
            self.assertEqual(set(names), set(EXPECTED[v]), v)
            for name, rel in EXPECTED[v].items():
                self.assertEqual(compose.SFZ_OF[v][name], library(*rel.split('/', 1)), name)
                self.assertTrue(os.path.exists(compose.SFZ_OF[v][name]), rel)
                self.assertNotIn('KS', os.path.basename(rel), rel)

    # ── criterion 1 ───────────────────────────────────────────────────────────
    def test_tempo_meter_and_length(self):
        lengths = set()
        for v in VERSIONS:
            mid = self.mid[v]
            tempos = [(i, m) for i, tr in enumerate(mid.tracks) for m in tr if m.type == 'set_tempo']
            sigs = [m for tr in mid.tracks for m in tr if m.type == 'time_signature']
            self.assertEqual(len(tempos), 1, v)
            self.assertEqual(tempos[0][0], 0, 'tempo in the first track')
            self.assertAlmostEqual(mido.tempo2bpm(tempos[0][1].tempo), BPM, places=2)
            self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(4, 4)])
            for tr in mid.tracks:
                self.assertEqual(sum(m.time for m in tr), BARS * 4 * mid.ticks_per_beat, v)
            lengths.add((mid.ticks_per_beat, BARS * 4 * mid.ticks_per_beat))
        self.assertEqual(len(lengths), 1, 'both versions share resolution and length')

    def test_notes_inside_the_loop(self):
        for v in VERSIONS:
            for track in self.tracks(v).values():
                for n in track.notes:
                    self.assertGreaterEqual(n.start, 0.0)
                    self.assertLess(n.start, LOOP_S, f'{v} {track.name}')
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

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
                if name in UNPITCHED:
                    continue
                spans = REGISTERS[v][name]
                for n in track.notes:
                    b = bar_of(n.start)
                    ok = [lo <= n.pitch <= hi for first, last, lo, hi in spans if first <= b <= last]
                    self.assertTrue(ok, f'{v} {name} bar {b} has no register entry')
                    self.assertTrue(all(ok), f'{v} {name} bar {b} pitch {n.pitch}')

    def test_ceilings(self):
        motif_bars = {2, 3, 4, 5, 6, 33, 34, 42}
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    if 'Violin' in name:
                        self.assertLessEqual(n.pitch, 83, name)
                    if name in ('Trompa', 'Horns Marc', 'Horns Sus'):
                        self.assertLessEqual(n.pitch, 77, name)
                    if name == 'Horns Marc' and bar_of(n.start) in motif_bars:
                        self.assertLessEqual(n.pitch, 72, name)
                    if name == 'Recorder':
                        self.assertTrue(65 <= n.pitch <= 78, n.pitch)
                    if name == 'Clarinet Sus':
                        self.assertLessEqual(n.pitch, 77)
        top = max(n.pitch for v in VERSIONS for name, tr in self.tracks(v).items()
                  if name not in UNPITCHED for n in tr.notes)
        self.assertEqual(top, 83, 'B5 is the highest note')
        for v in VERSIONS:
            b5 = [bar_of(n.start) for name, tr in self.tracks(v).items() if name not in UNPITCHED
                  for n in tr.notes if n.pitch == 83]
            self.assertEqual(set(b5), {37}, v)

    # ── criterion 3 and synchrony rule 2 ──────────────────────────────────────
    def melody_of(self, v, first, last):
        got = []
        for f, l, lead, _ in MELODY[v]:
            for b in range(max(f, first), min(l, last) + 1):
                got += [(bar_of(n.start), beat_of(n.start), n.pitch)
                        for n in notes_between(self.tracks(v)[lead], b, b)]
        return sorted(got)

    def test_reference_melody_in_both_versions(self):
        for label, ref in REFERENCE.items():
            first, last = ref[0][0], ref[-1][0]
            for v in VERSIONS:
                self.assertEqual(self.melody_of(v, first, last), sorted(ref), f'{v} {label}')

    def test_declared_doublings_follow_the_melody(self):
        for v in VERSIONS:
            for first, last, lead, doublings in MELODY[v]:
                ref = [(b, bt, p) for r in REFERENCE.values() for b, bt, p in r if first <= b <= last]
                for name, shift in doublings:
                    got = sorted((bar_of(n.start), beat_of(n.start), n.pitch)
                                 for n in notes_between(self.tracks(v)[name], first, last))
                    want = sorted((b, bt, p + shift) for b, bt, p in ref)
                    self.assertEqual(got, want, f'{v} {name} bars {first}-{last}')

    # ── criterion 4 and synchrony rule 3 ──────────────────────────────────────
    def test_common_layers_identical(self):
        raw = {v: raw_ticks(self.paths[v]) for v in VERSIONS}
        for name in ('Basses Pizz', 'Harp'):
            self.assertTrue(raw['explora'][name])
            self.assertEqual(raw['explora'][name], raw['combate'][name], name)

    def test_common_pizz_pattern(self):
        track = self.tracks('explora')['Basses Pizz']
        by_bar = defaultdict(list)
        for n in track.notes:
            by_bar[bar_of(n.start)].append(n)
        for bar in list(range(1, 5)) + list(range(41, 45)):
            self.assertFalse(by_bar.get(bar), f'pizz in bar {bar}')
        for bar, spec in PIZZ_BASS.items():
            notes = sorted(by_bar[bar], key=lambda n: n.start)
            beats = [beat_of(n.start) for n in notes]
            want = [1, 3] if len(spec.split()) == 2 else [1]
            self.assertEqual(beats, want, f'bar {bar}')
            self.assertEqual([n.pitch % 12 for n in notes], [PC[s] for s in spec.split()], f'bar {bar}')

    def test_harp_only_in_b_and_below_e4(self):
        for n in self.tracks('explora')['Harp'].notes:
            self.assertTrue(21 <= bar_of(n.start) <= 28)
            self.assertLessEqual(n.pitch, 64)

    # ── criterion 5 ───────────────────────────────────────────────────────────
    def test_figures(self):
        allowed = {'explora': {'Timpani Roll'},
                   'combate': {'Cellos Spic', 'Frame Drum', 'Tom', 'Timpani Roll', 'Bass Drum Roll'}}
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in allowed[v]:
                    continue
                onsets = sorted({round(n.start, 3) for n in track.notes})
                for a, b in zip(onsets, onsets[1:]):
                    self.assertGreaterEqual(b - a, E8 - 2 * TOL, f'{v} {name} at {a:.2f} s')
                for n in track.notes:
                    self.assertGreaterEqual(n.end - n.start, E8 - 0.045, f'{v} {name} at {n.start:.2f} s')
        for name in ('Violins Sus', 'Violins Marc', 'Violins Trem', 'Horns Marc', 'Horns Sus',
                     'Trombones Marc', 'Trombones Sus'):
            for n in self.tracks('combate')[name].notes:
                self.assertGreaterEqual(n.end - n.start, E8 - 0.045, name)

    # ── criterion 6 ───────────────────────────────────────────────────────────
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

    # ── criterion 7 ───────────────────────────────────────────────────────────
    def test_no_register_clash_with_the_melody(self):
        for v in VERSIONS:
            tr = self.tracks(v)
            for first, last, lead, doublings in MELODY[v]:
                skip = {lead} | {d for d, _ in doublings} | UNPITCHED
                mel = notes_between(tr[lead], first, last)
                for name, track in tr.items():
                    if name in skip:
                        continue
                    for o in track.notes:
                        if o.end - o.start < BEAT_S - 0.04:
                            continue
                        for m in mel:
                            if min(m.end, o.end) - max(m.start, o.start) <= 0.04:
                                continue
                            if abs(m.pitch - o.pitch) > 11:
                                continue
                            lo, lm = level(v, track, o), level(v, tr[lead], m)
                            if v == 'explora' and name == 'Clarinet Sus' and lead == 'Recorder':
                                self.assertLessEqual(lo, lm - 10, f'clarinet at {o.start:.2f} s')
                            else:
                                self.assertLess(lo, lm, f'{v} {name} {o.pitch} v{lo} vs {lead} '
                                                        f'{m.pitch} v{lm} at bar {bar_of(o.start)}')

    # ── criterion 8 ───────────────────────────────────────────────────────────
    def test_no_ff(self):
        for v in VERSIONS:
            for track in self.tracks(v).values():
                for n in track.notes:
                    self.assertLessEqual(n.velocity, 105, track.name)
                for value in (val for pts in track.cc.values() for _, val in pts):
                    self.assertLessEqual(value, 112, track.name)

    def test_climax_in_bar_37(self):
        families = {
            'explora': [('Violins Sus', 'Violins Sus Quiet'), ('Trompa',), ('Timpani', 'Timpani Roll')],
            'combate': [('Violins Sus', 'Violins Trem', 'Violins Marc'), ('Horns Marc', 'Horns Sus'),
                        ('Timpani', 'Timpani Roll')],
        }
        for v in VERSIONS:
            for family in families[v]:
                notes = [(level(v, self.tracks(v)[f], n), n) for f in family for n in self.tracks(v)[f].notes]
                top = max(lv for lv, _ in notes)
                self.assertEqual({bar_of(n.start) for lv, n in notes if lv == top}, {37}, f'{v} {family}')
                sonatina = [f for f in family if is_sonatina(v, f)]
                if sonatina and any(bar_of(n.start) == 37 for f in sonatina for n in self.tracks(v)[f].notes):
                    pts = [(t, val) for f in sonatina for t, val in self.tracks(v)[f].cc[1]]
                    peak = max(val for _, val in pts)
                    self.assertEqual({bar_of(t) for t, val in pts if val == peak}, {37}, f'{v} CC1 {family}')

    # ── criterion 9 ───────────────────────────────────────────────────────────
    def test_sonatina_cc1_and_note_lengths(self):
        tracks = self.tracks('combate')
        for name, longest in SONATINA_MAX.items():
            track = tracks[name]
            pts = track.cc.get(1)
            self.assertTrue(pts, name)
            self.assertEqual(pts[0][0], 0.0, f'{name}: CC1 at tick 0')
            self.assertLess(pts[0][0], track.notes[0].start)
            if longest:
                for n in track.notes:
                    self.assertLessEqual(n.end - n.start, longest, f'{name} at {n.start:.2f} s')

    def test_cc_points_at_most_every_eighth_of_a_bar(self):
        for v in VERSIONS:
            mid = self.mid[v]
            step = mid.ticks_per_beat * 4 // 8
            for tr in mid.tracks:
                t, last = 0, {}
                for m in tr:
                    t += m.time
                    if m.type == 'control_change':
                        if m.control in last:
                            self.assertGreaterEqual(t - last[m.control], step, f'{v} {tr.name}')
                        last[m.control] = t

    def test_sustained_vsco_tracks_have_cc11(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                rel = EXPECTED[v][name]
                if rel.startswith(VSCO) and ('Sus' in rel or 'Trem' in rel or 'Rolls' in rel):
                    self.assertTrue(track.cc.get(11), f'{v} {name}')
                    self.assertEqual(track.cc[11][0][0], 0.0)

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_ostinato_accents_and_runs(self):
        track = self.tracks('combate')['Cellos Spic']
        by_bar = defaultdict(list)
        for n in track.notes:
            by_bar[bar_of(n.start)].append(n)
        sixteenth_bars = 0
        for bar, notes in by_bar.items():
            pos = {round((n.start - bar_start(bar)) / S16): n.velocity for n in notes}
            if len(notes) == 16:
                sixteenth_bars += 1
                accents = {0, 3, 6, 8, 11, 14}
                self.assertEqual(set(pos), set(range(16)), bar)
                self.assertGreater(min(pos[p] for p in accents),
                                   max(pos[p] for p in pos if p not in accents), f'bar {bar}')
            else:
                self.assertTrue(21 <= bar <= 28, f'bar {bar} is not in sixteenths')
                self.assertEqual(set(pos), set(range(0, 16, 2)), bar)
                acc = {0, 6, 12}
                self.assertGreater(min(pos[p] for p in acc), max(pos[p] for p in pos if p not in acc), bar)
        self.assertEqual(sixteenth_bars, 44 - 8)
        notes = sorted((n for n in track.notes if not 21 <= bar_of(n.start) <= 28), key=lambda n: n.start)
        run = 1
        for a, b in zip(notes, notes[1:]):
            same = a.pitch == b.pitch and abs(a.velocity - b.velocity) <= 3 and b.start - a.start < S16 + TOL
            run = run + 1 if same else 1
            self.assertLessEqual(run, 3, f'run at {b.start:.2f} s')

    def test_bass_spiccato_only_on_accents(self):
        for n in self.tracks('combate')['Basses Spic'].notes:
            bar = bar_of(n.start)
            self.assertFalse(21 <= bar <= 28 or bar in (1, 2, 43, 44), bar)
            self.assertIn(round((n.start - bar_start(bar)) / S16), {0, 3, 6, 8, 11, 14})

    # ── criterion 11 ──────────────────────────────────────────────────────────
    def test_forge_frame_drum_and_cymbal(self):
        for v, most in (('explora', 3), ('combate', 8)):
            forge = self.tracks(v)['Forge'].notes
            self.assertLessEqual(len(forge), most, v)
            for n in forge:
                self.assertLessEqual(n.velocity, 85 if bar_of(n.start) == 37 else 70)
            for n in self.tracks(v)['Frame Drum'].notes:
                self.assertNotIn(n.pitch, (60, 63))
        for n in self.tracks('explora')['Forge'].notes:
            self.assertTrue(30 <= n.velocity <= 40 and n.pitch == 63)
        self.assertNotIn('Cymbal', self.tracks('explora'))
        for n in self.tracks('combate')['Cymbal'].notes:
            if n.pitch == 64:
                self.assertIn(bar_of(n.start), (31, 32))
                self.assertAlmostEqual(n.end, bar_start(33), delta=0.03)
            else:
                self.assertEqual(n.pitch, 66)
                self.assertIn((bar_of(n.start), beat_of(n.start)), [(33, 1), (37, 1)])
                self.assertLessEqual(n.velocity, 80)

    def test_no_bass_drum_in_b(self):
        for name in ('Bass Drum', 'Bass Drum Roll', 'Basses Spic'):
            self.assertFalse([n for n in self.tracks('combate')[name].notes if 21 <= bar_of(n.start) <= 28])

    # ── craft: expression, voice leading, development, loop ──────────────────
    def test_humanized_velocities_and_timing(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if len(track.notes) >= 6:
                    self.assertGreater(len({n.velocity for n in track.notes}), 2, f'{v} {name}')
            off_grid = [n for tr in self.tracks(v).values() for n in tr.notes
                        if abs((n.start / S16) - round(n.start / S16)) * S16 > 0.002]
            self.assertGreater(len(off_grid), 100, v)

    def test_legato_overlaps(self):
        for v in VERSIONS:
            for first, last, lead, _ in MELODY[v]:
                if is_sonatina(v, lead) and 'Marc' in lead:
                    continue
                notes = notes_between(self.tracks(v)[lead], first, last)
                for a, b in zip(notes, notes[1:]):
                    over = a.end - b.start
                    if a.pitch == b.pitch:
                        self.assertLess(over, 0, f'{v} {lead} repeated note at {b.start:.2f} s')
                    elif over > 0:
                        self.assertTrue(0.0095 <= over <= 0.0305, f'{v} {lead} {over * 1000:.1f} ms')

    def test_no_parallel_fifths_or_octaves(self):
        sustained = {'explora': ['Trompa', 'Clarinet Sus', 'Flute Sus', 'Recorder', 'Violins Sus',
                                 'Violins Sus Quiet', 'Violas Sus', 'Violas Sus Quiet', 'Violas Trem',
                                 'Cellos Sus', 'Cellos Sus Quiet', 'Basses Sus', 'Basses Sus Quiet'],
                     'combate': ['Horns Sus', 'Trombones Sus', 'Violins Sus', 'Violins Trem',
                                 'Violas Trem', 'Violins Marc', 'Horns Marc', 'Trombones Marc']}
        doubled = {frozenset(p) for p in [('Cellos Sus', 'Basses Sus'), ('Cellos Sus Quiet', 'Basses Sus Quiet'),
                                          ('Trompa', 'Cellos Sus'), ('Clarinet Sus', 'Violas Sus'),
                                          ('Violins Sus', 'Flute Sus'), ('Horns Marc', 'Trombones Marc'),
                                          ('Violins Marc', 'Horns Marc'), ('Violins Sus', 'Horns Sus')]}
        for v in VERSIONS:
            grid = {}
            for name in sustained[v]:
                grid[name] = [(round(n.start / E8), round(n.end / E8), n.pitch)
                              for n in self.tracks(v)[name].notes]

            def at(name, q):
                return sorted({p for s, e, p in grid[name] if s <= q < e})

            def leaving(name, q1, q2):
                """Notes at q1 still connected to q2 (a rest longer than an eighth breaks the voice)."""
                return sorted({p for s, e, p in grid[name] if s <= q1 < e and e >= q2 - 1})

            names = sustained[v]
            found = []
            for i, a in enumerate(names):
                for b in names[i + 1:]:
                    if frozenset((a, b)) in doubled:
                        continue
                    times = sorted({s for s, _, _ in grid[a]} | {s for s, _, _ in grid[b]})
                    for q1, q2 in zip(times, times[1:]):
                        A1, B1, A2, B2 = leaving(a, q1, q2), leaving(b, q1, q2), at(a, q2), at(b, q2)
                        if not (A1 and B1 and A2 and B2):
                            continue
                        # voices of a divisi keep their order; otherwise each goes to the nearest note
                        moves_a = list(zip(A1, A2)) if len(A1) == len(A2) else \
                            [(p, min(A2, key=lambda x: abs(x - p))) for p in A1]
                        moves_b = list(zip(B1, B2)) if len(B1) == len(B2) else \
                            [(p, min(B2, key=lambda x: abs(x - p))) for p in B1]
                        for pa, qa in moves_a:
                            for pb, qb in moves_b:
                                iv1, iv2 = abs(pa - pb) % 12, abs(qa - qb) % 12
                                if (pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and iv1 == iv2
                                        and iv1 in (0, 7) and abs(qa - pa) <= 7 and abs(qb - pb) <= 7):
                                    found.append(f'{v} {a}/{b} at {q1 * E8:.2f} s')
            self.assertFalse(found, found[:5])

    def test_no_two_bar_phrase_repeated_more_than_twice(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in UNPITCHED:
                    continue
                seen = defaultdict(list)
                for bar in range(1, BARS):
                    sig = tuple(sorted((round((n.start - bar_start(bar)) / S16), n.pitch,
                                        round((n.end - n.start) / S16)) for n in notes_between(track, bar, bar + 1)))
                    if len(sig) >= 2:
                        seen[sig].append(bar)
                repeated = [bars for bars in seen.values() if len(bars) > 2]
                self.assertFalse(repeated, f'{v} {name} {repeated[:2]}')

    def test_loop_seam_dominant_leads_to_bar_1(self):
        for v, name in (('explora', 'Basses Sus Quiet'), ('combate', 'Cellos Spic')):
            tr = self.tracks(v)[name]
            last = [n.pitch % 12 for n in notes_between(tr, 44, 44)]
            first = [n.pitch % 12 for n in notes_between(tr, 1, 1)]
            self.assertTrue(last and set(last) <= {11, 6}, f'{v}: bar 44 on B')
            self.assertEqual(set(first), {4}, f'{v}: bar 1 on E')
        horn = self.tracks('combate')['Horns Marc']
        self.assertTrue(notes_between(horn, 42, 42) and not notes_between(horn, 43, 44))


if __name__ == '__main__':
    unittest.main()
