// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import type { Face } from 'replicad';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { faceTaggedMeshOf } from '../../../src/modeling/runtime/dfm/fdmCheck';

describe('faceTaggedMeshOf', () => {
  it('omits topology refs when a face has no stable lineage name', () => {
    const face = {
      wrapped: { HashCode: () => 17 },
      triangulation: () => ({
        vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        trianglesIndexes: [0, 1, 2],
      }),
    } as unknown as Face;
    const shape = {
      historyMap: undefined,
      getReplicadShape: () => ({ faces: [face] }),
    } as unknown as OcctBackend;

    const mesh = faceTaggedMeshOf(shape, 'base');

    expect(mesh.faceRefs).toEqual([undefined]);
    expect(mesh.faceOfTri).toEqual([0]);
  });
});