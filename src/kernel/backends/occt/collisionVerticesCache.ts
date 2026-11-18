// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Collision vertex clouds, keyed by replicad-shape identity and the mesh
 *  tolerances. Weak so a disposed solid does not pin its tessellation. */
const collisionVertexMemo = new WeakMap<object, Map<string, Float32Array>>();

export function cachedCollisionVertices(
  shape: { mesh: (opts: { tolerance: number; angularTolerance: number }) => { vertices: ArrayLike<number> } },
  tolerance: number,
  angularTolerance: number,
): Float32Array {
  const key = `${tolerance}|${angularTolerance}`;
  let byTolerance = collisionVertexMemo.get(shape);
  if (byTolerance === undefined) {
    byTolerance = new Map();
    collisionVertexMemo.set(shape, byTolerance);
  }
  const cached = byTolerance.get(key);
  if (cached !== undefined) return cached;
  const meshed = shape.mesh({ tolerance, angularTolerance });
  const vertices = new Float32Array(meshed.vertices);
  byTolerance.set(key, vertices);
  return vertices;
}
