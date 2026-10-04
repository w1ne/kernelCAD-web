// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-edit-bracket/harness.ts
//
// U14 edit an existing design: the asked changes landed (taller plate, moved
// holes, front-edge chamfer) and nothing else moved, measured against the U1
// bracket built from its own task. See eval/tasks/USECASES.md.
import { fileURLToPath } from 'node:url';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, emptyIn, fullIn, hasHoles, holesOf, materialIn, minWallOk, near, part,
  standardExports, standardGates,
} from '../../usecaseChecks';

const U1 = fileURLToPath(new URL('../usecase-sensor-bracket/solution-expert.kcad.ts', import.meta.url));

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');
  const before = (await buildUsecase(U1)).parts[0]?.shape;
  if (!before) return { gates: { ...gates, 'U1 baseline builds': false }, scored: {} };

  const box = bbox(s);
  const cskDepth = (8.96 - 4.5) / 2;
  // Material above the plate front face: ring, slot, ears, clamp screw hole.
  const above = (x: typeof s) => materialIn(x, [-40, -40, 0], [40, 40, 25]);
  // Holes other than the M4 mounting holes.
  const otherHoles = (x: typeof s) => holesOf(x)
    .filter((h) => !near(h.diameterMm, 4.5))
    .map((h) => `${h.diameterMm.toFixed(2)}@${h.axisOrigin.map((c) => c.toFixed(2)).join(',')}`)
    .sort();

  return {
    gates,
    scored: {
      'plate 50 x 50 (y -25..25)': near(box.size[0], 50) && near(box.min[1], -25)
        && !emptyIn(s, [-25, 24.5, -4], [-20, 24.95, -1.5]) && emptyIn(s, [-25, 25.05, -4], [-20, 30, -0.1]),
      'plate still 4 thick': near(box.min[2], -4),
      'M4 holes moved to y = -19, 30 apart, countersunk': hasHoles(s, [
        { diameter: 4.5, at: [-15, -19, -2], axis: [0, 0, 1], kind: 'through', depth: 4 - cskDepth },
        { diameter: 4.5, at: [15, -19, -2], axis: [0, 0, 1], kind: 'through', depth: 4 - cskDepth },
      ]),
      // A 1 mm 45° chamfer removes half of a 1 x 1 mm square along the edge.
      'front edges chamfered 1 mm x 45°': near(materialIn(s, [-10, -25, -1], [10, -24, 0]), 10, 0.2)
        && near(materialIn(s, [24, -10, -1], [25, 10, 0]), 10, 0.2),
      'back edges not chamfered': fullIn(s, [-10, -25, -4], [10, -24, -3]) && fullIn(s, [24, -10, -4], [25, 10, -3]),
      'ring, slot, ears unchanged': near(above(s), above(before), 0.01),
      'bore and clamp screw hole unchanged': JSON.stringify(otherHoles(s)) === JSON.stringify(otherHoles(before)),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
