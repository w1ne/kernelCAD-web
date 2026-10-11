// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

const rc = 5.7 / Math.sqrt(3); // 3.291

// 30·20·15 − (√3/2)·5.7²·2.6 − π·1.7²·12.4 ≈ 8 815 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const c: [number, number] = [15, 10];
    return {
      'block 30 × 20 × 15': sizeNear(p, [30, 20, 15]),
      'Ø3.4 through hole on the centre': p.holes([hole(3.4, [15, 10, 8], [0, 0, 1])]),
      'hex 5.7 across flats, flats facing ±Y': p.empty([c[0] - 0.3, c[1] + 2.6, 0.1], [c[0] + 0.3, c[1] + 2.8, 2.5])
        && p.full([c[0] - 0.3, c[1] + 2.95, 0.1], [c[0] + 0.3, c[1] + 3.2, 2.5])
        && p.empty([c[0] - 0.3, c[1] - 2.8, 0.1], [c[0] + 0.3, c[1] - 2.6, 2.5]),
      'hex corners on ±X': p.empty([c[0] + rc - 0.25, c[1] - 0.05, 0.1], [c[0] + rc - 0.1, c[1] + 0.05, 2.5])
        && p.full([c[0] + rc + 0.1, c[1] - 0.2, 0.1], [c[0] + rc + 0.4, c[1] + 0.2, 2.5]),
      '2.6 mm deep pocket': p.full([c[0] + 2.2, c[1] - 0.5, 2.7], [c[0] + 2.6, c[1] + 0.5, 5]),
      'volume ≈ 8 815 mm³ (±1%)': volumeIn(p, 8727, 8903),
    };
  },
});
