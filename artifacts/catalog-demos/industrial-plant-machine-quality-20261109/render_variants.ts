// Render source-defined material presets and geometry choices for the three
// industrial plant assets. All images are software renders of generated GLBs.
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
const kitDir = 'catalog/kits/industrial-plant';
const settings = JSON.parse(readFileSync(join(bundle, 'demo-settings.json'), 'utf8')) as Settings;
const outputDir = join(bundle, 'variants');
mkdirSync(outputDir, { recursive: true });

function readPresets(source: string): Record<string, Record<string, string>> {
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
const manifest: {
  id: string;
  asset: string;
  choices: Record<string, string>;
  preset?: string;
  stats: Stats;
  png: string;
  pngSha256: string;
}[] = [];

for (const variant of settings.variants) {
  const sourcePath = join(root, kitDir, `${variant.asset}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  const values = { ...variant.choices };
  if (variant.preset !== undefined) {
    const palette = readPresets(source)[variant.preset];
    if (palette === undefined) throw new Error(`${variant.id}: preset ${variant.preset} is missing`);
    Object.assign(values, palette);
  }
  const budget = Number(source.match(/triangleBudget:\s*(\d+)/)?.[1]);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error(`${variant.asset}: missing triangleBudget`);
  const exported = await runAndExport({
    code: variantSource(source, values),
    fileName: `${variant.asset}.kcad.ts`,
    scriptDir: join(root, kitDir),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: budget } },
  });
  const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || exported.bytes.byteLength === 0) {
    throw new Error(`${variant.id}: ${errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB'}`);
  }
  const stats = statsFromGlb(exported.bytes);
  if (stats.triangles > budget) throw new Error(`${variant.id}: ${stats.triangles} exceeds budget ${budget}`);
  const pngName = `${variant.id}.png`;
  const png = await renderTrianglesPng(await glbTriangles(exported.bytes), { label: `${variant.asset} · ${variant.id}` });
  writeFileSync(join(outputDir, pngName), png);
  const pngSha256 = createHash('sha256').update(png).digest('hex');
  writeFileSync(join(outputDir, `${pngName}.sha256`), `${pngSha256}  ${pngName}\n`);
  manifest.push({ ...variant, stats, png: `variants/${pngName}`, pngSha256 });
  console.log(`${variant.id}: ${stats.triangles} tris; ${stats.sizeM.map((value) => (value * 1000).toFixed(1)).join(' × ')} mm`);
  await resetOcct();
}

for (const [asset, shapeVariant] of [
  ['diesel-generator-set', 'generator-ten-louvers'],
  ['belt-conveyor', 'conveyor-four-stations'],
  ['industrial-transformer', 'transformer-ten-fins'],
]) {
  const defaultRow = manifest.find((row) => row.asset === asset && row.id.endsWith('-default'))!;
  const shapeRow = manifest.find((row) => row.id === shapeVariant)!;
  if (defaultRow.stats.triangles === shapeRow.stats.triangles) {
    throw new Error(`${shapeVariant}: geometry choice did not change tessellation`);
  }
  const presetRow = manifest.find((row) => row.asset === asset && row.preset !== undefined)!;
  if (defaultRow.pngSha256 === presetRow.pngSha256) throw new Error(`${presetRow.id}: preset did not change preview pixels`);
}

const sources = [...new Set(settings.variants.map((variant) => variant.asset))].map((asset) => {
  const sourcePath = join(root, kitDir, `${asset}.kcad.ts`);
  const source = readFileSync(sourcePath);
  return {
    source: `${kitDir}/${asset}.kcad.ts`,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    triangleBudget: Number(source.toString().match(/triangleBudget:\s*(\d+)/)?.[1]),
  };
});

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/industrial-plant-machine-quality-20261109/render_variants.ts',
  exporter: 'runAndExport(format="glb", style="lowpoly", maxTriangles=source triangleBudget)',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  geometryChecks: 'louver count, support station count, and radiator fin count each change tessellation',
  paletteChecks: 'highVisibility / utilityGreen presets each change the rendered preview pixels',
  sources,
  variants: manifest,
};
writeFileSync(join(bundle, 'variant-manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Rendered and checked ${manifest.length} source-defined variants.`);
