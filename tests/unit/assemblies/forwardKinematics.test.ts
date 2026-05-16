import { describe, expect, it } from 'vitest';
import {
  forwardKinematics,
  type NumericPoses,
} from '../../../src/capture/forwardKinematics';
import type {
  AssemblyJointStored,
  AssemblyPartStored,
} from '../../../src/capture/assembly';

/**
 * The helper only reads a small subset of the AssemblyPartStored /
 * AssemblyJointStored fields (id from parts; name/kind/parentPartId/
 * childPartId/axis/origin from joints). To keep the unit test decoupled
 * from CaptureSession + Shape, we build minimal stubs and cast — the
 * helper never touches the unread fields.
 */
function part(id: string): AssemblyPartStored {
  return { id } as unknown as AssemblyPartStored;
}

function near(a: readonly number[], b: readonly number[], eps = 1e-6): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
  }
}

describe('forwardKinematics (extracted helper)', () => {
  it('canonical regression: yaw 90deg + pitch 90deg lands elbow origin at (0, 0, 10)', () => {
    // Mirror the existing assemblySolve.test "canonical regression" case but
    // call the pure helper directly instead of going through Assembly.solve.
    const parts: AssemblyPartStored[] = [
      part('p_base'),
      part('p_shoulder'),
      part('p_elbow'),
    ];
    const joints: AssemblyJointStored[] = [
      {
        name: 'yaw',
        kind: 'revolute',
        parentPartId: 'p_base',
        childPartId: 'p_shoulder',
        axis: [0, 0, 1],
        origin: [0, 0, 0],
      },
      {
        name: 'pitch',
        kind: 'revolute',
        parentPartId: 'p_shoulder',
        childPartId: 'p_elbow',
        axis: [0, 1, 0],
        origin: [0, 0, 10],
      },
    ];
    const poses: NumericPoses = { yaw: 90, pitch: 90 };

    const worldT = forwardKinematics(parts, joints, poses);

    const elbow = worldT.get('p_elbow');
    expect(elbow).toBeDefined();
    near(elbow!.point([0, 0, 0]), [0, 0, 10]);
    near(elbow!.point([10, 0, 0]), [0, 0, 0]);
  });

  it('returns identity for a root part with no parent joint', () => {
    const parts: AssemblyPartStored[] = [part('p_root')];
    const joints: AssemblyJointStored[] = [];
    const worldT = forwardKinematics(parts, joints, {});
    near(worldT.get('p_root')!.point([1, 2, 3]), [1, 2, 3]);
  });
});
