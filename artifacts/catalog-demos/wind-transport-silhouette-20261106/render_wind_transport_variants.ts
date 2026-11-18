// Render source-defined palettes and real shape choices for the refined wind-energy transport and access assets.
// Run: npx tsx artifacts/catalog-demos/wind-transport-silhouette-20261106/render_wind_transport_variants.ts
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
    id: 'blade-transport-saddle',
    triangleBudget: 1800,
    shapeVariant: { suffix: 'root-empty', values: { section: 'root', load: 'empty' } },
  },
  {
    id: 'nacelle-transport-frame',
    triangleBudget: 2400,
    shapeVariant: { suffix: 'empty-trestle', values: { load: 'empty', feet: 'trestle' } },
  },
  {
    id: 'service-lift-cage',
    triangleBudget: 2400,
    shapeVariant: { suffix: 'ladder-door-open', values: { guidance: 'ladder', door: 'open' } },
  },
];
const only = process.argv.slice(2);
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

function readPresets(source: string): Record<string, Record<string, string>> {
  const match = source.match(/presets\(\s*\{([\s\S]*?)\}\s*\);/);
  if (match === null) throw new Error('Source has no presets() block');
  return Object.fromEntries(
    [...match[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([\s\S]*?)\}/g)].map(([, name, body]) => [
      name!,
      Object.fromEntries(
        [...body!.matchAll(/['"]?([A-Za-z_]\w*)['"]?\s*:\s*['"](#\w{6})['"]/g)].map(([, key, value]) => [key!, value!]),
      ),
    ]),
  );
}

await initOcct();
const renders = [];
const sources = [];
for (const target of targets.filter((t) => only.length === 0 || only.includes(t.id))) {
  const sourcePath = resolve(root, 'catalog/kits/wind-energy/' + target.id + '.kcad.ts');
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
      scriptDir: resolve(root, 'catalog/kits/wind-energy'),
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
  invocation: 'npx tsx artifacts/catalog-demos/wind-transport-silhouette-20261106/render_wind_transport_variants.ts',
  exporter: 'runAndExport(format="glb", style="lowpoly", maxTriangles=source triangleBudget)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  sources,
  renders,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
