// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Rebuild catalog/index.json from catalog/kits/<kit>/*.kcad.ts.
//   npx tsx scripts/buildAssetCatalog.ts          write the index
//   npx tsx scripts/buildAssetCatalog.ts --check  fail if it is stale
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogIndex, serializeCatalogIndex } from '../src/agent/catalog/buildCatalog';

const repoRoot = resolve(import.meta.dirname, '..');
const indexPath = join(repoRoot, 'catalog', 'index.json');

await initOcct();
const text = serializeCatalogIndex(await buildCatalogIndex(repoRoot));
if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(indexPath, 'utf8'); } catch { /* missing counts as stale */ }
  if (current !== text) {
    console.error('catalog/index.json is stale: run npx tsx scripts/buildAssetCatalog.ts');
    process.exit(1);
  }
  console.log('catalog/index.json is up to date');
} else {
  writeFileSync(indexPath, text);
  console.log(`wrote ${indexPath}`);
}
