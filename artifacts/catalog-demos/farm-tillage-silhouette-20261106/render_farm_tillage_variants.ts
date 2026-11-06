// Render source-defined palettes and real shape choices for the refined farm-machinery tillage assets.
// Run: npx tsx artifacts/catalog-demos/farm-tillage-silhouette-20261106/render_farm_tillage_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const targets = [
  {
    id: 'chisel-plow',
    triangleBudget: 3000,
    shapeVariant: { suffix: 'sweep-points', values: { pointStyle: 'sweep' } },
  },
  {
    id: 'subsoiler-implement',
    triangleBudget: 2600,
    shapeVariant: { suffix: 'straight-plain', values: { shankStyle: 'straight', pointWings: 'plain' } },
  },
  {
    id: 'rear-landscape-rake',
    triangleBudget: 2600,
    shapeVariant: { suffix: 'angled-30', values: { rakeAngle: '30' } },
  },
];
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

function readPresets(source: string): Record<string, Record<string, string>> {
  const match = source.match(/presets\(\s*\{([\s\S]*?)\}\s*\);/);
  if (match === null) throw new Error('Source has no presets() block');
  return Object.fromEntries(
    [...match[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([\s\S]*?)\}/g)].map(([, name, body]) => [
      name!,
      Object.fromEntries(
        [...body!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#\w{6})'/g)].map(([, key, value]) => [key!, value!]),
      ),
    ]),
  );
}

await initOcct();
const renders = [];
const sources = [];
for (const target of targets) {
  const sourcePath = resolve(root, 'catalog/kits/farm-machinery/' + target.id + '.kcad.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const presets = readPresets(source);
  sources.push({
    source: relative(root, sourcePath),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangleBudget: target.triangleBudget,
    presets,
  });
  const variants = [
    { suffix: 'default', values: {} },
    target.shapeVariant,
    { suffix: 'weathered', values: presets.weathered ?? {} },
    { suffix: 'highVisibility', values: presets.highVisibility ?? {} },
  ];
  for (const variant of variants) {
    const code = Object.keys(variant.values).length ? variantSource(source, variant.values) : source;
    const exported = await runAndExport({
      code,
      fileName: target.id + '.kcad.ts',
      scriptDir: resolve(root, 'catalog/kits/farm-machinery'),
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: target.triangleBudget } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length > 0 || exported.bytes.byteLength === 0) {
      throw new Error(target.id + '/' + variant.suffix + ': ' + errors.map((error) => error.message).join('; ') || 'empty GLB');
    }
    const triangles = await glbTriangles(exported.bytes);
    const pngPath = resolve(outputDir, target.id + '-' + variant.suffix + '.png');
    writeFileSync(pngPath, await renderTrianglesPng(triangles, {
      label: target.id + ' · ' + variant.suffix,
    }));
    renders.push({
      assetId: target.id,
      variant: variant.suffix,
      values: variant.values,
      triangles: triangles.length,
      png: relative(root, pngPath),
    });
    await resetOcct();
  }
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/farm-tillage-silhouette-20261106/render_farm_tillage_variants.ts',
  exporter: 'runAndExport(format="glb", style="lowpoly", maxTriangles=source triangleBudget)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  sources,
  renders,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
