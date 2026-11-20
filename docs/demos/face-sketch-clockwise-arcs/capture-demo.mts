// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/face-sketch-clockwise-arcs/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOC } from 'replicad';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { extractFlatProfile } from '../../../src/kernel/backends/occt/planarProfile';
import { segmentsSignedArea } from '../../../src/kernel/backends/occt/sketchFromShape';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { runScript } from '../../../src/modeling/runtime/runScript';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'docs/demos/face-sketch-clockwise-arcs/cover-gasket.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/face-sketch-clockwise-arcs/capture-demo.mts';
const IMPLEMENTATION_FILES = ['src/kernel/backends/occt/sketchFromShape.ts'];

// Cover plate of the source script, in mm.
const WIDTH = 60;
const DEPTH = 40;
const CORNER_RADIUS = 5;
const HOLE_DIAMETER = 4.5;
const HOLES = 4;
const GASKET_THICKNESS = 1.5;
const OUTLINE_AREA = WIDTH * DEPTH - (4 - Math.PI) * CORNER_RADIUS ** 2;
const HOLE_AREA = Math.PI * (HOLE_DIAMETER / 2) ** 2;
const GASKET_VOLUME = (OUTLINE_AREA - HOLES * HOLE_AREA) * GASKET_THICKNESS;
const QUARTER_BULGE = Math.tan(Math.PI / 8);

// Recorded from a run of the same source on develop d6737bdc1, before this
// change. This script does not measure these values again.
const BEFORE = {
  commit: 'd6737bdc1',
  gasketVolumeMm3: 3166.538931,
  flatOutlineAreaMm2: 2142.9204,
  errorDiagnostics: 0,
  outerLoop: [
    ['moveTo', -25, -20],
    ['bulgeArc', -30, -15, 2.414214],
    ['lineTo', -30, 15],
    ['bulgeArc', -25, 20, -0.414214],
    ['lineTo', 25, 20],
    ['bulgeArc', 30, 15, 2.414214],
    ['lineTo', 30, -15],
    ['bulgeArc', 25, -20, 2.414214],
    ['lineTo', -25, -20],
    ['close'],
  ],
};

type Command = { kind: string; x?: { evaluated: number }; y?: { evaluated: number }; bulge?: { evaluated: number } };
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

function splitLoops(commands: Command[]): Command[][] {
  const loops: Command[][] = [];
  for (const command of commands) {
    if (command.kind === 'moveTo') loops.push([]);
    loops[loops.length - 1].push(command);
  }
  return loops;
}
function compact(command: Command): (string | number)[] {
  if (command.kind === 'close') return ['close'];
  const point = [round(command.x!.evaluated), round(command.y!.evaluated)];
  return command.kind === 'bulgeArc' ? [command.kind, ...point, round(command.bulge!.evaluated)] : [command.kind, ...point];
}

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Run the script: cover plate -> faceSketch('top') -> 1.5 mm gasket.
const run = await runScript({ code, fileName: SOURCE });
const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), []);
const sketch = run.records.filter((r) => r.kind === 'sketch').pop()!;
const loops = splitLoops((sketch.metadata as { commands: Command[] }).commands);
assert.equal(loops.length, 1 + HOLES, 'outline plus one loop per hole');

// 2. Every corner of the outline is a quarter circle.
const cornerBulges = loops[0].filter((c) => c.kind === 'bulgeArc').map((c) => c.bulge!.evaluated);
assert.equal(cornerBulges.length, 4, 'corner arcs');
for (const bulge of cornerBulges) assert.ok(Math.abs(Math.abs(bulge) - QUARTER_BULGE) < 1e-6, `corner bulge ${bulge}`);

// 3. The gasket is a valid solid with the analytic volume and footprint.
const gasket = lowered.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
const valid = isValidShape(getOC(), gasket.getReplicadShape().wrapped);
assert.equal(valid, true, 'B-rep validity');
const volume = gasket.volume();
assert.ok(Math.abs(volume - GASKET_VOLUME) < 1e-3, `gasket volume ${volume} vs ${GASKET_VOLUME}`);
const bbox = gasket.boundingBox();
const size = [0, 1, 2].map((i) => bbox.max[i] - bbox.min[i]);
assert.ok(Math.abs(size[0] - WIDTH) < 1e-6 && Math.abs(size[1] - DEPTH) < 1e-6 && Math.abs(size[2] - GASKET_THICKNESS) < 1e-6, 'gasket size');

// 4. The flat profile behind `kernelcad export dxf` has the same outline.
const flat = extractFlatProfile(gasket);
assert.ok(flat.ok, 'flat profile');
const flatAreas = flat.profile.loops.map((loop) => Math.abs(segmentsSignedArea(loop)));
assert.equal(flatAreas.length, 1 + HOLES, 'flat profile loops');
assert.ok(Math.abs(flatAreas[0] - OUTLINE_AREA) < 1e-6, `flat outline area ${flatAreas[0]} vs ${OUTLINE_AREA}`);
const dxf = await runAndExport({ code, fileName: SOURCE, format: 'dxf' });
assert.deepEqual(dxf.diagnostics.filter((d) => d.severity === 'error'), []);
assert.ok(dxf.bytes.length > 0, 'DXF bytes');

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: faceSketch of the top face of a rounded cover plate, extrude to a gasket, OCCT volume and validity check, and the flat DXF profile of the gasket.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  expected: {
    basis: 'closed form from the dimensions in the source script',
    outlineAreaMm2: round(OUTLINE_AREA),
    gasketVolumeMm3: round(GASKET_VOLUME),
    cornerBulge: round(QUARTER_BULGE),
  },
  now: {
    errorDiagnostics: 0,
    loops: loops.length,
    outerLoop: loops[0].map(compact),
    holeLoops: loops.slice(1).map((loop) => loop.map(compact)),
    cornerBulges: cornerBulges.map((b) => round(b)),
    gasketVolumeMm3: round(volume),
    gasketSizeMm: size.map((v) => round(v)),
    brepValid: valid,
    flatLoops: flatAreas.length,
    flatOutlineAreaMm2: round(flatAreas[0], 4),
    flatHoleAreasMm2: flatAreas.slice(1).map((a) => round(a, 4)),
    dxf: { bytes: dxf.bytes.length, sha256: sha256(dxf.bytes) },
  },
  before: BEFORE,
  limits: [
    'The values under "before" are recorded from a run on the named commit; this script does not measure them again.',
    'No other CAD or CAM system opened the DXF file.',
    'No gasket was cut.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, now: { ...evidence.now, outerLoop: undefined, holeLoops: undefined } }, null, 2));
