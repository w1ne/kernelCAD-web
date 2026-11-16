// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for a fillet whose radius varies linearly along each edge.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

/** Material a round of radius r(x) = r0 + (r1 - r0)·x/len removes from a
 *  90° edge between x = a and x = b, if each cross-section were a circle of
 *  radius r(x): (1 − π/4)·∫ r(x)² dx. The kernel rolls a ball of varying
 *  radius, whose envelope differs from that by a few percent. */
function removedByTaper(r0: number, r1: number, len: number, a: number, b: number): number {
  const k = (r1 - r0) / len;
  const cube = (x: number) => (r0 + k * x) ** 3;
  const integral = k === 0 ? r0 * r0 * (b - a) : (cube(b) - cube(a)) / (3 * k);
  return (1 - Math.PI / 4) * integral;
}

/** The top front edge of a 40 × 20 × 10 block: parallel to X at y = 0, z = 10. */
const TOP_FRONT = "{ parallel: 'X', within: { yMin: -1, yMax: 1, zMin: 9, zMax: 11 } }";

async function build(code: string) {
  const model = await buildModel({ fileName: 'tapered-fillet-regression.kcad.ts', code });
  return { model, errors: model.diagnostics.filter((d) => d.severity === 'error') };
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

function meshBounds(shape: unknown): { min: number[]; max: number[] } {
  const { vertices } = (shape as {
    getReplicadShape(): { mesh(o: object): { vertices: number[] } };
  }).getReplicadShape().mesh({ tolerance: 0.01, angularTolerance: 0.1 });
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], vertices[i + k]);
      max[k] = Math.max(max[k], vertices[i + k]);
    }
  }
  return { min, max };
}

describe('tapered (variable-radius along the edge) fillet', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('grows the round from radius at the low-X end to endRadius at the high-X end', async () => {
    const { model, errors } = await build(`
      return box(40, 20, 10).fillet(1, ${TOP_FRONT}, { endRadius: 4 });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 6 box faces + 1 blend face.
    expect(shape.faceHashes().length).toBe(7);
    const removed = 8000 - shape.volume();
    expect(Math.abs(removed / removedByTaper(1, 4, 40, 0, 40) - 1)).toBeLessThan(0.05);
    // A constant 1 mm round removes 8.58 mm³ and a constant 4 mm round 137.33 mm³.
    expect(removed).toBeGreaterThan(removedByTaper(1, 1, 40, 0, 40) + 40);
    expect(removed).toBeLessThan(removedByTaper(4, 4, 40, 0, 40) - 40);
    // The blend is a B-spline surface whose control-point bound overshoots the
    // block, so measure the tessellated solid: it stays inside the block.
    const bounds = meshBounds(shape);
    expect(bounds.min).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6), expect.closeTo(0, 6)]);
    expect(bounds.max).toEqual([expect.closeTo(40, 6), expect.closeTo(20, 6), expect.closeTo(10, 6)]);
  }, 120_000);

  it('applies radius at the low-X end: the two ends of the edge differ by the taper', async () => {
    const slab = async (r0: number, r1: number, x: number) => {
      const { model, errors } = await build(`
        return box(40, 20, 10)
          .fillet(${r0}, ${TOP_FRONT}, { endRadius: ${r1} })
          .intersect(box(4, 20, 10).translate(${x}, 0, 0));
      `);
      expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
      return 800 - model.tailShape!.volume();
    };

    // Over the first 4 mm the radius runs 1 → 1.3 mm; over the last, 3.7 → 4 mm.
    const lowEnd = await slab(1, 4, 0);
    const highEnd = await slab(1, 4, 36);
    expect(lowEnd).toBeGreaterThan(removedByTaper(1, 1, 40, 0, 4));
    expect(lowEnd).toBeLessThan(removedByTaper(1.3, 1.3, 40, 0, 4));
    expect(highEnd).toBeGreaterThan(removedByTaper(3.7, 3.7, 40, 36, 40));
    expect(highEnd).toBeLessThan(removedByTaper(4, 4, 40, 36, 40));
    // Swapping the radii swaps the ends.
    expect(await slab(4, 1, 0)).toBeCloseTo(highEnd, 3);
  }, 240_000);

  it('keeps an equal endRadius identical to the constant-radius fillet', async () => {
    const tapered = await build(`return box(40, 20, 10).fillet(2, ${TOP_FRONT}, { endRadius: 2 });`);
    const constant = await build(`return box(40, 20, 10).fillet(2, ${TOP_FRONT});`);

    expect(tapered.errors).toEqual([]);
    expect(constant.errors).toEqual([]);
    expect(tapered.model.tailShape!.volume()).toBeCloseTo(constant.model.tailShape!.volume(), 6);
  }, 120_000);

  it('accepts a param() endRadius and rejects a non-positive one', async () => {
    const ok = await build(`
      const end = param('end', 4);
      return box(40, 20, 10).fillet(1, ${TOP_FRONT}, { endRadius: end });
    `);
    expect(ok.errors, JSON.stringify(ok.model.diagnostics)).toEqual([]);
    expect(8000 - ok.model.tailShape!.volume()).toBeGreaterThan(removedByTaper(1, 1, 40, 0, 40) + 40);

    const resolved = await build(`
      const end = param('end', 4);
      return box(40, 20, 10).fillet(1, ${TOP_FRONT}, { endRadius: end.subtract(4) });
    `);
    expect(resolved.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(resolved.errors[0].message).toContain('opts.endRadius');

    const literal = await build(`return box(40, 20, 10).fillet(2, ${TOP_FRONT}, { endRadius: 0 });`).then(
      ({ errors }) => errors[0],
      (error: { code?: string; message: string }) => error,
    );
    expect(literal?.code).toBe('feature.invalid-args');
    expect(literal?.message).toContain('opts.endRadius —');
  }, 120_000);

  it('refuses a closed edge, which has no start and end for the taper', async () => {
    const { model, errors } = await build(`
      return cylinder(10, 8).fillet(1, 'top', { endRadius: 2 });
    `);

    expect(errors.length, JSON.stringify(model.diagnostics)).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain('closed');
  }, 120_000);
});
