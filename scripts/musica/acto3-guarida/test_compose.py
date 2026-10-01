"""Acceptance tests for «La Guarida del Dragón» — «Tesoro maldito» (docs/musica/acto3-guarida.md,
section 8, criteria 1-14, plus the synchrony rules of section 2 and the patterns of section 6).

They read the two generated MIDI files (exploration and combat) independently of the checks that
compose.py prints. Run with:
    scripts/musica/estudio/.venv/bin/python -m unittest scripts/musica/acto3-guarida/test_compose.py
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

BPM = 84
BEAT_S = 60 / BPM
BAR_S = 3 * BEAT_S
BARS = 36
LOOP_S = BARS * BAR_S                     # 77.142857 s
E8 = BEAT_S / 2
S16 = BEAT_S / 4
S32 = BEAT_S / 8
TOL = 0.012                               # seconds: humanization (+-8 ms) plus rounding
VERSIONS = ('explora', 'combate')

VSCO = 'VSCO-2-CE/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
ID = 'VCSL/Idiophones/Struck Idiophones/'
MB = 'VCSL/Membranophones/Struck Membranophones/'
COMMON_TRACKS = {
    'Contrabassoon': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
    'Gong': ID + 'Gong 1.sfz',
    'Bell': ID + 'Tubular Bells 1.sfz',
}
BOTH = {
    **COMMON_TRACKS,
    'Cello Solo': SSO + 'Strings - Performance/Cello Solo Sustain.sfz',
    'Harp': 'VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz',
    'Choir': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Timp Roll': VSCO + 'TimpaniRolls.sfz',
    'Timpani': VSCO + 'Timpani.sfz',
    'Frame Drum': MB + 'Frame Drum.sfz',
}
EXPECTED = {
    'explora': {
        **BOTH,
        'Alto Flute': SSO + 'Woodwinds - Performance/Alto Flute Solo Sustain (looped).sfz',
        'Bass Clarinet': SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz',
        'Vibes Bowed': ID + 'Vibraphone - Bowed.sfz',
    },
    'combate': {
        **BOTH,
        'Horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
        'Choir Melody': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
        'Low Brass': SSO + 'Brass - Performance/Trombones Marcato.sfz',
        'Tuba': SSO + 'Brass - Performance/Tuba Marcato.sfz',
        'Cellos Spic': VSCO + 'CelloEnsSpic.sfz',
        'Violins Spic': VSCO + 'ViolinEnsSpic.sfz',
        'Basses Spic': VSCO + 'ContrabassSpic.sfz',
        'War Drums': MB + 'Bass Drum 2.sfz',
        'Toms': MB + 'Tom 2.sfz',
        'Snare': MB + 'Snare Drum, Rope Tension.sfz',
        'Anvil': ID + 'Anvil.sfz',
        'Shaker': ID + 'Shaker, Small.sfz',
        'Clash': ID + 'Clash Cymbals 1.sfz',
        'Cymbal': ID + 'Suspended Cymbal 2.sfz',
        'Ratchet': ID + 'Ratchet.sfz',
    },
}
UNPITCHED_NOTES = {'Gong': {61}, 'Frame Drum': {61, 63, 64}, 'War Drums': {62}, 'Toms': {60, 61, 62},
                   'Snare': {62}, 'Anvil': {60, 61}, 'Shaker': {61}, 'Clash': {60}, 'Cymbal': {63}, 'Ratchet': {60}}
UNPITCHED = set(UNPITCHED_NOTES)
CC1_TRACKS = {'Contrabassoon', 'Cello Solo', 'Alto Flute', 'Bass Clarinet', 'Choir', 'Choir Melody', 'Horns',
              'Low Brass', 'Tuba'}
RHYTHM = {'Cellos Spic', 'Harp', 'Violins Spic', 'Toms', 'Shaker', 'War Drums'}     # 16ths allowed in combat
SUSTAINED = {'Contrabassoon', 'Cello Solo', 'Alto Flute', 'Bass Clarinet', 'Choir', 'Choir Melody', 'Horns',
             'Vibes Bowed'}                                                      # no note shorter than an eighth
SECTIONS = [('intro', 1, 4), ('A', 5, 12), ("A'", 13, 20), ('B', 21, 26), ('bridge', 27, 30),
            ('return', 31, 34), ('codetta', 35, 36)]
LAYERS = {'explora': [5, 7, 8, 5, 8, 9, 5], 'combate': [15, 18, 21, 13, 21, 21, 16]}
VIB_EARLY = 0.120                          # the bowed vibraphone speaks late: written 120 ms early

S_BARS = set(range(1, 13)) | set(range(31, 37))          # «Saqueo»
D_BARS = set(range(13, 21)) | set(range(27, 31))         # «Derrumbe»
B_BARS = set(range(21, 27))
PHRASE_END = {16, 20, 30}
SNARE_BARS = {16, 20, 29, 30}

# ── harmony of section 4 (common): bar -> [(beat, bass pitch class, chord pitch classes)] ──
A, Bb, B, C, Cs, D, Eb, E, F, Fs, G, Gs = 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8
Am, BbM, E7b9, G7, Dm = {A, C, E}, {Bb, D, F}, {E, Gs, B, D, F}, {G, B, D, F}, {D, F, A}
E7s4, Bb11, C7, Gm = {E, A, B, D}, {Bb, D, F, E}, {C, E, G, Bb}, {G, Bb, D}
A7b9, A7s4, Eb11 = {A, Cs, E, G, Bb}, {A, D, E, G}, {Eb, G, Bb, A}
Fadd9, Fmaj711, Dm9, G7s4, Bbmaj7 = {F, A, C, G}, {F, A, C, E, B}, {D, F, A, C, E}, {G, C, D, F}, {Bb, D, F, A}
HARMONY = {
    1: [(1, A, Am)], 2: [(1, A, Am)], 3: [(1, Bb, BbM)], 4: [(1, E, E7b9)],
    5: [(1, A, Am)], 6: [(1, G, G7)], 7: [(1, D, Dm)], 8: [(1, E, E7b9)],
    9: [(1, A, Am)], 10: [(1, E, E7s4), (2, E, E7b9)], 11: [(1, Bb, Bb11)], 12: [(1, A, Am)],
    13: [(1, D, Dm)], 14: [(1, C, C7)], 15: [(1, G, Gm)], 16: [(1, A, A7b9)],
    17: [(1, D, Dm)], 18: [(1, A, A7s4), (2, A, A7b9)], 19: [(1, Eb, Eb11)], 20: [(1, D, Dm)],
    21: [(1, F, Fadd9)], 22: [(1, F, Fmaj711)], 23: [(1, D, Dm9)], 24: [(1, G, G7s4), (3, G, G7)],
    25: [(1, Bb, Bbmaj7)], 26: [(1, E, E7b9)],
    27: [(1, D, Dm)], 28: [(1, Bb, Bb11)], 29: [(1, E, E7s4)], 30: [(1, E, E7b9)],
    31: [(1, F, Fmaj711)], 32: [(1, E, E7s4), (2, E, E7b9)], 33: [(1, Bb, Bb11)], 34: [(1, A, Am)],
    35: [(1, Bb, Bb11)], 36: [(1, E, E7b9)],
}
BASS_MIDI = {1: 33, 2: 33, 3: 34, 4: 28, 5: 33, 6: 31, 7: 38, 8: 28, 9: 33, 10: 28, 11: 34, 12: 33,
             13: 38, 14: 36, 15: 31, 16: 33, 17: 38, 18: 33, 19: 39, 20: 38, 21: 29, 22: 29, 23: 38, 24: 31,
             25: 34, 26: 28, 27: 38, 28: 34, 29: 28, 30: 28, 31: 29, 32: 28, 33: 34, 34: 33, 35: 34, 36: 28}
PHRYG_A = [A, Bb, C, D, E, F, G]
PHRYG_D = [D, Eb, F, G, A, Bb, C]
LYD_F = [F, G, A, B, C, D, E]
SCALE = {bar: PHRYG_D if 13 <= bar <= 20 else LYD_F if 21 <= bar <= 24 else PHRYG_A for bar in range(1, 37)}
NEIGHBOUR = {1: Bb, 2: Bb, 3: C, 4: F, 5: Bb, 6: A, 7: E, 8: F, 9: Bb, 10: F, 11: C, 12: Bb,
             13: Eb, 14: D, 15: A, 16: Bb, 17: Eb, 18: Bb, 19: F, 20: Eb, 21: G, 22: G, 23: E, 24: A,
             25: C, 26: F, 27: E, 28: C, 29: F, 30: F, 31: G, 32: F, 33: C, 34: Bb, 35: C, 36: F}
ROOT = {1: A, 2: A, 3: Bb, 4: E, 5: A, 6: G, 7: D, 8: E, 9: A, 10: E, 11: Bb, 12: A, 13: D, 14: C, 15: G,
        16: A, 17: D, 18: A, 19: Eb, 20: D, 27: D, 28: Bb, 29: E, 30: E}


def segment(bar, beat):
    seg = HARMONY[bar][0]
    for s in HARMONY[bar]:
        if s[0] <= beat + 1e-9:
            seg = s
    return seg


def bass_at(bar, beat):
    return segment(bar, beat)[1]


def up_neighbour(bar, pitch):
    """The next pitch above `pitch` whose class belongs to the bar's scale (section 4)."""
    p = pitch + 1
    while p % 12 not in SCALE[bar]:
        p += 1
    return p


def fifth_of(bar, root):
    """The fifth above `root` if it is in the chord, else the chord tone nearest to it (root+3..root+9)."""
    chord = segment(bar, 1)[2]
    if (root + 7) % 12 in chord:
        return root + 7
    tones = [p for p in range(root + 3, root + 10) if p % 12 in chord]
    return min(tones, key=lambda p: (abs(p - (root + 7)), p))


def base_in(pc, low):
    """The pitch of class `pc` in the octave [low, low + 11]."""
    return low + (pc - low) % 12


# ── reference melody of section 5 (identical pitches and written attacks in both versions) ──
def line(bar, items):
    """items: [(pitch, beats)] from beat 1 of `bar` -> [(bar, beat, pitch)]."""
    out, pos = [], 0.0
    for p, beats in items:
        out.append((bar + int(pos // 3), 1 + pos % 3, p))
        pos += beats
    return out


MOTIF = [(69, 2), (67, 1), (65, 2), (64, 1), (62, 1), (64, 1), (65, 1), (64, 3),
         (72, 2), (71, 1), (69, 1), (68, 1), (65, 1), (64, 1.5), (65, .5), (62, 1), (57, 3)]
REFERENCE = {
    'motif': line(5, MOTIF),
    'seq': line(13, [(p + 5, b) for p, b in MOTIF]),
    'counter': line(13, [(65, 3), (64, 3), (62, 3), (61, 3), (62, 3), (61, 3), (55, 3), (57, 3)]),
    'inv': line(21, [(69, 3), (71, 2), (72, 1), (74, 3), (72, 2), (71, 1), (69, 3), (68, 3)]),
    'frag': line(27, [(69, 1.5), (67, 1.5), (65, 1.5), (64, 1.5), (71, 1.5), (69, 1.5), (68, 1.5), (65, 1.5)]),
    'ret': line(31, MOTIF[8:]),
    'cod': line(35, [(62, 1), (64, 1), (65, 1), (64, 3)]),
}
MELODY_LABELS = ['motif', 'seq', 'inv', 'frag', 'ret', 'cod']
# label -> (carrier track, [(declared doubling, semitones)])
CARRIERS = {
    'explora': {
        'motif': ('Cello Solo', []), 'seq': ('Alto Flute', []), 'counter': ('Bass Clarinet', []),
        'inv': ('Vibes Bowed', []), 'frag': ('Cello Solo', [('Bass Clarinet', -12)]),
        'ret': ('Cello Solo', [('Alto Flute', 0)]), 'cod': ('Bass Clarinet', []),
    },
    'combate': {
        'motif': ('Cello Solo', [('Horns', -12)]), 'seq': ('Cello Solo', [('Choir Melody', 0)]),
        'counter': ('Horns', []), 'inv': ('Horns', []), 'frag': ('Horns', []),
        'ret': ('Cello Solo', [('Horns', -12), ('Choir Melody', 0)]), 'cod': ('Cello Solo', [('Horns', -12)]),
    },
}
# Section-6 registers per track (criterion 2)
REGISTERS = {'Cello Solo': (57, 77), 'Alto Flute': (57, 77), 'Bass Clarinet': (52, 65), 'Vibes Bowed': (64, 74),
             'Harp': (28, 64), 'Contrabassoon': (28, 39), 'Choir': (43, 55), 'Choir Melody': (57, 77),
             'Horns': (45, 74), 'Low Brass': (40, 58), 'Tuba': (28, 39), 'Cellos Spic': (40, 65),
             'Violins Spic': (59, 77), 'Basses Spic': (28, 47), 'Timpani': (38, 49), 'Timp Roll': (38, 45),
             'Bell': (62, 69)}
TOP = {'explora': (80, 90), 'combate': (116, 110)}            # (velocity, CC1)
CEILINGS = {'Vibes Bowed': 64}
COUNTS = {'Gong': 3, 'Bell': 3, 'Clash': 7, 'Cymbal': 5, 'Ratchet': 3}
FORBIDDEN = ('Harmonics', 'Glockenspiel', 'Crotal', 'Tam-tam', 'Tamtam', 'Celeste')
CHOIR_VOICES = {13: (45, 50, 53), 14: (46, 52, 55), 15: (43, 46, 55), 16: (43, 46, 52), 17: (45, 48, 53),
                18: (45, 49, 55), 19: (43, 46, 51), 20: (48, 50, 53), 27: (45, 50, 53), 28: (46, 50, 52),
                29: (45, 47, 52), 30: (47, 50, 53), 31: (45, 48, 52), 32: (44, 50, 52), 33: (46, 50, 52),
                34: (48, 52, 55)}


def bar_start(bar):
    return (bar - 1) * BAR_S


def bar_of(t):
    return int((t + TOL) // BAR_S) + 1


def beat_of(t):
    """Position inside the bar in beats (1-based), rounded to the eighth."""
    return 1 + round(((t + TOL) % BAR_S - TOL) / E8) / 2


def pos16(t):
    """Position inside its bar in sixteenths (0-11)."""
    return round(((t + TOL) % BAR_S - TOL) / S16)


def written_start(track_name, n):
    """Start on the score: the bowed vibraphone's notes are played 120 ms ahead (but the one at tick 0)."""
    if track_name == 'Vibes Bowed' and n.start > 0.05:
        return n.start + VIB_EARLY
    return n.start


def notes_between(track, first_bar, last_bar):
    lo, hi = bar_start(first_bar) - TOL, bar_start(last_bar + 1) - TOL
    return sorted((n for n in track.notes if lo <= written_start(track.name, n) < hi), key=lambda n: (n.start, n.pitch))


def by_bar(track):
    out = defaultdict(list)
    for n in sorted(track.notes, key=lambda n: (n.start, n.pitch)):
        out[bar_of(written_start(track.name, n))].append(n)
    return out


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


class GuaridaScore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        out = tempfile.mkdtemp()
        cls.paths = compose.write_midis(out)
        cls.mid = {v: mido.MidiFile(cls.paths[v]) for v in VERSIONS}
        cls.song = {v: midi_io.load(cls.paths[v]) for v in VERSIONS}

    def tracks(self, v):
        return self.song[v].tracks

    def written(self, v, name, first, last):
        track = self.tracks(v)[name]
        return sorted((bar_of(written_start(name, n)), beat_of(written_start(name, n)), n.pitch)
                      for n in notes_between(track, first, last))

    # ── structure ─────────────────────────────────────────────────────────────
    def test_output_paths(self):
        for v in VERSIONS:
            self.assertEqual(os.path.basename(self.paths[v]), f'acto3-guarida-{v}.mid')
            self.assertEqual(os.path.basename(compose.OUT[v]), f'acto3-guarida-{v}.mid')
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
            self.assertEqual([(s.numerator, s.denominator) for s in sigs], [(3, 4)])
            for tr in mid.tracks:
                self.assertEqual(sum(m.time for m in tr), BARS * 3 * mid.ticks_per_beat, v)
            lengths.add((mid.ticks_per_beat, BARS * 3 * mid.ticks_per_beat))
        self.assertEqual(len(lengths), 1, 'both versions share resolution and length')
        self.assertAlmostEqual(LOOP_S * 44100, 3402000, places=3)

    def test_notes_inside_the_loop(self):
        for v in VERSIONS:
            for track in self.tracks(v).values():
                for n in track.notes:
                    self.assertGreaterEqual(n.start, 0.0)
                    self.assertLess(n.start, LOOP_S, f'{v} {track.name}')
                    self.assertLess(n.end, LOOP_S, f'{v} {track.name}')

    def test_no_overlapping_notes_of_the_same_pitch(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                last = {}
                for n in sorted(track.notes, key=lambda n: n.start):
                    if n.pitch in last:
                        self.assertLessEqual(last[n.pitch], n.start + 1e-6, f'{v} {name} {n.pitch} at {n.start:.2f}')
                    last[n.pitch] = n.end

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
                pitches = {n.pitch for n in track.notes}
                if name in UNPITCHED_NOTES:
                    self.assertLessEqual(pitches, UNPITCHED_NOTES[name], f'{v} {name}')
                    continue
                lo, hi = REGISTERS[name]
                self.assertGreaterEqual(min(pitches), lo, f'{v} {name}')
                self.assertLessEqual(max(pitches), hi, f'{v} {name}')

    # ── criterion 3 ───────────────────────────────────────────────────────────
    def test_nothing_high_is_held(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in UNPITCHED:
                    continue
                for n in track.notes:
                    if n.end - n.start >= BEAT_S - 0.05:
                        self.assertLessEqual(n.pitch, 77, f'{v} {name} holds {n.pitch} at {n.start:.2f} s')
        top = max(n.pitch for name, tr in self.tracks('combate').items() if name not in UNPITCHED
                  for n in tr.notes if n.end - n.start >= BEAT_S - 0.05)
        self.assertEqual(top, 77)

    def test_bowed_vibraphone_is_soft_and_early(self):
        vib = self.tracks('explora')['Vibes Bowed']
        for n in vib.notes:
            self.assertTrue(61 <= n.pitch <= 77, n.pitch)
            self.assertLessEqual(n.velocity, 64)
            ws = written_start('Vibes Bowed', n)
            off = abs(ws / E8 - round(ws / E8)) * E8
            self.assertLess(off, TOL, f'vibraphone note at {n.start:.3f} s is not anticipated 120 ms')
        glow = [(bar_of(written_start('Vibes Bowed', n)), n.pitch) for n in notes_between(vib, 1, 12)]
        self.assertEqual(glow, [(1, 64), (3, 65), (5, 64), (7, 65), (9, 64), (11, 65)])
        self.assertNotIn('Vibes Bowed', self.tracks('combate'))

    # ── criterion 4 and synchrony rule 2 ──────────────────────────────────────
    def test_reference_melody_in_both_versions(self):
        for label, ref in REFERENCE.items():
            first, last = ref[0][0], ref[-1][0]
            for v in VERSIONS:
                carrier, doublings = CARRIERS[v][label]
                self.assertEqual(self.written(v, carrier, first, last), sorted(ref), f'{v} {label} ({carrier})')
                for name, shift in doublings:
                    want = sorted((b, bt, p + shift) for b, bt, p in ref)
                    self.assertEqual(self.written(v, name, first, last), want, f'{v} {label} doubling {name}')

    def test_intro_has_no_melody(self):
        for v in VERSIONS:
            for name in ('Cello Solo', 'Horns', 'Alto Flute', 'Bass Clarinet', 'Choir Melody'):
                if name in self.tracks(v):
                    self.assertFalse(notes_between(self.tracks(v)[name], 1, 4), f'{v} {name}')

    # ── criterion 5 and synchrony rules 3-4 ───────────────────────────────────
    def test_common_layers_identical(self):
        raw = {v: raw_events(self.paths[v]) for v in VERSIONS}
        for name in COMMON_TRACKS:
            self.assertTrue(raw['explora'][name][0], name)
            self.assertEqual(raw['explora'][name], raw['combate'][name], name)
        self.assertTrue(any(c == 1 for _, c, _ in raw['explora']['Contrabassoon'][1]), 'Contrabassoon has CC1')

    def test_common_layer_contents(self):
        tr = self.tracks('explora')
        self.assertEqual([(bar_of(n.start), beat_of(n.start)) for n in tr['Gong'].notes], [(1, 1), (21, 1), (31, 1)])
        self.assertEqual([(bar_of(n.start), beat_of(n.start), n.pitch) for n in tr['Bell'].notes],
                         [(5, 1, 69), (13, 1, 62), (31, 1, 65)])
        cb = tr['Contrabassoon']
        for bar in range(1, BARS + 1):
            for beat, bass, _ in HARMONY[bar]:
                t = bar_start(bar) + (beat - 1) * BEAT_S + 0.04
                now = [n.pitch for n in cb.notes if n.start <= t < n.end]
                self.assertEqual(now, [BASS_MIDI[bar]], f'bar {bar} beat {beat}')

    def test_choir_sings_the_same_voices(self):
        a = self.written('explora', 'Choir', 1, 36)
        b = self.written('combate', 'Choir', 1, 36)
        self.assertEqual(a, b)
        for v in VERSIONS:
            tr = self.tracks(v)['Choir']
            for bar, voices in CHOIR_VOICES.items():
                t = bar_start(bar) + 0.05
                self.assertEqual(tuple(sorted(n.pitch for n in tr.notes if n.start <= t < n.end)), voices, f'{v} bar {bar}')
            self.assertFalse(notes_between(tr, 1, 12) + notes_between(tr, 21, 26) + notes_between(tr, 35, 36))

    # ── criterion 6 ───────────────────────────────────────────────────────────
    def test_figures(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                onsets = sorted({round(written_start(name, n), 3) for n in track.notes})
                if v == 'combate' and name == 'Snare':
                    shortest = S32
                elif v == 'combate' and name in RHYTHM:
                    shortest = S16
                else:
                    shortest = E8
                for a, b in zip(onsets, onsets[1:]):
                    self.assertGreaterEqual(b - a, shortest - 2 * TOL, f'{v} {name} at {a:.2f} s')
                if name in SUSTAINED:
                    for n in track.notes:
                        self.assertGreaterEqual(n.end - n.start, E8 - 0.06, f'{v} {name} at {n.start:.2f} s')
        snare = self.tracks('combate')['Snare']
        self.assertEqual(set(by_bar(snare)), SNARE_BARS)

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

    def test_climax_in_bar_31(self):
        checks = {
            'explora': [('Cello Solo', 'cc'), ('Alto Flute', 'cc'), ('Timpani', 'vel')],
            'combate': [('Cello Solo', 'cc'), ('Timpani', 'vel'), ('War Drums', 'vel'), ('Clash', 'vel')],
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
                self.assertEqual(bars, {31}, f'{v} {name}')
        tp = [(bar_of(n.start), n.pitch) for n in self.tracks('explora')['Timpani'].notes]
        self.assertEqual(tp, [(31, 41), (33, 46)])

    # ── criterion 10 ──────────────────────────────────────────────────────────
    def test_sonatina_cc1(self):
        for v in VERSIONS:
            for name, track in self.tracks(v).items():
                if name in CC1_TRACKS:
                    pts = track.cc.get(1)
                    self.assertTrue(pts, f'{v} {name}')
                    self.assertEqual(pts[0][0], 0.0, f'{v} {name}: CC1 at tick 0')
                    self.assertLessEqual(pts[0][0], track.notes[0].start)
                    self.assertGreater(len({val for _, val in pts}), 1, f'{v} {name}: CC1 draws the phrase')

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

    def test_note_lengths_and_rolls(self):
        for n in self.tracks('combate')['Horns'].notes:
            self.assertLessEqual(n.end - n.start, 2.8, f'Horns at {n.start:.2f} s')
        for v in VERSIONS:
            roll = self.tracks(v)['Timp Roll']
            self.assertTrue(roll.cc.get(11), v)
            self.assertEqual(roll.cc[11][0][0], 0.0)
            self.assertGreater(len({val for _, val in roll.cc[11]}), 2)
            for n in roll.notes:
                self.assertLess(n.end, bar_start(bar_of(n.start) + 1) + BAR_S + 1e-6)
        self.assertEqual(sorted(by_bar(self.tracks('explora')['Timp Roll'])), [29, 30])
        self.assertEqual(sorted(by_bar(self.tracks('combate')['Timp Roll'])), [16, 20, 29, 30])
        for n in self.tracks('explora')['Timp Roll'].notes:
            self.assertLessEqual(n.end, bar_start(31))

    # ── criterion 11: ostinatos ───────────────────────────────────────────────
    def assert_cell(self, notes, bar, low, hemiola, label):
        r = base_in(bass_at(bar, 1), low)
        q = fifth_of(bar, r)
        v = r + (NEIGHBOUR[bar] - r) % 12
        if hemiola:
            want = [r, v, r, q, up_neighbour(bar, q), q]
        else:
            want = [r, q, r + 12, v + 12, q, r + 12]
        self.assertEqual([n.pitch for n in notes], want, f'{label} bar {bar}')

    def test_exploration_harp_ostinato(self):
        harp = by_bar(self.tracks('explora')['Harp'])
        self.assertEqual(set(harp), set(range(1, 37)))
        for bar, notes in harp.items():
            pos = [round((n.start - bar_start(bar)) / E8) for n in notes]
            if bar in B_BARS:
                self.assertEqual(pos, [0, 1, 2], f'B bar {bar}')
                self.assertEqual(notes[0].pitch, base_in(bass_at(bar, 1), 28))
                continue
            self.assertEqual(pos, list(range(6)), f'bar {bar}')
            hemiola = 27 <= bar <= 30
            self.assert_cell(notes, bar, 28, hemiola, 'explora harp')
            vels = [n.velocity for n in notes]
            accents = (0, 3) if hemiola else (0,)
            self.assertGreater(min(vels[k] for k in accents),
                               max(vels[k] for k in range(6) if k not in accents), f'bar {bar}')

    def test_combat_string_ostinatos(self):
        cel = by_bar(self.tracks('combate')['Cellos Spic'])
        harp = by_bar(self.tracks('combate')['Harp'])
        self.assertEqual(set(cel), set(range(1, 37)))
        self.assertEqual(set(harp), S_BARS | B_BARS)
        for bar, notes in cel.items():
            vels = [n.velocity for n in notes]
            if bar in S_BARS:
                self.assertEqual([pos16(n.start) for n in notes], list(range(12)), f'bar {bar}')
                self.assert_cell(notes[:6], bar, 40, False, 'cellos')
                self.assert_cell(notes[6:], bar, 40, False, 'cellos')
                self.assertGreater(min(vels[0], vels[6]), max(v for k, v in enumerate(vels) if k % 6), f'bar {bar}')
            elif bar in D_BARS:
                self.assertEqual([round((n.start - bar_start(bar)) / E8) for n in notes], list(range(6)), f'bar {bar}')
                self.assert_cell(notes, bar, 40, True, 'cellos')
                self.assertGreater(min(vels[0], vels[3]), max(vels[k] for k in (1, 2, 4, 5)), f'bar {bar}')
            else:
                self.assertEqual([round((n.start - bar_start(bar)) / E8) for n in notes], list(range(6)), f'bar {bar}')
                r = base_in(bass_at(bar, 1), 40)
                self.assertEqual([n.pitch for n in notes], [r, fifth_of(bar, r)] * 3, f'B bar {bar}')
                self.assertLessEqual(max(vels) - min(vels), 8, f'B bar {bar} has accents')
        for bar, notes in harp.items():
            self.assertEqual([pos16(n.start) for n in notes], list(range(12)), f'harp bar {bar}')
            self.assert_cell(notes[:6], bar, 28, False, 'combat harp')
            self.assert_cell(notes[6:], bar, 28, False, 'combat harp')

    def test_violin_daggers(self):
        vn = by_bar(self.tracks('combate')['Violins Spic'])
        self.assertEqual(set(vn), D_BARS)
        for bar, notes in vn.items():
            self.assertEqual([pos16(n.start) for n in notes], list(range(12)), f'bar {bar}')
            R = base_in(ROOT[bar], 64)
            F_ = R - 5 if (R - 5) % 12 in segment(bar, 1)[2] else max(
                p for p in range(R - 9, R - 2) if p % 12 in segment(bar, 1)[2])
            cell = [R, up_neighbour(bar, R), R, F_, up_neighbour(bar, F_), F_]
            self.assertEqual([n.pitch for n in notes[::2]], cell, f'bar {bar}')
            self.assertEqual([n.pitch for n in notes[1::2]], cell, f'bar {bar} echo')
            for k in range(6):
                self.assertLess(notes[2 * k + 1].velocity, notes[2 * k].velocity, f'bar {bar} echo {k}')

    def test_low_brass_basses_and_tuba(self):
        tr = self.tracks('combate')
        for name in ('Low Brass', 'Basses Spic'):
            bars = by_bar(tr[name])
            self.assertEqual(set(bars), (S_BARS - {1, 2}) | D_BARS if name == 'Low Brass' else S_BARS | D_BARS, name)
            for bar, notes in bars.items():
                self.assertEqual([pos16(n.start) for n in notes], [0, 6], f'{name} bar {bar}')
                bass = BASS_MIDI[bar]
                r = base_in(bass % 12, 40)
                if bar in S_BARS:
                    want = [r, r] if name == 'Low Brass' else [bass, bass]
                else:
                    want = [r, fifth_of(bar, r)] if name == 'Low Brass' else [bass, fifth_of(bar, r) - 12]
                self.assertEqual([n.pitch for n in notes], want, f'{name} bar {bar}')
        tuba = by_bar(tr['Tuba'])
        self.assertEqual(set(tuba), (S_BARS - {1, 2}) | {13, 17, 27})
        for bar, notes in tuba.items():
            self.assertEqual([(pos16(n.start), n.pitch) for n in notes], [(0, BASS_MIDI[bar])], f'tuba bar {bar}')

    # ── criterion 12: combat percussion ───────────────────────────────────────
    def positions(self, name):
        return {bar: [pos16(n.start) for n in notes] for bar, notes in by_bar(self.tracks('combate')[name]).items()}

    def test_war_drums_and_toms(self):
        wd = self.positions('War Drums')
        for bar in range(1, 37):
            if bar in S_BARS:
                want = [0, 10, 11]
            elif bar in D_BARS:
                want = [0, 4, 8]
            else:
                want = {21: [0], 23: [0], 25: [0], 26: [10, 11]}.get(bar)
            self.assertEqual(wd.get(bar), want, f'war drums bar {bar}')
        drums = by_bar(self.tracks('combate')['War Drums'])
        for bar in S_BARS | D_BARS:
            vels = [n.velocity for n in drums[bar]]
            self.assertEqual(vels[0], max(vels), f'war drums bar {bar}: the downbeat leads')
        toms = by_bar(self.tracks('combate')['Toms'])
        self.assertEqual(set(toms), set(range(1, 37)))
        for bar, notes in toms.items():
            pos = [pos16(n.start) for n in notes]
            if bar in S_BARS:
                self.assertEqual(pos, list(range(12)), f'toms bar {bar}')
                acc = [n for n in notes if pos16(n.start) % 3 == 0]
                rest = [n for n in notes if pos16(n.start) % 3]
                self.assertEqual({n.pitch for n in acc}, {62})
                self.assertEqual({n.pitch for n in rest}, {60})
                self.assertGreater(min(n.velocity for n in acc), max(n.velocity for n in rest), f'toms bar {bar}')
            elif bar in D_BARS:
                self.assertEqual(pos, [p for p in range(12) if p % 4 != 3], f'toms bar {bar}')
                self.assertEqual([n.pitch for n in notes], [60 + p % 3 for p in pos], f'toms bar {bar}')
            else:
                self.assertEqual(pos, [0, 3, 6, 9], f'toms bar {bar}')

    def test_small_percussion(self):
        anvil = by_bar(self.tracks('combate')['Anvil'])
        self.assertEqual(set(anvil), S_BARS | D_BARS)
        for bar, notes in anvil.items():
            want = [(4, 60)] if bar in S_BARS else [(6, 61)]
            self.assertEqual([(pos16(n.start), n.pitch) for n in notes], want, f'anvil bar {bar}')
        shaker = self.positions('Shaker')
        frame = self.positions('Frame Drum')
        for bar in range(1, 37):
            self.assertEqual(shaker.get(bar), [0] if bar in D_BARS else list(range(12)), f'shaker bar {bar}')
            self.assertEqual(frame.get(bar), None if bar in D_BARS else [0, 2, 4, 6, 8, 10], f'frame bar {bar}')
        for name, lowest in (('Anvil', 85), ('Clash', 85), ('Ratchet', 85), ('Shaker', 80), ('Cymbal', 70),
                             ('Snare', 95), ('Toms', 95)):
            self.assertGreaterEqual(max(n.velocity for n in self.tracks('combate')[name].notes), lowest, name)

    def test_phrase_ends_and_cymbals(self):
        tr = self.tracks('combate')
        self.assertEqual([(bar_of(n.start), beat_of(n.start)) for n in tr['Clash'].notes],
                         [(b, 1) for b in (1, 5, 9, 13, 17, 27, 31)])
        self.assertEqual([(bar_of(n.start), beat_of(n.start)) for n in tr['Cymbal'].notes],
                         [(b, 1) for b in (4, 12, 26, 30, 36)])
        for n in tr['Cymbal'].notes:            # the swell into bar 1 stops at the loop end (its release folds over)
            self.assertGreaterEqual(n.end - n.start, BAR_S - (0.05 if bar_of(n.start) == 36 else 0),
                                    'the swell is held up to its summit')
        self.assertEqual([(bar_of(n.start), beat_of(n.start)) for n in tr['Ratchet'].notes],
                         [(b, 3) for b in sorted(PHRASE_END)])
        snare = by_bar(tr['Snare'])
        for bars in ([16], [20], [29, 30]):
            notes = [n for b in bars for n in snare[b]]
            self.assertEqual(len(notes), 24 * len(bars), bars)
            vels = [n.velocity for n in notes]
            self.assertGreater(vels[-1] - vels[0], 30, f'snare roll {bars} swells')
            self.assertGreaterEqual(min(b - a for a, b in zip(vels, vels[1:])), -4, f'snare roll {bars} only grows')
        tp = by_bar(tr['Timpani'])
        for bar in range(1, 37):
            notes = tp.get(bar, [])
            if bar in PHRASE_END or bar == 29:
                self.assertFalse(notes, f'timpani bar {bar}: the roll plays')
                continue
            self.assertEqual([pos16(n.start) for n in notes], [0, 6] if bar in D_BARS else [0], f'timpani bar {bar}')
            self.assertEqual(notes[0].pitch % 12, bass_at(bar, 1), f'timpani bar {bar}')

    def test_counts_and_forbidden_colours(self):
        for v in VERSIONS:
            for name, count in COUNTS.items():
                if name not in EXPECTED[v]:
                    continue
                onsets = {round(n.start, 2) for n in self.tracks(v)[name].notes}
                self.assertEqual(len(onsets), count, f'{v} {name}')
            for rel in EXPECTED[v].values():
                for word in FORBIDDEN:
                    self.assertNotIn(word, rel)

    def test_exploration_breath_in_b(self):
        tr = self.tracks('explora')
        self.assertEqual([(bar_of(n.start), pos16(n.start)) for n in notes_between(tr['Frame Drum'], 21, 26)],
                         [(21, 0), (23, 0), (25, 0)])
        for name in ('Cello Solo', 'Choir', 'Alto Flute', 'Bass Clarinet'):
            self.assertFalse(notes_between(tr[name], 21, 26), name)

    # ── criterion 13 ──────────────────────────────────────────────────────────
    def test_lowest_note_at_each_chord_is_the_bass(self):
        for v in VERSIONS:
            for bar in range(1, BARS + 1):
                for beat, bass, _ in HARMONY[bar]:
                    t = bar_start(bar) + (beat - 1) * BEAT_S + 0.04
                    sounding = [n.pitch for name, tr in self.tracks(v).items() if name not in UNPITCHED
                                for n in tr.notes if n.start <= t < n.end]
                    self.assertTrue(sounding, f'{v} bar {bar} beat {beat}: silence')
                    self.assertEqual(min(sounding) % 12, bass, f'{v} bar {bar} beat {beat}: lowest {min(sounding)}')

    # ── criterion 14: craft ───────────────────────────────────────────────────
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
                    grid = abs(ws / S32 - round(ws / S32)) * S32
                    self.assertLessEqual(grid, 0.0095, f'{v} {name} at {n.start:.3f} s: more than 8 ms off')

    def test_legato_overlaps(self):
        for v in VERSIONS:
            for label in REFERENCE:
                ref = REFERENCE[label]
                first, last = ref[0][0], ref[-1][0]
                lead = CARRIERS[v][label][0]
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
        sustained = {'explora': ['Cello Solo', 'Alto Flute', 'Bass Clarinet', 'Vibes Bowed', 'Choir', 'Contrabassoon'],
                     'combate': ['Cello Solo', 'Choir Melody', 'Horns', 'Choir', 'Contrabassoon']}
        doubled = {'explora': [('Cello Solo', 'Alto Flute', 31, 34), ('Cello Solo', 'Bass Clarinet', 27, 30)],
                   'combate': [('Cello Solo', 'Horns', 5, 12), ('Cello Solo', 'Horns', 31, 36),
                               ('Cello Solo', 'Choir Melody', 13, 20), ('Cello Solo', 'Choir Melody', 31, 34),
                               ('Horns', 'Choir Melody', 31, 34)]}
        for v in VERSIONS:
            grid = {name: [(round(written_start(name, n) / E8), round(n.end / E8), n.pitch)
                           for n in self.tracks(v)[name].notes] for name in sustained[v]}

            def at(name, q):
                return sorted({p for s, e, p in grid[name] if s <= q < e})

            def leaving(name, q1, q2):
                return sorted({p for s, e, p in grid[name] if s <= q1 < e and e >= q2 - 1})

            def bass_pc(q):
                bar, pos = q // 6 + 1, (q % 6) / 2 + 1
                return bass_at(bar, pos) if bar <= BARS else None

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
                    bar = q1 // 6 + 1
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
        melodic = ('Cello Solo', 'Alto Flute', 'Bass Clarinet', 'Vibes Bowed', 'Horns', 'Choir', 'Choir Melody')
        for v in VERSIONS:
            for name in melodic:
                track = self.tracks(v).get(name)
                if track is None:
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
        for v in VERSIONS:
            cb = self.tracks(v)['Contrabassoon']
            self.assertEqual(notes_between(cb, 36, 36)[0].pitch % 12, E, f'{v}: bar 36 on E')
            self.assertEqual(notes_between(cb, 1, 1)[0].pitch % 12, A, f'{v}: bar 1 on A')
        tr = self.tracks('combate')['Cellos Spic']
        v36 = [n.velocity for n in notes_between(tr, 36, 36)]
        v1 = [n.velocity for n in notes_between(tr, 1, 1)]
        self.assertEqual(notes_between(tr, 36, 36)[0].pitch % 12, E)
        self.assertEqual(notes_between(tr, 1, 1)[0].pitch % 12, A)
        self.assertLessEqual(abs(sum(v36) / len(v36) - sum(v1) / len(v1)), 4)

    def test_section_soloists(self):
        """Each section has its own colour in exploration; combat alternates cello and horns."""
        ex = {CARRIERS['explora'][label][0] for label in MELODY_LABELS}
        self.assertEqual(ex, {'Cello Solo', 'Alto Flute', 'Vibes Bowed', 'Bass Clarinet'})
        cb = {CARRIERS['combate'][label][0] for label in MELODY_LABELS}
        self.assertEqual(cb, {'Cello Solo', 'Horns'})


if __name__ == '__main__':
    unittest.main()
