// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { limitsCover, mateBetween, mechHarness, near, overlap, sizeNear } from '../../../mech40/checks';

export default mechHarness({
  parts: ['base', 'lid'],
  checks({ part, build }) {
    const base = part('base');
    const lid = part('lid');
    const hinge = mateBetween(build, 'revolute', 'base', 'lid');
    return {
      'base 80 × 60 × 30, lid 80 × 60 × 3': sizeNear(base, [80, 60, 30]) && sizeNear(lid, [80, 60, 3]),
      'lid closed on the rim': near(lid.min[2], base.min[2] + 30) && near(lid.min[0], base.min[0]) && near(lid.min[1], base.min[1]),
      'base 2 mm walls and floor, open cavity': base.full([0, 10, 1], [1.9, 50, 29]) && base.full([10, 58.1, 1], [70, 60, 29])
        && base.full([10, 10, 0], [70, 50, 1.9]) && base.empty([2.1, 2.1, 2.1], [77.9, 57.9, 30]),
      'revolute mate base ↔ lid, 110° of travel': limitsCover(hinge, 110),
      'parts do not overlap': overlap(base.shape, lid.shape) < 1e-6,
    };
  },
});
