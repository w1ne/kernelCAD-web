// tests/unit/assemblies/solvedModelEnvelopeGate.test.ts
//
// v0.6.2 hard-gate wiring: when `arm.solvedModel({}, { validate: 'error' })`
// is called AND any mate has scalar limits declared, the capture path runs
// `reviewPoseEnvelope(this, { includeInterference: true })` alongside the
// existing single-pose interference check and folds the envelope diagnostics
// into the validator stream. Under `'warn'` mode the envelope is skipped
// (perf-conscious; capture-time `arm.solvedModel()` stays cheap). Under
// `'error'` mode but with NO limits declared, the envelope is also skipped
// (no sampling work to do).
//
// Brought forward from v0.6.2 — see plans/2026-05-13-mechanism-validity-loop.md
// §Task 4 and plans/2026-05-15-v0.7-kinematic-grounding.md §Phase 1.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('Assembly.solvedModel({validate:"error"}) — envelope hard-gate (v0.6.2)', () => {
  it('throws on limit-induced collision when validate=error and at least one mate has limits', async () => {
    // Hinged arm where pose=0 is collision-free, but sweeping to the
    // declared upper limit (180°) rotates part b back into part a. This
    // exercises the envelope-wiring path: the v0.6.0 single-pose
    // interference check only sees pose=0 and reports no overlap; only the
    // envelope sampling (m:min, m:max) catches the limit-induced collision.
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(30, 5, 5))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });

    await expect(arm.solvedModel({}, { validate: 'error' }))
      .rejects.toThrow(/pose-envelope.interference|interference|overlap/i);
  });

  it('does NOT auto-run envelope under validate=warn (perf)', async () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(30, 5, 5))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });

    const scene = await arm.solvedModel({}, { validate: 'warn' });
    // warnings array doesn't contain envelope codes (because envelope didn't run)
    const codes = scene.warnings.map((d) => d.code);
    expect(codes).not.toContain('assembly.pose-envelope.interference');
  });

  it('does NOT run envelope when no mate has limits', async () => {
    const { arm, kcad } = makeArm();
    // Stack a (bottom, [0..10]^3) atop b (top, [0..10]×[0..10]×[10..20])
    // so the parts do not overlap at default pose — the test isolates the
    // "envelope skipped because no limits" behavior from the v0.6.0
    // single-pose interference gate.
    arm.part('a', kcad.box(10, 10, 10))
       .connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(10, 10, 10))
       .connector('i', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.o', 'b.i', 'revolute');   // no limitsDeg

    // Should not throw — single-pose interference doesn't fire (geometry
    // chosen to not overlap) and envelope is skipped (no limits).
    await arm.solvedModel({}, { validate: 'error' });   // no throw
  });

  it('preserves v0.6.0 single-pose interference gate when no mate has limits', async () => {
    // Two boxes overlapping at default pose (no limits declared, so envelope skips,
    // but single-pose check still fires).
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(10, 10, 10)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('b', kcad.box(10, 10, 10)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m', 'a.o', 'b.o', 'fastened');

    await expect(arm.solvedModel({}, { validate: 'error' }))
      .rejects.toThrow(/interference|overlap/i);
  });
});
