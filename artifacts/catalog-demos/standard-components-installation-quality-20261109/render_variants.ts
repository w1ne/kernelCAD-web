// Render selectable geometry and named-preset variants from the five edited
// standard-components sources. Every image comes from the .kcad.ts source.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Variant = { id: string; asset: string; choices: Record<string, string>; preset?: string };
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
const manifest: { id: string; asset: string; choices: Record<string, string>; preset?: string; stats: Stats; pngSha256: string }[] = [];
for (const variant of settings.variants) {
  const sourcePath = join(root, assetDir, `${variant.asset}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  const values = { ...variant.choices };
  if (variant.preset !== undefined) {
    const palette = parsePresets(source)[variant.preset];
    if (palette === undefined) throw new Error(`${variant.id}: missing named preset ${variant.preset}`);
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
  const row = { ...variant, stats: statsFromGlb(result.bytes), pngSha256: createHash('sha256').update(png).digest('hex') };
  manifest.push(row);
  writeFileSync(join(outDir, `${variant.id}.png.sha256`), `${row.pngSha256}  ${variant.id}.png\n`);
  console.log(`${variant.id}: ${row.stats.triangles} tris, ${row.stats.sizeM.map((value) => (value * 1000).toFixed(1)).join(' × ')} mm`);
  await resetOcct();
}

const byId = new Map(manifest.map((row) => [row.id, row]));
for (const [leftId, rightId] of [
  ['plate-four-open', 'plate-eight-installed'],
  ['blind-four-open', 'blind-eight-installed'],
  ['coupling-two-seals', 'coupling-bare-clean-service'],
  ['flange-four-open', 'flange-eight-installed'],
] as const) {
  const left = byId.get(leftId)!;
  const right = byId.get(rightId)!;
  if (left.stats.triangles === right.stats.triangles) throw new Error(`${rightId}: geometry choices did not change tessellation`);
}
const male = byId.get('bumper-male-stud')!;
const insert = byId.get('bumper-threaded-insert')!;
const mountHeightDeltaMm = Math.abs(male.stats.sizeM[1] - insert.stats.sizeM[1]) * 1000;
if (mountHeightDeltaMm < 5) throw new Error(`bumper mount styles changed height by only ${mountHeightDeltaMm.toFixed(1)} mm`);

const sources = [...new Set(settings.variants.map((variant) => variant.asset))].map((asset) => {
  const path = join(root, assetDir, `${asset}.kcad.ts`);
  const source = readFileSync(path);
  return {
    source: `${assetDir}/${asset}.kcad.ts`,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangleBudget: Number(source.toString().match(/triangleBudget:\s*(\d+)/)?.[1]),
  };
});
const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/standard-components-installation-quality-20261109/render_variants.ts',
  exporter: 'runAndExport(format="glb", options={format:"glb", style:"lowpoly", lowpoly:{maxTriangles: source triangleBudget}})',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  geometryChecks: {
    holePatternsAndInstalledHardware: 'plate, blind flange, and pipe flange pairs have different triangle counts',
    couplingSealChoice: 'two-seal and bare-sleeve variants have different triangle counts',
    bumperMountHeightDeltaMm: mountHeightDeltaMm,
  },
  sources,
  renders: manifest,
};
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Rendered ${manifest.length} source variants; geometry-choice checks passed.`);
