import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { buildModel, updateModelParams } from '../src/modeling/buildModel.ts';
import { meshFeaturesPerFeature } from '../src/modeling/capture/featureMeshing.ts';

const file = 'examples/gallery/gearfinity-planetary-stage.kcad.ts';
const code = readFileSync(file, 'utf8');
const dir = file.replace(/\/[^/]+$/, '');

console.log('--- cold build ---');
let t = performance.now();
const model = await buildModel({ code, fileName: file, scriptDir: dir });
console.log(`buildModel: ${(performance.now() - t).toFixed(0)} ms  records=${model.records.length}`);

const session = model.session;

console.log('\n--- cold mesh #1 (no seedShapes) ---');
t = performance.now();
const mesh1 = await meshFeaturesPerFeature(model.records, session.paramTable, session);
console.log(`meshFeaturesPerFeature: ${(performance.now() - t).toFixed(0)} ms  features=${mesh1.features.length}`);
console.log(`  cachedFeatureMeshes: ${session.cachedFeatureMeshes.size}`);
console.log(`  cachedAssemblyPartMeshes: ${[...session.cachedAssemblyPartMeshes.values()].reduce((s, m) => s + m.size, 0)}`);

console.log('\n--- params.update driveAngleDeg=150 ---');
t = performance.now();
await updateModelParams(model, [{ name: 'driveAngleDeg', value: 150 }]);
console.log(`updateModelParams: ${(performance.now() - t).toFixed(0)} ms`);
console.log(`  cachedFeatureMeshes after invalidation: ${session.cachedFeatureMeshes.size}`);

console.log('\n--- warm mesh #2 (with seedShapes from cache) ---');
// Build seedShapes from records whose shape AND mesh are still cached
const seedShapes = new Map();
for (const r of model.records) {
  if (session.cachedShapes.has(r.id) && session.cachedFeatureMeshes.has(r.id)) {
    seedShapes.set(r.id, session.cachedShapes.get(r.id));
  }
}
console.log(`  seedShapes size: ${seedShapes.size}`);

t = performance.now();
const mesh2 = await meshFeaturesPerFeature(model.records, session.paramTable, session, seedShapes);
console.log(`meshFeaturesPerFeature (warm): ${(performance.now() - t).toFixed(0)} ms  features=${mesh2.features.length}`);

console.log('\n--- warm mesh #3 (same pose, fully cached) ---');
t = performance.now();
const seedShapes3 = new Map();
for (const r of model.records) {
  if (session.cachedShapes.has(r.id) && session.cachedFeatureMeshes.has(r.id)) {
    seedShapes3.set(r.id, session.cachedShapes.get(r.id));
  }
}
const mesh3 = await meshFeaturesPerFeature(model.records, session.paramTable, session, seedShapes3);
console.log(`meshFeaturesPerFeature (warm again): ${(performance.now() - t).toFixed(0)} ms  features=${mesh3.features.length}`);

console.log('\n--- another params.update + warm mesh ---');
await updateModelParams(model, [{ name: 'driveAngleDeg', value: 200 }]);
const seedShapes4 = new Map();
for (const r of model.records) {
  if (session.cachedShapes.has(r.id) && session.cachedFeatureMeshes.has(r.id)) {
    seedShapes4.set(r.id, session.cachedShapes.get(r.id));
  }
}
t = performance.now();
const mesh4 = await meshFeaturesPerFeature(model.records, session.paramTable, session, seedShapes4);
console.log(`meshFeaturesPerFeature (post-edit warm): ${(performance.now() - t).toFixed(0)} ms  features=${mesh4.features.length}`);
