// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The enforcement half of the slice: a `feaStudy` that declares a
// `minSafetyFactor` makes `evaluate_script` FAIL when the part cannot clear
// it, through the same seam the DFM gates use.
//
// Two halves matter equally here:
//   - an overloaded part must fail, with the governing region named; and
//   - a part with no `minSafetyFactor` must cost nothing, because a gate that
//     silently runs a solver on every evaluate would be unusable.
//
// Skipped with a clear message when the external toolchain is absent.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { detectFeaToolchain, requireFeaToolchainIfDemanded, type FeaToolchain } from '../../../src/kernel/fea/toolchain';

// 60 x 12 x 3 mm PLA tab, fixed at one end, 250 N on the free end. Root
// bending stress is far past PLA's 50 MPa yield, so SF is well under 1.
const OVERLOADED = `
const tab = box(60, 12, 3);
tab.feaStudy({
  name: 'tab',
  material: 'pla',
  fixed: { atX: 0 },
  loads: [{ faces: { atX: 60 }, force: [0, 0, -250] }],
  meshSize: 2,
  minSafetyFactor: 2,
});
return tab;
`;

const UNGATED = OVERLOADED.replace('  minSafetyFactor: 2,\n', '');

let toolchain: FeaToolchain;
beforeAll(async () => {
  toolchain = await detectFeaToolchain();
});

describe('feaStudy evaluate-time gate', () => {
  it('fails the evaluation when the solved safety factor is below the declared minimum', async () => {
    if (!toolchain.ok) {
      requireFeaToolchainIfDemanded(toolchain);
      console.warn(`[skipped] FEA gate test needs ${toolchain.missing.join(' and ')}. ${toolchain.hint}`);
      expect(toolchain.missing.length).toBeGreaterThan(0);
      return;
    }
    const r = await evaluateScript({ code: OVERLOADED });
    expect(r.exitCode).toBe(1);
    const violation = r.diagnostics.find(d => d.code === 'fea.safety-factor.below-min');
    expect(violation, 'the gate should raise fea.safety-factor.below-min').toBeDefined();
    expect(violation!.severity).toBe('error');
    // The message has to carry enough for the agent to act without a re-run.
    expect(violation!.message).toMatch(/minimum safety factor/);
    expect(violation!.message).toMatch(/governing region @kc\[/);
    expect(violation!.message).toMatch(/50 MPa yield for pla/);
  }, 600_000);

  it('does not run a solver for a study that declares no minSafetyFactor', async () => {
    const started = Date.now();
    const r = await evaluateScript({ code: UNGATED });
    // A solve on this mesh takes seconds; a records scan takes milliseconds.
    expect(Date.now() - started).toBeLessThan(20_000);
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics.filter(d => d.code.startsWith('fea.'))).toEqual([]);
  }, 60_000);

  it('reports a skipped gate as UNVERIFIED rather than as a pass', async () => {
    const prev = process.env.KERNELCAD_FEA_GATE;
    process.env.KERNELCAD_FEA_GATE = 'off';
    try {
      const r = await evaluateScript({ code: OVERLOADED });
      const skip = r.diagnostics.find(d => d.code === 'fea.solver.unavailable');
      expect(skip, 'switching the gate off must still say so').toBeDefined();
      expect(skip!.message).toMatch(/UNVERIFIED, not satisfied/);
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_FEA_GATE;
      else process.env.KERNELCAD_FEA_GATE = prev;
    }
  }, 60_000);
});
