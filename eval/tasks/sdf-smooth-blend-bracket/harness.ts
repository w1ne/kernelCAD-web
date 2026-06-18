// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  const noSdfDiag = !(ev.diagnostics || []).some(d => d.code.startsWith('feature.sdf.'));
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no sdf diagnostics': noSdfDiag,
    },
    scored: {
      // Plate (30x20x4) dominates X/Y; pin (r=5, h=16) extends in +Z and -Z.
      // smoothBlend padding extends each face by k=2 → bbox ≈ [-17,17]x[-12,12]x[-10,10].
      'x extent within plate-with-pad band':
        (s.bbox.max[0] - s.bbox.min[0]) > 28 &&
        (s.bbox.max[0] - s.bbox.min[0]) < 38,
      'y extent within plate-with-pad band':
        (s.bbox.max[1] - s.bbox.min[1]) > 18 &&
        (s.bbox.max[1] - s.bbox.min[1]) < 28,
      'z extent in cylinder-plus-pad band':
        (s.bbox.max[2] - s.bbox.min[2]) > 14 &&
        (s.bbox.max[2] - s.bbox.min[2]) < 22,
    },
  };
}
