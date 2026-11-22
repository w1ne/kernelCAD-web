// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../agent/mcp/tools/evaluateScript';

const errors = (diags: Array<{ code: string; severity: string; message?: string }>) =>
  diags.filter((d) => d.severity === 'error');

/** Dressed-cable polylines from examples/robot-arm/compact-supported-arm.kcad.ts (v4). */
const ARM_CABLE_RUNS: Array<{ r: number; points: [number, number, number][] }> = [
  {
    r: 2.3,
    points: [
      [0, -12.8, -24.6],
      [-16, -26, -20],
      [-40, -36, -12],
      [-46, -24, -4],
      [-42, -10, 2],
      [-38, 2, 6],
    ],
  },
  {
    r: 2.3,
    points: [
      [0, -12.8, -24.6],
      [10, -28, -18],
      [18, -34, -12],
      [12, -26, -10],
      [2, -16, -9],
      [-6, -8, -8],
    ],
  },
  {
    r: 2.35,
    points: [
      [0, -12.6, -24.6],
      [0, -30, -24.2],
      [0, -46, -27],
      [-2, -62, -26],
      [-4, -84, -28],
      [8, -96, -40],
      [6, -100, -54],
      [-8, -96, -42],
      [-6, -86, -30],
    ],
  },
  {
    r: 2.3,
    points: [
      [32, 0, 1],
      [46, 2, 5],
      [58, 4, -2],
      [70, 5, -14],
      [82, 3, -2],
      [98, 1, 4],
      [108, 0, 2],
    ],
  },
  {
    r: 2.25,
    points: [
      [32, 0, 1],
      [44, 2, 4],
      [56, 4, -1],
      [68, 4, -12],
      [80, 2, -1],
      [94, 1, 3],
    ],
  },
];

describe('pipe()', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('builds a straight solid whose volume matches a cylinder', async () => {
    const r = await evaluateScriptTool({
      code: 'return pipe([[0, 0, 0], [80, 0, 0]], 4);',
    });
    expect(errors(r.diagnostics).map((d) => d.code)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sceneSummary.volume).toBeCloseTo(Math.PI * 16 * 80, 1);
    expect(r.sceneSummary.faceCount).toBeLessThan(8);
  });

  it('builds a bent solid of few faces whose volume matches the centreline length', async () => {
    const r = await evaluateScriptTool({
      code: 'return pipe([[0, 0, 0], [40, 0, 0], [40, 0, 40]], 3, { bendRadius: 8 });',
    });
    expect(errors(r.diagnostics).map((d) => d.code)).toEqual([]);
    expect(r.ok).toBe(true);
    // Two 40 mm legs with an 8 mm / 90° bend: 32 + 32 + (π/2)*8.
    const cut = 32 + 32 + (Math.PI / 2) * 8;
    expect(r.sceneSummary.volume).toBeCloseTo(Math.PI * 9 * cut, 1);
    expect(r.sceneSummary.faceCount).toBeLessThan(12);
  });

  it('rejects a bend radius that does not exceed the pipe radius', async () => {
    const r = await evaluateScriptTool({
      code: 'return pipe([[0, 0, 0], [40, 0, 0], [40, 0, 40]], 5, { bendRadius: 5 });',
    });
    expect(r.ok).toBe(false);
    expect(errors(r.diagnostics)[0]?.message).toMatch(/greater than the pipe radius/);
  });

  it('rejects a sparse waypoint hole', async () => {
    const r = await evaluateScriptTool({
      code: 'return pipe([[0, 0, 0], [40, , 0], [40, 0, 40]], 3);',
    });
    expect(r.ok).toBe(false);
    expect(errors(r.diagnostics)[0]?.message).toMatch(/points\[1\]/);
  });

  it('rejects a corner that the bend radius cannot reach', async () => {
    const r = await evaluateScriptTool({
      code: 'return pipe([[0, 0, 0], [10, 0, 0], [10, 0, 10]], 3, { bendRadius: 20 });',
    });
    expect(r.ok).toBe(false);
    expect(errors(r.diagnostics)[0]?.message).toMatch(/too short|bendRadius/);
  });

  it('builds the compact-arm cable runs as cheap solids', async () => {
    const started = Date.now();
    let totalVolume = 0;
    let totalFaces = 0;
    for (const run of ARM_CABLE_RUNS) {
      const r = await evaluateScriptTool({
        code: `return pipe(${JSON.stringify(run.points)}, ${run.r});`,
      });
      expect(errors(r.diagnostics).map((d) => `${d.code}: ${d.message}`)).toEqual([]);
      expect(r.ok).toBe(true);
      totalVolume += r.sceneSummary.volume ?? 0;
      totalFaces += r.sceneSummary.faceCount ?? 0;
    }
    const elapsedMs = Date.now() - started;
    expect(totalVolume).toBeGreaterThan(1000);
    expect(totalFaces).toBeLessThan(80);
    // The same paths via circle().sweep({ spine: 'smooth' }) took ~90 s when
    // fused into the arm. Five isolated pipes must stay well under the 60 s cap.
    expect(elapsedMs).toBeLessThan(15000);
  }, 30000);
});
