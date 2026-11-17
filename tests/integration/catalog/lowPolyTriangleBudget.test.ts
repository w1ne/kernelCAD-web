// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Fast gate for the catalogue kits whose low-poly GLB exceeded the triangle
// budget declared in meta() during catalogue sync. The full-catalog rebuild
// checks every kit, but it is excluded from the default shard. This file
// exports only the kits that failed that sync, the same way the catalogue
// build does.

import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');

const sources = [
  'catalog/kits/sports/golf-club.kcad.ts',
  'catalog/kits/telecom-infrastructure/omnidirectional-whip-antenna.kcad.ts',
];

beforeAll(async () => {
  await initOcct();
}, 30_000);

describe('catalogue low-poly triangle budgets', () => {
  it('exports the listed kits inside their declared triangle budgets', async () => {
    for (const source of sources) {
      const { asset } = await buildCatalogAssetWithGlb(repoRoot, source);
      expect(asset.stats.triangles, `${source} has no triangles`).toBeGreaterThan(0);
      expect(asset.stats.triangles, source).toBeLessThanOrEqual(asset.triangleBudget);
    }
  });
});
