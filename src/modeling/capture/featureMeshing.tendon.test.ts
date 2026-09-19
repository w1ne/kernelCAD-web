// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshing.tendon.test.ts
//
// Characterisation tests for the tendon visual-mesh fan-out
// (`collectTendonMeshes` in featureMeshing.ts). The existing suites cover
// tendon authoring/validation and the SceneBackend part fan-out, but nothing
// pins the synthetic FeatureMesh records emitted for `arm.tendon(...)`
// declarations. These tests freeze the current outputs — record fields,
// filter names, geometry buffer sizes, the topology-origin console warning,
// and the silent skip conditions — before the function is split by phase.
import { describe, it, expect, beforeAll, vi } from 'vitest';

import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../runtime/runScript';
import { meshFeaturesPerFeature, type FeatureMesh } from './featureMeshing';

const LINE_TENDON_CODE = `
  const arm = assembly('tendon-mesh');
  const a = arm.part('a', box(10, 10, 10));
  const b = arm.part('b', box(20, 20, 20));
  a.connector('topA', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
  b.connector('topB', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.tendon('spring', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 });
  return arm.solvedModel({});
`;

const COIL_TENDON_CODE = `
  const arm = assembly('tendon-mesh');
  const a = arm.part('a', box(10, 10, 10));
  const b = arm.part('b', box(20, 20, 20));
  a.connector('topA', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
  b.connector('topB', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.tendon('spring', {
    from: 'a.topA',
    to: 'b.topB',
    restLengthMm: 30,
    stiffnessNmm: 0.5,
    visualStyle: 'coil',
    coilTurns: 3,
    coilDiameterMm: 8,
    visualDiameterMm: 2,
  });
  return arm.solvedModel({});
`;

const TOPOLOGY_TENDON_CODE = `
  const arm = assembly('tendon-mesh');
  const a = arm.part('a', box(10, 10, 10));
  const b = arm.part('b', box(20, 20, 20));
  a.connector('topA', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } }, axis: [0, 0, 1] });
  b.connector('topB', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.tendon('spring', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 });
  return arm.solvedModel({});
`;

const DEGENERATE_TENDON_CODE = `
  const arm = assembly('tendon-mesh');
  const a = arm.part('a', box(10, 10, 10));
  const b = arm.part('b', box(20, 20, 20));
  a.connector('topA', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  b.connector('topB', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.tendon('spring', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 });
  return arm.solvedModel({});
`;

async function meshTendonScene(code: string, clearAssemblies = false): Promise<{
  assemblyId: string;
  tendonMeshes: FeatureMesh[];
}> {
  const { records, paramTable, session } = await runScript({
    code,
    fileName: 'tendon-mesh.kcad.ts',
  });
  const assembly = records[records.length - 1];
  if (clearAssemblies) session.assemblies.clear();
  const { features } = await meshFeaturesPerFeature(records, paramTable, session);
  const tendonMeshes = features.filter(
    (f) => f.assemblyFeatureId === assembly.id && f.assemblyPartName?.startsWith('__tendon__'),
  );
  return { assemblyId: assembly.id, tendonMeshes };
}

beforeAll(async () => {
  await initOcct();
});

describe('meshFeaturesPerFeature - tendon visual meshes (collectTendonMeshes)', () => {
  it('emits one synthetic FeatureMesh for a default line tendon', async () => {
    const { assemblyId, tendonMeshes } = await meshTendonScene(LINE_TENDON_CODE);

    expect(tendonMeshes).toHaveLength(1);
    const mesh = tendonMeshes[0];
    const tendonId = `${assemblyId}__tendon__spring`;
    expect(mesh.featureId).toBe(tendonId);
    expect(mesh.featureKind).toBe('solvedAssembly');
    expect(mesh.predecessors).toEqual([assemblyId]);
    expect(mesh.assemblyFeatureId).toBe(assemblyId);
    expect(mesh.assemblyPartName).toBe('__tendon__spring');
    expect(mesh.displayName).toBe('tendon:spring');
    expect(mesh.filterNames).toEqual([tendonId, 'spring', 'tendon:spring', 'tendon']);
    expect(mesh.material).toEqual({ baseColor: '#2a2e36', metalness: 0.85, roughness: 0.4 });
    expect(mesh.faces).toHaveLength(1);
    const face = mesh.faces[0];
    expect(face.faceId).toBe(0);
    expect(face.vertices).toHaveLength(96);
    expect(face.indices).toHaveLength(96);
    expect(face.vertices[0]).toBeCloseTo(0);
    expect(face.vertices[1]).toBeCloseTo(-1.5);
    expect(face.vertices[2]).toBeCloseTo(10);
  });

  it('emits a helix-tube face for a coil tendon', async () => {
    const { tendonMeshes } = await meshTendonScene(COIL_TENDON_CODE);

    expect(tendonMeshes).toHaveLength(1);
    const face = tendonMeshes[0].faces[0];
    expect(face.faceId).toBe(0);
    expect(face.vertices).toHaveLength(1176);
    expect(face.indices).toHaveLength(2304);
  });

  it('skips a topology-origin endpoint and warns with the exact message', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { tendonMeshes } = await meshTendonScene(TOPOLOGY_TENDON_CODE);

      expect(tendonMeshes).toHaveLength(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        "meshFeaturesPerFeature: tendon 'spring' has a topology-origin connector; visual cylinder skipped (vec3 origins only in v1).",
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('skips a degenerate (zero-length) line tendon silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { tendonMeshes } = await meshTendonScene(DEGENERATE_TENDON_CODE);

      expect(tendonMeshes).toHaveLength(0);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('emits no tendon meshes when the assembly name is absent from session.assemblies', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { tendonMeshes } = await meshTendonScene(LINE_TENDON_CODE, true);

      expect(tendonMeshes).toHaveLength(0);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
