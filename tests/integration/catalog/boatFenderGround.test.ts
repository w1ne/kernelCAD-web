// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';

const repoRoot = resolve(import.meta.dirname, '../../..');

beforeAll(async () => { await initOcct(); }, 120_000);

describe('marine/boat-fender export envelope', () => {
  it('keeps the bottom pole at ground level after mesh cleanup', async () => {
    const { asset } = await buildCatalogAssetWithGlb(repoRoot, 'catalog/kits/marine/boat-fender.kcad.ts');
    expect(asset.origin).toBe('base');
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
