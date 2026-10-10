// tests/unit/assemblies/mechanismSweepBudget.test.ts
//
// Issue #348: the BREP-lowering mechanism-truth criteria (2 interpenetration,
// 3 dof-mismatch, 8 tendon-body-intersect) lower the whole assembly once
// per pose sample. On a dense mechanism (e.g. the 24-part Gearfinity
// planetary stage) that Cartesian cost times the CLI out past 5 minutes.
// `checkMechanismTruth` estimates the sweep work up front (deterministically,
// from the assembly graph — no wall-clock) and SKIPS that sweep when it
// exceeds `BREP_SWEEP_BUDGET`, degrading the verdict to `'unverified'`
// instead of grinding. Rest-pose joint-mesh continuity (criterion 7) is
// not part of the sweep: a floating link is `'broken'` even at budget 0.
//
// This file pins that gate with a tiny hand-rolled hinge so the behaviour is
// covered without paying the multi-minute heavy-assembly cost:
//   - sweepBudget: 0 on a meeting hinge → sweep skipped → 'unverified'
//   - sweepBudget: 0 on a floating link → joint-mesh-gap → 'broken'
//   - sweepBudget: 1e9    → under budget → sweep runs → NOT 'unverified'

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import {
  checkMechanismTruth,
  effectiveSweepBudget,
  BREP_SWEEP_BUDGET,
} from '../../../src/modeling/runtime/mechanismTruth';

function makeHinge() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
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
    // The hinge faces meet, so the rest-pose body check that still runs
    // under a skipped sweep must not invent a gap.
    expect(result.failures.filter((d) => d.code === 'mechanism.joint-mesh-gap')).toEqual([]);
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

  describe('effectiveSweepBudget — fixed, tractable-time budget (NOT auto-scaled)', () => {
    it('returns the fixed budget regardless of part count', () => {
      // The budget is calibrated to the largest sweep that completes in
      // tractable time (~0.9 s/work-unit), NOT scaled to part count — a
      // bigger budget would let a 600–900-work-unit sweep RUN for 5–13 min
      // and hang the caller. Heavy assemblies skip LOUDLY instead.
      expect(effectiveSweepBudget()).toBe(BREP_SWEEP_BUDGET);
    });

    it('honours a caller override as the escape hatch / test seam', () => {
      expect(effectiveSweepBudget(Infinity)).toBe(Infinity);
      expect(effectiveSweepBudget(0)).toBe(0);
    });
  });

  it('fails a floating link as broken even when the pose sweep is over budget', async () => {
    // The check that used to be skipped with the sweep: a child whose
    // mesh never meets the parent must not come back 'unverified'.
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('floating-claw');
    arm.part('wrist', kcad.box(20, 20, 10, true).translate(0, 0, -5))
      .connector('jaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 1, 0] });
    arm.part('claw', kcad.box(20, 20, 20, true).translate(0, 0, 13))
      .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    arm.mate('jaw', 'wrist.jaw', 'claw.in', 'revolute', { pose: 0, limitsDeg: [-45, 45] });
    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.mechanism).toBe('broken');
    const gaps = result.failures.filter((d) => d.code === 'mechanism.joint-mesh-gap');
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    expect(gaps.some((d) => d.severity === 'error')).toBe(true);
    // The skipped sweep is still reported, and it does not hide the gap.
    expect(result.failures.some((d) => d.code === 'mechanism.unverified-budget-exceeded')).toBe(true);
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
