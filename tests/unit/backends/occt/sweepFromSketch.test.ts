// tests/unit/backends/occt/sweepFromSketch.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/capture/sketch';
import { helix } from '../../../../src/modules/helix';

const square2x2: SketchCommand[] = [
  { kind: 'moveTo', x: -1, y: -1 },
  { kind: 'lineTo', x: 1, y: -1 },
  { kind: 'lineTo', x: 1, y: 1 },
  { kind: 'lineTo', x: -1, y: 1 },
  { kind: 'close' },
];

describe('OcctBackend.sweepFromSketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('sweeps a 2x2 square along a 50mm Z rail → volume ≈ 4 × 50 = 200', () => {
    const sketch = OcctBackend.fromSketchCommands(square2x2);
    const swept = OcctBackend.sweepFromSketch(sketch, [[0, 0, 0], [0, 0, 50]]);
    expect(swept.kind).toBeUndefined();
    const v = swept.volume();
    expect(v).toBeGreaterThan(190);
    expect(v).toBeLessThan(210);
  });

  it('L-bend pipe: square along 3-point planar polyline rail → positive volume', () => {
    const sketch = OcctBackend.fromSketchCommands(square2x2);
    const rail: [number, number, number][] = [[0, 0, 0], [0, 0, 30], [30, 0, 30]];
    const swept = OcctBackend.sweepFromSketch(sketch, rail);
    expect(swept.volume()).toBeGreaterThan(0);
  });

  it('helix sweep with frenet=true produces a positive-volume spring', () => {
    const sketch = OcctBackend.fromSketchCommands(square2x2);
    const rail = helix({ radius: 8, pitch: 4, turns: 2, pointsPerTurn: 24 });
    const swept = OcctBackend.sweepFromSketch(sketch, rail, { frenet: true });
    expect(swept.volume()).toBeGreaterThan(0);
  });

  it('throws on rail with fewer than 2 points', () => {
    const sketch = OcctBackend.fromSketchCommands(square2x2);
    expect(() => OcctBackend.sweepFromSketch(sketch, [[0, 0, 0]]))
      .toThrow(/rail.*at least 2 points/i);
  });

  it('throws when input is not a sketch-tagged backend', () => {
    const cube = OcctBackend.box(1, 1, 1);
    expect(() => OcctBackend.sweepFromSketch(cube, [[0, 0, 0], [0, 0, 10]]))
      .toThrow(/not a sketch/);
  });
});
