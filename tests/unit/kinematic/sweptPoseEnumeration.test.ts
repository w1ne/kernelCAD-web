// tests/unit/kinematic/sweptPoseEnumeration.test.ts
//
// T3.1 — pose enumeration for the swept-collision loop. Range-based
// walks, explicit sample passthrough, default-walk over declared joints,
// and the sparse-density detector per D3.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import {
  enumeratePoses,
  isSparse,
} from '../../../src/kinematic/sweptPoseEnumeration';
import type { Assembly } from '../../../src/modeling/capture/assembly';

function makeArmWithTwoRevolutes(): Assembly {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('enum-fixture');
  const base = arm.part('base', kc.box(10, 10, 10));
  const upper = arm.part('upper', kc.box(10, 10, 100));
  const fore = arm.part('fore', kc.box(10, 10, 100));
  arm.revolute('shoulder', base, upper, {
    axis: [0, 0, 1],
    origin: [0, 0, 0],
    limitsDeg: [-180, 180],
  });
  arm.revolute('elbow', upper, fore, {
    axis: [0, 1, 0],
    origin: [0, 0, 100],
    limitsDeg: [-90, 90],
  });
  return arm;
}

describe('enumeratePoses', () => {
  it('walks a single joint across [lo, hi] inclusive at the given step', () => {
    const arm = makeArmWithTwoRevolutes();
    const { poses } = enumeratePoses(arm, {
      joint: 'shoulder',
      range: [-180, 180, 5],
    });
    // Inclusive: (-180 .. 180) at step 5 => 73 samples.
    expect(poses).toHaveLength(73);
    expect(poses[0]).toEqual({ shoulder: -180 });
    expect(poses[poses.length - 1]).toEqual({ shoulder: 180 });
  });

  it('returns explicit samples verbatim when opts.samples is provided', () => {
    const arm = makeArmWithTwoRevolutes();
    const samples = [{ shoulder: 0 }, { shoulder: 90 }];
    const { poses } = enumeratePoses(arm, { samples });
    expect(poses).toHaveLength(2);
    expect(poses[0]).toEqual({ shoulder: 0 });
    expect(poses[1]).toEqual({ shoulder: 90 });
  });

  it('defaults to walking every declared joint at 1° (revolute) when no opts', () => {
    const arm = makeArmWithTwoRevolutes();
    const { poses } = enumeratePoses(arm, undefined);
    // shoulder [-180, 180] at step 1 => 361; elbow [-90, 90] at step 1 => 181.
    expect(poses).toHaveLength(361 + 181);
  });

  it('flags a joint as sparse when (hi - lo) / step is below the revolute floor', () => {
    expect(isSparse('revolute', [0, 90, 10])).toBe(true);   // 9 samples < 36
    expect(isSparse('revolute', [0, 180, 1])).toBe(false);  // 180 samples >= 36
  });

  it('flags a joint as sparse when (hi - lo) / step is below the prismatic floor', () => {
    expect(isSparse('prismatic', [0, 20, 1])).toBe(true);   // 20 samples < 25
    expect(isSparse('prismatic', [0, 100, 1])).toBe(false); // 100 samples >= 25
  });

  it('reports sparseJoints for ranges that fall below the safe floor', () => {
    const arm = makeArmWithTwoRevolutes();
    const { sparseJoints } = enumeratePoses(arm, {
      joint: 'shoulder',
      range: [0, 90, 10], // 9 samples — sparse for revolute
    });
    expect(sparseJoints).toContain('shoulder');
  });
});
