// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, sizeNear, volumeIn, type Vec3 } from '../../../mech40/checks';

// π(40² − 15²)·8 − 6·π·3.3²·8 ≈ 32 915 mm³.
const bolts: Vec3[] = Array.from({ length: 6 }, (_, k) => {
  const a = (Math.PI / 3) * k;
  return [40 + 30 * Math.cos(a), 40 + 30 * Math.sin(a), 4];
});

export default mechHarness({
  checks({ part }) {
    const p = part();
    return {
      'flange Ø80 × 8': sizeNear(p, [80, 80, 8]),
      'Ø30 centre bore': p.holes([hole(30, [40, 40, 4], [0, 0, 1], 'through')]),
      '6 × Ø6.6 on the 60 mm circle, first on +X': p.holes(bolts.map((at) => hole(6.6, at, [0, 0, 1], 'through'))),
      'volume ≈ 32 900 mm³ (±1%)': volumeIn(p, 32590, 33245),
    };
  },
});
