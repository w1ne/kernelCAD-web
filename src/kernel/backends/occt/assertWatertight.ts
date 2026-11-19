// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
import { countEdgeUses } from './meshHeal';

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
  const uses = countEdgeUses(mesh.triangles);
  let bad = 0;
  for (let i = 0; i < uses.count.length; i++) if (uses.count[i] !== 0 && uses.count[i] !== 2) bad++;
  return bad;
}
