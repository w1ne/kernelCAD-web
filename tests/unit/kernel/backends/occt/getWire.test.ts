// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { getWire } from '../../../../../src/kernel/backends/occt/meshing';

describe('getWire (characterisation)', () => {
  it('returns null for non-record input', () => {
    expect(getWire(null)).toBeNull();
    expect(getWire(undefined)).toBeNull();
    expect(getWire(42)).toBeNull();
    expect(getWire('wire')).toBeNull();
    expect(getWire(true)).toBeNull();
  });

  it('returns null for a record with no wire-like properties', () => {
    expect(getWire({})).toBeNull();
    expect(getWire({ foo: 'bar', n: 0 })).toBeNull();
  });

  it('returns a direct wire record property as-is', () => {
    const wire = { id: 'w' };
    expect(getWire({ wire })).toBe(wire);
  });

  it('treats an array wire property as a record and returns it', () => {
    const wire = [1, 2, 3];
    expect(getWire({ wire })).toBe(wire);
  });

  it('calls a wire function with the object as this and returns its result', () => {
    expect(getWire({ wire: () => [7] })).toEqual([7]);
    const owner = { wire: function (this: unknown) { return this; } };
    expect(getWire(owner)).toBe(owner);
  });

  it('ignores falsy wire values', () => {
    expect(getWire({ wire: 0 })).toBeNull();
    expect(getWire({ wire: false })).toBeNull();
    expect(getWire({ wire: '' })).toBeNull();
    expect(getWire({ wire: null })).toBeNull();
  });

  it('calls a wire function twice when it returns a falsy value', () => {
    const wire = vi.fn(() => null);
    expect(getWire({ wire })).toBeNull();
    expect(wire).toHaveBeenCalledTimes(2);
  });

  it('calls a wire function twice when it throws', () => {
    const wire = vi.fn(() => {
      throw new Error('nope');
    });
    expect(getWire({ wire })).toBeNull();
    expect(wire).toHaveBeenCalledTimes(2);
  });

  it('falls back to outerWire record / function', () => {
    const outer = { id: 'outer' };
    expect(getWire({ outerWire: outer })).toBe(outer);
    expect(getWire({ outerWire: () => outer })).toBe(outer);
    const twice = vi.fn(() => null);
    expect(getWire({ outerWire: twice })).toBeNull();
    expect(twice).toHaveBeenCalledTimes(2);
  });

  it('prefers wire over outerWire', () => {
    const wire = { tag: 'wire' };
    const outerWire = { tag: 'outer' };
    expect(getWire({ wire, outerWire })).toBe(wire);
  });

  it('recurses through _wrapped and occ', () => {
    const wire = { id: 'w' };
    expect(getWire({ _wrapped: { wire } })).toBe(wire);
    expect(getWire({ occ: { wire } })).toBe(wire);
    expect(getWire({ _wrapped: { occ: { wire } } })).toBe(wire);
  });

  it('recurses through shape', () => {
    const wire = { id: 'w' };
    expect(getWire({ shape: { wire } })).toBe(wire);
  });

  it('prefers _wrapped and shape over direct wire', () => {
    const wrapped = { tag: 'wrapped' };
    const shape = { tag: 'shape' };
    const direct = { tag: 'direct' };
    expect(getWire({ _wrapped: { wire: wrapped }, shape: { wire: shape }, wire: direct })).toBe(wrapped);
    expect(getWire({ shape: { wire: shape }, wire: direct })).toBe(shape);
  });

  it('returns the first record in a non-empty wires array', () => {
    const first = { id: 'first' };
    expect(getWire({ wires: [first, { id: 'second' }] })).toBe(first);
  });

  it('ignores empty wires arrays and non-record entries', () => {
    expect(getWire({ wires: [] })).toBeNull();
    expect(getWire({ wires: [42] })).toBeNull();
    expect(getWire({ wires: 'no' })).toBeNull();
  });

  it('recurses through sketch', () => {
    const wire = { id: 'w' };
    expect(getWire({ sketch: { wire } })).toBe(wire);
  });

  it('prefers wires over sketch', () => {
    const fromWires = { tag: 'wires' };
    const fromSketch = { tag: 'sketch' };
    expect(getWire({ wires: [fromWires], sketch: { wire: fromSketch } })).toBe(fromWires);
  });

  it('falls through to sketch when _wrapped and shape cannot resolve', () => {
    const wire = { id: 'w' };
    expect(getWire({ _wrapped: {}, shape: {}, wire: undefined, sketch: { wire } })).toBe(wire);
  });
});
