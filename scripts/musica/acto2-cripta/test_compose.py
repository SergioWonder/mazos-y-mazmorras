"""Acceptance tests for «La Cripta» — «Nana para los que no duermen» (docs/musica/acto2-cripta.md,
section 8, criteria 1-12, plus the synchrony rules of section 2 and the craft rules of the
orchestration brief: humanization, legato, voice leading, development and the loop seam).

They read the two generated MIDI files (exploration and combat) independently of the checks that
compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto2-cripta/test_compose.py
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

BPM = 72
BEAT_S = 60 / BPM
BAR_S = 4 * BEAT_S
BARS = 24
LOOP_S = BARS * BAR_S                     # 80.000 s
E8 = BEAT_S / 2
S16 = BEAT_S / 4
TOL = 0.012                               # seconds: humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

VSCO = 'VSCO-2-CE/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
VCSL = 'VCSL/'
COMMON_TRACKS = {
    'Low Trem': SSO + 'Strings - Performance/Basses Tremolo.sfz',
    'Bell': VCSL + 'Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
    'Gong': VCSL + 'Idiophones/Struck Idiophones/Gong 1.sfz',
    'Col Legno Vc': SSO + 'Strings - Performance/Celli Col Legno.sfz',
}
BOTH = {
    **COMMON_TRACKS,
    'Choir': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Piano Cluster': VCSL + 'Chordophones/Zithers/Upright Piano, Knight.sfz',
    'Timpani': VSCO + 'Timpani.sfz',
    'Timp Roll': VSCO + 'TimpaniRolls.sfz',
}
EXPECTED = {
    'explora': {
        **BOTH,
        'Vibes Bowed': VCSL + 'Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz',
        'Alto Flute': SSO + 'Woodwinds - Performance/Alto Flute Solo Sustain.sfz',
        'Bass Clarinet': SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain.sfz',
        'Cello Solo': SSO + 'Strings - Performance/Cello Solo Sustain.sfz',
        'Celesta': SSO + 'Percussion/Celeste.sfz',
        'Harp': VCSL + 'Chordophones/Composite Chordophones/Concert Harp.sfz',
        'Basses': VSCO + 'ContrabassSusVB.sfz',
        'Basses Quiet': VSCO + 'ContrabassSusVB-Quiet.sfz',
        'Glass': VCSL + 'Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz',
        'Hand Chimes': VCSL + 'Idiophones/Struck Idiophones/Hand Chimes.sfz',
    },
    'combate': {
        **BOTH,
        'Choir Melody': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
        'Horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
        'Trombones': SSO + 'Brass - Performance/Trombones Sustain (looped).sfz',
        'Violins': VSCO + 'ViolinEnsSusVib.sfz',
        'Violins Trem': VSCO + 'ViolinEnsTrem.sfz',
        'Violas Trem': VSCO + 'ViolaEnsTrem.sfz',
        'Xylophone': VCSL + 'Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz',
        'Cellos Spic': VSCO + 'CelloEnsSpic.sfz',
        'Basses Spic': VSCO + 'ContrabassSpic.sfz',
        'Col Legno Vn': SSO + 'Strings - Performance/1st Violins Col Legno.sfz',
        'Bass Drum': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    },
}
UNPITCHED = {'Gong', 'Bass Drum'}
CC1_TRACKS = {'Alto Flute', 'Bass Clarinet', 'Cello Solo', 'Choir', 'Choir Melody', 'Low Trem', 'Horns', 'Trombones'}
VELOCITY_SONATINA = {'Celesta', 'Col Legno Vc', 'Col Legno Vn'}
CC11_TRACKS = {'Basses', 'Basses Quiet', 'Violins', 'Violins Trem', 'Violas Trem', 'Timp Roll'}
MAX_NOTE_S = {'Alto Flute': 2.8, 'Bass Clarinet': 2.5, 'Horns': 2.8, 'Vibes Bowed': 9.0, 'Glass': 20.0,
              'Basses': 6.0, 'Basses Quiet': 6.0, 'Violins': 8.5, 'Violins Trem': 7.0, 'Violas Trem': 7.0,
              'Timp Roll': 16.0}
SECTIONS = [('intro', 1, 2), ('A', 3, 6), ("A'", 7, 10), ('B', 11, 14), ('bridge', 15, 18),
            ('return', 19, 22), ('codetta', 23, 24)]
LAYERS = {'explora': [6, 8, 8, 6, 8, 10, 7], 'combate': [8, 11, 12, 7, 11, 12, 9]}
# The bowed vibraphone speaks late: its notes are written early (section 6, sample notes).
ANTICIPATION = {'Vibes Bowed': (0.120, 0.080),       # (quarter or longer, eighth)
                'Glass': (0.150, 0.150)}             # the glass swell starts 150 ms early

# ── harmony of section 4 (common): bar -> [(beat, bass pitch class, chord pitch classes)] ──
A, Bb, B, C, Cs, D, Eb, E, F, Fs, G, Gs = 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8
HARMONY = {
    1: [(1, A, {A, C, E, B})],
    2: [(1, A, {F, A, C, E, B}), (3, Gs, {E, Gs, B, D, F})],
    3: [(1, A, {A, C, E}), (3, F, {F, A, C, Eb})],
    4: [(1, E, {E, Gs, B, D, C}), (3, E, {E, Gs, B, D})],
    5: [(1, A, {A, C, E}), (3, Bb, {Bb, D, F}), (4, E, {E, Gs, B, D})],
    6: [(1, A, {A, C, E}), (3, G, {A, C, E, G})],
    7: [(1, F, {D, F, A}), (3, Bb, {Bb, D, F, Gs})],
    8: [(1, A, {A, Cs, E, G, F}), (3, A, {A, Cs, E, G})],
    9: [(1, D, {D, F, A, C, E}), (3, G, {G, B, D, F})],
    10: [(1, C, {C, E, G, B}), (3, Bb, {C, E, G, Bb})],
    11: [(1, A, {F, A, C, G})],
    12: [(1, F, {F, A, C, E, B})],
    13: [(1, D, {D, F, A, C, E}), (3, Bb, {Bb, D, F, G})],
    14: [(1, E, {E, A, B, D}), (3, E, {E, Gs, B, D, F})],
    15: [(1, A, {A, C, E})],
    16: [(1, C, {C, Eb, G})],
    17: [(1, Eb, {Eb, Fs, Bb})],
    18: [(1, Fs, {Fs, A, C, E}), (3, E, {E, Gs, B, D, F})],
    19: [(1, A, {A, C, E, B}), (3, F, {F, A, C, Eb, B})],
    20: [(1, F, {D, F, A, C}), (3, Gs, {E, Gs, B, D, F})],
    21: [(1, F, {F, A, C, E}), (3, Bb, {Bb, D, F}), (4, E, {E, Gs, B, D})],
    22: [(1, A, {A, C, E}), (3, A, {D, F, A})],
    23: [(1, A, {A, C, E}), (3, A, {Bb, D, F, A})],
    24: [(1, E, {E, A, B, D}), (3, E, {E, Gs, B, D, F})],
}
# Passing bass notes on beat 2 (documented in compose.py): they keep the bass from moving in fifths
# (bar 5: E5-F5 over A-Bb) and octaves (bar 10: C5-Bb4 over C-Bb) with the tune.
PASSING_BASS = {(5, 2): C, (10, 2): G}


def segment(bar, beat):
    seg = HARMONY[bar][0]
    for s in HARMONY[bar]:
        if s[0] <= beat + 1e-9:
            seg = s
    return seg


def bass_at(bar, beat):
    return segment(bar, beat)[1]


def line_bass_at(bar, beat):
    """Bass pitch class of the written bass line (section 4 plus the passing notes)."""
    for (b, bt), pc in PASSING_BASS.items():
        if b == bar and bt <= beat < bt + 1:
            return pc
    return bass_at(bar, beat)


# ── reference melody of section 5 (identical pitches and written attacks in both versions) ──
def line(bar, items):
    """items: [(pitch, beats)] from beat 1 of `bar` -> [(bar, beat, pitch)]."""
    out, pos = [], 0.0
    for p, beats in items:
        out.append((bar + int(pos // 4), 1 + pos % 4, p))
        pos += beats
    return out


NANA = [(69, .5), (71, .5), (72, 1), (75, 1.5), (76, .5), (72, 1), (71, 1), (68, 2),
        (69, .5), (72, .5), (76, 1), (77, 1), (76, 1), (69, 3)]
REFERENCE = {
    'head 1-2': line(1, [(45, 1), (47, 1), (48, 1), (51, 1), (52, 2)]),
    'nana 3-6': line(3, NANA),
    'sequence 7-8': line(7, [(74, .5), (76, .5), (77, 1), (80, 1.5), (81, .5), (77, 1), (76, 1), (73, 2)]),
    'consequent 9-10': line(9, [(77, 1.5), (76, .5), (74, 1), (71, 1), (72, 2), (70, 1), (67, 1)]),
    'lydian 11-14': line(11, [(65, 1), (67, 1), (69, 2), (71, 3), (72, 1), (69, 2), (67, 2), (64, 4)]),
    'axis 15-16': line(15, [(57, 1), (59, 1), (60, 1), (63, 1), (60, 1), (62, 1), (63, 1), (66, 1)]),
    'axis 17-18': line(17, [(63, 1), (65, 1), (66, 1), (69, 1), (66, .5), (68, .5), (69, 1), (68, 2)]),
    'nana 19-22': line(19, NANA),
    'head 23': line(23, [(69, .5), (71, .5), (72, 3)]),
    'lament 7-10': line(7, [(57, 2), (56, 2), (55, 2), (55, 2), (53, 2), (53, 2), (52, 2), (46, 2)]),
    'counter 19-22': line(19, [(64, 2), (63, 2), (62, 2), (62, 2), (60, 2), (62, 1), (56, 1), (57, 3)]),
    'link 24': line(24, [(52, 2), (44, 2)]),
}
MELODY_LABELS = ['head 1-2', 'nana 3-6', 'sequence 7-8', 'consequent 9-10', 'lydian 11-14', 'axis 15-16',
                 'axis 17-18', 'nana 19-22', 'head 23']
# label -> (carrier track, [(declared doubling, semitones)])
CARRIERS = {
    'explora': {
        'head 1-2': ('Bass Clarinet', []), 'nana 3-6': ('Vibes Bowed', []),
        'sequence 7-8': ('Alto Flute', []), 'consequent 9-10': ('Alto Flute', []),
        'lydian 11-14': ('Cello Solo', []), 'axis 15-16': ('Bass Clarinet', []),
        'axis 17-18': ('Alto Flute', []), 'nana 19-22': ('Alto Flute', [('Vibes Bowed', 0)]),
        'head 23': ('Vibes Bowed', []), 'lament 7-10': ('Bass Clarinet', []),
        'counter 19-22': ('Cello Solo', []), 'link 24': ('Bass Clarinet', []),
    },
    'combate': {
        'head 1-2': ('Horns', []), 'nana 3-6': ('Violins', [('Horns', -12)]),
        'sequence 7-8': ('Violins', [('Xylophone', 0)]), 'consequent 9-10': ('Violins', []),
        'lydian 11-14': ('Horns', []), 'axis 15-16': ('Trombones', []),
        'axis 17-18': ('Horns', [('Violins Trem', 12)]), 'nana 19-22': ('Violins', [('Choir Melody', 0)]),
        'head 23': ('Horns', []), 'lament 7-10': ('Trombones', []),
        'counter 19-22': ('Horns', []), 'link 24': ('Horns', []),
    },
}
# Section-6 registers per track: [(first bar, last bar, lowest, highest)]
REGISTERS = {
    'Vibes Bowed': [(1, 24, 64, 77)], 'Alto Flute': [(1, 24, 63, 81)], 'Bass Clarinet': [(1, 24, 44, 66)],
    'Cello Solo': [(1, 24, 56, 72)], 'Celesta': [(1, 24, 81, 88)], 'Choir': [(1, 24, 43, 55)],
    'Choir Melody': [(19, 22, 68, 77)], 'Violins': [(1, 24, 67, 81)], 'Violins Trem': [(17, 18, 75, 81)],
    'Horns': [(1, 24, 44, 72)], 'Trombones': [(1, 24, 46, 66)], 'Col Legno Vn': [(1, 24, 55, 64)],
    'Glass': [(6, 6, 75, 75)], 'Hand Chimes': [(13, 14, 71, 72)], 'Low Trem': [(1, 24, 33, 50)],
    'Harp': [(1, 10, 32, 64), (11, 14, 32, 81), (15, 18, 32, 60), (19, 24, 32, 64)],
    'Basses': [(15, 22, 28, 39)], 'Basses Quiet': [(1, 10, 28, 39), (23, 24, 28, 39)],
    'Col Legno Vc': [(4, 20, 40, 54)], 'Bell': [(1, 24, 64, 69)], 'Piano Cluster': [(15, 15, 33, 34)],
    'Timpani': [(1, 24, 36, 55)], 'Timp Roll': [(17, 18, 39, 40)], 'Xylophone': [(7, 8, 73, 81)],
    'Cellos Spic': [(1, 10, 36, 59), (11, 14, 41, 53), (15, 24, 36, 59)], 'Basses Spic': [(3, 23, 28, 40)],
    'Violas Trem': [(11, 14, 55, 62)],
}
CEILINGS = {'Vibes Bowed': 64, 'Glass': 40, 'Celesta': 48, 'Xylophone': 60, 'Col Legno Vn': 70}
TOP = {'explora': (80, 90), 'combate': (100, 105)}            # (velocity, CC1)
BRIGHTS = {'Celesta': 3, 'Hand Chimes': 2, 'Glass': 1, 'Bell': 4, 'Gong': 2, 'Piano Cluster': 1}
FORBIDDEN = ('Harmonics', 'Glockenspiel', 'Crotal', 'Cymbal', 'Tam-tam', 'Tamtam')
OSTINATO = [0, 0, 7, 0, 12, 0, 7, 3]


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def beat_of(t):
    """Position inside the bar in beats (1-based), rounded to the eighth."""
    return 1 + round(((t + TOL) % BAR_S - TOL) / E8) / 2


def written_start(track_name, n):
    """Start on the score: the bowed vibraphone's notes are played ahead of the beat."""
    if track_name in ANTICIPATION:
        long_, short = ANTICIPATION[track_name]
        return n.start + (long_ if n.end - n.start >= 0.6 else short)
    return n.start


def notes_between(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return [n for n in track.notes if lo <= written_start(track.name, n) < hi]


def cc_at(track, ctrl, t):
    value = None
    for time, v in track.cc.get(ctrl, []):
        if time <= t + 1e-6:
            value = v
    return value


def level(track, note):
    """Dynamic level on the velocity scale: velocity, or CC1 - 15 for Sonatina by CC1 (section 7)."""
    if track.name in CC1_TRACKS:
        return cc_at(track, 1, note.start) - 15
    return note.velocity


def raw_events(path):
    """Per track: notes [(pitch, on tick, off tick, velocity)] and CC [(tick, control, value)]."""
    mid = mido.MidiFile(path)
    out = {}
    for tr in mid.tracks:
        name = next(m.name for m in tr if m.type == 'track_name')
        t, open_, notes, ccs = 0, {}, [], []
        for m in tr:
            t += m.time
            if m.type == 'note_on' and m.velocity > 0:
                open_.setdefault(m.note, []).append((t, m.velocity))
            elif m.type in ('note_on', 'note_off'):
                on, vel = open_[m.note].pop(0)
                notes.append((m.note, on, t, vel))
            elif m.type == 'control_change':
                ccs.append((t, m.control, m.value))
        out[name] = (sorted(notes, key=lambda n: (n[1], n[0])), ccs)
    return out


class CriptaScore(unittest.TestCase):
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
            self.assertEqual(os.path.basename(self.paths[v]), f'acto2-cripta-{v}.mid')
            self.assertEqual(os.path.basename(compose.OUT[v]), f'acto2-cripta-{v}.mid')
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
                self.assertNotIn('Keyswitch', os.path.basename(rel), rel)
            for name in names:
                self.assertTrue(self.tracks(v)[name].notes, f'{v} {name} is empty')

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
                if name == 'Gong':
                    self.assertEqual({n.pitch for n in track.notes}, {61})
                    continue
                if name == 'Bass Drum':
                    self.assertLessEqual({n.pitch for n in track.notes}, {62, 63})
                    continue
                for n in track.notes:
                    b = bar_of(written_start(name, n))
                    ok = [lo <= n.pitch <= hi for first, last, lo, hi in REGISTERS[name] if first <= b <= last]
                    self.assertTrue(ok, f'{v} {name} bar {b} has no register entry')
                    self.assertTrue(all(ok), f'{v} {name} bar {b} pitch {n.pitch}')

    def test_nothing_high_is_held(self):
        """No held note above F5 (77) save the alto flute's G#5-A5 of bar 7 (and, in combat, the
        same notes on the violins and the declared tremolo octave of bars 17-18)."""
        struck = {'Celesta', 'Harp', 'Xylophone'}
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in struck:
                    continue
                for n in track.notes:
                    if n.pitch > 77 and n.end - n.start >= BEAT_S - 0.05:
                        b = bar_of(n.start)
                        allowed = (name in ('Alto Flute', 'Violins') and b == 7 and n.pitch in (80, 81)) or \
                                  (name == 'Violins Trem' and b in (17, 18))
                        self.assertTrue(allowed, f'{v} {name} holds {n.pitch} in bar {b}')

    def test_bowed_vibraphone_is_soft_and_early(self):
        vib = self.tracks('explora')['Vibes Bowed']
        for n in vib.notes:
            self.assertTrue(64 <= n.pitch <= 77, n.pitch)
            self.assertLessEqual(n.velocity, 64)
            ws = written_start('Vibes Bowed', n)
            off = abs(ws / E8 - round(ws / E8)) * E8
            self.assertLess(off, TOL, f'vibraphone note at {n.start:.3f} s is not anticipated 120/80 ms')
        self.assertNotIn('Vibes Bowed', self.tracks('combate'))

    # ── criterion 3 and synchrony rule 2 ──────────────────────────────────────
    def written(self, v, name, first, last):
        track = self.tracks(v)[name]
        return sorted((bar_of(written_start(name, n)), beat_of(written_start(name, n)), n.pitch)
                      for n in notes_between(track, first, last))

    def test_reference_melody_in_both_versions(self):
        for label, ref in REFERENCE.items():
            first, last = ref[0][0], ref[-1][0]
            for v in VERSIONS:
                carrier, doublings = CARRIERS[v][label]
                self.assertEqual(self.written(v, carrier, first, last), sorted(ref), f'{v} {label} ({carrier})')
                for name, shift in doublings:
                    want = sorted((b, bt, p + shift) for b, bt, p in ref)
                    self.assertEqual(self.written(v, name, first, last), want, f'{v} {label} doubling {name}')

    def test_combat_choir_sings_the_exploration_voices(self):
        a = self.written('explora', 'Choir', 1, 24)
        b = self.written('combate', 'Choir', 1, 24)
        self.assertEqual(a, b)

    # ── criterion 4 and synchrony rule 3 ──────────────────────────────────────
    def test_common_layers_identical(self):
        raw = {v: raw_events(self.paths[v]) for v in VERSIONS}
        for name in COMMON_TRACKS:
            self.assertTrue(raw['explora'][name][0], name)
            self.assertEqual(raw['explora'][name], raw['combate'][name], name)
        self.assertTrue(any(c == 1 for _, c, _ in raw['explora']['Low Trem'][1]), 'Low Trem has CC1')

    def test_common_layer_contents(self):
        tr = self.tracks('explora')
        self.assertEqual([(bar_of(n.start), beat_of(n.start), n.pitch) for n in tr['Bell'].notes],
                         [(1, 1, 69), (11, 1, 65), (19, 1, 69), (23, 1, 64)])
        self.assertEqual([(bar_of(n.start), beat_of(n.start)) for n in tr['Gong'].notes], [(6, 3), (19, 1)])
        legno = defaultdict(list)
        for n in tr['Col Legno Vc'].notes:
            legno[bar_of(n.start)].append(n.pitch)
        self.assertEqual(dict(legno), {4: [52, 53, 54], 6: [45, 46, 47], 8: [46, 47, 49], 20: [40, 41, 42]})

    # ── criterion 5 ───────────────────────────────────────────────────────────
    def test_figures(self):
        short = {'explora': {'Col Legno Vc'}, 'combate': {'Col Legno Vc', 'Col Legno Vn', 'Bass Drum'}}
        triplet = BEAT_S / 3
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                onsets = sorted({round(written_start(name, n), 3) for n in track.notes})
                for a, b in zip(onsets, onsets[1:]):
                    if name == 'Col Legno Vc':
                        self.assertGreaterEqual(b - a, triplet - 2 * TOL, f'{v} {name} at {a:.2f} s')
                    elif name in short[v]:
                        self.assertGreaterEqual(b - a, S16 - 2 * TOL, f'{v} {name} at {a:.2f} s')
                    else:
                        self.assertGreaterEqual(b - a, E8 - 2 * TOL, f'{v} {name} at {a:.2f} s')
                if name not in short[v]:
                    for n in track.notes:
                        self.assertGreaterEqual(n.end - n.start, E8 - 0.06, f'{v} {name} at {n.start:.2f} s')
        legno = self.tracks('combate')['Col Legno Vn']
        sixteenth_bars = {b for b in range(1, 25)
                          if any(round((n.start - bar_start(b)) / S16) % 2 == 0 for n in notes_between(legno, b, b))}
        self.assertEqual(sixteenth_bars, {17, 18, 19, 20, 21})

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
            for label in MELODY_LABELS:
                ref = REFERENCE[label]
                first, last = ref[0][0], ref[-1][0]
                lead, doublings = CARRIERS[v][label]
                skip = {lead} | {d for d, _ in doublings} | UNPITCHED
                mel = notes_between(tr[lead], first, last)
                for name, track in tr.items():
                    if name in skip:
                        continue
                    for o in track.notes:
                        if o.end - o.start < BEAT_S - 0.04:
                            continue
                        for m in mel:
                            if min(m.end, o.end) - max(m.start, o.start) <= 0.04 or abs(m.pitch - o.pitch) > 11:
                                continue
                            if v == 'explora' and name == 'Vibes Bowed' and label == 'lydian 11-14':
                                self.assertLessEqual(o.velocity, 40, 'halo above the cello')
                                self.assertGreater(o.pitch, m.pitch, 'halo above the cello')
                                continue
                            self.assertLess(level(track, o), level(tr[lead], m),
                                            f'{v} {name} {o.pitch} vs {lead} {m.pitch} in bar {bar_of(o.start)}')

    # ── criterion 8 ───────────────────────────────────────────────────────────
    def test_ceilings(self):
        for v in VERSIONS:
            vel_top, cc_top = TOP[v]
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    self.assertLessEqual(n.velocity, CEILINGS.get(name, vel_top), f'{v} {name}')
                for t, value in track.cc.get(1, []):
                    self.assertLessEqual(value, cc_top, f'{v} {name} CC1 at {t:.2f} s')

    def test_climax_in_bar_21(self):
        checks = {
            'explora': [('Alto Flute', 'cc'), ('Vibes Bowed', 'vel'), ('Timpani', 'vel')],
            'combate': [('Violins', 'vel'), ('Choir Melody', 'cc'), ('Timpani', 'vel')],
        }
        for v in VERSIONS:
            for name, kind in checks[v]:
                track = self.tracks(v)[name]
                if kind == 'vel':
                    top = max(n.velocity for n in track.notes)
                    bars = {bar_of(written_start(name, n)) for n in track.notes if n.velocity == top}
                else:
                    top = max(val for _, val in track.cc[1])
                    bars = {bar_of(t) for t, val in track.cc[1] if val == top}
                self.assertEqual(bars, {21}, f'{v} {name}')

    # ── criterion 9 ───────────────────────────────────────────────────────────
    def test_sonatina_cc1(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in CC1_TRACKS:
                    pts = track.cc.get(1)
                    self.assertTrue(pts, f'{v} {name}')
                    self.assertEqual(pts[0][0], 0.0, f'{v} {name}: CC1 at tick 0')
                    self.assertLess(pts[0][0], track.notes[0].start)
                    self.assertGreater(len({val for _, val in pts}), 1, f'{v} {name}: CC1 draws the phrase')
                elif name in VELOCITY_SONATINA:
                    self.assertLessEqual({val for _, val in track.cc.get(1, [])}, {100}, f'{v} {name}')
                    self.assertLessEqual(len(track.cc.get(1, [])), 1)

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

    def test_longest_notes(self):
        for v in VERSIONS:
            for name, longest in MAX_NOTE_S.items():
                for n in self.tracks(v).get(name, midi_io.Track(name)).notes:
                    self.assertLessEqual(n.end - n.start, longest, f'{v} {name} at {n.start:.2f} s')
        glass = self.tracks('explora')['Glass'].notes
        self.assertAlmostEqual(glass[0].start, bar_start(6) - 0.150, delta=TOL)
        self.assertLessEqual(glass[0].end, bar_start(7))

    def test_sustained_vsco_tracks_have_cc11(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in CC11_TRACKS:
                    self.assertTrue(track.cc.get(11), f'{v} {name}')
                    self.assertEqual(track.cc[11][0][0], 0.0)
                    self.assertGreater(len({val for _, val in track.cc[11]}), 1, f'{v} {name}')
        bd = self.tracks('combate')['Bass Drum']
        self.assertTrue(bd.cc.get(11))

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_ostinato_pattern_accents_and_runs(self):
        track = self.tracks('combate')['Cellos Spic']
        by_bar = defaultdict(list)
        for n in track.notes:
            by_bar[bar_of(n.start)].append(n)
        self.assertEqual(set(by_bar), set(range(1, 25)))
        for bar, notes in by_bar.items():
            notes.sort(key=lambda n: n.start)
            pos = [round((n.start - bar_start(bar)) / E8) for n in notes]
            self.assertEqual(pos, list(range(8)), f'bar {bar}')
            vels = [n.velocity for n in notes]
            if 11 <= bar <= 14:
                self.assertLessEqual(max(vels) - min(vels), 10, f'bar {bar} has accents')
                for k, n in enumerate(notes):
                    _, bass, chord = segment(bar, 1 + k / 2)
                    if k % 2 == 0:
                        self.assertEqual(n.pitch % 12, bass, f'bar {bar} eighth {k}')
                    else:
                        self.assertIn(n.pitch % 12, chord, f'bar {bar} eighth {k}')
                continue
            self.assertGreater(min(vels[k] for k in (0, 3, 6)), max(vels[k] for k in (1, 2, 4, 5, 7)), f'bar {bar}')
            for k, n in enumerate(notes):
                _, bass, chord = segment(bar, 1 + k / 2)
                base = 36 + bass % 12
                step = OSTINATO[k]
                if step in (0, 12):
                    self.assertEqual(n.pitch - base, step, f'bar {bar} eighth {k}')
                elif step == 7:
                    if (base + 7) % 12 in chord:
                        self.assertEqual(n.pitch - base, 7, f'bar {bar} eighth {k}')
                    else:
                        self.assertIn(n.pitch % 12, chord, f'bar {bar} eighth {k}')
                else:
                    thirds = [i for i in (3, 4) if (base + i) % 12 in chord]
                    if thirds:
                        self.assertIn(n.pitch - base, thirds, f'bar {bar} eighth {k}')
                    else:
                        self.assertIn(n.pitch % 12, chord, f'bar {bar} eighth {k}')
        notes = sorted(track.notes, key=lambda n: n.start)
        run = 1
        for a, b in zip(notes, notes[1:]):
            same = a.pitch == b.pitch and abs(a.velocity - b.velocity) <= 3
            run = run + 1 if same else 1
            self.assertLessEqual(run, 3, f'run at {b.start:.2f} s')

    def test_basses_spiccato_on_the_accents(self):
        for n in self.tracks('combate')['Basses Spic'].notes:
            bar = bar_of(n.start)
            self.assertFalse(bar in (1, 2, 24) or 11 <= bar <= 14, bar)
            k = round((n.start - bar_start(bar)) / E8)
            self.assertIn(k, (0, 3, 6))
            self.assertEqual(n.pitch % 12, line_bass_at(bar, 1 + k / 2), f'bar {bar} eighth {k}')

    def test_col_legno_violins(self):
        for n in self.tracks('combate')['Col Legno Vn'].notes:
            bar = bar_of(n.start)
            self.assertLessEqual(n.end - n.start, 0.15)
            _, _, chord = segment(bar, 1 + round((n.start - bar_start(bar)) / S16) / 4)
            self.assertIn(n.pitch % 12, chord, f'bar {bar}')
        for b in range(1, 25):
            notes = notes_between(self.tracks('combate')['Col Legno Vn'], b, b)
            pos = sorted(round((n.start - bar_start(b)) / S16) for n in notes)
            if 11 <= b <= 14:
                self.assertFalse(pos, f'col legno in B (bar {b})')
            elif 17 <= b <= 21:
                self.assertEqual(pos, list(range(16)), b)
            else:
                self.assertEqual(pos, list(range(1, 16, 2)), b)

    # ── criterion 11 ──────────────────────────────────────────────────────────
    def test_brights_counted(self):
        for v in VERSIONS:
            for name, count in BRIGHTS.items():
                if name not in EXPECTED[v]:
                    continue
                onsets = {round(n.start, 2) for n in self.tracks(v)[name].notes}
                self.assertEqual(len(onsets), count, f'{v} {name}')
            for rel in EXPECTED[v].values():
                for word in FORBIDDEN:
                    self.assertNotIn(word, rel)
        self.assertEqual(sorted((bar_of(n.start), n.pitch) for n in self.tracks('combate')['Piano Cluster'].notes),
                         [(15, 33), (15, 34)])

    def test_combat_drums(self):
        bd = self.tracks('combate')['Bass Drum'].notes
        self.assertEqual(sorted((bar_of(n.start), beat_of(n.start)) for n in bd if n.pitch == 62),
                         [(3, 1), (5, 1), (7, 1), (9, 1), (19, 1), (21, 1)])
        roll = [n for n in bd if n.pitch == 63]
        self.assertEqual(len(roll), 1)
        self.assertEqual(bar_of(roll[0].start), 18)
        self.assertLessEqual(roll[0].end, bar_start(19))
        for v in VERSIONS:
            for n in self.tracks(v)['Timp Roll'].notes:
                self.assertIn(bar_of(n.start), (17, 18))
                self.assertLessEqual(n.end, bar_start(19))

    # ── criterion 12 ──────────────────────────────────────────────────────────
    def test_lowest_note_on_beats_1_and_3_is_the_bass(self):
        for v in VERSIONS:
            for bar in range(1, BARS + 1):
                for beat in (1, 3):
                    t = bar_start(bar) + (beat - 1) * BEAT_S + 0.04
                    sounding = [n.pitch for name, tr in self.tracks(v).items() if name not in UNPITCHED
                                for n in tr.notes if n.start <= t < n.end]
                    self.assertTrue(sounding, f'{v} bar {bar} beat {beat}: silence')
                    self.assertEqual(min(sounding) % 12, bass_at(bar, beat),
                                     f'{v} bar {bar} beat {beat}: lowest {min(sounding)}')

    # ── craft: expression, voice leading, development, loop ──────────────────
    def test_humanized_velocities_and_timing(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if len(track.notes) >= 6:
                    self.assertGreater(len({n.velocity for n in track.notes}), 2, f'{v} {name}')
            off_grid = [n for name, tr in self.tracks(v).items() for n in tr.notes
                        if abs((written_start(name, n) / S16) - round(written_start(name, n) / S16)) * S16 > 0.002]
            self.assertGreater(len(off_grid), 80, v)
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    ws = written_start(name, n)
                    grid = min(abs(ws / S16 - round(ws / S16)) * S16, abs(ws / (BEAT_S / 3) - round(ws / (BEAT_S / 3))) * BEAT_S / 3)
                    self.assertLessEqual(grid, 0.0095, f'{v} {name} at {n.start:.3f} s: more than 8 ms off')

    def test_legato_overlaps(self):
        for v in VERSIONS:
            for label in REFERENCE:
                ref = REFERENCE[label]
                first, last = ref[0][0], ref[-1][0]
                lead = CARRIERS[v][label][0]
                if lead == 'Xylophone':
                    continue
                notes = notes_between(self.tracks(v)[lead], first, last)
                for a, b in zip(notes, notes[1:]):
                    over = a.end - b.start
                    if a.pitch == b.pitch:
                        self.assertLess(over, 0, f'{v} {lead} repeated note at {b.start:.2f} s')
                    elif over > 0:
                        self.assertTrue(0.0095 <= over <= 0.0305, f'{v} {lead} {over * 1000:.1f} ms at {b.start:.2f} s')
                legato = sum(1 for a, b in zip(notes, notes[1:]) if a.end > b.start)
                self.assertGreaterEqual(legato, (len(notes) - 1) // 2, f'{v} {label}: the line is not legato')

    def test_no_parallel_fifths_or_octaves(self):
        sustained = {'explora': ['Vibes Bowed', 'Alto Flute', 'Bass Clarinet', 'Cello Solo', 'Choir', 'Low Trem',
                                 'Basses', 'Basses Quiet', 'Glass'],
                     'combate': ['Violins', 'Horns', 'Trombones', 'Choir', 'Choir Melody', 'Low Trem',
                                 'Violins Trem', 'Violas Trem']}
        doubled = {'explora': [('Alto Flute', 'Vibes Bowed', 19, 22), ('Low Trem', 'Basses', 1, 24),
                               ('Low Trem', 'Basses Quiet', 1, 24)],
                   'combate': [('Violins', 'Horns', 3, 6), ('Violins', 'Choir Melody', 19, 22),
                               ('Horns', 'Violins Trem', 17, 18)]}
        for v in VERSIONS:
            grid = {name: [(round(written_start(name, n) / E8), round(n.end / E8), n.pitch)
                           for n in self.tracks(v)[name].notes] for name in sustained[v]}

            def at(name, q):
                return sorted({p for s, e, p in grid[name] if s <= q < e})

            def leaving(name, q1, q2):
                return sorted({p for s, e, p in grid[name] if s <= q1 < e and e >= q2 - 1})

            def bass_pc(q):
                bar, pos = q // 8 + 1, (q % 8) / 2 + 1
                return line_bass_at(bar, pos) if bar <= BARS else None

            def pairs(x1, x2):
                if len(x1) == len(x2):
                    return list(zip(x1, x2))
                return [(p, min(x2, key=lambda x: abs(x - p))) for p in x1]

            found = []
            names = sustained[v]
            combos = [(a, b) for i, a in enumerate(names) for b in names[i + 1:]] + [(a, a) for a in names]
            for a, b in combos:
                times = sorted({s for s, _, _ in grid[a]} | {s for s, _, _ in grid[b]})
                for q1, q2 in zip(times, times[1:]):
                    bar = q1 // 8 + 1
                    if any({a, b} == {x, y} and f <= bar <= l for x, y, f, l in doubled[v]):
                        continue
                    a1, b1, a2, b2 = leaving(a, q1, q2), leaving(b, q1, q2), at(a, q2), at(b, q2)
                    if not (a1 and b1 and a2 and b2):
                        continue
                    ma, mb = pairs(a1, a2), pairs(b1, b2)
                    for i, (pa, qa) in enumerate(ma):
                        for j, (pb, qb) in enumerate(mb):
                            if a == b and j <= i:
                                continue
                            iv1, iv2 = abs(pa - pb) % 12, abs(qa - qb) % 12
                            if not (pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and iv1 == iv2
                                    and iv1 in (0, 7) and abs(qa - pa) <= 7 and abs(qb - pb) <= 7):
                                continue
                            if iv1 == 0 and {pa % 12, pb % 12} == {bass_pc(q1)} and {qa % 12, qb % 12} == {bass_pc(q2)}:
                                continue                       # the bass doubled at the octave
                            found.append(f'{v} {a}/{b} {pa}-{qa} {pb}-{qb} at bar {bar}')
            self.assertFalse(found, found[:6])

    def test_no_two_bar_phrase_repeated_more_than_twice(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in UNPITCHED:
                    continue
                seen = defaultdict(list)
                for bar in range(1, BARS):
                    sig = tuple(sorted((round((written_start(name, n) - bar_start(bar)) / S16), n.pitch,
                                        round((n.end - n.start) / S16)) for n in notes_between(track, bar, bar + 1)))
                    if len(sig) >= 2:
                        seen[sig].append(bar)
                repeated = [bars for bars in seen.values() if len(bars) > 2]
                self.assertFalse(repeated, f'{v} {name} {repeated[:2]}')

    def test_loop_seam_dominant_leads_to_bar_1(self):
        for v, name in (('explora', 'Basses Quiet'), ('combate', 'Cellos Spic')):
            tr = self.tracks(v)[name]
            last = notes_between(tr, 24, 24)
            first = notes_between(tr, 1, 1)
            self.assertEqual(last[0].pitch % 12, E, f'{v} {name}: bar 24 on E')
            self.assertEqual(first[0].pitch % 12, A, f'{v} {name}: bar 1 on A')
        for v, name in (('explora', 'Bass Clarinet'), ('combate', 'Horns')):
            tr = self.tracks(v)[name]
            self.assertEqual(notes_between(tr, 24, 24)[-1].pitch, 44, f'{v}: G#2 leads to the A2 of bar 1')
            self.assertEqual(notes_between(tr, 1, 1)[0].pitch, 45)
        # The combat ostinato enters bar 1 with the same figure and dynamics it had in bar 24.
        tr = self.tracks('combate')['Cellos Spic']
        v24 = [n.velocity for n in notes_between(tr, 24, 24)]
        v1 = [n.velocity for n in notes_between(tr, 1, 1)]
        self.assertLessEqual(abs(sum(v24) / 8 - sum(v1) / 8), 4)

    def test_section_soloists(self):
        """Each section has its own colour: the tune never stays on one instrument for long."""
        ex = {label: CARRIERS['explora'][label][0] for label in MELODY_LABELS}
        self.assertEqual(len(set(ex.values())), 4)
        cb = {label: CARRIERS['combate'][label][0] for label in MELODY_LABELS}
        self.assertEqual(len(set(cb.values())), 3)


if __name__ == '__main__':
    unittest.main()
