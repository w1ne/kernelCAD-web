// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { MeshBackend } from '../../kernel/backends/meshBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import { detectInterferences } from './detectInterferences';

function displayBox(): MeshBackend {
  const mesh = OcctBackend.box(10, 10, 10).getMesh();
  return new MeshBackend(mesh.positions, mesh.indices);
}

describe('detectInterferences with display meshes', () => {
  beforeAll(async () => { await initOcct(); });

  it('checks overlapping BReps and measures mesh pairs instead of leaving them unchecked', () => {
    const brep = OcctBackend.box(10, 10, 10, true);
    const mesh = new MeshBackend(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), new Uint32Array([0, 1, 2]));
    const scene = { parts: [
      { name: 'brep-a', shape: brep, worldTransform: Transform.identity() },
      { name: 'brep-b', shape: brep.clone(), worldTransform: Transform.translation(1, 0, 0) },
      { name: 'mesh', shape: mesh, worldTransform: Transform.identity() },
    ] } as unknown as SceneBackend;

    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toEqual([expect.objectContaining({ a: 'brep-a', b: 'brep-b' })]);
    expect(result.uncheckedPairs).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('reports a display-mesh body that intersects a BRep', () => {
    const brep = OcctBackend.box(10, 10, 10);
    const scene = { parts: [
      { name: 'bracket', shape: brep, worldTransform: Transform.identity() },
      { name: 'pcb', shape: displayBox(), worldTransform: Transform.translation(5, 0, 0) },
    ] } as unknown as SceneBackend;

    const result = detectInterferences(scene, 0.01, new Set());
    const hit = result.pairs.find((p) => p.a === 'bracket' && p.b === 'pcb');
    expect(hit).toBeDefined();
    expect(hit!.volumeMm3).toBeGreaterThan(400);
    expect(result.uncheckedPairs).toHaveLength(0);
    expect(result.partial).toBe(false);
  });
});
