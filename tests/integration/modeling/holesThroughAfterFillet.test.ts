// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// holes() / hole() with { u, v } and depth: 'through' on an L-bracket whose
// inside corner is filleted. The through depth used to come from back faces
// compared to the ENTRY-FACE centroid with a bore-radius + 1 mm tolerance, so
// once the fillet (r >= 2.5) shifted the back face off that axis every
// off-centre hole failed with feature.hole.no-target-face. Depth is now cast
// along the drill axis from each hole's own position (as the `at` path does).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

const PLATE = 50 * 40 * 4 + 4 * 40 * 46;
const bore = (d: number, len: number) => Math.PI * (d / 2) ** 2 * len;
const filletAdd = (r: number) => r * r * (1 - Math.PI / 4) * 40;

describe("holes { u, v } depth: 'through' after a fillet", () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  for (const r of [1, 2, 2.5, 3, 4]) {
    it(`fillet r=${r}: both bores go through the 4 mm plate`, async () => {
      const m = await buildModel({
        fileName: 'holes-through.kcad.ts',
        code: `let br = union(box(50, 40, 4), box(4, 40, 46).translate(0, 0, 4)).fillet(${r}, { parallel: [0, 1, 0], concave: true });
return br.holes({ byNormal: 'Z', atZ: 4 }, { positions: [{ u: 0, v: -8 }, { u: 10, v: 8 }], diameter: 4.5, depth: 'through' });`,
      });
      expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
      expect(m.tailShape!.volume()).toBeCloseTo(PLATE + filletAdd(r) - 2 * bore(4.5, 4), 0);
    }, 120_000);
  }

  it("single hole() with { u, v } and 'through' after the fillet also goes through", async () => {
    const m = await buildModel({
      fileName: 'hole-through.kcad.ts',
      code: `let br = union(box(50, 40, 4), box(4, 40, 46).translate(0, 0, 4)).fillet(3, { parallel: [0, 1, 0], concave: true });
return br.hole({ byNormal: 'Z', atZ: 4 }, { u: 0, v: -8, diameter: 4.5, depth: 'through' });`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(m.tailShape!.volume()).toBeCloseTo(PLATE + filletAdd(3) - bore(4.5, 4), 0);
  }, 120_000);
});
