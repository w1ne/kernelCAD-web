import { describe, it, expect } from 'vitest';
import { verifyWatertight, stitchCracks } from '../../../../../src/kernel/backends/occt/meshHeal';

/** Closed tetrahedron — watertight. */
const tetra = () => ({
  vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  triangles: [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3],
});

describe('verifyWatertight', () => {
  it('passes a closed tetrahedron', () => {
    const r = verifyWatertight(tetra());
    expect(r.ok).toBe(true);
    expect(r.openEdgeCount).toBe(0);
    expect(r.clusters).toEqual([]);
  });

  it('reports open-edge count and one cluster for a tetra missing a face', () => {
    const m = tetra();
    m.triangles = m.triangles.slice(0, 9); // drop the last face
    const r = verifyWatertight(m);
    expect(r.ok).toBe(false);
    expect(r.openEdgeCount).toBe(3);
    expect(r.clusters).toHaveLength(1);
    expect(r.clusters[0].center).toHaveLength(3);
  });

  it('caps the cluster report at 5', () => {
    // 6 disjoint single-triangle islands -> 6 clusters of 3 open edges each
    const m = { vertices: [] as number[], triangles: [] as number[] };
    for (let i = 0; i < 6; i++) {
      const b = m.vertices.length / 3;
      m.vertices.push(i * 10, 0, 0, i * 10 + 1, 0, 0, i * 10, 1, 0);
      m.triangles.push(b, b + 1, b + 2);
    }
    const r = verifyWatertight(m);
    expect(r.openEdgeCount).toBe(18);
    expect(r.clusters).toHaveLength(5);
  });
});

describe('stitchCracks', () => {
  it('heals a T-junction crack between two coplanar quads', () => {
    // Left quad: (0,0)-(1,0)-(1,2)-(0,2) as 2 triangles, right edge x=1 spans y 0..2 in ONE edge.
    // Right strip: (1,0)-(2,0)-(2,2)-(1,2) with an EXTRA vertex at (1,1) -> right side of x=1
    // is split into two edges. Classic T-junction: vertex 7=(1,1) sits mid-edge of the left quad.
    // Close the outer boundary into a tube so the ONLY cracks are at x=1.
    const vertices = [
      0, 0, 0,  1, 0, 0,  1, 2, 0,  0, 2, 0,        // 0..3 left quad
      1, 0, 0,  2, 0, 0,  2, 2, 0,  1, 2, 0,  1, 1, 0, // 4..8 right quad + mid vertex 8
    ];
    const triangles = [
      0, 1, 2, 0, 2, 3,          // left quad: edge (1,2) spans x=1 unsplit
      4, 5, 8, 5, 6, 8, 6, 7, 8, // right quad fanned around mid vertex 8 at (1,1)
    ];
    const mesh = { vertices, triangles };
    // weld 1<->4 and 2<->7 the way meshShapeForExport's weld pass would:
    for (let i = 0; i < triangles.length; i++) {
      if (triangles[i] === 4) triangles[i] = 1;
      if (triangles[i] === 7) triangles[i] = 2;
    }
    // Now edge (1,2) has count 1 from the left and edges (1,8),(8,2) count 1 from the right.
    const before = verifyWatertight(mesh);
    expect(before.openEdgeCount).toBeGreaterThan(0);
    const splits = stitchCracks(mesh, 0.05);
    expect(splits).toBeGreaterThan(0);
    // After stitching, the x=1 seam is conformal: (1,8) and (8,2) are each shared by 2 triangles.
    const seamCounts = new Map<string, number>();
    for (let i = 0; i < mesh.triangles.length; i += 3) {
      const t = [mesh.triangles[i], mesh.triangles[i + 1], mesh.triangles[i + 2]];
      for (const [u, v] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const k = u < v ? `${u}|${v}` : `${v}|${u}`;
        seamCounts.set(k, (seamCounts.get(k) ?? 0) + 1);
      }
    }
    expect(seamCounts.get('1|8')).toBe(2);
    expect(seamCounts.get('2|8')).toBe(2);
  });

  it('is a no-op on a watertight mesh', () => {
    const m = tetra();
    expect(stitchCracks(m, 0.05)).toBe(0);
    expect(verifyWatertight(m).ok).toBe(true);
  });
});
