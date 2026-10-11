// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

const standoffs: [number, number][] = [[21, 15.5], [79, 15.5], [21, 64.5], [79, 64.5]];

// 100·80·3 + 4·π·3²·6 − 4·π·1.007²·5 − 4·π·2.25²·3 ≈ 24 424 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    return {
      'envelope 100 × 80 × 9': sizeNear(p, [100, 80, 9]),
      '3 mm plate': p.full([30, 25, 0], [70, 55, 2.9]) && p.empty([30, 25, 3.1], [70, 55, 9]),
      'standoffs Ø6 × 6 on the centred 58 × 49 pattern': standoffs.every(([x, y]) => p.full([x + 1.2, y - 0.4, 3.2], [x + 2.8, y + 0.4, 8.8])),
      'M2.5 tapped 5 deep (thread recorded, tap drill)': hasThreads(build, [0.45])
        && p.holes(standoffs.map(([x, y]) => hole(threadMinor(2.5, 0.45), [x, y, 7], [0, 0, 1], 'blind', 5))),
      '4 × Ø4.5 corner holes': p.holes([[6, 6], [94, 6], [6, 74], [94, 74]].map(([x, y]) => hole(4.5, [x, y, 1.5], [0, 0, 1], 'through'))),
      'volume ≈ 24 424 mm³ (±1%)': volumeIn(p, 24180, 24668),
    };
  },
});
