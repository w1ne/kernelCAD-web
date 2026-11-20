// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/path-ellipse/capture-demo.mts

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
const DIR = 'docs/demos/path-ellipse';
const HEAD_SOURCE = `${DIR}/elliptical-head.kcad.ts`;
const GASKET_SOURCE = `${DIR}/handhole-gasket.kcad.ts`;
const INVOCATION = `node --import tsx ${DIR}/capture-demo.mts`;
const IMPLEMENTATION_FILES = ['src/modeling/capture/pathEllipse.ts', 'src/modeling/capture/sketch.ts'];

// Dimensions of the source scripts, in mm.
const OUTER_RADIUS = 100;
const DISH_DEPTH = 50;
const WALL = 4;
const FLANGE = 20;
const INNER_RADIUS = OUTER_RADIUS - WALL;
const OUTER_RX = 95;
const OUTER_RY = 70;
const LAND = 15;
const THICKNESS = 3;
const TURN_DEG = 30;

// Closed form. Half a spheroid of radius R and depth h has volume (2/3)·π·R²·h;
// an ellipse has area π·rx·ry.
const HEAD_VOLUME = Math.PI * (OUTER_RADIUS ** 2 - INNER_RADIUS ** 2) * FLANGE
  + (2 / 3) * Math.PI * (OUTER_RADIUS ** 2 * DISH_DEPTH - INNER_RADIUS ** 2 * (DISH_DEPTH - WALL));
const GASKET_VOLUME = Math.PI * (OUTER_RX * OUTER_RY - (OUTER_RX - LAND) * (OUTER_RY - LAND)) * THICKNESS;
const TURN = (TURN_DEG * Math.PI) / 180;
const GASKET_HALF_X = Math.hypot(OUTER_RX * Math.cos(TURN), OUTER_RY * Math.sin(TURN));
const GASKET_HALF_Y = Math.hypot(OUTER_RX * Math.sin(TURN), OUTER_RY * Math.cos(TURN));

type P = { evaluated: number };
type Command = { kind: string; x?: P; y?: P; controlPoints?: Array<{ x: P; y: P }>; weights?: P[] };
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

function compact(command: Command) {
  if (command.kind === 'close') return { kind: 'close' };
  if (command.kind === 'nurbsSegment') {
    return {
      kind: command.kind,
      controlPoints: command.controlPoints!.map((p) => [round(p.x.evaluated), round(p.y.evaluated)]),
      weights: command.weights!.map((w) => round(w.evaluated, 12)),
    };
  }
  return { kind: command.kind, x: round(command.x!.evaluated), y: round(command.y!.evaluated) };
}

async function evaluate(source: string) {
  const code = await readFile(source, 'utf8');
  const run = await runScript({ code, fileName: source });
  const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
  assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), [], `${source}: error diagnostics`);
  const result = lowered.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
  const sketches = run.records.filter((r) => r.kind === 'sketch');
  const commands = sketches.map((s) => (s.metadata as { commands: Command[] }).commands.map(compact));
  return { code, result, commands };
}

await initOcct();

// 1. The vessel head: two quarter ellipseArc segments, revolved.
const head = await evaluate(HEAD_SOURCE);
const headValid = isValidShape(getOC(), head.result.getReplicadShape().wrapped);
assert.equal(headValid, true, 'head B-rep validity');
const headVolume = head.result.volume();
assert.ok(Math.abs(headVolume - HEAD_VOLUME) < 1e-6 * HEAD_VOLUME, `head volume ${headVolume} vs ${HEAD_VOLUME}`);
const headBox = head.result.boundingBox({ exact: true });
const headSize = [0, 1, 2].map((i) => headBox.max[i] - headBox.min[i]);
const headSorted = [...headSize].sort((a, b) => a - b);
// Mesh-derived box: tolerance is the mesh chord error.
assert.ok(Math.abs(headSorted[0] - (FLANGE + DISH_DEPTH)) < 0.05, `head height ${headSorted[0]}`);
assert.ok(Math.abs(headSorted[1] - 2 * OUTER_RADIUS) < 0.05 && Math.abs(headSorted[2] - 2 * OUTER_RADIUS) < 0.05, 'head diameter');
const headArcs = head.commands[0].filter((c) => c.kind === 'nurbsSegment');
assert.equal(headArcs.length, 2, 'one rational quadratic per quarter arc');

// 2. The gasket: two turned closed ellipses.
const gasket = await evaluate(GASKET_SOURCE);
const gasketValid = isValidShape(getOC(), gasket.result.getReplicadShape().wrapped);
assert.equal(gasketValid, true, 'gasket B-rep validity');
const gasketVolume = gasket.result.volume();
// The boolean result integrates over trimmed B-spline faces: 1 part in a million.
assert.ok(Math.abs(gasketVolume - GASKET_VOLUME) < 1e-6 * GASKET_VOLUME, `gasket volume ${gasketVolume} vs ${GASKET_VOLUME}`);
const gasketBox = gasket.result.boundingBox({ exact: true });
const gasketSize = [0, 1, 2].map((i) => gasketBox.max[i] - gasketBox.min[i]);
assert.ok(
  Math.abs(gasketSize[0] - 2 * GASKET_HALF_X) < 0.05 && Math.abs(gasketSize[1] - 2 * GASKET_HALF_Y) < 0.05
  && Math.abs(gasketSize[2] - THICKNESS) < 1e-6,
  `gasket size ${gasketSize.join(' × ')}`,
);

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: a 2:1 semi-elliptical vessel head revolved from two ellipseArc segments, and a turned elliptical gasket from two closed ellipses. OCCT volume, bounding box and validity checks against closed-form values.',
  invocation: INVOCATION,
  headSource: HEAD_SOURCE,
  headSourceSha256: sha256(head.code),
  gasketSource: GASKET_SOURCE,
  gasketSourceSha256: sha256(gasket.code),
  implementationSha256: implementation,
  dimensionsMm: {
    head: { outerRadius: OUTER_RADIUS, dishDepth: DISH_DEPTH, wall: WALL, flange: FLANGE },
    gasket: { outerRx: OUTER_RX, outerRy: OUTER_RY, land: LAND, thickness: THICKNESS, turnDeg: TURN_DEG },
  },
  expected: {
    basis: 'closed form: half a spheroid is (2/3)·π·R²·h, a ring is π·(R² − r²)·s, an ellipse is π·rx·ry; the box of a turned ellipse has half extents sqrt(rx²cos²φ + ry²sin²φ) and sqrt(rx²sin²φ + ry²cos²φ)',
    headVolumeMm3: round(HEAD_VOLUME),
    headSizeMm: [2 * OUTER_RADIUS, 2 * OUTER_RADIUS, FLANGE + DISH_DEPTH],
    gasketVolumeMm3: round(GASKET_VOLUME),
    gasketSizeMm: [round(2 * GASKET_HALF_X), round(2 * GASKET_HALF_Y), THICKNESS],
  },
  now: {
    errorDiagnostics: 0,
    headVolumeMm3: round(headVolume),
    headSizeSortedMm: headSorted.map((v) => round(v, 3)),
    headBrepValid: headValid,
    headFaces: head.result.getReplicadShape().faces.length,
    headCommands: head.commands[0],
    gasketVolumeMm3: round(gasketVolume),
    gasketSizeMm: gasketSize.map((v) => round(v, 3)),
    gasketBrepValid: gasketValid,
    gasketFaces: gasket.result.getReplicadShape().faces.length,
    gasketOuterCommands: gasket.commands[0],
    gasketInnerCommands: gasket.commands[1],
  },
  before: {
    commit: '9149fe5df',
    result: "TypeError: path(...).ellipse is not a function; PathBuilder had no ellipse or elliptical-arc call",
  },
  limits: [
    'The value under "before" is recorded from a run on the named commit; this script does not measure it again.',
    'Volumes are checked to 1 part in 1 000 000 of the closed form.',
    'Bounding boxes come from the display mesh; their tolerance is the mesh chord error (0.05 mm allowed).',
    'An ellipse is stored as rational quadratic B-spline segments, which are geometrically exact. It is not a STEP ELLIPSE entity.',
    'No other CAD system opened the models.',
    'No head or gasket was made.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: { ...evidence.now, headCommands: undefined, gasketOuterCommands: undefined, gasketInnerCommands: undefined } }, null, 2));
