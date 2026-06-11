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
  // Plate 50×50×8 = 20000 mm³. The D-shape's area depends on which side the
  // arc bulges; we accept any non-trivial pocket (50–2000 mm³ removed).
  const plateVol = 20000;
  const removed = plateVol - s.volume;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'pocket removed nontrivial volume': removed > 50 && removed < 2000,
      'bbox is plate-sized (50×50×8)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 50) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 50) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 8) < 0.5,
    },
  };
}
