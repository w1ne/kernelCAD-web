// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  const s = await getShapeInfo(scriptPath);
  const noNurbsDiag = !(ev.diagnostics || []).some(d => d.code.startsWith('feature.nurbs.'));
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no nurbs diagnostics': noNurbsDiag,
    },
    scored: {
      // Bounding box should span ~60 mm in x (rectangle width), plus a
      // couple mm in each direction from the 2 mm thicken offset.
      'bbox spans ~60 mm in x (±10)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 60) < 10,
      // Section stack covers z = 0..20, then the surface is thickened by
      // 2 mm on each side — z extent should be roughly 20..25 mm.
      'z extent in lofted-panel band':
        (s.bbox.max[2] - s.bbox.min[2]) > 15 &&
        (s.bbox.max[2] - s.bbox.min[2]) < 30,
      // The widest section has y in [-15, 15] (30 mm wide). Post-thicken
      // (offset both sides) adds another ~14 mm; total span in y can
      // reach ~45 mm.
      'y extent in section-width band':
        (s.bbox.max[1] - s.bbox.min[1]) > 25 &&
        (s.bbox.max[1] - s.bbox.min[1]) < 55,
    },
  };
}
