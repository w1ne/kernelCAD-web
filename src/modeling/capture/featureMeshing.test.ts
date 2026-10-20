// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshing.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../runtime/runScript';
import { meshFeaturesPerFeature } from './featureMeshing';

beforeAll(async () => {
  await initOcct();
});

describe('meshFeaturesPerFeature', () => {
  it('returns one entry per feature in dependency order', async () => {
    const code = `
      const plate = box(50, 50, 8);
      const hole = cylinder(8, 6).translate(25, 25, -1);
      return plate.subtract(hole);
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, bounds } = await meshFeaturesPerFeature(records);

    expect(features).toHaveLength(records.length);
    expect(features.map(f => f.featureId)).toEqual(records.map(r => r.id));
    // The boolean feature has 2 predecessors
    const boolean = features.find(f => f.featureKind === 'boolean')!;
    expect(boolean.predecessors).toHaveLength(2);
    expect(boolean.op).toBe('subtract');

    // Bounds enclose the plate (50×50×8)
    expect(bounds.max[0] - bounds.min[0]).toBeGreaterThanOrEqual(50);
    expect(bounds.max[1] - bounds.min[1]).toBeGreaterThanOrEqual(50);
  });

  it('each feature carries its own faces (cylinder = 3, box = 6)', async () => {
    const code = `
      const a = box(10, 10, 10);
      const b = cylinder(5, 3);
      return a;
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);

    const boxMesh = features.find(f => f.featureKind === 'box')!;
    const cylMesh = features.find(f => f.featureKind === 'cylinder')!;
    expect(boxMesh.faces).toHaveLength(6);
    expect(cylMesh.faces).toHaveLength(3);
  });

  it('aggregates AABB across all features', async () => {
    const code = `return box(20, 30, 40);`;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { bounds } = await meshFeaturesPerFeature(records);
    expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(20, 0);
    expect(bounds.max[1] - bounds.min[1]).toBeCloseTo(30, 0);
    expect(bounds.max[2] - bounds.min[2]).toBeCloseTo(40, 0);
  });

  it('captures failed feature IDs in failedFeatureIds', async () => {
    // Record A = valid box (no inputs, succeeds). Record B = sketch with no
    // commands, which the lowerer rejects with an error diagnostic and emits
    // feature.failed. Both nodes must appear in the records array so
    // DependencyGraph can register them before addEdge is called.
    const recA: import('../../shared/intent/featureRecord').FeatureRecord = {
      id: 'feat-a',
      kind: 'box',
      inputs: {},
      params: {
        x: { expression: '10', evaluated: 10 },
        y: { expression: '10', evaluated: 10 },
        z: { expression: '10', evaluated: 10 },
      },
      transforms: [],
      suppressed: false,
    };
    const recB: import('../../shared/intent/featureRecord').FeatureRecord = {
      id: 'feat-b',
      kind: 'sketch',
      // references recA so the edge is registered; but the lowerer will fail
      // because metadata.commands is empty — emitting feature.failed for feat-b
      inputs: { base: { kind: 'feature', id: 'feat-a' } },
      params: {},
      transforms: [],
      suppressed: false,
      metadata: { commands: [] },   // empty → lowerer error diagnostic
    };
    const { features, failedFeatureIds } = await meshFeaturesPerFeature([recA, recB]);
    expect(failedFeatureIds).toContain('feat-b');
    // feat-a compiled successfully — should appear in features
    expect(features.some(f => f.featureId === 'feat-a')).toBe(true);
  });

  it('propagates record.metadata.color onto FeatureMesh.color', async () => {
    const code = `
      const housing = box(20, 20, 10).color('servo');
      const plain = box(5, 5, 5).translate(30, 0, 0);
      return [housing, plain];
    `;
    const { records } = await runScript({ code, fileName: 'color.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);
    const housingMesh = features.find((f) => (records.find((r) => r.id === f.featureId)?.metadata as { color?: string } | undefined)?.color === 'servo');
    expect(housingMesh).toBeDefined();
    expect(housingMesh!.color).toBe('servo');
    // The plain box has no color metadata → mesh color is undefined.
    const plainMesh = features.find((f) => f.featureId !== housingMesh!.featureId && f.featureKind === 'box');
    expect(plainMesh).toBeDefined();
    expect(plainMesh!.color).toBeUndefined();
  });

  it('enriches mesh identity from feature metadata without inventing source names', async () => {
    const named: import('../../shared/intent/featureRecord').FeatureRecord = {
      id: 'box-named',
      kind: 'box',
      inputs: {},
      params: {
        x: { expression: '10', evaluated: 10 },
        y: { expression: '10', evaluated: 10 },
        z: { expression: '10', evaluated: 10 },
      },
      transforms: [],
      suppressed: false,
      metadata: { name: 'mount-block' },
    };
    const unnamed: import('../../shared/intent/featureRecord').FeatureRecord = {
      ...named,
      id: 'box-1',
      kind: 'box',
      metadata: undefined,
      params: {
        x: { expression: '10', evaluated: 10 },
        y: { expression: '10', evaluated: 10 },
        z: { expression: '10', evaluated: 10 },
      },
    };

    const namedResult = await meshFeaturesPerFeature([named]);
    const namedMesh = namedResult.features.find((f) => f.featureId === 'box-named');
    expect(namedMesh?.sourceMetadataName).toBe('mount-block');
    expect(namedMesh?.displayName).toBe('mount-block');
    expect(namedMesh?.filterNames).toEqual(['box-named', 'box', 'mount-block']);

    const unnamedResult = await meshFeaturesPerFeature([unnamed]);
    const unnamedMesh = unnamedResult.features.find((f) => f.featureId === 'box-1');
    expect(unnamedMesh?.sourceMetadataName).toBeUndefined();
    expect(unnamedMesh?.displayName).toBe('box-1');
    expect(unnamedMesh?.filterNames).toEqual(['box-1', 'box']);
  });

  it('enriches assembly fan-out identity with part and source feature names', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const link = arm.part('link', box(10, 10, 30));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
      link.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'link.yaw', 'revolute');
      return arm.solvedModel({ yaw: 0 });
    `;
    const { records } = await runScript({ code, fileName: 'identity-assembly.kcad.ts' });
    const assembly = records[records.length - 1];
    assembly.metadata = { ...assembly.metadata, name: 'drive-train' };
    const { features } = await meshFeaturesPerFeature(records);
    const linkMesh = features.find((f) => f.featureId === `${assembly.id}__link`);

    expect(linkMesh?.displayName).toBe('link');
    expect(linkMesh?.sourceMetadataName).toBe('drive-train');
    expect(linkMesh?.filterNames).toEqual([
      `${assembly.id}__link`,
      'solvedAssembly',
      assembly.id,
      'link',
      'drive-train',
    ]);
  });

  describe('material shadowing diagnostic', () => {
    it('warns when a material-bearing leaf is unioned into a material-bearing head', async () => {
      const code = `
        const body = box(20, 20, 10).material({ baseColor: '#101010', metalness: 0, roughness: 0.3 });
        const lensInsert = box(10, 10, 2)
          .translate(5, 5, 8)
          .material({ baseColor: '#3050a0', metalness: 0, roughness: 0.1 });
        return body.union(lensInsert).material({ baseColor: '#808080' });
      `;
      const { records } = await runScript({ code, fileName: 'shadow.kcad.ts' });
      const { materialShadowingWarnings } = await meshFeaturesPerFeature(records);
      // Expect lensInsert (and possibly body) to be flagged as shadowed by the
      // final post-fuse boolean record's material.
      const shadowedKinds = materialShadowingWarnings.map((w) => w.leafFeatureKind);
      expect(shadowedKinds).toContain('box');
      const lensInsertWarning = materialShadowingWarnings.find(
        (w) => w.leafFeatureKind === 'box' && w.shadowingFeatureKind === 'boolean',
      );
      expect(lensInsertWarning).toBeDefined();
      expect(lensInsertWarning!.message).toMatch(/build animation/);
    });

    it('does not warn when a subtract cutter has its own material', async () => {
      // Cutter is consumed by the subtract; it doesn't enter the post-fuse mesh.
      const code = `
        const plate = box(20, 20, 5);
        const hole = cylinder(8, 3).translate(10, 10, -1).material({ baseColor: '#ff0000' });
        return plate.subtract(hole);
      `;
      const { records } = await runScript({ code, fileName: 'cutter.kcad.ts' });
      const { materialShadowingWarnings } = await meshFeaturesPerFeature(records);
      expect(materialShadowingWarnings).toEqual([]);
    });

    it('does not warn when the boolean head has no own material', async () => {
      // Leaf has material; head boolean does not. The leaf's material is the
      // ONLY explicit material in the chain, so even though the post-fuse mesh
      // shows the head record's faces, there's no competing parent material to
      // shadow it with. We elect to keep the diagnostic quiet here so the
      // common single-material-on-leaf pattern doesn't spam warnings.
      const code = `
        const body = box(20, 20, 10);
        const insert = box(10, 10, 2).translate(5, 5, 8).material({ baseColor: '#3050a0' });
        return body.union(insert);
      `;
      const { records } = await runScript({ code, fileName: 'no-head-mat.kcad.ts' });
      const { materialShadowingWarnings } = await meshFeaturesPerFeature(records);
      expect(materialShadowingWarnings).toEqual([]);
    });
  });

  it('does not fail valid renderless sketch profiles used by cutouts', async () => {
    const code = `
      const profile = path()
        .moveTo(-8, -6)
        .lineTo(8, -6)
        .threePointsArc(-8, -6, 0, 6)
        .close();
      return box(40, 30, 5).cutout(profile, { face: 'top', depth: 'through' });
    `;
    const { records } = await runScript({ code, fileName: 'cutout-profile.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);

    expect(failedFeatureIds).toEqual([]);
    expect(features.map((f) => f.featureKind)).toContain('box');
    expect(features.map((f) => f.featureKind)).toContain('cutout');
    expect(features.map((f) => f.featureKind)).not.toContain('sketch');
  });
});
