// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/backends/occt/holeFaceFrame.test.ts
//
// The face-local (u, v) frame of .hole() / .holes() / .cutout(), measured on
// the RESULT geometry (hole detection), and the fail-closed
// `feature.hole.cut-missing` gate. Regression for a NEMA-17 motor plate whose
// bores silently landed off the face (ok, no diagnostic) and for the origin
// drifting when a face already carried a hole.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { detectCylindricalHoles } from '../../../../src/kernel/backends/occt/holeDetection';
import { findUncutBores } from '../../../../src/kernel/backends/occt/holeCutCheck';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';

type V3 = [number, number, number];

async function lower(code: string): Promise<{ shape: OcctBackend | undefined; diagnostics: CompilerDiagnostic[] }> {
  const run = await runScript({ code, fileName: 'frame.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  return {
    shape: r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined,
    diagnostics: r.diagnostics as CompilerDiagnostic[],
  };
}

const errorsOf = (d: CompilerDiagnostic[]) => d.filter((x) => x.severity === 'error');

/** Detected hole (mouth for blind, an axis end for through) nearest `p`. */
function holeNear(shape: OcctBackend, p: V3, diameter: number) {
  const holes = detectCylindricalHoles(shape).filter((h) => Math.abs(h.diameterMm - diameter) < 1e-3);
  const dist = (q: V3) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  return holes.sort((a, b) => dist(a.axisOrigin) - dist(b.axisOrigin))[0];
}

function expectPoint(actual: V3 | undefined, expected: V3): void {
  expect(actual).toBeDefined();
  for (let i = 0; i < 3; i++) expect(actual![i]).toBeCloseTo(expected[i], 3);
}

describe('hole (u, v) frame — NEMA-17 motor plate regression', () => {
  beforeAll(async () => { await initOcct(); });

  // Vertical plate: X -24..24, Y 0..5, Z 5..60. The 'front' face (Y = 0) has
  // its centre at world (0, 0, 32.5); u = +X, v = +Z.
  const plate = `
    const t = param('t', 5);
    const motorCenterZ = param('motorCenterZ', 30);
    const s = param('s', 31);
    let vert = box(48, t, 55, false).translate(-24, 0, 5);
  `;

  it('cuts all 5 bores at the exact world coordinates (ParamRef add/subtract, then a pilot hole on the drilled face)', async () => {
    const { shape, diagnostics } = await lower(`${plate}
      const faceCenterZ = 32.5;
      const vc = motorCenterZ.subtract(faceCenterZ);
      vert = vert.holes('front', { positions: [
        { u: s.divide(-2), v: vc.subtract(s.divide(2)) },
        { u: s.divide(2), v: vc.subtract(s.divide(2)) },
        { u: s.divide(-2), v: vc.add(s.divide(2)) },
        { u: s.divide(2), v: vc.add(s.divide(2)) },
      ], diameter: 3.4, depth: 'through' });
      return vert.hole('front', { u: 0, v: vc, diameter: 22, depth: 'through' });
    `);
    expect(errorsOf(diagnostics)).toEqual([]);
    const holes = detectCylindricalHoles(shape!);
    expect(holes).toHaveLength(5);
    // Through holes along Y: compare the X/Z of each axis.
    const xz = holes.map((h) => [h.diameterMm, h.axisOrigin[0], h.axisOrigin[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const expected = [
      [3.4, -15.5, 14.5], [3.4, -15.5, 45.5], [3.4, 15.5, 14.5], [3.4, 15.5, 45.5], [22, 0, 30],
    ];
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) expect(xz[i][k]).toBeCloseTo(expected[i][k], 3);
    // Volume: 4 × M3 clearance + 22 mm pilot through 5 mm, nothing else.
    const removed = 48 * 5 * 55 - shape!.volume();
    expect(removed).toBeCloseTo(Math.PI * 5 * (4 * 1.7 * 1.7 + 11 * 11), 2);
  });

  it('world-Z positions (the original bug) fail with feature.hole.cut-missing naming each off-face bore', async () => {
    const { diagnostics } = await lower(`${plate}
      return vert.holes('front', { positions: [
        { u: s.divide(-2), v: motorCenterZ.subtract(s.divide(2)) },
        { u: s.divide(2), v: motorCenterZ.subtract(s.divide(2)) },
        { u: s.divide(-2), v: motorCenterZ.add(s.divide(2)) },
        { u: s.divide(2), v: motorCenterZ.add(s.divide(2)) },
      ], diameter: 3.4, depth: 'through' });
    `);
    const errs = errorsOf(diagnostics);
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.hole.cut-missing');
    expect(errs[0].message).toContain('2 of 4');
    expect(errs[0].message).toContain('#2 (u=-15.5, v=45.5) -> world (-15.5, 0, 78)');
    expect(errs[0].message).toContain('#3 (u=15.5, v=45.5)');
    expect(errs[0].message).not.toContain('#0 ');
    expect(errs[0].message).toContain('[outside-face]');
    expect(errs[0].message).toContain("On 'front', (u, v) are mm offsets from the face centre (0, 0, 32.5), u = +X, v = +Z");
    expect(errs[0].message).toContain('v in [-27.5, 27.5]');
  });

  it('a pilot whose centre is past the face edge (an open notch) fails instead of cutting a notch', async () => {
    const { diagnostics } = await lower(`${plate}
      return vert.hole('front', { u: 0, v: motorCenterZ, diameter: 22, depth: 'through' });
    `);
    const errs = errorsOf(diagnostics);
    expect(errs.map((e) => e.code)).toEqual(['feature.hole.cut-missing']);
    expect(errs[0].message).toContain('1 of 1');
    expect(errs[0].message).toContain('world (0, 0, 62.5)');
  });

  it('MCP evaluate reports ok: false for an off-face bore', async () => {
    const out = (await callMcpTool('inspect', {
      of: 'shape',
      code: `return box(20, 20, 5, true).holes('top', { positions: [{ u: 0, v: 0 }, { u: 30, v: 0 }], diameter: 3, depth: 'through' });`,
    })) as { ok: boolean; diagnostics?: Array<{ code: string }> };
    expect(out.ok).toBe(false);
    expect(JSON.stringify(out)).toContain('feature.hole.cut-missing');
  });
});

describe('hole (u, v) frame — matrix over faces and part placement', () => {
  beforeAll(async () => { await initOcct(); });

  // box(40, 30, 20, true): the face frame is world-aligned by the face's
  // CURRENT outward normal: top/bottom u=+X v=+Y, front/back u=+X v=+Z,
  // left/right u=+Y v=+Z, origin at the face centre.
  const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
  const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]];
  const basisFor = (n: V3): [V3, V3] => (Math.abs(n[2]) > 0.5 ? [X, Y] : Math.abs(n[0]) > 0.5 ? [Y, Z] : [X, Z]);
  const unrotated: Record<string, V3> = { top: Z, bottom: neg(Z), front: neg(Y), back: Y, left: neg(X), right: X };
  // rotate([0,0,1], 90): X -> Y, Y -> -X. Canonical names follow the part's
  // own faces, so 'front' (-Y) now faces +X.
  const rotZ90 = (a: V3): V3 => [-a[1], a[0], a[2]];
  const placements: Array<{ name: string; chain: string; normal: (n: V3) => V3; center: V3; half: (n: V3) => number }> = [
    { name: 'identity', chain: '', normal: (n) => n, center: [0, 0, 0], half: (n) => Math.abs(n[0]) * 20 + Math.abs(n[1]) * 15 + Math.abs(n[2]) * 10 },
    { name: 'translated', chain: '.translate(7, -11, 13)', normal: (n) => n, center: [7, -11, 13], half: (n) => Math.abs(n[0]) * 20 + Math.abs(n[1]) * 15 + Math.abs(n[2]) * 10 },
    { name: 'rotated + translated', chain: '.rotate([0, 0, 1], 90).translate(7, -11, 13)', normal: rotZ90, center: [7, -11, 13], half: (n) => Math.abs(n[0]) * 15 + Math.abs(n[1]) * 20 + Math.abs(n[2]) * 10 },
  ];

  for (const pl of placements) {
    for (const face of Object.keys(unrotated)) {
      it(`${pl.name} · '${face}': two chained blind holes land at centre + u·U + v·V`, async () => {
        const n = pl.normal(unrotated[face]);
        const [U, V] = basisFor(n);
        const h = pl.half(n);
        const c: V3 = [pl.center[0] + n[0] * h, pl.center[1] + n[1] * h, pl.center[2] + n[2] * h];
        const at = (u: number, v: number): V3 => [0, 1, 2].map((i) => c[i] + u * U[i] + v * V[i]) as V3;
        // The first (large) hole must not shift the origin of the second.
        const { shape, diagnostics } = await lower(`
          return box(40, 30, 20, true)${pl.chain}
            .hole('${face}', { u: 5, v: 3, diameter: 8, depth: 4 })
            .hole('${face}', { u: -6, v: -5, diameter: 2, depth: 4 });
        `);
        expect(errorsOf(diagnostics)).toEqual([]);
        const big = holeNear(shape!, at(5, 3), 8);
        const small = holeNear(shape!, at(-6, -5), 2);
        expectPoint(big?.axisOrigin, at(5, 3));
        expectPoint(small?.axisOrigin, at(-6, -5));
        expectPoint(small?.axisDirection, neg(n));
      });
    }
  }

  it('holes() positions outside the face fail on every face', async () => {
    for (const face of Object.keys(unrotated)) {
      const { diagnostics } = await lower(`
        return box(40, 30, 20, true).holes('${face}', { positions: [{ u: 0, v: 0 }, { u: 0, v: 40 }], diameter: 2, depth: 3 });
      `);
      const errs = errorsOf(diagnostics);
      expect(errs.map((e) => e.code), face).toEqual(['feature.hole.cut-missing']);
      expect(errs[0].message, face).toContain('#1 (u=0, v=40)');
      expect(errs[0].message, face).toContain(`On '${face}'`);
    }
  });
});

describe('cutout (u, v) origin', () => {
  beforeAll(async () => { await initOcct(); });

  it('a cutout after a hole on the same face keeps the face-centre origin', async () => {
    const { shape, diagnostics } = await lower(`
      const sk = path().moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close();
      const drilled = box(100, 100, 10, true).hole('top', { u: 30, v: 0, diameter: 40, depth: 'through' });
      return drilled.cutout(sk, { face: 'top', depth: 'through' });
    `);
    expect(errorsOf(diagnostics)).toEqual([]);
    // The 4×4 pocket sits at the face centre: a slab x ∈ [-3, 3] holds it whole.
    const slab = OcctBackend.box(6, 100, 10).translate(-3, -50, -5);
    expect(shape!.intersectionVolume(slab)).toBeCloseTo(6 * 100 * 10 - 4 * 4 * 10, 2);
  });
});

describe('findUncutBores (post-cut gate)', () => {
  beforeAll(async () => { await initOcct(); });

  it('names a bore whose axis still holds material', () => {
    const solid = OcctBackend.box(20, 20, 10);
    const bb = solid.boundingBox();
    const top = bb.max[2];
    const cx = (bb.min[0] + bb.max[0]) / 2, cy = (bb.min[1] + bb.max[1]) / 2;
    const misses = findUncutBores(solid, [
      { index: 0, u: 0, v: 0, entryPoint: [cx, cy, top], axisIntoBody: [0, 0, -1], depth: 5, diameter: 3 },
      { index: 1, u: 50, v: 0, entryPoint: [cx + 50, cy, top], axisIntoBody: [0, 0, -1], depth: 5, diameter: 3 },
    ]);
    expect(misses.map((m) => [m.request.index, m.reason])).toEqual([[0, 'not-cut']]);
  });
});
