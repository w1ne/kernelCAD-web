// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';
import { TriangleBvh, type DfmMesh } from './dfm/meshBvh';
import type { GeometrySymmetryReport, SymmetryPlane, SymmetryPlaneResult } from './geometryQualityTypes';

export const MAX_SYMMETRY_TRIANGLES = 100_000;

/** Reflection is an involution: sampling all original triangles and querying
 * their reflected points covers both directions with the same distance metric.
 * Samples are vertices, edge midpoints and centroid; no triangles are omitted. */
export function checkMeshSymmetry(
  mesh: DfmMesh,
  candidates: (SymmetryPlane & { name: string })[],
  toleranceMm: number,
  meshDeflectionMm: number,
): GeometrySymmetryReport {
  if (!Number.isFinite(toleranceMm) || toleranceMm <= 0 || !Number.isFinite(meshDeflectionMm) || meshDeflectionMm <= 0) throw new Error('Symmetry tolerances must be finite and positive.');
  if (candidates.length === 0 || candidates.some(p => p.origin.length !== 3 || p.normal.length !== 3
    || !p.origin.every(Number.isFinite) || !p.normal.every(Number.isFinite) || Math.abs(Math.hypot(...p.normal)-1) > 1e-6)) {
    throw new Error('Symmetry requires finite planes with unit normals and nonempty coverage.');
  }
  if (mesh.triangles.length % 3 !== 0 || mesh.vertices.length % 3 !== 0
    || !mesh.vertices.every(Number.isFinite)
    || !mesh.triangles.every(i => Number.isInteger(i) && i >= 0 && i * 3 < mesh.vertices.length)) {
    throw new Error('Symmetry requires a finite indexed triangle mesh.');
  }
  const triangleCount = mesh.triangles.length / 3;
  if (triangleCount > MAX_SYMMETRY_TRIANGLES) throw new Error(`Symmetry mesh exceeds ${MAX_SYMMETRY_TRIANGLES} triangles; reduce mesh complexity.`);
  const bvh = new TriangleBvh(mesh);
  if (bvh.triangleCount === 0 || bvh.triangleCount !== triangleCount) throw new Error('Symmetry mesh is empty or contains degenerate triangles; no symmetry verdict.');
  const planes = candidates.map(plane => checkPlane(mesh, bvh, plane, toleranceMm));
  return { method: 'sampled-mesh-reflection', toleranceMm, meshDeflectionMm, triangleCount, planes, matchingPlanes: planes.filter(p => p.passed).map(p => p.name) };
}

function checkPlane(mesh: DfmMesh, bvh: TriangleBvh, plane: SymmetryPlane & { name: string }, toleranceMm: number): SymmetryPlaneResult {
  let maxDeviationMm = -1, sumSquared = 0, sampleCount = 0;
  let worst: SymmetryPlaneResult['worst'] | undefined;
  const { origin, normal } = plane;
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const vertices = [0,1,2].map(k => {
      const offset = mesh.triangles[t*3+k]*3;
      return mesh.vertices.slice(offset, offset+3) as Vec3;
    });
    const [a,b,c] = vertices;
    const samples = [...vertices,
      ...[[a,b],[b,c],[c,a]].map(([u,v]) => u.map((n,i) => (n+v[i])/2) as Vec3),
      a.map((n,i) => (n+b[i]+c[i])/3) as Vec3];
    for (const source of samples) {
      const offset = 2 * ((source[0]-origin[0])*normal[0] + (source[1]-origin[1])*normal[1] + (source[2]-origin[2])*normal[2]);
      const reflected = source.map((n,i) => n-offset*normal[i]) as Vec3;
      const closest = bvh.closestPoint(reflected)!;
      if (!Number.isFinite(closest.distance)) throw new Error('Nonfinite symmetry distance.');
      sumSquared += closest.distance * closest.distance;
      sampleCount++;
      if (closest.distance > maxDeviationMm) {
        maxDeviationMm = closest.distance;
        worst = { source, reflected, closest: closest.point, sourceTriangle: t, closestTriangle: closest.triIndex };
      }
    }
  }
  return { ...plane, passed: maxDeviationMm <= toleranceMm, maxDeviationMm, rmsDeviationMm: Math.sqrt(sumSquared / sampleCount), sampleCount, worst: worst! };
}
