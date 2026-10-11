// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 40·40·12 − π·11.05²·7 − π·6²·5 − 4·π·2.25²·12 ≈ 15 186 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'block 40 × 40 × 12': sizeNear(p, [40, 40, 12]),
      'Ø22.1 seat, 7 deep (opens into the Ø12 hole)': p.holes([hole(22.1, [20, 20, 10], [0, 0, 1], undefined, 7)]),
      'Ø12 through below the seat': p.holes([hole(12, [20, 20, 2], [0, 0, 1])]) && p.empty([14.2, 19.5, -0.1], [25.8, 20.5, 12.1]),
      '5 mm shoulder ring under the bearing': p.full([26.2, 19.5, 0.1], [30.9, 20.5, 4.9]) && p.empty([26.2, 19.5, 5.1], [30.9, 20.5, 12.1]),
      '4 × Ø4.5 corner holes 5 mm in': p.holes([[5, 5], [35, 5], [5, 35], [35, 35]].map(([x, y]) => hole(4.5, [x, y, 6], [0, 0, 1], 'through'))),
      'volume ≈ 15 186 mm³ (±1%)': volumeIn(p, 15034, 15338),
    };
  },
});
