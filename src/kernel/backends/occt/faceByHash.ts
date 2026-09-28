// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceByHash.ts
//
// Leaf helper: look up a replicad `Face` on an OcctBackend by its OCCT hash.
// Kept import-free (type-only imports) so both the OCCT selection phases and
// the lineage resolver in `kernel/naming` can use it without a cycle.

import type { Face } from 'replicad';
import type { OcctBackend } from './occtBackend';

/**
 * Find the replicad `Face` wrapper whose OCCT hash equals `faceHash`.
 *
 * Uses `TopExp_Explorer_2` to enumerate faces in the same order as
 * `shape.faces`, then returns the replicad wrapper at the matching index.
 * WASM handles are `.delete()`-ed via try/finally.
 *
 * @throws {Error} If no face with the given hash is found (should not happen
 *   when the caller holds a resolver-guaranteed hash).
 */
export function faceByHash(base: OcctBackend, faceHash: string): Face {
  // Iterate replicad's own .faces array and match by OCCT HashCode.
  // Using replicad's .faces (which deduplicates by hash) ensures the returned
  // Face wrapper has the same iteration origin as any caller that enumerates
  // faces via shape.faces — avoiding index skew caused by hash collisions in
  // the raw TopExp_Explorer.
  const replicadFaces = base.getReplicadShape().faces;
  for (const face of replicadFaces) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = ((face as any).wrapped as any).HashCode(2147483647).toString(16);
    if (h === faceHash) {
      return face;
    }
  }
  throw new Error(`edgeSelection.faceByHash: face hash '${faceHash}' not found on shape`);
}
