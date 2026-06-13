// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Kinematic reachable eval: the expert solution builds a 6-DOF arm, asks the
// analytical IK for a reachable target (must succeed) and the numeric IK for
// a 5000 mm out-of-reach target (must fail with K3 kinematic.unreachable).
// Both branches are asserted in-script via throw, so a clean evaluate <=>
// the dispatcher routed both calls correctly.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (kinematic.checkReachable asserted both branches)': ev.ok,
    },
    scored: {},
  };
}
