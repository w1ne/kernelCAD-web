// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mechHarness, sizeNear, volumeIn } from '../../../mech40/checks';

const centres = Array.from({ length: 8 }, (_, k) => 25 + 10 * k);

// 120·80·40 − 115·75·37.5 − 8·(46·4 + π·2²)·2.5 ≈ 56 631 mm³.
export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'envelope 120 × 80 × 40': sizeNear(p, [120, 80, 40]),
      'open bottom, hollow': p.empty([5, 5, -0.1], [115, 75, 37.4]),
      '2.5 mm walls': p.full([0, 10, 1], [2.4, 70, 39]) && p.full([10, 77.6, 1], [110, 80, 39])
        && p.full([117.6, 10, 1], [120, 70, 39]) && p.full([10, 0, 1], [110, 2.4, 39]),
      '2.5 mm top': p.full([5, 5, 37.6], [20, 75, 39.9]) && p.full([100, 5, 37.6], [115, 75, 39.9]),
      '8 slots 4 × 50 through the top at 10 mm pitch': centres.every((c) => p.empty([c - 1.8, 17.5, 37.4], [c + 1.8, 62.5, 40.1])
        && p.full([c - 1.6, 13, 37.6], [c + 1.6, 14.6, 39.9])),
      'solid top between the slots': centres.slice(1).every((c) => p.full([c - 7.8, 15, 37.6], [c - 2.2, 65, 39.9])),
      'volume ≈ 56 631 mm³ (±1%)': volumeIn(p, 56065, 57197),
    };
  },
});
