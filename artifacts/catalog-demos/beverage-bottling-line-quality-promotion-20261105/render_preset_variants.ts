// SPDX-License-Identifier: MIT
// Render true catalog preset variants through the same source override path as
// get_variant. The default previews come from the normal catalog preview job.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { loadAssetCatalog, readAssetSource, variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const bundleDir = join(repoRoot, 'artifacts/catalog-demos/beverage-bottling-line-quality-promotion-20261105');
const evidenceDir = join(bundleDir, 'evidence');
const sourceKitDir = join(repoRoot, 'catalog/kits/beverage-bottling-line');
const featured = ['beverage-blend-tank', 'bottle-case-packer', 'rotary-filler'];

mkdirSync(evidenceDir, { recursive: true });
await initOcct();

const { dir, index } = loadAssetCatalog({ reload: true });
for (const id of featured) {
  const asset = index.assets.find((row) => row.kit === 'beverage-bottling-line' && row.id === id);
  if (asset === undefined) throw new Error(`missing catalog row for ${id}`);
  const source = readAssetSource(dir, asset);
  const preset = asset.presets.sanitaryLine;
  if (preset === undefined) throw new Error(`${id} has no sanitaryLine preset`);

  copyFileSync(join(sourceKitDir, 'previews', `${id}.png`), join(evidenceDir, `${id}-default.png`));
  const code = variantSource(source, preset);
  const result = await runAndExport({
    code,
    fileName: `${id}.kcad.ts`,
    scriptDir: sourceKitDir,
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(`${id} preset export failed: ${errors.map((item) => item.message).join('; ') || 'empty GLB'}`);
  }
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
    label: `${asset.title} · sanitaryLine · ${asset.stats.triangles} tris`,
  });
  writeFileSync(join(evidenceDir, `${id}-sanitaryLine.png`), png);
  console.log(`${id}: rendered sanitaryLine preset from catalog index values`);
  await resetOcct();
}
