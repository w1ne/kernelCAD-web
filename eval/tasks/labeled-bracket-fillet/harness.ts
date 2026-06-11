// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const src = readFileSync(scriptPath, 'utf8');
  const usesFaceLabels = src.includes('faceLabels');
  const usesFaceRim = src.includes("face: 'rim'") || src.includes('face: "rim"');

  const s = await getShapeInfo(scriptPath);
  const rawDims: [number, number, number] = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ];
  const dims = [...rawDims].sort((a, b) => b - a); // [largest, mid, smallest]
  const bboxVol = dims[0] * dims[1] * dims[2];
  const volRatio = s.volume / bboxVol;

  // A plain 50×30×10 box has volume == bboxVol (ratio == 1).
  // A 3 mm fillet on the 4 top edges removes roughly 1187 mm³ from the 15000 mm³ box,
  // giving a ratio ≈ 0.92. Gate: 0.85–0.999 catches "filleted but not hollowed out".
  const hasFillet = volRatio > 0.85 && volRatio < 0.999;

  // Bbox should stay close to 50×30×10 (fillet does not change the bbox extents).
  const sortedTarget = [50, 30, 10].sort((a, b) => b - a);
  const bboxMatchesBracket =
    Math.abs(dims[0] - sortedTarget[0]) < 1 &&
    Math.abs(dims[1] - sortedTarget[1]) < 1 &&
    Math.abs(dims[2] - sortedTarget[2]) < 1;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      // Discipline check: the agent must use faceLabels, not bypass with a direct canonical name.
      'uses faceLabels': usesFaceLabels,
      'references face rim': usesFaceRim,
    },
    scored: {
      // Volume in the expected filleted-bracket band (≈0.92, gate is 0.85–0.999).
      'volume in filleted-bracket band': volRatio > 0.88 && volRatio < 0.999,
      // Fillet present (vol < bboxVol).
      'fillet reduces volume': hasFillet,
      // Bbox matches the 50×30×10 bracket dimensions.
      'bbox matches bracket': bboxMatchesBracket,
      // Bracket sits on the build plane (Z min ≈ 0).
      'sits on build plane': Math.abs(s.bbox.min[2]) < 0.5,
    },
  };
}
