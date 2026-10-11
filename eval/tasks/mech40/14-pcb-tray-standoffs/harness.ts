// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

const standoffs: [number, number][] = [[9, 9], [101, 9], [9, 81], [101, 81]];

// 110·90·3 + 4·π·3.5²·6 − 4·π·2²·5 − 2·π·1.7²·3 ≈ 30 571 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 110 × 90 × 9': sizeNear(p, [110, 90, 9]),
      '3 mm plate': p.full([20, 20, 0], [90, 70, 2.9]) && p.empty([20, 20, 3.1], [90, 70, 9]),
      'standoffs Ø7 at the board holes': standoffs.every(([x, y]) => p.full([x + 2.2, y - 0.4, 3.2], [x + 3.3, y + 0.4, 8.8])),
      'Ø4.0 × 5 blind insert pilots': p.holes(standoffs.map(([x, y]) => hole(4, [x, y, 7], [0, 0, 1], 'blind', 5))),
      '2 × Ø3.4 at the short ends': p.holes([hole(3.4, [5, 45, 1.5], [0, 0, 1], 'through'), hole(3.4, [105, 45, 1.5], [0, 0, 1], 'through')]),
      'volume ≈ 30 571 mm³ (±1%)': volumeIn(p, 30265, 30877),
    };
  },
});
