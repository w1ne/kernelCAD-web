// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Negative-task pattern (v0.7.5 kinematic-grounding eval corpus,
// repair-loop broken half): the expert solution asserts in-script that
// Gate 1 fired and throws otherwise. So a clean evaluate <=> Gate 1
// `assembly.mounting-hole.mismatch` fired as designed.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (gate fired as designed)': ev.ok,
    },
    scored: {},
  };
}
