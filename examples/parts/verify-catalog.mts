// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Native geometry + placement evidence for the current-catalog lineup: the
// displayed families and sizes, per-part spans, and pairwise interference.
// Run from the repository root:
//   npx tsx examples/parts/verify-catalog.mts
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';
import { HEX_BOLT_HEAD, SHCS_HEAD } from '../../src/modeling/parts/familyTable';

const dir = new URL('.', import.meta.url).pathname;
const TOL = 1e-6;

interface SceneLike {
  parts: readonly {
    name: string;
    shape: { boundingBox(): { min: number[]; max: number[] }; volume(): number };
  }[];
}

const evaluated = await evaluateAndBuildScript({ file: `${dir}catalog-lineup.kcad.ts` });
assert.equal(evaluated.evaluation.exitCode, 0, JSON.stringify(evaluated.evaluation.diagnostics));
const scene = evaluated.model?.rootShape;
assert(isSceneBackend(scene), 'the lineup is not an assembly');
const source = scene as unknown as SceneLike;

const rows = source.parts.map((part) => {
  const bounds = part.shape.boundingBox();
  return {
    name: part.name,
    min: [bounds.min[0], bounds.min[1], bounds.min[2]] as [number, number, number],
    max: [bounds.max[0], bounds.max[1], bounds.max[2]] as [number, number, number],
    volumeMm3: part.shape.volume(),
  };
});
const byName = new Map(rows.map((row) => [row.name, row]));
for (const row of rows) assert(row.volumeMm3 > 0, `${row.name} has no volume`);

const expected = [
  'display-base',
  'socket-head',
  'hex-head-bolt',
  'flat-head',
  'button-head',
  'set-screw',
  'hex-nut',
  'lock-nut',
  'flat-washer',
  'lock-washer',
  'threaded-rod',
];
assert.deepEqual([...byName.keys()].sort(), expected.sort(), 'the lineup parts');

// One span per family: heads up, base at z = -4..0, the rod lying at z = 0..8.
const spans: Record<string, [number, number]> = {
  'display-base': [-4, 0],
  'socket-head': [0, 40 + SHCS_HEAD.M10!.K],
  'hex-head-bolt': [0, 40 + HEX_BOLT_HEAD.M10!.K],
  'flat-head': [0, 30],
  'button-head': [0, 25 + 3.3],
  'set-screw': [0, 30],
  'hex-nut': [0, 8],
  'lock-nut': [0, 10],
  'flat-washer': [0, 2],
  'lock-washer': [0, 2.2],
  'threaded-rod': [0, 8],
};
for (const [name, [lo, hi]] of Object.entries(spans)) {
  const row = byName.get(name)!;
  assert(Math.abs(row.min[2] - lo) < TOL, `${name} z min ${row.min[2]}, expected ${lo}`);
  assert(Math.abs(row.max[2] - hi) < TOL, `${name} z max ${row.max[2]}, expected ${hi}`);
}

const interferences: Array<{ a: string; b: string; volumeMm3: number }> = [];
let pairs = 0;
for (let i = 0; i < source.parts.length; i++) {
  for (let j = i + 1; j < source.parts.length; j++) {
    pairs++;
    const a = source.parts[i]!;
    const b = source.parts[j]!;
    const volume = Math.abs(a.shape.intersect(b.shape).volume());
    if (volume > TOL) interferences.push({ a: a.name, b: b.name, volumeMm3: volume });
  }
}
assert.equal(interferences.length, 0, JSON.stringify(interferences));

const evidence = {
  checkedAt: new Date().toISOString(),
  nativeKernel: 'OCCT via evaluateAndBuildScript',
  source: 'examples/parts/catalog-lineup.kcad.ts',
  sourceSha256: createHash('sha256')
    .update(await readFile(`${dir}catalog-lineup.kcad.ts`))
    .digest('hex'),
  featureCount: evaluated.evaluation.featureCount,
  pairsChecked: pairs,
  positiveVolumeOverlaps: interferences,
  parts: rows,
  families: [
    'socket-head-cap-screw (ISO 4762, M2–M20)',
    'hex-head-bolt (ISO 4017, M3–M20)',
    'flat-head-countersunk (ISO 10642, M3–M12)',
    'button-head-cap-screw (ISO 7380, M3–M10)',
    'set-screw (ISO 4026, M3–M12)',
    'hex-nut (ISO 4032, M2–M20)',
    'lock-nut (DIN 985, M3–M12)',
    'flat-washer (ISO 7089, M2–M20)',
    'lock-washer (DIN 127B, M3–M12)',
    'threaded-rod (DIN 975, M3–M12 × 250/1000)',
  ],
  scope:
    'Native static envelope geometry and placement: head + shank solids and table dims, ' +
    'no helical thread, no thread contact, strength, torque or preload.',
};
const out = `${dir}../../docs/demos/standard-parts/catalog-evidence.json`;
await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, out, parts: rows.length, overlaps: 0 }));
