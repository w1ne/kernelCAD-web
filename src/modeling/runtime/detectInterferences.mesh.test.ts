// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { MeshBackend } from '../../kernel/backends/meshBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import { detectInterferences } from './detectInterferences';

describe('detectInterferences with display meshes', () => {
  beforeAll(async () => { await initOcct(); });

  it('checks overlapping BReps while reporting mesh pairs as unchecked', () => {
    const brep = OcctBackend.box(10, 10, 10, true);
    const mesh = new MeshBackend(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), new Uint32Array([0, 1, 2]));
    const scene = { parts: [
      { name: 'brep-a', shape: brep, worldTransform: Transform.identity() },
      { name: 'brep-b', shape: brep.clone(), worldTransform: Transform.translation(1, 0, 0) },
      { name: 'mesh', shape: mesh, worldTransform: Transform.identity() },
    ] } as unknown as SceneBackend;

    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toEqual([expect.objectContaining({ a: 'brep-a', b: 'brep-b' })]);
    expect(result.uncheckedPairs).toHaveLength(2);
    expect(result.partial).toBe(true);
    expect(result.comparisonCount).toBe(1);
  });
});
