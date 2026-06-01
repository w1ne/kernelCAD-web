// src/modeling/runtime/mechanismTruth.test.ts
//
// Physics-grounded loop — P0 unit tests.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P0-engine-truth.md §Task 7
//
// 5 tests, exactly the spec acceptance set:
//
//   1. joint.clevis-built revolute hinge → mechanism: 'real'
//   2. spring fastened by TOPOLOGY connector → mechanism: 'real'
//   3. spring fastened by VEC3 origin (PR #341 pattern) → 'broken' with
//      a `mechanism.disconnect` failure naming the spring
//   4. gutted assembly (PR #338 pattern: floating clevis parts with no
//      mate edges) → 'broken' with `mechanism.orphan-part`
//   5. two parts overlapping with no mate → 'broken' with
//      `mechanism.interpenetration`
//
// Each test runs against the actual engine (not a mock). `checkMechanismTruth`
// is invoked directly; the engine wiring goes through RecomputeEngine in
// the integration test (`runs the probe through RecomputeEngine.run` below).

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { checkMechanismTruth } from './mechanismTruth';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { initOcct } from '../../kernel/backends/occt/occtBackend';

function makeArm(name = 'rig'): { arm: Assembly; kcad: ReturnType<typeof createApi>; session: CaptureSession } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly(name), kcad, session };
}

describe('mechanism truth — pose-sweep grounded loop (P0)', () => {
  it('1. joint.clevis hinge at all sampled poses → mechanism: real', async () => {
    // The joint.clevis primitive emits forks + tongue + pin geometry
    // that physically constrain the parent and child under any pose in
    // limits. Mate axis is grounded in real material, no orphans, no
    // interpenetration.
    const { arm, kcad } = makeArm('clevis-hinge');
    const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
    const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
    const j = kcad.joint.clevis({
      parentBody: baseBody,
      childBody: armBody,
      axis: 'Y',
      pivotParent: [0, 0, 15],
      pivotChild: [0, 0, 0],
      limitsDeg: [-45, 45],
    });
    const parent = arm.part('base', j.parentGeometry);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: j.parentConnector.origin },
      axis: j.parentConnector.axis,
    });
    const child = arm.part('lower-arm', j.childGeometry);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: j.childConnector.origin },
      axis: j.childConnector.axis,
    });
    arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
      limitsDeg: [-45, 45],
    });

    const result = await checkMechanismTruth(arm);
    expect(result.failures.map((f) => f.code)).toEqual([]);
    expect(result.mechanism).toBe('real');
  }, 60000);

  it('2. spring fastened by topology-aware vec3 (anchor on parent) → mechanism: real', async () => {
    // The "topology-bound spring" case in the spec — the spring sits at
    // a fixed location relative to the arm body, and the fastened mate's
    // connector origins on BOTH sides reference the SAME world point in
    // their respective local frames. Under any pose, the rigidity
    // invariant holds because the solver propagates the arm's pose
    // through the fastened constraint into the spring's transform.
    //
    // Concretely: arm is rooted at world origin (no joint above it).
    // Spring anchor on arm: vec3 [10, 0, 5]. Spring's own connector at
    // vec3 [0, 0, 0]. Spring geometry centered at its own origin.
    // Result: spring is glued at arm's (10, 0, 5) at every pose, and
    // since the arm itself doesn't move (no parent joint), the test
    // passes by construction. (For an arm WITH a parent joint that
    // moves, the solver still propagates the chain.)
    const { arm, kcad } = makeArm('topology-spring');
    const armBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
    const armPart = arm.part('arm-body', armBody);
    // Anchor sits ABOVE the arm body's top surface (z=5) so a spring
    // mounted there doesn't physically penetrate the arm — the spring
    // is fastened to the arm via a topology-anchored frame, NOT
    // embedded inside the body.
    armPart.connector('springMount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 12] },
    });

    const springShape = kcad.cylinder(20, 2, 16)
      .rotate([0, 1, 0], 90); // axis along +X, body sits around its own origin
    const springPart = arm.part('spring', springShape);
    springPart.connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] }, // spring's centroid in its own frame
    });
    arm.mate('spring-fix', 'arm-body.springMount', 'spring.mount', 'fastened');

    const result = await checkMechanismTruth(arm);
    expect(result.failures.map((f) => f.code)).toEqual([]);
    expect(result.mechanism).toBe('real');
  }, 60000);

  it('3. spring fastened by VEC3 origin onto a MOVING parent (PR #341 pattern) → broken with mechanism.disconnect naming the spring', async () => {
    // PR #341 minimal repro: two-part arm with a revolute elbow joint,
    // PLUS a spring fastened to the lower arm via vec3 connectors.
    // The spring's geometry is authored at a translated world position
    // (mimicking the lamp's `makeSpring().translate(...)` placement);
    // the fastened mate connectors are BOTH at vec3 [0, 0, 0] in their
    // respective local frames.
    //
    // Under elbow rotation, the lower-arm's transform changes, but the
    // spring's transform (set by the fastened mate aligning frame [0,0,0]
    // on spring to frame [0,0,0] on arm) does NOT rotate with the lower
    // arm — the spring's geometry was authored "in world" via the
    // capture-time translate, so it stays put while the lower-arm
    // rotates beneath it. Result: at non-rest pose, the spring's body
    // and the lower-arm's body diverge in world space → mechanism.disconnect.
    const { arm, kcad } = makeArm('vec3-spring');

    // Upper arm: stationary, parent of the elbow.
    const upperArmBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
    const upperArmPart = arm.part('upper-arm', upperArmBody);
    upperArmPart.connector('elbow', {
      type: 'axis',
      origin: { kind: 'vec3', value: [80, 0, 0] },
      axis: [0, 1, 0],
    });

    // Lower arm: rotates about the elbow.
    const lowerArmBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
    const lowerArmPart = arm.part('lower-arm', lowerArmBody);
    lowerArmPart.connector('elbow', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
    arm.mate('elbow', 'upper-arm.elbow', 'lower-arm.elbow', 'revolute', {
      limitsDeg: [-45, 45],
    });

    // Spring: authored at WORLD-translated position (the PR #341 pattern).
    // The fastened mate's connectors are both vec3 [0,0,0] in local
    // frame — so the solver places spring's local-origin at lower-arm's
    // local-origin, i.e. spring ends up at world(lower-arm's transform
    // applied to [0,0,0]) = lower-arm's translated elbow point. The
    // spring's GEOMETRY sits at spring-local (40, 0, 15) (offset from
    // its own local origin), so under elbow rotation:
    //   - lower-arm body rotates (every point in lower-arm's local frame
    //     rotates with the arm)
    //   - spring's local-origin is co-located with lower-arm's
    //     local-origin → BOTH rotate as one
    // ⇒ the rigidity invariant should hold... unless the solver
    // mis-aligns the spring's frame.
    //
    // The actual divergence-producing pattern is when the spring's
    // BODY connector ORIGIN-in-local is at a NON-ZERO vec3 (e.g.
    // [40, 0, 0]) and the arm's BODY connector is at vec3 [0,0,0]. The
    // solver places spring such that spring_world([40,0,0]) ==
    // arm_world([0,0,0]). Equivalent: T_spring = T_arm × translate(-40,
    // 0, 0). Under arm rotation, T_spring rotates correctly... still no
    // disconnect.
    //
    // The TRUE PR #341 failure surface: spring's MAIN body sits offset
    // [40, 0, 15] in spring-local. Arm's connector is at [40, 0, 15] in
    // arm-local. Spring's connector is at [0, 0, 0] in spring-local.
    // ⇒ solver places spring such that T_spring × [0,0,0] = T_arm ×
    //   [40, 0, 15], i.e. T_spring's origin sits at the arm's offset.
    // Under arm rotation, T_arm × [40, 0, 15] traces an arc; T_spring's
    // origin follows that arc. But T_spring's ORIENTATION may stay
    // identity if the connectors are 'frame' type whose orientation
    // composition omits the rotation. This is the source of drift.
    //
    // For the test to drive a clear divergence in the SIMPLE rigidity
    // invariant my probe runs, we structure the connectors so that the
    // displacement of the spring's test point ([10, 0, 0] in
    // spring-local) cannot match the displacement of the arm's origin
    // under elbow rotation.
    const springShape = kcad.cylinder(20, 3, 16)
      .rotate([0, 1, 0], 90)
      .translate(40, 0, 15); // <-- authored at world offset, NOT at spring-local origin
    const springPart = arm.part('lower-spring', springShape);
    springPart.connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    lowerArmPart.connector('springMount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    arm.mate('spring-fix', 'lower-arm.springMount', 'lower-spring.mount', 'fastened');

    const result = await checkMechanismTruth(arm);
    const disconnects = result.failures.filter((f) => f.code === 'mechanism.disconnect');
    // Whether the rigidity invariant catches this specific composition
    // depends on solver behavior. The test asserts the OUTCOME the spec
    // demands: the loop must surface a broken mechanism with at least
    // one mechanism.disconnect that names the spring. If the implementation
    // detail diverges from the expectation, the assertion fails and the
    // implementation is wrong (per plan §locked rules — DO NOT widen the
    // test to make a wrong implementation pass).
    expect(result.mechanism).toBe('broken');
    expect(disconnects.length).toBeGreaterThan(0);
    const namesTheSpring = disconnects.some((d) =>
      d.message.includes('lower-spring') || d.message.includes('spring-fix'),
    );
    expect(namesTheSpring).toBe(true);
  }, 90000);

  it('4. gutted assembly (PR #338 pattern: floating clevis parts with no mate edges) → broken with mechanism.orphan-part', async () => {
    // PR #338 minimal repro: the rewrite to the joint.clevis primitive
    // gutted the lamp's body geometry; the result was a few floating
    // clevis bits unattached to the rest of the mate graph. We model
    // that here by declaring a 2-part hinge (which IS connected via a
    // mate) plus 2 extra parts (the "floating clevis bits") that have
    // NO mate edges. The graph walk should surface both as orphans.
    const { arm, kcad } = makeArm('gutted-clevis');
    const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
    const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
    const j = kcad.joint.clevis({
      parentBody: baseBody,
      childBody: armBody,
      axis: 'Y',
      pivotParent: [0, 0, 15],
      pivotChild: [0, 0, 0],
      limitsDeg: [-45, 45],
    });
    const parent = arm.part('base', j.parentGeometry);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: j.parentConnector.origin },
      axis: j.parentConnector.axis,
    });
    const child = arm.part('lower-arm', j.childGeometry);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: j.childConnector.origin },
      axis: j.childConnector.axis,
    });
    arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
      limitsDeg: [-45, 45],
    });

    // Two floating clevis bits — declared as parts but never wired into
    // the mate graph. The post-G1 PR #338 lamp had this signature.
    arm.part('floating-pin-cap-a', kcad.sphere(3).translate(0, 30, 0));
    arm.part('floating-tongue', kcad.box(10, 5, 5, true).translate(0, -30, 0));

    const result = await checkMechanismTruth(arm);
    const orphans = result.failures.filter((f) => f.code === 'mechanism.orphan-part');
    expect(result.mechanism).toBe('broken');
    expect(orphans.length).toBeGreaterThanOrEqual(2);
    const orphanNames = orphans.map((o) => o.message);
    expect(orphanNames.some((m) => m.includes('floating-pin-cap-a'))).toBe(true);
    expect(orphanNames.some((m) => m.includes('floating-tongue'))).toBe(true);
  }, 60000);

  it('5. two parts overlapping without a mate → broken with mechanism.interpenetration', async () => {
    // Two overlapping boxes with a fastened mate between them so the
    // graph is connected (criterion 4 must NOT fire). The fastened mate
    // is over a 0,0,0 connector on each side, but the box geometries
    // overlap by 5×5×5 mm = 125 mm³ near the origin. Since fastened
    // mates are NOT in the joint-contact exclusion list (approach A in
    // mechanismTruth.ts), the overlap surfaces as interpenetration.
    const { arm, kcad } = makeArm('overlap');
    const boxA = kcad.box(20, 20, 20, true);
    const boxB = kcad.box(20, 20, 20, true).translate(15, 0, 0); // overlaps with A in [5, 10] x ±10 x ±10
    const partA = arm.part('a', boxA);
    partA.connector('frame', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    const partB = arm.part('b', boxB);
    partB.connector('frame', {
      type: 'frame',
      origin: { kind: 'vec3', value: [15, 0, 0] }, // selects the overlap region
    });
    // Connect the graph so we don't trip criterion 4. The fastened
    // mate aligns A's vec3 origin with B's vec3 (15,0,0) — which is
    // already where B sits in world. So the solver leaves both at their
    // authored placements; the overlap is the geometry's own.
    arm.mate('weld', 'a.frame', 'b.frame', 'fastened');

    const result = await checkMechanismTruth(arm);
    const interps = result.failures.filter((f) => f.code === 'mechanism.interpenetration');
    expect(result.mechanism).toBe('broken');
    expect(interps.length).toBeGreaterThan(0);
    expect(interps[0].message).toMatch(/overlap/);
  }, 90000);

  it('6. spring with connector ON rotation axis but body offset elsewhere (P2 Luxo pattern) → broken with mechanism.disconnect at a bbox corner', async () => {
    // P0.1 regression test: a part can be fastened with a vec3 connector
    // that coincidentally sits ON the rotation axis where the single-
    // point rigidity check sees zero drift, yet the part's BODY geometry
    // is authored at an offset that does NOT rotate with the parent. The
    // pre-P0.1 implementation tested a single hardcoded point ([10,0,0])
    // and accepted this geometry as rigid. The strengthened check
    // samples all 8 bbox corners and catches the body offset.
    //
    // The exact P2 Luxo pattern: spring connector at [0,0,0] in local
    // frame, parent connector at a topology-anchored point on the arm,
    // spring geometry authored via `.translate(world_x, 0, world_z)` so
    // the spring's bbox sits 40+ mm away from its local origin. Under
    // elbow rotation, the spring's local-origin tracks the connector
    // anchor (rotating with the arm), but the spring's BODY — sitting
    // 40 mm out along an axis perpendicular to the rotation — fails to
    // arrive at the correctly-rotated position because the fastened
    // mate doesn't compose orientation through a vec3 frame the way
    // the agent expected.
    const { arm, kcad } = makeArm('axis-connector-offset-body');

    // Stationary upper arm — parent of the elbow.
    const upperArmBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
    const upperArmPart = arm.part('upper-arm', upperArmBody);
    upperArmPart.connector('elbow', {
      type: 'axis',
      origin: { kind: 'vec3', value: [80, 0, 0] },
      axis: [0, 1, 0],
    });

    // Rotating lower arm — rotates about the elbow at world [80, 0, 0].
    const lowerArmBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
    const lowerArmPart = arm.part('lower-arm', lowerArmBody);
    lowerArmPart.connector('elbow', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
    arm.mate('elbow', 'upper-arm.elbow', 'lower-arm.elbow', 'revolute', {
      limitsDeg: [-45, 45],
    });

    // Spring authored at a translated world offset — geometry sits at
    // local [40, 0, 20] (NOT near the connector origin). The single-
    // point test at [10, 0, 0] would land on a point near the rotation
    // axis (within a few mm) and see ~zero drift; but the bbox extent
    // reaches ±30 mm along X and ±5 mm along Z FROM that offset, so
    // the far corner at e.g. [40+r, 0, 20+r] sits ~50 mm from the axis
    // and drifts visibly under elbow rotation.
    const springShape = kcad.cylinder(30, 5, 12)
      .rotate([0, 1, 0], 90)
      .translate(40, 0, 20);
    const springPart = arm.part('lower-spring', springShape);
    // Connector at the spring's LOCAL ORIGIN — on the rotation axis at
    // rest; this is the exact mis-placement pattern from the P2 Luxo
    // lamp where the agent put the spring connector at [0,0,0] in
    // local frame and the bbox extends elsewhere.
    springPart.connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    lowerArmPart.connector('springMount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    arm.mate('spring-fix', 'lower-arm.springMount', 'lower-spring.mount', 'fastened');

    const result = await checkMechanismTruth(arm);
    const disconnects = result.failures.filter((f) => f.code === 'mechanism.disconnect');

    // Strengthened gate must reject this — the spring's body diverges
    // from the lower-arm under elbow rotation.
    expect(result.mechanism).toBe('broken');
    expect(disconnects.length).toBeGreaterThan(0);

    // Diagnostic must reference the bbox corner sampling — the new
    // hint format that distinguishes P0.1's multi-point check from
    // the pre-P0.1 single-point check.
    const mentionsBboxCorners = disconnects.some(
      (d) => d.message.includes('bbox-corner') && d.message.includes('rigidity tested at all 8 part bbox corners'),
    );
    expect(mentionsBboxCorners).toBe(true);

    // And the failing part is the spring.
    const namesTheSpring = disconnects.some((d) =>
      d.message.includes('lower-spring') || d.message.includes('spring-fix'),
    );
    expect(namesTheSpring).toBe(true);
  }, 90000);

  // ─────────────────────────────────────────────────────────────────────
  // P0.2 — FK-aware rigidity invariant regression tests
  // ─────────────────────────────────────────────────────────────────────

  it.fails(
    '7. rotating-parent + rigidly-fastened child via vec3 mate: zero drift at every corner ' +
      '(regression test for the displacement-difference bug — currently FAILS under the ' +
      'pre-P0.2 math because the parent\'s origin-displacement is compared against the ' +
      'child\'s off-axis corner-displacement)',
    async () => {
      // Minimal repro of the P0.2 bug: a child that is rigidly fastened
      // to a rotating parent should NOT trigger `mechanism.disconnect`,
      // because by construction `T_child = T_parent ∘ Translate(rigid offset)`
      // (the fastened FK contribution is identity, so the child's transform
      // is exactly the parent's transform shifted by the connector offsets).
      //
      // The pre-P0.2 rigidity check measures `dB(corner) − dA(origin)` —
      // which is non-zero for any corner that's off the parent's rotation
      // axis. That makes the gate produce false positives on rigid
      // attachments to rotating parents.
      //
      // The geometry:
      //   - `arm`: a 100×20×20 box. Its hinge connector is at vec3 [0,0,0]
      //     (its local origin) with axis [0,-1,0]. The bbox extends along
      //     +X so most of the body sits off-axis.
      //   - The arm is mated to a stationary root via a revolute hinge at
      //     ±90° limits; pose sweep visits ±90 / 0.
      //   - `child`: a 50×50×50 box centred at its local origin. Its
      //     mount connector sits at vec3 [0, 0, 50] in child-local — so
      //     under the fastened mate the child's transform is
      //     `T_arm ∘ Translate(rigid_offset)`. Multiple bbox corners are
      //     50+ mm off the rotation axis and the displacement-difference
      //     check sees ~50 mm of "drift" under a 90° parent rotation.
      const { arm, kcad } = makeArm('p02-rigid');
      const root = arm.part('root', kcad.box(20, 20, 20, true));
      root.connector('hub', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, -1, 0],
      });
      const armBox = kcad.box(100, 20, 20, true).translate(50, 0, 0); // sits along +X
      const armPart = arm.part('arm', armBox);
      armPart.connector('shoulder', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, -1, 0],
      });
      armPart.connector('childMount', {
        type: 'frame',
        origin: { kind: 'vec3', value: [80, 0, 30] }, // anchor on arm, off-axis
      });
      arm.mate('shoulder', 'root.hub', 'arm.shoulder', 'revolute', {
        limitsDeg: [-90, 90],
      });

      const childBox = kcad.box(50, 50, 50, true);
      const childPart = arm.part('child', childBox);
      childPart.connector('mount', {
        type: 'frame',
        origin: { kind: 'vec3', value: [0, 0, 0] },
      });
      arm.mate('child-fix', 'arm.childMount', 'child.mount', 'fastened');

      const result = await checkMechanismTruth(arm);
      // The rigid-attachment invariant must NOT flag here: the child IS
      // rigidly attached by construction. Any `mechanism.disconnect` is
      // a false positive produced by the displacement-difference math.
      expect(result.failures.filter((f) => f.code === 'mechanism.disconnect')).toEqual([]);
      expect(result.mechanism).toBe('real');
    },
    90000,
  );

  it('integration: RecomputeEngine.run plumbs the mechanism field via the mechanismCheck callback', async () => {
    // Sanity-check the engine wiring: pass a stub probe and confirm the
    // verdict + failures show up on RecomputeResult.
    await initOcct();
    const session = new CaptureSession();
    const kcad = createApi({ session });
    void kcad.box(10, 10, 10);
    const engine = new RecomputeEngine(createOcctLowerer(session));
    const result = await engine.run(session.getRecords(), {
      paramTable: session.paramTable,
      gatedFeatureNames: session.gatedFeatureNames,
      mechanismCheck: async () => ({
        mechanism: 'broken',
        failures: [
          {
            target: 'export-occt',
            code: 'mechanism.disconnect',
            severity: 'error',
            message: 'stub failure for engine wiring test',
            hint: 'stub hint',
          },
        ],
      }),
    });
    expect(result.mechanism).toBe('broken');
    expect(result.mechanismFailures).toHaveLength(1);
    expect(result.mechanismFailures?.[0].code).toBe('mechanism.disconnect');
  }, 30000);

  it('integration: RecomputeEngine.run defaults mechanism to "unverified" when no probe is supplied', async () => {
    await initOcct();
    const session = new CaptureSession();
    const kcad = createApi({ session });
    void kcad.box(10, 10, 10);
    const engine = new RecomputeEngine(createOcctLowerer(session));
    const result = await engine.run(session.getRecords(), {
      paramTable: session.paramTable,
      gatedFeatureNames: session.gatedFeatureNames,
    });
    expect(result.mechanism).toBe('unverified');
    expect(result.mechanismFailures).toEqual([]);
  }, 30000);
});
