// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/backendMeshDeflection.test.ts
//
// meshShapeForExport honours a caller's deflection on BOTH mesher paths:
// the whole-shape pass (≤ 1600 faces) and the per-face fallback (> 1600
// faces, the dense-import escape hatch). The fallback once hard-coded its
// own tolerances and ignored the argument.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initReplicad } from '../../../../regressionTestHelpers';
import { meshShapeForExport } from '../../../../../src/kernel/backends/occt/backendMesh';

const COARSE = { linear: 2, relative: false, angularRad: 0.8 };

/** 268 boxes (1608 planar faces) + one sphere: over the 1600-face gate, so
 *  the per-face fallback meshes it. Only the sphere's triangle count depends
 *  on the deflection. */
function denseCompound(): replicad.Shape3D {
  const shapes: replicad.Shape3D[] = [];
  for (let i = 0; i < 268; i++) {
    shapes.push(replicad.makeBaseBox(1, 1, 1).translate([(i % 20) * 2, Math.floor(i / 20) * 2, 0]) as replicad.Shape3D);
  }
  shapes.push(replicad.makeSphere(10).translate([0, 0, 30]) as replicad.Shape3D);
  return replicad.makeCompound(shapes) as unknown as replicad.Shape3D;
}

function faceCount(shape: replicad.Shape3D): number {
  let n = 0;
  for (const _f of shape.faces) n++;
  return n;
}

describe('meshShapeForExport deflection', () => {
  beforeAll(async () => {
    await initReplicad();
  }, 60_000);

  it('the whole-shape path meshes coarser with a coarser deflection', () => {
    const fine = meshShapeForExport(replicad.makeSphere(10) as replicad.Shape3D);
    const coarse = meshShapeForExport(replicad.makeSphere(10) as replicad.Shape3D, COARSE);
    expect(coarse.triangles.length).toBeLessThan(fine.triangles.length);
  });

  it('the per-face fallback honours a coarser deflection (fewer triangles)', () => {
    expect(faceCount(denseCompound())).toBeGreaterThan(1600);
    const byDefault = meshShapeForExport(denseCompound());
    const coarse = meshShapeForExport(denseCompound(), COARSE);
    expect(byDefault.triangles.length).toBeGreaterThan(0);
    expect(coarse.triangles.length).toBeGreaterThan(0);
    expect(coarse.triangles.length).toBeLessThan(byDefault.triangles.length);
  }, 60_000);
});
