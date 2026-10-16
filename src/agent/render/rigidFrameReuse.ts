// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/rigidFrameReuse.ts
//
// Decides whether an animation frame can reuse the mesh buffers already loaded
// into the page and only re-pose them. Re-sending every triangle each frame
// dominates capture time for large display-mesh assemblies (a 1.3M-triangle
// humanoid spends ~1 min per frame in the bridge). When the per-feature mesh
// buffers are byte-identical to the previous frame, only each feature's world
// transform can have changed, so a transform-only update is exact.

/** The fields of a serialized display-mesh feature that decide reuse. */
export interface ReusableFeature {
  featureId: string;
  featureKind: string;
  faces: readonly unknown[];
  transform?: readonly number[];
  mesh?: { positions: ArrayLike<number>; normals: ArrayLike<number>; indices: ArrayLike<number> };
}

/** True when every feature is a display mesh with an assembly transform, and
 *  the feature list and each mesh's buffers match `previous` element-for-element.
 *  Anything else (BRep faces, a missing transform, a changed feature list, a
 *  changed buffer) returns false and the caller falls back to a full load. */
export function canReuseLoadedMeshes(
  previous: readonly ReusableFeature[] | undefined,
  next: readonly ReusableFeature[],
): boolean {
  if (previous === undefined || previous.length !== next.length || next.length === 0) return false;
  return next.every((feature, i) => sameFeature(previous[i]!, feature));
}

function sameFeature(a: ReusableFeature, b: ReusableFeature): boolean {
  if (a.featureId !== b.featureId || a.featureKind !== b.featureKind) return false;
  // Non-geometry features (e.g. an animationView record) carry no faces and no
  // mesh; they stay empty groups on both sides and need no update.
  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty || bEmpty) return aEmpty === bEmpty;
  if (!isMeshOnly(a) || !isMeshOnly(b)) return false;
  if (b.transform === undefined || b.transform.length !== 16) return false;
  return sameMesh(a.mesh, b.mesh);
}

function isEmpty(f: ReusableFeature): boolean {
  return f.faces.length === 0 && f.mesh === undefined;
}

function isMeshOnly(f: ReusableFeature): boolean {
  return f.faces.length === 0 && f.mesh !== undefined;
}

function sameMesh(a: ReusableFeature['mesh'], b: ReusableFeature['mesh']): boolean {
  if (a === undefined || b === undefined) return false;
  return sameBuffer(a.positions, b.positions)
    && sameBuffer(a.normals, b.normals)
    && sameBuffer(a.indices, b.indices);
}

function sameBuffer(x: ArrayLike<number>, y: ArrayLike<number>): boolean {
  if (x === y) return true;
  if (x.length !== y.length) return false;
  for (let k = 0; k < x.length; k += 1) if (x[k] !== y[k]) return false;
  return true;
}
