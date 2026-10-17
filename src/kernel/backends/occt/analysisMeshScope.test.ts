// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { withSharedAnalysisMeshes } from './analysisMeshScope';

describe('withSharedAnalysisMeshes', () => {
  it('returns one analysis mesh per shape inside the scope, with the same triangles', async () => {
    await initOcct();
    const shape = new OcctBackend(replicad.makeCylinder(10, 20));
    const outside = shape.getMesh();
    await withSharedAnalysisMeshes(async () => {
      const a = shape.getMesh();
      const b = shape.getMesh();
      expect(b).toBe(a);
      // Same tolerance, same tessellation as an unscoped call.
      expect(Array.from(a.indices)).toEqual(Array.from(outside.indices));
      expect(Array.from(a.positions)).toEqual(Array.from(outside.positions));
    });
  }, 60_000);

  it('NEGATIVE CONTROL: outside a scope, and after it ends, every call meshes again', async () => {
    await initOcct();
    const shape = new OcctBackend(replicad.makeBox([0, 0, 0], [5, 5, 5]));
    expect(shape.getMesh()).not.toBe(shape.getMesh());
    let inside: unknown;
    await withSharedAnalysisMeshes(async () => { inside = shape.getMesh(); });
    expect(shape.getMesh()).not.toBe(inside);
  }, 60_000);
});
