// Render the source-defined receiver sizes, pump arrangements and palettes.
// Run from the repository root with: npx tsx artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/render_air_compressor_variants.ts
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
const asset = index.assets.find((row) => row.kit === 'industrial-plant' && row.id === 'air-compressor');
if (asset === undefined) throw new Error('missing indexed asset industrial-plant/air-compressor');
const weathered = asset.presets?.weathered;
const highVisibility = asset.presets?.highVisibility;
if (weathered === undefined || highVisibility === undefined) throw new Error('asset palettes are missing');

const source = readFileSync(resolve(root, asset.source), 'utf8');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const plans = [
  { name: '120-twin-plant', values: { receiverCapacity: '120-gallon', pumpArrangement: 'twin' } },
  { name: '80-single-weathered', values: { ...weathered, receiverCapacity: '80-gallon', pumpArrangement: 'single' } },
  { name: '120-twin-high-visibility', values: { ...highVisibility, receiverCapacity: '120-gallon', pumpArrangement: 'twin' } },
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
  const png = `air-compressor-${plan.name}.png`;
  writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
    size: 720,
    label: `${asset.title} · ${plan.name} · ${triangles.length} tris`,
  }));
  variants.push({
    asset: 'industrial-plant/air-compressor',
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
  command: 'npx tsx artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/render_air_compressor_variants.ts',
  exporter: 'exportLowPolyAsset(variantSource(source, indexedPresetAndChoices), sourceFileName)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
