"""Acceptance tests for the main-menu theme «Brasas» (docs/musica/menu-brasas.md).

They read the generated MIDI (score criteria 1-12 of section 8, plus the craft rules of the
orchestration brief: patch durations, CC density, no 2-bar phrase repeated more than twice)
independently of the checks that compose.py prints.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/menu-brasas/test_compose.py
"""
import os
import sys
import tempfile
import unittest

import mido
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import compose  # noqa: E402
from estudio import midi_io, sfz  # noqa: E402
from estudio.config import library  # noqa: E402

BPM = 84
BEAT_S = 60 / BPM
BAR_S = 4 * BEAT_S                     # 2.857 s
EIGHTH_S = BEAT_S / 2
BARS = 28
LOOP_S = BARS * BAR_S                  # 80.000 s
ONSET_TOL = 0.045                      # humanization (8 ms) + legato overlaps (30 ms) + margin

S = 'Sonatina Symphonic Orchestra'
EXPECTED_TRACKS = {
    'Celesta': ('sso', S, 'Percussion', 'Celeste.sfz'),
    'Flauta alto': ('sso', S, 'Woodwinds - Performance', 'Alto Flute Solo Sustain.sfz'),
    'Violín solista': ('sso', S, 'Strings - Performance', 'Violin Solo 1 Sustain.sfz'),
    'Arpa': ('sso', S, 'Concert Harp.sfz'),
    'Coro': ('sso', S, 'Chorus - Performance', 'Mixed Chorus.sfz'),
    'Armónicos': ('sso', S, 'Strings - Performance', '1st Violins Harmonics.sfz'),
    'Clarinete': ('VSCO-2-CE', 'ClarinetSus.sfz'),
    'Trompa': ('VSCO-2-CE', 'FHornSus.sfz'),
    'Violas pp': ('VSCO-2-CE', 'ViolaEnsSusVib-Quiet.sfz'),
    'Violas trém': ('VSCO-2-CE', 'ViolaEnsTrem.sfz'),
    'Violas': ('VSCO-2-CE', 'ViolaEnsSusVib.sfz'),
    'Chelos pp': ('VSCO-2-CE', 'CelloEnsSusVib-Quiet.sfz'),
    'Chelos pizz': ('VSCO-2-CE', 'CelloEnsPizz.sfz'),
    'Chelos': ('VSCO-2-CE', 'CelloEnsSusVib.sfz'),
    'Contrabajos': ('VSCO-2-CE', 'ContrabassSusVB.sfz'),
    'Glockenspiel': ('VSCO-2-CE', 'Glockenspiel.sfz'),
    'Copas': ('VCSL', 'Idiophones', 'Friction Idiophones', 'Wine Glasses - Slow.sfz'),
    'Timbal redoble': ('VSCO-2-CE', 'TimpaniRolls.sfz'),
    'Timbal': ('VSCO-2-CE', 'Timpani.sfz'),
    'Plato': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Suspended Cymbal 2.sfz'),
    'Mark Trees': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Mark Trees.sfz'),
}
CC1_TRACKS = ('Flauta alto', 'Violín solista', 'Coro', 'Armónicos')   # Sonatina, dynamics on CC1
VELOCITY_SONATINA = ('Celesta', 'Arpa')                                # Sonatina, dynamics on velocity
UNPITCHED = ('Plato', 'Mark Trees')

# Criterion 2: floors and ceilings (MIDI) per track.
REGISTER = {
    'Violín solista': (69, 82), 'Flauta alto': (57, 82), 'Celesta': (69, 94), 'Clarinete': (60, 74),
    'Trompa': (52, 67), 'Coro': (52, 81), 'Armónicos': (79, 91), 'Glockenspiel': (81, 90),
    'Copas': (77, 86), 'Arpa': (38, 84), 'Chelos': (38, 55), 'Chelos pp': (38, 55),
    'Chelos pizz': (38, 55), 'Contrabajos': (27, 43), 'Violas': (52, 62), 'Violas pp': (52, 62),
    'Violas trém': (52, 62),
}

# Section 4: chord symbol and bass pitch class on beats 1 and 3 of every bar.
C, Db, D, Eb, E, F, G, A, Bb, B = 0, 1, 2, 3, 4, 5, 7, 9, 10, 11
HARMONY = {
    1: ('Dm(add9)', D, D), 2: ('Bbmaj7(#11)/D | A7sus4', D, D), 3: ('Dm(add9)', D, D),
    4: ('Bbmaj7', Bb, Bb), 5: ('Gm(add9) | Gm6', G, G), 6: ('A7sus4 | A7', A, A),
    7: ('Dm(add9) | Dm/C', D, C), 8: ('Bbmaj7 | G7/B', Bb, B), 9: ('C7sus4 | C7', C, C),
    10: ('F(add9)', F, F), 11: ('Gm9 | C9sus4', G, C), 12: ('F/A | Bbm6', A, Bb),
    13: ('Dm7 | C7', D, C), 14: ('F(add9) | A7(b9)', F, A), 15: ('Bbmaj7(#11)', Bb, Bb),
    16: ('Gm(add9)', G, G), 17: ('Ebmaj7(#11)', Eb, Eb), 18: ('A7sus4 | A7(b9)', A, A),
    19: ('Dm(add9) | A7/E', D, E), 20: ('Dm/F | Gm9', F, G), 21: ('Bbmaj7(#11)', Bb, Bb),
    22: ('A7sus4 | A7(b9)', A, A), 23: ('D(add9)', D, D), 24: ('G/D | Gm6/D', D, D),
    25: ('Dm(add9)', D, D), 26: ('Gm(add9)/D', D, D), 27: ('Ebmaj7(#11)/D', D, D), 28: ('A7sus4', A, A),
}


def seq(pairs, start=0.0):
    """[(pitch, beats)] → [(pitch, onset in beats from the phrase start, beats)]."""
    out, at = [], start
    for p, d in pairs:
        out.append((p, at, d))
        at += d or 0
    return out


def q(*pitches):
    return [(p, 1) for p in pitches]


MOTIF_A = q(62, 65, 64, 57, 62, 65, 67, 69) + [(70, 2), (69, 1), (64, 1), (62, 3)]
RETURN = q(74, 77, 76, 69, 74, 77, 79, 81) + [(82, 2), (81, 1), (76, 1), (74, 2), (73, 2)]
# Section 5: (track, first bar, last bar, expected [(pitch, onset beats, beats)]).
LEITMOTIF = [
    ('Celesta', 2, 2, seq(q(86, 82, 84, 91))),
    ('Flauta alto', 3, 6, seq(MOTIF_A)),
    ('Celesta', 3, 6, seq([(p + 12, d) for p, d in MOTIF_A])),
    ('Violín solista', 7, 10, seq([(74, 1.5), (77, .5), (76, 1), (69, 1)] + q(74, 77, 79, 81)
                                  + [(82, 2), (81, 1), (79, 1), (77, 3)])),
    ('Celesta', 7, 10, [(p, 4 * k + off, .5) for k, pair in enumerate([(86, 88), (86, 91), (94, 93), (89, 84)])
                        for p, off in zip(pair, (1.5, 3.5))]),
    ('Clarinete', 11, 14, seq([(65, 1.5), (69, .5), (67, 1), (60, 1), (65, 1.5), (69, .5), (70, 1), (72, 1),
                               (74, 2), (72, 1), (67, 1), (65, 2), (64, 2)])),
    ('Violín solista', 15, 15, seq(q(74, 77, 76, 69))),
    ('Flauta alto', 16, 16, seq(q(67, 70, 69, 62))),
    ('Celesta', 16, 16, seq(q(79, 82, 81, 74))),
    ('Violín solista', 17, 18, seq([(79, 2), (82, 2), (81, 2), (74, 1), (73, 1)])),
    ('Flauta alto', 17, 18, seq([(67, 2), (70, 2), (69, 2), (62, 1), (61, 1)])),
    ('Violín solista', 19, 22, seq(RETURN)),
    ('Flauta alto', 19, 22, seq(RETURN)),
    ('Violín solista', 23, 25, seq([(74, 4), (71, 2), (70, 2), (69, 3)])),
    ('Flauta alto', 23, 23, seq([(66, 3)])),
    ('Celesta', 24, 24, seq([(83, 2), (82, 2)])),
    ('Celesta', 25, 26, seq([(p, .5) for p in (74, 77, 76, 69, 74, 77, 79, 81, 82, 81, 79, 76)] + [(74, 2)])),
    ('Flauta alto', 27, 28, seq([(62, 2), (65, 2), (64, 2), (57, None)])),   # last A3 breathes before 79.6 s
]

# Tracks that carry the section-5 melody in each bar (criterion 7) and the one with the highest
# section-5 note (criterion 4).
MELODY_GROUP = {2: ('Celesta',), **{b: ('Flauta alto', 'Celesta') for b in range(3, 7)},
                **{b: ('Violín solista', 'Celesta') for b in range(7, 11)},
                **{b: ('Clarinete',) for b in range(11, 15)}, 15: ('Violín solista',),
                16: ('Flauta alto', 'Celesta'), **{b: ('Violín solista', 'Flauta alto') for b in range(17, 24)},
                24: ('Violín solista', 'Celesta'), 25: ('Violín solista', 'Celesta'), 26: ('Celesta',),
                27: ('Flauta alto',), 28: ('Flauta alto',)}
DECLARED = {10: ('Copas',)}            # copas in unison with the violin's F5 (bar 10)
SECTIONS = [(1, 2, 7), (3, 6, 8), (7, 10, 9), (11, 14, 6), (15, 18, 12), (19, 24, 12), (25, 28, 8)]
MAX_NOTE_S = {'Flauta alto': 2.8, 'Violín solista': 5.0, 'Coro': 2 * BAR_S + 0.05, 'Armónicos': 4 * BAR_S + 0.05,
              'Clarinete': 8.0, 'Trompa': 7.0, 'Violas pp': 7.0, 'Violas': 7.0, 'Chelos pp': 6.0, 'Chelos': 6.0,
              'Contrabajos': 6.0, 'Copas': 11.0, 'Timbal redoble': 16.0}
VEL_TABLE = ([25, 40, 55, 70, 85, 92], [0, 1, 2, 3, 4, 5])        # section 7: pp p mp mf f
CC1_TABLE = ([40, 55, 70, 85, 95, 100], [0, 1, 2, 3, 4, 5])


def t(bar, beat=1.0):
    return (bar - 1) * BAR_S + (beat - 1) * BEAT_S


def bar_of(seconds):
    return int((seconds + ONSET_TOL) // BAR_S) + 1


def half(x):
    return round(x * 2) / 2


def phrase(track, first, last):
    lo = t(first)
    notes = [n for n in track.notes if lo - ONSET_TOL <= n.start < t(last + 1) - ONSET_TOL]
    return [(n.pitch, half((n.start - lo) / BEAT_S), half((n.end - n.start) / BEAT_S)) for n in notes]


def cc_at(track, num, when):
    pts = track.cc.get(num, [])
    if not pts:
        return None
    return float(np.interp(when, [p[0] for p in pts], [p[1] for p in pts]))


class MenuBrasasScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'menu-brasas.mid')
        compose.write_midi(cls.path)
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)
        cls.tracks = cls.song.tracks

    def level(self, name, note, when):
        """Dynamic level on the section-7 scale (0 = pp floor … 5 = f ceiling)."""
        if name in CC1_TRACKS:
            return float(np.interp(cc_at(self.tracks[name], 1, when), *CC1_TABLE))
        return float(np.interp(note.velocity, *VEL_TABLE))

    def sounding(self, name, when):
        return [n for n in self.tracks[name].notes if n.start <= when < n.end]

    # ── criterion 1 and track layout ─────────────────────────────────────────
    def test_one_named_track_per_instrument_and_articulation(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks]
        self.assertEqual(sorted(names), sorted(EXPECTED_TRACKS))
        self.assertEqual(set(compose.SFZ_OF), set(EXPECTED_TRACKS))
        for name, parts in EXPECTED_TRACKS.items():
            self.assertEqual(compose.SFZ_OF[name], library(*parts), name)
            self.assertTrue(os.path.exists(compose.SFZ_OF[name]), compose.SFZ_OF[name])

    def test_1_tempo_meter_and_length(self):
        tempos = [m for tr in self.mid.tracks for m in tr if m.type == 'set_tempo']
        sigs = [m for tr in self.mid.tracks for m in tr if m.type == 'time_signature']
        self.assertEqual(len(tempos), 1)
        self.assertTrue(any(m.type == 'set_tempo' for m in self.mid.tracks[0]))
        self.assertAlmostEqual(mido.tempo2bpm(tempos[0].tempo), BPM, places=3)
        self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(4, 4)])
        for tr in self.mid.tracks:
            self.assertEqual(sum(m.time for m in tr), BARS * 4 * self.mid.ticks_per_beat)
        self.assertAlmostEqual(LOOP_S, 80.0, places=9)

    def test_1_notes_inside_the_loop(self):
        for name, track in self.tracks.items():
            for n in track.notes:
                self.assertGreaterEqual(n.start, 0.0, name)
                self.assertLess(n.start, LOOP_S, name)
                self.assertLess(n.end, LOOP_S, name)

    # ── criterion 2 ──────────────────────────────────────────────────────────
    def test_2_ranges_of_patch_and_registers(self):
        for name, track in self.tracks.items():
            inst = sfz.load(compose.SFZ_OF[name])
            keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                    for k in range(r.lokey, r.hikey + 1)}
            lo, hi = REGISTER.get(name, (0, 127))
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch} outside its patch')
                self.assertTrue(lo <= n.pitch <= hi, f'{name} {n.pitch} outside {lo}-{hi}')
        for n in self.tracks['Coro'].notes:
            if bar_of(n.start) in list(range(11, 15)) + list(range(19, 25)):
                self.assertLessEqual(n.pitch, 69, f'choir above A4 in bar {bar_of(n.start)}')
            if 11 <= bar_of(n.start) <= 14:
                self.assertLess(n.pitch, 67, 'choir in B is all male (below G4)')

    # ── criterion 3 ──────────────────────────────────────────────────────────
    def test_3_leitmotif_transformations(self):
        for name, first, last, want in LEITMOTIF:
            got = phrase(self.tracks[name], first, last)
            label = f'{name} bars {first}-{last}'
            self.assertEqual([g[:2] for g in got], [w[:2] for w in want], label)
            for g, w in zip(got, want):
                if w[2] is not None:
                    self.assertEqual(g[2], w[2], f'{label}: figure of {g}')
        a3 = [n for n in self.tracks['Flauta alto'].notes if n.start > t(28, 2.9)]
        self.assertEqual([n.pitch for n in a3], [57])
        self.assertLess(a3[0].end, 79.6)
        self.assertGreaterEqual(a3[0].end - a3[0].start, 1.25 * BEAT_S)

    # ── criterion 4 ──────────────────────────────────────────────────────────
    def test_4_no_identical_four_bar_window_of_the_melody(self):
        def top_track(bar):
            group = MELODY_GROUP.get(bar, ())
            best = None
            for name in group:
                notes = [n for n in self.tracks[name].notes if bar_of(n.start) == bar]
                if notes and (best is None or max(n.pitch for n in notes) > best[1]):
                    best = (name, max(n.pitch for n in notes))
            return best[0] if best else None

        def bar_sig(bar):
            name = top_track(bar)
            notes = phrase(self.tracks[name], bar, bar) if name else []
            return HARMONY[bar][0], tuple(notes)

        sigs = [tuple(bar_sig((b + k - 1) % BARS + 1) for k in range(4)) for b in range(1, BARS + 1)]
        self.assertEqual(len(set(sigs)), len(sigs))

    # ── criterion 5 ──────────────────────────────────────────────────────────
    def test_5_nothing_shorter_than_an_eighth(self):
        gliss = (t(18, 4) - 0.02, t(19) - 0.02)
        for name, track in self.tracks.items():
            for n in track.notes:
                if name == 'Arpa' and gliss[0] <= n.start < gliss[1]:
                    continue
                self.assertGreaterEqual(n.end - n.start, EIGHTH_S - 0.06, f'{name} {n.pitch} at {n.start:.2f}')
            onsets = sorted({round(n.start, 4) for n in track.notes})
            for a, b in zip(onsets, onsets[1:]):
                if b - a >= EIGHTH_S - 0.03:
                    continue
                in_gliss = name == 'Arpa' and gliss[0] <= a < gliss[1]
                rolled = name == 'Arpa' and b - a <= 0.060 + 0.002
                chord_jitter = b - a <= 0.017                # two humanized notes of the same chord
                self.assertTrue(in_gliss or rolled or chord_jitter, f'{name}: onsets {a:.3f} {b:.3f}')

    # ── criterion 6 ──────────────────────────────────────────────────────────
    def test_6_layers_per_section(self):
        for first, last, limit in SECTIONS:
            lo, hi = t(first), t(last + 1)
            cuts = sorted({lo} | {min(hi, max(lo, x)) for tr in self.tracks.values()
                                  for n in tr.notes for x in (n.start, n.end)})
            worst = 0
            for a, b in zip(cuts, cuts[1:]):
                if b <= a:
                    continue
                mid = (a + b) / 2
                worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes) for tr in self.tracks.values()))
            self.assertLessEqual(worst, limit, f'bars {first}-{last}')

    # ── criterion 7 ──────────────────────────────────────────────────────────
    def test_7_no_register_clash_with_the_melody(self):
        clashes = []
        for bar, group in MELODY_GROUP.items():
            melody = [(name, n) for name in group for n in self.tracks[name].notes if bar_of(n.start) == bar]
            for other, track in self.tracks.items():
                if other in group or other in DECLARED.get(bar, ()):
                    continue
                for x in track.notes:
                    if x.end - x.start < BEAT_S - 0.06:
                        continue
                    for mname, m in melody:
                        a, b = max(m.start, x.start) + 0.02, min(m.end, x.end) - 0.02
                        if b - a <= 0.02 or abs(m.pitch - x.pitch) > 11:
                            continue
                        for when in np.arange(a, b, 0.05):
                            mel = max(self.level(g, n, when) for g in group for n in self.sounding(g, when))
                            if self.level(other, x, when) >= mel:
                                clashes.append(f'{other} {x.pitch} vs {mname} {m.pitch} bar {bar}')
                                break
        self.assertEqual(clashes, [])

    def test_7_choir_15_below_the_flute_in_a(self):
        flute, choir = self.tracks['Flauta alto'], self.tracks['Coro']
        for n in flute.notes:
            if 3 <= bar_of(n.start) <= 6:
                for when in np.arange(n.start + 0.01, n.end - 0.04, 0.05):
                    if self.sounding('Coro', when):
                        self.assertLessEqual(cc_at(choir, 1, when), cc_at(flute, 1, when) - 15, f'{when:.2f} s')

    # ── criterion 8 ──────────────────────────────────────────────────────────
    def test_8_dynamics_ceiling_and_single_climax(self):
        for name, track in self.tracks.items():
            self.assertLessEqual(max(n.velocity for n in track.notes), 92, name)
            for v in track.cc.get(1, []):
                self.assertLessEqual(v[1], 100, name)
        lo, hi = t(21) - 0.02, t(22) - 0.02
        for name in ('Violín solista', 'Flauta alto', 'Coro'):
            pts = self.tracks[name].cc[1]
            top = max(v for _, v in pts)
            self.assertTrue(all(lo <= w < hi for w, v in pts if v == top), name)
        for family in (('Trompa',), ('Chelos', 'Chelos pp', 'Chelos pizz'), ('Timbal', 'Timbal redoble')):
            notes = [n for f in family for n in self.tracks[f].notes]
            top = max(n.velocity for n in notes)
            self.assertTrue(all(lo <= n.start < hi for n in notes if n.velocity == top), family)

    # ── criterion 9 ──────────────────────────────────────────────────────────
    def test_9_cc1_curves_and_note_lengths(self):
        for name in CC1_TRACKS:
            pts = self.tracks[name].cc.get(1, [])
            self.assertTrue(pts and pts[0][0] == 0.0, f'{name}: CC1 at tick 0')
            times = [w for w, _ in pts]
            self.assertTrue(all(b - a >= EIGHTH_S - 1e-3 for a, b in zip(times, times[1:])), name)
        for name in VELOCITY_SONATINA:
            self.assertTrue(all(v == 100 for _, v in self.tracks[name].cc.get(1, [])), name)
        for name, limit in MAX_NOTE_S.items():
            longest = max(n.end - n.start for n in self.tracks[name].notes)
            self.assertLessEqual(longest, limit, name)

    def test_9_cc11_density_on_vsco(self):
        for name, track in self.tracks.items():
            times = [w for w, _ in track.cc.get(11, [])]
            self.assertTrue(all(b - a >= BAR_S / 8 - 1e-3 for a, b in zip(times, times[1:])), name)

    # ── criterion 10 ─────────────────────────────────────────────────────────
    def test_10_sparkles_and_percussion_counted(self):
        tr = self.tracks
        marks = tr['Mark Trees'].notes
        self.assertEqual([(n.pitch, bar_of(n.start)) for n in marks], [(60, 1), (60, 23)])
        self.assertEqual(len(tr['Glockenspiel'].notes), 6)
        self.assertEqual(sorted(bar_of(n.start) for n in tr['Glockenspiel'].notes), [5, 6, 9, 10, 21, 23])
        self.assertEqual([(n.pitch, bar_of(n.start)) for n in tr['Timbal'].notes], [(38, 19), (46, 21)])
        roll = tr['Timbal redoble'].notes
        self.assertEqual(len(roll), 1)
        self.assertAlmostEqual(roll[0].start, t(17), delta=0.02)
        self.assertLessEqual(roll[0].end, t(19) + 0.02)
        self.assertGreater(roll[0].end, t(18, 4))
        cymbal = tr['Plato'].notes
        self.assertEqual(len(cymbal), 1)
        self.assertEqual(cymbal[0].pitch, 63)
        peak = cymbal_peak_seconds()
        self.assertAlmostEqual(cymbal[0].start + peak, t(19), delta=0.05)
        self.assertGreater(cymbal[0].start, t(18, 1))

    # ── criterion 11 ─────────────────────────────────────────────────────────
    def test_11_bass_line_of_section_4(self):
        for bar, (_, b1, b3) in HARMONY.items():
            for beat, pc in ((1, b1), (3, b3)):
                when = t(bar, beat) + ONSET_TOL
                low = [n.pitch for name in self.tracks if name not in UNPITCHED for n in self.sounding(name, when)]
                self.assertTrue(low, f'bar {bar} beat {beat}: nothing sounds')
                self.assertEqual(min(low) % 12, pc, f'bar {bar} beat {beat}: lowest {min(low)}')
                harp = [n.pitch for n in self.sounding('Arpa', when) if n.pitch < 60]
                if harp:
                    self.assertEqual(min(harp) % 12, pc, f'harp bar {bar} beat {beat}: {min(harp)}')
        examples = [(8, 3, 47), (17, 1, Eb), (21, 1, Bb), (28, 1, 45)]
        for bar, beat, want in examples:
            harp = min(n.pitch for n in self.sounding('Arpa', t(bar, beat) + ONSET_TOL))
            self.assertEqual(harp if want > 11 else harp % 12, want, f'harp bar {bar}')

    # ── criterion 12 ─────────────────────────────────────────────────────────
    def test_12_breaths_on_beat_4_of_bars_6_and_10(self):
        for bar, names in ((6, ('Flauta alto', 'Celesta')), (10, ('Violín solista',))):
            lo, hi = t(bar, 4) + 0.03, t(bar + 1)
            for name in names:
                self.assertFalse([n for n in self.tracks[name].notes if n.start < hi and n.end > lo],
                                 f'{name} sounds in beat 4 of bar {bar}')

    # ── craft: development ───────────────────────────────────────────────────
    def test_no_two_bar_phrase_repeated_more_than_twice(self):
        for name, track in self.tracks.items():
            seen = {}
            for bar in range(1, BARS):
                sig = tuple(phrase(track, bar, bar + 1))
                if len(sig) >= 2:
                    seen.setdefault(sig, []).append(bar)
            for sig, bars in seen.items():
                self.assertLessEqual(len(bars), 2, f'{name} bars {bars}')

    def test_loop_seam_is_a_dominant_resolving_to_the_tonic(self):
        last = [n.pitch % 12 for tr in self.tracks.values() for n in tr.notes if bar_of(n.start) == 28]
        first = [n.pitch % 12 for tr in self.tracks.values() for n in tr.notes if bar_of(n.start) == 1]
        self.assertIn(A, last)
        self.assertNotIn(F, last)
        self.assertIn(D, first)


def cymbal_peak_seconds():
    """RMS (100 ms) peak of the crescendo sample of key 63, counted from its sfz offset."""
    inst = sfz.load(compose.SFZ_OF['Plato'])
    region = next(r for r in inst.regions if r.lokey <= 63 <= r.hikey)
    y, sr = sf.read(region.sample_path)
    y = y if y.ndim == 1 else y.mean(axis=1)
    y = y[int(region.num('offset', 0)):]
    w = int(0.1 * sr)
    return float(np.argmax(np.convolve(y ** 2, np.ones(w) / w, 'same')) / sr)


if __name__ == '__main__':
    unittest.main()
