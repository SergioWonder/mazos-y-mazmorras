"""Acceptance tests for «El Laberinto del Contemplador» — «Fractura» (docs/musica/acto3-laberinto.md,
section 8, criteria 1-14, plus the synchrony rules of section 2 and the craft rules: humanization,
legato, development and the loop seam).

They read the two generated MIDI files (exploration and combat) independently of the checks that
compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto3-laberinto/test_compose.py
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

BPM = 70
BEAT_S = 60 / BPM
BAR_S = 4 * BEAT_S
BARS = 24
LOOP_S = BARS * BAR_S                     # 82.286 s
E8 = BEAT_S / 2
S16 = BEAT_S / 4
TOL = 0.012                               # seconds: humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

SSO = 'sso/Sonatina Symphonic Orchestra/'
VCSL = 'VCSL/'
GUITAR = 'electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz'
COMMON_TRACKS = {
    'Choir Pad': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Glasses': VCSL + 'Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz',
    'Celesta': SSO + 'Percussion/Celeste.sfz',
}
BOTH = {
    **COMMON_TRACKS,
    'Choir': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Organ': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
    'Guitar': GUITAR,
    'Guitar 2': GUITAR,
    'Bass': 'electric-bass-YR/PickedBassYR 20190930.sfz',
    'Drums': 'virtuosity_drums/Programs/01-basic-kit.sfz',
}
EXPECTED = {
    'explora': dict(BOTH),
    'combate': {**BOTH, 'Lead': GUITAR, 'Choir Low': SSO + 'Chorus - Performance/Large Chorus.sfz'},
}
UNPITCHED = {'Drums'}
CC1_TRACKS = {'Choir Pad', 'Choir', 'Choir Low'}
VELOCITY_SONATINA = {'Celesta'}
SLOW_TRACKS = {'Choir Pad', 'Choir', 'Choir Low', 'Organ', 'Lead', 'Glasses', 'Celesta'}
FAST_TRACKS = {'Guitar', 'Guitar 2', 'Bass', 'Drums'}
SECTIONS = [('intro', 1, 2), ('A', 3, 6), ('B', 7, 10), ('C', 11, 14), ('D', 15, 18),
            ('climax', 19, 22), ('coda', 23, 24)]
LAYERS = {'explora': [5, 6, 6, 5, 6, 7, 5], 'combate': [8, 8, 8, 8, 8, 8, 8]}
KICK, SNARE, CRASH = 36, 38, 49
TOMS = [50, 48, 47, 45, 43, 41]

# ── harmony of section 4 (common): bar -> (bass pitch class, chord pitch classes) ──
C, Cs, D, Eb, E, F, Fs, G, Gs, A, Bb, B = range(12)
HARMONY = {
    **{bar: (D, {D, F, Gs}) for bar in (1, 3, 4, 5, 6, 23, 24)},
    2: (D, {D, F, Gs, Eb}),
    **{bar: (D, {D, F, Gs, Eb}) for bar in (7, 8, 9, 10, 19)},
    **{bar: (D, {D, Gs}) for bar in (11, 12, 13, 14)},
    15: (Eb, {Eb, Fs, A, E}), 16: (Eb, {Eb, Fs, A, E}),
    17: (A, {A, C, Eb, Bb}), 18: (A, {A, Cs, E, G, Bb}),
    20: (F, {F, Gs, B, Fs}), 21: (Bb, {Bb, D, F, B}), 22: (E, {E, G, Bb, F}),
}
CELL = [0, 0, None, 1, 0, None, 6]           # the 7/16 cell of «Espiral», over D
CELL_PCS = {D, Eb, Gs}


# ── reference melody of section 5 (identical pitches and written attacks in both versions) ──
def line(bar, items):
    """items: [(pitch, beats)] from beat 1 of `bar` -> [(bar, beat, pitch)]."""
    out, pos = [], 0.0
    for p, beats in items:
        out.append((bar + int(pos // 4), 1 + pos % 4, p))
        pos += beats
    return out


def halves(pitches):
    return [(p, 2) for p in pitches]


FRACTURA = [74, 75, 69, 68, 74, 77, 76, 70]
REFERENCE = {
    'head 1-2': line(1, [(74, 4), (75, 4)]),
    'motif 3-6': line(3, halves(FRACTURA)),
    'low 7-10': line(7, halves([62, 63, 57, 56, 62, 65, 64, 58])),
    'tritone 11-14': line(11, halves([68, 69, 63, 62, 68, 71, 70, 64])),
    'inversion 15-18': line(15, halves([63, 62, 68, 69, 63, 60, 61, 67])),
    'climax 19-22': line(19, halves(FRACTURA)),
    'head 23': line(23, halves([74, 75])),
}
# label -> (carrier track, [(declared doubling, semitones)])
CARRIERS = {
    'explora': {
        'head 1-2': ('Glasses', []), 'motif 3-6': ('Celesta', []), 'low 7-10': ('Choir', []),
        'tritone 11-14': ('Organ', []), 'inversion 15-18': ('Choir', []), 'climax 19-22': ('Choir', []),
        'head 23': ('Glasses', []),
    },
    'combate': {
        'head 1-2': ('Glasses', [('Choir', -12)]), 'motif 3-6': ('Celesta', [('Choir', -12)]),
        'low 7-10': ('Lead', [('Choir', 0)]), 'tritone 11-14': ('Lead', [('Choir', 0)]),
        'inversion 15-18': ('Lead', [('Choir', 0)]), 'climax 19-22': ('Choir', [('Lead', -12)]),
        'head 23': ('Glasses', [('Choir', -12)]),
    },
}
# The glasses only exist in 74-87: in A they double the motif's notes from D5 up (section 5).
PARTIAL = {'motif 3-6': ('Glasses', 74)}
STRUCK = {'Celesta', 'Glasses'}

REGISTERS = {
    'Choir Pad': (45, 59), 'Choir': (56, 77), 'Choir Low': (50, 56), 'Glasses': (74, 77), 'Celesta': (68, 77),
    'Organ': (38, 71), 'Guitar': (38, 59), 'Guitar 2': (38, 59), 'Lead': (56, 71), 'Bass': (26, 35),
}
CEILINGS = {'Celesta': 52, 'Glasses': 60}
TOP = {'explora': (118, 92), 'combate': (124, 110)}           # (velocity, CC1)

ASALTO = {**{b: {0, 3, 6, 9, 12, 14} for b in (1, 2, 3, 4, 5, 6, 19, 20, 21, 22)},
          **{b: {0, 3, 6, 8, 11, 14} for b in (7, 8, 9, 10)}}
STOPS = {6, 10, 22}
BLASTS = {5, 9, 17, 21}
PAUSES = {8, 10, 16, 18, 22}
BREAKDOWN_HITS = {5: [0, .75, 1.5, 2.5, 3.25], 3: [0, .75, 1.5]}


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def beat_of(t):
    """Position inside the bar in beats (1-based), rounded to the eighth."""
    return 1 + round(((t + TOL) % BAR_S - TOL) / E8) / 2


def pos16(t):
    """Sixteenth inside its bar (0-15)."""
    return round(((t + TOL) % BAR_S - TOL) / S16)


def notes_between(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return [n for n in track.notes if lo <= n.start < hi]


def onsets(track, bar):
    """{sixteenth: [notes]} of the attacks in that bar."""
    out = defaultdict(list)
    for n in notes_between(track, bar, bar):
        out[pos16(n.start)].append(n)
    return dict(out)


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


class LaberintoScore(unittest.TestCase):
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
            self.assertEqual(os.path.basename(self.paths[v]), f'acto3-laberinto-{v}.mid')
            self.assertEqual(os.path.basename(compose.OUT[v]), f'acto3-laberinto-{v}.mid')
            self.assertEqual(os.path.dirname(compose.OUT[v]), os.path.join(HERE, 'build'))

    def test_one_named_track_per_instrument_and_role(self):
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
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

    # ── criteria 2 and 3 ──────────────────────────────────────────────────────
    def test_instrument_ranges(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                inst = sfz.load(compose.SFZ_OF[v][name])
                keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                        for k in range(r.lokey, r.hikey + 1)}
                for n in track.notes:
                    self.assertIn(n.pitch, keys, f'{v} {name} {n.pitch}')

    def test_registers(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in UNPITCHED:
                    continue
                lo, hi = REGISTERS[name]
                for n in track.notes:
                    self.assertTrue(lo <= n.pitch <= hi, f'{v} {name} {n.pitch} in bar {bar_of(n.start)}')

    def test_nothing_high_is_held(self):
        """Nada agudo tenido: ninguna nota de negra o más por encima de F5 (77) en ninguna pista."""
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in UNPITCHED:
                    continue
                for n in track.notes:
                    if n.end - n.start >= BEAT_S - 0.05:
                        self.assertLessEqual(n.pitch, 77, f'{v} {name} holds {n.pitch} in bar {bar_of(n.start)}')

    def test_kit_hits_used(self):
        for v in VERSIONS:
            used = {n.pitch for n in self.tracks(v)['Drums'].notes}
            self.assertLessEqual(used, {36, 38, 42, 49, 51, 57, *TOMS}, v)
            self.assertNotIn(46, used, 'open hihat (needs CC4 in the full kit)')

    # ── criterion 4 and synchrony rule 2 ──────────────────────────────────────
    def written(self, v, name, first, last):
        track = self.tracks(v)[name]
        return sorted((bar_of(n.start), beat_of(n.start), n.pitch) for n in notes_between(track, first, last))

    def test_reference_melody_in_both_versions(self):
        for label, ref in REFERENCE.items():
            first, last = ref[0][0], ref[-1][0]
            for v in VERSIONS:
                carrier, doublings = CARRIERS[v][label]
                self.assertEqual(self.written(v, carrier, first, last), sorted(ref), f'{v} {label} ({carrier})')
                for name, shift in doublings:
                    want = sorted((b, bt, p + shift) for b, bt, p in ref)
                    self.assertEqual(self.written(v, name, first, last), want, f'{v} {label} doubling {name}')
                if label in PARTIAL:
                    name, floor = PARTIAL[label]
                    want = sorted((b, bt, p) for b, bt, p in ref if p >= floor)
                    self.assertEqual(self.written(v, name, first, last), want, f'{v} {label} partial {name}')

    def test_section_colours(self):
        """Cada sección tiene su color: en exploración la melodía pasa por cuatro instrumentos."""
        self.assertGreaterEqual(len({c for c, _ in CARRIERS['explora'].values()}), 4)
        self.assertNotIn('Choir', [CARRIERS['explora'][k][0] for k in ('head 1-2', 'motif 3-6', 'tritone 11-14')])

    # ── criterion 5 and synchrony rule 3 ──────────────────────────────────────
    def test_common_layers_identical(self):
        raw = {v: raw_events(self.paths[v]) for v in VERSIONS}
        for name in COMMON_TRACKS:
            self.assertTrue(raw['explora'][name][0], name)
            self.assertEqual(raw['explora'][name], raw['combate'][name], name)
        self.assertTrue(any(c == 1 for _, c, _ in raw['explora']['Choir Pad'][1]), 'Choir Pad has CC1')

    def test_common_layer_contents(self):
        tr = self.tracks('explora')
        glasses = [(bar_of(n.start), beat_of(n.start), n.pitch) for n in tr['Glasses'].notes]
        self.assertEqual(glasses, [(1, 1, 74), (2, 1, 75), (3, 1, 74), (3, 3, 75), (5, 1, 74), (5, 3, 77),
                                   (6, 1, 76), (23, 1, 74), (23, 3, 75)])
        self.assertEqual(len(tr['Celesta'].notes), 8)
        self.assertEqual({bar_of(n.start) for n in tr['Celesta'].notes}, {3, 4, 5, 6})
        pad_bars = sorted({bar_of(n.start) for n in tr['Choir Pad'].notes})
        self.assertEqual(pad_bars, [1, 11, 15, 17, 18, 19, 20, 21, 22, 23])
        # the pad sounds through the whole loop
        for bar in range(1, BARS + 1):
            for beat in (1, 3):
                t = bar_start(bar) + (beat - 1) * BEAT_S + 0.05
                self.assertTrue(any(n.start <= t < n.end for n in tr['Choir Pad'].notes), f'pad silent in bar {bar}')

    # ── criterion 6 ───────────────────────────────────────────────────────────
    def test_figures(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                times = sorted({round(n.start, 3) for n in track.notes})
                if name in SLOW_TRACKS:
                    for a, b in zip(times, times[1:]):
                        self.assertGreaterEqual(b - a, 2 * BEAT_S - 2 * TOL, f'{v} {name} at {a:.2f} s')
                    for n in track.notes:
                        self.assertGreaterEqual(n.end - n.start, 2 * BEAT_S - 0.1, f'{v} {name} at {n.start:.2f} s')
                else:
                    self.assertIn(name, FAST_TRACKS)
                    for t in times:
                        off = abs(t / S16 - round(t / S16)) * S16
                        self.assertLess(off, TOL, f'{v} {name} at {t:.3f} s off the 16th grid')

    # ── criterion 7 ───────────────────────────────────────────────────────────
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

    # ── criterion 8 ───────────────────────────────────────────────────────────
    def test_no_register_clash_with_the_melody(self):
        for v in VERSIONS:
            tr = self.tracks(v)
            for label, ref in REFERENCE.items():
                first, last = ref[0][0], ref[-1][0]
                lead, doublings = CARRIERS[v][label]
                skip = {lead} | {d for d, _ in doublings} | UNPITCHED
                if label in PARTIAL:
                    skip.add(PARTIAL[label][0])
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
                            self.assertLess(level(track, o), level(tr[lead], m),
                                            f'{v} {name} {o.pitch} vs {lead} {m.pitch} in bar {bar_of(o.start)}')

    # ── criterion 9 ───────────────────────────────────────────────────────────
    def test_ceilings(self):
        for v in VERSIONS:
            vel_top, cc_top = TOP[v]
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    self.assertLessEqual(n.velocity, CEILINGS.get(name, vel_top), f'{v} {name}')
                for t, value in track.cc.get(1, []):
                    self.assertLessEqual(value, cc_top, f'{v} {name} CC1 at {t:.2f} s')

    def test_climax_in_bar_21(self):
        for v in VERSIONS:
            choir = self.tracks(v)['Choir']
            top = max(val for _, val in choir.cc[1])
            self.assertEqual({bar_of(t) for t, val in choir.cc[1] if val == top}, {21}, f'{v} Choir CC1')
        guitar = self.tracks('explora')['Guitar']
        top = max(n.velocity for n in guitar.notes)
        self.assertEqual({bar_of(n.start) for n in guitar.notes if n.velocity == top}, {21})

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_sonatina_cc1(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in CC1_TRACKS:
                    pts = track.cc.get(1)
                    self.assertTrue(pts, f'{v} {name}')
                    self.assertEqual(pts[0][0], 0.0, f'{v} {name}: CC1 at tick 0')
                    self.assertLess(pts[0][0], track.notes[0].start + 1e-9)
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

    # ── criterion 11 ──────────────────────────────────────────────────────────
    def test_bass_locks_to_the_riff(self):
        for v in VERSIONS:
            tr = self.tracks(v)
            for bar in range(1, BARS + 1):
                g = onsets(tr['Guitar'], bar)
                if not g:
                    continue
                for k, notes in onsets(tr['Bass'], bar).items():
                    self.assertIn(k, g, f'{v} bar {bar}: bass at 16th {k} without guitar')
                    low = min(n.pitch for n in g[k])
                    self.assertEqual(notes[0].pitch % 12, low % 12, f'{v} bar {bar} 16th {k}')

    def test_power_chords(self):
        for v in VERSIONS:
            for name in ('Guitar', 'Guitar 2'):
                for bar in range(1, BARS + 1):
                    for k, notes in onsets(self.tracks(v)[name], bar).items():
                        ps = sorted(n.pitch for n in notes)
                        if len(ps) > 1:
                            self.assertEqual(ps, [ps[0], ps[0] + 7, ps[0] + 12], f'{v} {name} bar {bar} 16th {k}')

    # ── criterion 12 ──────────────────────────────────────────────────────────
    def test_asalto(self):
        tr = self.tracks('combate')
        for bar, accents in ASALTO.items():
            g = onsets(tr['Guitar'], bar)
            kicks = {k for k, ns in onsets(tr['Drums'], bar).items() if any(n.pitch == KICK for n in ns)}
            want = set(range(9)) if bar in STOPS else set(range(16))
            self.assertEqual(set(g), want, f'guitar 16ths in bar {bar}')
            self.assertEqual(kicks, want, f'double kick in bar {bar}')
            power = {k for k, ns in g.items() if len(ns) == 3}
            self.assertEqual(power, (accents & set(range(8)) | {8}) if bar in STOPS else accents, f'accents in bar {bar}')
            self.assertEqual(set(onsets(tr['Guitar 2'], bar)), want, f'double-tracked in bar {bar}')
        for bar in BLASTS:
            snares = {k for k, ns in onsets(tr['Drums'], bar).items() if any(n.pitch == SNARE for n in ns)}
            self.assertEqual(snares, set(range(16)), f'blast in bar {bar}')
        for bar in range(1, BARS + 1):
            if bar not in BLASTS:
                snares = {k for k, ns in onsets(tr['Drums'], bar).items() if any(n.pitch == SNARE for n in ns)}
                self.assertLess(len(snares), 16, f'no blast in bar {bar}')
        for bar in STOPS:
            for name in ('Guitar', 'Guitar 2', 'Bass', 'Drums', 'Lead'):
                late = [k for k in onsets(tr[name], bar) if k > 8]
                self.assertFalse(late, f'{name} plays after the stop in bar {bar}')
        for name in ('Guitar', 'Guitar 2', 'Bass', 'Drums'):
            self.assertEqual(set(onsets(tr[name], 23)), {0}, f'{name}: one hit in bar 23, then the choir alone')
        self.assertFalse(onsets(tr['Lead'], 23))

    def test_espiral_cell(self):
        for v in VERSIONS:
            g = self.tracks(v)['Guitar']
            for bar in range(11, 15):
                for k, notes in onsets(g, bar).items():
                    step = CELL[((bar - 11) * 16 + k) % 7]
                    self.assertIsNotNone(step, f'{v} bar {bar} 16th {k}: the cell rests there')
                    self.assertEqual(min(n.pitch for n in notes) % 12, (D + step) % 12)
                    if v == 'explora':
                        self.assertEqual(len(notes), 1, f'explora bar {bar}: no fifths in the soft spiral')
                        self.assertLessEqual(notes[0].velocity, 92, 'soft layer')
                    else:
                        self.assertEqual(len(notes) == 3, step == 0, f'combat bar {bar} 16th {k}')
                expected = {k for k in range(16) if CELL[((bar - 11) * 16 + k) % 7] is not None}
                self.assertEqual(set(onsets(g, bar)), expected, f'{v} bar {bar}')

    def test_breakdowns_and_tom_falls(self):
        ex = self.tracks('explora')['Guitar']
        for bar in (7, 8, 9, 10):
            beats = sorted(round((k / 4), 2) for k in onsets(ex, bar))
            self.assertEqual(beats, BREAKDOWN_HITS[5] if bar % 2 else BREAKDOWN_HITS[3], f'explora bar {bar}')
        co = self.tracks('combate')
        for bar, hits in ((15, BREAKDOWN_HITS[5]), (16, BREAKDOWN_HITS[3])):
            self.assertEqual(sorted(k / 4 for k in onsets(co['Guitar'], bar)), hits, f'combat bar {bar}')
            kicks = {k for k, ns in onsets(co['Drums'], bar).items() if any(n.pitch == KICK for n in ns)}
            self.assertEqual(kicks, set(range(16)), f'double kick under the breakdown, bar {bar}')
        for bar in (18, 24):
            toms = sorted((pos16(n.start), n.pitch) for n in notes_between(co['Drums'], bar, bar) if n.pitch in TOMS)
            self.assertEqual(toms, list(zip(range(10, 16), TOMS)), f'tom fall in bar {bar}')
            self.assertEqual(sorted(k / 4 for k in onsets(co['Guitar'], bar)), [0, .75, 1.5], f'three hits, bar {bar}')

    # ── criterion 13 ──────────────────────────────────────────────────────────
    def test_riffs_followed_by_pauses(self):
        g = self.tracks('explora')['Guitar']
        for bar in PAUSES:
            self.assertTrue(onsets(g, bar), f'bar {bar} starts with the riff')
            self.assertFalse([k for k in onsets(g, bar) if k >= 8], f'explora bar {bar}: the riff must stop')
        for bar in (1, 2, 3, 4, 5, 6, 23, 24):
            self.assertFalse(onsets(g, bar), f'explora bar {bar}: no guitar before the breakdown / in the coda')

    # ── criterion 14 ──────────────────────────────────────────────────────────
    def test_lowest_note_on_beats_1_and_3_is_the_bass(self):
        for v in VERSIONS:
            for bar in range(1, BARS + 1):
                for beat in (1, 3):
                    t = bar_start(bar) + (beat - 1) * BEAT_S + 0.04
                    sounding = [n.pitch for name, tr in self.tracks(v).items() if name not in UNPITCHED
                                for n in tr.notes if n.start <= t < n.end]
                    self.assertTrue(sounding, f'{v} bar {bar} beat {beat}: silence')
                    allowed = CELL_PCS if 11 <= bar <= 14 else {HARMONY[bar][0]}
                    self.assertIn(min(sounding) % 12, allowed, f'{v} bar {bar} beat {beat}: lowest {min(sounding)}')

    def test_humanized_velocities_and_timing(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if len(track.notes) >= 6:
                    self.assertGreater(len({n.velocity for n in track.notes}), 2, f'{v} {name}')
            off = [n for tr in self.tracks(v).values() for n in tr.notes
                   if abs(n.start / S16 - round(n.start / S16)) * S16 > 0.002]
            self.assertGreater(len(off), 200, v)
            for name, track in self.tracks(v).items():
                for n in track.notes:
                    grid = abs(n.start / S16 - round(n.start / S16)) * S16
                    self.assertLessEqual(grid, 0.0095, f'{v} {name} at {n.start:.3f} s: more than 8 ms off')

    def test_shared_attacks_sound_together(self):
        """Mismo nombre, mismo sitio escrito → mismo instante en las dos versiones: sin flam en el cruce."""
        ex, co = self.tracks('explora'), self.tracks('combate')
        shared = 0
        for name in set(ex) & set(co):
            a = {(round(n.start / S16), n.pitch): n.start for n in ex[name].notes}
            b = {(round(n.start / S16), n.pitch): n.start for n in co[name].notes}
            for key in set(a) & set(b):
                self.assertAlmostEqual(a[key], b[key], delta=1e-4, msg=f'{name} at {a[key]:.3f} s')
                shared += 1
        self.assertGreater(shared, 100)

    def test_legato_lines(self):
        for v in VERSIONS:
            for label, ref in REFERENCE.items():
                first, last = ref[0][0], ref[-1][0]
                lead = CARRIERS[v][label][0]
                if lead in STRUCK or len(ref) < 3:
                    continue
                notes = sorted(notes_between(self.tracks(v)[lead], first, last), key=lambda n: n.start)
                for a, b in zip(notes, notes[1:]):
                    over = a.end - b.start
                    if a.pitch == b.pitch:
                        self.assertLess(over, 0, f'{v} {lead} repeated note at {b.start:.2f} s')
                    else:
                        self.assertTrue(0.0095 <= over <= 0.0305, f'{v} {lead} {over * 1000:.1f} ms at {b.start:.2f} s')

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

    def test_loop_seam(self):
        ex = self.tracks('explora')
        for name in ('Drums', 'Bass'):
            first = sorted((pos16(n.start), n.pitch, n.velocity) for n in notes_between(ex[name], 1, 1))
            last = sorted((pos16(n.start), n.pitch, n.velocity) for n in notes_between(ex[name], 24, 24))
            self.assertTrue(first, name)
            self.assertEqual([x[:2] for x in first], [x[:2] for x in last], f'explora {name}: the heartbeat crosses the seam')
        co = self.tracks('combate')['Drums']
        bar1 = {(pos16(n.start), n.pitch) for n in notes_between(co, 1, 1)}
        self.assertIn((0, CRASH), bar1, 'the tom fall of bar 24 lands on the crash of bar 1')
        pad = self.tracks('explora')['Choir Pad'].cc[1]
        self.assertLessEqual(abs(pad[0][1] - pad[-1][1]), 4, 'the pad CC1 ends where it starts')


if __name__ == '__main__':
    unittest.main()
