// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/edge-labels-through-chamfer/capture-demo.mts

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
const DIR = 'docs/demos/edge-labels-through-chamfer';
const SOURCE = `${DIR}/mount-plate.kcad.ts`;
const INVOCATION = `node --import tsx ${DIR}/capture-demo.mts`;
const IMPLEMENTATION_FILES = ['src/kernel/backends/occt/historyAwareEdgeFeatures.ts'];

// Dimensions of the source script, in mm.
const SIDE = 60;
const THICKNESS = 6;
const CORNER_R = 5;
const PILOT_R = 22.5 / 2;
const SCREW_R = 3.4 / 2;
const SCREWS = 4;
const ENTRY = 0.5;
const EXIT = 0.3;

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
// A 45° chamfer of leg c on a circular edge of radius r removes a triangular
// ring: area c²/2 at centroid radius r + c/3 (Pappus).
const chamferRing = (r: number, c: number) => 2 * Math.PI * (r + c / 3) * (c * c) / 2;
const rings = (c: number) => chamferRing(PILOT_R, c) + SCREWS * chamferRing(SCREW_R, c);

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
const blank = SIDE * SIDE * THICKNESS - 4 * (CORNER_R ** 2 - (Math.PI * CORNER_R ** 2) / 4) * THICKNESS;
const drilled = blank - Math.PI * THICKNESS * (PILOT_R ** 2 + SCREWS * SCREW_R ** 2);
const expected = drilled - rings(ENTRY) - rings(EXIT);
assert.ok(Math.abs(volume - expected) < 1e-6 * expected, `plate ${volume} vs closed form ${expected}`);

// One chamfer cone per rim: five in the top 0.5 mm, five in the bottom 0.3 mm.
const cones = solid.getReplicadShape().faces.filter((f) => f.geomType === 'CONE');
const top = cones.filter((c) => c.center.z > THICKNESS - ENTRY && c.center.z < THICKNESS);
const bottom = cones.filter((c) => c.center.z > 0 && c.center.z < EXIT);
assert.equal(top.length, 1 + SCREWS, 'one entry chamfer cone per hole');
assert.equal(bottom.length, 1 + SCREWS, 'one exit chamfer cone per hole');
assert.equal(cones.length, 2 * (1 + SCREWS), 'no other cones');

// Labels the first chamfer left alone are still on its result.
const afterEntry = await evaluate(code.replace(/\.chamfer\(0\.3, rims\('exit-rim'\)\);/, ';'), SOURCE);
assert.deepEqual(afterEntry.errors, [], 'entry chamfer only: error diagnostics');
const labels: Record<string, number> = {};
const present = new Set(afterEntry.result!.edgeHashes());
for (const [hash, lineage] of afterEntry.result!.edgeHistoryMap ?? []) {
  if (!present.has(hash) || !lineage.labelName) continue;
  const key = lineage.featureName ? `${lineage.featureName}.${lineage.labelName}` : lineage.labelName;
  labels[key] = (labels[key] ?? 0) + 1;
}
assert.equal(labels['pilot.exit-rim'], 1, 'pilot exit rim label after the entry chamfer');
assert.equal(labels['screws.exit-rim'], SCREWS, 'screw exit rim labels after the entry chamfer');

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: a NEMA 17 motor mount plate. A first chamfer breaks the entry rims; a second, later chamfer picks the exit rims by created edge label, which the first chamfer now keeps. OCCT volume and validity against a closed form; chamfer cone positions; labels after the first chamfer.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { side: SIDE, thickness: THICKNESS, cornerRadius: CORNER_R, pilotDiameter: 2 * PILOT_R, screwDiameter: 2 * SCREW_R, boltSquare: 31, entryChamfer: ENTRY, exitChamfer: EXIT },
  expected: {
    basis: 'blank with R5 corners − bores − one 45° chamfer ring per rim, ring volume 2π(r + c/3)·c²/2',
    volumeMm3: round(expected),
    chamferCones: 2 * (1 + SCREWS),
  },
  now: {
    errorDiagnostics: 0,
    brepValid: valid,
    volumeMm3: round(volume),
    entryConeCentreZ: top.map((c) => round(c.center.z, 4)).sort(),
    exitConeCentreZ: bottom.map((c) => round(c.center.z, 4)).sort(),
    edgeLabelsAfterEntryChamfer: labels,
  },
  before: {
    commit: '8d535d15a',
    result: 'query.empty: Query DSL edge ref resolved to zero edges on the input shape. (the entry chamfer dropped every exit-rim label)',
  },
  limits: [
    'The value under "before" is recorded from a run on the named commit; this script does not measure it again.',
    'The fix trusts a sub-shape hash that the result still contains. An edge that the kernel rebuilds as a new edge with the same geometry and no Modified() entry still loses its label.',
    'No other CAD system opened the model, and no plate was made.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: evidence.now }, null, 2));
