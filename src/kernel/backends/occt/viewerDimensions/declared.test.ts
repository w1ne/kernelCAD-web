// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../occtBackend';
import { computeViewerDimensions } from './index';
import { partsFromSource } from '../../../../../tests/helpers/viewerDimensionParts';

beforeAll(async () => { await initOcct(); }, 60_000);

const PLATE = `return box(40,20,10)
    .subtract(cylinder(20,2.5).translate(5,10,-5))
    .subtract(cylinder(20,2.5).translate(35,10,-5));`;

describe('declared viewer dimensions', () => {
  it('declared linear between two hole rims measures centre distance', async () => {
    const parts = await partsFromSource(PLATE);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'linear', from: { edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] } }, to: { edge: { ofCurveType: 'CIRCLE', near: [35, 10, 10] } }, label: 'pitch' },
    ] });
    expect(dimensions).toHaveLength(1);
    expect(dimensions[0]).toMatchObject({ source: 'declared', text: 'pitch 30' });
  });
  it('declared diameter reads the hole rim', async () => {
    const parts = await partsFromSource(PLATE);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] } },
    ] });
    expect(dimensions[0]).toMatchObject({ id: 'declared:0', kind: 'diameter', text: 'Ø5', source: 'declared' });
  });
  it('declared angular between two box edges is 90°', async () => {
    const parts = await partsFromSource(`return box(10,10,10);`);
    const { dimensions, diagnostics } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'angular', from: { ofCurveType: 'LINE', near: [5, 0, 0] }, to: { ofCurveType: 'LINE', near: [0, 5, 0] } },
    ] });
    expect(diagnostics).toEqual([]);
    expect(dimensions[0]).toMatchObject({ kind: 'angular', text: '90°' });
  });
  it('unresolved declared dimension warns and is skipped', async () => {
    const parts = await partsFromSource(`return box(10,10,10);`);
    const r = computeViewerDimensions({ parts, auto: true, declared: [{ kind: 'diameter', edge: { ofCurveType: 'CIRCLE' } }] });
    expect(r.diagnostics.map(d => d.code)).toContain('drawing.dimension.unresolved');
    expect(r.dimensions.filter(d => d.source === 'declared')).toHaveLength(0);
    expect(r.dimensions).toHaveLength(3);
  });
  it('budget exceeded returns [] and a warning', async () => {
    const parts = await partsFromSource(`return box(10,10,10);`);
    const r = computeViewerDimensions({ parts, auto: true, declared: [], budgetMs: 0 });
    expect(r.dimensions).toEqual([]);
    expect(r.diagnostics.map(d => d.code)).toContain('viewer.dimensions.budget-exceeded');
  });
});
