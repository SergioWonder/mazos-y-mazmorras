"""Synth instruments made by code, for the tracks that need sounds no acoustic library has
(the Contemplador's metalcore: supersaws, sub drops, a vocal-fry growl, risers and impacts).

`build(folder)` writes multisampled WAVs and one SFZ per instrument, which the sampler then plays
like any other library. Everything is generated from numbers, so the folder can be rebuilt at any time:

    scripts/musica/estudio/.venv/bin/python -m estudio.synths   # → <external disk>/audio-samples/dracs-synths

Instruments (SFZ name → use):
- supersaw-lead / supersaw-pad: seven detuned saws, tops tamed; CC1 opens the low-pass filter.
- pluck: a dark saw pluck whose upper harmonics die first (arpeggios); pluck-sweep: the same behind a
  low-pass that CC1 opens (filter sweeps).
- sub-bass: a sine with a little saturation; sub-drop: an 808-style boom that falls an octave.
- growl: a formant voice with period doubling and jitter, the creak of vocal fry, distorted.
- fx: unpitched one-shots — 60 riser, 61 downlifter, 62 impact, 63 reverse swell.
"""
from __future__ import annotations

import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, resample_poly, sosfilt

SR = 44100
PITCHED_KEYS = list(range(24, 85, 3))
SUB_KEYS = list(range(24, 61, 3))
GROWL_KEYS = list(range(36, 67, 3))


def freq(key: float) -> float:
    return 440.0 * 2 ** ((key - 69) / 12)


def _lowpass(x, cutoff, order=4, sr=SR):
    return sosfilt(butter(order, cutoff / (sr / 2), output='sos'), x)


def _saw_from_phase(phase, oversample=4):
    """Naive saw computed at `oversample`× the rate, then decimated (keeps aliasing down)."""
    return resample_poly(2 * (phase % 1.0) - 1, 1, oversample)


def _saw(f, n, rng, oversample=4, sr=SR):
    t = np.arange(n * oversample) / (sr * oversample)
    return _saw_from_phase(rng.random() + f * t, oversample)[:n]


def _loop_crossfade(y, loop_start, xfade):
    """Blend the end of the sample into the audio just before loop_start, so jumping back loops seamlessly."""
    end = len(y)
    ramp = np.linspace(0, 1, xfade)
    y = y.copy()
    y[end - xfade:] = y[end - xfade:] * (1 - ramp) + y[loop_start - xfade:loop_start] * ramp
    return y


def _norm(y, peak=0.5):
    return (y / (np.abs(y).max() + 1e-9) * peak).astype(np.float32)


def supersaw(key, seconds, rng):
    n = int(seconds * SR)
    f = freq(key)
    voices = [(-21, .7), (-13, .8), (-6, .9), (0, 1.0), (6, .9), (13, .8), (21, .7)]
    y = sum(a * _saw(f * 2 ** (c / 1200), n, rng) for c, a in voices)
    y += 0.35 * np.sin(2 * np.pi * f / 2 * np.arange(n) / SR)  # a sub octave for weight
    return _lowpass(y, min(5000, f * 40))


def pluck(key, seconds, rng):
    n = int(seconds * SR)
    f = freq(key)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for h in range(1, int(min(7000, SR / 2.2) / f) + 1):
        y += np.sin(2 * np.pi * h * f * t + rng.random() * 2 * np.pi) / h * np.exp(-t * (2.5 + 1.8 * h))
    return y * np.minimum(1, t / 0.002)


def sub_bass(key, seconds, rng):
    t = np.arange(int(seconds * SR)) / SR
    f = freq(key)
    y = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t) + 0.05 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.6 * y)


def sub_drop(key, seconds, rng):
    t = np.arange(int(seconds * SR)) / SR
    f0 = freq(key)
    f = f0 * 2 ** (-np.minimum(t, 1.5) / 1.5)            # falls an octave over 1.5 s
    f = f * (1 + 1.0 * np.exp(-t / 0.012))              # the punch: a quick fall from the octave above
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.tanh(2.2 * y) * np.exp(-t / 1.4)


VOWELS = {'a': [(700, 110, 1.0), (1150, 130, .55), (2500, 200, .22), (3400, 260, .08)],
          'o': [(480, 90, 1.0), (850, 110, .45), (2450, 200, .12), (3300, 260, .05)]}


def _formants(x, vowel):
    out = np.zeros_like(x)
    for fc, bw, g in VOWELS[vowel]:
        b, a = butter(2, [(fc - bw / 2) / (SR / 2), (fc + bw / 2) / (SR / 2)], btype='band')
        out += g * lfilter(b, a, x)
    return out


def growl(key, seconds, rng):
    """Creaky voice: glottal pulses at the key's pitch with every other pulse weaker (period doubling,
    so the voice sits on f/2 like vocal fry), jittered; formants morph «a» → «o»; then grit."""
    n = int(seconds * SR)
    f = freq(key)
    src = np.zeros(n)
    at, k = 0.0, 0
    while at < n:
        src[int(at)] += 1.0 if k % 2 == 0 else 0.42 * (0.8 + 0.4 * rng.random())
        at += SR / f * (1 + 0.06 * rng.standard_normal())
        k += 1
    src = lfilter([1], [1, -0.96], src)                  # glottal tilt
    breath = rng.standard_normal(n) * 0.04 * (0.6 + 0.4 * np.abs(src) / (np.abs(src).max() + 1e-9))
    voiced = src + breath
    t = np.arange(n) / SR
    morph = np.clip(t / seconds, 0, 1)
    tract = _formants(voiced, 'a') * (1 - morph) + _formants(voiced, 'o') * morph
    chest = _lowpass(src, 260, order=2) * 0.6           # the body: where the f/2 creak lives
    y = tract / (np.abs(tract).max() + 1e-9) + chest / (np.abs(chest).max() + 1e-9) * 0.7
    y = np.tanh(3.0 * y) * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))
    return _lowpass(y, 5500) * np.minimum(1, t / 0.04)


def _sweep_band(x, f_from, f_to, rel_bw=0.6, block=256):
    """Band-pass sweeping exponentially from f_from to f_to over x."""
    out = np.zeros_like(x)
    nb = (len(x) + block - 1) // block
    zi = None
    for i in range(nb):
        fc = f_from * (f_to / f_from) ** (i / max(1, nb - 1))
        lo, hi = fc * (1 - rel_bw / 2), min(fc * (1 + rel_bw / 2), SR * 0.45)
        sos = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i * block:(i + 1) * block], zi = sosfilt(sos, x[i * block:(i + 1) * block], zi=zi)
    return out


def fx_riser(rng, seconds=4.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    y = _sweep_band(rng.standard_normal(n), 200, 5000) * (t / seconds) ** 2
    y += 0.3 * np.sin(2 * np.pi * np.cumsum(80 * 2 ** (3 * t / seconds)) / SR) * (t / seconds) ** 3
    return y * np.minimum(1, (seconds - t) / 0.01)


def fx_downlifter(rng, seconds=3.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    return _sweep_band(rng.standard_normal(n), 5000, 150) * np.exp(-t / 1.0) * np.minimum(1, t / 0.005)


def fx_impact(rng, seconds=3.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(48 * (1 + 1.5 * np.exp(-t / 0.03))) / SR) * np.exp(-t / 0.9)
    crack = _lowpass(rng.standard_normal(n), 3000) * np.exp(-t / 0.25)
    return np.tanh(1.8 * boom) + 0.5 * crack


def fx_reverse_swell(rng, seconds=2.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    tail = _lowpass(rng.standard_normal(n), 4000) * np.exp(-t / 0.6)
    return tail[::-1] * np.minimum(1, t[::-1] / 0.003 + 0.0)


def _write(folder, name, y, peak=0.5):
    path = os.path.join(folder, 'samples', name)
    sf.write(path, _norm(np.asarray(y), peak), SR, subtype='PCM_16')
    return 'samples/' + name


def _key_ranges(keys):
    keys = sorted(keys)
    for i, k in enumerate(keys):
        lo = 0 if i == 0 else (keys[i - 1] + k) // 2 + 1
        hi = 127 if i == len(keys) - 1 else (k + keys[i + 1]) // 2
        yield k, lo, hi


def _sfz(folder, name, header, regions):
    path = os.path.join(folder, name + '.sfz')
    with open(path, 'w') as fh:
        fh.write(f'// {name}: generated by scripts/musica/estudio/synths.py — do not edit by hand\n')
        fh.write(header.strip() + '\n')
        for opcodes in regions:
            fh.write('<region> ' + ' '.join(f'{k}={v}' for k, v in opcodes.items()) + '\n')
    return path


def build(folder: str, keys: list[int] | None = None, seconds: float = 4.0, seed: int = 7) -> dict[str, str]:
    """Generates every synth into `folder`; returns {instrument name: SFZ path}. `keys` overrides
    the sampled keys of the pitched instruments (handy for quick tests)."""
    rng = np.random.default_rng(seed)
    os.makedirs(os.path.join(folder, 'samples'), exist_ok=True)
    paths = {}

    def looped(gen, prefix, key_list, loop_seconds=0.6):
        regions = []
        for k, lo, hi in _key_ranges(key_list):
            y = gen(k, seconds + loop_seconds, rng)
            ls, xf = int(SR * 0.8), int(SR * loop_seconds)
            y = _loop_crossfade(y, ls, xf)
            sample = _write(folder, f'{prefix}_{k:03d}.wav', y)
            regions.append({'sample': sample, 'lokey': lo, 'hikey': hi, 'pitch_keycenter': k,
                            'loop_mode': 'loop_continuous', 'loop_start': ls, 'loop_end': len(y) - 1})
        return regions

    def plain(gen, prefix, key_list, extra=None):
        regions = []
        for k, lo, hi in _key_ranges(key_list):
            sample = _write(folder, f'{prefix}_{k:03d}.wav', gen(k, seconds, rng))
            regions.append({'sample': sample, 'lokey': lo, 'hikey': hi, 'pitch_keycenter': k, **(extra or {})})
        return regions

    saws = looped(supersaw, 'saw', keys or PITCHED_KEYS)
    paths['supersaw-lead'] = _sfz(folder, 'supersaw-lead', """
<control> set_cc1=80
<global> ampeg_attack=0.004 ampeg_release=0.18 fil_type=lpf_2p cutoff=1200 cutoff_cc1=4800 fil_veltrack=1200 amp_veltrack=80
""", saws)
    paths['supersaw-pad'] = _sfz(folder, 'supersaw-pad', """
<control> set_cc1=64
<global> ampeg_attack=0.6 ampeg_release=1.6 fil_type=lpf_2p cutoff=700 cutoff_cc1=3600 amp_veltrack=60
""", saws)
    plucks = plain(pluck, 'pluck', keys or PITCHED_KEYS)
    paths['pluck'] = _sfz(folder, 'pluck', """
<global> ampeg_attack=0.001 ampeg_release=0.25 amp_veltrack=90
""", plucks)
    # the same samples behind a low-pass that CC1 opens (dark at rest: ~1.2 kHz at CC1 20, ~4.6 kHz at 120)
    paths['pluck-sweep'] = _sfz(folder, 'pluck-sweep', """
<control> set_cc1=64
<global> ampeg_attack=0.001 ampeg_release=0.25 amp_veltrack=90 fil_type=lpf_2p cutoff=900 cutoff_cc1=3000
""", plucks)
    paths['sub-bass'] = _sfz(folder, 'sub-bass', """
<global> ampeg_attack=0.004 ampeg_release=0.12 amp_veltrack=70
""", plain(sub_bass, 'sub', keys or SUB_KEYS))
    paths['sub-drop'] = _sfz(folder, 'sub-drop', """
<global> ampeg_attack=0.001 ampeg_release=0.4 amp_veltrack=70
""", plain(sub_drop, 'drop', keys or SUB_KEYS, {'loop_mode': 'one_shot'}))
    paths['growl'] = _sfz(folder, 'growl', """
<global> ampeg_attack=0.03 ampeg_release=0.22 amp_veltrack=70
""", looped(growl, 'growl', keys or GROWL_KEYS))
    fx = [(60, fx_riser), (61, fx_downlifter), (62, fx_impact), (63, fx_reverse_swell)]
    paths['fx'] = _sfz(folder, 'fx', """
<global> pitch_keytrack=0 loop_mode=one_shot ampeg_release=0.05 amp_veltrack=60
""", [{'sample': _write(folder, f'fx_{k}.wav', gen(rng)), 'lokey': k, 'hikey': k, 'pitch_keycenter': k} for k, gen in fx])
    return paths


if __name__ == '__main__':
    from estudio import config
    target = os.path.join(config.roots()[-1], 'dracs-synths')
    for name, path in build(target).items():
        print(f'{name:14s} {path}')
