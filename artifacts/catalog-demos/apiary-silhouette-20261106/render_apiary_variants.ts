// Render source-defined palettes, real shape choices and orthographic check
// views for the rebuilt apiary PPE, smoker and hive tool.
// Run: npx tsx artifacts/catalog-demos/apiary-silhouette-20261106/render_apiary_variants.ts [id ...] [--views]
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
  { id: 'beekeeper-veil-hood', triangleBudget: 2600, shapeVariants: [{ suffix: 'fencing', values: { style: 'fencing' } }] },
  { id: 'beekeeper-jacket', triangleBudget: 2000, shapeVariants: [{ suffix: 'round-veil', values: { veil: 'round' } }] },
  { id: 'beekeeper-gloves', triangleBudget: 1800, shapeVariants: [{ suffix: 'plain', values: { vent: 'plain' } }] },
  { id: 'bee-smoker', triangleBudget: 2000, shapeVariants: [{ suffix: 'no-shield', values: { heatShield: 'none' } }] },
  { id: 'hive-tool', triangleBudget: 800, shapeVariants: [{ suffix: 'standard-rubber', values: { style: 'standard', grip: 'rubber' } }] },
];
const args = process.argv.slice(2);
const views = args.includes('--views');
const only = args.filter((a) => !a.startsWith('--'));
const outputDir = resolve(bundle, views ? 'views' : 'variants');
mkdirSync(outputDir, { recursive: true });

function readPresets(source: string): Record<string, Record<string, string>> {
  const match = source.match(/presets\(\s*\{([\s\S]*?)\}\s*\);/);
  if (match === null) throw new Error('Source has no presets() block');
  return Object.fromEntries(
    [...match[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([\s\S]*?)\}/g)].map(([, name, body]) => [
      name!,
      Object.fromEntries(
        [...body!.matchAll(/['"]?([A-Za-z_]\w*)['"]?\s*:\s*['"](#\w{6})['"]/g)].map(([, key, value]) => [key!, value!]),
      ),
    ]),
  );
}

await initOcct();
const renders = [];
const sources = [];
for (const target of targets.filter((t) => only.length === 0 || only.includes(t.id))) {
  const sourcePath = resolve(root, 'catalog/kits/apiary/' + target.id + '.kcad.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const presets = readPresets(source);
  sources.push({
    source: relative(root, sourcePath),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangleBudget: target.triangleBudget,
    presets,
  });
  const variants = views
    ? [{ suffix: 'default', values: {} }, ...target.shapeVariants]
    : [
        { suffix: 'default', values: {} },
        ...target.shapeVariants,
        ...Object.entries(presets).map(([suffix, values]) => ({ suffix, values })),
      ];
  for (const variant of variants) {
    const code = Object.keys(variant.values).length ? variantSource(source, variant.values) : source;
    const exported = await runAndExport({
      code,
      fileName: target.id + '.kcad.ts',
      scriptDir: resolve(root, 'catalog/kits/apiary'),
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: target.triangleBudget } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length > 0 || exported.bytes.byteLength === 0) {
      throw new Error(target.id + '/' + variant.suffix + ': ' + (errors.map((error) => error.message).join('; ') || 'empty GLB'));
    }
    const triangles = await glbTriangles(exported.bytes);
    const cameras = views
      ? [
          { tag: 'front', yawDeg: 0, pitchDeg: 5 },
          { tag: 'side', yawDeg: 90, pitchDeg: 5 },
          { tag: 'top', yawDeg: 0, pitchDeg: 89.9 },
          { tag: 'rear34', yawDeg: 215, pitchDeg: 20 },
        ]
      : [{ tag: '', yawDeg: undefined, pitchDeg: undefined }];
    for (const cam of cameras) {
      const name = target.id + '-' + variant.suffix + (cam.tag ? '-' + cam.tag : '');
      const pngPath = resolve(outputDir, name + '.png');
      writeFileSync(pngPath, await renderTrianglesPng(triangles, {
        label: target.id + ' · ' + variant.suffix + (cam.tag ? ' · ' + cam.tag : '') + ' · ' + triangles.length + ' tris',
        yawDeg: cam.yawDeg,
        pitchDeg: cam.pitchDeg,
      }));
      renders.push({ assetId: target.id, variant: variant.suffix, view: cam.tag || '3/4', values: variant.values, triangles: triangles.length, png: relative(root, pngPath) });
    }
    await resetOcct();
  }
}

if (!views) {
  const evidence = {
    invocation: 'npx tsx artifacts/catalog-demos/apiary-silhouette-20261106/render_apiary_variants.ts',
    exporter: 'runAndExport(format="glb", style="lowpoly", maxTriangles=source triangleBudget)',
    renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
    sources,
    renders,
  };
  writeFileSync(resolve(bundle, 'variant-renders.json'), JSON.stringify(evidence, null, 2) + '\n');
}
console.log(renders.map((r) => `${r.assetId}/${r.variant}/${r.view}: ${r.triangles} tris`).join('\n'));
