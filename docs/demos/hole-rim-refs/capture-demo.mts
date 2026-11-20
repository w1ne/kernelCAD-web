// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/hole-rim-refs/capture-demo.mts

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
const DIR = 'docs/demos/hole-rim-refs';
const SOURCE = `${DIR}/mount-plate.kcad.ts`;
const INVOCATION = `node --import tsx ${DIR}/capture-demo.mts`;
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/holeRims.ts',
  'src/kernel/backends/occt/holeLowerer.ts',
  'src/kernel/backends/occt/edgeSelection.ts',
];

// Dimensions of the source script, in mm.
const SIDE = 60;
const THICKNESS = 6;
const PILOT_R = 22.5 / 2;
const SCREW_R = 3.4 / 2;
const SCREWS = 4;
const CHAMFER = 0.5;

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
// A 45° chamfer of leg c on a circular edge of radius r removes a triangular
// ring: area c²/2 at centroid radius r + c/3 (Pappus).
const chamferRing = (r: number, c: number) => 2 * Math.PI * (r + c / 3) * (c * c) / 2;

async function evaluate(code: string, fileName: string) {
  const run = await runScript({ code, fileName });
  const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
  const errors = lowered.diagnostics.filter((d) => d.severity === 'error');
  const result = lowered.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { errors, result };
}

await initOcct();

const code = await readFile(SOURCE, 'utf8');
const plate = await evaluate(code, SOURCE);
assert.deepEqual(plate.errors, [], 'plate: error diagnostics');
const solid = plate.result!;
const valid = isValidShape(getOC(), solid.getReplicadShape().wrapped);
assert.equal(valid, true, 'plate B-rep validity');
const volume = solid.volume();
const drilled = SIDE * SIDE * THICKNESS - Math.PI * THICKNESS * (PILOT_R ** 2 + SCREWS * SCREW_R ** 2);
const expected = drilled - chamferRing(PILOT_R, CHAMFER) - SCREWS * chamferRing(SCREW_R, CHAMFER);
assert.ok(Math.abs(volume - expected) < 1e-6 * expected, `plate ${volume} vs closed form ${expected}`);

// Every chamfer cone is on the top (entry) side: z between 6 − 0.5 and 6.
const cones = solid.getReplicadShape().faces.filter((f) => f.geomType === 'CONE');
assert.equal(cones.length, 1 + SCREWS, 'one chamfer cone per entry rim');
for (const cone of cones) assert.ok(cone.center.z > THICKNESS - CHAMFER && cone.center.z < THICKNESS, `cone at z ${cone.center.z}`);

// Rim labels still on the result. The chamfer consumed the entry rims and,
// by the known limit, drops the labels of the exit rims it left alone too.
const present = new Set(solid.edgeHashes());
const rimLabels: Record<string, number> = {};
for (const [hash, lineage] of solid.edgeHistoryMap ?? []) {
  if (!present.has(hash) || !lineage.labelName?.endsWith('-rim')) continue;
  const key = `${lineage.featureName}.${lineage.labelName}`;
  rimLabels[key] = (rimLabels[key] ?? 0) + 1;
}

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: a NEMA 17 motor mount plate with a pilot bore and four clearance holes, the entry rims chamfered through the rim edge refs that hole() and holes() now write. OCCT volume and validity against a closed form; chamfer cone positions.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { side: SIDE, thickness: THICKNESS, pilotDiameter: 2 * PILOT_R, screwDiameter: 2 * SCREW_R, boltSquare: 31, chamfer: CHAMFER },
  expected: {
    basis: 'plate − bores − one 45° chamfer ring per entry rim, ring volume 2π(r + c/3)·c²/2',
    volumeMm3: round(expected),
    chamferCones: 1 + SCREWS,
  },
  now: {
    errorDiagnostics: 0,
    brepValid: valid,
    volumeMm3: round(volume),
    chamferConeCentreZ: cones.map((c) => round(c.center.z, 4)).sort(),
    rimLabelsAfterChamfer: rimLabels,
  },
  before: {
    commit: 'eb2c992f2',
    result: "query.empty: Query DSL edge ref resolved to zero edges on the input shape. (`chamfer(0.5, { face: 'pilot.entry-rim' })` failed with feature.face-ref.not-resolvable)",
  },
  limits: [
    'The value under "before" is recorded from a run on the named commit; this script does not measure it again.',
    'A later fillet or chamfer does not keep the labels of edges it leaves alone (also true of box edge labels), so all entry rims are chamfered in one feature.',
    'cutout() writes no rim refs.',
    'No other CAD system opened the model, and no plate was made.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: evidence.now }, null, 2));
