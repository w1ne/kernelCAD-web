// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-floor-plan/harness.ts
//
// U8 floor plan: room, walls, door and window openings, furniture, the PDF
// plan drawing with feet-and-inches labels, the DXF plan section and the 3D
// exports. See eval/tasks/USECASES.md.
import { strFromU8 } from 'fflate';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bboxIs, emptyIn, exportAs, fullIn, part, standardExports, standardGates,
} from '../../usecaseChecks';

const W = 3048;
const D = 3657.6;
const H = 2438.4;
const T = 101.6;

const LABELS: Array<{ from: [number, number, number]; to: [number, number, number]; text: string }> = [
  { from: [0, 0, H], to: [W, 0, H], text: `10'-0"` },
  { from: [0, 0, H], to: [0, D, H], text: `12'-0"` },
  { from: [300, 0, H], to: [1112.8, 0, H], text: `2'-8" door` },
  { from: [914.4, D, H], to: [2133.6, D, H], text: `4'-0" window` },
  { from: [0, 1000, H], to: [T, 1000, H], text: `4" wall` },
];

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');

  const pdf = await exportAs(b, 'pdf-drawing', {
    format: 'pdf-drawing',
    sheet: 'auto',
    title: 'Bedroom floor plan',
    annotations: LABELS.map((l) => ({ kind: 'linear' as const, view: 'top' as const, ...l })),
  });
  const report = pdf.result.drawingReport;
  const drawn = new Set((report?.annotations ?? []).map((a) => a.text));

  // The plan view as a DXF: the section through the walls at 1 m.
  const dxf = await exportAs(b, 'dxf', { format: 'dxf', section: { axis: 'z', at: 1000 } });
  const dxfText = dxf.ok ? strFromU8(dxf.bytes) : '';

  return {
    gates,
    scored: {
      'room 10 x 12 ft, 8 ft walls': bboxIs(s, [0, 0, 0], [W, D, H]),
      'walls 4 in thick': fullIn(s, [0.05, 500, 100], [T - 0.05, 1000, 2000]) && emptyIn(s, [T + 0.05, 500, 1], [300, 1000, H]),
      '32 in door in the south wall': emptyIn(s, [300.05, -1, 0], [1112.75, T + 1, H])
        && fullIn(s, [200, 1, 100], [299.95, T - 1, 2000]) && fullIn(s, [1112.85, 1, 100], [1200, T - 1, 2000]),
      '48 in window in the north wall, sill 750': emptyIn(s, [914.45, D - T - 1, 750.05], [2133.55, D + 1, 1949.95])
        && fullIn(s, [1000, D - T + 1, 100], [2000, D - 1, 749.95]) && fullIn(s, [1000, D - T + 1, 1950.05], [2000, D - 1, 2400]),
      'queen bed 60 x 80 in against the north wall': fullIn(s, [762.05, 1524.05, 1], [2285.95, 3555.95, 499])
        && emptyIn(s, [712, 2000, 1], [761.95, 3000, 499]) && emptyIn(s, [800, 1400, 1], [2200, 1523.95, 499])
        && emptyIn(s, [800, 1600, 500.05], [2200, 3500, 600]),
      'wardrobe 48 x 24 in against the west wall': fullIn(s, [T + 0.05, 2200.05, 1], [711.15, 3419.15, 1799])
        && emptyIn(s, [711.25, 2300, 1], [760, 3300, 1799]),
      'PDF plan drawing exports': pdf.ok && strFromU8(pdf.bytes.subarray(0, 5)) === '%PDF-',
      'plan dimensions in feet and inches, clear of each other': LABELS.every((l) => drawn.has(l.text))
        && (report?.overlapped ?? 1) === 0,
      'DXF plan section exports': dxf.ok && dxfText.includes('LWPOLYLINE'),
      ...(await standardExports(b, { solids: 1 })),
    },
  };
}
