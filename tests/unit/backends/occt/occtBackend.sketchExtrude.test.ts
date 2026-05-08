// tests/unit/backends/occt/occtBackend.sketchExtrude.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/capture/sketch';
import { toParam } from '../../../../src/runtime/editableHelpers';

const mm = (n: number) => toParam(n, 'mm');
const ul = (n: number) => toParam(n, 'unitless');

describe('OcctBackend sketch + extrudeSketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds a sketch shape from line commands and extrudes it', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(10), y: mm(0) },
      { kind: 'lineTo', x: mm(10), y: mm(10) },
      { kind: 'lineTo', x: mm(0), y: mm(10) },
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
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(10), y: mm(0) },
    ];
    expect(() => OcctBackend.fromSketchCommands(commands)).toThrow(/close/);
  });

  it('throws on extrudeFromSketch with non-positive depth', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) }, { kind: 'lineTo', x: mm(1), y: mm(0) },
      { kind: 'lineTo', x: mm(1), y: mm(1) }, { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    expect(() => OcctBackend.extrudeFromSketch(sketch, 0)).toThrow(/positive/);
  });

  it('builds and extrudes a sketch with a tangentArc segment', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(20), y: mm(0) },
      { kind: 'lineTo', x: mm(20), y: mm(10) },
      { kind: 'tangentArc', x: mm(15), y: mm(15) },
      { kind: 'lineTo', x: mm(10), y: mm(15) },
      { kind: 'lineTo', x: mm(10), y: mm(20) },
      { kind: 'lineTo', x: mm(0), y: mm(20) },
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

  it('threePointsArc produces a non-zero-area extrusion', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'threePointsArc', x: mm(20), y: mm(0), midX: mm(10), midY: mm(5) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const extruded = OcctBackend.extrudeFromSketch(sketch, 1);
    const v = extruded.volume();
    expect(v).toBeGreaterThan(50);
    expect(v).toBeLessThan(80);
  });

  it('sagittaArc with positive vs negative sagitta produces equal-magnitude volumes (sign = bulge side)', () => {
    const cmdsPos: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'sagittaArc', x: mm(20), y: mm(0), sagitta: mm(5) },
      { kind: 'close' },
    ];
    const cmdsNeg: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'sagittaArc', x: mm(20), y: mm(0), sagitta: mm(-5) },
      { kind: 'close' },
    ];
    const vPos = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsPos), 1).volume();
    const vNeg = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsNeg), 1).volume();
    expect(vPos).toBeGreaterThan(50);
    expect(vNeg).toBeCloseTo(vPos, 1);
  });

  it('bulgeArc and sagittaArc produce equivalent shapes when sagitta = bulge × halfChord (within 5%)', () => {
    // Replicad bulge = tan(theta/4); for chord 20 / sagitta 5, expected bulge ≈ 0.5.
    const cmdsSag: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'sagittaArc', x: mm(20), y: mm(0), sagitta: mm(5) },
      { kind: 'close' },
    ];
    const cmdsBulge: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'bulgeArc', x: mm(20), y: mm(0), bulge: ul(0.5) },
      { kind: 'close' },
    ];
    const vSag = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsSag), 1).volume();
    const vBulge = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsBulge), 1).volume();
    const ratio = vBulge / vSag;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it('radiusArc produces correct volume — analytic circular segment area', () => {
    // chord 20, radius 15 → theta = 2·asin(2/3) ≈ 1.4595 rad
    // segment area = R²(theta − sin theta)/2 ≈ 225 × (1.4595 − 0.9938)/2 ≈ 52.4
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'radiusArc', x: mm(20), y: mm(0), radius: mm(15) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const v = OcctBackend.extrudeFromSketch(sketch, 1).volume();
    expect(v).toBeGreaterThan(40);
    expect(v).toBeLessThan(70);
  });

  it('radiusArc throws when |radius| < chord/2', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'radiusArc', x: mm(20), y: mm(0), radius: mm(9) },
      { kind: 'close' },
    ];
    expect(() => OcctBackend.fromSketchCommands(commands))
      .toThrow(/radiusArc:.*radius.*9.*too small.*chord/);
  });

  it('radiusArc throws when chord is degenerate (start ≈ end)', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(5), y: mm(5) },
      { kind: 'radiusArc', x: mm(5), y: mm(5), radius: mm(10) },
      { kind: 'close' },
    ];
    expect(() => OcctBackend.fromSketchCommands(commands))
      .toThrow(/radiusArc:.*degenerate chord/);
  });

  it('radiusArc with positive vs negative radius produces equal-magnitude volumes (sign = bulge side)', () => {
    const cmdsPos: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'radiusArc', x: mm(20), y: mm(0), radius: mm(15) },
      { kind: 'close' },
    ];
    const cmdsNeg: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'radiusArc', x: mm(20), y: mm(0), radius: mm(-15) },
      { kind: 'close' },
    ];
    const vPos = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsPos), 1).volume();
    const vNeg = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(cmdsNeg), 1).volume();
    expect(vPos).toBeGreaterThan(40);
    expect(vNeg).toBeCloseTo(vPos, 1);
  });
});
