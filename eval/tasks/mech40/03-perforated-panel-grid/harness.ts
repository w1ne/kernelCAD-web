// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn, type Vec3 } from '../../../mech40/checks';

// 120·80·4 − 15·π·4²·4 ≈ 35 384 mm³.
const grid: Vec3[] = [];
for (const x of [20, 40, 60, 80, 100]) for (const y of [20, 40, 60]) grid.push([x, y, 2]);

export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'panel 120 × 80 × 4': sizeNear(p, [120, 80, 4]),
      '15 × Ø8 through holes on the centred 20 mm grid': p.holes(grid.map((at) => hole(8, at, [0, 0, 1], 'through'))),
      'exactly 15 holes': p.holeCount(8) === 15,
      'volume ≈ 35 384 mm³ (±1%)': volumeIn(p, 35030, 35740),
    };
  },
});
