// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Cookbook `fillet-face-after-subtract` promises to round ONLY the rim of the
// hole. `fillet(r, { face: 'top' })` also rounded the outer perimeter
// (18980.7 mm³ instead of ~19076 mm³); this pins the recipe to the rim.
import { describe, it, expect } from 'vitest';
import { loadSnippets } from './index';
import { callMcpTool } from '../mcp/toolRegistry';

const R = 1.5; // fillet radius
const HOLE_R = 6;
const PLATE = { w: 50, d: 50, t: 8 };

/** Material removed by a radius-r round on a 90° convex edge, per mm of edge. */
const SPANDREL_AREA = (1 - Math.PI / 4) * R * R;
/** Distance of the spandrel centroid from the corner, along each leg. */
const SPANDREL_CENTROID = R * (10 - 3 * Math.PI) / (3 * (4 - Math.PI));

async function volumeOf(code: string): Promise<number> {
  const r = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; shape: { volume: number } };
  expect(r.ok).toBe(true);
  return r.shape.volume;
}

describe('cookbook fillet-face-after-subtract', () => {
  const body = loadSnippets().find((s) => s.id === 'fillet-face-after-subtract')!.body;

  it('rounds the hole rim and leaves the outer perimeter sharp (volume)', async () => {
    const unfilleted = PLATE.w * PLATE.d * PLATE.t - Math.PI * HOLE_R ** 2 * PLATE.t;
    // Pappus: the rim spandrel revolves at radius HOLE_R + its centroid offset.
    const rimRemoved = SPANDREL_AREA * 2 * Math.PI * (HOLE_R + SPANDREL_CENTROID);
    const perimeterRemoved = SPANDREL_AREA * 2 * (PLATE.w + PLATE.d);

    const v = await volumeOf(body);
    expect(v).toBeCloseTo(unfilleted - rimRemoved, 0); // ≈ 19076.0
    // Had the outer top perimeter been rounded too, ~96.6 mm³ more would be gone.
    expect(v - (unfilleted - rimRemoved - perimeterRemoved)).toBeGreaterThan(90);
  }, 120_000);

  it("the face-wide form it replaces really does round the perimeter (guards the premise)", async () => {
    const faceWide = body.replace(/\.fillet\([^;]*\);/, ".fillet(1.5, { face: 'top' });");
    expect(faceWide).not.toBe(body);
    expect(await volumeOf(faceWide)).toBeLessThan(19000);
  }, 120_000);
});
