// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

const m3 = threadMinor(3, 0.5);

// π·10²·25 − π·2.5²·12.5 − π·4²·12.5 − set screws and spot faces ≈ 6 900 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    return {
      'envelope Ø20 × 25': sizeNear(p, [20, 20, 25]),
      'Ø5 bore from the bottom, 12.5 deep': p.empty([7.7, 9.6, -0.1], [12.3, 10.4, 12.4]) && p.full([9.6, 6.2, 0.1], [10.4, 7.35, 12.3]),
      'Ø8 bore from the top, 12.5 deep': p.empty([6.2, 9.6, 12.6], [13.8, 10.4, 25.1]) && p.full([14.2, 7, 12.7], [15.5, 8, 24.9]),
      'radial M3 tapped holes along X at z = 6 and 19 (thread recorded)': hasThreads(build, [0.5])
        && p.holes([hole(m3, [16, 10, 6], [1, 0, 0]), hole(m3, [16, 10, 19], [1, 0, 0])]),
      'volume ≈ 6 900 mm³ (±2%)': volumeIn(p, 6760, 7040),
    };
  },
});
