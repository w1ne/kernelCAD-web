// Render exact named nature-kit presets from their checked-in .kcad.ts source.
// Run: npx tsx artifacts/catalog-demos/nature-quality-20261106/render_nature_presets.ts
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
const targets = [
  { id: 'cairn', presets: ['dark', 'sandstone'] },
  { id: 'pebble-cluster', presets: ['beach', 'red'] },
  { id: 'dead-tree', presets: ['charred', 'bleached'] },
];
mkdirSync(outputDir, { recursive: true });

await initOcct();
const variants = [];
for (const target of targets) {
  const asset = index.assets.find((row) => row.id === target.id && row.kit === 'nature');
  if (asset === undefined) throw new Error(`missing indexed nature asset ${target.id}`);
  const sourcePath = resolve(root, asset.source);
  const source = readFileSync(sourcePath, 'utf8');
  for (const preset of target.presets) {
    const values = asset.presets[preset];
    if (values === undefined) throw new Error(`${target.id}: missing preset ${preset}`);
    const code = variantSource(source, values);
    const exported = await runAndExport({
      code,
      fileName: `${target.id}.kcad.ts`,
      scriptDir: dirname(sourcePath),
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length > 0 || exported.bytes.byteLength === 0) {
      throw new Error(`${target.id}/${preset} export failed: ${errors.map((error) => error.message).join('; ')}`);
    }
    const file = `${target.id}-${preset}.png`;
    writeFileSync(resolve(outputDir, file), await renderTrianglesPng(await glbTriangles(exported.bytes), {
      size: 640,
      label: `${target.id.replaceAll('-', ' ')} · ${preset}`,
    }));
    variants.push({
      assetId: target.id,
      preset,
      values,
      source: asset.source,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      triangles: asset.stats.triangles,
      triangleBudget: asset.triangleBudget,
      png: `preset-variants/${file}`,
    });
    await resetOcct();
  }
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/nature-quality-20261106/render_nature_presets.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: indexed triangleBudget } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
