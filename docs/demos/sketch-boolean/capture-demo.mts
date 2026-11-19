// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-boolean/capture-demo.mts

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
const SOURCE = 'docs/demos/sketch-boolean/keyhole-hanger.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/sketch-boolean/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/sketchBoolean.ts',
  'src/modeling/capture/sketchBoolean.ts',
];

// Dimensions of the source script, in mm.
const BLANK_W = 70;
const BLANK_H = 36;
const CLIP_R = 37;
const THICKNESS = 3;
const ENTRY_R = 4.5;
const SLOT_W = 4.5;
const SLOT_TRAVEL = 10;
const SCREW_SPACING = 44;
const SHANK_R = 2;
const HEAD_R = 4;

/** ∫ √(r² − x²) dx from 0 to x. */
const halfDiscIntegral = (r: number, x: number) => 0.5 * (x * Math.sqrt(r * r - x * x) + r * r * Math.asin(x / r));

// Outline: the blank less the four corner pieces outside the R37 disc.
const cornerStartX = Math.sqrt(CLIP_R ** 2 - (BLANK_H / 2) ** 2);
const cornerPiece =
  (BLANK_H / 2) * (BLANK_W / 2 - cornerStartX) - (halfDiscIntegral(CLIP_R, BLANK_W / 2) - halfDiscIntegral(CLIP_R, cornerStartX));
const outlineArea = BLANK_W * BLANK_H - 4 * cornerPiece;
// Keyhole: entry disc, plus the slot rectangle outside the entry disc, plus
// the half disc of the slot end above the rectangle.
const slotInsideEntry = 2 * halfDiscIntegral(ENTRY_R, SLOT_W / 2);
const keyholeArea = Math.PI * ENTRY_R ** 2 + SLOT_W * SLOT_TRAVEL - slotInsideEntry + (Math.PI * (SLOT_W / 2) ** 2) / 2;
// Head bearing area at the hang position: the Ø8 head disc less the part of
// the keyhole below it. The slot end (R2.25) is concentric with the head; the
// slot runs down from it and leaves the head disc at y = −√(4² − 2.25²).
const slotUnderHead = (Math.PI * (SLOT_W / 2) ** 2) / 2 + 2 * halfDiscIntegral(HEAD_R, SLOT_W / 2);
const EXPECTED = {
  outlineAreaMm2: outlineArea,
  keyholeAreaMm2: keyholeArea,
  profileAreaMm2: outlineArea - 2 * keyholeArea,
  plateVolumeMm3: (outlineArea - 2 * keyholeArea) * THICKNESS,
  shankToSlotGapMm: SLOT_W / 2 - SHANK_R,
  headBearingAreaMm2: Math.PI * HEAD_R ** 2 - slotUnderHead,
  entryClearanceMm: ENTRY_R - HEAD_R,
};

type Command = { kind: string; x?: { evaluated: number }; y?: { evaluated: number }; bulge?: { evaluated: number } };
interface SketchMetadata { commands: Command[]; derivedFrom?: string; areaMm2?: number; loopCount?: number; holeCount?: number }
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: ${actual} vs ${expected}`);
const compact = (command: Command): (string | number)[] => {
  if (command.kind === 'close') return ['close'];
  const point = [round(command.x!.evaluated), round(command.y!.evaluated)];
  return command.kind === 'bulgeArc' ? ['bulgeArc', ...point, round(command.bulge!.evaluated)] : [command.kind, ...point];
};
const count = (sketch: SketchMetadata, kind: string) => sketch.commands.filter((c) => c.kind === kind).length;

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Run the script: intersect -> outline, union -> two keyholes, subtract -> profile.
const run = await runScript({ code, fileName: SOURCE });
const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records);
assert.deepEqual(lowered.diagnostics.filter((d) => d.severity === 'error'), []);
const sketches = run.records.filter((r) => r.kind === 'sketch').map((r) => r.metadata as SketchMetadata);
const outline = sketches.find((s) => s.derivedFrom === 'intersect')!;
const keyholes = sketches.filter((s) => s.derivedFrom === 'union');
const profile = sketches.find((s) => s.derivedFrom === 'subtract')!;
assert.ok(outline && profile && keyholes.length === 2, 'outline, two keyholes and profile sketches');

// 2. Each result is exact lines and arcs with the closed-form area.
//    Outline: four straight sides and four R37 arcs.
assert.equal(outline.loopCount, 1, 'outline loops');
assert.equal(count(outline, 'lineTo'), 4, 'outline lines');
assert.equal(count(outline, 'bulgeArc'), 4, 'outline arcs');
near(outline.areaMm2!, EXPECTED.outlineAreaMm2, 1e-6, 'outline area');
//    Keyhole: the entry arc, two slot walls and the slot-end arc.
for (const keyhole of keyholes) {
  assert.equal(keyhole.loopCount, 1, 'keyhole loops');
  assert.equal(count(keyhole, 'lineTo'), 2, 'keyhole lines');
  assert.equal(count(keyhole, 'bulgeArc'), 2, 'keyhole arcs');
  near(keyhole.areaMm2!, EXPECTED.keyholeAreaMm2, 1e-6, 'keyhole area');
}
//    Profile: the outline with two keyhole holes.
assert.equal(profile.loopCount, 3, 'profile loops');
assert.equal(profile.holeCount, 2, 'profile holes');
near(profile.areaMm2!, EXPECTED.profileAreaMm2, 1e-6, 'profile area');

// 3. The plate is a valid solid with the closed-form volume and bounds.
const shapeOf = (id: string) => lowered.shapes.get(id) as OcctBackend;
const extrudes = run.records.filter((r) => r.kind === 'extrude');
const plate = shapeOf(extrudes[0].id);
const oc = getOC();
const plateValid = isValidShape(oc, plate.getReplicadShape().wrapped);
assert.equal(plateValid, true, 'B-rep validity');
near(plate.volume(), EXPECTED.plateVolumeMm3, 1e-3, 'plate volume');
const bounds = plate.boundingBox();
near(bounds.max[0] - bounds.min[0], BLANK_W, 1e-6, 'plate width');
near(bounds.max[1] - bounds.min[1], BLANK_H, 1e-6, 'plate height');
near(bounds.max[2] - bounds.min[2], THICKNESS, 1e-6, 'plate thickness');

// 4. The keyhole does its job. At the hang position the Ø4 shank clears the
//    slot by 0.25 mm and the Ø8 head bears on the plate. At the entry position
//    the Ø8 head passes through with 0.5 mm radial clearance.
const gaugeParts = extrudes.slice(1).map((r) => shapeOf(r.id));
assert.equal(gaugeParts.length, 4, 'two shanks and two heads');
const report = [];
for (let i = 0; i < 2; i++) {
  const shank = gaugeParts[2 * i];
  const head = gaugeParts[2 * i + 1];
  const shankOverlap = plate.intersectionVolume(shank);
  near(shankOverlap, 0, 1e-6, 'shank and plate overlap');
  const shankGap = minDistanceBetweenShapes(shank.getReplicadShape().wrapped, plate.getReplicadShape().wrapped);
  assert.ok(shankGap !== undefined, 'shank to slot distance');
  near(shankGap, EXPECTED.shankToSlotGapMm, 1e-6, 'shank to slot gap');
  // The head rests on the top face (z = 3). Its footprint pushed 1 mm into
  // the plate overlaps the plate over the bearing area.
  const pressed = head.translate(0, 0, -1);
  const bearing = plate.intersectionVolume(pressed);
  near(bearing, EXPECTED.headBearingAreaMm2, 1e-4, 'head bearing area');
  // Lift the plate 10 mm: the head is over the entry hole and passes through.
  // (translate consumes its source, so the pressed head is moved on.)
  const atEntry = pressed.translate(0, -SLOT_TRAVEL, 0);
  const entryOverlap = plate.intersectionVolume(atEntry);
  near(entryOverlap, 0, 1e-6, 'head and plate overlap at the entry hole');
  const entryGap = minDistanceBetweenShapes(atEntry.getReplicadShape().wrapped, plate.getReplicadShape().wrapped);
  assert.ok(entryGap !== undefined, 'head to entry hole distance');
  near(entryGap, EXPECTED.entryClearanceMm, 1e-6, 'head to entry hole clearance');
  report.push({
    xMm: (i === 0 ? -1 : 1) * (SCREW_SPACING / 2),
    shankPlateOverlapMm3: round(shankOverlap),
    shankToSlotGapMm: round(shankGap),
    headBearingAreaMm2: round(bearing),
    headPlateOverlapAtEntryMm3: round(entryOverlap),
    headToEntryHoleClearanceMm: round(entryGap),
  });
}

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: Sketch.intersect, Sketch.union and Sketch.subtract of line-and-arc profiles, extrude to a keyhole hanger plate, OCCT area, volume, validity, overlap and distance measurement against two screw gauges.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  dimensionsMm: { blankWidth: BLANK_W, blankHeight: BLANK_H, clipRadius: CLIP_R, thickness: THICKNESS, entryDiameter: 2 * ENTRY_R, slotWidth: SLOT_W, slotTravel: SLOT_TRAVEL, screwSpacing: SCREW_SPACING, shankDiameter: 2 * SHANK_R, headDiameter: 2 * HEAD_R },
  expected: {
    basis: 'closed form from the dimensions in the source script',
    ...Object.fromEntries(Object.entries(EXPECTED).map(([key, value]) => [key, round(value)])),
  },
  measured: {
    errorDiagnostics: 0,
    outline: { areaMm2: round(outline.areaMm2!), lines: count(outline, 'lineTo'), arcs: count(outline, 'bulgeArc'), loop: outline.commands.map(compact) },
    keyholes: keyholes.map((k) => ({ areaMm2: round(k.areaMm2!), lines: count(k, 'lineTo'), arcs: count(k, 'bulgeArc'), loop: k.commands.map(compact) })),
    profile: { areaMm2: round(profile.areaMm2!), loopCount: profile.loopCount, holeCount: profile.holeCount },
    plateVolumeMm3: round(plate.volume()),
    plateBoundsMm: [round(bounds.max[0] - bounds.min[0]), round(bounds.max[1] - bounds.min[1]), round(bounds.max[2] - bounds.min[2])],
    plateValid,
    screws: report,
  },
  limits: [
    'The boolean is computed when the script runs: a param()-driven coordinate is refused.',
    'A profile with a spline segment is refused.',
    'The screws are hand-modelled check gauges (Ø4 shank, Ø8 head), not catalog parts.',
    'No part was printed or machined, and no fit was tested on hardware.',
    'No other CAD system opened the result.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ expected: evidence.expected, measured: { ...evidence.measured, outline: { ...evidence.measured.outline, loop: undefined }, keyholes: evidence.measured.keyholes.map((k) => ({ ...k, loop: undefined })) } }, null, 2));
