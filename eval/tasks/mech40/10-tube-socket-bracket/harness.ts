// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

// 50·30·5 + π(15² − 10.2²)·25 − 2·π·2.25²·5 ≈ 16 841 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 50 × 30 × 30': sizeNear(p, [50, 30, 30]),
      'Ø20.4 blind socket, 25 deep': p.holes([hole(20.4, [25, 15, 20], [0, 0, 1], 'blind', 25)]),
      'closed floor under the socket': p.full([20, 10, 0], [30, 20, 4.9]),
      'socket wall ≥ 4.5 mm (Ø30 outside)': p.full([25 + 10.3, 14.5, 8], [25 + 14.7, 15.5, 29]) && p.empty([25 + 15.1, 12, 6], [50, 18, 30]),
      '2 × Ø4.5 at x = ±19': p.holes([hole(4.5, [6, 15, 2.5], [0, 0, 1], 'through'), hole(4.5, [44, 15, 2.5], [0, 0, 1], 'through')]),
      'volume ≈ 16 841 mm³ (±1%)': volumeIn(p, 16670, 17010),
    };
  },
});
