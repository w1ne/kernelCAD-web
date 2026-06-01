// tests/unit/assemblies/solvedModelGroundingGates.test.ts
//
// v0.7.4 Phase 6 hard-gate wiring: when `arm.solvedModel({}, { validate:
// 'error' })` is called, the capture path runs all three kinematic-grounding
// gates (Gate 1 mounting-hole consistency, Gate 2 joint-axis binding, Gate 3
// joint-load capacity) and folds their diagnostics into the validator
// stream. Under `'warn'` mode the gates run too (validator runs identically;
// only error-severity diagnostics turn into throws) and the codes show up on
// `scene.warnings`. Under `'off'` mode the validator does not run at all, so
// none of the new codes appear.
//
// See plans/2026-05-15-v0.7-kinematic-grounding.md §Phase 6 Step 1.

import { beforeAll, describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { MateLoadLimit, MateRecord } from '../../../src/modeling/mates/mate';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('Assembly.solvedModel({validate:"error"}) — kinematic grounding hard-gate (v0.7.4)', () => {
  // Pre-warm OCCT in this worker process before any test runs. Gate 1 / 2 /
  // 3 cases all reach `solveMates → resolveConnectorOrigin → shape.lower()`
  // for topology-bound connectors; under the full `npm test` run a worker
  // accumulates state across many files and the first lower in this file
  // can otherwise race against init in other OCCT-using paths. Matches the
  // pattern used by `tests/unit/backends/occt/*.test.ts`.
  beforeAll(async () => { await initOcct(); });

  it('surfaces mounting-hole diameter mismatch (Gate 1) as an info diagnostic — no throw', async () => {
    // Two parts joined by a fastened mate with topology-bound face-center
    // origins; the holes are Ø5 vs Ø6 — Gate 1 emits
    // `assembly.mounting-hole.mismatch`. Demoted to 'info' under the
    // physics-grounded loop (P3, 2026-06-01): the hard-gate no longer
    // flips on this code; the merge gate is mechanism.disconnect which
    // fires under motion. The diagnostic still appears on scene.warnings.
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm
      .part('a', a, { at: [0, 0, 0] })
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm
      .part('b', b, { at: [0, 0, 5] })
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const scene = await arm.solvedModel({}, { validate: 'error' });
    const codes = scene.warnings.map((d) => d.code);
    expect(codes).toContain('assembly.mounting-hole.mismatch');
    const mismatch = scene.warnings.find((d) => d.code === 'assembly.mounting-hole.mismatch');
    expect(mismatch?.severity).toBe('info');
  });

  it('surfaces floating joint axis (Gate 2) as an info diagnostic — no throw', async () => {
    // Revolute mate whose axis line floats 50 mm above both bodies — Gate 2
    // emits `assembly.joint-axis.unbound` on both sides. Demoted to
    // 'info' under the physics-grounded loop (P3, 2026-06-01): the hard-
    // gate no longer flips; the merge gate is mechanism.dof-mismatch
    // which fires under motion.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 50] }, axis: [1, 0, 0] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [10, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 50] }, axis: [1, 0, 0] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute', { limitsDeg: [-10, 10] });

    const scene = await arm.solvedModel({}, { validate: 'error' });
    const codes = scene.warnings.map((d) => d.code);
    expect(codes).toContain('assembly.joint-axis.unbound');
    const unbound = scene.warnings.find((d) => d.code === 'assembly.joint-axis.unbound');
    expect(unbound?.severity).toBe('info');
  });

  it('throws on load-exceeded (Gate 3) when externalLoads + maxLoad combine to exceed', async () => {
    // Revolute mate with declared `maxLoad.torque = 10` N·m; externalLoads
    // apply F = 1000 N at r = 50 mm → 50 N·m > 10 N·m. Gate 3 emits
    // `assembly.joint.load-exceeded` (error) — hard-gate flips.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    // Axis is bound: connector world origins lie on the shared face at x=10
    // so Gate 2 is satisfied. Connector origins are vec3 → Gate 1 emits info
    // notes for the fastened deferral check (not applicable here — this is a
    // revolute mate, so Gate 1 doesn't observe the sides at all).
    arm.mate('hinge', 'a.c', 'b.c', 'revolute', { limitsDeg: [-10, 10] });
    // Patch `maxLoad` directly — same pattern as jointLoadCapacity.test.ts.
    const mates = arm.__mates() as MateRecord[];
    (mates[0] as { maxLoad?: MateLoadLimit }).maxLoad = { torque: 10 };

    await expect(arm.solvedModel({}, {
      validate: 'error',
      externalLoads: { a: { force: [0, 0, -1000] } },
    })).rejects.toMatchObject({ hint: expect.stringMatching(/joint-load-exceeded/i) });
  });

  it('attaches all three codes to scene.warnings under validate=warn (no throw)', async () => {
    // Build a single assembly that trips all three gates simultaneously.
    // Under `validate: 'warn'` the BREP interference path is skipped, so
    // geometric overlap is not a concern; the gates' diagnostics still get
    // folded to scene.warnings — just no throw.
    const { arm, kcad } = makeArm();
    // Gate 1: fastened mate between two parts with mismatching hole diameters.
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm
      .part('fixA', a)
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm
      .part('fixB', b)
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'fixA.h', 'fixB.h', 'fastened');

    // Gate 2: revolute mate whose axis floats 50 mm above both bodies.
    arm
      .part('axA', kcad.box(10, 10, 10), { at: [0, 30, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 50] }, axis: [1, 0, 0] });
    arm
      .part('axB', kcad.box(10, 10, 10), { at: [10, 30, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 50] }, axis: [1, 0, 0] });
    arm.mate('floatHinge', 'axA.c', 'axB.c', 'revolute', { limitsDeg: [-10, 10] });

    // Gate 3: revolute mate with maxLoad.torque=10 N·m and loads giving
    // 50 N·m at r=50 mm. Same geometry as the Phase-5 unit test fixture
    // (jointLoadCapacity.test.ts) — joint world origin at [0,60,0], CoM
    // proxy at [50,60,0], r=[50,0,0], F=[0,0,-1000], |r×F|/MM_PER_M=50 N·m.
    arm
      .part('loadA', kcad.box(10, 10, 10), { at: [50, 60, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('loadB', kcad.box(10, 10, 10), { at: [0, 60, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('loadHinge', 'loadA.c', 'loadB.c', 'revolute', { limitsDeg: [-10, 10] });
    const mates = arm.__mates() as MateRecord[];
    const loadHingeMate = mates.find((m) => m.name === 'loadHinge');
    if (!loadHingeMate) throw new Error('fixture: loadHinge mate not found');
    (loadHingeMate as { maxLoad?: MateLoadLimit }).maxLoad = { torque: 10 };

    const scene = await arm.solvedModel({}, {
      validate: 'warn',
      externalLoads: { loadA: { force: [0, 0, -1000] } },
    });
    const codes = scene.warnings.map((d) => d.code);
    expect(codes).toContain('assembly.mounting-hole.mismatch');
    expect(codes).toContain('assembly.joint-axis.unbound');
    expect(codes).toContain('assembly.joint.load-exceeded');
  });

  it('skips all three new gates under validate=off (no diagnostics)', async () => {
    // Same Gate-1/2/3-tripping fixture as the 'warn' test above. Under
    // `validate: 'off'` the validator does not run at all — none of the
    // grounding-gate codes appear on scene.warnings (which is empty per
    // assembly.ts `mode === 'off'` branch).
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm
      .part('fixA', a)
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm
      .part('fixB', b)
      .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'fixA.h', 'fixB.h', 'fastened');

    arm
      .part('axA', kcad.box(10, 10, 10), { at: [0, 30, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 50] }, axis: [1, 0, 0] });
    arm
      .part('axB', kcad.box(10, 10, 10), { at: [10, 30, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 50] }, axis: [1, 0, 0] });
    arm.mate('floatHinge', 'axA.c', 'axB.c', 'revolute', { limitsDeg: [-10, 10] });

    arm
      .part('loadA', kcad.box(10, 10, 10), { at: [50, 60, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('loadB', kcad.box(10, 10, 10), { at: [0, 60, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('loadHinge', 'loadA.c', 'loadB.c', 'revolute', { limitsDeg: [-10, 10] });
    const mates = arm.__mates() as MateRecord[];
    const loadHingeMate = mates.find((m) => m.name === 'loadHinge');
    if (!loadHingeMate) throw new Error('fixture: loadHinge mate not found');
    (loadHingeMate as { maxLoad?: MateLoadLimit }).maxLoad = { torque: 10 };

    const scene = await arm.solvedModel({}, {
      validate: 'off',
      externalLoads: { loadA: { force: [0, 0, -1000] } },
    });
    expect(scene.warnings).toHaveLength(0);
  });
});
