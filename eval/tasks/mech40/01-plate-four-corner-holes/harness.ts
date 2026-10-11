// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 100·60·6 − 4 holes (π·2.75²·6) − 4 corner fillets ((25 − 25π/4)·6) ≈ 35 301 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'plate 100 × 60 × 6': sizeNear(p, [100, 60, 6]),
      '4 × Ø5.5 through holes 8 mm from the edges': p.holes([
        hole(5.5, [8, 8, 3], [0, 0, 1], 'through'), hole(5.5, [92, 8, 3], [0, 0, 1], 'through'),
        hole(5.5, [8, 52, 3], [0, 0, 1], 'through'), hole(5.5, [92, 52, 3], [0, 0, 1], 'through'),
      ]),
      'vertical corners rounded (R5)': p.empty([0, 0, 0], [1, 1, 6]) && p.empty([99, 59, 0], [100, 60, 6])
        && p.full([5, 0.2, 0.5], [95, 1, 5.5]),
      'volume ≈ 35 300 mm³ (±1%)': volumeIn(p, 34950, 35650),
    };
  },
});
