// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 40·30·4 + 2·40·4·26 − 2·π·3.1²·4 − 2·π·2.25²·4 ≈ 12 751 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 40 × 30 × 30': sizeNear(p, [40, 30, 30]),
      'base 4 thick': p.full([12, 4.1, 0], [28, 25.9, 3.9]) && p.empty([0, 4.1, 4.1], [40, 25.9, 30]),
      'cheeks 4 thick, full length': p.full([0, 0, 4], [40, 3.9, 15]) && p.full([0, 26.1, 4], [40, 30, 15]),
      'Ø6.2 pin hole through both cheeks at x = 20, z = 22': p.holes([hole(6.2, [20, 2, 22], [0, 1, 0], 'through'), hole(6.2, [20, 28, 22], [0, 1, 0], 'through')]),
      '2 × Ø4.5 in the base at x = 8 / 32': p.holes([hole(4.5, [8, 15, 2], [0, 0, 1], 'through'), hole(4.5, [32, 15, 2], [0, 0, 1], 'through')]),
      'volume ≈ 12 751 mm³ (±1%)': volumeIn(p, 12620, 12880),
    };
  },
});
