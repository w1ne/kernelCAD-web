// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 80·40·5 − 2·(14·6 + π·3²)·5 ≈ 14 877 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const slotOpen = (c: number) => p.empty([c - 9, 19, -0.1], [c + 9, 21, 5.1]) && p.empty([c - 6.9, 17.2, -0.1], [c + 6.9, 22.8, 5.1]);
    return {
      'plate 80 × 40 × 5': sizeNear(p, [80, 40, 5]),
      'slot at x = 20: 6 wide, through': slotOpen(20),
      'slot at x = 60: 6 wide, through': slotOpen(60),
      'round slot ends (corners of a 6 × 20 box stay solid)': [20, 60].every((c) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([sx, sy]) => {
        // The 0.55 mm square in each corner of the slot's 20 × 6 bounding box.
        const x = sx < 0 ? c - 9.95 : c + 9.4;
        const y = sy < 0 ? 17.05 : 22.4;
        return p.full([x, y, 0.5], [x + 0.55, y + 0.55, 4.5]);
      })),
      'solid beside and between the slots': p.full([0, 0, 0], [80, 16.5, 5]) && p.full([31, 0, 0], [49, 40, 5]),
      'volume ≈ 14 877 mm³ (±1%)': volumeIn(p, 14728, 15026),
    };
  },
});
