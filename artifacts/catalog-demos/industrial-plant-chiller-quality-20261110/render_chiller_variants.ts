// Render source-defined chiller size and palette choices.
// Run from the repository root with:
// npx tsx artifacts/catalog-demos/industrial-plant-chiller-quality-20261110/render_chiller_variants.ts
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
    params: Array<{ name: string; choices?: string[] }>;
  }>;
};
const asset = index.assets.find((row) => row.kit === 'industrial-plant' && row.id === 'centrifugal-chiller');
if (asset === undefined) throw new Error('missing indexed asset industrial-plant/centrifugal-chiller');
if (!asset.params.some((param) => param.name === 'shellCapacity' && param.choices?.join(',') === 'compact,large')) {
  throw new Error('compact/large shell choice is missing from the indexed asset');
}

const source = readFileSync(resolve(root, asset.source), 'utf8');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const presets = asset.presets ?? {};
const plans = [
  { name: 'large-plant', values: { ...(presets.plant ?? {}), shellCapacity: 'large' } },
  { name: 'compact-weathered', values: { ...(presets.weathered ?? {}), shellCapacity: 'compact' } },
  { name: 'large-high-visibility', values: { ...(presets.highVisibility ?? {}), shellCapacity: 'large' } },
  { name: 'compact-stainless', values: { ...(presets.stainless ?? {}), shellCapacity: 'compact' } },
];
if (plans.some((plan) => Object.keys(plan.values).length < 5)) throw new Error('one or more named palette presets are missing');

const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });
const variants: Array<Record<string, unknown> & { name: string; widthM: number }> = [];
await initOcct();

for (const plan of plans) {
  const glb = await exportLowPolyAsset(variantSource(source, plan.values), basename(asset.source));
  const triangles = await glbTriangles(glb);
  if (triangles.length > asset.triangleBudget) {
    throw new Error(`${plan.name}: ${triangles.length} triangles exceeds budget ${asset.triangleBudget}`);
  }
  const vertices = triangles.flatMap((triangle) => triangle.v);
  const bounds = [0, 1, 2].map((axis) => {
    const values = vertices.map((vertex) => vertex[axis]!);
    return [Math.min(...values), Math.max(...values)];
  });
  const widthM = bounds[0]![1]! - bounds[0]![0]!;
  const colors = new Set(triangles.map((triangle) => triangle.color.map((channel) => Math.round(channel * 255)).join(',')));
  const png = `centrifugal-chiller-${plan.name}.png`;
  writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
    size: 720,
    label: `${asset.title} · ${plan.name} · ${triangles.length} tris`,
  }));
  variants.push({
    asset: 'industrial-plant/centrifugal-chiller',
    name: plan.name,
    values: plan.values,
    sourceSha256,
    triangles: triangles.length,
    triangleBudget: asset.triangleBudget,
    uniqueColors: colors.size,
    boundsM: { x: bounds[0], y: bounds[1], z: bounds[2] },
    widthM,
    png: `variants/${png}`,
  });
  await resetOcct();
}

const compact = variants.find((variant) => variant.name === 'compact-weathered');
const large = variants.find((variant) => variant.name === 'large-plant');
if (compact === undefined || large === undefined || large.widthM - compact.widthM < 0.08) {
  throw new Error('compact/large choice did not produce a measurable width change');
}

const evidence = {
  command: 'npx tsx artifacts/catalog-demos/industrial-plant-chiller-quality-20261110/render_chiller_variants.ts',
  exporter: 'exportLowPolyAsset(variantSource(source, indexedChoicesAndPresets), sourceFileName)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
  geometryChoiceCheck: {
    compactWidthM: compact.widthM,
    largeWidthM: large.widthM,
    changedByAtLeast80mm: true,
  },
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
