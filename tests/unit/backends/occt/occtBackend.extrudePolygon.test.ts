// tests/unit/backends/occt/occtBackend.extrudePolygon.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend.extrudePolygon', () => {
  beforeAll(async () => { await initOcct(); });

  it('extrudes an equilateral triangle (CCW points)', () => {
    // Equilateral triangle, side 10, base on Y=0
    const points: [number, number][] = [[0, 0], [10, 0], [5, Math.sqrt(75)]];
    const shape = OcctBackend.extrudePolygon(points, 5);
    // Volume = (sqrt(3)/4) * 10^2 * 5 ≈ 216.5
    expect(shape.volume()).toBeCloseTo(216.506, 0);
  });

  it('auto-reverses CW input to CCW', () => {
    const ccw: [number, number][] = [[0, 0], [10, 0], [5, 8]];
    const cw: [number, number][] = [[0, 0], [5, 8], [10, 0]]; // reversed
    expect(OcctBackend.extrudePolygon(ccw, 5).volume()).toBeCloseTo(
      OcctBackend.extrudePolygon(cw, 5).volume(), 1
    );
  });

  it('extrudes a square (4 CCW points)', () => {
    const points: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(OcctBackend.extrudePolygon(points, 3).volume()).toBeCloseTo(300, 1);
  });

  it('throws on fewer than 3 points', () => {
    expect(() => OcctBackend.extrudePolygon([[0,0]], 5)).toThrow(/at least 3/);
    expect(() => OcctBackend.extrudePolygon([[0,0],[1,0]], 5)).toThrow(/at least 3/);
  });

  it('throws on zero or negative depth', () => {
    const points: [number, number][] = [[0,0],[10,0],[5,8]];
    expect(() => OcctBackend.extrudePolygon(points, 0)).toThrow(/positive/);
    expect(() => OcctBackend.extrudePolygon(points, -1)).toThrow(/positive/);
  });
});
