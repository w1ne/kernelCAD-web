// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Negative-task pattern (v0.7.5 kinematic-grounding eval corpus): the
// expert solution calls `arm.solvedModel({}, { validate: 'warn' })` and
// throws from the script if `scene.warnings` does not include the
// expected diagnostic code. So a clean evaluate <=> the Gate 2
// `assembly.joint-axis.unbound` diagnostic fired as designed.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (gate fired as designed)': ev.ok,
    },
    scored: {},
  };
}
