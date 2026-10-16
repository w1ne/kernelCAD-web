// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, sizeNear, threadMinor, volumeIn, type Vec3 } from '../../../mech40/checks';

const m6 = threadMinor(6, 1);
const grid: Vec3[] = [];
for (const x of [12.5, 37.5, 62.5, 87.5, 112.5, 137.5]) for (const y of [12.5, 37.5, 62.5, 87.5]) grid.push([x, y, 6]);

// 150·100·12 − 24·π·(m6/2)²·12 ≈ 174 527 mm³.
export default mechHarness({
  checks({ part, build }) {
    const p = part();
    return {
      'plate 150 × 100 × 12': sizeNear(p, [150, 100, 12]),
      '24 M6 tapped through holes on the centred 25 mm grid': hasThreads(build, [1])
        && p.holes(grid.map((at) => hole(m6, at, [0, 0, 1], 'through'))) && p.holeCount(m6) === 24,
      'volume ≈ 174 527 mm³ (±0.5%)': volumeIn(p, 173655, 175400),
    };
  },
});
