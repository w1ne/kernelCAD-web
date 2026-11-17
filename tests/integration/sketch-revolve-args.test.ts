// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Sketch.revolve takes an option bag. A positional angle, `revolve(180)`, was
// read as an empty bag and silently built a full 360° solid.
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

// 5 × 10 rectangle touching the axis: a 360° revolve is a cylinder of 250π mm³.
const profile = 'path().moveTo(0, 0).lineTo(5, 0).lineTo(5, 10).lineTo(0, 10).close()';
const FULL = Math.PI * 25 * 10;

async function run(call: string) {
  let records;
  try {
    ({ records } = await runScript({ code: `return ${profile}.revolve(${call});`, fileName: 'test.kcad.ts' }));
  } catch (e) {
    const err = e as { code?: string; message: string };
    return { errors: [{ code: err.code, message: err.message }], volume: undefined };
  }
  const out = await new RecomputeEngine(new OcctLowerer()).run(records);
  return {
    errors: out.diagnostics.filter((d) => d.severity === 'error'),
    volume: [...out.shapes.values()].at(-1)!.volume(),
  };
}

describe('Sketch.revolve arguments', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds 360° with no argument or null and the requested angle with { angleDeg }', async () => {
    for (const call of ['', 'null']) {
      const full = await run(call);
      expect(full.errors).toEqual([]);
      expect(full.volume).toBeCloseTo(FULL, 3);
    }
    const half = await run('{ angleDeg: 180 }');
    expect(half.errors).toEqual([]);
    expect(half.volume).toBeCloseTo(FULL / 2, 3);
  });

  it.each(['180', '360, 16', '[180]'])(
    'rejects a non-object argument revolve(%s) instead of building 360°',
    async (call) => {
      const r = await run(call);
      expect(r.volume).toBeUndefined();
      expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
      expect(r.errors[0].message).toContain('Sketch.revolve({ angleDeg })');
      expect(r.errors[0].message).toContain('revolve({ angleDeg: 180 })');
    },
  );

  it('rejects an unknown option key', async () => {
    const r = await run('{ angle: 180 }');
    expect(r.volume).toBeUndefined();
    expect(r.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(r.errors[0].message).toContain("Sketch.revolve: unknown option 'angle'");
  });
});
