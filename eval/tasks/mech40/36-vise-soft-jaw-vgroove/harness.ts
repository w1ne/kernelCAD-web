// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 100·20·30 − ½·12·6·100 − 2·(π·2.75²·14.5 + π·5²·5.5) ≈ 54 846 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const cb = (x: number) => p.empty([x + 3.3, -0.1, 11.6], [x + 4.6, 5.4, 12.4]) && p.full([x + 3.3, 5.6, 11.6], [x + 4.6, 19.9, 12.4]);
    return {
      'block 100 × 20 × 30': sizeNear(p, [100, 20, 30]),
      '90° V-groove, 6 deep, 12 wide, full length': p.empty([-0.1, 9.6, 24.5], [100.1, 10.4, 30.1]) && p.empty([-0.1, 4.6, 29.5], [100.1, 15.4, 30.1])
        && p.full([35, 9.6, 0], [65, 10.4, 23.5]) && p.full([0, 3.5, 25], [100, 3.9, 29.9]) && p.full([0, 16.1, 25], [100, 16.5, 29.9]),
      '2 × Ø5.5 along Y at x = 25 / 75, z = 12': p.holes([25, 75].map((x) => hole(5.5, [x, 15, 12], [0, 1, 0]))),
      'Ø10 × 5.5 counterbores on the front (Y-min)': cb(25) && cb(75),
      'volume ≈ 54 846 mm³ (±1%)': volumeIn(p, 54300, 55395),
    };
  },
});
