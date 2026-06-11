// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);

  // Base: 100·100·3 = 30000 mm³. 24 fins: 3·25·12 = 900 mm³ each = 21600 mm³.
  // Disjoint placement (X spacing 12 > fin width 3; Y spacing 30 > fin depth 25).
  // Total ≈ 51600 mm³.
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of base + 24 disjoint fins':
        s.volume > 51200 && s.volume < 52000,
      'bbox X is base-wide (~100)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 100) < 1,
      'bbox Z spans base + fin top (~15)':
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 15) < 1,
    },
  };
}
