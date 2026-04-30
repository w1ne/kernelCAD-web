// tests/unit/backends/occt/occtBackend.revolveSketch.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/capture/sketch';

describe('OcctBackend.revolveFromSketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('revolves a rect profile (10..20 × 0..5) into a washer with correct volume', () => {
    // Washer: inner radius 10, outer radius 20, height 5
    // Volume = π × (20² − 10²) × 5 = 1500π ≈ 4712.39
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 10, y: 0 },
      { kind: 'lineTo', x: 20, y: 0 },
      { kind: 'lineTo', x: 20, y: 5 },
      { kind: 'lineTo', x: 10, y: 5 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const revolved = OcctBackend.revolveFromSketch(sketch);
    expect(revolved.kind).toBeUndefined();
    const v = revolved.volume();
    expect(v).toBeGreaterThan(4500);
    expect(v).toBeLessThan(4900);
  });

  it('revolves a rect profile touching the axis (0..10 × 0..20) into a solid cylinder', () => {
    // Solid cylinder: radius 10, height 20
    // Volume = π × 10² × 20 = 2000π ≈ 6283.19
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
      { kind: 'lineTo', x: 10, y: 20 },
      { kind: 'lineTo', x: 0, y: 20 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const revolved = OcctBackend.revolveFromSketch(sketch);
    const v = revolved.volume();
    expect(v).toBeGreaterThan(6200);
    expect(v).toBeLessThan(6400);
  });

  it('revolves a tangentArc profile (mug body) into a positive-volume solid', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 20, y: 0 },
      { kind: 'lineTo', x: 20, y: 60 },
      { kind: 'tangentArc', x: 25, y: 80 },
      { kind: 'lineTo', x: 0, y: 80 },
      { kind: 'lineTo', x: 0, y: 0 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const revolved = OcctBackend.revolveFromSketch(sketch);
    expect(revolved.volume()).toBeGreaterThan(0);
  });

  it('throws when input is not a sketch-tagged backend', () => {
    const cube = OcctBackend.box(1, 1, 1);
    expect(() => OcctBackend.revolveFromSketch(cube)).toThrow(/not a sketch/);
  });

  it('exposes the original commands on a sketch-tagged backend', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 5, y: 0 },
      { kind: 'lineTo', x: 5, y: 5 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    expect(sketch.getSketchCommands()).toEqual(commands);
  });
});
