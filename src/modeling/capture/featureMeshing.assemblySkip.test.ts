// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshing.assemblySkip.test.ts
//
// Server-side guard for the "successful-but-empty assembly render" bug: when
// every part of an assembly SceneBackend fails to mesh, the build must surface
// the assembly id in `failedFeatureIds` (so the mesh endpoint returns a 500 the
// Studio client can report) instead of returning zero meshes as a success. A
// partial assembly — at least one part meshes — must still render and must NOT
// be failed.
//
// These tests live in a dedicated file because they `vi.mock` the OCCT meshing
// module to force per-part mesh failures deterministically; the rest of the
// featureMeshing suite exercises real meshing and must stay un-mocked.
import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import type { GeometryResult } from '../../shared/worker/workerTypes';

// Controls how the mocked `meshShape` behaves for each successive call within a
// single `meshFeaturesPerFeature` run. Reset per test.
let meshShapeBehavior: (callIndex: number) => GeometryResult | null = () => null;
let meshShapeCallCount = 0;

vi.mock('../../kernel/backends/occt/meshing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../kernel/backends/occt/meshing')>();
  return {
    ...actual,
    meshShape: (_shape: unknown): GeometryResult | null => {
      const result = meshShapeBehavior(meshShapeCallCount);
      meshShapeCallCount += 1;
      return result;
    },
  };
});

import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../runtime/runScript';
import { meshFeaturesPerFeature } from './featureMeshing';

/** A minimal but structurally valid single-triangle mesh so the assembly
 *  fan-out helpers (planar-UV attach, FK transform, bounds aggregation) run
 *  without crashing on a successfully-"meshed" part. */
function fakeTriangleMesh(): GeometryResult {
  return {
    faces: [
      {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        faceId: 0,
      },
    ],
    volume: 1,
  };
}

/** A two-part assembly (base + link) authored exactly like the existing
 *  fan-out identity fixture in featureMeshing.test.ts. */
async function twoPartAssemblyRecords() {
  const code = `
    const arm = assembly('skip-test');
    const base = arm.part('base', box(10, 10, 10));
    const link = arm.part('link', box(10, 10, 30));
    base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
    link.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.yaw', 'link.yaw', 'revolute');
    return arm.solvedModel({ yaw: 0 });
  `;
  const { records } = await runScript({ code, fileName: 'assembly-skip.kcad.ts' });
  const assembly = records[records.length - 1];
  return { records, assemblyId: assembly.id };
}

beforeAll(async () => {
  await initOcct();
});

beforeEach(() => {
  meshShapeCallCount = 0;
  meshShapeBehavior = () => null;
});

describe('meshFeaturesPerFeature — assembly all-parts-skip handling', () => {
  it('fails the assembly when EVERY part fails to mesh', async () => {
    // Every meshShape call returns null → both parts skip → assembly empty.
    meshShapeBehavior = () => null;

    const { records, assemblyId } = await twoPartAssemblyRecords();
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);

    expect(failedFeatureIds).toContain(assemblyId);
    // No part meshes were emitted for the failed assembly.
    expect(features.some((f) => f.assemblyFeatureId === assemblyId)).toBe(false);
  });

  it('does NOT fail a partial assembly — one part meshes, one skips — and still emits meshes', async () => {
    // First part meshes, second part fails. The assembly must still render.
    meshShapeBehavior = (callIndex) => (callIndex === 0 ? fakeTriangleMesh() : null);

    const { records, assemblyId } = await twoPartAssemblyRecords();
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);

    expect(failedFeatureIds).not.toContain(assemblyId);
    // Exactly one part mesh survived the partial failure.
    const partMeshes = features.filter((f) => f.assemblyFeatureId === assemblyId);
    expect(partMeshes).toHaveLength(1);
  });
});
