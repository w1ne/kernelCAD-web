// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { nudgeDelta, snapDelta } from './dragMath';

describe('snapDelta', () => {
  it('snaps each axis to the mm increment', () => {
    expect(snapDelta([2.4, -1.6, 0.49], 'mm')).toEqual([2, -2, 0]);
  });
  it('snaps to 0.1 in when unit is in', () => {
    expect(snapDelta([2.6, 0, 0], 'in')).toEqual([2.54, 0, 0]);
  });
  it('normalizes negative zero produced by rounding', () => {
    expect(snapDelta([-0.4, -0.5, 0], 'mm')).toEqual([0, 0, 0]);
    expect(Object.is(snapDelta([-0.4, 0, 0], 'mm')[0], 0)).toBe(true);
  });
});

describe('nudgeDelta', () => {
  it('nudges one axis by one increment', () => {
    expect(nudgeDelta(1, 'mm', false)).toEqual([0, 1, 0]);
    expect(nudgeDelta(0, 'mm', true)).toEqual([10, 0, 0]);
  });
  it('nudges by ten increments with shift in inches', () => {
    expect(nudgeDelta(2, 'in', true)).toEqual([0, 0, 25.4]);
  });
});
