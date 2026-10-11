// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { hole, mechHarness, near, overlap, sizeNear } from '../../../mech40/checks';

export default mechHarness({
  parts: ['bracket', 'pin'],
  checks({ part, build }) {
    const br = part('bracket');
    const pin = part('pin');
    const pair = build.dfm?.clearance.find((c) => [c.a, c.b].sort().join() === 'bracket,pin');
    return {
      'bracket 30 × 20 × 12, pin Ø8 × 20': sizeNear(br, [30, 20, 12]) && sizeNear(pin, [8, 8, 20]),
      'Ø8.6 bore through the bracket': br.holes([hole(8.6, [15, 10, 6], [0, 0, 1], 'through')]),
      'pin coaxial with the bore, 4 mm out each side': near(pin.min[0] + 4, br.min[0] + 15) && near(pin.min[1] + 4, br.min[1] + 10)
        && near(pin.min[2], br.min[2] - 4),
      'clearance gate declared and the measured gap is 0.3 mm': pair !== undefined && pair.status === 'ok' && near(pair.distanceMm, 0.3, 0.02),
      'parts do not overlap': overlap(br.shape, pin.shape) < 1e-6,
    };
  },
});
