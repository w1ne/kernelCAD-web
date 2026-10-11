// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { flatPattern, mechHarness, near, sheetMetalOf, volumeIn } from '../../../mech40/checks';

export default mechHarness({
  checks({ part, build }) {
    const sm = sheetMetalOf(build);
    const flat = flatPattern(build);
    const p = part();
    return {
      'built as sheet metal: 3 mm, K 0.42': sm !== undefined && near(sm.thickness, 3, 1e-6) && near(sm.kFactor, 0.42, 1e-6),
      'one 90° downward bend with R3': sm !== undefined && sm.bends.length === 1 && near(sm.bends[0].angle, -90, 1e-6) && near(sm.bends[0].radius, 3, 1e-6),
      'flat pattern: 60 × 20 blank, bend line at x = 20': flat !== undefined && near(flat.size[0], 60) && near(flat.size[1], 20)
        && flat.bends === 1 && flat.lines.every((l) => near(l.start[0], 20) && near(l.end[0], 20)),
      'folded: 40 mm leg on top, 20 mm tab down (envelope ≈ 43 × 20 × 23)': near(p.size[0], 43, 2) && near(p.size[1], 20) && near(p.size[2], 23, 2),
      'folded volume ≈ blank volume 3 600 mm³ (±3%)': volumeIn(p, 3492, 3708),
    };
  },
});
