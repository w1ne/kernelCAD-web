// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

type Json = Record<string, any>;

async function call(name: string, args: Record<string, unknown> = {}): Promise<Json> {
  return await callMcpTool(name, args) as Json;
}

describe('asset catalog MCP tools (bundled catalog)', () => {
  it('search_assets finds the pine tree with an ok coverage verdict and a compact row', async () => {
    const result = await call('search_assets', { q: 'pine trees' });
    expect(result.coverage).toBe('ok');
    expect(result.rows[0]).toMatchObject({ id: 'pine-tree', kit: 'nature', category: 'nature', origin: 'base', remixable: true });
    expect(result.rows[0].size_m[1]).toBeCloseTo(4.5, 6);
  });

  it('search_assets is honest about gaps and filters', async () => {
    expect(await call('search_assets', { q: 'spaceship' })).toMatchObject({ coverage: 'none', total: 0, unmatched_terms: ['spaceship'] });
    const filtered = await call('search_assets', { q: 'pine', max_triangles: 10 });
    expect(filtered).toMatchObject({ coverage: 'filtered_out', total: 0 });
    expect(filtered.next).toMatch(/relax a filter/);
    await expect(call('search_assets', { category: 'spaceship' })).rejects.toThrow(/category must be one of/);
  });

  it('get_asset returns knobs, palette zones and the source', async () => {
    const asset = await call('get_asset', { id: 'pine-tree' });
    expect(asset.params.map((p: Json) => p.name)).toEqual(['heightM', 'tiers', 'sides', 'bark', 'leaves']);
    expect(asset.palette.map((z: Json) => z.param)).toEqual(['bark', 'leaves']);
    expect(asset.code).toContain("meta({");
    await expect(call('get_asset', { id: 'nope' })).rejects.toThrow(/unknown asset 'nope'/);
  });

  it('get_variant turns plain words into knob values and a ready source', async () => {
    const variant = await call('get_variant', { id: 'pine-tree', want: 'taller, red foliage, glittery' });
    expect(variant.params).toEqual({ heightM: '6', leaves: '#c0392b' });
    expect(variant.unmatched).toEqual(['glittery']);
    expect(variant.code).toContain("param('heightM', '6'");
    expect(variant.code).toContain("param('leaves', '#c0392b'");
    const autumn = await call('get_variant', { id: 'pine-tree', want: 'autumn' });
    expect(autumn).toMatchObject({ preset: 'autumn', params: { leaves: '#c9772b' } });
  });

  it('list_kits / get_kit / find_matching answer from the same index', async () => {
    expect((await call('list_kits')).kits).toContainEqual(expect.objectContaining({ id: 'nature', assets: expect.any(Number) }));
    const kit = await call('get_kit', { id: 'nature' });
    expect(kit.rows.map((r: Json) => r.id)).toContain('pine-tree');
    expect((await call('find_matching', { id: 'pine-tree' })).id).toBe('pine-tree');
    await expect(call('find_matching', { id: 'nope' })).rejects.toThrow(/unknown asset/);
  });
});
