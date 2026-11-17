// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for `cutout(profile, { face, upToFace })`: the documented option
// was accepted but the lowerer ignored it and failed with "cutout: missing
// depth". The cut now ends on the plane of a planar target face, including an
// inclined plane.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

// 4 x 4 mm square at the entry face frame origin.
const SQUARE = 'const sq = path().moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close();';
// Side profile (x, z), 20 mm deep in Y: flat top z = 20 over x 0..20, and an
// inclined ledge z = 20 - 0.25 x over x 20..40 (z 15 -> 10).
const RAMP = 'const body = prismSideY([[0, 0], [40, 0], [40, 10], [20, 15], [20, 20], [0, 20]], 0, 20);';
// 40 x 20 x 20 block with the right half lowered to a z = 10 ledge.
const STEP = 'const body = box(40, 20, 20).subtract(box(20, 20, 10).translate(20, 0, 10));';

async function build(code: string) {
  return buildModel({ fileName: 'cutout-up-to-face.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

async function errorOf(code: string): Promise<{ code: string; message: string }> {
  try {
    const e = errors(await build(code))[0];
    return { code: e?.code ?? 'none', message: e?.message ?? '' };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return { code: err.code ?? String(e), message: err.message ?? '' };
  }
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

async function cutVolume(body: string, cut: string): Promise<number> {
  const plain = await build(`${body}\nreturn body;`);
  const model = await build(`${SQUARE}\n${body}\nreturn ${cut};`);
  expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
  expect(isTopologicallyValid(wrappedOf(model.tailShape!))).toBe(true);
  return plain.tailShape!.volume() - model.tailShape!.volume();
}

describe('Shape.cutout upToFace', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('cuts through to the opposite face named by a canonical FaceRef', async () => {
    const removed = await cutVolume(
      'const body = box(20, 20, 20);',
      "body.cutout(sq, { face: 'top', upToFace: { kind: 'canonical', face: 'bottom' } })",
    );
    expect(removed).toBeCloseTo(4 * 4 * 20, 3);
  }, 120_000);

  it('accepts the same face forms as face (a bare canonical name)', async () => {
    const removed = await cutVolume(
      'const body = box(20, 20, 20);',
      "body.cutout(sq, { face: 'top', upToFace: 'bottom' })",
    );
    expect(removed).toBeCloseTo(4 * 4 * 20, 3);
  }, 120_000);

  it('stops a pocket at the plane of a ledge face that is not under the profile', async () => {
    const model = await build(`${SQUARE}\n${STEP}
return body.cutout(sq, { face: { containsPoint: [10, 10, 20] }, upToFace: { containsPoint: [30, 10, 10] } });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Pocket x 8..12, y 8..12, z 10..20: 160 mm³ out of the 40·20·20 − 20·20·10 body.
    expect(shape.volume()).toBeCloseTo(40 * 20 * 20 - 20 * 20 * 10 - 4 * 4 * 10, 3);
    // The pocket floor is at the ledge height: a thin probe at z 10.05 hits
    // air inside the pocket, a probe at z 9.95 hits material.
    const probe = async (z: number) => (await build(`${SQUARE}\n${STEP}
return body.cutout(sq, { face: { containsPoint: [10, 10, 20] }, upToFace: { containsPoint: [30, 10, 10] } })
  .intersect(box(2, 2, 0.02).translate(9, 9, ${z - 0.01}));`)).tailShape?.volume() ?? 0;
    expect(await probe(10.05)).toBeLessThan(1e-6);
    expect(await probe(9.95)).toBeCloseTo(2 * 2 * 0.02, 6);
  }, 180_000);

  it('ends the pocket on an inclined target plane', async () => {
    // Plane z = 20 - 0.25 x under x 8..12 is z 18..17: depth 2..3, mean 2.5.
    const removed = await cutVolume(
      RAMP,
      "body.cutout(sq, { face: 'top', upToFace: { containsPoint: [30, 10, 12.5] } })",
    );
    expect(removed).toBeCloseTo(4 * 4 * 2.5, 3);
  }, 120_000);

  it('rejects a non-planar target face', async () => {
    const err = await errorOf(`${SQUARE}
return cylinder(20, 15).cutout(sq, { face: 'top', upToFace: { ofSurfaceType: 'CYLINDER' } });`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/only a planar target face/);
  }, 120_000);

  it('rejects a target plane parallel to the cut', async () => {
    const err = await errorOf(`${SQUARE}
return box(20, 20, 20).cutout(sq, { face: 'top', upToFace: 'left' });`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/parallel to the cut direction/);
  }, 120_000);

  it('rejects the entry face itself as the target', async () => {
    const err = await errorOf(`${SQUARE}
return box(20, 20, 20).cutout(sq, { face: 'top', upToFace: 'top' });`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/behind or on the entry face/);
  }, 120_000);

  it("rejects depthMode 'symmetric' with upToFace", async () => {
    const err = await errorOf(`${SQUARE}
return box(20, 20, 20).cutout(sq, { face: 'top', upToFace: 'bottom', depthMode: 'symmetric' });`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.depthMode');
  }, 120_000);

  it('rejects a non-face upToFace value', async () => {
    const err = await errorOf(`${SQUARE}
return box(20, 20, 20).cutout(sq, { face: 'top', upToFace: 5 });`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.upToFace');
  }, 120_000);
});
