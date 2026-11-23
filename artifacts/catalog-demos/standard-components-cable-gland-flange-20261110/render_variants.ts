// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Render source-driven bore and material choices for two standard components.
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

const sources = new Map<string, string>();
const budgets = new Map<string, number>();
for (const variant of settings.variants) {
  if (sources.has(variant.asset)) continue;
  const source = readFileSync(join(root, 'catalog/kits/standard-components', `${variant.asset}.kcad.ts`), 'utf8');
  const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error(`${variant.asset}: missing triangleBudget`);
  sources.set(variant.asset, source);
  budgets.set(variant.asset, budget);
}

await initOcct();
const manifest: Array<Variant & { choices: Record<string, string>; stats: Stats; pngSha256: string; sourceSha256: string }> = [];
for (const variant of settings.variants) {
  const source = sources.get(variant.asset)!;
  const values: Record<string, string> = { ...(variant.choices ?? {}) };
  if (variant.preset !== undefined) {
    const palette = parsePresets(source)[variant.preset];
    if (palette === undefined) throw new Error(`${variant.id}: missing preset ${variant.preset}`);
    Object.assign(values, palette);
  }
  const budget = budgets.get(variant.asset)!;
  const result = await runAndExport({
    code: variantSource(source, values),
    fileName: `${variant.asset}.kcad.ts`,
    scriptDir: join(root, 'catalog/kits/standard-components'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(`${variant.id}: ${errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB'}`);
  }
  const stats = statsFromGlb(result.bytes);
  if (stats.triangles > budget) throw new Error(`${variant.id}: ${stats.triangles} triangles exceeds budget ${budget}`);
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
    label: `${variant.asset} · ${variant.preset ?? (Object.values(variant.choices ?? {}).join(' · ') || 'default')}`,
    frameHeightM: 0.07,
  });
  writeFileSync(join(outDir, `${variant.id}.png`), png);
  manifest.push({
    ...variant,
    choices: variant.choices ?? {},
    stats,
    pngSha256: createHash('sha256').update(png).digest('hex'),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
  });
  console.log(`${variant.id}: ${stats.triangles} triangles`);
  await resetOcct();
}

const byId = new Map(manifest.map((row) => [row.id, row]));
const differentRenders = (left: string, right: string) => byId.get(left)!.pngSha256 !== byId.get(right)!.pngSha256;
const differentEnvelope = (left: string, right: string) => byId.get(left)!.stats.sizeM.some(
  (value, index) => Math.abs(value - byId.get(right)!.stats.sizeM[index]!) > 0.0001,
);
const assertions = {
  cableDiameterChangesRenderedGeometry: differentRenders('cable-4mm', 'cable-8mm'),
  cableHousingSizeChangesAroundFixed8mmCable: differentEnvelope('cable-compact-8mm', 'cable-large-8mm'),
  cablePresetChangesVisibleMaterials: differentRenders('cable-4mm', 'cable-high-visibility'),
  flangeBoreChangesRenderedGeometry: differentRenders('flange-10mm', 'flange-18mm'),
  flangeHousingSizeChangesAroundFixed18mmBore: differentEnvelope('flange-compact-18mm', 'flange-large-18mm'),
  flangePresetChangesVisibleMaterials: differentRenders('flange-10mm', 'flange-brass'),
  everyVariantWithinTriangleBudget: manifest.every((row) => row.stats.triangles <= budgets.get(row.asset)!),
};
if (Object.values(assertions).some((passed) => !passed)) {
  throw new Error(`variant check failed: ${JSON.stringify(assertions)}`);
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/render_variants.ts',
  renderer: 'variantSource + runAndExport(format="glb", style="lowpoly") + scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  assertions,
  budgets: Object.fromEntries(budgets),
  sources: Object.fromEntries([...sources].map(([asset, source]) => [asset, {
    file: `catalog/kits/standard-components/${asset}.kcad.ts`,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
  }])),
  renders: manifest,
};
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Rendered ${manifest.length} source variants; bore, palette, and triangle-budget checks passed.`);
