"""Tiny numpy synthesizer for procedural game music (no samples, no scipy).

Shared by the boss-battle scripts. Everything is rendered offline:
additive/formant oscillators, drums, bells, FFT filters, circular FFT reverb
(so a loop-length buffer wraps its own reverb tail), loudness normalization
and a soft limiter.
"""
import subprocess
import wave
from multiprocessing import Pool

import numpy as np

SR = 44100
MAX_FREQ = 7500.0


# ---------------------------------------------------------------- basics

def hz(midi):
    return 440.0 * 2.0 ** ((float(midi) - 69.0) / 12.0)


def lp_mag(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def hp_mag(f, fc, order=2):
    r = (np.maximum(f, 1e-9) / fc) ** (2 * order)
    return np.sqrt(r / (1.0 + r))


def fft_filter(x, mag_fn):
    """Zero-phase (circular) filter along the last axis."""
    n = x.shape[-1]
    spec = np.fft.rfft(x, axis=-1)
    spec *= mag_fn(np.fft.rfftfreq(n, 1.0 / SR))
    return np.fft.irfft(spec, n=n, axis=-1)


def envelope(n, attack, decay, sustain, hold, release, curve=1.0):
    """ADSR: `hold` is the time (s) at which the release starts."""
    t = np.arange(n) / SR
    a = max(attack, 1e-4)
    att = np.clip(t / a, 0.0, 1.0) ** curve
    dec = sustain + (1.0 - sustain) * np.exp(-np.maximum(t - a, 0.0) / max(decay, 1e-4))
    env = np.where(t < a, att, dec)
    env *= np.exp(-np.maximum(t - hold, 0.0) / max(release / 4.0, 1e-4))
    fade = min(n, int(0.005 * SR))
    env[n - fade:] *= np.linspace(1.0, 0.0, fade)
    return env


def vibrato(n, rng, rate=5.2, depth=12.0, delay=0.3):
    t = np.arange(n) / SR
    ramp = np.clip((t - delay) / 0.5, 0.0, 1.0)
    r = rate * (1.0 + 0.06 * rng.standard_normal())
    return depth * ramp * np.sin(2 * np.pi * r * t + rng.uniform(0, 2 * np.pi))


def additive(f0, n, harm_fn, rng, cents=None, max_freq=MAX_FREQ, max_harm=80):
    """Sum of harmonics; harm_fn(k, fk) returns a scalar or per-sample gain."""
    if cents is None:
        phase = 2 * np.pi * f0 * np.arange(n) / SR
    else:
        phase = 2 * np.pi * np.cumsum(f0 * 2.0 ** (cents / 1200.0)) / SR
    out = np.zeros(n)
    kmax = max(1, int(min(max_harm, max_freq / f0)))
    for k in range(1, kmax + 1):
        g = harm_fn(k, k * f0)
        if np.isscalar(g) and abs(g) < 2e-4:
            continue
        out += g * np.sin(k * phase + rng.uniform(0, 2 * np.pi))
    return out


def humanize(rng, sd=0.003, lim=0.008):
    return float(np.clip(rng.normal(0.0, sd), -lim, lim))


def hvel(rng, v, sd=0.06):
    return float(np.clip(v * (1.0 + rng.normal(0.0, sd)), 0.05, 1.2))


# ---------------------------------------------------------------- instruments

def strings_note(midi, dur, vel, rng, voices=3, attack=0.08, release=0.3,
                 bright=1.0, spread=8.0, vib=True, tremolo=0.0, max_fc=5500.0):
    """Section strings: detuned band-limited saws through a static low-pass."""
    f0 = hz(midi)
    n = int((dur + release + 0.02) * SR)
    fc = min(max_fc, f0 * 1.5 + (900.0 + 1900.0 * vel) * bright)
    harm = lambda k, fk: (1.0 / k) * lp_mag(fk, fc, 2)
    out = np.zeros(n)
    for _ in range(voices):
        cents = np.full(n, rng.uniform(-spread, spread))
        if vib:
            cents += vibrato(n, rng, rate=5.5, depth=10.0, delay=0.25)
        v = additive(f0, n, harm, rng, cents, max_freq=min(MAX_FREQ, fc * 5))
        if tremolo > 0:
            t = np.arange(n) / SR
            rate = tremolo * (1.0 + 0.08 * rng.standard_normal())
            v *= 0.6 + 0.4 * np.cos(2 * np.pi * rate * t + rng.uniform(0, 2 * np.pi))
        out += v
    env = envelope(n, attack, 0.3, 0.85, dur, release)
    return out * env * vel / voices


BRASS = {
    # name: (base brightness Hz, dynamic brightness Hz, max fc, harmonic tilt)
    'tuba': (150.0, 900.0, 1800.0, 1.0),
    'trombone': (250.0, 2200.0, 4200.0, 0.9),
    'horn': (180.0, 1200.0, 2600.0, 1.05),
    'trumpet': (350.0, 2600.0, 5000.0, 0.85),
}


def brass_note(midi, dur, vel, rng, kind='trombone', voices=3, attack=None,
               release=0.25, swell=0.0):
    """Brass: saw spectrum through a filter that opens with the attack.

    swell > 0 turns the note into a crescendo over `swell` seconds.
    """
    base, dyn, max_fc, tilt = BRASS[kind]
    f0 = hz(midi)
    n = int((dur + release + 0.03) * SR)
    t = np.arange(n) / SR
    atk = attack if attack is not None else 0.045 + 0.05 * (1.0 - vel)
    if swell > 0:
        shape = np.clip(t / swell, 0.0, 1.0) ** 1.6
        amp = envelope(n, 0.02, 0.1, 1.0, dur, release) * (0.08 + 0.92 * shape)
    else:
        shape = (1.0 - np.exp(-t / atk)) * (0.72 + 0.28 * np.exp(-t / 0.35))
        amp = envelope(n, atk, 0.25, 0.82, dur, release)
    fc = np.minimum(max_fc, f0 * 1.3 + base + dyn * vel * shape)
    fc *= 0.5 + 0.5 * np.minimum(1.0, amp / max(amp.max(), 1e-9) * 1.5)
    harm = lambda k, fk: (1.0 / k ** tilt) * lp_mag(fk, fc, 2)
    out = np.zeros(n)
    for _ in range(voices):
        cents = rng.uniform(-6, 6) - 22.0 * np.exp(-t / 0.035)
        cents = cents + vibrato(n, rng, rate=5.0, depth=5.0, delay=0.45)
        out += additive(f0, n, harm, rng, cents, max_freq=min(MAX_FREQ, max_fc * 3))
    return out * amp * vel / voices


FORMANTS_AH = ((780.0, 90.0, 1.0), (1150.0, 110.0, 0.55), (2800.0, 160.0, 0.12),
               (3700.0, 200.0, 0.05))


def choir_note(midi, dur, vel, rng, voices=4, attack=0.6, release=1.0,
               spread=11.0, formants=FORMANTS_AH):
    """'Aah' choir: harmonic source shaped by vowel formants, ensemble detune."""
    f0 = hz(midi)
    n = int((dur + release + 0.03) * SR)
    scale = 0.9 if midi < 57 else (1.08 if midi > 67 else 1.0)
    fm = [(f * scale, bw, g) for f, bw, g in formants]

    def response(fk):
        r = 0.015 / np.sqrt(np.maximum(fk / 200.0, 1.0))
        for f, bw, g in fm:
            r = r + g / (1.0 + ((fk - f) / bw) ** 2)
        return r

    harm = lambda k, fk: response(fk) * k ** -0.3
    out = np.zeros(n)
    for _ in range(voices):
        cents = rng.uniform(-spread, spread) + vibrato(n, rng, rate=5.0, depth=16.0, delay=0.35)
        out += additive(f0, n, harm, rng, cents, max_freq=5000.0)
    out /= voices
    # breath: noise through the same vowel formants
    breath = fft_filter(rng.standard_normal(n), lambda f: response(f) * lp_mag(f, 4500.0))
    out += 0.02 * breath / (np.std(breath) + 1e-9) * np.std(out)
    env = envelope(n, attack, 0.6, 0.9, dur, release, curve=1.6)
    return out * env * vel


def drum(f_hi, f_lo, decay, vel, rng, noise_amt=0.35, noise_fc=1400.0,
         sweep=0.035, modes=((1.0, 1.0, 1.0), (1.52, 0.35, 0.5), (2.31, 0.18, 0.3))):
    """Taiko-like drum: swept sine modes plus a filtered noise strike."""
    n = int((decay * 5.0 + 0.1) * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / sweep)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.zeros(n)
    for ratio, gain, dmul in modes:
        body += gain * np.sin(ratio * ph + rng.uniform(0, 0.5)) * np.exp(-t / (decay * dmul))
    noise = fft_filter(rng.standard_normal(n), lambda fr: lp_mag(fr, noise_fc, 2) * hp_mag(fr, 80.0))
    noise = noise / (np.abs(noise).max() + 1e-9) * np.exp(-t / 0.028)
    sig = body + noise_amt * noise
    sig[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    fade = int(0.01 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig / (np.abs(sig).max() + 1e-9) * vel


def cymbal(rng, decay=1.4, vel=1.0, swell=0.0, length=None):
    """Stereo crash (swell=0) or reversed-style swell lasting `swell` s."""
    dur = length if length is not None else (swell + 0.05 if swell > 0 else decay * 3.2)
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal((2, n))
    noise = fft_filter(noise, lambda f: hp_mag(f, 2600.0, 2) * lp_mag(f, 8500.0, 2)
                       + 0.25 * hp_mag(f, 500.0) * lp_mag(f, 2000.0))
    noise /= np.std(noise) + 1e-9
    metal = np.zeros(n)
    for _ in range(36):
        fr = rng.uniform(420.0, 6800.0)
        metal += np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3)) * rng.uniform(0.3, 1.0)
    metal /= np.std(metal) + 1e-9
    sig = noise + 0.35 * metal
    if swell > 0:
        env = np.clip(t / swell, 0.0, 1.0) ** 3.0
        cut = int(0.03 * SR)
        env[-cut:] *= np.linspace(1, 0, cut)
    else:
        env = (1.0 - np.exp(-t / 0.004)) * (0.55 * np.exp(-t / 0.18) + 0.45 * np.exp(-t / decay))
        fade = int(0.02 * SR)
        env[-fade:] *= np.linspace(1, 0, fade)
    return sig * env * vel * 0.25


BELL_PARTIALS = ((0.5, 1.0, 0.55), (1.0, 0.8, 1.0), (1.19, 0.6, 0.5), (1.5, 0.45, 0.3),
                 (2.0, 0.4, 0.35), (2.51, 0.3, 0.2), (2.99, 0.25, 0.14), (4.08, 0.16, 0.08),
                 (5.2, 0.11, 0.05))


def bell(midi, vel, rng, decay=4.0):
    """Church bell with a minor tierce (dark), additive with beating pairs."""
    f0 = hz(midi)
    n = int(decay * 3.0 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, dmul, gain in BELL_PARTIALS:
        fr = f0 * ratio
        if fr > MAX_FREQ:
            continue
        beat = rng.uniform(0.3, 1.2)
        env = np.exp(-t / (decay * dmul))
        out += gain * env * (np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3))
                             + 0.6 * np.sin(2 * np.pi * (fr + beat) * t + rng.uniform(0, 6.3)))
    strike = fft_filter(rng.standard_normal(n), lambda f: hp_mag(f, 1500.0) * lp_mag(f, 5000.0))
    strike *= np.exp(-t / 0.006) * 0.15 / (np.std(strike[:500]) + 1e-9) * np.std(out[:2000])
    out += strike
    out[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    fade = int(0.05 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out / (np.abs(out).max() + 1e-9) * vel


# ---------------------------------------------------------------- tracks & mix

class Track:
    """Stereo buffer of loop length + tail; negative times wrap to the loop end."""

    def __init__(self, n_loop, n_tail):
        self.n_loop = n_loop
        self.buf = np.zeros((2, n_loop + n_tail))

    def add(self, sig, t, pan=0.0, gain=1.0):
        if sig.ndim == 1:
            th = (pan + 1.0) * np.pi / 4.0
            st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * gain
        else:
            st = sig * gain * np.array([[min(1.0, 1.0 - pan)], [min(1.0, 1.0 + pan)]])
        i0 = int(round(t * SR))
        if i0 < 0:
            pre = st[:, :-i0]
            self.buf[:, self.n_loop + i0:self.n_loop] += pre
            st = st[:, -i0:]
            i0 = 0
        end = min(i0 + st.shape[1], self.buf.shape[1])
        if end > i0:
            self.buf[:, i0:end] += st[:, :end - i0]


def finish_track(track, gain=1.0, hp=None, lp=None):
    """Fold the tail onto the loop start and apply circular EQ."""
    n = track.n_loop
    buf = track.buf[:, :n].copy()
    tail = track.buf[:, n:]
    buf[:, :tail.shape[1]] += tail
    if hp or lp:
        buf = fft_filter(buf, lambda f: (hp_mag(f, hp) if hp else 1.0) * (lp_mag(f, lp) if lp else 1.0))
    return (buf * gain).astype(np.float32)


def make_ir(seconds=3.2, rt60=2.6, predelay=0.025, seed=7):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal((2, n))
    edges = (0.0, 400.0, 1800.0, 4500.0, SR / 2)
    rt_mul = (1.15, 1.0, 0.7, 0.45)
    ir = np.zeros((2, n))
    for lo, hi, m in zip(edges[:-1], edges[1:], rt_mul):
        band = fft_filter(noise, lambda f, lo=lo, hi=hi: ((f >= lo) & (f < hi)).astype(float))
        ir += band * np.exp(-6.91 * t / (rt60 * m))
    ir *= 1.0 - np.exp(-t / 0.012)
    ir = np.concatenate([np.zeros((2, int(predelay * SR))), ir], axis=1)
    ir = fft_filter(ir, lambda f: hp_mag(f, 120.0) * lp_mag(f, 7000.0))
    return ir / np.sqrt(np.sum(ir ** 2) / 2.0)


def reverb_circular(x, ir):
    n = x.shape[1]
    irp = np.zeros((2, n))
    irp[:, :ir.shape[1]] = ir
    return np.fft.irfft(np.fft.rfft(x, axis=1) * np.fft.rfft(irp, axis=1), n=n, axis=1)


def k_weight(x):
    shelf = lambda f: 1.0 + (10 ** (4.0 / 20) - 1.0) * (f ** 2 / (f ** 2 + 1500.0 ** 2))
    return fft_filter(x, lambda f: hp_mag(f, 38.0, 2) * shelf(f))


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    p = y ** 2
    cs = np.concatenate([np.zeros((2, 1)), np.cumsum(p, axis=1)], axis=1)
    starts = np.arange(0, y.shape[1] - blk, hop)
    ms = ((cs[:, starts + blk] - cs[:, starts]) / blk).sum(axis=0)
    ld = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g = ms[ld > max(-70, rel)]
    return -0.691 + 10 * np.log10(g.mean())


def limiter(x, thr_db=-2.0, block=64, half=14):
    """Circular look-around peak limiter (min filter + box smoothing)."""
    thr = 10 ** (thr_db / 20)
    a = np.abs(x).max(axis=0)
    n = a.size
    nb = int(np.ceil(n / block))
    a2 = np.concatenate([a, a[:nb * block - n]])
    need = np.minimum(1.0, thr / np.maximum(a2.reshape(nb, block).max(axis=1), 1e-12))
    mn = need.copy()
    for s in range(-half, half + 1):
        mn = np.minimum(mn, np.roll(need, s))
    g = np.zeros(nb)
    for s in range(-half, half + 1):
        g += np.roll(mn, s)
    g /= 2 * half + 1
    centers = (np.arange(nb) + 0.5) * block
    xs = np.concatenate([[centers[-1] - nb * block], centers, [centers[0] + nb * block]])
    ys = np.concatenate([[g[-1]], g, [g[0]]])
    return x * np.interp(np.arange(n), xs, ys)


def soft_clip(x, ceiling_db=-1.3):
    c = 10 ** (ceiling_db / 20)
    return c * np.tanh(x / c)


def write_wav(path, x, seed=3):
    rng = np.random.default_rng(seed)
    dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0
    pcm = np.clip((x + dither) * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.T.tobytes())


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2',
                          '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def db(v):
    return 20 * np.log10(max(v, 1e-12))


def analyze(x, label):
    mono = x.mean(axis=0)
    spec = np.abs(np.fft.rfft(mono)) ** 2
    f = np.fft.rfftfreq(mono.size, 1.0 / SR)
    bands = ((20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 8000), (8000, 16000))
    tot = spec.sum()
    parts = ['%d-%dHz %+.1f' % (lo, hi, 10 * np.log10(spec[(f >= lo) & (f < hi)].sum() / tot + 1e-12))
             for lo, hi in bands]
    step = np.abs(np.diff(x, axis=1))
    jump = np.abs(x[:, 0] - x[:, -1]).max()
    edge = int(0.1 * SR)
    print(f'[{label}] dur {x.shape[1] / SR:.2f}s  peak {db(np.abs(x).max()):.2f} dBFS  '
          f'RMS {db(np.sqrt((x ** 2).mean())):.1f} dB  ~{lufs(x):.1f} LUFS')
    print('   bands (rel. dB): ' + ' | '.join(parts))
    print(f'   loop jump {jump:.5f} (median step {np.median(step):.5f}, p99 {np.percentile(step, 99):.5f});'
          f' RMS last/first 100ms {db(np.sqrt((x[:, -edge:] ** 2).mean())):.1f}/'
          f'{db(np.sqrt((x[:, :edge] ** 2).mean())):.1f} dB')


def render_song(names, run_track, sends, n_loop, out_base, workers=10, rt60=2.6,
                target_lufs=-14.0, reverb_seed=7):
    with Pool(min(workers, len(names))) as pool:
        bufs = pool.map(run_track, names)
    dry = np.zeros((2, n_loop))
    send = np.zeros((2, n_loop))
    for name, b in zip(names, bufs):
        b = b.astype(np.float64)
        print(f'   track {name:12s} rms {db(np.sqrt((b ** 2).mean())):6.1f} dB  peak {db(np.abs(b).max()):6.1f}')
        dry += b
        send += b * sends[name]
    wet = reverb_circular(send, make_ir(rt60=rt60, seed=reverb_seed))
    mix = dry + wet
    mix = fft_filter(mix, lambda f: hp_mag(f, 28.0, 2) * lp_mag(f, 11000.0, 2))
    mix *= 10 ** ((target_lufs - lufs(mix)) / 20)
    pre = mix
    mix = soft_clip(limiter(mix, -2.0), -1.3)
    red = np.abs(pre).max(axis=0) - np.abs(mix).max(axis=0)
    print(f'   pre-limiter peak {db(np.abs(pre).max()):.1f} dBFS; samples above -2 dBFS: '
          f'{100 * np.mean(np.abs(pre).max(axis=0) > 10 ** (-0.1)):.3f}%; mean abs reduction {red.mean():.4f}')
    wav = out_base + '.wav'
    write_wav(wav, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame',
                    '-b:a', '160k', out_base + '.mp3'], check=True)
    analyze(mix, 'wav')
    dec = decode(out_base + '.mp3')
    print(f'[mp3] decoded peak {db(np.abs(dec).max()):.2f} dBFS, dur {dec.shape[1] / SR:.2f}s')
    return mix


# ---------------------------------------------------------------- light-orchestra extensions
# Added for the title theme: timpani, harp, celesta, flute and pizzicato. The
# plucked/bell/flute voices reuse the Act I library (synth_lib) so the whole
# soundtrack shares the same instrument colours.
import synth_lib as L  # noqa: E402

TIMPANI_MODES = ((1.0, 1.0, 1.0), (1.504, 0.45, 0.7), (1.742, 0.28, 0.5),
                 (2.0, 0.22, 0.45), (2.245, 0.12, 0.35), (2.494, 0.07, 0.3))


def timpani(midi, vel, rng, decay=1.5, mallet=0.5):
    """Soft-mallet kettledrum: inharmonic membrane modes with a small pitch glide.

    mallet in [0, 1]: 0 = very soft felt (dark), 1 = harder stick (more thump).
    """
    f0 = hz(midi)
    n = int((decay * 4.0 + 0.1) * SR)
    t = np.arange(n) / SR
    glide = 1.0 + 0.018 * vel * np.exp(-t / 0.06)
    ph = 2 * np.pi * np.cumsum(f0 * glide) / SR
    body = np.zeros(n)
    for ratio, gain, dmul in TIMPANI_MODES:
        if f0 * ratio > 2500:
            continue
        body += gain * np.sin(ratio * ph + rng.uniform(0, 6.3)) * np.exp(-t / (decay * dmul))
    felt = fft_filter(rng.standard_normal(n), lambda f: lp_mag(f, 500.0 + 900.0 * mallet, 2)
                      * hp_mag(f, 50.0))
    felt = felt / (np.abs(felt).max() + 1e-9) * np.exp(-t / 0.018)
    sig = body + (0.25 + 0.3 * mallet) * felt
    sig *= 1.0 - np.exp(-t / (0.004 + 0.006 * (1.0 - mallet)))
    fade = int(0.02 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig / (np.abs(sig).max() + 1e-9) * vel


def timpani_roll(track, midi, t0, dur, v0, v1, rng, pan=0.0, rate=11.0):
    """Single-stroke roll with a linear dynamic from v0 to v1."""
    k = int(dur * rate)
    for i in range(k):
        p = i / max(k - 1, 1)
        v = hvel(rng, (v0 + (v1 - v0) * p) * (1.0 if i % 2 else 0.9), 0.08)
        track.add(timpani(midi, v, rng, decay=1.2, mallet=0.25),
                  t0 + i / rate + humanize(rng, 0.004, 0.01), pan=pan)


def harp_note(midi, dur, vel, seed=0):
    return L.harp(hz(midi), dur, vel, seed)


def celesta_note(midi, dur, vel, seed=0):
    return L.bell_fm(hz(midi), dur, vel, seed, 'celesta')


def glock_note(midi, dur, vel, seed=0):
    return L.bell_fm(hz(midi), dur, vel, seed, 'glock')


def flute_note(midi, dur, vel, seed=0):
    return L.flute(hz(midi), dur, vel, seed)


def pizz_note(midi, dur, vel, seed=0):
    return L.pizzicato(hz(midi), dur, vel, seed)
