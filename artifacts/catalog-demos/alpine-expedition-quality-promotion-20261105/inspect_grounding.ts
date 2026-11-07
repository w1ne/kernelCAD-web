// Inspect each exported component's lowest GLB vertex for the origin regression.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
await initOcct();
for (const id of ['alpine-helmet', 'basecamp-dome-tent']) {
  const source = `catalog/kits/alpine-expedition/${id}.kcad.ts`;
  const { asset, glb } = await buildCatalogAssetWithGlb(root, source);
  const document = await new NodeIO().readBinary(glb);
  const components: Array<{ node: string; minZ: number }> = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = node.getWorldMatrix();
    let minUp = Infinity;
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions) continue;
      for (let i = 0; i < positions.getCount(); i++) {
        const p = positions.getElement(i, []);
        minUp = Math.min(minUp, world[1]! * p[0]! + world[5]! * p[1]! + world[9]! * p[2]! + world[13]!);
      }
    }
    if (Number.isFinite(minUp)) components.push({ node: node.getName(), minUp });
  }
  components.sort((a, b) => a.minZ - b.minZ);
  console.log(JSON.stringify({ id, sourceMinUpM: asset.stats.minUpM, lowestComponents: components.slice(0, 8) }));
}
