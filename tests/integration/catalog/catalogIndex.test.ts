// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogIndex, listCatalogKitIds, serializeCatalogIndex } from '../../../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../../../src/shared/assets/catalogSchema';

const repoRoot = resolve(import.meta.dirname, '../../..');

// CI splits the full-catalog rebuild across runners: KCAD_CATALOG_SHARD="i/n"
// (1-based) builds only shard i's kits and compares them with the matching
// slice of the committed index. Unset = the whole catalog, as before. The
// partition is a pure function of the kit directories, so the n shards cover
// every kit exactly once; the committed kit list is checked in every shard.
function shardKits(kitIds: string[], spec: string | undefined): string[] | undefined {
  if (spec === undefined || spec === '') return undefined;
  const match = /^(\d+)\/(\d+)$/.exec(spec);
  if (match === null) throw new Error(`KCAD_CATALOG_SHARD must look like "1/4", got "${spec}"`);
  const shard = Number(match[1]);
  const total = Number(match[2]);
  if (shard < 1 || shard > total) throw new Error(`KCAD_CATALOG_SHARD out of range: "${spec}"`);
  const size = (id: string): number => readdirSync(join(repoRoot, 'catalog', 'kits', id)).filter((name) => name.endsWith('.kcad.ts')).length;
  // Greedy longest-first onto the lightest shard (ties: lowest shard index).
  const load = Array.from({ length: total }, () => 0);
  const owner = new Map<string, number>();
  for (const id of [...kitIds].sort((a, b) => size(b) - size(a) || a.localeCompare(b))) {
    const lightest = load.indexOf(Math.min(...load));
    owner.set(id, lightest);
    load[lightest] += size(id);
  }
  return kitIds.filter((id) => owner.get(id) === shard - 1);
}

describe('asset catalog', () => {
  beforeAll(async () => { await initOcct(); });

  it('every catalog source builds, exports inside its triangle budget on one material, and the committed index is fresh', async () => {
    const allKits = listCatalogKitIds(repoRoot);
    const mine = shardKits(allKits, process.env.KCAD_CATALOG_SHARD);
    const committed = readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8');
    const committedIndex = CatalogIndexSchema.parse(JSON.parse(committed));
    expect(committedIndex.kits.map((kit) => kit.id), 'committed index kit list must match catalog/kits').toEqual(allKits);
    const committedIds = committedIndex.assets.map((asset) => asset.id);
    expect(new Set(committedIds).size, 'committed index has duplicate asset ids').toBe(committedIds.length);
    const built = await buildCatalogIndex(repoRoot, mine);
    for (const asset of built.assets) {
      expect(asset.stats.triangles, asset.id).toBeLessThanOrEqual(asset.triangleBudget);
      expect(asset.stats.materials, asset.id).toBe(1);
      expect(asset.params.some(param => ['number', 'boolean', 'choice'].includes(param.type)), `${asset.id} needs an editable size or configuration control`).toBe(true);
      expect(asset.stats.minUpM, asset.id).toBeCloseTo(asset.origin === 'base' ? 0 : asset.stats.minUpM, 6);
      expect(asset.preview, `${asset.id} needs a rendered homepage preview`).toBe(`/assets/${asset.kit}-${asset.id}.png`);
    }
    const expected = mine === undefined
      ? committed
      : serializeCatalogIndex({
        ...committedIndex,
        kits: committedIndex.kits.filter((kit) => mine.includes(kit.id)),
        assets: committedIndex.assets.filter((asset) => mine.includes(asset.kit)),
      });
    expect(expected, 'run: npx tsx scripts/buildAssetCatalog.ts').toBe(serializeCatalogIndex(built));
  // The complete 2,402-asset export can exceed 15 minutes on this workspace.
  }, 1_800_000);

  it('every characters-kit asset ships a GLB rig with a pivot per joint', () => {
    const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')));
    const characters = index.assets.filter((asset) => asset.kit === 'characters');
    expect(characters.length).toBeGreaterThanOrEqual(5);
    for (const asset of characters) {
      const rig = Object.values(asset.rig ?? {});
      expect(rig.length, asset.id).toBeGreaterThanOrEqual(6);
      for (const joint of rig) expect(joint.range[0], `${asset.id} ${joint.node}`).toBeLessThan(joint.range[1]);
    }
  });
});
