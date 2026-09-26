"""Act III normal battle - "Brasas y locura": the evil is close.

E minor / E phrygian with chromatic turns (F, Bb, Cm), 90 BPM, 4/4,
30 bars = 80.0 s loop (3,528,000 samples at 44.1 kHz).

The final stretch of the game: the Dragon's Lair (lava, kobolds worshipping
Ignifax) and the Beholder's Labyrinth (aberrations, madness). Heavy and
threatening, but restrained: it must leave the epic register to the final boss
(C harmonic minor, 150 BPM).

Form:
  A   (0-7)   an E pedal: celli + basses in a phrygian 8th-note ostinato
              (E-E-F-E-G-E-F-E), a low drone breathing with slow F / Bb rubs,
              distant muffled taikos, a far low bell, a closed 'ooh' male choir
              and unsettling celesta flashes (minor 2nds, tritones).
  A'  (8-15)  the harmony leaves the pedal: C Am F Bb C Am F B7. The low
              choir chants a slow line, horns enter pianissimo, violas hold a
              sul tasto pad and string harmonics hang above like a cold light.
  B   (16-23) the lament: bass descends E D C C A Bb B B (Em Dm Cm C Am Bb
              B7b9 B7). Horns take a menacing line, trombones swell under it,
              taikos grow - the peak is mezzo-forte, never a climax.
  L   (24-29) a lugubrious echo: the game's leitmotif in E MINOR, slowed down
              (dotted values), in celli doubled by a muted low horn over Em C Cm
              Am B7 Em; bells, choir hum and a faint celesta echo, then the
              pedal returns to the loop start.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402
import synth_ext as X  # noqa: E402

BPM = 90
SPB = 60.0 / BPM
BARS = 30
N_LOOP = int(round(BARS * 4 * SPB * S.SR))
N_TAIL = int(8.0 * S.SR)
OUT = os.path.join(HERE, 'cap3')
TARGET_LUFS = -14.5
R = None


def tb(bar, beat=0.0):
    return (bar * 4 + beat) * SPB


# name: (bass midi in the cello octave, pitch classes)
CHORDS = {
    'Em': (40, (4, 7, 11)), 'F/E': (40, (5, 9, 0)), 'Gm/E': (40, (7, 10, 2)),
    'C': (36, (0, 4, 7)), 'Am': (45, (9, 0, 4)), 'F': (41, (5, 9, 0)),
    'Bb': (46, (10, 2, 5)), 'B7': (47, (11, 3, 6, 9)), 'B7b9': (47, (11, 3, 9, 0)),
    'Dm': (38, (2, 5, 9)), 'Cm': (36, (0, 3, 7)), 'Am7': (45, (9, 0, 4, 7)),
}
W = lambda c: [(c, 4)]
PROG = ([W('Em'), W('F/E'), W('Em'), W('F/E'), W('Em'), W('Gm/E'), W('F/E'), W('Em')]
        + [W('C'), W('Am'), W('F'), W('Bb'), W('C'), W('Am'), W('F'), W('B7')]
        + [W('Em'), W('Dm'), W('Cm'), W('C'), W('Am'), W('Bb'), W('B7b9'), W('B7')]
        + [W('Em'), W('C'), W('Cm'), [('Am7', 3), ('B7', 1)], W('Em'), W('Em')])
assert len(PROG) == BARS


def section(bar):
    for name, end in (('a', 8), ('a2', 16), ('b', 24), ('l', 30)):
        if bar < end:
            return name


def chord_at(bar, beat=0.0):
    pos = 0.0
    for name, beats in PROG[bar]:
        if beat < pos + beats:
            return name
        pos += beats
    return PROG[bar][-1][0]


def tones(name, lo, hi):
    pcs = set(CHORDS[name][1])
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def third(name):
    """Semitones from root to third (3 minor, 4 major) - first chord tone above root."""
    root = CHORDS[name][0] % 12
    return min((pc - root) % 12 for pc in CHORDS[name][1] if (pc - root) % 12 in (3, 4))


def line(bars, start_bar):
    """bars: list of bars of (midi|None, beats). Yields (time, midi, dur_s)."""
    for i, bar in enumerate(bars):
        beat = 0.0
        for m, d in bar:
            if m is not None:
                yield tb(start_bar + i, beat), m, d * SPB
            beat += d


def dyn(bar):
    return {'a': 0.62, 'a2': 0.7, 'b': 0.72 + 0.04 * (bar - 16), 'l': 0.55}[section(bar)]


# ---------------------------------------------------------------- material

# the game leitmotif (D major: D A | B A F# | G F# E | D) in E minor, slowed to
# dotted values: (beat from bar 24, midi, beats)
LEIT = [(1.5, 52, 1.5), (3.0, 59, 3.0), (6.0, 60, 1.5), (7.5, 59, 1.5), (9.0, 55, 3.0),
        (12.0, 57, 1.5), (13.5, 55, 1.5), (15.0, 54, 3.0), (18.0, 52, 6.0)]

# A': slow chant of the low choir (top voice)
CHANT = [
    [(52, 2), (55, 2)], [(57, 3), (55, 1)], [(53, 2), (57, 2)], [(58, 3), (57, 1)],
    [(55, 2), (52, 2)], [(57, 2), (60, 2)], [(57, 2), (53, 2)], [(54, 2), (51, 2)],
]

# B: the horns' menacing line over the lament bass
B_HORN = [
    [(59, 2), (60, 1), (59, 1)], [(57, 3), (53, 1)], [(55, 1.5), (56, 0.5), (55, 2)],
    [(64, 2), (62, 1), (60, 1)], [(60, 3), (57, 1)], [(62, 2), (65, 2)],
    [(63, 2), (60, 1), (57, 1)], [(59, 4)],
]

# ostinato offsets (8ths) over the E pedal in A; variations avoid a static loop
A_OST = {0: (0, 0, 1, 0, 3, 0, 1, 0), 1: (0, 0, 1, 0, 5, 1, 0, -1),
         2: (0, 0, 1, 0, 3, 0, 1, 0), 3: (0, 0, 1, 0, 6, 5, 1, 0),
         4: (0, 0, 1, 0, 3, 0, 1, 0), 5: (0, 0, 3, 0, 6, 0, 3, 1),
         6: (0, 0, 1, 0, 5, 1, 0, -1), 7: (0, 0, 1, 3, 1, 0, -1, 0)}


# ---------------------------------------------------------------- tracks

def render_ostinato():
    """Celli: heavy detache 8ths; basses: bowed half notes an octave below."""
    rng = np.random.default_rng(301)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}

    def cello(m, acc):
        key = (m, acc)
        if key not in cache:
            cache[key] = S.strings_note(m, 0.24, 1.0, rng, voices=3, attack=0.012, release=0.16,
                                        bright=0.8 if acc else 0.6, vib=False, max_fc=4800.0)
        return cache[key]

    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        ch = chord_at(bar)
        root = CHORDS[ch][0]
        if sec == 'l':
            continue  # the celli sing the leitmotif; basses sustain (render_strings)
        if sec == 'a':
            offs = A_OST[bar]
        else:
            th = third(ch)
            offs = (0, 0, 7, 0, th, 0, 7, 12) if bar % 2 == 0 else (0, 0, 7, 0, 12, th, 7, 0)
        for i, o in enumerate(offs):
            acc = i in (0, 4)
            v = S.hvel(rng, d * (0.62 if acc else 0.4))
            if sec == 'b' and i in (3, 7):
                v *= 1.15  # push the off-beats in the lament
            tr.add(cello(root + o, acc) * v, tb(bar, i * 0.5) + S.humanize(rng, 0.002, 0.006),
                   pan=-0.2)
            # violas double the figure an octave up, softly, for definition
            tr.add(cello(root + o + 12, acc) * v * 0.32, tb(bar, i * 0.5) + S.humanize(rng, 0.002, 0.006),
                   pan=0.3)
        for half in range(2):
            ch2 = chord_at(bar, half * 2)
            m = CHORDS[ch2][0] - 12
            tr.add(S.strings_note(m, 2 * SPB * 0.92, S.hvel(rng, 0.55 * d), rng, voices=3,
                                  attack=0.03, release=0.4, bright=0.4, vib=False,
                                  max_fc=2600.0), tb(bar, half * 2) + S.humanize(rng), pan=0.1)
    return tr


def render_strings():
    """Violas' sul tasto pad (A', B, L), sustained basses in L and the celli
    leitmotif."""
    rng = np.random.default_rng(302)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(8, BARS):
        sec = section(bar)
        pos = 0.0
        for ch, beats in PROG[bar]:
            vel = {'a2': 0.2, 'b': 0.24 + 0.012 * (bar - 16), 'l': 0.15}[sec]
            for m in tones(ch, 55, 67)[:3]:
                tr.add(S.strings_note(m, beats * SPB, vel, rng, voices=4, attack=0.9,
                                      release=1.0, bright=0.42, max_fc=3600.0),
                       tb(bar, pos), pan=0.3)
            if sec == 'l':
                tr.add(S.strings_note(CHORDS[ch][0] - 12, beats * SPB, 0.4, rng, voices=3,
                                      attack=0.4, release=1.0, bright=0.28, max_fc=1500.0),
                       tb(bar, pos), pan=0.1)
            pos += beats
    # L: celli sing the leitmotif (sombre, with a slow bow)
    for beat, m, beats in LEIT:
        t = tb(24, beat)
        tr.add(S.strings_note(m, beats * SPB * 0.97, S.hvel(rng, 0.5, 0.03), rng, voices=4,
                              attack=0.18, release=0.9, bright=0.65, max_fc=4200.0),
               t + S.humanize(rng), pan=-0.25)
    return tr


def render_drone():
    """E pedal drone through the whole loop, B fifth where it fits, and slow
    dissonant rubs that swell in and out."""
    rng = np.random.default_rng(303)
    tr = S.Track(N_LOOP, N_TAIL)
    # overlapping 4-bar pedal notes; the last one wraps into the loop start
    for bar in range(0, BARS, 2):
        dur = 4 * 4 * SPB
        tr.add(X.drone(40, dur, 0.5, rng, attack=3.0, release=3.0), tb(bar) - 1.5, pan=0.0)
        if section(bar) in ('a', 'l') and bar % 4 == 0:
            tr.add(X.drone(47, dur, 0.28, rng, attack=3.5, release=3.0, fc=900.0),
                   tb(bar) - 1.5, pan=0.15)
    # dissonances: (bar, midi, bars, vel)
    for bar, m, bars, v in ((2, 41, 2, 0.26), (5, 46, 1.5, 0.2), (11, 46, 1, 0.22),
                            (17, 41, 2, 0.24), (21, 46, 1.5, 0.26), (22, 48, 1, 0.2),
                            (26, 51, 1, 0.2)):
        tr.add(X.drone(m, bars * 4 * SPB, v, rng, attack=bars * 4 * SPB * 0.6, release=2.5,
                       fc=1100.0, beat_hz=0.6), tb(bar), pan=-0.3)
    return tr


def render_choir():
    """Low male choir: closed 'ooh' pads in A and L, 'oh' chant in A' and B."""
    rng = np.random.default_rng(304)
    tr = S.Track(N_LOOP, N_TAIL)
    # A: two-bar 'ooh' pads on the pedal harmony
    for bar in range(0, 8, 2):
        for b in (bar, bar + 1):
            ch = chord_at(b)
            for m in [40 + 12] + tones(ch, 53, 60)[:1]:
                tr.add(S.choir_note(m, 4 * SPB, S.hvel(rng, 0.3, 0.04), rng, attack=1.2,
                                    release=1.6, formants=X.FORMANTS_OO), tb(b), pan=-0.1)
    # A': chant top line + a low root voice
    for t, m, d in line(CHANT, 8):
        tr.add(S.choir_note(m, d * 0.98, S.hvel(rng, 0.34, 0.04), rng, attack=0.35,
                            release=0.9, formants=S.FORMANTS_OH), t, pan=-0.15)
    for bar in range(8, 16):
        root = CHORDS[chord_at(bar)][0] + 12
        root = root - 12 if root > 52 else root
        tr.add(S.choir_note(root, 4 * SPB, S.hvel(rng, 0.3, 0.04), rng, attack=0.6, release=1.2,
                            formants=S.FORMANTS_OH), tb(bar), pan=0.1)
    # B: sustained 'oh' chords, growing
    for bar in range(16, 24):
        v = 0.26 + 0.02 * (bar - 16)
        for m in tones(chord_at(bar), 45, 57)[:3]:
            tr.add(S.choir_note(m, 4 * SPB, S.hvel(rng, v, 0.04), rng, attack=0.8, release=1.3,
                                formants=S.FORMANTS_OH), tb(bar), pan=-0.1)
    # L: humming under the leitmotif
    for bar in range(24, 30):
        pos = 0.0
        for ch, beats in PROG[bar]:
            for m in tones(ch, 47, 57)[:2]:
                tr.add(S.choir_note(m, beats * SPB, S.hvel(rng, 0.22, 0.04), rng, attack=1.0,
                                    release=1.5, formants=X.FORMANTS_OO), tb(bar, pos), pan=0.05)
            pos += beats
    return tr


def render_brass():
    """Horns pianissimo in A', the menacing line in B with trombones swelling
    beneath it, and a muted low horn doubling the leitmotif."""
    rng = np.random.default_rng(305)
    tr = S.Track(N_LOOP, N_TAIL)
    # A': soft two-note horn chords that swell and fade every bar
    for bar in range(8, 16):
        for m in tones(chord_at(bar), 50, 60)[:2]:
            tr.add(S.brass_note(m, 4 * SPB - 0.1, 0.16, rng, kind='horn', voices=3,
                                swell=2.2, release=0.9), tb(bar), pan=-0.3)
    # B: horn line
    for t, m, d in line(B_HORN, 16):
        bar = int(t / (4 * SPB))
        v = S.hvel(rng, 0.3 + 0.045 * (bar - 16), 0.04)
        tr.add(S.brass_note(m, d * 0.96, v, rng, kind='horn', voices=4, release=0.5),
               t + S.humanize(rng), pan=-0.3)
    # B: trombones sustain root + fifth, crescendo per bar
    for bar in range(18, 24):
        ch = chord_at(bar)
        root = CHORDS[ch][0]
        root = root - 12 if root > 41 else root
        for m in (root, root + 7):
            tr.add(S.brass_note(m, 4 * SPB - 0.08, 0.18 + 0.05 * (bar - 18), rng, kind='trombone',
                                voices=3, swell=2.4, release=0.6), tb(bar), pan=0.25)
    # L: muted low horn under the celli (octave doubled), very soft
    for beat, m, beats in LEIT:
        tr.add(S.brass_note(m, beats * SPB * 0.95, 0.2, rng, kind='horn', voices=3,
                            release=0.7), tb(24, beat) + S.humanize(rng), pan=-0.35)
    return tr


def render_bells():
    rng = np.random.default_rng(306)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, beat, m, v in ((0, 0.0, 52, 0.45), (4, 0.0, 52, 0.38), (6, 2.0, 53, 0.25),
                            (8, 0.0, 48, 0.4), (12, 0.0, 48, 0.35), (16, 0.0, 52, 0.45),
                            (20, 0.0, 45, 0.42), (22, 0.0, 47, 0.4), (24, 0.0, 52, 0.42),
                            (26, 0.0, 48, 0.32), (28, 0.0, 52, 0.36)):
        tr.add(X.dark_bell(m, v, rng, decay=5.0), tb(bar, beat), pan=0.35 if m > 50 else -0.25)
    return tr


def render_taiko():
    rng = np.random.default_rng(307)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        if sec == 'a':
            pat = {0.0: 0.8, 2.5: 0.35} if bar % 2 else {0.0: 0.8, 2.0: 0.45}
            if bar in (3, 7):
                pat.update({3.0: 0.4, 3.5: 0.5})
        elif sec == 'a2':
            pat = {0.0: 0.85, 1.5: 0.3, 2.0: 0.6}
            if bar in (11, 15):
                pat.update({3.0: 0.45, 3.5: 0.55})
        elif sec == 'b':
            pat = {0.0: 0.9, 1.5: 0.4, 2.0: 0.7, 3.0: 0.35, 3.5: 0.5}
            if bar == 23:
                pat = {b * 0.5: 0.35 + 0.08 * b for b in range(8)}
        else:
            pat = {24: {0.0: 0.7}, 26: {0.0: 0.5}, 28: {0.0: 0.55},
                   29: {2.0: 0.3, 3.0: 0.42, 3.5: 0.55}}.get(bar, {})
        for beat, v in pat.items():
            tr.add(X.muffled_taiko(S.hvel(rng, v * d), rng), tb(bar, beat) + S.humanize(rng),
                   pan=-0.15 if beat % 1 else 0.1)
        if bar in (0, 8, 16, 24):
            tr.add(X.muffled_taiko(0.7 if bar != 24 else 0.55, rng, size=1.3), tb(bar), pan=0.0)
    return tr


def render_glints():
    """Unsettling flashes: celesta clusters and string harmonics far above."""
    rng = np.random.default_rng(308)
    tr = S.Track(N_LOOP, N_TAIL)
    k = 0
    for bar, beat, notes, v in ((2, 2.0, (88, 89), 0.22), (6, 2.5, (83, 94), 0.2),
                                (11, 2.0, (82, 88), 0.2), (15, 2.0, (87, 88, 81), 0.2),
                                (19, 2.5, (91, 90), 0.16), (29, 0.5, (88, 95, 96, 95), 0.13)):
        for i, m in enumerate(notes):
            sig = X.lib_note('celesta', m, 0.6, v, k)
            tr.add(sig, tb(bar, beat + i * 0.5) + S.humanize(rng, 0.002), pan=0.45 - 0.2 * (i % 2))
            k += 1
    for bar, m, bars, v in ((8, 83, 4, 0.08), (12, 84, 4, 0.08), (20, 88, 2, 0.07),
                            (22, 89, 2, 0.07), (25, 83, 3, 0.05)):
        tr.add(X.harmonics(m, bars * 4 * SPB, v, rng, attack=1.5, release=2.0),
               tb(bar), pan=0.4)
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'ostinato': (render_ostinato, 0.58, 0.3, 45.0, 6500.0),
    'strings': (render_strings, 0.5, 0.5, 45.0, 6500.0),
    'drone': (render_drone, 0.17, 0.4, 45.0, 2500.0),
    'choir': (render_choir, 0.78, 0.65, 90.0, 6500.0),
    'brass': (render_brass, 0.6, 0.5, 45.0, 6000.0),
    'bells': (render_bells, 0.42, 0.9, 60.0, 4500.0),
    'taiko': (render_taiko, 0.6, 0.6, 52.0, 3500.0),
    'glints': (render_glints, 0.65, 0.85, 400.0, 7500.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}
# gentle presence shelf (linear gain above ~1.5 kHz) so the dark mix still speaks
PRESENCE = {'ostinato': 2.0, 'strings': 1.8, 'brass': 1.7, 'choir': 1.6}


def presence(x, g):
    shelf = lambda f: 1.0 + (g - 1.0) * (f ** 2 / (f ** 2 + 1500.0 ** 2))
    return S.fft_filter(x.astype(np.float64), shelf).astype(np.float32)


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    buf = S.finish_track(fn(), gain, hp, lp)
    return presence(buf, PRESENCE[name]) if name in PRESENCE else buf


def bar_report(x):
    n = int(round(4 * SPB * S.SR))
    r = [S.db(np.sqrt((x[:, i * n:(i + 1) * n] ** 2).mean())) for i in range(BARS)]
    print('   per-bar RMS: ' + ' '.join('%.0f' % v for v in r))


if __name__ == '__main__':
    print(f'Act III: {BARS} bars at {BPM} BPM = {N_LOOP / S.SR:.2f}s ({N_LOOP} samples)')
    mix = S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=3.2,
                        target_lufs=TARGET_LUFS, reverb_seed=23)
    bar_report(mix)
    os.remove(OUT + '.wav')
    with open(OUT + '.loop.txt', 'w') as fh:
        fh.write(f'{N_LOOP}\n')
