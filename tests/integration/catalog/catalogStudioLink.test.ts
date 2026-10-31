// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `/studio?catalog=<kit>/<id>` end to end, short of the browser: read the
// served catalog, resolve the ref, load the source, evaluate it, and check the
// param table Studio's Params tab renders holds that asset's knobs.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { buildCatalogIndex, serializeCatalogIndex } from '../../../src/agent/catalog/buildCatalog';
import {
  CATALOG_STUDIO_PARAM,
  catalogStudioPath,
  loadCatalogAsset,
  type CatalogTextFetcher,
} from '../../../src/shared/assets/catalogStudioLink';
import type { CatalogIndex } from '../../../src/shared/assets/catalogSchema';

const repoRoot = resolve(import.meta.dirname, '../../..');
const fixtureRoot = join(repoRoot, 'tests/fixtures/catalog-studio');
const BASE = 'https://app.test/catalog';

/** Serve `<root>/catalog/**` at BASE, the way a static host would. */
function servedCatalog(root: string, index?: CatalogIndex): CatalogTextFetcher {
  return async (url) => {
    if (!url.startsWith(`${BASE}/`)) throw new Error(`404 ${url}`);
    const path = url.slice(BASE.length + 1);
    if (path === 'index.json' && index !== undefined) return serializeCatalogIndex(index);
    return readFileSync(join(root, 'catalog', path), 'utf8');
  };
}

/** What Studio does after `loadCatalogAsset`: evaluate the source and read its knobs. */
async function openInStudio(url: string, fetchText: CatalogTextFetcher) {
  const value = new URL(url, 'https://app.test').searchParams.get(CATALOG_STUDIO_PARAM);
  if (value === null) throw new Error(`no ?${CATALOG_STUDIO_PARAM}= in ${url}`);
  const loaded = await loadCatalogAsset(value, BASE, fetchText);
  const absolute = join(repoRoot, loaded.asset.source);
  const run = await runScript({ code: loaded.source, fileName: absolute, scriptDir: dirname(absolute) });
  return { loaded, params: run.paramTable.serialize() };
}

describe('open a catalog asset in Studio by ?catalog=<kit>/<id>', () => {
  let fixtureIndex: CatalogIndex;

  beforeAll(async () => {
    await initOcct();
    // Two kits in one index: the committed nature kit plus a fixture
    // characters kit, so resolution has to pick the right row, not the first.
    const committed = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as CatalogIndex;
    const characters = await buildCatalogIndex(fixtureRoot);
    fixtureIndex = {
      schemaVersion: 1,
      kits: [...committed.kits, ...characters.kits],
      assets: [...committed.assets, ...characters.assets.map((a) => ({ ...a, source: `catalog/kits/${a.kit}/${a.id}.kcad.ts` }))],
    };
  }, 300_000);

  function twoKitCatalog(): CatalogTextFetcher {
    const nature = servedCatalog(repoRoot);
    const characters = servedCatalog(fixtureRoot);
    return async (url) => {
      if (url === `${BASE}/index.json`) return serializeCatalogIndex(fixtureIndex);
      return url.includes('/kits/characters/') ? characters(url) : nature(url);
    };
  }

  it('nature/pine-tree opens with its five knobs at their defaults', async () => {
    const url = catalogStudioPath({ kit: 'nature', id: 'pine-tree' });
    expect(url).toBe('/studio?catalog=nature/pine-tree');
    const { loaded, params } = await openInStudio(url, twoKitCatalog());
    expect(loaded.title).toBe('Pine tree');
    expect(Object.keys(params)).toEqual(['heightM', 'tiers', 'sides', 'bark', 'leaves']);
    expect(params.heightM).toMatchObject({ type: 'choice', value: '4.5', meta: { label: 'Height (m)', choices: ['3', '4.5', '6', '8'] } });
    expect(params.leaves).toMatchObject({ type: 'color', value: '#2f7d4a', meta: { label: 'Foliage' } });
  }, 120_000);

  it('characters/block-figure opens with its own knobs, not the first asset in the index', async () => {
    const { loaded, params } = await openInStudio(
      catalogStudioPath({ kit: 'characters', id: 'block-figure' }),
      twoKitCatalog(),
    );
    expect(loaded.asset.id).toBe('block-figure');
    expect(Object.keys(params)).toEqual(['height', 'shoulders', 'body', 'head']);
    expect(params.shoulders).toMatchObject({ type: 'number', value: 440, meta: { min: 360, max: 520, step: 20, unit: 'mm' } });
    expect(params.head).toMatchObject({ type: 'color', value: '#e2b48c' });
  }, 120_000);

  it('every committed catalog asset opens with exactly the knobs its index row lists', async () => {
    const committed = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as CatalogIndex;
    expect(committed.assets.length).toBeGreaterThan(0);
    for (const asset of committed.assets) {
      const { params } = await openInStudio(catalogStudioPath(asset), servedCatalog(repoRoot));
      expect(Object.keys(params), asset.id).toEqual(asset.params.map((p) => p.name));
    }
  }, 300_000);

  it('refuses refs that do not name a catalog row, and sources that no longer match the index', async () => {
    const fetchText = twoKitCatalog();
    await expect(openInStudio('/studio?catalog=nature/not-a-catalog-row', fetchText)).rejects.toThrow(/asset not found: nature\/not-a-catalog-row.*pine-tree/);
    await expect(openInStudio('/studio?catalog=characters/pine-tree', fetchText)).rejects.toThrow(/asset not found: characters\/pine-tree/);
    await expect(openInStudio('/studio?catalog=space/rocket', fetchText)).rejects.toThrow(/kit not found: space/);
    await expect(openInStudio('/studio?catalog=../../etc/passwd', fetchText)).rejects.toThrow(/Not a catalog asset reference/);
    const stale = { ...fixtureIndex, assets: fixtureIndex.assets.map((a) => ({ ...a, sourceSha256: '0'.repeat(64) })) };
    await expect(openInStudio('/studio?catalog=nature/pine-tree', servedCatalog(repoRoot, stale))).rejects.toThrow(/does not match the index/);
  }, 120_000);
});
