"""Per-section level of each part relative to the full mix (dB)."""
import numpy as np

import cap2
import synth_ext as sx
import synth_lib as sl

if __name__ == "__main__":
    loop = int(round(cap2.BARS * cap2.BAR * sl.SR))
    total = loop + int(5 * sl.SR)
    parts = sx.render_parts(cap2.build_parts(total))
    for k, lo in cap2.LOW_CUTS.items():
        parts[k] = sl.fft_filter_stereo(parts[k], lo=lo)
    n = int(cap2.BAR * sl.SR)
    mix = sum(parts.values())
    for label, (a, b) in {"A": (0, 8), "A'": (8, 16), "B-motif": (18, 22), "A''": (24, 32)}.items():
        ref = np.sqrt((mix[:, a * n:b * n] ** 2).mean())
        print(label, " ".join(f"{k}:{20 * np.log10(np.sqrt((v[:, a * n:b * n] ** 2).mean()) / ref + 1e-9):.0f}"
                              for k, v in parts.items()))
