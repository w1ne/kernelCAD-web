// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, near, threadMinor, toothCount } from '../../../mech40/checks';

export default mechHarness({
  checks({ part, build }) {
    const p = part();
    const c = 16; // axis in local X / Y (tip Ø32)
    const [cx, cy] = [p.min[0] + c, p.min[1] + p.size[1] / 2];
    return {
      'tip Ø32, total height 14': near(p.size[0], 32, 0.15) && near(p.size[1], 32, 0.2) && near(p.size[2], 14),
      '30 teeth': toothCount(p.shape, cx, cy, 15, p.min[2] + 3) === 30,
      'Ø16 × 8 hub on top': p.full([c - 0.3, c - 7.6, 6.2], [c + 0.3, c - 3.4, 13.9]) && p.empty([c - 0.3, c - 9, 6.2], [c + 0.3, c - 8.2, 14])
        && p.empty([c - 9, c - 0.3, 6.2], [c - 8.2, c + 0.3, 14]),
      'Ø6 bore through gear and hub': p.empty([c - 2.8, c - 0.5, -0.1], [c + 2.8, c + 0.5, 14.1]) && p.full([c - 0.3, c - 4, 0.2], [c + 0.3, c - 3.2, 13.8]),
      'radial M3 tapped hub hole from +X at z = 10 (thread recorded)': hasThreads(build, [0.5])
        && p.holes([hole(threadMinor(3, 0.5), [c + 6, c, 10], [1, 0, 0])]),
    };
  },
});
