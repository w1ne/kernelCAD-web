// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 50·40·20 − 50·18.4·12 − π·3.1²·8 ≈ 28 718 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'block 50 × 40 × 20': sizeNear(p, [50, 40, 20]),
      'channel 18.4 wide × 12 deep along X, centred': p.empty([-0.1, 10.85, -0.1], [50.1, 29.15, 11.9])
        && p.full([0, 5, 12.1], [20, 35, 19.9]),
      'two 10.8 mm cheeks': p.full([0, 0.05, 0], [50, 10.75, 19.9]) && p.full([0, 29.25, 0], [50, 39.95, 19.9]),
      'Ø6.2 guide hole centred over the channel': p.holes([hole(6.2, [25, 20, 16], [0, 0, 1])]) && p.empty([23, 19.5, 11], [27, 20.5, 20.1]),
      'volume ≈ 28 718 mm³ (±1%)': volumeIn(p, 28430, 29005),
    };
  },
});
