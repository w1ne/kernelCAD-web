// SPDX-License-Identifier: MIT
// Render the existing pressure-filter palettes, including a side inspection view.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const sourcePath = join(root, 'catalog/kits/water-treatment/pressure-sand-filter-vessel.kcad.ts');
const source = readFileSync(sourcePath, 'utf8');
const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
if (!Number.isFinite(budget) || budget <= 0) throw new Error('missing triangleBudget');
const presetMatch = source.match(/presets\s*\(\s*\{([\s\S]*?)\}\s*\);/);
if (presetMatch === null) throw new Error('missing presets(...) block');
const presets = Object.fromEntries([...presetMatch[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, name, body]) => [
  name!, Object.fromEntries([...body!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#[0-9a-fA-F]{6})'/g)].map(([, key, color]) => [key!, color!])),
]));
const variants = [
  { id: 'weathered', preset: 'weathered', yawDeg: 35, pitchDeg: 22 },
  { id: 'highVisibility-side', preset: 'highVisibility', yawDeg: 90, pitchDeg: 18 },
];
const outDir = join(bundle, 'variants');
mkdirSync(outDir, { recursive: true });
await initOcct();
const manifest = [];
for (const variant of variants) {
  const colors = presets[variant.preset];
  if (colors === undefined) throw new Error(`missing preset ${variant.preset}`);
  const result = await runAndExport({
    code: variantSource(source, colors),
    fileName: 'pressure-sand-filter-vessel.kcad.ts',
    scriptDir: join(root, 'catalog/kits/water-treatment'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) throw new Error(errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB');
  const view = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
  const json = JSON.parse(new TextDecoder().decode(result.bytes.subarray(20, 20 + view.getUint32(12, true))));
  const stats = json.asset?.extras?.kernelcad?.stats;
  if (stats === undefined || stats.triangles > budget) throw new Error(`${variant.id}: invalid stats or over budget`);
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
    label: `Pressure sand filter vessel · ${variant.preset}`,
    yawDeg: variant.yawDeg,
    pitchDeg: variant.pitchDeg,
  });
  writeFileSync(join(outDir, `${variant.id}.png`), png);
  manifest.push({
    id: variant.id,
    preset: variant.preset,
    yawDeg: variant.yawDeg,
    pitchDeg: variant.pitchDeg,
    triangles: stats.triangles,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    pngSha256: createHash('sha256').update(png).digest('hex'),
  });
  await resetOcct();
}
if (manifest[0]?.pngSha256 === manifest[1]?.pngSha256) throw new Error('presets/views did not produce distinct renders');
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify({
  invocation: 'npx tsx artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_variants.ts',
  renderer: 'variantSource + runAndExport(format="glb", style="lowpoly") + catalog software renderer',
  budget,
  variants: manifest,
}, null, 2)}\n`);
console.log(`Rendered ${manifest.length} source-defined palettes/inspection views.`);
