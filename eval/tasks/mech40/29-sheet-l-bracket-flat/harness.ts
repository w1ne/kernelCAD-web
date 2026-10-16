// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { flatPattern, mechHarness, near, sheetMetalOf, volumeIn } from '../../../mech40/checks';

export default mechHarness({
  checks({ part, build }) {
    const sm = sheetMetalOf(build);
    const flat = flatPattern(build);
    const p = part();
    return {
      'built as sheet metal: 2 mm, K 0.38': sm !== undefined && near(sm.thickness, 2, 1e-6) && near(sm.kFactor, 0.38, 1e-6),
      'one 90° bend with R3': sm !== undefined && sm.bends.length === 1 && near(Math.abs(sm.bends[0].angle), 90, 1e-6) && near(sm.bends[0].radius, 3, 1e-6),
      'flat pattern: 100 × 60 blank, bend line across the width at x = 50': flat !== undefined && near(flat.size[0], 100) && near(flat.size[1], 60)
        && flat.bends === 1 && flat.lines.every((l) => near(l.start[0], 50) && near(l.end[0], 50)),
      'folded: two 50 mm legs (envelope ≈ 52 × 60 × 52)': near(p.size[0], 52, 1.5) && near(p.size[1], 60) && near(p.size[2], 52, 1.5),
      'folded volume ≈ blank volume 12 000 mm³ (±3%)': volumeIn(p, 11640, 12360),
    };
  },
});
