import { describe, it, expect } from 'vitest';
import { isValidEditableVec3, type Vec3Param } from '../../../src/intent/types';
import { toVec3Param, resolveVec3Param } from '../../../src/runtime/editableHelpers';
import { makeParamRef } from '../../../src/runtime/paramRef';
import { ParamTable } from '../../../src/runtime/paramTable';

describe('Vec3Param helpers', () => {
  it('isValidEditableVec3 accepts plain numeric Vec3', () => {
    expect(isValidEditableVec3([1, 2, 3])).toBe(true);
    expect(isValidEditableVec3([0, 0, 0])).toBe(true);
  });

  it('isValidEditableVec3 accepts mixed number + ParamRef coords', () => {
    const x = makeParamRef<number>('x', 'number');
    expect(isValidEditableVec3([x, 2, 3])).toBe(true);
    expect(isValidEditableVec3([x, x.divide(2), x.add(5)])).toBe(true);
  });

  it('isValidEditableVec3 rejects non-arrays, wrong length, NaN, boolean ParamRef', () => {
    expect(isValidEditableVec3(undefined)).toBe(false);
    expect(isValidEditableVec3([])).toBe(false);
    expect(isValidEditableVec3([1, 2])).toBe(false);
    expect(isValidEditableVec3([1, 2, 3, 4])).toBe(false);
    expect(isValidEditableVec3([NaN, 2, 3])).toBe(false);
    const b = makeParamRef<boolean>('b', 'boolean');
    expect(isValidEditableVec3([b, 2, 3])).toBe(false);
  });

  it('toVec3Param wraps three numbers as Params', () => {
    const v: Vec3Param = toVec3Param([1, 2, 3], 'mm');
    expect(v.x.evaluated).toBe(1);
    expect(v.y.evaluated).toBe(2);
    expect(v.z.evaluated).toBe(3);
    expect(v.x.unit).toBe('mm');
    expect(v.x.paramRef).toBeUndefined();
  });

  it('toVec3Param wraps mixed numeric + ParamRef coords', () => {
    const x = makeParamRef<number>('x', 'number');
    const v = toVec3Param([x, 0, 0], 'mm');
    expect(v.x.paramRef).toBe('x');
    expect(v.y.paramRef).toBeUndefined();
  });

  it('resolveVec3Param resolves all three Params against the table', () => {
    const t = new ParamTable();
    t.declare('x', 'number', 70);
    const x = makeParamRef<number>('x', 'number');
    const v = toVec3Param([x.divide(2), 0, x], 'mm');
    expect(resolveVec3Param(v, t)).toEqual([35, 0, 70]);
    t.set('x', 100);
    expect(resolveVec3Param(v, t)).toEqual([50, 0, 100]);
  });
});

describe('Vec3Param-as-input passthrough', () => {
  it('isValidEditableVec3 accepts a Vec3Param object', () => {
    const v: Vec3Param = {
      x: { expression: '1', unit: 'mm', evaluated: 1 },
      y: { expression: '2', unit: 'mm', evaluated: 2 },
      z: { expression: '3', unit: 'mm', evaluated: 3 },
    };
    expect(isValidEditableVec3(v)).toBe(true);
  });

  it('toVec3Param passes Vec3Param through unchanged', () => {
    const x = makeParamRef<number>('x', 'number');
    const original = toVec3Param([x.divide(2), 0, 0], 'mm');
    const passedThrough = toVec3Param(original, 'mm');
    // Same object reference (passthrough preserves the symbolic chain).
    expect(passedThrough).toBe(original);
    // ParamRef expression still intact.
    expect(passedThrough.x.paramRef).toBeDefined();
  });

  it('isValidEditableVec3 rejects malformed Vec3Param-shaped objects', () => {
    expect(isValidEditableVec3({ x: 1, y: 2, z: 3 })).toBe(false);  // raw numbers
    expect(isValidEditableVec3({ x: {}, y: {}, z: {} })).toBe(false);  // missing fields
    expect(isValidEditableVec3({ x: { evaluated: 1, unit: 'mm' } })).toBe(false);  // missing y, z
  });
});
