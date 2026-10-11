// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { clearAcrossPoses, emptyIn, fit, hole, limitsCover, mateBetween, mechHarness, near, overlap, travelPoses } from '../../../mech40/checks';

export default mechHarness({
  parts: ['leafA', 'leafB'],
  async checks({ part, build }) {
    const a = part('leafA');
    const b = part('leafB');
    // World frame from leaf B (plate x 0..40): its min corner is (0, -3, 0) when modelled as asked.
    const o = [b.min[0], b.min[1] + 3, b.min[2]];
    const w = (p: [number, number, number]): [number, number, number] => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
    const gapEmpty = (lo: [number, number, number], hi: [number, number, number]) =>
      emptyIn(a.shape, w(lo), w(hi)) && emptyIn(b.shape, w(lo), w(hi));
    const hinge = mateBetween(build, 'revolute', 'leafA', 'leafB');
    // The leaves must stay clear through the whole fold, not just flat.
    const swingsClear = hinge !== undefined && await clearAcrossPoses(
      build, travelPoses(hinge).map((deg) => ({ [hinge.name]: deg })), [['leafA', 'leafB']]);
    return {
      'leaf A 44 × 28 × 6 (pin proud), leaf B 40 × 28 × 6': near(a.size[0], 44) && near(a.size[1], 28) && near(a.size[2], 6)
        && near(b.size[0], 40) && near(b.size[1], 28) && near(b.size[2], 6),
      'leaves 2 mm thick plates on either side of the axis': a.full([7, 0, 0], [37, 20, 1.9]) && a.empty([7, 0, 2.1], [37, 20, 6])
        && b.full([5, 8, 0], [35, 27.8, 1.9]),
      'leaf A: outer knuckles and a Ø2 pin standing 2 mm proud': a.full([3, 24.2, 4.5], [11, 25.8, 5.6]) && a.full([33, 24.2, 4.5], [41, 25.8, 5.6])
        && a.full([0.2, 24.6, 2.6], [43.8, 25.4, 3.4]) && a.empty([18, 24.6, 4.3], [26, 25.4, 6]),
      'leaf B: middle knuckle with a Ø2.4 bore': b.holes([fit(hole(2.4, [20, 3, 3], [1, 0, 0]))]) && b.full([16, 2.2, 4.5], [24, 3.8, 5.6]),
      'gaps: 5 mm between knuckles, 0.2 mm around the pin': gapEmpty([10.1, -3, 0.5], [14.9, -1.5, 5.5]) && gapEmpty([25.1, -3, 0.5], [29.9, -1.5, 5.5])
        && gapEmpty([16, -0.1, 4.02], [24, 0.1, 4.18]),
      'revolute mate between the leaves, 180° of travel': limitsCover(hinge, 180),
      'leaves do not overlap': overlap(a.shape, b.shape) < 1e-6,
      'leaves stay clear across the travel (both limits and mid)': swingsClear,
    };
  },
});
