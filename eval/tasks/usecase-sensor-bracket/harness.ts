// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-sensor-bracket/harness.ts
//
// U1 sensor wall bracket: plate size, clamp bore, slot, countersunk mounting
// holes, clamp screw, min wall and exports. See eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, emptyIn, hasHoles, minWallOk, near, part, standardExports, standardGates,
} from '../../usecaseChecks';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');

  // The back plate alone: everything behind the ring (z < -0.3).
  const plate = bbox(s);
  const ringR = 30.2 / 2 + 2.5;
  // 90° countersink from Ø8.96 to Ø4.5 leaves 4 − 2.23 mm of straight bore.
  const cskDepth = (8.96 - 4.5) / 2;

  return {
    gates,
    scored: {
      'back plate 50 wide (X)': near(plate.size[0], 50),
      'back plate 4 thick (z -4..0)': near(plate.min[2], -4) && emptyIn(s, [-30, -30, -5], [30, 40, -4.05]),
      'back plate 40 tall (y -20..20)': near(plate.min[1], -20)
        && emptyIn(s, [-25, 20.05, -4], [-ringR - 0.5, 40, -0.3])
        && !emptyIn(s, [-25, 19.5, -4], [-ringR - 0.5, 19.95, -0.3]),
      'clamp bore Ø30.2 along Z at (0, 6)': hasHoles(s, [{ diameter: 30.2, at: [0, 6, 10], axis: [0, 0, 1] }]),
      // The ears must not intrude on the bore next to the slot (the sensor
      // would not fit): at |x| <= 3 the bore wall is above y = 20.8.
      'bore clear where the ears join the ring': emptyIn(s, [-3, 20, 1], [3, 20.7, 19]),
      'ring 20 tall': near(plate.max[2], 20),
      'ring slotted at +Y': emptyIn(s, [-1.4, 6 + 15.1, 0.5], [1.4, 6 + ringR + 1, 19.5]),
      'two M4 countersunk holes, 30 apart, through': hasHoles(s, [
        { diameter: 4.5, at: [-15, -14, -2], axis: [0, 0, 1], kind: 'through', depth: 4 - cskDepth },
        { diameter: 4.5, at: [15, -14, -2], axis: [0, 0, 1], kind: 'through', depth: 4 - cskDepth },
      ]),
      'M3 clamp screw hole through both ears': hasHoles(s, [
        { diameter: 3.4, at: [0, 27.1, 10], axis: [1, 0, 0], kind: 'through' },
        { diameter: 3.4, at: [0, 27.1, 10], axis: [1, 0, 0], kind: 'through' },
      ]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
