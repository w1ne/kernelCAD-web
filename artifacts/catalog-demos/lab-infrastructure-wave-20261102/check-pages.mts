// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const outputDir = mkdtempSync(join(tmpdir(), 'kcad-lab-infrastructure-pages-'));
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
  const generatedPages = readdirSync(pagesRoot).filter((kit) => statSync(join(pagesRoot, kit)).isDirectory())
    .flatMap((kit) => readdirSync(join(pagesRoot, kit)).map((id) => join(pagesRoot, kit, id, 'index.html')))
    .filter(existsSync).length;
  if (generatedPages !== index.assets.length) {
    throw new Error(`generated ${generatedPages} asset pages for ${index.assets.length} indexed assets`);
  }

  const rows = index.assets.filter((asset) => asset.kit === 'lab-infrastructure');
  if (rows.length !== 60) throw new Error(`expected 60 laboratory infrastructure rows, found ${rows.length}`);
  const checkedPages = [];
  for (const asset of rows) {
    const pagePath = join(pagesRoot, asset.kit, asset.id, 'index.html');
    const previewPath = join(pagesRoot, asset.kit, asset.id, 'preview.png');
    const html = readFileSync(pagePath, 'utf8');
    const checks = {
      title: html.includes(`<h1>${asset.title}</h1>`),
      preview: existsSync(previewPath) && html.includes('src="preview.png"'),
      studioLink: html.includes(`catalog=${asset.kit}/${asset.id}`),
      exactKnobNames: asset.params.length === 3 && asset.params.every((param) => html.includes(`<code>${param.name}</code>`)),
      triangleStats: html.includes(`<dt>Triangles</dt><dd>${asset.stats.triangles} `),
    };
    if (Object.values(checks).some((pass) => !pass)) {
      throw new Error(`${asset.id} page check failed: ${JSON.stringify(checks)}`);
    }
    checkedPages.push({ id: asset.id, knobs: asset.params.map((param) => param.name), triangles: asset.stats.triangles, ...checks });
  }

  const report = {
    checkedAt: new Date().toISOString(),
    method: 'npx tsx artifacts/catalog-demos/lab-infrastructure-wave-20261102/check-pages.mts',
    localOnly: true,
    totalIndexedAssets: index.assets.length,
    generatedAssetPages: generatedPages,
    laboratoryInfrastructurePages: checkedPages.length,
    checkedLaboratoryInfrastructurePages: checkedPages,
    liveDeployment: 'not verified; this branch has not been deployed',
  };
  writeFileSync(join(here, 'catalog-pages-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`verified ${checkedPages.length} laboratory infrastructure pages among ${generatedPages} generated catalog pages`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
