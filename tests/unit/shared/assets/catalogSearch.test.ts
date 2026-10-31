// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CatalogIndexSchema, type CatalogAsset, type CatalogIndex } from '../../../../src/shared/assets/catalogSchema';
import { findMatching, resolveVariant, searchCatalog } from '../../../../src/shared/assets/catalogSearch';

function asset(partial: Partial<CatalogAsset> & Pick<CatalogAsset, 'id' | 'kit' | 'category'>): CatalogAsset {
  return {
    title: partial.id, description: '', origin: 'base', tags: [], compat: [], license: 'CC0-1.0',
    source: `catalog/kits/${partial.kit}/${partial.id}.kcad.ts`, sourceSha256: '0'.repeat(64),
    triangleBudget: 500, params: [], presets: {},
    stats: { triangles: 100, sizeM: [1, 1, 1], minUpM: 0, materials: 1 }, palette: [],
    ...partial,
  };
}

const pine = asset({
  id: 'pine-tree', kit: 'nature', category: 'nature', title: 'Pine tree', tags: ['tree', 'conifer', 'forest'],
  compat: ['outdoor'], stats: { triangles: 96, sizeM: [1.9, 4.5, 1.9], minUpM: 0, materials: 1 },
  palette: [{ name: 'leaves', color: '#2f7d4a', parts: ['crown'], param: 'leaves' }],
  params: [
    { name: 'heightM', type: 'choice', default: '4.5', label: 'Height (m)', choices: ['3', '4.5', '6', '8'] },
    { name: 'tiers', type: 'choice', default: '3', label: 'Foliage tiers', choices: ['2', '3', '4', '5'] },
    { name: 'bark', type: 'color', default: '#7a4b2a', label: 'Bark' },
    { name: 'leaves', type: 'color', default: '#2f7d4a', label: 'Foliage' },
    { name: 'snow', type: 'boolean', default: false, label: 'Snow cap' },
    { name: 'lean', type: 'number', default: 0, min: -10, max: 10, step: 5, label: 'Lean' },
  ],
  presets: { autumn: { leaves: '#c9772b' } },
});
const oak = asset({ id: 'oak-tree', kit: 'nature', category: 'nature', tags: ['tree', 'deciduous'], stats: { triangles: 300, sizeM: [4, 6, 4], minUpM: 0, materials: 1 } });
const rock = asset({ id: 'boulder', kit: 'nature', category: 'terrain', tags: ['rock', 'stone'] });
const bench = asset({
  id: 'park-bench', kit: 'city-street', category: 'furniture', tags: ['bench', 'seat'], compat: ['outdoor'],
  palette: [{ name: 'slats', color: '#2e7a49', parts: ['slats'] }],
});
const sofa = asset({ id: 'sofa', kit: 'interior', category: 'furniture', tags: ['couch', 'seat'], stats: { triangles: 200, sizeM: [2, 0.8, 0.9], minUpM: 0, materials: 1 } });
const index: CatalogIndex = CatalogIndexSchema.parse({
  schemaVersion: 1,
  kits: [
    { id: 'nature', title: 'Nature', assets: ['boulder', 'oak-tree', 'pine-tree'] },
    { id: 'city-street', title: 'City street', assets: ['park-bench'] },
    { id: 'interior', title: 'Interior', assets: ['sofa'] },
  ],
  assets: [pine, oak, rock, bench, sofa],
});

describe('searchCatalog', () => {
  it('ranks title/tag hits and stems plurals', () => {
    const result = searchCatalog(index, { q: 'trees' });
    expect(result.rows.map((r) => r.id)).toEqual(['oak-tree', 'pine-tree']);
    expect(result.coverage).toBe('ok');
  });

  it('reports none for a query nothing answers', () => {
    const result = searchCatalog(index, { q: 'spaceship' });
    expect(result).toMatchObject({ total: 0, coverage: 'none', unmatchedTerms: ['spaceship'] });
  });

  it('reports poor and the unmatched word when only part of a query lands', () => {
    const result = searchCatalog(index, { q: 'sippy tree' });
    expect(result.coverage).toBe('poor');
    expect(result.unmatchedTerms).toEqual(['sippy']);
    expect(result.rows.length).toBe(2);
  });

  it('says filtered_out when the catalog has it but a filter removed it', () => {
    const result = searchCatalog(index, { q: 'tree', maxTriangles: 50 });
    expect(result).toMatchObject({ total: 0, coverage: 'filtered_out', matchesBeforeFilters: 2 });
  });

  it('filters by kit and category, sorts by triangles and pages', () => {
    expect(searchCatalog(index, { kit: 'nature', sort: 'triangles' }).rows.map((r) => r.id)).toEqual(['pine-tree', 'boulder', 'oak-tree']);
    expect(searchCatalog(index, { category: 'furniture' }).rows.map((r) => r.id)).toEqual(['park-bench', 'sofa']);
    expect(searchCatalog(index, { limit: 2, offset: 2 }).rows.length).toBe(2);
    expect(searchCatalog(index, {}).coverage).toBeUndefined();
  });
});

describe('findMatching', () => {
  it('puts the same kit first and spreads across categories', () => {
    const rows = findMatching(index, 'pine-tree')!;
    expect(rows.slice(0, 2).map((r) => r.asset.category).sort()).toEqual(['nature', 'terrain']);
    expect(rows[0]!.reasons).toContain('same-kit');
  });

  it('adds outdoor street furniture through compat tags and a shared palette, not indoor sofas', () => {
    const rows = findMatching(index, 'pine-tree')!;
    const bench = rows.find((r) => r.asset.id === 'park-bench')!;
    expect(bench.reasons).toEqual(expect.arrayContaining(['compat:outdoor', 'palette']));
    expect(rows.some((r) => r.asset.id === 'sofa')).toBe(false);
  });

  it('honours the triangle filter and returns undefined for an unknown id', () => {
    expect(findMatching(index, 'pine-tree', { maxTriangles: 150 })!.some((r) => r.asset.id === 'oak-tree')).toBe(false);
    expect(findMatching(index, 'nope')).toBeUndefined();
  });
});

describe('resolveVariant', () => {
  it('sets choice knobs from option values and "<knob> <value>" pairs', () => {
    expect(resolveVariant(pine, 'tiers 5 height 8').params).toEqual({ tiers: '5', heightM: '8' });
    expect(resolveVariant(pine, 'height 7.5').params).toEqual({ heightM: '8' }); // nearest numeric choice
  });

  it('steps size knobs with comparatives', () => {
    expect(resolveVariant(pine, 'taller').params).toEqual({ heightM: '6' });
    expect(resolveVariant(pine, 'shorter, more tiers').params).toEqual({ heightM: '3', tiers: '4' });
  });

  it('recolours a named colour zone with a hex or a basic colour word', () => {
    expect(resolveVariant(pine, 'bark #333333').params).toEqual({ bark: '#333333' });
    expect(resolveVariant(pine, 'red foliage').params).toEqual({ leaves: '#c0392b' });
    expect(resolveVariant(pine, 'blue').params).toEqual({ bark: '#2e6fd8' }); // first colour knob
  });

  it('toggles booleans, clamps numbers, applies presets and reports unknown words', () => {
    expect(resolveVariant(pine, 'with snow').params).toEqual({ snow: true });
    expect(resolveVariant(pine, 'lean 30').params).toEqual({ lean: 10 });
    const r = resolveVariant(pine, 'autumn sparkly');
    expect(r.preset).toBe('autumn');
    expect(r.unmatched).toEqual(['sparkly']);
  });
});
