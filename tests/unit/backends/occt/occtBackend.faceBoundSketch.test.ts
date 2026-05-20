// tests/unit/backends/occt/occtBackend.faceBoundSketch.test.ts
//
// W3: OcctBackend.fromFaceBoundSketch wraps a face-bound replicad Sketch
// (returned from `drawing.sketchOnFace`) as a sketch-tagged backend so the
// projectCurve / embossText lowerers can compose with the existing
// `extrudeFromSketch` pipeline.
import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

describe('OcctBackend.fromFaceBoundSketch', () => {
  beforeAll(async () => { await initOcct(); });

  it('wraps a face-bound sketch so .extrude(d) produces a non-empty solid along the face normal', () => {
    const box = OcctBackend.box(20, 20, 5);
    const topFaceCandidates = box.getReplicadShape().faces.filter((f) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = (f as any).normalAt();
      return n.z > 0.9;
    });
    expect(topFaceCandidates.length).toBeGreaterThan(0);
    const topFace = topFaceCandidates[0];
    // Build a small square drawing centred over the face centre, then wrap.
    const drawing = replicad.drawRectangle(2, 2).translate(10, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sketch = (drawing as any).sketchOnFace(topFace, 'original');
    const wrapped = OcctBackend.fromFaceBoundSketch(sketch);
    expect(wrapped.kind).toBe('sketch');
    const extruded = OcctBackend.extrudeFromSketch(wrapped, 0.5);
    expect(extruded.volume()).toBeGreaterThan(0);
  });
});
