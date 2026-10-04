// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-drill-jig/harness.ts
//
// U12 drill jig: guide hole position and length, the 18 mm board slot with
// both cheeks and the end fence, min wall and exports. See
// eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, emptyIn, findHole, fullIn, minWallOk, part, standardExports, standardGates,
} from '../../usecaseChecks';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');
  const guide = findHole(s, { diameter: 8, at: [9, 20, 5], axis: [0, 0, 1], kind: 'through' });

  return {
    gates,
    scored: {
      'Ø8 guide hole along Z at x = 9, y = 20, through': guide !== undefined,
      'guide at least 10 long': (guide?.depthMm ?? 0) >= 10 - 0.1,
      'guide sits on the edge face (z = 0)': fullIn(s, [1, 25, 0.05], [17, 30, 1]),
      '18 mm board slot below the edge': emptyIn(s, [0.05, 0.05, -30], [17.95, 100, -0.05]),
      'cheeks hug both board faces': fullIn(s, [-1.2, 1, -10], [-0.05, 30, -1]) && fullIn(s, [18.05, 1, -10], [19.2, 30, -1]),
      'fence across the board end': fullIn(s, [1, -1.2, -10], [17, -0.05, -1]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
