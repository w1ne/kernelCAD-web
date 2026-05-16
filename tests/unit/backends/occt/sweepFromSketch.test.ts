// tests/unit/backends/occt/sweepFromSketch.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/shared/capture/sketch';
import { helix } from '../../../../src/modules/helix';
import { toParam } from '../../../../src/runtime/editableHelpers';

const mm = (n: number) => toParam(n, 'mm');
const square2x2: SketchCommand[] = [
  { kind: 'moveTo', x: mm(-1), y: mm(-1) },
  { kind: 'lineTo', x: mm(1), y: mm(-1) },
  { kind: 'lineTo', x: mm(1), y: mm(1) },
  { kind: 'lineTo', x: mm(-1), y: mm(1) },
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
    // Verify the swept solid actually has the expected spatial extent — not
    // just the right volume (a wrong-axis or wrong-origin sweep can still
    // produce volume 200 but be the wrong shape).
    const replicadShape = swept.getReplicadShape() as unknown as {
      boundingBox: { bounds: [[number, number, number], [number, number, number]] };
    };
    const [min, max] = replicadShape.boundingBox.bounds;
    expect(min[0]).toBeCloseTo(-1, 1);
    expect(min[1]).toBeCloseTo(-1, 1);
    expect(min[2]).toBeCloseTo(0, 1);
    expect(max[0]).toBeCloseTo(1, 1);
    expect(max[1]).toBeCloseTo(1, 1);
    expect(max[2]).toBeCloseTo(50, 1);
  });

  it('L-bend pipe: square along 3-point planar polyline rail → positive volume', () => {
    const sketch = OcctBackend.fromSketchCommands(square2x2);
    const rail: [number, number, number][] = [[0, 0, 0], [0, 0, 30], [30, 0, 30]];
    const swept = OcctBackend.sweepFromSketch(sketch, rail);
    expect(swept.volume()).toBeGreaterThan(0);
    // L-bend rail (0,0,0) → (0,0,30) → (30,0,30); profile 2x2 centered on rail.
    // Measured bbox: x ∈ [-1, 30], y ∈ [-1, 1], z ∈ [0, 31].
    // The sweep does not overshoot the rail at its start endpoints (matches the
    // rc.8 straight-pipe behavior: z starts at 0, x ends at 30) but the profile
    // half-width does extend the bbox by ±1 perpendicular to the rail's
    // direction along each leg, and past the trailing corner along the second
    // leg's start direction (z extends to 31).
    const replicadShape = swept.getReplicadShape() as unknown as {
      boundingBox: { bounds: [[number, number, number], [number, number, number]] };
    };
    const [min, max] = replicadShape.boundingBox.bounds;
    expect(min[0]).toBeCloseTo(-1, 1);
    expect(max[0]).toBeCloseTo(30, 1);
    expect(min[1]).toBeCloseTo(-1, 1);
    expect(max[1]).toBeCloseTo(1, 1);
    expect(min[2]).toBeCloseTo(0, 1);
    expect(max[2]).toBeCloseTo(31, 1);
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
