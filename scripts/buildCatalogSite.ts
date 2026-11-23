// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build the complete static catalog surface: HTML, previews, source-generated
// GLB/STEP downloads, and static-host Content-Disposition rules.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeCatalogDownloads } from './buildCatalogDownloads';
import { writeCatalogSite, type CatalogIndex } from './buildCatalogPages';

export async function buildCatalogSite(repoRoot: string, outDir: string): Promise<void> {
  const index = JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')) as CatalogIndex;
  const pageCount = writeCatalogSite(repoRoot, outDir);
  const favicon = join(repoRoot, 'public', 'favicon.svg');
  if (existsSync(favicon)) copyFileSync(favicon, join(outDir, 'favicon.svg'));
  const downloads = await writeCatalogDownloads(repoRoot, outDir);
  const evidenceDir = join(repoRoot, 'docs', 'demos', 'catalog-acquisition');
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'downloads.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'original catalog .kcad.ts files; no third-party meshes',
    outputDirectory: outDir,
    summary: { assets: downloads.assets, glbFiles: downloads.glbFiles, stepFiles: downloads.stepFiles },
    records: downloads.records,
  }, null, 2)}\n`);
  const sitemapUrls = index.assets.length + 1;
  console.log(`wrote ${pageCount} asset page(s) + hub, sitemap.xml and robots.txt to ${outDir}`);
  console.log(`sitemap contains ${sitemapUrls} URL(s)`);
  console.log(`wrote ${downloads.glbFiles} GLB file(s) and ${downloads.stepFiles} STEP file(s) for ${downloads.assets} assets to ${outDir}`);
}
