// tests/unit/runtime/paramRef.test.ts
//
// Phase-1 unit tests for the symbolic parameter reference type.

import { describe, it, expect } from 'vitest';
import { isParamRef, makeParamRef, type ParamRef } from '../../../src/shared/runtime/paramRef';

describe('paramRef', () => {
  it('factory returns a branded ref with $param + _type', () => {
    const ref = makeParamRef<number>('boltDia', 'number');
    expect(ref.$param).toBe('boltDia');
    expect(ref._brand).toBe('ParamRef');
    expect(ref._type).toBe('number');
  });

  it('boolean type tag preserved', () => {
    const ref = makeParamRef<boolean>('addCablePort', 'boolean');
    expect(ref._type).toBe('boolean');
  });

  it('factory output is frozen (no accidental mutation downstream)', () => {
    const ref = makeParamRef<number>('x', 'number');
    expect(Object.isFrozen(ref)).toBe(true);
  });

  it('isParamRef discriminates branded refs from look-alikes', () => {
    const real = makeParamRef<number>('x', 'number');
    expect(isParamRef(real)).toBe(true);
  });

  it('isParamRef rejects non-objects', () => {
    expect(isParamRef(5)).toBe(false);
    expect(isParamRef('boltDia')).toBe(false);
    expect(isParamRef(null)).toBe(false);
    expect(isParamRef(undefined)).toBe(false);
    expect(isParamRef(true)).toBe(false);
  });

  it('isParamRef rejects shape-similar but un-branded objects', () => {
    const fake = { $param: 'boltDia' };
    expect(isParamRef(fake)).toBe(false);

    const wrongBrand = { $param: 'boltDia', _brand: 'NotParamRef' };
    expect(isParamRef(wrongBrand)).toBe(false);

    const noName = { _brand: 'ParamRef' };
    expect(isParamRef(noName)).toBe(false);
  });

  it('two refs with same name are still distinct objects (no caching at factory level)', () => {
    const a = makeParamRef<number>('x', 'number');
    const b = makeParamRef<number>('x', 'number');
    expect(a).not.toBe(b);
    expect(a.$param).toBe(b.$param);
  });
});
