"""Acceptance tests for «Bajo la posada vieja» (docs/musica/acto1-contrabandistas.md, §8 criteria 1-11).

Both MIDIs (exploration and combat) are generated into a temporary folder and read back with
estudio.midi_io, independently of the checks that compose.py prints.
Run with:
  scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto1-contrabandistas/test_compose.py
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

BPM = 135
BAR_S = 3 * 60 / BPM                 # a 6/8 bar = 3 quarter notes
EIGHTH_S = BAR_S / 6
LOOP_S = 60 * BAR_S                  # 80.000 s
TOL = 0.0105                         # humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

VSCO = 'VSCO-2-CE/{}.sfz'.format
VCSL = 'VCSL/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
PATCH = {
    'Ocarina': VCSL + 'Aerophones/Edge-blown Aerophones/Ocarina, Typical - SusVib.sfz',
    'Tenor Recorder': VCSL + 'Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - SusVib.sfz',
    'Harmonica Vib': VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Vib.sfz',
    'Harmonica Accented': VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Accented.sfz',
    'Strumstick': VCSL + 'Chordophones/Composite Chordophones/Strumstick.sfz',
    'Folk Harp': VCSL + 'Chordophones/Composite Chordophones/Folk Harp.sfz',
    'Tavern Piano': VCSL + 'Chordophones/Zithers/Upright Piano, Knight.sfz',
    'Violin Solo': SSO + 'Strings - Performance/Violin Solo 1 Sustain.sfz',
    'Bass Clarinet': SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz',
    'Horns Marcato': SSO + 'Brass - Performance/Horns Marcato.sfz',
    'Horns Sustain': SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Violins Marcato': SSO + 'Strings - Performance/1st Violins Marcato.sfz',
    'Horn Sus': VSCO('FHornSus'),
    'Violins Sus': VSCO('ViolinEnsSusVib'),
    'Violins Pizz': VSCO('ViolinEnsPizz'),
    'Violas Sus Quiet': VSCO('ViolaEnsSusVib-Quiet'),
    'Violas Spic': VSCO('ViolaEnsSpic'),
    'Violas Trem': VSCO('ViolaEnsTrem'),
    'Cellos Sus': VSCO('CelloEnsSusVib'),
    'Cellos Sus Quiet': VSCO('CelloEnsSusVib-Quiet'),
    'Cellos Spic': VSCO('CelloEnsSpic'),
    'Basses Pizz': VSCO('ContrabassPizz'),
    'Basses Sus Quiet': VSCO('ContrabassSusVB-Quiet'),
    'Basses Trem': VSCO('ContrabassTrem'),
    'Bassoon Stac': VSCO('BassoonStac'),
    'Tuba Stac': VSCO('TubaStac'),
    'Timpani': VSCO('Timpani'),
    'Timpani Roll': VSCO('TimpaniRolls'),
    'Cajon': VCSL + 'Idiophones/Struck Idiophones/Cajon.sfz',
    'Frame Drum': VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz',
    'Bass Drum': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Hull Creak': VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz',
    'Tom': VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz',
    'Ocean Drum': VCSL + 'Membranophones/Other Membranophones/Ocean Drum.sfz',
    'Cymbal': VCSL + 'Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz',
}
TRACKS = {
    'explora': ['Ocarina', 'Tenor Recorder', 'Harmonica Vib', 'Strumstick', 'Folk Harp', 'Tavern Piano',
                'Violin Solo', 'Bass Clarinet', 'Horn Sus', 'Violas Sus Quiet', 'Violas Trem', 'Cellos Sus',
                'Cellos Sus Quiet', 'Basses Pizz', 'Basses Sus Quiet', 'Timpani', 'Timpani Roll', 'Cajon',
                'Frame Drum', 'Hull Creak', 'Ocean Drum'],
    'combate': ['Violin Solo', 'Horns Marcato', 'Horns Sustain', 'Violins Marcato', 'Violins Sus',
                'Violins Pizz', 'Harmonica Accented', 'Strumstick', 'Tavern Piano', 'Bass Clarinet',
                'Violas Spic', 'Cellos Spic', 'Basses Pizz', 'Basses Trem', 'Bassoon Stac', 'Tuba Stac',
                'Timpani', 'Timpani Roll', 'Cajon', 'Frame Drum', 'Bass Drum', 'Hull Creak', 'Tom', 'Cymbal'],
}
SONATINA = {'Violin Solo': 5.0, 'Horns Marcato': 2.8, 'Horns Sustain': 2.8, 'Violins Marcato': 3.5,
            'Bass Clarinet': None}
UNPITCHED = {'Cajon', 'Frame Drum', 'Bass Drum', 'Hull Creak', 'Tom', 'Ocean Drum', 'Cymbal'}

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    step, rest, acc = name[0], name[1:], 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


def phrase(bar, text):
    """'G4:3 D5:3 | E5:2 ...' (durations in eighths, r = rest) -> [(bar, eighth, pitch)]."""
    out = []
    for i, chunk in enumerate(text.split('|')):
        e = 0
        for item in chunk.split():
            p, d = item.split(':')
            if p != 'r':
                out.append((bar + i, e, midi(p)))
            e += int(d)
        assert e == 6, (bar + i, text)
    return out


# Reference melody of section 5 (identical in both versions) and the track that carries it.
MOTIF = 'G4:3 D5:3 | E5:2 D5:1 Bb4:3 | C5:2 Bb4:1 A4:3 | G4:6'
COLA = ' | '.join('C5:1 Bb4:1 {}:1 {}:3'.format('A4' if b in (29, 31, 32, 36) else 'Ab4',
                                                 'F#4' if b == 36 else 'G4') for b in range(29, 37))
REFERENCE = [
    (1, 4, 'D5:3 A5:3 | r:6 | D5:3 A5:2 G5:1 | F#5:6', 'Ocarina', 'Violin Solo'),
    (5, 8, MOTIF, 'Tenor Recorder', 'Horns Marcato'),
    (9, 12, 'Bb4:2 C5:1 D5:3 | Eb5:2 D5:1 C5:3 | D5:3 C5:2 Bb4:1 | A4:6', 'Harmonica Vib', 'Violin Solo'),
    (13, 16, MOTIF, 'Violin Solo', 'Violin Solo'),
    (17, 20, 'G5:3 F5:2 Eb5:1 | Eb5:2 D5:1 C5:3 | F5:2 D5:1 Bb4:3 | C5:3 A4:3', 'Tenor Recorder', 'Violins Sus'),
    (21, 28, 'Bb4:3 F5:3 | G5:2 F5:1 D5:3 | Eb5:2 D5:1 C5:3 | Bb4:3 r:2 D5:1 | '
             'G5:2 F5:1 Eb5:3 | F5:2 Eb5:1 D5:3 | Bb4:3 C5:2 Eb5:1 | D5:6', 'Tavern Piano', 'Violin Solo'),
    (29, 36, 'G3:3 C3:3 | Bb2:2 C3:1 Eb3:3 | D3:2 Eb3:1 F3:3 | G3:6 | '
             'Eb3:3 G3:3 | C4:2 Bb3:1 Ab3:3 | G3:3 E3:3 | G3:3 F#3:3', 'Bass Clarinet', 'Bass Clarinet'),
    (29, 36, COLA, 'Folk Harp', 'Violins Pizz'),
    (37, 44, 'Eb4:3 Bb4:3 | F4:3 C5:3 | G4:3 D5:3 | Ab4:3 Eb5:3 | Bb4:3 F5:3 | C5:3 G5:3 | D5:3 G5:3 | '
             'D5:3 F#4:3', 'Tenor Recorder', 'Violins Marcato'),
    (45, 48, MOTIF, 'Violin Solo', 'Violins Sus'),
    (49, 52, 'Bb5:3 G5:2 Eb5:1 | Eb5:2 D5:1 C5:3 | Bb4:2 D5:1 F5:3 | Eb5:2 D5:1 C5:3', 'Violin Solo',
     'Violins Sus'),
    (53, 56, 'C5:2 Bb4:1 A4:3 | G4:6 | Eb5:3 C5:3 | D5:6', 'Tenor Recorder', 'Violin Solo'),
    (57, 60, 'D5:3 A5:3 | r:6 | D5:3 A5:2 G5:1 | A4:3 F#5:3', 'Ocarina', 'Violin Solo'),
]
# Declared unisons (section 6): every track listed carries the reference melody in that passage.
UNISONS = {
    'explora': [(37, 40, ['Tenor Recorder', 'Harmonica Vib']), (41, 44, ['Tenor Recorder', 'Violin Solo']),
                (45, 52, ['Violin Solo', 'Tenor Recorder'])],
    'combate': [(13, 16, ['Violin Solo', 'Violins Sus']), (21, 28, ['Violin Solo', 'Tavern Piano']),
                (29, 36, ['Bass Clarinet', 'Bassoon Stac']), (37, 40, ['Violins Marcato', 'Horns Marcato']),
                (45, 48, ['Horns Marcato', 'Violins Sus']), (49, 52, ['Violins Sus', 'Violin Solo'])],
}
# Melody windows for the register-clash rule (tracks, first bar, last bar, lowest melody pitch).
MELODY = {
    'explora': [(['Ocarina'], 1, 4, 0), (['Tenor Recorder'], 5, 8, 0), (['Harmonica Vib'], 9, 12, 0),
                (['Violin Solo'], 13, 16, 0), (['Tenor Recorder'], 17, 20, 0), (['Tavern Piano'], 21, 28, 70),
                (['Bass Clarinet', 'Folk Harp'], 29, 36, 0), (['Tenor Recorder', 'Harmonica Vib'], 37, 40, 0),
                (['Tenor Recorder', 'Violin Solo'], 41, 52, 0), (['Tenor Recorder'], 53, 56, 0),
                (['Ocarina'], 57, 60, 0)],
    'combate': [(['Violin Solo'], 1, 4, 0), (['Horns Marcato'], 5, 8, 0), (['Violin Solo'], 9, 12, 0),
                (['Violin Solo', 'Violins Sus'], 13, 16, 0), (['Violins Sus'], 17, 20, 0),
                (['Violin Solo', 'Tavern Piano'], 21, 28, 70),
                (['Bass Clarinet', 'Bassoon Stac', 'Violins Pizz'], 29, 36, 0),
                (['Violins Marcato', 'Horns Marcato'], 37, 44, 0), (['Horns Marcato', 'Violins Sus'], 45, 48, 0),
                (['Violins Sus', 'Violin Solo'], 49, 52, 0), (['Violin Solo'], 53, 60, 0)],
}
THIRDS = {'explora': 'Harmonica Vib', 'combate': 'Harmonica Accented'}   # exception of criterion 7 (B)
SECTIONS = [(1, 4, 6, 8), (5, 12, 7, 11), (13, 20, 8, 12), (21, 28, 7, 11), (29, 36, 6, 9), (37, 44, 8, 12),
            (45, 56, 10, 12), (57, 60, 5, 8)]
# Registers of section 6 (track, version, first bar, last bar, lo, hi).
REGISTERS = [
    ('Ocarina', 'explora', 1, 60, 69, 81), ('Harmonica Vib', 'explora', 1, 60, 55, 75),
    ('Harmonica Accented', 'combate', 1, 60, 55, 75), ('Strumstick', None, 1, 60, 55, 67),
    ('Tenor Recorder', 'explora', 1, 60, 63, 82), ('Violin Solo', None, 1, 60, 66, 82),
    ('Violins Sus', 'combate', 1, 60, 67, 82), ('Violins Marcato', 'combate', 37, 44, 63, 79),
    ('Horns Marcato', 'combate', 5, 8, 67, 76), ('Horns Marcato', 'combate', 37, 44, 58, 75),
    ('Horns Marcato', 'combate', 45, 48, 67, 76), ('Horns Sustain', 'combate', 13, 52, 53, 62),
    ('Horn Sus', 'explora', 45, 52, 53, 62), ('Bass Clarinet', None, 29, 36, 46, 60),
    ('Folk Harp', 'explora', 17, 20, 43, 67), ('Folk Harp', 'explora', 29, 36, 66, 72),
    ('Violins Pizz', 'combate', 29, 36, 66, 72), ('Tavern Piano', None, 21, 28, 34, 79),
    ('Violas Spic', 'combate', 1, 60, 55, 64), ('Cellos Spic', 'combate', 1, 60, 38, 55),
    ('Basses Pizz', None, 1, 60, 31, 43), ('Tuba Stac', 'combate', 1, 36, 31, 43),
    ('Tuba Stac', 'combate', 37, 44, 27, 38), ('Tuba Stac', 'combate', 45, 56, 27, 43),
    ('Bassoon Stac', 'combate', 1, 28, 50, 58), ('Bassoon Stac', 'combate', 29, 36, 46, 60),
    ('Timpani', None, 1, 60, 38, 48), ('Timpani Roll', None, 43, 44, 38, 38),
    ('Cellos Sus Quiet', 'explora', 1, 4, 38, 43), ('Cellos Sus Quiet', 'explora', 9, 12, 43, 55),
    ('Cellos Sus Quiet', 'explora', 29, 36, 39, 50), ('Cellos Sus Quiet', 'explora', 57, 60, 38, 45),
    ('Cellos Sus', 'explora', 13, 16, 58, 62), ('Cellos Sus', 'explora', 37, 44, 39, 50),
    ('Cellos Sus', 'explora', 45, 56, 36, 55), ('Violas Sus Quiet', 'explora', 21, 28, 55, 65),
    ('Violas Trem', 'explora', 41, 44, 55, 64), ('Basses Trem', 'combate', 29, 36, 27, 38),
]
CEILINGS = {'Violin Solo': 82, 'Violins Sus': 82, 'Violins Marcato': 82, 'Violins Pizz': 82,
            'Tenor Recorder': 82, 'Horns Marcato': 76, 'Horns Sustain': 76, 'Horn Sus': 76}


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def notes_between(track, first, last, lo_pitch=0):
    lo, hi = bar_start(first) - TOL, bar_start(last + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi and n.pitch >= lo_pitch]


def cc_at(track, num, t):
    pts = track.cc.get(num, [])
    value = pts[0][1] if pts else 0
    for when, v in pts:
        if when <= t + 1e-9:
            value = v
    return value


def level(name, track, note):
    return cc_at(track, 1, note.start) if name in SONATINA else note.velocity


class SmugglersScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        out = tempfile.mkdtemp()
        cls.paths = compose.write_all(out)
        cls.mid = {v: mido.MidiFile(cls.paths[v]) for v in VERSIONS}
        cls.song = {v: midi_io.load(cls.paths[v]) for v in VERSIONS}

    # ── structure ──
    def test_one_named_track_per_instrument_and_patch(self):
        for v in VERSIONS:
            names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid[v].tracks]
            self.assertEqual(sorted(names), sorted(TRACKS[v]), v)
            self.assertEqual({k: compose.PATCHES[k] for k in names}, {k: PATCH[k] for k in names})
            for name in names:
                self.assertNotRegex(PATCH[name], r'(?i)keyswitch|\bKS\b')

    def test_criterion_1_tempo_meter_and_length(self):
        lengths = set()
        for v in VERSIONS:
            mid = self.mid[v]
            tempos = [m for tr in mid.tracks for m in tr if m.type == 'set_tempo']
            sigs = [m for tr in mid.tracks for m in tr if m.type == 'time_signature']
            self.assertEqual(len(tempos), 1)
            self.assertTrue(any(m.type == 'set_tempo' for m in mid.tracks[0]))
            self.assertAlmostEqual(mido.tempo2bpm(tempos[0].tempo), BPM, places=3)
            self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(6, 8)])
            for tr in mid.tracks:
                lengths.add(sum(m.time for m in tr))
            self.assertEqual(mid.ticks_per_beat, self.mid['explora'].ticks_per_beat)
        self.assertEqual(lengths, {60 * 3 * self.mid['explora'].ticks_per_beat})

    def test_criterion_1_notes_inside_the_loop(self):
        for v in VERSIONS:
            for track in self.song[v].tracks.values():
                for n in track.notes:
                    self.assertLess(n.start, LOOP_S, f'{v} {track.name}')
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

    # ── criterion 2 ──
    def test_criterion_2_catalog_ranges_registers_and_ceilings(self):
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                inst = sfz.load(library(*PATCH[name].split('/')))
                keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                        for k in range(r.lokey, r.hikey + 1)}
                for n in track.notes:
                    self.assertIn(n.pitch, keys, f'{v} {name} {n.pitch}')
                    self.assertLessEqual(n.pitch, CEILINGS.get(name, 127), f'{v} {name}')
            for name, ver, first, last, lo, hi in REGISTERS:
                if ver not in (None, v) or name not in self.song[v].tracks:
                    continue
                for n in notes_between(self.song[v].tracks[name], first, last):
                    self.assertTrue(lo <= n.pitch <= hi, f'{v} {name} bar {bar_of(n.start)} pitch {n.pitch}')

    # ── criterion 3 ──
    def test_criterion_3_reference_melody_in_both_versions(self):
        for first, last, text, explora, combate in REFERENCE:
            want = phrase(first, text)
            for v, name in (('explora', explora), ('combate', combate)):
                names = [name] + [t for a, b, ts in UNISONS[v] if a <= first and last <= b and name in ts
                                  for t in ts if t != name]
                for track_name in names:
                    got = notes_between(self.song[v].tracks[track_name], first, last,
                                        70 if track_name == 'Tavern Piano' else 0)
                    if track_name == 'Bassoon Stac':
                        got = [n for n in got if n.pitch <= 60]
                    self.assertEqual([n.pitch for n in got], [p for _, _, p in want],
                                     f'{v} {track_name} bars {first}-{last}')
                    for n, (bar, e, _) in zip(got, want):
                        self.assertLessEqual(abs(n.start - (bar_start(bar) + e * EIGHTH_S)), TOL,
                                             f'{v} {track_name} bar {bar}')

    # ── criterion 4 ──
    def test_criterion_4_common_basses_pizz_identical(self):
        a, b = (self.song[v].tracks['Basses Pizz'].notes for v in VERSIONS)
        self.assertEqual([(n.pitch, n.velocity, n.start, n.end) for n in a],
                         [(n.pitch, n.velocity, n.start, n.end) for n in b])
        for bar in range(1, 61):
            eighths = sorted(round((n.start - bar_start(bar)) / EIGHTH_S) for n in notes_between(
                self.song['explora'].tracks['Basses Pizz'], bar, bar))
            if bar <= 4 or bar >= 58:
                self.assertEqual(eighths, [], bar)
            elif 29 <= bar <= 36 or bar == 57:
                self.assertEqual(eighths, [0], bar)
            else:
                self.assertEqual(eighths, [0, 3], bar)

    # ── criterion 5 ──
    def test_criterion_5_nothing_shorter_than_an_eighth(self):
        min_len = EIGHTH_S - 0.07          # performance trims (strum spread, repeated notes)
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                for n in track.notes:
                    if name == 'Tom' and v == 'combate' and bar_of(n.start) in (12, 20, 44):
                        continue
                    self.assertGreaterEqual(n.end - n.start, min_len, f'{v} {name} bar {bar_of(n.start)}')
                onsets = sorted({round(n.start, 4) for n in track.notes})
                clusters = [t for i, t in enumerate(onsets) if i == 0 or t - onsets[i - 1] > 0.07]
                for x, y in zip(clusters, clusters[1:]):
                    if name == 'Tom' and v == 'combate' and bar_of(x) in (12, 20, 44):
                        continue
                    self.assertGreaterEqual(y - x, EIGHTH_S - 0.07, f'{v} {name} bar {bar_of(x)}')
        toms = [bar_of(n.start) for n in self.song['combate'].tracks['Tom'].notes]
        self.assertEqual(sorted(set(toms)), [12, 20, 44])

    # ── criterion 6 ──
    def test_criterion_6_layers_per_section(self):
        for v, col in (('explora', 2), ('combate', 3)):
            tracks = self.song[v].tracks.values()
            for sec in SECTIONS:
                first, last, limit = sec[0], sec[1], sec[col]
                lo, hi = bar_start(first), bar_start(last + 1)
                times = sorted({max(lo, min(hi, x)) for tr in tracks for n in tr.notes
                                for x in (n.start, n.end)} | {lo, hi})
                worst = 0
                for a, b in zip(times, times[1:]):
                    if b <= a:
                        continue
                    mid = (a + b) / 2
                    worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes) for tr in tracks))
                self.assertLessEqual(worst, limit, f'{v} bars {first}-{last}')

    # ── criterion 7 ──
    def test_criterion_7_no_register_clash_with_the_melody(self):
        for v in VERSIONS:
            tracks = self.song[v].tracks
            for names, first, last, lo_pitch in MELODY[v]:
                mel = [(name, n) for name in names for n in notes_between(tracks[name], first, last, lo_pitch)]
                for other, track in tracks.items():
                    if other in names or other in UNPITCHED:
                        continue
                    if other == THIRDS[v] and first >= 21 and last <= 28:
                        continue
                    for o in track.notes:
                        if o.end - o.start < 2 * EIGHTH_S - 0.04:
                            continue
                        near = [(name, m) for name, m in mel if abs(m.pitch - o.pitch) <= 11
                                and min(m.end, o.end) - max(m.start, o.start) > 0.04]
                        if near:
                            top = max(level(name, tracks[name], m) for name, m in near)
                            self.assertLess(level(other, track, o), top,
                                            f'{v} {other} pitch {o.pitch} bar {bar_of(o.start)}')
        # the harmonica thirds of B: 10 below the piano
        for v in VERSIONS:
            piano = notes_between(self.song[v].tracks['Tavern Piano'], 25, 28, 70)
            harm = notes_between(self.song[v].tracks[THIRDS[v]], 25, 28)
            self.assertEqual(len(harm), len(piano))
            for h, p in zip(harm, piano):
                self.assertTrue(63 <= h.pitch <= 75 and h.pitch < p.pitch)
                self.assertEqual(h.velocity, p.velocity - 10, f'{v} bar {bar_of(h.start)}')
                self.assertLessEqual(abs(h.start - p.start), TOL * 2)

    # ── criterion 8 ──
    def test_criterion_8_velocities_cc1_and_climax(self):
        for v in VERSIONS:
            tracks = self.song[v].tracks
            for name, track in tracks.items():
                self.assertLessEqual(max(n.velocity for n in track.notes), 105, f'{v} {name}')
                self.assertLessEqual(max((x for _, x in track.cc.get(1, [])), default=0), 112, f'{v} {name}')
                if name == 'Tavern Piano':
                    self.assertLessEqual(max(n.velocity for n in track.notes), 90)
                if name.startswith('Harmonica'):
                    self.assertLessEqual(max(n.velocity for n in track.notes), 70, f'{v} harmonica above mp')
            mel = [(name, n) for names, first, last, lo in MELODY[v] for name in names
                   for n in notes_between(tracks[name], first, last, lo)]
            top_vel = max(n.velocity for _, n in mel)
            self.assertEqual({bar_of(n.start) for _, n in mel if n.velocity == top_vel}, {49}, f'{v} velocity')
            son = [(name, n) for name, n in mel if name in SONATINA]
            top_cc = max(cc_at(tracks[name], 1, n.start) for name, n in son)
            self.assertEqual({bar_of(n.start) for name, n in son if cc_at(tracks[name], 1, n.start) == top_cc},
                             {49}, f'{v} CC1')

    # ── criterion 9 ──
    def test_criterion_9_sonatina_cc1_at_zero_and_max_lengths(self):
        for v in VERSIONS:
            for name, limit in SONATINA.items():
                track = self.song[v].tracks.get(name)
                if track is None:
                    continue
                self.assertTrue(track.cc.get(1), f'{v} {name} without CC1')
                self.assertEqual(track.cc[1][0][0], 0.0, f'{v} {name}')
                if limit:
                    for n in track.notes:
                        self.assertLessEqual(n.end - n.start, limit, f'{v} {name} bar {bar_of(n.start)}')

    def test_controller_density(self):
        step = BAR_S / 8 - 1e-6
        for v in VERSIONS:
            for name, track in self.song[v].tracks.items():
                for num, pts in track.cc.items():
                    times = [t for t, _ in pts]
                    self.assertTrue(all(b - a >= step for a, b in zip(times, times[1:])), f'{v} {name} CC{num}')

    # ── criterion 10 ──
    def test_criterion_10_percussion(self):
        for v in VERSIONS:
            for name in self.song[v].tracks:
                self.assertNotRegex(PATCH[name], r'(?i)snare|tambourine|ratchet|vibraslap')
            tracks = self.song[v].tracks
            self.assertTrue({n.pitch for n in tracks['Frame Drum'].notes} <= {61, 62, 65})
            creaks = [n for name in ('Bass Drum', 'Hull Creak') if name in tracks
                      for n in tracks[name].notes if n.pitch == 68]
            self.assertLessEqual(len(creaks), 5, v)
            self.assertEqual({n.pitch for n in tracks['Hull Creak'].notes}, {68})
            if 'Bass Drum' in tracks:
                self.assertEqual({n.pitch for n in tracks['Bass Drum'].notes}, {62})
        cym = self.song['combate'].tracks['Cymbal'].notes
        # the 2.5 s crescendo sample is below -20 dB of its peak for its first second
        audible = [n.start + (1.0 if n.pitch == 63 else 0.0) for n in cym]
        self.assertTrue(all(bar_start(44) <= t < bar_start(46) for t in audible), audible)
        self.assertEqual(sorted(n.pitch for n in cym), [63, 66])
        hit = next(n for n in cym if n.pitch == 66)
        self.assertLessEqual(hit.velocity, 80)
        self.assertLessEqual(abs(hit.start - bar_start(45)), TOL)

    # ── criterion 11 ──
    def test_criterion_11_cola_ostinato_natural_and_flat_a(self):
        for v, name in (('explora', 'Folk Harp'), ('combate', 'Violins Pizz')):
            track = self.song[v].tracks[name]
            for bar in range(29, 37):
                a = [n.pitch for n in notes_between(track, bar, bar) if n.pitch in (68, 69)]
                self.assertEqual(a, [69] if bar in (29, 31, 32, 36) else [68], f'{v} bar {bar}')
            self.assertEqual(notes_between(track, 36, 36)[-1].pitch, 66)

    # ── craft rules of the orchestrator's brief ──
    def test_craft_parallels_repetition_and_legato(self):
        for v in VERSIONS:
            parts = compose.build(v)
            self.assertEqual(compose.parallels(parts, v), [], v)
            self.assertEqual(compose.repetitions(parts), [], v)
            joins = compose.legato_joins(parts, v)
            self.assertTrue(joins, v)
            self.assertTrue(all(10 <= ms <= 30.5 for ms in joins), (v, min(joins), max(joins)))

    def test_same_humanization_for_shared_melody_onsets(self):
        """In a crossfade the two versions must not flam: the reference melody lands on the same ticks."""
        for first, last, text, explora, combate in REFERENCE:
            a = notes_between(self.song['explora'].tracks[explora], first, last,
                              70 if explora == 'Tavern Piano' else 0)
            b = notes_between(self.song['combate'].tracks[combate], first, last,
                              70 if combate == 'Tavern Piano' else 0)
            self.assertEqual([round(n.start, 6) for n in a], [round(n.start, 6) for n in b], f'bars {first}-{last}')


if __name__ == '__main__':
    unittest.main()
