// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The meshing pass meshes the shapes the session already lowered for the
// current inputs (buildModel / params.update) instead of lowering every
// record a second time — and falls back to lowering whenever the reuse
// cannot be proven fresh.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';

const PLATE = `
  const w = param('w', 40, { min: 10, max: 80 });
  const plate = box(w, 30, 4);
  const holed = plate.subtract(cylinder(10, 3).translate(10, 10, -1));
  return holed.fillet(0.5);
`;

const ASSEMBLY = `
  const a = assembly('pair');
  a.part('base', box(20, 20, 4).fillet(0.5), { at: [0, 0, 0] });
  a.part('post', cylinder(12, 3), { at: [10, 10, 4] });
  return a;
`;

function countLowering(): { ids: string[] } {
  const seen = { ids: [] as string[] };
  const original = OcctLowerer.prototype.lower;
  vi.spyOn(OcctLowerer.prototype, 'lower').mockImplementation(function (this: OcctLowerer, record, inputs) {
    seen.ids.push(record.id);
    return original.call(this, record, inputs);
  });
  return seen;
}

type Meshed = Awaited<ReturnType<typeof meshFeaturesPerFeature>>;
const triangles = (m: Meshed) =>
  m.features.map(f => f.faces.reduce((n, face) => n + face.indices.length / 3, 0));
const ids = (m: Meshed) => m.features.map(f => f.featureId);

afterEach(() => vi.restoreAllMocks());

describe('meshFeaturesPerFeature reuses the session lower', () => {
  it('meshes a fresh build without lowering any record again, same output', async () => {
    const model = await buildModel({ fileName: 'plate.kcad.ts', code: PLATE });
    // Reference: no session → the meshing pass lowers everything itself.
    const reference = await meshFeaturesPerFeature(model.records, model.session.paramTable);

    const lowered = countLowering();
    const reused = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(lowered.ids).toEqual([]);
    expect(ids(reused)).toEqual(ids(reference));
    expect(triangles(reused)).toEqual(triangles(reference));
    expect(reused.bounds).toEqual(reference.bounds);
    expect(reused.failedFeatureIds).toEqual([]);
  });

  it('meshes the shapes params.update re-lowered without lowering them twice', async () => {
    const model = await buildModel({ fileName: 'plate.kcad.ts', code: PLATE });
    await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);

    const update = await updateModelParams(model, [{ name: 'w', value: 60 }]);
    expect(update.result.relowered.length).toBeGreaterThan(0);
    const lowered = countLowering();
    const meshed = await meshFeaturesPerFeature(update.model.records, update.model.session.paramTable, update.model.session);
    expect(lowered.ids).toEqual([]);
    expect(meshed.bounds.max[0] - meshed.bounds.min[0]).toBeCloseTo(60, 1);
  });

  it('lowers again when the param table moved without a params.update', async () => {
    // meshSourceStream sets overrides on the session table after runScript;
    // the last full lower is then stale and must not be meshed.
    const model = await buildModel({ fileName: 'plate.kcad.ts', code: PLATE });
    model.session.paramTable.set('w', 20);
    const lowered = countLowering();
    const meshed = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(lowered.ids.length).toBeGreaterThan(0);
    expect(meshed.bounds.max[0] - meshed.bounds.min[0]).toBeCloseTo(20, 1);
  });

  it('lowers again when the caller passes a param table that is not the session one', async () => {
    const model = await buildModel({ fileName: 'plate.kcad.ts', code: PLATE });
    const other = model.session.paramTable.clone?.() ?? Object.create(model.session.paramTable);
    const lowered = countLowering();
    await meshFeaturesPerFeature(model.records, other, model.session);
    expect(lowered.ids.length).toBeGreaterThan(0);
  });

  it('keeps assembly part meshes identical to a full lower', async () => {
    const model = await buildModel({ fileName: 'pair.kcad.ts', code: ASSEMBLY });
    const reference = await meshFeaturesPerFeature(model.records, model.session.paramTable);
    const reused = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(ids(reused)).toEqual(ids(reference));
    expect(triangles(reused)).toEqual(triangles(reference));
    expect(reused.failedFeatureIds).toEqual([]);
  });
});
