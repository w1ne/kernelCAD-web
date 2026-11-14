// Render each changed office tool's source-defined material presets.
// Run: npx tsx artifacts/catalog-demos/office-tools-silhouette-20261110/render_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const outputDir = resolve(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

const assets = [
  { id: 'highlighter', budget: 320 },
  { id: 'mechanical-pencil', budget: 900 },
];

function readPreset(source: string, name: string): Record<string, string> {
  const match = source.match(new RegExp(`\\b${name}:\\s*(\\{[^}]*\\})`));
  if (!match) throw new Error(`could not read ${name} preset`);
  const json = match[1]!
    .replace(/([A-Za-z_]\w*)\s*:/g, '"$1":')
    .replaceAll("'", '"')
    .replace(/,\s*}/g, '}');
  return JSON.parse(json) as Record<string, string>;
}

await initOcct();
const variants = [];
for (const asset of assets) {
  const sourcePath = resolve(root, `catalog/kits/office/${asset.id}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  for (const preset of ['professional', 'classroom']) {
    const values = readPreset(source, preset);
    const exported = await runAndExport({
      code: variantSource(source, values),
      fileName: `${asset.id}.kcad.ts`,
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.budget } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length || exported.bytes.byteLength === 0) {
      throw new Error(`${asset.id}/${preset} export failed: ${errors.map((error) => error.message).join('; ')}`);
    }
    const triangles = await glbTriangles(exported.bytes);
    if (triangles.length > asset.budget) {
      throw new Error(`${asset.id}/${preset} has ${triangles.length} triangles over ${asset.budget}`);
    }
    const png = `${asset.id}-${preset}.png`;
    writeFileSync(resolve(outputDir, png), await renderTrianglesPng(triangles, {
      label: `office ${asset.id} · ${preset}`,
    }));
    variants.push({
      asset: asset.id,
      preset,
      values,
      triangles: triangles.length,
      budget: asset.budget,
      png: `variants/${png}`,
    });
    await resetOcct();
  }
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/office-tools-silhouette-20261110/render_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly.maxTriangles=source triangleBudget })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  assets: assets.map((asset) => {
    const source = readFileSync(resolve(root, `catalog/kits/office/${asset.id}.kcad.ts`), 'utf8');
    return {
      id: asset.id,
      source: `catalog/kits/office/${asset.id}.kcad.ts`,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      triangleBudget: asset.budget,
    };
  }),
  variants,
};
writeFileSync(resolve(bundle, 'variant-renders.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
