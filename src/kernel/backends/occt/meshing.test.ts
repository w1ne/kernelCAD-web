// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { meshShape } from './meshing';

beforeAll(async () => {
  await initOcct();
});

describe('meshShape', () => {
  it('meshes a 10×10×10 box into 6 face geometries with non-empty vertex arrays', () => {
    const box = replicad.makeBaseBox(10, 10, 10);
    const result = meshShape(box);
    expect(result).not.toBeNull();
    expect(result!.faces).toHaveLength(6);
    for (const f of result!.faces) {
      expect(f.vertices.length).toBeGreaterThan(0);
      expect(f.indices.length).toBeGreaterThan(0);
      expect(f.normals.length).toBe(f.vertices.length);
    }
    expect(result!.volume).toBeGreaterThan(990); // ~1000 minus mesh tolerance
  });

  it('meshes a cylinder into 3 face geometries (top, bottom, lateral)', () => {
    const cyl = replicad.makeCylinder(5, 10);
    const result = meshShape(cyl);
    expect(result).not.toBeNull();
    expect(result!.faces).toHaveLength(3);
    expect(result!.volume).toBeGreaterThan(700); // π·25·10 ≈ 785
  });

  it('extracts edges as a Float32Array', () => {
    const box = replicad.makeBaseBox(5, 5, 5);
    const result = meshShape(box);
    expect(result).not.toBeNull();
    expect(result!.edges).toBeInstanceOf(Float32Array);
    expect(result!.edges!.length).toBeGreaterThan(0);
  });
});
