// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kinematic/solveAnalytical.test.ts
//
// Characterisation of the closed-form position-channel IK before its phase
// split: the Puma layout (Z-yaw -> Y-pitch -> Y-pitch with a spherical
// wrist), the null paths (no position target, unknown tip, layout mismatch,
// wrist-center sanity, reachability, joint limits), and the wrist /
// off-chain DOF prefill.

import { describe, it, expect } from 'vitest';
import { solveAnalytical } from '../../../src/kinematic/inverseKinematicsAnalytical';
import type {
  Assembly,
  AssemblyJointStored,
  AssemblyPartStored,
} from '../../../src/modeling/capture/assembly';

const L1 = 100;
const L2 = 80;
const BASE_H = 50;

function part(id: string, name: string): AssemblyPartStored {
  return { id, name } as unknown as AssemblyPartStored;
}

function makePuma(overrides: Partial<AssemblyJointStored> = {}, j4Origin: [number, number, number] = [L2, 0, 0]): Assembly {
  const parts: AssemblyPartStored[] = [
    part('p0', 'base'),
    part('p1', 'shoulder'),
    part('p2', 'upper-arm'),
    part('p3', 'forearm'),
    part('p4', 'wrist-1'),
    part('p5', 'wrist-2'),
    part('p6', 'tip'),
    part('p7', 'tool'),
  ];
  const joints: AssemblyJointStored[] = [
    { name: 'j1', kind: 'revolute', parentPartId: 'p0', childPartId: 'p1', origin: [0, 0, BASE_H], axis: [0, 0, 1] },
    { name: 'j2', kind: 'revolute', parentPartId: 'p1', childPartId: 'p2', origin: [0, 0, 0], axis: [0, 1, 0] },
    { name: 'j3', kind: 'revolute', parentPartId: 'p2', childPartId: 'p3', origin: [L1, 0, 0], axis: [0, 1, 0] },
    { name: 'j4', kind: 'revolute', parentPartId: 'p3', childPartId: 'p4', origin: j4Origin, axis: [1, 0, 0] },
    { name: 'j5', kind: 'revolute', parentPartId: 'p4', childPartId: 'p5', origin: [0, 0, 0], axis: [0, 1, 0] },
    { name: 'j6', kind: 'revolute', parentPartId: 'p5', childPartId: 'p6', origin: [0, 0, 0], axis: [0, 0, 1] },
    { name: 'j7', kind: 'revolute', parentPartId: 'p0', childPartId: 'p7', origin: [10, 0, 0], axis: [0, 0, 1] },
  ] as unknown as AssemblyJointStored[];
  if (overrides.name !== undefined) {
    const i = joints.findIndex((j) => j.name === overrides.name);
    joints[i] = { ...joints[i], ...overrides };
  }

  return {
    __parts: () => parts,
    __joints: () => joints,
  } as unknown as Assembly;
}

describe('solveAnalytical (characterisation)', () => {
  it('solves the Puma position channel and prefills wrist + off-chain DOFs', () => {
    const r = solveAnalytical(makePuma(), 'tip', { position: [0, 170, BASE_H] });
    expect(r).not.toBeNull();
    expect(r!.solverUsed).toBe('analytical');
    expect(Object.keys(r!.poses).sort()).toEqual(['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7']);
    expect(r!.poses.j1).toBeCloseTo(90, 10);
    expect(r!.poses.j2).toBeCloseTo(17.082583243449253, 10);
    expect(r!.poses.j3).toBeCloseTo(-38.62483287305296, 10);
    expect(r!.poses.j4).toBe(0);
    expect(r!.poses.j5).toBe(0);
    expect(r!.poses.j6).toBe(0);
    expect(r!.poses.j7).toBe(0);
  });

  it('returns null without a position target', () => {
    expect(solveAnalytical(makePuma(), 'tip', {})).toBeNull();
    expect(solveAnalytical(makePuma(), 'tip', { orientation: [0, 0, 0] })).toBeNull();
  });

  it('returns null when the tip link is not in the assembly', () => {
    expect(solveAnalytical(makePuma(), 'missing', { position: [0, 170, BASE_H] })).toBeNull();
  });

  it('returns null when the proximal joint axes do not match the Puma layout', () => {
    const arm = makePuma({ name: 'j1', axis: [1, 0, 0] });
    expect(solveAnalytical(arm, 'tip', { position: [0, 170, BASE_H] })).toBeNull();
  });

  it('returns null when the zero-pose wrist center is off the expected axis', () => {
    const arm = makePuma({}, [L2, 5, 0]);
    expect(solveAnalytical(arm, 'tip', { position: [0, 170, BASE_H] })).toBeNull();
  });

  it('returns null when the target is outside the reachable workspace', () => {
    expect(solveAnalytical(makePuma(), 'tip', { position: [1000, 0, BASE_H] })).toBeNull();
    expect(solveAnalytical(makePuma(), 'tip', { position: [0, 0, BASE_H + 5] })).toBeNull();
  });

  it('returns null when the solved angle violates a declared joint limit', () => {
    const arm = makePuma({ name: 'j1', limitsDeg: [-10, 10] });
    expect(solveAnalytical(arm, 'tip', { position: [0, 170, BASE_H] })).toBeNull();
  });
});
