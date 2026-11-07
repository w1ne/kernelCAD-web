// Print the heaviest parts (triangles per GLB node) of one lab-infrastructure source, for budget tuning while authoring.
// Run: npx tsx artifacts/catalog-demos/lab-infrastructure-silhouette-20261106/part_triangles.ts <id> [key=value ...]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const root = resolve(import.meta.dirname, '../../..');
const [id, ...kv] = process.argv.slice(2);
const dir = resolve(root, 'catalog/kits/lab-infrastructure');
const source = readFileSync(resolve(dir, id + '.kcad.ts'), 'utf8');
await initOcct();
const exported = await runAndExport({
  code: kv.length ? variantSource(source, Object.fromEntries(kv.map((s) => s.split('=')))) : source,
  fileName: id + '.kcad.ts',
  scriptDir: dir,
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 20000 } },
});
const doc = await new NodeIO().readBinary(exported.bytes);
const rows: [string, number][] = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (mesh === null) continue;
  let n = 0;
  for (const prim of mesh.listPrimitives()) n += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION')!.getCount()) / 3;
  rows.push([node.getName() || mesh.getName(), n]);
}
rows.sort((a, b) => b[1] - a[1]);
console.log('total', rows.reduce((s, r) => s + r[1], 0));
for (const [name, n] of rows.slice(0, 25)) console.log(String(n).padStart(6), name);
