// Render the exact colour assignments declared by a catalog asset's presets.
// Run: npx tsx artifacts/catalog-demos/wind-energy-quality-20261105/render_preset_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const assetId = 'horizontal-axis-wind-turbine';
const source = resolve(root, `catalog/kits/wind-energy/${assetId}.kcad.ts`);
const sourceCode = readFileSync(source, 'utf8');
const outputDir = resolve(bundle, 'preset-variants');
mkdirSync(outputDir, { recursive: true });

const presetMatch = sourceCode.match(/presets\(\{\s*\n\s*weathered:\s*(\{[^\n]+\}),\s*\n\s*highVisibility:\s*(\{[^\n]+\}),/);
if (!presetMatch) throw new Error(`could not read named presets from ${source}`);
const variants = [
  { id: 'weathered', values: JSON.parse(presetMatch[1]!) as Record<string, string> },
  { id: 'highVisibility', values: JSON.parse(presetMatch[2]!) as Record<string, string> },
];

await initOcct();
const renders = [];
for (const variant of variants) {
  const code = variantSource(sourceCode, variant.values);
  const exported = await runAndExport({
    code,
    fileName: `${assetId}.kcad.ts`,
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 550 } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length || exported.bytes.byteLength === 0) {
    throw new Error(`${variant.id} preset export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const pngPath = resolve(outputDir, `${variant.id}.png`);
  writeFileSync(pngPath, await renderTrianglesPng(await glbTriangles(exported.bytes), {
    label: `Horizontal-axis wind turbine · ${variant.id}`,
  }));
  renders.push({ id: variant.id, values: variant.values, triangles: exported.extras?.stats?.triangles, png: pngPath });
  await resetOcct();
}

const evidence = {
  source: 'catalog/kits/wind-energy/horizontal-axis-wind-turbine.kcad.ts',
  sourceSha256: createHash('sha256').update(sourceCode).digest('hex'),
  invocation: 'npx tsx artifacts/catalog-demos/wind-energy-quality-20261105/render_preset_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: 550 } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants: renders,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
