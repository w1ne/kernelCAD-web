import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const source = 'artifacts/catalog-demos/grid-substation-wave-20261103/parameter-variant/grid-substation/substation-main-power-transformer.kcad.ts';
const bundle = join(root, 'artifacts/catalog-demos/grid-substation-wave-20261103');

await initOcct();
const { asset, glb } = await buildCatalogAssetWithGlb(root, source);
const png = await renderTrianglesPng(await glbTriangles(glb), {
  label: `${asset.title} · scale 1.20 · ${asset.stats.triangles} tris`,
});
mkdirSync(bundle, { recursive: true });
writeFileSync(join(bundle, 'substation-main-power-transformer-scale-1.2.png'), png);
console.log(JSON.stringify({
  id: asset.id,
  scale: asset.params.find((param) => param.name === 'scale')?.default,
  triangles: asset.stats.triangles,
  budget: asset.triangleBudget,
  materials: asset.stats.materials,
  sizeM: asset.stats.sizeM,
  knobs: asset.params.map((param) => param.name),
}));
