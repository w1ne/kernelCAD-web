// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// L 20 525 mm³ + gusset ½·30·30·5 = 2 250 → ≈ 22 775 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 60 × 40 × 50': sizeNear(p, [60, 40, 50]),
      'legs 5 mm thick': p.full([0, 0, 0], [60, 6, 4.9]) && p.full([0, 34, 0], [60, 40, 4.9]) && p.full([0, 0, 0], [4.9, 6, 50]) && p.full([0, 34, 0], [4.9, 40, 50]),
      'open beside the gusset': p.empty([5.1, 0, 5.1], [60, 17.4, 50]) && p.empty([5.1, 22.6, 5.1], [60, 40, 50]),
      'gusset 5 thick, centred, 30 mm legs': p.full([5.2, 17.6, 5.2], [14, 22.4, 14]) && p.full([30, 18, 5.2], [33, 22, 6.5])
        && p.full([5.2, 18, 30], [6.5, 22, 33]) && p.empty([5.1, 17.6, 36], [6, 22.4, 50]) && p.empty([36, 17.6, 5.1], [60, 22.4, 6]),
      'sloped gusset face (no material above the hypotenuse)': p.empty([22, 17.6, 22], [26, 22.4, 26]),
      'holes: 2 × Ø5.5 per leg': p.holes([
        hole(5.5, [40, 10, 2.5], [0, 0, 1], 'through'), hole(5.5, [40, 30, 2.5], [0, 0, 1], 'through'),
        hole(5.5, [2.5, 10, 35], [1, 0, 0], 'through'), hole(5.5, [2.5, 30, 35], [1, 0, 0], 'through'),
      ]),
      'volume ≈ 22 775 mm³ (±1.5%)': volumeIn(p, 22430, 23120),
    };
  },
});
