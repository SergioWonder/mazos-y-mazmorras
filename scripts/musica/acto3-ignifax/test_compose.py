"""Acceptance tests for Ignifax's boss theme «Llamarada y trono de ceniza»
(docs/musica/acto3-ignifax.md, section 8, score criteria 1-15).

They read the generated MIDI independently of anything compose.py checks itself. The time map (bars of 3/4 at 168
and of 4/4 at 126) is rebuilt here from the brief.
Run with: scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto3-ignifax/test_compose.py
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

SR = 44100
TOL = 0.012                     # humanization is +-8 ms
BARS = 58
L_BARS = set(range(1, 23)) | set(range(37, 49)) | {57, 58}   # 3/4 at 168; the rest are 4/4 at 126


def metre(bar):
    return (168, 3) if bar in L_BARS else (126, 4)


def beat_s(bar):
    return 60 / metre(bar)[0]


BAR_START = {1: 0.0}
for _b in range(1, BARS + 1):
    BAR_START[_b + 1] = BAR_START[_b] + metre(_b)[1] * beat_s(_b)
LOOP_S = BAR_START[BARS + 1]
LOOP_SAMPLES = 3549000


def t(bar, beat=0.0):
    """Seconds of a beat of a bar; beats past the bar line run on into the next bars (same metre)."""
    while beat >= metre(bar)[1] - 1e-9:
        beat -= metre(bar)[1]
        bar += 1
    return BAR_START[bar] + beat * beat_s(bar)


def bar_of(seconds):
    for b in range(1, BARS + 1):
        if seconds < BAR_START[b + 1] - TOL:
            return b
    return BARS


def beat_in_bar(seconds):
    b = bar_of(seconds)
    return (seconds - BAR_START[b]) / beat_s(b)


SSO = 'sso/Sonatina Symphonic Orchestra/'
ID, MB = 'VCSL/Idiophones/Struck Idiophones/', 'VCSL/Membranophones/Struck Membranophones/'
EXPECTED_TRACKS = {
    'Choir': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Choir Low': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Shout': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Low Brass': SSO + 'Brass - Performance/Trombones Marcato.sfz',
    'Tuba': SSO + 'Brass - Performance/Tuba Marcato.sfz',
    'Strings': SSO + 'Strings - Performance/1st Violins Marcato.sfz',
    'Spiccato': 'VSCO-2-CE/CelloEnsSpic.sfz',
    'Violin Spiccato': 'VSCO-2-CE/ViolinEnsSpic.sfz',
    'Basses': 'VSCO-2-CE/ContrabassSpic.sfz',
    'Organ': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
    'Organ Pedal': SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
    'War Drums': MB + 'Bass Drum 2.sfz',
    'Toms': MB + 'Tom 2.sfz',
    'Snare': MB + 'Snare Drum, Rope Tension.sfz',
    'Timpani': 'VSCO-2-CE/Timpani.sfz',
    'Timp Roll': 'VSCO-2-CE/TimpaniRolls.sfz',
    'Forge': ID + 'Brake Drum.sfz',
    'Clash': ID + 'Clash Cymbals 1.sfz',
    'Cymbal': ID + 'Suspended Cymbal 2.sfz',
    'Gong': ID + 'Gong 1.sfz',
}
CC1_TRACKS = ['Choir', 'Choir Low', 'Shout', 'Horns', 'Low Brass', 'Tuba', 'Strings']
UNPITCHED = {'War Drums', 'Toms', 'Snare', 'Forge', 'Clash', 'Cymbal', 'Gong'}
RHYTHM = {'Spiccato', 'Violin Spiccato', 'Toms', 'War Drums', 'Snare'}       # the only tracks with 16ths
RANGES = {
    'Choir': (57, 75), 'Choir Low': (44, 63), 'Shout': (53, 74), 'Horns': (45, 70), 'Low Brass': (40, 60),
    'Tuba': (29, 46), 'Strings': (55, 73), 'Spiccato': (41, 61), 'Violin Spiccato': (55, 70), 'Basses': (29, 47),
    'Organ': (40, 63), 'Organ Pedal': (40, 48), 'Timpani': (40, 55), 'Timp Roll': (43, 55),
}
PERC_KEYS = {'War Drums': {62}, 'Toms': {60, 62}, 'Snare': {62}, 'Forge': {61}, 'Clash': {60}, 'Cymbal': {63, 64},
             'Gong': {61}}
MAX_NOTE_S = {'Horns': 2.8, 'Shout': 0.6, 'Tuba': 0.6, 'Low Brass': 1.6, 'Timp Roll': 3.0, 'Cymbal': 3.0}

SECTIONS = [('intro', 1, 4, 9), ('A', 5, 12, 13), ("A'", 13, 20, 10), ('martillazos', 21, 22, 7),
            ('trono', 23, 26, 10), ('tambores', 27, 34, 11), ('ruptura', 35, 36, 7), ('puente', 37, 40, 12),
            ('clímax I', 41, 48, 15), ('clímax II', 49, 56, 17), ('coda', 57, 58, 8)]

# Section 5: «Tesoro maldito», (beat from the phrase start, pitch, beats)
TESORO = [(0, 69, 2), (2, 67, 1), (3, 65, 2), (5, 64, 1), (6, 62, 1), (7, 64, 1), (8, 65, 1), (9, 64, 3),
          (12, 72, 2), (14, 71, 1), (15, 69, 1), (16, 68, 1), (17, 65, 1), (18, 64, 1.5), (19.5, 65, .5),
          (20, 62, 1), (21, 57, 3)]
HEADS = [(0, 69, 2), (2, 67, 1), (3, 65, 2), (5, 64, 1), (6, 70, 2), (8, 68, 1), (9, 66, 2), (11, 65, 1)]
# (track, first bar, last bar, events, transposition)
LEITMOTIF = [
    ('Choir', 5, 12, TESORO, 0), ('Choir Low', 5, 12, TESORO, -12), ('Horns', 5, 12, TESORO, -12),
    ('Choir Low', 13, 20, TESORO, -12), ('Low Brass', 13, 20, TESORO, -12), ('Horns', 13, 20, TESORO, -12),
    ('Choir', 29, 34, TESORO, 0), ('Choir Low', 29, 34, TESORO, -12), ('Horns', 29, 34, TESORO, -12),
    ('Horns', 37, 40, HEADS, 0), ('Low Brass', 37, 40, HEADS, -12),
    ('Choir', 41, 48, TESORO, 1), ('Strings', 41, 48, TESORO, 1), ('Choir Low', 41, 48, TESORO, -11),
    ('Horns', 41, 48, TESORO, -11),
    ('Choir', 49, 54, TESORO, 3), ('Choir Low', 49, 54, TESORO, -9), ('Horns', 49, 54, TESORO, -9),
]
# Criterion 7: the lead line and its declared doublings
LEADS = [('Choir', 5, 12, {'Choir Low', 'Horns'}), ('Choir Low', 13, 20, {'Low Brass', 'Horns'}),
         ('Choir', 29, 34, {'Choir Low', 'Horns'}), ('Horns', 37, 40, {'Low Brass'}),
         ('Choir', 41, 48, {'Strings', 'Choir Low', 'Horns'}), ('Choir', 49, 54, {'Choir Low', 'Horns'})]

# Section 4: bass pitch class on beat 1 of every bar
A, Bb, B, C, E, F, G, Ab = 9, 10, 11, 0, 4, 5, 7, 8
BASS = {1: A, 2: Bb, 3: A, 4: A, 21: A, 22: Bb, 23: A, 24: A, 25: F, 26: E, 35: A, 36: Bb,
        37: A, 38: Bb, 39: F, 40: F, 48: G, 55: Ab, 56: Bb, 57: A, 58: A}
for _b in range(5, 13):
    BASS[_b] = A if _b % 2 else Bb
for _b, _pc in zip(range(13, 21), [A, Bb, A, A, A, Bb, A, A]):
    BASS[_b] = _pc
for _b in range(27, 35):
    BASS[_b] = A
for _b in range(41, 48):
    BASS[_b] = Bb if _b % 2 else B
for _b in range(49, 55):
    BASS[_b] = C

MOTOR_BARS = [1, 2, 3] + list(range(5, 21)) + list(range(37, 49))
STOP_BARS = [16, 20]
GROOVE_BARS = list(range(27, 35)) + list(range(49, 57))


def ostinato(root):
    return [root + 12, root + 19, root + 24, root + 25, root + 19, root + 24]


def motor_root(bar):
    """The root the spiccato ostinato follows (the section's, not the bar-by-bar alternation)."""
    if 39 <= bar <= 40:
        return 29          # F1
    if 41 <= bar <= 48:
        return 34          # Bb1
    return 33              # A1


def groove_root(bar):
    return {55: 32, 56: 34}.get(bar, 36 if bar >= 49 else 33)


HAMMER_CHORDS = {'A': [57, 64, 69], 'Bb': [58, 65, 70], 'A5': [57, 64]}
HAMMERS = [(4, 0, 'A'), (21, 0, 'A'), (22, 0, 'Bb'), (26, 3, 'A5'), (35, 0, 'A'), (35, 1.5, 'A'), (36, 0, 'Bb'),
           (36, 1.5, 'Bb'), (36, 2.5, 'A'), (57, 0, 'A'), (57, 1.5, 'A'), (58, 0, 'A')]
CLASH_BARS = [4, 5, 9, 21, 22, 26, 29, 35, 36, 37, 45, 49, 55, 57, 58]


def onsets_of(track, merge=0.015):
    out = []
    for n in sorted(track.notes, key=lambda n: n.start):
        if not out or n.start - out[-1] > merge:
            out.append(n.start)
    return out


def in_bar(track, bar):
    return [n for n in track.notes if BAR_START[bar] - TOL <= n.start < BAR_START[bar + 1] - TOL]


def sixteenth(n, bar):
    return round((n.start - BAR_START[bar]) / (beat_s(bar) / 4))


class IgnifaxScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = os.path.join(tempfile.mkdtemp(), 'acto3-ignifax.mid')
        compose.write_midi(cls.path)
        cls.mid = mido.MidiFile(cls.path)
        cls.song = midi_io.load(cls.path)
        cls.tr = cls.song.tracks

    # ── structure ────────────────────────────────────────────────────────────
    def test_una_pista_con_nombre_por_instrumento(self):
        names = [next(m.name for m in tr if m.type == 'track_name') for tr in self.mid.tracks
                 if any(m.type == 'note_on' for m in tr)]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(sorted(names), sorted(EXPECTED_TRACKS))
        for name, rel in EXPECTED_TRACKS.items():
            self.assertEqual(compose.SFZ_OF[name], library(*rel.split('/')), name)
            self.assertTrue(os.path.exists(compose.SFZ_OF[name]), name)
            self.assertTrue(self.tr[name].notes, f'{name} no tiene notas')

    def test_determinista(self):
        other = os.path.join(tempfile.mkdtemp(), 'again.mid')
        compose.write_midi(other)
        with open(self.path, 'rb') as a, open(other, 'rb') as b:
            self.assertEqual(a.read(), b.read())

    # 1
    def test_1_tempos_compases_y_longitud(self):
        tpb = self.mid.ticks_per_beat
        events = []
        for tr in self.mid.tracks:
            tick = 0
            for m in tr:
                tick += m.time
                if m.type in ('set_tempo', 'time_signature'):
                    events.append((tick, m))
        bar_tick, tick = {}, 0
        for b in range(1, BARS + 2):
            bar_tick[b] = tick
            tick += metre(b)[1] * tpb if b <= BARS else 0
        tempos = sorted((tk, round(mido.tempo2bpm(m.tempo), 3)) for tk, m in events if m.type == 'set_tempo')
        sigs = sorted((tk, (m.numerator, m.denominator)) for tk, m in events if m.type == 'time_signature')
        changes = [1, 23, 37, 49, 57]
        self.assertEqual(tempos, [(bar_tick[b], float(metre(b)[0])) for b in changes])
        self.assertEqual(sigs, [(bar_tick[b], (metre(b)[1], 4)) for b in changes])
        self.assertEqual(sum(1 for b in range(1, BARS + 1) if b in L_BARS), 36)
        self.assertEqual(round(LOOP_S * SR), LOOP_SAMPLES)
        self.assertEqual(round(t(23) * SR), 22 * 47250)
        self.assertEqual(round(t(37) * SR), 22 * 47250 + 14 * 84000)
        self.assertEqual(compose.LOOP_SAMPLES, LOOP_SAMPLES)
        for track in self.tr.values():
            for n in track.notes:
                self.assertGreaterEqual(n.start, 0.0, track.name)
                self.assertLessEqual(n.end, LOOP_S + 1e-6, f'{track.name} pasa del final del bucle')

    # 2
    def test_2_rangos_y_registros(self):
        for name, track in self.tr.items():
            inst = sfz.load(compose.SFZ_OF[name])
            keys = {k for r in inst.regions if r.get('trigger', 'attack') == 'attack'
                    for k in range(r.lokey, r.hikey + 1)}
            for n in track.notes:
                self.assertIn(n.pitch, keys, f'{name} {n.pitch} fuera del patch (c. {bar_of(n.start)})')
                if name in PERC_KEYS:
                    self.assertIn(n.pitch, PERC_KEYS[name], f'{name} nota {n.pitch}')
                else:
                    lo, hi = RANGES[name]
                    self.assertTrue(lo <= n.pitch <= hi, f'{name} {n.pitch} c. {bar_of(n.start)} fuera de {lo}-{hi}')

    # 3
    def test_3_nada_agudo_y_violines_bajo_sib4(self):
        for name, track in self.tr.items():
            if name in UNPITCHED:
                continue
            for n in track.notes:
                self.assertLessEqual(n.pitch, 77, f'{name} {n.pitch} por encima de F5 (c. {bar_of(n.start)})')
        high = [n for name in ('Strings', 'Violin Spiccato') for n in self.tr[name].notes if n.pitch > 70]
        self.assertLessEqual(sum(n.end - n.start for n in high), 1.5)
        for n in high:
            self.assertLessEqual(n.end - n.start, 0.75, f'violines {n.pitch} tenido en el c. {bar_of(n.start)}')

    # 4
    def test_4_leitmotiv_en_sus_seis_lugares(self):
        for name, first, last, events, shift in LEITMOTIF:
            label = f'{name} c. {first}-{last}'
            got = sorted((n for n in self.tr[name].notes if t(first) - TOL <= n.start < t(last + 1) - TOL),
                         key=lambda n: n.start)
            self.assertEqual(len(got), len(events), label)
            for i, ((beat, pitch, length), n) in enumerate(zip(events, got)):
                at = t(first, beat)
                self.assertEqual(n.pitch, pitch + shift, f'{label}: tiempo {beat}')
                self.assertAlmostEqual(n.start, at, delta=TOL, msg=f'{label}: tiempo {beat}')
                nominal = t(first, beat + length) - at
                dur = n.end - n.start
                if i == len(events) - 1 or (events is HEADS and i % 4 == 3):
                    self.assertTrue(nominal - 0.045 <= dur <= nominal + 0.006, f'{label}: final {dur:.3f}/{nominal:.3f}')
                else:  # legato: 10-30 ms over the next note (plus the humanization)
                    self.assertTrue(nominal + 0.003 <= dur <= nominal + 0.040, f'{label}: legato {dur:.3f}/{nominal:.3f}')

    # 5
    def test_5_figuras(self):
        for name, track in self.tr.items():
            fastest = 0.25 if name in RHYTHM else 0.5
            ons = onsets_of(track)
            for a, b in zip(ons, ons[1:]):
                self.assertGreaterEqual((b - a) / beat_s(bar_of(a)), fastest - 0.06,
                                        f'{name} más rápido que {fastest} tiempos en el c. {bar_of(a)}')

    # 6
    def test_6_capas_por_seccion(self):
        for label, first, last, limit in SECTIONS:
            worst, at = 0, t(first)
            while at < t(last + 1) - 1e-6:
                b = bar_of(at)
                worst = max(worst, sum(any(n.start <= at + 0.02 < n.end for n in tr.notes) for tr in self.tr.values()))
                at += beat_s(b) / 4
            self.assertLessEqual(worst, limit, label)
        allowed = {'Organ', 'Organ Pedal', 'Choir Low', 'Timpani'}
        for name, track in self.tr.items():
            for n in track.notes:
                if n.start < t(26, 3) - TOL and n.end > t(23) + 0.05:
                    self.assertIn(name, allowed, f'{name} suena en el trono (c. {bar_of(n.start)})')

    # 7
    def test_7_sin_roces_con_la_melodia(self):
        for lead, first, last, doubles in LEADS:
            lo, hi = t(first), t(last + 1)
            mel = [n for n in self.tr[lead].notes if lo - TOL <= n.start < hi - TOL]
            for name, track in self.tr.items():
                if name == lead or name in doubles or name in UNPITCHED:
                    continue
                for o in track.notes:
                    if o.end - o.start < beat_s(bar_of(o.start)) - 0.03:
                        continue
                    for m in mel:
                        held = min(m.end, o.end) - max(m.start, o.start)
                        if held > 0.06:
                            self.assertNotIn(abs(m.pitch - o.pitch), (1, 2),
                                             f'{name} {o.pitch} roza {lead} {m.pitch} en el c. {bar_of(m.start)}')

    # 8
    def test_8_techos_y_cumbre_en_el_c49(self):
        for name, track in self.tr.items():
            for n in track.notes:
                self.assertLessEqual(n.velocity, 120, f'{name} velocidad {n.velocity}')
            for value in (v for _, v in track.cc.get(1, [])):
                self.assertLessEqual(value, 112, f'{name} CC1 {value}')
        lo, hi = t(49), t(50)
        for name in ('War Drums', 'Timpani', 'Gong'):
            inside = max(n.velocity for n in self.tr[name].notes if lo - TOL <= n.start < hi - TOL)
            outside = max(n.velocity for n in self.tr[name].notes if not lo - TOL <= n.start < hi - TOL)
            self.assertGreater(inside, outside, name)
        for name in ('Choir', 'Horns'):
            pts = self.tr[name].cc[1]
            inside = max(v for x, v in pts if lo - TOL <= x < hi - TOL)
            outside = max(v for x, v in pts if not lo - TOL <= x < hi - TOL)
            self.assertGreater(inside, outside, name)
            self.assertEqual(inside, 112, name)

    # 9
    def test_9_curvas_cc1_y_duraciones(self):
        for name in CC1_TRACKS:
            pts = self.tr[name].cc.get(1, [])
            self.assertTrue(pts, f'{name} sin CC1')
            self.assertEqual(pts[0][0], 0.0, f'{name}: CC1 no empieza en el tick 0')
            self.assertGreater(len({v for _, v in pts}), 2, f'{name}: el CC1 no se mueve')
            for (a, _), (b, _) in zip(pts, pts[1:]):
                self.assertGreaterEqual(b - a, beat_s(bar_of(a)) / 2 - 0.002, f'{name}: CC1 más denso que la corchea')
        for name, limit in MAX_NOTE_S.items():
            for n in self.tr[name].notes:
                self.assertLessEqual(n.end - n.start, limit + 1e-3, f'{name} nota de {n.end - n.start:.2f} s')

    # 10
    def test_10_el_motor(self):
        for bar in MOTOR_BARS:
            spic = sorted(in_bar(self.tr['Spiccato'], bar), key=lambda n: n.start)
            toms = sorted(in_bar(self.tr['Toms'], bar), key=lambda n: n.start)
            drums = sorted(sixteenth(n, bar) for n in in_bar(self.tr['War Drums'], bar))
            if bar in STOP_BARS:
                self.assertEqual([sixteenth(n, bar) for n in spic], [0], f'spiccato c. {bar}')
                self.assertEqual([sixteenth(n, bar) for n in toms], [0], f'toms c. {bar}')
                self.assertEqual(drums, [0, 10, 11], f'tambores c. {bar}')
                continue
            ost = ostinato(motor_root(bar))
            self.assertEqual([sixteenth(n, bar) for n in spic], list(range(12)), f'spiccato c. {bar}')
            self.assertEqual([n.pitch for n in spic], ost * 2, f'ostinato c. {bar}')
            self.assertEqual([sixteenth(n, bar) for n in toms], list(range(12)), f'toms c. {bar}')
            self.assertEqual([n.pitch for n in toms], [62 if k % 3 == 0 else 60 for k in range(12)], f'toms c. {bar}')
            self.assertEqual(drums, [0, 10, 11], f'tambores c. {bar}')

    # 11
    def test_11_groove_332(self):
        for bar in GROOVE_BARS:
            accents = [0, 3, 6, 8, 11, 14]
            self.assertEqual(sorted(sixteenth(n, bar) for n in in_bar(self.tr['War Drums'], bar)), accents, f'c. {bar}')
            toms = sorted(in_bar(self.tr['Toms'], bar), key=lambda n: n.start)
            self.assertEqual([sixteenth(n, bar) for n in toms], list(range(16)), f'toms c. {bar}')
            self.assertEqual([sixteenth(n, bar) for n in toms if n.pitch == 62], accents, f'toms c. {bar}')
            spic = sorted(in_bar(self.tr['Spiccato'], bar), key=lambda n: n.start)
            r = groove_root(bar)
            self.assertEqual([n.pitch for n in spic], [r + 13 if k % 8 >= 6 else r + 12 for k in range(16)],
                             f'spiccato c. {bar}')

    # 12
    def test_12_golpes_y_silencios(self):
        beats = sorted(round(beat_in_bar(n.start)) + 10 * bar_of(n.start)
                       for n in self.tr['Timpani'].notes if t(23) - TOL <= n.start < t(27) - TOL)
        self.assertEqual(beats, [10 * b + k for b in range(23, 27) for k in range(4)], 'el latido')
        for bar, beat, chord in HAMMERS:
            got = sorted(n.pitch for n in self.tr['Shout'].notes if abs(n.start - t(bar, beat)) <= TOL)
            self.assertEqual(got, HAMMER_CHORDS[chord], f'martillazo c. {bar} t. {beat}')
            for name in ('War Drums', 'Low Brass', 'Tuba'):
                self.assertTrue(any(abs(n.start - t(bar, beat)) <= TOL for n in self.tr[name].notes),
                                f'{name} en el martillazo del c. {bar}')
        coda = [t(57), t(57, 1.5), t(58)]
        self.assertAlmostEqual(coda[1] - coda[0], coda[2] - coda[1], delta=1e-6)
        for bar, beat in ((35, 2.5), (35, 3.0), (36, 3.0)):
            got = [n.pitch for n in self.tr['Shout'].notes if abs(n.start - t(bar, beat)) <= TOL]
            self.assertEqual(got, [57], f'grito en el silencio c. {bar} t. {beat}')
        for bar, allowed in ((4, {'Cymbal'}), (22, {'Choir', 'Timp Roll'})):
            for name, track in self.tr.items():
                for n in in_bar(track, bar):
                    if n.start > BAR_START[bar] + 0.05:
                        self.assertIn(name, allowed, f'{name} rompe el silencio del c. {bar}')
        for bar in STOP_BARS:
            for name, track in self.tr.items():
                for n in in_bar(track, bar):
                    if n.start > BAR_START[bar] + 0.05:
                        self.assertIn(name, {'Shout', 'War Drums'}, f'{name} en el hueco del c. {bar}')
            shouts = sorted({round(beat_in_bar(n.start)) for n in in_bar(self.tr['Shout'], bar)})
            self.assertEqual(shouts, [1, 2], f'gritos c. {bar}')

    # 13
    def test_13_recuentos(self):
        self.assertEqual([bar_of(n.start) for n in self.tr['Gong'].notes], [41, 49, 58])
        self.assertEqual([bar_of(n.start) for n in self.tr['Clash'].notes], CLASH_BARS)
        self.assertEqual([bar_of(n.start) for n in self.tr['Cymbal'].notes], [4, 39, 47])
        banned = ('Anvil', 'Trumpet', 'Glockenspiel', 'Piccolo', 'Principal 4ft', 'All Stops', 'KS')
        for name, path in compose.SFZ_OF.items():
            for word in banned:
                self.assertNotIn(word, path, name)

    # 14
    def test_14_armonia(self):
        for bar in range(1, BARS + 1):
            starts = [n.pitch for name, tr in self.tr.items() if name not in UNPITCHED
                      for n in tr.notes if abs(n.start - BAR_START[bar]) <= TOL]
            self.assertTrue(starts, f'nada empieza en el t1 del c. {bar}')
            self.assertEqual(min(starts) % 12, BASS[bar], f'bajo del c. {bar}')

    # 15
    def test_15_oficio_y_costura(self):
        offs, vels = [], {}
        for name, track in self.tr.items():
            for n in track.notes:
                b = bar_of(n.start)
                step = beat_s(b) / 4
                x = n.start - BAR_START[b]
                offs.append(x - round(x / step) * step)
                vels.setdefault(name, set()).add(n.velocity)
        self.assertLessEqual(max(abs(o) for o in offs), 0.0085)
        self.assertGreater(sum(abs(o) > 0.001 for o in offs) / len(offs), 0.3, 'sin humanizar')
        for name in ('War Drums', 'Toms', 'Spiccato', 'Timpani'):
            self.assertGreaterEqual(len(vels[name]), 6, f'{name}: velocidades sin variar')
        pickup = sorted(sixteenth(n, 58) for n in in_bar(self.tr['War Drums'], 58))
        self.assertEqual(pickup, [0, 8, 9, 10, 11], 'la anacrusa del c. 58')
        self.assertTrue(any(n.start < 0.02 for n in self.tr['Spiccato'].notes), 'el motor arranca en el c. 1')


if __name__ == '__main__':
    unittest.main()
