// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/analysisMeshScope.ts
//
// One analysis tessellation per BREP inside a scope. Several review checks
// (plausibility, transmission) mesh every part with `getMesh()` at the same
// tolerance; inside `withSharedAnalysisMeshes` the second call returns the
// first mesh instead of extracting it again.

import type { RuntimeMesh } from '../runtimeMesh';

let depth = 0;
let meshes = new WeakMap<object, RuntimeMesh>();

/** The scoped mesh of `shape`, made once by `make`; outside a scope, `make()`. */
export function sharedAnalysisMesh(shape: object, make: () => RuntimeMesh): RuntimeMesh {
  if (depth === 0) return make();
  let mesh = meshes.get(shape);
  if (mesh === undefined) {
    mesh = make();
    meshes.set(shape, mesh);
  }
  return mesh;
}

/**
 * Run `fn` with shared analysis meshes. The meshes are dropped when the
 * outermost scope ends. Callers must treat a returned mesh as read-only.
 */
export async function withSharedAnalysisMeshes<T>(fn: () => Promise<T>): Promise<T> {
  depth++;
  try {
    return await fn();
  } finally {
    depth--;
    if (depth === 0) meshes = new WeakMap();
  }
}
