// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-uncoloured-parts/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { importBrepBytes } from '../../../src/kernel/backends/occt/importBrep';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import { writeStepBundle } from '../../../src/kernel/import/stepBundleWriter';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'examples/bom/panel-with-fasteners.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/step-uncoloured-parts/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/stepAssemblyExport.ts',
  'src/kernel/backends/occt/sceneStepExport.ts',
  'src/kernel/import/stepBundleWriter.ts',
];
// Recorded from docs/demos/step-instance-roundtrip/evidence.json on develop
// 5f6868265, a capture of the same source before this change. This script
// does not measure these values again.
const BEFORE = {
  commit: '5f6868265',
  record: 'docs/demos/step-instance-roundtrip/evidence.json',
  colourEntity: "DRAUGHTING_PRE_DEFINED_COLOUR('red')",
  instancesReadWithColour: 9,
  readColour: '#ff0000',
  importedScriptLines: 40,
  importedScriptExcerpt: [
    'const imported = assembly("panel");',
    'const part_000001 = (await lib.fromBREP("./parts/7bb93074216364f8b94f2e6592b40db0de05cb307c8a28bd37dafe9284c1702c.brep"))',
    '  .color("#ff0000");',
    'imported.part("plate", part_000001);',
    'const part_000002 = (await lib.fromBREP("./parts/cc84d851f32b62aa059ba2a6f36e17c8c729c6960617116de4562eeb52acd79c.brep"))',
    '  .translate(20, 10, 3)',
    '  .color("#ff0000");',
    'imported.part("standoff_0", part_000002);',
  ],
};
const COLOUR_ENTITY = /COLOUR_RGB|PRE_DEFINED_COLOUR/g;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

await initOcct();
const code = await readFile(SOURCE, 'utf8');
assert.ok(!code.includes('.color('), 'the source sets no colour');

// 1. Export the example. The file must hold no colour entity.
const exported = await runAndExport({ code, fileName: SOURCE, format: 'step' });
assert.deepEqual(exported.diagnostics.filter((d) => d.severity === 'error'), []);
const text = new TextDecoder().decode(exported.bytes);
const colourEntities = [...text.matchAll(COLOUR_ENTITY)].length;
assert.equal(colourEntities, 0, 'colour entities in the file');

// 2. Read it back: same product tree, no colour on any instance.
const snapshot = await importStepAssembly(exported.bytes, 'panel.step');
assert.equal(snapshot.definitions.length, 4, 'product count');
assert.equal(snapshot.occurrences.length, 9, 'instance count');
const withColour = snapshot.occurrences.filter((o) => o.color !== undefined);
assert.deepEqual(withColour.map((o) => o.name), [], 'instances read with a colour');

// 3. Import as a KernelCAD project: the generated script sets no colour.
const workDir = await mkdtemp(join(tmpdir(), 'kcad-step-uncoloured-demo-'));
let importedScript: string;
try {
  const bundle = await writeStepBundle({
    inputName: 'panel.step',
    inputBytes: exported.bytes,
    outDir: join(workDir, 'panel-import'),
    assemblyName: 'panel',
    snapshot,
  });
  importedScript = await readFile(bundle.script, 'utf8');
} finally {
  await rm(workDir, { recursive: true, force: true });
}
const colourCalls = [...importedScript.matchAll(/\.color\(/g)].length;
assert.equal(colourCalls, 0, '.color( calls in the imported script');

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const products = snapshot.definitions.map((definition) => ({
  product: definition.name,
  volumeMm3: round(definition.volumeMm3, 3),
  instances: snapshot.occurrences.filter((o) => o.definitionId === definition.id).map((o) => ({ name: o.name, color: o.color?.hex ?? null })),
}));
const evidence = {
  scope: 'Local kernelCAD Node API: STEP export of an assembly that sets no colours, text check for colour entities, read-back through the OCCT XCAF STEP reader, and import as a KernelCAD project.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  step: { bytes: exported.bytes.length, sha256: sha256(exported.bytes), colourEntities },
  tree: {
    productCount: snapshot.definitions.length,
    instanceCount: snapshot.occurrences.length,
    instancesReadWithColour: withColour.length,
    importWarnings: snapshot.warnings,
    products,
  },
  importedProject: {
    writer: 'writeStepBundle (kernelcad import-step)',
    scriptSha256: sha256(importedScript),
    scriptLines: importedScript.split('\n').length,
    colourCalls,
    scriptExcerpt: importedScript.split('\n').slice(2, 8),
  },
  before: BEFORE,
  limits: [
    'Other CAD systems were not used to open the file.',
    'The values under "before" are recorded from a capture on the named commit; this script does not measure them again.',
    'A project imported from STEP with an earlier kernelCAD version keeps the explicit red colour that version wrote into its script.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
// One mesh per product; the video places it once per instance.
const geometry = snapshot.definitions.map((definition) => {
  const backend = importBrepBytes(definition.brep);
  try {
    const mesh = backend.getMesh();
    return {
      product: definition.name,
      positions: Array.from(mesh.positions, (v) => round(v, 4)),
      indices: Array.from(mesh.indices),
      placements: snapshot.occurrences.filter((o) => o.definitionId === definition.id).map((o) => o.transform.map((v) => round(v, 6))),
    };
  } finally {
    backend.dispose();
  }
});
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify(geometry)}\n`);
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ step: evidence.step, tree: { ...evidence.tree, products: undefined }, importedProject: evidence.importedProject }, null, 2));
