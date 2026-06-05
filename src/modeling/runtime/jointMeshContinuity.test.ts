// src/modeling/runtime/jointMeshContinuity.test.ts
//
// P8 unit tests for the joint-mesh-continuity helper.
//
// Spec:  docs/specs/2026-06-02-physics-loop-P8-joint-mesh-continuity-gate.md
// Plan:  docs/plans/2026-06-02-physics-loop-P8-joint-mesh-continuity-gate.md

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { checkMechanismTruth } from './mechanismTruth';

function makeArm(name = 'rig'): { arm: Assembly; kcad: ReturnType<typeof createApi>; session: CaptureSession } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly(name), kcad, session };
}

describe('joint-mesh-continuity helper (P8)', () => {
  it('clean: pivot inside both bodies → zero joint-mesh-gap diagnostics', async () => {
    // Two boxes whose joint pivot sits well inside each. The parent
    // box spans x∈[-10,10], y∈[-10,10], z∈[-10,10]; the child box
    // spans the same and the pivot at world origin is inside both
    // bodies by 10 mm on every side.
    const { arm, kcad } = makeArm('clean');
    const parentBody = kcad.box(20, 20, 20, true);
    const parent = arm.part('parent', parentBody);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });

    const childBody = kcad.box(20, 20, 20, true);
    const child = arm.part('child', childBody);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
    arm.mate('elbow', 'parent.hinge', 'child.hinge', 'revolute', {
      limitsDeg: [-45, 45],
    });

    const result = await checkMechanismTruth(arm);
    const gaps = result.failures.filter((f) => f.code === 'mechanism.joint-mesh-gap');
    expect(gaps).toEqual([]);
  }, 90000);

  it('gap: parent body 5 mm short of the pivot → mechanism.joint-mesh-gap fires with ~5 mm distance on the parent side', async () => {
    // Geometry: parent box has its top face at z=0 (built as a
    // 20×20×10 box centered at origin, translated -5 mm down so local-
    // frame extents become z∈[-10, 0]). The hinge pivot is declared at
    // z=5 in the parent's local frame — 5 mm above the parent's top
    // face, i.e. 5 mm outside the parent body's BREP surface. The
    // child body spans the pivot, so only the parent side should fail.
    const { arm, kcad } = makeArm('parent-gap-5mm');

    const parentBody = kcad.box(20, 20, 10, true).translate(0, 0, -5);
    const parent = arm.part('parent', parentBody);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 5] }, // 5 mm above parent top face
      axis: [0, 1, 0],
    });

    // Child body: 20×20×20 box authored so its BOTTOM face sits at
    // its local origin (centered XY, translated +10 in Z). When mate
    // FK aligns the child's connector origin [0,0,0] with the world
    // pivot [0,0,5], the child body sits ABOVE the parent (its bottom
    // face touches the pivot) — contains the pivot at the bottom face
    // and doesn't overlap the parent below.
    const childBody = kcad.box(20, 20, 20, true).translate(0, 0, 10);
    const child = arm.part('child', childBody);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
    arm.mate('elbow', 'parent.hinge', 'child.hinge', 'revolute', {
      limitsDeg: [-45, 45],
    });

    const result = await checkMechanismTruth(arm);
    const gaps = result.failures.filter((f) => f.code === 'mechanism.joint-mesh-gap');
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    // The diagnostic message embeds the gap distance as `${n.toFixed(1)}mm`.
    // Pull the parent-side row and assert the distance lands near 5 mm
    // (tolerance for OCCT distance solver numerics).
    const parentGap = gaps.find((g) => g.message.includes("parent body 'parent'"));
    expect(parentGap).toBeDefined();
    const m = /([\d.]+)mm outside/.exec(parentGap!.message);
    expect(m).not.toBeNull();
    const measuredMm = Number(m![1]);
    expect(measuredMm).toBeGreaterThan(4.5);
    expect(measuredMm).toBeLessThan(5.5);
    expect(result.mechanism).toBe('broken');
  }, 90000);

  it('annular bearing: pivot in open space but disc seats on a rim away from the axis → no joint-mesh-gap', async () => {
    // The spice-dispenser pattern: the parent is an annular ring (the
    // funnel rim) whose axis region is deliberately open (flow path);
    // the child disc seats on the rim with 0.2 mm running clearance,
    // ~24 mm away from the joint axis. The pivot at [0,0,10.2] is
    // ~20 mm from the ring's nearest material (the Ø40 inner bore), so
    // the parent-side pivot probe alone would flag it — the bearing-
    // contact fallback must measure the ring↔disc clearance instead.
    const { arm, kcad } = makeArm('annular-bearing');

    // Ring: z∈[0,10], r∈[20,30]. Joint pivot 0.2 mm above its top face,
    // ON the axis — i.e. in the middle of the open Ø40 bore.
    const ringBody = kcad.cylinder(10, 30).subtract(kcad.cylinder(12, 20).translate(0, 0, -1));
    const parent = arm.part('parent', ringBody);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 10.2] },
      axis: [0, 0, 1],
    });

    // Disc: r=28, t=3, bottom face at its local origin → seats 0.2 mm
    // above the ring top once the mate aligns the connector origins.
    const discBody = kcad.cylinder(3, 28);
    const child = arm.part('child', discBody);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    arm.mate('select', 'parent.hinge', 'child.hinge', 'revolute', {
      limitsDeg: [0, 300],
    });

    const result = await checkMechanismTruth(arm);
    const gaps = result.failures.filter((f) => f.code === 'mechanism.joint-mesh-gap');
    expect(gaps).toEqual([]);
  }, 90000);

  it('floating part: pivot outside both bodies AND no bearing contact anywhere → joint-mesh-gap still fires', async () => {
    // Regression guard for the bearing-contact fallback: a child that
    // hovers 8 mm above the parent (pivot 5 mm outside the parent,
    // 3 mm outside the child, min body↔body distance 8 mm) must STILL
    // fail — the fallback rescues constrained bearings, not floating
    // parts.
    const { arm, kcad } = makeArm('floating');

    const parentBody = kcad.box(20, 20, 10, true).translate(0, 0, -5); // top face z=0
    const parent = arm.part('parent', parentBody);
    parent.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 5] },
      axis: [0, 1, 0],
    });

    // Child body authored 3 mm above its own connector origin → at rest
    // it spans world z∈[8,28]; nothing is within 1 mm of anything.
    const childBody = kcad.box(20, 20, 20, true).translate(0, 0, 13);
    const child = arm.part('child', childBody);
    child.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
    arm.mate('elbow', 'parent.hinge', 'child.hinge', 'revolute', {
      limitsDeg: [-45, 45],
    });

    const result = await checkMechanismTruth(arm);
    const gaps = result.failures.filter((f) => f.code === 'mechanism.joint-mesh-gap');
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    // The fallback ran and reported the true rigid-group clearance in
    // the diagnostic, so the agent sees both distances.
    const withBearing = gaps.find((g) => g.message.includes('Nearest contact between the mated rigid groups'));
    expect(withBearing).toBeDefined();
    expect(result.mechanism).toBe('broken');
  }, 90000);
});
