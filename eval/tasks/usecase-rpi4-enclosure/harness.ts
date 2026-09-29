// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-rpi4-enclosure/harness.ts
//
// U3 Raspberry Pi 4 enclosure: shell, standoffs and screw paths on the real
// hole pattern, every port opening against the real connector positions,
// lid vents, fit, min wall, and a 3MF plate layout. See
// eval/tasks/USECASES.md.
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bboxIs, emptyIn, evaluateScriptVerdict, exportAs, fullIn, hasHoles, minWallOk, part,
  standardExports, standardGates, threeMfObjects, type HoleSpec,
} from '../../usecaseChecks';

const O = 3.5; // board origin in the enclosure
const HOLES: [number, number][] = [[7, 7], [65, 7], [7, 56], [65, 56]];
const BOARD_TOP = 8.5;

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['base', 'lid']);
  if (!gates['evaluates clean'] || !gates['parts: base, lid']) return { gates, scored: {} };
  const base = part(b, 'base');
  const lid = part(b, 'lid');

  // A port opening: the wall is open over the connector's face (shrunk 0.1).
  const south = (x: number, w: number, h: number) =>
    emptyIn(base, [O + x - w / 2 + 0.1, -0.1, BOARD_TOP + 0.1], [O + x + w / 2 - 0.1, 2.1, BOARD_TOP + h - 0.1]);
  const east = (y: number, w: number, h: number) =>
    emptyIn(base, [89.9, O + y - w / 2 + 0.1, BOARD_TOP + 0.1], [92.1, O + y + w / 2 - 0.1, BOARD_TOP + h - 0.1]);

  const plate = await exportAs(b, '3mf', { format: '3mf', arrange: 'plate', orient: true });
  const objs = plate.ok ? threeMfObjects(plate.bytes) : [];
  const apart = objs.length === 2 && (objs[0].max[0] <= objs[1].min[0] || objs[1].max[0] <= objs[0].min[0]
    || objs[0].max[1] <= objs[1].min[1] || objs[1].max[1] <= objs[0].min[1]);

  return {
    gates,
    scored: {
      'base 92 x 63 x 27': bboxIs(base, [0, 0, 0], [92, 63, 27]),
      'lid closes the top (z 27..29)': bboxIs(lid, [0, 0, 8.7], [92, 63, 29]) && fullIn(lid, [10, 3, 27.05], [20, 60, 28.95]),
      'base and lid do not overlap': base.intersectionVolume(lid) < 1e-6,
      '2 mm walls': fullIn(base, [0.05, 42, 12], [1.95, 55, 25]) && emptyIn(base, [2.05, 42, 12], [5, 55, 25])
        && fullIn(base, [30, 61.05, 12], [60, 62.95, 25]) && emptyIn(base, [30, 58, 12], [60, 60.95, 25]),
      '2 mm floor': fullIn(base, [20, 20, 0.05], [60, 40, 1.95]) && emptyIn(base, [20, 20, 2.05], [60, 40, 26]),
      'standoffs on the 58 x 49 pattern, tops at z = 7, M2.5 pilots': hasHoles(base,
        HOLES.map(([x, y]): HoleSpec => ({ diameter: 2.2, at: [x, y, 5], axis: [0, 0, 1], kind: 'blind' })))
        && HOLES.every(([x, y]) => fullIn(base, [x + 1.3, y - 0.4, 2.5], [x + 2.8, y + 0.4, 6.95])
          && emptyIn(base, [x - 3, y - 3, 7.05], [x + 3, y + 3, 8.4])),
      'four M2.5 screw paths through the lid, on the standoff axes': hasHoles(lid,
        HOLES.map(([x, y]): HoleSpec => ({ diameter: 2.9, at: [x, y, 20], axis: [0, 0, 1], kind: 'through' }))),
      'USB-C, 2 x micro-HDMI, audio openings (y = 0 wall)': south(11.2, 9, 3.3) && south(26, 7, 3.2)
        && south(39.5, 7, 3.2) && south(54, 6, 6),
      '2 x USB, Ethernet openings (x = 92 wall)': east(9, 13.5, 16) && east(27, 13.5, 16) && east(45.75, 16, 13.5),
      'micro-SD slot under the board (x = 0 wall)': emptyIn(base, [-0.1, O + 28 - 6, 4.5], [2.1, O + 28 + 6, 7]),
      'vent slots through the lid': [0, 4, 9].every((i) => emptyIn(lid, [22.1 + 5 * i, 17, 26.9], [24.4 + 5 * i, 46, 29.1]))
        && fullIn(lid, [24.6, 17, 27.1], [26.9, 46, 28.9]),
      'dfm min wall 1.2 mm': minWallOk(b, 1.2),
      'evaluate_script accepts the parts (mechanism gate on)': await evaluateScriptVerdict(scriptPath),
      ...(await standardExports(b, { solids: 2, threeMf: true })),
      '3MF plate layout: both parts flat on the bed, apart': apart && objs.every((o) => Math.abs(o.min[2]) < 0.01),
    },
  };
}
