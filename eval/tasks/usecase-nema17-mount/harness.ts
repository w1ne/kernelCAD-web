// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-nema17-mount/harness.ts
//
// U2 NEMA 17 motor mount: plate sizes, the 31 mm pattern and pilot bore on
// the motor face, extrusion slots, bend fillet, min wall and exports. See
// eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bboxIs, emptyIn, fullIn, hasHoles, materialIn, minWallOk, part, standardExports,
  standardGates, type HoleSpec,
} from '../../usecaseChecks';

const MOTOR_Z = 30;

function motorHole(x: number, z: number, diameter: number): HoleSpec {
  return { diameter, at: [x, 2.5, z], axis: [0, 1, 0], kind: 'through', depth: 5 };
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');
  const m = 42.3 / 2;

  return {
    gates,
    scored: {
      'bbox 50 x 45 x 60 (base 50 wide, motor plate to z = 60)': bboxIs(s, [-25, 0, 0], [25, 45, 60]),
      'base 5 thick': fullIn(s, [-24, 30, 0], [-16, 44, 5]) && emptyIn(s, [-24, 30, 5.05], [-16, 44, 10]),
      'motor plate 5 thick': fullIn(s, [-23, 0, 52], [23, 5, 59]) && emptyIn(s, [-23, 5.05, 52], [23, 10, 59]),
      'motor face flat and clear at y = 0': emptyIn(s, [-40, -20, -1], [40, -0.01, 70]),
      'motor plate covers the 42.3 mm motor face': materialIn(s, [-m, 0, MOTOR_Z - m], [m, 0.5, MOTOR_Z + m])
        > (42.3 * 42.3 - Math.PI * 11 * 11 - 4 * Math.PI * 1.7 * 1.7) * 0.5 - 1,
      'pilot Ø22 on the motor axis': hasHoles(s, [motorHole(0, MOTOR_Z, 22)]),
      'four M3 holes on the 31 mm pattern': hasHoles(s, [
        motorHole(-15.5, MOTOR_Z - 15.5, 3.4), motorHole(15.5, MOTOR_Z - 15.5, 3.4),
        motorHole(-15.5, MOTOR_Z + 15.5, 3.4), motorHole(15.5, MOTOR_Z + 15.5, 3.4),
      ]),
      'two M5 slots through the base, 5.5 wide, y 17..27': [-10, 10].every((x) =>
        emptyIn(s, [x - 2.7, 17, -1], [x + 2.7, 27, 6])
        && emptyIn(s, [x - 0.5, 17 - 2.7, -1], [x + 0.5, 27 + 2.7, 6])
        && fullIn(s, [x - 2.9, 18, 0], [x - 2.8, 26, 5]) && fullIn(s, [x + 2.8, 18, 0], [x + 2.9, 26, 5])
        && fullIn(s, [x - 0.5, 27 + 2.8, 0], [x + 0.5, 27 + 2.9, 5])),
      // Inside the bend corner (y 5..5.5, z 5..5.5) a 4 mm fillet is solid.
      'fillet fills the inside of the bend': fullIn(s, [-20, 5, 5], [20, 5.5, 5.5]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
