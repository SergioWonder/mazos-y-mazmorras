"""Acceptance tests for «Vísperas del pozo» (docs/musica/acto2-templo.md, §8 criteria 1-12).

Both MIDIs (exploration and combat) are generated into a temporary folder and read back with
estudio.midi_io, independently of the checks that compose.py prints.
Run with:
  scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto2-templo/test_compose.py
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

BPM = 80
BARS = 28
BAR_S = 4 * 60 / BPM                 # 3.000 s
SIXTEENTH_S = BAR_S / 16             # 0.1875 s
EIGHTH_S = BAR_S / 8
QUARTER_S = BAR_S / 4
LOOP_S = BARS * BAR_S                # 84.000 s
TOL = 0.0105                         # humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

VSCO = 'VSCO-2-CE/{}.sfz'.format
VCSL = 'VCSL/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
PATCH = {
    'Choir Low': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Choir High': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Chant': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Organ Pedal': SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
    'Organ': SSO + 'Organ/Great - Stopped Diapason 8ft.sfz',
    'Organ Open': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
    'Contrabassoon': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
    'Cor Anglais': SSO + 'Woodwinds - Performance/Cor Anglais Solo Sustain.sfz',
    'Trombones': SSO + 'Brass - Performance/Trombones Sustain (looped).sfz',
    'Horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Brass Stabs': SSO + 'Brass - Performance/Horns Marcato.sfz',
    'Ostinato': VSCO('CelloEnsSpic'),
    'Ostinato Low': VSCO('ContrabassSpic'),
    'Daggers': VSCO('ViolinEnsSpic'),
    'Timp Roll': VSCO('TimpaniRolls'),
    'Timpani': VSCO('Timpani'),
    'Frame Drum': VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz',
    'Darbuka': VCSL + 'Membranophones/Struck Membranophones/Darbuka.sfz',
    'Bass Drum': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Tom': VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz',
    'Finger Cymbals': VCSL + 'Idiophones/Struck Idiophones/Finger Cymbals.sfz',
    'Hand Bell': VCSL + 'Idiophones/Struck Idiophones/Hand Bells, Nepalese.sfz',
    'Bell': VCSL + 'Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
    'Broken Bells': VCSL + 'Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
    'Gong': VCSL + 'Idiophones/Struck Idiophones/Gong 1.sfz',
    'Metal': VCSL + 'Idiophones/Struck Idiophones/Gong 2.sfz',
}
COMMON = ['Organ Pedal', 'Contrabassoon', 'Frame Drum']
TRACKS = {
    'explora': ['Choir Low', 'Choir High', 'Cor Anglais', 'Organ', 'Organ Open', 'Organ Pedal', 'Contrabassoon',
                'Timp Roll', 'Frame Drum', 'Darbuka', 'Finger Cymbals', 'Hand Bell', 'Bell', 'Gong'],
    'combate': ['Choir Low', 'Choir High', 'Chant', 'Trombones', 'Horns', 'Brass Stabs', 'Organ Pedal',
                'Contrabassoon', 'Ostinato', 'Ostinato Low', 'Daggers', 'Timpani', 'Timp Roll', 'Frame Drum',
                'Bass Drum', 'Tom', 'Metal', 'Broken Bells', 'Finger Cymbals'],
}
SONATINA_CC1 = {'Choir Low', 'Choir High', 'Contrabassoon', 'Cor Anglais', 'Trombones', 'Horns', 'Brass Stabs',
                'Chant'}
MAX_S = {'Cor Anglais': 2.8, 'Horns': 2.8, 'Brass Stabs': 0.3, 'Daggers': 0.1 + 1e-3, 'Timp Roll': 16.0}
UNPITCHED = {'Frame Drum', 'Darbuka', 'Bass Drum', 'Tom', 'Finger Cymbals', 'Hand Bell', 'Gong', 'Metal'}
SEMI = {'Ostinato', 'Ostinato Low', 'Chant', 'Daggers', 'Bass Drum', 'Tom'}   # the only 16th-note tracks (C)

# Criterion 2: floors and ceilings, and the single-key instruments.
REGISTERS = {'Choir Low': (52, 66), 'Choir High': (69, 78), 'Chant': (43, 54), 'Trombones': (52, 66),
             'Horns': (59, 70), 'Brass Stabs': (41, 55), 'Cor Anglais': (63, 70), 'Ostinato': (46, 58),
             'Ostinato Low': (28, 46), 'Organ': (45, 56), 'Organ Open': (45, 56), 'Organ Pedal': (37, 48),
             'Contrabassoon': (28, 37), 'Timpani': (41, 46)}
KEYS = {'Daggers': {65, 66, 67, 68, 77, 78}, 'Darbuka': {60}, 'Hand Bell': {62}, 'Bell': {70},
        'Broken Bells': {60, 61}, 'Frame Drum': {61, 62, 64}, 'Gong': {61}, 'Metal': {61, 63},
        'Bass Drum': {62, 63}, 'Tom': {62, 64}, 'Finger Cymbals': {60}, 'Timp Roll': {41}}

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    step, rest, acc = name[0], name[1:], 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


def pc(name):
    return midi(name + '4') % 12


def phrase(bar, text):
    """'Bb3:2 C4:2 | ...' (durations in sixteenths, r = rest) -> [(bar, sixteenth, pitch)]."""
    out = []
    for i, chunk in enumerate(text.split('|')):
        s = 0
        for item in chunk.split():
            p, d = item.split(':')
            if p != 'r':
                out.append((bar + i, s, midi(p)))
            s += int(d)
        assert s == 16, (bar + i, text)
    return out


# §5: the reference melody (identical in both versions) and the track that sings it.
MOTIF_LOW = 'Bb3:2 C4:2 Db4:4 E4:6 F4:2 | Db4:4 C4:4 A3:8 | Bb3:2 Db4:2 F4:4 Gb4:4 F4:4 | Bb3:12 r:4'
MOTIF_HIGH = 'Bb4:2 C5:2 Db5:4 E5:6 F5:2 | Db5:4 C5:4 A4:8 | Bb4:2 Db5:2 F5:4 Gb5:4 F5:4 | Bb4:12 r:4'
REFERENCE = [
    (2, 'Bb3:8 A3:8', 'Choir Low', 'Choir Low'),
    (3, 'Bb3:2 C4:2 Db4:4 E4:6 F4:2', 'Choir Low', 'Choir Low'),
    (4, 'Db5:4 C5:4 A4:8', 'Choir High', 'Choir High'),
    (5, 'Bb3:2 Db4:2 F4:4 Gb4:4 F4:4', 'Choir Low', 'Choir Low'),
    (6, 'Bb4:12 r:4', 'Choir High', 'Choir High'),
    (7, MOTIF_HIGH, 'Choir High', 'Choir High'),
    (7, 'F3:6 F3:6 E3:4 | F3:6 F3:6 F3:4 | F3:6 F3:6 F3:4 | F3:6 F3:6 F3:4', 'Choir Low', 'Choir Low'),
    (11, 'Bb3:4 C4:4 Db4:8 | E4:12 F4:4 | Db4:8 C4:8 | A3:16 | Bb3:4 Db4:4 F4:8 | Gb4:8 F4:8',
     'Choir Low', 'Choir Low'),
    (11, 'F5:16 | E5:16 | F5:16 | Eb5:16 | F5:16 | Eb5:16', 'Choir High', 'Choir High'),
    (12, 'G4:8 Bb4:8 | Ab4:8 F4:8 | Eb4:8 Gb4:8 | F4:8 Ab4:8 | Bb4:8 A4:8', 'Cor Anglais', 'Horns'),
    (17, 'Bb3:4 C4:4 Db4:4 E4:4', 'Choir Low', 'Choir Low'),
    (18, 'B4:4 C#5:4 D5:4 F5:4', 'Choir High', 'Choir High'),
    (19, 'C4:4 D4:4 Eb4:4 F#4:4', 'Choir Low', 'Choir Low'),
    (20, 'Gb5:8 F5:8', 'Choir High', 'Choir High'),
    (20, 'A3:8 Eb4:8', 'Choir Low', 'Choir Low'),
    (21, MOTIF_LOW + ' | Gb4:8 F4:8 | Db4:4 C4:4 A3:8', 'Choir Low', 'Choir Low'),
    (21, MOTIF_HIGH + ' | Gb5:8 F5:8 | Db5:4 C5:4 A4:8', 'Choir High', 'Choir High'),
    (27, 'Bb4:12 r:4', 'Choir High', 'Choir High'),
    (28, 'Bb3:8 A3:8', 'Choir Low', 'Choir Low'),
]
# Sections: (first bar, last bar, max layers E, max layers C).
SECTIONS = [(1, 2, 6, 11), (3, 6, 8, 14), (7, 10, 8, 14), (11, 16, 7, 11), (17, 20, 8, 14), (21, 26, 10, 14),
            (27, 28, 6, 10)]
B_BARS = range(11, 17)
# Criterion 7: who carries the tune, bar by bar (same in both versions).
MELODY = [(['Choir Low'], 2, 3), (['Choir High'], 4, 4), (['Choir Low'], 5, 5), (['Choir High'], 6, 10),
          (['Choir Low'], 11, 17), (['Choir High'], 18, 18), (['Choir Low'], 19, 19),
          (['Choir High', 'Choir Low'], 20, 20), (['Choir High', 'Choir Low'], 21, 26), (['Choir High'], 27, 27),
          (['Choir Low'], 28, 28)]
# Dagger register by bar (§6): low choir sings -> 77 78; high choir -> 65 66; both / recitation -> 67 68.
DAGGERS = {**{b: {77, 78} for b in (3, 5, 17, 19)}, **{b: {65, 66} for b in (4, 6, 18)},
           **{b: {67, 68} for b in (7, 8, 9, 10, 20, 21, 22, 23, 24, 25, 26)}}
# §4: the pitch class of the bass on beats 1 and 3 of every bar.
BASS = {1: ('Bb', 'Bb'), 2: ('Bb', 'F'), 3: ('Bb', 'Gb'), 4: ('F', 'F'), 5: ('Bb', 'B'), 6: ('Bb', 'Ab'),
        7: ('Bb', 'Bb'), 8: ('A', 'A'), 9: ('Ab', 'Gb'), 10: ('F', 'F'), 11: ('Bb', 'Bb'), 12: ('E', 'E'),
        13: ('Db', 'Db'), 14: ('A', 'A'), 15: ('Bb', 'Ab'), 16: ('Gb', 'F'), 17: ('Bb', 'Bb'), 18: ('B', 'B'),
        19: ('C', 'C'), 20: ('F', 'F'), 21: ('Bb', 'E'), 22: ('F', 'F'), 23: ('Gb', 'Eb'), 24: ('Bb', 'Ab'),
        25: ('Gb', 'F'), 26: ('F', 'F'), 27: ('Bb', 'Bb'), 28: ('F', 'F')}
ACCENTS = (0, 3, 6, 8, 11, 14)


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def pos16(t):
    """(bar, sixteenth) of a time, rounded to the grid."""
    bar = bar_of(t)
    return bar, round((t - bar_start(bar)) / SIXTEENTH_S)


def off_grid(t, grid):
    x = (t - bar_start(bar_of(t))) / grid
    return abs(x - round(x)) * grid


def notes_between(track, first, last):
    lo, hi = bar_start(first) - TOL, bar_start(last + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi] if track else []


def cc_at(track, num, t):
    pts = track.cc.get(num, [])
    value = pts[0][1] if pts else 0
    for when, v in pts:
        if when <= t + 1e-9:
            value = v
    return value


def level(name, track, note):
    return cc_at(track, 1, note.start) if name in SONATINA_CC1 else note.velocity


def onsets(notes):
    """Distinct attack times (the notes of a chord or dyad count once)."""
    out = []
    for t in sorted(n.start for n in notes):
        if not out or t - out[-1] > 0.03:
            out.append(t)
    return out


class TempleScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        out = tempfile.mkdtemp()
        cls.paths = compose.write_all(out)
        cls.mid = {v: mido.MidiFile(cls.paths[v]) for v in VERSIONS}
        cls.song = {v: midi_io.load(cls.paths[v]) for v in VERSIONS}

    def tr(self, v, name):
        return self.song[v].tracks.get(name)

    # ── structure ──
    def test_output_names(self):
        for v in VERSIONS:
            self.assertTrue(self.paths[v].endswith(f'build/acto2-templo-{v}.mid') or
                            self.paths[v].endswith(f'acto2-templo-{v}.mid'))

    def test_one_named_track_per_instrument_and_patch(self):
        for v in VERSIONS:
            names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid[v].tracks]
            self.assertEqual(sorted(names), sorted(TRACKS[v]), v)
            self.assertEqual({k: compose.PATCHES[k] for k in names}, {k: PATCH[k] for k in names})
            for name in names:
                self.assertNotRegex(PATCH[name], r'(?i)keyswitch|\bKS\b|cymbal 2|suspended|crash')

    # ── criterion 1 ──
    def test_criterion_1_tempo_meter_and_length(self):
        lengths = set()
        for v in VERSIONS:
            mid = self.mid[v]
            tempos = [m for tr in mid.tracks for m in tr if m.type == 'set_tempo']
            sigs = [m for tr in mid.tracks for m in tr if m.type == 'time_signature']
            self.assertEqual(len(tempos), 1)
            self.assertTrue(any(m.type == 'set_tempo' for m in mid.tracks[0]))
            self.assertAlmostEqual(mido.tempo2bpm(tempos[0].tempo), BPM, places=3)
            self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(4, 4)])
            for tr in mid.tracks:
                lengths.add(sum(m.time for m in tr))
            self.assertEqual(mid.ticks_per_beat, self.mid['explora'].ticks_per_beat)
        self.assertEqual(lengths, {BARS * 4 * self.mid['explora'].ticks_per_beat})

    def test_criterion_1_notes_inside_the_loop(self):
        for v in VERSIONS:
            for track in self.song[v].tracks.values():
                for n in track.notes:
                    self.assertGreaterEqual(n.start, 0.0, f'{v} {track.name}')
                    self.assertLess(n.start, LOOP_S, f'{v} {track.name}')
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

    # ── criterion 2 ──
    def test_criterion_2_catalog_ranges_and_registers(self):
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                inst = sfz.load(library(*PATCH[name].split('/')))
                keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                        for k in range(r.lokey, r.hikey + 1)}
                for n in track.notes:
                    self.assertIn(n.pitch, keys, f'{v} {name} {n.pitch}')
                if name in REGISTERS:
                    lo, hi = REGISTERS[name]
                    for n in track.notes:
                        self.assertTrue(lo <= n.pitch <= hi, f'{v} {name} bar {bar_of(n.start)} pitch {n.pitch}')
                if name in KEYS:
                    self.assertLessEqual({n.pitch for n in track.notes}, KEYS[name], f'{v} {name}')
            self.assertEqual({n.pitch for n in self.tr(v, 'Frame Drum').notes} & {60, 63}, set())

    # ── criterion 3 ──
    def test_criterion_3_reference_melody_in_both_versions(self):
        for first, text, explora, combate in REFERENCE:
            want = phrase(first, text)
            last = first + text.count('|')
            for v, name in (('explora', explora), ('combate', combate)):
                got = notes_between(self.tr(v, name), first, last)
                self.assertEqual([n.pitch for n in got], [p for _, _, p in want], f'{v} {name} bars {first}-{last}')
                for n, (bar, s, _) in zip(got, want):
                    self.assertLessEqual(abs(n.start - (bar_start(bar) + s * SIXTEENTH_S)), TOL,
                                         f'{v} {name} bar {bar}')

    def test_criterion_3_choirs_sing_only_the_reference(self):
        for name in ('Choir Low', 'Choir High'):
            want = sorted((bar_start(b) + s * SIXTEENTH_S, p) for first, text, e, _ in REFERENCE if e == name
                          for b, s, p in phrase(first, text))
            for v in VERSIONS:
                got = sorted((n.start, n.pitch) for n in self.tr(v, name).notes)
                self.assertEqual([p for _, p in got], [p for _, p in want], f'{v} {name}')
                for (t, _), (w, _) in zip(got, want):
                    self.assertLessEqual(abs(t - w), TOL)

    def test_combat_doublings(self):
        """Trombones = the low choir (the demon answering), note for note and tick for tick; horns: the
        counter-melody of B and the high choir an octave down in bars 18 and 20."""
        low = self.tr('combate', 'Choir Low').notes
        tb = self.tr('combate', 'Trombones').notes
        self.assertEqual([(n.pitch, round(n.start, 6), round(n.end, 6)) for n in tb],
                         [(n.pitch, round(n.start, 6), round(n.end, 6)) for n in low])
        high = self.tr('combate', 'Choir High').notes
        horns = self.tr('combate', 'Horns')
        for bar in (18, 20):
            want = [(n.pitch - 12, round(n.start, 6)) for n in notes_between_list(high, bar, bar)]
            got = [(n.pitch, round(n.start, 6)) for n in notes_between(horns, bar, bar)]
            self.assertEqual(got, want, bar)
        self.assertEqual(sorted({bar_of(n.start) for n in horns.notes}), [12, 13, 14, 15, 16, 18, 20])
        self.assertEqual(sorted({bar_of(n.start) for n in self.tr('explora', 'Cor Anglais').notes}),
                         [12, 13, 14, 15, 16])

    # ── criterion 4 ──
    def test_criterion_4_common_layers_identical(self):
        for name in COMMON:
            a, b = (self.tr(v, name) for v in VERSIONS)
            self.assertEqual([(n.pitch, n.velocity, n.start, n.end) for n in a.notes],
                             [(n.pitch, n.velocity, n.start, n.end) for n in b.notes], name)
            self.assertEqual(a.cc, b.cc, name)
        for name in ('Choir Low', 'Choir High'):
            a, b = (self.tr(v, name) for v in VERSIONS)
            self.assertEqual([(n.pitch, n.velocity, n.start, n.end) for n in a.notes],
                             [(n.pitch, n.velocity, n.start, n.end) for n in b.notes], name)
            self.assertNotEqual(a.cc.get(1), b.cc.get(1), name)
        for v in VERSIONS:
            cb = self.tr(v, 'Contrabassoon')
            self.assertFalse([n for n in cb.notes if n.end > bar_start(21) and n.start < bar_start(27)], v)
            self.assertTrue(cb.cc.get(1))

    def test_criterion_4_frame_drum_pattern(self):
        for v in VERSIONS:
            fd = self.tr(v, 'Frame Drum')
            for bar in range(1, BARS + 1):
                got = sorted((pos16(n.start)[1], n.pitch) for n in notes_between(fd, bar, bar))
                self.assertEqual(got, [(0, 62)] if bar in B_BARS else [(0, 61), (10, 64)], f'{v} bar {bar}')

    # ── criterion 5 ──
    def test_criterion_5_figures(self):
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                sixteenths = v == 'combate' and name in SEMI
                for n in track.notes:
                    if not sixteenths:
                        self.assertLessEqual(off_grid(n.start, EIGHTH_S), TOL + 0.003, f'{v} {name} {n.start:.3f}')
                    if not sixteenths and name != 'Brass Stabs':
                        self.assertGreaterEqual(n.end - n.start, EIGHTH_S - 0.07, f'{v} {name} bar {bar_of(n.start)}')
                if not sixteenths:
                    ons = onsets(track.notes)
                    for x, y in zip(ons, ons[1:]):
                        self.assertGreaterEqual(y - x, EIGHTH_S - 2 * TOL, f'{v} {name} bar {bar_of(x)}')

    # ── criterion 6 ──
    def test_criterion_6_layers_per_section(self):
        for v, col in (('explora', 2), ('combate', 3)):
            tracks = self.song[v].tracks.values()
            for sec in SECTIONS:
                first, last, limit = sec[0], sec[1], sec[col]
                lo, hi = bar_start(first), bar_start(last + 1)
                times = sorted({max(lo, min(hi, x)) for tr in tracks for n in tr.notes
                                for x in (n.start, n.end)} | {lo, hi})
                worst, where = 0, lo
                for a, b in zip(times, times[1:]):
                    if b <= a:
                        continue
                    mid = (a + b) / 2
                    k = sum(any(n.start <= mid < n.end for n in tr.notes) for tr in tracks)
                    if k > worst:
                        worst, where = k, a
                self.assertLessEqual(worst, limit, f'{v} bars {first}-{last} at {where:.3f} s')

    # ── criterion 7 ──
    def test_criterion_7_no_register_clash_with_the_singing_choir(self):
        for v in VERSIONS:
            tracks = self.song[v].tracks
            for names, first, last in MELODY:
                mel = [(name, n) for name in names for n in notes_between(tracks[name], first, last)]
                for other, track in tracks.items():
                    if other in names or other in UNPITCHED or other in ('Trombones', 'Cor Anglais'):
                        continue
                    if other == 'Horns' and first >= 17 and last <= 20:
                        continue                     # horns 8vb with the high choir (declared)
                    for o in track.notes:
                        if o.end - o.start < QUARTER_S - 0.04:
                            continue
                        near = [(name, m) for name, m in mel if abs(m.pitch - o.pitch) <= 11
                                and min(m.end, o.end) - max(m.start, o.start) > 0.04]
                        if near:
                            top = max(level(name, tracks[name], m) for name, m in near)
                            self.assertLess(level(other, track, o), top,
                                            f'{v} {other} pitch {o.pitch} bar {bar_of(o.start)}')

    def test_criterion_7_declared_margins(self):
        """Recitation of A' 15 below the high choir and halo of B 15 below the low choir (E); cor anglais
        10 below the low choir (E); horns below the low choir in B (C)."""
        def margin(v, low_name, high_name, first, last, gap):
            low, high = self.tr(v, low_name), self.tr(v, high_name)
            under = notes_between(low, first, last)
            for n in under:
                times = [n.start] + [t for t, _ in low.cc.get(1, []) + high.cc.get(1, []) if n.start < t < n.end]
                for t in times:
                    self.assertLessEqual(cc_at(low, 1, t), cc_at(high, 1, t) - gap,
                                         f'{v} {low_name} under {high_name} at {t:.2f} s')
        margin('explora', 'Choir Low', 'Choir High', 7, 10, 15)
        margin('explora', 'Choir High', 'Choir Low', 11, 16, 15)
        margin('explora', 'Cor Anglais', 'Choir Low', 12, 16, 10)
        margin('combate', 'Horns', 'Choir Low', 12, 16, 1)

    def test_criterion_7_daggers_outside_the_singing_octave(self):
        dg = self.tr('combate', 'Daggers')
        for bar in range(1, BARS + 1):
            got = {n.pitch for n in notes_between(dg, bar, bar)}
            self.assertEqual(got, DAGGERS.get(bar, set()), f'bar {bar}')

    # ── criterion 8 ──
    def test_criterion_8_ceilings_and_climax(self):
        for v in VERSIONS:
            vmax, cmax = (80, 92) if v == 'explora' else (104, 112)
            for name, track in self.song[v].tracks.items():
                self.assertLessEqual(max(n.velocity for n in track.notes), vmax, f'{v} {name}')
                top = 106 if (v == 'combate' and name == 'Choir High') else cmax
                self.assertLessEqual(max((x for _, x in track.cc.get(1, [])), default=0), top, f'{v} {name}')
            fc = max(n.velocity for n in self.tr(v, 'Finger Cymbals').notes)
            self.assertLessEqual(fc, 44 if v == 'explora' else 50, v)
            low = self.tr(v, 'Choir Low').cc[1]
            peak = max(x for _, x in low)
            self.assertEqual({bar_of(t) for t, x in low if x == peak}, {23}, v)
        dg = self.tr('combate', 'Daggers')
        self.assertLessEqual(max(n.velocity for n in dg.notes), 88)
        self.assertGreaterEqual(min(n.velocity for n in dg.notes), 80)     # §6: vel. 80-88
        for name in ('Bass Drum', 'Timpani'):
            notes = self.tr('combate', name).notes
            top = max(n.velocity for n in notes)
            self.assertEqual({bar_of(n.start) for n in notes if n.velocity == top}, {23}, name)

    # ── criterion 9 ──
    def test_criterion_9_sonatina_cc1_and_lengths(self):
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                if name in SONATINA_CC1:
                    self.assertTrue(track.cc.get(1), f'{v} {name} without CC1')
                    self.assertEqual(track.cc[1][0][0], 0.0, f'{v} {name}')
                    self.assertNotIn(11, track.cc, f'{v} {name}: Sonatina dynamics go through CC1')
                else:
                    self.assertNotIn(1, track.cc, f'{v} {name}: CC1 would act as a volume curve')
                if name in MAX_S:
                    for n in track.notes:
                        self.assertLessEqual(n.end - n.start, MAX_S[name], f'{v} {name} bar {bar_of(n.start)}')

    def test_controller_density_and_cc11_curves(self):
        step = BAR_S / 8 - 1e-6
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                for num, pts in track.cc.items():
                    times = [t for t, _ in pts]
                    self.assertTrue(all(b - a >= step for a, b in zip(times, times[1:])), f'{v} {name} CC{num}')
            for name in ('Timp Roll', 'Organ Pedal') + (('Organ', 'Organ Open') if v == 'explora' else ()):
                values = {x for _, x in self.tr(v, name).cc.get(11, [])}
                self.assertGreater(len(values), 3, f'{v} {name} needs a CC11 curve')

    # ── criterion 10 ──
    def test_criterion_10_combat_grid(self):
        tracks = self.song['combate'].tracks
        ost, low = tracks['Ostinato'], tracks['Ostinato Low']
        for bar in range(1, BARS + 1):
            notes = sorted(notes_between(ost, bar, bar), key=lambda n: n.start)
            self.assertEqual([pos16(n.start)[1] for n in notes], list(range(16)), f'ostinato bar {bar}')
            vel = [n.velocity for n in notes]
            if bar in B_BARS:
                acc = sum(vel[s] for s in ACCENTS) / 6
                rest = sum(vel[s] for s in range(16) if s not in ACCENTS) / 10
                self.assertLessEqual(acc - rest, 4, f'B has no accents (bar {bar})')
            else:
                for s in ACCENTS:
                    for nb in (s - 1, s + 1):
                        if 0 <= nb < 16 and nb not in ACCENTS:
                            self.assertGreater(vel[s], vel[nb], f'accent {s} bar {bar}')
            lows = notes_between(low, bar, bar)
            if bar == 1 or bar in B_BARS or bar == 27:
                self.assertEqual(lows, [], f'ostinato low bar {bar}')
            else:
                self.assertEqual(sorted(pos16(n.start)[1] for n in lows), list(range(16)), f'low bar {bar}')
        # no run of more than 3 sixteenths with the same pitch and velocity (+-3)
        seq = sorted(ost.notes, key=lambda n: n.start)
        run = 1
        for a, b in zip(seq, seq[1:]):
            run = run + 1 if (a.pitch == b.pitch and abs(a.velocity - b.velocity) <= 3) else 1
            self.assertLessEqual(run, 3, f'ostinato run at {b.start:.2f} s')
        chant, stabs = tracks['Chant'], tracks['Brass Stabs']
        for bar in range(1, BARS + 1):
            cs = sorted(pos16(n.start)[1] for n in notes_between(chant, bar, bar))
            if bar in (11, 13, 15, 27):
                self.assertEqual(cs, [0, 3, 6], f'chant bar {bar}')
            elif bar in B_BARS:
                self.assertEqual(cs, [], f'chant bar {bar}')
            else:
                self.assertEqual(cs, list(ACCENTS), f'chant bar {bar}')
            ss = sorted({pos16(n.start)[1] for n in notes_between(stabs, bar, bar)})
            if bar in (1, 2, 27, 28, 12, 14, 16):
                self.assertEqual(ss, [], f'stabs bar {bar}')
            elif bar in B_BARS:
                self.assertEqual(ss, [0], f'stabs bar {bar}')
            else:
                self.assertEqual(ss, [0, 6, 12], f'stabs bar {bar}')
        for n in chant.notes:
            self.assertLessEqual(off_grid(n.start, SIXTEENTH_S), TOL + 0.003)

    def test_combat_percussion_and_daggers_placement(self):
        tracks = self.song['combate'].tracks
        toms = sorted({bar_of(n.start) for n in tracks['Tom'].notes})
        self.assertEqual(toms, [2, 4, 6, 8, 10, 18, 20, 26, 28])
        for bar in toms:
            pos = sorted({pos16(n.start)[1] for n in notes_between(tracks['Tom'], bar, bar)})
            self.assertEqual(pos, list(range(4, 16)) if bar == 20 else [10, 11, 13, 14, 15], bar)
        for bar in range(1, BARS + 1):
            hits = sorted(pos16(n.start)[1] for n in notes_between(tracks['Bass Drum'], bar, bar) if n.pitch == 62)
            if bar in (1, 27, 28) or bar in B_BARS:
                self.assertEqual(hits, [0, 8], f'bass drum bar {bar}')
            else:
                self.assertEqual(hits, [0, 3, 6, 8, 12, 14], f'bass drum bar {bar}')
        rolls = {bar_of(n.start) for n in tracks['Bass Drum'].notes if n.pitch == 63}
        self.assertEqual(rolls, {20})
        for n in tracks['Daggers'].notes:
            self.assertIn(pos16(n.start)[1], (2, 5, 9, 11, 13))
        for v, bars in (('explora', {20}), ('combate', {16, 20})):
            roll = self.tr(v, 'Timp Roll').notes
            self.assertEqual({bar_of(n.start) for n in roll}, bars, v)
            for n in roll:
                self.assertLess(n.end, bar_start(bar_of(n.start) + 1), v)

    # ── criterion 11 ──
    def test_criterion_11_counts(self):
        def hits(v, name, pitch=None):
            notes = [n for n in self.tr(v, name).notes if pitch is None or n.pitch == pitch]
            return [bar_of(t) for t in onsets(notes)]
        self.assertEqual(len(hits('explora', 'Finger Cymbals')), 6)
        self.assertEqual(len(hits('explora', 'Hand Bell')), 4)
        self.assertEqual(hits('explora', 'Bell'), [1, 21])
        self.assertEqual(len(hits('explora', 'Gong')), 3)
        self.assertEqual(len(hits('combate', 'Finger Cymbals')), 4)
        self.assertEqual(hits('combate', 'Metal', 61), [1, 23])
        self.assertEqual(hits('combate', 'Metal', 63), [3, 5, 7, 9, 17, 19])
        self.assertEqual(hits('combate', 'Broken Bells'), [1, 21, 23, 25])
        for t in onsets(self.tr('combate', 'Broken Bells').notes):
            dyad = {n.pitch for n in self.tr('combate', 'Broken Bells').notes if abs(n.start - t) <= 0.03}
            self.assertEqual(dyad, {60, 61})

    # ── criterion 12 ──
    def test_criterion_12_bass_on_beats_1_and_3(self):
        for v in VERSIONS:
            pitched = [tr for name, tr in self.song[v].tracks.items() if name not in UNPITCHED]
            for bar in range(1, BARS + 1):
                for beat, name in zip((0, 2), BASS[bar]):
                    t = bar_start(bar) + beat * QUARTER_S + 0.06
                    sounding = [n.pitch for tr in pitched for n in tr.notes if n.start <= t < n.end]
                    self.assertTrue(sounding, f'{v} bar {bar} beat {beat + 1}')
                    self.assertEqual(min(sounding) % 12, pc(name), f'{v} bar {bar} beat {beat + 1}')

    # ── craft rules of the orchestrator's brief ──
    def test_craft_parallels_repetition_and_legato(self):
        for v in VERSIONS:
            parts = compose.build(v)
            self.assertEqual(compose.parallels(parts, v), [], v)
            self.assertEqual(compose.repetitions(parts), [], v)
            joins = compose.legato_joins(parts, v)
            self.assertTrue(joins, v)
            self.assertTrue(all(10 <= ms <= 30.5 for ms in joins), (v, min(joins), max(joins)))

    def test_velocities_shape_the_phrases(self):
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                if len(track.notes) >= 4:
                    self.assertGreater(len({n.velocity for n in track.notes}), 2, f'{v} {name}')


def notes_between_list(notes, first, last):
    lo, hi = bar_start(first) - TOL, bar_start(last + 1) - TOL
    return [n for n in notes if lo <= n.start < hi]


if __name__ == '__main__':
    unittest.main()
