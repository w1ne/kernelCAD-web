// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// `Shape.pad(profile, opts)` — additive sketch-driven extrude fused to a face.
// The blind and upToFace paths must produce one valid solid with exactly the
// analytic added volume; malformed, detached and unreachable pads fail closed.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { countSolids, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

// 10 x 10 mm square centred on the selected face.
const SQUARE = 'const sq = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();';
const PLATE = 'const base = box(40, 30, 10);';

async function build(code: string) {
  return buildModel({ fileName: 'pad.kcad.ts', code });
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

describe('Shape.pad', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('fuses a 10 x 10 x 5 pad to the top face as one valid solid', async () => {
    const model = await build(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'top', depth: 5 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(countSolids(wrappedOf(shape))).toBe(1);
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 40 x 30 x 10 plate plus a 10 x 10 x 5 boss.
    expect(shape.volume()).toBeCloseTo(12_500, 3);
    const bb = shape.boundingBox();
    expect(bb.min).toEqual([0, 0, 0]);
    expect(bb.max[0]).toBeCloseTo(40, 6);
    expect(bb.max[1]).toBeCloseTo(30, 6);
    expect(bb.max[2]).toBeCloseTo(15, 6);
  }, 120_000);

  it('keeps a circular profile exact', async () => {
    const model = await build(`${PLATE}\nreturn base.pad(path().circle(0, 0, 4), { face: 'top', depth: 5 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 12000 plate + pi * 4^2 * 5 cylinder.
    expect(shape.volume()).toBeCloseTo(12_000 + 80 * Math.PI, 3);
    expect(shape.boundingBox().max[2]).toBeCloseTo(15, 6);
  }, 120_000);

  it('grows outward from a vertical side face', async () => {
    const model = await build(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'front', depth: 3 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 5 x 5 x 3 outside the front face.
    expect(shape.volume()).toBeCloseTo(12_000 + 300, 3);
    const bb = shape.boundingBox();
    expect(bb.min[1]).toBeCloseTo(-3, 6);
    expect(bb.max[1]).toBeCloseTo(30, 6);
  }, 120_000);

  it('ends exactly on the plane of an upToFace target', async () => {
    const code = `
const base = box(40, 30, 10).union(box(10, 30, 10).translate(30, 0, 10));
${SQUARE}
return base.pad(sq.translate(-15, 0), { face: { byNormal: 'Z', atZ: 10 }, upToFace: { atZ: 20, parallelTo: 'XY' } });
`;
    const model = await build(code);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(countSolids(wrappedOf(shape))).toBe(1);
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 12000 base + 3000 tower + 1000 pad; the pad reaches z = 20 exactly.
    expect(shape.volume()).toBeCloseTo(16_000, 3);
    expect(shape.boundingBox().max[2]).toBeCloseTo(20, 6);
  }, 120_000);

  it('resolves a ParamRef depth from the live parameter table', async () => {
    const code = `${PLATE}\n${SQUARE}\nconst h = param('bossHeight', 4);\nreturn base.pad(sq, { face: 'top', depth: h });`;
    const model = await build(code);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape!.volume()).toBeCloseTo(12_400, 3);
    expect(model.tailShape!.boundingBox().max[2]).toBeCloseTo(14, 6);
  }, 120_000);

  it.each([
    ['a zero depth', 'depth: 0', 'positive finite height'],
    ['a negative depth', 'depth: -3', 'positive finite height'],
  ])('rejects %s', async (_label, opts, message) => {
    const e = await errorOf(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'top', ${opts} });`);
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toContain(message);
  }, 120_000);

  it('rejects depth and upToFace together, and unknown option keys', async () => {
    const both = await errorOf(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'top', depth: 2, upToFace: 'bottom' });`);
    expect(both.code).toBe('feature.invalid-args');
    expect(both.message).toContain('mutually exclusive');

    const unknown = await errorOf(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'top', height: 2 });`);
    expect(unknown.code).toBe('feature.invalid-args');
    expect(unknown.message).toContain('opts.height');
  }, 120_000);

  it('rejects a target face behind the entry face', async () => {
    const e = await errorOf(`${PLATE}\n${SQUARE}\nreturn base.pad(sq, { face: 'top', upToFace: 'bottom' });`);
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toContain('strictly ahead of the entry face');
  }, 120_000);

  it('rejects a non-planar upToFace target', async () => {
    const code = `
const base = box(40, 30, 10).union(cylinder(10, 4).translate(0, 0, 10));
${SQUARE}
return base.pad(sq, { face: { byNormal: 'Z', atZ: 10 }, upToFace: { ofSurfaceType: 'CYLINDER', near: [0, 0, 15] } });
`;
    const e = await errorOf(code);
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toContain('planar target face');
  }, 120_000);

  it('rejects a non-planar entry face', async () => {
    const code = `
const shaft = cylinder(20, 5);
return shaft.pad(path().circle(0, 0, 2), { face: { ofSurfaceType: 'CYLINDER', near: [0, 0, 10] }, depth: 3 });
`;
    const e = await errorOf(code);
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toContain('a planar face for the profile');
  }, 120_000);

  it('rejects a pad whose profile misses the body instead of returning two solids', async () => {
    const code = `${PLATE}\nreturn base.pad(path().moveTo(-50, -5).lineTo(-40, -5).lineTo(-40, 5).lineTo(-50, 5).close(), { face: 'top', depth: 5 });`;
    const e = await errorOf(code);
    expect(e.code).toBe('feature.kernel-failed');
    expect(e.message).toContain('not one connected body');
  }, 120_000);

  it('rejects a self-intersecting profile with an actionable message', async () => {
    const bowtie = 'path().moveTo(-5, -5).lineTo(5, 5).lineTo(5, -5).lineTo(-5, 5).close()';
    const e = await errorOf(`${PLATE}\nreturn base.pad(${bowtie}, { face: 'top', depth: 5 });`);
    expect(e.code).toBe('feature.invalid-args');
    expect(e.message).toContain('non-self-intersecting');
  }, 120_000);
});
