"""Acceptance tests for «La función de medianoche», Vexis' boss theme (docs/musica/acto1-vexis.md).

They read the generated MIDI (score criteria 1-11 of section 8, plus the craft rules of the
orchestration brief) independently of the checks that compose.py prints.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto1-vexis/test_compose.py
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

BPM = 180
BEAT_S = 60 / BPM
BAR_S = 3 * BEAT_S                     # 1.000 s
BARS = 80
LOOP_S = BARS * BAR_S                  # 80.000 s
MENU_MID = os.path.join(HERE, '..', 'menu', 'build', 'menu.mid')
MENU_BEAT_S = 60 / 108
MENU_BAR_S = 3 * MENU_BEAT_S

S = 'Sonatina Symphonic Orchestra'
EXPECTED_TRACKS = {
    'Celesta': ('sso', S, 'Percussion', 'Celeste.sfz'),
    'Copas': ('VCSL', 'Idiophones', 'Friction Idiophones', 'Wine Glasses - Slow.sfz'),
    'Vibraphone Bowed': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Vibraphone - Bowed.sfz'),
    'Xylophone': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Xylophone - Soft Mallets.sfz'),
    'Organillo': ('sso', S, 'Organ', 'Great - Flute 4ft.sfz'),
    'Flute Sus': ('VSCO-2-CE', 'FluteSusVib.sfz'),
    'Flute Stac': ('VSCO-2-CE', 'FluteStac.sfz'),
    'Clarinet Stac': ('VSCO-2-CE', 'ClarinetStac.sfz'),
    'Bassoon Stac': ('VSCO-2-CE', 'BassoonStac.sfz'),
    'Trompa 1': ('VSCO-2-CE', 'FHornSus.sfz'),
    'Horns Marcato': ('sso', S, 'Brass - Performance', 'Horns Marcato.sfz'),
    'Horns Sus': ('sso', S, 'Brass - Performance', 'Horns Sustain.sfz'),
    'Trombones Marcato': ('sso', S, 'Brass - Performance', 'Trombones Marcato.sfz'),
    'Trombones Sus': ('sso', S, 'Brass - Performance', 'Trombones Sustain (looped).sfz'),
    'Trombones Stac': ('sso', S, 'Brass - Performance', 'Trombones Staccato.sfz'),
    'Tuba Stac': ('VSCO-2-CE', 'TubaStac.sfz'),
    'Timpani': ('VSCO-2-CE', 'Timpani.sfz'),
    'Timpani Roll': ('VSCO-2-CE', 'TimpaniRolls.sfz'),
    'Bass Drum': ('VCSL', 'Membranophones', 'Struck Membranophones', 'Bass Drum 2.sfz'),
    'Cymbal': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Suspended Cymbal 2.sfz'),
    'Tam-tam': ('sso', S, 'Percussion', 'Cymbals & Tamtam.sfz'),
    'Cuchillo': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Woodblock.sfz'),
    'Flexaton': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Flexatone.sfz'),
    'Carraca': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Ratchet.sfz'),
    'Mark Trees': ('VCSL', 'Idiophones', 'Struck Idiophones', 'Mark Trees.sfz'),
    'Violin Solo': ('sso', S, 'Strings - Performance', 'Violin Solo 1 Sustain.sfz'),
    'Violins Spic': ('VSCO-2-CE', 'ViolinEnsSpic.sfz'),
    'Violins Col Legno': ('sso', S, 'Strings - Performance', '1st Violins Col Legno.sfz'),
    'Violas Pizz': ('VSCO-2-CE', 'ViolaEnsPizz.sfz'),
    'Violas Spic': ('VSCO-2-CE', 'ViolaEnsSpic.sfz'),
    'Celli Col Legno': ('sso', S, 'Strings - Performance', 'Celli Col Legno.sfz'),
    'Basses Pizz': ('VSCO-2-CE', 'ContrabassPizz.sfz'),
    'Basses Trem': ('VSCO-2-CE', 'ContrabassTrem.sfz'),
    'Coro': ('sso', S, 'Chorus - Performance', 'Mixed Chorus.sfz'),
}
SONATINA = {n for n, p in EXPECTED_TRACKS.items() if p[0] == 'sso'}
CC1_DYNAMICS = {'Violin Solo', 'Horns Marcato', 'Horns Sus', 'Trombones Marcato', 'Trombones Sus', 'Coro'}
MAX_NOTE_S = {'Horns Marcato': 2.8, 'Horns Sus': 2.8, 'Trombones Marcato': 2.2, 'Violin Solo': 5.0}
UNPITCHED = {'Bass Drum', 'Cymbal', 'Tam-tam', 'Cuchillo', 'Flexaton', 'Carraca', 'Mark Trees'}
CC11_SUSTAINED = {'Trompa 1', 'Flute Sus', 'Basses Trem', 'Timpani Roll', 'Copas', 'Vibraphone Bowed'}
LEGATO_LINES = {'Trompa 1', 'Violin Solo', 'Flute Sus', 'Horns Sus', 'Trombones Sus'}

# Section 6 registers: (track, first bar, last bar, lowest, highest), by the bar where the note starts.
# Where the brief gives no register (or lists a single note for an ostinato), the entry documents
# the choice made in compose.py.
REGISTERS = [
    # intro 1-4
    ('Celesta', 1, 3, 61, 81), ('Basses Pizz', 1, 3, 32, 37), ('Violas Pizz', 1, 3, 56, 64),
    ('Timpani', 1, 3, 37, 44), ('Trombones Sus', 3, 3, 50, 58), ('Trombones Marcato', 4, 4, 44, 57),
    ('Horns Marcato', 4, 4, 56, 69), ('Timpani', 4, 4, 44, 44), ('Violins Col Legno', 4, 4, 56, 68),
    # A 5-20
    ('Clarinet Stac', 5, 8, 73, 81), ('Xylophone', 5, 8, 73, 81), ('Trompa 1', 9, 12, 61, 71),
    ('Violin Solo', 13, 16, 73, 81), ('Flute Sus', 17, 20, 72, 83), ('Basses Pizz', 5, 20, 25, 40),
    ('Tuba Stac', 5, 20, 32, 44), ('Violas Pizz', 5, 20, 56, 66), ('Violins Col Legno', 5, 20, 56, 71),
    ('Bassoon Stac', 5, 20, 46, 58), ('Trombones Stac', 13, 20, 52, 64), ('Timpani', 5, 20, 37, 49),
    # B 21-36 (glasses and bowed vibraphone start ~150 ms early, in the previous bar)
    ('Celesta', 21, 28, 61, 83), ('Copas', 20, 28, 80, 80), ('Basses Trem', 21, 36, 32, 32),
    ('Timpani Roll', 21, 36, 44, 44), ('Vibraphone Bowed', 28, 36, 73, 81), ('Coro', 29, 36, 45, 61),
    ('Horns Sus', 36, 36, 56, 69),
    # bridge 37-44
    ('Horns Marcato', 37, 44, 61, 75), ('Violins Col Legno', 37, 44, 64, 76),
    ('Celli Col Legno', 37, 44, 37, 49), ('Basses Pizz', 37, 44, 25, 44), ('Tuba Stac', 37, 44, 29, 44),
    ('Violas Spic', 37, 44, 56, 68), ('Timpani', 37, 44, 37, 44),
    # climax 45-60
    ('Horns Sus', 45, 58, 61, 69), ('Trombones Sus', 45, 58, 49, 57), ('Coro', 45, 59, 45, 69),
    ('Violins Spic', 45, 59, 73, 85), ('Tuba Stac', 45, 60, 30, 40), ('Basses Pizz', 45, 60, 25, 40),
    ('Trombones Stac', 45, 59, 45, 64), ('Celli Col Legno', 45, 59, 45, 60), ('Timpani', 45, 60, 37, 47),
    ('Timpani Roll', 56, 56, 44, 44), ('Xylophone', 59, 59, 73, 81), ('Flute Stac', 59, 59, 73, 81),
    ('Trombones Marcato', 60, 60, 44, 57), ('Horns Marcato', 60, 60, 56, 69),
    # return 61-76
    ('Clarinet Stac', 61, 64, 73, 81), ('Xylophone', 61, 64, 73, 81), ('Violins Col Legno', 61, 64, 73, 81),
    ('Horns Marcato', 65, 68, 61, 71), ('Violin Solo', 69, 76, 72, 85), ('Flute Sus', 69, 76, 72, 85),
    ('Basses Pizz', 61, 76, 25, 40), ('Tuba Stac', 61, 76, 32, 44), ('Violas Pizz', 61, 76, 56, 66),
    ('Celli Col Legno', 61, 76, 45, 60), ('Organillo', 61, 76, 60, 72), ('Bassoon Stac', 61, 76, 46, 58),
    ('Violins Spic', 69, 76, 64, 76), ('Timpani', 61, 76, 37, 49),
    # codetta 77-80
    ('Celesta', 77, 80, 61, 81), ('Basses Pizz', 77, 80, 32, 37), ('Violas Pizz', 77, 80, 56, 64),
    ('Timpani', 77, 80, 37, 37), ('Basses Trem', 77, 80, 25, 25),
]
# unpitched percussion: allowed keys (sample choice) per bar range
PERC_KEYS = [
    ('Bass Drum', 1, 42, {62}), ('Bass Drum', 43, 44, {63}), ('Bass Drum', 45, 80, {62}),
    ('Cymbal', 1, 80, {63, 66}), ('Tam-tam', 1, 80, {57}), ('Cuchillo', 21, 32, {60}),
    ('Cuchillo', 37, 44, {62}), ('Flexaton', 1, 80, {60, 64}), ('Carraca', 1, 80, {60}),
    ('Mark Trees', 1, 80, {60}),
]
CEILINGS = {'Violin Solo': 85, 'Violins Spic': 85, 'Violins Col Legno': 85, 'Flute Sus': 85, 'Flute Stac': 85,
            'Trompa 1': 75, 'Horns Marcato': 75, 'Horns Sus': 75, 'Celesta': 83}

CANON = [73, 80, 81, 80, 76, 78, 76, 75, 73]                 # «el vals robado», bars 5-8
TRICK = [62, 69, 71, 69, 66, 68, 66, 64, 63, 61]             # the horn's trick, bars 9-12
SECTIONS = [('intro', 1, 4, 8), ('A', 5, 20, 10), ('B1', 21, 28, 7), ('B2', 29, 36, 7),
            ('bridge', 37, 44, 11), ('climax', 45, 60, 12), ('return', 61, 76, 12), ('codetta', 77, 80, 6)]
# melodies of section 5 for the register-clash rule: (tracks, first bar, last bar)
MELODIES = [
    (('Celesta',), 1, 3), (('Clarinet Stac', 'Xylophone'), 5, 8), (('Trompa 1',), 9, 12),
    (('Violin Solo',), 13, 16), (('Flute Sus',), 17, 20), (('Celesta',), 21, 28),
    (('Vibraphone Bowed',), 29, 36), (('Horns Marcato',), 37, 44),
    (('Horns Sus', 'Coro', 'Trombones Sus'), 45, 58), (('Violins Spic', 'Xylophone', 'Flute Stac'), 59, 59),
    (('Clarinet Stac', 'Xylophone', 'Violins Col Legno'), 61, 64), (('Horns Marcato',), 65, 68),
    (('Violin Solo', 'Flute Sus'), 69, 76), (('Celesta',), 77, 79),
]
CLASH_EXEMPT = {('Copas', 21, 28)}   # the glasses' G#5 pedal, pp (brief section 8, criterion 6)
HEMIOLA_BEATS = [(1, 1), (1, 3), (2, 2)]        # (bar of the pair, beat) of the three half notes
HARMONY_TRACKS = ['Tuba Stac', 'Basses Pizz', 'Violas Pizz', 'Violins Col Legno', 'Trombones Stac',
                  'Celli Col Legno', 'Organillo', 'Coro', 'Horns Sus', 'Trombones Sus']
# tracks that double each other on purpose (same pitches, or the bass an octave apart)
DOUBLINGS = {frozenset(p) for p in [
    ('Tuba Stac', 'Basses Pizz'), ('Trombones Stac', 'Violas Pizz'), ('Trombones Stac', 'Violins Col Legno'),
    ('Trombones Stac', 'Coro'), ('Celli Col Legno', 'Coro'), ('Trombones Stac', 'Celli Col Legno'),
    ('Horns Sus', 'Trombones Sus'), ('Horns Sus', 'Coro'), ('Trombones Sus', 'Coro'),
    ('Celli Col Legno', 'Tuba Stac'), ('Celli Col Legno', 'Basses Pizz'),
]}
# Brief-mandated outer-voice fifths: the climax melody E4 -> D#4 (bars 54-55, section 5) over the
# lament bass A1 -> G#1 (section 6). Both lines are fixed by the brief; reported, not rewritten.
BRIEF_PARALLELS = {(54, frozenset({m, b})) for m in ('Coro', 'Horns Sus', 'Trombones Sus')
                   for b in ('Tuba Stac', 'Basses Pizz')}


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + 0.03) // BAR_S) + 1


def notes_between(track, first_bar, last_bar, lead=0.03):
    lo, hi = bar_start(first_bar) - lead, bar_start(last_bar + 1) - lead
    return [n for n in track.notes if lo <= n.start < hi]


def keys_of(path):
    inst = sfz.load(path)
    return {k for r in inst.regions if r.get('trigger', 'attack') in ('attack', 'first')
            for k in range(r.lokey, r.hikey + 1)}


def cc_at(track, num, t):
    pts = track.cc.get(num, [])
    val = None
    for when, v in pts:
        if when <= t + 1e-6:
            val = v
    return val


def cc1_to_velocity(cc):
    """Brief section 7: the CC1 table mapped on the velocity table (pp..f), piecewise linear."""
    pts = [(40, 25), (55, 40), (70, 55), (85, 70), (100, 85), (112, 105)]
    if cc <= pts[0][0]:
        return pts[0][1]
    for (c0, v0), (c1, v1) in zip(pts, pts[1:]):
        if cc <= c1:
            return v0 + (v1 - v0) * (cc - c0) / (c1 - c0)
    return pts[-1][1]


class VexisScore(unittest.TestCase):
    maxDiff = None
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'acto1-vexis.mid')
        compose.write_midi(cls.path)
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)
        cls.t = cls.song.tracks

    def level(self, name, note):
        if name in CC1_DYNAMICS:
            return cc1_to_velocity(cc_at(self.t[name], 1, note.start))
        return note.velocity

    # ── structure ────────────────────────────────────────────────────────────
    def test_one_named_track_per_instrument_and_articulation(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks]
        self.assertEqual(sorted(names), sorted(EXPECTED_TRACKS))
        self.assertEqual(len(names), len(set(names)))
        for name, parts in EXPECTED_TRACKS.items():
            self.assertEqual(compose.SFZ_OF[name], library(*parts), name)
            self.assertTrue(os.path.exists(compose.SFZ_OF[name]), compose.SFZ_OF[name])
            self.assertNotIn('KS', os.path.basename(compose.SFZ_OF[name]), 'no keyswitch patches')
            for banned in ('Slapstick', 'Vibraslap', 'Clash Cymbals'):
                self.assertNotIn(banned, compose.SFZ_OF[name])

    def test_c1_tempo_meter_and_length(self):
        tempos = [(i, m) for i, tr in enumerate(self.mid.tracks) for m in tr if m.type == 'set_tempo']
        sigs = [m for tr in self.mid.tracks for m in tr if m.type == 'time_signature']
        self.assertEqual(len(tempos), 1)
        self.assertEqual(tempos[0][0], 0, 'tempo lives in the first track')
        self.assertAlmostEqual(mido.tempo2bpm(tempos[0][1].tempo), BPM, places=3)
        self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(3, 4)])
        for tr in self.mid.tracks:
            self.assertEqual(sum(m.time for m in tr), BARS * 3 * self.mid.ticks_per_beat)
        for track in self.t.values():
            for n in track.notes:
                self.assertGreaterEqual(n.start, 0.0)
                self.assertLess(n.start, LOOP_S, track.name)
                self.assertLess(n.end, LOOP_S, track.name)

    # ── criterion 2: ranges, registers, ceilings ─────────────────────────────
    def test_c2_patch_ranges(self):
        for name, track in self.t.items():
            keys = keys_of(compose.SFZ_OF[name])
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch} at {n.start:.2f}s')

    def test_c2_section_registers(self):
        bad = []
        for name, track in self.t.items():
            for n in track.notes:
                bar = bar_of(n.start)
                if name in UNPITCHED:
                    ok = any(r[0] == name and r[1] <= bar <= r[2] and n.pitch in r[3] for r in PERC_KEYS)
                else:
                    ok = any(r[0] == name and r[1] <= bar <= r[2] and r[3] <= n.pitch <= r[4] for r in REGISTERS)
                if not ok:
                    bad.append(f'{name} b{bar} {n.pitch}')
        self.assertEqual(bad, [])

    def test_c2_ceilings(self):
        for name, top in CEILINGS.items():
            self.assertLessEqual(max(n.pitch for n in self.t[name].notes), top, name)
        glasses = [n.pitch for n in self.t['Copas'].notes]
        self.assertTrue(all(74 <= p <= 87 for p in glasses))
        choir = [n.pitch for n in self.t['Coro'].notes]
        self.assertTrue(all(45 <= p <= 69 for p in choir))
        # C#6 (85) of bar 72 is the highest note of the track
        self.assertEqual(max(n.pitch for tr in self.t.values() if tr.name not in UNPITCHED for n in tr.notes), 85)
        self.assertIn(85, self.pitches('Violin Solo', 72, 72))

    # ── criterion 3: the leitmotif ───────────────────────────────────────────
    def pitches(self, name, first, last, low=0, lead=0.03):
        return [n.pitch for n in notes_between(self.t[name], first, last, lead) if n.pitch >= low]

    def test_c3_leitmotif_everywhere(self):
        P = self.pitches
        self.assertEqual(P('Celesta', 1, 3, low=73), [73, 80, 81, 80, 76, 78, 76, 74])
        self.assertEqual(P('Clarinet Stac', 5, 8), CANON)
        self.assertEqual(P('Xylophone', 5, 8), CANON)
        self.assertEqual(P('Trompa 1', 9, 12), TRICK)
        self.assertEqual(P('Violin Solo', 13, 16), CANON)
        self.assertEqual(P('Flute Sus', 17, 20), [74, 81, 83, 81, 78, 80, 78, 76, 75, 73, 72])
        self.assertEqual(P('Celesta', 21, 24, low=73), [74, 81, 83, 81, 78, 79, 78, 76, 74])
        self.assertEqual(P('Celesta', 25, 28, low=73), [74, 81, 82, 81, 77, 80, 78, 76, 75, 73])
        self.assertEqual(P('Vibraphone Bowed', 29, 36, lead=0.2), [73, 80, 81, 80, 76, 78, 76, 75])
        self.assertEqual(P('Horns Marcato', 37, 44), [61, 68, 69, 62, 69, 71, 63, 69, 72, 68, 72, 75])
        climax = [61, 68, 69, 68, 64, 66, 64, 63, 61]
        self.assertEqual(P('Horns Sus', 45, 58), climax)
        self.assertEqual(P('Coro', 45, 58, low=58), climax)
        self.assertEqual(P('Trombones Sus', 45, 58), [p - 12 for p in climax])
        coda = [73, 80, 81, 80, 76, 80]
        for name in ('Violins Spic', 'Xylophone', 'Flute Stac'):
            self.assertEqual(P(name, 59, 59), coda, name)
        for name in ('Clarinet Stac', 'Xylophone', 'Violins Col Legno'):
            self.assertEqual(P(name, 61, 64), CANON, name)
        self.assertEqual(P('Horns Marcato', 65, 68), TRICK)
        for name in ('Violin Solo', 'Flute Sus'):
            self.assertEqual(P(name, 74, 75), [78, 76, 75, 73], name)
            self.assertEqual(P(name, 69, 73), [81, 80, 78, 78, 81, 80, 85, 83, 81, 81, 78], name)
            self.assertEqual(P(name, 76, 76), [72, 75, 81], name)
        self.assertEqual(P('Celesta', 77, 79, low=73), [73, 80, 81, 80, 76, 78, 76, 74])

    def test_c3_rhythm_of_the_quotes(self):
        def onsets(name, first, last, low=0):
            return [round((n.start - bar_start(first)) / BEAT_S * 2) / 2
                    for n in notes_between(self.t[name], first, last) if n.pitch >= low]
        canonical = [0, 1, 3, 4, 5, 6, 7, 8, 9]
        self.assertEqual(onsets('Clarinet Stac', 5, 8), canonical)
        self.assertEqual(onsets('Trompa 1', 9, 12), canonical + [10])
        self.assertEqual(onsets('Violin Solo', 13, 16), canonical)
        self.assertEqual(onsets('Flute Sus', 17, 20), canonical + [10, 11])
        self.assertEqual(onsets('Celesta', 21, 24, low=73), canonical)
        self.assertEqual(onsets('Horns Marcato', 37, 44), [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22])
        # staccato circus: the half notes are played as a quarter and a rest
        for n in notes_between(self.t['Clarinet Stac'], 5, 8):
            self.assertLess(n.end - n.start, 1.1 * BEAT_S)

    def test_c3_quotes_match_the_menu_midi(self):
        menu = midi_io.load(MENU_MID).tracks

        def menu_line(name, first, last):
            lo, hi = (first - 1) * MENU_BAR_S - 0.03, last * MENU_BAR_S - 0.03
            return [(n.pitch, round((n.start - (first - 1) * MENU_BAR_S) / MENU_BEAT_S))
                    for n in menu[name].notes if lo <= n.start < hi]

        def line(name, first, last, low=0):
            return [(n.pitch, round((n.start - bar_start(first)) / BEAT_S))
                    for n in notes_between(self.t[name], first, last) if n.pitch >= low]
        # the mirage: bars 21-24 = the menu's violins, bars 13-16, note for note
        self.assertEqual(line('Celesta', 21, 24, low=73), menu_line('Violins Sus', 13, 16))
        # the trick: bars 9-11 = the menu's horn, bars 5-7, except G4 -> G#4
        ours, theirs = line('Trompa 1', 9, 11), menu_line('Trompa 1', 5, 7)
        self.assertEqual(len(ours), len(theirs))
        diff = [(a, b) for a, b in zip(ours, theirs) if a != b]
        self.assertEqual(diff, [((68, 6), (67, 6))])

    # ── criterion 4: figures ─────────────────────────────────────────────────
    def test_c4_nothing_shorter_than_an_eighth_and_eighths_only_where_allowed(self):
        eighth_ok = {'Violins Spic', 'Violas Spic', 'Bassoon Stac'}
        for name, track in self.t.items():
            ons = sorted({round(n.start, 3) for n in track.notes})
            clusters = [t for i, t in enumerate(ons) if i == 0 or t - ons[i - 1] > 0.04]
            for a, b in zip(clusters, clusters[1:]):
                gap = b - a
                self.assertGreater(gap, 0.5 * BEAT_S - 0.04, f'{name} at {a:.2f}s: shorter than an eighth')
                if gap < 0.85 * BEAT_S and name not in eighth_ok:
                    bar = bar_of(a)
                    allowed = (name == 'Violins Col Legno' and bar == 4) or \
                              (name in ('Xylophone', 'Flute Stac') and bar == 59)
                    self.assertTrue(allowed, f'{name} eighths in bar {bar}')
            for n in track.notes:
                self.assertGreater(n.end - n.start, 0.4 * BEAT_S, f'{name} {n.pitch} at {n.start:.2f}s')

    # ── criterion 5: layers ──────────────────────────────────────────────────
    def test_c5_layers_per_section(self):
        for label, first, last, limit in SECTIONS:
            lo, hi = bar_start(first), bar_start(last + 1)
            times = sorted({max(lo, min(hi, x)) for tr in self.t.values() for n in tr.notes
                            for x in (n.start, n.end)} | {lo, hi})
            worst = 0
            for a, b in zip(times, times[1:]):
                if b - a < 1e-6:
                    continue
                mid = (a + b) / 2
                worst = max(worst, sum(any(n.start <= mid < n.end for n in tr.notes) for tr in self.t.values()))
            self.assertLessEqual(worst, limit, f'{label} (bars {first}-{last})')

    # ── criterion 6: register clashes against the melody ────────────────────
    def test_c6_no_register_clash_with_the_melody(self):
        clashes = []
        for tracks, first, last in MELODIES:
            t0, t1 = bar_start(first), bar_start(last + 1)
            mel = [(name, n) for name in tracks for n in self.t[name].notes if t0 - 0.2 <= n.start < t1 - 0.03]
            for name, track in self.t.items():
                if name in tracks or name in UNPITCHED or any(e[0] == name and e[1] <= first and last <= e[2]
                                                               for e in CLASH_EXEMPT):
                    continue
                for o in track.notes:
                    if o.end - o.start < 0.85 * BEAT_S:
                        continue
                    near = [self.level(mn, m) for mn, m in mel
                            if min(m.end, o.end, t1) - max(m.start, o.start, t0) > 0.04 and abs(m.pitch - o.pitch) <= 11]
                    if near and self.level(name, o) >= max(near):
                        clashes.append(f'{name} {o.pitch} at {o.start:.2f}s')
        self.assertEqual(clashes, [])

    # ── criterion 7: the silence of bar 60 ───────────────────────────────────
    def test_c7_bar_60_silence(self):
        t_hit, t_next = bar_start(60), bar_start(61)
        for track in self.t.values():
            for n in track.notes:
                self.assertFalse(t_hit + 0.05 < n.start < t_next, f'{track.name} starts at {n.start:.3f}s')
                if t_hit - 0.05 <= n.start <= t_hit + 0.05:
                    self.assertLessEqual(n.end, t_hit + BEAT_S + 0.02, f'{track.name} rings into the silence')
                if n.start < t_hit - 0.05:
                    self.assertLessEqual(n.end, t_hit + 0.02, f'{track.name} holds into bar 60')
        hits = [name for name, tr in self.t.items() if any(abs(n.start - t_hit) < 0.05 for n in tr.notes)]
        for name in ('Trombones Marcato', 'Horns Marcato', 'Timpani', 'Bass Drum', 'Flexaton'):
            self.assertIn(name, hits)

    # ── criterion 8: counted tricks ──────────────────────────────────────────
    def test_c8_tricks_counted(self):
        def where(name):
            return [(bar_of(n.start), round((n.start - bar_start(bar_of(n.start))) / BEAT_S) + 1, n.pitch)
                    for n in self.t[name].notes]
        self.assertEqual(where('Flexaton'), [(12, 3, 64), (28, 1, 60), (60, 1, 64)])
        self.assertEqual(where('Mark Trees'), [(9, 1, 60), (21, 1, 60)])
        self.assertEqual(where('Carraca'), [(80, 2, 60)])
        for name, track in self.t.items():
            if name in ('Flexaton', 'Mark Trees', 'Carraca'):
                for n in track.notes:
                    self.assertLessEqual(n.velocity, 55, f'{name}: tricks stay pp-p')

    # ── criterion 9: velocity and CC1 ceilings, climax at bar 53 ─────────────
    def test_c9_velocity_and_cc1_ceilings(self):
        for track in self.t.values():
            self.assertLessEqual(max(n.velocity for n in track.notes), 105, track.name)
            for num, pts in track.cc.items():
                if num == 1:
                    self.assertLessEqual(max(v for _, v in pts), 112, track.name)
        for family in (('Horns Marcato', 'Horns Sus'), ('Coro',)):
            pts = [(t, v) for name in family for t, v in self.t[name].cc.get(1, [])]
            top = max(v for _, v in pts)
            self.assertTrue(all(bar_of(t) == 53 for t, v in pts if v == top), family)
        cuchillo = [n.velocity for n in notes_between(self.t['Cuchillo'], 37, 44)]
        self.assertLessEqual(max(cuchillo), 80)
        self.assertLessEqual(max(n.velocity for n in notes_between(self.t['Cymbal'], 53, 53)), 80)

    # ── criterion 10: Sonatina tracks ────────────────────────────────────────
    def test_c10_sonatina_cc1_at_tick_0_and_max_lengths(self):
        for name in SONATINA:
            pts = self.t[name].cc.get(1, [])
            self.assertTrue(pts and pts[0][0] == 0.0, f'{name}: CC1 at tick 0')
            self.assertGreaterEqual(len({v for _, v in pts}), 2, f'{name}: a CC1 curve, not a constant')
        for name, limit in MAX_NOTE_S.items():
            for n in self.t[name].notes:
                self.assertLessEqual(n.end - n.start, limit, f'{name} {n.pitch} at {n.start:.2f}s')

    # ── criterion 11: the hemiola of the bridge ──────────────────────────────
    def test_c11_bridge_hemiola(self):
        allowed = [bar_start(pair + db - 1) + (beat - 1) * BEAT_S for pair in (37, 39, 41, 43)
                   for db, beat in HEMIOLA_BEATS]
        for name in ('Basses Pizz', 'Tuba Stac', 'Bass Drum', 'Timpani'):
            notes = notes_between(self.t[name], 37, 44)
            self.assertTrue(notes, name)
            for n in notes:
                self.assertTrue(any(abs(n.start - a) < 0.03 for a in allowed), f'{name} at {n.start:.2f}s')
            for bar in (38, 40, 42):
                self.assertFalse(any(abs(n.start - bar_start(bar)) < 0.05 for n in notes), f'{name} bar {bar}')
        horns = notes_between(self.t['Horns Marcato'], 37, 44)
        self.assertEqual(len(horns), 12)
        for n in horns:
            self.assertTrue(any(abs(n.start - a) < 0.03 for a in allowed))

    # ── craft rules of the orchestration brief ───────────────────────────────
    def test_cc_density_and_curves(self):
        for name, track in self.t.items():
            for num, pts in track.cc.items():
                times = [t for t, _ in pts]
                for a, b in zip(times, times[1:]):
                    self.assertGreaterEqual(b - a, BAR_S / 8 - 1e-3, f'{name} CC{num} at {a:.3f}s')
        for name in CC11_SUSTAINED:
            pts = self.t[name].cc.get(11, [])
            self.assertGreaterEqual(len({v for _, v in pts}), 3, f'{name}: CC11 curve')

    def test_legato_overlaps(self):
        overlaps = []
        for name in LEGATO_LINES:
            notes = sorted(self.t[name].notes, key=lambda n: n.start)
            for a, b in zip(notes, notes[1:]):
                if a.pitch != b.pitch and -0.005 < a.end - b.start < 0.06 and b.start - a.start > 0.2:
                    overlaps.append((name, round((a.end - b.start) * 1000, 1)))
        self.assertGreater(len(overlaps), 40)
        self.assertEqual([o for o in overlaps if not 10 <= o[1] <= 30.5], [])

    def test_humanization_with_fixed_seed(self):
        grid = BEAT_S / 2
        devs = []
        for name, track in self.t.items():
            if name in ('Copas', 'Vibraphone Bowed', 'Cymbal', 'Violin Solo'):
                continue                       # intentional anticipations / late arrivals
            for n in track.notes:
                d = n.start - round(n.start / grid) * grid
                devs.append(d)
                self.assertLessEqual(abs(d), 0.0085, f'{name} at {n.start:.3f}s')
        self.assertGreater(sum(1 for d in devs if abs(d) > 0.002), len(devs) / 3)
        other = os.path.join(tempfile.mkdtemp(), 'again.mid')
        compose.write_midi(other)
        a, b = midi_io.load(other).tracks, self.t
        self.assertEqual([(n.pitch, n.start, n.velocity) for n in a['Coro'].notes],
                         [(n.pitch, n.start, n.velocity) for n in b['Coro'].notes])

    def test_phrases_drawn_by_velocity(self):
        for tracks, first, last in MELODIES:
            for name in tracks:
                if name in CC1_DYNAMICS:
                    vals = [v for t, v in self.t[name].cc.get(1, []) if bar_start(first) <= t < bar_start(last + 1)]
                else:
                    vals = [n.velocity for n in notes_between(self.t[name], first, last)]
                self.assertGreaterEqual(len(set(vals)), 3, f'{name} {first}-{last}')

    def test_waltz_downbeat_accent(self):
        for first, last in ((5, 20), (61, 76)):
            oom = [n.velocity for name in ('Basses Pizz', 'Tuba Stac') for n in notes_between(self.t[name], first, last)
                   if abs((n.start - bar_start(bar_of(n.start)))) < 0.03]
            pah = [n.velocity for n in notes_between(self.t['Violas Pizz'], first, last)]
            self.assertGreaterEqual(sum(oom) / len(oom), 1.15 * sum(pah) / len(pah))
            for n in notes_between(self.t['Violas Pizz'], first, last):
                self.assertLess(n.pitch, 73)
            for n in notes_between(self.t['Violins Col Legno'], 5, 20):
                self.assertLess(n.pitch, 73)

    def window(self, track, bar):
        lo = bar_start(bar)
        return tuple((round((n.start - lo) / BEAT_S * 4) / 4, n.pitch, round((n.end - n.start) / BEAT_S * 2) / 2)
                     for n in notes_between(track, bar, bar + 1))

    def test_no_two_bar_phrase_repeated_more_than_twice(self):
        """A phrase of a part (three notes or more in two bars) never comes back identical more
        than twice; and no two bars of the whole texture (every part together) do either, so an
        ostinato or an oom-pah bass is judged with what sounds over it (reorchestration counts)."""
        found = []
        for name, track in self.t.items():
            if name in UNPITCHED:
                continue
            seen = {}
            for bar in range(1, BARS):
                sig = self.window(track, bar)
                if len(sig) >= 3:
                    seen.setdefault(sig, []).append(bar)
            found += [f'{name} bars {bars}' for bars in seen.values() if len(bars) > 2]
        texture = {}
        for bar in range(1, BARS):
            sig = tuple((name, self.window(tr, bar)) for name, tr in sorted(self.t.items()) if self.window(tr, bar))
            texture.setdefault(sig, []).append(bar)
        found += [f'whole texture bars {bars}' for bars in texture.values() if len(bars) > 2]
        self.assertEqual(found, [])

    def frames(self, name):
        """Per bar, the pitches this track attacks in it (or holds over its downbeat)."""
        out = {}
        for bar in range(1, BARS + 1):
            lo, hi = bar_start(bar) - 0.03, bar_start(bar + 1) - 0.03
            # attacked in the bar, or really held over its downbeat (a legato overlap is not a hold)
            ps = {n.pitch for n in self.t[name].notes if lo <= n.start < hi
                  or (n.start < lo and n.end > bar_start(bar) + 0.05)}
            if ps:
                out[bar] = sorted(ps)
        return out

    def test_no_parallel_fifths_or_octaves(self):
        def motion(a1, a2, b1, b2):
            found = []
            for pa in a1:
                qa = min(a2, key=lambda x: abs(x - pa))
                for pb in b1:
                    qb = min(b2, key=lambda x: abs(x - pb))
                    if pa != qa and pb != qb and (qa - pa) * (qb - pb) > 0 and abs(qa - pa) <= 7 \
                            and abs(qb - pb) <= 7 and abs(pa - pb) % 12 == abs(qa - qb) % 12 \
                            and abs(pa - pb) % 12 in (0, 7) and pa != pb:
                        found.append((pa, qa, pb, qb))
            return found
        frames = {name: self.frames(name) for name in HARMONY_TRACKS}
        bad = []
        for i, a in enumerate(HARMONY_TRACKS):
            for b in HARMONY_TRACKS[i + 1:]:
                if frozenset({a, b}) in DOUBLINGS:
                    continue
                for bar in range(1, BARS):
                    fa, fb = frames[a], frames[b]
                    if (bar, frozenset({a, b})) in BRIEF_PARALLELS:
                        continue
                    if bar in fa and bar + 1 in fa and bar in fb and bar + 1 in fb:
                        for m in motion(fa[bar], fa[bar + 1], fb[bar], fb[bar + 1]):
                            bad.append(f'{a}/{b} b{bar}-{bar + 1} {m}')
        # inside each chordal track: voices by register when the voice count stays the same
        for name in HARMONY_TRACKS:
            f = frames[name]
            for bar in range(1, BARS):
                if bar in f and bar + 1 in f and len(f[bar]) == len(f[bar + 1]) >= 2:
                    v1, v2 = f[bar], f[bar + 1]
                    for i in range(len(v1)):
                        for j in range(i + 1, len(v1)):
                            if v1[i] != v2[i] and v1[j] != v2[j] and (v2[i] - v1[i]) * (v2[j] - v1[j]) > 0 \
                                    and (v1[j] - v1[i]) % 12 in (0, 7) and (v1[j] - v1[i]) % 12 == (v2[j] - v2[i]) % 12:
                                bad.append(f'{name} b{bar}-{bar + 1} voices {i}/{j}')
        self.assertEqual(bad, [])

    def test_loop_leads_back_to_bar_1(self):
        last = notes_between(self.t['Basses Pizz'], 80, 80)
        self.assertEqual(last[-1].pitch % 12, 8, 'the last bass note is the dominant G#')
        bar80 = {n.pitch % 12 for tr in self.t.values() if tr.name not in UNPITCHED
                 for n in notes_between(tr, 80, 80)}
        self.assertTrue({8, 0, 3, 6, 9} & bar80 >= {0, 3, 6}, 'G#7(b9) colour in bar 80')
        first_bass = notes_between(self.t['Basses Pizz'], 1, 1)[0]
        self.assertEqual(first_bass.pitch % 12, 1)
        upbeat = [n for n in notes_between(self.t['Celesta'], 80, 80) if n.pitch >= 73]
        self.assertTrue(upbeat and upbeat[-1].pitch in (75, 72), 'celesta upbeat into C#5 at bar 1')


if __name__ == '__main__':
    unittest.main()
