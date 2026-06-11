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
  // Plate 80×80×6 = 38400 mm³. 4 holes Ø5 through 6 = 4·π·6.25·6 ≈ 471 mm³.
  // Filleted lips reduce volume slightly. Expected ≈ 37925 ± wider tolerance.
  const expectedMin = 37700;
  const expectedMax = 38000;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of plate-minus-4-bolts':
        s.volume > expectedMin && s.volume < expectedMax,
      'bbox is plate-sized (80×80×6)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 80) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 80) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 6) < 0.5,
    },
  };
}
