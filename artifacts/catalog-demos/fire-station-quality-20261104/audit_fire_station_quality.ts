import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';

const root = resolve(import.meta.dirname, '../../..');
const bundle = import.meta.dirname;
const kitDir = join(root, 'catalog/kits/fire-station');
const sources = readdirSync(kitDir).filter((name) => name.endsWith('.kcad.ts')).sort();
const results: Array<Record<string, unknown>> = [];

await initOcct();
for (const name of sources) {
  const file = join(kitDir, name);
  const source = readFileSync(file, 'utf8');
  try {
    const { asset } = await buildCatalogAssetWithGlb(root, relative(root, file));
    const colorArgs = [...source.matchAll(/\.color\((\w+)\)/g)].map((match) => match[1]);
    const uniqueColorArgs = [...new Set(colorArgs)].sort();
    const materialKnobs = asset.params.filter((param) => param.name !== 'scale').map((param) => param.name).sort();
    const presetNames = [...source.matchAll(/^\s*'(apparatus-red|clean-zone)'\s*:/gm)].map((match) => match[1]);
    const geometryCalls = ['path()', '.loft(', '.rotateX(', '.rotateY(', '.rotateZ(']
      .reduce((count, token) => count + source.split(token).length - 1, 0);
    const problems: string[] = [];

    if (asset.stats.triangles > asset.triangleBudget) problems.push('triangle budget exceeded');
    if (materialKnobs.length < 2 || materialKnobs.length > 4) problems.push(`expected 2–4 material knobs, found ${materialKnobs.length}`);
    if (uniqueColorArgs.length < 2 || uniqueColorArgs.length > 4) problems.push(`expected 2–4 distinct .color() arguments, found ${uniqueColorArgs.length}`);
    if (JSON.stringify(uniqueColorArgs) !== JSON.stringify(materialKnobs)) problems.push('declared material knobs do not match the .color() arguments');
    if (presetNames.length !== 2 || !presetNames.includes('apparatus-red') || !presetNames.includes('clean-zone')) {
      problems.push(`expected apparatus-red and clean-zone presets, found ${presetNames.join(', ') || 'none'}`);
    }
    if (geometryCalls < 3) problems.push(`too few path, loft or rotation calls: ${geometryCalls}`);
    if (/Original fire-station scene asset|param\(['"]color['"]/.test(source)) problems.push('old one-color source marker remains');
    if (asset.origin === 'base' && Math.abs(asset.stats.minUpM) > 0.000001) problems.push(`base origin does not meet the floor: ${asset.stats.minUpM} m`);

    if (problems.length > 0) throw new Error(problems.join('; '));
    results.push({
      id: asset.id,
      origin: asset.origin,
      triangles: asset.stats.triangles,
      triangleBudget: asset.triangleBudget,
      meshMaterials: asset.stats.materials,
      materialKnobs,
      presets: presetNames,
      distinctColorArgs: uniqueColorArgs,
      geometryCalls,
      sizeM: asset.stats.sizeM,
      minUpM: asset.stats.minUpM,
    });
    console.log(`PASS ${asset.id}: ${uniqueColorArgs.length} colors, ${presetNames.length} named presets, ${asset.stats.triangles} tris`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ id: name.replace('.kcad.ts', ''), error: message });
    console.error(`FAIL ${name}: ${message}`);
  }
}

const report = {
  expected: 70,
  audited: results.length,
  passed: results.filter((row) => !('error' in row)).length,
  failed: results.filter((row) => 'error' in row),
  assets: results,
};
writeFileSync(join(bundle, 'quality-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`quality audit: ${report.passed}/${report.expected} passed`);
if (report.passed !== report.expected || results.length !== 70) process.exitCode = 1;
