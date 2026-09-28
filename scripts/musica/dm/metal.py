"""Metal instruments for the Dungeon Master track (numpy only, no samples).

Distorted 7-string guitars (saw/pulse DI -> tube-screamer tilt -> 2x oversampled
asymmetric saturation -> cabinet), a distorted bass split into sub and grit, a
modern drum kit (clicky kick, snare with body, hats, crash, china, ride, toms),
and the synth layer (pluck arpeggio, clean lead with glide, ping-pong delay,
risers and sub drops).
"""
import numpy as np

from synth import SR, additive, cymbal, drum, envelope, fft_filter, hp_mag, hz, lp_mag, vibrato


# ---------------------------------------------------------------- helpers

def peak_mag(f, fc, gain_db, bw_oct=0.7):
    """Bell EQ magnitude on a log-frequency axis (bw_oct = std-dev in octaves)."""
    g = 10 ** (gain_db / 20.0)
    x = np.log2(np.maximum(f, 1e-3) / fc) / bw_oct
    return 1.0 + (g - 1.0) * np.exp(-0.5 * x * x)


def fft_filter_sr(x, mag_fn, sr):
    n = x.shape[-1]
    spec = np.fft.rfft(x, axis=-1)
    spec *= mag_fn(np.fft.rfftfreq(n, 1.0 / sr))
    return np.fft.irfft(spec, n=n, axis=-1)


def upsample2(x):
    n = x.shape[-1]
    spec = np.fft.rfft(x, axis=-1)
    big = np.zeros(spec.shape[:-1] + (n + 1,), dtype=complex)
    big[..., :spec.shape[-1]] = spec
    return np.fft.irfft(big, n=2 * n, axis=-1) * 2.0


def downsample2(y, n):
    spec = np.fft.rfft(y, axis=-1)[..., :n // 2 + 1]
    return np.fft.irfft(spec, n=n, axis=-1) * 0.5


def saw_phase(freq, n, cents=None, phase0=0.0):
    f = np.full(n, float(freq)) if cents is None else freq * 2.0 ** (cents / 1200.0)
    return np.cumsum(f) / SR + phase0


def saw_from_phase(ph):
    return 2.0 * (ph % 1.0) - 1.0


def shift_add(dst, sig, offset):
    end = min(dst.size, offset + sig.size)
    if end > offset:
        dst[offset:end] += sig[:end - offset]


# ---------------------------------------------------------------- guitars

def guitar_di(notes, dur, mute, rng, detune=0.0, strum=0.0025):
    """Direct signal of a picked power chord.

    mute: 0 = open and ringing, 1 = tight palm mute. The pick bends the pitch
    sharp for a few ms; the high harmonics decay faster than the body.
    """
    rel = 0.012 + 0.06 * (1.0 - mute)
    n = int((dur + rel + strum * len(notes)) * SR) + 1
    t = np.arange(n) / SR
    raw = np.zeros(n)
    for i, m in enumerate(notes):
        f0 = hz(m)
        cents = detune + rng.normal(0.0, 1.2) + (16.0 + 10.0 * mute) * np.exp(-t / 0.012)
        ph = saw_phase(f0, n, cents, rng.random())
        s = 0.75 * saw_from_phase(ph) + 0.35 * (saw_from_phase(ph) - saw_from_phase(ph + 0.32))
        gain = 1.0 if i == 0 else 0.78
        off = int(i * strum * SR * (0.4 + 0.6 * (1.0 - mute)))
        shift_add(raw, s[:n - off] * gain, off)
    fc_lo = 380.0 + 2300.0 * (1.0 - mute) ** 1.4
    fc_hi = 1500.0 + 2600.0 * (1.0 - mute)
    lo = fft_filter(raw, lambda f: lp_mag(f, fc_lo, 2))
    hi = fft_filter(raw, lambda f: lp_mag(f, fc_hi, 2)) - lo
    sig = lo + hi * np.exp(-t / (0.025 + 0.3 * (1.0 - mute)))
    decay = 0.07 + 1.6 * (1.0 - mute) ** 2
    sustain = 0.22 + 0.45 * (1.0 - mute)
    env = envelope(n, 0.0015, decay, sustain, dur, rel)
    pick = fft_filter(rng.standard_normal(n), lambda f: hp_mag(f, 1800.0) * lp_mag(f, 4500.0))
    pick *= np.exp(-t / 0.003) * 0.25
    return sig * env + pick * env


def amp_sim(di, gain=34.0, bias=0.2):
    """High-gain amp: tight tilt EQ, two oversampled asymmetric stages."""
    n = di.shape[-1]
    x = fft_filter(di, lambda f: hp_mag(f, 180.0, 1) * peak_mag(f, 750.0, 7.0, 0.9) * lp_mag(f, 6500.0, 1))
    up = upsample2(x)
    st1 = np.tanh(gain * up + bias) - np.tanh(bias)
    # interstage: remove DC and fizz before the second stage
    st1 = fft_filter_sr(st1, lambda f: hp_mag(f, 60.0, 1) * lp_mag(f, 9000.0, 2), 2 * SR)
    st2 = np.tanh(2.4 * st1 - 0.12) - np.tanh(-0.12)
    return downsample2(st2, n)


def cab_sim(x):
    """4x12 cabinet: tight low end, scooped low-mids, presence, steep top cut."""
    return fft_filter(x, lambda f: hp_mag(f, 95.0, 2) * peak_mag(f, 120.0, 1.0, 0.5)
                      * peak_mag(f, 420.0, -4.5, 0.7) * peak_mag(f, 2200.0, 5.0, 0.8)
                      * peak_mag(f, 3600.0, 2.5, 0.4) * lp_mag(f, 5800.0, 4))


# ---------------------------------------------------------------- bass

def bass_di(midi, dur, mute, rng):
    """Returns (sub, grit) layers of one bass note."""
    f0 = hz(midi)
    rel = 0.02 + 0.08 * (1.0 - mute)
    n = int((dur + rel) * SR) + 1
    t = np.arange(n) / SR
    cents = 8.0 * np.exp(-t / 0.015)
    ph = saw_phase(f0, n, cents, rng.random())
    sub = np.sin(2 * np.pi * ph) + 0.25 * np.sin(4 * np.pi * ph)
    saw = saw_from_phase(ph)
    env = envelope(n, 0.002, 0.12 + 0.8 * (1.0 - mute), 0.35 + 0.4 * (1.0 - mute), dur, rel)
    grit = fft_filter(saw, lambda f: lp_mag(f, 900.0 + 1600.0 * (1.0 - mute), 2)) * env
    return sub * env, grit


def bass_amp(sub, grit):
    sub = fft_filter(sub, lambda f: lp_mag(f, 140.0, 2) * hp_mag(f, 32.0, 2))
    g = fft_filter(grit, lambda f: hp_mag(f, 200.0, 2))
    g = np.tanh(6.0 * g + 0.15) - np.tanh(0.15)
    g = fft_filter(g, lambda f: hp_mag(f, 160.0, 2) * peak_mag(f, 1100.0, 4.0, 0.6) * lp_mag(f, 3200.0, 3))
    return sub, g


# ---------------------------------------------------------------- drums

def kick(vel, rng):
    """Tight modern kick: short swept body, a punch around 90 Hz and a beater click."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 55.0 + 105.0 * np.exp(-t / 0.02) + 60.0 * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.1)
    body = np.tanh(2.0 * body) / np.tanh(2.0)
    click = fft_filter(rng.standard_normal(n), lambda fr: hp_mag(fr, 2200.0, 2) * lp_mag(fr, 6500.0, 2))
    click = click / (np.abs(click[:400]).max() + 1e-9) * np.exp(-t / 0.0022) * 0.5
    click += 0.35 * np.sin(2 * np.pi * 3300.0 * t) * np.exp(-t / 0.0028)
    sig = body + click
    sig[:22] *= np.linspace(0.0, 1.0, 22)
    fade = int(0.02 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig * vel


def snare(vel, rng):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f1 = 182.0 * (1.0 + 0.3 * np.exp(-t / 0.008))
    body = np.sin(2 * np.pi * np.cumsum(f1) / SR) * np.exp(-t / 0.075)
    body += 0.45 * np.sin(2 * np.pi * 335.0 * t + 0.5) * np.exp(-t / 0.045)
    wires = fft_filter(rng.standard_normal(n), lambda f: hp_mag(f, 900.0, 2) * lp_mag(f, 6800.0, 3)
                       * peak_mag(f, 4000.0, 3.0, 0.8))
    wires = wires / (np.std(wires) + 1e-9) * np.exp(-t / (0.11 + 0.05 * vel))
    crack = fft_filter(rng.standard_normal(n), lambda f: hp_mag(f, 2000.0) * lp_mag(f, 7000.0))
    crack = crack / (np.std(crack) + 1e-9) * np.exp(-t / 0.004)
    # softer hits have less wire and body
    sig = (0.9 * body + (0.22 + 0.2 * vel) * wires + 0.3 * crack)
    sig = np.tanh(1.3 * sig) / np.tanh(1.3)
    fade = int(0.02 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig * vel


def hat(vel, rng, open_=False):
    dur = 0.45 if open_ else 0.09
    n = int(dur * SR)
    t = np.arange(n) / SR
    # six detuned square partials (classic metallic hat) plus noise
    metal = np.zeros(n)
    for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0):
        metal += np.sign(np.sin(2 * np.pi * fr * 1.73 * t + rng.uniform(0, 6.3)))
    noise = rng.standard_normal(n)
    sig = fft_filter(0.5 * metal / 6.0 + noise * 0.6, lambda f: hp_mag(f, 5200.0, 2) * lp_mag(f, 9500.0, 3))
    sig /= np.std(sig[: int(0.01 * SR)]) + 1e-9
    env = np.exp(-t / (0.16 if open_ else 0.028))
    env[: 40] *= np.linspace(0, 1, 40)
    fade = int(0.01 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig * env * vel * 0.3


def crash(vel, rng, decay=1.7):
    x = cymbal(rng, decay=decay, vel=1.0)
    x = fft_filter(x, lambda f: lp_mag(f, 9000.0, 2) * hp_mag(f, 300.0))
    return x / (np.abs(x).max() + 1e-9) * vel


def china(vel, rng):
    """Trashy china: ring-modulated inharmonic partials over mid-heavy noise."""
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal((2, n))
    noise = fft_filter(noise, lambda f: hp_mag(f, 900.0, 2) * lp_mag(f, 7500.0, 2) * peak_mag(f, 2600.0, 5.0, 0.7))
    noise /= np.std(noise) + 1e-9
    metal = np.zeros(n)
    for _ in range(40):
        fr = rng.uniform(350.0, 5200.0)
        metal += np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3)) * rng.uniform(0.3, 1.0)
    metal /= np.std(metal) + 1e-9
    ring = metal * np.sin(2 * np.pi * 612.0 * t)
    sig = noise * (0.7 + 0.5 * ring[None, :]) + 0.3 * metal[None, :]
    env = (1.0 - np.exp(-t / 0.002)) * (0.6 * np.exp(-t / 0.09) + 0.4 * np.exp(-t / 0.45))
    fade = int(0.03 * SR)
    env[-fade:] *= np.linspace(1, 0, fade)
    sig = sig * env
    return sig / (np.abs(sig).max() + 1e-9) * vel


def ride(vel, rng):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for fr, g, d in ((523.0, 0.6, 0.9), (1247.0, 0.5, 0.7), (2310.0, 0.35, 0.5), (3380.0, 0.25, 0.4),
                     (4470.0, 0.15, 0.3)):
        sig += g * np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3)) * np.exp(-t / d)
    noise = fft_filter(rng.standard_normal(n), lambda f: hp_mag(f, 3000.0, 2) * lp_mag(f, 9000.0, 2))
    sig += 0.6 * noise / (np.std(noise) + 1e-9) * np.exp(-t / 0.35) * 0.5
    sig *= 1.0 - np.exp(-t / 0.001)
    fade = int(0.02 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig / (np.abs(sig).max() + 1e-9) * vel


def tom(pitch_hz, vel, rng):
    return drum(pitch_hz * 1.6, pitch_hz, 0.22, vel, rng, noise_amt=0.3, noise_fc=2500.0, sweep=0.03)


# ---------------------------------------------------------------- synths

def pluck(midi, dur, vel, rng):
    """Synth pluck for arpeggios: saw with a snapping low-pass envelope."""
    f0 = hz(midi)
    n = int((dur + 0.35) * SR)
    t = np.arange(n) / SR
    fc = 500.0 + 2600.0 * np.exp(-t / 0.07)
    harm = lambda k, fk: (1.0 / k) * lp_mag(fk, fc, 2)
    out = 0.0
    for c in (-7.0, 7.0):
        out = out + additive(f0, n, harm, rng, np.full(n, c), max_freq=6500.0)
    env = envelope(n, 0.002, 0.18, 0.25, dur, 0.3)
    return out * env * vel * 0.5


def lead(midi, dur, vel, rng, prev=None):
    """Clean singing lead: saw/square blend, glide from the previous note, late vibrato."""
    f0 = hz(midi)
    rel = 0.25
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    glide = 0.0 if prev is None else (prev - midi) * 100.0 * np.exp(-t / 0.035)
    fc = np.minimum(3400.0, 900.0 + 2400.0 * vel * (0.75 + 0.25 * np.exp(-t / 0.25)))
    harm = lambda k, fk: (1.0 / k) * (1.0 if k % 2 else 0.55) * lp_mag(fk, fc, 2)
    out = 0.0
    for c in (-5.0, 5.0):
        cents = glide + c + vibrato(n, rng, rate=5.4, depth=16.0, delay=0.28)
        out = out + additive(f0, n, harm, rng, cents, max_freq=6500.0)
    env = envelope(n, 0.018, 0.4, 0.8, dur, rel)
    return out * env * vel * 0.5


def pingpong(x, delay_s, fb=0.4, repeats=6, lp=2800.0, circular=True):
    """Ping-pong delay of a stereo buffer: repeats alternate sides and get darker."""
    mono = x.mean(axis=0)
    wet_src = fft_filter(mono, lambda f: lp_mag(f, lp, 2) * hp_mag(f, 300.0, 1))
    d = int(round(delay_s * SR))
    out = np.zeros_like(x)
    cur = wet_src
    for r in range(1, repeats + 1):
        if circular:
            sh = np.roll(cur, d)
        else:
            sh = np.concatenate([np.zeros(d), cur[:-d]])
        cur = fft_filter(sh, lambda f: lp_mag(f, lp * 1.4, 1)) if r % 2 == 0 else sh
        out[(r + 1) % 2] += cur * fb ** r
    return out


def sub_drop(vel, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 30.0 + 45.0 * np.exp(-t / 0.35)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.45))
    s *= 1.0 - np.exp(-t / 0.004)
    fade = int(0.05 * SR)
    s[-fade:] *= np.linspace(1, 0, fade)
    return s * vel


def riser(dur, vel, rng):
    """Noise riser: brightening noise and a climbing sine, peaking at its end."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    noise = rng.standard_normal(n)
    dark = fft_filter(noise, lambda f: hp_mag(f, 300.0) * lp_mag(f, 1500.0, 2))
    bright = fft_filter(noise, lambda f: hp_mag(f, 1500.0) * lp_mag(f, 7000.0, 2))
    sig = dark / (np.std(dark) + 1e-9) * (1.0 - x) + bright / (np.std(bright) + 1e-9) * x
    f = 180.0 * 2.0 ** (3.0 * x)
    sig = 0.6 * sig + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = x ** 2.5
    cut = int(0.02 * SR)
    env[-cut:] *= np.linspace(1, 0, cut)
    return sig * env * vel
