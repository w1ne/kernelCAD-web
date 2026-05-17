import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { scoreMesh } from '../../../eval/oracle/scoreMesh';

// Build a minimal binary STL: a single triangle. Header (80) + uint32 count + 50 bytes/tri.
function makeTriSTL(verts: [number, number, number][]): Buffer {
  const buf = Buffer.alloc(84 + 50);
  buf.writeUInt32LE(1, 80);
  // normal = 0,0,0 (we don't check)
  let off = 96;
  for (const [x, y, z] of verts) {
    buf.writeFloatLE(x, off);
    buf.writeFloatLE(y, off + 4);
    buf.writeFloatLE(z, off + 8);
    off += 12;
  }
  // 2-byte attribute = 0 (already zeroed)
  return buf;
}

describe('scoreMesh', () => {
  const refPath = '/tmp/scoreMesh-ref.stl';
  const sameRefPath = '/tmp/scoreMesh-same.stl';
  const offsetPath = '/tmp/scoreMesh-offset.stl';

  beforeAll(() => {
    // Use a non-coplanar triangle so the bbox has non-zero volume (else
    // union vol = 0 and bbox IoU collapses to 0/0 = 0 by definition).
    const tri: [number, number, number][] = [
      [0, 0, 0],
      [10, 0, 0],
      [5, 10, 8],
    ];
    writeFileSync(refPath, makeTriSTL(tri));
    writeFileSync(sameRefPath, makeTriSTL(tri));
    // Same shape translated +5 in X — chamfer should be ~5
    writeFileSync(
      offsetPath,
      makeTriSTL(tri.map(([x, y, z]) => [x + 5, y, z]) as [number, number, number][]),
    );
  });

  it('self-score is zero', () => {
    const s = scoreMesh(refPath, sameRefPath);
    expect(s.chamferDistance).toBe(0);
    expect(s.hausdorff99p).toBe(0);
    expect(s.bboxIoU).toBe(1);
  });

  it('translated copy has chamfer ≈ translation distance', () => {
    const s = scoreMesh(offsetPath, refPath);
    // Triangle vertices (0,0,0)(10,0,0)(5,10,0) translated +5 →
    // each translated vertex's nearest ref vertex is ≤5mm away.
    expect(s.chamferDistance).toBeGreaterThan(3);
    expect(s.chamferDistance).toBeLessThan(7);
    expect(s.bboxIoU).toBeGreaterThan(0);
    expect(s.bboxIoU).toBeLessThan(0.5);
  });

  it('returns bboxIoU=0 for non-overlapping bboxes', () => {
    const farPath = '/tmp/scoreMesh-far.stl';
    const tri: [number, number, number][] = [
      [100, 100, 100],
      [110, 100, 100],
      [105, 110, 100],
    ];
    writeFileSync(farPath, makeTriSTL(tri));
    const s = scoreMesh(farPath, refPath);
    expect(s.bboxIoU).toBe(0);
  });

  it('reports triangle counts + bbox volumes', () => {
    const s = scoreMesh(refPath, sameRefPath);
    expect(s.referenceTriangles).toBe(1);
    expect(s.generatedTriangles).toBe(1);
    // 10×10×8 = 800
    expect(s.referenceBboxVolume).toBe(800);
  });
});
