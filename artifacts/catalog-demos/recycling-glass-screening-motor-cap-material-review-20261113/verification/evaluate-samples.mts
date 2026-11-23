// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { buildCatalogAssetWithGlb } from '../../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../../..');
const ids = [
  'bag-opener',
  'cross-belt-sorter',
  'disc-screen',
  'glass-screening-deck',
  'bottle-cleaning-line',
];

await initOcct();
for (const id of ids) {
  const source = `catalog/kits/recycling-facility/${id}.kcad.ts`;
  const { asset } = await buildCatalogAssetWithGlb(repoRoot, source);
  console.log(JSON.stringify({
    kit: asset.kit,
    id: asset.id,
    triangles: asset.stats.triangles,
    sizeM: asset.stats.sizeM,
    triangleBudget: asset.triangleBudget,
    description: asset.description,
    params: asset.params.map(({ name, label, type }) => ({ name, label, type })),
    presets: Object.keys(asset.presets),
  }));
}
