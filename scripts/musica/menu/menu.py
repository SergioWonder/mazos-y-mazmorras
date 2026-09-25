"""Title theme - "La puerta del juego": animated-fantasy overture in D major, 96 BPM.

30 bars of 4/4 = 75.0 s, seamless loop. Light orchestra: strings, soft horns, flute,
harp, celesta, timpani and a whisper of suspended cymbal.

The game's leitmotif is the heart of the piece:
    D4 (q) A4 (h) | B4 (q) A4 (q) F#4 (h) | G4 (q) F#4 (q) E4 (h) | D4 (w)

Form:
  intro   0-3   mysterious: harp arpeggios, celesta whispers the motif over Bm9-Gmaj7-Em9-Asus
  A1      4-7   flute states the leitmotif (8va) over pizzicato bass
  A2      8-11  violins answer (rising mirror of the motif), half cadence on A
  A3     12-15  soft horns restate it, reharmonised (Gmaj7), flute descant, timpani
  dev    16-23  motif head sequenced violins/flute through G lydian, Em, A, F#m, Bm...
                building with horns and a timpani roll
  return 24-27  tutti: horns at pitch, violins + flute an octave up
  codetta 28-29 echoes fade over Gmaj7 - Asus, falling back into the Bm9 intro
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402

BPM = 96
SPB = 60.0 / BPM
BARS = 30
N_LOOP = int(round(BARS * 4 * SPB * S.SR))
N_TAIL = int(4.0 * S.SR)
OUT = os.path.join(HERE, 'menu')
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m(name):
    if name is None or isinstance(name, (int, np.integer)):
        return name
    acc = name.count('#') - name.count('b')
    return 12 * (int(name[-1]) + 1) + NAMES[name[0]] + acc


def tb(bar, beat=0.0):
    return (bar * 4 + beat) * SPB


# name: (bass pitch class, intervals above the root)
CHORDS = {
    'D': (2, (0, 4, 7)), 'Bm': (11, (0, 3, 7)), 'Bm9': (11, (0, 3, 7, 14)),
    'G': (7, (0, 4, 7)), 'Gmaj7': (7, (0, 4, 7, 11)), 'Glyd': (7, (0, 4, 7, 11, 18)),
    'Em': (4, (0, 3, 7)), 'Em7': (4, (0, 3, 7, 10)), 'Em9': (4, (0, 3, 7, 10, 14)),
    'A': (9, (0, 4, 7)), 'A7': (9, (0, 4, 7, 10)), 'Asus': (9, (0, 5, 7, 10)),
    'F#m': (6, (0, 3, 7)), 'F#m7': (6, (0, 3, 7, 10)),
}
# per bar: list of (beat, chord)
PROG = [
    [(0, 'Bm9')], [(0, 'Gmaj7')], [(0, 'Em9')], [(0, 'Asus'), (2, 'A7')],        # intro
    [(0, 'D')], [(0, 'Bm')], [(0, 'Em7'), (2, 'A7')], [(0, 'D')],                  # A1
    [(0, 'G')], [(0, 'F#m7')], [(0, 'Em7'), (2, 'A7')], [(0, 'Asus'), (2, 'A')],   # A2
    [(0, 'D')], [(0, 'Gmaj7')], [(0, 'Em7'), (2, 'A7')], [(0, 'D')],               # A3
    [(0, 'Glyd')], [(0, 'Em')], [(0, 'A')], [(0, 'F#m')],                          # dev
    [(0, 'Bm')], [(0, 'Gmaj7')], [(0, 'Em7')], [(0, 'Asus'), (2, 'A7')],
    [(0, 'D')], [(0, 'Bm')], [(0, 'Em7'), (2, 'A7')], [(0, 'D')],                  # return
    [(0, 'Gmaj7')], [(0, 'Asus'), (2, 'A')],                                       # codetta
]
assert len(PROG) == BARS


def section(bar):
    for name, end in (('intro', 4), ('a1', 8), ('a2', 12), ('a3', 16), ('dev', 24),
                      ('ret', 28), ('coda', 30)):
        if bar < end:
            return name


def chord_spans(bar):
    """Yield (beat, beats, chord) for each chord in a bar."""
    spans = PROG[bar]
    for i, (beat, name) in enumerate(spans):
        end = spans[i + 1][0] if i + 1 < len(spans) else 4
        yield beat, end - beat, name


def tones(name, lo, hi):
    root, iv = CHORDS[name]
    pcs = {(root + i) % 12 for i in iv}
    return [p for p in range(lo, hi + 1) if p % 12 in pcs]


def bass_of(name, lo=36):
    root = CHORDS[name][0]
    return lo + (root - lo) % 12


# ---------------------------------------------------------------- melodies (note, beats)
LEITMOTIF = [('D4', 1), ('A4', 2), (None, 1), ('B4', 1), ('A4', 1), ('F#4', 2),
             ('G4', 1), ('F#4', 1), ('E4', 2), ('D4', 4)]
ANSWER = [('G4', 1), ('D5', 2), (None, 1), ('E5', 1), ('D5', 1), ('C#5', 2),
          ('B4', 1), ('C#5', 1), ('D5', 1), ('E5', 1), ('A4', 4)]
DESCANT = [('A5', 2), ('F#5', 2), ('G5', 2), ('D5', 2), ('E5', 2), ('C#5', 2), ('D5', 4)]
# development: (voice, bar melody) - motif head sequenced upwards
DEV = [('vln', [('G4', 1), ('D5', 2), ('C#5', 1)]),
       ('fl', [('E5', 1), ('D5', 1), ('B4', 2)]),
       ('vln', [('A4', 1), ('E5', 2), (None, 1)]),
       ('fl', [('F#5', 1), ('E5', 1), ('C#5', 2)]),
       ('vln', [('B4', 1), ('F#5', 2), (None, 1)]),
       ('fl', [('G5', 1), ('F#5', 1), ('D5', 2)]),
       ('both', [('E5', 1), ('F#5', 1), ('G5', 1), ('A5', 1)]),
       ('both', [('A5', 2), ('G5', 1), ('E5', 1)])]
CODA = [('B5', 1), ('A5', 1), ('F#5', 2), ('G5', 1), ('F#5', 1), ('E5', 2)]
INTRO_CELESTA = [('D5', 1), ('A5', 2), (None, 1), ('B5', 1), ('A5', 1), ('F#5', 2),
                 ('G5', 1), ('F#5', 1), ('E5', 2), ('D5', 3), (None, 1)]


def line(notes, start_bar, transpose=0):
    beat = 0.0
    for name, d in notes:
        if name is not None:
            yield tb(start_bar, beat), m(name) + transpose, d * SPB, beat
        beat += d


def phrase_vel(beat, base):
    """Slight arch: stronger on downbeats and long notes."""
    return base * (1.08 if beat % 4 == 0 else (1.0 if beat % 2 == 0 else 0.93))


# ---------------------------------------------------------------- tracks

def render_flute():
    rng = np.random.default_rng(21)
    tr = S.Track(N_LOOP, N_TAIL)
    parts = [(LEITMOTIF, 4, 12, 0.62), (DESCANT, 12, 0, 0.4), (LEITMOTIF, 24, 12, 0.55)]
    for notes, bar, tr_, vel in parts:
        for t, p, d, beat in line(notes, bar, tr_):
            tr.add(S.flute_note(p, d * 0.96, S.hvel(rng, phrase_vel(beat, vel)), int(rng.integers(99))),
                   t + S.humanize(rng), pan=0.25)
    for i, (voice, notes) in enumerate(DEV):
        if voice in ('fl', 'both'):
            for t, p, d, beat in line(notes, 16 + i):
                tr.add(S.flute_note(p, d * 0.96, S.hvel(rng, phrase_vel(beat, 0.55)), int(rng.integers(99))),
                       t + S.humanize(rng), pan=0.25)
    for t, p, d, beat in line(CODA, 28):
        tr.add(S.flute_note(p, d * 0.95, S.hvel(rng, 0.42 - 0.03 * beat / 4), int(rng.integers(99))),
               t + S.humanize(rng), pan=0.25)
    return tr


def render_violins():
    """Melodic first violins: answer, development questions and the return 8va."""
    rng = np.random.default_rng(22)
    tr = S.Track(N_LOOP, N_TAIL)

    def play(p, t, d, vel):
        tr.add(S.strings_note(p, d, vel, rng, voices=5, attack=0.1, release=0.45, bright=0.85,
                              max_fc=5000.0), t + S.humanize(rng), pan=-0.3)

    for t, p, d, beat in line(ANSWER, 8):
        play(p, t, d, S.hvel(rng, phrase_vel(beat, 0.62)))
    for i, (voice, notes) in enumerate(DEV):
        if voice in ('vln', 'both'):
            for t, p, d, beat in line(notes, 16 + i):
                play(p, t, d, S.hvel(rng, phrase_vel(beat, 0.6 + 0.02 * i)))
    for t, p, d, beat in line(LEITMOTIF, 24, 12):
        play(p, t, d, S.hvel(rng, phrase_vel(beat, 0.7)))
    return tr


def render_strings_pad():
    """Violas / second violins holding the harmony."""
    rng = np.random.default_rng(23)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        if sec == 'intro':
            lo, hi, vel, bright = 66, 79, 0.16 + 0.02 * bar, 0.35
        elif sec in ('a1', 'coda'):
            lo, hi, vel, bright = 57, 71, 0.2, 0.4
        elif sec == 'dev':
            lo, hi, vel, bright = 55, 72, 0.22 + 0.015 * (bar - 16), 0.5
        elif sec == 'ret':
            lo, hi, vel, bright = 55, 74, 0.32, 0.55
        else:
            lo, hi, vel, bright = 55, 71, 0.25, 0.45
        for beat, beats, name in chord_spans(bar):
            for p in tones(name, lo, hi)[:4]:
                tr.add(S.strings_note(p, beats * SPB, vel, rng, voices=3, attack=0.45, release=0.8,
                                      bright=bright, vib=True), tb(bar, beat), pan=0.15)
    return tr


def render_low_strings():
    """Cellos and basses: arco roots, pizzicato in A1."""
    rng = np.random.default_rng(24)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        for beat, beats, name in chord_spans(bar):
            root = bass_of(name)
            if sec == 'intro' and bar < 2:
                continue
            if sec == 'a1':
                for b, off, v in ((0, 0, 0.8), (2, 7, 0.6)):
                    if b >= beat and b < beat + beats:
                        tr.add(S.pizz_note(root + off, SPB, v, int(rng.integers(9))),
                               tb(bar, b) + S.humanize(rng), pan=-0.1, gain=1.6)
                continue
            vel = {'intro': 0.22, 'a2': 0.35, 'a3': 0.4, 'dev': 0.38 + 0.02 * (bar - 16),
                   'ret': 0.5, 'coda': 0.3}[sec]
            tr.add(S.strings_note(root, beats * SPB, vel, rng, voices=3, attack=0.25, release=0.6,
                                  bright=0.45, vib=False), tb(bar, beat), pan=-0.1)
            if sec in ('a3', 'ret', 'dev'):
                tr.add(S.strings_note(root + 12, beats * SPB, vel * 0.6, rng, voices=3, attack=0.25,
                                      release=0.6, bright=0.4), tb(bar, beat), pan=-0.2)
    # A3: cellos double the horn tune an octave down
    for t, p, d, beat in line(LEITMOTIF, 12, -12):
        tr.add(S.strings_note(p, d, 0.45, rng, voices=4, attack=0.1, release=0.4, bright=0.5),
               t + S.humanize(rng), pan=-0.25)
    return tr


def render_horns():
    rng = np.random.default_rng(25)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, vel in ((12, 0.55), (24, 0.68)):
        for t, p, d, beat in line(LEITMOTIF, bar):
            tr.add(S.brass_note(p, d * 0.96, S.hvel(rng, phrase_vel(beat, vel)), rng, kind='horn',
                                voices=4), t + S.humanize(rng), pan=-0.35)
    # soft sustained pads: A2 and the second half of the development
    for bar in list(range(8, 12)) + list(range(20, 24)):
        base = 0.28 if bar < 12 else 0.3 + 0.05 * (bar - 20)
        for beat, beats, name in chord_spans(bar):
            for p in tones(name, 52, 64)[1:3]:
                tr.add(S.brass_note(p, beats * SPB - 0.05, base, rng, kind='horn', voices=3,
                                    swell=min(1.2, beats * SPB * 0.6)), tb(bar, beat), pan=-0.35)
    # codetta: a distant horn call echoing the answer
    for t, p, d, beat in line([('A4', 2), ('D5', 2), ('C#5', 4)], 28, -12):
        tr.add(S.brass_note(p, d * 0.95, 0.3, rng, kind='horn', voices=3), t, pan=-0.4)
    return tr


def render_harp():
    rng = np.random.default_rng(26)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        for beat, beats, name in chord_spans(bar):
            pool = tones(name, 50, 81)
            if sec in ('a3', 'ret'):
                # rolled chords on the strong beats
                for b in np.arange(beat, beat + beats, 2):
                    for j, p in enumerate(tones(name, 43, 74)[::2][:6]):
                        tr.add(S.harp_note(p, 1.0, 0.33, j), tb(bar, b) + 0.028 * j, pan=0.45)
                continue
            if sec == 'coda':
                steps, vel = np.arange(beat, beat + beats, 1.0), 0.3
            else:
                steps, vel = np.arange(beat, beat + beats, 0.5), 0.3 if sec == 'intro' else 0.26
            # rising then falling arpeggio across the chord
            up = [p for p in pool if p >= 55]
            seq = up[:5] + up[5:6] + up[4:0:-1]
            for i, b in enumerate(steps):
                p = seq[(i + int(beat) * 2) % len(seq)]
                v = S.hvel(rng, vel * (1.15 if b % 1 == 0 else 0.9))
                tr.add(S.harp_note(p, 0.6, v, int(rng.integers(3))), tb(bar, b) + S.humanize(rng),
                       pan=0.45)
    # glissando up into the return
    gl = [p for p in range(55, 91) if p % 12 in (2, 4, 7, 9, 11, 1)]
    for i, p in enumerate(gl):
        tr.add(S.harp_note(p, 0.5, 0.18 + 0.12 * i / len(gl), i % 3),
               tb(23, 2) + i * (2 * SPB / len(gl)), pan=0.4 + 0.2 * i / len(gl))
    return tr


def render_celesta():
    rng = np.random.default_rng(27)
    tr = S.Track(N_LOOP, N_TAIL)
    for t, p, d, beat in line(INTRO_CELESTA, 0):
        tr.add(S.celesta_note(p, d, S.hvel(rng, 0.5), 1), t + S.humanize(rng), pan=-0.4)
    # sparkles in the rests of the melody (echo of the head)
    for bar, notes in ((4, ('A5', 'D6')), (8, ('D6', 'G6')), (18, ('E6', 'A6')), (20, ('F#6', 'B6')),
                       (12, ('F#5', 'A5', 'D6')), (15, ('A5', 'D6', 'F#6'))):
        start = 3.0 if bar not in (15,) else 2.0
        for j, n in enumerate(notes):
            tr.add(S.celesta_note(m(n), 0.4, 0.34, j), tb(bar, start + j * 0.33), pan=-0.4)
    # return: celesta doubles the motif two octaves up, very lightly
    for t, p, d, beat in line(LEITMOTIF, 24, 24):
        tr.add(S.celesta_note(p, d, 0.2, 2), t + S.humanize(rng), pan=-0.45)
    for t, p, d, beat in line(CODA, 28, 12):
        tr.add(S.celesta_note(p, d, 0.2, 0), t + 0.02, pan=-0.45)
    return tr


def render_timpani():
    rng = np.random.default_rng(28)
    tr = S.Track(N_LOOP, N_TAIL)
    D2, A1 = 38, 33
    S.timpani_roll(tr, A1, tb(3, 1), 3 * SPB, 0.12, 0.45, rng)
    for bar, v in ((4, 0.55), (12, 0.6), (24, 0.8)):
        tr.add(S.timpani(D2, v, rng, decay=1.5, mallet=0.45), tb(bar), pan=0.0)
    for bar, notes in ((15, ((0, D2, 0.4), (2, A1, 0.3), (3, A1, 0.35))),
                       (27, ((0, D2, 0.55), (2, A1, 0.35), (3, D2, 0.3))),
                       (20, ((0, 47, 0.35),)), (14, ((2, A1, 0.35),)),
                       (26, ((2, A1, 0.45), (3.5, A1, 0.35))), (16, ((0, 43, 0.3),))):
        for beat, p, v in notes:
            tr.add(S.timpani(p, v, rng, decay=1.4, mallet=0.4), tb(bar, beat), pan=0.0)
    S.timpani_roll(tr, A1, tb(22, 2), 6 * SPB, 0.1, 0.6, rng)
    return tr


def render_cymbal():
    rng = np.random.default_rng(29)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, beats, v in ((12, 2, 0.25), (24, 4, 0.4)):
        sw = beats * SPB
        tr.add(S.cymbal(rng, swell=sw, vel=v), tb(bar) - sw)
    tr.add(S.cymbal(rng, decay=2.0, vel=0.22), tb(24))
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'flute': (render_flute, 0.78, 0.4, 250.0, 7000.0),
    'violins': (render_violins, 0.75, 0.45, 150.0, 6500.0),
    'pad': (render_strings_pad, 0.5, 0.5, 120.0, 6000.0),
    'low': (render_low_strings, 0.55, 0.3, 35.0, 4000.0),
    'horns': (render_horns, 0.7, 0.45, 80.0, 4500.0),
    'harp': (render_harp, 1.35, 0.4, 90.0, 7000.0),
    'celesta': (render_celesta, 0.95, 0.55, 300.0, 7500.0),
    'timpani': (render_timpani, 0.5, 0.35, 30.0, 3000.0),
    'cymbal': (render_cymbal, 0.9, 0.5, 400.0, 8000.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    return S.finish_track(fn(), gain, hp, lp)


if __name__ == '__main__':
    print(f'menu: {BARS} bars at {BPM} BPM = {N_LOOP / S.SR:.3f}s, {N_LOOP} samples')
    S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=2.3, target_lufs=-15.0)
    with open(OUT + '.loop.txt', 'w') as fh:
        fh.write(f'{N_LOOP}\n')
