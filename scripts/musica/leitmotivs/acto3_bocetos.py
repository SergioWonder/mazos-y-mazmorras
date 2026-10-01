"""Act III sketches: four new leitmotifs for each scenario, each in its own arrangement.

- El Laberinto del Contemplador: mystery and deep darkness with progressive metalcore — heavy
  riffs cut by silences, choirs behind, shifting metres; music that does not belong in a fantasy world.
- La Guarida del Dragón: decay — ruins, lava and sulphur; minor scales and instruments for the dragon.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/acto3_bocetos.py"""
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
from demos import n  # noqa: E402
from arreglos import SSO, TAMTAM, Score, phrase_cc  # noqa: E402
from acto2_bocetos import BUS, LIB  # noqa: E402

BUILD = os.path.join(HERE, 'build')
LIB = {**LIB,
       'guitar': 'electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz',
       'bass_el': 'electric-bass-YR/PickedBassYR 20190930.sfz',
       'drums': 'virtuosity_drums/Programs/01-basic-kit.sfz',
       'organ_8': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
       'cello_solo': SSO + 'Strings - Performance/Cello Solo Sustain.sfz',
       'celli_trem': SSO + 'Strings - Performance/Celli Tremolo.sfz',
       'didgeridoo': 'VCSL/Aerophones/Lip Aerophones/Didgeridoo.sfz',
       'gong': 'VCSL/Idiophones/Struck Idiophones/Gong 1.sfz',
       'bells': 'VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz',
       'contrabass_quiet': 'VSCO-2-CE/ContrabassSusVB-Quiet.sfz'}
BUS = {**BUS,
       'guitar': {'highpass': 70, 'peaks': [(250, -2, 1), (3200, -4, 1.2)], 'high_shelf': (6000, -6), 'comp': (-18, 2.0)},
       'bass_el': {'highpass': 35, 'peaks': [(800, -2, 1)], 'high_shelf': (3000, -6)},
       'kit': {'highpass': 35, 'peaks': [(400, -2, 1), (3500, -3, 1)], 'high_shelf': (8000, -4), 'comp': (-16, 1.8)}}
KICK, SNARE, HH, HH_OPEN, CRASH, RIDE, TOM_L, TOM_H = 36, 38, 42, 46, 49, 51, 45, 48


def m(names):
    """'D4 Eb4 …' → MIDI numbers."""
    return [n(x) for x in names.split()]


def chug(s, at, dur, root, vel, power=True):
    """A palm-muted-like chug: short root (+ fifth and octave for a power chord)."""
    for k in ([0, 7, 12] if power else [0]):
        s.note('Guitar', at, dur, root + k, vel - (6 if k else 0))
    s.note('Bass', at, dur, root - 12 if root - 12 >= 26 else root, vel - 10)


# ══ El Laberinto del Contemplador ═══════════════════════════════════════════════
def fractura():
    """«Fractura» (7/8 at 150): semitone-and-tritone motif sung by the choir over a 2+2+3 chug
    riff in D; every fourth bar the band stops dead and only the choir hangs in the air."""
    s = Score(150, 3.5)
    motif = m('D5 Eb5 A4 G#4 D5 F5 E5 Bb4')
    for bar in range(8):
        at = bar * 3.5
        stop = bar % 4 == 3
        eighths = [0, 1, 2, 4, 5, 6] if not stop else [0, 1]
        for e in eighths:
            accent = e in (0, 2, 4)
            chug(s, at + e / 2, .4, n('D2') + (1 if (e == 6 and bar % 2) else 0), 108 if accent else 90)
            s.note('Drums', at + e / 2, .3, KICK, 112 if accent else 96)
        if not stop:
            s.note('Drums', at + 2, .3, SNARE, 116)
            for e in range(7):
                s.note('Drums', at + e / 2, .2, HH, 70 + 10 * (e % 2 == 0))
        else:
            s.note('Drums', at, .5, CRASH, 110)
        s.note('Choir', at, 3.55, motif[bar], 90)
        if bar in (0, 4):
            s.note('Choir Low', at, 7.05, n('D3'), 80)
            s.note('Choir Low', at, 7.05, n('Ab3'), 76)  # the tritone underneath
    s.curve('Choir', [(0, 80), (14, 100), (28, 90)])
    s.curve('Choir Low', [(0, 70), (28, 82)])
    parts = [('Guitar', 'guitar', 'guitar', -0.2, -6, 0.12), ('Bass', 'bass_el', 'bass_el', 0.0, -2, 0.08),
             ('Drums', 'drums', 'kit', 0.0, -2, 0.15), ('Choir', 'choir_mixed', 'choir', 0.15, 2, 0.45),
             ('Choir Low', 'choir_large', 'choir', -0.1, -2, 0.45)]
    return s, parts, 1.6, 1, 8 * 3.5


def arrange_ojo(motif, root, pad, cluster, glasses_shift=0, bpm=70):
    """The «Ojo del vacío» arrangement for any eight-note motif: four bars of celesta and wine glasses
    over a choir pad, then a half-time breakdown on `root` full of holes, the choir taking the motif
    and the organ holding a semitone `cluster`."""
    s = Score(bpm, 4)
    for bar in range(8):
        at = bar * 4
        for k in range(2):
            p = motif[(bar * 2 + k) % len(motif)]
            if bar < 4:
                s.note('Celeste', at + k * 2, 2, p + 12, 60)
                if 74 <= p + glasses_shift <= 87:
                    s.note('Glasses', at + k * 2, 2.05, p + glasses_shift, 58)
            else:
                s.note('Choir', at + k * 2, 2.05, p - 12 if p - 12 >= 57 else p, 92)
        for x in pad:
            s.note('Choir Pad', at, 4.05, x, 70)
        if bar >= 4:
            hits = [0, .75, 1.5, 2.5, 3.25] if bar % 2 == 0 else [0, .75, 1.5]  # the second bar of each pair falls silent
            for h in hits:
                chug(s, at + h, .35, root, 112)
                s.note('Drums', at + h, .3, KICK, 110)
            s.note('Drums', at + 2, .4, SNARE, 118)
            s.note('Drums', at, .6, CRASH if bar == 4 else RIDE, 100)
            for x in cluster:
                s.note('Organ', at, 4.05, x, 80)
    s.curve('Choir Pad', [(0, 50), (16, 70), (32, 80)])
    s.curve('Choir', [(16, 90), (32, 104)])
    parts = [('Celeste', 'celeste', 'bells', 0.3, 4, 0.50), ('Glasses', 'glasses', 'bells', -0.3, 2, 0.55),
             ('Choir Pad', 'choir_mixed', 'choir', 0.0, -2, 0.50), ('Choir', 'choir_large', 'choir', -0.15, 2, 0.40),
             ('Guitar', 'guitar', 'guitar', -0.2, -6, 0.12), ('Bass', 'bass_el', 'bass_el', 0.0, -2, 0.08),
             ('Drums', 'drums', 'kit', 0.0, -2, 0.18), ('Organ', 'organ_8', 'organ', 0.2, -8, 0.40)]
    return s, parts, 2.6, 8, 4


def ojo_vacio():
    """«Ojo del vacío» (4/4 at 70): a whole-tone motif on wine glasses and celesta over an augmented
    choir chord — then, in bar 5, a half-time breakdown in C crashes in, syncopated and full of holes."""
    return arrange_ojo(m('C5 D5 E5 F#5 G#5 F#5 D5 C5'), n('C2'), m('C3 E3 G#3'), m('C3 Db3'))


# The other Laberinto motifs (and two new ones) in the «Ojo del vacío» arrangement
def ojo_fractura():
    """Fractura's semitone-and-tritone motif over a diminished pad in D."""
    return arrange_ojo(m('D5 Eb5 A4 G#4 D5 F5 E5 Bb4'), n('D2'), m('D3 F3 Ab3'), m('D3 Eb3'))


def ojo_colmena():
    """Mente colmena's chromatic fall over an augmented pad in A."""
    return arrange_ojo(m('A5 G#5 G5 F#5 F5 E5 Bb4 A4'), n('A2'), m('A2 C#3 F3'), m('A2 Bb2'))


def ojo_mas_alla():
    """Más allá's Hijaz motif (an octave lower) over an augmented pad in E."""
    return arrange_ojo(m('E4 F4 G#4 A4 C5 B4 F4 E4'), n('E2'), m('E3 G#3 C4'), m('E3 F3'), glasses_shift=12)


def ojo_escalera():
    """New — «Escalera de Escher»: B locrian, climbing to the tritone and falling back past where it began."""
    return arrange_ojo(m('B4 C5 F5 E5 D5 C5 F4 B4'), n('B1'), m('B2 D3 F3'), m('B2 C3'))


def ojo_susurro():
    """New — «Susurro estelar»: leaps of a major seventh that never land, over an augmented pad in G."""
    return arrange_ojo(m('G4 F#5 C5 B4 Eb5 D5 G#4 G4'), n('G2'), m('G2 B2 D#3'), m('G2 Ab2'))


def mente_colmena():
    """«Mente colmena» (4/4 at 120): a five-note guitar figure that slides against the four-beat bar
    (polymetre), a staccato choir chanting one note like a hive, and a chromatic falling motif on
    the solo violin; the organ holds a cluster underneath."""
    s = Score(120, 4)
    figure = [0, 0, 1, 0, 6]  # root, root, ♭2, root, tritone — five 16ths against the 4/4 grid
    motif = m('A5 G#5 G5 F#5 F5 E5 Bb4 A4')
    for k in range(8 * 16):
        step = figure[k % 5]
        at = k / 4
        vel = 110 if k % 5 == 0 else 88
        chug(s, at, .22, n('A1') + 12 + step, vel, power=step == 0)
        if k % 5 == 0:
            s.note('Drums', at, .25, KICK, 112)
        if k % 16 in (4, 12):
            s.note('Drums', at, .3, SNARE, 112)
        if k % 2 == 0:
            s.note('Drums', at, .2, RIDE, 72)
    for bar in range(8):
        at = bar * 4
        s.note('Violin', at, 4.05, motif[bar], 90)
        for b in range(8):
            s.note('Chant', at + b / 2, .45, n('A3'), 86 + (8 if b % 4 == 0 else 0))
        for x in m('A2 Bb2 E3'):
            s.note('Organ', at, 4.05, x, 70)
    phrase_cc(s, 'Violin', 0, 32, 80, 104)
    s.curve('Chant', [(0, 84), (32, 100)])
    parts = [('Guitar', 'guitar', 'guitar', -0.25, -6, 0.10), ('Bass', 'bass_el', 'bass_el', 0.0, -2, 0.08),
             ('Drums', 'drums', 'kit', 0.0, -2, 0.15), ('Violin', 'violin_solo', 'lead', 0.2, 0, 0.35),
             ('Chant', 'choir_large', 'choir', 0.0, 8, 0.35), ('Organ', 'organ_8', 'organ', 0.1, -10, 0.45)]
    return s, parts, 1.8, 8, 4


def mas_alla():
    """«Más allá de las estrellas» (alternating 5/4 and 7/8 at 140): a galloping E riff, a Hijaz motif
    (E F G# A C B F E) on bowed vibraphone and solo violin in octaves, and a choir halo — the metre
    never settles."""
    s = Score(140, 4)
    motif = m('E5 F5 G#5 A5 C6 B5 F5 E5')
    at = 0.0
    for bar in range(8):
        length = 5 if bar % 2 == 0 else 3.5
        steps = int(length * 2)
        for e in range(steps):
            if e % 3 != 2 or length == 3.5:
                chug(s, at + e / 2, .3, n('E2'), 108 if e % 3 == 0 else 90)
                s.note('Drums', at + e / 2, .25, KICK, 104)
            if e % 4 == 2:
                s.note('Drums', at + e / 2, .3, SNARE, 112)
            s.note('Drums', at + e / 2, .2, HH if e % 2 else HH_OPEN, 70)
        if bar % 4 == 0:
            s.note('Drums', at, .6, CRASH, 104)
        p = motif[bar]
        s.note('Vibes', at, length - .2, p - 12, 62)
        s.note('Violin', at, length + .05, p, 86)
        s.note('Choir', at, length + .05, n('E4'), 80)
        s.note('Choir', at, length + .05, n('B4'), 76)
        at += length
    phrase_cc(s, 'Violin', 0, at, 80, 106)
    s.curve('Choir', [(0, 60), (at, 84)])
    parts = [('Guitar', 'guitar', 'guitar', -0.2, -6, 0.12), ('Bass', 'bass_el', 'bass_el', 0.0, -2, 0.08),
             ('Drums', 'drums', 'kit', 0.0, -2, 0.15), ('Vibes', 'vibes_bowed', 'lead', -0.3, -4, 0.45),
             ('Violin', 'violin_solo', 'lead', 0.2, 0, 0.35), ('Choir', 'choir_mixed', 'choir', 0.0, -4, 0.45)]
    return s, parts, 2.0, 1, at


# ══ La Guarida del Dragón ════════════════════════════════════════════════════════
def ceniza():
    """«Ceniza» (C harmonic minor, 4/4 at 66): a slow horn melody over trembling low strings and a
    low male choir; timpani rolls swell like a breath under the stone, a distant bell for the ruins."""
    s = Score(66, 4)
    motif = [('C4', 2), ('D4', 1), ('Eb4', 1), ('G4', 4), ('Ab4', 2), ('G4', 1), ('F4', 1), ('Eb4', 2), ('D4', 2),
             ('B3', 2), ('D4', 2), ('C4', 4)]
    chords = [['C2', 'G2'], ['C2', 'G2'], ['Ab1', 'Eb2'], ['F1', 'C2'], ['G1', 'D2'], ['G1', 'B1'], ['C2', 'G2'], ['C2', 'G2']]
    at = 0.0
    for name, d in motif:
        s.note('Horns', at, d + .04, n(name), 86)
        at += d
    phrase_cc(s, 'Horns', 0, 32, 72, 100)
    for bar, ch in enumerate(chords):
        b = bar * 4
        for x in ch:
            s.note('Low Strings', b, 4.05, n(x) + 12, 76)
        s.note('Basses', b, 4.05, n(ch[0]), 70)
        for x in (n(ch[0]) + 24, n(ch[1]) + 24):
            s.note('Choir', b, 4.05, x, 70)
        if bar % 2 == 1:
            s.note('Timp Roll', b + 2, 2, n('C2') if bar != 5 else n('G2'), 60)
    s.curve('Low Strings', [(0, 60), (16, 80), (32, 66)])
    s.curve('Choir', [(0, 50), (16, 70), (32, 58)])
    s.note('Bell', 0, 4, n('C3') + 12, 60)
    s.note('Bell', 16, 4, n('G2') + 12, 56)
    parts = [('Horns', 'horns', 'brass', -0.25, 0, 0.42), ('Low Strings', 'celli_trem', 'low', 0.25, -2, 0.30),
             ('Basses', 'contrabass_quiet', 'strings', 0.35, 2, 0.25), ('Choir', 'choir_large', 'choir', 0.0, -3, 0.45),
             ('Timp Roll', 'timp_roll', 'perc', -0.1, 4, 0.45), ('Bell', 'bells', 'bells', -0.3, -4, 0.60)]
    return s, parts, 3.0, 8, 4


def arrange_ruinas(motif, ostinato, low, glow, shift=0):
    """The «Ruinas de oro» arrangement (3/4 at 84) for any motif of (note, beats) adding up to whole
    bars: solo cello over a low harp ostinato, contrabassoon on `low` (root, and its neighbour every
    fourth bar), a soft frame drum and a bowed vibraphone glow alternating the two `glow` notes."""
    s = Score(84, 3)
    at = 0.0
    for name, d in motif:
        s.note('Cello', at, d + .04, n(name) + shift, 84)
        at += d
    total = at
    phrase_cc(s, 'Cello', 0, total, 70, 98)
    for k in range(int(total * 2)):
        s.note('Harp', k / 2, .5, ostinato[k % len(ostinato)], 60 + 8 * (k % 6 == 0))
    for bar in range(int(total // 3)):
        b = bar * 3
        s.note('Contrabassoon', b, 3.05, low[0] if bar % 4 != 2 else low[1], 70)
        s.note('Frame Drum', b, .5, 61, 64)
        s.note('Frame Drum', b + 2, .5, 64, 48)
        if bar % 2 == 0:
            s.note('Vibes', b, 3, glow[0] if bar % 4 == 0 else glow[1], 52)
    s.curve('Contrabassoon', [(0, 66), (total, 80)])
    parts = [('Cello', 'cello_solo', 'lead', 0.15, 0, 0.32), ('Harp', 'harp', 'harp', -0.4, 2, 0.40),
             ('Contrabassoon', 'contrabassoon', 'low', -0.1, -2, 0.30), ('Frame Drum', 'frame_drum', 'drums', 0.2, -4, 0.40),
             ('Vibes', 'vibes_bowed', 'bells', -0.3, 4, 0.50)]
    return s, parts, 2.8, 1, total


def ruinas_oro():
    """«Ruinas de oro» (E phrygian, 3/4 at 84): a solo cello mourns over a low harp ostinato in E with
    the ♭2; contrabassoon below, a bowed vibraphone glow in its dark middle register and a soft frame drum."""
    motif = [('E3', 1), ('F3', 1), ('G3', 1), ('B3', 3), ('C4', 1), ('B3', 1), ('A3', 1), ('F3', 2), ('E3', 1),
             ('E3', 1), ('G3', 1), ('B3', 1), ('D4', 3), ('C4', 1), ('B3', 1), ('F3', 1), ('E3', 3)]
    return arrange_ruinas(motif, m('E2 B2 E3 F3 B2 E3'), m('E1 F1'), m('G4 F4'), shift=12)


# The other Guarida motifs (recast in 3/4) and two new ones in the «Ruinas de oro» arrangement
def ruinas_ceniza():
    """Ceniza's horn melody, C harmonic minor."""
    motif = [('C4', 2), ('D4', 1), ('Eb4', 1), ('G4', 2), ('Ab4', 2), ('G4', 1), ('F4', 1), ('Eb4', 2), ('D4', 2), ('B3', 1),
             ('D4', 1), ('Eb4', 1), ('D4', 1), ('B3', 3), ('C4', 3)]
    return arrange_ruinas(motif, m('C2 G2 C3 Eb3 G2 C3'), m('C1 G1'), m('Eb4 D4'))


def ruinas_garras():
    """Garras de magma's horn call, D aeolian, answered a step higher."""
    motif = [('D4', 1), ('A4', 2), ('F4', 1.5), ('E4', .5), ('D4', 1), ('C4', 1), ('A3', 2), ('D4', 3),
             ('D4', 1), ('A4', 2), ('Bb4', 1.5), ('A4', .5), ('F4', 1), ('E4', 1), ('C#4', 2), ('D4', 3)]
    return arrange_ruinas(motif, m('D2 A2 D3 Eb3 A2 D3'), m('D1 Eb1'), m('F4 E4'))


def ruinas_corazon():
    """Corazón del volcán's choir line, C# Hungarian minor."""
    motif = [('C#4', 1), ('D#4', 1), ('E4', 1), ('G4', 2), ('G#4', 1), ('A4', 2), ('G#4', 1), ('E4', 3),
             ('G4', 1), ('E4', 1), ('D#4', 1), ('C#4', 2), ('D#4', 1), ('G4', 1.5), ('E4', 1.5), ('C#4', 3)]
    return arrange_ruinas(motif, m('C#2 G#2 C#3 D3 G#2 C#3'), m('C#1 D1'), m('E4 G4'))


def ruinas_tesoro():
    """New — «Tesoro maldito»: A minor lament that sinks a step at a time onto the leading tone."""
    motif = [('A4', 2), ('G4', 1), ('F4', 2), ('E4', 1), ('D4', 1), ('E4', 1), ('F4', 1), ('E4', 3),
             ('C5', 2), ('B4', 1), ('A4', 1), ('G#4', 1), ('F4', 1), ('E4', 1.5), ('F4', .5), ('D4', 1), ('A3', 3)]
    return arrange_ruinas(motif, m('A1 E2 A2 Bb2 E2 A2'), m('A1 Bb1'), m('E4 F4'))


def ruinas_huevo():
    """New — «El último huevo»: G Hungarian minor, a tender rise to the raised fourth — what the dragon guards."""
    motif = [('G4', 1), ('A4', 1), ('Bb4', 1), ('C#5', 3), ('D5', 1), ('C#5', 1), ('Bb4', 1), ('A4', 3),
             ('G4', 1), ('Bb4', 1), ('D5', 1), ('Eb5', 2), ('D5', 1), ('C#5', 1), ('Bb4', 1), ('A4', 1), ('G4', 3)]
    return arrange_ruinas(motif, m('G1 D2 G2 Ab2 D2 G2'), m('G1 Ab1'), m('Bb4 A4'), shift=-12)


def garras_magma():
    """«Garras de magma» (D aeolian, 4/4 at 104): the dragon walks — trombones and tuba stamp a
    marcato riff over war drums and toms; the horns call the motif; a low choir chants and dark
    cymbal swells smoke between the phrases."""
    s = Score(104, 4)
    riff = [(0, 'D2'), (.75, 'D2'), (1.5, 'A1'), (2, 'C2'), (3, 'D2'), (3.5, 'F2')]
    motif = [('D4', 1), ('A4', 1), ('F4', 1.5), ('E4', .5), ('D4', 2), ('C4', 1), ('A3', 1), ('D4', 4)]
    for bar in range(8):
        b = bar * 4
        for t, name in riff:
            p = n(name) + (2 if bar % 4 == 3 and t >= 3 else 0)
            s.note('Brass Riff', b + t, .35, p + 12, 104)
            s.note('Tuba', b + t, .35, p, 100)
            s.note('War Drums', b + t, .4, 62, 104 if t in (0, 1.5, 3) else 86)
        s.note('Toms', b + 3.5, .25, 62, 92)
        s.note('Toms', b + 3.75, .25, 64, 98)
        s.note('Chant', b, 4.05, n('D3'), 80)
        if bar % 4 == 3:
            s.note('Cymbal', b, 4, 64, 64)
    at = 0.0
    for rep in range(2):
        for name, d in motif:
            s.note('Horns', at, d + .04, n(name) + (12 if rep else 0) - (12 if not rep else 0), 96)
            at += d
    for t in ('Brass Riff', 'Tuba', 'Horns', 'Chant'):
        s.curve(t, [(0, 92), (32, 108)])
    parts = [('Brass Riff', 'trombones_marcato', 'brass', 0.25, -6, 0.30), ('Tuba', 'tuba_marcato', 'brass', 0.3, -4, 0.28),
             ('War Drums', 'bass_drum', 'drums', 0.0, -8, 0.35), ('Toms', 'tom', 'drums', 0.15, -4, 0.35),
             ('Horns', 'horns', 'brass', -0.3, 0, 0.40), ('Chant', 'choir_large', 'choir', 0.0, -4, 0.40),
             ('Cymbal', 'cymbal', 'bells', 0.2, -10, 0.55)]
    return s, parts, 2.4, 8, 4


def corazon_volcan():
    """«Corazón del volcán» (C# Hungarian minor, 4/4 at 92): the didgeridoo is the dragon's breath (it
    only sounds in C#), an organ pedal under it; the mixed choir sings the motif, low brass strikes
    answer it and a gong closes each phrase."""
    s = Score(92, 4)
    motif = [('C#4', 1), ('D#4', 1), ('E4', 1), ('G4', 1), ('G#4', 2), ('A4', 1), ('G#4', 1), ('E4', 2), ('G4', 1),
             ('E4', 1), ('C#4', 4)]
    at = 0.0
    for rep in range(2):
        for name, d in motif:
            s.note('Choir', at, d + .05, n(name) + (12 if rep else 0), 92)
            at += d
    total = at
    phrase_cc(s, 'Choir', 0, total, 80, 108)
    for bar in range(int(total // 4)):
        b = bar * 4
        s.note('Didgeridoo', b, 4.05, 61, 96)
        s.note('Organ Pedal', b, 4.05, n('C#2'), 76)
        for t in (0, 1.5, 3):
            s.note('Brass', b + t, .35, n('C#3') if bar % 2 == 0 else n('D3'), 100)
        s.note('Timpani', b, .5, n('C#2') + 12 if n('C#2') < 36 else n('C#2'), 96)
        if bar % 2 == 1:
            s.note('Gong', b + 3, 2, 61, 80)
    s.curve('Brass', [(0, 94), (total, 108)])
    parts = [('Choir', 'choir_mixed', 'choir', 0.0, 0, 0.42), ('Didgeridoo', 'didgeridoo', 'low', -0.1, -4, 0.30),
             ('Organ Pedal', 'organ_pedal', 'organ', 0.0, -8, 0.40), ('Brass', 'trombones_marcato', 'brass', 0.25, -6, 0.30),
             ('Timpani', 'timpani', 'perc', -0.1, 2, 0.38), ('Gong', 'gong', 'perc', 0.25, -4, 0.55)]
    return s, parts, 2.6, 1, total


SKETCHES = [
    ('laberinto-1-fractura', fractura), ('laberinto-2-ojo-del-vacio', ojo_vacio),
    ('laberinto-3-mente-colmena', mente_colmena), ('laberinto-4-mas-alla', mas_alla),
    ('dragon-1-ceniza', ceniza), ('dragon-2-ruinas-de-oro', ruinas_oro),
    ('dragon-3-garras-de-magma', garras_magma), ('dragon-4-corazon-del-volcan', corazon_volcan),
    ('ojo-1-fractura', ojo_fractura), ('ojo-2-mente-colmena', ojo_colmena), ('ojo-3-mas-alla', ojo_mas_alla),
    ('ojo-4-escalera-de-escher', ojo_escalera), ('ojo-5-susurro-estelar', ojo_susurro),
    ('ruinas-1-ceniza', ruinas_ceniza), ('ruinas-2-garras-de-magma', ruinas_garras),
    ('ruinas-3-corazon-del-volcan', ruinas_corazon), ('ruinas-4-tesoro-maldito', ruinas_tesoro),
    ('ruinas-5-el-ultimo-huevo', ruinas_huevo),
]


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    wanted = sys.argv[1:]
    clips = []
    for title, build in SKETCHES:
        if wanted and not any(title.startswith(w) for w in wanted):
            continue
        score, parts, reverb_s, bars, beats_per_bar = build()
        mid_path = os.path.join(BUILD, f'acto3-{title}.mid')
        score.save(mid_path)
        used = set(score.tracks)
        spec = render.MixSpec(
            midi=mid_path, out=os.path.join(BUILD, f'acto3-{title}.mp3'), bpm=score.bpm, beats_per_bar=beats_per_bar,
            bars=bars, parts=[render.Part(t, LIB[lib], bus=bus, pan=pan, gain_db=g, send=send)
                              for t, lib, bus, pan, g, send in parts if t in used],
            buses=BUS, reverb={'seconds': reverb_s, 'predelay': 0.025, 'damping': 0.55}, reverb_return_db=-4,
            target_lufs=-16.5, tail_seconds=3.5)
        r = render.render(spec)
        peaks = {k: round(float(v['pico_db']), 1) for k, v in r['parts'].items()}
        print(f'{title:30s} {r["seconds"]:5.1f} s  {r["lufs"]:6.1f} LUFS  presencia {r["bands_db"]["presencia 2.5-6k"]:6.1f}  picos {peaks}')
        clips.append((title, r['out'], r['seconds']))
    sr = config.SR
    for prefix in ('laberinto', 'dragon', 'ojo', 'ruinas'):
        if not any(title.startswith(prefix) for title, _, _ in clips):
            continue
        parts, t, stamps = [], 0.0, []
        with tempfile.TemporaryDirectory() as tmp:
            for title, c, secs in clips:
                if not title.startswith(prefix):
                    continue
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', c, os.path.join(tmp, 'x.wav')], check=True)
                y, _ = sf.read(os.path.join(tmp, 'x.wav'), dtype='float32')
                fade = np.linspace(1, 0, int(1.0 * sr))[:, None]
                y[-len(fade):] *= fade
                stamps.append((title, t))
                parts += [y, np.zeros((int(1.5 * sr), 2), dtype=np.float32)]
                t += len(y) / sr + 1.5
        out = os.path.join(BUILD, f'acto3-{prefix}-bocetos.mp3')
        mix.export_mp3(np.concatenate(parts), sr, out)
        print(out, ' · '.join(f'{ti} {int(st // 60)}:{int(st % 60):02d}' for ti, st in stamps))


if __name__ == '__main__':
    main()
