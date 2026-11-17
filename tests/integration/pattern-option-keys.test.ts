// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The pattern option bags dropped unknown keys. `patternCircular({ angle: 90 })`
// built a full 360° ring, and `patternGrid({ x, y, z })` built a flat grid.
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

async function run(body: string) {
  let records;
  try {
    ({ records } = await runScript({ code: `return box(10, 10, 10)${body};`, fileName: 'test.kcad.ts' }));
  } catch (e) {
    const err = e as { code?: string; message: string };
    return { errors: [{ code: err.code, message: err.message }], shape: undefined };
  }
  const out = await new RecomputeEngine(new OcctLowerer()).run(records);
  return { errors: out.diagnostics.filter((d) => d.severity === 'error'), shape: [...out.shapes.values()].at(-1)! };
}

const AXIS = '{ count: 2, direction: [1, 0, 0], spacing: 20 }';
const AXIS_Y = '{ count: 2, direction: [0, 1, 0], spacing: 20 }';

describe('pattern option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds the documented forms', async () => {
    // Four boxes over a 90° arc stay in the +X/+Y quadrant.
    const arc = await run('.translate(30, 0, 0).patternCircular({ count: 4, axis: [0, 0, 1], angleDeg: 90 })');
    expect(arc.errors).toEqual([]);
    expect(arc.shape!.volume()).toBeCloseTo(4000, 3);
    expect(arc.shape!.boundingBox().min[0]).toBeGreaterThan(0);

    const lin = await run('.patternLinear({ count: 3, direction: [1, 0, 0], spacing: 20 })');
    expect(lin.errors).toEqual([]);
    expect(lin.shape!.volume()).toBeCloseTo(3000, 3);

    const grid = await run(`.patternGrid({ x: ${AXIS}, y: ${AXIS_Y} })`);
    expect(grid.errors).toEqual([]);
    expect(grid.shape!.volume()).toBeCloseTo(4000, 3);
  });

  it.each([
    ['.translate(30, 0, 0).patternCircular({ count: 4, axis: [0, 0, 1], angle: 90 })', "opts.angle"],
    ['.patternLinear({ count: 3, direction: [1, 0, 0], spacing: 20, gap: 5 })', 'opts.gap'],
    [`.patternGrid({ x: ${AXIS}, y: ${AXIS_Y}, z: { count: 2, direction: [0, 0, 1], spacing: 20 } })`, 'opts.z'],
    [`.patternGrid({ x: { count: 2, direction: [1, 0, 0], spacing: 20, pitch: 5 }, y: ${AXIS_Y} })`, 'patternGrid.x.pitch'],
  ])('rejects an unknown key: %s', async (body, path) => {
    const r = await run(body);
    expect(r.shape).toBeUndefined();
    expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(r.errors[0].message).toContain(`${path} — got`);
    expect(r.errors[0].message).toContain('reads only');
  });

  it.each(['.patternCircular()', '.patternLinear(3)', '.patternGrid(null)'])(
    'rejects a missing or non-object option bag: %s',
    async (body) => {
      const r = await run(body);
      expect(r.shape).toBeUndefined();
      expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
      expect(r.errors[0].message).toContain('requires an option object');
    },
  );
});
