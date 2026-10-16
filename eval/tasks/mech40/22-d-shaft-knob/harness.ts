// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

// π·15²·15 − D-bore area (≈ 25.3 mm²)·12 − set screw (± an optional spot face) ≈ 10 280 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    const c = 15; // axis in local X/Y
    return {
      'envelope Ø30 × 15': sizeNear(p, [30, 30, 15]),
      'D-bore round side Ø6.2': p.empty([c - 2.9, c - 0.4, -0.1], [c + 1.3, c + 0.4, 11.9]) && p.full([c - 0.4, c - 3.8, 0.1], [c + 0.4, c - 3.3, 11.9]),
      'D-bore flat 1.5 mm from the centre on +X': p.full([c + 1.7, c - 0.4, 0.1], [c + 2.8, c + 0.4, 11.9]),
      '12 mm deep, closed top': p.full([c - 2, c - 1, 12.1], [c + 1, c + 1, 15]),
      'radial M3 tapped from -X at z = 5 (thread recorded)': hasThreads(build, [0.5])
        && p.holes([hole(threadMinor(3, 0.5), [5, c, 5], [1, 0, 0])]),
      'volume ≈ 10 280 mm³ (±2%)': volumeIn(p, 10075, 10485),
    };
  },
});
