// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dihedral edge queries on a many-holed plate. Each edge used to rescan every
// face's edges (re-materialising every wrapper) to find its two faces:
// box(100,100,5) with 144 through-holes (444 edges) took ~35 s for
// { convex: true } and ~50 s for { minAngle: 80 }. The edge -> faces map is
// now built once per shape; the bound below is deliberately generous.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { resolveEdgeQuery } from '../../../../src/kernel/backends/occt/edgeQueries';
import { buildModel } from '../../../../src/modeling/buildModel';

let plate: OcctBackend;

beforeAll(async () => {
  await initOcct();
  const pos: string[] = [];
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) pos.push(`{u:${-45 + i * 90 / 11},v:${-45 + j * 90 / 11}}`);
  const m = await buildModel({
    fileName: 'perf.kcad.ts',
    code: `return box(100,100,5).holes('top', { positions: [${pos.join(',')}], diameter: 3, depth: 'through' });`,
  });
  plate = m.tailShape as OcctBackend;
}, 120_000);

describe('dihedral edge queries scale with edge count', () => {
  it('{ convex: true } on a 144-hole plate: correct edges, well under the old 35 s', () => {
    const t0 = Date.now();
    const convex = resolveEdgeQuery(plate, { convex: true });
    const ms = Date.now() - t0;
    // 12 outer box edges + the 2 x 144 hole rims are all convex; the hole
    // seams (one per hole) are undecidable and stay out.
    expect(convex).toHaveLength(300);
    expect(ms).toBeLessThan(10_000);
  }, 60_000);

  it('{ minAngle: 80 } does not pay for convexity', () => {
    const t0 = Date.now();
    const sharp = resolveEdgeQuery(plate, { minAngle: 80 });
    const ms = Date.now() - t0;
    expect(sharp.length).toBeGreaterThanOrEqual(300);
    expect(ms).toBeLessThan(5_000);
  }, 60_000);
});
