// Measures beam.glb with the GLB decoder at a given module path, so the old
// and new unit rules can be compared on identical bytes.
//
//   npx tsx docs/demos/glb-import-metre-default/measure.mjs
//   npx tsx docs/demos/glb-import-metre-default/measure.mjs /path/to/develop/src/kernel/backends/glbMesh.ts
//
// The default path is this worktree's decoder. Point it at another checkout to
// measure that revision. Only decodeGlbMesh is needed; no viewer is involved.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(here, process.argv[2] ?? '../../../src/kernel/backends/glbMesh.ts');
const { decodeGlbMesh } = await import(modulePath);
const glb = readFileSync(resolve(here, 'beam.glb'));

const decoded = await decodeGlbMesh(glb);
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < decoded.positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], decoded.positions[i + k]);
    max[k] = Math.max(max[k], decoded.positions[i + k]);
  }
}
const round = (v) => Math.round(v * 1000) / 1000;

console.log(JSON.stringify({
  module: modulePath,
  fixture: 'beam.glb',
  fixtureSha256: createHash('sha256').update(glb).digest('hex'),
  triangleCount: decoded.indices.length / 3,
  materialGroups: decoded.subMeshes.map((sub) => sub.name),
  units: decoded.units,
  unitScale: decoded.unitScale,
  unitSource: decoded.unitSource,
  bboxMm: {
    min: min.map(round),
    max: max.map(round),
    size: max.map((v, k) => round(v - min[k])),
  },
}, null, 2));
