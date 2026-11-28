// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `OcctBackend.getMesh()` on a dense shape must not run the whole-shape
// mesher: its working model for a 5k-face imported STL solid grows the WASM
// heap by more than 100 MB, and that heap never shrinks. The face-by-face
// path must return the same buffers as the whole-shape path.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { analysisMesh, ANALYSIS_WHOLE_SHAPE_FACE_LIMIT } from '../../src/kernel/backends/occt/analysisMesh';
import { importStlBytes } from '../../src/kernel/backends/occt/importStl';

const OPTIONS = { tolerance: 0.05, angularTolerance: 0.3 };
const MB = 1024 * 1024;

beforeAll(async () => {
  await initOcct();
});

type Vec3 = [number, number, number];

/** Binary STL of an icosphere: 20 * 4^level outward-wound triangles. */
function icosphereStl(level: number, radius: number): Uint8Array {
  const t = (1 + Math.sqrt(5)) / 2;
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const corners = ([
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ] as Vec3[]).map(unit);
  let triangles: Vec3[][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ].map(([a, b, c]) => [corners[a], corners[b], corners[c]]);
  const mid = (a: Vec3, b: Vec3): Vec3 => unit([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  for (let i = 0; i < level; i++) {
    triangles = triangles.flatMap(([a, b, c]) => {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  const bytes = new Uint8Array(84 + 50 * triangles.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((triangle, n) => {
    triangle.forEach((p, k) => {
      for (let axis = 0; axis < 3; axis++) view.setFloat32(84 + 50 * n + 12 + 12 * k + 4 * axis, p[axis] * radius, true);
    });
  });
  return bytes;
}

const wasmHeapBytes = (): number => (getOC() as any).HEAPU8.buffer.byteLength;

function replicadShape(backend: OcctBackend): replicad.Shape3D {
  return backend.getReplicadShape() as replicad.Shape3D;
}

function curvedSolid(): replicad.Shape3D {
  const box = replicad.makeBaseBox(20, 30, 10) as replicad.Shape3D;
  const boss = replicad.makeCylinder(6, 25, [0, 0, 0], [0, 0, 1]) as replicad.Shape3D;
  return (box.fuse(boss) as replicad.Shape3D).fillet(1) as replicad.Shape3D;
}

describe('analysis mesh of a dense shape', () => {
  it('meshes face by face with the same buffers as the whole-shape mesher on curved faces', () => {
    const whole = analysisMesh(curvedSolid(), OPTIONS, Infinity);
    const byFace = analysisMesh(curvedSolid(), OPTIONS, 0);
    expect(whole.indices.length).toBeGreaterThan(300);
    expect(Array.from(byFace.indices)).toEqual(Array.from(whole.indices));
    expect(Array.from(byFace.positions)).toEqual(Array.from(whole.positions));
    expect(Array.from(byFace.normals)).toEqual(Array.from(whole.normals));
  });

  it('meshes an imported STL solid face by face with the same buffers as the whole-shape mesher', () => {
    const stl = icosphereStl(2, 40);
    const whole = analysisMesh(replicadShape(importStlBytes(stl).backend), OPTIONS, Infinity);
    const byFace = analysisMesh(replicadShape(importStlBytes(stl).backend), OPTIONS, 0);
    expect(whole.indices.length).toBe(320 * 3);
    expect(Array.from(byFace.indices)).toEqual(Array.from(whole.indices));
    expect(Array.from(byFace.positions)).toEqual(Array.from(whole.positions));
    expect(Array.from(byFace.normals)).toEqual(Array.from(whole.normals));
  });

  it('keeps the WASM heap growth of getMesh() on a 5120-face STL solid under 32 MB', () => {
    const dense = importStlBytes(icosphereStl(4, 40)).backend;
    expect(replicadShape(dense).faces.length).toBe(5120);
    expect(5120).toBeGreaterThan(ANALYSIS_WHOLE_SHAPE_FACE_LIMIT);

    // The whole-shape mesher grew the heap by ~300 MB here.
    const before = wasmHeapBytes();
    const mesh = dense.getMesh();
    expect(wasmHeapBytes() - before).toBeLessThan(32 * MB);
    expect(mesh.indices.length).toBe(5120 * 3);
    expect(mesh.positions.length).toBe(mesh.normals.length);
  });
});
