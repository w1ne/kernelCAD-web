// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

const standoffs: [number, number][] = [[7.5, 7.5], [65.5, 7.5], [7.5, 56.5], [65.5, 56.5]];

// 93·64·30 − 89·60·28 + 4·π·3²·5 − 4·π·1.007²·4 − 54·16·2 − (10+8+8)·5·2 ≈ 27 567 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    const sidePortOpen = (x: number, w: number) => p.empty([x - w / 2 + 0.3, -0.1, 8.3], [x + w / 2 - 0.3, 2.1, 12.7])
      && p.full([x - w / 2 - 0.8, 0, 9], [x - w / 2 - 0.2, 1.9, 12]);
    return {
      'envelope 93 × 64 × 30': sizeNear(p, [93, 64, 30]),
      '2 mm walls, 2 mm floor': p.full([0, 20, 3], [1.9, 44, 29]) && p.full([20, 62.1, 3], [80, 64, 29])
        && p.full([55, 0.1, 3], [80, 1.9, 29]) && p.full([91.1, 2, 2], [93, 62, 5])
        && p.full([20, 20, 0], [60, 44, 1.9]) && p.empty([12, 12, 2.1], [60, 52, 30]),
      'standoffs Ø6 × 5 on the 58 × 49 pattern': standoffs.every(([x, y]) => p.full([x + 1.2, y - 0.4, 2.2], [x + 2.8, y + 0.4, 6.9]))
        && standoffs.every(([x, y]) => p.empty([x - 3, y - 3, 7.1], [x + 3, y + 3, 29])),
      'M2.5 tapped, 4 deep (thread recorded, tap drill)': hasThreads(build, [0.45])
        && p.holes(standoffs.map(([x, y]) => hole(threadMinor(2.5, 0.45), [x, y, 5], [0, 0, 1], 'blind', 4))),
      'USB / Ethernet opening 54 × 16 on X-max': p.empty([90.9, 5.3, 8.3], [93.1, 58.7, 23.7]) && p.full([91.1, 2, 2], [93, 62, 7.7]),
      'USB-C opening 10 × 5 at 11.2': sidePortOpen(15.2, 10),
      'micro-HDMI openings 8 × 5 at 26 and 39.5': sidePortOpen(30, 8) && sidePortOpen(43.5, 8),
      'volume ≈ 27 567 mm³ (±1.5%)': volumeIn(p, 27150, 27980),
    };
  },
});
