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
  const usesFaceCap = src.includes("face: 'cap'") || src.includes('face: "cap"');

  const s = await getShapeInfo(scriptPath);

  // Expected volumes:
  //   Outer cylinder: π·10²·20 ≈ 6283 mm³
  //   Inner cavity (removed by shell): π·8²·18 ≈ 3619 mm³
  //   Result: outer − inner ≈ 2664 mm³ (actual measured: 2664.07)
  const expectedVolume = 2664;
  const volInBand = s.volume > expectedVolume * 0.85 && s.volume < expectedVolume * 1.15;

  // Z extents: cylinder base at z=0, top open at z=20 (label 'cap' = top face removed).
  const zMinOk = Math.abs(s.bbox.min[2]) < 0.5;
  const zMaxOk = Math.abs(s.bbox.max[2] - 20) < 0.5;

  // After translate(5, 0, 0): cylinder originally centered at x∈[-10, 10],
  // shifted to x∈[-5, 15].
  const xMinOk = Math.abs(s.bbox.min[0] - (-5)) < 0.5;
  const xMaxOk = Math.abs(s.bbox.max[0] - 15) < 0.5;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      // Discipline check: the agent must use faceLabels, not bypass with a direct canonical name.
      'uses faceLabels': usesFaceLabels,
      'references face cap': usesFaceCap,
    },
    scored: {
      // Volume in the expected hollow-cylinder band (≈2664 mm³, gate is 0.85–1.15×).
      'volume in hollow-cylinder band': volInBand,
      // Shape extends from z=0 (closed bottom) to z=20 (open top).
      'z extents match cylinder height': zMinOk && zMaxOk,
      // Post-translate, x-extents shifted by +5 (xMin=-5, xMax=+15).
      'x extents shifted by translate': xMinOk && xMaxOk,
    },
  };
}
