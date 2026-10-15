// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkMeshSymmetry, MAX_SYMMETRY_TRIANGLES } from '../../../src/modeling/runtime/geometrySymmetry';
import type { DfmMesh } from '../../../src/modeling/runtime/dfm/meshBvh';
const mesh: DfmMesh = { vertices: [-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], triangles: [0,1,2, 0,2,3] };
const plane = { name: 'asserted', origin: [0.1,0,0] as [number,number,number], normal: [1,0,0] as [number,number,number] };
describe('sampled mesh symmetry', () => {
  it('gates only on the declared tolerance, preserving the worst deviation/location', () => {
    const above = checkMeshSymmetry(mesh, [plane], 0.21, 0.01).planes[0];
    const below = checkMeshSymmetry(mesh, [plane], 0.19, 0.01).planes[0];
    expect(above.maxDeviationMm).toBeCloseTo(0.2, 12);
    expect(above.passed).toBe(true);
    expect(below.passed).toBe(false);
    expect(above.sampleCount).toBe(14);
    expect(Math.hypot(...above.worst.reflected.map((v,i) => v-above.worst.closest[i]))).toBeCloseTo(0.2, 12);
  });
  it.each([
    { vertices: [], triangles: [] },
    { vertices: [0,0,0, 1,0,0, 2,0,0], triangles: [0,1,2] },
    { vertices: [0,0,0], triangles: [0,1,2] },
    { vertices: [NaN,0,0], triangles: [] },
    { vertices: mesh.vertices, triangles: [0,1] },
  ])('rejects empty, degenerate or invalid meshes: %j', invalid => {
    expect(() => checkMeshSymmetry(invalid, [plane], 0.05, 0.01)).toThrow();
  });
  it('rejects over-budget meshes instead of silently undersampling', () => {
    const triangles = Array.from({ length: (MAX_SYMMETRY_TRIANGLES+1)*3 }, (_,i) => i%3);
    expect(() => checkMeshSymmetry({ ...mesh, triangles }, [plane], 0.05, 0.01)).toThrow(/exceeds/);
  });
  it('rejects invalid planes or empty candidate coverage', () => {
    for (const candidates of [[], [{ ...plane, normal: [0,0,0] as [number,number,number] }], [{ ...plane, origin: [NaN,0,0] as [number,number,number] }]]) {
      expect(() => checkMeshSymmetry(mesh, candidates, 0.05, 0.01)).toThrow(/plane/i);
    }
  });
});
