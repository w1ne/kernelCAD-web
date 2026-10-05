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

  it('overall extents of a lofted (B-spline) body match its mesh, and a sphere reads its true size', async () => {
    const code = `
const section = (w: number, h: number) =>
  path().moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).close();
return section(20, 14).loft([section(46, 30), section(30, 20)], { spacing: 55 });`;
    const model = await buildModel({ code, fileName: 'loft.kcad.ts' });
    const paramTable = (model.session as unknown as { paramTable: never }).paramTable;
    const meshing = await meshFeaturesPerFeature(model.records, paramTable, model.session as never);
    const mesh = [0, 1, 2].map(k => meshing.bounds.max[k] - meshing.bounds.min[k]);
    const overall = viewerDimensionsForModel(model).dimensions
      .filter(d => d.id.startsWith('auto:overall:'))
      .map(d => Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1], d.b[2] - d.a[2]));
    expect(overall).toHaveLength(3);
    overall.forEach((size, k) => expect(Math.abs(size - mesh[k]), `axis ${k}`).toBeLessThan(0.1));
    // The plain Bnd_Box is padded on these faces; the check above would fail on it.
    const padded = model.rootShape!.boundingBox();
    expect(Math.max(...[0, 1, 2].map(k => padded.max[k] - padded.min[k] - mesh[k]))).toBeGreaterThan(0.1);

    const ball = await buildModel({ code: 'return sphere(50);', fileName: 'ball.kcad.ts' });
    expect(viewerDimensionsForModel(ball).dimensions.map(d => d.text)).toEqual(['100', '100', '100']);
  }, 60_000);

  it('does no work without declarations when auto is off, and never throws on a bad scene', () => {
    const exploding = new Proxy({}, { get: () => { throw new Error('scene exploded'); } }) as never;
    expect(viewerDimensionsForRoot({ records: [], rootShape: exploding }, { auto: false })).toEqual({ dimensions: [], diagnostics: [] });
    const r = viewerDimensionsForRoot({ records: [], rootShape: exploding });
    expect(r.dimensions).toEqual([]);
    expect(r.diagnostics.map(d => d.code)).toEqual(['viewer.dimensions.budget-exceeded']);
    expect(r.diagnostics[0].message).toContain('scene exploded');
  });
});
