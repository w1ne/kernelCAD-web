// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/spur-gear-pair/harness.ts
//
// Gates: the script evaluates; each gear exports as ONE connected,
// watertight STL body (a hand-sampled involute that self-crosses leaves
// floating teeth); the pair has zero intersection volume at m(z1+z2)/2.
// Scored: centre distance and tip diameters match the spec.

import { readFileSync } from 'node:fs';
import { evaluateScript } from '../../oracle/kernelcad-client';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { stlStats } from '../../../tests/helpers/stlStats';
import type { HarnessResult } from '../../types';

const M = 1.5;
const Z1 = 18;
const Z2 = 36;

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };

  await initOcct();
  const code = readFileSync(scriptPath, 'utf8');
  const exported = await runAndExportParts({ code, fileName: scriptPath });
  const pinion = exported.parts.find((p) => p.name === 'pinion');
  const gear = exported.parts.find((p) => p.name === 'gear');
  if (!pinion || !gear) {
    return { gates: { 'evaluates clean': true, 'parts pinion + gear present': false }, scored: {} };
  }
  const ps = stlStats(pinion.bytes);
  const gs = stlStats(gear.bytes);
  const oneBody = pinion.report.ok && gear.report.ok && ps.components === 1 && gs.components === 1;

  const interference = await checkInterference({ code, fileName: scriptPath, epsilonMm3: 1e-6 });

  const centreX = (b: typeof ps.bbox) => (b.min[0] + b.max[0]) / 2;
  const width = (b: typeof ps.bbox) => b.max[0] - b.min[0];
  return {
    gates: {
      'evaluates clean': true,
      'parts pinion + gear present': true,
      'each gear is one watertight body': oneBody,
      'no interference at nominal centre distance': interference.pairs.length === 0,
    },
    scored: {
      'centre distance m(z1+z2)/2': Math.abs(centreX(gs.bbox) - centreX(ps.bbox) - (M * (Z1 + Z2)) / 2) < 0.05,
      'pinion tip diameter m(z1+2)': Math.abs(width(ps.bbox) - M * (Z1 + 2)) < 0.3,
      'gear tip diameter m(z2+2)': Math.abs(width(gs.bbox) - M * (Z2 + 2)) < 0.3,
    },
  };
}
