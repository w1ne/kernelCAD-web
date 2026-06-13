// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      // True sphere volume = (4/3) π · 8³ ≈ 2144.66. Marching cubes at res 20
      // under-approximates by 10-25 %.
      'volume in sphere-approximation band': s.volume > 1500 && s.volume < 2300,
      'x extent ≈ 16 mm': Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 16) < 3,
      'y extent ≈ 16 mm': Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 16) < 3,
      'z extent ≈ 16 mm': Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 16) < 3,
    },
  };
}
