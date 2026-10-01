"""Tests for the sample-based music studio (SFZ sampler, MIDI input, mix and master).

Run with: scripts/musica/estudio/.venv/bin/python -m unittest discover scripts/musica/estudio/tests
"""
import os
import sys
import tempfile
import unittest

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from estudio import sfz, sampler, mix, midi_io  # noqa: E402

SR = 44100


def sine(freq, seconds, amp=0.5, sr=SR):
    t = np.arange(int(seconds * sr)) / sr
    return (amp * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def dominant_freq(x, sr=SR):
    x = x if x.ndim == 1 else x.mean(axis=1)
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    return np.fft.rfftfreq(len(x), 1 / sr)[np.argmax(spec)]


class Fixture(unittest.TestCase):
    """A tiny instrument: two round-robin A4 sines, a soft and a loud layer, one looped C5."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.dir, 'Samples', 'Soft Layer'))
        sf.write(os.path.join(self.dir, 'Samples', 'Soft Layer', 'a4 rr1.wav'), sine(440, 1.0, 0.2), SR)
        sf.write(os.path.join(self.dir, 'Samples', 'a4_loud_rr1.wav'), sine(440, 1.0, 0.8), SR)
        sf.write(os.path.join(self.dir, 'Samples', 'a4_loud_rr2.wav'), sine(440, 1.0, 0.8) * -1, SR)
        sf.write(os.path.join(self.dir, 'Samples', 'c5_loop.wav'), sine(523.25, 0.5, 0.5), SR)
        self.sfz_path = os.path.join(self.dir, 'test.sfz')
        with open(self.sfz_path, 'w') as f:
            f.write("""
// a comment
#define $REL 0.3
<control> default_path=Samples/
<global> ampeg_release=$REL amp_veltrack=100
<group> lokey=48 hikey=71 pitch_keycenter=69 lovel=1 hivel=64
<region> sample=Soft Layer/a4 rr1.wav
<group> lokey=48 hikey=71 pitch_keycenter=69 lovel=65 hivel=127 seq_length=2
<region> seq_position=1 sample=a4_loud_rr1.wav
<region> seq_position=2 sample=a4_loud_rr2.wav
<group> key=72 loop_mode=loop_continuous loop_start=0 loop_end=22049
<region> sample=c5_loop.wav
""")


class TestSfz(Fixture):
    def test_inheritance_defines_paths_and_keys(self):
        inst = sfz.load(self.sfz_path)
        self.assertEqual(len(inst.regions), 4)
        soft = inst.regions[0]
        self.assertEqual(soft.opcodes['ampeg_release'], '0.3')  # #define + <global> inherited
        self.assertTrue(soft.sample_path.endswith(os.path.join('Samples', 'Soft Layer', 'a4 rr1.wav')))
        self.assertTrue(os.path.exists(soft.sample_path))
        self.assertEqual((soft.lokey, soft.hikey, soft.keycenter), (48, 71, 69))
        loop = inst.regions[3]
        self.assertEqual((loop.lokey, loop.hikey, loop.keycenter), (72, 72, 72))  # key= sets all three

    def test_note_names(self):
        self.assertEqual(sfz.note_number('c4'), 60)
        self.assertEqual(sfz.note_number('f#3'), 54)
        self.assertEqual(sfz.note_number('Bb2'), 46)
        self.assertEqual(sfz.note_number('69'), 69)


class TestSampler(Fixture):
    def setUp(self):
        super().setUp()
        self.inst = sampler.Instrument(sfz.load(self.sfz_path), sr=SR)

    def test_region_choice_and_round_robin(self):
        soft = self.inst.pick(69, 40)
        self.assertIn('Soft Layer', soft.sample_path)
        first, second, third = (self.inst.pick(69, 100).sample_path for _ in range(3))
        self.assertNotEqual(first, second)
        self.assertEqual(first, third)

    def test_pitch_shift(self):
        out = self.inst.render_note(57, 100, 0.5)  # an octave below the A4 keycenter
        self.assertAlmostEqual(dominant_freq(out[: int(0.4 * SR)]), 220, delta=4)

    def test_velocity_makes_it_louder(self):
        quiet = np.abs(self.inst.render_note(69, 20, 0.3)).max()
        loud = np.abs(self.inst.render_note(69, 120, 0.3)).max()
        self.assertGreater(loud, quiet * 2)

    def test_release_fades_without_click(self):
        out = self.inst.render_note(69, 100, 0.2)
        self.assertGreaterEqual(len(out), int((0.2 + 0.3) * SR) - 2)  # duration + release
        self.assertLess(np.abs(out[-64:]).max(), 1e-3)
        self.assertLess(np.abs(out[0]).max(), 0.05)  # tiny attack ramp, no click either

    def test_loop_sustains_past_the_sample(self):
        out = self.inst.render_note(72, 100, 2.0)  # the sample is only 0.5 s long
        tramo = out[int(1.4 * SR): int(1.6 * SR)]
        self.assertGreater(np.sqrt(np.mean(tramo ** 2)), 0.05)

    def test_render_track_places_notes_and_expression(self):
        notes = [midi_io.Note(pitch=69, velocity=100, start=0.0, end=0.4), midi_io.Note(pitch=69, velocity=100, start=1.0, end=1.4)]
        expression = [(0.0, 127), (0.9, 30)]  # CC11 drops before the second note
        out = self.inst.render_track(notes, total_seconds=2.0, expression=expression)
        self.assertEqual(out.shape, (int(2.0 * SR), 2))
        first = np.abs(out[int(0.1 * SR): int(0.3 * SR)]).max()
        second = np.abs(out[int(1.1 * SR): int(1.3 * SR)]).max()
        self.assertGreater(first, second * 2)


class TestMidi(unittest.TestCase):
    def test_roundtrip(self):
        import mido
        path = os.path.join(tempfile.mkdtemp(), 'x.mid')
        mid = mido.MidiFile(ticks_per_beat=480)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr += [mido.MetaMessage('track_name', name='Violins', time=0), mido.MetaMessage('set_tempo', tempo=500000, time=0),
               mido.Message('control_change', control=11, value=90, time=0),
               mido.Message('note_on', note=64, velocity=80, time=0), mido.Message('note_off', note=64, velocity=0, time=480)]
        mid.save(path)
        song = midi_io.load(path)
        self.assertIn('Violins', song.tracks)
        n = song.tracks['Violins'].notes[0]
        self.assertEqual((n.pitch, n.velocity), (64, 80))
        self.assertAlmostEqual(n.end - n.start, 0.5, places=3)  # 480 ticks at 120 BPM
        self.assertEqual(song.tracks['Violins'].cc[11][0][1], 90)


class TestMix(unittest.TestCase):
    def test_loudness_and_true_peak(self):
        x = np.stack([sine(220, 4, 0.9), sine(330, 4, 0.9)], axis=1)
        out = mix.master(x, SR, target_lufs=-17.0, ceiling_dbtp=-1.0)
        self.assertAlmostEqual(mix.lufs(out, SR), -17.0, delta=0.7)
        self.assertLessEqual(mix.true_peak_db(out, SR), -0.9)

    def test_seamless_loop_folds_the_tail(self):
        loop_len = SR * 2
        x = np.zeros((loop_len + SR, 2), dtype=np.float32)
        x[: loop_len] = np.stack([sine(220, 2, 0.3)] * 2, axis=1)
        x[loop_len:] = np.linspace(0.3, 0, SR)[:, None] * np.sin(2 * np.pi * 220 * np.arange(SR) / SR)[:, None]  # reverb tail
        out = mix.fold_loop(x, loop_len)
        self.assertEqual(len(out), loop_len)
        self.assertGreater(np.abs(out[:100]).max(), 0.1)  # the tail now plays over the loop start
        self.assertLess(mix.seam_jump(out), 0.05)

    def test_highpass_is_12_db_per_octave(self):
        def gain(freq):
            x = np.stack([sine(freq, 1.0)] * 2, axis=1)
            return 20 * np.log10(np.abs(mix.process_bus(x, SR, highpass=400)[SR // 2:]).max() / 0.5)
        self.assertLess(gain(100), -20)    # two octaves below: about -24 dB (a 6 dB/oct filter gives -12)
        self.assertGreater(gain(1600), -1)  # two octaves above: untouched

    def test_mp3_export(self):
        path = os.path.join(tempfile.mkdtemp(), 'x.mp3')
        mix.export_mp3(np.stack([sine(220, 1, 0.3)] * 2, axis=1), SR, path)
        self.assertGreater(os.path.getsize(path), 5000)


class TestRender(Fixture):
    def test_midi_to_mastered_loop(self):
        import mido
        from estudio import render
        midi = os.path.join(self.dir, 'song.mid')
        mid = mido.MidiFile(ticks_per_beat=480)
        for name, notes in (('Melody', [69, 64, 67, 69]), ('Pad', [57])):
            tr = mido.MidiTrack()
            mid.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=name, time=0))
            if name == 'Melody':
                tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(120), time=0))
            length = 1920 // len(notes) * 2
            for n in notes:
                tr += [mido.Message('note_on', note=n, velocity=90, time=0), mido.Message('note_off', note=n, velocity=0, time=length)]
        mid.save(midi)
        out = os.path.join(self.dir, 'song.mp3')
        spec = render.MixSpec(
            midi=midi, out=out, bpm=120, beats_per_bar=4, bars=2, target_lufs=-18,
            parts=[render.Part('Melody', self.sfz_path, bus='lead', pan=-0.2),
                   render.Part('Pad', self.sfz_path, bus='pads', gain_db=-6, send=0.4)],
            buses={'lead': {'highpass': 120}, 'pads': {'highpass': 80}})
        report = render.render(spec)
        self.assertTrue(os.path.exists(out))
        self.assertEqual(report['loop_samples'], 4 * SR)  # 2 bars of 4 beats at 120 BPM
        self.assertAlmostEqual(report['lufs'], -18, delta=0.8)
        self.assertLessEqual(report['true_peak_db'], -0.9)
        self.assertLess(report['seam_jump'], 0.05)
        self.assertEqual(set(report['parts']), {'Melody', 'Pad'})

    def test_report_measures_loudness_per_part_and_per_section(self):
        import mido
        from estudio import render
        midi = os.path.join(self.dir, 'sections.mid')
        mid = mido.MidiFile(ticks_per_beat=480)
        for name, vel, wait in (('Loud', 120, 0), ('Soft', 30, 1920)):  # bar 1 loud, bar 2 soft
            tr = mido.MidiTrack()
            mid.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=name, time=0))
            if name == 'Loud':
                tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(120), time=0))
            tr += [mido.Message('note_on', note=69, velocity=vel, time=wait), mido.Message('note_off', note=69, velocity=0, time=1800)]
        mid.save(midi)
        spec = render.MixSpec(
            midi=midi, out=os.path.join(self.dir, 'sections.mp3'), bpm=120, beats_per_bar=4, bars=2,
            parts=[render.Part('Loud', self.sfz_path, send=0), render.Part('Soft', self.sfz_path, send=0)],
            sections={'uno': (1, 1), 'dos': (2, 2)}, reverb_return_db=-60)
        report = render.render(spec)
        self.assertEqual(set(report['sections_lufs']), {'uno', 'dos'})
        self.assertGreater(report['sections_lufs']['uno'], report['sections_lufs']['dos'] + 6)
        self.assertGreater(report['parts']['Loud']['lufs'], report['parts']['Soft']['lufs'] + 6)
        self.assertIn('pico_db', report['parts']['Soft'])

    def _tone_spec(self, name, bus, reverb_eq=None):
        import mido
        from estudio import render
        midi = os.path.join(self.dir, 'tone.mid')
        if not os.path.exists(midi):
            mid = mido.MidiFile(ticks_per_beat=480)
            tr = mido.MidiTrack()
            mid.tracks.append(tr)
            tr += [mido.MetaMessage('track_name', name='Pad', time=0), mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(120), time=0),
                   mido.Message('note_on', note=57, velocity=100, time=0), mido.Message('note_off', note=57, velocity=0, time=1800)]
            mid.save(midi)
        extra = {'reverb_eq': reverb_eq} if reverb_eq is not None else {}
        return render.MixSpec(midi=midi, out=os.path.join(self.dir, name + '.mp3'), bpm=120, beats_per_bar=4, bars=2,
                              parts=[render.Part('Pad', self.sfz_path, bus='b', send=0.5)], buses={'b': bus},
                              reverb_return_db=0, **extra)

    def test_sends_leave_after_the_bus_eq(self):
        from estudio import render
        open_bus = render.render(self._tone_spec('open', {'highpass': 20}))
        thin_bus = render.render(self._tone_spec('thin', {'highpass': 2000}))  # the 220 Hz tone almost vanishes
        # the hall hears what the bus lets through, so the wet/dry balance does not change
        self.assertAlmostEqual(thin_bus['wet_dry_lu'], open_bus['wet_dry_lu'], delta=3)

    def test_reverb_return_eq(self):
        from estudio import render
        plain = render.render(self._tone_spec('plain', {'highpass': 20}))
        thin = render.render(self._tone_spec('thin_return', {'highpass': 20}, reverb_eq={'highpass': 2000}))
        self.assertLess(thin['wet_dry_lu'], plain['wet_dry_lu'] - 15)

    def test_automation_rides_a_part_level_by_bar(self):
        from estudio import render
        bar = 2.0  # seconds
        curve = render.automation_curve([(1, 0.0), (2, 0.0), (2.5, -12.0)], int(4 * SR), SR, bar)
        self.assertAlmostEqual(curve[int(1.0 * SR)], 1.0, places=4)               # bar 1: unity
        self.assertAlmostEqual(curve[int(3.5 * SR)], 10 ** (-12 / 20), places=4)  # held after the last point
        self.assertAlmostEqual(curve[int(2.5 * SR)], 10 ** (-6 / 20), places=2)   # halfway: dB interpolated
        self.assertTrue(np.all(np.diff(curve) <= 1e-7))                           # smooth ramp, no steps up

    def test_automation_step_keeps_the_written_order(self):
        from estudio import render
        curve = render.automation_curve([(1, 0.0), (2, 0.0), (2, -12.0)], int(4 * SR), SR, 2.0)  # a jump at bar 2
        self.assertAlmostEqual(curve[int(1.0 * SR)], 1.0, places=4)
        self.assertAlmostEqual(curve[int(3.0 * SR)], 10 ** (-12 / 20), places=4)

    def test_render_applies_part_automation(self):
        import mido
        from estudio import render
        midi = os.path.join(self.dir, 'ride.mid')
        mid = mido.MidiFile(ticks_per_beat=480)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr += [mido.MetaMessage('track_name', name='Pad', time=0), mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(120), time=0)]
        for wait in (0, 120):  # one note per bar, same velocity
            tr += [mido.Message('note_on', note=69, velocity=100, time=wait), mido.Message('note_off', note=69, velocity=0, time=1800)]
        mid.save(midi)
        common = dict(midi=midi, bpm=120, beats_per_bar=4, bars=2, reverb_return_db=-60, master_bus={'highpass': 28},  # no glue comp
                      sections={'uno': (1, 1), 'dos': (2, 2)})
        flat = render.render(render.MixSpec(out=os.path.join(self.dir, 'flat.mp3'), parts=[render.Part('Pad', self.sfz_path, send=0)], **common))
        ride = render.render(render.MixSpec(out=os.path.join(self.dir, 'ride.mp3'), **common, parts=[
            render.Part('Pad', self.sfz_path, send=0, automation=[(1.9, 0.0), (2.0, -10.0)])]))
        drop = lambda r: r['sections_lufs']['uno'] - r['sections_lufs']['dos']
        self.assertAlmostEqual(drop(ride) - drop(flat), 10, delta=1.5)


@unittest.skipUnless(os.path.isdir(os.path.join(os.path.expanduser('~/WonderBits/personal/audio-samples'), 'VSCO-2-CE')),
                     'the VSCO 2 CE library is not installed')
class TestLibrary(unittest.TestCase):
    def test_every_vsco_instrument_resolves_its_samples(self):
        import glob
        from estudio import config
        paths = glob.glob(config.library('VSCO-2-CE', '*.sfz'))
        self.assertGreaterEqual(len(paths), 70)
        for p in paths:
            inst = sfz.load(p)
            self.assertTrue(inst.regions, p)
            self.assertTrue(all(os.path.exists(r.sample_path) for r in inst.regions), p)


if __name__ == '__main__':
    unittest.main()
