// BOM order-pack demo — retained evidence for `export({ format: 'order-pack' })`
// and `fab_pack({ scope: 'bom' })`.
//
// Evaluates one small mixed assembly — a fabricated CNC plate, a fabricated
// bent sheet-metal bracket (process inferred from the sheetMetal chain) and
// two purchased catalog screws — then collects the order pack through the
// same agent-side pipeline both surfaces use: evaluateAndBuildScript ->
// collectOrderPack -> buildOrderPack (manifest, README, bom.csv/json, vendor
// handoff texts, per-part files). Only the text evidence is retained here
// (bom.csv, manifest.json, handoffs/*.txt, result.json); the per-part model
// and drawing bytes and the zip are produced in memory and not written.
//
// Run from the repository root with Node 22:
//   export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
//   npx tsc -b
//   node --import tsx docs/demos/bom-order/run-demo.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend.ts';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate.ts';
import { collectOrderPack } from '../../../src/agent/script-runtime/orderPackExport.ts';
import { computeBom } from '../../../src/agent/script-runtime/bom.ts';

const PACK_NAME = 'demo-kit';
const FILE_NAME = 'bom-order-demo.kcad.ts';
const SCRIPT = `
const arm = assembly('demo-kit');
arm.part('plate', box(40, 20, 3), { at: [0, 0, 0], process: 'cnc', material: 'aluminum' });

const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
arm.part('bracket', blank.bend({ atX: 25 }, 90, 3), { at: [0, 30, 0], material: 'mild-steel' });

const screw = await lib.fetchPart('iso-4762-m2x4');
arm.part('screw_0', screw, { at: [5, 5, 3] });
arm.part('screw_1', screw, { at: [35, 5, 3] });
return arm.model();
`;

const dir = fileURLToPath(new URL('.', import.meta.url));

await initOcct();
const { evaluation, model } = await evaluateAndBuildScript({ code: SCRIPT });
if (evaluation.exitCode !== 0 || model === undefined) {
  const errors = evaluation.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
  throw new Error(`script evaluation failed: ${errors.join('; ') || 'no model built'}`);
}
const arm = [...model.session.assemblies.values()][0];
if (arm === undefined) throw new Error('no assembly captured by the script');

// Same ScriptRun view `fab_pack` scope 'bom' rebuilds before calling the
// collector; the sheet-metal flatten walk reads records + paramTable.
const run = {
  records: model.records,
  session: model.session,
  paramTable: model.session.paramTable,
  returnValue: model.returnValue,
};

const collected = await collectOrderPack(
  {
    code: SCRIPT,
    fileName: FILE_NAME,
    format: 'order-pack',
    options: { format: 'order-pack', name: PACK_NAME },
  },
  run,
  arm,
  evaluation.diagnostics,
  evaluation.featureCount,
);

function entryText(path) {
  const entry = collected.entries.find((e) => e.path === path);
  if (entry === undefined) throw new Error(`order pack is missing ${path}`);
  return new TextDecoder().decode(entry.bytes);
}

const handoffVendors = ['mcmaster', 'mouser', 'digikey'];
const handoffs = Object.fromEntries(handoffVendors.map((v) => [v, entryText(`handoffs/${v}.txt`)]));
const handoffLines = Object.fromEntries(
  Object.entries(handoffs).map(([v, text]) => [v, text.split('\n').filter((l) => l.trim() !== '').length]),
);

const bom = await computeBom(arm, model.session);
const result = {
  ok: true,
  parts: bom.rows.map((row) => ({
    name: row.name,
    qty: row.quantity,
    kind: row.kind,
    process: row.process,
    processSource: row.processSource,
  })),
  handoffLines,
  notes: collected.notes,
};

await mkdir(join(dir, 'handoffs'), { recursive: true });
await writeFile(join(dir, 'bom.csv'), entryText('bom.csv'));
await writeFile(join(dir, 'manifest.json'), entryText('manifest.json'));
for (const vendor of handoffVendors) {
  await writeFile(join(dir, 'handoffs', `${vendor}.txt`), handoffs[vendor]);
}
await writeFile(join(dir, 'result.json'), JSON.stringify(result, null, 2) + '\n');

console.log(JSON.stringify({
  ok: result.ok,
  entries: collected.entries.length,
  parts: result.parts.length,
  handoffLines: result.handoffLines,
  notes: result.notes.length,
}));
