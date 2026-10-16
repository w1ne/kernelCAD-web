// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { bendAllowance, flatPattern, mechHarness, near, sheetMetalOf, volumeIn } from '../../../mech40/checks';

const t = 2;
const r = 2;
const ba = bendAllowance(90, r, t, 0.4);
// Folded envelope: web (50 − BA) plus an outer corner (r + t) at each side;
// each flange is (25 − BA/2) of flat sheet above its outer corner.
const width = 50 - ba + 2 * (r + t);
const height = 25 - ba / 2 + r + t;

export default mechHarness({
  checks({ part, build }) {
    const sm = sheetMetalOf(build);
    const flat = flatPattern(build);
    const p = part();
    const lines = flat?.lines.map((l) => l.start[0]).sort((a, b) => a - b) ?? [];
    return {
      'built as sheet metal: 2 mm, K 0.4': sm !== undefined && near(sm.thickness, 2, 1e-6) && near(sm.kFactor, 0.4, 1e-6),
      'two 90° upward bends with R2': sm !== undefined && sm.bends.length === 2
        && sm.bends.every((b) => near(b.angle, 90, 1e-6) && near(b.radius, 2, 1e-6)),
      'flat pattern: 100 × 60 blank, bend lines at x = 25 and x = 75': flat !== undefined && near(flat.size[0], 100) && near(flat.size[1], 60)
        && flat.bends === 2 && near(lines[0], 25) && near(lines[1], 75) && flat.lines.every((l) => near(l.start[0], l.end[0])),
      [`folded channel envelope ≈ ${width.toFixed(1)} × 60 × ${height.toFixed(1)}`]: near(p.size[0], width, 0.3) && near(p.size[1], 60) && near(p.size[2], height, 0.3),
      'flat web on the bench, two upright flanges, open top': p.full([8, 1, 0.2], [width - 8, 59, 1.8])
        && p.full([0.2, 1, 6], [1.8, 59, height - 1]) && p.full([width - 1.8, 1, 6], [width - 0.2, 59, height - 1])
        && p.empty([4.5, -0.1, 4.5], [width - 4.5, 60.1, height + 0.1]),
      'folded volume ≈ blank volume 12 000 mm³ (±3%)': volumeIn(p, 11640, 12360),
    };
  },
});
