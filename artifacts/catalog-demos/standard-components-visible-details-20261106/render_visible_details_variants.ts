// Render the actual size choices and named palettes from the three edited sources.
// Run: npx tsx artifacts/catalog-demos/standard-components-visible-details-20261106/render_visible_details_variants.ts
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
  { id: 'timing-belt-pulley', maxTriangles: 1380 },
  { id: 'door-hinge', maxTriangles: 1600 },
  { id: 'din-rail-terminal-block', maxTriangles: 500 },
];
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

function readPreset(source: string, assetId: string, name: string): Record<string, string> {
  const match = source.match(new RegExp(`${name}:\\s*(\\{[^\\n]+\\})`));
  if (!match) throw new Error(`could not read ${name} preset from ${assetId}`);
  const json = match[1]!
    .replace(/([A-Za-z_]\w*)\s*:/g, '"$1":')
    .replaceAll("'", '"');
  return JSON.parse(json) as Record<string, string>;
}

await initOcct();
const reports = [];
for (const target of targets) {
  const sourcePath = resolve(root, `catalog/kits/standard-components/${target.id}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  const variants = [
    { suffix: 'standard', values: {} },
    { suffix: 'compact', values: { size: 'compact' } },
    { suffix: 'large', values: { size: 'large' } },
    { suffix: 'dark', values: readPreset(source, target.id, 'dark') },
    { suffix: 'brass', values: readPreset(source, target.id, 'brass') },
    { suffix: 'weathered', values: readPreset(source, target.id, 'weathered') },
  ];
  for (const variant of variants) {
    const id = `${target.id}-${variant.suffix}`;
    const code = Object.keys(variant.values).length ? variantSource(source, variant.values) : source;
    const exported = await runAndExport({
      code,
      fileName: `${target.id}.kcad.ts`,
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: target.maxTriangles } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length || exported.bytes.byteLength === 0) {
      throw new Error(`${id} export failed: ${errors.map((error) => error.message).join('; ')}`);
    }
    const triangles = await glbTriangles(exported.bytes);
    const points = triangles.flatMap((triangle) => triangle.v);
    const dimensionsMm = [0, 1, 2].map((axis) => {
      const values = points.map((point) => point[axis]!);
      return Math.round((Math.max(...values) - Math.min(...values)) * 1000 * 10) / 10;
    });
    const pngPath = resolve(outputDir, `${id}.png`);
    writeFileSync(pngPath, await renderTrianglesPng(triangles, {
      label: `${target.id} · ${variant.suffix}`,
      frameHeightM: 0.075,
    }));
    reports.push({
      id,
      assetId: target.id,
      variant: variant.suffix,
      values: variant.values,
      dimensionsMm,
      triangles: triangles.length,
      png: relative(root, pngPath),
    });
    await resetOcct();
  }
}

const evidence = {
  sources: targets.map(({ id, maxTriangles }) => ({
    source: `catalog/kits/standard-components/${id}.kcad.ts`,
    sourceSha256: createHash('sha256').update(readFileSync(resolve(root, `catalog/kits/standard-components/${id}.kcad.ts`))).digest('hex'),
    triangleBudget: maxTriangles,
  })),
  invocation: 'npx tsx artifacts/catalog-demos/standard-components-visible-details-20261106/render_visible_details_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  renders: reports,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
