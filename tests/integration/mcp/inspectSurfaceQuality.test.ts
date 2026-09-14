// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Analytic surface-quality inspect: box G0, fillet G1, G2 blend, sphere 1/r²,
// cylinder Gaussian 0 and |mean| 1/(2r). Public path is callMcpTool.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { InspectContinuityOutput } from '../../../src/agent/mcp/tools/inspectContinuity';
import type { InspectCurvatureOutput } from '../../../src/agent/mcp/tools/inspectCurvature';

beforeAll(async () => {
  await initOcct();
}, 60_000);

async function continuity(code: string): Promise<InspectContinuityOutput> {
  return (await callMcpTool('inspect', { of: 'continuity', code })) as InspectContinuityOutput;
}

async function curvature(code: string): Promise<InspectCurvatureOutput> {
  return (await callMcpTool('inspect', { of: 'curvature', code })) as InspectCurvatureOutput;
}

describe("inspect({ of: 'continuity' })", () => {
  it('classifies box edges as G0 only (90° normal jump)', async () => {
    const r = await continuity('return box(20, 20, 20);');
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.shared).toBeGreaterThanOrEqual(12);
    expect(r.summary!.g0).toBe(r.summary!.shared);
    expect(r.summary!.g1).toBe(0);
    expect(r.summary!.g2).toBe(0);
    expect(r.summary!.broken).toBe(0);
    for (const e of r.edges!) {
      expect(e.class).toBe('G0');
      expect(e.maxNormalAngleDeg).toBeGreaterThan(80);
      expect(e.maxNormalAngleDeg).toBeLessThan(100);
      expect(e.maxPositionGapMm).toBeLessThan(1e-3);
    }
    expect(r.diagnostics!.some(d => d.code === 'inspect.continuity.g1-break')).toBe(true);
  }, 60_000);

  it('classifies filleted-box fillet-to-face edges as G1 not G2', async () => {
    const r = await continuity('return box(20, 20, 20).fillet(3);');
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.shared).toBeGreaterThan(0);
    expect(r.summary!.g0).toBe(0);
    expect(r.summary!.broken).toBe(0);
    expect(r.summary!.g1).toBeGreaterThan(0);
    expect(r.summary!.g2).toBe(0);
    const g1 = r.edges!.filter(e => e.class === 'G1');
    expect(g1.length).toBeGreaterThan(0);
    for (const e of g1) {
      expect(e.maxNormalAngleDeg).toBeLessThan(2);
      expect(e.maxCurvatureDiff).toBeGreaterThan(0.05);
    }
  }, 60_000);

  it('classifies a G2 blend as G2', async () => {
    const code = [
      'const bump = nurbsSurface({',
      '  controls: [',
      '    [[0, 0, 0], [20, 0, 4], [40, 0, 0]],',
      '    [[0, 20, 4], [20, 20, 10], [40, 20, 4]],',
      '    [[0, 40, 0], [20, 40, 4], [40, 40, 0]],',
      '  ],',
      '  degree: { u: 2, v: 2 },',
      '});',
      'const cutter = nurbsSurface({',
      '  controls: [[[20, -5, -10], [20, 45, -10]], [[20, -5, 20], [20, 45, 20]]],',
      '  degree: { u: 1, v: 1 },',
      '});',
      'return sew(bump.split(cutter));',
    ].join('\n');
    const r = await continuity(code);
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.broken).toBe(0);
    const g2 = r.edges!.filter(e => e.class === 'G2');
    expect(g2.length, `classes: ${r.edges!.map(e => `${e.id}:${e.class}`).join(',')}`).toBeGreaterThan(0);
    for (const e of g2) {
      expect(e.maxNormalAngleDeg).toBeLessThan(1);
      expect(e.maxCurvatureDiff).toBeLessThan(0.05);
    }
  }, 90_000);
});

describe("inspect({ of: 'curvature' })", () => {
  it('reports sphere Gaussian curvature 1/r²', async () => {
    const radius = 10;
    const r = await curvature(`return sphere(${radius});`);
    expect(r.ok, r.error).toBe(true);
    expect(r.faces!.length).toBeGreaterThan(0);
    const sph = r.faces!.filter(f => /SPHERE/i.test(f.surfaceType));
    expect(sph.length).toBeGreaterThan(0);
    const want = 1 / (radius * radius);
    for (const f of sph) {
      expect(f.gaussian.mean).toBeCloseTo(want, 3);
      expect(f.gaussian.min).toBeCloseTo(want, 2);
      expect(f.gaussian.max).toBeCloseTo(want, 2);
    }
  }, 60_000);

  it('reports cylinder Gaussian 0 and |mean| 1/(2r)', async () => {
    const radius = 5;
    const r = await curvature(`return cylinder(20, ${radius});`);
    expect(r.ok, r.error).toBe(true);
    const cyl = r.faces!.filter(f => /CYL/i.test(f.surfaceType));
    expect(cyl.length).toBeGreaterThan(0);
    const wantH = 1 / (2 * radius);
    for (const f of cyl) {
      expect(f.gaussian.mean).toBeCloseTo(0, 3);
      expect(Math.abs(f.mean.mean)).toBeCloseTo(wantH, 3);
    }
  }, 60_000);
});
