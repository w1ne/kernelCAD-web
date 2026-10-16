// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 42·14·6 + 20·14·26 − π·4²·14 − 2·π·2.75²·6 − 2·π·(5² − 2.75²)·3 ≈ 9 490 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const counterbore = (x: number) => p.empty([x + 3.2, 6.6, 3.1], [x + 4.6, 7.4, 6.1]) && p.full([x + 3.2, 6.6, 0.1], [x + 4.6, 7.4, 2.9]);
    return {
      'envelope 42 × 14 × 32': sizeNear(p, [42, 14, 32]),
      'flange 6 thick, upright 20 wide': p.full([0, 0, 0], [0.9, 14, 5.9]) && p.full([11.1, 0, 0], [30.9, 3.9, 5.9]) && p.empty([0, 0, 6.1], [10.9, 14, 32])
        && p.empty([31.1, 0, 6.1], [42, 14, 32]) && p.full([11.1, 0, 27], [30.9, 14, 31.9]),
      'Ø8 bore along Y at z = 22, centred': p.holes([hole(8, [21, 7, 22], [0, 1, 0], 'through')]),
      '2 × Ø5.5 through the flange at x = ±15': p.holes([hole(5.5, [6, 7, 1], [0, 0, 1]), hole(5.5, [36, 7, 1], [0, 0, 1])]),
      'Ø10 × 3 counterbores': counterbore(6) && counterbore(36),
      'volume ≈ 9 490 mm³ (±1%)': volumeIn(p, 9395, 9585),
    };
  },
});
