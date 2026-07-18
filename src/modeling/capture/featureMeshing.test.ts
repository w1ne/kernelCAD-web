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

  describe('color shadowing diagnostic', () => {
    // THE FALSE-POSITIVE GUARD. The reported complaint was "`.color()` on a
    // post-boolean root is a silent no-op". On THIS path that claim is false:
    // colorByFeatureId is built from every record's metadata, booleans
    // included, so the boolean root's color reaches the fused mesh. Warning
    // here would be noise on working code, which is worse than silence.
    it('does NOT warn for .color() on a boolean root when no leaf is colored', async () => {
      const code = `
        const body = box(20, 20, 10);
        const boss = box(10, 10, 2).translate(5, 5, 8);
        return body.union(boss).color('#808080');
      `;
      const { records } = await runScript({ code, fileName: 'root-color.kcad.ts' });
      const { features, colorShadowingWarnings } = await meshFeaturesPerFeature(records);

      expect(colorShadowingWarnings).toEqual([]);
      // And prove the color is genuinely honored — i.e. the silence is correct,
      // not merely a detector that never fires.
      const fused = features.find((f) => f.featureKind === 'boolean');
      expect(fused?.color).toBe('#808080');
    });

    it('does NOT warn when only the leaf is colored and the head is not', async () => {
      const code = `
        const body = box(20, 20, 10);
        const insert = box(10, 10, 2).translate(5, 5, 8).color('#3050a0');
        return body.union(insert);
      `;
      const { records } = await runScript({ code, fileName: 'leaf-color.kcad.ts' });
      const { colorShadowingWarnings } = await meshFeaturesPerFeature(records);
      expect(colorShadowingWarnings).toEqual([]);
    });

    it('does NOT warn when a subtract cutter is colored', async () => {
      const code = `
        const plate = box(20, 20, 5);
        const hole = cylinder(8, 3).translate(10, 10, -1).color('#ff0000');
        return plate.subtract(hole).color('#00ff00');
      `;
      const { records } = await runScript({ code, fileName: 'cutter-color.kcad.ts' });
      const { colorShadowingWarnings } = await meshFeaturesPerFeature(records);
      expect(colorShadowingWarnings).toEqual([]);
    });

    it('warns when a colored leaf is unioned into a colored head', async () => {
      const code = `
        const body = box(20, 20, 10).color('#101010');
        const lensInsert = box(10, 10, 2).translate(5, 5, 8).color('#3050a0');
        return body.union(lensInsert).color('#808080');
      `;
      const { records } = await runScript({ code, fileName: 'color-shadow.kcad.ts' });
      const { colorShadowingWarnings } = await meshFeaturesPerFeature(records);

      expect(colorShadowingWarnings.length).toBeGreaterThan(0);
      const w = colorShadowingWarnings.find(
        (x) => x.leafFeatureKind === 'box' && x.shadowingFeatureKind === 'boolean',
      );
      expect(w).toBeDefined();
      expect(w!.attribute).toBe('color');
      expect(w!.message).toMatch(/build animation/);
      expect(w!.message).toMatch(/color/);
    });

    it('keeps color and material shadowing independent', async () => {
      // Material only — the color detector must stay quiet, proving the two
      // channels are not cross-wired by the shared detector.
      const code = `
        const body = box(20, 20, 10).material({ baseColor: '#101010' });
        const insert = box(10, 10, 2).translate(5, 5, 8).material({ baseColor: '#3050a0' });
        return body.union(insert).material({ baseColor: '#808080' });
      `;
      const { records } = await runScript({ code, fileName: 'mat-only.kcad.ts' });
      const { materialShadowingWarnings, colorShadowingWarnings } =
        await meshFeaturesPerFeature(records);

      expect(materialShadowingWarnings.length).toBeGreaterThan(0);
      expect(materialShadowingWarnings.every((w) => w.attribute === 'material')).toBe(true);
      expect(colorShadowingWarnings).toEqual([]);
    });

    it('reports a pure-.color() script as color shadowing ONLY, not material', async () => {
      // `pbrFromMetadata` promotes `metadata.color` into `{ baseColor }`, so a
      // naive material detector fires on colour-only scripts and tells the
      // author to fix a `.material()` call they never wrote. Shadowing must key
      // off EXPLICIT `.material()` metadata.
      const code = `
        const body = box(20, 20, 10).color('#101010');
        const insert = box(10, 10, 2).translate(5, 5, 8).color('#3050a0');
        return body.union(insert).color('#808080');
      `;
      const { records } = await runScript({ code, fileName: 'color-only.kcad.ts' });
      const { materialShadowingWarnings, colorShadowingWarnings } =
        await meshFeaturesPerFeature(records);

      expect(materialShadowingWarnings).toEqual([]);
      expect(colorShadowingWarnings.length).toBeGreaterThan(0);
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
