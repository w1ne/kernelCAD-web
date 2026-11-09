// SPDX-License-Identifier: MIT
// Render the defaults and actual selectable configurations from the four
// edited .kcad.ts sources. Every output is generated from source, not painted.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Variant = { id: string; asset: string; choices: Record<string, string>; preset?: string };
type Settings = { variants: Variant[] };
type Stats = { triangles: number; sizeM: [number, number, number] };

const root = resolve(import.meta.dirname, '../../..');
const outDir = import.meta.dirname;
const settings = JSON.parse(readFileSync(join(outDir, 'demo-settings.json'), 'utf8')) as Settings;

function parsePresetBlock(source: string): Record<string, Record<string, string>> {
  const match = source.match(/\bpresets?\s*\(\s*\{([\s\S]*?)\}\s*\);/);
  if (match === null) throw new Error('Source has no presets(...) block');
  return Object.fromEntries(
    [...match[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, preset, body]) => [
      preset!,
      Object.fromEntries([...body!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#[0-9a-fA-F]{6})'/g)].map(([, name, color]) => [name!, color!])),
    ]),
  );
}

function withChoices(source: string, choices: Record<string, string>): string {
  let code = source;
  for (const [name, value] of Object.entries(choices)) {
    const declaration = new RegExp(`param\\('${name}',\\s*'[^']+',\\s*\\{\\s*choices:\\s*\\[([^\\]]+)\\]`);
    const match = code.match(declaration);
    if (match === null) throw new Error(`Source has no choice parameter ${name}`);
    const allowed = [...match[1]!.matchAll(/'([^']+)'/g)].map((row) => row[1]);
    if (!allowed.includes(value)) throw new Error(`${name}=${value} is not one of ${allowed.join(', ')}`);
    code = code.replace(new RegExp(`(param\\('${name}',\\s*)'[^']+'`), `$1'${value}'`);
  }
  return code;
}

function withPreset(source: string, presetName: string): string {
  const presets = parsePresetBlock(source);
  const preset = presets[presetName];
  if (preset === undefined) throw new Error(`Missing named preset ${presetName}`);
  let code = source;
  for (const [name, color] of Object.entries(preset)) {
    const declaration = new RegExp(`(param\\('${name}',\\s*)'#[0-9a-fA-F]{6}'`);
    if (!declaration.test(code)) throw new Error(`Preset ${presetName} refers to missing color knob ${name}`);
    code = code.replace(declaration, `$1'${color}'`);
  }
  return code;
}

function glbStats(bytes: Uint8Array): Stats {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))) as {
    asset?: { extras?: { kernelcad?: { stats?: Stats } } };
  };
  const stats = json.asset?.extras?.kernelcad?.stats;
  if (stats === undefined) throw new Error('GLB has no kernelCAD stats');
  return stats;
}

function shortAssetLabel(id: string): string {
  if (id === 'walk-behind-power-trowel') return 'Walk-behind trowel';
  if (id === 'vibrating-concrete-screed') return 'Vibrating screed';
  if (id === 'rebar-bending-machine') return 'Rebar bender';
  if (id === 'portable-material-hoist') return 'Material hoist';
  return id.replaceAll('-', ' ');
}

await initOcct();
mkdirSync(join(outDir, 'variants'), { recursive: true });
const manifest: { id: string; asset: string; choices: Record<string, string>; preset?: string; stats: Stats; pngSha256: string }[] = [];
for (const variant of settings.variants) {
  const sourcePath = `catalog/kits/construction-equipment/${variant.asset}.kcad.ts`;
  const source = readFileSync(join(root, sourcePath), 'utf8');
  let code = withChoices(source, variant.choices);
  if (variant.preset !== undefined) code = withPreset(code, variant.preset);
  const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error(`${variant.asset}: no positive triangle budget`);
  const result = await runAndExport({
    code,
    fileName: `${variant.asset}.kcad.ts`,
    scriptDir: join(root, 'catalog/kits/construction-equipment'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(`${variant.id}: ${errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB'}`);
  }
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
    label: `${shortAssetLabel(variant.asset)} · ${variant.preset === undefined ? 'default' : 'high visibility'}`,
  });
  const file = join(outDir, 'variants', `${variant.id}.png`);
  writeFileSync(file, png);
  const row = {
    ...variant,
    stats: glbStats(result.bytes),
    pngSha256: createHash('sha256').update(png).digest('hex'),
  };
  manifest.push(row);
  writeFileSync(`${file}.sha256`, `${row.pngSha256}  ${variant.id}.png\n`);
  console.log(`${variant.id}: ${row.stats.triangles} tris, ${row.stats.sizeM.map((v) => v.toFixed(3)).join(' × ')} m`);
}

for (const [a, b, axis] of [
  ['trowel-standard', 'trowel-compact-hi-vis', 0],
  ['screed-standard-working', 'screed-short-folded-hi-vis', 1],
  ['rebar-compact-hook', 'rebar-extended-stirrup-hi-vis', 0],
  ['hoist-standard-guarded', 'hoist-short-open-hi-vis', 1],
] as const) {
  const defaultVariant = manifest.find((row) => row.id === a)!;
  const changedVariant = manifest.find((row) => row.id === b)!;
  const delta = Math.abs(defaultVariant.stats.sizeM[axis] - changedVariant.stats.sizeM[axis]);
  if (delta < 0.05) throw new Error(`${b}: selected parameter did not change bbox axis ${axis}`);
}
writeFileSync(join(outDir, 'variant-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered and compared ${manifest.length} source variants; four shape-choice bbox checks passed.`);
