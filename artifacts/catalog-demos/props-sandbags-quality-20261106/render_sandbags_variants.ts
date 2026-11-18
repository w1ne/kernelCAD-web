// Render exact sandbag presets and the curved layout from checked-in source.
// Run: npx tsx artifacts/catalog-demos/props-sandbags-quality-20261106/render_sandbags_variants.ts
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

await initOcct();
const asset = index.assets.find((row) => row.id === 'sandbags' && row.kit === 'props');
if (asset === undefined) throw new Error('missing indexed props/sandbags asset');
const sourcePath = resolve(root, asset.source);
const source = readFileSync(sourcePath, 'utf8');
const targets = [
  ...['military', 'white', 'floodControl'].map((preset) => {
    const values = asset.presets[preset];
    if (values === undefined) throw new Error(`sandbags: missing preset ${preset}`);
    return { key: preset, kind: 'preset', values };
  }),
  { key: 'curved', kind: 'parameter variant', values: { courses: '3', perCourse: '4', layout: 'curved' } },
];
const variants = [];
for (const target of targets) {
  const code = variantSource(source, target.values);
  const exported = await runAndExport({
    code,
    fileName: 'sandbags.kcad.ts',
    scriptDir: dirname(sourcePath),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || exported.bytes.byteLength === 0) {
    throw new Error(`sandbags/${target.key} export failed: ${errors.map((error) => error.message).join('; ')}`);
  }
  const file = `sandbags-${target.key}.png`;
  writeFileSync(resolve(outputDir, file), await renderTrianglesPng(await glbTriangles(exported.bytes), {
    size: 640,
    label: target.kind === 'preset' ? `sandbags · ${target.key}` : 'sandbags · curved layout',
  }));
  variants.push({
    assetId: 'sandbags',
    key: target.key,
    kind: target.kind,
    values: target.values,
    source: asset.source,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangles: asset.stats.triangles,
    triangleBudget: asset.triangleBudget,
    png: `preset-variants/${file}`,
  });
  await resetOcct();
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/props-sandbags-quality-20261106/render_sandbags_variants.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: indexed triangleBudget } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
