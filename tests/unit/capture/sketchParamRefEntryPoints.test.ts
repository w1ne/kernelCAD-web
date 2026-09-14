// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Every sketch / path / extrude / revolve entry point that takes a length (or
// an angle) accepts a ParamRef and keeps it SYMBOLIC. Two ways to prove it per
// entry point:
//   - re-lower the captured records against a changed param table (no
//     re-capture): the geometry must follow the new value, which only happens
//     if the record carries the ParamRef rather than a frozen number;
//   - through the public MCP dispatcher: `set_param` rewrites the script and
//     `inspect({ of: 'shape' })` measures the result.
// Plain numbers must still capture exactly the record they always did.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

type Run = Awaited<ReturnType<typeof runScript>>;

/** Lower the captured records with `param = value` (no re-capture) and return
 *  the volume and bbox of the script's last record. */
async function relower(run: Run, param: string, value: number) {
  run.paramTable.set(param, value);
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, {
    paramTable: run.paramTable,
  });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toHaveLength(0);
  const tail = run.records[run.records.length - 1];
  const shape = r.shapes.get(tail.id)!;
  return { volume: shape.volume(), bbox: shape.boundingBox() };
}

async function measure(code: string) {
  const out = (await callMcpTool('inspect', { of: 'shape', code })) as {
    ok: boolean;
    error?: string;
    shape?: { volume: number; bbox: { min: number[]; max: number[] } };
  };
  expect(out.ok, out.error).toBe(true);
  return out.shape!;
}

async function setParam(code: string, name: string, value: number): Promise<string> {
  const out = (await callMcpTool('set_param', { code, param_name: name, new_value: value })) as {
    ok: boolean;
    new_code?: string;
    diagnostics?: unknown[];
  };
  expect(out.ok, JSON.stringify(out.diagnostics)).toBe(true);
  return out.new_code!;
}

describe('ParamRef in sketch entry points', () => {
  beforeAll(async () => {
    await initOcct();
  });

  describe('path().circle(cx, cy, r)', () => {
    const code = `
      const r = param('r', 5);
      const cx = param('cx', 0);
      return path().circle(cx, 0, r, 64).extrude(2);
    `;

    it('keeps a ParamRef radius and centre symbolic through lowering', async () => {
      const run = await runScript({ code, fileName: 'circle.kcad.ts' });
      const sketch = run.records.find((rec) => rec.kind === 'sketch')!;
      expect(sketch.metadata?.paramRefs).toEqual(expect.arrayContaining(['r', 'cx']));
      // Regular 64-gon area = (n/2) r² sin(2π/n).
      const polyArea = (radius: number) => 32 * radius * radius * Math.sin((2 * Math.PI) / 64);
      expect((await relower(run, 'r', 5)).volume).toBeCloseTo(polyArea(5) * 2, 6);
      expect((await relower(run, 'r', 8)).volume).toBeCloseTo(polyArea(8) * 2, 6);
      const moved = await relower(run, 'cx', 30);
      expect((moved.bbox.min[0] + moved.bbox.max[0]) / 2).toBeCloseTo(30, 6);
    });

    it('re-evaluates after set_param through the public dispatcher', async () => {
      const before = await measure(code);
      const after = await measure(await setParam(code, 'r', 10));
      expect(after.volume / before.volume).toBeCloseTo(4, 6);
    });

    it('captures a numeric circle exactly as plain numbers', async () => {
      const run = await runScript({ code: 'return path().circle(1, 2, 3, 4).extrude(1);', fileName: 'n.kcad.ts' });
      const commands = run.records.find((rec) => rec.kind === 'sketch')!.metadata!.commands as Array<Record<string, { expression: string; paramRef?: unknown }>>;
      for (const c of commands) {
        for (const key of ['x', 'y'] as const) {
          if (c[key] === undefined) continue;
          expect(c[key].paramRef).toBeUndefined();
          expect(Number.isFinite(Number(c[key].expression))).toBe(true);
        }
      }
    });

    it('still rejects a non-positive radius, read through the param table', async () => {
      await expect(runScript({ code: `return path().circle(0, 0, param('r', -1)).extrude(1);`, fileName: 'bad.kcad.ts' }))
        .rejects.toThrow(/radius must be > 0; got -1/);
    });
  });

  it('Sketch.revolve({ angleDeg }) accepts a ParamRef angle', async () => {
    const run = await runScript({
      code: `
        const a = param('a', 90);
        return path().moveTo(5, 0).lineTo(10, 0).lineTo(10, 4).lineTo(5, 4).close().revolve({ angleDeg: a });
      `,
      fileName: 'rev.kcad.ts',
    });
    const ring = (deg: number) => (deg / 360) * Math.PI * (10 * 10 - 5 * 5) * 4;
    expect((await relower(run, 'a', 90)).volume).toBeCloseTo(ring(90), 3);
    expect((await relower(run, 'a', 270)).volume).toBeCloseTo(ring(270), 3);
  });

  it('Sketch.loft({ spacing }) accepts a ParamRef spacing', async () => {
    const run = await runScript({
      code: `
        const h = param('h', 10);
        const a = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();
        const b = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();
        return a.loft(b, { spacing: h, ruled: true });
      `,
      fileName: 'loft.kcad.ts',
    });
    expect((await relower(run, 'h', 10)).volume).toBeCloseTo(1000, 3);
    expect((await relower(run, 'h', 25)).volume).toBeCloseTo(2500, 3);
  });

  it('Sketch.loft({ planes }) accepts ParamRef plane origins', async () => {
    const run = await runScript({
      code: `
        const top = param('top', 12);
        const a = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();
        const b = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();
        return a.loft(b, { ruled: true, planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, top] }] });
      `,
      fileName: 'loftPlanes.kcad.ts',
    });
    expect((await relower(run, 'top', 12)).volume).toBeCloseTo(1200, 3);
    expect((await relower(run, 'top', 4)).volume).toBeCloseTo(400, 3);
  });

  describe('Sketch.reflect', () => {
    it('reflects ParamRef coordinates symbolically instead of collapsing them to 0', async () => {
      const run = await runScript({
        code: `
          const w = param('w', 10);
          return path().moveTo(0, 0).lineTo(w, 0).lineTo(w, 4).lineTo(0, 4).close().reflect('y').extrude(1);
        `,
        fileName: 'reflect.kcad.ts',
      });
      const at10 = await relower(run, 'w', 10);
      expect(at10.volume).toBeCloseTo(40, 6);
      expect(at10.bbox.min[0]).toBeCloseTo(-10, 6);
      const at15 = await relower(run, 'w', 15);
      expect(at15.volume).toBeCloseTo(60, 6);
      expect(at15.bbox.min[0]).toBeCloseTo(-15, 6);
    });

    it('accepts a ParamRef offset', async () => {
      const run = await runScript({
        code: `
          const off = param('off', 20);
          return path().moveTo(0, 0).lineTo(4, 0).lineTo(4, 4).lineTo(0, 4).close().reflect({ axis: 'y', offset: off }).extrude(1);
        `,
        fileName: 'reflectOffset.kcad.ts',
      });
      // x' = 2·off − x → [2off − 4, 2off].
      expect((await relower(run, 'off', 20)).bbox.max[0]).toBeCloseTo(40, 6);
      expect((await relower(run, 'off', 5)).bbox.max[0]).toBeCloseTo(10, 6);
    });

    it('keeps numeric reflection records plain numbers', async () => {
      const run = await runScript({
        code: `return path().moveTo(0, 1).lineTo(3, 1).sagittaArc(3, 5, 1).lineTo(0, 5).close().reflect({ axis: 'x', offset: 2 }).extrude(1);`,
        fileName: 'reflectNum.kcad.ts',
      });
      const sketches = run.records.filter((rec) => rec.kind === 'sketch');
      const reflected = sketches[sketches.length - 1].metadata!.commands as Array<Record<string, { evaluated: number; paramRef?: unknown; expression: string }>>;
      expect(reflected[0].y).toEqual({ expression: '3', unit: 'mm', evaluated: 3 });
      expect(reflected[2].sagitta).toEqual({ expression: '-1', unit: 'mm', evaluated: -1 });
    });
  });

  it('tangentCircle accepts a ParamRef radius and ParamRef entity coordinates', async () => {
    const run = await runScript({
      code: `
        const r = param('r', 3);
        const y = param('y', 0);
        return path().tangentCircle(
          [{ kind: 'line', from: [0, y], to: [1, y], side: 'enclosed' },
           { kind: 'line', from: [0, 0], to: [0, 1], side: 'outside' }],
          { radius: r },
        ).extrude(1);
      `,
      fileName: 'tangent.kcad.ts',
    });
    expect((await relower(run, 'r', 3)).volume).toBeCloseTo(Math.PI * 9, 3);
    expect((await relower(run, 'r', 6)).volume).toBeCloseTo(Math.PI * 36, 3);
  });

  it('spline start check reads a ParamRef pen position through the table', async () => {
    // Before: the pen read the ParamRef placeholder (0), so a literal start
    // point equal to the param value was rejected as a gap.
    const run = await runScript({
      code: `
        const x0 = param('x0', 5);
        return path().moveTo(x0, 0).spline([[5, 0], [8, 4], [5, 8]]).lineTo(0, 8).lineTo(0, 0).close().extrude(1);
      `,
      fileName: 'spline.kcad.ts',
    });
    expect(run.records.some((rec) => rec.kind === 'extrude')).toBe(true);
  });

  it('extrudePolygon accepts ParamRef point coordinates', async () => {
    const run = await runScript({
      code: `
        const w = param('w', 10);
        return extrudePolygon([[0, 0], [w, 0], [w, 5], [0, 5]], 2);
      `,
      fileName: 'poly.kcad.ts',
    });
    expect((await relower(run, 'w', 10)).volume).toBeCloseTo(100, 6);
    expect((await relower(run, 'w', 30)).volume).toBeCloseTo(300, 6);
  });
});
