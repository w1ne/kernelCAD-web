import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { runScript } from '../../../src/modeling/runtime/runScript';

const root = resolve('.');
const sourcePath = resolve(root, 'examples/kinematic/jointed-tendon-anchor-at.kcad.ts');
const source = await readFile(sourcePath, 'utf8');

await initOcct();
const { records, paramTable, session } = await runScript({
  code: source,
  fileName: sourcePath,
  scriptDir: dirname(sourcePath),
});
const { features } = await meshFeaturesPerFeature(records, paramTable, session);
const tendon = features.find((feature) => feature.assemblyPartName === '__tendon__spring');
assert.ok(tendon, 'expected the spring tendon mesh');

function ringCenter(vertices: ArrayLike<number>, first: number): [number, number, number] {
  const center: [number, number, number] = [0, 0, 0];
  for (let i = first; i < first + 16; i += 1) {
    for (let axis = 0; axis < 3; axis += 1) center[axis] += vertices[i * 3 + axis] / 16;
  }
  return center;
}

const vertices = tendon.faces[0]?.vertices;
assert.ok(vertices, 'expected tendon endpoint mesh vertices');
const cleanPoint = (point: [number, number, number]) => point.map((value) =>
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6)),
);
const fromMm = cleanPoint(ringCenter(vertices, 0));
const toMm = cleanPoint(ringCenter(vertices, 16));
const expected = { fromMm: [110, 0, 0], toMm: [-10, 0, 0] } as const;
for (const [label, actual, target] of [
  ['fromMm', fromMm, expected.fromMm],
  ['toMm', toMm, expected.toMm],
] as const) {
  for (let axis = 0; axis < 3; axis += 1) {
    assert.ok(Math.abs(actual[axis] - target[axis]) <= 0.003, `${label}[${axis}] was ${actual[axis]}`);
  }
}

const evidence = {
  checkedAt: new Date().toISOString(),
  source: 'examples/kinematic/jointed-tendon-anchor-at.kcad.ts',
  verification: 'local-kernelcad-mesh-endpoint-rings',
  command: 'node --import tsx docs/demos/tendon-jointed-anchor-at/verify.ts',
  units: 'mm',
  tendonFeature: tendon.assemblyPartName,
  actual: { fromMm, toMm },
  expected,
  toleranceMm: 0.003,
  claims: {
    localScriptAndMeshVerified: true,
    dynamicSimulation: false,
    deployedBehavior: false,
    hardwareAcceptance: false,
  },
};
await writeFile(
  resolve(root, 'docs/demos/tendon-jointed-anchor-at/verification.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(JSON.stringify(evidence, null, 2));
