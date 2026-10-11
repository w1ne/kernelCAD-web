// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, materialIn, mechHarness, near, overlap, sizeNear, toothCount } from '../../../mech40/checks';

export default mechHarness({
  parts: ['pinion', 'gear'],
  checks({ part }) {
    const pinion = part('pinion');
    const gear = part('gear');
    const pc = [pinion.min[0] + pinion.size[0] / 2, pinion.min[1] + pinion.size[1] / 2];
    const gc = [gear.min[0] + gear.size[0] / 2, gear.min[1] + gear.size[1] / 2];
    const z = [pinion.min[2] + 1, pinion.min[2] + 9] as const;
    return {
      'pinion tip Ø27, face 10': sizeNear(pinion, [27, 27, 10], 0.15),
      'gear tip Ø51, face 10': near(gear.size[0], 51, 0.3) && near(gear.size[1], 51, 0.3) && near(gear.size[2], 10),
      'centre distance 36 along X, same plane': near(gc[0] - pc[0], 36, 0.1) && near(gc[1], pc[1], 0.1) && near(gear.min[2], pinion.min[2]),
      'pinion 16 teeth': toothCount(pinion.shape, pc[0], pc[1], 12, z[0] + 4) === 16,
      'gear 32 teeth': toothCount(gear.shape, gc[0], gc[1], 24, z[0] + 4) === 32,
      'bores Ø6 and Ø8': pinion.holes([hole(6, [13.5, 13.5, 5], [0, 0, 1], 'through')])
        && gear.holes([hole(8, [gc[0] - gear.min[0], gc[1] - gear.min[1], 5], [0, 0, 1], 'through')]),
      'teeth engage (gear reaches inside the pinion tip circle)': materialIn(gear.shape, [pc[0] + 11.5, pc[1] - 3, z[0]], [pc[0] + 13.5, pc[1] + 3, z[1]]) > 1,
      'gears do not overlap': overlap(pinion.shape, gear.shape) < 1e-6,
    };
  },
});
