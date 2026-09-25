"""Per-section RMS of every stem (mix balance check)."""
from multiprocessing import Pool
import numpy as np
import cap3 as C
import synth as S
if __name__ == '__main__':
    names = list(C.TRACKS)
    with Pool(9) as p:
        bufs = p.map(C.run_track, names)
    secs = (('a', 0, 8), ('a2', 8, 16), ('b', 16, 24), ('c', 24, 32), ('turn', 32, 36))
    print('stem       ' + ' '.join(f'{n:>6s}' for n, _, _ in secs))
    for n, b in zip(names, bufs):
        row = []
        for _, s0, s1 in secs:
            seg = b[:, int(C.tb(s0) * S.SR):int(C.tb(s1) * S.SR)]
            row.append(S.db(np.sqrt((seg.astype(float) ** 2).mean())))
        print(f'{n:10s} ' + ' '.join(f'{v:6.1f}' for v in row))
