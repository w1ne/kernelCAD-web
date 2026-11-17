// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for `hole(..., { upToFace })`: capture already accepted and
// retained this end condition, but lowering built a zero-length bore.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

async function build(code: string) {
  return buildModel({ fileName: 'hole-up-to-face.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('Shape.hole(s) upToFace', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('cuts a single bore to a canonical opposite face and preserves the solid', async () => {
    const plain = await build('const body = box(20, 20, 20); return body;');
    const model = await build(`
const body = box(20, 20, 20);
return body.hole('top', {
  u: 0, v: 0, diameter: 4,
  upToFace: { kind: 'canonical', face: 'bottom' },
});`);

    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(isTopologicallyValid(wrappedOf(model.tailShape!))).toBe(true);
    expect(plain.tailShape!.volume() - model.tailShape!.volume()).toBeCloseTo(Math.PI * 2 ** 2 * 20, 3);
  }, 120_000);

  it('keeps a counterbore while clipping the complete tool to the target plane', async () => {
    const plain = await build('const body = box(20, 20, 20); return body;');
    const model = await build(`
const body = box(20, 20, 20);
return body.hole('top', {
  u: 0, v: 0, diameter: 4,
  counterbore: { diameter: 8, depth: 3 },
  upToFace: 'bottom',
});`);

    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(isTopologicallyValid(wrappedOf(model.tailShape!))).toBe(true);
    const bore = Math.PI * 2 ** 2 * 20;
    const counterboreShoulder = Math.PI * (4 ** 2 - 2 ** 2) * 3;
    expect(plain.tailShape!.volume() - model.tailShape!.volume()).toBeCloseTo(bore + counterboreShoulder, 3);
  }, 120_000);

  it('cuts a holes pattern to the selected ledge plane', async () => {
    const body = `
const body = box(40, 20, 20).subtract(box(20, 20, 10).translate(20, 0, 10));`;
    const plain = await build(`${body}\nreturn body;`);
    const model = await build(`${body}
return body.holes({ containsPoint: [10, 10, 20] }, {
  positions: [{ u: -5, v: 0 }, { u: 5, v: 0 }],
  diameter: 4,
  upToFace: { containsPoint: [30, 10, 10] },
});`);

    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(isTopologicallyValid(wrappedOf(model.tailShape!))).toBe(true);
    expect(plain.tailShape!.volume() - model.tailShape!.volume()).toBeCloseTo(2 * Math.PI * 2 ** 2 * 10, 3);
  }, 120_000);

  it('cuts a hole to an inclined target plane rather than using a copied depth', async () => {
    const body = 'const body = prismSideY([[0, 0], [40, 0], [40, 10], [20, 15], [20, 20], [0, 20]], 0, 20);';
    const plain = await build(`${body}\nreturn body;`);
    const model = await build(`${body}
return body.hole('top', {
  u: 0, v: 0, diameter: 4,
  upToFace: { containsPoint: [30, 10, 12.5] },
});`);

    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(isTopologicallyValid(wrappedOf(model.tailShape!))).toBe(true);
    // The bore is centered at x=10, where the target plane is z=17.5.
    // The symmetric radius spans equal depths on either side of that centre.
    expect(plain.tailShape!.volume() - model.tailShape!.volume()).toBeCloseTo(Math.PI * 2 ** 2 * 2.5, 3);
  }, 120_000);

  it('rejects the entry plane as a target with a hole-specific diagnostic', async () => {
    const model = await build(`
return box(20, 20, 20).hole('top', {
  u: 0, v: 0, diameter: 4,
  upToFace: 'top',
});`);

    expect(errors(model)).toHaveLength(1);
    expect(errors(model)[0]?.code).toBe('feature.invalid-args');
    expect(errors(model)[0]?.message).toContain('hole(face, { upToFace })');
    expect(errors(model)[0]?.message).toContain('strictly ahead of the entry face');
  }, 120_000);
});
