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
});
