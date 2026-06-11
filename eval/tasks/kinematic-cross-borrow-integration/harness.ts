// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

// Cross-borrow integration eval: the expert solution chains three slices
// in one .kcad.ts file — a 3D NURBS curve (sampled for 8 stop positions),
// a topology-bound fastener (face-center connector origin → @kc[…]
// pathway), and kinematic.checkSweptCollision (37 samples). The script
// asserts all three slices' invariants in-script via throw, so a clean
// evaluate <=> the cross-borrow chain composed end to end without any
// slice drifting from contract.
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return {
    gates: {
      'evaluates clean (cross-borrow chain composed: curve + topo-ref + kinematic)': ev.ok,
    },
    scored: {},
  };
}
