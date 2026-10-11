// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// (80·50 − (4 − π)·6²)·30 − (76·46 − (4 − π)·4²)·28 ≈ 21 570 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 80 × 50 × 30': sizeNear(p, [80, 50, 30]),
      'rounded outside corners (R6)': p.empty([0, 0, 0], [1.2, 1.2, 30]) && p.empty([78.8, 48.8, 0], [80, 50, 30]),
      '2 mm side walls': p.full([0.05, 20, 3], [1.95, 30, 29.9]) && p.empty([2.05, 20, 3], [10, 30, 30])
        && p.full([30, 48.05, 3], [50, 49.95, 29.9]) && p.empty([30, 40, 3], [50, 47.95, 30]),
      '2 mm floor': p.full([20, 15, 0.05], [60, 35, 1.95]) && p.empty([20, 15, 2.05], [60, 35, 30]),
      'open top': p.empty([6, 6, 29], [74, 44, 30]) && p.empty([2.1, 20, 29], [77.9, 30, 30]),
      'volume ≈ 21 570 mm³ (±1.5%)': volumeIn(p, 21245, 21895),
    };
  },
});
