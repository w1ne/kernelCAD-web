// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Accessor, Document } from '@gltf-transform/core';

function triangleIndices(document: Document): Set<Accessor> {
  const indices = new Set<Accessor>();
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const accessor = primitive.getIndices();
      if (accessor && primitive.getMode() === 4) indices.add(accessor);
    }
  }
  return indices;
}

/** Verify real decoded output on every opt-in packing operation. The encoder
 * may rotate TRIANGLES triplets cyclically; reversing winding is forbidden. */
export function assertPackedGeometry(before: Document, after: Document): void {
  const originals = before.getRoot().listAccessors();
  const decoded = after.getRoot().listAccessors();
  if (originals.length !== decoded.length) throw new Error('meshopt changed accessor count');
  const triangles = triangleIndices(before);
  originals.forEach((accessor, index) => {
    const other = decoded[index];
    const a = accessor.getArray(), b = other.getArray();
    if (!a || !b || a.length !== b.length || accessor.getType() !== other.getType() ||
        accessor.getComponentType() !== other.getComponentType() || accessor.getNormalized() !== other.getNormalized()) {
      throw new Error('meshopt changed accessor layout');
    }
    if (!triangles.has(accessor)) {
      const left = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
      const right = Buffer.from(b.buffer, b.byteOffset, b.byteLength);
      if (!left.equals(right)) throw new Error('meshopt changed attribute bits');
      return;
    }
    if (a.length % 3) throw new Error('meshopt malformed triangle indices');
    for (let offset = 0; offset < a.length; offset += 3) {
      const same = [0, 1, 2].some(rotation =>
        [0, 1, 2].every(k => a[offset + k] === b[offset + (k + rotation) % 3]));
      if (!same) throw new Error('meshopt changed oriented triangle or winding');
    }
  });
}
