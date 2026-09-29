// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-step-modify/harness.ts
//
// U15 modify an imported STEP. The input is made fresh from the U2 task: its
// expert solution is exported to STEP into a scratch directory, the script
// under test is copied next to it as the user's script, and built there. See
// eval/tasks/USECASES.md.
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, exportAs, hasHoles, near, part, standardExports, standardGates, type HoleSpec,
  type UsecaseBuild,
} from '../../usecaseChecks';

const U2 = fileURLToPath(new URL('../usecase-nema17-mount/solution-expert.kcad.ts', import.meta.url));

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const source = await buildUsecase(U2);
  const step = await exportAs(source, 'step');
  if (!step.ok) return { gates: { 'input STEP exports': false }, scored: {} };
  const dir = mkdtempSync(join(tmpdir(), 'usecase-step-modify-'));
  writeFileSync(join(dir, 'input.step'), step.bytes);
  const script = join(dir, 'part.kcad.ts');
  copyFileSync(scriptPath, script);

  try {
    return await check(script, source);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function check(script: string, source: UsecaseBuild): Promise<HarnessResult> {
  const b = await buildUsecase(script);
  const gates = standardGates(b, ['body']);
  if (!gates['evaluates clean'] || b.parts.length !== 1) return { gates, scored: {} };
  const s = part(b, 'body');
  const before = source.parts[0].shape;
  const bb = bbox(s);
  const bb0 = bbox(before);
  const motorHole = (x: number, z: number, d: number): HoleSpec => ({ diameter: d, at: [x, 2.5, z], axis: [0, 1, 0] });

  return {
    gates,
    scored: {
      'bbox unchanged': bb.min.every((v, i) => near(v, bb0.min[i])) && bb.max.every((v, i) => near(v, bb0.max[i])),
      'two Ø5 holes through the top face at (±10, 35)': hasHoles(s, [
        { diameter: 5, at: [-10, 35, 2.5], axis: [0, 0, 1], kind: 'through', depth: 5 },
        { diameter: 5, at: [10, 35, 2.5], axis: [0, 0, 1], kind: 'through', depth: 5 },
      ]),
      'original motor holes kept': hasHoles(s, [
        motorHole(0, 30, 22), motorHole(-15.5, 14.5, 3.4), motorHole(15.5, 14.5, 3.4),
        motorHole(-15.5, 45.5, 3.4), motorHole(15.5, 45.5, 3.4),
      ]),
      'volume = imported minus two holes': near(s.volume(), before.volume() - 2 * Math.PI * 2.5 * 2.5 * 5, 1),
      ...(await standardExports(b, { solids: 1 })),
    },
  };
}
