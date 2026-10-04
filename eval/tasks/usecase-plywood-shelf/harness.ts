// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-plywood-shelf/harness.ts
//
// U9 plywood shelf for a CNC: board sizes, dados, joint fit, compartments,
// the cut list, the per-part DXF and the 3D exports. See
// eval/tasks/USECASES.md.
import { strFromU8 } from 'fflate';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, bboxIs, emptyIn, evaluateScriptVerdict, exportAs, fullIn, part, standardExports,
  standardGates,
} from '../../usecaseChecks';

const BOARDS = ['bottom', 'shelf-1', 'shelf-2', 'shelf-3', 'shelf-4', 'top'];
const SIDES = ['side-left', 'side-right'];
const BOARD_Z = [9, 245.4, 481.8, 718.2, 954.6, 1191];

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, [...SIDES, ...BOARDS]);
  if (!gates['evaluates clean'] || !gates[`parts: ${[...SIDES, ...BOARDS].join(', ')}`]) return { gates, scored: {} };
  const left = part(b, 'side-left');
  const right = part(b, 'side-right');

  const all = b.parts.map((p) => bbox(p.shape));
  const min = [0, 1, 2].map((k) => Math.min(...all.map((x) => x.min[k])));
  const max = [0, 1, 2].map((k) => Math.max(...all.map((x) => x.max[k])));
  let overlap = 0;
  for (let i = 0; i < b.parts.length; i++) {
    for (let j = i + 1; j < b.parts.length; j++) overlap += b.parts[i].shape.intersectionVolume(b.parts[j].shape);
  }

  const bom = await exportAs(b, 'bom-csv');
  const rows = bom.ok ? strFromU8(bom.bytes).trim().split('\n').slice(1).map((r) => r.split(',')) : [];
  // Columns: item,name,quantity,kind,material,…,bboxMinX..bboxMaxZ at 8..13.
  const cut = rows.map((r) => ({
    qty: Number(r[2]),
    size: [0, 1, 2].map((k) => Number(r[11 + k]) - Number(r[8 + k])).sort((x, y) => x - y).map((v) => v.toFixed(1)).join('x'),
  }));

  const dxf = await exportAs(b, 'dxf');
  const dxfText = dxf.ok ? strFromU8(dxf.bytes) : '';

  return {
    gates,
    scored: {
      'overall 800 x 300 x 1200': [0, 0, 0].every((v, k) => Math.abs(min[k] - v) < 0.1)
        && [800, 300, 1200].every((v, k) => Math.abs(max[k] - v) < 0.1),
      'no parts overlap': overlap < 1e-6,
      'side panels 18 x 300 x 1200': bboxIs(left, [0, 0, 0], [18, 300, 1200]) && bboxIs(right, [782, 0, 0], [800, 300, 1200]),
      'boards 782 x 300 x 18 into the dados, five equal compartments': BOARDS.every((n, i) =>
        bboxIs(part(b, n), [9, 0, BOARD_Z[i] - 9], [791, 300, BOARD_Z[i] + 9])),
      'dados 9 deep, 18 wide, full depth, at every board': BOARD_Z.every((z) =>
        emptyIn(left, [9.05, -1, z - 8.95], [18.1, 301, z + 8.95]) && fullIn(left, [0.05, 1, z - 8.9], [8.95, 299, z + 8.9])
        && emptyIn(right, [781.9, -1, z - 8.95], [790.95, 301, z + 8.95]) && fullIn(right, [791.05, 1, z - 8.9], [799.95, 299, z + 8.9]))
        && fullIn(left, [9.05, 1, 30], [17.95, 299, 200]),
      'cut list: 2 x side 18x300x1200, 6 x board 18x300x782': cut.length === 2
        && cut.some((c) => c.qty === 2 && c.size === '18.0x300.0x1200.0')
        && cut.some((c) => c.qty === 6 && c.size === '18.0x300.0x782.0'),
      'DXF has the flat outline of every part': dxf.ok && dxfText.includes('LWPOLYLINE')
        && [...SIDES, ...BOARDS].every((n) => dxfText.includes(n)),
      ...(await standardExports(b, { solids: 8 })),
      'evaluate_script accepts the parts (mechanism gate on)': await evaluateScriptVerdict(scriptPath),
    },
  };
}
