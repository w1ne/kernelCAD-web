// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/from3mf-component-assembly/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOC } from 'replicad';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'import-and-drill.kcad.ts');
const INVOCATION = 'node --import tsx docs/demos/from3mf-component-assembly/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/modeling/api.ts',
  'src/modeling/apiPartsLib.ts',
  'src/modeling/parts/fromMeshFormats.ts',
  'src/kernel/backends/occt/import3mf.ts',
];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

function validBrep(backend: OcctBackend): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

function solidCount(backend: OcctBackend): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(
    backend.getReplicadShape().wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let count = 0;
  try {
    for (; explorer.More(); explorer.Next()) count++;
    return count;
  } finally {
    explorer.delete?.();
  }
}

function meshData(backend: OcctBackend) {
  const mesh = backend.getMesh();
  return { positions: Array.from(mesh.positions), indices: Array.from(mesh.indices) };
}

const code = await readFile(SCRIPT, 'utf8');
const sourceBytes = await readFile(join(HERE, 'two-block-assembly.3mf'));
const implementation = Object.fromEntries(await Promise.all(IMPLEMENTATION_FILES.map(async (file) => [
  file,
  sha256(await readFile(join(HERE, '../../../', file))),
])));
const capture = await runScript({ code, fileName: SCRIPT, scriptDir: HERE });
const returned = capture.returnValue as { assembly: { id: string }; drilled: { id: string } };
assert(returned?.assembly?.id && returned?.drilled?.id, 'the .kcad.ts script must return the imported assembly and boolean result');

const evaluation = await new RecomputeEngine(createOcctLowerer(capture.session)).run(
  capture.records,
  { paramTable: capture.paramTable },
);
const assemblyBackend = evaluation.shapes.get(returned.assembly.id) as OcctBackend | undefined;
const drilledBackend = evaluation.shapes.get(returned.drilled.id) as OcctBackend | undefined;
assert(assemblyBackend && drilledBackend, 'both shapes must lower to OCCT B-rep geometry');
const errors = evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
assert.equal(errors.length, 0, errors.map((diagnostic) => diagnostic.message).join('\n'));

const importedRecord = capture.records.find((record) => record.id === returned.assembly.id);
assert.equal(importedRecord?.metadata?.sourceFormat, '3mf');
assert.equal(importedRecord?.metadata?.triangleCount, 24);
assert.equal(importedRecord?.metadata?.unit, 'millimeter');
const assemblyVolume = assemblyBackend.volume();
const drilledVolume = drilledBackend.volume();
const removedVolume = 40 * Math.PI;
assert(Math.abs(assemblyVolume - 2000) < 1e-6, `expected 2000 mm^3, got ${assemblyVolume}`);
assert.equal(solidCount(assemblyBackend), 2, 'component instances must remain separate solids');
assert.equal(solidCount(drilledBackend), 2, 'boolean recompute must retain both solids');
assert.deepEqual(assemblyBackend.boundingBox(), { min: [8, 4, 0], max: [30, 14, 10] });
assert(Math.abs((assemblyVolume - drilledVolume) - removedVolume) < 0.02, 'the through-hole must remove 40π mm^3');
assert(validBrep(assemblyBackend), 'the imported assembly must be a valid B-rep');
assert(validBrep(drilledBackend), 'the boolean result must be a valid B-rep');

const evidence = {
  scope: 'Local .kcad.ts API capture and OCCT B-rep recompute; no deployed behavior or hardware acceptance.',
  invocation: INVOCATION,
  script: 'import-and-drill.kcad.ts',
  sourceSha256: sha256(code),
  implementation,
  fixture: 'two-block-assembly.3mf',
  fixtureSha256: sha256(sourceBytes),
  environment: { node: process.version, meshing: { toleranceMm: 0.05, angularToleranceRadians: 0.3 } },
  input: { format: '3mf', unit: 'millimeter', triangleCount: 24, componentInstances: 2 },
  assembly: {
    volumeMm3: assemblyVolume,
    boundsMm: assemblyBackend.boundingBox(),
    solidCount: solidCount(assemblyBackend),
    brepCheckValid: validBrep(assemblyBackend),
  },
  boolean: {
    operation: 'subtract a radius 2 mm cylinder through the first 10 mm cube',
    volumeMm3: drilledVolume,
    removedVolumeMm3: assemblyVolume - drilledVolume,
    expectedRemovedVolumeMm3: removedVolume,
    boundsMm: drilledBackend.boundingBox(),
    solidCount: solidCount(drilledBackend),
    brepCheckValid: validBrep(drilledBackend),
  },
  checks: { metadataPreserved: true, separateSolids: true, assemblyBrepValid: true, booleanBrepValid: true, noErrorDiagnostics: true, volumeMatches: true },
  diagnostics: evaluation.diagnostics.map((diagnostic) => ({ severity: diagnostic.severity, message: diagnostic.message })),
  geometryFile: 'geometry.json',
  deployed: false,
  simulationRun: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify({ assembly: meshData(assemblyBackend), drilled: meshData(drilledBackend) })}\n`);
console.log(JSON.stringify({ invocation: INVOCATION, evidence: 'evidence.json', assemblyVolume, drilledVolume, solidCount: 2, noErrorDiagnostics: true }, null, 2));
