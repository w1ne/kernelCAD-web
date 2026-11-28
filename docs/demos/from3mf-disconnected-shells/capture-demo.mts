// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/from3mf-disconnected-shells/capture-demo.mts

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
const SCRIPT = join(HERE, 'import-two-shells.kcad.ts');
const FIXTURE = join(HERE, 'two-disconnected-solids.3mf');
const INVOCATION = 'node --import tsx docs/demos/from3mf-disconnected-shells/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/modeling/api.ts',
  'src/modeling/parts/fromMeshFormats.ts',
  'src/kernel/backends/occt/import3mf.ts',
  'src/kernel/backends/occt/import3mfShells.ts',
  'src/kernel/backends/occt/stlTopology.ts',
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
const fixtureBytes = await readFile(FIXTURE);
const implementation = Object.fromEntries(await Promise.all(IMPLEMENTATION_FILES.map(async (file) => [
  file,
  sha256(await readFile(join(HERE, '../../../', file))),
])));
const capture = await runScript({ code, fileName: SCRIPT, scriptDir: HERE });
const returned = capture.returnValue as { parts?: Array<{ name: string; shape: { id: string } }> };
const assemblyPart = returned?.parts?.find((part) => part.name === 'assembly');
const cutPart = returned?.parts?.find((part) => part.name === 'cut');
assert(assemblyPart?.shape?.id && cutPart?.shape?.id, 'the .kcad.ts script must return the imported compound and boolean result');

const evaluation = await new RecomputeEngine(createOcctLowerer(capture.session)).run(
  capture.records,
  { paramTable: capture.paramTable },
);
const assemblyBackend = evaluation.shapes.get(assemblyPart.shape.id) as OcctBackend | undefined;
const cutBackend = evaluation.shapes.get(cutPart.shape.id) as OcctBackend | undefined;
assert(assemblyBackend && cutBackend, 'both shapes must lower to OCCT B-rep geometry');
const errors = evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
assert.equal(errors.length, 0, errors.map((diagnostic) => diagnostic.message).join('\n'));

const record = capture.records.find((candidate) => candidate.id === assemblyPart.shape.id);
assert.equal(record?.metadata?.sourceFormat, '3mf');
assert.equal(record?.metadata?.triangleCount, 16);
assert.equal(record?.metadata?.unit, 'millimeter');
const assemblyVolume = assemblyBackend.volume();
const cutVolume = cutBackend.volume();
const expectedVolume = 1000 + 125 / 6;
const removedVolume = 40 * Math.PI;
assert(Math.abs(assemblyVolume - expectedVolume) < 1e-6, `expected ${expectedVolume} mm^3, got ${assemblyVolume}`);
assert.equal(solidCount(assemblyBackend), 2, 'each disconnected shell must remain a separate solid');
assert.equal(solidCount(cutBackend), 2, 'boolean recompute must retain both solids');
assert.deepEqual(assemblyBackend.boundingBox(), { min: [0, 0, 0], max: [25, 10, 10] });
assert(Math.abs((assemblyVolume - cutVolume) - removedVolume) < 0.02, 'the through-hole must remove 40π mm^3');
assert(validBrep(assemblyBackend), 'the imported compound must be a valid B-rep');
assert(validBrep(cutBackend), 'the boolean result must be a valid B-rep');

const evidence = {
  scope: 'Local .kcad.ts API capture and OCCT B-rep recompute; no deployed behavior or hardware acceptance.',
  invocation: INVOCATION,
  script: 'import-two-shells.kcad.ts',
  sourceSha256: sha256(code),
  implementation,
  fixture: 'two-disconnected-solids.3mf',
  fixtureSha256: sha256(fixtureBytes),
  environment: { node: process.version, meshing: { toleranceMm: 0.05, angularToleranceRadians: 0.3 } },
  input: { format: '3mf', unit: 'millimeter', triangleCount: 16, meshObjects: 1, disconnectedShells: 2 },
  assembly: {
    volumeMm3: assemblyVolume,
    boundsMm: assemblyBackend.boundingBox(),
    solidCount: solidCount(assemblyBackend),
    brepCheckValid: validBrep(assemblyBackend),
  },
  boolean: {
    operation: 'subtract a radius 2 mm through-cylinder from the cube shell',
    volumeMm3: cutVolume,
    removedVolumeMm3: assemblyVolume - cutVolume,
    expectedRemovedVolumeMm3: removedVolume,
    boundsMm: cutBackend.boundingBox(),
    solidCount: solidCount(cutBackend),
    brepCheckValid: validBrep(cutBackend),
  },
  checks: {
    oneMeshObject: true,
    twoIndependentSolids: true,
    assemblyBrepValid: true,
    booleanBrepValid: true,
    noErrorDiagnostics: true,
    volumeMatches: true,
  },
  diagnostics: evaluation.diagnostics.map((diagnostic) => ({ severity: diagnostic.severity, message: diagnostic.message })),
  geometryFile: 'geometry.json',
  deployed: false,
  simulationRun: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify({ assembly: meshData(assemblyBackend), drilled: meshData(cutBackend) })}\n`);
console.log(JSON.stringify({ invocation: INVOCATION, evidence: 'evidence.json', assemblyVolume, cutVolume, solidCount: 2, noErrorDiagnostics: true }, null, 2));
