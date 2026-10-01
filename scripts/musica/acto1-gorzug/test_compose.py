"""Acceptance tests for Gorzug's boss theme (docs/musica/acto1-gorzug.md, section 8, criteria 1-10).

They read the generated MIDI independently of the checks that compose.py prints.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto1-gorzug/test_compose.py
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

BPM = 160
BAR_S = 4 * 60 / BPM            # 1.5 s
EIGHTH_S = BAR_S / 8
SIXTEENTH_S = BAR_S / 16
LOOP_S = 56 * BAR_S             # 84.0 s
TOL = 0.012                     # humanization is +-8 ms

SSO = 'sso/Sonatina Symphonic Orchestra/'
BRASS, STRINGS = SSO + 'Brass - Performance/', SSO + 'Strings - Performance/'
EXPECTED_TRACKS = {
    'Horns Marcato': BRASS + 'Horns Marcato.sfz',
    'Horns Sustain': BRASS + 'Horns Sustain.sfz',
    'Trombones Marcato': BRASS + 'Trombones Marcato.sfz',
    'Trombones Sustain': BRASS + 'Trombones Sustain (looped).sfz',
    'Trombones Staccato': BRASS + 'Trombones Staccato.sfz',
    'Bass Trombone Marcato': BRASS + 'Bass Trombone Solo Marcato.sfz',
    'Bass Trombone Sustain': BRASS + 'Bass Trombone Solo Sustain (looped).sfz',
    'Tuba Marcato': BRASS + 'Tuba Marcato.sfz',
    'Large Chorus': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Contrabassoon Sustain': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
    'Contrabassoon Staccato': SSO + 'Woodwinds - Performance/Contrabassoon Solo Staccato.sfz',
    'Clarinet Stac': 'VSCO-2-CE/ClarinetStac.sfz',
    'Xylophone': 'VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz',
    'Timpani': 'VSCO-2-CE/Timpani.sfz',
    'Timpani Roll': 'VSCO-2-CE/TimpaniRolls.sfz',
    'Bass Drum': 'VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Tom': 'VCSL/Membranophones/Struck Membranophones/Tom 2.sfz',
    'Forge': 'VCSL/Idiophones/Struck Idiophones/Brake Drum.sfz',
    'Cymbal': 'VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz',
    'Tam-tam': SSO + 'Percussion/Cymbals & Tamtam.sfz',
    'Gong': 'VCSL/Idiophones/Struck Idiophones/Gong 1.sfz',
    '1st Violins Marcato': STRINGS + '1st Violins Marcato.sfz',
    'Violins Sus': 'VSCO-2-CE/ViolinEnsSusVib.sfz',
    'Violins Trem': 'VSCO-2-CE/ViolinEnsTrem.sfz',
    'Violas Trem': 'VSCO-2-CE/ViolaEnsTrem.sfz',
    'Violas Spic': 'VSCO-2-CE/ViolaEnsSpic.sfz',
    'Violas Col Legno': STRINGS + 'Violas Col Legno.sfz',
    'Cellos Spic': 'VSCO-2-CE/CelloEnsSpic.sfz',
    'Celli Col Legno': STRINGS + 'Celli Col Legno.sfz',
    'Basses Spic': 'VSCO-2-CE/ContrabassSpic.sfz',
    'Basses Trem': 'VSCO-2-CE/ContrabassTrem.sfz',
    'Basses Col Legno': STRINGS + 'Basses Col Legno.sfz',
}
CC1_TRACKS = ['Horns Marcato', 'Horns Sustain', 'Trombones Marcato', 'Trombones Sustain',
              'Bass Trombone Marcato', 'Bass Trombone Sustain', 'Tuba Marcato', '1st Violins Marcato',
              'Large Chorus', 'Contrabassoon Sustain']
MAX_NOTE_S = {'Horns Sustain': 2.8, 'Horns Marcato': 2.8, 'Trombones Marcato': 2.2,
              '1st Violins Marcato': 3.5, 'Bass Trombone Marcato': 2.8}
CEILINGS = {'1st Violins Marcato': 84, 'Violins Sus': 84, 'Violins Trem': 84,
            'Horns Marcato': 74, 'Horns Sustain': 74, 'Trombones Marcato': 62, 'Trombones Sustain': 62,
            'Trombones Staccato': 62, 'Clarinet Stac': 84, 'Xylophone': 84}

# Section 6 registers: (track, first bar, last bar, low, high). The ostinato in A uses the explicit
# rule "root in octave 3 off the accents", which puts Bb3/A3 (58/57) above the column's 55; after A
# the brief gives only that rule (octaves 2 and 3: 36-59).
REGISTERS = [
    ('Cellos Spic', 1, 4, 38, 50), ('Contrabassoon Sustain', 1, 4, 38, 38), ('Timpani', 1, 4, 38, 38),
    ('Horns Marcato', 1, 4, 62, 70), ('Violas Trem', 1, 4, 49, 55),
    ('Trombones Marcato', 5, 12, 45, 58), ('Horns Marcato', 5, 12, 57, 70), ('Cellos Spic', 5, 12, 38, 58),
    ('Basses Spic', 5, 15, 26, 45), ('Violins Trem', 5, 12, 81, 82), ('Tuba Marcato', 5, 12, 38, 46),
    ('Timpani', 5, 12, 38, 46),
    ('1st Violins Marcato', 13, 15, 74, 82), ('Horns Marcato', 13, 16, 62, 70),
    ('Trombones Marcato', 13, 16, 45, 58), ('Clarinet Stac', 17, 20, 67, 82), ('Xylophone', 17, 20, 67, 82),
    ('Violas Trem', 13, 20, 50, 62), ('Timpani', 13, 20, 38, 45),
    ('Clarinet Stac', 21, 28, 67, 84), ('Xylophone', 21, 28, 67, 84), ('Basses Trem', 21, 28, 38, 45),
    ('Violas Col Legno', 21, 28, 50, 57), ('Violas Trem', 21, 28, 53, 65), ('Timpani', 21, 28, 38, 38),
    ('Trombones Sustain', 28, 28, 45, 58), ('Horns Sustain', 28, 28, 57, 70),
    ('Horns Marcato', 29, 32, 62, 74), ('Trombones Marcato', 29, 32, 50, 62),
    ('1st Violins Marcato', 33, 36, 67, 79), ('Horns Marcato', 33, 36, 55, 67),
    ('Large Chorus', 33, 36, 43, 58), ('Violas Trem', 29, 36, 52, 64), ('Tuba Marcato', 29, 36, 38, 45),
    ('Timpani', 29, 36, 38, 45), ('Timpani Roll', 35, 36, 45, 45),
    ('Horns Sustain', 37, 44, 62, 70), ('Trombones Sustain', 37, 44, 50, 58), ('Violins Sus', 37, 44, 74, 82),
    ('Large Chorus', 37, 48, 48, 70), ('Bass Trombone Sustain', 37, 44, 28, 38), ('Violas Spic', 37, 48, 55, 64),
    ('Horns Marcato', 45, 48, 62, 72), ('Violins Trem', 45, 48, 81, 82), ('Timpani', 37, 48, 36, 46),
    ('Tuba Marcato', 49, 56, 38, 51), ('Bass Trombone Marcato', 49, 56, 38, 51),
    ('Clarinet Stac', 49, 56, 67, 84), ('Xylophone', 49, 56, 67, 84), ('Violins Trem', 49, 52, 81, 82),
    ('Violas Trem', 53, 56, 50, 63), ('Timpani Roll', 56, 56, 45, 45),
    ('Tuba Marcato', 16, 16, 38, 38), ('Cellos Spic', 13, 56, 36, 59), ('Basses Spic', 29, 52, 26, 45),
    ('Contrabassoon Staccato', 1, 56, 34, 45), ('Celli Col Legno', 1, 56, 38, 52),
    ('Basses Col Legno', 1, 56, 26, 38), ('Trombones Staccato', 1, 56, 45, 60),
    ('Tam-tam', 1, 56, 57, 57), ('Gong', 1, 56, 62, 62), ('Bass Drum', 1, 56, 62, 62), ('Tom', 1, 56, 62, 62),
    ('Forge', 1, 56, 61, 65), ('Cymbal', 1, 56, 64, 66),
]

UNPITCHED = {'Bass Drum', 'Tom', 'Forge', 'Cymbal', 'Tam-tam', 'Gong'}   # key numbers are not pitches

SECTIONS = [('intro', 1, 4, 8), ('A', 5, 12, 11), ("A'", 13, 20, 11), ('B', 21, 28, 9),
            ('bridge', 29, 36, 11), ('climax', 37, 48, 12), ('codetta', 49, 56, 10)]

GOBLIN = {17: [67, 74, 75, 74, 70], 18: [69, 76, 77, 76, 73], 19: [74, 81, 82, 81, 77],
          20: [70, 77, 79, 77, 74], 21: [74, 81, 82, 81, 77], 22: [75, 82, 84, 82, 79],
          23: [74, 81, 82, 81, 77], 24: [74, 81, 82, 81, 73], 25: [67, 74, 75, 74], 26: [68, 75, 77],
          27: [67, 74], 51: [75, 82, 84, 82, 79], 53: [67, 74, 75, 74, 70]}

# Melodies of section 5 (tracks, first bar, last bar) for the register-clash rule (criterion 7).
MELODIES = [
    (('Horns Marcato',), 3, 4), (('Trombones Marcato', 'Horns Marcato'), 5, 12),
    (('1st Violins Marcato', 'Horns Marcato'), 13, 15), (('Clarinet Stac', 'Xylophone'), 17, 27),
    (('Horns Marcato', 'Trombones Marcato'), 29, 32), (('1st Violins Marcato', 'Horns Marcato'), 33, 36),
    (('Horns Sustain', 'Trombones Sustain', 'Violins Sus', 'Large Chorus'), 37, 44),
    (('Horns Marcato',), 45, 48), (('Tuba Marcato', 'Bass Trombone Marcato'), 49, 56),
    (('Clarinet Stac', 'Xylophone'), 51, 51), (('Clarinet Stac', 'Xylophone'), 53, 53),
]


def t(bar, eighth=0.0):
    return (bar - 1) * BAR_S + eighth * EIGHTH_S


def bar_of(seconds):
    return int((seconds + TOL) // BAR_S) + 1


def notes_between(track, start, end):
    return [n for n in track.notes if start - TOL <= n.start < end - TOL]


def cc_at(track, number, when):
    pts = track.cc.get(number, [])
    value = None
    for time, v in pts:
        if time <= when + 1e-6:
            value = v
    return value if value is not None else (pts[0][1] if pts else None)


class GorzugScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'acto1-gorzug.mid')
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
                self.assertLess(n.start, LOOP_S, track.name)
                self.assertLess(n.end, LOOP_S, track.name)
                self.assertGreaterEqual(n.start, 0.0, track.name)

    # 2
    def test_ranges_registers_and_ceilings(self):
        for name, track in self.tr.items():
            inst = sfz.load(compose.SFZ_OF[name])
            keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                    for k in range(r.lokey, r.hikey + 1)}
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch} outside the patch')
                self.assertLessEqual(n.pitch, CEILINGS.get(name, 127), f'{name} above its ceiling')
                if name == 'Large Chorus':
                    self.assertTrue(43 <= n.pitch <= 70, f'chorus {n.pitch}')
                rows = [r for r in REGISTERS if r[0] == name and r[1] <= bar_of(n.start) <= r[2]]
                self.assertTrue(rows, f'{name} bar {bar_of(n.start)} has no register entry')
                self.assertTrue(any(lo <= n.pitch <= hi for _, _, _, lo, hi in rows),
                                f'{name} bar {bar_of(n.start)} pitch {n.pitch}')

    # 3
    def assert_line(self, name, events, label):
        """events = [(bar, eighth, pitch)]: the first notes of the track from the first bar on."""
        bars = sorted({b for b, _, _ in events})
        got = notes_between(self.tr[name], t(bars[0]), t(bars[-1] + 1))
        got = sorted(got, key=lambda n: (round(n.start / 0.03), -n.pitch))
        self.assertGreaterEqual(len(got), len(events), label)
        for (bar, eighth, pitch), n in zip(events, got):
            self.assertEqual(n.pitch, pitch, f'{label}: bar {bar} eighth {eighth}')
            self.assertAlmostEqual(n.start, t(bar, eighth), delta=TOL, msg=f'{label}: bar {bar} eighth {eighth}')

    def test_leitmotif_exposition_5_8(self):
        grid = [(5, 0), (5, 3), (6, 0), (6, 3), (6, 6), (7, 0), (7, 3), (7, 6), (8, 0)]
        tbn = [50, 57, 58, 57, 53, 55, 53, 52, 50]
        self.assert_line('Trombones Marcato', [(b, e, p) for (b, e), p in zip(grid, tbn)], 'trombones 5-8')
        self.assert_line('Horns Marcato', [(b, e, p + 12) for (b, e), p in zip(grid, tbn)], 'horns 5-8')
        resp = [58, 57, 55, 57, 55, 53, 55, 53, 51, 52, 49, 45]
        grid9 = [(b, e) for b in range(9, 13) for e in (0, 3, 6)]
        self.assert_line('Trombones Marcato', [(b, e, p) for (b, e), p in zip(grid9, resp)], 'response 9-12')
        call = [(3, 0, 63), (3, 3, 70), (4, 0, 62), (4, 3, 69), (4, 6, 67)]
        self.assert_line('Horns Marcato', call, 'war call 3-4')

    def test_first_bite_13_16(self):
        grid = [(13, 0), (13, 3), (14, 0), (14, 3), (14, 6), (15, 0), (15, 3), (15, 6)]
        vn = [74, 81, 82, 81, 77, 79, 77, 76]
        self.assert_line('1st Violins Marcato', [(b, e, p) for (b, e), p in zip(grid, vn)], 'violins 13-15')
        self.assertEqual(notes_between(self.tr['1st Violins Marcato'], t(16), t(17)), [], 'the D of bar 16 is eaten')
        hn = [n.pitch for n in notes_between(self.tr['Horns Marcato'], t(13), t(16))]
        self.assertEqual(hn, [p - 12 for p in vn])

    def test_bridge_sequence_29_36(self):
        hn = [62, 69, 70, 63, 70, 72, 64, 71, 72, 65, 72, 74]
        vn = [67, 74, 75, 68, 75, 77, 69, 76, 77, 73, 76, 79]
        self.assert_line('Horns Marcato', [(29 + i // 3, (0, 3, 6)[i % 3], p) for i, p in enumerate(hn)], 'horns 29-32')
        self.assert_line('1st Violins Marcato', [(33 + i // 3, (0, 3, 6)[i % 3], p) for i, p in enumerate(vn)],
                         'violins 33-36')

    def test_augmentation_37_44(self):
        mel = [(37, 0, 62), (38, 0, 69), (39, 0, 70), (39, 4, 69), (40, 0, 65), (41, 0, 67), (41, 4, 65),
               (42, 0, 64), (43, 0, 62), (44, 0, 62)]
        self.assert_line('Horns Sustain', mel, 'horns 37-44')
        self.assert_line('Violins Sus', [(b, e, p + 12) for b, e, p in mel], 'violins 37-44')
        self.assert_line('Trombones Sustain', [(b, e, p - 12) for b, e, p in mel], 'trombones 37-44')
        top = []
        for bar, eighth, _ in mel:
            when = t(bar, eighth) + 0.05
            top.append(max(n.pitch for n in self.tr['Large Chorus'].notes if n.start <= when < n.end))
        self.assertEqual(top, [p for _, _, p in mel], 'chorus top voice')

    def test_coda_and_codetta_motifs(self):
        coda = {45: [62, 69, 70, 69, 65], 46: [63, 70, 72, 70], 47: [62, 69], 48: []}
        for bar, want in coda.items():
            got = notes_between(self.tr['Horns Marcato'], t(bar), t(bar + 1))
            self.assertEqual([n.pitch for n in got], want, f'coda bar {bar}')
            for i, n in enumerate(got):
                self.assertAlmostEqual(n.start, t(bar, i), delta=TOL)
        low = [n.pitch for n in notes_between(self.tr['Tuba Marcato'], t(49), t(57))]
        self.assertEqual(low, [38, 45, 39, 46, 43, 50, 44, 51, 38, 45, 43, 45])
        self.assertEqual(low, [n.pitch for n in notes_between(self.tr['Bass Trombone Marcato'], t(49), t(57))])

    def test_goblin_is_eaten_sooner_each_time(self):
        for name in ('Clarinet Stac', 'Xylophone'):
            for bar, want in GOBLIN.items():
                got = notes_between(self.tr[name], t(bar), t(bar + 1))
                self.assertEqual([n.pitch for n in got], want, f'{name} bar {bar}')
                for i, n in enumerate(got):
                    self.assertAlmostEqual(n.start, t(bar) + i * SIXTEENTH_S, delta=TOL)
            self.assertEqual(notes_between(self.tr[name], t(28), t(29)), [], 'no goblin left in bar 28')
        bite = {17: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8, 23: 8, 24: 8, 25: 4, 26: 3, 27: 2, 28: 0, 51: 8, 53: 8}
        for bar, sixteenth in bite.items():
            for name in ('Contrabassoon Staccato', 'Celli Col Legno', 'Basses Col Legno', 'Bass Drum'):
                hits = notes_between(self.tr[name], t(bar), t(bar + 1))
                self.assertTrue(any(abs(n.start - (t(bar) + sixteenth * SIXTEENTH_S)) <= TOL for n in hits),
                                f'bite of bar {bar} in {name}')

    # 4
    def test_bar_16_silence(self):
        lo, hi = t(16, 1), t(17)
        for name, track in self.tr.items():
            for n in track.notes:
                if name in ('Cellos Spic', 'Gong'):
                    continue
                self.assertFalse(lo - TOL <= n.start < hi - TOL, f'{name} starts a note in the bar-16 silence')
                if n.end > lo + TOL and n.start < hi:
                    self.assertGreaterEqual(n.start, t(16) - TOL, f'{name} still sounds from before bar 16')
        hits = [name for name, tr in self.tr.items() if any(abs(n.start - t(16)) <= TOL for n in tr.notes)]
        for name in ('Trombones Marcato', 'Horns Marcato', 'Tuba Marcato', 'Contrabassoon Staccato',
                     'Celli Col Legno', 'Basses Col Legno', 'Bass Drum', 'Trombones Staccato', 'Timpani', 'Tam-tam'):
            self.assertIn(name, hits)
        cellos = notes_between(self.tr['Cellos Spic'], lo, hi)
        self.assertTrue(cellos and max(n.velocity for n in cellos) <= 40, 'ostinato subito pp')
        self.assertTrue(any(n.pitch == 62 for n in notes_between(self.tr['Gong'], t(16), hi)))

    # 5
    def test_figures(self):
        allowed = {'Clarinet Stac', 'Xylophone', 'Violas Spic', 'Tom'}
        for name, track in self.tr.items():
            onsets = []
            for n in track.notes:
                if not onsets or n.start - onsets[-1] > 0.03:
                    onsets.append(n.start)
            for n in track.notes:
                fine = name in allowed or (name == 'Cellos Spic' and 33 <= bar_of(n.start) <= 36)
                if not fine:
                    self.assertGreater(n.end - n.start, EIGHTH_S - 0.045, f'{name} short note bar {bar_of(n.start)}')
            for a, b in zip(onsets, onsets[1:]):
                fine = name in allowed or (name == 'Cellos Spic' and 33 <= bar_of(a) <= 36)
                if not fine:
                    self.assertGreater(b - a, EIGHTH_S - 0.03, f'{name} sixteenth at bar {bar_of(a)}')

    # 6
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

    # 7
    def test_no_register_clash_with_the_melody(self):
        for tracks, first, last in MELODIES:
            lo, hi = t(first), t(last + 1)
            mel = [(name, n) for name in tracks for n in notes_between(self.tr[name], lo, hi)]
            for name, track in self.tr.items():
                if name in tracks or name in UNPITCHED or (name == 'Violins Trem' and first >= 5 and last <= 12):
                    continue
                for o in track.notes:
                    if o.end - o.start < BAR_S / 4 - 0.04:
                        continue
                    near = [(mn, m) for mn, m in mel if min(m.end, o.end, hi) - max(m.start, o.start) > 0.03
                            and abs(m.pitch - o.pitch) <= 11]
                    if near:
                        top = max(self.level(mn, m) for mn, m in near)
                        self.assertLess(self.level(name, o), top,
                                        f'{name} {o.pitch} at bar {bar_of(o.start)} vs melody {tracks}')

    # 8
    def test_dynamics_ceiling_and_climax(self):
        for name, track in self.tr.items():
            self.assertLessEqual(max(n.velocity for n in track.notes), 105, name)
            for number, pts in track.cc.items():
                self.assertLessEqual(max(v for _, v in pts), 112, f'{name} CC{number}')
        for family in (('Horns Marcato', 'Horns Sustain'), ('Large Chorus',)):
            pts = [(time, v) for name in family for time, v in self.tr[name].cc[1]]
            top = max(v for _, v in pts)
            inside = [v for time, v in pts if t(41) - 1e-6 <= time < t(42)]
            outside = [v for time, v in pts if not t(41) - 1e-6 <= time < t(42)]
            self.assertEqual(max(inside), top, family)
            self.assertLess(max(outside), top, family)

    # 9
    def test_cc1_curves_and_note_lengths(self):
        for name in CC1_TRACKS:
            pts = self.tr[name].cc.get(1)
            self.assertTrue(pts, f'{name} has no CC1')
            self.assertAlmostEqual(pts[0][0], 0.0, places=6, msg=name)
            self.assertGreater(len({v for _, v in pts}), 2, f'{name} CC1 has no shape')
        for name, track in self.tr.items():
            for number, pts in track.cc.items():
                times = [time for time, _ in pts]
                for a, b in zip(times, times[1:]):
                    self.assertGreaterEqual(b - a, BAR_S / 8 - 1e-6, f'{name} CC{number} too dense')
        for name, limit in MAX_NOTE_S.items():
            for n in self.tr[name].notes:
                self.assertLessEqual(n.end - n.start, limit, f'{name} bar {bar_of(n.start)}')
        for name in ('Violins Trem', 'Basses Trem', 'Violas Trem', 'Violins Sus'):
            self.assertIn(11, self.tr[name].cc, f'{name} needs a CC11 curve')

    # 10
    def test_accents_of_the_ogre_step(self):
        drum_bars = [4] + list(range(5, 16)) + list(range(29, 49)) + list(range(49, 53))
        for bar in drum_bars:
            got = notes_between(self.tr['Bass Drum'], t(bar), t(bar + 1))
            for eighth in (0, 3, 6):
                self.assertTrue(any(abs(n.start - t(bar, eighth)) <= TOL for n in got), f'bass drum bar {bar} {eighth}')
        for bar in list(range(1, 21)) + list(range(29, 33)) + list(range(37, 57)):
            got = notes_between(self.tr['Cellos Spic'], t(bar), t(bar + 1))
            if not got:
                continue
            for n in got:
                eighth = round((n.start - t(bar)) / EIGHTH_S)
                if eighth in (0, 3, 6):
                    self.assertTrue(36 <= n.pitch <= 47, f'ostinato accent bar {bar} eighth {eighth}')
                    later = [m for m in got if m.start > n.start + 0.05]
                    if later:
                        self.assertGreater(n.velocity, later[0].velocity, f'ostinato accent bar {bar}')
        for bar in range(33, 37):
            for n in notes_between(self.tr['Cellos Spic'], t(bar), t(bar + 1)):
                s16 = round((n.start - t(bar)) / SIXTEENTH_S)
                self.assertEqual(36 <= n.pitch <= 47, s16 in (0, 6, 12), f'sixteenth ostinato bar {bar} s{s16}')
        for n in self.tr['Basses Spic'].notes:
            eighth = round((n.start - t(bar_of(n.start))) / EIGHTH_S)
            self.assertIn(eighth, (0, 3, 6), f'basses off the accents at bar {bar_of(n.start)}')

    # craft
    def test_legato_overlaps_in_sustained_melodies(self):
        for name in ('Horns Sustain', 'Trombones Sustain', 'Violins Sus', 'Bass Trombone Sustain'):
            notes = self.tr[name].notes
            joins = 0
            for a in notes:
                nxt = [b for b in notes if 0 < b.start - a.start and abs(b.start - a.end) < 0.04]
                if nxt and all(b.pitch != a.pitch for b in nxt):
                    overlap = a.end - min(b.start for b in nxt)
                    self.assertTrue(0.0095 <= overlap <= 0.0305, f'{name} overlap {overlap * 1000:.1f} ms')
                    joins += 1
            self.assertGreater(joins, 3, name)


if __name__ == '__main__':
    unittest.main()
