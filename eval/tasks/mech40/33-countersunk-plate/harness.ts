// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 50·30·4 − 3·(π·2.25²·1.75 + π·2.25/3·(4.5² + 4.5·2.25 + 2.25²)) ≈ 5 666 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    const cone = (x: number) => p.empty([x + 3.9, 14.9, 3.85], [x + 4.1, 15.1, 3.95]) // r 4 at 0.1 deep: inside the Ø9 cone
      && p.full([x + 3.9, 14.9, 2.0], [x + 4.1, 15.1, 2.4]) // r 4 at 1.6–2 deep: outside the narrowing cone
      && p.empty([x + 2.3, 14.9, 2.4], [x + 2.6, 15.1, 2.6]); // r 2.45 at 1.5 deep: cone wider than the bore
    return {
      'plate 50 × 30 × 4': sizeNear(p, [50, 30, 4]),
      '3 × Ø4.5 holes on the centreline': p.holes([10, 25, 40].map((x) => hole(4.5, [x, 15, 0.5], [0, 0, 1]))),
      '90° countersinks to Ø9 at the top': [10, 25, 40].every(cone),
      'volume ≈ 5 666 mm³ (±1.5%)': volumeIn(p, 5581, 5751),
    };
  },
});
