// SPDX-License-Identifier: MIT
// Render catalog presets through the same source-override path as get_variant.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { loadAssetCatalog, readAssetSource, variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const bundleDir = join(repoRoot, 'artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105');
const evidenceDir = join(bundleDir, 'evidence');
const sourceKitDir = join(repoRoot, 'catalog/kits/ev-charging-infrastructure');
const featured = [
  { id: 'compact-dc-fast-charger', presets: ['fleetReady', 'nightService'] },
  { id: 'nacs-connector', presets: ['fleetReady'] },
  { id: 'solar-ev-carport', presets: ['fleetReady'] },
];

mkdirSync(evidenceDir, { recursive: true });
await initOcct();

const { dir, index } = loadAssetCatalog({ reload: true });
for (const item of featured) {
  const asset = index.assets.find((row) => row.kit === 'ev-charging-infrastructure' && row.id === item.id);
  if (asset === undefined) throw new Error(`missing catalog row for ${item.id}`);
  const source = readAssetSource(dir, asset);
  copyFileSync(join(sourceKitDir, 'previews', `${item.id}.png`), join(evidenceDir, `${item.id}-default.png`));
  for (const presetName of item.presets) {
    const preset = asset.presets[presetName];
    if (preset === undefined) throw new Error(`${item.id} has no ${presetName} preset`);
    const result = await runAndExport({
      code: variantSource(source, preset),
      fileName: `${item.id}.kcad.ts`,
      scriptDir: sourceKitDir,
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
    });
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length > 0 || result.bytes.byteLength === 0) {
      throw new Error(`${item.id}/${presetName} export failed: ${errors.map((entry) => entry.message).join('; ') || 'empty GLB'}`);
    }
    const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
      label: `${asset.title} · ${presetName} · ${asset.stats.triangles} tris`,
    });
    writeFileSync(join(evidenceDir, `${item.id}-${presetName}.png`), png);
    console.log(`${item.id}: rendered ${presetName} from catalog preset values`);
    await resetOcct();
  }
}
