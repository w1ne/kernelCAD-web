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
  const noSurfaceDiag = !(ev.diagnostics || []).some(
    d => d.code.startsWith('feature.surface-') || d.code.startsWith('feature.nurbs.'),
  );
  // The enclosure half: a 40×30×20 box sewn from 6 planar NURBS patches, plus a
  // r=5 boss penetrating the top. Box volume = 24000 mm³; the boss adds a small
  // protruding cylinder (~942 mm³ above the top face). Total ≈ 24940 mm³.
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no surface diagnostics': noSurfaceDiag,
    },
    scored: {
      'bbox spans ~40 mm in x (±2)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 40) < 2,
      'bbox spans ~30 mm in y (±2)':
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 30) < 2,
      // z extent = box height 20 mm + boss protrusion (boss starts 2 mm below
      // the top and rises BOSS_H=14 mm ⇒ 12 mm above the top): ~32 mm.
      'z extent covers box + boss (~32 mm)':
        (s.bbox.max[2] - s.bbox.min[2]) > 28 &&
        (s.bbox.max[2] - s.bbox.min[2]) < 36,
      'volume in enclosure+boss band (24000-26000 mm³)':
        s.volume > 24000 && s.volume < 26000,
    },
  };
}
