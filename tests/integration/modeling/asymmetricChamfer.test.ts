// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for two-distance and distance-angle chamfers on a rectangular block.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

/** Volume of a 40 × 30 × 10 block whose top rim is bevelled `onTop` mm in
 *  from the top face and `onSides` mm down the side faces (prismatoid). */
function bevelledBlockVolume(onTop: number, onSides: number): number {
  const lower = 40 * 30 * (10 - onSides);
  const topArea = (40 - 2 * onTop) * (30 - 2 * onTop);
  const midArea = (40 - onTop) * (30 - onTop);
  return lower + (onSides / 6) * (40 * 30 + topArea + 4 * midArea);
}

async function build(code: string) {
  const model = await buildModel({ fileName: 'asymmetric-chamfer-regression.kcad.ts', code });
  return { model, errors: model.diagnostics.filter((d) => d.severity === 'error') };
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('asymmetric chamfer geometry', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('bevels the top rim 2 mm on the top face and 5 mm down the sides', async () => {
    const code = await readFile('examples/cookbook-parity/asymmetric-chamfer-block.kcad.ts', 'utf8');
    const { model, errors } = await build(code);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 6 box faces + 4 bevel faces.
    expect(shape.faceHashes().length).toBe(10);
    expect(shape.volume()).toBeCloseTo(bevelledBlockVolume(2, 5), 3);
    // A symmetric 2 mm chamfer would leave 11,730.667 mm³.
    expect(Math.abs(shape.volume() - bevelledBlockVolume(2, 2))).toBeGreaterThan(100);
    for (const v of shape.boundingBox().min) expect(v).toBeCloseTo(0, 6);
    expect(shape.boundingBox().max[0]).toBeCloseTo(40, 6);
    expect(shape.boundingBox().max[1]).toBeCloseTo(30, 6);
    expect(shape.boundingBox().max[2]).toBeCloseTo(10, 6);
  }, 120_000);

  it('measures `distance` on the reference face, so swapping the legs changes the solid', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 10).chamfer(5, 'top', { distance2: 2 });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    expect(shape.volume()).toBeCloseTo(bevelledBlockVolume(5, 2), 3);
  }, 120_000);

  it('uses an explicit reference face for edges picked by an edge query', async () => {
    // The four vertical corner edges border the front or back face, never both
    // the reference and a non-adjacent face: pick the two on the front face.
    const { model, errors } = await build(`
      return box(40, 30, 10).chamfer(
        3,
        { parallel: 'Z', within: { yMin: -1, yMax: 1 } },
        { distance2: 6, face: 'front' },
      );
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Two corner prisms removed: 3 mm along the front face, 6 mm along each side.
    expect(shape.volume()).toBeCloseTo(12_000 - 2 * (0.5 * 3 * 6 * 10), 3);
  }, 120_000);

  it('builds a distance-angle chamfer whose second leg is distance × tan(angle)', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 10).chamfer(2, 'top', { angleDeg: 60 });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    expect(shape.volume()).toBeCloseTo(bevelledBlockVolume(2, 2 * Math.tan(Math.PI / 3)), 3);
  }, 120_000);

  it('accepts a param() second leg and rejects a non-positive resolved value', async () => {
    const ok = await build(`
      const leg = param('leg', 5);
      return box(40, 30, 10).chamfer(2, 'top', { distance2: leg });
    `);
    expect(ok.errors, JSON.stringify(ok.model.diagnostics)).toEqual([]);
    expect(ok.model.tailShape!.volume()).toBeCloseTo(bevelledBlockVolume(2, 5), 3);

    const bad = await build(`
      const leg = param('leg', 5);
      return box(40, 30, 10).chamfer(2, 'top', { distance2: leg.subtract(5) });
    `);
    expect(bad.errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(bad.errors[0].message).toContain('opts.distance2');
  }, 120_000);

  it('keeps the symmetric chamfer unchanged when no options are given', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 10).chamfer(2, 'top');
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape!.volume()).toBeCloseTo(bevelledBlockVolume(2, 2), 3);
  }, 120_000);

  it('refuses a reference face that does not border every selected edge', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 10).chamfer(2, 'top', { distance2: 5, face: 'bottom' });
    `);

    expect(errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(errors[0].message).toContain('opts.face');
    // The refused feature produces no bevelled solid.
    expect(model.tailShape).toBeUndefined();
  }, 120_000);

  it.each([
    ["box(40, 30, 10).chamfer(2, 'top', { distance2: 5, angleDeg: 30 })", 'opts'],
    ["box(40, 30, 10).chamfer(2, 'top', { distance2: -1 })", 'opts.distance2'],
    ["box(40, 30, 10).chamfer(2, 'top', { angleDeg: 90 })", 'opts.angleDeg'],
    ["box(40, 30, 10).chamfer(2, { parallel: 'Z' }, { distance2: 5 })", 'opts.face'],
    ["box(40, 30, 10).chamfer(2, 'top', { distance2: 5, bevel: 1 })", 'opts'],
    ["box(40, 30, 10).chamfer(2, 'top', {})", 'opts'],
  ])('rejects invalid options: %s', async (expr, path) => {
    const failure = await build(`return ${expr};`).then(
      ({ errors }) => errors[0],
      (error: { code?: string; message: string }) => error,
    );

    expect(failure?.code).toBe('feature.invalid-args');
    expect(failure?.message).toContain(`${path} —`);
  }, 120_000);
});
