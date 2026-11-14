// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Render selectable size and material-preset variants from three existing
// standard-components source models.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Variant = { id: string; asset: string; choices?: Record<string, string>; preset?: string };
type Settings = { variants: Variant[] };
type Stats = { triangles: number; sizeM: [number, number, number] };

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const settings = JSON.parse(readFileSync(join(bundle, 'demo-settings.json'), 'utf8')) as Settings;
const assetDir = 'catalog/kits/standard-components';
const outDir = join(bundle, 'variants');
mkdirSync(outDir, { recursive: true });

function parsePresets(source: string): Record<string, Record<string, string>> {
  const match = source.match(/\bpresets?\s*\(\s*\{([\s\S]*?)\}\s*\);/);
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
  const sourcePath = join(root, assetDir, `${variant.asset}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  const values = { ...(variant.choices ?? {}) };
  if (variant.preset !== undefined) {
    const palette = parsePresets(source)[variant.preset];
    if (palette === undefined) throw new Error(`${variant.id}: missing preset ${variant.preset}`);
    Object.assign(values, palette);
  }
  const code = variantSource(source, values);
  const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error(`${variant.asset}: missing triangleBudget`);
  const result = await runAndExport({
    code,
    fileName: `${variant.asset}.kcad.ts`,
    scriptDir: join(root, assetDir),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(`${variant.id}: ${errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB'}`);
  }
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), { label: `${variant.asset} · ${variant.id}`, frameHeightM: 0.075 });
  writeFileSync(join(outDir, `${variant.id}.png`), png);
  const stats = statsFromGlb(result.bytes);
  const pngSha256 = createHash('sha256').update(png).digest('hex');
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  manifest.push({ ...variant, stats, pngSha256, sourceSha256 });
  writeFileSync(join(outDir, `${variant.id}.png.sha256`), `${pngSha256}  ${variant.id}.png\n`);
  console.log(`${variant.id}: ${stats.triangles} triangles; size ${stats.sizeM.map((value) => (value * 1000).toFixed(1)).join(' × ')} mm`);
  await resetOcct();
}

const byId = new Map(manifest.map((row) => [row.id, row]));
for (const [smallId, largeId] of [
  ['bearing-default', 'bearing-large'],
  ['jaw-default', 'jaw-large'],
  ['union-compact', 'union-default'],
] as const) {
  const small = byId.get(smallId)!;
  const large = byId.get(largeId)!;
  const ratio = large.stats.sizeM[0] / small.stats.sizeM[0];
  if (ratio < 1.2 || ratio > 1.4) throw new Error(`${smallId} / ${largeId}: size choice changed width by unexpected ratio ${ratio}`);
}
for (const [defaultId, presetId] of [
  ['bearing-default', 'bearing-high-visibility'],
  ['jaw-default', 'jaw-high-torque'],
  ['union-default', 'union-brass'],
] as const) {
  if (byId.get(defaultId)!.pngSha256 === byId.get(presetId)!.pngSha256) {
    throw new Error(`${presetId}: named material preset did not change the rendered image`);
  }
}

const sourceRows = [...new Map(manifest.map((row) => [row.asset, row])).values()].map((row) => ({
  asset: row.asset,
  source: `${assetDir}/${row.asset}.kcad.ts`,
  sourceSha256: row.sourceSha256,
}));
const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/standard-components-coupling-details-20261110/render_variants.ts',
  renderer: 'runAndExport(format="glb", style="lowpoly", maxTriangles=source triangleBudget) + scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  geometryChecks: {
    sizeChoiceWidthRatios: {
      bearingStandardToLarge: byId.get('bearing-large')!.stats.sizeM[0] / byId.get('bearing-default')!.stats.sizeM[0],
      jawStandardToLarge: byId.get('jaw-large')!.stats.sizeM[0] / byId.get('jaw-default')!.stats.sizeM[0],
      unionCompactToStandard: byId.get('union-default')!.stats.sizeM[0] / byId.get('union-compact')!.stats.sizeM[0],
    },
    presetImageHashesDiffer: true,
  },
  sources: sourceRows,
  renders: manifest,
};
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Rendered ${manifest.length} source variants; size and preset checks passed.`);
