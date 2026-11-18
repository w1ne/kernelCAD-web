// Render the source's actual photo/video studio presets on a DSLR camera.
// Run: npx tsx artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_presets.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const assetId = 'digital-slr-camera';
const sourcePath = resolve(root, `catalog/kits/photo-video-studio/${assetId}.kcad.ts`);
const sourceCode = readFileSync(sourcePath, 'utf8');
const outputDir = resolve(bundle, 'preset-variants');
mkdirSync(outputDir, { recursive: true });

function readPreset(name: string): Record<string, string> {
  const match = sourceCode.match(new RegExp(`${name}:\\s*(\\{[^\\n]+\\})`));
  if (!match) throw new Error(`could not read ${name} preset from ${sourcePath}`);
  const json = match[1]!
    .replace(/([A-Za-z_]\w*)\s*:/g, '"$1":')
    .replaceAll("'", '"');
  return JSON.parse(json) as Record<string, string>;
}

await initOcct();
const renders = [];
for (const variant of [
  { id: 'studioBlack', values: readPreset('studioBlack') },
  { id: 'fieldRental', values: readPreset('fieldRental') },
]) {
  const code = variantSource(sourceCode, variant.values);
  const exported = await runAndExport({
    code,
    fileName: `${assetId}.kcad.ts`,
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length || exported.bytes.byteLength === 0) {
    throw new Error(`${variant.id} export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const pngPath = resolve(outputDir, `${variant.id}.png`);
  writeFileSync(pngPath, await renderTrianglesPng(await glbTriangles(exported.bytes), {
    label: `Digital SLR camera · ${variant.id} preset`,
  }));
  renders.push({ id: variant.id, values: variant.values, triangles: exported.extras?.stats?.triangles, png: `preset-variants/${variant.id}.png` });
  await resetOcct();
}

const evidence = {
  source: 'catalog/kits/photo-video-studio/digital-slr-camera.kcad.ts',
  sourceSha256: createHash('sha256').update(sourceCode).digest('hex'),
  invocation: 'npx tsx artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_presets.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: 1800 } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants: renders,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
