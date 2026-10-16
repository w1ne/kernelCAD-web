// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The fillet/chamfer "returned the body unchanged" gate used to compare the
// volume change against 1e-9 × body volume. A real r = 0.1 rim fillet on a
// 500 mm block removes ~0.02 mm³ — inside that band — so a valid tiny blend
// was rejected as a no-op ("No radius down to 0.0003906 mm builds"). The
// gate now also requires the face set to be unchanged. This sweep pins tiny
// through near-limit radii on bodies from 10 mm to 500 mm.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

const KEEP = 1 - Math.PI / 4; // fillet cross-section removed per r² of convex edge

async function deltaVolume(base: string, feature: string): Promise<number> {
  const a = await buildModel({ fileName: 'sweep-base.kcad.ts', code: `return ${base};` });
  const b = await buildModel({ fileName: 'sweep.kcad.ts', code: `return ${base}${feature};` });
  const errs = b.diagnostics.filter((d) => d.severity === 'error');
  expect(errs, `${base}${feature}: ${JSON.stringify(errs)}`).toEqual([]);
  return a.tailShape!.volume() - b.tailShape!.volume();
}

describe('tiny-to-near-limit fillets/chamfers build on bodies of any size', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  for (const s of [10, 50, 200, 500]) {
    const h = 0.4 * s;
    const box = `box(${s}, ${s}, ${h})`;
    const limit = Math.min(h, s / 2);
    const radii = [0.05, 0.1, +(0.25 * limit).toFixed(3), +(0.9 * limit).toFixed(3)];

    it(`box ${s} mm: top-face fillet r ∈ ${radii.join(', ')} removes the exact blend volume`, async () => {
      for (const r of radii) {
        const dv = await deltaVolume(box, `.fillet(${r}, { face: 'top' })`);
        // 4 straight runs of (s − 2r) plus 4 mitred corners of r³/3 each
        const expected = 4 * (s - 2 * r) * r * r * KEEP + (4 / 3) * r ** 3;
        expect(Math.abs(dv - expected) / expected, `r=${r} dv=${dv} expected=${expected}`).toBeLessThan(0.01);
      }
    }, 300_000);

    it(`box ${s} mm with a Ø3 through hole: rim fillet / chamfer 0.05 … 1 mm build`, async () => {
      const holed = `${box}.hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' })`;
      const rim = `{ atZ: ${h}, ofCurveType: 'CIRCLE' }`;
      for (const r of [0.05, 0.1, 0.5, 1]) {
        const dv = await deltaVolume(holed, `.fillet(${r}, ${rim})`);
        const expected = 2 * Math.PI * 1.5 * r * r * KEEP;
        expect(dv, `fillet r=${r}`).toBeGreaterThan(0);
        expect(dv / expected, `fillet r=${r} dv=${dv}`).toBeGreaterThan(0.5);
        expect(dv / expected, `fillet r=${r} dv=${dv}`).toBeLessThan(1.5);
      }
      for (const d of [0.05, 0.1, 1]) {
        const dv = await deltaVolume(holed, `.chamfer(${d}, ${rim})`);
        const expected = 2 * Math.PI * 1.5 * d * d / 2;
        expect(dv / expected, `chamfer d=${d} dv=${dv}`).toBeGreaterThan(0.5);
        expect(dv / expected, `chamfer d=${d} dv=${dv}`).toBeLessThan(1.5);
      }
    }, 300_000);
  }

  it('the reported cases: Ø3 rim fillet 0.1 on a 500×400×200 block, Ø1 rim chamfer/fillet 0.1 on a 300×300×200 block', async () => {
    const big = "box(500, 400, 200).hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' })";
    expect(await deltaVolume(big, ".fillet(0.1, { atZ: 200, ofCurveType: 'CIRCLE' })")).toBeGreaterThan(0.01);
    const mid = "box(300, 300, 200).hole('top', { u: 0, v: 0, diameter: 1, depth: 'through' })";
    expect(await deltaVolume(mid, ".chamfer(0.1, { atZ: 200, ofCurveType: 'CIRCLE' })")).toBeGreaterThan(0.01);
    expect(await deltaVolume(mid, ".fillet(0.1, { atZ: 200, ofCurveType: 'CIRCLE' })")).toBeGreaterThan(0.001);
  }, 300_000);
});
