// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// (60·5 + 5·45)·40 − 4·π·2.75²·5 ≈ 20 525 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 60 × 40 × 50': sizeNear(p, [60, 40, 50]),
      'legs 5 mm thick, open inside the L': p.full([0, 0, 0], [60, 6, 4.9]) && p.full([0, 14, 0], [60, 26, 4.9]) && p.full([0, 0, 0], [4.9, 6, 50]) && p.full([0, 14, 0], [4.9, 26, 50])
        && p.empty([5.1, 0, 5.1], [60, 40, 50]),
      '2 × Ø5.5 vertical holes in the horizontal leg': p.holes([hole(5.5, [40, 10, 2.5], [0, 0, 1], 'through'), hole(5.5, [40, 30, 2.5], [0, 0, 1], 'through')]),
      '2 × Ø5.5 horizontal holes in the vertical leg at z = 35': p.holes([hole(5.5, [2.5, 10, 35], [1, 0, 0], 'through'), hole(5.5, [2.5, 30, 35], [1, 0, 0], 'through')]),
      'volume ≈ 20 525 mm³ (±1%)': volumeIn(p, 20320, 20730),
    };
  },
});
