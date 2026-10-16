// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { emptyIn, mechHarness, near, overlap, sizeNear } from '../../../mech40/checks';
import { minWallOk } from '../../../usecaseChecks';

export default mechHarness({
  parts: ['base', 'lid'],
  checks({ part, build }) {
    const base = part('base');
    const lid = part('lid');
    const o = base.min;
    const gapEmpty = (a: [number, number, number], b: [number, number, number]) => {
      const w = (p: [number, number, number]): [number, number, number] => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
      return emptyIn(base.shape, w(a), w(b)) && emptyIn(lid.shape, w(a), w(b));
    };
    return {
      'base 70 × 50 × 30, lid 70 × 50 × 6 (plate + lip)': sizeNear(base, [70, 50, 30]) && sizeNear(lid, [70, 50, 6]),
      'lid plate rests on the rim, lip inside': near(lid.min[2], o[2] + 26) && near(lid.min[0], o[0]) && near(lid.min[1], o[1]),
      'base 2 mm walls and floor, open': base.full([0, 10, 1], [1.9, 40, 29]) && base.full([68.1, 10, 1], [70, 40, 29])
        && base.full([10, 0, 1], [60, 1.9, 29]) && base.full([10, 48.1, 1], [60, 50, 29]) && base.full([10, 10, 0], [60, 40, 1.9])
        && base.empty([2.1, 2.1, 2.1], [67.9, 47.9, 30]),
      'lip 65.6 × 45.6 outside, 1.5 thick, 4 deep': lid.full([2.25, 10, 0.1], [3.65, 40, 3.9]) && lid.full([66.35, 10, 0.1], [67.75, 40, 3.9])
        && lid.full([10, 2.25, 0.1], [60, 3.65, 3.9]) && lid.full([10, 46.35, 0.1], [60, 47.75, 3.9]) && lid.empty([3.75, 3.75, 0], [66.25, 46.25, 3.95]),
      '0.2 mm gap all round between lip and wall': gapEmpty([2.02, 10, 26.5], [2.18, 40, 29.5]) && gapEmpty([67.82, 10, 26.5], [67.98, 40, 29.5])
        && gapEmpty([10, 2.02, 26.5], [60, 2.18, 29.5]) && gapEmpty([10, 47.82, 26.5], [60, 47.98, 29.5]),
      'parts do not overlap': overlap(base.shape, lid.shape) < 1e-6,
      'minimum-wall gate declared and passing (≥ 1.2 mm)': minWallOk(build, 1.2) && build.dfm?.walls.length === 2,
    };
  },
});
