// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole({ thread })` / `holes({ thread })`: an internal ISO metric thread.
// Modeled threads must be valid solids whose removed volume equals the bore at
// the ISO minor diameter plus the helical groove (screw-sweep Pappus); cosmetic
// threads drill only the minor diameter and record the thread. Author mistakes
// fail at capture with the valid range named.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import { isoInternalGrooveProfile, isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';

/** ∫∫ (R + x) dA over the part of a profile polygon with x ≥ 0. */
function outerMoment(profile: ReadonlyArray<readonly [number, number]>, R: number): number {
  const clipped: Array<[number, number]> = [];
  for (let i = 0; i < profile.length; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % profile.length];
    if (a[0] >= 0) clipped.push([a[0], a[1]]);
    if ((a[0] >= 0) !== (b[0] >= 0)) {
      const t = a[0] / (a[0] - b[0]);
      clipped.push([0, a[1] + t * (b[1] - a[1])]);
    }
  }
  let area2 = 0;
  let mx6 = 0;
  for (let i = 0; i < clipped.length; i++) {
    const [x0, y0] = clipped[i];
    const [x1, y1] = clipped[(i + 1) % clipped.length];
    const c = x0 * y1 - x1 * y0;
    area2 += c;
    mx6 += (x0 + x1) * c;
  }
  return Math.abs((R * area2) / 2 + mx6 / 6);
}

/** Volume a through tapped hole removes from a slab of thickness h. */
function tappedRemoval(D: number, P: number, c: number, h: number): number {
  const rBore = isoMinorRadius(D, P) + c;
  return Math.PI * rBore * rBore * h + (h / P) * 2 * Math.PI * outerMoment(isoInternalGrooveProfile(D, P, c), rBore);
}

async function lower(code: string) {
  const run = await runScript({ code, fileName: 'tap.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  return { run, result: r, shape: r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined };
}

function brepValid(shape: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer((shape.getReplicadShape() as any).wrapped, true, false);
  const valid = analyzer.IsValid_2();
  analyzer.delete();
  return valid;
}

describe('hole({ thread }) — internal ISO metric thread', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it.each([
    ['M3', 3, 0.5, 0.05],
    ['M8', 8, 1.25, 0.1],
  ])('%s modeled through thread: valid solid, analytic removed volume', async (_n, D, P, c) => {
    const side = 3 * D;
    const h = 1.5 * P;
    const code = `return box(${side}, ${side}, ${h}, true).hole('top', { u: 0, v: 0, diameter: ${D}, depth: 'through', thread: { pitch: ${P}, modeled: true, clearance: ${c} } });`;
    const { result, shape } = await lower(code);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(brepValid(shape!)).toBe(true);
    const out = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; shape: { volume: number } };
    const removed = side * side * h - out.shape.volume;
    expect(Math.abs(removed - tappedRemoval(D, P, c, h)) / tappedRemoval(D, P, c, h)).toBeLessThan(1e-4);
  });

  it('cosmetic thread drills the ISO minor diameter and records the thread', async () => {
    const code = `return box(20, 20, 5, true).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', thread: { pitch: 1 } });`;
    const { run, shape } = await lower(code);
    const rMinor = isoMinorRadius(6, 1);
    expect(rMinor * 2).toBeCloseTo(6 - 1.0825318, 6);
    expect(shape!.volume()).toBeCloseTo(20 * 20 * 5 - Math.PI * rMinor * rMinor * 5, 4);
    const hole = run.records.find((r) => r.kind === 'hole')!;
    expect(hole.params.threadPitch.evaluated).toBe(1);
    expect(hole.params.threadModeled.evaluated).toBe(0);
    expect(hole.params.threadClearance.evaluated).toBe(0);
    expect(hole.params.diameter.evaluated).toBe(6);
  });

  it('stops a blind modeled thread short of the floor', async () => {
    const D = 4;
    const P = 0.7;
    const code = `return box(20, 20, 10, true).hole('top', { u: 0, v: 0, diameter: ${D}, depth: 2.5, thread: { pitch: ${P}, modeled: true } });`;
    const { result, shape } = await lower(code);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(brepValid(shape!)).toBe(true);
    const removed = 20 * 20 * 10 - shape!.volume();
    const bore = Math.PI * isoMinorRadius(D, P) ** 2 * 2.5;
    // More than the plain bore, less than a groove running the full depth.
    expect(removed).toBeGreaterThan(bore + 3);
    expect(removed).toBeLessThan(tappedRemoval(D, P, 0, 2.5));
  });

  it('threads every position of holes()', async () => {
    const code = `return box(40, 20, 1, true).holes('top', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 4, depth: 'through', thread: { pitch: 0.7, modeled: true } });`;
    const { result, shape } = await lower(code);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(40 * 20 * 1 - shape!.volume()).toBeCloseTo(2 * tappedRemoval(4, 0.7, 0, 1), 2);
  });

  it('keeps a ParamRef clearance live at lower time', async () => {
    const code = `
      const c = param('c', 0);
      return box(12, 12, 2.4, true).hole('top', { u: 0, v: 0, diameter: 4, depth: 'through', thread: { pitch: 0.7, clearance: c } });
    `;
    const run = await runScript({ code, fileName: 'c.kcad.ts' });
    for (const clearance of [0, 0.08]) {
      run.paramTable.set('c', clearance);
      const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
      const rBore = isoMinorRadius(4, 0.7) + clearance;
      expect(r.shapes.get(run.records[run.records.length - 1].id)!.volume()).toBeCloseTo(12 * 12 * 2.4 - Math.PI * rBore * rBore * 2.4, 4);
    }
  });

  it.each([
    [`thread: { pitch: 2 }`, 'diameter: 6', /thread.pitch \(2\) must be > 0 and ≤ diameter \/ 4/],
    [`thread: { pitch: 1, clearance: 0.2 }`, 'diameter: 6', /thread.clearance \(0.2\) must be in \[0, pitch\/8\]/],
    [`thread: { pitch: 1, modeled: true }`, 'diameter: 6, depth: 1.5', /modeled thread needs depth ≥ 2 × pitch/],
  ])('rejects %s at capture', async (thread, dims, message) => {
    const depth = dims.includes('depth') ? '' : ", depth: 'through'";
    await expect(
      runScript({ code: `return box(20, 20, 10).hole('top', { u: 0, v: 0, ${dims}${depth}, ${thread} });`, fileName: 'bad.kcad.ts' }),
    ).rejects.toThrow(message);
  });
});
