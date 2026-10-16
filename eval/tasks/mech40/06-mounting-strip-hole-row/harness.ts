// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 200·20·3 − 9·π·2.25²·3 ≈ 11 571 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const row = Array.from({ length: 9 }, (_, k) => hole(4.5, [12 + 22 * k, 10, 1.5], [0, 0, 1], 'through'));
    return {
      'strip 200 × 20 × 3': sizeNear(p, [200, 20, 3]),
      '9 × Ø4.5 at 22 mm pitch on the centreline': p.holes(row),
      'exactly 9 holes': p.holeCount(4.5) === 9,
      'volume ≈ 11 571 mm³ (±1%)': volumeIn(p, 11455, 11687),
    };
  },
});
