// tests/unit/runtime/paramRef.test.ts
//
// Phase-1 unit tests for the symbolic parameter reference type.

import { describe, it, expect } from 'vitest';
import { isParamRef, makeParamRef, type ParamRef } from '../../../src/shared/runtime/paramRef';
import { isTypedParamRef, makeTypedParamRef } from '../../../src/shared/runtime/paramRef';

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

  it('boolean ParamRef eagerly exposes .value (script control-flow reads this)', () => {
    const on = makeParamRef<boolean>('hasLid', 'boolean', true);
    expect(on.value).toBe(true);
    const off = makeParamRef<boolean>('hasLid', 'boolean', false);
    expect(off.value).toBe(false);
  });

  it('boolean ParamRef.value defaults to undefined when no value is passed (back-compat)', () => {
    const ref = makeParamRef<boolean>('hasLid', 'boolean');
    expect(ref.value).toBeUndefined();
  });

  it('numeric ParamRef.value stays undefined — numeric params remain purely symbolic', () => {
    const ref = makeParamRef<number>('boltDia', 'number', 5);
    expect(ref.value).toBeUndefined();
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

describe('TypedParamRef (choice/string)', () => {
  it('factory returns a branded ref carrying the eager value', () => {
    const ref = makeTypedParamRef('Screw', 'choice', 'M4');
    expect(ref.$param).toBe('Screw');
    expect(ref._brand).toBe('ParamRef');
    expect(ref._type).toBe('choice');
    expect(ref.value).toBe('M4');
  });

  it('is frozen', () => {
    const ref = makeTypedParamRef('Label', 'string', 'KCAD');
    expect(Object.isFrozen(ref)).toBe(true);
  });

  it('toString() and template-literal coercion return the value', () => {
    const ref = makeTypedParamRef('Label', 'string', 'KCAD');
    expect(ref.toString()).toBe('KCAD');
    expect(`${ref}`).toBe('KCAD');
    expect(String(ref)).toBe('KCAD');
  });

  it('coercion to number throws a type-mismatch KernelError', () => {
    const ref = makeTypedParamRef('Label', 'string', 'KCAD');
    let err: unknown;
    try { Number(ref); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(Error);
    expect((err as { hint?: string }).hint).toContain('invalid-args.param.type-mismatch');
  });

  it('isTypedParamRef discriminates choice/string refs from numeric/boolean ParamRefs', () => {
    expect(isTypedParamRef(makeTypedParamRef('Screw', 'choice', 'M4'))).toBe(true);
    expect(isTypedParamRef(makeTypedParamRef('Label', 'string', 'KCAD'))).toBe(true);
    expect(isTypedParamRef(makeParamRef<number>('boltDia', 'number'))).toBe(false);
    expect(isTypedParamRef(makeParamRef<boolean>('addCablePort', 'boolean'))).toBe(false);
    expect(isTypedParamRef(5)).toBe(false);
    expect(isTypedParamRef(null)).toBe(false);
  });
});
