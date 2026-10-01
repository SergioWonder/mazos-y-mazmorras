"""Short leitmotif candidates for the soundtrack, all played the same way (solo horn over
violas, cellos and harp) so they can be compared fairly. Each one is rendered on its own
and in a compilation with a short gap between them.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/demos.py"""
from __future__ import annotations

import os
import sys

import mido
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import config, mix, render  # noqa: E402

BUILD = os.path.join(HERE, 'build')
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def n(name: str) -> int:
    """'F#4' → MIDI number (C4 = 60)."""
    acc = name.count('#') - name.count('b')
    return (int(name[-1]) + 1) * 12 + NOTE[name[0]] + acc


# Each motif: (title, character, bpm, beats per bar, melody [(note, beats)], chords per bar [names])
MOTIFS = [
    ('0-actual', 'el leitmotiv actual (referencia): D A | B A F# | G F# E | D', 84, 4,
     [('D4', 2), ('A4', 2), ('B4', 1.5), ('A4', .5), ('F#4', 2), ('G4', 1.5), ('F#4', .5), ('E4', 2), ('D4', 4)],
     ['D', 'Bm', 'Em7', 'D']),
    ('1-juramento', 'heroico: salto de quinta y ascenso por grados hasta la tónica aguda', 84, 4,
     [('D4', 1.5), ('A4', .5), ('A4', 2), ('B4', 1), ('C#5', 1), ('D5', 2), ('A4', 1.5), ('F#4', .5), ('G4', 2), ('A4', 4)],
     ['D', 'G', 'Em7', 'A']),
    ('2-senda', 'aventurero: ritmo con puntillo, como una marcha alegre', 96, 4,
     [('D4', 1.5), ('E4', .5), ('F#4', 1), ('A4', 1), ('G4', 1.5), ('F#4', .5), ('E4', 1), ('D4', 1),
      ('B3', 1), ('D4', 1), ('G4', 1), ('F#4', 1), ('E4', 3), ('A3', 1)],
     ['D', 'G', 'Bm', 'A7']),
    ('3-brasas', 'menor y misterioso: giro de semitono y sexta menor, para la oscuridad', 72, 4,
     [('D4', 1), ('F4', 1), ('E4', 1), ('A3', 1), ('D4', 1), ('F4', 1), ('G4', 1), ('A4', 1),
      ('Bb4', 2), ('A4', 1), ('E4', 1), ('D4', 4)],
     ['Dm', 'Dm', 'Gm', 'A7']),
    ('4-estrella', 'mágico: modo lidio (sol sostenido) y arpegio que sube como un hechizo', 80, 4,
     [('D4', 1), ('F#4', 1), ('A4', 1), ('G#4', 1), ('A4', 3), ('E4', 1), ('F#4', 1), ('G#4', 1), ('B4', 1), ('A4', 1), ('D4', 4)],
     ['D', 'E/D', 'D', 'D']),
    ('5-camino', 'folk en 3/4: una canción de taberna sencilla y fácil de silbar', 120, 3,
     [('A3', 1), ('D4', 1), ('E4', 1), ('F#4', 2), ('E4', 1), ('D4', 1), ('B3', 1), ('A3', 1), ('D4', 3),
      ('F#4', 1), ('G4', 1), ('A4', 1), ('B4', 2), ('A4', 1), ('F#4', 1), ('E4', 1), ('C#4', 1), ('D4', 3)],
     ['D', 'D', 'G', 'D', 'D', 'G', 'A7', 'D']),
    ('6-corona', 'noble: llamada de fanfarria con notas repetidas y caída por terceras', 76, 4,
     [('D4', .5), ('D4', .5), ('A4', 3), ('F#4', .5), ('D4', .5), ('B4', 3), ('G4', 1), ('E4', 1), ('C#5', 2), ('D5', 4)],
     ['D', 'G', 'A7', 'D']),
    ('7-sombra', 'pícaro y ambiguo: cromatismo y tritono, un tema que esconde algo', 92, 4,
     [('D4', .5), ('E4', .5), ('F4', 1), ('G#4', 1.5), ('A4', .5), ('F4', 1), ('E4', 1), ('C#4', 2),
      ('D4', .5), ('F4', .5), ('A4', 1), ('Bb4', 1), ('A4', 1), ('D4', 4)],
     ['Dm', 'A7', 'Dm', 'Dm']),
]

CHORDS = {
    'D': ['D3', 'F#3', 'A3'], 'Bm': ['B2', 'F#3', 'D4'], 'Em7': ['E3', 'G3', 'D4'], 'G': ['G2', 'D3', 'B3'],
    'A': ['A2', 'E3', 'C#4'], 'A7': ['A2', 'G3', 'C#4'], 'Dm': ['D3', 'F3', 'A3'], 'Gm': ['G2', 'D3', 'Bb3'],
    'E/D': ['D3', 'G#3', 'B3'],
}


def build_midi(motif, path: str) -> int:
    title, _, bpm, beats, melody, chords = motif
    bars = len(chords)
    mid = mido.MidiFile(ticks_per_beat=480)

    def track(name, events, first=False):
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name, time=0))
        if first:
            tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
        msgs = []
        for at, dur, note, vel in events:
            msgs.append((int(at * 480), 1, mido.Message('note_on', note=note, velocity=vel)))
            msgs.append((int((at + dur) * 480), 0, mido.Message('note_off', note=note, velocity=0)))
        msgs.sort(key=lambda m: (m[0], m[1]))
        t = 0
        for at, _, m in msgs:
            m.time = at - t
            t = at
            tr.append(m)

    mel, at = [], 0.0
    for i, (note, dur) in enumerate(melody):
        shape = 78 + int(14 * np.sin(np.pi * at / (bars * beats)))  # the phrase swells to its middle
        mel.append((at, dur + 0.03, n(note), shape))  # tiny legato overlap
        at += dur
    track('Horn', mel, first=True)
    pad, bass, harp = [], [], []
    for b, name in enumerate(chords):
        notes = [n(x) for x in CHORDS[name]]
        start = b * beats
        bass.append((start, beats, notes[0] - 12 if notes[0] >= 45 else notes[0], 64))
        pad += [(start, beats, x, 52) for x in notes[1:]]
        arp = notes + [notes[1] + 12, notes[2] + 12]
        steps = int(beats * 2)
        harp += [(start + k * 0.5, 0.5, arp[k % len(arp)] + 12, 50 + 6 * (k % 2)) for k in range(steps)]
    track('Violas', pad)
    track('Cellos', bass)
    track('Harp', harp)
    mid.save(path)
    return bars + 1  # one bar of air at the end


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    clips = []
    for motif in MOTIFS:
        title, desc, bpm, beats = motif[:4]
        mid_path = os.path.join(BUILD, f'{title}.mid')
        bars = build_midi(motif, mid_path)
        spec = render.MixSpec(
            midi=mid_path, out=os.path.join(BUILD, f'{title}.mp3'), bpm=bpm, beats_per_bar=beats, bars=bars,
            parts=[render.Part('Horn', 'VSCO-2-CE/FHornSus.sfz', bus='horn', pan=-0.25, gain_db=-9, send=0.38),
                   render.Part('Violas', 'VSCO-2-CE/ViolaEnsSusVib.sfz', bus='strings', pan=0.15, gain_db=-3, send=0.3),
                   render.Part('Cellos', 'VSCO-2-CE/CelloEnsSusVib.sfz', bus='strings', pan=0.3, gain_db=-1, send=0.25),
                   render.Part('Harp', 'VSCO-2-CE/Harp.sfz', bus='harp', pan=-0.45, gain_db=5, send=0.35)],
            buses={'strings': {'highpass': 55, 'peaks': [(300, -2, 1)]}, 'horn': {'highpass': 90}, 'harp': {'highpass': 120}},
            target_lufs=-17, tail_seconds=3.0)
        report = render.render(spec)
        print(f'{title:14s} {report["seconds"]:5.1f} s  {report["lufs"]:6.1f} LUFS  — {desc}')
        clips.append(report['out'])
    # compilation: every motif one after another with a short gap
    import subprocess
    import tempfile
    import soundfile as sf
    sr = config.SR
    parts = []
    with tempfile.TemporaryDirectory() as tmp:
        for c in clips:
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', c, os.path.join(tmp, 'x.wav')], check=True)
            y, _ = sf.read(os.path.join(tmp, 'x.wav'), dtype='float32')
            fade = np.linspace(1, 0, int(0.6 * sr))[:, None]
            y[-len(fade):] *= fade
            parts += [y, np.zeros((int(1.2 * sr), 2), dtype=np.float32)]
    mix.export_mp3(np.concatenate(parts), sr, os.path.join(BUILD, 'leitmotivs-todos.mp3'))
    print('recopilatorio:', os.path.join(BUILD, 'leitmotivs-todos.mp3'))


if __name__ == '__main__':
    main()
