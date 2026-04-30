// tests/unit/backends/occt/occtBackend.sketchExtrude.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/capture/sketch';

describe('OcctBackend sketch + extrudeSketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds a sketch shape from line commands and extrudes it', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
      { kind: 'lineTo', x: 10, y: 10 },
      { kind: 'lineTo', x: 0, y: 10 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    expect(sketch.kind).toBe('sketch');
    const extruded = OcctBackend.extrudeFromSketch(sketch, 5);
    expect(extruded.kind).toBeUndefined();
    expect(extruded.volume()).toBeCloseTo(500, 1);
  });

  it('throws on empty commands', () => {
    expect(() => OcctBackend.fromSketchCommands([])).toThrow(/empty/);
  });

  it('throws when no close command is present', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
    ];
    expect(() => OcctBackend.fromSketchCommands(commands)).toThrow(/close/);
  });

  it('throws on extrudeFromSketch with non-positive depth', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 }, { kind: 'lineTo', x: 1, y: 0 },
      { kind: 'lineTo', x: 1, y: 1 }, { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    expect(() => OcctBackend.extrudeFromSketch(sketch, 0)).toThrow(/positive/);
  });

  it('builds and extrudes a sketch with a tangentArc segment', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 20, y: 0 },
      { kind: 'lineTo', x: 20, y: 10 },
      { kind: 'tangentArc', x: 15, y: 15 },
      { kind: 'lineTo', x: 10, y: 15 },
      { kind: 'lineTo', x: 10, y: 20 },
      { kind: 'lineTo', x: 0, y: 20 },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const extruded = OcctBackend.extrudeFromSketch(sketch, 5);
    expect(extruded.kind).toBeUndefined();
    // The tangentArc from (20,10) to (15,15) follows the upward tangent direction
    // and bulges outward, adding material vs the sharp-corner polygon (1687.5 mm³).
    // Volume is ~1723 mm³ — strictly above the sharp-corner baseline.
    expect(extruded.volume()).toBeGreaterThan(1687.5);
    expect(extruded.volume()).toBeLessThan(1800);
  });
});
