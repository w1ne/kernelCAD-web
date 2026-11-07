// Export exact clinic and emergency presets from the indexed medical sources.
// Run: npx tsx artifacts/catalog-demos/medical-materials-quality-20261106/render_medical_variants.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const outputDir = resolve(bundle, 'preset-variants');
const index = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{
    id: string;
    kit: string;
    source: string;
    sourceSha256: string;
    triangleBudget: number;
    stats: { triangles: number };
    presets: Record<string, Record<string, string>>;
  }>;
};
mkdirSync(outputDir, { recursive: true });

const targets = [
  { assetId: 'wheelchair', preset: 'clinic' },
  { assetId: 'wheelchair', preset: 'emergency' },
  { assetId: 'diagnostic-monitor', preset: 'clinic' },
  { assetId: 'diagnostic-monitor', preset: 'emergency' },
  { assetId: 'erlenmeyer-flask', preset: 'clinic' },
  { assetId: 'erlenmeyer-flask', preset: 'emergency' },
];

await initOcct();
const variants = [];
for (const target of targets) {
  const asset = index.assets.find((row) => row.id === target.assetId && row.kit === 'medical');
  if (asset === undefined) throw new Error(`missing indexed medical/${target.assetId}`);
  const values = asset.presets[target.preset];
  if (values === undefined) throw new Error(`${target.assetId}: missing preset ${target.preset}`);
  const sourcePath = resolve(root, asset.source);
  const source = readFileSync(sourcePath, 'utf8');
  const exported = await runAndExport({
    code: variantSource(source, values),
    fileName: `${target.assetId}.kcad.ts`,
    scriptDir: dirname(sourcePath),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || exported.bytes.byteLength === 0) {
    throw new Error(`${target.assetId}/${target.preset} export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const file = `${target.assetId}-${target.preset}.png`;
  writeFileSync(resolve(outputDir, file), await renderTrianglesPng(await glbTriangles(exported.bytes), {
    size: 640,
    label: `${target.assetId} · ${target.preset}`,
  }));
  variants.push({
    assetId: target.assetId,
    preset: target.preset,
    values,
    source: asset.source,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangles: asset.stats.triangles,
    triangleBudget: asset.triangleBudget,
    png: `preset-variants/${file}`,
  });
  await resetOcct();
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/medical-materials-quality-20261106/render_medical_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: indexed triangleBudget } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
