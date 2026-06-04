import { performance } from 'node:perf_hooks';
import { buildModel, updateModelParams } from '../src/modeling/buildModel.ts';
import { readFileSync } from 'node:fs';

const file = 'examples/gallery/gearfinity-planetary-stage.kcad.ts';
const code = readFileSync(file, 'utf8');

console.log('--- cold build ---');
const t0 = performance.now();
const model = await buildModel({ code, fileName: file, scriptDir: file.replace(/\/[^/]+$/, '') });
console.log(`buildModel: ${(performance.now() - t0).toFixed(0)} ms  records=${model.records.length}`);

const editedNames = ['driveAngleDeg'];
const recordsAffected = model.records.filter(r => {
  const refs = (r.metadata)?.paramRefs ?? [];
  return refs.some(n => editedNames.includes(n));
});
console.log(`records with driveAngleDeg refs: ${recordsAffected.length}`);
for (const r of recordsAffected.slice(0, 8)) {
  console.log(`  ${r.kind.padEnd(20)} ${r.id}`);
}

console.log('\n--- pose-only edit driveAngleDeg = 120 ---');
for (let i = 0; i < 3; i++) {
  const t = performance.now();
  const upd = await updateModelParams(model, [{ name: 'driveAngleDeg', value: 90 + (i + 1) * 30 }]);
  const ms = performance.now() - t;
  console.log(`  edit ${i + 1}: ${ms.toFixed(0)} ms  relowered=${upd.result.relowered.length} skipped=${upd.result.skipped.length}`);
}
