"""Acceptance tests for the menu theme score (docs/musica/menu.md, section 8, criteria 1-8).

They read the generated MIDI independently of the checks printed by compose.py.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/menu/test_compose.py
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

BAR_S = 3 * 60 / 108
LOOP_S = 42 * BAR_S

EXPECTED_TRACKS = {
    'Flute Sus': 'FluteSusVib', 'Oboe Sus': 'OboeSusVib', 'Clarinet Sus': 'ClarinetSus',
    'Trompa 1': 'FHornSus', 'Trompa 2': 'FHornSus', 'Timpani': 'Timpani',
    'Timpani Roll': 'TimpaniRolls', 'Cymbal': 'GM-StylePerc', 'Glockenspiel': 'Glockenspiel',
    'Harp': 'Harp', 'Violins Sus': 'ViolinEnsSusVib', 'Violins Sus Quiet': 'ViolinEnsSusVib-Quiet',
    'Violas Sus': 'ViolaEnsSusVib', 'Violas Sus Quiet': 'ViolaEnsSusVib-Quiet',
    'Violas Pizz': 'ViolaEnsPizz', 'Violas Trem': 'ViolaEnsTrem', 'Cellos Sus': 'CelloEnsSusVib',
    'Cellos Sus Quiet': 'CelloEnsSusVib-Quiet', 'Basses Pizz': 'ContrabassPizz',
    'Basses Sus': 'ContrabassSusVB',
}

MOTIF = [62, 69, 71, 69, 66, 67, 66, 64, 62]
SECTIONS = [(1, 4, 4), (5, 12, 6), (13, 20, 7), (21, 28, 5), (29, 32, 8), (33, 40, 10), (41, 42, 5)]


def bar_start(bar):
    return (bar - 1) * BAR_S


def pitches_in(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - 0.02, bar_start(last_bar + 1) - 0.02
    return [n.pitch for n in track.notes if lo <= n.start < hi]


class MenuScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'menu.mid')
        compose.write_midi(cls.path)
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)

    def test_one_named_track_per_instrument(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks]
        self.assertEqual(sorted(names), sorted(EXPECTED_TRACKS))
        self.assertEqual(set(compose.SFZ_OF), set(EXPECTED_TRACKS))
        for name, patch in EXPECTED_TRACKS.items():
            self.assertEqual(os.path.basename(compose.SFZ_OF[name]), patch + '.sfz')

    def test_tempo_meter_and_length(self):
        tempos = [m for tr in self.mid.tracks for m in tr if m.type == 'set_tempo']
        sigs = [m for tr in self.mid.tracks for m in tr if m.type == 'time_signature']
        self.assertEqual(len(tempos), 1)
        self.assertAlmostEqual(mido.tempo2bpm(tempos[0].tempo), 108, places=2)
        self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(3, 4)])
        first = self.mid.tracks[0]
        self.assertTrue(any(m.type == 'set_tempo' for m in first))
        for tr in self.mid.tracks:
            self.assertEqual(sum(m.time for m in tr), 42 * 3 * self.mid.ticks_per_beat)

    def test_notes_inside_the_loop(self):
        for track in self.song.tracks.values():
            for n in track.notes:
                self.assertLess(n.start, LOOP_S, track.name)
                self.assertLess(n.end, LOOP_S, track.name)

    def test_instrument_ranges_and_ceilings(self):
        ceilings = {'Violins Sus': 86, 'Violins Sus Quiet': 86, 'Flute Sus': 86,
                    'Trompa 1': 71, 'Trompa 2': 71}
        for name, track in self.song.tracks.items():
            inst = sfz.load(library('VSCO-2-CE', EXPECTED_TRACKS[name] + '.sfz'))
            keys = {k for r in inst.regions for k in range(r.lokey, r.hikey + 1)}
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch}')
                self.assertLessEqual(n.pitch, ceilings.get(name, 127), name)
                if name == 'Glockenspiel':
                    self.assertTrue(78 <= n.pitch <= 88)

    def test_leitmotif_in_the_four_places(self):
        t = self.song.tracks
        self.assertEqual(pitches_in(t['Trompa 1'], 5, 8), MOTIF)
        self.assertEqual(pitches_in(t['Violins Sus'], 13, 16), [p + 12 for p in MOTIF])
        self.assertEqual(pitches_in(t['Clarinet Sus'], 21, 24), [59, 66, 67, 66, 62, 64, 62, 61, 61, 59])
        self.assertEqual(pitches_in(t['Violins Sus'], 33, 36), [p + 12 for p in MOTIF])
        self.assertEqual(pitches_in(t['Flute Sus'], 33, 36)[:9], [p + 12 for p in MOTIF])

    def test_velocities_and_climax(self):
        for track in self.song.tracks.values():
            self.assertLessEqual(max(n.velocity for n in track.notes), 105, track.name)
        lo, hi = bar_start(37) - 0.02, bar_start(38) - 0.02
        for family in (['Violins Sus', 'Violins Sus Quiet'], ['Trompa 1', 'Trompa 2'],
                       ['Timpani', 'Timpani Roll']):
            notes = [n for name in family for n in self.song.tracks[name].notes]
            top = max(n.velocity for n in notes)
            self.assertTrue(all(lo <= n.start < hi for n in notes if n.velocity == top), family)

    def test_layers_per_section(self):
        for first, last, limit in SECTIONS:
            lo, hi = bar_start(first), bar_start(last + 1)
            times = sorted({max(lo, min(hi, x)) for tr in self.song.tracks.values()
                            for n in tr.notes for x in (n.start, n.end)} | {lo})
            worst = 0
            for a, b in zip(times, times[1:]):
                mid = (a + b) / 2
                if not lo <= mid < hi:
                    continue
                worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes)
                                       for tr in self.song.tracks.values()))
            self.assertLessEqual(worst, limit, f'bars {first}-{last}')


if __name__ == '__main__':
    unittest.main()
