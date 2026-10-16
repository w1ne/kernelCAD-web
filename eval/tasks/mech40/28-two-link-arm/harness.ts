// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { clearAcrossPoses, travelPoses, limitsCover, mateBetween, mechHarness, near, overlap, sizeNear } from '../../../mech40/checks';

export default mechHarness({
  parts: ['base', 'link1', 'link2'],
  async checks({ part, build }) {
    const base = part('base');
    const l1 = part('link1');
    const l2 = part('link2');
    const bx = base.min[0] + 20; // base centre x
    const shoulder = mateBetween(build, 'revolute', 'base', 'link1');
    const elbow = mateBetween(build, 'revolute', 'link1', 'link2');
    // Every combination of shoulder / elbow limit and mid-travel.
    const grid = shoulder && elbow
      ? travelPoses(shoulder).flatMap((s) => travelPoses(elbow).map((e) => ({ [shoulder.name]: s, [elbow.name]: e })))
      : [];
    const sweepsClear = await clearAcrossPoses(build, grid, [['base', 'link1'], ['link1', 'link2'], ['base', 'link2']]);
    return {
      'base 40 × 40 × 20, links 96 / 76 × 16 × 8': sizeNear(base, [40, 40, 20]) && sizeNear(l1, [96, 16, 8]) && sizeNear(l2, [76, 16, 8]),
      'link 1 on the base, link 2 on link 1': near(l1.min[2], base.min[2] + 20) && near(l2.min[2], base.min[2] + 28),
      'straight pose along +X (reach x = 148)': near(l1.min[0], bx - 8) && near(l2.min[0], bx + 72) && near(l2.min[0] + l2.size[0], bx + 148)
        && near(l1.min[1], l2.min[1]),
      'shoulder: revolute base ↔ link1, 180° travel': limitsCover(mateBetween(build, 'revolute', 'base', 'link1'), 180),
      'elbow: revolute link1 ↔ link2, 180° travel': limitsCover(mateBetween(build, 'revolute', 'link1', 'link2'), 180),
      'links stay clear across the joint travel (limits and mid, all combinations)': sweepsClear,
      'no overlap between parts': overlap(base.shape, l1.shape) < 1e-6 && overlap(l1.shape, l2.shape) < 1e-6 && overlap(base.shape, l2.shape) < 1e-6,
    };
  },
});
