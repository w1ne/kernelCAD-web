import { describe, expect, it, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';
import type { SketchCommand } from '../../../../src/modeling/capture/sketch';

const mm = (n: number) => toParam(n, 'mm');

// Right triangle offset from the extrusion axis: twisting changes the bbox.
const tri: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(6) },
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

  it('twistAngle 0 is identical to the legacy path (volume match)', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80);
    const zero = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: 0 });
    expect(zero.volume()).toBeCloseTo(straight.volume(), 6);
  });

  it('throws on a non-zero twistAngle for a face-bound sketch', () => {
    const box = OcctBackend.box(20, 20, 5);
    const topFace = box.getReplicadShape().faces.find((f) => f.normalAt().z > 0.9)!;
    const wrapped = OcctBackend.fromFaceBoundSketch(
      replicad.drawRectangle(2, 2).translate(10, 10).sketchOnFace(topFace, 'original'),
    );
    expect(() => OcctBackend.extrudeFromSketch(wrapped, 0.5, { twistAngle: 30 }))
      .toThrow(/twistAngle is not supported for face-bound sketches/);
  });
});
