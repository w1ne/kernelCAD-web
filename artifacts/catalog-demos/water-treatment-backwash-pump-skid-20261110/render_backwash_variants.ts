// Render the source-defined single/duplex geometry and highVisibility palette.
// Run: npx tsx artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/render_backwash_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const index = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{
    id: string;
    kit: string;
    source: string;
    title: string;
    triangleBudget: number;
    presets?: Record<string, Record<string, string | number | boolean>>;
  }>;
};
const asset = index.assets.find((row) => row.kit === 'water-treatment' && row.id === 'backwash-pump-skid');
if (asset === undefined) throw new Error('missing indexed asset water-treatment/backwash-pump-skid');
const highVisibility = asset.presets?.highVisibility;
if (highVisibility === undefined) throw new Error('asset has no indexed highVisibility preset');

const source = readFileSync(resolve(root, asset.source), 'utf8');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const plans = [
  { name: 'single', values: { pumpArrangement: 'single' } },
  { name: 'duplex', values: { pumpArrangement: 'duplex' } },
  { name: 'duplex-high-visibility', values: { ...highVisibility, pumpArrangement: 'duplex' } },
];
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });
await initOcct();
const variants = [];

for (const plan of plans) {
  const glb = await exportLowPolyAsset(variantSource(source, plan.values), basename(asset.source));
  const triangles = await glbTriangles(glb);
  if (triangles.length > asset.triangleBudget) {
    throw new Error(`${plan.name}: ${triangles.length} triangles exceeds budget ${asset.triangleBudget}`);
  }
  const png = `backwash-pump-skid-${plan.name}.png`;
  writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
    size: 720,
    label: `${asset.title} · ${plan.name} · ${triangles.length} tris`,
  }));
  variants.push({
    asset: 'water-treatment/backwash-pump-skid',
    variant: plan.name,
    values: plan.values,
    sourceSha256,
    triangles: triangles.length,
    triangleBudget: asset.triangleBudget,
    png: `variants/${png}`,
  });
  await resetOcct();
}

const evidence = {
  command: 'npx tsx artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/render_backwash_variants.ts',
  exporter: 'exportLowPolyAsset(variantSource(source, indexedPresetAndChoice), sourceFileName)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
