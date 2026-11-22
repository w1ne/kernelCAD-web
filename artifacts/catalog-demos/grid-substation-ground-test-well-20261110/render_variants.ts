// SPDX-License-Identifier: MIT
// Render real source-driven ground-well depth and material-preset variants.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Variant = { id: string; choices: Record<string, string>; preset?: string };
type Settings = { variants: Variant[] };
type Stats = { triangles: number; sizeM: [number, number, number] };

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const settings = JSON.parse(readFileSync(join(bundle, 'demo-settings.json'), 'utf8')) as Settings;
const assetId = 'substation-ground-grid-test-well';
const sourcePath = join(root, 'catalog/kits/grid-substation/' + assetId + '.kcad.ts');
const source = readFileSync(sourcePath, 'utf8');
const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
if (!Number.isFinite(budget) || budget <= 0) throw new Error('ground test well: missing triangleBudget');
const outDir = join(bundle, 'variants');
mkdirSync(outDir, { recursive: true });

function parsePresets(text: string): Record<string, Record<string, string>> {
  const match = text.match(/\bpresets?\s*\(\s*\{([\s\S]*?)\}\s*\);/);
  if (match === null) throw new Error('Source has no presets(...) block');
  return Object.fromEntries(
    [...match[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, name, body]) => [
      name!,
      Object.fromEntries([...body!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#[0-9a-fA-F]{6})'/g)].map(([, key, value]) => [key!, value!])),
    ]),
  );
}

function statsFromGlb(bytes: Uint8Array): Stats {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))) as {
    asset?: { extras?: { kernelcad?: { stats?: Stats } } };
  };
  const stats = json.asset?.extras?.kernelcad?.stats;
  if (stats === undefined) throw new Error('GLB has no kernelCAD stats');
  return stats;
}

await initOcct();
const manifest: Array<Variant & { stats: Stats; pngSha256: string; sourceSha256: string }> = [];
for (const variant of settings.variants) {
  const values = { ...variant.choices };
  if (variant.preset !== undefined) {
    const palette = parsePresets(source)[variant.preset];
    if (palette === undefined) throw new Error(variant.id + ': missing preset ' + variant.preset);
    Object.assign(values, palette);
  }
  const code = variantSource(source, values);
  const result = await runAndExport({
    code,
    fileName: assetId + '.kcad.ts',
    scriptDir: join(root, 'catalog/kits/grid-substation'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 8000 } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(variant.id + ': ' + (errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB'));
  }
  const label = 'Ground grid test well · ' + variant.choices.wellDepth + ' mm' + (variant.preset ? ' · ' + variant.preset : '');
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), { label, frameHeightM: 1.15 });
  writeFileSync(join(outDir, variant.id + '.png'), png);
  const stats = statsFromGlb(result.bytes);
  const pngSha256 = createHash('sha256').update(png).digest('hex');
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  manifest.push({ ...variant, stats, pngSha256, sourceSha256 });
  writeFileSync(join(outDir, variant.id + '.png.sha256'), pngSha256 + '  ' + variant.id + '.png\n');
  console.log(variant.id + ': ' + stats.triangles + ' triangles; size ' + stats.sizeM.map((value) => (value * 1000).toFixed(1)).join(' × ') + ' mm');
  await resetOcct();
}

const byId = new Map(manifest.map((row) => [row.id, row]));
const shortWell = byId.get('depth-360')!;
const standardWell = byId.get('depth-480')!;
const deepWell = byId.get('depth-620')!;
// GLB stats use Y-up, so index 1 is vertical.
if (!(shortWell.stats.sizeM[1] < standardWell.stats.sizeM[1] && standardWell.stats.sizeM[1] < deepWell.stats.sizeM[1])) {
  throw new Error('wellDepth choices did not produce strictly increasing model height');
}
if (new Set([shortWell.pngSha256, standardWell.pngSha256, deepWell.pngSha256]).size !== 3) {
  throw new Error('wellDepth choices did not produce distinct rendered previews');
}
if (byId.get('depth-480-maintenance')!.pngSha256 === standardWell.pngSha256) {
  throw new Error('maintenance preset did not change the rendered image');
}
const maximumMeasuredTriangles = Math.max(...manifest.map((row) => row.stats.triangles));
if (maximumMeasuredTriangles > budget) {
  throw new Error('measured maximum ' + maximumMeasuredTriangles + ' triangles exceeds budget ' + budget);
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/grid-substation-ground-test-well-20261110/render_variants.ts',
  renderer: 'variantSource + runAndExport(format="glb", style="lowpoly", maxTriangles=8000) + scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  geometryChecks: {
    verticalAxisInGlbStats: 'Y',
    wellDepthChoicesProduceStrictlyIncreasingHeight: true,
    depthChoiceImagesDistinct: true,
    maintenancePresetChangesImage: true,
    sourceTriangleBudget: budget,
    maximumMeasuredTriangles,
  },
  source: {
    file: 'catalog/kits/grid-substation/' + assetId + '.kcad.ts',
    sourceSha256: createHash('sha256').update(source).digest('hex'),
  },
  renders: manifest,
};
writeFileSync(join(bundle, 'variant-manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log('Rendered ' + manifest.length + ' source variants; depth, palette, and triangle checks passed.');
