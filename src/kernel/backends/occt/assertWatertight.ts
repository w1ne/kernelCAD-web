// src/kernel/backends/occt/assertWatertight.ts
//
// Half-edge count check on a triangle mesh: every undirected edge must be
// shared by exactly two triangles. open3d's `is_watertight()` requires the
// same property; the existing `meshShapeForExport` weld pass in
// `occtBackend.ts` puts the mesh into the canonical form this check expects
// (coincident vertices remapped to a single index across face boundaries).
//
// Shared by the 3MF writer (validity gate) and a future Manifold-as-mesh
// sibling refactor.

import type { MeshData } from './exportStlBinary';

/** Cheap predicate — returns true when every undirected edge is shared by
 *  exactly two triangles. */
export function isWatertight(mesh: MeshData): boolean {
  return countNonManifoldEdges(mesh) === 0;
}

/** Throws if the mesh fails the half-edge gate. The thrown `Error.message`
 *  contains the substring `not watertight` so callers can chain it through
 *  to a structured diagnostic. */
export function assertWatertight(mesh: MeshData): void {
  const nonManifold = countNonManifoldEdges(mesh);
  if (nonManifold > 0) {
    throw new Error(
      `Mesh is not watertight: ${nonManifold} non-manifold edge(s).`,
    );
  }
}

function countNonManifoldEdges(mesh: MeshData): number {
  const edgeCount = new Map<string, number>();
  const triCount = Math.floor(mesh.triangles.length / 3);
  for (let i = 0; i < triCount; i++) {
    const a = mesh.triangles[i * 3];
    const b = mesh.triangles[i * 3 + 1];
    const c = mesh.triangles[i * 3 + 2];
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as [number, number][]) {
      const key = u < v ? `${u}|${v}` : `${v}|${u}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const count of edgeCount.values()) if (count !== 2) bad++;
  return bad;
}
