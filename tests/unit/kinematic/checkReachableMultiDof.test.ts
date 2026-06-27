// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kinematic/checkReachableMultiDof.test.ts
//
// Regression for issue #539: numeric inverse kinematics must actuate EVERY
// revolute DOF in the chain, not just the first joint. The deployed server
// (older build) only ever moved joint1 of a 3-DOF serial leg, hit the
// iteration cap, and reported clearly reachable targets as unreachable.
//
// These tests lock in the correct multi-DOF behaviour on a 3-DOF leg:
//   base --j1(roll, axis x)--> coxa --j2(pitch, axis y)--> femur
//        --j3(knee pitch, axis y)--> tibia --(fixed)--> foot (tip)
//
// The foot at rest hangs straight down at (0, 0, -(Lf+Lt)). A target with a
// non-zero X component is unreachable by j1 alone (rolling about the world X
// axis keeps the foot in the X=0 plane), so the solver MUST flex j2/j3.
//
// The helper-level path is exercised through a minimal stub arm (the same
// pattern as forwardKinematics.test.ts) so the kinematic solvers are tested
// without standing up a CaptureSession + Shape graph; both checkReachable
// (dispatcher) and solveNumeric (DLS core) are driven directly.

import { describe, it, expect } from 'vitest';
import { solveNumeric } from '../../../src/kinematic/inverseKinematicsNumeric';
import { checkReachable } from '../../../src/kinematic/checkReachable';
import type {
  Assembly,
  AssemblyJointStored,
  AssemblyPartStored,
} from '../../../src/modeling/capture/assembly';

const Lf = 100; // femur length
const Lt = 100; // tibia length

function part(id: string, name: string): AssemblyPartStored {
  return { id, name } as unknown as AssemblyPartStored;
}

/** Build a 3-DOF serial leg as a minimal stub arm. */
function makeLeg(): Assembly {
  const parts: AssemblyPartStored[] = [
    part('p_base', 'base'),
    part('p_coxa', 'coxa'),
    part('p_femur', 'femur'),
    part('p_tibia', 'tibia'),
    part('p_foot', 'foot'),
  ];
  const joints: AssemblyJointStored[] = [
    {
      name: 'j1', kind: 'revolute', parentPartId: 'p_base', childPartId: 'p_coxa',
      axis: [1, 0, 0], origin: [0, 0, 0], limitsDeg: [-90, 90],
    },
    {
      name: 'j2', kind: 'revolute', parentPartId: 'p_coxa', childPartId: 'p_femur',
      axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-90, 90],
    },
    {
      name: 'j3', kind: 'revolute', parentPartId: 'p_femur', childPartId: 'p_tibia',
      axis: [0, 1, 0], origin: [0, 0, -Lf], limitsDeg: [-150, 150],
    },
    {
      name: 'jfoot', kind: 'fixed', parentPartId: 'p_tibia', childPartId: 'p_foot',
      origin: [0, 0, -Lt],
    },
  ] as unknown as AssemblyJointStored[];

  return {
    __parts: () => parts,
    __joints: () => joints,
  } as unknown as Assembly;
}

describe('checkReachable — numeric IK uses all chain DOFs (issue #539)', () => {
  it('solveNumeric flexes j2/j3 to reach a target off the roll plane', () => {
    const arm = makeLeg();
    // Forward + up from the rest foot at (0,0,-200): requires pitch flexion.
    const res = solveNumeric(
      arm,
      'foot',
      { position: [60, 0, -150], positionToleranceMm: 0.5 },
      {},
      200,
    );

    expect(res.converged).toBe(true);
    expect(res.positionErrorMm).toBeLessThan(0.5);
    // The downstream pitch joints carry the solution, not j1 alone.
    expect(Math.abs(res.poses.j2 as number)).toBeGreaterThan(1);
    expect(Math.abs(res.poses.j3 as number)).toBeGreaterThan(1);
    // j1 (roll about world X) cannot produce the +X reach, so it stays ~0.
    expect(Math.abs(res.poses.j1 as number)).toBeLessThan(1e-6);
  });

  it('checkReachable (dispatcher) reports a reachable off-plane target as reachable', async () => {
    const arm = makeLeg();
    const r = await checkReachable(arm, {
      tipLink: 'foot',
      target: { position: [60, 0, -150] },
    });

    expect(r.ok).toBe(true);
    expect(r.pose).toBeDefined();
    expect(Math.abs(r.pose!.j2 as number)).toBeGreaterThan(1);
    expect(Math.abs(r.pose!.j3 as number)).toBeGreaterThan(1);
    expect(r.diagnostics).toHaveLength(0);
  });

  it('does not regress the rest pose to "unreachable"', async () => {
    const arm = makeLeg();
    // The rest foot sits exactly at (0,0,-(Lf+Lt)); the seed pose satisfies it.
    const r = await checkReachable(arm, {
      tipLink: 'foot',
      target: { position: [0, 0, -(Lf + Lt)] },
    });
    expect(r.ok).toBe(true);
  });
});
