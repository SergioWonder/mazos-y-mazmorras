"""Act II sketches on leitmotif 7 «Sombra»: La Cripta (from the horror sketch, without the
constant high harmonics and with more instruments) and El Templo Oscuro (from the gloomy
sketch, with alternating high and low voices, dark cultists and dagger stabs). Each in an
exploration and a combat version sharing tempo, harmony and tune, as the game needs.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/acto2_bocetos.py"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)

from estudio import config, mix, render  # noqa: E402
from demos import MOTIFS, n  # noqa: E402
from arreglos import BUS, CH, LIB, SSO, TAMTAM, Score, melody, phrase_cc, play  # noqa: E402

BUILD = os.path.join(HERE, 'build')
LIB = {**LIB,
       'basses_trem': SSO + 'Strings - Performance/Basses Tremolo.sfz',
       'violins_col_legno': SSO + 'Strings - Performance/1st Violins Col Legno.sfz',
       'chimes': SSO + 'Percussion/Chimes.sfz',
       'organ_pedal': SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
       'contrabassoon': SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz',
       'trombones': SSO + 'Brass - Performance/Trombones Sustain (looped).sfz',
       'horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
       'cellos_spic': 'VSCO-2-CE/CelloEnsSpic.sfz',
       'violins_spic': 'VSCO-2-CE/ViolinEnsSpic.sfz',
       'xylo': 'VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz',
       'finger_cymbals': 'VCSL/Idiophones/Struck Idiophones/Finger Cymbals.sfz',
       'frame_drum': 'VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz',
       'bass_drum': 'VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz',
       'tom': 'VCSL/Membranophones/Struck Membranophones/Tom 2.sfz',
       'cymbal': 'VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz',
       'basses_spic': 'VSCO-2-CE/ContrabassSpic.sfz',
       'horns_marcato': SSO + 'Brass - Performance/Horns Marcato.sfz',
       'trombones_marcato': SSO + 'Brass - Performance/Trombones Marcato.sfz',
       'tuba_marcato': SSO + 'Brass - Performance/Tuba Marcato.sfz',
       'violins_marcato': SSO + 'Strings - Performance/1st Violins Marcato.sfz',
       'organ_full': SSO + 'Organ/Great - Open Diapason 8ft.sfz'}  # «All Stops» is silent until CC16–29 open its stops
BUS = {**BUS, 'rhythm': {'highpass': 45, 'peaks': [(300, -2, 1), (3200, -3, 1)]},
       'drums': {'highpass': 55, 'peaks': [(46, -6, 1.5), (3500, -4, 1)]},
       'organ': {'highpass': 30, 'peaks': [(300, -2, 1)]},
       'brass': {'highpass': 70, 'peaks': [(300, -2, 1), (3000, -3, 1)], 'comp': (-20, 1.6)}}
MOTIF = next(m for m in MOTIFS if m[0] == '7-sombra')
CHORDS = ['Dm', 'A7', 'Dm', 'Dm']
BEATS = 4
SPAN = len(CHORDS) * BEATS
BASS_LINE = [['D2', 'A1'], ['A1', 'E2'], ['D2', 'F2'], ['Bb1', 'A1']]  # a walking root under each pass


def crypt(version: str):
    """La Cripta. Exploration: bowed vibraphone, then alto flute with celesta ghosts; whispering
    choir, a low tremolo that moves with the harmony (no fixed cluster), harp, bone-like col legno,
    a crypt bell and a wine-glass swell. Combat: the same tune on horns and then violins over a
    spiccato ostinato, rattling col legno, timpani, xylophone bones and a stronger choir."""
    s = Score(72, BEATS)
    combat = version == 'combate'
    for rep in range(2):
        o = rep * SPAN
        if not combat:
            if rep == 0:
                play(s, 'Lead A', melody(MOTIF, o, 12), lambda i, b: 52 + (i % 3) * 4)
            else:
                play(s, 'Lead B', melody(MOTIF, o, 0), 76)
                phrase_cc(s, 'Lead B', o, SPAN, 60, 88)
                for b, d, p in melody(MOTIF, o, 24)[1::3]:
                    s.note('Celeste', b + d * .5, .5, p, 48)
        else:
            if rep == 0:
                play(s, 'Lead A', melody(MOTIF, o, 0), 80)
                phrase_cc(s, 'Lead A', o, SPAN, 76, 104)
            else:
                play(s, 'Lead B', melody(MOTIF, o, 12), 92)
                play(s, 'Xylophone', melody(MOTIF, o, 12), 58)
        for b, ch in enumerate(CHORDS):
            at = o + b * BEATS
            tones = [n(x) for x in CH[ch]]
            for k, root in enumerate(BASS_LINE[b]):
                s.note('Low Tremolo', at + 2 * k, 2.05, n(root) + 12, 70)
            for x in tones:
                s.note('Choir', at, BEATS + .05, max(55, x + 12), 70)
            if not combat:
                s.note('Harp', at, 1, tones[0], 58)
                s.note('Harp', at + 2.5, 1, tones[2], 50)
                if b % 2 == 1:
                    for k in range(3):
                        s.note('Col Legno', at + 3 + k / 3, .15, tones[0] + 12 + k, 58 - 4 * k)
            else:
                pattern = [0, 0, 7, 0, 12, 0, 7, 3]  # 8ths: root, root, fifth… a restless grave dance
                for k, step in enumerate(pattern):
                    s.note('Spiccato', at + k / 2, .4, tones[0] + step, 74 + 10 * (k in (0, 3, 6)))
                for k in range(8):
                    s.note('Col Legno', at + k / 2 + .25, .1, tones[2] + 12, 48 + 8 * (k % 2))
                s.note('Timpani', at, .9, n('D2') if ch != 'A7' else n('A2'), 86)
                s.note('Timpani', at + 2, .9, n('A2') if ch != 'A7' else n('E2'), 72)
        s.curve('Low Tremolo', [(o, 45 if not combat else 70), (o + SPAN * .75, 78 if not combat else 100), (o + SPAN, 55)])
        s.curve('Choir', [(o, 38 if not combat else 60), (o + SPAN / 2, 58 if not combat else 86), (o + SPAN, 42 if not combat else 64)])
        s.note('Bell', o, 4, n('D3'), 62 if not combat else 76)
        if not combat:
            s.note('Glasses', o + SPAN - 2 * BEATS, 2 * BEATS, n('Eb5'), 56)
        s.note('Tam-tam', o + SPAN - BEATS, BEATS, TAMTAM, 54 if not combat else 70)
    s.note('Piano Cluster', SPAN, 2, n('D1'), 80 if combat else 64)
    s.note('Piano Cluster', SPAN, 2, n('Eb1'), 76 if combat else 60)
    parts = [('Lead A', 'horns' if combat else 'vibes_bowed', 'lead', -0.15, -7 if combat else 1, 0.42),
             ('Lead B', 'violins_quiet' if combat else 'alto_flute', 'lead', -0.25, 4 if combat else 0, 0.32),
             ('Celeste', 'celeste', 'bells', 0.3, 8, 0.45), ('Xylophone', 'xylo', 'bells', 0.25, 10, 0.30),
             ('Choir', 'choir_mixed', 'choir', 0.0, 0, 0.50), ('Low Tremolo', 'basses_trem', 'low', 0.3, -1, 0.30),
             ('Harp', 'harp', 'harp', -0.45, 4, 0.40), ('Col Legno', 'violins_col_legno', 'perc', 0.35, 2, 0.30),
             ('Spiccato', 'cellos_spic', 'rhythm', 0.3, 4, 0.25), ('Timpani', 'timpani', 'perc', -0.1, 4, 0.40),
             ('Bell', 'chimes', 'bells', -0.2, -6, 0.55), ('Glasses', 'glasses', 'bells', -0.35, 0, 0.55),
             ('Tam-tam', 'tamtam', 'perc', 0.25, -6, 0.60), ('Piano Cluster', 'piano', 'low', -0.2, -10, 0.50)]
    return s, parts, 2.8


def temple(version: str):
    """El Templo Oscuro. The tune passes between low male voices and high female voices bar
    by bar, over an organ pedal and a contrabassoon; frame drum and finger cymbals keep the
    ritual. Combat: the low choir chants an invocation (3+3+2), trombones double the tune like
    a demon answering, drums pound, and violin stabs strike like daggers."""
    s = Score(76, BEATS)
    combat = version == 'combate'
    for rep in range(2):
        o = rep * SPAN
        for i, (b, d, p) in enumerate(melody(MOTIF, o, 0)):
            bar = int((b - o) // BEATS)
            high = (bar + rep) % 2 == 1  # alternate low and high voices bar by bar
            s.note('Choir High' if high else 'Choir Low', b, d + .05, p + 12 if high else p - 12, 80)
            if combat and not high:
                s.note('Trombones', b, d + .05, p - 12, 82)
        for t in ('Choir High', 'Choir Low'):
            phrase_cc(s, t, o, SPAN, 62 if not combat else 92, 96 if not combat else 112)
        if combat:
            phrase_cc(s, 'Trombones', o, SPAN, 74, 100)
        for b, ch in enumerate(CHORDS):
            at = o + b * BEATS
            tones = [n(x) for x in CH[ch]]
            s.note('Organ Pedal', at, BEATS + .05, tones[0] if tones[0] >= 36 else tones[0] + 12, 74)
            s.note('Contrabassoon', at, BEATS + .05, tones[0] - 12, 70)
            s.note('Frame Drum', at, .5, 61, 78)
            s.note('Frame Drum', at + 2.5, .5, 64, 60)
            s.note('Finger Cymbals', at + 3, .5, 60, 56 if not combat else 70)
            if combat:
                for k, step in enumerate([0, .75, 1.5, 2.25, 3]):  # the invocation chant, faster and relentless
                    s.note('Chant', at + step, .4 if k < 4 else .9, tones[0], 96 - 4 * k)
                # driving 16ths in cellos and basses, accented 3+3+2 like a war drum
                for k in range(16):
                    acc = k in (0, 3, 6, 8, 11, 14)
                    s.note('Ostinato', at + k / 4, .22, tones[0] + (7 if k in (6, 14) else 0), 96 if acc else 70)
                    s.note('Ostinato Low', at + k / 4, .22, tones[0] - 12, 92 if acc else 64)
                for k in (0, 1.5, 3):  # brass stabs: the demons answer
                    s.note('Brass Stabs', at + k, .3, tones[0], 100)
                    s.note('Brass Stabs', at + k, .3, tones[1], 96)
                for k in (0, .75, 1.5, 2, 3, 3.5):
                    s.note('Bass Drum', at + k, .4, 62, 100 if k in (0, 1.5, 3) else 80)
                for k in (2.5, 2.75, 3.25, 3.5, 3.75):
                    s.note('Tom', at + k, .2, 62 if k < 3.5 else 64, 84 + int(10 * (k - 2.5)))
                for k in (.5, 1.25, 2.25, 2.75, 3.25):  # dagger stabs, now a frenzy
                    s.note('Daggers', at + k, .1, tones[2] + 24, 100)
                    s.note('Daggers', at + k, .1, tones[2] + 25, 94)
                if b % 2 == 0:
                    s.note('Crash', at, 1.5, 66, 92)
        if combat:
            phrase_cc(s, 'Chant', o, SPAN, 86, 110)
            phrase_cc(s, 'Brass Stabs', o, SPAN, 90, 110)
            s.note('Cymbal', o + SPAN - 2 * BEATS, 2 * BEATS, 64, 70)
        s.note('Bell', o, 4, n('D3'), 66)
        s.note('Tam-tam', o + SPAN - BEATS, BEATS, TAMTAM, 58 if not combat else 74)
    parts = [('Choir Low', 'choir_large', 'choir', -0.15, 4, 0.42), ('Choir High', 'choir_mixed', 'choir', 0.15, 2, 0.48),
             ('Chant', 'choir_large', 'choir', 0.0, 4, 0.35), ('Trombones', 'trombones', 'lead', 0.25, -2, 0.38),
             ('Organ Pedal', 'organ_pedal', 'organ', 0.0, -2, 0.40), ('Contrabassoon', 'contrabassoon', 'low', -0.1, -5, 0.30),
             ('Frame Drum', 'frame_drum', 'drums', 0.2, -5, 0.40), ('Finger Cymbals', 'finger_cymbals', 'bells', -0.3, 12, 0.50),
             ('Bass Drum', 'bass_drum', 'drums', 0.0, -9, 0.40), ('Tom', 'tom', 'drums', 0.15, -4, 0.40),
             ('Daggers', 'violins_spic', 'rhythm', -0.35, -10, 0.25), ('Cymbal', 'cymbal', 'bells', 0.25, -10, 0.55),
             ('Bell', 'chimes', 'bells', -0.2, -6, 0.55), ('Tam-tam', 'tamtam', 'perc', 0.25, -6, 0.60),
             ('Ostinato', 'cellos_spic', 'rhythm', 0.3, 2, 0.22), ('Ostinato Low', 'basses_spic', 'rhythm', 0.35, 2, 0.22),
             ('Brass Stabs', 'horns_marcato', 'brass', -0.25, -6, 0.32), ('Crash', 'cymbal', 'bells', 0.2, -8, 0.50)]
    return s, parts, 2.4 if combat else 3.0


BOSS_BEATS = 4


def boss_crypt():
    """Vol'guth, the lich: «Sombra» as a necromantic rite at 144. Full organ and a large choir
    hold the motif in augmentation while strings tremble and spiccato basses gallop; brass marcato
    hammers the chromatic turn, timpani and tam-tam mark the phylactery's pulse, the crypt bell tolls."""
    s = Score(144, BOSS_BEATS)
    chords = ['Dm', 'Bb', 'Gm', 'A7', 'Dm', 'Bb', 'Eb', 'A7']  # the Neapolitan E♭ twists the second half
    roots = {'Dm': 'D2', 'Bb': 'Bb1', 'Gm': 'G1', 'A7': 'A1', 'Eb': 'Eb2'}
    span = len(chords) * BOSS_BEATS
    for rep_ in range(2):
        o = rep_ * span
        aug = [(o + b * 2, d * 2, p) for b, d, p in melody(MOTIF, 0, 0)]  # the motif twice as slow
        for b, d, p in aug:
            s.note('Choir', b, d + .05, p, 90)
            s.note('Organ', b, d + .05, p - 12, 80)
            if rep_ == 1:
                s.note('Violins', b, d + .05, p + 12, 88)
        phrase_cc(s, 'Choir', o, span, 84, 112)
        phrase_cc(s, 'Organ', o, span, 80, 106)
        if rep_ == 1:
            phrase_cc(s, 'Violins', o, span, 86, 110)
        for bar, ch in enumerate(chords):
            at = o + bar * BOSS_BEATS
            root = n(roots[ch])
            for k in range(8):  # galloping spiccato basses: long-short-short
                s.note('Gallop', at + k / 2, .3, root + (12 if k % 4 == 2 else 0), 100 if k % 2 == 0 else 74)
            s.note('Tremolo', at, BOSS_BEATS + .05, root + 24, 80)
            s.note('Tremolo', at, BOSS_BEATS + .05, root + 31, 76)
            for k in (0, 1.5, 3):
                s.note('Brass', at + k, .35, root + 12, 104)
                s.note('Brass', at + k, .35, root + 15 if ch in ('Dm', 'Gm') else root + 16, 98)
            s.note('Timpani', at, .5, n('D2') if ch in ('Dm', 'Bb', 'Gm') else n('A2'), 104)
            s.note('Timpani', at + 2.5, .4, n('A2') if ch in ('Dm', 'Bb', 'Gm') else n('E2'), 88)
            s.note('Bass Drum', at, .4, 62, 96)
            if bar % 4 == 3:
                for k in range(8):
                    s.note('Snare Roll', at + k / 2, .25, 62, 70 + 4 * k)
        s.curve('Tremolo', [(o, 70), (o + span, 104)])
        s.curve('Brass', [(o, 96), (o + span, 112)])
        s.note('Bell', o, 4, n('D3'), 88)
        s.note('Bell', o + span / 2, 4, n('A2') + 12, 80)
        s.note('Tam-tam', o + span - 2, 2, TAMTAM, 84)
    parts = [('Choir', 'choir_large', 'choir', 0.0, 2, 0.40), ('Organ', 'organ_full', 'organ', 0.0, -6, 0.42),
             ('Violins', 'violins_marcato', 'lead', -0.4, -2, 0.28), ('Gallop', 'basses_spic', 'rhythm', 0.35, -4, 0.22),
             ('Tremolo', 'strings_trem', 'low', 0.15, -4, 0.30), ('Brass', 'trombones_marcato', 'brass', 0.25, -6, 0.32),
             ('Timpani', 'timpani', 'perc', -0.1, 2, 0.38), ('Bass Drum', 'bass_drum', 'drums', 0.0, -8, 0.35),
             ('Snare Roll', 'tom', 'drums', 0.15, -6, 0.40), ('Bell', 'chimes', 'bells', -0.2, -4, 0.50),
             ('Tam-tam', 'tamtam', 'perc', 0.25, -4, 0.55)]
    return s, parts, 2.2, 2 * len(chords) + 1


def boss_temple():
    """Malachar, the cult's Herald (and Abaddon behind him): «Sombra» in D phrygian at 160. The
    choirs shout the motif in alternating registers over a 3+3+2 chant; tuba and trombones
    growl the demon's answer, war drums and toms pound, violins slash like knives; the second half
    lifts a semitone — the demon breaks free."""
    s = Score(160, BOSS_BEATS)
    span = 8 * BOSS_BEATS
    for rep_ in range(2):
        o = rep_ * span
        lift = rep_  # the second pass rises a semitone: Abaddon is loose
        mel = melody(MOTIF, o, lift) + melody(MOTIF, o + span / 2, lift + 12)
        for i, (b, d, p) in enumerate(mel):
            high = (int((b - o) // BOSS_BEATS) % 2 == 1)
            s.note('Choir High' if high else 'Choir Low', b, d + .05, p if high else p - 12, 100)
            s.note('Horns', b, d + .05, (p - 12) if p > 70 else p, 96)
        for t in ('Choir High', 'Choir Low', 'Horns'):
            phrase_cc(s, t, o, span, 92, 112)
        for bar in range(8):
            at = o + bar * BOSS_BEATS
            root = n('D2') + lift + (1 if bar % 4 == 3 else 0)  # the phrygian E♭ grinds against D
            for k, step in enumerate([0, .75, 1.5, 2.25, 3]):
                s.note('Chant', at + step, .35, root + 12, 100 - 3 * k)
            for k in range(16):
                acc = k in (0, 3, 6, 8, 11, 14)
                s.note('Ostinato', at + k / 4, .2, root + 12 + (1 if k in (7, 15) else 0), 100 if acc else 72)
            for k in (0, 1.5, 3):
                s.note('Demon', at + k, .35, root, 108)
                s.note('Demon Low', at + k, .35, root - 12 if root - 12 >= 28 else root, 104)
            for k in (0, .75, 1.5, 2, 3, 3.5):
                s.note('Bass Drum', at + k, .3, 62, 104 if k in (0, 1.5, 3) else 84)
            for k in (2.5, 2.75, 3.25, 3.5, 3.75):
                s.note('Tom', at + k, .2, 62 if k < 3.5 else 64, 90)
            for k in (.5, 1.25, 2.25, 2.75, 3.25):
                s.note('Knives', at + k, .1, root + 36, 104)
                s.note('Knives', at + k, .1, root + 37, 98)
            if bar % 2 == 0:
                s.note('Crash', at, 1.5, 66, 100)
        s.curve('Chant', [(o, 96), (o + span, 112)])
        s.curve('Demon', [(o, 100), (o + span, 112)])
        s.curve('Demon Low', [(o, 100), (o + span, 112)])
        s.note('Tam-tam', o + span - 2, 2, TAMTAM, 92)
    parts = [('Choir Low', 'choir_large', 'choir', -0.15, 1, 0.38), ('Choir High', 'choir_mixed', 'choir', 0.15, 3, 0.42),
             ('Horns', 'horns_marcato', 'brass', -0.3, -6, 0.32), ('Chant', 'choir_large', 'choir', 0.0, 8, 0.30),
             ('Ostinato', 'cellos_spic', 'rhythm', 0.3, 0, 0.20), ('Demon', 'trombones_marcato', 'brass', 0.25, -6, 0.30),
             ('Demon Low', 'tuba_marcato', 'brass', 0.3, -6, 0.28), ('Bass Drum', 'bass_drum', 'drums', 0.0, -10, 0.32),
             ('Tom', 'tom', 'drums', 0.15, -4, 0.35), ('Knives', 'violins_spic', 'rhythm', -0.4, -6, 0.22),
             ('Crash', 'cymbal', 'bells', 0.2, -10, 0.45), ('Tam-tam', 'tamtam', 'perc', 0.25, -4, 0.55)]
    return s, parts, 2.0, 2 * 8 + 1


JOBS = {
    'cripta-explora': lambda: (*crypt('explora'), 2 * len(CHORDS) + 1, -17.5),
    'cripta-combate': lambda: (*crypt('combate'), 2 * len(CHORDS) + 1, -16.5),
    'templo-explora': lambda: (*temple('explora'), 2 * len(CHORDS) + 1, -17.5),
    'templo-combate': lambda: (*temple('combate'), 2 * len(CHORDS) + 1, -16.5),
    'jefe-cripta': lambda: (*boss_crypt(), -16.5),
    'jefe-templo': lambda: (*boss_temple(), -16.5),
}


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    wanted = sys.argv[1:] or ['cripta-explora', 'templo-combate', 'jefe-cripta', 'jefe-templo']
    clips = []
    for key in wanted:
        if True:
            score, parts, reverb_s, bars, target = JOBS[key]()
            title = f'acto2-{key}'
            mid_path = os.path.join(BUILD, f'{title}.mid')
            score.save(mid_path)
            used = set(score.tracks)
            spec = render.MixSpec(
                midi=mid_path, out=os.path.join(BUILD, f'{title}.mp3'), bpm=score.bpm, beats_per_bar=score.beats, bars=bars,
                parts=[render.Part(t, LIB[lib], bus=bus, pan=pan, gain_db=g, send=send)
                       for t, lib, bus, pan, g, send in parts if t in used],
                buses=BUS, reverb={'seconds': reverb_s, 'predelay': 0.03, 'damping': 0.5}, reverb_return_db=-3,
                target_lufs=target, tail_seconds=4.0)
            r = render.render(spec)
            peaks = {k: round(float(v['pico_db']), 1) for k, v in r['parts'].items()}
            print(f'{title:24s} {r["seconds"]:5.1f} s  {r["lufs"]:6.1f} LUFS  picos {peaks}')
            clips.append(r['out'])
    sr = config.SR
    parts = []
    with tempfile.TemporaryDirectory() as tmp:
        for c in clips:
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', c, os.path.join(tmp, 'x.wav')], check=True)
            y, _ = sf.read(os.path.join(tmp, 'x.wav'), dtype='float32')
            fade = np.linspace(1, 0, int(1.2 * sr))[:, None]
            y[-len(fade):] *= fade
            parts += [y, np.zeros((int(1.5 * sr), 2), dtype=np.float32)]
    name = 'acto2-bocetos.mp3' if len(wanted) == len(JOBS) else 'acto2-bocetos-2.mp3'
    mix.export_mp3(np.concatenate(parts), sr, os.path.join(BUILD, name))
    print('recopilatorio:', os.path.join(BUILD, name))


if __name__ == '__main__':
    main()
