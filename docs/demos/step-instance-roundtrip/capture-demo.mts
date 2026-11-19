// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-instance-roundtrip/capture-demo.mts

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
const SOURCE = 'examples/bom/panel-with-fasteners.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/step-instance-roundtrip/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/sceneStepExport.ts',
  'src/kernel/import/stepBundleWriter.ts',
  'src/modeling/backends/occt/lowerers/partPrototype.ts',
];
const PLACEMENT_TOLERANCE_MM = 1e-6;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

function describeTree(snapshot: StepAssemblySnapshot) {
  return snapshot.definitions.map((definition) => ({
    product: definition.name,
    solidCount: definition.solidCount,
    volumeMm3: round(definition.volumeMm3, 3),
    localBoundsMm: { min: definition.boundsMm.min.map((v) => round(v, 4)), max: definition.boundsMm.max.map((v) => round(v, 4)) },
    instances: snapshot.occurrences.filter((o) => o.definitionId === definition.id).map((o) => ({
      name: o.name,
      path: o.sourcePath,
      translationMm: [round(o.transform[12]), round(o.transform[13]), round(o.transform[14])],
      matrixColumnMajor: o.transform.map((v) => round(v, 9)),
      color: o.color?.hex ?? null,
    })),
  }));
}

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Export the example. This STEP file is the product tree a shop would receive.
const first = await runAndExport({ code, fileName: SOURCE, format: 'step' });
assert.deepEqual(first.diagnostics.filter((d) => d.severity === 'error'), []);
const firstSnapshot = await importStepAssembly(first.bytes, 'panel.step');
const firstTree = describeTree(firstSnapshot);

// 2. Import it as a KernelCAD project (the writer behind `kernelcad import-step`).
const workDir = await mkdtemp(join(tmpdir(), 'kcad-step-roundtrip-demo-'));
let importedScript: string;
let second: Awaited<ReturnType<typeof runAndExport>>;
try {
  const bundle = await writeStepBundle({
    inputName: 'panel.step',
    inputBytes: first.bytes,
    outDir: join(workDir, 'panel-import'),
    assemblyName: 'panel',
    snapshot: firstSnapshot,
  });
  importedScript = await readFile(bundle.script, 'utf8');
  // 3. Export the imported project to STEP again.
  second = await runAndExport({ code: importedScript, fileName: 'panel.kcad.ts', scriptDir: bundle.outDir, format: 'step' });
} finally {
  await rm(workDir, { recursive: true, force: true });
}
assert.deepEqual(second.diagnostics.filter((d) => d.severity === 'error'), []);
const secondSnapshot = await importStepAssembly(second.bytes, 'panel-roundtrip.step');
const secondTree = describeTree(secondSnapshot);

// Acceptance: the second STEP file holds the same product tree as the first.
assert.equal(secondTree.length, firstTree.length, 'product count');
assert.equal(secondSnapshot.occurrences.length, firstSnapshot.occurrences.length, 'instance count');
let maxPlacementErrorMm = 0;
const comparison = firstTree.map((product) => {
  const names = product.instances.map((instance) => instance.name);
  // The imported project names each part by its STEP path: '<root>__<instance>'.
  const match = secondTree.find((candidate) => candidate.instances.some((instance) => instance.name.endsWith(`__${names[0]}`)));
  assert.ok(match, `no round-trip product holds '${names[0]}'`);
  assert.equal(match.instances.length, product.instances.length, `instance count for '${product.product}'`);
  assert.equal(match.solidCount, product.solidCount);
  assert.ok(Math.abs(match.volumeMm3 - product.volumeMm3) <= 1e-3, `volume for '${product.product}'`);
  assert.deepEqual(match.localBoundsMm, product.localBoundsMm, `source-frame bounds for '${product.product}'`);
  for (const instance of product.instances) {
    const again = match.instances.find((candidate) => candidate.name.endsWith(`__${instance.name}`));
    assert.ok(again, `instance '${instance.name}' is missing after the round trip`);
    assert.equal(again.color, instance.color, `colour of '${instance.name}'`);
    instance.matrixColumnMajor.forEach((value, index) => {
      const error = Math.abs(value - again.matrixColumnMajor[index]);
      maxPlacementErrorMm = Math.max(maxPlacementErrorMm, error);
      assert.ok(error <= PLACEMENT_TOLERANCE_MM, `placement of '${instance.name}'`);
    });
  }
  return {
    product: product.product,
    instancesFirstExport: product.instances.length,
    instancesAfterRoundTrip: match.instances.length,
    roundTripProduct: match.product,
    roundTripInstanceNames: match.instances.map((instance) => instance.name),
    volumeMm3: product.volumeMm3,
    color: product.instances[0].color,
  };
});

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
await writeFile(join(HERE, 'panel-roundtrip.step'), second.bytes);
const evidence = {
  scope: 'Local kernelCAD Node API: STEP export, import as a KernelCAD project, second STEP export. Both files are read back through the OCCT XCAF STEP reader.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  firstExport: { bytes: first.bytes.length, sha256: sha256(first.bytes), productCount: firstTree.length, instanceCount: firstSnapshot.occurrences.length },
  importedProject: {
    writer: 'writeStepBundle (kernelcad import-step)',
    scriptSha256: sha256(importedScript),
    scriptLines: importedScript.split('\n').length,
    scriptExcerpt: importedScript.split('\n').slice(0, 14),
  },
  step: { file: 'panel-roundtrip.step', bytes: second.bytes.length, sha256: sha256(second.bytes) },
  tree: {
    productCount: secondTree.length,
    instanceCount: secondSnapshot.occurrences.length,
    importWarnings: secondSnapshot.warnings,
    products: secondTree,
  },
  comparison,
  checks: {
    productCountsMatch: true,
    instanceCountsMatch: true,
    coloursMatch: true,
    productVolumesAndBoundsMatch: true,
    placementToleranceMm: PLACEMENT_TOLERANCE_MM,
    maxPlacementErrorMm,
  },
  limits: [
    "The imported project names each part by its STEP path ('panel__standoff_0'), so instance names gain the root name as a prefix after the round trip.",
    'Other CAD systems were not used to open the files.',
    'The file hashes are for this capture only: OCCT orders the colour style entities of a multi-colour scene differently between writes.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
// One mesh per product of the second STEP file; the video places it once per instance.
const geometry = secondSnapshot.definitions.map((definition) => {
  const backend = importBrepBytes(definition.brep);
  try {
    const mesh = backend.getMesh();
    return {
      product: definition.name,
      positions: Array.from(mesh.positions, (v) => round(v, 4)),
      indices: Array.from(mesh.indices),
      placements: secondSnapshot.occurrences.filter((o) => o.definitionId === definition.id).map((o) => o.transform.map((v) => round(v, 6))),
    };
  } finally {
    backend.dispose();
  }
});
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify(geometry)}\n`);
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ firstExport: evidence.firstExport, step: evidence.step, comparison, checks: evidence.checks }, null, 2));
