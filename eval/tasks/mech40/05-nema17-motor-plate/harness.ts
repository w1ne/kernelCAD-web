// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn, type Vec3 } from '../../../mech40/checks';

// 60·60·5 − π·11.25²·5 − 4·π·1.7²·5 − 4·π·2.75²·5 ≈ 15 355 mm³.
const square = (d: number): Vec3[] => [[30 - d, 30 - d, 2.5], [30 + d, 30 - d, 2.5], [30 - d, 30 + d, 2.5], [30 + d, 30 + d, 2.5]];

export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'plate 60 × 60 × 5': sizeNear(p, [60, 60, 5]),
      'Ø22.5 centre pilot': p.holes([hole(22.5, [30, 30, 2.5], [0, 0, 1], 'through')]),
      '4 × Ø3.4 on the 31 mm square': p.holes(square(15.5).map((at) => hole(3.4, at, [0, 0, 1], 'through'))),
      '4 × Ø5.5, 6 mm from the corners': p.holes(square(24).map((at) => hole(5.5, at, [0, 0, 1], 'through'))),
      'volume ≈ 15 355 mm³ (±1%)': volumeIn(p, 15200, 15510),
    };
  },
});
