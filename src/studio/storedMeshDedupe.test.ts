// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { dedupeCoincidentParts } from './storedMeshDedupe';

describe('dedupeCoincidentParts', () => {
  it('drops a second solved assembly that occupies the same pose', () => {
    const tri = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    };
    const part = (id: string, asm: string) => ({
      featureId: id,
      featureKind: 'solvedAssembly',
      predecessors: [asm],
      assemblyPartName: 'base-frame',
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      faces: [tri],
    });
    const kept = dedupeCoincidentParts([
      part('solvedAssembly_1__base-frame', 'solvedAssembly_1'),
      part('solvedAssembly_2__base-frame', 'solvedAssembly_2'),
    ] as Parameters<typeof dedupeCoincidentParts>[0]);
    expect(kept.map((f) => f.featureId)).toEqual(['solvedAssembly_2__base-frame']);
  });

  it('keeps parts without an assembly name and parts at different poses', () => {
    const face = { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], faceId: 1 };
    const kept = dedupeCoincidentParts([
      { featureId: 'a', featureKind: 'box', predecessors: [], faces: [face] },
      { featureId: 'b', featureKind: 'box', predecessors: [], faces: [face] },
      { featureId: 'c', featureKind: 'solvedAssembly', predecessors: [], assemblyPartName: 'p', transform: [1], faces: [face] },
      { featureId: 'd', featureKind: 'solvedAssembly', predecessors: [], assemblyPartName: 'p', transform: [2], faces: [face] },
    ] as Parameters<typeof dedupeCoincidentParts>[0]);
    expect(kept.map((f) => f.featureId)).toEqual(['a', 'b', 'c', 'd']);
  });
});
