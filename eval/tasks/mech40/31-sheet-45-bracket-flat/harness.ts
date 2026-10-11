// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { flatPattern, mechHarness, near, sheetMetalOf, volumeIn } from '../../../mech40/checks';

export default mechHarness({
  checks({ part, build }) {
    const sm = sheetMetalOf(build);
    const flat = flatPattern(build);
    const p = part();
    return {
      'built as sheet metal: 2 mm, K 0.4': sm !== undefined && near(sm.thickness, 2, 1e-6) && near(sm.kFactor, 0.4, 1e-6),
      'one 45° upward bend with R2': sm !== undefined && sm.bends.length === 1 && near(sm.bends[0].angle, 45, 1e-6) && near(sm.bends[0].radius, 2, 1e-6),
      'flat pattern: 80 × 30 blank, bend line at x = 40': flat !== undefined && near(flat.size[0], 80) && near(flat.size[1], 30)
        && flat.bends === 1 && flat.lines.every((l) => near(l.start[0], 40) && near(l.end[0], 40)),
      'folded: 40 mm leg + 40 mm leg at 45° (envelope ≈ 70 × 30 × 30)': near(p.size[0], 70, 2) && near(p.size[1], 30) && near(p.size[2], 30, 2),
      'folded volume ≈ blank volume 4 800 mm³ (±3%)': volumeIn(p, 4656, 4944),
    };
  },
});
