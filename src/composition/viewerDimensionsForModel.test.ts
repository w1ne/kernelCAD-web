// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel } from './buildModel';
import { runScript } from './runScript';
import { resolveRootId } from './buildModel';
import { meshFeaturesPerFeature } from '../modeling/capture/featureMeshing';
import { viewerDimensionsForModel, viewerDimensionsForRoot } from './viewerDimensionsForModel';

beforeAll(async () => { await initOcct(); }, 60_000);

describe('viewerDimensionsForModel', () => {
  it('returns declared + auto dimensions for a built model', async () => {
    const model = await buildModel({
      code: `return box(40,20,10).dimension({ kind: 'linear', from: [0,0,0], to: [40,0,0] });`,
      fileName: 'p.kcad.ts',
    });
    const { dimensions } = viewerDimensionsForModel(model);
    expect(dimensions.filter(d => d.source === 'declared')).toHaveLength(1);
    expect(dimensions.filter(d => d.source === 'auto').map(d => d.text).sort()).toEqual(['10', '20', '40']);
  }, 60_000);

  it('skips automatic dimensions when auto is false', async () => {
    const model = await buildModel({ code: `return box(40,20,10);`, fileName: 'p.kcad.ts' });
    expect(viewerDimensionsForModel(model, { auto: false }).dimensions).toEqual([]);
  }, 60_000);

  it('returns nothing without a root shape', () => {
    expect(viewerDimensionsForModel({ records: [] } as never)).toEqual({ dimensions: [], diagnostics: [] });
  });

  it('reflects a param override using the shapes the mesher already lowered', async () => {
    const run = await runScript({
      code: `const w = param('w', 40, { min: 10, max: 100 }); return box(w,20,10);`,
      fileName: 'p.kcad.ts',
    });
    run.paramTable.set('w', 60);
    const meshing = await meshFeaturesPerFeature(run.records, run.paramTable, run.session as never);
    const rootId = resolveRootId(run.returnValue, run.records.at(-1)?.id);
    const { dimensions } = viewerDimensionsForRoot({
      records: run.records,
      rootId,
      rootShape: rootId === undefined ? undefined : meshing.shapes?.get(rootId),
    });
    expect(dimensions.filter(d => d.source === 'auto').map(d => d.text).sort()).toEqual(['10', '20', '60']);
  }, 60_000);
});
