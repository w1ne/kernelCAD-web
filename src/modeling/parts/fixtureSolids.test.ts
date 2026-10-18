// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { resolvePart, type FixtureKind } from './familyTable';
import { fixtureSolid } from './fixtureSolids';

describe('fixture envelope solids', () => {
  beforeAll(async () => {
    await initOcct();
  });

  function bounds(family: string, thread: string, lengthMm?: number) {
    const part = resolvePart({ family, thread, ...(lengthMm !== undefined ? { lengthMm } : {}) });
    return fixtureSolid(part.kind as FixtureKind, part.dims ?? {}, part.nominalMm).boundingBox();
  }

  it('t-slot nut spans the neck and base below the table surface', () => {
    const b = bounds('t-slot-nut', 'M10');
    expect(b.min[2]).toBeCloseTo(-16, 6); // neck 9 + base 7
    expect(b.max[2]).toBeCloseTo(0, 6);
    expect(b.max[1] - b.min[1]).toBeCloseTo(17.8, 6); // base width
    expect(b.max[0] - b.min[0]).toBeCloseTo(26, 6);
  });

  it('clamping stud is a plain cylinder at the nominal diameter', () => {
    const b = bounds('clamping-stud', 'M8', 100);
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(100, 6);
    expect(b.max[0] - b.min[0]).toBeCloseTo(8, 6);
  });

  it('flange nut is as tall as its nut height and as wide as the flange', () => {
    const b = bounds('flange-nut', 'M10');
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(10, 6);
    expect(b.max[0] - b.min[0]).toBeCloseTo(22, 6);
  });

  it('strap clamp runs from the nose to the tail through the slot', () => {
    const b = bounds('strap-clamp', 'M10');
    expect(b.min[0]).toBeCloseTo(-48, 6);
    expect(b.max[0]).toBeCloseTo(125 - 48, 6);
    expect(b.max[2]).toBeCloseTo(12, 6);
  });

  it('step block rises one tread per step', () => {
    const b = bounds('step-block', 'M12');
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(60, 6); // 4 steps x 15 mm
    expect(b.max[1] - b.min[1]).toBeCloseTo(28, 6);
  });
});
