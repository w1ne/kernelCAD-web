// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Native geometry + placement evidence for the bolted-flange example: eight
// Ø6.6 bores size to M6 normal, the flat heads seat flush in the cut
// countersinks, and every part pair is interference-free.
// Run from the repository root:
//   npx tsx examples/parts/verify-flange.mts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';
import { analysisBodyOf } from '../../src/kernel/backends/occt/occtBackend';
import { clearanceFitForHoleDiameter } from '../../src/modeling/parts/holeInsert';
import { FLATHEAD_HEAD } from '../../src/modeling/parts/familyTable';


// Overlaps are measured the way the product's clash checks measure them:
// through each part's nominal analysis body (analysisBodyOf). A modeled
// thread in its nut, or an ISO 4762 under-head fillet (da up to 5.7 mm on M5)
// against an ISO 7089 washer bore (5.3 mm), is not a clash.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fitBody = (shape: any): any => analysisBodyOf(shape);

const dir = new URL('.', import.meta.url).pathname;
const TOL = 1e-4; // exact OCCT bounds carry ~1e-6 mm float noise
const outerR = 55;
const innerR = 27.5;
const thickness = 10;
const boltCircleR = 42.5;
const boltCount = 8;
const clearanceD = 6.6;

interface SceneLike {
  parts: readonly {
    name: string;
    shape: { boundingBox(opts?: { exact?: boolean }): { min: number[]; max: number[] }; volume(): number };
  }[];
}

async function evaluateModel(input: { file: string } | { code: string }) {
  const evaluated = await evaluateAndBuildScript(input);
  assert.equal(evaluated.evaluation.exitCode, 0, JSON.stringify(evaluated.evaluation.diagnostics));
  const scene = evaluated.model?.rootShape;
  assert(isSceneBackend(scene), 'the model is not an assembly');
  return { scene: scene as unknown as SceneLike, featureCount: evaluated.evaluation.featureCount };
}

interface PartRow {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  volumeMm3: number;
}

function rowsFor(scene: SceneLike): PartRow[] {
  return scene.parts.map((part) => {
    const bounds = part.shape.boundingBox({ exact: true });
    return {
      name: part.name,
      min: [bounds.min[0], bounds.min[1], bounds.min[2]],
      max: [bounds.max[0], bounds.max[1], bounds.max[2]],
      volumeMm3: part.shape.volume(),
    };
  });
}

// ------------------------------------------------------------------- checks --
const evaluated = await evaluateModel({ file: `${dir}bolted-flange.kcad.ts` });
const scene = evaluated.scene;
const rows = rowsFor(scene);
const byName = new Map(rows.map((row) => [row.name, row]));

const expected = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
  `m6-${n}-nut`,
  `m6-${n}-screw`,
  `m6-${n}-tail-washer`,
]);
assert.deepEqual(
  [...byName.keys()].sort(),
  ['ring', ...expected].sort(),
  'one ring and eight three-part stacks',
);

// M6 clearance is normal (ISO 273), grip 10 + washer 1.6 + ISO 4032 nut 5.2
// + 2 pitches (2 mm) past the nut = 18.8 -> M6 x 20.
const sized = clearanceFitForHoleDiameter(clearanceD);
assert.deepEqual(sized, { thread: 'M6', fit: 'normal' });
const headD = FLATHEAD_HEAD.M6!.D;
const headK = FLATHEAD_HEAD.M6!.K;

// A flat head seats flush: its rim is on the ring top (z = 10) and the head
// spans the full ISO 10642 head diameter there.
const screw = byName.get('m6-1-screw')!;
assert(Math.abs(screw.max[2] - thickness) < TOL, `head top ${screw.max[2]}`);
assert(Math.abs(screw.min[2] - -10) < TOL, `tip ${screw.min[2]}`);
assert(Math.abs(screw.max[0] - screw.min[0] - headD) < TOL, `head Ø${screw.max[0] - screw.min[0]}`);

// The stack under the ring: washer 0..-1.6, nut -1.6..-6.8, tip 3.2 mm past.
const washer = byName.get('m6-1-tail-washer')!;
assert(Math.abs(washer.max[2]) < TOL, `washer top ${washer.max[2]}`);
assert(Math.abs(washer.min[2] + 1.6) < TOL, `washer bottom ${washer.min[2]}`);
const nut = byName.get('m6-1-nut')!;
assert(Math.abs(nut.max[2] + 1.6) < TOL, `nut top ${nut.max[2]}`);
assert(Math.abs(nut.min[2] + 6.8) < TOL, `nut bottom ${nut.min[2]}`);

// The seats are cut: the ring volume is below the same ring with plain bores.
const positions = Array.from({ length: boltCount }, (_, i) => {
  const angle = (i * 2 * Math.PI) / boltCount;
  return `{ u: ${boltCircleR * Math.cos(angle)}, v: ${boltCircleR * Math.sin(angle)} }`;
}).join(', ');
const plainEval = await evaluateAndBuildScript({
  code: `
    return cylinder(${thickness}, ${outerR})
      .subtract(cylinder(${thickness}, ${innerR}))
      .holes('top', { positions: [${positions}], diameter: ${clearanceD}, depth: 'through' });
  `,
});
assert.equal(plainEval.evaluation.exitCode, 0, JSON.stringify(plainEval.evaluation.diagnostics));
const plain = plainEval.model?.rootShape as unknown as {
  boundingBox(): { min: number[]; max: number[] };
  volume(): number;
};
const plainVolume = plain.volume();
const ringVolume = byName.get('ring')!.volumeMm3;
const removed = plainVolume - ringVolume;
// Eight 90° countersinks to Ø13.44 over the Ø6.6 bore: ~163 mm³ each.
assert(removed > 1150, `countersinks removed ${removed} mm3`);
assert(removed < 1450, `countersinks removed ${removed} mm3`);

// Interference: every pair, including head-to-seat contact at the cone rims.
const interferences: Array<{ a: string; b: string; volumeMm3: number }> = [];
let pairs = 0;
for (let i = 0; i < scene.parts.length; i++) {
  for (let j = i + 1; j < scene.parts.length; j++) {
    pairs++;
    const a = scene.parts[i]!;
    const b = scene.parts[j]!;
    const volume = Math.abs(fitBody(a.shape).intersect(fitBody(b.shape)).volume());
    if (volume > TOL) interferences.push({ a: a.name, b: b.name, volumeMm3: volume });
  }
}
assert.equal(interferences.length, 0, JSON.stringify(interferences));

// ----------------------------------------------------------------- evidence --
const source = `${dir}bolted-flange.kcad.ts`;
const evidence = {
  checkedAt: new Date().toISOString(),
  nativeKernel: 'OCCT via evaluateAndBuildScript',
  source: 'examples/parts/bolted-flange.kcad.ts',
  sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'),
  featureCount: evaluated.featureCount,
  pairsChecked: pairs,
  positiveVolumeOverlaps: interferences,
  parts: rows,
  insert: {
    holes: boltCount,
    boreMm: clearanceD,
    thread: sized.thread,
    fit: sized.fit,
    lengthMm: 18,
    family: 'flat-head-countersunk',
    seat: `countersink Ø${headD} x 90° to ${headK} deep (ISO 10642 head)`,
    countersinkRemovedMm3: removed,
    plainRingVolumeMm3: plainVolume,
    seatedRingVolumeMm3: ringVolume,
  },
  scope:
    'Native static envelope geometry and placement: head + shank solids, countersink seats, ' +
    'no helical thread, no thread contact, strength, torque or preload. The countersunk head ' +
    'is the seated ISO 10642 frustum (rim on the seat plane), filling the 90° countersink.',
};
const outDir = `${dir}../../docs/demos/standard-parts`;
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/flange-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, removed, pairs, overlaps: 0 }));
