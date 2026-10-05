// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../occtBackend';
import { computeViewerDimensions } from './index';
import type { WorldFramePart } from '../sceneToWorldFrame';
import { partsFromSource } from '../../../../../tests/helpers/viewerDimensionParts';

beforeAll(async () => { await initOcct(); }, 60_000);

const PLATE = `return box(40,20,10)
    .subtract(cylinder(20,2.5).translate(5,10,-5))
    .subtract(cylinder(20,2.5).translate(35,10,-5));`;

describe('declared viewer dimensions', () => {
  it('a non-budget error returns no dimensions and a warning with the reason', () => {
    const broken = [{ name: 'part', shape: { boundingBox: () => { throw new Error('bbox exploded'); } } }] as unknown as WorldFramePart[];
    const r = computeViewerDimensions({ parts: broken, auto: true, declared: [] });
    expect(r.dimensions).toEqual([]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({ code: 'viewer.dimensions.budget-exceeded', severity: 'warn' });
    expect(r.diagnostics[0].message).toContain('bbox exploded');
  });
  it('declared linear between two hole rims measures centre distance', async () => {
    const parts = await partsFromSource(PLATE);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'linear', from: { edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] } }, to: { edge: { ofCurveType: 'CIRCLE', near: [35, 10, 10] } }, label: 'pitch' },
    ] });
    expect(dimensions).toHaveLength(1);
    expect(dimensions[0]).toMatchObject({ source: 'declared', text: 'pitch 30' });
    // Circular edges anchor at their centres: the top rims of the two holes.
    dimensions[0].a.forEach((x, k) => expect(x).toBeCloseTo([5, 10, 10][k], 6));
    dimensions[0].b.forEach((x, k) => expect(x).toBeCloseTo([35, 10, 10][k], 6));
  });
  it('declared diameter reads the hole rim', async () => {
    const parts = await partsFromSource(PLATE);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] } },
    ] });
    expect(dimensions[0]).toMatchObject({ id: 'declared:0', kind: 'diameter', text: 'Ø5', source: 'declared' });
  });
  it('declared labelled diameter and radius read "<label> <value>"', async () => {
    const parts = await partsFromSource(PLATE);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] }, label: 'bolt hole' },
      { kind: 'radius', edge: { ofCurveType: 'CIRCLE', near: [5, 10, 10] }, label: 'bore' },
    ] });
    expect(dimensions.map(d => d.text)).toEqual(['bolt hole Ø5', 'bore R2.5']);
  });
  it('declared labelled angular reads "<label> <value>"', async () => {
    const parts = await partsFromSource(`return box(10,10,10);`);
    const { dimensions } = computeViewerDimensions({ parts, auto: false, declared: [
      { kind: 'angular', from: { ofCurveType: 'LINE', near: [5, 0, 0] }, to: { ofCurveType: 'LINE', near: [0, 5, 0] }, label: 'corner' },
    ] });
    expect(dimensions[0]).toMatchObject({ kind: 'angular', text: 'corner 90°' });
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
  it('budget exceeded keeps overall extents and warns', async () => {
    const parts = await partsFromSource(`return box(10,10,10);`);
    const r = computeViewerDimensions({ parts, auto: true, declared: [], budgetMs: -1 });
    expect(r.dimensions.map(d => d.id)).toEqual(['auto:overall:model:0', 'auto:overall:model:1', 'auto:overall:model:2']);
    expect(r.diagnostics.map(d => d.code)).toContain('viewer.dimensions.budget-exceeded');
  });
});
