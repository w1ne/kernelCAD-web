// Render actual size choices and named presets from the catalog source.
// Run: npx tsx artifacts/catalog-demos/standard-components-carriage-quality-20261106/render_carriage_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const assetId = 'linear-guide-carriage';
const sourcePath = resolve(root, `catalog/kits/standard-components/${assetId}.kcad.ts`);
const sourceCode = readFileSync(sourcePath, 'utf8');
const outputDir = resolve(bundle, 'variants');
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
  { id: 'standard-default', values: {} },
  { id: 'compact-default', values: { size: 'compact' } },
  { id: 'large-default', values: { size: 'large' } },
  { id: 'standard-dark', values: readPreset('dark') },
  { id: 'standard-brass', values: readPreset('brass') },
  { id: 'standard-weathered', values: readPreset('weathered') },
]) {
  const code = Object.keys(variant.values).length ? variantSource(sourceCode, variant.values) : sourceCode;
  const exported = await runAndExport({
    code,
    fileName: `${assetId}.kcad.ts`,
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 460 } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length || exported.bytes.byteLength === 0) {
    throw new Error(`${variant.id} export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const triangles = await glbTriangles(exported.bytes);
  const points = triangles.flatMap((triangle) => triangle.v);
  const bounds = [0, 1, 2].map((axis) => {
    const values = points.map((point) => point[axis]!);
    return Math.round((Math.max(...values) - Math.min(...values)) * 1000 * 10) / 10;
  });
  const pngPath = resolve(outputDir, `${variant.id}.png`);
  writeFileSync(pngPath, await renderTrianglesPng(triangles, {
    label: `${assetId} · ${variant.id}`,
    frameHeightM: 0.09,
  }));
  renders.push({
    id: variant.id,
    values: variant.values,
    dimensionsMm: bounds,
    triangles: triangles.length,
    png: relative(root, pngPath),
  });
  await resetOcct();
}

const evidence = {
  source: 'catalog/kits/standard-components/linear-guide-carriage.kcad.ts',
  sourceSha256: createHash('sha256').update(sourceCode).digest('hex'),
  invocation: 'npx tsx artifacts/catalog-demos/standard-components-carriage-quality-20261106/render_carriage_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: 460 } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  renders,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
