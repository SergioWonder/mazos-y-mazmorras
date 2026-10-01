"""Acceptance tests for Vol'guth's boss theme «Misa de la filacteria»
(docs/musica/acto2-volguth.md, section 8, score criteria 1-12, plus the craft rules of the studio).

They read the generated MIDI independently of the checks that compose.py prints.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto2-volguth/test_compose.py
"""
import os
import sys
import tempfile
import unittest

import mido

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import compose  # noqa: E402
from estudio import midi_io, sfz  # noqa: E402
from estudio.config import library  # noqa: E402

BPM = 144
BAR_S = 4 * 60 / BPM            # 1.6667 s
EIGHTH_S = BAR_S / 8
QUARTER_S = BAR_S / 4
LOOP_S = 56 * BAR_S             # 93.333 s
TOL = 0.012                     # humanization is +-8 ms

SSO = 'sso/Sonatina Symphonic Orchestra/'
BRASS, ORGAN = SSO + 'Brass - Performance/', SSO + 'Organ/'
VCSL_ID, VCSL_MEM = 'VCSL/Idiophones/Struck Idiophones/', 'VCSL/Membranophones/Struck Membranophones/'
EXPECTED_TRACKS = {
    'Choir': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Choir Whisper': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Organ Pedal': ORGAN + 'Pedal - Bourdon 16ft.sfz',
    'Organ Violon': ORGAN + 'Pedal - Violon 16ft.sfz',
    'Organ 8': ORGAN + 'Great - Open Diapason 8ft.sfz',
    'Organ Stopped': ORGAN + 'Great - Stopped Diapason 8ft.sfz',
    'Organ Gedact': ORGAN + 'Swell - Gedact 8ft.sfz',
    'Horns Marc': BRASS + 'Horns Marcato.sfz',
    'Horns': BRASS + 'Horns Sustain.sfz',
    'Trombones Marc': BRASS + 'Trombones Marcato.sfz',
    'Tuba Marc': BRASS + 'Tuba Marcato.sfz',
    'Celli Trem': SSO + 'Strings - Performance/Celli Tremolo.sfz',
    'Contrabassoon': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
    'Gallop': 'VSCO-2-CE/ContrabassSpic.sfz',
    'Gallop 8va': 'VSCO-2-CE/CelloEnsSpic.sfz',
    'Timpani': 'VSCO-2-CE/Timpani.sfz',
    'Timp Roll': 'VSCO-2-CE/TimpaniRolls.sfz',
    'Bass Drum': VCSL_MEM + 'Bass Drum 2.sfz',
    'Tom': VCSL_MEM + 'Tom 2.sfz',
    'Bell': VCSL_ID + 'Tubular Bells 1.sfz',
    'Gong': VCSL_ID + 'Gong 1.sfz',
    'Glass': 'VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz',
}
CC1_TRACKS = ['Choir', 'Choir Whisper', 'Organ Gedact', 'Horns Marc', 'Horns', 'Trombones Marc', 'Tuba Marc',
              'Celli Trem', 'Contrabassoon']
CC11_TRACKS = ['Glass', 'Timp Roll']
MAX_NOTE_S = {'Horns Marc': 2.8, 'Horns': 2.8, 'Trombones Marc': 2.2, 'Tuba Marc': 0.4, 'Glass': 20.0,
              'Timp Roll': 16.0}
UNPITCHED = {'Bass Drum', 'Tom', 'Gong'}

# Criterion 2. Two deliberate deviations: the gallop pattern (octave on eighths 2 and 6, root in octave 1)
# needs 44-47 over Ab/Bb/B (the brief's 43 only covers G), and Gallop 8va is that line an octave up (59).
RANGES = {
    'Choir': (47, 81), 'Choir Whisper': (47, 55), 'Organ Pedal': (36, 47), 'Organ Violon': (36, 47),
    'Organ 8': (59, 80), 'Organ Stopped': (59, 80), 'Organ Gedact': (59, 68), 'Horns Marc': (59, 73),
    'Horns': (59, 73), 'Trombones Marc': (43, 61), 'Tuba Marc': (28, 43), 'Celli Trem': (36, 50),
    'Contrabassoon': (23, 32), 'Gallop': (24, 47), 'Gallop 8va': (36, 59), 'Timpani': (36, 44),
    'Timp Roll': (36, 44), 'Bell': (60, 67), 'Glass': (75, 75), 'Bass Drum': (62, 63), 'Tom': (62, 62),
    'Gong': (60, 60),
}

SECTIONS = [('intro', 1, 4, 9), ('A', 5, 12, 11), ("A'", 13, 20, 13), ('B', 21, 28, 8),
            ('bridge', 29, 36, 11), ('climax', 37, 48, 14), ('codetta', 49, 56, 9)]

# Section 5, in eighths: (bar, eighth, pitch, length in eighths).
HYMN = [(0, 0, 60, 2), (0, 2, 62, 2), (0, 4, 63, 4), (1, 0, 66, 6), (1, 6, 67, 2), (2, 0, 63, 4), (2, 4, 62, 4),
        (3, 0, 59, 8), (4, 0, 60, 2), (4, 2, 63, 2), (4, 4, 67, 4), (5, 0, 68, 4), (5, 4, 67, 4), (6, 0, 60, 12),
        (7, 4, 59, 4)]
RETRO = [(21, 2, 60, 14), (23, 0, 67, 4), (23, 4, 68, 4), (24, 0, 67, 4), (24, 4, 63, 2), (24, 6, 60, 2),
         (25, 0, 59, 8), (26, 0, 62, 4), (26, 4, 63, 4), (27, 0, 67, 2), (27, 2, 66, 6), (28, 0, 63, 4),
         (28, 4, 62, 2), (28, 6, 60, 2)]
HEADS = [(29, 0, 60, 2), (29, 2, 62, 2), (29, 4, 63, 2), (29, 6, 66, 2), (30, 0, 67, 8),
         (31, 0, 61, 2), (31, 2, 63, 2), (31, 4, 64, 2), (31, 6, 67, 2), (32, 0, 68, 8),
         (33, 0, 62, 2), (33, 2, 64, 2), (33, 4, 65, 2), (33, 6, 68, 2), (34, 0, 69, 8),
         (35, 0, 63, 2), (35, 2, 65, 2), (35, 4, 66, 2), (35, 6, 69, 2), (36, 0, 68, 4), (36, 4, 71, 4)]
REAL = [(0, 0, 60, 1), (0, 1, 62, 1), (0, 2, 63, 2), (0, 4, 66, 3), (0, 7, 67, 1), (1, 0, 63, 2), (1, 2, 62, 2),
        (1, 4, 59, 4), (2, 0, 60, 1), (2, 1, 63, 1), (2, 2, 67, 2), (2, 4, 68, 2), (2, 6, 67, 2), (3, 0, 60, 8)]
IN_F = [(b, e, p + 5, d) for b, e, p, d in REAL[:-1]] + [(3, 0, 65, 6)]
CADENCE = [(b - 4, e, p + 12, d) for b, e, p, d in HYMN[8:]]


def at(bar, events, shift=0):
    return [(bar + b, e, p + shift, d) for b, e, p, d in events]


LEITMOTIF = [
    ('Choir', 5, 12, at(5, HYMN)), ('Organ 8', 5, 12, at(5, HYMN)), ('Organ Stopped', 5, 12, at(5, HYMN)),
    ('Choir', 13, 20, at(13, HYMN)), ('Horns', 13, 20, at(13, HYMN)), ('Organ 8', 13, 20, at(13, HYMN)),
    ('Organ Stopped', 13, 20, at(13, HYMN)),
    ('Organ Gedact', 21, 28, RETRO),
    ('Horns Marc', 29, 36, HEADS), ('Trombones Marc', 29, 36, [(b, e, p - 12, d) for b, e, p, d in HEADS]),
    ('Horns Marc', 37, 40, at(37, REAL)), ('Trombones Marc', 37, 40, at(37, REAL, -12)),
    ('Horns Marc', 41, 44, at(41, IN_F)), ('Trombones Marc', 41, 44, at(41, IN_F, -12)),
    ('Choir', 45, 48, at(45, CADENCE)), ('Organ 8', 45, 48, at(45, CADENCE)), ('Horns', 45, 48, at(45, CADENCE, -12)),
    ('Organ 8', 49, 52, at(49, HYMN[:8])), ('Organ Stopped', 49, 52, at(49, HYMN[:8])),
]

# Melodies of section 5 (tracks, first bar, last bar) for the register-clash rule (criterion 6).
MELODIES = [(('Choir', 'Organ 8', 'Organ Stopped'), 5, 12), (('Choir', 'Horns', 'Organ 8', 'Organ Stopped'), 13, 20),
            (('Organ Gedact',), 21, 28), (('Horns Marc', 'Trombones Marc'), 29, 36),
            (('Horns Marc', 'Trombones Marc'), 37, 44), (('Choir', 'Organ 8', 'Horns'), 45, 48),
            (('Organ 8', 'Organ Stopped'), 49, 52)]

# Section 4: the real bass, (eighth, pitch class) per bar.
C, Db, D, Eb, F, Gb, G, Ab, Bb, B = 0, 1, 2, 3, 5, 6, 7, 8, 10, 11
BASS = {1: [(0, C)], 2: [(0, C)], 3: [(0, C)], 4: [(0, G)],
        5: [(0, C)], 6: [(0, Ab)], 7: [(0, G)], 8: [(0, G)], 9: [(0, C)], 10: [(0, Ab)], 11: [(0, Db)], 12: [(0, G)],
        13: [(0, C)], 14: [(0, D)], 15: [(0, Eb)], 16: [(0, B)], 17: [(0, Ab)], 18: [(0, F)], 19: [(0, D)], 20: [(0, G)],
        21: [(0, C)], 22: [(0, C)], 23: [(0, C)], 24: [(0, C)], 25: [(0, B)], 26: [(0, G)], 27: [(0, Ab)], 28: [(0, G)],
        29: [(0, C)], 30: [(0, C), (4, Db)], 31: [(0, Db)], 32: [(0, Db), (4, D)], 33: [(0, D)], 34: [(0, D), (4, Eb)],
        35: [(0, Eb)], 36: [(0, G)],
        37: [(0, C), (4, Ab)], 38: [(0, G)], 39: [(0, C), (4, Db), (6, G)], 40: [(0, C)], 41: [(0, F), (4, Db)],
        42: [(0, C)], 43: [(0, F), (4, Gb), (6, C)], 44: [(0, F), (4, G)], 45: [(0, C)], 46: [(0, Ab), (4, G)],
        47: [(0, C), (4, Bb)], 48: [(0, Ab), (4, G)],
        49: [(0, C)], 50: [(0, Ab)], 51: [(0, G)], 52: [(0, G)], 53: [(0, C)], 54: [(0, C)], 55: [(0, C)], 56: [(0, G)]}


def bass_pc(bar, eighth):
    pc = BASS[bar][0][1]
    for e, p in BASS[bar]:
        if eighth >= e:
            pc = p
    return pc


def t(bar, eighth=0.0):
    return (bar - 1) * BAR_S + eighth * EIGHTH_S


def bar_of(seconds):
    return int((seconds + TOL) // BAR_S) + 1


def eighth_of(seconds):
    return round((seconds - t(bar_of(seconds))) / EIGHTH_S)


def notes_between(track, start, end):
    return [n for n in track.notes if start - TOL <= n.start < end - TOL]


def cc_at(track, number, when):
    """Controller value at a time, linear between points and held outside (as the sampler reads it)."""
    pts = track.cc.get(number, [])
    if not pts:
        return None
    if when <= pts[0][0]:
        return pts[0][1]
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if a <= when <= b:
            return int(round(va + (vb - va) * (when - a) / (b - a))) if b > a else vb
    return pts[-1][1]


class VolguthScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'acto2-volguth.mid')
        compose.write_midi(cls.path)
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)
        cls.tr = cls.song.tracks

    def level(self, name, note):
        """Dynamic level of a note: CC1 at its start for Sonatina CC1 patches, else its velocity."""
        if name in CC1_TRACKS:
            return cc_at(self.tr[name], 1, note.start)
        return note.velocity

    # ── structure ────────────────────────────────────────────────────────────
    def test_one_named_track_per_instrument(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(sorted(names), sorted(EXPECTED_TRACKS))
        for name, rel in EXPECTED_TRACKS.items():
            self.assertEqual(compose.SFZ_OF[name], library(*rel.split('/')), name)
            self.assertTrue(os.path.exists(compose.SFZ_OF[name]), name)
            self.assertTrue(self.tr[name].notes, f'{name} has no notes')

    def test_deterministic(self):
        other = os.path.join(tempfile.mkdtemp(), 'again.mid')
        compose.write_midi(other)
        with open(self.path, 'rb') as a, open(other, 'rb') as b:
            self.assertEqual(a.read(), b.read())

    # 1
    def test_tempo_meter_and_length(self):
        tempos = [m for tr in self.mid.tracks for m in tr if m.type == 'set_tempo']
        sigs = [m for tr in self.mid.tracks for m in tr if m.type == 'time_signature']
        self.assertEqual(len(tempos), 1)
        self.assertTrue(any(m.type == 'set_tempo' for m in self.mid.tracks[0]))
        self.assertAlmostEqual(mido.tempo2bpm(tempos[0].tempo), BPM, places=3)
        self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(4, 4)])
        for tr in self.mid.tracks:
            self.assertEqual(sum(m.time for m in tr), 56 * 4 * self.mid.ticks_per_beat)
        for track in self.tr.values():
            for n in track.notes:
                self.assertGreaterEqual(n.start, 0.0, track.name)
                self.assertLess(n.end, LOOP_S, track.name)

    # 2
    def test_ranges_and_registers(self):
        for name, track in self.tr.items():
            inst = sfz.load(compose.SFZ_OF[name])
            keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                    for k in range(r.lokey, r.hikey + 1)}
            lo, hi = RANGES[name]
            for n in track.notes:
                bar = bar_of(n.start)
                self.assertIn(n.pitch, keys, f'{name} {n.pitch} outside the patch')
                self.assertTrue(lo <= n.pitch <= hi, f'{name} {n.pitch} bar {bar} outside {lo}-{hi}')
                if name == 'Choir' and 5 <= bar <= 20:
                    self.assertLessEqual(n.pitch, 68, f'choir bar {bar}')
                if name == 'Choir' and 29 <= bar <= 48:
                    self.assertGreaterEqual(n.pitch, 67, f'choir bar {bar}')
                if name == 'Trombones Marc' and not 29 <= bar <= 44:
                    self.assertTrue(43 <= n.pitch <= 56, f'trombone hit {n.pitch} bar {bar}')
        # A5 (81) is the bridge's ceiling (section 6); Ab5 (80) is the top of the climax, sung once, in bar 46.
        self.assertEqual(max(n.pitch for n in self.tr['Choir'].notes if 45 <= bar_of(n.start) <= 48), 80)
        self.assertEqual([bar_of(n.start) for n in self.tr['Choir'].notes if n.pitch == 80
                          and 45 <= bar_of(n.start) <= 48], [46], 'Ab5 of bar 46 is the climax')

    # 3
    def test_leitmotif_transformations(self):
        for name, first, last, events in LEITMOTIF:
            label = f'{name} {first}-{last}'
            got = sorted(notes_between(self.tr[name], t(first), t(last + 1)), key=lambda n: n.start)
            self.assertEqual(len(got), len(events), label)
            for (bar, eighth, pitch, length), n in zip(events, got):
                self.assertEqual(n.pitch, pitch, f'{label}: bar {bar} eighth {eighth}')
                self.assertAlmostEqual(n.start, t(bar, eighth), delta=TOL, msg=f'{label}: bar {bar} eighth {eighth}')
                self.assertAlmostEqual(n.end - n.start, length * EIGHTH_S, delta=0.07,
                                       msg=f'{label}: bar {bar} eighth {eighth} length')

    def test_retrograde_is_the_hymn_backwards(self):
        """B plays the augmented motif (breve ending) reversed in pitch and rhythm."""
        aug = [(b * 8 + e, p, d) for b, e, p, d in HYMN[:-2]] + [(48, 60, 16)]
        back = sorted((64 - (on + d), p, d) for on, p, d in aug)
        got = [((b - 21) * 8 + e, p, d) for b, e, p, d in RETRO]
        self.assertEqual([p for _, p, _ in back], [p for _, p, _ in got])
        self.assertEqual(back[1:], got[1:])
        self.assertEqual(got[0], (2, 60, 14), 'the breve starts after the hit of bar 21')

    # 4
    def test_no_figure_shorter_than_an_eighth(self):
        for name, track in self.tr.items():
            onsets = []
            for n in sorted(track.notes, key=lambda n: n.start):
                if not onsets or n.start - onsets[-1] > 0.03:
                    onsets.append(n.start)
            for a, b in zip(onsets, onsets[1:]):
                self.assertGreater(b - a, EIGHTH_S - 0.03, f'{name} faster than eighths at bar {bar_of(a)}')
            for x in onsets:
                if name == 'Glass':
                    continue                                  # the glass is anticipated 150 ms
                off = (x / EIGHTH_S) - round(x / EIGHTH_S)
                self.assertLessEqual(abs(off) * EIGHTH_S, TOL, f'{name} off the eighth grid at bar {bar_of(x)}')

    # 5
    def test_layers_per_section(self):
        for label, first, last, limit in SECTIONS:
            lo, hi = t(first), t(last + 1)
            times = sorted({max(lo, min(hi, x)) for tr in self.tr.values()
                            for n in tr.notes for x in (n.start, n.end)} | {lo})
            worst = 0
            for a, b in zip(times, times[1:]):
                mid = (a + b) / 2
                if b - a > 1e-4 and lo <= mid < hi:
                    worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes) for tr in self.tr.values()))
            self.assertLessEqual(worst, limit, label)
        for name in ('Bell', 'Gong'):
            for n in self.tr[name].notes:
                self.assertAlmostEqual(n.end - n.start, QUARTER_S, delta=0.03, msg=f'{name} bar {bar_of(n.start)}')

    # 6
    def test_no_register_clash_with_the_melody(self):
        for tracks, first, last in MELODIES:
            lo, hi = (t(21, 2) if first == 21 else t(first)), t(last + 1)
            mel = [(name, n) for name in tracks for n in notes_between(self.tr[name], lo, hi)]
            for name, track in self.tr.items():
                if name in tracks or name in UNPITCHED:
                    continue
                for o in track.notes:
                    if o.end - o.start < QUARTER_S - 0.04:
                        continue
                    if name == 'Bell' and bar_of(o.start) == 5:
                        continue                              # declared unison with the choir
                    # held together: more than a legato tail (30 ms) plus the humanization (8 ms)
                    near = [(mn, m) for mn, m in mel if min(m.end, o.end, hi) - max(m.start, o.start, lo) > 0.06
                            and abs(m.pitch - o.pitch) <= 11]
                    if near:
                        top = max(self.level(mn, m) for mn, m in near)
                        self.assertLess(self.level(name, o), top,
                                        f'{name} {o.pitch} at bar {bar_of(o.start)} vs melody {tracks}')

    # 7
    def test_the_phylactery(self):
        allowed = {'Organ Gedact', 'Organ Pedal', 'Contrabassoon', 'Timpani', 'Bass Drum', 'Glass',
                   'Choir Whisper', 'Bell'}
        lo, hi = t(21, 2), t(29)
        hit = {name: sorted(n.pitch for n in tr.notes if abs(n.start - t(21)) <= TOL) for name, tr in self.tr.items()}
        self.assertEqual(hit['Choir'], [60, 63, 67])
        self.assertEqual(hit['Trombones Marc'], [48, 55])
        self.assertEqual(hit['Tuba Marc'], [36])
        self.assertEqual(hit['Timpani'], [36])
        self.assertEqual(hit['Organ Pedal'], [36])
        self.assertEqual(hit['Gong'], [60])
        self.assertEqual(hit['Bass Drum'], [62])
        for n in self.tr['Timpani'].notes:
            if abs(n.start - t(21)) <= TOL:
                self.assertLessEqual(n.velocity, 100)
        for name, track in self.tr.items():
            for n in track.notes:
                if lo - TOL <= n.start < hi - TOL:
                    self.assertIn(name, allowed, f'{name} plays in B (bar {bar_of(n.start)})')
                    self.assertLessEqual(n.velocity, 62, f'{name} velocity in B')
                elif n.start < lo and name not in allowed:
                    self.assertLessEqual(n.end, lo + TOL, f'{name} still sounds after the hit of bar 21')
            for number, pts in track.cc.items():
                if number == 1:
                    for time, v in pts:
                        if lo - 1e-6 <= time < hi:
                            self.assertLessEqual(v, 72, f'{name} CC1 in B')
        bells = [n for n in self.tr['Bell'].notes if lo <= n.start < hi]
        self.assertEqual([bar_of(n.start) for n in bells], [23])
        glass = self.tr['Glass'].notes
        self.assertEqual(len(glass), 1)
        self.assertAlmostEqual(glass[0].start, t(22) - 0.150, delta=0.005)
        self.assertAlmostEqual(glass[0].end, t(28, 6), delta=0.03)
        cc11 = [v for time, v in self.tr['Glass'].cc[11] if glass[0].start - 0.3 <= time <= glass[0].end + 0.05]
        self.assertEqual(cc11, sorted(cc11), 'the soul in the flask only grows brighter')
        self.assertLessEqual(cc11[0], 52)
        self.assertEqual(cc11[-1], 127)

    # 8
    def test_dynamics_ceiling_and_climax(self):
        for name, track in self.tr.items():
            self.assertLessEqual(max(n.velocity for n in track.notes), 105, name)
            for v in (v for _, v in track.cc.get(1, [])):
                self.assertLessEqual(v, 112, f'{name} CC1')
            for number, pts in track.cc.items():
                self.assertLessEqual(max(v for _, v in pts), 127, f'{name} CC{number}')
        bar46 = (t(46) - 1e-6, t(47) - 1e-6)
        for family in (('Choir',), ('Horns',), ('Horns', 'Horns Marc')):
            pts = [(time, v) for name in family for time, v in self.tr[name].cc[1]]
            inside = max(v for time, v in pts if bar46[0] <= time < bar46[1])
            outside = max(v for time, v in pts if not bar46[0] <= time < bar46[1])
            self.assertGreater(inside, outside, family)
        for name in ('Timpani', 'Bass Drum', 'Gong'):
            notes = self.tr[name].notes
            inside = max(n.velocity for n in notes if 46 == bar_of(n.start))
            outside = max(n.velocity for n in notes if 46 != bar_of(n.start))
            self.assertGreater(inside, outside, name)
        self.assertEqual(cc_at(self.tr['Choir'], 1, t(46) + 0.001), 110)

    # 9
    def test_cc1_curves_and_note_lengths(self):
        for name in CC1_TRACKS:
            pts = self.tr[name].cc.get(1)
            self.assertTrue(pts, f'{name} has no CC1')
            self.assertAlmostEqual(pts[0][0], 0.0, places=6, msg=name)
            self.assertGreater(len({v for _, v in pts}), 2, f'{name} CC1 has no shape')
        for name, track in self.tr.items():
            if name not in CC1_TRACKS:
                self.assertNotIn(1, track.cc, f'{name}: CC1 would act as a volume fader on a velocity patch')
            for number, pts in track.cc.items():
                times = [time for time, _ in pts]
                for a, b in zip(times, times[1:]):
                    self.assertGreaterEqual(b - a, BAR_S / 8 - 1e-6, f'{name} CC{number} too dense')
        for name, limit in MAX_NOTE_S.items():
            for n in self.tr[name].notes:
                self.assertLessEqual(n.end - n.start, limit, f'{name} bar {bar_of(n.start)}')
        for name in CC11_TRACKS:
            self.assertIn(11, self.tr[name].cc, f'{name} needs a CC11 curve')
            self.assertAlmostEqual(self.tr[name].cc[11][0][0], 0.0, places=6)

    # 10
    def test_gallop_pattern(self):
        gallop_bars = list(range(1, 21)) + list(range(33, 57))
        for name, shift, bars in (('Gallop', 0, gallop_bars), ('Gallop 8va', 12, list(range(37, 49)))):
            present = sorted({bar_of(n.start) for n in self.tr[name].notes})
            self.assertEqual(present, bars, name)
            for bar in bars:
                got = sorted(notes_between(self.tr[name], t(bar), t(bar + 1)), key=lambda n: n.start)
                self.assertEqual([eighth_of(n.start) for n in got], list(range(8)), f'{name} bar {bar}')
                for e, n in enumerate(got):
                    base = next(p for p in range(24, 36) if p % 12 == bass_pc(bar, e)) + shift
                    self.assertEqual(n.pitch, base + (12 if e in (2, 6) else 0), f'{name} bar {bar} eighth {e}')
                even = [n.velocity for e, n in enumerate(got) if e % 2 == 0]
                odd = [n.velocity for e, n in enumerate(got) if e % 2 == 1]
                self.assertGreater(min(even), max(odd), f'{name} accents bar {bar}')
                if name == 'Gallop':
                    self.assertTrue(all(abs(v - 96) <= 8 for v in even), f'gallop accents bar {bar}: {even}')
                    self.assertTrue(all(abs(v - 72) <= 8 for v in odd), f'gallop off-beats bar {bar}: {odd}')
            notes = sorted(self.tr[name].notes, key=lambda n: n.start)
            run = 1
            for a, b in zip(notes, notes[1:]):
                same = a.pitch == b.pitch and abs(a.velocity - b.velocity) <= 3 and b.start - a.start < EIGHTH_S * 1.5
                run = run + 1 if same else 1
                self.assertLessEqual(run, 3, f'{name} run of equal eighths at bar {bar_of(b.start)}')

    def test_hits_3_3_2_and_heartbeat(self):
        for n in self.tr['Tuba Marc'].notes:
            self.assertIn(eighth_of(n.start), (0, 3, 6), f'tuba off the 3+3+2 at bar {bar_of(n.start)}')
        for n in self.tr['Trombones Marc'].notes:
            if not 29 <= bar_of(n.start) <= 44:
                self.assertIn(eighth_of(n.start), (0, 3, 6), f'trombone hit off the 3+3+2 at bar {bar_of(n.start)}')
                if bar_of(n.start) != 21:                     # the tutti hit of bar 21 is a quarter
                    self.assertAlmostEqual(n.end - n.start, 0.35 * QUARTER_S, delta=0.03)
        lubs_per_bar = {**{b: 1 for b in range(22, 29)}, 29: 2, 30: 2, 31: 4, 32: 4}
        for bar, want in lubs_per_bar.items():
            got = sorted(notes_between(self.tr['Timpani'], t(bar), t(bar + 1)), key=lambda n: n.start)
            lubs = [n for n in got if eighth_of(n.start) % 2 == 0]
            dubs = [n for n in got if eighth_of(n.start) % 2 == 1]
            self.assertEqual(len(lubs), want, f'lubs in bar {bar}')
            self.assertEqual(len(dubs), want, f'dubs in bar {bar}')
            for lub, dub in zip(lubs, dubs):
                self.assertAlmostEqual(dub.start - lub.start, EIGHTH_S, delta=2 * TOL)
                self.assertAlmostEqual(lub.velocity - dub.velocity, 18, delta=12, msg=f'lub-dub bar {bar}')
        drum = [n for n in self.tr['Bass Drum'].notes if 22 <= bar_of(n.start) <= 28]
        self.assertEqual([bar_of(n.start) for n in drum], list(range(22, 29)), 'a muffled drum with each lub')
        self.assertEqual(notes_between(self.tr['Timpani'], t(33), t(37)), [], 'from bar 33 the gallop takes over')

    # 11
    def test_counts_and_forbidden_colours(self):
        bells = sorted(bar_of(n.start) for n in self.tr['Bell'].notes)
        self.assertEqual(bells, [1, 5, 9, 13, 23, 37, 41, 45, 49])
        self.assertEqual(sorted(bar_of(n.start) for n in self.tr['Gong'].notes), [1, 21, 37, 46])
        self.assertEqual(len(self.tr['Glass'].notes), 1)
        for name in self.tr:
            path = compose.SFZ_OF[name]
            for word in ('Trumpet', 'Violin', 'Cymbal', 'Tamtam', 'Tam-tam', 'All Stops', 'Principal 4ft', 'KS',
                         'Combinations', 'Single Stops', 'Piccolo'):
                self.assertNotIn(word, path, name)

    # 12
    def test_the_bass_of_section_4_is_the_lowest_note(self):
        pitched = [tr for name, tr in self.tr.items() if name not in UNPITCHED]
        for bar in range(1, 57):
            for eighth in (0, 4):
                when = t(bar, eighth) + 0.03
                sounding = [n.pitch for tr in pitched for n in tr.notes if n.start <= when < n.end]
                self.assertTrue(sounding, f'silence at bar {bar} eighth {eighth}')
                self.assertEqual(min(sounding) % 12, bass_pc(bar, eighth), f'bass at bar {bar} eighth {eighth}')

    # ── craft ────────────────────────────────────────────────────────────────
    def test_legato_overlaps_in_sustained_melodies(self):
        windows = {'Choir': [(5, 21), (45, 49)], 'Organ 8': [(5, 21), (45, 53)], 'Organ Stopped': [(5, 21), (49, 53)],
                   'Horns': [(13, 21), (45, 49)], 'Organ Gedact': [(21, 29), (49, 53)]}
        for name, spans in windows.items():
            joins = 0
            for first, last in spans:
                notes = notes_between(self.tr[name], t(first), t(last))
                for a in notes:
                    nxt = [b for b in notes if 0 < b.start - a.start and abs(b.start - a.end) < 0.04]
                    if nxt and all(b.pitch != a.pitch for b in nxt):
                        overlap = a.end - min(b.start for b in nxt)
                        self.assertTrue(0.0095 <= overlap <= 0.0305, f'{name} overlap {overlap * 1000:.1f} ms')
                        joins += 1
            self.assertGreater(joins, 5, name)
        for name in ('Horns Marc', 'Trombones Marc'):           # marcato: every note attacked, no legato
            notes = sorted(notes_between(self.tr[name], t(29), t(45)), key=lambda n: n.start)
            for a, b in zip(notes, notes[1:]):
                self.assertLessEqual(a.end, b.start + 1e-6, f'{name} legato at bar {bar_of(a.start)}')

    def test_humanization(self):
        offs, vels = [], []
        for name, track in self.tr.items():
            if name == 'Glass':
                continue
            for n in track.notes:
                off = n.start - round(n.start / EIGHTH_S) * EIGHTH_S
                self.assertLessEqual(abs(off), 0.0085, f'{name} bar {bar_of(n.start)} moved {off * 1000:.1f} ms')
                offs.append(abs(off))
                vels.append(n.velocity)
        self.assertGreater(sum(o > 0.001 for o in offs) / len(offs), 0.5, 'timing is not humanized')
        for name in ('Choir', 'Organ 8', 'Horns Marc', 'Gallop', 'Timpani', 'Organ Gedact'):
            self.assertGreater(len({n.velocity for n in self.tr[name].notes}), 5, f'{name} velocities are flat')

    def test_no_two_bar_phrase_repeated_identical_more_than_twice(self):
        """The whole texture (every track: notes on the eighth grid, pitch) of any two bars."""
        seen = {}
        for bar in range(1, 56):
            sig = tuple(sorted((name, round((n.start - t(bar)) / EIGHTH_S), n.pitch)
                               for name, tr in self.tr.items() for n in notes_between(tr, t(bar), t(bar + 2))))
            seen.setdefault(sig, []).append(bar)
        repeated = [bars for bars in seen.values() if len(bars) > 2]
        self.assertEqual(repeated, [])

    def test_voice_leading(self):
        parts = compose.build()
        inner, outer = compose.parallels(parts)
        self.assertEqual(inner, [], 'parallel 5ths/8ves in the inner voices')
        self.assertTrue(set(outer) <= compose.BRIEF_OUTER_PARALLELS, f'undeclared outer parallels: {outer}')

    def test_seam_dominant_leads_back_to_bar_1(self):
        tom = sorted(notes_between(self.tr['Tom'], t(56), t(57)), key=lambda n: n.start)
        self.assertEqual(len(tom), 8)
        self.assertGreater(tom[-1].velocity, tom[0].velocity + 15, 'the roll grows into bar 1')
        self.assertEqual(bass_pc(56, 0), G)
        for name in ('Bell', 'Gong', 'Gallop', 'Organ Pedal', 'Timpani', 'Bass Drum'):
            self.assertTrue(any(abs(n.start) <= TOL for n in self.tr[name].notes), f'{name} on the downbeat of bar 1')
        trem = self.tr['Celli Trem']
        trem_3_4 = [(round((n.start - t(3)) / EIGHTH_S), n.pitch) for n in notes_between(trem, t(3), t(5))]
        trem_55 = [(round((n.start - t(55)) / EIGHTH_S), n.pitch) for n in notes_between(trem, t(55), t(57))]
        self.assertEqual(sorted(trem_3_4), sorted(trem_55), 'bars 55-56 are bars 3-4')


if __name__ == '__main__':
    unittest.main()
