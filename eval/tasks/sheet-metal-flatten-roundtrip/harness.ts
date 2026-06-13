// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  const heightZ = s.bbox.max[2] - s.bbox.min[2];
  // The .kcad.ts script just builds the bent L-bracket. The flatten-pattern
  // roundtrip is gated by:
  //   - script lowers cleanly
  //   - the bent body has expected Z-extent
  // The roundtrip math itself is unit-tested in
  // tests/unit/backends/occt/flattenPattern.test.ts; this corpus task
  // verifies the script-level surface (sheetMetal + .bend + .flattenPattern
  // are all reachable through the public API).
  return {
    gates: {
      'evaluates clean': true,
      'non-empty bent solid': s.volume > 0,
      'fold visible in Z': heightZ > 10,
    },
    scored: {
      'fold rises to expected height (10-80 mm)': heightZ > 10 && heightZ < 80,
    },
  };
}
