// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 100·60·6 + 2·π·3²·8 − 3·π·4²·6 ≈ 35 548 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const pin = (x: number, y: number) => p.full([x - 2, y - 2, 6.1], [x + 2, y + 2, 13.9]) && p.empty([x + 3.1, y - 1, 6.1], [x + 4, y + 1, 14]);
    return {
      'envelope 100 × 60 × 14': sizeNear(p, [100, 60, 14]),
      'plate 6 mm thick': p.full([0, 20, 0], [20, 40, 5.9]) && p.empty([20, 40, 6.1], [80, 60, 14]),
      'Ø6 × 8 pins at (10, 10) and (90, 50)': pin(10, 10) && pin(90, 50),
      '3 × Ø8 drill holes at x = 30 / 50 / 70': p.holes([30, 50, 70].map((x) => hole(8, [x, 30, 3], [0, 0, 1], 'through'))),
      'volume ≈ 35 548 mm³ (±1%)': volumeIn(p, 35190, 35905),
    };
  },
});
