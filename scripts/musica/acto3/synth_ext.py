"""Extensions for the Act III track: bridges the two approved synths and adds
timpani, piccolo and a soft suspended-cymbal roll.

- `synth` (boss synth): Track buffers, brass, section strings, cymbals, circular
  reverb and mastering.
- `synth_lib` (Act I synth): Karplus-Strong harp/pizzicato, flute, FM celesta and
  glockenspiel, frame drum, tambourine and shaker.
- Dark additions (Act III rewrite): low drone with slow beating, string
  harmonics, muffled distant taiko and a closed-mouth 'ooh' choir vowel.
"""
import numpy as np

import synth as S
import synth_lib as L

SR = S.SR


def timpani(midi, vel, rng, decay=0.75):
    """Tuned kettle drum: slightly sharp strike settling onto pitch, inharmonic
    membrane modes and a soft felt-mallet thump."""
    f = S.hz(midi)
    return S.drum(f * 1.04, f, decay, vel, rng, noise_amt=0.18, noise_fc=700.0, sweep=0.05,
                  modes=((1.0, 1.0, 1.0), (1.5, 0.45, 0.75), (1.98, 0.25, 0.55),
                         (2.44, 0.12, 0.4), (0.5, 0.18, 0.5)))


def timpani_roll(midi, beats, spb, v0, v1, rng, rate=12.0):
    """List of (offset_s, signal) strokes for a crescendo/decrescendo roll."""
    dur = beats * spb
    n = int(dur * rate)
    out = []
    for i in range(n):
        p = i / max(n - 1, 1)
        v = S.hvel(rng, v0 + (v1 - v0) * p, 0.08)
        out.append((i / rate + S.humanize(rng, 0.004, 0.01), timpani(midi, v, rng, decay=0.5)))
    return out


def piccolo(freq, dur, vel, seed):
    """Piccolo: the Act I flute an octave up, with less breath and a quicker,
    shallower vibrato, low-passed so it sparkles without piercing."""
    rel = 0.12
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    vib = np.clip((t - 0.18) / 0.3, 0, 1) * 0.003 * np.sin(2 * np.pi * 5.8 * t)
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib)) / SR
    tone = np.sin(phase) + 0.08 * np.sin(2 * phase + 0.2) + 0.02 * np.sin(3 * phase)
    breath = L.fft_filter(rng.standard_normal(n), lo=freq * 1.2, hi=min(freq * 3, 7500),
                          slope_hz=900)
    breath /= np.max(np.abs(breath)) + 1e-9
    env = L.adsr(n, a=0.03, d=0.1, s=0.85, r=rel, hold=dur)
    y = (tone + breath * (0.03 + 0.08 * np.exp(-t * 35))) * env
    return y * vel * 0.6


def cymbal_roll(rng, seconds, vel=0.5):
    """Soft mallet roll on a suspended cymbal: a slow swell that ends in a
    gentle bloom instead of a crash."""
    sw = S.cymbal(rng, swell=seconds, vel=vel)
    return S.fft_filter(sw, lambda f: S.lp_mag(f, 6500.0, 2))


def lib_note(inst, midi, dur, vel, seed):
    """Render one note with an Act I instrument (harp, pizz, flute, celesta...)."""
    if inst == 'piccolo':
        return piccolo(S.hz(midi), dur, vel, seed)
    return L.INSTRUMENTS[inst](S.hz(midi), dur, 1.0, seed) * vel


# ---------------------------------------------------------------- dark additions

# closed 'ooh' vowel for a low male choir (darker than 'oh')
FORMANTS_OO = ((320.0, 60.0, 1.0), (720.0, 80.0, 0.3), (2400.0, 150.0, 0.035),
               (3300.0, 200.0, 0.015))


def drone(midi, dur, vel, rng, attack=2.5, release=3.0, fc=700.0, beat_hz=0.35,
          breathe=0.09):
    """Low sustained drone: two slightly detuned dark saw voices that beat slowly,
    with a very slow amplitude 'breathing'."""
    f0 = S.hz(midi)
    n = int((dur + release + 0.05) * SR)
    t = np.arange(n) / SR
    harm = lambda k, fk: (1.0 / k ** 1.4) * S.lp_mag(fk, fc, 2)
    out = np.zeros(n)
    for det in (-beat_hz / 2, beat_hz / 2):
        cents = np.full(n, 1200.0 * np.log2((f0 + det) / f0))
        out += S.additive(f0, n, harm, rng, cents, max_freq=min(S.MAX_FREQ, fc * 4))
    out *= 1.0 + breathe * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6.3))
    env = S.envelope(n, attack, 0.5, 1.0, dur, release, curve=1.5)
    return out * env * vel * 0.5


def harmonics(midi, dur, vel, rng, attack=0.8, release=1.2, voices=3):
    """String harmonics (flautando): nearly pure sines, faint 2nd partial, slow
    shimmering vibrato and a whisper of bow noise."""
    f0 = S.hz(midi)
    n = int((dur + release + 0.03) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for _ in range(voices):
        cents = rng.uniform(-5, 5) + S.vibrato(n, rng, rate=4.6, depth=6.0, delay=0.4)
        ph = 2 * np.pi * np.cumsum(f0 * 2.0 ** (cents / 1200.0)) / SR
        out += np.sin(ph + rng.uniform(0, 6.3)) + 0.06 * np.sin(2 * ph)
    out /= voices
    bow = S.fft_filter(rng.standard_normal(n), lambda f: S.hp_mag(f, f0 * 0.9) * S.lp_mag(f, f0 * 2.5))
    out += 0.03 * bow / (np.std(bow) + 1e-9)
    env = S.envelope(n, attack, 0.4, 0.9, dur, release, curve=1.4)
    return out * env * vel


def muffled_taiko(vel, rng, size=1.0):
    """Big taiko struck with a covered mallet, heard from far away: low sweep,
    little noise and no attack click above ~1 kHz."""
    sig = S.drum(78.0 / size, 42.0 / size, 0.55 * size, vel, rng, noise_amt=0.1,
                 noise_fc=450.0, sweep=0.045)
    return S.fft_filter(sig, lambda f: S.lp_mag(f, 900.0, 2))


def dark_bell(midi, vel, rng, decay=5.0):
    """Distant low bell: the boss bell with its bright strike rolled off."""
    return S.fft_filter(S.bell(midi, vel, rng, decay=decay), lambda f: S.lp_mag(f, 2800.0, 2))
