// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

// π(11² − 4²)·10 − set screw (± an optional spot face) ≈ 3 255 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    return {
      'envelope Ø22 × 10': sizeNear(p, [22, 22, 10]),
      'Ø8 through bore': p.holes([hole(8, [11, 11, 5], [0, 0, 1], 'through')]),
      'radial M4 tapped hole along X at mid-width (thread recorded)': hasThreads(build, [0.7])
        && p.holes([hole(threadMinor(4, 0.7), [18, 11, 5], [1, 0, 0])]),
      'volume ≈ 3 255 mm³ (±2%)': volumeIn(p, 3190, 3320),
    };
  },
});
