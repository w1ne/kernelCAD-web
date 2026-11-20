// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-single-body-roundtrip/capture-demo.mts

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
import type { StepAssemblySnapshot } from '../../../src/kernel/import/stepAssemblyTypes';
import { writeStepBundle } from '../../../src/kernel/import/stepBundleWriter';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'docs/demos/step-single-body-roundtrip/motor-plate.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/step-single-body-roundtrip/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/singleBodyStepExport.ts',
  'src/kernel/backends/occt/stepAssemblyExport.ts',
  'src/agent/script-runtime/exportPhases.ts',
];
const EXPECTED = { name: 'motor-plate', color: '#3366cc' };
// 100 x 80 x 4 plate less four 5.5 mm holes, four 3.4 mm holes and the 22 mm pilot.
const EXPECTED_VOLUME_MM3 = 4 * (100 * 80 - Math.PI * (4 * 2.75 ** 2 + 4 * 1.7 ** 2 + 11 ** 2));
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

/** The single body of a STEP file, as the OCCT XCAF reader returns it. */
function describeBody(snapshot: StepAssemblySnapshot) {
  assert.equal(snapshot.occurrences.length, 1, 'one body');
  assert.equal(snapshot.definitions.length, 1, 'one product');
  const [body] = snapshot.occurrences;
  const [definition] = snapshot.definitions;
  return {
    name: body.name,
    path: body.sourcePath,
    color: body.color?.hex ?? null,
    solidCount: definition.solidCount,
    volumeMm3: round(definition.volumeMm3, 3),
    boundsMm: { min: definition.boundsMm.min.map((v) => round(v, 4)), max: definition.boundsMm.max.map((v) => round(v, 4)) },
    matrixColumnMajor: body.transform.map((v) => round(v, 9)),
  };
}

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Export the bare shape. This STEP file is what a shop would receive.
const first = await runAndExport({ code, fileName: SOURCE, format: 'step' });
assert.deepEqual(first.diagnostics.filter((d) => d.severity === 'error'), []);
const firstText = new TextDecoder().decode(first.bytes);
const firstSnapshot = await importStepAssembly(first.bytes, 'motor-plate.step');
const firstBody = describeBody(firstSnapshot);

// 2. Import it as a KernelCAD project (the writer behind `kernelcad import-step`).
const workDir = await mkdtemp(join(tmpdir(), 'kcad-step-single-body-demo-'));
let importedScript: string;
let renamedParts: unknown[];
let second: Awaited<ReturnType<typeof runAndExport>>;
try {
  const bundle = await writeStepBundle({
    inputName: 'motor-plate.step',
    inputBytes: first.bytes,
    outDir: join(workDir, 'motor-plate-import'),
    assemblyName: 'motor-plate',
    snapshot: firstSnapshot,
  });
  importedScript = await readFile(bundle.script, 'utf8');
  renamedParts = bundle.renamedParts;
  // 3. Export the imported project to STEP again.
  second = await runAndExport({ code: importedScript, fileName: 'motor-plate.kcad.ts', scriptDir: bundle.outDir, format: 'step' });
} finally {
  await rm(workDir, { recursive: true, force: true });
}
assert.deepEqual(second.diagnostics.filter((d) => d.severity === 'error'), []);
const secondBody = describeBody(await importStepAssembly(second.bytes, 'motor-plate-roundtrip.step'));

// Acceptance: the name and the colour of the source survive both files.
for (const [label, body] of [['first export', firstBody], ['second export', secondBody]] as const) {
  assert.equal(body.name, EXPECTED.name, `${label}: name`);
  assert.equal(body.color, EXPECTED.color, `${label}: colour`);
  assert.equal(body.solidCount, 1, `${label}: solid count`);
  assert.ok(Math.abs(body.volumeMm3 - EXPECTED_VOLUME_MM3) <= 1e-2, `${label}: volume`);
}
assert.deepEqual(firstBody.path, [EXPECTED.name], 'the first export has no assembly level');
assert.deepEqual(secondBody.boundsMm, firstBody.boundsMm, 'bounds');
assert.deepEqual(secondBody.matrixColumnMajor, firstBody.matrixColumnMajor, 'placement');
assert.deepEqual(renamedParts, [], 'no part was renamed on import');

const stepLines = (pattern: RegExp) => firstText.replace(/\r?\n\s+/g, ' ').split(/\r?\n/).filter((line) => pattern.test(line));
const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
await writeFile(join(HERE, 'motor-plate.step'), first.bytes);
const evidence = {
  scope: 'Local kernelCAD Node API: STEP export of a bare shape, import as a KernelCAD project, second STEP export. Both files are read back through the OCCT XCAF STEP reader.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  expected: { ...EXPECTED, volumeMm3: round(EXPECTED_VOLUME_MM3, 3) },
  step: {
    file: 'motor-plate.step',
    bytes: first.bytes.length,
    sha256: sha256(first.bytes),
    productLines: stepLines(/= PRODUCT\(/),
    colourLines: stepLines(/= COLOUR_RGB\(/),
  },
  firstExport: firstBody,
  importedProject: {
    writer: 'writeStepBundle (kernelcad import-step)',
    scriptSha256: sha256(importedScript),
    scriptLines: importedScript.split('\n').length,
    script: importedScript.split('\n'),
    renamedParts,
  },
  secondExport: { bytes: second.bytes.length, sha256: sha256(second.bytes), ...secondBody },
  checks: {
    nameMatches: true,
    colourMatches: true,
    volumeToleranceMm3: 1e-2,
    volumeErrorFirstMm3: round(Math.abs(firstBody.volumeMm3 - EXPECTED_VOLUME_MM3), 4),
    volumeErrorSecondMm3: round(Math.abs(secondBody.volumeMm3 - EXPECTED_VOLUME_MM3), 4),
    boundsMatch: true,
    placementMatches: true,
  },
  limits: [
    'Other CAD systems were not used to open the files.',
    'The STEP product name is the script file name; a script cannot set a different name for a bare shape.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
// The mesh of the first STEP file's product, for the video.
const backend = importBrepBytes(firstSnapshot.definitions[0].brep);
try {
  const mesh = backend.getMesh();
  const geometry = { positions: Array.from(mesh.positions, (v) => round(v, 4)), indices: Array.from(mesh.indices) };
  await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify(geometry)}\n`);
} finally {
  backend.dispose();
}
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ step: evidence.step, firstExport: firstBody, secondExport: evidence.secondExport, script: importedScript.split('\n'), checks: evidence.checks }, null, 2));
