// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// π·30²·80 − π·28²·78 ≈ 34 082 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope Ø60 × 80': sizeNear(p, [60, 60, 80]),
      '2 mm wall': p.full([0.2, 29.5, 3], [1.8, 30.5, 79]) && p.empty([2.2, 29.5, 2.2], [57.8, 30.5, 80])
        && p.full([58.2, 29.5, 3], [59.8, 30.5, 79]),
      '2 mm bottom': p.full([20, 20, 0.1], [40, 40, 1.9]) && p.empty([20, 20, 2.1], [40, 40, 80]),
      'open top': p.empty([15, 15, 79], [45, 45, 80.1]),
      'volume ≈ 34 082 mm³ (±1%)': volumeIn(p, 33740, 34425),
    };
  },
});
