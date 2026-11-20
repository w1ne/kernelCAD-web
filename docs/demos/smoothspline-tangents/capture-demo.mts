// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/smoothspline-tangents/capture-demo.mts

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
const DIR = 'docs/demos/smoothspline-tangents';
const SOURCE = `${DIR}/pull-backplate.kcad.ts`;
const ROUND_SOURCE = `${DIR}/round-end.kcad.ts`;
const INVOCATION = `node --import tsx ${DIR}/capture-demo.mts`;
const IMPLEMENTATION_FILES = [
  'src/shared/capture/smoothSplineTangents.ts',
  'src/modeling/capture/smoothSplinePhases.ts',
  'src/modeling/capture/sketchReflect.ts',
  'src/modeling/capture/sketchTransform.ts',
  'src/shared/capture/rotateSketchCommands.ts',
  'src/kernel/backends/occt/sketchToDrawing.ts',
  'src/kernel/backends/occt/pathNurbsLowerer.ts',
];

// Dimensions of the source scripts, in mm.
const HALF_LENGTH = 46;
const HALF_WAIST = 7;
const HALF_END = 14;
const WAIST_FLAT = 4;
const KNEE: Vec2 = [22, -8.5];
const FLARE_END = 40;
const CORNER_TOP = -8;
const THICKNESS = 3;
const SCREW_HOLE = 4.2;

type Vec2 = [number, number];

/** Integral of x·dy along one smoothSpline: a cubic Bézier whose inner poles
 *  sit a quarter of the chord from each end, along the start and the end
 *  tangent. Simpson's rule, 400 steps, on a degree-5 polynomial. */
function bezierArea(a: Vec2, b: Vec2, start: Vec2, end: Vec2): number {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) / 4;
  const p = [a, [a[0] + start[0] * d, a[1] + start[1] * d], [b[0] - end[0] * d, b[1] - end[1] * d], b];
  const f = (t: number): number => {
    const u = 1 - t;
    const x = u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0];
    const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
    return x * dy;
  };
  const n = 400;
  let sum = f(0) + f(1);
  for (let i = 1; i < n; i++) sum += f(i / n) * (i % 2 === 1 ? 4 : 2);
  return sum / (3 * n);
}

// Closed form: the area of a counter-clockwise loop is the integral of x·dy.
// Horizontal edges and the edge on x = 0 add nothing.
const WAIST_EDGE = bezierArea([WAIST_FLAT, -HALF_WAIST], KNEE, [1, 0], [1, 0])
  + bezierArea(KNEE, [FLARE_END, -HALF_END], [1, 0], [1, 0]);
const QUARTER_AREA = WAIST_EDGE + HALF_LENGTH * HALF_END;
const PLATE_VOLUME = (4 * QUARTER_AREA - 2 * Math.PI * (SCREW_HOLE / 2) ** 2) * THICKNESS;
const ROUND_AREA = WAIST_EDGE
  + bezierArea([FLARE_END, -HALF_END], [HALF_LENGTH, CORNER_TOP], [1, 0], [0, 1])
  + HALF_LENGTH * -CORNER_TOP;

// Recorded from a run of pull-backplate.kcad.ts on develop 1cea61618, before
// this change. This script does not measure these values again.
const BEFORE = {
  commit: '1cea61618',
  plateVolumeMm3: 5340.489229,
  quarterVolumesMm3: [1362, 1362, 1349.807885, 1349.807885],
  errorDiagnostics: 0,
};

type Tangent = { x: { evaluated: number }; y: { evaluated: number } };
type Command = { kind: string; x?: { evaluated: number }; y?: { evaluated: number }; startTangent?: Tangent; endTangent?: Tangent };
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
const vec = (t: Tangent | undefined) => (t ? [round(t.x.evaluated), round(t.y.evaluated)] : null);

function compact(command: Command) {
  if (command.kind === 'close') return { kind: 'close' };
  const point = { kind: command.kind, x: round(command.x!.evaluated), y: round(command.y!.evaluated) };
  return command.kind === 'smoothSpline'
    ? { ...point, startTangent: vec(command.startTangent), endTangent: vec(command.endTangent) }
    : point;
}

async function evaluate(source: string) {
  const code = await readFile(source, 'utf8');
  const run = await runScript({ code, fileName: source });
  const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
  assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), [], `${source}: error diagnostics`);
  const shape = (id: string) => lowered.shapes.get(id) as OcctBackend;
  return { code, run, shape, result: shape(run.records[run.records.length - 1].id) };
}

await initOcct();

// 1. The backplate: one quarter, three mirror images, joined, two holes.
const plate = await evaluate(SOURCE);
const sketches = plate.run.records.filter((r) => r.kind === 'sketch');
const extrudes = plate.run.records.filter((r) => r.kind === 'extrude');
const quarters = extrudes.map((r) => plate.shape(r.id));
// The sketch behind each quarter solid, in the same order.
const quarterSketches = extrudes.map((r) => {
  const id = (r.inputs as { sketch: { id: string } }).sketch.id;
  return sketches.find((s) => s.id === id)!;
});
assert.equal(quarters.length, 4, 'four quarter solids');
const quarterVolumes = quarters.map((q) => q.volume());
for (const v of quarterVolumes) assert.ok(Math.abs(v - QUARTER_AREA * THICKNESS) < 1e-6, `quarter volume ${v}`);
const quarterBoxes = quarters.map((q) => q.boundingBox());
const expectedBoxes: [Vec2, Vec2][] = [
  [[0, -HALF_END], [HALF_LENGTH, 0]],
  [[0, 0], [HALF_LENGTH, HALF_END]],
  [[-HALF_LENGTH, -HALF_END], [0, 0]],
  [[-HALF_LENGTH, 0], [0, HALF_END]],
];
quarterBoxes.forEach((bb, i) => {
  const [min, max] = expectedBoxes[i];
  assert.ok(
    Math.abs(bb.min[0] - min[0]) < 1e-6 && Math.abs(bb.min[1] - min[1]) < 1e-6
    && Math.abs(bb.max[0] - max[0]) < 1e-6 && Math.abs(bb.max[1] - max[1]) < 1e-6,
    `quarter ${i} bounding box`,
  );
});
const plateValid = isValidShape(getOC(), plate.result.getReplicadShape().wrapped);
assert.equal(plateValid, true, 'plate B-rep validity');
const plateVolume = plate.result.volume();
assert.ok(Math.abs(plateVolume - PLATE_VOLUME) < 1e-4, `plate volume ${plateVolume} vs ${PLATE_VOLUME}`);
const plateBox = plate.result.boundingBox();
const plateSize = [0, 1, 2].map((i) => plateBox.max[i] - plateBox.min[i]);
assert.ok(
  Math.abs(plateSize[0] - 2 * HALF_LENGTH) < 1e-6 && Math.abs(plateSize[1] - 2 * HALF_END) < 1e-6
  && Math.abs(plateSize[2] - THICKNESS) < 1e-6,
  'plate size',
);

// 2. The rounded end corner: smoothSpline with a stated end tangent.
const rounded = await evaluate(ROUND_SOURCE);
const roundValid = isValidShape(getOC(), rounded.result.getReplicadShape().wrapped);
assert.equal(roundValid, true, 'rounded quarter B-rep validity');
const roundVolume = rounded.result.volume();
assert.ok(Math.abs(roundVolume - ROUND_AREA * THICKNESS) < 1e-6, `rounded quarter volume ${roundVolume}`);
const roundSketch = rounded.run.records.filter((r) => r.kind === 'sketch').pop()!;

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const commandsOf = (record: { metadata?: unknown }) => (record.metadata as { commands: Command[] }).commands.map(compact);
const evidence = {
  scope: 'Local kernelCAD Node API: a drawer-pull backplate built from one smoothSpline quarter profile and its three mirror images, and one quarter with a stated end tangent. OCCT volume, bounding box and validity checks against closed-form values.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(plate.code),
  roundSource: ROUND_SOURCE,
  roundSourceSha256: sha256(rounded.code),
  implementationSha256: implementation,
  expected: {
    basis: 'closed form: the x·dy integral over the cubic Bézier poles of each smoothSpline (quarter-chord rule) plus the straight edges, from the dimensions in the source scripts',
    quarterAreaMm2: round(QUARTER_AREA),
    quarterVolumeMm3: round(QUARTER_AREA * THICKNESS),
    plateVolumeMm3: round(PLATE_VOLUME),
    plateSizeMm: [2 * HALF_LENGTH, 2 * HALF_END, THICKNESS],
    roundQuarterVolumeMm3: round(ROUND_AREA * THICKNESS),
  },
  now: {
    errorDiagnostics: 0,
    quarterNames: ['source', "reflect('x')", "reflect('y')", "reflect('x').reflect('y')"],
    quarterVolumesMm3: quarterVolumes.map((v) => round(v)),
    quarterBoxesMm: quarterBoxes.map((bb) => [bb.min.slice(0, 2).map((v) => round(v)), bb.max.slice(0, 2).map((v) => round(v))]),
    quarterCommands: quarterSketches.map(commandsOf),
    plateVolumeMm3: round(plateVolume),
    plateSizeMm: plateSize.map((v) => round(v)),
    plateBrepValid: plateValid,
    roundQuarterVolumeMm3: round(roundVolume),
    roundQuarterBrepValid: roundValid,
    roundCommands: commandsOf(roundSketch),
  },
  before: BEFORE,
  limits: [
    'The values under "before" are recorded from a run on the named commit; this script does not measure them again.',
    'No other CAD system opened the model.',
    'No backplate was made.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: { ...evidence.now, quarterCommands: undefined, roundCommands: undefined } }, null, 2));
