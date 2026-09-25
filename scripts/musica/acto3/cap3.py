"""Act III normal battle - "Lava y cristal": heroic adventure full of wonder.

D lydian / D major with turns to B minor, 120 BPM, 4/4, 36 bars = 72.0 s loop.
Form:
  A    (0-7)   horns present the main theme over a light galloping string ostinato,
               harp sweeps, flute answers.
  A'   (8-15)  violins + flute take the theme, horns sing a counter-line, piccolo
               sparkles, tambourine joins; it turns towards F# (dominant of Bm).
  B    (16-23) arcane crystal caverns in B minor: pizzicato, celesta and harp
               arpeggios, flute melody, horns rising; timpani roll + cymbal swell.
  C    (24-31) climax: the game leitmotif proudly in horns (octave doubled, violins
               above), the second time rising to D5; soft cymbals, timpani.
  turn (32-35) lighter: horn echo of the theme head, harp glissando back to A.
Instruments: section strings (synth), horns (synth), flute, piccolo, harp,
pizzicato, celesta, glockenspiel (synth_lib / synth_ext), timpani, frame drum,
tambourine and soft cymbals.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402
import synth_lib as L  # noqa: E402
import synth_ext as X  # noqa: E402

BPM = 120
SPB = 60.0 / BPM
BARS = 36
N_LOOP = int(round(BARS * 4 * SPB * S.SR))
N_TAIL = int(4.0 * S.SR)
OUT = os.path.join(HERE, 'cap3')
R = None


def tb(bar, beat=0.0):
    return (bar * 4 + beat) * SPB


# name: (bass midi, pitch classes)
CHORDS = {
    'D': (38, (2, 6, 9)), 'E/D': (38, (4, 8, 11)), 'Bm': (35, (11, 2, 6)),
    'G': (43, (7, 11, 2)), 'Em': (40, (4, 7, 11, 2)), 'A': (45, (9, 1, 4)),
    'F#': (42, (6, 10, 1)), 'A/C#': (37, (9, 1, 4)), 'D/F#': (42, (2, 6, 9)),
    'Asus': (45, (9, 2, 4)), 'A7': (45, (9, 1, 4, 7)),
}
# each bar: list of (chord, beats)
W = lambda c: [(c, 4)]
H = lambda a, b: [(a, 2), (b, 2)]
PROG = ([W('D'), W('E/D'), W('D'), W('E/D'), W('Bm'), W('G'), W('Em'), W('A')]
        + [W('D'), W('E/D'), W('D'), W('E/D'), W('Bm'), W('G'), H('G', 'F#'), W('F#')]
        + [W('Bm'), W('G'), W('D'), W('A'), W('Bm'), W('G'), W('Em'), W('A')]
        + [W('D'), W('Bm'), H('Em', 'A'), W('D'), H('D', 'A/C#'), W('Bm'), H('G', 'A'), W('D')]
        + [W('G'), W('D/F#'), W('Em'), H('Asus', 'A7')])
assert len(PROG) == BARS


def section(bar):
    for name, end in (('a', 8), ('a2', 16), ('b', 24), ('c', 32), ('turn', 36)):
        if bar < end:
            return name


def chord_at(bar, beat):
    pos = 0.0
    for name, beats in PROG[bar]:
        if beat < pos + beats:
            return name
        pos += beats
    return PROG[bar][-1][0]


def tones(name, lo, hi):
    pcs = set(CHORDS[name][1])
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def line(bars, start_bar):
    """bars: list of bars of (midi|None, beats). Yields (time, midi, dur_s)."""
    for i, bar in enumerate(bars):
        beat = 0.0
        for m, d in bar:
            if m is not None:
                yield tb(start_bar + i, beat), m, d * SPB
            beat += d


# ---------------------------------------------------------------- material
THEME = [  # main theme, horn register (D lydian: G# on the E/D bars)
    [(57, 1.5), (62, 0.5), (66, 1), (69, 1)],
    [(68, 1.5), (66, 0.5), (64, 2)],
    [(66, 1), (69, 1), (74, 1.5), (73, 0.5)],
    [(71, 2), (68, 1), (64, 1)],
    [(66, 1.5), (71, 0.5), (74, 1), (73, 1)],
    [(71, 1.5), (67, 0.5), (74, 2)],
    [(73, 1), (71, 1), (67, 1), (64, 1)],
    [(69, 3), (R, 1)],
]
THEME2 = [list(b) for b in THEME]  # A': violins + flute, new cadence to F#
THEME2[3] = [(71, 1), (73, 0.5), (74, 0.5), (76, 1), (68, 1)]
THEME2[5] = [(71, 1.5), (74, 0.5), (79, 2)]
THEME2[6] = [(71, 1), (74, 1), (73, 1), (70, 1)]
THEME2[7] = [(73, 2), (70, 1), (66, 1)]

HORN_COUNTER = [  # A': sustained counter-line under the violins
    [(57, 4)], [(59, 4)], [(57, 2), (62, 2)], [(59, 2), (56, 2)],
    [(54, 4)], [(55, 2), (59, 2)], [(55, 2), (58, 2)], [(61, 4)],
]

B_FLUTE = [
    [(78, 2), (74, 1), (71, 1)],
    [(79, 2), (78, 1), (74, 1)],
    [(81, 1.5), (78, 0.5), (74, 2)],
    [(76, 1), (78, 1), (76, 1), (73, 1)],
    [(74, 2), (78, 1), (83, 1)],
    [(81, 1.5), (79, 0.5), (74, 2)],
    [(76, 1), (79, 1), (83, 1), (81, 0.5), (79, 0.5)],
    [(81, 2), (R, 2)],
]

# the game leitmotif (D major), proudly in the horns; second time rises to D5
LEIT1 = [[(R, 1), (62, 1), (69, 2)], [(71, 1), (69, 1), (66, 2)],
         [(67, 1), (66, 1), (64, 2)], [(62, 4)]]
LEIT2 = [[(R, 1), (62, 1), (69, 2)], [(71, 1), (69, 1), (66, 2)],
         [(67, 1), (69, 1), (71, 1), (73, 1)], [(74, 4)]]

TURN_HORN = [[(57, 1.5), (62, 0.5), (66, 2)], [(69, 1.5), (66, 0.5), (62, 2)],
             [(64, 1.5), (67, 0.5), (71, 2)], [(69, 4)]]

# flute / piccolo adornments: (bar, beat, inst, [(midi, beats), ...])
ORNAMENTS = [
    (3, 2.0, 'flute', [(80, 0.25), (81, 0.25), (83, 0.5), (88, 1)]),
    (7, 3.0, 'flute', [(81, 0.25), (83, 0.25), (85, 0.25), (86, 0.25)]),
    (11, 2.5, 'piccolo', [(92, 0.25), (93, 0.25), (95, 0.5), (92, 0.5)]),
    (15, 2.0, 'piccolo', [(90, 0.25), (94, 0.25), (97, 0.25), (94, 0.25), (97, 1)]),
    (24, 0.0, 'piccolo', [(98, 0.5)]),
    (25, 3.0, 'flute', [(81, 0.25), (83, 0.25), (85, 0.25), (86, 0.25)]),
    (26, 3.0, 'piccolo', [(92, 0.25), (93, 0.25), (95, 0.25), (97, 0.25)]),
    (27, 1.0, 'flute', [(81, 0.25), (83, 0.25), (85, 0.25), (86, 0.25), (88, 0.5), (86, 0.5),
                        (85, 0.5), (81, 0.5)]),
    (28, 0.0, 'piccolo', [(98, 0.5)]),
    (29, 3.0, 'flute', [(83, 0.25), (85, 0.25), (86, 0.25), (88, 0.25)]),
    (31, 1.0, 'piccolo', [(93, 0.25), (95, 0.25), (97, 0.25), (98, 0.25), (97, 0.5),
                          (93, 0.5), (90, 1)]),
    (31, 1.0, 'flute', [(81, 0.25), (83, 0.25), (85, 0.25), (86, 0.25), (85, 0.5),
                        (81, 0.5), (78, 1)]),
    (33, 2.0, 'flute', [(78, 0.5), (81, 0.5), (86, 1)]),
    (35, 0.0, 'flute', [(81, 0.25), (79, 0.25), (78, 0.25), (76, 0.25), (73, 1)]),
]


def dyn(bar):
    return {'a': 0.75, 'a2': 0.82, 'b': 0.62 + 0.035 * (bar - 16), 'c': 1.0,
            'turn': 0.72 + 0.04 * (bar - 32)}[section(bar)]


class NoteCache:
    """Caches rendered notes of the Act I instruments (seed varies by 3)."""

    def __init__(self):
        self.c = {}

    def get(self, inst, midi, dur, seed):
        key = (inst, midi, round(dur, 3), seed % 3)
        if key not in self.c:
            self.c[key] = X.lib_note(inst, midi, dur, 1.0, seed % 3 + midi)
        return self.c[key]


# ---------------------------------------------------------------- tracks

def render_horns():
    rng = np.random.default_rng(31)
    tr = S.Track(N_LOOP, N_TAIL)

    def play(notes, start, vel, pan=-0.25, voices=4, octave_down=0.0, legato=0.95):
        for t, m, d in line(notes, start):
            v = S.hvel(rng, vel)
            tr.add(S.brass_note(m, d * legato, v, rng, kind='horn', voices=voices),
                   t + S.humanize(rng), pan=pan)
            if octave_down:
                tr.add(S.brass_note(m - 12, d * legato, v * octave_down, rng, kind='horn',
                                    voices=3), t + S.humanize(rng), pan=pan + 0.35)

    play(THEME, 0, 0.72)
    play(HORN_COUNTER, 8, 0.42, pan=-0.35, voices=3, legato=0.98)
    # B: soft low chord tones, rising and swelling towards the climax
    for bar in range(16, 24):
        ch = chord_at(bar, 0)
        vel = 0.18 + 0.045 * (bar - 16)
        for m in tones(ch, 53, 64)[:2]:
            tr.add(S.brass_note(m, 4 * SPB - 0.05, vel, rng, kind='horn', voices=3,
                                swell=1.5 if bar < 23 else 1.9), tb(bar), pan=-0.3)
    play(LEIT1, 24, 0.82, octave_down=0.5)
    play(LEIT2, 28, 0.88, octave_down=0.5)
    play(TURN_HORN, 32, 0.5, pan=-0.3, voices=3)
    return tr


def render_ostinato():
    """Light galloping 8th-16th-16th figure in violas + celli eighths."""
    rng = np.random.default_rng(32)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}

    def note(m, acc):
        key = (m, acc)
        if key not in cache:
            cache[key] = S.strings_note(m, 0.1, 1.0, rng, voices=3, attack=0.006, release=0.12,
                                        bright=0.8 if acc else 0.55, vib=False, max_fc=4500.0)
        return cache[key]

    for bar in range(BARS):
        sec = section(bar)
        if sec == 'b':
            continue  # pizzicato takes over
        d = dyn(bar)
        for beat in range(4):
            ch = chord_at(bar, beat)
            tt = tones(ch, 57, 74)
            idx = (beat * 2 + bar) % max(len(tt) - 2, 1)
            figure = ((0.0, tt[idx], True), (0.5, tt[idx + 1], False), (0.75, tt[idx + 2], False))
            for off, m, acc in figure:
                v = S.hvel(rng, d * (0.62 if acc else 0.4))
                tr.add(note(m, acc) * v, tb(bar, beat + off) + S.humanize(rng, 0.002, 0.006),
                       pan=0.3)
            # celli: root eighths, octave hop on the off-beat
            root = CHORDS[ch][0] + 12
            for off, m, v in ((0.0, root, 0.55), (0.5, root + 12, 0.35)):
                tr.add(note(m, True) * S.hvel(rng, d * v),
                       tb(bar, beat + off) + S.humanize(rng, 0.002, 0.006), pan=-0.15)
    return tr


def render_strings():
    """Basses, violins (theme in A', high chords in C) and the B pad."""
    rng = np.random.default_rng(33)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        pos = 0.0
        for ch, beats in PROG[bar]:
            bass = CHORDS[ch][0]
            vel = 0.45 * dyn(bar)
            tr.add(S.strings_note(bass, beats * SPB - 0.05, vel, rng, voices=3, attack=0.06,
                                  release=0.35, bright=0.5), tb(bar, pos), pan=0.0)
            if sec == 'b':
                for m in tones(ch, 62, 74)[:3]:
                    tr.add(S.strings_note(m, beats * SPB, 0.2, rng, voices=4, attack=0.5,
                                          release=0.8, bright=0.45), tb(bar, pos), pan=0.2)
            if sec == 'c':
                for m in tones(ch, 74, 86)[:3]:
                    tr.add(S.strings_note(m, beats * SPB, 0.17, rng, voices=4, attack=0.25,
                                          release=0.6, bright=0.5, tremolo=15.0), tb(bar, pos),
                           pan=0.4)
            pos += beats
    # A': violins sing the theme an octave up (octave below softly)
    for t, m, d in line(THEME2, 8):
        v = S.hvel(rng, 0.52)
        tr.add(S.strings_note(m + 12, d, v, rng, voices=5, attack=0.1, release=0.4, bright=0.7),
               t + S.humanize(rng), pan=-0.35)
        tr.add(S.strings_note(m, d, v * 0.5, rng, voices=4, attack=0.1, release=0.4, bright=0.6),
               t + S.humanize(rng), pan=0.25)
    # C: violins double the leitmotif an octave up, softly
    for notes, start in ((LEIT1, 24), (LEIT2, 28)):
        for t, m, d in line(notes, start):
            tr.add(S.strings_note(m + 12, d, S.hvel(rng, 0.34), rng, voices=5, attack=0.1,
                                  release=0.45, bright=0.6), t + S.humanize(rng), pan=-0.35)
    return tr


def render_woodwinds():
    rng = np.random.default_rng(34)
    cache = NoteCache()
    tr = S.Track(N_LOOP, N_TAIL)
    k = 0
    # A': flute doubles the violins at the octave (same pitch as violins)
    for t, m, d in line(THEME2, 8):
        tr.add(cache.get('flute', m + 12, d * 0.95, k) * S.hvel(rng, 0.26), t + S.humanize(rng),
               pan=-0.15)
        k += 1
    # B: flute melody
    for t, m, d in line(B_FLUTE, 16):
        tr.add(cache.get('flute', m, d * 0.95, k) * S.hvel(rng, 0.36), t + S.humanize(rng),
               pan=-0.15)
        k += 1
    for bar, beat, inst, notes in ORNAMENTS:
        for t, m, d in line([[(R, beat)] + notes], bar):
            vel = 0.4 if inst == 'flute' else 0.3
            tr.add(cache.get(inst, m, d * 0.9, k) * S.hvel(rng, vel), t + S.humanize(rng, 0.002),
                   pan=-0.1 if inst == 'flute' else 0.2)
            k += 1
    return tr


def render_harp():
    rng = np.random.default_rng(35)
    cache = NoteCache()
    tr = S.Track(N_LOOP, N_TAIL)
    k = 0
    for bar in range(BARS):
        sec = section(bar)
        if sec == 'b':
            # rolled 16th arpeggios, up and down, per half bar
            for half in range(2):
                tt = tones(chord_at(bar, half * 2), 59, 83)[:8]
                seq = tt + tt[-2:0:-1]
                for i in range(8):
                    m = seq[i % len(seq)]
                    tr.add(cache.get('harp', m, 0.5, k) * S.hvel(rng, 0.26),
                           tb(bar, half * 2 + i * 0.25) + S.humanize(rng, 0.002), pan=0.45)
                    k += 1
        elif sec in ('a', 'a2', 'turn'):
            tt = tones(chord_at(bar, 0), 50, 79)
            step = max(1, len(tt) // 6)
            up = tt[::step][:6]
            for i, m in enumerate(up):
                tr.add(cache.get('harp', m, 1.0, k) * S.hvel(rng, 0.3 - 0.02 * i),
                       tb(bar, i * 0.5) + S.humanize(rng, 0.002), pan=0.45)
                k += 1
        else:  # climax: rolled chord on each chord change
            pos = 0.0
            for ch, beats in PROG[bar]:
                for i, m in enumerate(tones(ch, 50, 81)[::2]):
                    tr.add(cache.get('harp', m, 1.0, k) * S.hvel(rng, 0.3),
                           tb(bar, pos) + i * 0.022, pan=0.45)
                    k += 1
                pos += beats
    # glissando back into the loop start (D lydian scale, bar 35 beats 2-4)
    scale = [m for m in range(62, 91) if m % 12 in (2, 4, 6, 8, 9, 11, 1)]
    for i, m in enumerate(scale):
        tr.add(cache.get('harp', m, 0.6, k + i) * (0.14 + 0.16 * i / len(scale)),
               tb(35, 2.0) + i * (2 * SPB / len(scale)), pan=0.4)
    return tr


def render_arcane():
    """Celesta, pizzicato and glockenspiel: the crystal colour."""
    rng = np.random.default_rng(36)
    cache = NoteCache()
    tr = S.Track(N_LOOP, N_TAIL)
    k = 0
    for bar in range(16, 24):
        ch = chord_at(bar, 0)
        tt = tones(ch, 74, 88)[:5]
        seq = tt + tt[-2:0:-1]
        for i in range(8):
            m = seq[(i + bar) % len(seq)]
            tr.add(cache.get('celesta', m, 0.4, k) * S.hvel(rng, 0.3), tb(bar, i * 0.5)
                   + S.humanize(rng, 0.003), pan=0.3)
            k += 1
        # pizzicato: root / fifth eighths (tiptoe bass line)
        root = CHORDS[ch][0] + 12
        for i, off in enumerate((0, 7, 12, 7, 0, 7, 12, 7)):
            tr.add(cache.get('pizz', root + off, SPB * 0.5, k) * S.hvel(rng, 0.55 if i % 4 == 0
                                                                       else 0.38),
                   tb(bar, i * 0.5) + S.humanize(rng), pan=-0.2)
            k += 1
    # celesta sprinkles in A' and the turnaround, glockenspiel winks at the climax
    for bar, beat, inst, notes in (
            (9, 2.0, 'celesta', [80, 83, 88]), (13, 2.0, 'celesta', [83, 86, 91]),
            (32, 2.0, 'celesta', [83, 86, 91]), (34, 2.0, 'celesta', [83, 86, 88]),
            (27, 2.0, 'glock', [86, 90, 93]), (31, 2.0, 'glock', [90, 93, 98]),
            (5, 2.5, 'celesta', [86, 91])):
        for i, m in enumerate(notes):
            tr.add(cache.get(inst, m, 0.5, k) * (0.28 if inst == 'celesta' else 0.2),
                   tb(bar, beat + i * 0.5), pan=0.35)
            k += 1
    return tr


def render_timpani():
    rng = np.random.default_rng(37)
    tr = S.Track(N_LOOP, N_TAIL)
    D2, A1 = 38, 33
    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        ch = chord_at(bar, 0)
        pitch = D2 if CHORDS[ch][0] % 12 in (2, 7, 11) else A1
        if sec in ('a', 'a2'):
            hits = ((0.0, 0.55),) if sec == 'a' else ((0.0, 0.6), (2.5, 0.35), (3.0, 0.4))
        elif sec == 'b':
            hits = ((0.0, 0.35),) if bar < 23 else ()
        elif sec == 'c':
            hits = ((0.0, 0.8), (2.0, 0.5), (3.5, 0.4))
        else:
            hits = ((0.0, 0.5),) if bar < 35 else ()
        for beat, v in hits:
            p = pitch if beat == 0.0 else (A1 if pitch == D2 else D2)
            tr.add(X.timpani(p, S.hvel(rng, v * d), rng), tb(bar, beat) + S.humanize(rng), pan=-0.1)
    # rolls into the climax and back into the loop start
    for bar, beats, v0, v1, pitch in ((23, 4, 0.12, 0.75, 33), (35, 2, 0.1, 0.45, 33),
                                      (15, 1, 0.15, 0.5, 42 - 12)):
        start = tb(bar, 4 - beats)
        for off, sig in X.timpani_roll(pitch, beats, SPB, v0, v1, rng):
            tr.add(sig, start + off, pan=-0.1)
    return tr


def render_perc():
    """Frame drum and tambourine."""
    rng = np.random.default_rng(38)
    tr = S.Track(N_LOOP, N_TAIL)
    k = 0
    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        if sec == 'b':
            pattern = {0.0: 0.4, 2.0: 0.3} if bar < 22 else {0.0: 0.45, 1.5: 0.3, 2.0: 0.4,
                                                             3.0: 0.4, 3.5: 0.45}
        elif sec == 'c':
            pattern = {0.0: 0.7, 0.75: 0.3, 1.5: 0.45, 2.0: 0.6, 2.75: 0.3, 3.5: 0.45}
        else:
            pattern = {0.0: 0.6, 1.5: 0.35, 2.0: 0.5, 3.5: 0.3}
        for beat, v in pattern.items():
            low = beat in (0.0, 2.0)
            sig = L.frame_drum(S.hvel(rng, v * d), k % 8, 80.0 if low else 120.0)
            tr.add(sig, tb(bar, beat) + S.humanize(rng), pan=0.1)
            k += 1
        if sec in ('a2', 'c'):
            for beat in (1.0, 3.0):
                tr.add(L.tambourine(S.hvel(rng, 0.2 * d), k % 16, long=(beat == 3.0 and bar % 4 == 3)),
                       tb(bar, beat) + S.humanize(rng), pan=0.35)
                k += 1
        if sec == 'turn':
            for beat in (1.0, 3.0):
                tr.add(L.shaker(S.hvel(rng, 0.14), k % 12), tb(bar, beat), pan=0.35)
                k += 1
    return tr


def render_cymbals():
    rng = np.random.default_rng(39)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, v in ((24, 0.42), (28, 0.36), (16, 0.16), (8, 0.18)):
        crash = S.fft_filter(S.cymbal(rng, decay=1.8, vel=v), lambda f: S.lp_mag(f, 7000.0, 2))
        tr.add(crash, tb(bar))
    for bar, beats, v in ((23, 4, 0.4), (35, 2, 0.2)):
        sw = beats * SPB
        tr.add(X.cymbal_roll(rng, sw, v), tb(bar + 1) - sw)
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'horns': (render_horns, 0.55, 0.45, 70.0, 4500.0),
    'ostinato': (render_ostinato, 0.55, 0.25, 70.0, 5500.0),
    'strings': (render_strings, 0.6, 0.45, 35.0, 6500.0),
    'woodwinds': (render_woodwinds, 0.85, 0.4, 250.0, 7500.0),
    'harp': (render_harp, 1.2, 0.45, 90.0, 7000.0),
    'arcane': (render_arcane, 1.1, 0.55, 150.0, 7500.0),
    'timpani': (render_timpani, 0.6, 0.3, 30.0, 4000.0),
    'perc': (render_perc, 0.7, 0.25, 50.0, 8000.0),
    'cymbals': (render_cymbals, 0.9, 0.45, 300.0, 8500.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    return S.finish_track(fn(), gain, hp, lp)


def bar_report(x):
    n = int(4 * SPB * S.SR)
    r = [S.db(np.sqrt((x[:, i * n:(i + 1) * n] ** 2).mean())) for i in range(BARS)]
    print('   per-bar RMS: ' + ' '.join('%.0f' % v for v in r))


if __name__ == '__main__':
    print(f'Act III: {BARS} bars at {BPM} BPM = {N_LOOP / S.SR:.2f}s ({N_LOOP} samples)')
    mix = S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=2.2)
    bar_report(mix)
    os.remove(OUT + '.wav')
    with open(OUT + '.loop.txt', 'w') as fh:
        fh.write(f'{N_LOOP}\n')
