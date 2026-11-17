// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Changed-source catalog preview gate (#1416). For every catalog asset whose
// .kcad.ts source or preview PNG differs from <base>, re-render the preview the
// way scripts/renderCatalogPreviews.ts does and compare decoded pixels with the
// committed PNG. Fails when a source change left a stale preview, unless
// catalog/preview-exceptions.json holds a reviewed exception bound to the exact
// source and preview. A preview-only change with identical pixels (a lossless
// re-encode) passes without a render. Only touched assets are built.
//   npx tsx scripts/checkChangedCatalogPreviews.ts --base <git-ref>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../src/shared/assets/catalogSchema';
import { glbTriangles, renderTrianglesPng } from './lib/glbSoftwareRender';
import {
  exceptionApplies, pixelDiff, pixelSha256, previewMatches, previewPathFor, sha256, touchedAssets,
  type PreviewExceptions, type RgbaImage,
} from './lib/catalogPreviewGate';

const repoRoot = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
if (base === undefined) {
  console.error('usage: npx tsx scripts/checkChangedCatalogPreviews.ts --base <git-ref>');
  process.exit(2);
}
const EXCEPTIONS_FILE = 'catalog/preview-exceptions.json';

const git = (...gitArgs: string[]): Buffer => execFileSync('git', gitArgs, { cwd: repoRoot, maxBuffer: 1 << 28 });
const baseFile = (path: string): Buffer | undefined => {
  try {
    return execFileSync('git', ['show', `${base}:${path}`], { cwd: repoRoot, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return undefined;
  }
};
const decode = async (png: Uint8Array): Promise<RgbaImage> => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
};

const changed = git('diff', '--name-only', '--no-renames', base).toString('utf8').split('\n').filter(Boolean);
const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')));
const exceptions: PreviewExceptions = existsSync(join(repoRoot, EXCEPTIONS_FILE))
  ? JSON.parse(readFileSync(join(repoRoot, EXCEPTIONS_FILE), 'utf8'))
  : {};
const touched = touchedAssets(changed, index.assets).filter((t) => existsSync(join(repoRoot, t.row.source)));
console.log(`catalog preview gate: ${touched.length} touched asset(s) against ${base}`);

const started = Date.now();
let initialized = false;
const failures: string[] = [];
for (const { row, sourceChanged } of touched) {
  const previewPath = previewPathFor(row);
  if (!existsSync(join(repoRoot, previewPath))) {
    failures.push(`${row.id}: no committed preview at ${previewPath}`);
    continue;
  }
  const committedPng = readFileSync(join(repoRoot, previewPath));
  const committed = await decode(committedPng);
  if (!sourceChanged) {
    const before = baseFile(previewPath);
    if (before !== undefined && pixelSha256(await decode(before)) === pixelSha256(committed)) {
      console.log(`  ok   ${row.id}: preview re-encoded, pixels unchanged`);
      continue;
    }
  }
  if (!initialized) {
    await initOcct();
    initialized = true;
  }
  let fresh: RgbaImage;
  try {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, row.source);
    fresh = await decode(await renderTrianglesPng(await glbTriangles(glb), { label: `${asset.title} · ${asset.stats.triangles} tris` }));
  } catch (err) {
    failures.push(`${row.id}: build failed: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  const diff = pixelDiff(fresh, committed);
  const measured = diff.sameSize
    ? `mean |d| ${diff.meanAbs.toFixed(3)}/255, ${(diff.changedFraction * 100).toFixed(2)} % pixels changed`
    : `size ${fresh.width}x${fresh.height} vs committed ${committed.width}x${committed.height}`;
  if (previewMatches(diff)) {
    console.log(`  ok   ${row.id}: preview matches a fresh render (${measured})`);
    continue;
  }
  const sourceSha = sha256(readFileSync(join(repoRoot, row.source)));
  const previewSha = pixelSha256(committed);
  if (exceptionApplies(exceptions[row.id], sourceSha, previewSha)) {
    console.log(`  ok   ${row.id}: reviewed exception (${exceptions[row.id]!.reviewedIn}); ${measured}`);
    continue;
  }
  failures.push([
    `${row.id}: committed preview does not match its source (${measured}).`,
    `    Re-render it: npx tsx scripts/renderCatalogPreviews.ts ${row.id}`,
    `    Or, after review of an intentional custom preview, add to ${EXCEPTIONS_FILE}:`,
    `    "${row.id}": { "sourceSha256": "${sourceSha}", "previewPixelsSha256": "${previewSha}", "reason": "...", "reviewedIn": "..." }`,
  ].join('\n'));
}
console.log(`catalog preview gate: ${((Date.now() - started) / 1000).toFixed(1)} s`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
