// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/cqe-task-find-then-fetch/harness.ts
//
// Gates the discovery chain:
//   - Script evaluates clean (no diagnostics).
//   - The returned Shape originates from the NEMA 17 bundled record.

import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

const NEMA17_FRAME_MM = 42.3;

export default async function harness(
  scriptPath: string,
): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  // NEMA 17 frame is 42.3 mm; bbox in X (or Y) must be within ±2 mm.
  let bboxOk = false;
  try {
    const shape = await getShapeInfo(scriptPath);
    const extentX = shape.bbox.max[0] - shape.bbox.min[0];
    bboxOk = Math.abs(extentX - NEMA17_FRAME_MM) <= 2;
  } catch {
    bboxOk = false;
  }
  return {
    gates: {
      'evaluates clean': true,
      'returned shape is NEMA 17': bboxOk,
    },
    scored: {},
  };
}
