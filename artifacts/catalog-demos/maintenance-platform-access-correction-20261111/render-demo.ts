// SPDX-License-Identifier: MIT
// Rebuild the before and after source snapshots using the catalog GLB pipeline,
// then write the standard and alternate software-rendered views.
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const sourceDir = resolve(bundle, 'source');
const previewDir = resolve(bundle, 'previews');
const source = 'catalog/kits/industrial-plant/maintenance-platform.kcad.ts';

await initOcct();
mkdirSync(previewDir, { recursive: true });

for (const revision of ['before', 'after'] as const) {
  const snapshotRoot = resolve(sourceDir, revision);
  const absoluteSource = resolve(snapshotRoot, source);
  const { asset, glb } = await buildCatalogAssetWithGlb(snapshotRoot, relative(snapshotRoot, absoluteSource));
  const triangles = await glbTriangles(glb);
  const label = `${asset.title} · ${asset.stats.triangles} tris`;
  const image = await renderTrianglesPng(triangles, { label });
  writeFileSync(resolve(previewDir, `${revision}.png`), image);
  console.log(`${revision}: ${asset.stats.triangles} triangles, ${asset.stats.sizeM.join(' × ')} m`);

  if (revision === 'after') {
    const alternate = await renderTrianglesPng(triangles, { yawDeg: 120, label });
    writeFileSync(resolve(previewDir, 'after-alternate-view.png'), alternate);
  }
}
