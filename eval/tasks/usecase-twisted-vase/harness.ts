// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-twisted-vase/harness.ts
//
// U10 twisted vase: height, base and top hexagons, a real twist at
// mid-height, the 2 mm wall measured as section ring areas, closed bottom,
// open top and exports. See eval/tasks/USECASES.md.
//
// The wall is measured by section, not by the dfm min-wall gate: the twist
// and flare make the rim and foot edges acute, and the gate's ray samples
// right at those edges read 0.01-0.25 mm although the wall is 2 mm.
import type { HarnessResult } from '../../types';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import {
  buildUsecase, bbox, emptyIn, fullIn, materialIn, near, part, standardExports, standardGates,
} from '../../usecaseChecks';

/** Corner radius of the section at height z (90 → 110 across corners). */
const cornerR = (z: number) => (90 + (20 * z) / 180) / 2;

/** Material in a 0.1 mm slab at z vs a hexagonal ring with a 2 mm wall. */
function ringIsTwoMm(s: OcctBackend, z: number): boolean {
  const a = (cornerR(z) * Math.sqrt(3)) / 2; // apothem
  const hexArea = (ap: number) => 2 * Math.sqrt(3) * ap * ap;
  const expected = hexArea(a) - hexArea(a - 2);
  const got = materialIn(s, [-60, -60, z], [60, 60, z + 0.1]) / 0.1;
  return Math.abs(got - expected) <= expected * 0.02;
}

/** Probe a 0.4 mm cube just inside the corner at angle deg, height z. */
function atCorner(s: OcctBackend, z: number, deg: number, inset: number): boolean {
  const r = cornerR(z) - inset;
  const x = r * Math.cos((deg * Math.PI) / 180);
  const y = r * Math.sin((deg * Math.PI) / 180);
  return fullIn(s, [x - 0.2, y - 0.2, z - 0.2], [x + 0.2, y + 0.2, z + 0.2]);
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');
  const box = bbox(s);

  return {
    gates,
    scored: {
      '180 tall, 110 across at the top': near(box.min[2], 0) && near(box.max[2], 180)
        && near(box.min[0], -55) && near(box.max[0], 55),
      'base 90 across corners, corner on +X': atCorner(s, 0.5, 0, 0.8) && emptyIn(s, [45.1, -0.5, 0], [46, 0.5, 1]),
      'top 110 across corners, turned 60° (corner on +X)': atCorner(s, 179.5, 0, 0.8) && emptyIn(s, [55.1, -0.5, 178], [56, 0.5, 180]),
      // An untwisted section at z = 90 has a flat at 30°, 43.3 mm out; the
      // twisted one has its corner there, 50 mm out.
      'twisted: corner at 30° at mid-height': atCorner(s, 90, 30, 1),
      '2 mm wall (section ring areas at z = 3, 90, 170)': [3, 90, 170].every((z) => ringIsTwoMm(s, z)),
      'closed 2 mm bottom': fullIn(s, [-20, -20, 0.05], [20, 20, 1.95]) && emptyIn(s, [-20, -20, 2.05], [20, 20, 181]),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
