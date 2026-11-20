// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/cutout-nurbs-profile/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOC } from 'replicad';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { runScript } from '../../../src/modeling/runtime/runScript';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = 'docs/demos/cutout-nurbs-profile';
const SOURCE = `${DIR}/instrument-lid.kcad.ts`;
const INVOCATION = `node --import tsx ${DIR}/capture-demo.mts`;
const IMPLEMENTATION_FILES = ['src/kernel/backends/occt/cutoutLowerer.ts', 'src/kernel/backends/occt/cutoutClassifier.ts'];

// Dimensions of the source script, in mm.
const LENGTH = 120;
const DEPTH = 80;
const THICKNESS = 6;
const WINDOW_RX = 30;
const WINDOW_RY = 15;
const RECESS_DEPTH = 2.5;
// A blind cutout starts 0.01 mm above the face and ends 0.01 mm below its depth.
const OVERSHOOT = 0.01;

const WINDOW = `path().ellipse(0, 8, ${WINDOW_RX}, ${WINDOW_RY})`;
const RECESS = 'path().moveTo(-14, -32).lineTo(14, -32).spline([[14, -32], [7, -24], [0, -22], [-7, -24], [-14, -32]]).close()';
// The same lid as two explicit booleans: the profiles extruded on XY and moved
// to the top-face frame (origin at the face centroid, x along +X).
const EXPLICIT = `return box(${LENGTH}, ${DEPTH}, ${THICKNESS})
  .subtract(${WINDOW}.extrude(${THICKNESS + 2}).translate(${LENGTH / 2}, ${DEPTH / 2}, -1))
  .subtract(${RECESS}.extrude(${RECESS_DEPTH + 2 * OVERSHOOT}).translate(${LENGTH / 2}, ${DEPTH / 2}, ${THICKNESS - RECESS_DEPTH - OVERSHOOT}));`;
const WINDOW_ONLY = `return box(${LENGTH}, ${DEPTH}, ${THICKNESS}).cutout(${WINDOW}, { face: 'top', depth: 'through' });`;

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

async function evaluate(code: string, fileName: string) {
  const run = await runScript({ code, fileName });
  const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
  const errors = lowered.diagnostics.filter((d) => d.severity === 'error');
  const result = lowered.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { errors, result };
}

await initOcct();

const code = await readFile(SOURCE, 'utf8');
const lid = await evaluate(code, SOURCE);
assert.deepEqual(lid.errors, [], 'lid: error diagnostics');
const solid = lid.result!;
const valid = isValidShape(getOC(), solid.getReplicadShape().wrapped);
assert.equal(valid, true, 'lid B-rep validity');
const volume = solid.volume();
const faces = solid.getReplicadShape().faces;

const explicit = await evaluate(EXPLICIT, 'explicit.kcad.ts');
assert.deepEqual(explicit.errors, [], 'explicit boolean: error diagnostics');
const explicitVolume = explicit.result!.volume();
assert.ok(Math.abs(volume - explicitVolume) < 1e-9 * explicitVolume, `lid ${volume} vs explicit ${explicitVolume}`);
assert.equal(faces.length, explicit.result!.getReplicadShape().faces.length, 'face count equals the explicit boolean');

// Closed form: an elliptical through-window removes π·rx·ry·t.
const windowOnly = await evaluate(WINDOW_ONLY, 'window.kcad.ts');
const windowRemoved = LENGTH * DEPTH * THICKNESS - windowOnly.result!.volume();
const windowExpected = Math.PI * WINDOW_RX * WINDOW_RY * THICKNESS;
assert.ok(Math.abs(windowRemoved - windowExpected) < 1e-6 * windowExpected, `window ${windowRemoved} vs ${windowExpected}`);

const walls: Record<string, number> = {};
for (const lineage of solid.historyMap?.values() ?? []) {
  if (lineage.featureKind === 'cutout' && lineage.labelName === 'wall' && lineage.featureName) {
    walls[lineage.featureName] = (walls[lineage.featureName] ?? 0) + 1;
  }
}
// Four quarter-ellipse wall faces; the recess has one flat and one spline wall.
assert.deepEqual(walls, { displayWindow: 4, thumbRecess: 2 }, 'wall created refs');
const surfaceTypes: Record<string, number> = {};
for (const face of faces) surfaceTypes[face.geomType as string] = (surfaceTypes[face.geomType as string] ?? 0) + 1;

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: an instrument enclosure lid with an elliptical through-window and a spline-bounded blind thumb recess, both made with Shape.cutout(). OCCT volume, validity, face and created-ref checks against a closed form and against the same lid built from explicit booleans.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { length: LENGTH, depth: DEPTH, thickness: THICKNESS, windowRx: WINDOW_RX, windowRy: WINDOW_RY, recessDepth: RECESS_DEPTH },
  expected: {
    basis: 'an elliptical through-window removes π·rx·ry·t; the whole lid equals box − extruded window − extruded recess placed at the top-face frame, with the 0.01 mm cutout overshoot',
    windowRemovedMm3: round(windowExpected),
    explicitBooleanVolumeMm3: round(explicitVolume),
    wallRefs: { displayWindow: 4, thumbRecess: 2 },
  },
  now: {
    errorDiagnostics: 0,
    brepValid: valid,
    volumeMm3: round(volume),
    windowRemovedMm3: round(windowRemoved),
    faces: faces.length,
    surfaceTypes,
    wallRefs: walls,
  },
  before: {
    commit: '0f6b97032',
    result: "feature.kernel-failed: cutout prism construction failed: drawingFromCommands: unsupported segment kind 'nurbsSegment' (the spline recess alone fails with segment kind 'spline')",
  },
  limits: [
    'The value under "before" is recorded from a run on the named commit; this script does not measure it again.',
    'A blind cutout overshoots its depth by 0.01 mm, as it does for a polyline profile; the recess floor is at 3.49 mm, not 3.5 mm.',
    'The cutout floor does not get the "floor" created ref because of that overshoot; this is not changed here.',
    'No other CAD system opened the model, and no lid was made.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: evidence.now }, null, 2));
