// Render source-defined highVisibility palettes and equipment-size choices.
// Run: npx tsx artifacts/catalog-demos/water-treatment-pump-geometry-20261106/render_water_treatment_variants.ts
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
    presets?: Record<string, Record<string, string | number | boolean>>;
  }>;
};
const plans = [
  { id: 'high-lift-pump-skid', name: 'highVisibility', values: { pumpCapacity: 'highFlow' } },
  { id: 'horizontal-split-case-pump', name: 'highVisibility', values: { casingSize: 'heavyDuty' } },
  { id: 'reverse-osmosis-skid', name: 'two-vessels', values: { membraneVessels: '2' } },
  { id: 'reverse-osmosis-skid', name: 'four-vessels', values: { membraneVessels: '4' } },
];

const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });
await initOcct();
const variants = [];

for (const plan of plans) {
  const asset = index.assets.find((row) => row.kit === 'water-treatment' && row.id === plan.id);
  if (asset === undefined) throw new Error(`missing indexed asset water-treatment/${plan.id}`);
  const palette = asset.presets?.highVisibility;
  if (palette === undefined) throw new Error(`water-treatment/${plan.id} has no indexed highVisibility preset`);
  const source = readFileSync(resolve(root, asset.source), 'utf8');
  const values = { ...palette, ...plan.values };
  const glb = await exportLowPolyAsset(variantSource(source, values), basename(asset.source));
  const triangles = await glbTriangles(glb);
  const png = `${plan.id}-${plan.name}.png`;
  writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
    size: 720,
    label: `${asset.title} · ${plan.name}`,
  }));
  variants.push({
    asset: `water-treatment/${plan.id}`,
    variant: plan.name,
    values,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangles: triangles.length,
    png: `variants/${png}`,
  });
  await resetOcct();
}

const evidence = {
  command: 'npx tsx artifacts/catalog-demos/water-treatment-pump-geometry-20261106/render_water_treatment_variants.ts',
  exporter: 'exportLowPolyAsset(variantSource(source, indexedPresetAndChoice), sourceFileName)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
