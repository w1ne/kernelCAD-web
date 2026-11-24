// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/runtime/meshPairCheck.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { MeshBackend } from '../../../src/kernel/backends/meshBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import {
  bboxesGapMm,
  extractPosedWorldMesh,
  measureMeshPairDistance,
  measureMeshPairOverlap,
  trianglePairIntersects,
} from '../../../src/modeling/runtime/meshPairCheck';

function meshBox(): MeshBackend {
  const mesh = OcctBackend.box(10, 10, 10).getMesh();
  return new MeshBackend(mesh.positions, mesh.indices);
}

function posedMesh(mesh: MeshBackend, t: Transform) {
  const posed = extractPosedWorldMesh(mesh, t);
  if (posed === undefined) throw new Error('mesh extraction failed');
  return posed;
}

describe('meshPairCheck', () => {
  beforeAll(async () => { await initOcct(); });

  it('measures the exact AABB gap of separated meshes', () => {
    const a = posedMesh(meshBox(), Transform.identity());
    const b = posedMesh(meshBox(), Transform.translation(20, 0, 0));
    expect(bboxesGapMm(a, b)).toBeCloseTo(10, 6);
    const measured = measureMeshPairDistance(a, b, 5);
    expect(measured.overlapping).toBe(false);
    expect(measured.distanceMm).toBeCloseTo(10, 6);
  });

  it('reports touching meshes as contact, not interference', () => {
    const a = posedMesh(meshBox(), Transform.identity());
    const b = posedMesh(meshBox(), Transform.translation(10, 0, 0));
    expect(measureMeshPairOverlap(a, b).intersecting).toBe(false);
    const measured = measureMeshPairDistance(a, b, 1, { forceExact: true });
    expect(measured.overlapping).toBe(false);
    expect(measured.distanceMm).toBeCloseTo(0, 6);
  });

  it('reports overlapping meshes with positive volume and thickness', () => {
    const a = posedMesh(meshBox(), Transform.identity());
    const b = posedMesh(meshBox(), Transform.translation(5, 0, 0));
    const overlap = measureMeshPairOverlap(a, b);
    expect(overlap.intersecting).toBe(true);
    expect(overlap.volumeMm3).toBeGreaterThan(400);
    expect(overlap.thicknessMm).toBeGreaterThan(0.15);
    const measured = measureMeshPairDistance(a, b, 1, { forceExact: true });
    expect(measured.overlapping).toBe(true);
    expect(measured.distanceMm).toBe(0);
  });

  it('keeps coincident faces as contact, not interference', () => {
    const brep = OcctBackend.box(10, 10, 10);
    const a = extractPosedWorldMesh(brep, Transform.identity())!;
    const b = posedMesh(meshBox(), Transform.translation(0, 0, 10));
    expect(measureMeshPairOverlap(a, b).intersecting).toBe(false);
  });

  it('measures a rotated display mesh against a BRep body', () => {
    const brep = OcctBackend.box(10, 10, 10, true);
    const a = extractPosedWorldMesh(brep, Transform.identity())!;
    const rotated = Transform.rotationAxisAngleDeg([0, 0, 1], 45).compose(Transform.translation(12, 0, 0));
    const b = posedMesh(meshBox(), rotated);
    const measured = measureMeshPairDistance(a, b, 1, { forceExact: true });
    expect(Number.isFinite(measured.distanceMm)).toBe(true);
    expect(measured.distanceMm).toBeGreaterThan(0);
    expect(measured.overlapping).toBe(false);
  });

  it('detects an open-seam mesh crossing a closed body', () => {
    // Two triangles form one large open sheet through the 0..10 box. Ray
    // parity cannot fill it, so the voxel integral reads ~0; the triangle
    // probe must still find the real crossing.
    const positions = new Float32Array([
      5, -5, -5, 5, 15, -5, 5, -5, 15,
      5, 15, -5, 5, 15, 15, 5, -5, 15,
    ]);
    const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const sheet = new MeshBackend(positions, indices);
    const brep = OcctBackend.box(10, 10, 10);
    const a = extractPosedWorldMesh(brep, Transform.identity())!;
    const b = posedMesh(sheet, Transform.identity());
    const overlap = measureMeshPairOverlap(a, b);
    expect(overlap.intersecting).toBe(true);
    expect(overlap.volumeMm3).toBeGreaterThan(0.01);
    expect(overlap.thicknessMm).toBeGreaterThan(0.15);
  });

  it('distinguishes crossing triangles from coplanar touching triangles', () => {
    const aPos = new Float64Array([0, 0, 0, 10, 0, 0, 0, 10, 0]);
    const aIdx = new Uint32Array([0, 1, 2]);
    const crossingPos = new Float64Array([3, 3, -5, 3, 3, 5, 8, 8, 0]);
    expect(trianglePairIntersects(aPos, aIdx, 0, crossingPos, aIdx, 0)).toBe(true);
    const touchingPos = new Float64Array([0, 0, 0, 5, 0, 0, 0, 5, 0]);
    expect(trianglePairIntersects(aPos, aIdx, 0, touchingPos, aIdx, 0)).toBe(false);
  });
});
