// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/mobile-hull-access-platform.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/mobile-hull-access-platform description', () => {
  it('describes the fixed support posts without claiming a height adjustment', async () => {
    const { asset } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.description).toContain('fixed-height support posts');
    expect(asset.description).not.toMatch(/adjustable[- ]height/i);
    expect(asset.params.map((param) => param.name)).toEqual([
      'scale', 'yardPaint', 'structuralSteel', 'elastomer',
    ]);
    expect(asset.stats.triangles).toBe(592);
    expect(asset.stats.sizeM).toEqual([1.785317, 1.355, 1.385]);
  }, 120_000);
});
