// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { sameCylinder } from './faceEdit';

const cyl = (loc: [number, number, number], dir: [number, number, number], radius: number) => ({ cylinder: { loc, dir, radius } });

describe('sameCylinder (face-slide re-trim rule)', () => {
  const wall = cyl([118.023, 100.515, -17.3], [0, 0, 1], 9);

  it('matches an extension of the boss wall: another point on the same axis, either direction', () => {
    expect(sameCylinder(cyl([118.023, 100.515, 3.29], [0, 0, -1], 9), wall)).toBe(true);
  });

  it('rejects another radius on the same axis (the bore, or a step)', () => {
    expect(sameCylinder(cyl([118.023, 100.515, 3.29], [0, 0, 1], 6.327), wall)).toBe(false);
    expect(sameCylinder(cyl([118.023, 100.515, 3.29], [0, 0, 1], 9.02), wall)).toBe(false);
  });

  it('rejects a parallel cylinder of the same radius on another axis', () => {
    expect(sameCylinder(cyl([118.023, 100.6, 3.29], [0, 0, 1], 9), wall)).toBe(false);
  });

  it('rejects a tilted axis and a non-cylindrical face', () => {
    expect(sameCylinder(cyl([118.023, 100.515, -17.3], [0, 0.01, 0.99995], 9), wall)).toBe(false);
    expect(sameCylinder({}, wall)).toBe(false);
  });
});
