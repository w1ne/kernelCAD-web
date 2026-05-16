import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

describe('OcctBackend', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('builds a box and reports correct volume', () => {
    const b = OcctBackend.box(10, 20, 30);
    expect(b.volume()).toBeCloseTo(6000, 1);
    const bb = b.boundingBox();
    expect(bb.min).toEqual([0, 0, 0]);
    expect(bb.max).toEqual([10, 20, 30]);
  });

  it('translate moves the bbox', () => {
    const b = OcctBackend.box(10, 10, 10).translate(5, 0, 0);
    expect(b.boundingBox().min[0]).toBe(5);
  });

  it('subtract reduces volume', () => {
    const base = OcctBackend.box(20, 20, 20);
    const hole = OcctBackend.cylinder(20, 5).translate(10, 10, 0);
    const result = base.subtract(hole);
    const expected = 8000 - Math.PI * 25 * 20;
    expect(result.volume()).toBeCloseTo(expected, 0);
  });

  it('exportSTLAsync produces a valid binary STL header', async () => {
    const b = OcctBackend.box(10, 10, 10);
    const stl = await b.exportSTLAsync();
    expect(stl.length).toBeGreaterThan(84);
  });
});
