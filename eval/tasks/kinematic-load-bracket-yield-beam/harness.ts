// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Kinematic load-capacity eval: the expert solution fastens a 200×50×5 mm
// cantilever to a wall, runs the closed-form beam path once with steel
// (must succeed with SF >= 4) and once with PLA (must fire K6). Both
// branches are asserted in-script via throw, so a clean evaluate <=> the
// beam path returned both expected outcomes.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (kinematic.checkLoadCapacity asserted steel pass + PLA K6)': ev.ok,
    },
    scored: {},
  };
}
