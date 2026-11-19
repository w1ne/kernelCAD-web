// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-offset/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOC } from 'replicad';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { minDistanceBetweenShapes } from '../../../src/kernel/backends/occt/brepDistance';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { runScript } from '../../../src/modeling/runtime/runScript';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'docs/demos/sketch-offset/tray-and-lid.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/sketch-offset/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/sketchOffset.ts',
  'src/modeling/capture/sketchOffset.ts',
];

// Dimensions of the source script, in mm.
const WIDTH = 60;
const DEPTH = 40;
const CORNER_RADIUS = 6;
const WALL = 2;
const CLEARANCE = 0.2;
const TRAY_HEIGHT = 20;
const FLOOR = 2;
const LID_PLATE = 2;
const PLUG_DEPTH = 3;
const QUARTER_BULGE = Math.tan(Math.PI / 8);

/** Area of the outline moved `inset` mm inward: sides shorter, corners smaller. */
const insetArea = (inset: number) =>
  (WIDTH - 2 * inset) * (DEPTH - 2 * inset) - (4 - Math.PI) * (CORNER_RADIUS - inset) ** 2;
const EXPECTED = {
  outlineAreaMm2: insetArea(0),
  cavityAreaMm2: insetArea(WALL),
  plugAreaMm2: insetArea(WALL + CLEARANCE),
  cavityCornerRadiusMm: CORNER_RADIUS - WALL,
  plugCornerRadiusMm: CORNER_RADIUS - WALL - CLEARANCE,
  trayVolumeMm3: insetArea(0) * TRAY_HEIGHT - insetArea(WALL) * (TRAY_HEIGHT - FLOOR),
  lidVolumeMm3: insetArea(0) * LID_PLATE + insetArea(WALL + CLEARANCE) * PLUG_DEPTH,
  plugToWallGapMm: CLEARANCE,
};

type Command = { kind: string; x?: { evaluated: number }; y?: { evaluated: number }; bulge?: { evaluated: number }; radius?: { evaluated: number } };
interface SketchMetadata { commands: Command[]; derivedFrom?: string; offsetDistanceMm?: number; areaMm2?: number; loopCount?: number }
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: ${actual} vs ${expected}`);

function compact(command: Command): (string | number)[] {
  if (command.kind === 'close') return ['close'];
  const point = [round(command.x!.evaluated), round(command.y!.evaluated)];
  if (command.kind === 'bulgeArc') return ['bulgeArc', ...point, round(command.bulge!.evaluated)];
  // The source outline uses radiusArc for its quarter-circle corners.
  if (command.kind === 'radiusArc') return ['bulgeArc', ...point, round(QUARTER_BULGE)];
  return [command.kind, ...point];
}

/** Radius of each arc of a loop, from its chord and bulge. */
function arcRadii(commands: Command[]): number[] {
  const radii: number[] = [];
  let previous = [0, 0];
  for (const command of commands) {
    if (command.kind === 'close') continue;
    const point = [command.x!.evaluated, command.y!.evaluated];
    if (command.kind === 'bulgeArc') {
      const bulge = command.bulge!.evaluated;
      near(Math.abs(bulge), QUARTER_BULGE, 1e-9, 'corner bulge');
      const chord = Math.hypot(point[0] - previous[0], point[1] - previous[1]);
      radii.push(chord / (2 * Math.sin(2 * Math.atan(Math.abs(bulge)))));
    }
    previous = point;
  }
  return radii;
}

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Run the script: outline -> two offsets -> tray and lid.
const run = await runScript({ code, fileName: SOURCE });
const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), []);
const sketches = run.records.filter((r) => r.kind === 'sketch').map((r) => r.metadata as SketchMetadata);
const outline = sketches.find((s) => s.derivedFrom === undefined)!;
const cavity = sketches.find((s) => s.offsetDistanceMm === -WALL)!;
const plug = sketches.find((s) => s.offsetDistanceMm === -(WALL + CLEARANCE))!;
assert.ok(outline && cavity && plug, 'outline, cavity and plug sketches');

// 2. Each offset is one loop of four lines and four quarter-circle corners
//    with the closed-form area and corner radius.
const report = (sketch: SketchMetadata, area: number, radius: number, label: string) => {
  assert.equal(sketch.loopCount, 1, `${label} loops`);
  assert.equal(sketch.commands.filter((c) => c.kind === 'lineTo').length, 4, `${label} lines`);
  const radii = arcRadii(sketch.commands);
  assert.equal(radii.length, 4, `${label} corner arcs`);
  for (const r of radii) near(r, radius, 1e-9, `${label} corner radius`);
  near(sketch.areaMm2!, area, 1e-6, `${label} area`);
  return { areaMm2: round(sketch.areaMm2!), cornerRadiiMm: radii.map((r) => round(r)), loop: sketch.commands.map(compact) };
};
const cavityReport = report(cavity, EXPECTED.cavityAreaMm2, EXPECTED.cavityCornerRadiusMm, 'cavity');
const plugReport = report(plug, EXPECTED.plugAreaMm2, EXPECTED.plugCornerRadiusMm, 'plug');

// 3. Tray and lid are valid solids with the closed-form volumes.
const shapeOf = (id: string) => lowered.shapes.get(id) as OcctBackend;
const booleans = run.records.filter((r) => r.kind === 'boolean' || r.kind === 'subtract' || r.kind === 'union');
assert.equal(booleans.length, 2, `tray and lid booleans (kinds: ${run.records.map((r) => r.kind).join(', ')})`);
const tray = shapeOf(booleans[0].id);
const lid = shapeOf(booleans[1].id);
const oc = getOC();
const trayValid = isValidShape(oc, tray.getReplicadShape().wrapped);
const lidValid = isValidShape(oc, lid.getReplicadShape().wrapped);
assert.equal(trayValid && lidValid, true, 'B-rep validity');
near(tray.volume(), EXPECTED.trayVolumeMm3, 1e-3, 'tray volume');
near(lid.volume(), EXPECTED.lidVolumeMm3, 1e-3, 'lid volume');

// 4. The lid sits on the rim without entering the tray material, and its
//    plug is 0.2 mm from the wall.
const overlap = tray.intersectionVolume(lid);
near(overlap, 0, 1e-6, 'tray and lid overlap');
const plugSolid = shapeOf(run.records.filter((r) => r.kind === 'extrude').pop()!.id);
near(plugSolid.volume(), EXPECTED.plugAreaMm2 * PLUG_DEPTH, 1e-3, 'plug volume');
const gap = minDistanceBetweenShapes(plugSolid.getReplicadShape().wrapped, tray.getReplicadShape().wrapped);
assert.ok(gap !== undefined, 'plug to wall distance');
near(gap, EXPECTED.plugToWallGapMm, 1e-6, 'plug to wall gap');

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: Sketch.offset of a rounded outline, extrude and boolean to a tray and a lid, OCCT volume, validity, overlap and distance measurement.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { width: WIDTH, depth: DEPTH, cornerRadius: CORNER_RADIUS, wall: WALL, clearance: CLEARANCE, trayHeight: TRAY_HEIGHT, floor: FLOOR, lidPlate: LID_PLATE, plugDepth: PLUG_DEPTH },
  expected: {
    basis: 'closed form from the dimensions in the source script',
    ...Object.fromEntries(Object.entries(EXPECTED).map(([key, value]) => [key, round(value)])),
  },
  measured: {
    errorDiagnostics: 0,
    outlineLoop: outline.commands.map(compact),
    cavity: cavityReport,
    plug: plugReport,
    trayVolumeMm3: round(tray.volume()),
    lidVolumeMm3: round(lid.volume()),
    trayValid,
    lidValid,
    trayLidOverlapMm3: round(overlap),
    plugToWallGapMm: round(gap),
  },
  limits: [
    'The offset is computed when the script runs: a param() distance or coordinate is refused.',
    'No part was printed or machined, and no fit was tested on hardware.',
    'No other CAD system opened the result.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, measured: { ...evidence.measured, outlineLoop: undefined, cavity: { ...cavityReport, loop: undefined }, plug: { ...plugReport, loop: undefined } } }, null, 2));
