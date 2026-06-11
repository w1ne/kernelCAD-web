// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/planarUv.ts
//
// Bbox-planar UV generator. For each face we project the vertex positions onto
// the two world axes least aligned with the face's average normal, then
// remap into `[0, 1] x [0, 1]` using the bounding box of the projection.
//
// This is intentionally the simplest UV scheme that lets `MeshPhysicalMaterial`
// sample any texture without garbage; it is NOT a conformal unwrap. For axis-
// aligned planar faces (the dominant case in agent-authored builds) it gives
// a stable, deterministic mapping — re-running on the same face yields
// bit-identical UVs.
//
// Edge cases:
//   - Degenerate bbox along either chosen axis → UV component clamped to 0.
//   - Empty face (0 vertices) → empty Float32Array.

import type { FaceGeometry } from '../../shared/worker/workerTypes';

/** Generate planar UVs for a face geometry. Returns a `Float32Array` with
 *  `vertices.length / 3 * 2` entries (one (u,v) per vertex), deterministic
 *  across recomputes for the same input. */
export function generatePlanarUVs(face: FaceGeometry): Float32Array {
  const verts = face.vertices;
  const vCount = verts.length / 3;
  if (vCount === 0) return new Float32Array(0);

  // Determine the dominant axis from the face's normal. Prefer the face's
  // declared plane normal when available; fall back to averaging vertex
  // normals to dodge degenerate-plane edge cases on curved faces.
  let nx = 0, ny = 0, nz = 0;
  if (face.plane?.normal) {
    [nx, ny, nz] = face.plane.normal;
  } else if (face.normals.length >= 3) {
    for (let i = 0; i < face.normals.length; i += 3) {
      nx += face.normals[i];
      ny += face.normals[i + 1];
      nz += face.normals[i + 2];
    }
    // No need to normalize — only relative magnitudes matter for axis picking.
  } else {
    nx = 0; ny = 0; nz = 1; // arbitrary fallback (degenerate face → all-zero UVs anyway)
  }

  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  // Pick the two axes with the SMALLEST normal-projection magnitude — i.e.
  // the in-plane directions for the dominant face plane.
  // Drop the axis with the LARGEST absolute normal component.
  let uAxis: 0 | 1 | 2;
  let vAxis: 0 | 1 | 2;
  if (ax >= ay && ax >= az) {
    // Drop X; UV from Y, Z.
    uAxis = 1; vAxis = 2;
  } else if (ay >= ax && ay >= az) {
    // Drop Y; UV from X, Z.
    uAxis = 0; vAxis = 2;
  } else {
    // Drop Z; UV from X, Y.
    uAxis = 0; vAxis = 1;
  }

  // Compute the bbox along the two chosen axes.
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < vCount; i++) {
    const u = verts[i * 3 + uAxis];
    const v = verts[i * 3 + vAxis];
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const du = maxU - minU;
  const dv = maxV - minV;

  const uvs = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const u = verts[i * 3 + uAxis];
    const v = verts[i * 3 + vAxis];
    uvs[i * 2] = du > 0 ? (u - minU) / du : 0;
    uvs[i * 2 + 1] = dv > 0 ? (v - minV) / dv : 0;
  }
  return uvs;
}
