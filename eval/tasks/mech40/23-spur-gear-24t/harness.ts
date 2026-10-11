// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, toothCount, volumeIn } from '../../../mech40/checks';

// Involute m1 z24 × 8 with a Ø5 bore ≈ 3 384 mm³ (spurGear reference).
export default mechHarness({
  checks({ part }) {
    const p = part();
    const [cx, cy] = [p.min[0] + 13, p.min[1] + 13];
    return {
      'tip Ø26, face width 8': sizeNear(p, [26, 26, 8], 0.15),
      '24 teeth (counted at the pitch circle)': toothCount(p.shape, cx, cy, 12, p.min[2] + 4) === 24,
      'Ø5 bore on the axis': p.holes([hole(5, [13, 13, 4], [0, 0, 1], 'through')]),
      'volume ≈ 3 384 mm³ (±3%)': volumeIn(p, 3282, 3486),
    };
  },
});
