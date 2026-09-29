// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-keychain/harness.ts
//
// U13 name keychain: plate, rounded corners, ring hole, raised text as its
// own coloured part, min wall and exports. See eval/tasks/USECASES.md.
import { strFromU8, unzipSync } from 'fflate';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, bboxIs, emptyIn, evaluateScriptVerdict, exportAs, hasHoles, minWallOk, near, part,
  standardExports, standardGates,
} from '../../usecaseChecks';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body', 'text'], { text: 4 });
  if (!gates['evaluates clean'] || !gates['parts: body, text']) return { gates, scored: {} };
  const body = part(b, 'body');
  const text = part(b, 'text');
  const tb = bbox(text);

  const threeMf = await exportAs(b, '3mf');
  let colours: string[] = [];
  try {
    const model = strFromU8(unzipSync(threeMf.bytes)['3D/3dmodel.model']);
    colours = [...model.matchAll(/<base\s+name="(?:body|text)"\s+displaycolor="([^"]+)"/g)].map((m) => m[1]);
  } catch {
    colours = [];
  }

  return {
    gates,
    scored: {
      'body 60 x 25 x 4': bboxIs(body, [-30, -12.5, 0], [30, 12.5, 4]),
      'rounded corners (r ≥ 1)': [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([sx, sy]) => emptyIn(body,
        [Math.min(sx * 29.6, sx * 30), Math.min(sy * 12.1, sy * 12.5), 0],
        [Math.max(sx * 29.6, sx * 30), Math.max(sy * 12.1, sy * 12.5), 4])),
      'Ø5 ring hole through at x = -22': hasHoles(body, [{ diameter: 5, at: [-22, 0, 2], axis: [0, 0, 1], kind: 'through' }]),
      'text raised 1 mm on the top face': near(tb.min[2], 4) && near(tb.max[2], 5),
      'text inside the outline, clear of the ring hole': tb.min[0] > -19.5 && tb.max[0] < 29 && tb.min[1] > -12 && tb.max[1] < 12,
      'body and text in different colours': colours.length === 2 && colours[0] !== colours[1],
      'dfm min wall 1.2 mm (body)': minWallOk(b, 1.2),
      ...(await standardExports(b, { solids: 5, threeMf: true })),
      'evaluate_script accepts the parts (mechanism gate on)': await evaluateScriptVerdict(scriptPath),
    },
  };
}
