// Render both named scissors palettes from the edited kernelCAD source.
// Run: npx tsx artifacts/catalog-demos/office-scissors-detail-20261106/render_scissors_presets.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const sourcePath = resolve(root, 'catalog/kits/office/scissors.kcad.ts');
const source = readFileSync(sourcePath, 'utf8');
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

function readPreset(name: string): Record<string, string> {
  const match = source.match(new RegExp(`${name}:\\s*(\\{[^\\n]+\\})`));
  if (!match) throw new Error(`could not read ${name} preset`);
  const json = match[1]!
    .replace(/([A-Za-z_]\w*)\s*:/g, '"$1":')
    .replaceAll("'", '"');
  return JSON.parse(json) as Record<string, string>;
}

await initOcct();
const variants = [];
for (const preset of ['professional', 'classroom']) {
  const values = readPreset(preset);
  const exported = await runAndExport({
    code: variantSource(source, values),
    fileName: 'scissors.kcad.ts',
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 360 } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length || exported.bytes.byteLength === 0) {
    throw new Error(`scissors/${preset} export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const triangles = await glbTriangles(exported.bytes);
  const png = `scissors-${preset}.png`;
  writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
    label: `office scissors · ${preset}`,
  }));
  variants.push({
    preset,
    values,
    triangles: triangles.length,
    png: `variants/${png}`,
  });
  await resetOcct();
}

const evidence = {
  source: 'catalog/kits/office/scissors.kcad.ts',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  invocation: 'npx tsx artifacts/catalog-demos/office-scissors-detail-20261106/render_scissors_presets.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: 360 } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'preset-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
