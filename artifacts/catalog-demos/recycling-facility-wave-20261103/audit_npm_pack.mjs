#!/usr/bin/env node
// Audit a retained npm pack dry-run against the public source boundary and the
// 153 recycling-facility assets in this wave.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const pack = JSON.parse(readFileSync(resolve(bundle, 'npm-pack-dry-run.json'), 'utf8'))[0];
const index = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8'));
const rows = index.assets.filter((asset) => asset.kit === 'recycling-facility');
const files = new Set(pack.files.map((entry) => entry.path));
const missing = [];
for (const asset of rows) {
  const source = `catalog/kits/recycling-facility/${asset.id}.kcad.ts`;
  const preview = `catalog/kits/recycling-facility/previews/${asset.id}.png`;
  if (!files.has(source)) missing.push(source);
  if (!files.has(preview)) missing.push(preview);
}
if (!files.has('catalog/index.json')) missing.push('catalog/index.json');
const productPaths = pack.files.map((entry) => entry.path).filter((path) => /(^|\/)(site|server|billing|checkout|suppliers?|quotes?|commissions?|entitlements?)(\/|$)/i.test(path));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const result = {
  command: 'npm pack --dry-run --ignore-scripts --json',
  packageName: pack.name,
  packageVersion: pack.version,
  fileCount: pack.files.length,
  indexedAssetsTotal: index.assets.length,
  recyclingFacilitySources: rows.length,
  recyclingFacilitySourcesPacked: rows.filter((asset) => files.has(`catalog/kits/recycling-facility/${asset.id}.kcad.ts`)).length,
  recyclingFacilityPreviewsPacked: rows.filter((asset) => files.has(`catalog/kits/recycling-facility/previews/${asset.id}.png`)).length,
  catalogIndexPacked: files.has('catalog/index.json'),
  packageExports: Object.keys(pkg.exports ?? {}),
  productPaths,
  missing,
  wroteTarball: false,
  ranLifecycleScripts: false,
  passed: missing.length === 0 && productPaths.length === 0 && index.assets.length === 2000 && rows.length === 153 && Object.keys(pkg.exports ?? {}).join(',') === './package.json',
};
writeFileSync(resolve(bundle, 'npm-pack-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
