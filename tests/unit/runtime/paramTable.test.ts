// tests/unit/runtime/paramTable.test.ts
//
// Phase-1 unit tests for the session-owned ParamTable: declare/get/set/has/list,
// validation, serialize/deserialize. All errors fold under
// `feature.invalid-args` per discipline gate D-1.

import { describe, it, expect } from 'vitest';
import { ParamTable } from '../../../src/runtime/paramTable';
import { isKernelError } from '../../../src/intent/kernelError';

describe('ParamTable.declare', () => {
  it('accepts a valid numeric param with metadata', () => {
    const t = new ParamTable();
    const entry = t.declare('boltDia', 'number', 5, { min: 1, max: 20, description: 'M5' });
    expect(entry.name).toBe('boltDia');
    expect(entry.type).toBe('number');
    expect(entry.value).toBe(5);
    expect(entry.defaultValue).toBe(5);
    expect(entry.meta?.min).toBe(1);
    expect(t.has('boltDia')).toBe(true);
  });

  it('accepts a valid boolean param', () => {
    const t = new ParamTable();
    const entry = t.declare('addCablePort', 'boolean', true);
    expect(entry.type).toBe('boolean');
    expect(entry.value).toBe(true);
  });

  it('rejects a name that fails the regex (invalid-name hint)', () => {
    const t = new ParamTable();
    let err: unknown;
    try { t.declare('1leading-digit', 'number', 5); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.code).toBe('feature.invalid-args');
      expect(err.hint).toContain('invalid-args.param.invalid-name');
    }
  });

  it('rejects duplicate name (duplicate-name hint)', () => {
    const t = new ParamTable();
    t.declare('boltDia', 'number', 5);
    let err: unknown;
    try { t.declare('boltDia', 'number', 6); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('invalid-args.param.duplicate-name');
    }
  });

  it('rejects type-mismatch on default value (type-mismatch hint)', () => {
    const t = new ParamTable();
    let err: unknown;
    try { t.declare('addCablePort', 'boolean', 5 as unknown as boolean); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('invalid-args.param.type-mismatch');
    }
  });

  it('rejects defaultValue below min (value-out-of-range)', () => {
    const t = new ParamTable();
    let err: unknown;
    try { t.declare('boltDia', 'number', 0, { min: 1, max: 20 }); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('invalid-args.param.value-out-of-range');
      expect(err.hint).toContain('below min');
    }
  });

  it('rejects defaultValue above max (value-out-of-range)', () => {
    const t = new ParamTable();
    let err: unknown;
    try { t.declare('boltDia', 'number', 30, { min: 1, max: 20 }); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('above max');
    }
  });
});

describe('ParamTable.get / set / list', () => {
  it('get(unknown) throws unknown-name hint', () => {
    const t = new ParamTable();
    let err: unknown;
    try { t.get('mystery'); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('invalid-args.param.unknown-name');
    }
  });

  it('set updates value and respects bounds', () => {
    const t = new ParamTable();
    t.declare('boltDia', 'number', 5, { min: 1, max: 20 });
    t.set('boltDia', 8);
    expect(t.get('boltDia').value).toBe(8);
  });

  it('set above max throws (out-of-range)', () => {
    const t = new ParamTable();
    t.declare('boltDia', 'number', 5, { min: 1, max: 20 });
    let err: unknown;
    try { t.set('boltDia', 25); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('above max');
    }
  });

  it('set with type-mismatched value throws', () => {
    const t = new ParamTable();
    t.declare('addCablePort', 'boolean', true);
    let err: unknown;
    try { t.set('addCablePort', 1 as unknown as boolean); } catch (e) { err = e; }
    expect(isKernelError(err)).toBe(true);
    if (isKernelError(err)) {
      expect(err.hint).toContain('invalid-args.param.type-mismatch');
    }
  });

  it('list returns a copy with metadata cloned', () => {
    const t = new ParamTable();
    t.declare('a', 'number', 1, { min: 0, max: 10 });
    t.declare('b', 'boolean', false);
    const list = t.list();
    expect(list).toHaveLength(2);
    expect(list[0].meta?.min).toBe(0);
    list[0].meta!.min = 999;
    // Internal state untouched
    expect(t.get('a').meta?.min).toBe(0);
  });
});

describe('ParamTable.serialize / deserialize round-trip', () => {
  it('preserves value, defaultValue, type, meta', () => {
    const t = new ParamTable();
    t.declare('boltDia', 'number', 5, { min: 1, max: 20, description: 'M5' });
    t.declare('addCablePort', 'boolean', true);
    t.set('boltDia', 8);

    const json = t.serialize();
    const t2 = ParamTable.deserialize(json);

    expect(t2.size()).toBe(2);
    expect(t2.get('boltDia').value).toBe(8);
    expect(t2.get('boltDia').defaultValue).toBe(5);
    expect(t2.get('boltDia').meta?.description).toBe('M5');
    expect(t2.get('addCablePort').value).toBe(true);
  });

  it('deserialize(undefined) yields an empty table (back-compat for legacy sessions)', () => {
    const t = ParamTable.deserialize(undefined);
    expect(t.size()).toBe(0);
  });
});
