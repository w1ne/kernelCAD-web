// tests/unit/assemblies/mechanismSweepBudget.test.ts
//
// Issue #348: the BREP-lowering mechanism-truth criteria (2 interpenetration,
// 3 dof-mismatch, 7 joint-mesh-gap, 8 tendon-body-intersect) lower the whole
// assembly once per pose sample. On a dense mechanism (e.g. the 24-part
// Gearfinity planetary stage) that Cartesian cost times the CLI out past
// 5 minutes. `checkMechanismTruth` now estimates the sweep work up front
// (deterministically, from the assembly graph — no lowering, no wall-clock)
// and SKIPS the sweep when it exceeds `BREP_SWEEP_BUDGET`, degrading the
// verdict to `'unverified'` instead of grinding.
//
// This file pins that gate with a tiny hand-rolled hinge so the behaviour is
// covered without paying the multi-minute heavy-assembly cost:
//   - sweepBudget: 0      → over budget → sweep skipped → 'unverified', no failures
//   - sweepBudget: 1e9    → under budget → sweep runs → NOT 'unverified'

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import {
  checkMechanismTruth,
  effectiveSweepBudget,
  BREP_SWEEP_BUDGET,
  BREP_SWEEP_BUDGET_CEILING,
} from '../../../src/modeling/runtime/mechanismTruth';

function makeHinge() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('hinge-fixture');
  arm.part('a', kcad.box(20, 10, 10))
     .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
  arm.part('b', kcad.box(30, 5, 5))
     .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
  arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 90] });
  return arm;
}

describe('checkMechanismTruth — BREP-sweep budget gate (issue #348)', () => {
  it('skips the BREP sweep and returns unverified when work exceeds the budget', async () => {
    const arm = makeHinge();
    // A zero budget forces the over-budget branch for any assembly with
    // parts and samples. The cheap criteria (1 fastened — no-op for a
    // revolute-only arm; 4 orphan — graph-connected) find nothing.
    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.mechanism).toBe('unverified');
  });

  it('emits a LOUD structured diagnostic (not just console.warn) when the sweep is skipped', async () => {
    const arm = makeHinge();
    // The over-budget skip used to push NOTHING into failures and only
    // console.warn — so an 'unverified' verdict carried no machine-readable
    // signal. It must now push exactly one structured diagnostic carrying
    // the work estimate, the budget, and the part count.
    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.mechanism).toBe('unverified');
    const budgetDiags = result.failures.filter(
      (d) => d.code === 'mechanism.unverified-budget-exceeded',
    );
    expect(budgetDiags).toHaveLength(1);
    // Diagnostic is a non-fatal carrier of the skip, NOT a 'broken' verdict.
    expect(budgetDiags[0].severity).toBe('warn');
    // Carries the evidence: estimated work, budget, part count.
    expect(budgetDiags[0].message).toMatch(/budget/i);
    expect(budgetDiags[0].message).toContain('2'); // 2 parts in the hinge
  });

  describe('effectiveSweepBudget — auto-scale to part count, clamped to a ceiling', () => {
    it('keeps the fixed floor for small assemblies', () => {
      // 2 parts × 60 = 120 < 300 floor, so the fixed budget wins.
      expect(effectiveSweepBudget(2)).toBe(BREP_SWEEP_BUDGET);
    });

    it('scales above the fixed floor as part count grows', () => {
      // A ~33-part assembly would blow past the old fixed 300 on pose
      // samples alone; the auto-scaled budget tracks part count so it is
      // actually swept rather than silently dropped.
      expect(effectiveSweepBudget(33)).toBeGreaterThan(BREP_SWEEP_BUDGET);
      expect(effectiveSweepBudget(33)).toBe(33 * 60);
    });

    it('clamps to the ceiling so a pathological dense assembly still bails LOUDLY', () => {
      // 100 parts × 60 = 6000 would exceed the ceiling; clamp to it so a
      // 100-part × 13-pose blow-up (work ≫ ceiling) still degrades to
      // unverified rather than hanging.
      expect(effectiveSweepBudget(100)).toBe(BREP_SWEEP_BUDGET_CEILING);
    });

    it('honours a caller override verbatim (no clamp) as the escape hatch / test seam', () => {
      expect(effectiveSweepBudget(100, Infinity)).toBe(Infinity);
      expect(effectiveSweepBudget(2, 0)).toBe(0);
    });
  });

  it('runs the full sweep (verdict is real or broken, never unverified) under a generous budget', async () => {
    const arm = makeHinge();
    const result = await checkMechanismTruth(arm, { sweepBudget: 1e9 });
    // The sweep actually ran, so the verdict is a definitive real/broken —
    // the budget no longer forces a degrade. (Which of the two depends on
    // the criterion outcomes for this hand-rolled hinge; the point is that
    // the budget gate is what controls the skip.)
    expect(result.mechanism).not.toBe('unverified');
  });
});
