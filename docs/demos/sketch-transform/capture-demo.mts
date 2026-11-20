// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-transform/capture-demo.mts

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
const SOURCE = 'docs/demos/sketch-transform/fan-guard.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/sketch-transform/capture-demo.mts';
const IMPLEMENTATION_FILES = ['src/modeling/capture/sketchTransform.ts'];

// Dimensions of the source script, in mm and degrees.
const PLATE = 60;
const THICKNESS = 2;
const HOLE_R = 2.15;
const HOLE_SQUARE = 50;
const PIN_R = 2;
const SLOT_END_R = 2.5;
const SLOT_END_NEAR = 16;
const SLOT_END_FAR = 24;
const SLOT_COUNT = 8;
const SLOT_STEP_DEG = 45;
const INNER_SCALE = 0.45;
const INNER_TURN_DEG = 22.5;

const holeArea = Math.PI * HOLE_R ** 2;
const slotArea = (SLOT_END_FAR - SLOT_END_NEAR) * 2 * SLOT_END_R + Math.PI * SLOT_END_R ** 2;
const slotCentreR = (SLOT_END_NEAR + SLOT_END_FAR) / 2;
const ventArea = SLOT_COUNT * slotArea * (1 + INNER_SCALE ** 2);
const EXPECTED = {
  holeAreaMm2: holeArea,
  outerSlotAreaMm2: slotArea,
  innerSlotAreaMm2: slotArea * INNER_SCALE ** 2,
  outerSlotCentreRadiusMm: slotCentreR,
  innerSlotCentreRadiusMm: slotCentreR * INNER_SCALE,
  ventOpenAreaMm2: ventArea,
  profileAreaMm2: PLATE ** 2 - 4 * holeArea - ventArea,
  plateVolumeMm3: (PLATE ** 2 - 4 * holeArea - ventArea) * THICKNESS,
  pinToHoleGapMm: HOLE_R - PIN_R,
};

type Command = { kind: string; x?: { evaluated: number }; y?: { evaluated: number }; bulge?: { evaluated: number } };
interface SketchMetadata { commands: Command[]; derivedFrom?: string; areaMm2?: number; loopCount?: number; holeCount?: number }
type Compact = (string | number)[];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: ${actual} vs ${expected}`);
const compact = (command: Command): Compact => {
  if (command.kind === 'close') return ['close'];
  const point = [round(command.x!.evaluated), round(command.y!.evaluated)];
  return command.kind === 'bulgeArc' ? ['bulgeArc', ...point, round(command.bulge!.evaluated)] : [command.kind, ...point];
};

/** Split a command list into its closed loops. */
function loopsOf(commands: Command[]): Command[][] {
  const loops: Command[][] = [];
  let current: Command[] = [];
  for (const command of commands) {
    current.push(command);
    if (command.kind === 'close') { loops.push(current); current = []; }
  }
  return loops;
}

/** Area and vertex centre of a loop of lines and bulge arcs. Every loop here
 *  is point-symmetric, so the mean of its vertices is its centre. */
function measureLoop(loop: Command[]) {
  const points = loop.filter((c) => c.kind !== 'close').map((c) => ({ x: c.x!.evaluated, y: c.y!.evaluated, bulge: c.bulge?.evaluated ?? 0 }));
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    // Segment i runs from point i to point i + 1; the last one is the closing
    // line back to the start (zero length when the loop already ends there).
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const bulge = i + 1 < points.length ? b.bulge : 0;
    area += (a.x * b.y - b.x * a.y) / 2;
    if (bulge !== 0) {
      const theta = 4 * Math.atan(Math.abs(bulge));
      const radius = Math.hypot(b.x - a.x, b.y - a.y) / (2 * Math.sin(theta / 2));
      area += Math.sign(bulge) * (radius ** 2 / 2) * (theta - Math.sin(theta));
    }
  }
  const last = points[points.length - 1];
  const vertices = Math.hypot(last.x - points[0].x, last.y - points[0].y) < 1e-9 ? points.slice(0, -1) : points;
  const cx = vertices.reduce((sum, p) => sum + p.x, 0) / vertices.length;
  const cy = vertices.reduce((sum, p) => sum + p.y, 0) / vertices.length;
  return {
    areaMm2: Math.abs(area),
    centre: [cx, cy] as [number, number],
    radiusMm: Math.hypot(cx, cy),
    angleDeg: ((Math.atan2(cy, cx) * 180) / Math.PI + 360) % 360,
    lines: loop.filter((c) => c.kind === 'lineTo').length,
    arcs: loop.filter((c) => c.kind === 'bulgeArc').length,
    loop: loop.map(compact),
  };
}

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Run the script. The subtract result holds the outline and every placed copy as a hole loop.
const run = await runScript({ code, fileName: SOURCE });
const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), []);
const sketches = run.records.filter((r) => r.kind === 'sketch').map((r) => r.metadata as SketchMetadata);
const profile = sketches.find((s) => s.derivedFrom === 'subtract')!;
assert.ok(profile, 'profile sketch');
assert.equal(profile.loopCount, 21, 'profile loops');
assert.equal(profile.holeCount, 20, 'profile holes');
near(profile.areaMm2!, EXPECTED.profileAreaMm2, 1e-6, 'profile area');

// 2. Measure each hole loop of the kernel result and sort it into its group.
const [outlineLoop, ...holeLoops] = loopsOf(profile.commands).map(measureLoop);
near(outlineLoop.areaMm2, PLATE ** 2, 1e-9, 'outline area');
const byAngle = (a: { angleDeg: number }, b: { angleDeg: number }) => a.angleDeg - b.angleDeg;
const mounts = holeLoops.filter((l) => l.radiusMm > 30).sort(byAngle);
const outerRing = holeLoops.filter((l) => l.radiusMm > 15 && l.radiusMm <= 30).sort(byAngle);
const innerRing = holeLoops.filter((l) => l.radiusMm <= 15).sort(byAngle);
assert.equal(mounts.length, 4, 'mounting holes');
assert.equal(outerRing.length, SLOT_COUNT, 'outer slots');
assert.equal(innerRing.length, SLOT_COUNT, 'inner slots');

//    translate: four Ø4.3 circles on the corners of the 50 mm square.
mounts.forEach((hole, i) => {
  near(hole.areaMm2, EXPECTED.holeAreaMm2, 1e-9, 'hole area');
  near(Math.abs(hole.centre[0]), HOLE_SQUARE / 2, 1e-9, 'hole x');
  near(Math.abs(hole.centre[1]), HOLE_SQUARE / 2, 1e-9, 'hole y');
  near(hole.angleDeg, 45 + 90 * i, 1e-9, 'hole direction');
});
//    rotate: eight slots of unchanged area, 20 mm from the axis, 45° apart.
outerRing.forEach((slot, i) => {
  assert.equal(slot.lines, 2, 'outer slot lines');
  assert.equal(slot.arcs, 2, 'outer slot arcs');
  near(slot.areaMm2, EXPECTED.outerSlotAreaMm2, 1e-9, 'outer slot area');
  near(slot.radiusMm, EXPECTED.outerSlotCentreRadiusMm, 1e-9, 'outer slot radius');
  near(slot.angleDeg, SLOT_STEP_DEG * i, 1e-9, 'outer slot angle');
});
//    scale then rotate: area × 0.45², 9 mm from the axis, between the outer slots.
innerRing.forEach((slot, i) => {
  assert.equal(slot.lines, 2, 'inner slot lines');
  assert.equal(slot.arcs, 2, 'inner slot arcs');
  near(slot.areaMm2, EXPECTED.innerSlotAreaMm2, 1e-9, 'inner slot area');
  near(slot.radiusMm, EXPECTED.innerSlotCentreRadiusMm, 1e-9, 'inner slot radius');
  near(slot.angleDeg, INNER_TURN_DEG + SLOT_STEP_DEG * i, 1e-9, 'inner slot angle');
});

// 3. The plate is a valid solid with the closed-form volume and bounds.
const shapeOf = (id: string) => lowered.shapes.get(id) as OcctBackend;
const extrudes = run.records.filter((r) => r.kind === 'extrude');
const plate = shapeOf(extrudes[0].id);
const plateValid = isValidShape(getOC(), plate.getReplicadShape().wrapped);
assert.equal(plateValid, true, 'B-rep validity');
near(plate.volume(), EXPECTED.plateVolumeMm3, 1e-6, 'plate volume');
const bounds = plate.boundingBox();
const size = [0, 1, 2].map((i) => bounds.max[i] - bounds.min[i]);
near(size[0], PLATE, 1e-6, 'plate width');
near(size[1], PLATE, 1e-6, 'plate height');
near(size[2], THICKNESS, 1e-6, 'plate thickness');

// 4. An Ø4 pin stands in each mounting hole with 0.15 mm radial clearance.
const pins = extrudes.slice(1).map((r) => shapeOf(r.id));
assert.equal(pins.length, 4, 'four pins');
const pinReport = pins.map((pin) => {
  const overlap = plate.intersectionVolume(pin);
  near(overlap, 0, 1e-6, 'pin and plate overlap');
  const gap = minDistanceBetweenShapes(pin.getReplicadShape().wrapped, plate.getReplicadShape().wrapped);
  assert.ok(gap !== undefined, 'pin to hole distance');
  near(gap, EXPECTED.pinToHoleGapMm, 1e-6, 'pin to hole gap');
  return { pinPlateOverlapMm3: round(overlap), pinToHoleGapMm: round(gap) };
});

const summary = (l: ReturnType<typeof measureLoop>) => ({
  areaMm2: round(l.areaMm2), centreMm: [round(l.centre[0]), round(l.centre[1])], radiusMm: round(l.radiusMm), angleDeg: round(l.angleDeg),
  lines: l.lines, arcs: l.arcs, loop: l.loop,
});
const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: Sketch.translate, Sketch.rotate and Sketch.scale of line-and-arc profiles, Sketch.subtract, extrude to a 60 mm fan guard plate, loop areas and centres computed from the kernel result, OCCT volume, validity, overlap and distance measurement against four pin gauges.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { plate: PLATE, thickness: THICKNESS, holeDiameter: 2 * HOLE_R, holeSquare: HOLE_SQUARE, pinDiameter: 2 * PIN_R, slotEndRadius: SLOT_END_R, slotEndNear: SLOT_END_NEAR, slotEndFar: SLOT_END_FAR },
  transforms: { slotCount: SLOT_COUNT, slotStepDeg: SLOT_STEP_DEG, innerScale: INNER_SCALE, innerTurnDeg: INNER_TURN_DEG },
  expected: {
    basis: 'closed form from the dimensions in the source script',
    ...Object.fromEntries(Object.entries(EXPECTED).map(([key, value]) => [key, round(value)])),
  },
  measured: {
    errorDiagnostics: 0,
    profile: { areaMm2: round(profile.areaMm2!), loopCount: profile.loopCount, holeCount: profile.holeCount },
    outline: summary(outlineLoop),
    mounts: mounts.map(summary),
    outerRing: outerRing.map(summary),
    innerRing: innerRing.map(summary),
    ventOpenAreaMm2: round([...outerRing, ...innerRing].reduce((sum, l) => sum + l.areaMm2, 0)),
    plateVolumeMm3: round(plate.volume()),
    plateBoundsMm: size.map((v) => round(v)),
    plateValid,
    pins: pinReport,
  },
  limits: [
    'Sketch.rotate takes a plain-number angle: a param() angle is refused.',
    'Sketch.rotate refuses a profile with a smoothSpline segment.',
    'Sketch.scale is uniform; a factor that is not > 0 is refused.',
    'A sketch.text sketch is refused by all three methods.',
    'The pins are hand-modelled check gauges (Ø4), not catalog screws.',
    'Air flow through the vents was not simulated or measured.',
    'No part was printed or machined, and no fit was tested on hardware.',
    'No other CAD system opened the result.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
near(evidence.measured.ventOpenAreaMm2, EXPECTED.ventOpenAreaMm2, 1e-6, 'vent open area');
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const brief = (l: { areaMm2: number; radiusMm: number; angleDeg: number }) => ({ areaMm2: l.areaMm2, radiusMm: l.radiusMm, angleDeg: l.angleDeg });
console.log(JSON.stringify({
  expected: evidence.expected,
  measured: { ...evidence.measured, outline: undefined, mounts: evidence.measured.mounts.map(brief), outerRing: evidence.measured.outerRing.map(brief), innerRing: evidence.measured.innerRing.map(brief) },
}, null, 2));
