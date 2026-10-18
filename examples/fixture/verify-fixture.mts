// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Native geometry + placement evidence for the T-slot clamp-set example:
// every part from lib.fixture, placed by its stock dimensions, no overlaps.
// Run from the repository root:
//   npx tsx examples/fixture/verify-fixture.mts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';

const dir = new URL('.', import.meta.url).pathname;
const TOL = 1e-6;

interface SceneLike {
  parts: readonly {
    name: string;
    shape: { boundingBox(): { min: number[]; max: number[] }; volume(): number };
  }[];
}

interface PartRow {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  volumeMm3: number;
}

function rowsFor(scene: SceneLike): PartRow[] {
  return scene.parts.map((part) => {
    const bounds = part.shape.boundingBox();
    return {
      name: part.name,
      min: [bounds.min[0], bounds.min[1], bounds.min[2]],
      max: [bounds.max[0], bounds.max[1], bounds.max[2]],
      volumeMm3: part.shape.volume(),
    };
  });
}

const evaluated = await evaluateAndBuildScript({ file: `${dir}table-clamp-set.kcad.ts` });
assert.equal(evaluated.evaluation.exitCode, 0, JSON.stringify(evaluated.evaluation.diagnostics));
const scene = evaluated.model?.rootShape;
assert(isSceneBackend(scene), 'the model is not an assembly');
const rows = rowsFor(scene as unknown as SceneLike);
const byName = new Map(rows.map((row) => [row.name, row]));

const names = [...byName.keys()].sort();
assert.deepEqual(
  names,
  [
    'left-clamp',
    'left-flange-nut',
    'left-step-block',
    'left-stud',
    'left-t-nut',
    'right-clamp',
    'right-flange-nut',
    'right-step-block',
    'right-stud',
    'right-t-nut',
    'table',
    'workpiece',
  ].sort(),
);

function expectSpan(name: string, zMin: number, zMax: number): void {
  const row = byName.get(name);
  assert(row, `missing part ${name}`);
  assert(Math.abs(row.min[2] - zMin) < TOL, `${name} z min ${row.min[2]}, expected ${zMin}`);
  assert(Math.abs(row.max[2] - zMax) < TOL, `${name} z max ${row.max[2]}, expected ${zMax}`);
}

expectSpan('table', 0, 24);
expectSpan('workpiece', 24, 60);
expectSpan('left-t-nut', 7.4, 23.4); // wing tops at 14.4 on the channel ceiling, base below
expectSpan('left-stud', 14.4, 94.4); // M10 x 80 from the T-nut bore
expectSpan('left-clamp', 60, 72); // level with the 36 mm workpiece top
expectSpan('left-step-block', 24, 72); // step-3 tread at 36 mm
expectSpan('left-flange-nut', 72, 82);

// Mating faces meet at exactly the assembly heights the example documents.
const workpiece = byName.get('workpiece')!;
const clamp = byName.get('left-clamp')!;
assert(Math.abs(clamp.min[2] - workpiece.max[2]) < TOL, 'clamp nose on the workpiece top');
const block = byName.get('left-step-block')!;
assert(Math.abs(workpiece.max[2] - 24 - (36)) < TOL, 'step-3 tread level');
assert(block.volumeMm3 > 0);

const interferences: Array<{ a: string; b: string; volumeMm3: number }> = [];
let pairs = 0;
for (let i = 0; i < scene.parts.length; i++) {
  for (let j = i + 1; j < scene.parts.length; j++) {
    pairs++;
    const a = scene.parts[i]!;
    const b = scene.parts[j]!;
    const volume = Math.abs(a.shape.intersect(b.shape).volume());
    if (volume > TOL) interferences.push({ a: a.name, b: b.name, volumeMm3: volume });
  }
}
assert.equal(interferences.length, 0, JSON.stringify(interferences));

const source = `${dir}table-clamp-set.kcad.ts`;
const evidence = {
  checkedAt: new Date().toISOString(),
  nativeKernel: 'OCCT via evaluateAndBuildScript',
  source: 'examples/fixture/table-clamp-set.kcad.ts',
  sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'),
  featureCount: evaluated.evaluation.featureCount,
  pairsChecked: pairs,
  positiveVolumeOverlaps: interferences,
  parts: rows,
  set: {
    hardware: 'lib.fixture M10: tSlotNut, clampStud 80, strapClamp, stepBlock, flangeNut',
    tableMm: [400, 130, 24],
    channel: { openingMm: 12.4, depthMm: 9.6, internalWidthMm: 18.6, internalHeightMm: 7.6 },
    workpieceMm: [50, 70, 36],
    step3TreadMm: 36,
  },
  scope:
    'Native static envelope geometry and placement: nominal stock dimensions for the fixture ' +
    'hardware, no clamping force, torque, deflection or machining-load check. Digital assembly ' +
    'only; no physical setup or cut was made.',
};
const outDir = `${dir}../../docs/demos/fixture-library`;
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/geometry-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, pairs, overlaps: 0, features: evaluated.evaluation.featureCount }));
