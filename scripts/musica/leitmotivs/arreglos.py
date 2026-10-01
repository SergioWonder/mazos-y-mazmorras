"""Leitmotifs 3 («Brasas») and 7 («Sombra») in three arrangements each: gloomy, horror and
fantasy/magic, all with a choir in the background. The motif plays twice (8 bars), the
second time re-orchestrated. Rendered one by one and as a compilation.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/arreglos.py"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

import mido
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)

from estudio import config, mix, render  # noqa: E402
from demos import MOTIFS, n  # noqa: E402

BUILD = os.path.join(HERE, 'build')
SSO = 'sso/Sonatina Symphonic Orchestra/'
LIB = {
    'choir_large': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'choir_mixed': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'bass_clarinet': SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz',
    'alto_flute': SSO + 'Woodwinds - Performance/Alto Flute Solo Sustain (looped).sfz',
    'violin_solo': SSO + 'Strings - Performance/Violin Solo 1 Sustain (looped).sfz',
    'violins_harm': SSO + 'Strings - Performance/1st Violins Harmonics.sfz',
    'strings_trem': SSO + 'Strings - Performance/All Strings Tremolo.sfz',
    'celli_col_legno': SSO + 'Strings - Performance/Celli Col Legno.sfz',
    'celeste': SSO + 'Percussion/Celeste.sfz',
    'harp': SSO + 'Concert Harp.sfz',
    'tamtam': SSO + 'Percussion/Cymbals & Tamtam.sfz',
    'cellos_quiet': 'VSCO-2-CE/CelloEnsSusVib-Quiet.sfz',
    'basses_quiet': 'VSCO-2-CE/ContrabassSusVB-Quiet.sfz',
    'violins_quiet': 'VSCO-2-CE/ViolinEnsSusVib-Quiet.sfz',
    'timp_roll': 'VSCO-2-CE/TimpaniRolls.sfz',
    'timpani': 'VSCO-2-CE/Timpani.sfz',
    'glock': 'VSCO-2-CE/Glockenspiel.sfz',
    'glasses': 'VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz',
    'vibes_bowed': 'VCSL/Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz',
    'piano': 'VCSL/Chordophones/Zithers/Upright Piano, Knight.sfz',
}
TAMTAM = 57

# chord tones (root position, low) per chord name, plus a darker and a brighter colour
CH = {
    'Dm': ['D3', 'F3', 'A3'], 'Gm': ['G2', 'D3', 'Bb3'], 'A7': ['A2', 'G3', 'C#4'], 'Bb': ['Bb2', 'F3', 'D4'],
    'Dm9': ['D3', 'F3', 'E4'], 'Bbmaj7': ['Bb2', 'A3', 'D4'], 'Gm9': ['G2', 'Bb3', 'A4'], 'A7sus': ['A2', 'D4', 'G4'],
}


class Score:
    def __init__(self, bpm: int, beats: int):
        self.bpm, self.beats = bpm, beats
        self.tracks: dict[str, list] = {}
        self.cc: dict[str, list] = {}

    def note(self, track, beat, dur, note, vel):
        self.tracks.setdefault(track, []).append((beat, dur, note if isinstance(note, int) else n(note), vel))

    def curve(self, track, points):
        self.cc.setdefault(track, []).extend(points)

    def save(self, path):
        mid = mido.MidiFile(ticks_per_beat=480)
        for i, (name, events) in enumerate(self.tracks.items()):
            tr = mido.MidiTrack()
            mid.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=name, time=0))
            if i == 0:
                tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm), time=0))
            msgs = [(int(b * 480), 2, mido.Message('control_change', control=1, value=int(v))) for b, v in self.cc.get(name, [])]
            for b, d, note, vel in events:
                msgs.append((int(b * 480), 1, mido.Message('note_on', note=note, velocity=int(vel))))
                msgs.append((int((b + d) * 480), 0, mido.Message('note_off', note=note, velocity=0)))
            msgs.sort(key=lambda m: (m[0], m[1]))
            t = 0
            for at, _, m in msgs:
                m.time = at - t
                t = at
                tr.append(m)
        mid.save(path)


def melody(motif, start_beat=0.0, shift=0):
    """The motif's notes as (beat, dur, midi) from start_beat, transposed `shift` semitones."""
    out, at = [], start_beat
    for name, dur in motif[4]:
        out.append((at, dur, n(name) + shift))
        at += dur
    return out


def play(score, track, notes, vel, legato=0.04, accent=None):
    for i, (b, d, p) in enumerate(notes):
        v = vel(i, b) if callable(vel) else vel
        score.note(track, b, d + legato, p, v)


def phrase_cc(score, track, start, beats, lo, hi):
    """A CC1 arch over a phrase: lo → hi in the middle → lo."""
    steps = int(beats * 2)
    score.curve(track, [(start + k / 2, lo + (hi - lo) * np.sin(np.pi * k / steps)) for k in range(steps + 1)])


# ── the three arrangements ────────────────────────────────────────────────────
def sombrio(motif, chords):
    """Gloomy: bass clarinet over low strings and a distant male choir; then the choir
    takes the tune with the bass clarinet underneath."""
    beats = motif[3]
    s = Score(66, beats)
    span = len(chords) * beats
    for rep in range(2):
        o = rep * span
        mel = melody(motif, o, -12 if rep == 0 else 0)
        if rep == 0:
            play(s, 'Bass Clarinet', mel, 80)
            phrase_cc(s, 'Bass Clarinet', o, span, 62, 92)
        else:
            play(s, 'Choir Tune', mel, 80)
            phrase_cc(s, 'Choir Tune', o, span, 58, 88)
            play(s, 'Bass Clarinet', melody(motif, o, -12), 70)
            phrase_cc(s, 'Bass Clarinet', o, span, 50, 70)
        for b, ch in enumerate(chords):
            notes = [n(x) for x in CH[ch]]
            at = o + b * beats
            s.note('Basses', at, beats + .1, notes[0] - 12, 70)
            s.note('Cellos', at, beats + .1, notes[0], 62)
            s.note('Cellos', at, beats + .1, notes[1], 56)
            for x in notes:  # the far choir hums the chord, lower and darker
                s.note('Choir Pad', at, beats + .05, max(43, x), 70)
            s.note('Harp', at, 1, notes[0] - 12, 58)
        s.curve('Choir Pad', [(o, 45), (o + span / 2, 66), (o + span, 48)])
        s.note('Timpani Roll', o + span - beats, beats, 38, 52)
    s.note('Tam-tam', 0, 4, TAMTAM, 48)
    s.note('Tam-tam', span, 4, TAMTAM, 56)
    parts = [('Bass Clarinet', 'bass_clarinet', 'lead', -0.1, 0, 0.30), ('Choir Tune', 'choir_large', 'choir', 0.0, -2, 0.40),
             ('Choir Pad', 'choir_large', 'choir', 0.0, 0, 0.45), ('Cellos', 'cellos_quiet', 'strings', 0.3, 3, 0.30),
             ('Basses', 'basses_quiet', 'strings', 0.35, 4, 0.30), ('Harp', 'harp', 'harp', -0.45, 4, 0.40),
             ('Timpani Roll', 'timp_roll', 'perc', -0.1, 10, 0.45), ('Tam-tam', 'tamtam', 'perc', 0.25, -6, 0.55)]
    return s, parts, 2.8


def terror(motif, chords, lead):
    """Horror: a glassy, inhuman voice (wine glasses or bowed vibraphone) over a low string
    tremolo cluster, high harmonics a semitone apart, a heartbeat on the timpani and a
    whispering choir that takes the tune the second time, a semitone clash underneath."""
    beats = motif[3]
    s = Score(58, beats)
    span = len(chords) * beats
    for rep in range(2):
        o = rep * span
        mel = melody(motif, o, 12)
        play(s, 'Glass Lead', mel, lambda i, b: 58 + (i % 3) * 6)
        if rep == 1:
            play(s, 'Choir Tune', melody(motif, o, 0), 70)
            phrase_cc(s, 'Choir Tune', o, span, 38, 64)
            play(s, 'Choir Shadow', melody(motif, o, -1), 60)  # the same tune a semitone below, very far
            phrase_cc(s, 'Choir Shadow', o, span, 30, 48)
        for b in range(len(chords)):
            at = o + b * beats
            s.note('Tremolo Cluster', at, beats + .1, n('D2'), 70)
            s.note('Tremolo Cluster', at, beats + .1, n('Eb2'), 70)
            s.note('Harmonics', at, beats + .1, n('A5'), 60)
            s.note('Harmonics', at, beats + .1, n('Bb5'), 60)
            for k in (0, 0.6):  # heartbeat: lub-dub
                s.note('Heartbeat', at + k, .4, n('D2'), 70 if k == 0 else 54)
            if b % 2 == 1:
                s.note('Col Legno', at + 2.5, .2, n('A2'), 64)
                s.note('Col Legno', at + 2.75, .2, n('Bb2'), 60)
        s.curve('Tremolo Cluster', [(o, 30), (o + span * .75, 82), (o + span, 40)])
        s.curve('Harmonics', [(o, 35), (o + span, 70)])
        s.note('Piano Cluster', o, 2, n('D1'), 96)
        s.note('Piano Cluster', o, 2, n('Eb1'), 92)
        s.note('Piano Cluster', o, 2, n('A1'), 88)
        s.note('Tam-tam', o + span - 2 * beats, 2 * beats, TAMTAM, 62)
    lead_lib = 'glasses' if lead == 'glasses' else 'vibes_bowed'
    parts = [('Glass Lead', lead_lib, 'lead', 0.15, 2, 0.45), ('Choir Tune', 'choir_mixed', 'choir', 0.0, 5, 0.50),
             ('Choir Shadow', 'choir_large', 'choir', -0.2, 2, 0.65), ('Tremolo Cluster', 'strings_trem', 'low', 0.2, -2, 0.35),
             ('Harmonics', 'violins_harm', 'high', -0.35, 2, 0.40), ('Heartbeat', 'timpani', 'perc', -0.1, 22, 0.35),
             ('Col Legno', 'celli_col_legno', 'perc', 0.3, 4, 0.30), ('Piano Cluster', 'piano', 'low', -0.2, -9, 0.50),
             ('Tam-tam', 'tamtam', 'perc', 0.25, -6, 0.60)]
    return s, parts, 3.2


def fantasia(motif, chords):
    """Fantasy and magic: celesta and alto flute in octaves over rippling harp and a soft
    choir halo; the second time the solo violin sings it and the celesta answers above,
    with high harmonics, glockenspiel sparkles and wine glasses on the long notes."""
    beats = motif[3]
    s = Score(84, beats)
    span = len(chords) * beats
    bright = {'Dm': 'Dm9', 'Gm': 'Gm9', 'A7': 'A7sus', 'Bb': 'Bbmaj7'}
    for rep in range(2):
        o = rep * span
        if rep == 0:
            play(s, 'Celeste', melody(motif, o, 12), 72)
            play(s, 'Alto Flute', melody(motif, o, 0), 76)
            phrase_cc(s, 'Alto Flute', o, span, 62, 90)
        else:
            play(s, 'Violin Solo', melody(motif, o, 12), 80)
            phrase_cc(s, 'Violin Solo', o, span, 64, 96)
            for b, d, p in melody(motif, o, 24)[::2]:  # the celesta answers every other note, two octaves up
                if p <= 100:
                    s.note('Celeste', b + d / 2, d / 2, p, 60)
        for b, ch in enumerate(chords):
            tones = [n(x) for x in CH[bright.get(ch, ch)]]
            at = o + b * beats
            arp = [tones[0], tones[1] + 12, tones[2] + 12, tones[1] + 24, tones[2] + 24, tones[1] + 12]
            for k in range(beats * 2):
                s.note('Harp', at + k / 2, .5, arp[k % len(arp)], 52 + 8 * (k % 2 == 0))
            for x in tones:
                s.note('Choir', at, beats + .05, max(55, x + 12), 70)
            s.note('Harmonics', at, beats + .1, tones[0] + 36, 50)
            s.note('Cellos', at, beats + .1, tones[0], 56)
        s.curve('Choir', [(o, 52), (o + span / 2, 74), (o + span, 56)])
        s.curve('Harmonics', [(o, 40), (o + span / 2, 58), (o + span, 42)])
        for b in range(len(chords)):
            s.note('Glockenspiel', o + b * beats + beats - 1, 1, n('A6') if b % 2 else n('D7'), 44)
        s.note('Glasses', o + span - beats, beats, n('A5'), 62)
    parts = [('Celeste', 'celeste', 'bells', 0.3, 2, 0.35), ('Alto Flute', 'alto_flute', 'lead', -0.15, 0, 0.35),
             ('Violin Solo', 'violin_solo', 'lead', -0.2, -1, 0.30), ('Harp', 'harp', 'harp', -0.4, -1, 0.40),
             ('Choir', 'choir_mixed', 'choir', 0.0, 0, 0.45), ('Harmonics', 'violins_harm', 'high', 0.35, 4, 0.45),
             ('Cellos', 'cellos_quiet', 'strings', 0.3, 0, 0.30), ('Glockenspiel', 'glock', 'bells', 0.25, 22, 0.45),
             ('Glasses', 'glasses', 'bells', -0.3, 2, 0.55)]
    return s, parts, 2.6


BUS = {
    'lead': {'highpass': 90, 'peaks': [(3200, -2, 1.2)]}, 'choir': {'highpass': 110, 'peaks': [(300, -2, 1), (3000, -3, 1)]},
    'strings': {'highpass': 30, 'peaks': [(280, -2, 1)]}, 'low': {'highpass': 30, 'peaks': [(300, -2, 1)]},
    'high': {'highpass': 400, 'high_shelf': (6000, -4)}, 'harp': {'highpass': 70}, 'bells': {'highpass': 300, 'high_shelf': (7000, -3)},
    'perc': {'highpass': 35, 'peaks': [(3500, -4, 1)]},
}


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    by_title = {m[0]: m for m in MOTIFS}
    jobs = []
    for key, label in (('3-brasas', 'brasas'), ('7-sombra', 'sombra')):
        motif = by_title[key]
        chords = motif[5]
        jobs += [(f'{label}-sombrio', sombrio(motif, chords)),
                 (f'{label}-terror', terror(motif, chords, 'glasses' if label == 'brasas' else 'vibes')),
                 (f'{label}-fantasia', fantasia(motif, chords))]
    clips = []
    for title, (score, parts, reverb_s) in jobs:
        mid_path = os.path.join(BUILD, f'{title}.mid')
        score.save(mid_path)
        bars = 2 * len(next(m for m in MOTIFS if m[0].endswith(title.split('-')[0]))[5]) + 1
        spec = render.MixSpec(
            midi=mid_path, out=os.path.join(BUILD, f'{title}.mp3'), bpm=score.bpm, beats_per_bar=score.beats, bars=bars,
            parts=[render.Part(t, LIB[lib], bus=bus, pan=pan, gain_db=g, send=send) for t, lib, bus, pan, g, send in parts],
            buses=BUS, reverb={'seconds': reverb_s, 'predelay': 0.03, 'damping': 0.5}, reverb_return_db=-3,
            target_lufs=-17, tail_seconds=4.0)
        r = render.render(spec)
        loud = {k: v['pico_db'] for k, v in r['parts'].items()}
        print(f'{title:18s} {r["seconds"]:5.1f} s  {r["lufs"]:6.1f} LUFS  picos {loud}')
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
    mix.export_mp3(np.concatenate(parts), sr, os.path.join(BUILD, 'leitmotivs-arreglos.mp3'))
    print('recopilatorio:', os.path.join(BUILD, 'leitmotivs-arreglos.mp3'))


if __name__ == '__main__':
    main()
