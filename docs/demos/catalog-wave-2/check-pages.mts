// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const outputDir = mkdtempSync(join(tmpdir(), 'kcad-catalog-wave-2-pages-'));
const index = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{
    id: string;
    kit: string;
    title: string;
    stats: { triangles: number };
    params: Array<{ name: string }>;
  }>;
};

try {
  execFileSync('npx', ['tsx', 'scripts/buildCatalogPages.ts', outputDir], { cwd: repoRoot, stdio: 'pipe' });
  const pagesRoot = join(outputDir, 'catalog');
  const pageCount = readdirSync(pagesRoot).filter((kit) => statSync(join(pagesRoot, kit)).isDirectory())
    .flatMap((kit) => readdirSync(join(pagesRoot, kit)).map((id) => join(pagesRoot, kit, id, 'index.html')))
    .filter(existsSync).length;
  if (pageCount !== index.assets.length) throw new Error(`generated ${pageCount} pages for ${index.assets.length} assets`);

  const checkedPages = [];
  for (const asset of index.assets.filter((candidate) => candidate.kit === 'outdoor-gear')) {
    const pagePath = join(pagesRoot, asset.kit, asset.id, 'index.html');
    const previewPath = join(pagesRoot, asset.kit, asset.id, 'preview.png');
    const html = readFileSync(pagePath, 'utf8');
    const checks = {
      title: html.includes(`<h1>${asset.title}</h1>`),
      preview: existsSync(previewPath) && html.includes('src="preview.png"'),
      studioLink: html.includes(`catalog=${asset.kit}/${asset.id}`),
      exactKnobNames: asset.params.every((param) => html.includes(`<code>${param.name}</code>`)),
      triangleStats: html.includes(`<dt>Triangles</dt><dd>${asset.stats.triangles} `),
    };
    if (Object.values(checks).some((pass) => !pass)) {
      throw new Error(`${asset.id} page check failed: ${JSON.stringify(checks)}`);
    }
    checkedPages.push({ id: asset.id, knobs: asset.params.map((param) => param.name), ...checks });
  }

  const report = {
    checkedAt: new Date().toISOString(),
    method: 'npx tsx docs/demos/catalog-wave-2/check-pages.mts',
    localOnly: true,
    totalIndexedAssets: index.assets.length,
    generatedAssetPages: pageCount,
    outdoorGearPages: checkedPages.length,
    checkedOutdoorGearPages: checkedPages,
    liveDeployment: 'not verified by this local static build',
  };
  writeFileSync(join(here, 'catalog-pages-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`verified ${checkedPages.length} outdoor-gear pages among ${pageCount} generated catalog pages`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
