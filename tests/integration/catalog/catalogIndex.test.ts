// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogIndex, serializeCatalogIndex } from '../../../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../../../src/shared/assets/catalogSchema';

const repoRoot = resolve(import.meta.dirname, '../../..');

describe('asset catalog', () => {
  beforeAll(async () => { await initOcct(); });

  it('every catalog source builds, exports inside its triangle budget on one material, and the committed index is fresh', async () => {
    const built = await buildCatalogIndex(repoRoot);
    for (const asset of built.assets) {
      expect(asset.stats.triangles, asset.id).toBeLessThanOrEqual(asset.triangleBudget);
      expect(asset.stats.materials, asset.id).toBe(1);
      expect(asset.stats.minUpM, asset.id).toBeCloseTo(asset.origin === 'base' ? 0 : asset.stats.minUpM, 6);
    }
    const committed = readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8');
    CatalogIndexSchema.parse(JSON.parse(committed));
    expect(committed, 'run: npx tsx scripts/buildAssetCatalog.ts').toBe(serializeCatalogIndex(built));
  }, 600_000);
});
