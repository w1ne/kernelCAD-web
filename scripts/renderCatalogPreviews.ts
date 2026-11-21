// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Render catalog/kits/<kit>/previews/<id>.png for every catalog asset (or the
// ids given on the command line): the low-poly GLB at default knobs, software
// rendered from a 3/4 view.
//   npx tsx scripts/renderCatalogPreviews.ts [id ...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../src/shared/assets/catalogSchema';
import { glbTriangles, renderTrianglesPng } from './lib/glbSoftwareRender';
import { renderManufacturingCatalogPreview } from './lib/manufacturingCatalogPreview';

const repoRoot = resolve(import.meta.dirname, '..');
const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')));
const only = new Set(process.argv.slice(2));

await initOcct();
for (const row of index.assets) {
  if (only.size > 0 && !only.has(row.id)) continue;
  const isManufacturingCard = row.kit === 'standard-components';
  const built = isManufacturingCard ? undefined : await buildCatalogAssetWithGlb(repoRoot, row.source);
  const dir = join(repoRoot, 'catalog', 'kits', row.kit, 'previews');
  mkdirSync(dir, { recursive: true });
  const png = isManufacturingCard
    ? await renderManufacturingCatalogPreview(join(repoRoot, row.source))
    : await renderTrianglesPng(await glbTriangles(built!.glb), {
      label: `${built!.asset.title} · ${built!.asset.stats.triangles} tris`,
    });
  writeFileSync(join(dir, `${row.id}.png`), png);
  console.log(`${row.kit}/${row.id}: ${row.stats.triangles} tris`);
}
