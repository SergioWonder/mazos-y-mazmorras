"""DSP toolkit for the game's sound effects (numpy only, no scipy).

Everything works on mono float64 arrays at SR Hz. Static filters are applied in the
frequency domain (zero-padded FFT, so there is no wrap-around); time-varying filters
use overlap-add STFT blocks whose band follows a frequency curve.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100


def n_of(dur):
    return int(round(dur * SR))


def time(dur):
    return np.arange(n_of(dur)) / SR


def rng(seed):
    return np.random.default_rng(seed)


# ── Noise ────────────────────────────────────────────────────────────────────

def noise(dur, colour='white', r=None):
    r = r or rng(0)
    n = n_of(dur)
    w = r.standard_normal(n)
    if colour == 'white':
        return w / 3
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    power = {'pink': 0.5, 'brown': 1.0}[colour]
    spec /= (f / 100.0) ** power
    out = np.fft.irfft(spec, n)
    return out / (np.max(np.abs(out)) + 1e-12) * 0.6


# ── Static filters (FFT magnitude responses) ─────────────────────────────────

def spec_filter(x, response):
    n = len(x)
    size = 1 << int(np.ceil(np.log2(n + SR // 4)))
    spec = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1 / SR)
    return np.fft.irfft(spec * response(f), size)[:n]


def lowpass(x, fc, order=2):
    return spec_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def highpass(x, fc, order=2):
    return spec_filter(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))


def bandpass(x, fc, q=1.0):
    def resp(f):
        ratio = np.maximum(f, 1e-3) / fc
        return 1 / np.sqrt(1 + q * q * (ratio - 1 / ratio) ** 2)
    return spec_filter(x, resp)


def peak(x, fc, gain_db, q=1.0):
    g = 10 ** (gain_db / 20) - 1
    def resp(f):
        ratio = np.maximum(f, 1e-3) / fc
        return 1 + g / np.sqrt(1 + q * q * (ratio - 1 / ratio) ** 2)
    return spec_filter(x, resp)


# ── Time-varying band-pass (sweeps, Doppler whooshes) ────────────────────────

def sweep_bandpass(x, centre, q=2.0, block=1024):
    """Band-pass whose centre follows `centre` (array with one value per sample)."""
    hop = block // 4
    win = np.hanning(block)
    pad = np.concatenate([np.zeros(block), x, np.zeros(block)])
    cpad = np.concatenate([np.full(block, centre[0]), centre, np.full(block, centre[-1])])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    f = np.fft.rfftfreq(block, 1 / SR)
    fr = np.maximum(f, 1e-3)
    for start in range(0, len(pad) - block, hop):
        seg = pad[start:start + block] * win
        fc = cpad[start + block // 2]
        ratio = fr / fc
        resp = 1 / np.sqrt(1 + q * q * (ratio - 1 / ratio) ** 2)
        out[start:start + block] += np.fft.irfft(np.fft.rfft(seg) * resp, block) * win
        norm[start:start + block] += win * win
    out = out / np.maximum(norm, 1e-6)
    return out[block:block + len(x)]


# ── Envelopes ────────────────────────────────────────────────────────────────

def env_ad(dur, attack, decay_tau, curve=1.0):
    t = time(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1) ** curve
    d = np.exp(-np.maximum(t - attack, 0) / decay_tau)
    return a * d


def env_swell(dur, peak_at, rise=2.0, fall=2.0):
    """Smooth hump that peaks at `peak_at` seconds and is zero at both ends."""
    t = time(dur)
    up = np.clip(t / peak_at, 0, 1) ** rise
    down = np.clip((dur - t) / (dur - peak_at), 0, 1) ** fall
    return np.sin(up * np.pi / 2) ** 2 * down


def fade(x, fin=0.002, fout=0.02):
    x = x.copy()
    a, b = n_of(fin), n_of(fout)
    if a:
        x[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b:
        x[-b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return x


def glide(dur, f0, f1, curve='exp'):
    t = np.linspace(0, 1, n_of(dur))
    if curve == 'exp':
        return f0 * (f1 / f0) ** t
    return f0 + (f1 - f0) * t


def interp_curve(dur, points):
    """Piecewise-linear curve through (time, value) points, sampled per sample."""
    t = time(dur)
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


# ── Oscillators and physical models ──────────────────────────────────────────

def osc(freq, dur=None, phase=0.0, shape='sine'):
    if np.isscalar(freq):
        freq = np.full(n_of(dur), float(freq))
    ph = 2 * np.pi * np.cumsum(freq) / SR + phase
    if shape == 'sine':
        return np.sin(ph)
    if shape == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    raise ValueError(shape)


def modal(freqs, taus, amps, dur, r=None, beat=0.0):
    """Sum of exponentially damped sines (bars, plates, bells, wood)."""
    r = r or rng(1)
    t = time(dur)
    out = np.zeros_like(t)
    for f, tau, a in zip(freqs, taus, amps):
        if f >= SR / 2 - 500:
            continue
        ph = r.uniform(0, 2 * np.pi)
        tone = np.sin(2 * np.pi * f * t + ph)
        if beat:
            # a slightly detuned twin mode makes the ring shimmer (beating)
            tone = 0.5 * (tone + np.sin(2 * np.pi * f * (1 + beat * r.uniform(0.5, 1.5)) * t + ph))
        out += a * tone * np.exp(-t / tau)
    return out


def fm_bell(f, dur, ratio=1.4, index=3.0, tau=0.6, r=None):
    t = time(dur)
    env = np.exp(-t / tau)
    mod = index * np.exp(-t / (tau * 0.4)) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * env


def impulses(dur, rate, r=None, decay=None):
    """Poisson impulse train (crackle, rain of debris). Random amplitudes."""
    r = r or rng(2)
    n = n_of(dur)
    out = np.zeros(n)
    count = r.poisson(rate * dur)
    idx = r.integers(0, n, count)
    out[idx] = r.uniform(0.2, 1.0, count) * r.choice([-1, 1], count)
    if decay is not None:
        out *= decay
    return out


def resonate(x, freq, tau):
    """Convolve with a damped sine: turns clicks into knocks, cracks, drips."""
    t = np.arange(n_of(tau * 6)) / SR
    ir = np.sin(2 * np.pi * freq * t) * np.exp(-t / tau)
    return convolve(x, ir)[:len(x)]


def convolve(a, b):
    n = len(a) + len(b) - 1
    size = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(a, size) * np.fft.rfft(b, size), size)[:n]


def glottal(f0, dur, r=None, jitter=0.01, shimmer=0.1):
    """Band-rich glottal pulse train following the f0 curve (voice, growl, howl)."""
    r = r or rng(3)
    n = n_of(dur)
    if np.isscalar(f0):
        f0 = np.full(n, float(f0))
    wobble = 1 + jitter * lowpass(r.standard_normal(n), 30) * 8
    ph = np.cumsum(f0 * wobble) / SR
    frac = ph % 1.0
    # Rosenberg-like pulse: open phase rise, fast closure, then its derivative
    open_q = 0.6
    pulse = np.where(frac < open_q, 0.5 * (1 - np.cos(np.pi * frac / open_q)),
                     np.cos(np.pi * (frac - open_q) / (2 * (1 - open_q))))
    d = np.diff(pulse, prepend=pulse[0])
    amp = 1 + shimmer * lowpass(r.standard_normal(n), 40) * 6
    return d / (np.max(np.abs(d)) + 1e-9) * amp


VOWELS = {
    'a': [(730, 90, 1.0), (1090, 110, 0.5), (2440, 160, 0.25)],
    'o': [(570, 80, 1.0), (840, 90, 0.45), (2410, 160, 0.15)],
    'u': [(300, 60, 1.0), (870, 90, 0.3), (2240, 160, 0.08)],
    'e': [(530, 80, 1.0), (1840, 130, 0.4), (2480, 160, 0.25)],
    'growl': [(420, 140, 1.0), (900, 180, 0.6), (1900, 260, 0.2)],
}


def formants(x, vowel, shift=1.0):
    out = np.zeros_like(x)
    for f, bw, g in VOWELS[vowel]:
        out += g * bandpass(x, f * shift, q=f * shift / bw)
    return out


# ── Space, dynamics and export ───────────────────────────────────────────────

def room_ir(length=0.6, tau=0.18, damp=4500, r=None, early=True):
    r = r or rng(7)
    t = time(length)
    ir = r.standard_normal(len(t)) * np.exp(-t / tau)
    ir = lowpass(ir, damp, 1)
    if early:
        # a few discrete early reflections of a small stone room
        for d, g in [(0.011, 0.5), (0.017, 0.4), (0.023, 0.35), (0.031, 0.3), (0.043, 0.2)]:
            k = n_of(d)
            if k < len(ir):
                ir[k] += g * 6 * r.choice([-1, 1])
    ir *= np.clip(t / 0.004, 0, 1)
    return ir / np.sqrt(np.sum(ir ** 2))


def reverb(x, mix=0.18, length=0.6, tau=0.18, damp=4500, seed=7, tail=True):
    ir = room_ir(length, tau, damp, rng(seed))
    wet = convolve(x, ir)
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    out = dry + mix * wet
    return out if tail else out[:len(x)]


def reverse_swell(x, length=0.8, tau=0.3, seed=11):
    """Reversed reverb that swells into the sound (classic magic pre-echo)."""
    wet = convolve(x[::-1], room_ir(length, tau, 6000, rng(seed), early=False))[::-1]
    lead = len(wet) - len(x)
    dry = np.concatenate([np.zeros(lead), x])
    return dry + 0.6 * wet


def place(total, part, at):
    """Adds `part` into `total` starting at `at` seconds (grows `total` if needed)."""
    k = n_of(at)
    end = k + len(part)
    if end > len(total):
        total = np.concatenate([total, np.zeros(end - len(total))])
    total[k:end] += part
    return total


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def finish(x, peak_db=-4.0, drive=1.4, trim_db=-54.0, fout=0.06, max_dur=1.5, top=7500):
    """DC removal, treble cap, tanh limiting, trim of the silent tail, fades, peak level."""
    # below ~40 Hz nothing is audible on phones or laptops; it only eats headroom
    x = lowpass(highpass(x, 40, 2), top, 2)
    if len(x) > n_of(max_dur):
        x = x[:n_of(max_dur)]
        fout = max(fout, 0.3)
    x = x / (np.max(np.abs(x)) + 1e-12)
    x = np.tanh(drive * x) / np.tanh(drive)
    env = np.abs(x)
    thresh = 10 ** (trim_db / 20)
    loud = np.nonzero(env > thresh)[0]
    last = loud[-1] if len(loud) else len(x) - 1
    x = x[:min(len(x), last + n_of(0.02))]
    x = fade(x, 0.002, min(fout, len(x) / SR / 3))
    return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peak_db / 20)


def measure(x):
    spec = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = spec.sum() + 1e-12
    bands = [(0, 200), (200, 2000), (2000, 6000), (6000, SR / 2)]
    share = [spec[(f >= a) & (f < b)].sum() / tot for a, b in bands]
    return {
        'dur': len(x) / SR,
        'peak_db': 20 * np.log10(np.max(np.abs(x)) + 1e-12),
        'rms_db': 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12),
        'dc': float(np.mean(x)),
        'edges': (abs(x[0]), abs(x[-1])),
        'bands': share,
        'loud_db': loudness(x),
    }


def loudness(x, win=0.1):
    """Rough perceived level (dB): loudest 100 ms RMS of the 200 Hz-5 kHz band, where
    small speakers and the ear are most sensitive, unless the full band (bass) is so
    strong that it dominates on headphones."""
    k = n_of(win)
    def short_term(y):
        return 10 * np.log10(np.max(np.convolve(y ** 2, np.ones(k) / k, mode='valid')) + 1e-12)
    return max(short_term(bandpass(x, 1000, 0.5)), short_term(x) - 8)


def export(x, path_mp3, bitrate='96k'):
    pcm = np.clip(x, -1, 1)
    wav_path = path_mp3[:-4] + '.wav'
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((pcm * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path, '-codec:a', 'libmp3lame',
                    '-b:a', bitrate, '-ar', str(SR), '-ac', '1', path_mp3], check=True)
    os.remove(wav_path)
