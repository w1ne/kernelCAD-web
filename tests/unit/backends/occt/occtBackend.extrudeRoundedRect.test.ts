// tests/unit/backends/occt/occtBackend.extrudeRoundedRect.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend.extrudeRoundedRect', () => {
  beforeAll(async () => { await initOcct(); });

  it('extrudes a rounded rectangle (volume = w*h*d - corner-cuts)', () => {
    // 20x20 square, r=2, d=5. Volume = 20*20*5 - 4*(r²-π*r²/4)*d
    //   = 2000 - 4*(4 - π)*5 ≈ 2000 - 17.17 ≈ 1982.83
    // Use loose tolerance because the exact corner-cut math involves arc area.
    const v = OcctBackend.extrudeRoundedRect(20, 20, 2, 5).volume();
    expect(v).toBeLessThan(2000);   // some material removed
    expect(v).toBeGreaterThan(1975); // not too much
  });

  it('zero radius behaves like a rectangle (volume = w*h*d)', () => {
    expect(OcctBackend.extrudeRoundedRect(10, 20, 0, 5).volume()).toBeCloseTo(1000, 0);
  });

  it('auto-clamps radius to min(w/2, h/2)', () => {
    // 10x20, r=100 → clamp to 5 (= 10/2)
    const clamped = OcctBackend.extrudeRoundedRect(10, 20, 100, 5).volume();
    const direct = OcctBackend.extrudeRoundedRect(10, 20, 5, 5).volume();
    expect(clamped).toBeCloseTo(direct, 1);
  });

  it('throws on zero or negative depth', () => {
    expect(() => OcctBackend.extrudeRoundedRect(10, 10, 1, 0)).toThrow(/positive/);
    expect(() => OcctBackend.extrudeRoundedRect(10, 10, 1, -1)).toThrow(/positive/);
  });
});
