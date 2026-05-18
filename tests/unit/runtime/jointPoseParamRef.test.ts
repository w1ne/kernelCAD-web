// tests/unit/runtime/jointPoseParamRef.test.ts
//
// Slice 2C — joint-pose ParamRef discriminator. A joint pose is mechanically
// just a ParamRef<number>, but the UI needs to tell them apart from regular
// numeric params so JointsTab can claim them (and ParamsTab can skip them).

import { describe, it, expect } from 'vitest';
import {
  makeJointPoseParamRef,
  isJointPoseParamRef,
} from '../../../src/shared/runtime/jointPoseParamRef';
import { makeParamRef } from '../../../src/shared/runtime/paramRef';

describe('makeJointPoseParamRef', () => {
  it('creates a ParamRef tagged as joint-pose', () => {
    const ref = makeJointPoseParamRef('shoulder');
    expect(isJointPoseParamRef(ref)).toBe(true);
    expect(ref.$param).toBe('shoulder');
    expect(ref._type).toBe('number');
  });

  it('non-joint ParamRefs are not joint poses', () => {
    const ref = makeParamRef<number>('width', 'number');
    expect(isJointPoseParamRef(ref)).toBe(false);
  });

  it('isJointPoseParamRef rejects non-ParamRef values', () => {
    expect(isJointPoseParamRef(null)).toBe(false);
    expect(isJointPoseParamRef(undefined)).toBe(false);
    expect(isJointPoseParamRef(42)).toBe(false);
    expect(isJointPoseParamRef({ $param: 'fake' })).toBe(false);
  });

  it('frozen joint-pose ParamRefs survive registry membership', () => {
    const ref = makeJointPoseParamRef('elbow');
    expect(Object.isFrozen(ref)).toBe(true);
    // Calling isJointPoseParamRef twice yields the same answer (WeakSet keeps it).
    expect(isJointPoseParamRef(ref)).toBe(true);
    expect(isJointPoseParamRef(ref)).toBe(true);
  });
});
