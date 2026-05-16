// src/lib/mates/jointLoadCapacity.test.ts
//
// v0.7.4 Gate 3 — joint-load capacity STUB. Each mate of the four gated
// types (prismatic, revolute, cylindrical, ball) with a declared
// `maxLoad` checks the summed `externalLoads` on its two bound parts
// against the declared capacity. The module is dead code until Phase 6
// wires it into `validateAssemblyWithMates`; these tests pin the
// diagnostic shape and the per-mate-type behaviour per spec
// `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 3.
//
// Test-only `maxLoad` injection: `arm.mate(...)` opts does NOT yet accept
// `maxLoad` (the v0.7.4 wiring lands in Phase 6 alongside `solvedModel`
// integration). Tests reach into `arm.__mates()` and patch the just-pushed
// record. Cast through `MateRecord[]` because the public accessor returns
// a `readonly` view; the underlying array is mutable. This pattern stays
// local to the test file — production code never patches mate records.

import { describe, it, expect } from 'vitest';
import { validateJointLoadCapacity } from './jointLoadCapacity';
import type { MateLoadLimit, MateRecord } from './mate';
import type { Assembly } from '../../capture/assembly';
import type { Vec3 } from '../../intent/types';
import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('rig'), kcad, session };
}

/**
 * Patch `maxLoad` onto the last-declared mate. Cast through `MateRecord[]`
 * is intentional — `__mates()` returns `readonly MateRecord[]` for the
 * public surface, but the underlying array is mutable and Gate 3 reads
 * `mate.maxLoad` directly off each record. This helper isolates the cast
 * so individual tests stay readable.
 */
function setMaxLoad(arm: Assembly, mateName: string, maxLoad: MateLoadLimit): void {
  const mates = arm.__mates() as MateRecord[];
  const mate = mates.find((m) => m.name === mateName);
  if (!mate) throw new Error(`test fixture error: mate '${mateName}' not found on arm '${arm.name}'`);
  // Field is declared `readonly` for the public surface; this test-only
  // mutation matches what Phase 6's `arm.mate(..., { maxLoad })` opts-extension
  // will do under the hood once it lands.
  (mate as { maxLoad?: MateLoadLimit }).maxLoad = maxLoad;
}

describe('validateJointLoadCapacity', () => {
  it('revolute torque exceeded: emits assembly.joint.load-exceeded with delta in hint', () => {
    const { arm, kcad } = makeArm();
    // PartA's authored placement (CoM proxy = part.at, per §STUB CAVEATS #5)
    // is at [50, 0, 0]; the connector is placed at part-local [-50, 0, 0]
    // so the joint's world origin lands at [0, 0, 0]. With F = [0, 0, -1000] N
    // applied to partA at its CoM, the lever arm r = CoM - joint = [50, 0, 0]
    // mm yields |r × F| = 50000 N·mm = 50 N·m, well over the declared
    // 10 N·m capacity.
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');
    setMaxLoad(arm, 'hinge', { torque: 10 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [0, 0, -1000] },
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.load-exceeded');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].mateName).toBe('hinge');
    expect(diags[0].partA).toBe('a');
    expect(diags[0].partB).toBe('b');
    expect(diags[0].hint).toMatch(/joint-load-exceeded/);
    expect(diags[0].hint).toMatch(/revolute/);
    expect(diags[0].hint).toMatch(/torque/);
    // 50 N·m observed - 10 N·m declared = 40 N·m delta.
    expect(diags[0].hint).toMatch(/40\.00N·m/);
    expect(diags[0].hint).toMatch(/10N·m/);
  });

  it('revolute torque within capacity: no diagnostic', () => {
    const { arm, kcad } = makeArm();
    // Same geometry as the exceeded case but with a 10× smaller force:
    // F = 100 N at r = 50 mm → 5000 N·mm = 5 N·m, under the 10 N·m cap.
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');
    setMaxLoad(arm, 'hinge', { torque: 10 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [0, 0, -100] },
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(0);
  });

  it('mate without maxLoad declared: no diagnostic regardless of externalLoads', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');
    // Deliberately no setMaxLoad — the agent has not declared capacity.
    // The gate is opt-in via `maxLoad`; silent skip for undeclared mates.

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [0, 0, -1000] },   // would exceed any reasonable limit
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(0);
  });

  it('externalLoads undefined: no diagnostic regardless of maxLoad', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');
    setMaxLoad(arm, 'hinge', { torque: 10 });

    // No externalLoads passed → fast-return [] per plan §Phase 5 Step 1.
    const diags = validateJointLoadCapacity(arm, undefined);

    expect(diags).toHaveLength(0);
  });

  it('cross-unit wiring: prismatic uses maxLoad.force, revolute uses maxLoad.torque', () => {
    const { arm, kcad } = makeArm();
    // Two independent sub-assemblies, one per mate type. The prismatic
    // pair has force exceeded; the revolute pair has torque exceeded.
    // Single test asserts BOTH type-to-kind mappings fire correctly.

    // Prismatic pair — force check.
    // partA at [0, 0, 0], partB at [0, 0, 0]; |F| = 500 N > 100 N cap.
    arm
      .part('p1', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('p2', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('slide', 'p1.c', 'p2.c', 'prismatic');
    setMaxLoad(arm, 'slide', { force: 100 });

    // Revolute pair — torque check.
    // partR1 at [100, 0, 0]; connector local origin = [-100, 0, 0] so the
    // joint sits at world [0, 0, 0] (100 mm arm from R1's CoM proxy).
    // |F| = 1000 N pulling perpendicular → 100 N·m torque > 5 N·m cap.
    arm
      .part('r1', kcad.box(10, 10, 10), { at: [100, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-100, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('r2', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'r1.c', 'r2.c', 'revolute');
    setMaxLoad(arm, 'hinge', { torque: 5 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      p1: { force: [500, 0, 0] },        // 500 N pull on the slide
      r1: { force: [0, 0, -1000] },      // 1000 N pull-down on the hinge arm
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(2);
    // Find each by mateName so test doesn't depend on iteration order.
    const slideDiag = diags.find((d) => d.mateName === 'slide');
    const hingeDiag = diags.find((d) => d.mateName === 'hinge');

    expect(slideDiag).toBeDefined();
    expect(slideDiag?.code).toBe('assembly.joint.load-exceeded');
    expect(slideDiag?.severity).toBe('error');
    expect(slideDiag?.hint).toMatch(/prismatic/);
    expect(slideDiag?.hint).toMatch(/force/);
    expect(slideDiag?.hint).toMatch(/100N\b/);              // declared
    expect(slideDiag?.hint).toMatch(/500\.00N\b/);          // observed

    expect(hingeDiag).toBeDefined();
    expect(hingeDiag?.code).toBe('assembly.joint.load-exceeded');
    expect(hingeDiag?.severity).toBe('error');
    expect(hingeDiag?.hint).toMatch(/revolute/);
    expect(hingeDiag?.hint).toMatch(/torque/);
    expect(hingeDiag?.hint).toMatch(/5N·m/);                // declared
    expect(hingeDiag?.hint).toMatch(/100\.00N·m/);          // observed
  });

  it('cylindrical with both maxLoad.force and maxLoad.torque exceeded: emits 2 diagnostics', () => {
    const { arm, kcad } = makeArm();
    // Cylindrical's `switch` branch runs BOTH `checkForce` and `checkTorque`
    // (the joint resists axial slide AND moment-about-axis). Set up
    // geometry + loads such that both exceed simultaneously:
    //
    //   partA at [50, 0, 0], connector local origin [-50, 0, 0]
    //   → joint world origin = [0, 0, 0], r = [50, 0, 0] mm
    //   F on partA = [200, 0, -1000] N (|F| = ~1019.8 N)
    //     - force magnitude 1019.8 N > 100 N maxLoad.force ✓
    //     - |r × F| = |[50,0,0] × [200,0,-1000]| = |[0·-1000 - 0·0,
    //       0·200 - 50·-1000, 50·0 - 0·200]| = |[0, 50000, 0]| = 50000 N·mm
    //       = 50 N·m > 10 N·m maxLoad.torque ✓
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('cyl', 'a.c', 'b.c', 'cylindrical');
    setMaxLoad(arm, 'cyl', { force: 100, torque: 10 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [200, 0, -1000] },
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(2);
    const forceDiag = diags.find((d) => /force=/.test(d.message));
    const torqueDiag = diags.find((d) => /torque=/.test(d.message));

    expect(forceDiag).toBeDefined();
    expect(forceDiag?.code).toBe('assembly.joint.load-exceeded');
    expect(forceDiag?.severity).toBe('error');
    expect(forceDiag?.mateName).toBe('cyl');
    expect(forceDiag?.hint).toMatch(/cylindrical/);
    expect(forceDiag?.hint).toMatch(/force/);

    expect(torqueDiag).toBeDefined();
    expect(torqueDiag?.code).toBe('assembly.joint.load-exceeded');
    expect(torqueDiag?.severity).toBe('error');
    expect(torqueDiag?.mateName).toBe('cyl');
    expect(torqueDiag?.hint).toMatch(/cylindrical/);
    expect(torqueDiag?.hint).toMatch(/torque/);
  });

  it('revolute with topology-origin side: emits 1 info-severity deferred note, skips load summation', () => {
    const { arm, kcad } = makeArm();
    // Side A's connector uses a topology query origin — Gate 3 in v0.7.4
    // does not support sync topology resolution and surfaces an
    // info-severity deferred note for that side; side B uses a vec3
    // origin. The mate's load summation is silently SKIPPED, so even
    // with externalLoads that would otherwise blow past the declared
    // torque cap there is no error-severity diagnostic — only the one
    // info note from the topology side.
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm
      .part('a', a, { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');
    setMaxLoad(arm, 'hinge', { torque: 10 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [0, 0, -1000] },   // would yield ~50 N·m if the side were resolved
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.load-exceeded');
    expect(diags[0].severity).toBe('info');
    expect(diags[0].mateName).toBe('hinge');
    expect(diags[0].partA).toBe('a');
    // The deferred-note builder for side 'a' sets `partA` only (not `partB`).
    expect(diags[0].partB).toBeUndefined();
    expect(diags[0].hint).toMatch(/topology connector origin/);
    expect(diags[0].hint).toMatch(/v0\.7\.4/);
    // No error-severity diagnostic — load summation was skipped.
    expect(diags.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('ball with maxLoad.force AND maxLoad.torque declared: only force checked, torque silently ignored', () => {
    const { arm, kcad } = makeArm();
    // Ball mates resist force but not moment (3 DOF rotational freedom).
    // The switch branch for `ball` only calls `checkForce`; any
    // `maxLoad.torque` set on a ball mate is silently ignored even when
    // the geometric setup would clearly exceed it. Pin this behavior so
    // the kind-to-mate-type mapping doesn't regress.
    //
    //   partA at [100, 0, 0], connector local origin [-100, 0, 0]
    //   → joint world origin = [0, 0, 0], r = [100, 0, 0] mm
    //   F on partA = [0, 0, -1000] N (|F| = 1000 N)
    //     - force magnitude 1000 N > 100 N maxLoad.force ✓ (1 diag)
    //     - |r × F| = |[100,0,0] × [0,0,-1000]| = |[0, 100000, 0]|
    //       = 100 N·m > 50 N·m maxLoad.torque — would fire IF ball
    //       branched into checkTorque, but it doesn't (silently ignored).
    arm
      .part('a', kcad.box(10, 10, 10), { at: [100, 0, 0] })
      .connector('c', { type: 'ball', origin: { kind: 'vec3', value: [-100, 0, 0] } });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('socket', 'a.c', 'b.c', 'ball');
    setMaxLoad(arm, 'socket', { force: 100, torque: 50 });

    const externalLoads: Record<string, { force?: Vec3 }> = {
      a: { force: [0, 0, -1000] },
    };
    const diags = validateJointLoadCapacity(arm, externalLoads);

    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint.load-exceeded');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].mateName).toBe('socket');
    expect(diags[0].partA).toBe('a');
    expect(diags[0].partB).toBe('b');
    expect(diags[0].hint).toMatch(/ball/);
    expect(diags[0].hint).toMatch(/force/);
    expect(diags[0].hint).not.toMatch(/torque/);
    expect(diags[0].hint).toMatch(/1000\.00N\b/);   // observed magnitude
    expect(diags[0].hint).toMatch(/100N\b/);        // declared cap
  });
});
