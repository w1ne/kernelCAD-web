// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { solveMates } from './solver';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';

// v0.6 Task 6: solveMates(arm) — tree-FK over the mate graph for all 7 mate
// types. Closed-loop topologies return 'did-not-converge' with iterations=0
// here; T7 replaces that path with a Newton-Raphson loop solver.

function makeArm() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('solveMates — tree topology', () => {
  it('produces identity world transform for a single root part', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('root', kcad.box(10, 10, 10))
      .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    const result = await solveMates(arm);
    expect(result.status).toBe('solved');
    const rootT = result.poses.get('root')!;
    expect(rootT).toBeDefined();
    const { translate } = rootT.decomposeToTranslateAndRotate();
    expect(translate[0]).toBeCloseTo(0);
    expect(translate[1]).toBeCloseTo(0);
    expect(translate[2]).toBeCloseTo(0);
  });

  it('chains a 3-part tree with two fastened mates', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
    arm
      .part('b', kcad.box(5, 5, 5))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
    arm
      .part('c', kcad.box(2, 2, 2))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    arm.mate('b-c', 'b.top', 'c.bot', 'fastened');
    const r = await solveMates(arm);
    expect(r.status).toBe('solved');
    // a is root at identity. b is fastened with a.top at z=10 → b's origin at z=10.
    // c is fastened with b.top at z=5 (in b's local frame) → c's origin at z=15.
    const aT = r.poses.get('a')!;
    const bT = r.poses.get('b')!;
    const cT = r.poses.get('c')!;
    expect(aT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(0);
    expect(bT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(10);
    expect(cT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(15);
  });

  it('solves every disconnected mate component only when the forest option is enabled', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('unrelated', kcad.box(1, 1, 1))
      .connector('origin', {
        type: 'frame',
        origin: { kind: 'vec3', value: [0, 0, 0] },
      });
    arm
      .part('support', kcad.box(10, 10, 10))
      .connector('out', {
        type: 'frame',
        origin: { kind: 'vec3', value: [100, 0, 0] },
      });
    arm
      .part('mounted', kcad.box(5, 5, 5))
      .connector('in', {
        type: 'frame',
        origin: { kind: 'vec3', value: [0, 0, 0] },
      });
    arm.mate('mount', 'support.out', 'mounted.in', 'fastened');

    const legacy = await solveMates(arm);
    const forest = await solveMates(arm, undefined, { solveDisconnectedComponents: true });

    expect(legacy.poses.get('mounted')!.point([0, 0, 0])[0]).toBeCloseTo(0);
    expect(forest.poses.get('mounted')!.point([0, 0, 0])[0]).toBeCloseTo(100);
  });

});

describe('solveMates — closed loop (Newton-Raphson)', () => {
  it('returns redundant-ok on a triangle of consistent fastened mates', async () => {
    // 3 parts in a triangle: a-b, b-c, c-a; all fastened. The connector
    // positions make m3 redundant (it agrees with the tree FK at zero-pose),
    // so the loop is consistent and the solver reports 'redundant-ok'.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened'); // closes the loop — consistent
    const r = await solveMates(arm);
    expect(r.status).toBe('redundant-ok');
    expect(r.iterations ?? 0).toBeLessThanOrEqual(50);
    // All three parts should still be placed.
    expect(r.poses.get('a')).toBeDefined();
    expect(r.poses.get('b')).toBeDefined();
    expect(r.poses.get('c')).toBeDefined();
  });

  it('reports over-constrained when the loop is geometrically inconsistent', async () => {
    // Triangle where mate connector positions disagree at zero-pose.
    // b.r at (1,0,0) lands at world (1,0,0); c.s at (0,0,0) makes c at (1,0,0);
    // c.t at (1,0,0) lands at world (2,0,0); m3 says it should equal a.p at
    // (0,0,0). Inconsistent by 2 mm — over-constrained.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened'); // inconsistent by 2 mm
    const r = await solveMates(arm);
    expect(r.status).toBe('over-constrained');
  });

  it('solves an articulated loop that closes at the default pose', async () => {
    // Parallelogram 4-bar linkage authored so the loop closes exactly at
    // pose 0: ground pivots 50 apart, crank/rocker pivots 25 apart, coupler
    // pivots 50 apart, all revolute about +Y. The loop-closure residual is
    // zero at the tree-FK configuration, so the solver must report the
    // configuration as consistent and ship the tree-FK world transforms —
    // robot-description export depends on these per-link poses.
    const { arm, kcad } = makeArm();
    const ground = arm.part('ground', kcad.box(60, 10, 10));
    const crank = arm.part('crank', kcad.box(10, 10, 35));
    const coupler = arm.part('coupler', kcad.box(60, 10, 10));
    const rocker = arm.part('rocker', kcad.box(10, 10, 35));
    ground.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    coupler.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    coupler.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
    rocker.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    rocker.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    ground.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
    arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute');
    arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute');
    arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute');
    arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute');
    const r = await solveMates(arm);
    expect(r.status).toBe('solved');
    expect(r.poses.get('coupler')!.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(25);
    expect(r.poses.get('rocker')!.decomposeToTranslateAndRotate().translate[0]).toBeCloseTo(50);
    // BFS from ground reaches the coupler through the crank first, so the
    // coupler–rocker mate closes the loop and names it.
    expect(r.loop?.loops.map((l) => l.name)).toEqual(['coupler_rocker']);
    expect(r.loop?.mobility[0].mobility).toBe(1);
    // Driving the crank keeps the parallelogram: the coupler stays parallel
    // to the ground and translates with the crank tip (25 mm crank, +Y axis).
    const driven = await solveMates(arm, { crank_ground: 30 });
    expect(driven.status).toBe('solved');
    const couplerT = driven.poses.get('coupler')!.decomposeToTranslateAndRotate();
    expect(couplerT.rotateDeg).toBeCloseTo(0, 6);
    expect(couplerT.translate[0]).toBeCloseTo(25 * Math.sin((30 * Math.PI) / 180), 6);
    expect(couplerT.translate[2]).toBeCloseTo(25 * Math.cos((30 * Math.PI) / 180), 6);
  });

  it('closes an articulated loop whose default pose does not close by moving the free joints', async () => {
    // Same topology but the ground-side rocker pivot is authored 10 mm away
    // from where the loop lands at pose 0. Nothing is driven, so the loop
    // solver moves the three free joints the least it can to close it.
    const { arm, kcad } = makeArm();
    const ground = arm.part('ground', kcad.box(60, 10, 10));
    const crank = arm.part('crank', kcad.box(10, 10, 35));
    const coupler = arm.part('coupler', kcad.box(60, 10, 10));
    const rocker = arm.part('rocker', kcad.box(10, 10, 35));
    ground.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    coupler.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    coupler.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
    rocker.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    rocker.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    ground.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [65, 5, 5] }, axis: [0, 1, 0] });
    arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute');
    arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute');
    arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute');
    arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute');
    const r = await solveMates(arm);
    expect(r.status).toBe('solved');
    expect(r.loopResiduals?.[0].mm).toBeLessThan(1e-5);
  });

  it('reports lockup when the driven crank asks for a pose the loop cannot reach', async () => {
    // Ground 60, crank 25, coupler 50, rocker 25: s + l = 85 > p + q = 75,
    // so the crank cannot turn all the way round.
    const { arm, kcad } = makeArm();
    const ground = arm.part('ground', kcad.box(60, 10, 10));
    const crank = arm.part('crank', kcad.box(10, 10, 35));
    const coupler = arm.part('coupler', kcad.box(60, 10, 10));
    const rocker = arm.part('rocker', kcad.box(10, 10, 35));
    ground.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    crank.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    crank.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 25] }, axis: [0, 1, 0] });
    coupler.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    coupler.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [50, 0, 0] }, axis: [0, 1, 0] });
    rocker.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 25] }, axis: [0, 1, 0] });
    rocker.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    ground.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [60, 0, 0] }, axis: [0, 1, 0] });
    arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute');
    arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute');
    arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute');
    arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute');
    // |B − O4| = b + c = 75 at sin θ = −0.467: θ = −90° is past the limit.
    const r = await solveMates(arm, { crank_ground: -90 });
    expect(r.status).toBe('did-not-converge');
    const lock = r.loop?.diagnostics.find((d) => d.code === 'kinematic.loop.lockup');
    expect(lock?.loop).toBe('coupler_rocker');
    const limit = (Math.asin(-1400 / 3000) * 180) / Math.PI;
    expect(lock!.pose!.crank_ground as number).toBeLessThan(limit);
    expect(lock!.pose!.crank_ground as number).toBeGreaterThan(limit - 5);
    expect(typeof lock?.pose?.crank_ground).toBe('number');
  });


  // T7.x will add an assembly-level did-not-converge test once T9 wires
  // pose-driven articulation (revolute/prismatic) — closed loops over
  // articulated joints exercise the Newton-Raphson iteration path that a
  // pure fastened-only loop cannot trigger (zero free DOFs ⇒ no iteration).
  // For now, the iter-cap path is exercised indirectly via the
  // jacobian.test.ts unit suite (finite-difference Jacobian on non-linear f).
});

describe('solveMates — pose-driven articulation', () => {
  it('rotates child part by pose-degrees on revolute mate', async () => {
    // Parent's connector is at z=5 on the +Z axis; child's connector at
    // local origin. A 90° revolute pose around the +Z axis rotates the
    // child about that axis at the mate point — the child's local +X
    // basis ([1,0,0]) lands on world +Y, while the connector origin stays
    // anchored at the parent's connector location.
    const { arm, kcad } = makeArm();
    arm
      .part('parent', kcad.box(10, 10, 10))
      .connector('out', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 5] },
        axis: [0, 0, 1],
      });
    arm
      .part('child', kcad.box(5, 5, 5))
      .connector('in', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    arm.mate('m1', 'parent.out', 'child.in', 'revolute');
    const r = await solveMates(arm, { m1: 90 });
    expect(r.status).toBe('solved');
    const childT = r.poses.get('child')!;
    // Child's local origin lands at parent's connector world position [0,0,5].
    const childOriginWorld = childT.point([0, 0, 0]);
    expect(childOriginWorld[0]).toBeCloseTo(0);
    expect(childOriginWorld[1]).toBeCloseTo(0);
    expect(childOriginWorld[2]).toBeCloseTo(5);
    // Child's local +X axis rotates 90° about +Z → world +Y.
    const childPlusXWorld = childT.point([1, 0, 0]);
    expect(childPlusXWorld[0]).toBeCloseTo(0);
    expect(childPlusXWorld[1]).toBeCloseTo(1);
    expect(childPlusXWorld[2]).toBeCloseTo(5);
    // Decomposed rotation magnitude equals the pose.
    const { rotateDeg } = childT.decomposeToTranslateAndRotate();
    expect(Math.abs(rotateDeg)).toBeCloseTo(90);
  });

  it('translates child part by pose-mm on prismatic mate', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('rail', kcad.box(10, 10, 10))
      .connector('a', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [1, 0, 0],
      });
    arm
      .part('slider', kcad.box(5, 5, 5))
      .connector('a', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [1, 0, 0],
      });
    arm.mate('m1', 'rail.a', 'slider.a', 'prismatic');
    const r = await solveMates(arm, { m1: 25 });
    expect(r.status).toBe('solved');
    const sliderT = r.poses.get('slider')!;
    const sliderOriginWorld = sliderT.point([0, 0, 0]);
    // Translation of 25mm along the parent's +X axis.
    expect(sliderOriginWorld[0]).toBeCloseTo(25);
    expect(sliderOriginWorld[1]).toBeCloseTo(0);
    expect(sliderOriginWorld[2]).toBeCloseTo(0);
  });

  it('falls back to capture-time mate.pose ParamRef when no numeric override', async () => {
    const { arm, kcad } = makeArm();
    const theta = kcad.param('theta', 45, { unit: 'deg' });
    arm
      .part('parent', kcad.box(10, 10, 10))
      .connector('out', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    arm
      .part('child', kcad.box(5, 5, 5))
      .connector('in', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    arm.mate('m1', 'parent.out', 'child.in', 'revolute', { pose: theta });
    // No numeric override → resolver falls back to mate.pose (ParamRef → 45°).
    const r = await solveMates(arm);
    expect(r.status).toBe('solved');
    const childT = r.poses.get('child')!;
    const { rotateDeg } = childT.decomposeToTranslateAndRotate();
    expect(Math.abs(rotateDeg)).toBeCloseTo(45);
  });

  it('rejects pose arg on fastened mate at capture time', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    expect(() => arm.mate('m', 'a.p', 'b.q', 'fastened', { pose: 30 })).toThrow(
      /opts\.pose — got .* fixes every articulation DOF/,
    );
  });
});
