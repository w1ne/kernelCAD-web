// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/fromstl-sealed-cavity/capture-demo.mts

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
const SCRIPT = join(HERE, 'port-sealed-float.kcad.ts');
const FIXTURE = join(HERE, 'sealed-float.stl');
const INVOCATION = 'node --import tsx docs/demos/fromstl-sealed-cavity/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/modeling/parts/fromMeshFormats.ts',
  'src/kernel/backends/occt/importStl.ts',
  'src/kernel/backends/occt/stlCavities.ts',
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

function count(backend: OcctBackend, kind: 'TopAbs_SOLID' | 'TopAbs_SHELL'): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(
    backend.getReplicadShape().wrapped,
    oc.TopAbs_ShapeEnum[kind],
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let n = 0;
  try {
    for (; explorer.More(); explorer.Next()) n++;
    return n;
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
const evaluation = await new RecomputeEngine(createOcctLowerer(capture.session)).run(
  capture.records,
  { paramTable: capture.paramTable },
);
const backendOf = (name: string): OcctBackend => {
  const id = returned?.parts?.find((part) => part.name === name)?.shape?.id;
  assert(id, `the .kcad.ts script must return '${name}'`);
  const backend = evaluation.shapes.get(id) as OcctBackend | undefined;
  assert(backend, `'${name}' must lower to OCCT B-rep geometry`);
  return backend;
};
const float = backendOf('float');
const ported = backendOf('ported');
const floatSection = backendOf('floatSection');
const portedSection = backendOf('portedSection');
const errors = evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
assert.equal(errors.length, 0, errors.map((diagnostic) => diagnostic.message).join('\n'));

// 32-sided prisms: 30 mm across corners x 40 mm outside, 24 mm across corners x 34 mm void.
const prismArea = (radius: number) => 16 * radius * radius * Math.sin(Math.PI / 16);
const expectedVolume = prismArea(15) * 40 - prismArea(12) * 34;
const expectedRemoved = Math.PI * 9 * 6;
const floatVolume = float.volume();
const portedVolume = ported.volume();
// Binary STL stores float32 corners, so volumes are compared to 0.01 mm^3.
assert(Math.abs(floatVolume - expectedVolume) < 0.01, `expected ${expectedVolume} mm^3, got ${floatVolume}`);
assert.equal(count(float, 'TopAbs_SOLID'), 1, 'the float must be one solid');
assert.equal(count(float, 'TopAbs_SHELL'), 2, 'the void must be an inner shell of that solid');
assert(Math.abs(floatVolume - portedVolume - expectedRemoved) < 0.01, 'the port must remove 54 pi mm^3 of wall');
assert.equal(count(ported, 'TopAbs_SOLID'), 1, 'the ported float must stay one solid');
assert(Math.abs(floatSection.volume() - expectedVolume / 2) < 0.01, 'the cutaway must keep half the wall material');
assert(Math.abs(portedSection.volume() - (expectedVolume - expectedRemoved) / 2) < 0.01, 'the ported cutaway must keep half the material');
for (const backend of [float, ported, floatSection, portedSection]) assert(validBrep(backend), 'every result must be a valid B-rep');

const measure = (backend: OcctBackend) => ({
  volumeMm3: backend.volume(),
  boundsMm: backend.boundingBox(),
  solidCount: count(backend, 'TopAbs_SOLID'),
  shellCount: count(backend, 'TopAbs_SHELL'),
  brepCheckValid: validBrep(backend),
});
const evidence = {
  scope: 'Local .kcad.ts API capture and OCCT B-rep recompute; no deployed behavior or hardware acceptance.',
  invocation: INVOCATION,
  script: 'port-sealed-float.kcad.ts',
  sourceSha256: sha256(code),
  implementation,
  fixture: 'sealed-float.stl',
  fixtureSha256: sha256(fixtureBytes),
  fixtureWriter: 'Blender 4.0.2 (examples/interoperability/stl-sealed-cavity/make-fixture.py)',
  environment: { node: process.version, meshing: { toleranceMm: 0.05, angularToleranceRadians: 0.3 } },
  input: { format: 'stl', triangleCount: 248, meshShells: 2, inwardFacingShells: 1 },
  expected: { volumeMm3: expectedVolume, portRemovedVolumeMm3: expectedRemoved },
  beforeChange: {
    note: 'Measured on origin/develop 6347a295f with the same fixture and port.',
    float: { volumeMm3: 12810.410946030353, solidCount: 2 },
    ported: { volumeMm3: 1413.7166941154428, solidCount: 3 },
  },
  float: measure(float),
  ported: { ...measure(ported), removedVolumeMm3: floatVolume - portedVolume },
  floatSection: measure(floatSection),
  portedSection: measure(portedSection),
  diagnostics: evaluation.diagnostics.map((diagnostic) => ({ severity: diagnostic.severity, message: diagnostic.message })),
  geometryFile: 'geometry.json',
  deployed: false,
  simulationRun: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify({ floatSection: meshData(floatSection), portedSection: meshData(portedSection) })}\n`);
console.log(JSON.stringify({ invocation: INVOCATION, float: evidence.float, ported: evidence.ported }, null, 2));
