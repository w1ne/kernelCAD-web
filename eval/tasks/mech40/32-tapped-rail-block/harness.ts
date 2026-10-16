// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

const m4 = threadMinor(4, 0.7);

// 60·20·15 − 3·π·(m4/2)²·10 − 2·π·2.25²·20 ≈ 17 116 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    return {
      'block 60 × 20 × 15': sizeNear(p, [60, 20, 15]),
      '3 × M4 tapped 10 deep on top (thread recorded, tap drill)': hasThreads(build, [0.7])
        && p.holes([10, 30, 50].map((x) => hole(m4, [x, 10, 10], [0, 0, 1], 'blind', 10))),
      '2 × Ø4.5 through along Y at x = 20 / 40, z = 7.5': p.holes([20, 40].map((x) => hole(4.5, [x, 10, 7.5], [0, 1, 0], 'through'))),
      'volume ≈ 17 116 mm³ (±1%)': volumeIn(p, 16945, 17287),
    };
  },
});
