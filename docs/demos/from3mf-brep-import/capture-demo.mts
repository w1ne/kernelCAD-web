// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/from3mf-brep-import/capture-demo.mts

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
const INVOCATION = 'node --import tsx docs/demos/from3mf-brep-import/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/modeling/api.ts',
  'src/modeling/apiPartsLib.ts',
  'src/modeling/parts/fromMeshFormats.ts',
  'src/kernel/backends/occt/import3mf.ts',
];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

function validSolid(backend: OcctBackend): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

function meshData(backend: OcctBackend) {
  const mesh = backend.getMesh();
  return { positions: Array.from(mesh.positions), indices: Array.from(mesh.indices) };
}

const code = await readFile(SCRIPT, 'utf8');
const sourceBytes = await readFile(join(HERE, 'generic-cube.3mf'));
const implementation = Object.fromEntries(await Promise.all(IMPLEMENTATION_FILES.map(async (file) => [
  file,
  sha256(await readFile(join(HERE, '../../../', file))),
])));
const capture = await runScript({ code, fileName: SCRIPT, scriptDir: HERE });
const returned = capture.returnValue as { source: { id: string }; drilled: { id: string } };
assert(returned?.source?.id && returned?.drilled?.id, 'the .kcad.ts script must return the imported and drilled bodies');

const evaluation = await new RecomputeEngine(createOcctLowerer(capture.session)).run(
  capture.records,
  { paramTable: capture.paramTable },
);
const sourceBackend = evaluation.shapes.get(returned.source.id) as OcctBackend | undefined;
const drilledBackend = evaluation.shapes.get(returned.drilled.id) as OcctBackend | undefined;
assert(sourceBackend && drilledBackend, 'both bodies must lower to OCCT B-rep geometry');
const errors = evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
assert.equal(errors.length, 0, errors.map((diagnostic) => diagnostic.message).join('\n'));

const importedRecord = capture.records.find((record) => record.id === returned.source.id);
assert.equal(importedRecord?.metadata?.sourceFormat, '3mf');
assert.equal(importedRecord?.metadata?.triangleCount, 12);
assert.equal(importedRecord?.metadata?.unit, 'millimeter');
const sourceVolume = sourceBackend.volume();
const drilledVolume = drilledBackend.volume();
const expectedRemoved = 40 * Math.PI;
assert(Math.abs(sourceVolume - 1000) < 1e-6, `expected 1000 mm^3, got ${sourceVolume}`);
assert(Math.abs((sourceVolume - drilledVolume) - expectedRemoved) < 0.02, 'the through-hole must remove 40π mm^3');
assert(validSolid(sourceBackend), 'the imported mesh must be a valid solid');
assert(validSolid(drilledBackend), 'the boolean result must be a valid solid');

const evidence = {
  scope: 'Local .kcad.ts API capture and OCCT B-rep recompute; no deployed behavior or hardware acceptance.',
  invocation: INVOCATION,
  script: 'import-and-drill.kcad.ts',
  sourceSha256: sha256(code),
  implementation,
  fixture: 'generic-cube.3mf',
  fixtureSha256: sha256(sourceBytes),
  environment: { node: process.version, meshing: { toleranceMm: 0.05, angularToleranceRadians: 0.3 } },
  input: { format: '3mf', unit: 'millimeter', triangleCount: 12 },
  source: {
    volumeMm3: sourceVolume,
    boundsMm: sourceBackend.boundingBox(),
    brepCheckValid: validSolid(sourceBackend),
  },
  boolean: {
    operation: 'subtract a radius 2 mm cylinder through the 10 mm cube',
    volumeMm3: drilledVolume,
    removedVolumeMm3: sourceVolume - drilledVolume,
    expectedRemovedVolumeMm3: expectedRemoved,
    boundsMm: drilledBackend.boundingBox(),
    brepCheckValid: validSolid(drilledBackend),
  },
  checks: { metadataPreserved: true, sourceBrepValid: true, booleanBrepValid: true, noErrorDiagnostics: true, volumeMatches: true },
  diagnostics: evaluation.diagnostics.map((diagnostic) => ({ severity: diagnostic.severity, message: diagnostic.message })),
  geometryFile: 'geometry.json',
  deployed: false,
  simulationRun: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify({ source: meshData(sourceBackend), drilled: meshData(drilledBackend) })}\n`);
console.log(JSON.stringify({ invocation: INVOCATION, evidence: 'evidence.json', sourceVolume, drilledVolume, noErrorDiagnostics: true }, null, 2));
