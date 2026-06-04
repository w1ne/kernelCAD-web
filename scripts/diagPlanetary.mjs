import { evaluateAndBuildScript } from '../src/agent/cli/commands/evaluate.ts';
const r = await evaluateAndBuildScript({ file: 'examples/gallery/gearfinity-planetary-stage.kcad.ts' });
console.log('exitCode:', r.evaluation.exitCode);
for (const d of r.evaluation.diagnostics) {
  console.log('-', d.severity, d.code, '||', d.message);
  if (d.hint) console.log('   hint:', d.hint);
}
console.log('records:', (r.model?.records ?? []).length);
const parts = (r.model?.records ?? []).filter((x) => x.kind === 'assemblyPart');
console.log('assemblyParts:', parts.length);
