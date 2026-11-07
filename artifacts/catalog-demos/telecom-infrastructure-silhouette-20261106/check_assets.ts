// Print triangle count, size and ground contact for named telecom-infrastructure sources.
// Run: npx tsx artifacts/catalog-demos/telecom-infrastructure-silhouette-20261106/check_assets.ts <id> [...]
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAsset } from '../../../src/agent/catalog/buildCatalog';

const root = resolve(import.meta.dirname, '../../..');
await initOcct();
for (const id of process.argv.slice(2)) {
  try {
    const a = await buildCatalogAsset(root, 'catalog/kits/telecom-infrastructure/' + id + '.kcad.ts');
    console.log(`${id}: ${a.stats.triangles}/${a.triangleBudget} tris, size ${a.stats.sizeM.join(' x ')} m, minUp ${a.stats.minUpM}`);
  } catch (e) {
    console.log(`${id}: FAILED ${(e as Error).message}`);
  }
  await resetOcct();
}
