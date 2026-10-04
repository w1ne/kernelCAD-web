// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-stove-knob/harness.ts
//
// U5 replacement knob: envelope, the D-shaft fit (bore, flat, depth) probed
// with material boxes, knurl grooves, pointer mark, min wall and exports. See
// eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bboxIs, emptyIn, fullIn, minWallOk, part, standardExports, standardGates,
} from '../../usecaseChecks';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');

  return {
    gates,
    scored: {
      'Ø35 x 20 envelope': bboxIs(s, [-17.5, -17.5, 0], [17.5, 17.5, 20]),
      'shaft hole open inside the D': emptyIn(s, [-1.5, -2.6, 0], [1.5, 1.5, 11.9]),
      'shaft hole Ø6.2': emptyIn(s, [2.95, -0.4, 0], [3.05, 0.4, 11.9]) && fullIn(s, [3.2, -0.3, 1], [3.4, 0.3, 11])
        && emptyIn(s, [-0.4, -3.05, 0], [0.4, -2.95, 11.9]) && fullIn(s, [-0.3, -3.4, 1], [0.3, -3.2, 11]),
      'flat at 4.7 from the round side (y = 1.6)': emptyIn(s, [-1, 1.3, 0], [1, 1.5, 11.9])
        && fullIn(s, [-1, 1.7, 1], [1, 1.9, 11]),
      'shaft hole 12 deep': emptyIn(s, [-1, -1, 11.8], [1, 1, 11.95]) && fullIn(s, [-1, -1, 12.05], [1, 1, 12.3]),
      // Grooves at 0°, 90°, 180°, 270° (every 10°), solid between them.
      'knurl grooves every 10°, 0.8 deep': emptyIn(s, [17.0, -0.4, 4], [17.6, 0.4, 16])
        && emptyIn(s, [-0.4, 17.0, 4], [0.4, 17.6, 16])
        && emptyIn(s, [-17.6, -0.4, 4], [-17.0, 0.4, 16])
        && emptyIn(s, [-0.4, -17.6, 4], [0.4, -17.0, 16])
        && fullIn(s, [16.9, 1.3, 4], [17.1, 1.7, 16])
        && fullIn(s, [16.5, -0.3, 4], [16.6, 0.3, 16]),
      'pointer groove on top along +Y': emptyIn(s, [-0.5, 2, 19.3], [0.5, 16, 20.1])
        && fullIn(s, [1, 5, 19.3], [2, 10, 19.9]) && fullIn(s, [-0.5, -10, 19.3], [0.5, -5, 19.9]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
