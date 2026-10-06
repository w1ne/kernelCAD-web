// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterization: world-frame placement of assembly parts must not change
// when `at:` moves from the part shape into SceneBackendPart.worldTransform.
// Baseline captured from develop@7fb8750c behaviour; regenerate ONLY on the
// unmodified base with UPDATE_PLACEMENT_BASELINE=1.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';

const BASELINE = resolve(__dirname, '../../fixtures/assemblyPlacementBaseline.json');

export const PLACEMENT_FIXTURES: Record<string, string> = {
  modelWithAt: `
    const arm = assembly('static');
    arm.part('left', box(10, 10, 10), { at: [0, 0, 0] });
    arm.part('right', box(10, 20, 5), { at: [30, -4, 2] });
    return arm.model();
  `,
  matedWithAt: `
    const arm = assembly('two-link');
    const base = arm.part('base', box(20, 20, 6), { at: [0, 0, 0] });
    const link = arm.part('link', box(80, 10, 6), { at: [30, 0, 6] });
    base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 6] }, axis: [0, 0, 1] });
    link.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('shoulder', 'base.shoulder', 'link.shoulder', 'revolute', { limitsDeg: [-90, 90] });
    return arm.solvedModel({ shoulder: 30 });
  `,
  topologyConnectorWithAt: `
    const arm = assembly('topo');
    arm.part('a', box(20, 20, 5), { at: [5, 0, 0] }).connector('h', {
      type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
    });
    arm.part('b', box(20, 20, 5), { at: [0, 40, 0] }).connector('h', {
      type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
    });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    return arm.solvedModel({});
  `,
  connectPlacement: `
    const arm = assembly('connect');
    const base = arm.part('base', box(20, 20, 10), { connectors: { top: { origin: [10, 10, 10] } } });
    arm.part('cap', box(10, 10, 4), {
      connectors: { bottom: { origin: [5, 5, 0] } },
      connect: { connector: 'bottom', to: base.connector('top') },
    });
    return arm.model();
  `,
  paramAt: `
    const g = param('g', 30);
    const arm = assembly('param-at');
    arm.part('origin', box(5, 5, 5));
    arm.part('p', box(5, 5, 5), { at: [g.multiply(2), 0, 0] });
    return arm.model();
  `,
};

type Bbox = { min: number[]; max: number[] };

async function worldBboxes(code: string): Promise<Record<string, Bbox>> {
  const model = await buildModel({ code, fileName: 'placement.kcad.ts' });
  const scene = model.rootShape;
  if (!isSceneBackend(scene)) throw new Error('fixture did not return a scene');
  const out: Record<string, Bbox> = {};
  for (const p of sceneToWorldFrameParts(scene)) {
    const bb = p.shape.boundingBox({ exact: true });
    out[p.name] = { min: [...bb.min], max: [...bb.max] };
  }
  return out;
}

describe('assembly part world placement is unchanged', () => {
  beforeAll(async () => { await initOcct(); });

  it('matches the develop baseline for every fixture', async () => {
    const actual: Record<string, Record<string, Bbox>> = {};
    for (const [name, code] of Object.entries(PLACEMENT_FIXTURES)) actual[name] = await worldBboxes(code);
    if (process.env.UPDATE_PLACEMENT_BASELINE === '1') {
      writeFileSync(BASELINE, `${JSON.stringify(actual, null, 2)}\n`);
      return;
    }
    const expected = JSON.parse(readFileSync(BASELINE, 'utf8')) as typeof actual;
    for (const [fixture, parts] of Object.entries(expected)) {
      for (const [part, bb] of Object.entries(parts)) {
        for (let i = 0; i < 3; i++) {
          expect(actual[fixture][part].min[i], `${fixture}/${part} min[${i}]`).toBeCloseTo(bb.min[i], 6);
          expect(actual[fixture][part].max[i], `${fixture}/${part} max[${i}]`).toBeCloseTo(bb.max[i], 6);
        }
      }
    }
  }, 120_000);
});
