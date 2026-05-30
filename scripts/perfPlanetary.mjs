import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { evaluateAndBuildScript } from '../src/agent/cli/commands/evaluate.ts';
import { loadScriptFeatures } from '../src/modeling/runtime/scriptLoader.ts';
import { meshFeaturesPerFeature } from '../src/modeling/capture/featureMeshing.ts';

const file = 'examples/gallery/gearfinity-planetary-stage.kcad.ts';
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

const t0 = performance.now();
const evalRes = await evaluateAndBuildScript({ file });
log(`evaluateAndBuildScript: ${(performance.now() - t0).toFixed(0)} ms  records=${(evalRes.model?.records ?? []).length}`);

const t2 = performance.now();
const loaded = await loadScriptFeatures(file);
log(`loadScriptFeatures: ${(performance.now() - t2).toFixed(0)} ms features=${loaded.features.length}`);

const t4 = performance.now();
const meshing = await meshFeaturesPerFeature(
  loaded.features.map((f) => f.record),
  loaded.paramTable,
  loaded.session,
);
log(`meshFeaturesPerFeature: ${(performance.now() - t4).toFixed(0)} ms features=${meshing.features.length} failed=${meshing.failedFeatureIds.length}`);

const sample = meshing.features[0] || {};
log(`feature keys: ${Object.keys(sample).join(', ')}`);
if (sample.mesh) log(`  mesh keys: ${Object.keys(sample.mesh).join(', ')}`);

const perFeat = meshing.features.map((f) => {
  const tri = f.mesh?.triangleCount ?? f.mesh?.indices?.length / 3 ?? 0;
  const verts = f.mesh?.vertexCount ?? (f.mesh?.positions?.length ? f.mesh.positions.length / 3 : 0);
  return { id: f.id, kind: f.kind, triangles: tri, verts };
}).sort((a, b) => b.triangles - a.triangles).slice(0, 20);

log('\nTop 20 features by triangle count:');
for (const f of perFeat) {
  log(`  tri=${String(f.triangles).padStart(6)}  v=${String(f.verts).padStart(6)}  ${(f.kind || '').padEnd(18)}  ${f.id}`);
}

writeFileSync('/tmp/perfPlanetary.log', lines.join('\n'));
