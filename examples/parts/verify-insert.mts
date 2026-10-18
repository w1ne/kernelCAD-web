// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Native geometry + placement evidence for the hole-driven insert example:
// counts, threads and lengths come from the hole diameters; the seats cut the
// countersink volume; every part pair is interference-free.
// Run from the repository root:
//   npx tsx examples/parts/verify-insert.mts
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
    const bounds = part.shape.boundingBox();
    return {
      name: part.name,
      min: [bounds.min[0], bounds.min[1], bounds.min[2]],
      max: [bounds.max[0], bounds.max[1], bounds.max[2]],
      volumeMm3: part.shape.volume(),
    };
  });
}

// ------------------------------------------------------------------- checks --
const evaluated = await evaluateModel({ file: `${dir}hole-driven-insert.kcad.ts` });
const scene = evaluated.scene;
const rows = rowsFor(scene);
const byName = new Map(rows.map((row) => [row.name, row]));
const names = [...byName.keys()].sort();

const expectedM5 = [1, 2, 3, 4].flatMap((n) => [`m5-${n}-nut`, `m5-${n}-screw`, `m5-${n}-tail-washer`]);
const expectedM3 = [1, 2].map((n) => `m3-${n}-screw`);
assert.deepEqual(names, ['plate', ...expectedM5, ...expectedM3].sort());

// Flat heads cut the seat and take no washer under the head.
assert(!names.some((name) => name.includes('head-washer')));

// M5 countersunk bolts: grip 8 + washer 1 + nut 4 -> M5 x 14. The seated head
// rim is flush with the plate top (z = 4) and the tip sits 1 mm past the nut.
const m5 = byName.get('m5-1-screw')!;
assert(Math.abs(m5.max[2] - 4) < TOL, `M5 head top ${m5.max[2]}`);
assert(Math.abs(m5.min[2] - -10) < TOL, `M5 tip ${m5.min[2]}`);
const nut = byName.get('m5-1-nut')!;
assert(Math.abs(nut.min[2] - -9) < TOL, `nut bottom ${nut.min[2]}`);
const washer = byName.get('m5-1-tail-washer')!;
assert(Math.abs(washer.max[2] - -4) < TOL, `washer top ${washer.max[2]}`);

// M3 socket heads: grip 8 -> M3 x 8, tip flush with the plate bottom.
const m3 = byName.get('m3-1-screw')!;
assert(Math.abs(m3.min[2] - -4) < TOL, `M3 tip ${m3.min[2]}`);
assert(Math.abs(m3.max[2] - 7) < TOL, `M3 head top ${m3.max[2]}`);

// The seats are cut: the plate volume is below the same plate with plain bores.
// A single shape (not an assembly) comes back as the root backend.
const plainEval = await evaluateAndBuildScript({
  code: `
    return box(80, 50, 8, true)
      .holes('top', {
        positions: [{ u: -28, v: -16 }, { u: 28, v: -16 }, { u: -28, v: 16 }, { u: 28, v: 16 }],
        diameter: 5.5,
        depth: 'through',
      })
      .holes('top', {
        positions: [{ u: 0, v: -16 }, { u: 0, v: 16 }],
        diameter: 3.4,
        depth: 'through',
      });
  `,
});
assert.equal(
  plainEval.evaluation.exitCode,
  0,
  JSON.stringify(plainEval.evaluation.diagnostics),
);
const plainShape = plainEval.model?.rootShape as unknown as { volume(): number };
const plainVolume = plainShape.volume();
const plateVolume = byName.get('plate')!.volumeMm3;
const removed = plainVolume - plateVolume;
assert(removed > 300, `countersinks removed ${removed} mm3`);
assert(removed < 460, `countersinks removed ${removed} mm3`);

// Interference: every pair, including head-to-seat contact at the cone rims.
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

// ----------------------------------------------------------------- evidence --
const source = `${dir}hole-driven-insert.kcad.ts`;
const evidence = {
  checkedAt: new Date().toISOString(),
  nativeKernel: 'OCCT via evaluateAndBuildScript',
  source: 'examples/parts/hole-driven-insert.kcad.ts',
  sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'),
  featureCount: evaluated.featureCount,
  pairsChecked: pairs,
  positiveVolumeOverlaps: interferences,
  parts: rows,
  insert: {
    m5: { holes: 4, thread: 'M5', lengthMm: 14, family: 'flat-head-countersunk', seat: 'countersink Ø11.2 x 90°' },
    m3: { holes: 2, thread: 'M3', lengthMm: 8, family: 'socket-head-cap-screw', seat: 'none' },
    countersinkRemovedMm3: removed,
    plainPlateVolumeMm3: plainVolume,
    seatedPlateVolumeMm3: plateVolume,
  },
  scope:
    'Native static envelope geometry and placement: head + shank solids, countersink seats, ' +
    'no helical thread, no thread contact, strength, torque or preload. The countersunk head ' +
    'is the envelope cylinder in the seat cone; the seat is cut to the head diameter.',
};
const outDir = `${dir}../../docs/demos/hole-driven-insert`;
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/geometry-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, removed, pairs, overlaps: 0 }));
