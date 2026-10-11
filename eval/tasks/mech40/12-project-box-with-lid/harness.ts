// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hasThreads, hole, mechHarness, near, overlap, sizeNear, threadMinor, volumeIn } from '../../../mech40/checks';

const bosses: [number, number][] = [[10.5, 10.5], [89.5, 10.5], [10.5, 59.5], [89.5, 59.5]];
const m3 = threadMinor(3, 0.5);

// Base: 100·70·35 − 95·65·32.5 + 4·π·5²·32.5 − 4·π·1.23²·10 ≈ 54 330 mm³.
export default mechHarness({
  parts: ['base', 'lid'],
  checks({ part, build }) {
    const base = part('base');
    const lid = part('lid');
    return {
      'base 100 × 70 × 35': sizeNear(base, [100, 70, 35]),
      'lid 100 × 70 × 2.5 resting on the rim': sizeNear(lid, [100, 70, 2.5])
        && near(lid.min[2], base.min[2] + 35) && near(lid.min[0], base.min[0]) && near(lid.min[1], base.min[1]),
      '2.5 mm walls': base.full([0, 20, 3], [2.4, 50, 34]) && base.empty([2.6, 20, 3], [4, 50, 35])
        && base.full([20, 67.6, 3], [80, 70, 34]) && base.empty([20, 66, 3], [80, 67.4, 35]),
      '2.5 mm floor, open cavity': base.full([20, 20, 0], [80, 50, 2.4]) && base.empty([16, 2.6, 2.6], [84, 67.4, 35])
        && base.empty([2.6, 16, 2.6], [97.4, 54, 35]),
      'Ø10 bosses at the corners': bosses.every(([x, y]) => base.full([x + 1.6, y - 0.5, 3], [x + 4.8, y + 0.5, 34.9])),
      'M3 tapped 10 deep in each boss (thread recorded, tap drill)': hasThreads(build, [0.5])
        && base.holes(bosses.map(([x, y]) => hole(m3, [x, y, 30], [0, 0, 1], 'blind', 10))),
      'lid: 4 × Ø3.4 over the bosses': lid.holes(bosses.map(([x, y]) => hole(3.4, [x, y, 1.25], [0, 0, 1], 'through'))),
      'parts do not overlap': overlap(base.shape, lid.shape) < 1e-6,
      'base volume ≈ 54 330 mm³ (±1.5%)': volumeIn(base, 53515, 55145),
    };
  },
});
