// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Viewer dimensions reuse per-part results for unchanged geometry (same
// source shape, same transform) and stay identical to a fresh computation.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { viewerDimensionsForModel } from '../../../src/composition/viewerDimensionsForModel';
import { collectDrawingDeclarations } from '../../../src/modeling/runtime/drawingDeclarations';
import { drawingPartsForBackend } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import { computeViewerDimensions } from '../../../src/kernel/backends/occt/viewerDimensions';
import { recogniseDrawingFeatures } from '../../../src/kernel/backends/occt/drawingFeatures';
import type { BuiltModel } from '../../../src/modeling/buildModel';

beforeAll(async () => { await initOcct(); }, 60_000);
afterEach(() => { vi.restoreAllMocks(); });

const CODE = `
  const arm = assembly('dims-memo');
  const gap = param('GapMm', 10, { min: 0, max: 50 });
  const plate = box(40, 30, 6).subtract(cylinder(3, 6).translate(10, 15, 0));
  arm.part('plate', plate);
  arm.part('block', box(10, 10, 10).subtract(cylinder(2, 10).translate(5, 5, 0)).translate(gap.add(40), 0, 0));
  return arm.solvedModel({});
`;

/** The same computation with the memo out of the way (no part identity). */
function freshDimensions(model: BuiltModel) {
  const declared = model.rootId === undefined ? [] : collectDrawingDeclarations(model.records, model.rootId).dimensions;
  const rootShape = model.rootShape!;
  return computeViewerDimensions({
    parts: () => drawingPartsForBackend(rootShape).map(({ source: _source, ...p }) => p),
    declared,
    auto: true,
  });
}

describe('viewer dimensions memo', () => {
  it('repeats are identical, served from the memo, and not aliased', async () => {
    const model = await buildModel({ code: CODE, fileName: 'memo.kcad.ts' });
    const first = viewerDimensionsForModel(model);
    expect(first.dimensions.length).toBeGreaterThan(3);
    expect(first).toEqual(freshDimensions(model));
    first.dimensions[0].a[0] = 1e9;
    const spy = vi.spyOn(OcctBackend.prototype, 'getReplicadShape');
    const again = viewerDimensionsForModel(model);
    expect(spy).not.toHaveBeenCalled();
    expect(again).toEqual(freshDimensions(model));
  }, 30_000);

  it('after a param update, only the changed part is measured again', async () => {
    let model = await buildModel({ code: CODE, fileName: 'memo.kcad.ts' });
    viewerDimensionsForModel(model);
    model = (await updateModelParams(model, [{ name: 'GapMm', value: 20 }])).model;
    const after = viewerDimensionsForModel(model);
    expect(after).toEqual(freshDimensions(model));
    const blockOverall = after.dimensions.find(d => d.id === 'auto:overall:model:0');
    expect(blockOverall?.text).toBe('70');
  }, 30_000);

  it('planar: false keeps holes, radii and chamfers and drops only the planar table', async () => {
    const model = await buildModel({ code: `return box(40, 30, 6).subtract(cylinder(3, 6).translate(10, 15, 0)).chamfer(1);`, fileName: 'c.kcad.ts' });
    const shape = model.rootShape as OcctBackend;
    const full = recogniseDrawingFeatures(shape);
    const lean = recogniseDrawingFeatures(shape, { planar: false });
    expect(lean.planar).toEqual([]);
    expect(full.planar.length).toBeGreaterThan(0);
    expect(full.chamfers.length).toBeGreaterThan(0);
    expect({ ...lean, planar: full.planar }).toEqual(full);
    expect(Object.getOwnPropertyDescriptor(full.planar[0], 'centre')?.get).toBeUndefined();
  }, 30_000);
});
