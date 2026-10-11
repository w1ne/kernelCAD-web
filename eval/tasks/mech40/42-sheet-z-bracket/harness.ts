// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { bendAllowance, flatPattern, mechHarness, near, sheetMetalOf, volumeIn } from '../../../mech40/checks';

const t = 2;
const r = 2;
const ba = bendAllowance(90, r, t, 0.4);
// Web (20 − BA) between the outer corners (r + t) of the two bends; each leg
// is (40 − BA/2) of flat sheet past its bend.
const width = 20 - ba + 2 * (r + t);
const leg = 40 - ba / 2;
const height = (t + r + leg) + (r + leg);

export default mechHarness({
  checks({ part, build }) {
    const sm = sheetMetalOf(build);
    const flat = flatPattern(build);
    const p = part();
    const angles = sm?.bends.map((b) => b.angle).sort((a, b) => a - b) ?? [];
    const lines = flat?.lines.map((l) => l.start[0]).sort((a, b) => a - b) ?? [];
    // Local z of the web: the down leg hangs (r + leg) below the web's bottom.
    const webZ = r + leg;
    return {
      'built as sheet metal: 2 mm, K 0.4': sm !== undefined && near(sm.thickness, 2, 1e-6) && near(sm.kFactor, 0.4, 1e-6),
      'one +90° and one −90° bend with R2': sm !== undefined && sm.bends.length === 2 && near(angles[0], -90, 1e-6) && near(angles[1], 90, 1e-6)
        && sm.bends.every((b) => near(b.radius, 2, 1e-6)),
      'flat pattern: 100 × 40 blank, bend lines at x = 40 and x = 60': flat !== undefined && near(flat.size[0], 100) && near(flat.size[1], 40)
        && flat.bends === 2 && near(lines[0], 40) && near(lines[1], 60) && flat.lines.every((l) => near(l.start[0], l.end[0])),
      [`folded Z envelope ≈ ${width.toFixed(1)} × 40 × ${height.toFixed(1)}`]: near(p.size[0], width, 0.3) && near(p.size[1], 40) && near(p.size[2], height, 0.3),
      'one leg up on one side, one leg down on the other, flat web between': p.full([4.5, 1, webZ + 0.2], [width - 4.5, 39, webZ + 1.8])
        && p.full([0.2, 1, webZ + 6], [1.8, 39, height - 1]) && p.full([width - 1.8, 1, 1], [width - 0.2, 39, webZ - 4])
        && p.empty([width - 1.8, -0.1, webZ + 6], [width + 0.1, 40.1, height + 0.1]) && p.empty([-0.1, -0.1, -0.1], [1.8, 40.1, webZ - 4]),
      'folded volume ≈ blank volume 8 000 mm³ (±3%)': volumeIn(p, 7760, 8240),
    };
  },
});
