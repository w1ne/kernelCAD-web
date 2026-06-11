// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Positive-task pattern (v0.7.5 kinematic-grounding eval corpus,
// repair-loop fixed half): clean evaluate plus a scan of diagnostics
// to make sure no kinematic-grounding code snuck through at any
// severity.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  const KINEMATIC_CODES = new Set([
    'assembly.mounting-hole.mismatch',
    'assembly.joint-axis.unbound',
    'assembly.joint.load-exceeded',
  ]);
  const offending = ev.diagnostics.filter((d) => KINEMATIC_CODES.has(d.code));
  return {
    gates: {
      'evaluates clean': ev.ok,
      'no kinematic-grounding diagnostics (any severity)': offending.length === 0,
    },
    scored: {},
  };
}
