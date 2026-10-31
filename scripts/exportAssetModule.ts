// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Write a self-contained three.js ES module for one catalog asset.
//   npx tsx scripts/exportAssetModule.ts <asset-id> [out.mjs]
import { writeFileSync } from 'node:fs';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, loadAssetCatalog, readAssetSource } from '../src/agent/catalog/catalogStore';
import { emitAssetModule } from '../src/agent/catalog/assetModule';

const [id, out] = process.argv.slice(2);
if (id === undefined) {
  console.error('usage: npx tsx scripts/exportAssetModule.ts <asset-id> [out.mjs]');
  process.exit(2);
}
await initOcct();
const { dir, index } = loadAssetCatalog();
const asset = index.assets.find((row) => row.id === id);
if (asset === undefined) throw new Error(`unknown asset '${id}'`);
const glb = await exportLowPolyAsset(readAssetSource(dir, asset), `${id}.kcad.ts`);
const path = out ?? `${id}.mjs`;
writeFileSync(path, await emitAssetModule(asset, glb));
console.log(`wrote ${path}`);
