// SPDX-License-Identifier: MIT
// Render the exchanger's stainless preset for the material review.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const source = readFileSync(join(root, 'catalog/kits/industrial-plant/shell-and-tube-exchanger.kcad.ts'), 'utf8');
const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
if (!Number.isFinite(budget) || budget <= 0) throw new Error('missing triangleBudget');
const presetMatch = source.match(/presets\s*\(\s*\{([\s\S]*?)\}\s*\);/);
if (presetMatch === null) throw new Error('missing presets(...) block');
const presets = Object.fromEntries([...presetMatch[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, name, body]) => [
  name!, Object.fromEntries([...body!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#[0-9a-fA-F]{6})'/g)].map(([, key, color]) => [key!, color!])),
]));
const palette = presets.stainless;
if (palette === undefined) throw new Error('missing stainless preset');
const outDir = join(bundle, 'variants');
mkdirSync(outDir, { recursive: true });
await initOcct();
const result = await runAndExport({
  code: variantSource(source, palette),
  fileName: 'shell-and-tube-exchanger.kcad.ts',
  scriptDir: join(root, 'catalog/kits/industrial-plant'),
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
});
const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
if (errors.length > 0 || result.bytes.byteLength === 0) throw new Error(errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB');
const view = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
const json = JSON.parse(new TextDecoder().decode(result.bytes.subarray(20, 20 + view.getUint32(12, true))));
const stats = json.asset?.extras?.kernelcad?.stats;
if (stats === undefined || stats.triangles > budget) throw new Error('stainless preset is invalid or over budget');
const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
  label: `Shell and tube heat exchanger · stainless`,
  yawDeg: 35,
  pitchDeg: 22,
});
writeFileSync(join(outDir, 'stainless.png'), png);
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify({
  invocation: 'npx tsx artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/render_variants.ts',
  renderer: 'variantSource + runAndExport(format="glb", style="lowpoly") + catalog software renderer',
  budget,
  variant: {
    id: 'stainless',
    preset: 'stainless',
    yawDeg: 35,
    pitchDeg: 22,
    triangles: stats.triangles,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    pngSha256: createHash('sha256').update(png).digest('hex'),
  },
}, null, 2)}\n`);
await resetOcct();
console.log(`Rendered stainless preset (${stats.triangles} triangles).`);
