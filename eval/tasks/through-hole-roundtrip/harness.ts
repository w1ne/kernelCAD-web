// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  const plateVol = 100 * 60 * 5;
  const boreVol = Math.PI * 3 * 3 * 5;
  const removed = plateVol - s.volume;
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'bbox is plate-sized':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 100) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 60)  < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 5)   < 0.5,
      'hole was drilled (through)': removed > boreVol * 0.9 && removed < boreVol * 1.1,
    },
    scored: {},
  };
}
