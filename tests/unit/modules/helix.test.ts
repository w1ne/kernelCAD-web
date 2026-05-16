// tests/unit/modules/helix.test.ts
import { describe, it, expect } from 'vitest';
import { helix } from '../../../src/modeling/helix';

describe('helix', () => {
  it('default 32 points/turn × 1 turn → 33 points (start + 32 segments)', () => {
    const pts = helix({ radius: 10, pitch: 5, turns: 1 });
    expect(pts).toHaveLength(33);
  });

  it('first point at (radius, 0, 0); last point at ≈(radius, 0, pitch * turns)', () => {
    const pts = helix({ radius: 10, pitch: 5, turns: 1 });
    expect(pts[0][0]).toBeCloseTo(10, 5);
    expect(pts[0][1]).toBeCloseTo(0, 5);
    expect(pts[0][2]).toBeCloseTo(0, 5);
    expect(pts[32][0]).toBeCloseTo(10, 5);
    expect(pts[32][1]).toBeCloseTo(0, 5);
    expect(pts[32][2]).toBeCloseTo(5, 5);
  });

  it('axis: "X" rotates the helix into the YZ plane (axis = X)', () => {
    const pts = helix({ radius: 10, pitch: 5, turns: 1, axis: 'X' });
    // First point: x = 0 (axial start), y = radius, z = 0
    expect(pts[0][0]).toBeCloseTo(0, 5);
    expect(pts[0][1]).toBeCloseTo(10, 5);
    expect(pts[0][2]).toBeCloseTo(0, 5);
  });

  it('pointsPerTurn: 8, turns: 2 → 17 points (start + 16 segments)', () => {
    const pts = helix({ radius: 5, pitch: 2, turns: 2, pointsPerTurn: 8 });
    expect(pts).toHaveLength(17);
  });

  it('startAngle: π/2 puts first point at (0, radius, 0) on Z axis', () => {
    const pts = helix({ radius: 10, pitch: 5, turns: 1, startAngle: Math.PI / 2 });
    expect(pts[0][0]).toBeCloseTo(0, 5);
    expect(pts[0][1]).toBeCloseTo(10, 5);
    expect(pts[0][2]).toBeCloseTo(0, 5);
  });
});

describe('helix script-runtime registration', () => {
  it('helix is callable from a kernelCAD script', async () => {
    const { runScript } = await import('../../../src/script-runtime/runScript');
    const code = `
      const pts = helix({ radius: 10, pitch: 5, turns: 1 });
      // No shape returned — just verifying helix() is a global.
      return undefined;
    `;
    // Should not throw; runScript returns a result with returnValue undefined.
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.returnValue).toBeUndefined();
  });
});
