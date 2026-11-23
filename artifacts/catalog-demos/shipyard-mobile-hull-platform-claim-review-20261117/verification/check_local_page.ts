import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAssetPage } from '../../../../scripts/buildCatalogPages';

const repoRoot = resolve(import.meta.dirname, '../../../../');
const index = JSON.parse(readFileSync(resolve(repoRoot, 'catalog/index.json'), 'utf8'));
const asset = index.assets.find((row: { kit: string; id: string }) =>
  row.kit === 'shipyard' && row.id === 'mobile-hull-access-platform');
const kit = index.kits.find((row: { id: string }) => row.id === 'shipyard');
assert(asset, 'shipyard/mobile-hull-access-platform index row exists');
const html = renderAssetPage(asset, kit, index.assets.filter((row: { kit: string }) => row.kit === 'shipyard'));
assert(html.includes('fixed-height support posts'), 'rendered page has the corrected description');
assert(!html.includes('adjustable-height'), 'rendered page has no unsupported adjustment claim');
writeFileSync(resolve(import.meta.dirname, 'catalog-shipyard-mobile-hull-access-platform.html'), html);
writeFileSync(resolve(import.meta.dirname, 'local-page-check.json'), JSON.stringify({
  checkedAt: '2026-11-17',
  pagePath: '/catalog/shipyard/mobile-hull-access-platform/',
  description: asset.description,
  correctedDescriptionPresent: true,
  oldClaimAbsent: true,
  sourceSha256: asset.sourceSha256,
  previewPath: asset.preview,
}, null, 2) + '\n');
console.log('local catalog page description verified');
