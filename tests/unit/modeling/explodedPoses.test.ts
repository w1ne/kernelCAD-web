// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/modeling/explodedPoses.test.ts
//
// Geometric contract for explodedPoses: mate-axis spacing on a 3-part stack,
// radial monotonicity, and zero interference after explode.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import {
  explodedPoses,
  applyExplodedOffsets,
} from '../../../src/modeling/runtime/explodedPoses';

const STACK = `
const SIZE = 10;
const arm = assembly('stack');
arm.part('base', box(SIZE, SIZE, SIZE), { material: 'aluminum' })
  .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [SIZE / 2, SIZE / 2, SIZE] }, normal: [0, 0, 1] });
arm.part('mid', box(SIZE, SIZE, SIZE), { material: 'pla' })
  .connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [SIZE / 2, SIZE / 2, 0] }, normal: [0, 0, 1] })
  .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [SIZE / 2, SIZE / 2, SIZE] }, normal: [0, 0, 1] });
arm.part('top', box(SIZE, SIZE, SIZE), { material: 'steel' })
  .connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [SIZE / 2, SIZE / 2, 0] }, normal: [0, 0, 1] });
arm.mate('base-mid', 'base.top', 'mid.bottom', 'fastened');
arm.mate('mid-top', 'mid.top', 'top.bottom', 'fastened');
return arm.model();
`;

const RADIAL = `
const arm = assembly('radial');
arm.part('a', box(10, 10, 10), { at: [-30, 0, 0], material: 'aluminum' });
arm.part('b', box(10, 10, 10), { at: [30, 0, 0], material: 'pla' });
arm.part('c', box(10, 10, 10), { at: [0, 30, 0], material: 'steel' });
return arm.model();
`;

async function lower(code: string): Promise<{ arm: Assembly; scene: SceneBackend }> {
  const run = await runScript({ code, fileName: 'explode.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const arm = [...run.session.assemblies.values()][0] as Assembly | undefined;
  if (!arm) throw new Error('expected an assembly');
  let scene: SceneBackend | undefined;
  for (const shape of r.shapes.values()) {
    if (isSceneBackend(shape)) scene = shape;
  }
  if (!scene) throw new Error('expected a SceneBackend');
  return { arm, scene };
}

function offsetOf(result: Awaited<ReturnType<typeof explodedPoses>>, name: string) {
  const part = result.parts.find((p) => p.name === name);
  if (!part) throw new Error(`missing exploded part ${name}`);
  return part;
}

beforeAll(async () => {
  await initOcct();
}, 60000);

describe('explodedPoses — mate-axis 3-part stack', () => {
  it('moves children along the mate axis by part-size × factor, cumulatively, with zero interference', async () => {
    const { arm, scene } = await lower(STACK);
    const result = await explodedPoses(arm, { factor: 1, mode: 'mate-axis' }, scene);
    const base = offsetOf(result, 'base');
    const mid = offsetOf(result, 'mid');
    const top = offsetOf(result, 'top');

    expect(base.distance).toBeCloseTo(0, 5);
    // Each 10 mm cube: spacing = 10 × factor. Mid moves one step; top two.
    expect(mid.offset[0]).toBeCloseTo(0, 5);
    expect(mid.offset[1]).toBeCloseTo(0, 5);
    expect(mid.offset[2]).toBeCloseTo(10, 5);
    expect(top.offset[0]).toBeCloseTo(0, 5);
    expect(top.offset[1]).toBeCloseTo(0, 5);
    expect(top.offset[2]).toBeCloseTo(20, 5);
    expect(Math.abs(mid.direction[2])).toBeCloseTo(1, 5);
    expect(Math.abs(top.direction[2])).toBeCloseTo(1, 5);

    const exploded = applyExplodedOffsets(scene, result.offsets);
    const inter = detectInterferences(exploded, 0.01, new Set());
    expect(inter.pairs).toEqual([]);
  }, 60000);
});

describe('explodedPoses — radial', () => {
  it('moves every part outward; distance increases monotonically with factor', async () => {
    const { arm, scene } = await lower(RADIAL);
    const lo = await explodedPoses(arm, { factor: 1, mode: 'radial' }, scene);
    const hi = await explodedPoses(arm, { factor: 2, mode: 'radial' }, scene);
    expect(lo.parts).toHaveLength(3);
    for (const name of ['a', 'b', 'c'] as const) {
      const a = offsetOf(lo, name);
      const b = offsetOf(hi, name);
      expect(a.distance).toBeGreaterThan(0);
      expect(b.distance).toBeGreaterThan(a.distance);
      expect(b.distance / a.distance).toBeCloseTo(2, 5);
      for (const i of [0, 1, 2] as const) {
        if (Math.abs(a.offset[i]) < 1e-9) {
          expect(b.offset[i]).toBeCloseTo(0, 5);
        } else {
          expect(b.offset[i] / a.offset[i]).toBeCloseTo(2, 5);
        }
      }
    }
  }, 60000);
});
