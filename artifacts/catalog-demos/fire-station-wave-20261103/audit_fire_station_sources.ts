import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';

const root = resolve(import.meta.dirname, '../../..');
const kitDir = join(root, 'catalog/kits/fire-station');
const sources = readdirSync(kitDir).filter((name) => name.endsWith('.kcad.ts')).sort();
const results: Array<Record<string, unknown>> = [];
await initOcct();
for (const name of sources) {
  const file = join(kitDir, name);
  try {
    const { asset } = await buildCatalogAssetWithGlb(root, relative(root, file));
    const knobs = asset.params.map((param) => `${param.name}:${param.type}`);
    if (asset.stats.triangles > asset.triangleBudget) throw new Error('triangle budget exceeded');
    if (asset.stats.materials !== 1) throw new Error('expected exactly one material');
    if (knobs.join(',') !== 'scale:number,color:color') throw new Error(`unexpected parameters: ${knobs.join(',')}`);
    if (asset.origin === 'base' && Math.abs(asset.stats.minUpM) > 0.000001) {
      throw new Error(`base origin does not meet the floor: ${asset.stats.minUpM} m`);
    }
    results.push({
      id: asset.id,
      origin: asset.origin,
      triangles: asset.stats.triangles,
      budget: asset.triangleBudget,
      materials: asset.stats.materials,
      knobs,
      sizeM: asset.stats.sizeM,
      minUpM: asset.stats.minUpM,
    });
    console.log(`PASS ${asset.id}: ${asset.stats.triangles} tris`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ id: name.replace('.kcad.ts', ''), error: message });
    console.error(`FAIL ${name}: ${message}`);
  }
}
const report = {
  expected: sources.length,
  audited: results.length,
  passed: results.filter((row) => !('error' in row)).length,
  failed: results.filter((row) => 'error' in row),
  assets: results,
};
writeFileSync(join(import.meta.dirname, 'source-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`source audit: ${report.passed}/${report.expected} passed`);
if (report.passed !== report.expected) process.exitCode = 1;
