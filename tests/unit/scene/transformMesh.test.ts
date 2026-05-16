import { describe, it, expect } from 'vitest';
import { Transform } from '../../../src/runtime/se3';
import { transformFeatureMesh } from '../../../src/shared/capture/transformMesh';
import type { FeatureMesh } from '../../../src/shared/capture/featureMeshing';

const triangle: FeatureMesh = {
  featureId: 'm',
  featureKind: 'box',
  predecessors: [],
  faces: [{
    faceId: 0,
    vertices: new Float32Array([0,0,0,  1,0,0,  0,1,0]),
    normals:  new Float32Array([0,0,1,  0,0,1,  0,0,1]),
    indices:  new Uint32Array([0,1,2]),
  }],
};

describe('transformFeatureMesh', () => {
  it('translates vertices by Transform.translation', () => {
    const t = Transform.translation(10, 5, 0);
    const out = transformFeatureMesh(triangle, t);
    expect([...out.faces[0].vertices]).toEqual([10,5,0, 11,5,0, 10,6,0]);
    // Pure translation leaves normals unchanged.
    expect([...out.faces[0].normals]).toEqual([0,0,1, 0,0,1, 0,0,1]);
  });

  it('rotates normals via axisDir and renormalizes (unit length preserved)', () => {
    const t = Transform.rotationAxisAngleDeg([1,0,0], 90);
    const out = transformFeatureMesh(triangle, t);
    const n = out.faces[0].normals;
    // Each normal should still be unit length.
    for (let i = 0; i < n.length; i += 3) {
      const len = Math.hypot(n[i], n[i+1], n[i+2]);
      expect(len).toBeCloseTo(1, 6);
    }
  });

  it('returns a new mesh object (does not mutate input)', () => {
    const t = Transform.translation(1, 0, 0);
    const out = transformFeatureMesh(triangle, t);
    expect(out).not.toBe(triangle);
    expect(out.faces[0]).not.toBe(triangle.faces[0]);
    // Input unchanged.
    expect([...triangle.faces[0].vertices]).toEqual([0,0,0, 1,0,0, 0,1,0]);
  });

  it('preserves color and other passthrough fields', () => {
    const colored: FeatureMesh = { ...triangle, color: 'plate', volume: 42 };
    const out = transformFeatureMesh(colored, Transform.identity());
    expect(out.color).toBe('plate');
    expect(out.volume).toBe(42);
  });

  it('transforms edges Float32Array if present', () => {
    const withEdges: FeatureMesh = {
      ...triangle,
      edges: new Float32Array([0,0,0, 1,0,0, 1,0,0, 0,1,0]),
    };
    const out = transformFeatureMesh(withEdges, Transform.translation(10, 0, 0));
    expect([...(out.edges ?? [])]).toEqual([10,0,0, 11,0,0, 11,0,0, 10,1,0]);
  });

  it('transforms plane.origin and plane.normal when plane is present', () => {
    const withPlane: FeatureMesh = {
      ...triangle,
      faces: [{
        ...triangle.faces[0],
        plane: { origin: [0,0,0], normal: [0,0,1] },
      }],
    };
    const out = transformFeatureMesh(withPlane, Transform.translation(5, 0, 0));
    expect(out.faces[0].plane?.origin).toEqual([5,0,0]);
    expect(out.faces[0].plane?.normal).toEqual([0,0,1]);
  });

  it('transforms cylinder.origin (point) and cylinder.axis (axisDir + renormalize)', () => {
    const withCyl: FeatureMesh = {
      ...triangle,
      faces: [{
        ...triangle.faces[0],
        cylinder: { origin: [0, 0, 0], axis: [0, 0, 1], radius: 5 },
      }],
    };
    const out = transformFeatureMesh(withCyl, Transform.translation(10, 0, 0));
    expect(out.faces[0].cylinder?.origin).toEqual([10, 0, 0]);
    expect(out.faces[0].cylinder?.axis).toEqual([0, 0, 1]);  // pure translation, axis unchanged
    expect(out.faces[0].cylinder?.radius).toBe(5);
  });
});
