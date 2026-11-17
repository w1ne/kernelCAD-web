// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The hole option bags dropped unknown keys. `hole('top', { ..., cbore: 6 })`
// cut a plain hole with no counterbore (same volume as no counterbore at all).
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

async function run(body: string) {
  let records;
  try {
    ({ records } = await runScript({ code: `return box(20, 20, 10)${body};`, fileName: 'test.kcad.ts' }));
  } catch (e) {
    const err = e as { code?: string; message: string };
    return { errors: [{ code: err.code, message: err.message }], shape: undefined };
  }
  const out = await new RecomputeEngine(new OcctLowerer()).run(records);
  return { errors: out.diagnostics.filter((d) => d.severity === 'error'), shape: [...out.shapes.values()].at(-1)! };
}

const PLAIN = "{ u: 0, v: 0, diameter: 3, depth: 'through' }";
const CBORE = "{ u: 0, v: 0, diameter: 3, depth: 'through', counterbore: { diameter: 6, depth: 3 } }";

describe('hole option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds the documented forms', async () => {
    const plain = await run(`.hole('top', ${PLAIN})`);
    const cbore = await run(`.hole('top', ${CBORE})`);
    expect(plain.errors).toEqual([]);
    expect(cbore.errors).toEqual([]);
    // Counterbore removes an extra π/4·(6² − 3²)·3 ≈ 63.6 mm³.
    expect(plain.shape!.volume() - cbore.shape!.volume()).toBeCloseTo((Math.PI / 4) * (36 - 9) * 3, 1);

    const holes = await run(
      ".holes('top', { positions: [{ u: -5, v: 0 }, { u: 5, v: 0 }], diameter: 3, depth: 'through', countersink: { diameter: 6, angleDeg: 90 }, thread: { pitch: 0.5 } })",
    );
    expect(holes.errors).toEqual([]);
    const threaded = await run(".hole('top', { u: 0, v: 0, diameter: 6, depth: 8, thread: { fromDiameter: true } })");
    expect(threaded.errors).toEqual([]);
    const tapped = await run(".threadedHole('top', { u: 0, v: 0, spec: 'M6', depth: 8 })");
    expect(tapped.errors).toEqual([]);
  });

  it.each([
    [".hole('top', { u: 0, v: 0, diameter: 3, depth: 'through', cbore: 6 })", 'opts.cbore'],
    [".hole('top', { u: 0, v: 0, diameter: 3, depth: 'through', counterbore: { diameter: 6, depth: 3, angle: 90 } })", 'opts.counterbore.angle'],
    [".hole('top', { u: 0, v: 0, diameter: 3, depth: 'through', countersink: { diameter: 6, angle: 82 } })", 'opts.countersink.angle'],
    [".hole('top', { u: 0, v: 0, diameter: 6, depth: 8, thread: { pich: 1 } })", 'opts.thread.pich'],
    [".holes('top', { positions: [{ u: 0, v: 0 }], diameter: 3, depth: 'through', at: [0, 0, 10] })", 'opts.at'],
  ])('rejects an unknown key: %s', async (body, path) => {
    const r = await run(body);
    expect(r.shape).toBeUndefined();
    expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(r.errors[0].message).toContain(`${path} — got`);
    expect(r.errors[0].message).toContain('reads only');
  });

  it.each([".hole('top')", ".holes('top', 3)", ".hole('top', [1, 2])"])(
    'rejects a missing or non-object option bag: %s',
    async (body) => {
      const r = await run(body);
      expect(r.shape).toBeUndefined();
      expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
      expect(r.errors[0].message).toContain('requires an option object');
    },
  );
});
