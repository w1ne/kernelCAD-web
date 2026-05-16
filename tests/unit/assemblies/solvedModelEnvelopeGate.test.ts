// tests/unit/assemblies/solvedModelEnvelopeGate.test.ts
//
// Originally v0.6.2 / v0.7.5 Phase 1 hard-gate wiring: implicit envelope
// auto-run when `arm.solvedModel({}, { validate: 'error' })` was called AND
// any mate had scalar limits. That implicit-auto path was retired during the
// v0.7.5 → develop merge in favor of the explicit `posesGate: 'envelope'`
// surface (PR #157 / workstream 5a). The covered behavior moved to:
//   - `src/capture/posesGate.test.ts` for `posesGate: 'envelope'` semantics.
//   - The `assembly.mate.limit-missing` warning in
//     `src/lib/mates/validator.test.ts` for the authoring-side nudge.
//
// This file keeps the limit-induced-collision regression scenario, but routes
// it through the explicit `posesGate: 'envelope'` opt so the v0.6.2 plan's
// `agent-safety closure for limit-induced collisions` remains under test —
// it just lives under the new public API.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('Assembly.solvedModel — envelope gate (explicit posesGate, post-merge)', () => {
  it('throws on limit-induced collision when posesGate=envelope and validate=error', async () => {
    // Hinged arm where pose=0 is collision-free, but sweeping to the
    // declared upper limit (180°) rotates part b back into part a. The
    // v0.6.0 single-pose interference check only sees pose=0 and reports
    // no overlap; only the envelope sampling (m:min, m:max) catches the
    // limit-induced collision.
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(30, 5, 5))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });

    await expect(arm.solvedModel({}, { validate: 'error', posesGate: 'envelope' }))
      .rejects.toMatchObject({ hint: expect.stringMatching(/pose-envelope-interference/i) });
  });

  it('does NOT auto-run envelope under validate=warn without posesGate (perf)', async () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(30, 5, 5))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });

    const scene = await arm.solvedModel({}, { validate: 'warn' });
    // No envelope codes in warnings — envelope didn't run.
    const codes = scene.warnings.map((d) => d.code);
    expect(codes).not.toContain('assembly.pose-envelope.interference');
  });

  it('does NOT auto-run envelope under validate=error without posesGate (post-merge contract)', async () => {
    // Post-merge contract change: default `posesGate: 'default'` keeps the
    // envelope review OFF even under `validate: 'error'`. The
    // limit-induced-collision case above only fires when the caller opts in
    // via `posesGate: 'envelope'`. The legacy v0.6.2 implicit auto-wire is
    // gone; agents who want envelope coverage must request it.
    const { arm, kcad } = makeArm();
    // Two boxes overlapping at default pose (single-pose interference still
    // fires, but envelope codes must not appear in the thrown error).
    arm.part('a', kcad.box(20, 10, 10))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
    arm.part('b', kcad.box(30, 5, 5))
       .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 180] });

    // Default posesGate keeps envelope OFF; the call resolves cleanly even
    // though `posesGate: 'envelope'` would have thrown.
    await expect(arm.solvedModel({}, { validate: 'error' })).resolves.toBeDefined();
  });

  it('preserves v0.6.0 single-pose interference gate when no mate has limits', async () => {
    // Two boxes overlapping at default pose (no limits declared). The
    // single-pose check fires regardless of posesGate.
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(10, 10, 10)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('b', kcad.box(10, 10, 10)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m', 'a.o', 'b.o', 'fastened');

    await expect(arm.solvedModel({}, { validate: 'error' }))
      .rejects.toThrow(/interference|overlap/i);
  });
});
