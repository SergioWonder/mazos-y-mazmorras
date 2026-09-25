"""Print per-stem RMS/peak for a track module (debug helper)."""
import importlib
import sys

import numpy as np

import synth_lib as sl

if __name__ == "__main__":
    m = importlib.import_module(sys.argv[1])
    loop = int(round(m.BARS * m.BAR * sl.SR))
    parts = sl.render_parts(m.build_parts(loop + 5 * sl.SR))
    for k, v in parts.items():
        print(f"{k:12s} rms {20*np.log10(np.sqrt(np.mean(v**2))+1e-12):6.1f}  peak {20*np.log10(np.abs(v).max()):6.1f}")
