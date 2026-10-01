"""Acceptance tests for El Contemplador's boss theme «Mirada del abismo / Caos cromático»
(docs/musica/acto3-contemplador.md, section 8, score criteria 1-16).

They read the generated MIDI independently of the checks that compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto3-contemplador/test_compose.py
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

BPM = 140
BEAT_S = 60 / BPM
TOTAL_BEATS = 188
LOOP_S = TOTAL_BEATS * BEAT_S              # 80.571 s
TOL = 0.012

# ── meter map (section 2): (first bar, last bar, beats per bar) ──
METERS = [(1, 21, 4.0), (22, 29, 3.5), (30, 43, 4.0), (44, 47, 5.0)]
BARS = 47


def bar_beat(bar):
    """Beat (from 0) where `bar` starts."""
    at = 0.0
    for first, last, beats in METERS:
        for b in range(first, last + 1):
            if b == bar:
                return at
            at += beats
    assert bar == BARS + 1
    return at


def bar_len(bar):
    return next(beats for first, last, beats in METERS if first <= bar <= last)


def bar_start(bar):
    return bar_beat(bar) * BEAT_S


def bar_of(t):
    for bar in range(1, BARS + 1):
        if t < bar_start(bar + 1) - TOL:
            return bar
    return BARS


def notes_between(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi]


def pos16(t, bar):
    return round((t / BEAT_S - bar_beat(bar)) * 4)


def onsets(track, bar):
    """{sixteenth inside the bar: [notes]}."""
    out = defaultdict(list)
    for n in notes_between(track, bar, bar):
        out[pos16(n.start, bar)].append(n)
    return dict(out)


def eighth_beat(t, bar):
    """Position inside the bar in beats, rounded to the eighth."""
    return round((t / BEAT_S - bar_beat(bar)) * 2) / 2


SSO = 'sso/Sonatina Symphonic Orchestra/'
SYN = 'dracs-synths/'
GUITAR = 'electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz'
EXPECTED = {
    'Guitar': GUITAR, 'Guitar 2': GUITAR,
    'Bass': 'electric-bass-YR/PickedBassYR 20190930.sfz',
    'Drums': 'virtuosity_drums/Programs/01-basic-kit.sfz',
    'Sub': SYN + 'sub-bass.sfz', 'Drop': SYN + 'sub-drop.sfz',
    'Saw Lead': SYN + 'supersaw-lead.sfz', 'Saw Pad': SYN + 'supersaw-pad.sfz',
    'Pluck': SYN + 'pluck-sweep.sfz', 'Glitch': SYN + 'supersaw-lead.sfz',
    'Growl': SYN + 'growl.sfz',
    'Choir': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Choir Low': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'FX': SYN + 'fx.sfz',
}
REGISTERS = {
    'Guitar': (35, 55), 'Guitar 2': (35, 55), 'Bass': (26, 36), 'Sub': (31, 38), 'Drop': (35, 38),
    'Saw Lead': (53, 74), 'Saw Pad': (43, 60), 'Pluck': (59, 71), 'Glitch': (59, 71), 'Growl': (46, 47),
    'Choir': (53, 69), 'Choir Low': (47, 62), 'FX': (60, 63),
}
UNPITCHED = {'Drums', 'FX'}
SONATINA_CC1 = {'Choir', 'Choir Low'}
FILTER_CC1 = {'Saw Lead', 'Saw Pad', 'Pluck', 'Glitch'}
NO_CC = set(EXPECTED) - SONATINA_CC1 - FILTER_CC1
BAND = {'Guitar', 'Guitar 2', 'Bass', 'Drums'}
SYNTHS = {'Saw Lead', 'Saw Pad', 'Pluck', 'Glitch', 'Sub', 'Drop'}
VOICES = {'Choir', 'Choir Low', 'Growl'}
KICK, SNARE, CRASH, RIDE, CRASH2 = 36, 38, 49, 51, 57
TOMS = [50, 48, 47, 45, 43, 41]
RISER, IMPACT, SWELL = 60, 62, 63

# ── harmony (section 4): bass pitch class on beat 1 of every bar ──
C, Cs, D, Eb, E, F, Fs, G, Gs, A, Bb, B = range(12)
BASS_PC = {**{b: B for b in range(1, BARS + 1)},
           14: G, 15: D, 16: C, 21: C, 35: G, 36: D, 37: C, 38: C, 39: D, 40: G, 43: C}

# ── leitmotif (section 5): label -> (carrier, [(bar, beat in bar, pitch)], doublings [(track, shift)]) ──
FRACTURA_LOW = [59, 60, 54, 53, 59, 62, 61, 55]


def halves(first_bar, pitches):
    return [(first_bar + i // 2, (i % 2) * 2.0, p) for i, p in enumerate(pitches)]


LEITMOTIF = {
    'head 3-4': ('Saw Lead', [(3, 0.0, 59), (4, 0.0, 60)], []),
    'fragment 9-12': ('Saw Lead', [(9, 0.0, 59), (9, 2.0, 60), (11, 0.0, 54), (11, 2.0, 53)], []),
    'exposition 13-16': ('Saw Lead', halves(13, FRACTURA_LOW), [('Choir Low', 0)]),
    'augmentation 18-21': ('Choir Low', [(18 + i, 0.0, p) for i, p in enumerate([59, 60, 54, 53])], []),
    'odd augmentation 22-29': ('Saw Lead', [(22 + i, 0.0, p) for i, p in enumerate(FRACTURA_LOW)], []),
    'choir cries 30-33': ('Choir', halves(30, FRACTURA_LOW), []),
    'octave 34-37': ('Saw Lead', halves(34, [71, 72, 66, 65, 71, 74, 73, 67]), [('Choir Low', -12)]),
    'retrograde 38-41': ('Saw Lead', halves(38, [67, 73, 74, 71, 65, 66, 72, 71]), [('Choir Low', -12)]),
}
SPANS = {'head 3-4': (3, 4), 'fragment 9-12': (9, 12), 'exposition 13-16': (13, 16),
         'augmentation 18-21': (18, 21), 'odd augmentation 22-29': (22, 29), 'choir cries 30-33': (30, 33),
         'octave 34-37': (34, 37), 'retrograde 38-41': (38, 41)}
LEGATO_LINES = ('exposition 13-16', 'augmentation 18-21', 'odd augmentation 22-29', 'choir cries 30-33',
                'octave 34-37', 'retrograde 38-41')

# ── riffs (section 6): bar -> (pattern, root pitch class per sixteenth) ──
VERSE = {5: 'x.oxo.x..xo.x.o.', 6: 'x.ox..xo.x.xo.x.', 7: 'x.oxo.x..xo.x.o.', 8: 'x..x..x.x..xxoxo',
         9: 'x.ox.ox..x.ox.o.', 10: 'x.ox..xo.x.xo.x.', 11: 'x.oxo.x..xo.xo.o', 12: 'x..x..x.x.x.xxxx'}
BREAKDOWN = {18: 'x..x..x.....x.x.', 19: 'x..x..x.........', 20: 'x..x..x...x.x.x.', 21: 'x.x.x...x.x.x.xx'}
HALFTIME = {30: 'x..x..x.....x.x.', 31: 'x..x..x.........', 32: 'x.x..x..x.x..x..', 33: 'x..x..x...x.xxxx'}
ANSWER_BARS = {6, 8, 10, 12}             # the b2 (C) answers in the last beat


def riff_root(bar, k):
    if bar == 21:
        return C
    if bar in ANSWER_BARS and k >= 12:
        return C
    return B


class ContempladorScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = compose.write_midi_file(os.path.join(tempfile.mkdtemp(), 'acto3-contemplador.mid'))
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)
        cls.tr = cls.song.tracks

    # ── structure ─────────────────────────────────────────────────────────────
    def test_output_path(self):
        self.assertEqual(os.path.basename(compose.OUT), 'acto3-contemplador.mid')
        self.assertEqual(os.path.dirname(compose.OUT), os.path.join(HERE, 'build'))

    def test_tracks_and_patches(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(set(names), set(EXPECTED))
        for name, rel in EXPECTED.items():
            self.assertEqual(compose.SFZ_OF[name], library(*rel.split('/', 1)), name)
            self.assertTrue(os.path.exists(compose.SFZ_OF[name]), rel)
            self.assertNotIn('KS', os.path.basename(rel))
            self.assertTrue(self.tr[name].notes, f'{name} is empty')

    def test_deterministic(self):
        other = compose.write_midi_file(os.path.join(tempfile.mkdtemp(), 'again.mid'))
        with open(self.path, 'rb') as a, open(other, 'rb') as b:
            self.assertEqual(a.read(), b.read())

    # ── criterion 1 ───────────────────────────────────────────────────────────
    def test_tempo_meters_and_length(self):
        tpb = self.mid.ticks_per_beat
        tempos = [(i, m) for i, tr in enumerate(self.mid.tracks) for m in tr if m.type == 'set_tempo']
        self.assertEqual(len(tempos), 1)
        self.assertEqual(tempos[0][0], 0)
        self.assertAlmostEqual(mido.tempo2bpm(tempos[0][1].tempo), BPM, places=2)
        sigs, t = [], 0
        for m in self.mid.tracks[0]:
            t += m.time
            if m.type == 'time_signature':
                sigs.append((t, m.numerator, m.denominator))
        self.assertEqual(sigs, [(0, 4, 4), (84 * tpb, 7, 8), (112 * tpb, 4, 4), (168 * tpb, 5, 4)])
        self.assertEqual([round(bar_beat(b), 2) for b in (22, 30, 44, 48)], [84, 112, 168, 188])
        for tr in self.mid.tracks:
            self.assertEqual(sum(m.time for m in tr), TOTAL_BEATS * tpb, tr.name)

    def test_notes_inside_the_loop(self):
        for name, track in self.tr.items():
            for n in track.notes:
                self.assertGreaterEqual(n.start, 0.0, name)
                self.assertLessEqual(n.end, LOOP_S + 1e-6, name)

    # ── criteria 2 and 3 ──────────────────────────────────────────────────────
    def test_ranges_and_registers(self):
        for name, track in self.tr.items():
            inst = sfz.load(compose.SFZ_OF[name])
            keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                    for k in range(r.lokey, r.hikey + 1)}
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch}')
            if name in REGISTERS:
                lo, hi = REGISTERS[name]
                for n in track.notes:
                    self.assertTrue(lo <= n.pitch <= hi, f'{name} {n.pitch} in bar {bar_of(n.start)}')
        drums = {n.pitch for n in self.tr['Drums'].notes}
        self.assertLessEqual(drums, {KICK, SNARE, CRASH, RIDE, CRASH2, *TOMS})

    def test_nothing_high_is_held(self):
        """Nada agudo tenido: ninguna nota de negra o más por encima de F5 (77)."""
        for name, track in self.tr.items():
            if name in UNPITCHED:
                continue
            for n in track.notes:
                if n.end - n.start >= BEAT_S - 0.05:
                    self.assertLessEqual(n.pitch, 77, f'{name} holds {n.pitch} in bar {bar_of(n.start)}')

    # ── criterion 4 ───────────────────────────────────────────────────────────
    def written(self, name, first, last, shift=0):
        return sorted((bar_of(n.start), eighth_beat(n.start, bar_of(n.start)), n.pitch - shift)
                      for n in notes_between(self.tr[name], first, last))

    def test_leitmotif_transformations(self):
        for label, (carrier, line, doublings) in LEITMOTIF.items():
            first, last = SPANS[label]
            self.assertEqual(self.written(carrier, first, last), sorted(line), f'{label} on {carrier}')
            for name, shift in doublings:
                self.assertEqual(self.written(name, first, last, shift), sorted(line), f'{label} doubled by {name}')

    def test_retrograde_is_the_exposition_backwards(self):
        ex = [p for _, _, p in LEITMOTIF['octave 34-37'][1]]
        rg = [p for _, _, p in LEITMOTIF['retrograde 38-41'][1]]
        self.assertEqual(rg, ex[::-1])
        self.assertEqual(rg[-2:], [72, 71], 'the retrograde ends C5 -> B4')

    def test_legato_lines(self):
        for label in LEGATO_LINES:
            carrier, _, doublings = LEITMOTIF[label]
            first, last = SPANS[label]
            for name in [carrier] + [d for d, _ in doublings]:
                notes = sorted(notes_between(self.tr[name], first, last), key=lambda n: n.start)
                for a, b in zip(notes, notes[1:]):
                    over = a.end - b.start
                    self.assertTrue(0.0095 <= over <= 0.0305, f'{label} {name} {over * 1000:.1f} ms at {b.start:.2f} s')

    # ── criterion 5 ───────────────────────────────────────────────────────────
    def test_ceilings_and_climax(self):
        for name, track in self.tr.items():
            for n in track.notes:
                self.assertLessEqual(n.velocity, 124, name)
            for _, v in track.cc.get(1, []):
                self.assertLessEqual(v, 110 if name in SONATINA_CC1 else 120, name)
        for name in ('Saw Lead', 'Choir Low'):
            pts = self.tr[name].cc[1]
            top = max(v for _, v in pts)
            self.assertEqual({bar_of(t) for t, v in pts if v == top}, {39}, f'{name} CC1 peak')
        at39 = {n.pitch for n in notes_between(self.tr['Drums'], 39, 39) if pos16(n.start, 39) == 0}
        self.assertIn(CRASH, at39)
        fx39 = {n.pitch for n in notes_between(self.tr['FX'], 39, 39) if pos16(n.start, 39) == 0}
        self.assertIn(IMPACT, fx39)
        lead_top = max(n.pitch for n in self.tr['Saw Lead'].notes)
        self.assertIn(39, {bar_of(n.start) for n in self.tr['Saw Lead'].notes if n.pitch == lead_top})

    # ── criterion 6 ───────────────────────────────────────────────────────────
    def test_cc1_where_needed_and_nowhere_else(self):
        for name, track in self.tr.items():
            if name in SONATINA_CC1 | FILTER_CC1:
                pts = track.cc.get(1)
                self.assertTrue(pts, name)
                self.assertEqual(pts[0][0], 0.0, f'{name}: CC1 at tick 0')
                self.assertGreater(len({v for _, v in pts}), 1, f'{name}: CC1 draws the phrase')
            else:
                self.assertFalse(track.cc, f'{name} must not carry controllers')

    def test_cc_points_at_most_every_eighth(self):
        step = self.mid.ticks_per_beat // 2
        for tr in self.mid.tracks:
            t, last = 0, {}
            for m in tr:
                t += m.time
                if m.type == 'control_change':
                    if m.control in last:
                        self.assertGreaterEqual(t - last[m.control], step, f'{tr.name} at tick {t}')
                    last[m.control] = t

    # ── criterion 7 ───────────────────────────────────────────────────────────
    def test_riff_patterns(self):
        for table in (VERSE, BREAKDOWN, HALFTIME):
            for bar, pattern in table.items():
                g = onsets(self.tr['Guitar'], bar)
                want = {k for k, c in enumerate(pattern) if c != '.'}
                self.assertEqual(set(g), want, f'guitar hits in bar {bar}')
                for k in want:
                    ps = sorted(n.pitch for n in g[k])
                    self.assertEqual(len(ps), 3 if pattern[k] == 'x' else 1, f'bar {bar} 16th {k}')
                    self.assertEqual(ps[0] % 12, riff_root(bar, k), f'root in bar {bar} 16th {k}')
                kicks = {k for k, ns in onsets(self.tr['Drums'], bar).items() if any(n.pitch == KICK for n in ns)}
                self.assertLessEqual(want, kicks, f'kick with every hit in bar {bar}')

    def test_power_chords_and_double_tracking(self):
        for bar in range(1, BARS + 1):
            g, g2 = onsets(self.tr['Guitar'], bar), onsets(self.tr['Guitar 2'], bar)
            self.assertEqual({k: sorted(n.pitch for n in ns) for k, ns in g.items()},
                             {k: sorted(n.pitch for n in ns) for k, ns in g2.items()}, f'Guitar 2 doubles bar {bar}')
            for k, ns in g.items():
                ps = sorted(n.pitch for n in ns)
                if len(ps) > 1:
                    self.assertEqual(ps, [ps[0], ps[0] + 7, ps[0] + 12], f'bar {bar} 16th {k}')

    def test_bass_locks_to_the_guitar(self):
        for bar in range(1, BARS + 1):
            g = onsets(self.tr['Guitar'], bar)
            for k, ns in onsets(self.tr['Bass'], bar).items():
                self.assertIn(k, g, f'bass without guitar in bar {bar} 16th {k}')
                self.assertEqual(ns[0].pitch % 12, min(n.pitch for n in g[k]) % 12, f'bar {bar} 16th {k}')

    # ── criterion 8 ───────────────────────────────────────────────────────────
    def test_chorus_and_climax_in_eighths_over_double_kick(self):
        for bar in list(range(13, 17)) + list(range(34, 42)):
            g = onsets(self.tr['Guitar'], bar)
            self.assertEqual(set(g), set(range(0, 16, 2)), f'eighths in bar {bar}')
            self.assertTrue(all(len(ns) == 3 for ns in g.values()), f'power chords in bar {bar}')
            kicks = {k for k, ns in onsets(self.tr['Drums'], bar).items() if any(n.pitch == KICK for n in ns)}
            self.assertEqual(kicks, set(range(16)), f'double kick in bar {bar}')

    # ── criterion 9 ───────────────────────────────────────────────────────────
    def test_the_dead_stop(self):
        for name, track in self.tr.items():
            late = [k for k in onsets(track, 17) if k >= 2]
            if name in ('Growl', 'Glitch', 'FX'):
                continue
            self.assertFalse(late, f'{name} attacks after the hit of bar 17')
        self.assertTrue([k for k in onsets(self.tr['Growl'], 17) if k >= 2], 'the vocal fry alone')
        self.assertTrue([k for k in onsets(self.tr['Glitch'], 17) if k >= 12], 'a glitch on beat 4')
        hit = onsets(self.tr['Guitar'], 17)
        self.assertEqual(set(hit), {0})

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_breakdowns(self):
        for bar in list(BREAKDOWN) + list(HALFTIME):
            snares = {k for k, ns in onsets(self.tr['Drums'], bar).items() if any(n.pitch == SNARE for n in ns)}
            self.assertEqual(snares, {8}, f'half time: snare on beat 3 only in bar {bar}')
        for bar, pattern in BREAKDOWN.items():
            drops = onsets(self.tr['Drop'], bar)
            self.assertEqual(set(drops), {k for k, c in enumerate(pattern) if c == 'x'}, f'a drop on every accent, bar {bar}')
            for k, ns in drops.items():
                self.assertEqual(ns[0].pitch % 12, riff_root(bar, k))
        for bar in HALFTIME:
            self.assertEqual(set(onsets(self.tr['Drop'], bar)), {0}, f'drop on beat 1 in bar {bar}')

    # ── criterion 11 ──────────────────────────────────────────────────────────
    def test_seven_eight(self):
        for bar in range(22, 30):
            g = onsets(self.tr['Guitar'], bar)
            power = {k for k, ns in g.items() if len(ns) == 3}
            self.assertEqual(power, {0} if bar == 29 else {0, 4, 8}, f'2+2+3 in bar {bar}')
            plucks = onsets(self.tr['Pluck'], bar)
            self.assertEqual(set(plucks), set(range(0, 14, 2)), f'seven eighths of pluck in bar {bar}')
        pump = compose.pump_points()
        for bar in range(22, 30):
            groups = [0] if bar == 29 else [0, 1, 2]
            for g in groups:
                at = bar_beat(bar) + g + 1                  # MixSpec positions are 1-based beats
                near = [db for pos, db in pump if at - 1e-6 <= pos <= at + 0.01]
                self.assertIn(-16, [round(x) for x in near], f'pump at bar {bar} group {g}')
        self.assertTrue(all(bar_beat(22) < pos <= bar_beat(30) + 1 for pos, _ in pump), 'pumping only in the 7/8')

    # ── criterion 12 ──────────────────────────────────────────────────────────
    def test_blast_and_tom_fall(self):
        snare = lambda bar: {k for k, ns in onsets(self.tr['Drums'], bar).items() if any(n.pitch == SNARE for n in ns)}
        self.assertEqual(snare(42), set(range(16)))
        self.assertEqual(snare(43), set(range(8)))
        toms = sorted((n.start, n.pitch) for n in notes_between(self.tr['Drums'], 43, 43) if n.pitch in TOMS)
        self.assertEqual([p for _, p in toms], TOMS)
        for i, (t, _) in enumerate(toms):
            self.assertAlmostEqual(t / BEAT_S - bar_beat(43), 2 + i / 3, delta=0.02)

    def test_five_four_storm(self):
        for bar in range(44, 48):
            g = onsets(self.tr['Guitar'], bar)
            self.assertEqual(set(g), set(range(20)), f'20 sixteenths in bar {bar}')
            for k, ns in g.items():
                self.assertEqual(min(n.pitch for n in ns) % 12, B if k < 12 else C, f'3+2 in bar {bar} 16th {k}')
            kicks = {k for k, ns in onsets(self.tr['Drums'], bar).items() if any(n.pitch == KICK for n in ns)}
            self.assertEqual(kicks, set(range(20)), f'kick in bar {bar}')
        rate = lambda bar: len(notes_between(self.tr['Glitch'], bar, bar)) / 5
        self.assertEqual([rate(b) for b in (44, 45, 46, 47)], [4, 4, 6, 8])
        snares47 = [n for n in notes_between(self.tr['Drums'], 47, 47) if n.pitch == SNARE]
        self.assertEqual(len(snares47), 20)
        self.assertGreater(snares47[-1].velocity, snares47[0].velocity + 15, 'the snare grows')

    def test_risers_and_swells_land_on_their_downbeats(self):
        fx = self.tr['FX'].notes
        riser = [n for n in fx if n.pitch == RISER]
        self.assertEqual(len(riser), 1)
        self.assertAlmostEqual(riser[0].start + 4.0, LOOP_S, delta=0.002)
        swells = sorted(n.start + 2.0 for n in fx if n.pitch == SWELL)
        self.assertEqual(len(swells), 2)
        for t, bar in zip(swells, (5, 18)):
            self.assertAlmostEqual(t, bar_start(bar), delta=0.002)

    # ── criterion 13 ──────────────────────────────────────────────────────────
    def test_seam_lands_on_bar_1(self):
        first = lambda name: {n.pitch for n in self.tr[name].notes if n.start < 0.01}
        self.assertIn(IMPACT, first('FX'))
        self.assertTrue(first('Drop'))
        self.assertLessEqual({CRASH, KICK}, first('Drums'))
        self.assertEqual(len(first('Guitar')), 3)

    # ── criterion 14 ──────────────────────────────────────────────────────────
    def test_lowest_note_on_beat_1_is_the_bass(self):
        for bar in range(1, BARS + 1):
            t = bar_start(bar) + 0.04
            sounding = [n.pitch for name, tr in self.tr.items() if name not in UNPITCHED
                        for n in tr.notes if n.start <= t < n.end]
            self.assertTrue(sounding, f'silence on beat 1 of bar {bar}')
            self.assertEqual(min(sounding) % 12, BASS_PC[bar], f'bar {bar}: lowest {min(sounding)}')

    # ── criterion 15 ──────────────────────────────────────────────────────────
    def test_humanization(self):
        grid = BEAT_S / 24                         # 16ths, triplets and the glitch rates (4, 6, 8, 12)
        limits = {**{n: 0.0045 for n in BAND}, **{n: 0.0025 for n in SYNTHS}, **{n: 0.0085 for n in VOICES},
                  'FX': 0.0005}
        off = 0
        for name, track in self.tr.items():
            if name != 'FX' and len(track.notes) >= 6:
                self.assertGreater(len({n.velocity for n in track.notes}), 2, name)
            for n in track.notes:
                d = abs(n.start / grid - round(n.start / grid)) * grid
                self.assertLessEqual(d, limits[name], f'{name} at {n.start:.3f} s')
                off += d > 0.001
        self.assertGreater(off, 300)

    # ── criterion 16 ──────────────────────────────────────────────────────────
    def test_no_guitar_two_bar_phrase_repeated_more_than_twice(self):
        seen = defaultdict(list)
        g = self.tr['Guitar']
        for bar in range(1, BARS):
            sig = tuple(sorted((round((n.start / BEAT_S - bar_beat(bar)) * 4), n.pitch,
                                round((n.end - n.start) / BEAT_S * 4)) for n in notes_between(g, bar, bar + 1)))
            sig = (bar_len(bar), bar_len(bar + 1), sig)
            if len(sig[2]) >= 2:
                seen[sig].append(bar)
        repeated = [bars for bars in seen.values() if len(bars) > 2]
        self.assertFalse(repeated, repeated[:2])


if __name__ == '__main__':
    unittest.main()
