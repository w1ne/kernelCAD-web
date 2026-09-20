import { describe, expect, it, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';
import { KernelError } from '../../../../src/shared/intent/kernelError';
import type { SketchCommand } from '../../../../src/modeling/capture/sketch';

const mm = (n: number) => toParam(n, 'mm');

// Right triangle offset from the extrusion axis: twisting changes the bbox.
const tri: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(6) },
  { kind: 'close' },
];

// Spline outline: forces the NURBS branch of extrudeFromSketch.
const splineProfile: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(-5) },
  {
    kind: 'spline',
    points: [
      { x: mm(0), y: mm(-5) },
      { x: mm(30), y: mm(-5) },
      { x: mm(30), y: mm(5) },
      { x: mm(0), y: mm(5) },
    ],
  },
  { kind: 'close' },
];

describe('extrude twistAngle', () => {
  beforeAll(async () => { await initOcct(); });

  it('twists the extrusion (bbox grows vs straight extrude)', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80);
    const twisted = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: 60 });
    expect(straight.volume()).toBeGreaterThan(0);
    expect(twisted.volume()).toBeGreaterThan(0);
    expect(Math.abs(twisted.boundingBox().max[1] - straight.boundingBox().max[1])).toBeGreaterThan(1);
  });

  it('twists a NURBS (spline-outline) extrusion and preserves volume', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(splineProfile), 60);
    const twisted = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(splineProfile), 60, { twistAngle: 45 });
    expect(straight.volume()).toBeGreaterThan(0);
    expect(twisted.boundingBox().max[1]).toBeGreaterThan(straight.boundingBox().max[1] + 1);
    expect(Math.abs(twisted.volume() - straight.volume()) / straight.volume()).toBeLessThan(1e-3);
  });

  it('twistAngle 0 is identical to the legacy path (volume and bbox match)', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80);
    const zero = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: 0 });
    expect(zero.volume()).toBeCloseTo(straight.volume(), 6);
    expect(zero.boundingBox()).toEqual(straight.boundingBox());
  });

  it('throws feature.invalid-args on a non-finite twistAngle instead of silently going straight', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      let caught: unknown;
      try {
        OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: bad });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(KernelError);
      const err = caught as KernelError;
      expect(err.code).toBe('feature.invalid-args');
      expect(err.message).toMatch(/twistAngle must be a finite number/);
      expect(err.hint).toMatch(/finite/i);
      expect(err.hint).toMatch(/param/i);
    }
  });

  it('throws feature.invalid-args for a face-bound sketch with a non-zero twistAngle', () => {
    const box = OcctBackend.box(20, 20, 5);
    const topFace = box.getReplicadShape().faces.find((f) => f.normalAt().z > 0.9)!;
    const wrapped = OcctBackend.fromFaceBoundSketch(
      replicad.drawRectangle(2, 2).translate(10, 10).sketchOnFace(topFace, 'original'),
    );
    let caught: unknown;
    try {
      OcctBackend.extrudeFromSketch(wrapped, 0.5, { twistAngle: 30 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    const err = caught as KernelError;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/twistAngle is not supported for face-bound sketches/);
    expect(err.hint).toMatch(/path\(\)\.\.\.close\(\)/);
  });
});
