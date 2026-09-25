"""Tiny numpy synthesizer shared by the Act I tracks of "Mazo y Mazmorra".

Instruments: Karplus-Strong plucks (pizzicato, harp, lute), flute, FM bells
(celesta, glockenspiel), additive reeds (bassoon, clarinet), string pad and soft
percussion. Includes FFT reverb, seamless loop wrapping, approximate LUFS
normalisation, a soft tanh limiter and MP3 export/analysis helpers.
"""
import os
import subprocess
import wave
from multiprocessing import Pool

import numpy as np

SR = 44100
NOTE_OFFSETS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


# ---------------------------------------------------------------- pitch utils
def midi(name):
    """'F#4' -> MIDI number. Integers pass through."""
    if isinstance(name, (int, np.integer)):
        return int(name)
    letter = name[0]
    rest = name[1:]
    acc = 0
    while rest and rest[0] in "#b":
        acc += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + NOTE_OFFSETS[letter] + acc


def hz(m):
    return 440.0 * 2 ** ((midi(m) - 69) / 12.0)


# ---------------------------------------------------------------- dsp helpers
def fft_filter(x, lo=None, hi=None, slope_hz=None):
    """Zero-phase band filter with smooth (raised-cosine) edges, via FFT."""
    n = len(x)
    if n < 8:
        return x
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    gain = np.ones_like(f)
    if hi is not None:
        w = slope_hz or hi * 0.5
        t = np.clip((f - hi) / w, 0, 1)
        gain *= 0.5 * (1 + np.cos(np.pi * t))
    if lo is not None:
        w = slope_hz or lo * 0.5
        t = np.clip((lo - f) / w, 0, 1)
        gain *= 0.5 * (1 + np.cos(np.pi * t))
    return np.fft.irfft(spec * gain, n)


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.1, hold=None):
    """ADSR envelope of n samples; release starts at `hold` seconds."""
    env = np.zeros(n)
    t = np.arange(n) / SR
    hold = (n / SR - r) if hold is None else hold
    a = max(a, 1e-4)
    att = t < a
    env[att] = t[att] / a
    dec = (t >= a) & (t < a + d)
    env[dec] = 1 - (1 - s) * (t[dec] - a) / max(d, 1e-4)
    sus = (t >= a + d) & (t < hold)
    env[sus] = s
    level_at_release = np.interp(hold, [0, a, a + d, 1e9], [0, 1, s, s])
    rel = t >= hold
    env[rel] = level_at_release * np.exp(-(t[rel] - hold) * 6.9 / max(r, 1e-3))
    # tiny fade-out to avoid a click at the very end
    fade = min(64, n)
    env[-fade:] *= np.linspace(1, 0, fade)
    return env


# ---------------------------------------------------------------- instruments
def karplus(freq, dur, t60=1.5, blend=0.5, bright=0.6, seed=0):
    """Vectorised Karplus-Strong with pitch correction by resampling."""
    period = int(np.floor(SR / freq))
    period = max(period, 4)
    f_ks = SR / (period + blend)
    rate = freq / f_ks
    n_out = int(dur * SR)
    m = int(n_out * rate) + period + 4
    rng = np.random.default_rng(seed)
    exc = rng.uniform(-1, 1, period)
    # darker excitation for lower brightness (moving average smoothing)
    k = int(1 + (1 - bright) * 8)
    if k > 1:
        exc = np.convolve(exc, np.ones(k) / k, mode="same")
    exc -= exc.mean()
    y = np.zeros(m + 1)
    y[1:period + 1] = exc
    g = 10 ** (-3 * (period / SR) / t60)
    start = period
    while start < m:
        end = min(start + period, m)
        # y index offset by 1 so that y[n-N-1] is valid at n = N
        a = y[start - period + 1:end - period + 1]
        b = y[start - period:end - period]
        y[start + 1:end + 1] = g * ((1 - blend) * a + blend * b)
        start = end
    y = y[1:]
    pos = np.arange(n_out) * rate
    out = np.interp(pos, np.arange(len(y)), y)
    return out / (np.max(np.abs(out)) + 1e-9)


def pizzicato(freq, dur, vel, seed):
    d = min(dur, 0.9) + 0.25
    n = int(d * SR)
    x = karplus(freq, d, t60=0.55, blend=0.5, bright=0.35, seed=seed)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * 9)
    env = np.exp(-t * 5.5) * np.minimum(1, t / 0.003)
    y = (0.8 * x + 0.35 * body) * env
    y[-64:] *= np.linspace(1, 0, 64)
    return y * vel


def harp(freq, dur, vel, seed):
    d = max(dur, 1.2) + 1.0
    n = int(d * SR)
    x = karplus(freq, d, t60=2.6, blend=0.35, bright=0.75, seed=seed)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.6)
    env = np.minimum(1, t / 0.002) * np.exp(-t * 0.9)
    y = (0.7 * x + 0.3 * body) * env
    y = fft_filter(y, hi=6000, slope_hz=2000)
    y[-256:] *= np.linspace(1, 0, 256)
    return y * vel


def lute(freq, dur, vel, seed):
    d = min(dur, 1.2) + 0.5
    n = int(d * SR)
    x = karplus(freq, d, t60=1.1, blend=0.42, bright=0.6, seed=seed)
    x2 = karplus(freq * 1.003, d, t60=1.1, blend=0.42, bright=0.6, seed=seed + 7)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.002) * np.exp(-t * 2.4)
    y = (0.55 * x + 0.45 * x2) * env
    y = fft_filter(y, lo=120, hi=5000, slope_hz=1500)
    y[-128:] *= np.linspace(1, 0, 128)
    return y * vel


def flute(freq, dur, vel, seed):
    rel = 0.18
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    vib_amt = np.clip((t - 0.25) / 0.35, 0, 1) * 0.0045
    vib = vib_amt * np.sin(2 * np.pi * (5.1 + rng.uniform(-0.2, 0.2)) * t)
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib)) / SR
    tone = (np.sin(phase) + 0.22 * np.sin(2 * phase + 0.3)
            + 0.07 * np.sin(3 * phase) + 0.02 * np.sin(4 * phase))
    breath = fft_filter(rng.standard_normal(n), lo=freq * 1.5,
                        hi=min(freq * 5, 7000), slope_hz=800)
    breath /= np.max(np.abs(breath)) + 1e-9
    chiff = np.exp(-t * 30)
    env = adsr(n, a=0.06, d=0.15, s=0.85, r=rel, hold=dur)
    amp_wobble = 1 + 0.03 * np.sin(2 * np.pi * 4.3 * t)
    y = (tone * amp_wobble + breath * (0.05 + 0.12 * chiff)) * env
    return y * vel * 0.8


def bell_fm(freq, dur, vel, seed, kind="celesta"):
    if kind == "celesta":
        ratio, idx0, decay, length = 1.0, 1.3, 2.2, 1.8
    else:  # glockenspiel
        ratio, idx0, decay, length = 3.5, 1.6, 2.8, 1.6
    n = int(length * SR)
    t = np.arange(n) / SR
    idx = idx0 * np.exp(-t * 7)
    mod = np.sin(2 * np.pi * freq * ratio * t)
    car = np.sin(2 * np.pi * freq * t + idx * mod)
    partial = 0.12 * np.sin(2 * np.pi * freq * 4.07 * t) * np.exp(-t * 9)
    env = np.minimum(1, t / 0.0015) * np.exp(-t * decay)
    y = (car + partial) * env
    y = fft_filter(y, hi=7500, slope_hz=2000)
    y[-256:] *= np.linspace(1, 0, 256)
    return y * vel * 0.6


def reed(freq, dur, vel, seed, kind="bassoon", staccato=False):
    """Additive double/single reed with formant shaping."""
    rel = 0.06 if staccato else 0.12
    play = min(dur, 0.13) if staccato else dur
    n = int((play + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    vib_amt = np.clip((t - 0.3) / 0.3, 0, 1) * 0.004
    vib = vib_amt * np.sin(2 * np.pi * 5.4 * t)
    drift = 0.0015 * np.sin(2 * np.pi * rng.uniform(0.3, 0.7) * t + rng.uniform(0, 6))
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib + drift)) / SR
    y = np.zeros(n)
    nh = int(min(7500, SR / 2 - 500) / freq)
    bright = 0.6 + 0.4 * vel
    for h in range(1, nh + 1):
        fh = freq * h
        if kind == "bassoon":
            # formants around 450 Hz and 1150 Hz, gentle roll-off
            a = (np.exp(-((fh - 470) / 260) ** 2) + 0.45 * np.exp(-((fh - 1150) / 350) ** 2)
                 + 0.25 / h)
        else:  # clarinet: strong odd, weak even harmonics
            a = (1.0 if h % 2 else 0.12) / h ** 0.9
            a *= np.exp(-((fh - 1500) / 2200) ** 2) * 0.7 + 0.3 * np.exp(-fh / 2500)
        a *= np.exp(-fh / (2600 * bright))
        y += a * np.sin(h * phase)
    y /= np.max(np.abs(y)) + 1e-9
    breath = fft_filter(rng.standard_normal(n), lo=800, hi=4000, slope_hz=800)
    breath /= np.max(np.abs(breath)) + 1e-9
    att = 0.012 if staccato else 0.035
    env = adsr(n, a=att, d=0.08, s=0.8, r=rel, hold=play)
    return (y + 0.025 * breath) * env * vel


def string_pad(freqs, dur, vel, seed):
    rel = 1.0
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for f0 in freqs:
        for det in (-0.006, 0.0, 0.0065):
            f = f0 * (1 + det)
            ph = rng.uniform(0, 2 * np.pi)
            nh = int(min(2800, 6 * f0) / f)
            for h in range(1, max(nh, 1) + 1):
                y += (1.0 / h) * np.sin(2 * np.pi * f * h * t + ph * h) * np.exp(-h * f / 2200)
    y /= np.max(np.abs(y)) + 1e-9
    env = adsr(n, a=0.7, d=0.3, s=0.9, r=rel, hold=dur)
    swell = 1 + 0.06 * np.sin(2 * np.pi * 0.25 * t)
    return y * env * swell * vel


def tambourine(vel, seed, long=False):
    n = int((0.35 if long else 0.18) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = fft_filter(rng.standard_normal(n), lo=4500, hi=8500, slope_hz=2000)
    noise /= np.max(np.abs(noise)) + 1e-9
    jingles = sum(np.sin(2 * np.pi * f * t) for f in (5200, 6700, 7900)) / 3
    env = np.minimum(1, t / 0.002) * np.exp(-t * (12 if long else 26))
    return (0.8 * noise + 0.2 * jingles) * env * vel


def shaker(vel, seed):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = fft_filter(rng.standard_normal(n), lo=3500, hi=7500, slope_hz=1500)
    noise /= np.max(np.abs(noise)) + 1e-9
    env = np.sin(np.pi * np.clip(t / 0.07, 0, 1)) ** 2
    return noise * env * vel


def frame_drum(vel, seed, pitch=85.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    f = pitch * (1 + 0.5 * np.exp(-t * 35))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    skin = fft_filter(rng.standard_normal(n), lo=150, hi=1200, slope_hz=300)
    skin /= np.max(np.abs(skin)) + 1e-9
    y = body + 0.25 * skin * np.exp(-t * 40)
    y *= np.minimum(1, t / 0.002)
    return y * vel


INSTRUMENTS = {
    "pizz": pizzicato,
    "harp": harp,
    "lute": lute,
    "flute": flute,
    "celesta": lambda f, d, v, s: bell_fm(f, d, v, s, "celesta"),
    "glock": lambda f, d, v, s: bell_fm(f, d, v, s, "glock"),
    "bassoon": lambda f, d, v, s: reed(f, d, v, s, "bassoon"),
    "bassoon_st": lambda f, d, v, s: reed(f, d, v, s, "bassoon", staccato=True),
    "clarinet": lambda f, d, v, s: reed(f, d, v, s, "clarinet"),
    "clarinet_st": lambda f, d, v, s: reed(f, d, v, s, "clarinet", staccato=True),
}


# ---------------------------------------------------------------- rendering
def pan_gains(p):
    """Equal-power pan, p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def render_part(args):
    """Render one part. args = (name, events, total_samples, pan, gain, seed).

    events: list of dicts with keys t (s), inst, and either pitch/dur/vel,
    freqs (pad) or perc kind.
    """
    name, events, total, pan, gain, seed = args
    out = np.zeros(total)
    rng = np.random.default_rng(seed)
    cache = {}
    for i, ev in enumerate(events):
        inst = ev["inst"]
        vel = ev.get("vel", 0.8) * (1 + rng.uniform(-0.08, 0.08))
        t0 = ev["t"] + rng.uniform(-0.008, 0.008) * ev.get("human", 1.0)
        note_seed = seed * 1000 + i
        if inst == "pad":
            sig = string_pad([hz(m) for m in ev["pitches"]], ev["dur"], vel, note_seed)
        elif inst == "tamb":
            sig = tambourine(vel, note_seed % 16, ev.get("long", False))
        elif inst == "shaker":
            sig = shaker(vel, note_seed % 12)
        elif inst == "drum":
            sig = frame_drum(vel, note_seed % 8, ev.get("pitch_hz", 85.0))
        else:
            m = midi(ev["pitch"])
            key = (inst, m, round(ev["dur"], 2), note_seed % 3)
            if key not in cache:
                cache[key] = INSTRUMENTS[inst](hz(m), ev["dur"], 1.0, note_seed % 3 + m)
            sig = cache[key] * vel
        s0 = max(0, int(t0 * SR))
        s1 = min(total, s0 + len(sig))
        out[s0:s1] += sig[:s1 - s0]
    gl, gr = pan_gains(pan)
    return name, np.stack([out * gl * gain, out * gr * gain])


def render_parts(parts, processes=10):
    """Render parts in parallel. Each part = (name, events, total, pan, gain, seed)."""
    with Pool(min(processes, len(parts))) as pool:
        return dict(pool.map(render_part, parts))


def make_ir(length=2.4, t60=1.9, seed=11):
    n = int(length * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    ir = np.zeros((2, n))
    for c in range(2):
        noise = rng.standard_normal(n)
        low = fft_filter(noise, hi=2500, slope_hz=1500)
        high = noise - low
        ir[c] = (low * np.exp(-t * 6.9 / t60) + 0.5 * high * np.exp(-t * 6.9 / (t60 * 0.45)))
        pre = int(0.018 * SR)
        ir[c] = np.concatenate([np.zeros(pre), ir[c][:-pre]])
        # a few early reflections
        for d_ms, g in ((23, 0.5), (31, 0.35), (47, 0.3), (61, 0.22)):
            k = int((d_ms + 3 * c) * SR / 1000)
            ir[c, k] += g * (1 if (k + c) % 2 else -1)
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return ir


def convolve_stereo(x, ir):
    n = x.shape[1] + ir.shape[1]
    nfft = 1 << int(np.ceil(np.log2(n)))
    out = np.zeros((2, n))
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[:n]
    return out


def wrap_loop(x, loop_len):
    """Fold everything past loop_len back onto the start (seamless loop)."""
    y = x[:, :loop_len].copy()
    tail = x[:, loop_len:]
    pos = 0
    while pos < tail.shape[1]:
        chunk = tail[:, pos:pos + loop_len]
        y[:, :chunk.shape[1]] += chunk
        pos += loop_len
    return y


# ---------------------------------------------------------------- mastering
def _biquad_response(b, a, f):
    w = 2 * np.pi * f / SR
    z = np.exp(-1j * w)
    return (b[0] + b[1] * z + b[2] * z ** 2) / (a[0] + a[1] * z + a[2] * z ** 2)


def k_weight(x):
    # BS.1770 coefficients (48 kHz design, close enough at 44.1 kHz)
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]
    n = x.shape[1]
    f = np.fft.rfftfreq(n, 1 / SR)
    h = np.abs(_biquad_response(b1, a1, f) * _biquad_response(b2, a2, f))
    return np.stack([np.fft.irfft(np.fft.rfft(c) * h, n) for c in x])


def lufs(x):
    z = k_weight(x)
    return -0.691 + 10 * np.log10(np.sum(np.mean(z ** 2, axis=1)) + 1e-12)


def soft_limit(x, threshold=0.6, ceiling=0.85):
    ax = np.abs(x)
    over = ax > threshold
    y = x.copy()
    k = ceiling - threshold
    y[over] = np.sign(x[over]) * (threshold + k * np.tanh((ax[over] - threshold) / k))
    return y


def master(x, target_lufs=-14.0, ceiling_db=-1.5):
    x = fft_filter_stereo(x, lo=35, hi=9500)
    ceiling = 10 ** (ceiling_db / 20)
    y = x
    for _ in range(4):
        g = 10 ** ((target_lufs - lufs(y)) / 20)
        y = soft_limit(y * g, threshold=ceiling * 0.7, ceiling=ceiling)
    return y


def fft_filter_stereo(x, lo=None, hi=None):
    return np.stack([fft_filter(c, lo=lo, hi=hi) for c in x])


# ---------------------------------------------------------------- export
def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").T.copy()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def to_mp3(wav_path, mp3_path):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-codec:a",
                    "libmp3lame", "-b:a", "160k", "-ar", str(SR), "-ac", "2", mp3_path],
                   check=True)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le",
                          "-ac", "2", "-ar", str(SR), "-"], check=True,
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def report(label, x):
    peak = np.max(np.abs(x))
    rms = np.sqrt(np.mean(x ** 2))
    jump = np.max(np.abs(x[:, 0] - x[:, -1]))
    typical = np.percentile(np.abs(np.diff(x, axis=1)), 99.9)
    mono = x.mean(axis=0)
    spec = np.abs(np.fft.rfft(mono)) ** 2
    f = np.fft.rfftfreq(len(mono), 1 / SR)
    bands = [(20, 120), (120, 500), (500, 2000), (2000, 5000), (5000, 8000), (8000, 12000), (12000, 22050)]
    total = spec.sum()
    print(f"[{label}] dur {x.shape[1] / SR:.2f}s  peak {20 * np.log10(peak):.2f} dBFS  "
          f"rms {20 * np.log10(rms):.2f} dBFS  ~LUFS {lufs(x):.1f}")
    print(f"[{label}] loop edge jump {jump:.4f} (99.9% sample step {typical:.4f})")
    print(f"[{label}] bands: " + "  ".join(
        f"{lo}-{hi}Hz {10 * np.log10(spec[(f >= lo) & (f < hi)].sum() / total + 1e-12):.1f}dB"
        for lo, hi in bands))
    return peak


def finish(name, folder, dry_parts, sends, loop_len):
    """Sum parts, add reverb, wrap loop, master, export and analyse."""
    total = next(iter(dry_parts.values())).shape[1]
    dry = np.zeros((2, total))
    wet_in = np.zeros((2, total))
    for k, sig in dry_parts.items():
        dry += sig
        wet_in += sig * sends.get(k, 0.25)
    wet = convolve_stereo(wet_in, make_ir())[:, :total]
    mix = wrap_loop(dry + wet, loop_len)
    out = master(mix)
    wav = os.path.join(folder, name + ".wav")
    mp3 = os.path.join(folder, name + ".mp3")
    write_wav(wav, out)
    report(name + " wav", out)
    to_mp3(wav, mp3)
    dec = decode(mp3)
    report(name + " mp3", dec)
    os.remove(wav)
    return mp3
