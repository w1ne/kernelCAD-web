// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Native geometry + placement evidence for the two parts-library examples.
// Run from the repository root:
//   npx tsx examples/parts/verify.mts
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';
import {
  BHCS_HEAD,
  FLAT_WASHER,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  SHCS_HEAD,
  SHCS_LENGTHS,
} from '../../src/modeling/parts/familyTable';

const dir = new URL('.', import.meta.url).pathname;
const TOL = 1e-6;

interface PartRow {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  volumeMm3: number;
}

async function evaluateScene(file: string) {
  const evaluated = await evaluateAndBuildScript({ file });
  assert.equal(evaluated.evaluation.exitCode, 0, JSON.stringify(evaluated.evaluation.diagnostics));
  const scene = evaluated.model?.rootShape;
  assert(isSceneBackend(scene), `${file}: the model is not an assembly`);
  const rows: PartRow[] = scene.parts.map((part) => {
    const bounds = part.shape.boundingBox();
    return {
      name: part.name,
      min: [bounds.min[0], bounds.min[1], bounds.min[2]],
      max: [bounds.max[0], bounds.max[1], bounds.max[2]],
      volumeMm3: part.shape.volume(),
    };
  });
  for (const row of rows) assert(row.volumeMm3 > 0, `${file}: ${row.name} has no volume`);
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
  assert.equal(
    interferences.length,
    0,
    `${file}: positive-volume overlaps ${JSON.stringify(interferences)}`,
  );
  return { rows, pairs, interferences, features: evaluated.evaluation.featureCount, scene };
}

function zSpan(row: PartRow): [number, number] {
  return [row.min[2], row.max[2]];
}

function byName(rows: PartRow[]): Map<string, PartRow> {
  return new Map(rows.map((row) => [row.name, row]));
}

function expectSpan(rows: Map<string, PartRow>, name: string, zMin: number, zMax: number): void {
  const row = rows.get(name);
  assert(row, `missing part ${name}`);
  const [lo, hi] = zSpan(row);
  assert(Math.abs(lo - zMin) < 1e-6, `${name} z min ${lo}, expected ${zMin}`);
  assert(Math.abs(hi - zMax) < 1e-6, `${name} z max ${hi}, expected ${zMax}`);
}

// ---------------------------------------------------------------- bolt stack --
const gripMm = 12;
const seat = 8 + gripMm; // bar lift + grip
const washerT = FLAT_WASHER.M5!.t;
const nutM = HEX_NUT.M5!.m;
const needed = gripMm + washerT + nutM;
const screwLength = SHCS_LENGTHS.M5!.find((length) => length >= needed);
assert(screwLength, 'no stocked screw length clears the grip');

const stack = await evaluateScene(`${dir}bolt-stack.kcad.ts`);
const stackRows = byName(stack.rows);
assert.deepEqual(
  [...stackRows.keys()].sort(),
  ['head-washer', 'hex-nut', 'lower-bar', 'screw', 'tail-washer', 'upper-bar'],
);
expectSpan(stackRows, 'lower-bar', 8, 14);
expectSpan(stackRows, 'upper-bar', 14, seat);
expectSpan(stackRows, 'head-washer', seat, seat + washerT);
expectSpan(stackRows, 'tail-washer', seat - gripMm - washerT, seat - gripMm);
expectSpan(stackRows, 'hex-nut', seat - gripMm - washerT - nutM, seat - gripMm - washerT);
expectSpan(stackRows, 'screw', seat - gripMm - washerT - nutM, seat + washerT + SHCS_HEAD.M5!.K);
assert.equal(screwLength + SHCS_HEAD.M5!.K, 23); // screw z span
assert(
  Math.abs(stackRows.get('screw')!.max[0] - stackRows.get('screw')!.min[0] - SHCS_HEAD.M5!.D) < 1e-6,
);

// ------------------------------------------------------------- family lineup --
const lineup = await evaluateScene(`${dir}fastener-lineup.kcad.ts`);
const lineupRows = byName(lineup.rows);
assert.equal(lineupRows.size, 8);
expectSpan(lineupRows, 'display-base', -4, 0);
expectSpan(lineupRows, 'socket-head', 0, 16 + SHCS_HEAD.M5!.K);
expectSpan(lineupRows, 'button-head', 0, 16 + BHCS_HEAD.M5!.K);
expectSpan(lineupRows, 'flat-head', 0, 16); // seated frustum: rim at 0, tip at -length
expectSpan(lineupRows, 'hex-nut', 0, HEX_NUT.M5!.m);
expectSpan(lineupRows, 'lock-nut', 0, LOCK_NUT.M5!.m);
expectSpan(lineupRows, 'flat-washer', 0, FLAT_WASHER.M5!.t);
expectSpan(lineupRows, 'lock-washer', 0, LOCK_WASHER.M5!.t);

// ------------------------------------------------------------------- evidence --
const source = (name: string) => `${dir}${name}.kcad.ts`;
const sha256 = async (path: string) =>
  createHash('sha256').update(await readFile(path)).digest('hex');
const evidence = {
  checkedAt: new Date().toISOString(),
  nativeKernel: 'OCCT via evaluateAndBuildScript',
  sources: {
    'bolt-stack.kcad.ts': await sha256(source('bolt-stack')),
    'fastener-lineup.kcad.ts': await sha256(source('fastener-lineup')),
  },
  boltStack: {
    gripMm,
    screwLengthMm: screwLength,
    lengthRuleMm: needed,
    featureCount: stack.features,
    pairsChecked: stack.pairs,
    positiveVolumeOverlaps: stack.interferences,
    parts: stack.rows,
  },
  lineup: {
    families: [
      'socket-head-cap-screw (ISO 4762)',
      'button-head-cap-screw (ISO 7380)',
      'flat-head-countersunk (ISO 10642)',
      'hex-nut (ISO 4032)',
      'lock-nut (DIN 985)',
      'flat-washer (ISO 7089)',
      'lock-washer (DIN 127B)',
    ],
    featureCount: lineup.features,
    pairsChecked: lineup.pairs,
    positiveVolumeOverlaps: lineup.interferences,
    parts: lineup.rows,
  },
  scope:
    'Native static envelope geometry and placement: head + shank solids and table dims, ' +
    'no helical thread, no thread contact, strength, torque or preload. ' +
    'The committed catalog STEPs are exported from the same family table.',
};
const out = `${dir}../../docs/demos/standard-parts/geometry-evidence.json`;
await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, out, screwLength, overlaps: 0 }));
