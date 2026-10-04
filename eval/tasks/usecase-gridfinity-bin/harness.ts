// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-gridfinity-bin/harness.ts
//
// U4 Gridfinity bin: outline, the per-cell foot profile measured at three
// heights, magnet holes, cavity, divider, min wall and exports. See
// eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bboxIs, emptyIn, fullIn, hasHoles, minWallOk, part, standardExports, standardGates,
  type HoleSpec,
} from '../../usecaseChecks';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const CELLS = [-21, 21];

/** The foot's half-width at height z is `half`: solid just inside, empty just outside (both cells, ±X). */
function footHalfWidth(s: OcctBackend, z: number, half: number): boolean {
  const z0 = z - 0.02;
  const z1 = z + 0.02;
  return CELLS.every((cx) => [-1, 1].every((side) => {
    const inner = [cx + side * (half - 0.4), cx + side * (half - 0.12)].sort((a, b) => a - b);
    const outer = [cx + side * (half + 0.12), cx + side * (half + 0.4)].sort((a, b) => a - b);
    return fullIn(s, [inner[0], -5, z0], [inner[1], 5, z1]) && emptyIn(s, [outer[0], -5, z0], [outer[1], 5, z1]);
  }));
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');

  const magnets: HoleSpec[] = [];
  for (const cx of CELLS) {
    for (const [dx, dy] of [[13, 13], [13, -13], [-13, 13], [-13, -13]]) {
      magnets.push({ diameter: 6.5, at: [cx + dx, dy, 1], axis: [0, 0, 1], kind: 'blind', depth: 2.4 });
    }
  }

  return {
    gates,
    scored: {
      'bbox 83.5 x 41.5 x 42': bboxIs(s, [-41.75, -20.75, 0], [41.75, 20.75, 42]),
      // Half-widths: 17.8 at z = 0 (+z on the chamfer), 18.6 on the straight,
      // 18.6 + (z − 2.6) on the top chamfer, 20.75 above the base.
      'foot bottom chamfer: 35.6 wide at z = 0': footHalfWidth(s, 0.03, 17.83),
      'foot straight: 37.2 wide at z = 0.8..2.6': footHalfWidth(s, 1.7, 18.6),
      'foot top chamfer: widens at 45° to z = 4.75': footHalfWidth(s, 3.675, 19.675),
      'full 41.5 outline above the base': fullIn(s, [-5, 20.2, 5], [5, 20.7, 6]) && emptyIn(s, [-5, 20.8, 5], [5, 21.5, 41]),
      'feet separate at the bottom': emptyIn(s, [-3, -5, 0], [3, 5, 0.05]),
      'eight Ø6.5 x 2.4 magnet holes at ±13 from each cell centre': hasHoles(s, magnets),
      'open cavity above a floor': fullIn(s, [5, -10, 4.8], [15, 10, 5.9]) && emptyIn(s, [5, -10, 6.1], [15, 10, 43]),
      'one divider at x = 0': fullIn(s, [-0.6, -15, 10], [0.6, 15, 41])
        && emptyIn(s, [-15, -10, 7], [-5, 10, 41]) && emptyIn(s, [5, -10, 7], [15, 10, 41]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 1, threeMf: true })),
    },
  };
}
